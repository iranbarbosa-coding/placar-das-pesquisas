"use client";

import { useState } from "react";
import HeroInteractive from "./HeroInteractive";
import { DEFAULT_CUTOFF } from "./HeroChart";
import type { RaceAverage } from "@/lib/types";

/**
 * The evolution-of-the-average card, drawn with the SAME engine as the home hero
 * (`HeroInteractive`): a KPI values row on top, a compact framed line chart with
 * the 50% dashed line, and a 2026 / Tudo / 12m / 6m / 3m range selector. Race-
 * agnostic — the presidential page and the state (governor) pages both use it;
 * only the `average` and the key sets differ.
 *
 * `significantKeys` are the candidates drawn in their own colour (the rest fold
 * into the grey "Outros" aggregate). `registeredKeys` gates who may be NAMED at
 * all — pass the TSE-registered set for the presidential race, and an EMPTY array
 * for governor/senate (no registration exists there), which `HeroInteractive`
 * reads as "no filter". `maxSeries` defaults to the significant count so only
 * those lines draw and nothing scatters the plot in grey.
 *
 * A thin CLIENT shell owning only the range selector; `HeroInteractive` imports
 * no fs-touching lib, so pulling it in here does not cross the client boundary.
 */

type ChartRange = "2026" | "tudo" | "12m" | "6m" | "3m";
const RANGE_BUTTONS: { key: ChartRange; label: string }[] = [
  { key: "2026", label: "2026" },
  { key: "tudo", label: "Tudo" },
  { key: "12m", label: "12m" },
  { key: "6m", label: "6m" },
  { key: "3m", label: "3m" },
];

function isoMinusDays(iso: string | null | undefined, days: number): string | null {
  if (!iso || iso.length < 10) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y, m - 1, d) - days * 86400000;
  if (!Number.isFinite(t)) return null;
  const dt = new Date(t);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

function cutoffFor(range: ChartRange, lastPollDate: string | null): string | null {
  if (range === "tudo") return null;
  if (range === "2026") return DEFAULT_CUTOFF;
  const days = range === "12m" ? 365 : range === "6m" ? 180 : 90;
  return isoMinusDays(lastPollDate, days);
}

function InfoGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block h-3.5 w-3.5 align-middle" style={{ color: "var(--text-muted)" }}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export interface RaceEvolutionProps {
  average: RaceAverage | null;
  /** Candidate keys drawn in their own colour; the rest fold into "Outros". */
  significantKeys: string[];
  /** Keys allowed to be NAMED at all — [] = no filter (governor/senate). */
  registeredKeys?: string[];
  /** Drawn-line cap. Defaults to the significant count. */
  maxSeries?: number;
  /** Card header. Defaults to the first-round evolution label. */
  title?: string;
  /** Plot height classes. Defaults to the compact half-height card. */
  chartHeightClass?: string;
  /** Legend label for the dashed 50% line. Defaults to the first-round-win
   *  wording; pass a neutral "50%" for races not decided at 50 (e.g. senate). */
  fiftyLabel?: string;
}

export default function RaceEvolution({
  average,
  significantKeys,
  registeredKeys = [],
  maxSeries,
  title = "Evolução da média · 1º turno",
  chartHeightClass = "h-[100px] sm:h-[120px]",
  fiftyLabel,
}: RaceEvolutionProps) {
  const [range, setRange] = useState<ChartRange>("2026");
  const cutoff = cutoffFor(range, average?.lastPollDate ?? null);

  if (!average) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Ainda não há série temporal suficiente para a evolução da média.
      </p>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {title}
          <InfoGlyph />
        </h2>
        <div
          role="group"
          aria-label="Intervalo de tempo do gráfico"
          className="inline-flex w-fit overflow-hidden rounded-md text-xs"
          style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}
        >
          {RANGE_BUTTONS.map((b) => (
            <button
              key={b.key}
              type="button"
              onClick={() => setRange(b.key)}
              aria-pressed={range === b.key}
              className="px-2.5 py-1 transition-colors"
              style={{
                background: range === b.key ? "var(--accent)" : "transparent",
                color: range === b.key ? "#fff" : "var(--text-muted)",
                fontWeight: range === b.key ? 600 : 400,
              }}
            >
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <HeroInteractive
        average={average}
        // Cap the drawn lines to the significant roster so only those get a
        // coloured line; everyone else lives in the grey "Outros" aggregate,
        // matching the home hero's treatment of its off-roster field.
        maxSeries={Math.max(1, maxSeries ?? significantKeys.length)}
        cutoff={cutoff}
        significantKeys={significantKeys}
        registeredKeys={registeredKeys}
        chartHeightClass={chartHeightClass}
        {...(fiftyLabel ? { fiftyLabel } : {})}
      />
    </div>
  );
}
