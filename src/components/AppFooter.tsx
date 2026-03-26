"use client";

import { useState, useEffect, useRef } from "react";
import type { SemesterResult, DecisionResult, YearData, Config } from "@/types";
import { RESOURCE_NAMES } from "@/data/resourceNames";
import { PUBLISH_KEY, SHEET_GIDS } from "@/hooks/useSheetData";

interface AppFooterProps {
  semesterStats: (SemesterResult | null)[];
  decision: DecisionResult;
  annualAvg: number | null;
  semesters: string[];
  currentData: YearData | null;
  config: Config;
}

const descMessages: Record<string, string> = {
  adm: "passage_validé",
  ajac: "soumis_au_jury",
  aj: "redoublement_requis",
  "": "en_attente",
};

export function AppFooter({ semesterStats, decision, annualAvg, semesters, currentData, config }: AppFooterProps) {
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

        <div className="dapp-guide">
          <div className="dapp-guide-header">
            <span className="dapp-guide-icon">&#x2726;</span>
            <span>GUIDE DE VALIDATION</span>
            <span className="dapp-guide-sub">Arrêté du 26 mai 2022</span>
          </div>
          <div className="dapp-guide-grid">
            <div className="dapp-guide-card">
              <div className="dapp-guide-title">Statuts UE</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code acq">ACQ</span><span>Moyenne &ge; 10 — ECTS acquis</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code nacq">NACQ</span><span>Entre 8 et 10 — compensable par RCUE</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code def">DEF</span><span>Inférieure à 8 — éliminatoire</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code cmp">CMP</span><span>Compensée par la compétence annuelle</span></div>
            </div>
            <div className="dapp-guide-card">
              <div className="dapp-guide-title">Compétences (RCUE)</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code acq">VAL</span><span>Moyenne des 2 UE &ge; 10</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code def">N.VAL</span><span>Moyenne des 2 UE &lt; 10</span></div>
              <div className="dapp-guide-note">1 RCUE = UE du S impair + UE du S pair de la même compétence. Pas de compensation entre compétences.</div>
            </div>
            <div className="dapp-guide-card">
              <div className="dapp-guide-title">Décision annuelle</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code adm">ADM</span><span>2 semestres validés — 60 ECTS</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code adm">ADM</span><span>0 DEF + majorité ACQ + BUT-1 validé</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code ajac">AJAC</span><span>1 sem. validé ou &ge; 30 ECTS — jury</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code aj">AJ</span><span>Aucune condition — redoublement</span></div>
            </div>
            <div className="dapp-guide-card">
              <div className="dapp-guide-title">Bonus &amp; Malus</div>
              <div className="dapp-guide-row"><span className="dapp-guide-code bonus">+</span><span>Sport, engagement... +0.1 à +0.5 par UE</span></div>
              <div className="dapp-guide-row"><span className="dapp-guide-code malus">&minus;</span><span>Absences injustifiées, soustrait par UE</span></div>
              <div className="dapp-guide-note">Cumulables. Détectés automatiquement à l'import PDF (ScoDoc &amp; AMU).</div>
            </div>
          </div>
          {currentData && (() => {
            const configKey = `${config.year}-${config.formation}-${config.parcours}`;
            const gid = SHEET_GIDS[configKey];
            const sheetUrl = gid ? `https://docs.google.com/spreadsheets/d/e/${PUBLISH_KEY}/pubhtml?gid=${gid}` : null;
            return (
            <div className="dapp-guide-resources">
              <div className="dapp-guide-res-header">
                <span>BUT {config.year} — {config.formation} — Parcours {config.parcours}</span>
                {sheetUrl && <a href={sheetUrl} target="_blank" rel="noopener noreferrer" className="dapp-guide-res-link">Voir les coefficients &#x2197;</a>}
              </div>
              {semesters.map(sem => {
                const semData = currentData[sem];
                if (!semData) return null;
                const semNum = sem.replace("s", "");
                const ressources = semData.ressources.filter(r =>
                  semData.ues.some(ue => ue.c[r.id] > 0),
                );
                return (
                  <div key={sem} className="dapp-guide-sem-block">
                    <div className="dapp-guide-sem-title">S{semNum} — Ressources &amp; SAE</div>
                    <table className="dapp-guide-res-table">
                      <tbody>
                        {ressources.map(r => (
                          <tr key={r.id}>
                            <td className="dapp-res-id">{r.id}</td>
                            <td className="dapp-res-name">{RESOURCE_NAMES[r.id] || ""}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
            </div>
            );
          })()}
        </div>
      </div>
    </footer>
  );
}
