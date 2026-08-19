"use client";

import RaceEvolution from "./RaceEvolution";
import type { RaceAverage } from "@/lib/types";

/**
 * Section 3 of /presidente — the first-round evolution card. A thin wrapper over
 * the race-agnostic `RaceEvolution`: it passes the presidential average, the
 * registered gate, and the named roster as the significant (coloured) set. All
 * the chart chrome — KPI row, compact framed chart, 50% line, range selector —
 * lives in `RaceEvolution`, so the presidential and governor cards stay identical
 * by construction.
 */

export interface PresidentEvolutionProps {
  average: RaceAverage | null;
  registeredKeys: string[];
  significantKeys: string[];
}

export default function PresidentEvolution({ average, registeredKeys, significantKeys }: PresidentEvolutionProps) {
  return <RaceEvolution average={average} significantKeys={significantKeys} registeredKeys={registeredKeys} />;
}
