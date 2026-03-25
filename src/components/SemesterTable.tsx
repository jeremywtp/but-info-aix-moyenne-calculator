"use client";

import { memo, useCallback, useRef, useState } from "react";
import type { SemesterData, UEResult } from "@/types";
import { parseNote } from "@/lib/calculations";
import { parseGradesPdf } from "@/lib/pdfParser";

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
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);

  const handleReset = useCallback(() => {
    if (confirm(`Confirmer RESET pour ${semesterKey.toUpperCase()} ?`)) {
      onReset(semesterKey);
    }
  }, [semesterKey, onReset]);

  const handlePdfImport = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !data) return;

    setImporting(true);
    try {
      const grades = await parseGradesPdf(file, data, semesterKey);
      const count = Object.keys(grades).length;
      if (count === 0) {
        alert("Aucune note trouvee dans ce PDF pour ce semestre.");
        return;
      }
      for (const [id, note] of Object.entries(grades)) {
        onNoteChange(semesterKey, id, note);
      }
    } catch (err) {
      console.error("PDF import error:", err);
      alert(err instanceof Error ? err.message : "Erreur lors de la lecture du PDF.");
    } finally {
      setImporting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [data, semesterKey, onNoteChange]);

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
                <td colSpan={20} style={{ textAlign: "center", padding: 40, color: "var(--text-muted)", opacity: 0.6 }}>
                  Chargement des coefficients...
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
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf"
          onChange={handlePdfImport}
          style={{ display: "none" }}
        />
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className="btn-reset"
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
          >
            {importing ? "Import..." : "/// IMPORT PDF"}
          </button>
          <button className="btn-reset" onClick={handleReset}>
            /// RESET :: {semesterKey.toUpperCase()}
          </button>
        </div>
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
              {data.ressources.map(r => {
                const hasCoeff = data.ues.some(ue => ue.c[r.id] > 0);
                return (
                  <td key={r.id}>
                    <input
                      type="number"
                      className={`note-input ${hasCoeff ? getInputClass(notes[r.id]) : "input-disabled"}`}
                      value={notes[r.id] || ""}
                      onChange={e => onNoteChange(semesterKey, r.id, e.target.value)}
                      min={0}
                      max={20}
                      step={0.01}
                      placeholder="--"
                      disabled={!hasCoeff}
                    />
                  </td>
                );
              })}
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
            <tr className="bonus-row">
              <td><div className="bonus-label">Bonus</div></td>
              {data.ressources.map(r => <td key={r.id} />)}
              <td />
              <td>
                <input
                  type="number"
                  className="bonus-input"
                  value={notes["_bonus"] || ""}
                  onChange={e => onNoteChange(semesterKey, "_bonus", e.target.value)}
                  min={0}
                  max={2}
                  step={0.1}
                  placeholder="+0"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>
  );
});
