"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import HeroInteractive from "./HeroInteractive";
import { heroSeries, DEFAULT_CUTOFF } from "./HeroChart";
/* Type-only: `Headline` is erased at compile time, so this file carries NO
   runtime dependency on lib/home (and therefore none on lib/data's `node:fs`). */
import type { Headline } from "@/lib/home";
import { fmtDate } from "@/lib/format";
import type { RaceAverage } from "@/lib/types";

/**
 * The front page's opening statement: one race as an electoral dashboard.
 *
 * A thin CLIENT shell now: it renders the card header (title/subtitle + the
 * basis toggle and the chart RANGE selector, top-right), the caption and the
 * CTA, and delegates the reactive part — the KPI row and the framed, HOVERABLE
 * chart — to `HeroInteractive`. The range selector's state lives here because
 * its buttons sit in the header beside the basis toggle; the chosen `cutoff`
 * is handed to `HeroInteractive`, which windows the drawn lines, the hover
 * timeline and the month axis together. The KPI averages never change with the
 * range — only the drawn span does.
 *
 * WHAT SURVIVED THE REWRITE, and must not regress:
 *  · Colours come from `heroSeries`, never from position.
 *  · The full leader name is shown, never `shortName`.
 */

/* The hero used a CONDENSED display face; the mockup's headline is a normal-width
   bold sans, so numbers and the title now inherit the site face (Inter). Kept as
   an empty style object so the many call sites read the same. */
const DISPLAY = {} as const;

/** Small round "i" info glyph, matching the target's title affordance. */
function InfoGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block h-3.5 w-3.5 align-middle" style={{ color: "var(--text-muted)" }}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** The chart's time-range selector. "2026" (since 1 Jan 2026) is the default
 *  election-cycle view; the rest are relative to the latest poll. */
type ChartRange = "2026" | "tudo" | "12m" | "6m" | "3m";
const RANGE_BUTTONS: { key: ChartRange; label: string }[] = [
  { key: "2026", label: "2026" },
  { key: "tudo", label: "Tudo" },
  { key: "12m", label: "12m" },
  { key: "6m", label: "6m" },
  { key: "3m", label: "3m" },
];

/** ISO date `days` before `iso` (UTC), or null if `iso` is unusable. */
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

/** The drawn window's start for a range: null = "Tudo" (no trim). */
function cutoffFor(range: ChartRange, lastPollDate: string | null): string | null {
  if (range === "tudo") return null;
  if (range === "2026") return DEFAULT_CUTOFF;
  const days = range === "12m" ? 365 : range === "6m" ? 180 : 90;
  return isoMinusDays(lastPollDate, days);
}

export interface HeroProps {
  /** The presidential first-round average. `null` renders the block without a chart. */
  average: RaceAverage | null;
  /** `headlineOf(average)` — leader, their average, and the distance to 50%. */
  headline: Headline | null;
  /** Scenario label, shown in the caption. */
  scenario?: string;
  eyebrow?: string;
  title?: string;
  /** Where the panel's CTA goes. Default `/presidente`. */
  href?: string;
  ctaLabel?: string;
  /** Hard cap on drawn areas. Default 6, per the hero spec. */
  maxSeries?: number;
  /** Candidate keys (`candKey`) at or above 5% on the VÁLIDOS average — the
   *  significant set, computed once by `HeroBasisSwitch` so it stays válidos-
   *  based across the basis toggle, and threaded to `HeroInteractive`. */
  significantKeys?: string[];
  /** `candKey`s of the TSE-registered president candidates — only these may be
   *  named anywhere in the hero. */
  registeredKeys?: string[];
  /**
   * The basis toggle, owned by `HeroBasisSwitch`. A slot, not a control: this
   * component stays a renderer with no state of its own beyond the chart range.
   */
  controls?: ReactNode;
}

export default function Hero({
  average,
  headline,
  scenario,
  eyebrow = "Principais Pesquisas",
  title = "Corrida Presidencial 2026",
  href = "/presidente",
  ctaLabel = "Veja as pesquisas",
  maxSeries = 6,
  significantKeys = [],
  registeredKeys = [],
  controls,
}: HeroProps) {
  const [range, setRange] = useState<ChartRange>("2026");

  const series = heroSeries(average, maxSeries);
  const validos = average?.basis === "validos";
  const basisLabel = validos ? "votos válidos" : "total da amostra";
  const hasChart = series.length > 0;
  const cutoff = cutoffFor(range, average?.lastPollDate ?? null);

  return (
    <section aria-labelledby="hero-titulo">
      {/* Single full-width column: the "Em resumo" side panel was removed at the
          owner's request, so the title, KPIs and framed chart span the card. */}
      <div className="flex min-w-0 flex-col gap-3">
          {/* Header row: title/subtitle on the left, the basis toggle and the
              chart range selector pinned to the UPPER-RIGHT corner of the card.
              `flex-wrap` lets the toggle column drop below the title only on very
              narrow screens (≈320px), where the two toggles no longer fit beside
              the title — keeps the page from overflowing without changing the
              desktop one-row layout. */}
          <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
            <div className="flex min-w-0 flex-col gap-0.5">
              {/* Card-header style, matching the mockup: a small UPPERCASE title,
                  no separate eyebrow — the KPIs below are the prominent element. */}
              <h1
                id="hero-titulo"
                className="flex items-center gap-1.5 text-[15px] font-bold uppercase tracking-wide sm:text-base"
                style={{ ...DISPLAY, color: "var(--text-primary)" }}
              >
                {title}
                <InfoGlyph />
              </h1>
              {average && (
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Média das pesquisas · 1º turno · {basisLabel}
                </p>
              )}
            </div>
            {(controls || hasChart) && (
              <div className="flex shrink-0 flex-col items-end gap-1">
                {controls}
                {hasChart && (
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
                )}
              </div>
            )}
          </div>

          {/* The reactive core: KPI row + framed, hoverable chart. The
              "última pesquisa" note rides inside the chart's 50% legend row now
              (space-saving), sem a contagem de candidatos — já atacada no KPI
              "Outros" acima. */}
          <HeroInteractive
            average={average}
            maxSeries={maxSeries}
            cutoff={cutoff}
            significantKeys={significantKeys}
            registeredKeys={registeredKeys}
            lastPollNote={
              average && hasChart ? (
                <>
                  Última pesquisa em {fmtDate(average.lastPollDate)}
                  {scenario ? ` · ${scenario}` : ""}
                </>
              ) : undefined
            }
          />

          {!headline && (
            <p className="max-w-[64ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              Ainda não há pesquisas suficientes para uma média da corrida presidencial.
            </p>
          )}

          {/* The hero's CTA. The "Em resumo" panel that used to carry it was
              removed at the owner's request, so this modest inline link keeps the
              hero's single link to the full race. */}
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Ver análise completa <span aria-hidden="true">→</span>
          </Link>
        </div>
    </section>
  );
}
