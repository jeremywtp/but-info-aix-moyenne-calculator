"use client";

import { useEffect } from "react";
import { useParams } from "next/navigation";
import { useCalculator } from "@/hooks/useCalculator";
import { AppHeader } from "@/components/AppHeader";
import { SemesterTable } from "@/components/SemesterTable";
import { InterStatsPanel } from "@/components/InterStatsPanel";
import { TerminalPanel } from "@/components/TerminalPanel";
import { AppFooter } from "@/components/AppFooter";
import type { Config, UEResult } from "@/types";

const EMPTY_NOTES: Record<string, string> = {};
const EMPTY_UE: UEResult[] = [];

function configToSlug(config: Config): string {
  if (config.year === "1") return "/BUT1";
  return `/BUT${config.year}-${config.formation}-${config.parcours}`;
}

function slugToConfig(slug: string): Partial<Config> | null {
  const match = slug.match(/^BUT(\d)(?:-([A-Z]{2})-([A-Z]))?$/);
  if (!match) return null;
  const year = match[1] as Config["year"];
  if (year === "1") return { year };
  if (match[2] && match[3]) {
    return {
      year,
      formation: match[2] as Config["formation"],
      parcours: match[3] as Config["parcours"],
    };
  }
  return { year };
}

export function HomePage() {
  const params = useParams<{ slug?: string[] }>();

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

  // A l'hydratation, lire la config depuis l'URL
  useEffect(() => {
    if (!hydrated) return;
    const rawSlug = params.slug?.[0];
    if (rawSlug) {
      const parsed = slugToConfig(rawSlug);
      if (parsed) updateConfig(parsed);
    }
  }, [hydrated]);

  // Quand la config change, mettre a jour l'URL sans navigation
  useEffect(() => {
    if (!hydrated) return;
    const target = configToSlug(config);
    if (window.location.pathname !== target) {
      window.history.replaceState(null, "", target);
    }
  }, [config, hydrated]);

  const s1Data = currentData?.[semesters[0]];
  const s2Data = currentData?.[semesters[1]];
  const s1Notes = notes[semesters[0]] || EMPTY_NOTES;
  const s2Notes = notes[semesters[1]] || EMPTY_NOTES;
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
        currentData={currentData}
        config={config}
      />
    </>
  );
}
