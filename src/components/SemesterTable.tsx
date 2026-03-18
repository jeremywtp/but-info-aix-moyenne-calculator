"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { SemesterData, UEResult } from "@/types";
import { UE_COLORS } from "@/data/coefficients";
import { parseNote } from "@/lib/calculations";

function AvgCell({ value, className }: { value: string; className: string }) {
  const prevRef = useRef(value);
  const cellRef = useRef<HTMLTableCellElement>(null);

  useEffect(() => {
    if (prevRef.current !== value && value !== "--" && cellRef.current) {
      cellRef.current.classList.add("updating");
      const timer = setTimeout(() => cellRef.current?.classList.remove("updating"), 400);
      prevRef.current = value;
      return () => clearTimeout(timer);
    }
    prevRef.current = value;
  }, [value]);

  return <td ref={cellRef} className={className}>{value}</td>;
}

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

export function SemesterTable({
  semesterKey,
  data,
  notes,
  onNoteChange,
  onReset,
  ueResults,
  totalAvg,
}: SemesterTableProps) {
  const [hoveredCol, setHoveredCol] = useState<number | null>(null);
  const [activeRow, setActiveRow] = useState<number | null>(null);

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
              {data.ressources.map((r, ci) => (
                <th
                  key={r.id}
                  className={`tooltip-container ${hoveredCol === ci + 1 ? "col-hover" : ""}`}
                  onMouseEnter={() => setHoveredCol(ci + 1)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  {r.id}
                  <div className="custom-tooltip">
                    <div className="tooltip-title">{r.id}</div>
                    <div className="tooltip-desc">{r.nom}</div>
                  </div>
                </th>
              ))}
              <th className={hoveredCol === data.ressources.length + 1 ? "col-hover" : ""}>Coeff</th>
              <th>Moy.</th>
            </tr>
            <tr className={`notes-row ${activeRow === -1 ? "row-active" : ""}`}>
              <td><div className="notes-label">Notes /20</div></td>
              {data.ressources.map((r, ci) => (
                <td
                  key={r.id}
                  className={hoveredCol === ci + 1 ? "col-hover" : ""}
                  onMouseEnter={() => setHoveredCol(ci + 1)}
                  onMouseLeave={() => setHoveredCol(null)}
                >
                  <input
                    type="number"
                    className={`note-input ${getInputClass(notes[r.id])}`}
                    value={notes[r.id] || ""}
                    onChange={e => onNoteChange(semesterKey, r.id, e.target.value)}
                    onFocus={() => { setHoveredCol(ci + 1); setActiveRow(-1); }}
                    onBlur={() => { setHoveredCol(null); setActiveRow(null); }}
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
                <tr key={ue.ue} className={activeRow === i ? "row-active" : ""}>
                  <td>
                    <div className="competence-cell">
                      <div className="competence-indicator" style={{ background: UE_COLORS[i] }} />
                      <div className="competence-info">
                        <span className="competence-ue">{ue.ue}</span>
                        <span className="competence-name">{ue.nom}</span>
                      </div>
                    </div>
                  </td>
                  {data.ressources.map((r, ci) => {
                    const coeff = ue.c[r.id] || 0;
                    return (
                      <td
                        key={r.id}
                        className={`coeff-cell ${coeff ? "active" : ""} ${hoveredCol === ci + 1 ? "col-hover" : ""}`}
                        onMouseEnter={() => setHoveredCol(ci + 1)}
                        onMouseLeave={() => setHoveredCol(null)}
                      >
                        {coeff || "--"}
                      </td>
                    );
                  })}
                  <td className="coeff-cell">{ue.coeff}</td>
                  <AvgCell
                    className={`avg-cell ${getAvgClass(result?.moy)}`}
                    value={result?.moy !== null && result?.moy !== undefined ? result.moy.toFixed(2) : "--"}
                  />
                </tr>
              );
            })}
            <tr className="total-row">
              <td><div className="total-label">Total Semestre</div></td>
              {data.ressources.map(r => <td key={r.id} />)}
              <td className="coeff-cell">{data.totaux.coeff}</td>
              <AvgCell
                className={`avg-cell ${getAvgClass(totalAvg)}`}
                value={totalAvg !== null ? totalAvg.toFixed(2) : "--"}
              />
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
}
