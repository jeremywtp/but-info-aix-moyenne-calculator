import type { SemesterData } from "@/types";

/**
 * Normalise un ID de ressource extrait du PDF pour matcher les IDs de l'app
 * "Alternance S3" → "Alternance"
 * "Portfolio S3" → "Portfolio"
 * "Stage S3" → "Stage"
 * "S3.B.1" → "S3.B.01" (ajouter le zero)
 */
function normalizePdfId(raw: string): string {
  let id = raw.trim();

  // "Alternance S3" / "Stage S3" → juste le mot
  if (/^(Alternance|Stage)\s+S\d/i.test(id)) {
    return id.split(/\s+/)[0];
  }

  // "P-Portfolio" → "Portfolio"
  if (id === "P-Portfolio") return "Portfolio";

  // SAE uniquement : "S3.B.1" → "S3.B.01" (ajouter un zero si 1 chiffre a la fin)
  if (/^S\d/.test(id)) {
    id = id.replace(/\.(\d)$/, ".0$1");
  }

  return id;
}

/**
 * Extrait l'ID de ressource depuis le contenu d'une ligne
 * Gere les deux formats (ScoDoc et AMU)
 */
function extractResourceId(text: string): string {
  // R3.01, R2.01, R1.L.1, R3.A.L1, R4.A.08, etc.
  const rMatch = text.match(/\b(R\d+\.[^\s]+)/);
  if (rMatch) return rMatch[1];

  // SAE forme longue (AMU) : SAE3.B.01 → S3.B.01
  const saeParcours = text.match(/SAE(\d+\.[AB]\.?\d+)/);
  if (saeParcours) return "S" + saeParcours[1];

  // SAE forme longue sans parcours (AMU BUT 1) : SAE1.01 → S1.01
  const saeSimple = text.match(/SAE(\d+\.\d+)/);
  if (saeSimple) return "S" + saeSimple[1];

  // SAE forme courte avec parcours (ScoDoc) : S3.A.01, S3.B.1
  const sParcours = text.match(/\b(S\d+\.[AB]\.?\d+)/);
  if (sParcours) return sParcours[1];

  // SAE forme courte sans parcours (ScoDoc BUT 1) : S2.01, S1.06
  const sSimple = text.match(/\b(S\d+\.\d+)/);
  if (sSimple) return sSimple[1];

  // Portfolio : "P2 Portfolio S2" ou "Portfolio"
  if (/\bPortfolio\b/i.test(text)) return "Portfolio";

  // Alternance / Stage
  const special = text.match(/\b(Alternance|Stage)\b/i);
  if (special) return special[1];

  return "";
}

/**
 * Extrait la valeur du bonus depuis le texte brut du PDF
 *   - ScoDoc : "Bonus: 0.4 - Rang: 52 / 116"
 *   - AMU    : "WBO1BN Total bonus S1 .4/20"
 */
function extractBonusFromText(text: string, semesterNum: number): string | null {
  // Format ScoDoc : "Bonus: 0.4 - Rang: ..."
  const scodocMatch = text.match(/Bonus:\s*(\d+\.?\d*)\s*-/);
  if (scodocMatch) {
    const val = parseFloat(scodocMatch[1]);
    if (val > 0) return String(val);
  }

  // Format AMU : "Total bonus S1 .4/20" ou "Total bonus S1.4/20"
  const amuRegex = new RegExp(
    `Total\\s+bonus\\s+S${semesterNum}\\s*(\\.\\d+|\\d+\\.?\\d*)\\/20`,
    "i",
  );
  const amuMatch = text.match(amuRegex);
  if (amuMatch) {
    const val = parseFloat(amuMatch[1]);
    if (val > 0) return String(val);
  }

  return null;
}

/**
 * Extrait les notes depuis le texte brut d'un bulletin PDF
 * Gere deux formats :
 *   - ScoDoc : "R3.01 R3.01 Dev Web 10.0 15.83"
 *   - AMU    : "WIN3R01A R3.01 Développement Web 16.67/20"
 */
function extractNotesFromText(text: string): Map<string, string> {
  const notes = new Map<string, string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    let note = "";
    let lineContent = line;

    // === FORMAT 1 : ScoDoc — fin de ligne = {coef} {note XX.XX} ===
    const scodocMatch = line.match(
      /^(.+?)\s+(\d+\.?\d*)\s+(\d{2}\.\d{2})\s*$/,
    );
    if (scodocMatch) {
      lineContent = scodocMatch[1];
      note = scodocMatch[3];

      // Ignorer les lignes d'en-tete UE ScoDoc
      if (/Rang:|ECTS:|Promotion|min\.|moy\.|max\./i.test(lineContent)) continue;
    }

    // === FORMAT 2 : AMU — note au format {XX.XX}/20 ===
    if (!note) {
      const amuMatch = line.match(/(\d+\.?\d*)\/20/);
      if (amuMatch) {
        note = amuMatch[1];

        // Ignorer les lignes UE, semestre, en-tetes
        if (/UE\d+\.\d+|S\d+\s+BUT|ÉLÉMENTS|Code\s+Libellé|Signification|DEF\s*:/i.test(line)) continue;
      }
    }

    if (!note) continue;
    if (note === "~" || note.includes("~")) continue;

    const resourceId = extractResourceId(lineContent);
    if (!resourceId) continue;

    const normalizedId = normalizePdfId(resourceId);

    // Ne garder que la premiere occurrence
    if (!notes.has(normalizedId)) {
      notes.set(normalizedId, note);
    }
  }

  return notes;
}

/**
 * Extrait le texte d'un fichier PDF via pdfjs-dist
 * Regroupe les items par position Y (meme ligne visuelle)
 * puis trie par position X pour reconstituer l'ordre de lecture
 */
async function extractTextFromPdf(file: File): Promise<string> {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const lines: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();

    // Collecter tous les items avec leurs coordonnees
    const items: { x: number; y: number; str: string }[] = [];
    for (const item of content.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = item as any;
      if (!a.transform) continue;
      items.push({
        x: Math.round(a.transform[4]),
        y: Math.round(a.transform[5]),
        str: a.str ?? "",
      });
    }

    // Regrouper par Y (seuil de 2px) — gere les items non-adjacents du meme Y
    const yGroups = new Map<number, { x: number; str: string }[]>();
    for (const it of items) {
      let groupY = it.y;
      for (const existingY of yGroups.keys()) {
        if (Math.abs(existingY - it.y) <= 2) {
          groupY = existingY;
          break;
        }
      }
      if (!yGroups.has(groupY)) yGroups.set(groupY, []);
      yGroups.get(groupY)!.push({ x: it.x, str: it.str });
    }

    // Trier les groupes par Y descendant (haut → bas dans le PDF)
    // puis les items de chaque groupe par X croissant (gauche → droite)
    const sorted = [...yGroups.entries()].sort((a, b) => b[0] - a[0]);
    for (const [, group] of sorted) {
      group.sort((a, b) => a.x - b.x);
      const text = group.map((g) => g.str).join("").trim();
      if (text) lines.push(text);
    }
  }

  return lines.join("\n");
}

/**
 * Detecte les semestres, parcours et formation depuis le texte brut du PDF
 * Un PDF AMU peut contenir plusieurs semestres (ex: S1+S2 pour une annee complete)
 */
function detectPdfInfo(text: string): {
  semesters: Set<number>;
  parcours: "A" | "B" | null;
  formation: "FA" | "FI" | null;
} {
  // Semestres : tous les digits uniques dans les IDs R{X}.XX
  const semesters = new Set<number>();
  const rMatches = [...text.matchAll(/\bR(\d)\.\d/g)];
  for (const m of rMatches) semesters.add(parseInt(m[1]));

  // Parcours : lettre A/B dans les IDs SAE/R (ex: SAE3.B.01, R4.A.08)
  let parcours: "A" | "B" | null = null;
  if (/(?:R|S|SAE)\d+\.A\./i.test(text)) parcours = "A";
  else if (/(?:R|S|SAE)\d+\.B\./i.test(text)) parcours = "B";
  // Fallback : nom du parcours dans le format AMU
  if (!parcours && /parcours.*Déploiement/i.test(text)) parcours = "B";
  if (!parcours && /parcours.*Réalisation/i.test(text)) parcours = "A";

  // Formation : presence d'Alternance (FA) ou Stage (FI)
  let formation: "FA" | "FI" | null = null;
  if (/\bAlternance\b/i.test(text)) formation = "FA";
  else if (/\bStage\b/i.test(text)) formation = "FI";

  return { semesters, parcours, formation };
}

/**
 * Valide que le PDF correspond a la configuration attendue
 * Lance une Error descriptive en cas de mismatch
 */
function validatePdfConfig(
  text: string,
  semesterKey: string,
  semesterData: SemesterData,
): void {
  const detected = detectPdfInfo(text);
  const expectedSem = parseInt(semesterKey.replace("s", ""));
  const expectedYear = Math.ceil(expectedSem / 2);

  // Verifier que le semestre attendu est present dans le PDF
  if (detected.semesters.size > 0 && !detected.semesters.has(expectedSem)) {
    // Verifier si c'est une erreur d'annee ou juste de semestre
    const detectedYears = new Set([...detected.semesters].map((s) => Math.ceil(s / 2)));
    const detectedList = [...detected.semesters].sort().join(" et ");

    if (!detectedYears.has(expectedYear)) {
      const detectedYear = [...detectedYears][0];
      throw new Error(
        `Ce bulletin contient les Semestres ${detectedList} (BUT ${detectedYear}), ` +
        `mais vous êtes sur le Semestre ${expectedSem} (BUT ${expectedYear}). ` +
        `Sélectionnez la bonne année avant d'importer.`,
      );
    }
    throw new Error(
      `Ce bulletin contient les Semestres ${detectedList}, ` +
      `mais vous êtes sur le Semestre ${expectedSem}. ` +
      `Importez ce PDF dans le bon semestre.`,
    );
  }

  // Verifier le parcours (BUT 2+ uniquement)
  if (detected.parcours) {
    let expectedParcours: "A" | "B" | null = null;
    for (const r of semesterData.ressources) {
      if (/\.[AB]\./.test(r.id)) {
        expectedParcours = r.id.includes(".A.") ? "A" : "B";
        break;
      }
    }
    if (expectedParcours && detected.parcours !== expectedParcours) {
      throw new Error(
        `Ce bulletin correspond au parcours ${detected.parcours}, ` +
        `mais vous êtes sur le parcours ${expectedParcours}. ` +
        `Vérifiez votre configuration.`,
      );
    }
  }

  // Verifier la formation
  if (detected.formation) {
    let expectedFormation: "FA" | "FI" | null = null;
    for (const r of semesterData.ressources) {
      if (r.id === "Alternance") { expectedFormation = "FA"; break; }
      if (r.id === "Stage") { expectedFormation = "FI"; break; }
    }
    const labels = { FA: "alternance (FA)", FI: "initiale (FI)" };
    if (expectedFormation && detected.formation !== expectedFormation) {
      throw new Error(
        `Ce bulletin correspond à la formation ${labels[detected.formation]}, ` +
        `mais vous êtes en formation ${labels[expectedFormation]}. ` +
        `Vérifiez votre configuration.`,
      );
    }
  }
}

/**
 * Parse un bulletin PDF et retourne les notes par ressource
 * Valide que le PDF correspond au semestre selectionne
 */
export async function parseGradesPdf(
  file: File,
  semesterData: SemesterData | undefined,
  semesterKey?: string,
): Promise<Record<string, string>> {
  const text = await extractTextFromPdf(file);

  // Validation de la configuration
  if (semesterKey && semesterData) {
    validatePdfConfig(text, semesterKey, semesterData);
  }

  const rawNotes = extractNotesFromText(text);

  // Si on a les donnees du semestre, matcher seulement les IDs qui existent
  const result: Record<string, string> = {};

  if (semesterData) {
    // Exclure les ressources sans coefficient (ex: Portfolio en S1)
    const activeIds = new Set(
      semesterData.ressources
        .filter((r) => semesterData.ues.some((ue) => ue.c[r.id] > 0))
        .map((r) => r.id),
    );

    for (const [pdfId, note] of rawNotes) {
      if (activeIds.has(pdfId)) {
        result[pdfId] = note;
      } else {
        // Essayer quelques variantes de matching (zero-padding)
        for (const appId of activeIds) {
          if (
            appId.replace(/\.0(\d)$/, ".$1") ===
            pdfId.replace(/\.0(\d)$/, ".$1")
          ) {
            result[appId] = note;
            break;
          }
        }
      }
    }
  } else {
    // Sans donnees de semestre, retourner tout
    for (const [id, note] of rawNotes) {
      result[id] = note;
    }
  }

  // Extraire le bonus si present dans le PDF
  if (semesterKey) {
    const semNum = parseInt(semesterKey.replace("s", ""));
    const bonus = extractBonusFromText(text, semNum);
    if (bonus) result["_bonus"] = bonus;
  }

  return result;
}
