"use client";

import { useEffect, useRef, useState } from "react";
import HeroChart, {
  heroSeries,
  heroChartModel,
  heroAxisTicks,
  heroLevelTopPct,
} from "./HeroChart";
import { shortName } from "@/lib/names";
import { fmtPct } from "@/lib/format";
import type { RaceAverage } from "@/lib/types";

/**
 * The interactive half of the hero: the KPI row + the framed chart, as a CLIENT
 * component so both can react to hover. `Hero` (its parent) keeps the title,
 * toggle, caption and CTA and hands this component the serializable `average`.
 *
 * ── WHAT HOVER DOES (desktop only) ─────────────────────────────────────────
 * Moving the mouse over the plot shows a vertical guide, a dot on each drawn
 * line at that date, and a tooltip listing every series' moving-average value
 * AT THAT DATE — and the big KPI numbers above the chart switch to that date's
 * values. On mouse leave everything reverts to the current averages. Hover is
 * gated on `(hover: hover) and (pointer: fine)` and bound to MOUSE events only,
 * so touch devices never enter a hovered state and always show current values.
 *
 * ── STATIC LOOK IS UNCHANGED ───────────────────────────────────────────────
 * The KPI math, the sum-to-100 tenths reconciliation and the chart-card markup
 * are moved here verbatim from `Hero`. When not hovering, the output is
 * identical to before — the overlays render nothing and every number is the
 * current average. Only interactivity was added.
 */

// Empty style object kept so the moved KPI markup reads identically to Hero's.
const DISPLAY = {} as const;

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

/** Carry-forward: the series' value at the last point AT OR BEFORE `date`,
 *  falling back to the first point. `points` must be ascending by date. */
function valueAt(points: { date: string; avg: number }[], date: string): number {
  if (!points.length) return 0;
  let v = points[0].avg;
  for (const p of points) {
    if (p.date <= date) v = p.avg;
    else break;
  }
  return v;
}

export interface HeroInteractiveProps {
  average: RaceAverage | null;
  maxSeries?: number;
  /** The drawn window's start (ISO date), or null for "Tudo". Chosen by the
   *  hero's range selector; windows the drawn lines, the hover timeline and the
   *  month axis together. KPI averages stay untouched. */
  cutoff?: string | null;
}

export default function HeroInteractive({ average, maxSeries = 6, cutoff = null }: HeroInteractiveProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoverable, setHoverable] = useState(false);
  const plotRef = useRef<HTMLDivElement | null>(null);

  // Enable hover only on a real mouse (fine pointer). Runs client-side after
  // mount, so SSR and touch devices keep `hoverable = false` and the current
  // values — no stuck overlay, no hydration mismatch.
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    setHoverable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, []);

  const series = heroSeries(average, maxSeries, cutoff);
  const model = heroChartModel(average, maxSeries, cutoff);
  const ticks = heroAxisTicks(model);
  const fiftyTop = heroLevelTopPct(model, 50);
  const validos = average?.basis === "validos";
  const showFifty = fiftyTop != null && fiftyTop >= 0 && fiftyTop <= 100;
  const partyOf = new Map((average?.candidates ?? []).map((c) => [c.candidate, c.party]));

  // The three drawn leaders, and the leftover candidates (ranked 4+) with their
  // cleaned ascending trends — the exact two inputs the KPI reconciliation uses.
  const top3 = series.slice(0, 3);
  const leftoverTrends = (average?.candidates ?? []).slice(3).map((c) => ({
    avg: Number.isFinite(c.avg) ? c.avg : 0,
    points: (Array.isArray(c.trend) ? c.trend : [])
      .filter((p) => typeof p?.date === "string" && p.date.length >= 7 && Number.isFinite(p.avg))
      .map((p) => ({ date: p.date, avg: p.avg }))
      .sort((a, b) => (a.date < b.date ? -1 : 1)),
  }));

  // KPI buckets at a given date (or the current averages when `date` is null).
  // Everything is reconciled in TENTHS so the row sums to exactly 100,0 — the
  // remainder bucket absorbs the rounding. Identical logic to the old server
  // computation; only the per-date inputs differ.
  const bucketPcts = (date: string | null): Map<string, number> => {
    const tenths = (x: number) => Math.round((Number.isFinite(x) ? x : 0) * 10);
    const top3vals = top3.map((s) => (date == null ? s.avg : valueAt(s.points, date)));
    const leftoverSum = leftoverTrends.reduce(
      (sum, lt) => sum + (date == null ? lt.avg : valueAt(lt.points, date)),
      0,
    );
    const top3T = top3vals.map(tenths);
    const top3SumT = top3T.reduce((a, b) => a + b, 0);
    const leftoverT = tenths(leftoverSum);
    const outrosT = validos ? Math.max(0, 1000 - top3SumT) : leftoverT;
    const brancosNulosT = validos ? null : Math.max(0, 1000 - top3SumT - outrosT);
    const m = new Map<string, number>();
    top3.forEach((s, i) => m.set(s.key, top3T[i] / 10));
    m.set("__outros", outrosT / 10);
    if (brancosNulosT != null) m.set("__bn", brancosNulosT / 10);
    return m;
  };

  // The bucket STRUCTURE (which items exist, their names/colours) is fixed from
  // the current values, so the row never changes item-count on hover and the
  // static look matches the old server render exactly.
  const currentPcts = bucketPcts(null);
  const hasOutros = (currentPcts.get("__outros") ?? 0) > 0;
  const hasBN = currentPcts.has("__bn") && (currentPcts.get("__bn") ?? 0) > 0;

  const topKpis = top3.map((s) => ({
    key: s.key,
    name: s.name,
    party: partyOf.get(s.name) ?? null,
    color: s.color,
  }));
  const candidateBuckets = hasOutros
    ? [...topKpis, { key: "__outros", name: "Outros", party: null as string | null, color: "var(--series-muted)" }]
    : topKpis;
  const buckets = hasBN
    ? [...candidateBuckets, { key: "__bn", name: "Brancos/Nulos/NR", party: null as string | null, color: "var(--text-muted)" }]
    : candidateBuckets;

  const gridLevels = [0, 20, 40, 60, 80, 100].filter((v) => model != null && v <= model.yMax);

  // Hover timeline: the sorted union of drawn-series point dates, each with its
  // x position (percent of the plot) on the same scale the lines use.
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

  if (series.length === 0) return null;

  return (
    <>
      {/* KPI row — top three plus "Outros" on ONE line, like the target. On
          hover these switch to the hovered date's values. */}
      {buckets.length > 0 && (
        <ul className="flex flex-wrap gap-x-5 gap-y-2 sm:gap-x-7">
          {buckets.map((k) => (
            <li key={k.key} className="flex min-w-0 flex-col gap-0.5">
              <span
                className="tabular text-[24px] font-bold leading-none sm:text-[28px]"
                style={{ ...DISPLAY, color: k.color }}
              >
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

      {/* The framed chart: a bordered surface with y-gridlines, 50% line,
          month axis and a legend row. */}
      <div className="card p-3 sm:p-4">
        <div className="flex gap-1.5">
          {/* y-axis labels, aligned to the SVG gridlines. */}
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
            className="relative h-[200px] flex-1 sm:h-[240px]"
          >
            <HeroChart average={average} maxSeries={maxSeries} framed cutoff={cutoff} />
            {showFifty && (
              <span
                className="tabular pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1 text-[10px] font-semibold"
                style={{ top: `${fiftyTop}%`, color: "var(--text-muted)", background: "var(--surface-1)" }}
              >
                50%
              </span>
            )}

            {/* HOVER OVERLAY — vertical guide, per-series dots, tooltip. Renders
                only while a date is hovered (mouse + fine pointer); everything
                is pointer-events-none so the plot keeps receiving mousemove. */}
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
                  className="pointer-events-none absolute z-[1] top-1 max-w-[68%] rounded-md border px-2 py-1.5 text-[11px] shadow-sm"
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
                    {candidateBuckets.map((k) => (
                      <li key={`tt-${k.key}`} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: k.color }} />
                        <span style={{ color: "var(--text-secondary)" }}>{shortName(k.name)}</span>
                        <span className="tabular ml-auto pl-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                          {fmtPct(activePcts.get(k.key) ?? 0)}%
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}
          </div>
        </div>
        {/* Time axis — same w-7 gutter + flex-1 as the chart, so month ticks
            line up under the plot. */}
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
        {/* Legend row — the candidate series (top 3 + Outros) plus the 50%
            line. NOT the branco/nulo bucket: it is not a drawn line. */}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {candidateBuckets.map((k) => (
            <li key={`leg-${k.key}`} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: k.color }} />
              <span className="truncate">{k.name}</span>
            </li>
          ))}
          <li className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
            <span aria-hidden="true" className="inline-block h-0 w-3.5 border-t border-dashed" style={{ borderColor: "var(--axis)" }} />
            50% (vitória no 1º turno)
          </li>
        </ul>
      </div>
    </>
  );
}
