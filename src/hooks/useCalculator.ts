"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import type { Config, Year } from "@/types";
import {
  getSemesters, getConfigKey, getCurrentData,
  calculateSemesterStats, determineDecision,
  calculateCompetences, calculateAnnualAvg, generateMessages,
} from "@/lib/calculations";

const DEFAULT_CONFIG: Config = {
  year: "2",
  formation: "FA",
  parcours: "B",
  but1Validated: true,
};

export function useCalculator() {
  const [config, setConfig] = useState<Config>(DEFAULT_CONFIG);
  const [notes, setNotes] = useState<Record<string, Record<string, string>>>({});
  const [hydrated, setHydrated] = useState(false);

  // Hydratation : charger config depuis localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem("coeff-config");
      if (saved) {
        const parsed = JSON.parse(saved);
        setConfig(prev => ({ ...prev, ...parsed }));
      }
    } catch { /* ignore */ }
    setHydrated(true);
  }, []);

  const configKey = getConfigKey(config);
  const semesters = getSemesters(config.year);
  const currentData = getCurrentData(config);

  // Charger les notes quand la config change
  useEffect(() => {
    if (!hydrated) return;
    const loaded: Record<string, Record<string, string>> = {};
    semesters.forEach(sem => {
      try {
        loaded[sem] = JSON.parse(localStorage.getItem(`coeff-${configKey}-${sem}`) || "{}");
      } catch { loaded[sem] = {}; }
    });
    setNotes(loaded);
  }, [configKey, hydrated, semesters[0], semesters[1]]);

  // Sauvegarder la config
  useEffect(() => {
    if (!hydrated) return;
    localStorage.setItem("coeff-config", JSON.stringify(config));
  }, [config, hydrated]);

  const setNote = useCallback((sem: string, resourceId: string, value: string) => {
    setNotes(prev => {
      const updated = { ...prev, [sem]: { ...prev[sem], [resourceId]: value } };
      localStorage.setItem(`coeff-${configKey}-${sem}`, JSON.stringify(updated[sem]));
      return updated;
    });
  }, [configKey]);

  const resetSemester = useCallback((sem: string) => {
    setNotes(prev => ({ ...prev, [sem]: {} }));
    localStorage.removeItem(`coeff-${configKey}-${sem}`);
  }, [configKey]);

  const updateConfig = useCallback((partial: Partial<Config>) => {
    setConfig(prev => ({ ...prev, ...partial }));
  }, []);

  const semesterStats = useMemo(() => {
    return semesters.map((sem, idx) => {
      const semData = currentData?.[sem];
      return calculateSemesterStats(semData, notes[sem] || {}, sem.toUpperCase());
    });
  }, [currentData, notes, semesters[0], semesters[1]]);

  const decision = useMemo(() => {
    return determineDecision(semesterStats[0], semesterStats[1], config);
  }, [semesterStats, config]);

  const competences = useMemo(() => {
    return calculateCompetences(semesterStats[0], semesterStats[1]);
  }, [semesterStats]);

  const annualAvg = useMemo(() => {
    return calculateAnnualAvg(semesterStats[0], semesterStats[1]);
  }, [semesterStats]);

  const messages = useMemo(() => {
    return generateMessages(semesterStats, decision, config);
  }, [semesterStats, decision, config]);

  const totalNotesCount = useMemo(() => {
    return Object.values(notes).reduce((acc, sem) => {
      return acc + Object.values(sem).filter(v => v).length;
    }, 0);
  }, [notes]);

  return {
    config,
    updateConfig,
    notes,
    setNote,
    resetSemester,
    currentData,
    semesters,
    semesterStats,
    decision,
    competences,
    annualAvg,
    messages,
    totalNotesCount,
    hydrated,
  };
}
