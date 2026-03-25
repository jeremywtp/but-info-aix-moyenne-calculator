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
      <div className="dapp-header">
        <span className="dapp-path">~/validation/bilan</span>
        <span className="dapp-live">● LIVE</span>
      </div>

      <div className="dapp-content">
        {/* Moyenne Hero */}
        <div className="dapp-hero">
          <div className="dapp-hero-label">&gt; MOYENNE_ANNUELLE</div>
          <div className="dapp-hero-row">
            <span className={`dapp-hero-value ${annualAvg !== null ? (annualAvg >= 10 ? "pass" : "fail") : ""}`}>
              {annualAvg !== null ? annualAvg.toFixed(2) : "--"}
            </span>
            <span className="dapp-hero-unit">/20</span>
            <div className="dapp-hero-bar">
              <div className="dapp-bar-track">
                <div className="dapp-bar-fill" style={{ width: `${avgPercent}%` }} />
                <div className="dapp-bar-mark" />
              </div>
            </div>
          </div>
        </div>

        {/* Stats Grid 2x2 */}
        <div className="dapp-grid-2x2">
          <div className={`dapp-cell ${decision.type}`}>
            <span className="dapp-label">DÉCISION</span>
            <span className="dapp-val">{decision.code}</span>
            <span className="dapp-meta">{descMessages[decision.type] || "en_attente"}</span>
          </div>
          <div className="dapp-cell">
            <span className="dapp-label">ECTS</span>
            <span className="dapp-val">{totalECTS}/60</span>
            <span className="dapp-meta">
              <span>{"█".repeat(filledBlocks)}</span>
              {"░".repeat(emptyBlocks)}
            </span>
          </div>
          <div className={`dapp-cell sem ${sem1V.cls}`}>
            <div className="dapp-sem-top">
              <span>{semesters[0]?.toUpperCase().replace(" ", "_") || "S3"}</span>
              <span className="dapp-badge">{sem1V.badge}</span>
            </div>
            <div className="dapp-sem-data">
              avg:{s1?.moyGenerale !== null ? s1?.moyGenerale?.toFixed(2) : "--"} │ ects:{ects1}/30
            </div>
            <div className="dapp-sem-bar">
              <span style={{ width: `${Math.round((ects1 / 30) * 100)}%` }} />
            </div>
          </div>
          <div className={`dapp-cell sem ${sem2V.cls}`}>
            <div className="dapp-sem-top">
              <span>{semesters[1]?.toUpperCase().replace(" ", "_") || "S4"}</span>
              <span className="dapp-badge">{sem2V.badge}</span>
            </div>
            <div className="dapp-sem-data">
              avg:{s2?.moyGenerale !== null ? s2?.moyGenerale?.toFixed(2) : "--"} │ ects:{ects2}/30
            </div>
            <div className="dapp-sem-bar">
              <span style={{ width: `${Math.round((ects2 / 30) * 100)}%` }} />
            </div>
          </div>
        </div>

        {/* UE Distribution */}
        <div className="dapp-sep">──────────────────── UE_DISTRIBUTION ────────────────────</div>
        <div className="dapp-ue-row">
          <div className="dapp-ue acq">
            <span className="dapp-ue-n">{totalACQ}</span>ACQ<span className="dapp-ue-t">≥10</span>
          </div>
          {totalCMP > 0 && (
            <div className="dapp-ue cmp">
              <span className="dapp-ue-n">{totalCMP}</span>CMP<span className="dapp-ue-t">RCUE</span>
            </div>
          )}
          <div className="dapp-ue nacq">
            <span className="dapp-ue-n">{totalNACQ}</span>NACQ<span className="dapp-ue-t">8-10</span>
          </div>
          <div className="dapp-ue def">
            <span className="dapp-ue-n">{totalDEF}</span>DEF<span className="dapp-ue-t">&lt;8</span>
          </div>
          <div className="dapp-ue-total">TOTAL:{totalACQ + totalCMP + totalNACQ + totalDEF}/{totalUE}</div>
        </div>
      </div>

      <div className="dapp-terminal">
        <span className="dapp-prompt">$</span> coeff --protocol arrêté_26_mai_2022
        <span className="dapp-time">{time} │ Session: {sessionTime}</span>
      </div>
    </footer>
  );
}
