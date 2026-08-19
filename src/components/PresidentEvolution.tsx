"use client";

import { useState } from "react";
import HeroInteractive from "./HeroInteractive";
import { DEFAULT_CUTOFF } from "./HeroChart";
import type { RaceAverage } from "@/lib/types";

/**
 * Section 3 — the evolution of the first-round average, drawn with the SAME
 * engine as the home hero (`HeroInteractive`), but showing ALL registered
 * candidates rather than the hero's top six. The registered set is threaded in
 * two ways: `registeredKeys` gates who may be drawn/named at all, and
 * `significantKeys` (every registered candidate present) makes each of them draw
 * in its own colour instead of the hero's grey-below-5% treatment.
 *
 * A thin CLIENT shell: it owns only the time-range selector (mirroring the
 * hero's), and hands the chosen `cutoff` down. The KPI averages never change
 * with the range — only the drawn span does. `HeroInteractive` imports no
 * fs-touching lib, so pulling it in here does not cross the client boundary.
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

export interface PresidentEvolutionProps {
  average: RaceAverage | null;
  registeredKeys: string[];
  significantKeys: string[];
}

export default function PresidentEvolution({ average, registeredKeys, significantKeys }: PresidentEvolutionProps) {
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
          Evolução da média · 1º turno
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
        // Cap the drawn lines to the named roster (§1's registered ≥ NAMED_MIN_PCT
        // set), so only those candidates get a coloured line; everyone else is not
        // drawn and lives in the "Outros" aggregate (KPI + legend), matching the
        // bar chart and the home hero's treatment of its off-roster field.
        maxSeries={Math.max(1, significantKeys.length)}
        cutoff={cutoff}
        significantKeys={significantKeys}
        registeredKeys={registeredKeys}
      />
    </div>
  );
}
