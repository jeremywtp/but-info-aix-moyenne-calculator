"use client";

import { memo, useCallback } from "react";
import type { SemesterData, UEResult } from "@/types";
import { parseNote } from "@/lib/calculations";

interface SemesterTableProps {
  semesterKey: string;
  data: SemesterData | undefined;
  notes: Record<string, string>;
  onNoteChange: (sem: string, id: string, value: string) => void;
  onReset: (sem: string) => void;
  ueResults: UEResult[];
  totalAvg: number | null;
}

function getInputClass(value: string | undefined): string {
  if (!value) return "";
  const n = parseNote(value);
  if (n === null) return "";
  return n < 0 || n > 20 ? "input-error" : "input-valid";
}

function getAvgClass(moy: number | null | undefined): string {
  if (moy === null || moy === undefined) return "neutral";
  return moy >= 10 ? "pass" : "fail";
}

export const SemesterTable = memo(function SemesterTable({
  semesterKey,
  data,
  notes,
  onNoteChange,
  onReset,
  ueResults,
  totalAvg,
}: SemesterTableProps) {
  const handleReset = useCallback(() => {
    if (confirm(`Confirmer RESET pour ${semesterKey.toUpperCase()} ?`)) {
      onReset(semesterKey);
    }
  }, [semesterKey, onReset]);

  if (!data) {
    return (
      <section className="glass-card">
        <div className="semester-header">
          <div className="semester-title">Semestre {semesterKey.replace("s", "")}</div>
        </div>
        <div className="table-container">
          <table>
            <tbody>
              <tr>
                <td colSpan={20} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>
                  Configuration non disponible pour cette combinaison.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    );
  }

  const semNum = semesterKey.replace("s", "");
  const hasData = Object.values(notes).some(v => v);

  return (
    <section className={`glass-card ${hasData ? "has-data" : ""}`}>
      <div className="semester-header">
        <div className="semester-title">Semestre {semNum}</div>
        <button className="btn-reset" onClick={handleReset}>
          /// RESET :: {semesterKey.toUpperCase()}
        </button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>UE / Competence</th>
              {data.ressources.map(r => (
                <th key={r.id} className="tooltip-container">
                  {r.id}
                  <div className="custom-tooltip">
                    <div className="tooltip-title">{r.id}</div>
                    <div className="tooltip-desc">{r.nom}</div>
                  </div>
                </th>
              ))}
              <th>Coeff</th>
              <th>Moy.</th>
            </tr>
            <tr className="notes-row">
              <td><div className="notes-label">Notes /20</div></td>
              {data.ressources.map(r => (
                <td key={r.id}>
                  <input
                    type="number"
                    className={`note-input ${getInputClass(notes[r.id])}`}
                    value={notes[r.id] || ""}
                    onChange={e => onNoteChange(semesterKey, r.id, e.target.value)}
                    min={0}
                    max={20}
                    step={0.01}
                    placeholder="--"
                  />
                </td>
              ))}
              <td colSpan={2} />
            </tr>
          </thead>
          <tbody>
            {data.ues.map((ue, i) => {
              const result = ueResults.find(r => r.ue === ue.ue);
              return (
                <tr key={ue.ue}>
                  <td>
                    <div className="competence-cell">
                      <div className="competence-indicator" />
                      <div className="competence-info">
                        <span className="competence-ue">{ue.ue}</span>
                        <span className="competence-name">{ue.nom}</span>
                      </div>
                    </div>
                  </td>
                  {data.ressources.map(r => {
                    const coeff = ue.c[r.id] || 0;
                    return (
                      <td key={r.id} className={`coeff-cell ${coeff ? "active" : ""}`}>
                        {coeff || "--"}
                      </td>
                    );
                  })}
                  <td className="coeff-cell">{ue.coeff}</td>
                  <td className={`avg-cell ${getAvgClass(result?.moy)}`}>
                    {result?.moy !== null && result?.moy !== undefined ? result.moy.toFixed(2) : "--"}
                  </td>
                </tr>
              );
            })}
            <tr className="total-row">
              <td><div className="total-label">Total Semestre</div></td>
              {data.ressources.map(r => <td key={r.id} />)}
              <td className="coeff-cell">{data.totaux.coeff}</td>
              <td className={`avg-cell ${getAvgClass(totalAvg)}`}>
                {totalAvg !== null ? totalAvg.toFixed(2) : "--"}
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
});
