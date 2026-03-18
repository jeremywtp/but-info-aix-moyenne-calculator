"use client";

import { useCalculator } from "@/hooks/useCalculator";
import { BackgroundEffects } from "@/components/BackgroundEffects";
import { AppHeader } from "@/components/AppHeader";
import { SemesterTable } from "@/components/SemesterTable";
import { InterStatsPanel } from "@/components/InterStatsPanel";
import { TerminalPanel } from "@/components/TerminalPanel";
import { AppFooter } from "@/components/AppFooter";

export default function Home() {
  const {
    config,
    updateConfig,
    notes,
    setNote,
    resetSemester,
    currentData,
    semesters,
    semesterStats,
    decision,
    annualAvg,
    messages,
    hydrated,
  } = useCalculator();

  if (!hydrated) return null;

  const s1Data = currentData?.[semesters[0]];
  const s2Data = currentData?.[semesters[1]];

  return (
    <>
      <BackgroundEffects />

      <AppHeader config={config} onConfigChange={updateConfig} />

      <SemesterTable
        semesterKey={semesters[0]}
        data={s1Data}
        notes={notes[semesters[0]] || {}}
        onNoteChange={setNote}
        onReset={resetSemester}
        ueResults={semesterStats[0]?.ueDetails || []}
        totalAvg={semesterStats[0]?.moyGenerale ?? null}
      />

      <InterStatsPanel stats={semesterStats[0]} />

      <SemesterTable
        semesterKey={semesters[1]}
        data={s2Data}
        notes={notes[semesters[1]] || {}}
        onNoteChange={setNote}
        onReset={resetSemester}
        ueResults={semesterStats[1]?.ueDetails || []}
        totalAvg={semesterStats[1]?.moyGenerale ?? null}
      />

      <InterStatsPanel stats={semesterStats[1]} />

      <TerminalPanel messages={messages} />

      <AppFooter
        semesterStats={semesterStats}
        decision={decision}
        config={config}
        annualAvg={annualAvg}
        semesters={semesters}
      />
    </>
  );
}
