"use client";

import { useState, useEffect } from "react";
import type { Config, YearData, Year } from "@/types";
import { parseSheetCSV } from "@/lib/sheetsParser";

// ============================================================
// Google Sheets publie — cle de publication
// URL : https://docs.google.com/spreadsheets/d/e/{PUBLISH_KEY}/pubhtml
// ============================================================
const PUBLISH_KEY =
  "2PACX-1vTv4CEfyku0gSqSJHL4EZ8XbXj1CLYHzg60a1obXce41Zqtt--uJmTBwju02gpZPl72iZTznWKtaTXS";

// Mapping config → GID de l'onglet Google Sheets
const SHEET_GIDS: Record<string, string> = {
  // BUT 1 — meme onglet pour toutes les combinaisons
  "1-FA-A": "323743204",
  "1-FA-B": "323743204",
  "1-FI-A": "323743204",
  "1-FI-B": "323743204",
  // BUT 2 — 4 configurations distinctes
  "2-FI-A": "2080523108",
  "2-FA-A": "1914659899",
  "2-FI-B": "1797412232",
  "2-FA-B": "277382299",
  // BUT 3 — 4 configurations distinctes
  "3-FI-A": "155600840",
  "3-FA-A": "436170759",
  "3-FI-B": "8520556",
  "3-FA-B": "579194139",
};

function getGid(config: Config): string | undefined {
  return SHEET_GIDS[`${config.year}-${config.formation}-${config.parcours}`];
}

function getCacheKey(gid: string): string {
  return `sheets-cache-${gid}`;
}

function getFromCache(gid: string): YearData | null {
  try {
    const raw = localStorage.getItem(getCacheKey(gid));
    if (!raw) return null;
    return JSON.parse(raw).data;
  } catch {
    /* ignore */
  }
  return null;
}

function setCache(gid: string, data: YearData): void {
  try {
    localStorage.setItem(
      getCacheKey(gid),
      JSON.stringify({ data }),
    );
  } catch {
    /* ignore */
  }
}

async function fetchSheetCSV(gid: string): Promise<string> {
  const url = `https://docs.google.com/spreadsheets/d/e/${PUBLISH_KEY}/pub?output=csv&gid=${gid}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

export function useSheetData(config: Config): {
  sheetData: YearData | null;
  loading: boolean;
} {
  // Map en memoire : GID → donnees deja fetchees (persiste entre les changements de config)
  const [dataMap, setDataMap] = useState<Record<string, YearData>>({});
  const [loading, setLoading] = useState(false);

  const gid = getGid(config) || "";

  useEffect(() => {
    if (!PUBLISH_KEY || !gid) return;

    let cancelled = false;
    setLoading(true);

    fetchSheetCSV(gid)
      .then((csv) => {
        if (cancelled) return;
        const parsed = parseSheetCSV(csv, config.year as Year);
        setCache(gid, parsed);
        setDataMap((prev) => ({ ...prev, [gid]: parsed }));
      })
      .catch(() => {
        // Cache deja disponible via la lecture synchrone ci-dessous
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [gid]);

  // Lecture synchrone pendant le render (avant le paint) :
  // 1. Donnees deja fetchees dans cette session → instantane
  // 2. Sinon, cache localStorage → instantane
  // 3. Sinon, null → fallbackData prend le relais dans useCalculator
  const sheetData = dataMap[gid] ?? (gid ? getFromCache(gid) : null);

  return { sheetData, loading };
}
