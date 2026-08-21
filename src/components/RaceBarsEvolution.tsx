"use client";

import { useState } from "react";
import HeroInteractive from "./HeroInteractive";
import RaceBars from "./RaceBars";
import { DEFAULT_CUTOFF } from "./HeroChart";
import type { RaceAverage } from "@/lib/types";
import type { Basis } from "@/lib/validos";

/**
 * The coordinated first-round panel: the average as BARS (1/3) beside the
 * evolution LINE chart (2/3), sharing two controls that govern both halves —
 *   · a bruto/válidos basis toggle, which swaps between the two precomputed cuts
 *     (never recomputed in the browser, §5); and
 *   · the chart's hover, reported up via `onHoverDate` and fed to the bars as
 *     `atDate`, so moving along the line moves the bar numbers to that same date.
 *
 * The bars are the KPI representation, so the chart hides its own KPI row. The
 * significant (coloured) set is válidos-based and fixed, so toggling to bruto
 * changes the numbers, never the colours. Client component owning basis, range
 * and hover state; both averages arrive precomputed as props.
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

const toggleWrap = "inline-flex w-fit overflow-hidden rounded-md text-xs";
const toggleStyle = { border: "1px solid var(--grid)", background: "var(--surface-1)" } as const;
function tabBtnStyle(active: boolean) {
  return {
    background: active ? "var(--accent)" : "transparent",
    color: active ? "#fff" : "var(--text-muted)",
    fontWeight: active ? 600 : 400,
  } as const;
}

export interface RaceBarsEvolutionProps {
  /** The válidos cut — the site default. */
  validos: RaceAverage | null;
  /** The bruto cut, precomputed. Null (or same as válidos) hides the basis toggle. */
  bruto: RaceAverage | null;
  /** `candKey`s coloured in their own hue — válidos-based, so colours are stable. */
  significantKeys: string[];
  /** `candKey`s allowed to be named; [] = no filter. */
  registeredKeys?: string[];
  barsTitle?: string;
  chartTitle?: string;
  pollCount?: number | null;
  chartHeightClass?: string;
  /** Half-width layout: bars and chart go side by side from `md` up (default is
   *  the full-width 1/3 + 2/3 split from `lg`). */
  half?: boolean;
  /** Show the aggregate "Outros" bar. */
  showOutros?: boolean;
  /** Single-vote reconciliation of "Outros" (false for the Senate 2-vote ballot). */
  reconcileTo100?: boolean;
  /** Legend for the chart's dashed 50% line (e.g. neutral "50%" for the Senate). */
  fiftyLabel?: string;
}

export default function RaceBarsEvolution({
  validos,
  bruto,
  significantKeys,
  registeredKeys = [],
  barsTitle = "Média das pesquisas · 1º turno",
  chartTitle = "Evolução da média",
  pollCount,
  chartHeightClass = "h-[180px] sm:h-[220px]",
  half = false,
  showOutros = true,
  reconcileTo100 = true,
  fiftyLabel,
}: RaceBarsEvolutionProps) {
  const [basis, setBasis] = useState<Basis>("validos");
  const [range, setRange] = useState<ChartRange>("2026");
  const [hovered, setHovered] = useState<string | null>(null);

  const convertible = validos != null && bruto != null && validos.basis === "validos";
  const shown = !convertible ? (validos ?? bruto) : basis === "bruto" ? bruto : validos;
  const cutoff = cutoffFor(range, shown?.lastPollDate ?? null);

  // Full-width panels split 1/3 + 2/3 (grid). Half-width ones use a flex row that
  // FILLS its section's height (`flex-1`), so two panels side by side end up the
  // same box height even when one header/list is taller; they stack below `md`.
  const wrapperClass = half ? "flex min-w-0 flex-1 flex-col gap-4 md:flex-row" : "grid min-w-0 gap-4 lg:grid-cols-3";
  const barsSpan = half ? "md:flex-1 md:min-w-0" : "lg:col-span-1";
  const chartSpan = half ? "md:flex-1 md:min-w-0" : "lg:col-span-2";
  const barsNote = "Passe o mouse no gráfico ao lado para ver a média em cada data.";

  if (!shown) return null;

  return (
    <div className={wrapperClass}>
      {/* Bars. Numbers follow the chart's hovered date. */}
      <section className={`card min-w-0 p-4 sm:p-6 ${barsSpan}`}>
        <div className="mb-3 flex items-baseline justify-between gap-2">
          <h3 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {barsTitle}
          </h3>
          {pollCount != null ? (
            <span className="shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
              {pollCount} pesquisas
            </span>
          ) : null}
        </div>
        <RaceBars average={shown} significantKeys={significantKeys} registeredKeys={registeredKeys} atDate={hovered} showOutros={showOutros} reconcileTo100={reconcileTo100} compact={half} />
        <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
          {barsNote}
        </p>
      </section>

      {/* Evolution line. Basis + range toggles govern both halves. */}
      <section className={`card min-w-0 p-4 sm:p-6 ${chartSpan}`}>
        <div className="mb-3 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
          <h3 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {chartTitle}
          </h3>
          <div className="flex flex-wrap items-center gap-2">
            {convertible && (
              <div
                role="group"
                aria-label="Base dos números — muda as barras e o gráfico"
                title="Muda as barras e o gráfico ao lado"
                className={toggleWrap}
                style={toggleStyle}
              >
                {(["validos", "bruto"] as const).map((b) => (
                  <button key={b} type="button" onClick={() => setBasis(b)} aria-pressed={basis === b} className="px-2.5 py-1 transition-colors" style={tabBtnStyle(basis === b)}>
                    {b === "validos" ? "votos válidos" : "bruto"}
                  </button>
                ))}
              </div>
            )}
            <div role="group" aria-label="Intervalo de tempo do gráfico" className={toggleWrap} style={toggleStyle}>
              {RANGE_BUTTONS.map((b) => (
                <button key={b.key} type="button" onClick={() => setRange(b.key)} aria-pressed={range === b.key} className="px-2.5 py-1 transition-colors" style={tabBtnStyle(range === b.key)}>
                  {b.label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <HeroInteractive
          average={shown}
          significantKeys={significantKeys}
          registeredKeys={registeredKeys}
          cutoff={cutoff}
          showKpis={false}
          showOutros={showOutros}
          chartHeightClass={chartHeightClass}
          maxSeries={Math.max(1, significantKeys.length)}
          onHoverDate={setHovered}
          {...(fiftyLabel ? { fiftyLabel } : {})}
        />
      </section>
    </div>
  );
}
