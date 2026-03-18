import type {
  Config, SemesterData, SemesterResult, UEResult, UEStatus,
  DecisionResult, CompetenceResult, MessageInfo, Year,
} from "@/types";
import { ALL_DATA, UE_COLORS } from "@/data/coefficients";

export function parseNote(value: string | undefined): number | null {
  if (!value) return null;
  const val = parseFloat(value.replace(",", "."));
  return isNaN(val) ? null : Math.max(0, Math.min(20, val));
}

export function getSemesters(year: Year): [string, string] {
  if (year === "1") return ["s1", "s2"];
  if (year === "2") return ["s3", "s4"];
  return ["s5", "s6"];
}

export function getConfigKey(config: Config): string {
  return `${config.year}-${config.formation}-${config.parcours}`;
}

export function getCurrentData(config: Config) {
  return ALL_DATA[config.year]?.[config.formation]?.[config.parcours] ?? null;
}

export function calculateSemesterStats(
  data: SemesterData | undefined,
  notes: Record<string, string>,
  semLabel: string,
): SemesterResult | null {
  if (!data) return null;

  let totalPts = 0;
  let totalEcts = 0;
  let notesCount = 0;

  Object.values(notes).forEach(v => { if (v) notesCount++; });

  const ueDetails: UEResult[] = data.ues.map((ue, idx) => {
    let pts = 0;
    let coeffSum = 0;

    data.ressources.forEach(r => {
      const note = parseNote(notes[r.id]);
      const coeff = ue.c[r.id] || 0;
      if (note !== null && coeff) {
        pts += note * coeff;
        coeffSum += coeff;
      }
    });

    const moy = coeffSum ? pts / coeffSum : null;
    let statut: UEStatus | null = null;
    if (moy !== null) {
      if (moy >= 10) statut = "ACQ";
      else if (moy >= 8) statut = "NACQ";
      else statut = "DEF";
    }

    if (moy !== null) {
      totalPts += moy * ue.ects;
      totalEcts += ue.ects;
    }

    return {
      ue: ue.ue,
      nom: ue.nom,
      moy,
      ects: ue.ects,
      statut,
      ectsAcquis: statut === "ACQ" ? ue.ects : 0,
      color: UE_COLORS[idx] || "#888",
    };
  });

  const uesACQ = ueDetails.filter(u => u.statut === "ACQ").length;
  const uesNACQ = ueDetails.filter(u => u.statut === "NACQ").length;
  const uesDEF = ueDetails.filter(u => u.statut === "DEF").length;
  const ectsAcquis = ueDetails.reduce((acc, u) => acc + u.ectsAcquis, 0);
  const moyGenerale = totalEcts ? totalPts / totalEcts : null;
  const semestreValide = moyGenerale !== null && moyGenerale >= 10 && uesDEF === 0;

  return {
    sem: semLabel,
    moyGenerale,
    ueDetails,
    uesTotal: data.ues.length,
    uesACQ,
    uesNACQ,
    uesDEF,
    ectsAcquis,
    notesCount,
    totalNotes: data.ressources.length,
    semestreValide,
    hasData: totalEcts > 0,
  };
}

export function determineDecision(
  s1: SemesterResult | null,
  s2: SemesterResult | null,
  config: Config,
): DecisionResult {
  const hasBoth = s1?.hasData && s2?.hasData;
  if (!hasBoth || s1?.moyGenerale === null || s2?.moyGenerale === null) {
    if (s1?.hasData || s2?.hasData) return { code: "--", desc: "incomplet", type: "" };
    return { code: "--", desc: "en attente", type: "" };
  }

  const totalUE = (s1.uesTotal) + (s2.uesTotal);
  const totalACQ = s1.uesACQ + s2.uesACQ;
  const totalDEF = s1.uesDEF + s2.uesDEF;
  const totalECTS = s1.ectsAcquis + s2.ectsAcquis;

  if (s1.semestreValide && s2.semestreValide) {
    return { code: "ADM", desc: "validé", type: "adm" };
  }
  if (config.but1Validated && totalDEF === 0 && totalACQ > totalUE / 2) {
    return { code: "ADM", desc: "compensation", type: "adm" };
  }
  if (s1.semestreValide || s2.semestreValide || totalECTS >= 30) {
    return { code: "AJAC", desc: "jury", type: "ajac" };
  }
  return { code: "AJ", desc: "ajourné", type: "aj" };
}

function calculateCompetences(
  s1: SemesterResult | null,
  s2: SemesterResult | null,
): CompetenceResult[] {
  if (!s1 || !s2) return [];
  const competences: CompetenceResult[] = [];
  const len = Math.min(s1.ueDetails.length, s2.ueDetails.length);
  for (let i = 0; i < len; i++) {
    const ue1 = s1.ueDetails[i];
    const ue2 = s2.ueDetails[i];
    if (ue1.moy !== null && ue2.moy !== null) {
      const moy = (ue1.moy + ue2.moy) / 2;
      competences.push({ nom: ue1.nom, moy, valide: moy >= 10 });
    }
  }
  return competences;
}

export function calculateAnnualAvg(
  s1: SemesterResult | null,
  s2: SemesterResult | null,
): number | null {
  if (s1?.moyGenerale != null && s2?.moyGenerale != null) {
    return (s1.moyGenerale + s2.moyGenerale) / 2;
  }
  return s1?.moyGenerale ?? s2?.moyGenerale ?? null;
}

export function generateMessages(
  semStats: (SemesterResult | null)[],
  decision: DecisionResult,
  config: Config,
): MessageInfo[] {
  const messages: MessageInfo[] = [];
  const validStats = semStats.filter((s): s is SemesterResult => s !== null);
  const totalNotes = validStats.reduce((acc, s) => acc + s.notesCount, 0);

  if (totalNotes === 0) {
    messages.push({ type: "neutral", text: "En attente de saisie... Entrez vos notes dans les tableaux ci-dessus pour generer automatiquement votre bilan de validation." });
    messages.push({ type: "info", text: "Rappel : Une UE est acquise (ACQ) si sa moyenne est >= 10/20. Entre 8 et 10, elle est compensable (NACQ). En dessous de 8, elle est eliminatoire (DEF)." });
    return messages;
  }

  validStats.forEach(s => {
    if (s.notesCount === 0) return;

    if (s.notesCount < s.totalNotes) {
      const pct = Math.round((s.notesCount / s.totalNotes) * 100);
      messages.push({ type: "info", text: `[${s.sem}] Saisie en cours : ${s.notesCount}/${s.totalNotes} notes (${pct}%). Le bilan ci-dessous est provisoire.` });
    }

    if (s.moyGenerale === null) return;

    if (s.uesDEF > 0) {
      const list = s.ueDetails.filter(u => u.statut === "DEF").map(u => `${u.ue} (${u.moy!.toFixed(2)})`).join(", ");
      messages.push({ type: "error", text: `[${s.sem}] ALERTE : ${s.uesDEF} UE defaillante${s.uesDEF > 1 ? "s" : ""} → ${list}. Une note < 8/20 est eliminatoire et bloque la validation automatique du semestre.` });
    }

    if (s.uesNACQ > 0) {
      const list = s.ueDetails.filter(u => u.statut === "NACQ").map(u => `${u.ue} (${u.moy!.toFixed(2)})`).join(", ");
      messages.push({ type: "warning", text: `[${s.sem}] Attention : ${s.uesNACQ} UE entre 8 et 10/20 → ${list}. Ces UE peuvent etre compensees si votre moyenne generale atteint 10/20.` });
    }

    if (s.semestreValide) {
      messages.push({ type: "success", text: `[${s.sem}] SEMESTRE VALIDE : Moyenne ${s.moyGenerale.toFixed(2)}/20 | ${s.ectsAcquis}/30 ECTS acquis | ${s.uesACQ}/${s.uesTotal} UE validees.` });
    } else if (s.moyGenerale >= 10 && s.uesDEF > 0) {
      messages.push({ type: "error", text: `[${s.sem}] SEMESTRE NON VALIDE : Votre moyenne de ${s.moyGenerale.toFixed(2)}/20 est suffisante, mais la presence d'UE eliminatoire(s) < 8 bloque la validation.` });
    } else if (s.moyGenerale < 10) {
      const manque = (10 - s.moyGenerale).toFixed(2);
      messages.push({ type: "error", text: `[${s.sem}] SEMESTRE NON VALIDE : Moyenne ${s.moyGenerale.toFixed(2)}/20 (il manque ${manque} points) | ${s.ectsAcquis}/30 ECTS acquis.` });
    }
  });

  if (validStats.length === 2 && validStats.every(s => s.moyGenerale !== null)) {
    const s3 = validStats[0];
    const s4 = validStats[1];
    const competences = calculateCompetences(s3, s4);
    const compValidees = competences.filter(c => c.valide).length;

    if (competences.length > 0) {
      const detail = competences.map(c => `${c.nom}: ${c.moy.toFixed(2)} ${c.valide ? "(VAL)" : "(NON VAL)"}`).join(" | ");
      messages.push({ type: "info", text: `[COMPETENCES] ${compValidees}/${competences.length} competences annuelles validees. Detail : ${detail}` });
    }

    const totalUE = s3.uesTotal + s4.uesTotal;
    const totalACQ = s3.uesACQ + s4.uesACQ;
    const totalDEF = s3.uesDEF + s4.uesDEF;
    const totalECTS = s3.ectsAcquis + s4.ectsAcquis;
    const moyAnnuelle = ((s3.moyGenerale ?? 0) + (s4.moyGenerale ?? 0)) / 2;

    let statutAnnee = "";
    let statutType: MessageInfo["type"] = "info";

    if (s3.semestreValide && s4.semestreValide) {
      statutAnnee = `ADM (Admis) — Vos deux semestres sont valides. Passage en annee superieure avec 60 ECTS.`;
      statutType = "success";
    } else if (config.but1Validated && totalDEF === 0 && totalACQ > totalUE / 2) {
      statutAnnee = `ADM (Compensation annuelle) — BUT1 valide + 0 DEF + ${totalACQ}/${totalUE} UE >= 10. Passage de droit accorde.`;
      statutType = "success";
    } else if (s3.semestreValide || s4.semestreValide || totalECTS >= 30) {
      const raison = s3.semestreValide ? "le S3 est valide" : s4.semestreValide ? "le S4 est valide" : `${totalECTS}/60 ECTS (>= 30)`;
      const note = (!config.but1Validated && totalDEF === 0 && totalACQ > totalUE / 2)
        ? ` Note : conditions de compensation remplies (0 DEF + ${totalACQ}/${totalUE} ACQ) mais BUT1 non valide.`
        : "";
      statutAnnee = `AJAC — Car ${raison}. Passage avec dettes. Decision du jury.${note}`;
      statutType = "warning";
    } else {
      const note = (!config.but1Validated && totalDEF === 0 && totalACQ > totalUE / 2)
        ? ` Note : conditions de compensation remplies mais BUT1 non valide.`
        : "";
      statutAnnee = `AJ (Ajourne) — Les conditions de passage ne sont pas remplies. Redoublement requis.${note}`;
      statutType = "error";
    }

    messages.push({ type: statutType, text: `>>> DECISION ANNEE : ${statutAnnee}` });
    messages.push({ type: "info", text: `[RECAPITULATIF] Moyenne annuelle : ${moyAnnuelle.toFixed(2)}/20 | ECTS : ${totalECTS}/60 | UE : ${totalACQ} ACQ + ${s3.uesNACQ + s4.uesNACQ} NACQ + ${totalDEF} DEF = ${totalUE} total.` });
  }

  if (messages.length === 0) {
    messages.push({ type: "neutral", text: "Poursuivez la saisie de vos notes pour obtenir un bilan complet." });
  }

  return messages;
}
