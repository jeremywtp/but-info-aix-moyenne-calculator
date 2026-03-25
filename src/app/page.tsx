"use client";

import { useCalculator } from "@/hooks/useCalculator";
import { AppHeader } from "@/components/AppHeader";
import { SemesterTable } from "@/components/SemesterTable";
import { InterStatsPanel } from "@/components/InterStatsPanel";
import { TerminalPanel } from "@/components/TerminalPanel";
import { AppFooter } from "@/components/AppFooter";
import type { UEResult } from "@/types";

const EMPTY_NOTES: Record<string, string> = {};
const EMPTY_UE: UEResult[] = [];

export default function Home() {
  const {
    config,
    updateConfig,
    notes,
    setNote,
    resetSemester,
    currentData,
    semesters,
    rawStats,
    semesterStats,
    decision,
    annualAvg,
    messages,
    hydrated,
  } = useCalculator();

  const s1Data = currentData?.[semesters[0]];
  const s2Data = currentData?.[semesters[1]];

  const s1Notes = notes[semesters[0]] || EMPTY_NOTES;
  const s2Notes = notes[semesters[1]] || EMPTY_NOTES;
  // Tables et panels semestriels utilisent rawStats (NACQ, pas CMP)
  const s1UeResults = rawStats[0]?.ueDetails || EMPTY_UE;
  const s2UeResults = rawStats[1]?.ueDetails || EMPTY_UE;
  const s1Avg = rawStats[0]?.moyGenerale ?? null;
  const s2Avg = rawStats[1]?.moyGenerale ?? null;

  if (!hydrated) return null;

  return (
    <>
      <AppHeader config={config} onConfigChange={updateConfig} />

      <SemesterTable
        semesterKey={semesters[0]}
        data={s1Data}
        notes={s1Notes}
        onNoteChange={setNote}
        onReset={resetSemester}
        ueResults={s1UeResults}
        totalAvg={s1Avg}
      />

      <InterStatsPanel stats={rawStats[0]} />

      <SemesterTable
        semesterKey={semesters[1]}
        data={s2Data}
        notes={s2Notes}
        onNoteChange={setNote}
        onReset={resetSemester}
        ueResults={s2UeResults}
        totalAvg={s2Avg}
      />

      <InterStatsPanel stats={rawStats[1]} />

      <TerminalPanel messages={messages} />

      <AppFooter
        semesterStats={[...semesterStats]}
        decision={decision}
        annualAvg={annualAvg}
        semesters={semesters}
      />
    </>
  );
}
