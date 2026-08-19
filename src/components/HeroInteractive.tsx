"use client";

import { useEffect, useRef, useState } from "react";
import HeroChart, {
  heroSeries,
  heroChartModel,
  heroAxisTicks,
  heroLevelTopPct,
} from "./HeroChart";
import { candKey } from "@/lib/average";
import { colorMap, colorOf, PALETTE_SIZE } from "@/lib/colors";
import { shortName, displayName } from "@/lib/names";
import { fmtPct } from "@/lib/format";
import type { RaceAverage } from "@/lib/types";

/**
 * The interactive half of the hero: the KPI row + the framed chart, as a CLIENT
 * component so both can react to hover. `Hero` (its parent) keeps the title,
 * toggles, caption and CTA and hands this component the serializable `average`,
 * the drawn-window `cutoff`, and the válidos-based `significantKeys`.
 *
 * ── COLOUR + NAME EVERY CANDIDATE ≥ 5% (2026-08-18) ─────────────────────────
 * Significant candidates (válidos average ≥ 5%) get a coloured line and a
 * coloured KPI in their FIXED per-candidate colour; everyone below 5% draws as
 * an individual grey line near the baseline and folds into the "Outros" KPI. The
 * significant set is válidos-based and passed in, so toggling to bruto never
 * recolours a line — only the numbers change.
 *
 * ── HOVER (desktop only) ───────────────────────────────────────────────────
 * Moving the mouse over the plot shows a vertical guide, a dot on each drawn
 * line at that date, and a tooltip listing EVERY candidate's value at that date
 * (leader first). The big KPI numbers switch to that date's values. On leave,
 * everything reverts to the current averages. Hover is gated on
 * `(hover: hover) and (pointer: fine)` and mouse-only events, so touch devices
 * never enter a hovered state.
 */

const MES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** "12 JUN 2026" — the tooltip's abbreviated-month header. */
function fmtAbbrevDate(iso: string): string {
  const [y, m, d] = iso.split("-");
  const mes = MES_ABREV[Number(m) - 1];
  return mes ? `${Number(d)} ${mes} ${y}` : iso;
}

/** Milliseconds for a YYYY-MM-DD date, in UTC so the x-scale cannot drift. */
function isoMs(iso: string | null): number {
  if (!iso) return 0;
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y || 1970, (m || 1) - 1, d || 1);
  return Number.isFinite(t) ? t : 0;
}

type Pt = { date: string; avg: number };

/** Carry-forward: the value at the last point AT OR BEFORE `date`, falling back
 *  to the first point. `points` must be ascending by date. */
function valueAt(points: Pt[], date: string): number {
  if (!points.length) return 0;
  let v = points[0].avg;
  for (const p of points) {
    if (p.date <= date) v = p.avg;
    else break;
  }
  return v;
}

/** A candidate's trend, cleaned and ascending. */
function cleanPoints(trend: unknown): Pt[] {
  return (Array.isArray(trend) ? trend : [])
    .filter((p): p is Pt => !!p && typeof p.date === "string" && p.date.length >= 7 && Number.isFinite(p.avg))
    .map((p) => ({ date: p.date, avg: p.avg }))
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

const fin = (x: number) => (Number.isFinite(x) ? x : 0);
const tenths = (x: number) => Math.round(fin(x) * 10);

export interface HeroInteractiveProps {
  average: RaceAverage | null;
  maxSeries?: number;
  /** The drawn window's start (ISO date), or null for "Tudo". */
  cutoff?: string | null;
  /** Candidate keys (`candKey`) at or above 5% on the VÁLIDOS average. Colours
   *  and the significant/Outros split come from this set, so the basis toggle
   *  never recolours. */
  significantKeys?: string[];
  /** `candKey`s of the TSE-registered president candidates. Only these may be
   *  NAMED (line, KPI, tooltip, "Outros" list); non-registered names fold
   *  anonymously into the "Outros" aggregate. Empty = no filter (degrade). */
  registeredKeys?: string[];
  /** Tailwind height classes for the plot area. Defaults to the home hero's
   *  `h-[200px] sm:h-[240px]`; callers can pass a shorter pair for a compact card
   *  (e.g. the /presidente evolution card at half height). */
  chartHeightClass?: string;
  /** Legend annotation for the dashed 50% reference line. Defaults to the
   *  first-round-win wording; pass a neutral "50%" for races not decided at 50
   *  (e.g. senate). */
  fiftyLabel?: string;
}

export default function HeroInteractive({ average, maxSeries = 6, cutoff = null, significantKeys = [], registeredKeys = [], chartHeightClass = "h-[200px] sm:h-[240px]", fiftyLabel = "50% (vitória no 1º turno)" }: HeroInteractiveProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoverable, setHoverable] = useState(false);
  const [outrosOpen, setOutrosOpen] = useState(false);
  const plotRef = useRef<HTMLDivElement | null>(null);

  // Enable hover only on a real mouse (fine pointer). Runs client-side after
  // mount, so SSR and touch devices keep `hoverable = false`.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setHoverable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const sigSet = new Set(significantKeys);
  const regSet = new Set(registeredKeys);
  const filterReg = regSet.size > 0; // no registry loaded → name whoever is polled
  const validos = average?.basis === "validos";
  const candidates = average?.candidates ?? [];

  const series = heroSeries(average, maxSeries, cutoff, sigSet, filterReg ? regSet : null);
  const model = heroChartModel(average, maxSeries, cutoff, sigSet, filterReg ? regSet : null);
  const ticks = heroAxisTicks(model);
  const fiftyTop = heroLevelTopPct(model, 50);
  const showFifty = fiftyTop != null && fiftyTop >= 0 && fiftyTop <= 100;

  // Fixed per-candidate colours over the race's top slots (basis-independent —
  // `colorMap` sorts by name, and every significant candidate is pinned).
  const cmap = colorMap(candidates.slice(0, PALETTE_SIZE).map((c) => c.candidate));
  const colorFor = (name: string) => colorOf(cmap, name);
  const trendByKey = new Map(candidates.map((c) => [candKey(c.candidate), cleanPoints(c.trend)] as const));

  // Only REGISTERED president candidates may be named; among those, ≥5% válidos
  // are coloured, the rest are grey and named. Non-registered candidates are
  // never named — their share is absorbed into the "Outros" aggregate only.
  const displayable = (c: { candidate: string }) => !filterReg || regSet.has(candKey(c.candidate));
  const isColored = (c: { candidate: string }) => displayable(c) && sigSet.has(candKey(c.candidate));
  const sigCands = candidates.filter(isColored); // named + coloured (≥5%, registered)
  const namedNonSig = candidates.filter((c) => displayable(c) && !sigSet.has(candKey(c.candidate))); // named, grey
  const nonColored = candidates.filter((c) => !isColored(c)); // everything folded into "Outros"

  const valueOfCand = (c: { candidate: string; avg: number }, date: string | null) =>
    date == null ? fin(c.avg) : valueAt(trendByKey.get(candKey(c.candidate)) ?? [], date);

  // KPI buckets at a date (or the current averages when `date` is null). The
  // significant candidates are shown individually; everyone else is "Outros";
  // bruto adds the branco/nulo residual. Reconciled in TENTHS so the row sums to
  // exactly 100,0 — the remainder bucket absorbs the rounding.
  const bucketPcts = (date: string | null): Map<string, number> => {
    const sigT = sigCands.map((c) => tenths(valueOfCand(c, date)));
    const sigSumT = sigT.reduce((a, b) => a + b, 0);
    // "Outros" absorbs EVERY non-coloured candidate — named sub-5% and unnamed
    // non-registered alike — so their share still counts, just without a name.
    const nonColoredSum = nonColored.reduce((s, c) => s + valueOfCand(c, date), 0);
    const outrosT = validos ? Math.max(0, 1000 - sigSumT) : tenths(nonColoredSum);
    const bnT = validos ? null : Math.max(0, 1000 - sigSumT - outrosT);
    const m = new Map<string, number>();
    sigCands.forEach((c, i) => m.set(candKey(c.candidate), sigT[i] / 10));
    m.set("__outros", outrosT / 10);
    if (bnT != null) m.set("__bn", bnT / 10);
    return m;
  };

  // The bucket STRUCTURE is fixed from the current values, so the row never
  // changes item-count on hover.
  const currentPcts = bucketPcts(null);
  const hasOutros = (currentPcts.get("__outros") ?? 0) > 0;
  const hasBN = currentPcts.has("__bn") && (currentPcts.get("__bn") ?? 0) > 0;

  const sigBuckets = sigCands.map((c) => ({
    key: candKey(c.candidate),
    name: displayName(c.candidate), // text only; colour/key stay on the raw name
    party: c.party,
    color: colorFor(c.candidate),
  }));
  const candidateBuckets = hasOutros
    ? [...sigBuckets, { key: "__outros", name: "Outros", party: null as string | null, color: "var(--series-muted)" }]
    : sigBuckets;
  const buckets = hasBN
    ? [...candidateBuckets, { key: "__bn", name: "Brancos/Nulos/NR", party: null as string | null, color: "var(--text-muted)" }]
    : candidateBuckets;

  const gridLevels = [0, 20, 40, 60, 80, 100].filter((v) => model != null && v <= model.yMax);

  // Elastic KPI sizing: shrink the number font + gaps as the count grows, so a
  // wider field stays compact instead of exploding the card height or the width.
  const n = buckets.length;
  const numCls = n <= 4 ? "text-[24px] sm:text-[28px]" : n <= 6 ? "text-2xl" : "text-xl";
  const gapCls = n <= 4 ? "gap-x-5 gap-y-2 sm:gap-x-7" : n <= 6 ? "gap-x-4 gap-y-2 sm:gap-x-5" : "gap-x-3 gap-y-1.5 sm:gap-x-4";

  // Hover timeline over the drawn-series point dates.
  const snapshots = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const t0 = isoMs(model?.from ?? null);
  const span = isoMs(model?.to ?? null) - t0;
  const xPctOf = (date: string) => (span > 0 ? ((isoMs(date) - t0) / span) * 100 : 0);
  const snapX = snapshots.map(xPctOf);

  const interactive = hoverable && model != null && !model.flat && span > 0 && snapshots.length > 1;

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive || !plotRef.current) return;
    const rect = plotRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < snapX.length; i++) {
      const d = Math.abs(snapX[i] - pct);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHovered(best);
  };
  const onLeave = () => setHovered(null);

  const hoveredDate = hovered != null && hovered < snapshots.length ? snapshots[hovered] : null;
  const activePcts = hoveredDate != null ? bucketPcts(hoveredDate) : currentPcts;
  const showOverlay = interactive && hoveredDate != null;
  const hoverX = hoveredDate != null ? xPctOf(hoveredDate) : 0;

  // Tooltip rows: every REGISTERED candidate with a trend, valued at the hovered
  // date and sorted leader-first; the dot mirrors the line (fixed colour if ≥5%,
  // grey otherwise). Non-registered names are omitted — their share lives in the
  // "Outros" number, not as a row.
  const tooltipRows =
    hoveredDate == null
      ? []
      : candidates
          .filter((c) => displayable(c))
          .map((c) => ({ key: candKey(c.candidate), name: c.candidate, pts: trendByKey.get(candKey(c.candidate)) ?? [], sig: sigSet.has(candKey(c.candidate)) }))
          .filter((r) => r.pts.length > 0)
          .map((r) => ({ ...r, value: valueAt(r.pts, hoveredDate) }))
          .sort((a, b) => b.value - a.value);
  const tooltipBN = hoveredDate != null && hasBN ? (activePcts.get("__bn") ?? 0) : null;

  if (series.length === 0) return null;

  return (
    <>
      {/* KPI row — significant candidates + "Outros" (+ bruto Brancos/Nulos/NR),
          elastic in size so a wider field never reformats the page. */}
      {buckets.length > 0 && (
        // Mobile: a fixed 2-column grid so the cells align in neat rows instead
        // of the ragged widths a flex-wrap gives with names of different lengths.
        // From `sm` up (where the whole field fits one row) it reverts to wrap.
        <ul className={`grid grid-cols-2 sm:flex sm:flex-wrap ${gapCls}`}>
          {buckets.map((k) => (
            <li key={k.key} className="flex min-w-0 flex-col gap-0.5">
              <span className={`tabular font-bold leading-none ${numCls}`} style={{ color: k.color }}>
                {fmtPct(activePcts.get(k.key) ?? 0)}
                <span className="text-[0.55em] font-bold align-baseline">%</span>
              </span>
              <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: k.color }} />
                <span className="truncate">
                  {k.name}
                  {k.party ? <span style={{ color: "var(--text-muted)" }}> ({k.party})</span> : null}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}

      {/* Expandable "who is in Outros": the REGISTERED sub-5% candidates, each
          with their current-basis value. Non-registered names are NOT listed —
          only their share is inside the "Outros" total. Reflects basis, not hover. */}
      {namedNonSig.length > 0 && (
        <div className="text-xs">
          <button
            type="button"
            onClick={() => setOutrosOpen((o) => !o)}
            aria-expanded={outrosOpen}
            className="inline-flex items-center gap-1"
            style={{ color: "var(--text-muted)" }}
          >
            Outros: {namedNonSig.length} candidato{namedNonSig.length === 1 ? "" : "s"}
            <span aria-hidden="true">{outrosOpen ? "▴" : "▾"}</span>
          </button>
          {outrosOpen && (
            <ul className="mt-1 flex flex-col gap-0.5" style={{ color: "var(--text-secondary)" }}>
              {namedNonSig.map((c) => (
                <li key={candKey(c.candidate)} className="flex items-baseline justify-between gap-3">
                  <span className="min-w-0 truncate">
                    {displayName(c.candidate)}
                    {c.party ? <span style={{ color: "var(--text-muted)" }}> ({c.party})</span> : null}
                  </span>
                  <span className="tabular shrink-0" style={{ color: "var(--text-muted)" }}>
                    {fmtPct(fin(c.avg))}%
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* The framed chart. */}
      <div className="card p-3 sm:p-4">
        <div className="flex gap-1.5">
          <div className="relative w-7 shrink-0" aria-hidden="true">
            {gridLevels.map((v) => {
              const top = heroLevelTopPct(model, v);
              return top == null ? null : (
                <span
                  key={`ylab-${v}`}
                  className="tabular absolute right-0 -translate-y-1/2 text-[10px]"
                  style={{ top: `${top}%`, color: "var(--text-muted)" }}
                >
                  {v}%
                </span>
              );
            })}
          </div>
          <div
            ref={plotRef}
            onMouseMove={onMove}
            onMouseLeave={onLeave}
            className={`relative flex-1 ${chartHeightClass}`}
          >
            <HeroChart average={average} maxSeries={maxSeries} framed cutoff={cutoff} significantKeys={sigSet} registeredKeys={filterReg ? regSet : null} />
            {showFifty && (
              <span
                className="tabular pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1 text-[10px] font-semibold"
                style={{ top: `${fiftyTop}%`, color: "var(--text-muted)", background: "var(--surface-1)" }}
              >
                50%
              </span>
            )}

            {showOverlay && (
              <>
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-y-0 w-0 border-l"
                  style={{ left: `${hoverX}%`, borderColor: "var(--axis)" }}
                />
                {series.map((s) => {
                  const yTop = heroLevelTopPct(model, valueAt(s.points, hoveredDate));
                  return yTop == null ? null : (
                    <span
                      key={`dot-${s.key}`}
                      aria-hidden="true"
                      className="pointer-events-none absolute h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: `${hoverX}%`, top: `${yTop}%`, background: s.color, boxShadow: "0 0 0 1.5px var(--surface-1)" }}
                    />
                  );
                })}
                <div
                  // Vertically CENTERED on the plot so the whole list (all
                  // candidates, no internal scroll for the normal field) stays
                  // on-screen and near the card even as it grows; `max-h-[70vh]`
                  // is only a last-resort cap for an extreme 20+ field. The
                  // horizontal clamp (left/right + max-w) keeps it from ever
                  // causing horizontal page overflow.
                  className="pointer-events-none absolute z-[1] top-1/2 flex max-h-[70vh] max-w-[68%] -translate-y-1/2 flex-col overflow-y-auto rounded-md border px-2 py-1.5 text-[11px] shadow-sm"
                  style={{
                    ...(hoverX > 55
                      ? { right: `${Math.min(30, Math.max(0, 100 - hoverX))}%` }
                      : { left: `${Math.min(30, Math.max(0, hoverX))}%` }),
                    borderColor: "var(--ring)",
                    background: "var(--surface-1)",
                  }}
                >
                  <div className="mb-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>
                    {fmtAbbrevDate(hoveredDate)}
                  </div>
                  <ul className="flex flex-col gap-0.5">
                    {tooltipRows.map((r) => (
                      <li key={`tt-${r.key}`} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: r.sig ? colorFor(r.name) : "var(--series-muted)" }} />
                        <span style={{ color: "var(--text-secondary)" }}>{shortName(r.name)}</span>
                        <span className="tabular ml-auto pl-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                          {fmtPct(r.value)}%
                        </span>
                      </li>
                    ))}
                    {tooltipBN != null && (
                      <li key="tt-bn" className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--text-muted)" }} />
                        <span style={{ color: "var(--text-secondary)" }}>Brancos/Nulos/NR</span>
                        <span className="tabular ml-auto pl-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                          {fmtPct(tooltipBN)}%
                        </span>
                      </li>
                    )}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
        {ticks.length > 0 && (
          <div className="flex gap-1.5">
            <div className="w-7 shrink-0" aria-hidden="true" />
            <div className="relative mt-2 h-4 flex-1">
              {ticks.map((t) => (
                <span
                  key={`${t.label}-${t.leftPct.toFixed(1)}`}
                  className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wide"
                  style={{ left: `${t.leftPct}%`, color: "var(--text-muted)" }}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}
        {/* Only the 50% line needs a legend: the candidates are already colour-
            coded with their values in the KPI row above the chart, so repeating
            them here is redundant. */}
        <div className="mt-2 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <span aria-hidden="true" className="inline-block h-0 w-3.5 border-t border-dashed" style={{ borderColor: "var(--axis)" }} />
          {fiftyLabel}
        </div>
      </div>
    </>
  );
}
