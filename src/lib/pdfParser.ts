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
 * Extrait les notes depuis le texte brut d'un bulletin PDF ScoDoc
 * Retourne un Map de resourceId → note (string)
 */
function extractNotesFromText(text: string): Map<string, string> {
  const notes = new Map<string, string>();
  const lines = text.split("\n").map((l) => l.trim()).filter(Boolean);

  for (const line of lines) {
    // Pattern des lignes de ressources dans les sections UE (pages 1-2) :
    // "R3.01 R3.01 Développement Web 10.0 15.83"
    // "S3.B.1 SAE3.B.01 Serv appli 20.0 18.00"
    // "Alternance S3 Alternance 20.0 16.00"
    //
    // On cherche : fin de ligne = {coef} {note} (deux nombres)
    // La note peut avoir un zero en tete (01.75, 09.70)
    const match = line.match(
      /^(.+?)\s+(\d+\.?\d*)\s+(\d{2}\.\d{2})\s*$/,
    );
    if (!match) continue;

    const prefix = match[1];
    const note = match[3];

    // Ignorer les lignes d'en-tete UE (contiennent "Rang:" ou "ECTS:" ou "Promotion")
    if (/Rang:|ECTS:|Promotion|min\.|moy\.|max\./i.test(prefix)) continue;

    // Extraire l'ID de la ressource (premier mot/groupe avant le nom descriptif)
    // "R3.01 R3.01 Développement Web" → "R3.01"
    // "S3.B.1 SAE3.B.01 Serv appli" → "S3.B.1"
    // "Alternance S3 Alternance" → "Alternance S3"
    let resourceId = "";

    // R3.01, R2.01, R1.L.1, R3.A.L1, etc.
    const rMatch = prefix.match(/^(R\d+\.[^\s]+)/);
    if (rMatch) {
      resourceId = rMatch[1];
    }

    // SAE avec parcours : S3.A.01, S3.B.1, etc.
    if (!resourceId) {
      const sParcoursMatch = prefix.match(/^(S\d+\.[AB]\.?\d+)/);
      if (sParcoursMatch) resourceId = sParcoursMatch[1];
    }

    // SAE sans parcours (BUT 1) : S2.01, S1.06, etc.
    if (!resourceId) {
      const sSimpleMatch = prefix.match(/^(S\d+\.\d+)/);
      if (sSimpleMatch) resourceId = sSimpleMatch[1];
    }

    // Portfolio : "P2 Portfolio S2" → "Portfolio"
    if (!resourceId) {
      const pMatch = prefix.match(/^P\d+\s+Portfolio/i);
      if (pMatch) resourceId = "P-Portfolio";
    }

    // Alternance / Stage : "Alternance S3" → "Alternance"
    if (!resourceId) {
      const specialMatch = prefix.match(
        /^(Alternance|Stage)\s+S\d+/i,
      );
      if (specialMatch) resourceId = specialMatch[0];
    }

    if (!resourceId) continue;

    // Ignorer les notes avec "~" (pas de note)
    if (note === "~" || note.includes("~")) continue;

    const normalizedId = normalizePdfId(resourceId);

    // Ne garder que la premiere occurrence (toutes les occurrences ont la meme note)
    if (!notes.has(normalizedId)) {
      notes.set(normalizedId, note);
    }
  }

  return notes;
}

/**
 * Extrait le texte d'un fichier PDF via pdfjs-dist
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
    // Regrouper les items par position Y pour reconstituer les lignes
    let lastY = -1;
    let line = "";
    for (const item of content.items) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const a = item as any;
      if (!a.transform) continue;
      const y = Math.round(a.transform[5]);
      if (lastY !== -1 && Math.abs(y - lastY) > 2) {
        lines.push(line.trim());
        line = "";
      }
      line += a.str ?? "";
      lastY = y;
    }
    if (line) lines.push(line.trim());
  }

  return lines.join("\n");
}

/**
 * Parse un bulletin PDF ScoDoc et retourne les notes par ressource
 * Les IDs retournes sont normalises pour matcher les IDs de l'app
 */
export async function parseGradesPdf(
  file: File,
  semesterData: SemesterData | undefined,
): Promise<Record<string, string>> {
  const text = await extractTextFromPdf(file);
  const rawNotes = extractNotesFromText(text);

  // Si on a les donnees du semestre, matcher seulement les IDs qui existent
  const result: Record<string, string> = {};

  if (semesterData) {
    const appIds = new Set(semesterData.ressources.map((r) => r.id));

    for (const [pdfId, note] of rawNotes) {
      if (appIds.has(pdfId)) {
        result[pdfId] = note;
      } else {
        // Essayer quelques variantes de matching
        // "S3.B.01" dans le PDF pourrait etre "S3.B.01" dans l'app
        // mais aussi tenter sans le zero : "S3.B.1" → "S3.B.01"
        for (const appId of appIds) {
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

  return result;
}
