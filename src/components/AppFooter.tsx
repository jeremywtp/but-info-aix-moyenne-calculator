"use client";

import { useState, useEffect, useRef } from "react";
import type { SemesterResult, DecisionResult } from "@/types";

interface AppFooterProps {
  semesterStats: (SemesterResult | null)[];
  decision: DecisionResult;
  annualAvg: number | null;
  semesters: string[];
}

const descMessages: Record<string, string> = {
  adm: "passage_validé",
  ajac: "soumis_au_jury",
  aj: "redoublement_requis",
  "": "en_attente",
};

export function AppFooter({ semesterStats, decision, annualAvg, semesters }: AppFooterProps) {
  const [time, setTime] = useState("--:--");
  const [sessionTime, setSessionTime] = useState("00:00");
  const startRef = useRef(Date.now());

  useEffect(() => {
    let id: ReturnType<typeof setInterval>;

    const update = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" }));
      const elapsed = Math.floor((Date.now() - startRef.current) / 1000);
      const mins = Math.floor(elapsed / 60).toString().padStart(2, "0");
      const secs = (elapsed % 60).toString().padStart(2, "0");
      setSessionTime(`${mins}:${secs}`);
    };

    const start = () => { update(); id = setInterval(update, 1000); };
    const stop = () => clearInterval(id);

    const onVisibility = () => {
      if (document.hidden) stop(); else start();
    };

    start();
    document.addEventListener("visibilitychange", onVisibility);
    return () => { stop(); document.removeEventListener("visibilitychange", onVisibility); };
  }, []);

  const s1 = semesterStats[0];
  const s2 = semesterStats[1];

  const ects1 = s1?.ectsAcquis || 0;
  const ects2 = s2?.ectsAcquis || 0;
  const totalECTS = ects1 + ects2;
  const totalACQ = (s1?.uesACQ || 0) + (s2?.uesACQ || 0);
  const totalCMP = (s1?.uesCMP || 0) + (s2?.uesCMP || 0);
  const totalNACQ = (s1?.uesNACQ || 0) + (s2?.uesNACQ || 0);
  const totalDEF = (s1?.uesDEF || 0) + (s2?.uesDEF || 0);
  const totalUE = (s1?.uesTotal || 0) + (s2?.uesTotal || 0);

  const avgPercent = annualAvg !== null ? Math.min((annualAvg / 20) * 100, 100) : 0;
  const filledBlocks = Math.round((totalECTS / 60) * 10);
  const emptyBlocks = 10 - filledBlocks;

  const getSemValidation = (stat: SemesterResult | null) => {
    if (!stat?.hasData) return { cls: "", badge: "--" };
    if (stat.semestreValide) return { cls: "valid", badge: "VAL" };
    if (stat.uesDEF > 0) return { cls: "invalid", badge: "DEF" };
    return { cls: "warning", badge: "NACQ" };
  };

  const sem1V = getSemValidation(s1);
  const sem2V = getSemValidation(s2);

  return (
    <footer className="dapp-footer">
      <div className="dapp-content">
        {/* Bilan Annuel — meme style que InterStatsPanel */}
        <section className="inter-stats-panel annual-panel">
          <div className="inter-stats-header">
            <span className="inter-stats-bracket">[</span>
            <span className="inter-stats-title">BILAN ANNUEL</span>
            <span className="inter-stats-bracket">]</span>
          </div>
          <div className="inter-stats-content">
            <div className="inter-stats-main">
              <div className="inter-stat-big">
                <div className={`inter-stat-value ${annualAvg !== null ? (annualAvg >= 10 ? "pass" : "fail") : ""}`}>
                  {annualAvg !== null ? annualAvg.toFixed(2) : "--"}
                </div>
                <div className="inter-stat-label">MOYENNE ANNUELLE</div>
                <div className={`inter-stat-status ${decision.type === "adm" ? "validated" : decision.type ? "not-validated" : ""}`}>
                  {decision.code !== "--" ? `${decision.code} — ${descMessages[decision.type] || ""}` : "En attente"}
                </div>
              </div>
            </div>
            {s1 && s2 && s1.hasData && s2.hasData && (() => {
              const len = Math.min(s1.ueDetails.length, s2.ueDetails.length);
              const comps = [];
              for (let i = 0; i < len; i++) {
                const ue1 = s1.ueDetails[i];
                const ue2 = s2.ueDetails[i];
                if (ue1.moy !== null && ue2.moy !== null) {
                  const rcue = (ue1.moy + ue2.moy) / 2;
                  const hasCMP = ue1.statut === "CMP" || ue2.statut === "CMP";
                  comps.push({ nom: ue1.nom, rcue, valide: rcue >= 10, hasCMP, ue1, ue2 });
                }
              }
              if (comps.length === 0) return null;
              const compVal = comps.filter(c => c.valide).length;
              return (
                <>
                  <div className="inter-stats-ues">
                    {comps.map(c => (
                      <div key={c.nom} className={`inter-ue-card ${c.valide ? "acq" : "nacq"} ${c.hasCMP ? "has-cmp" : ""}`}>
                        <div className="inter-ue-name">{c.nom}</div>
                        <div className="inter-ue-avg">{c.rcue.toFixed(2)}</div>
                        <div className="inter-ue-statut">{c.valide ? "VAL" : "NON VAL"}</div>
                        {c.hasCMP && <div className="inter-ue-cmp">CMP</div>}
                      </div>
                    ))}
                  </div>
                  <div className="inter-stats-details">
                    <div className="inter-detail">
                      <span className="inter-detail-icon">◆</span>
                      <span className="inter-detail-label">Compétences validées</span>
                      <span className="inter-detail-value">{compVal}/{comps.length}</span>
                    </div>
                    <div className="inter-detail">
                      <span className="inter-detail-icon">◆</span>
                      <span className="inter-detail-label">ECTS acquis</span>
                      <span className="inter-detail-value">{totalECTS}/60</span>
                    </div>
                    <div className="inter-detail">
                      <span className="inter-detail-icon">◆</span>
                      <span className="inter-detail-label">UE validées (ACQ+CMP)</span>
                      <span className="inter-detail-value">{totalACQ + totalCMP}/{totalUE}</span>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </section>

        <details className="dapp-guide">
          <summary className="dapp-guide-toggle">/// GUIDE DE VALIDATION — Arrêté du 26 mai 2022</summary>
          <div className="dapp-guide-content">
            <div className="dapp-guide-section">
              <div className="dapp-guide-title">Statuts UE (par semestre)</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code acq">ACQ</span> Moyenne UE &ge; 10/20 — ECTS acquis</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code nacq">NACQ</span> 8 &le; Moyenne UE &lt; 10 — compensable par le RCUE</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code def">DEF</span> Moyenne UE &lt; 8/20 — éliminatoire, jamais compensable</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code cmp">CMP</span> UE NACQ compensée : la compétence annuelle (RCUE) &ge; 10 — ECTS acquis</div>
            </div>
            <div className="dapp-guide-section">
              <div className="dapp-guide-title">Compétences annuelles (RCUE)</div>
              <div className="dapp-guide-row">Chaque compétence = moyenne des 2 UE correspondantes (S impair + S pair)</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code acq">VAL</span> RCUE &ge; 10/20 — les UE NACQ de cette compétence deviennent CMP</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code def">NON VAL</span> RCUE &lt; 10/20 — pas de compensation, les NACQ restent NACQ</div>
              <div className="dapp-guide-row dapp-guide-note">Pas de compensation entre compétences différentes</div>
            </div>
            <div className="dapp-guide-section">
              <div className="dapp-guide-title">Décision annuelle</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code adm">ADM</span> 2 semestres validés (moy &ge; 10 + 0 DEF) — passage + 60 ECTS</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code adm">ADM</span> Compensation : BUT précédent validé + 0 DEF + majorité UE &ge; 10</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code ajac">AJAC</span> 1 semestre validé OU &ge; 30 ECTS — passage avec dettes (jury)</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code aj">AJ</span> Aucune condition remplie — redoublement requis</div>
            </div>
            <div className="dapp-guide-section">
              <div className="dapp-guide-title">Bonus / Malus</div>
              <div className="dapp-guide-row">Les bonus (sport, engagement...) s'ajoutent à chaque moyenne UE (+0.1 à +0.5)</div>
              <div className="dapp-guide-row">Les malus (absences injustifiées) se soustraient de chaque moyenne UE</div>
              <div className="dapp-guide-row dapp-guide-note">Les bonus/malus sont cumulables et détectés automatiquement à l'import PDF</div>
            </div>
          </div>
        </details>
      </div>
    </footer>
  );
}
