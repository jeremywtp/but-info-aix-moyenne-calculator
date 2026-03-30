import { memo } from "react";
import type { SemesterResult } from "@/types";

interface InterStatsPanelProps {
  stats: SemesterResult | null;
}

export const InterStatsPanel = memo(function InterStatsPanel({ stats }: InterStatsPanelProps) {
  if (!stats) return null;

  const avgClass = stats.moyGenerale !== null ? (stats.moyGenerale >= 10 ? "pass" : "fail") : "";

  let statusText = "En attente de notes";
  let statusClass = "";
  if (stats.moyGenerale !== null) {
    if (stats.semestreValide) {
      statusText = "Semestre validé";
      statusClass = "validated";
    } else {
      statusText = "Non validé";
      statusClass = "not-validated";
    }
  }

  const bestUe = stats.ueDetails.reduce<{ name: string; avg: number }>(
    (best, ue) => {
      if (ue.moy !== null && ue.moy > best.avg) return { name: ue.ue, avg: ue.moy };
      return best;
    },
    { name: "--", avg: 0 },
  );

  return (
    <section className="inter-stats-panel">
      <div className="inter-stats-accent" />
      <div className="inter-stats-header">
        <span className="inter-stats-title">BILAN SEMESTRE</span>
        <span className="inter-stats-sem">{stats.sem}</span>
      </div>
      <div className="inter-stats-content">
        <div className="inter-stats-main">
          <div className="inter-stat-big">
            <div className={`inter-stat-value ${avgClass}`}>
              {stats.moyGenerale !== null ? stats.moyGenerale.toFixed(2) : "--"}
            </div>
            <div className="inter-stat-label">MOYENNE GÉNÉRALE</div>
            <div className={`inter-stat-status ${statusClass}`}>{statusText}</div>
          </div>
        </div>
        <div className="inter-stats-ues">
          {stats.ueDetails.map(ue => (
            <div
              key={ue.ue}
              className={`inter-ue-card ${ue.statut?.toLowerCase() || ""}`}
              style={{ "--ue-color": ue.color } as React.CSSProperties}
            >
              <div className="inter-ue-name">{ue.ue}</div>
              <div className="inter-ue-avg">{ue.moy !== null ? ue.moy.toFixed(2) : "--"}</div>
              <div className="inter-ue-statut">{ue.statut || "--"}</div>
              <div className="inter-ue-ects">{ue.ects} ECTS</div>
            </div>
          ))}
        </div>
        <div className="inter-stats-details">
          <div className="inter-detail">
            <span className="inter-detail-icon">◆</span>
            <span className="inter-detail-label">Notes saisies</span>
            <span className="inter-detail-value">{stats.notesCount}/{stats.totalNotes}</span>
          </div>
          <div className="inter-detail">
            <span className="inter-detail-icon">◆</span>
            <span className="inter-detail-label">UE validées</span>
            <span className="inter-detail-value">{stats.uesACQ + (stats.uesCMP || 0)}/{stats.uesTotal}</span>
          </div>
          <div className="inter-detail">
            <span className="inter-detail-icon">◆</span>
            <span className="inter-detail-label">ECTS acquis</span>
            <span className="inter-detail-value">{stats.ectsAcquis}/30</span>
          </div>
          <div className="inter-detail">
            <span className="inter-detail-icon">◆</span>
            <span className="inter-detail-label">Meilleure UE</span>
            <span className="inter-detail-value">
              {bestUe.avg > 0 ? `${bestUe.name} (${bestUe.avg.toFixed(2)})` : "--"}
            </span>
          </div>
        </div>
      </div>
    </section>
  );
});
