"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colorMap, colorOf } from "@/lib/colors";
import { candKey } from "@/lib/average";
import type { RaceAverage } from "@/lib/types";
import type { Basis } from "@/lib/validos";

/**
 * The average chart: one line per candidate over the site's rolling-average
 * series, with the readout panel INSIDE the chart frame rather than beside it.
 *
 * Three things this component deliberately does NOT do:
 *
 * 1. NO VALID-VOTE MATHS. It renders the `RaceAverage` it is handed, exactly as
 *    handed. The parent precomputes both cuts (`computeAverage(..., "bruto")`
 *    and `computeAverage(..., "validos")`) and passes the active one. Basis
 *    conversion happens once, upstream, per the rule in lib/validos.ts.
 *
 * 2. NO FILTERING OF ANYTHING BUT THE VIEWPORT. The range buttons are a lens on
 *    the trend series only. They never change the average, never change which
 *    polls are in it, and the table beside this chart is not theirs to touch.
 *
 * 3. NO COLOUR BY POSITION. A candidate's colour is hashed from their name, so
 *    it survives the leader changing, the seat being re-sorted, and a rebuild.
 *    Slot-by-array-index is how a chart silently recolours itself the day two
 *    candidates swap places.
 */

export type RangeKey = "3m" | "6m" | "1a" | "18m" | "tudo";

export interface AverageChartProps {
  /**
   * The average to render — already on the basis the parent wants shown.
   * Candidates are expected sorted desc by `avg` (computeAverage guarantees it);
   * the top `maxSeries` are drawn and the rest are dropped silently.
   */
  average: RaceAverage;
  /**
   * Which cut the parent is showing. Presentational only — it labels the
   * caption and the screen-reader summary. It must agree with `average.basis`,
   * because this component cannot convert between cuts; when omitted it is
   * taken from `average.basis`, which is the safe default.
   */
  basis?: Basis;
  /** Optional heading rendered above the range buttons. */
  title?: string;
  /** Initial viewport. Default "6m". */
  defaultRange?: RangeKey;
  /** Hard cap on drawn lines. Default 8 — the palette has eight slots. */
  maxSeries?: number;
  className?: string;
}

// ── geometry ──────────────────────────────────────────────────────────────
// Two viewBoxes: wide reserves a column on the right for the panel; narrow
// gives the whole frame to the lines because the panel stacks below it.
const WIDE = { W: 860, H: 165, pad: { top: 12, right: 196, bottom: 24, left: 38 } };
const NARROW = { W: 420, H: 200, pad: { top: 12, right: 14, bottom: 24, left: 32 } };
/** Below this rendered width the panel stops fitting inside the frame. */
const STACK_BELOW = 640;
/** Panel row box height and minimum centre-to-centre spacing, in CSS pixels. */
const ROW_H = 20;
const ROW_GAP = 23;

const RANGES: { key: RangeKey; months: number | null; name: string }[] = [
  { key: "3m", months: 3, name: "3 meses" },
  { key: "6m", months: 6, name: "6 meses" },
  { key: "1a", months: 12, name: "1 ano" },
  { key: "18m", months: 18, name: "18 meses" },
  { key: "tudo", months: null, name: "todo o período" },
];

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isoTime(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  return Date.UTC(y, (m || 1) - 1, d || 1);
}

function fmtShort(iso: string): string {
  const [y, m] = iso.split("-");
  return `${MES[Number(m) - 1]}/${y.slice(2)}`;
}

function fmtFull(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function pct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

/** Anchor minus N months, as an ISO date. */
function monthsBefore(iso: string, months: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const t = new Date(Date.UTC(y, m - 1 - months, d));
  return t.toISOString().slice(0, 10);
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ── deterministic colour ──────────────────────────────────────────────────
// Palette, hash and slot assignment live in `@/lib/colors` — see the note
// there on why probing makes the KEY SET part of the answer, and why three
// private copies of this could give one candidate two colours on one page.
const assignColors = (keys: string[]) => colorMap(keys);

// ── label placement ───────────────────────────────────────────────────────
/**
 * Push overlapping rows apart without letting any leave the frame.
 *
 * Forward pass enforces a floor of `lo + i*step`; backward pass enforces a
 * ceiling of `hi - (n-1-i)*step`. Because `step <= (hi-lo)/n`, the floor is
 * always below the ceiling, so the backward pass can never undo the forward
 * pass's spacing — two passes converge, no iteration needed, nothing escapes
 * [lo, hi]. Returns centres in input order.
 */
function placeRows(targets: number[], lo: number, hi: number, minGap: number): number[] {
  const n = targets.length;
  if (n === 0) return [];
  if (hi <= lo) return targets.map(() => lo);
  const step = Math.min(minGap, (hi - lo) / n);
  const order = targets
    .map((t, i) => ({ i, t: clamp(t, lo, hi) }))
    .sort((a, b) => a.t - b.t || a.i - b.i);
  const ys = order.map((o) => o.t);
  let acc = lo;
  for (let k = 0; k < n; k++) {
    ys[k] = Math.max(ys[k], acc);
    acc = ys[k] + step;
  }
  let acc2 = hi;
  for (let k = n - 1; k >= 0; k--) {
    ys[k] = Math.min(ys[k], acc2);
    acc2 = ys[k] - step;
  }
  const out = new Array<number>(n).fill(lo);
  order.forEach((o, k) => {
    out[o.i] = ys[k];
  });
  return out;
}

interface Series {
  key: string;
  name: string;
  avg: number;
  nPolls: number;
  muted: boolean;
  color: string;
  points: { date: string; avg: number }[]; // full history, ascending
}

/** Value of a series as of `date`: the point on that day, else the last before it. */
function valueAt(points: { date: string; avg: number }[], date: string): number | null {
  let v: number | null = null;
  for (const p of points) {
    if (p.date <= date) v = p.avg;
    else break;
  }
  return v;
}

export default function AverageChart({
  average,
  basis,
  title,
  defaultRange = "6m",
  maxSeries = 8,
  className,
}: AverageChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const [range, setRange] = useState<RangeKey>(defaultRange);
  const [hoverDate, setHoverDate] = useState<string | null>(null);
  // Assume the wide layout for SSR and the first client render (identical, so
  // no hydration mismatch); the observer corrects it a frame later.
  const [box, setBox] = useState<{ w: number; h: number }>({ w: WIDE.W, h: WIDE.H });
  // "Hoje" is read after mount only — a server-rendered date would differ from
  // the client's and blow up hydration at every timezone midnight.
  const [today, setToday] = useState<string | null>(null);

  useEffect(() => {
    const d = new Date();
    const p = (n: number) => String(n).padStart(2, "0");
    setToday(`${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`);
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el || typeof ResizeObserver === "undefined") return;
    const ro = new ResizeObserver((entries) => {
      for (const e of entries) {
        const { width, height } = e.contentRect;
        if (width > 0 && height > 0) setBox({ w: width, h: height });
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const stacked = box.w < STACK_BELOW;
  const dims = stacked ? NARROW : WIDE;
  const { W, H, pad } = dims;

  // ── series (range-independent) ──────────────────────────────────────────
  const series = useMemo<Series[]>(() => {
    const seen = new Set<string>();
    const picked = average.candidates
      .slice(0, Math.max(1, maxSeries))
      .filter((c) => {
        const k = candKey(c.candidate);
        if (seen.has(k)) return false;
        seen.add(k);
        return true;
      });
    const colors = assignColors(picked.map((c) => candKey(c.candidate)));
    return picked.map((c) => {
      const k = candKey(c.candidate);
      // A candidate with no trend at all (fewer than two dated polls in the
      // seat) still gets one point: their current average, on the date of the
      // last poll. Both halves are facts from the ledger — nothing invented —
      // and it is what makes a one-date race render a chart instead of a hole.
      const pts =
        c.trend.length > 0
          ? c.trend
          : average.lastPollDate
            ? [{ date: average.lastPollDate, avg: c.avg }]
            : [];
      return {
        key: k,
        name: c.candidate,
        avg: c.avg,
        nPolls: c.nPolls,
        muted: c.nPolls < average.pollCount,
        color: colorOf(colors, c.candidate),
        points: pts,
      };
    });
  }, [average, maxSeries]);

  const allDates = useMemo(() => {
    const s = new Set<string>();
    for (const x of series) for (const p of x.points) s.add(p.date);
    return [...s].sort();
  }, [series]);

  // ── the lens ────────────────────────────────────────────────────────────
  const lens = useMemo(() => {
    if (!allDates.length) return null;
    const anchor = today ?? allDates[allDates.length - 1];
    const want = Math.max(0, RANGES.findIndex((r) => r.key === range));
    let eff = RANGES.length - 1;
    let cutoff: string | null = null;
    for (let i = want; i < RANGES.length; i++) {
      const m = RANGES[i].months;
      const c = m === null ? null : monthsBefore(anchor, m);
      if (c === null || allDates.some((d) => d >= c)) {
        eff = i;
        cutoff = c;
        break;
      }
    }
    return { eff: RANGES[eff], cutoff, expanded: eff !== want, anchor };
  }, [allDates, range, today]);

  const model = useMemo(() => {
    if (!lens) return null;
    const cut = lens.cutoff;
    const vis = series.map((s) => ({
      s,
      points: cut === null ? s.points : s.points.filter((p) => p.date >= cut),
    }));
    const dates = [...new Set(vis.flatMap((v) => v.points.map((p) => p.date)))].sort();
    if (!dates.length) return null;

    const t0 = isoTime(dates[0]);
    const t1 = isoTime(dates[dates.length - 1]);
    const span = t1 - t0;
    const left = pad.left;
    const right = W - pad.right;
    // A single sampled date has no span: put it in the middle of the frame
    // rather than dividing by zero and painting NaN into every `d` attribute.
    const x = (iso: string) =>
      span <= 0 ? (left + right) / 2 : left + ((isoTime(iso) - t0) / span) * (right - left);

    const peak = Math.max(
      10,
      ...vis.flatMap((v) => v.points.map((p) => p.avg)),
      ...series.map((s) => s.avg),
    );
    const yTop = Math.min(100, Math.max(10, Math.ceil((peak + 5) / 10) * 10));
    const y = (v: number) => pad.top + (1 - clamp(v, 0, yTop) / yTop) * (H - pad.top - pad.bottom);

    return { vis, dates, x, y, yTop, span };
  }, [lens, series, pad.left, pad.top, pad.bottom, W, H]);

  // A hover held across a range change may point at a date no longer shown.
  const activeDate =
    hoverDate && model && model.dates.includes(hoverDate) ? hoverDate : null;

  const moveHover = useCallback(
    (delta: number) => {
      if (!model) return;
      const { dates } = model;
      const cur = activeDate ? dates.indexOf(activeDate) : dates.length - 1;
      const next = clamp(cur + delta, 0, dates.length - 1);
      setHoverDate(dates[next]);
    },
    [model, activeDate],
  );

  const onKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!model) return;
    const { dates } = model;
    if (e.key === "ArrowLeft") {
      e.preventDefault();
      moveHover(-1);
    } else if (e.key === "ArrowRight") {
      e.preventDefault();
      moveHover(1);
    } else if (e.key === "Home") {
      e.preventDefault();
      setHoverDate(dates[0]);
    } else if (e.key === "End") {
      e.preventDefault();
      setHoverDate(dates[dates.length - 1]);
    } else if (e.key === "Escape") {
      setHoverDate(null);
    }
  };

  const onPointer = (e: React.PointerEvent<SVGSVGElement>) => {
    const svg = svgRef.current;
    if (!svg || !model) return;
    const rect = svg.getBoundingClientRect();
    if (rect.width <= 0) return;
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best: string | null = null;
    let bestD = Infinity;
    for (const d of model.dates) {
      const dist = Math.abs(model.x(d) - px);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    setHoverDate(best);
  };

  // ── panel rows ──────────────────────────────────────────────────────────
  const rows = useMemo(() => {
    if (!model) return [];
    return model.vis.map(({ s, points }) => {
      const last = points.length ? points[points.length - 1] : null;
      const at = activeDate ? valueAt(points, activeDate) : null;
      // Shown value: the current average at rest, the value as of the hovered
      // date while scrubbing. A series that had not started yet reads "—".
      const shown = activeDate ? at : s.avg;
      // Where the row points: the crosshair intersection while scrubbing, the
      // line end at rest, the series' first value when it has not started.
      const anchorVal = activeDate
        ? (at ?? (points.length ? points[0].avg : s.avg))
        : (last ? last.avg : s.avg);
      const target = model.y(anchorVal);
      const connect =
        activeDate && at !== null
          ? { x: model.x(activeDate), y: model.y(at) }
          : !activeDate && last
            ? { x: model.x(last.date), y: model.y(last.avg) }
            : null;
      return { s, shown, target, connect, hasPoints: points.length > 0 };
    });
  }, [model, activeDate]);

  // Placement runs in CSS pixels — the rows are HTML, so their height does not
  // scale with the viewBox and the collision test has to be done where the
  // reader actually sees it.
  const vScale = box.h > 0 ? box.h / H : 1;
  const placed = useMemo(() => {
    if (stacked || !rows.length) return [];
    const lo = pad.top * vScale + ROW_H / 2;
    const hi = (H - pad.bottom) * vScale - ROW_H / 2;
    return placeRows(rows.map((r) => r.target * vScale), lo, hi, ROW_GAP);
  }, [rows, stacked, vScale, pad.top, pad.bottom, H]);

  const gridStep = model && model.yTop <= 20 ? 5 : 10;
  const gridVals = model
    ? Array.from({ length: Math.floor(model.yTop / gridStep) + 1 }, (_, i) => i * gridStep)
    : [];

  const monthTicks = useMemo(() => {
    if (!model) return [];
    const months = model.dates.filter(
      (d, i) => i === 0 || d.slice(0, 7) !== model.dates[i - 1].slice(0, 7),
    );
    const want = stacked ? 4 : 8;
    const step = Math.max(1, Math.ceil(months.length / want));
    return months.filter((_, i) => i % step === 0);
  }, [model, stacked]);

  const shownBasis: Basis = basis ?? average.basis;
  const basisLabel = shownBasis === "validos" ? "votos válidos" : "total da amostra";
  const panelLeftPct = ((W - pad.right + 10) / W) * 100;

  const srSummary = series
    .map((s) => `${s.name} ${pct(s.avg)}`)
    .join("; ");

  return (
    <div className={className}>
      {title && <h4 className="mb-2 text-sm font-semibold">{title}</h4>}

      <div className="mb-2 flex flex-wrap items-center gap-1.5">
        <div className="flex flex-wrap gap-1" role="group" aria-label="Período exibido no gráfico">
          {RANGES.map((r) => {
            const on = r.key === range;
            return (
              <button
                key={r.key}
                type="button"
                onClick={() => setRange(r.key)}
                aria-pressed={on}
                title={`Mostrar ${r.name}`}
                className="rounded-md border px-2 py-0.5 text-xs font-medium transition-colors"
                style={{
                  borderColor: on ? "var(--accent)" : "var(--ring)",
                  background: on ? "var(--accent)" : "transparent",
                  color: on ? "var(--surface-1)" : "var(--text-secondary)",
                }}
              >
                {r.key}
              </button>
            );
          })}
        </div>
        <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
          O período muda só o gráfico — não altera a média nem a tabela.
        </span>
      </div>

      {lens?.expanded && (
        <p className="mb-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Sem pesquisas em {RANGES.find((r) => r.key === range)?.name} — exibindo{" "}
          {lens.eff.name}.
        </p>
      )}

      {!model ? (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          Sem série temporal para esta disputa — nenhuma pesquisa com data utilizável.
        </p>
      ) : (
        <>
          <div
            ref={containerRef}
            className="relative rounded-md outline-2 outline-offset-2 outline-transparent focus-within:outline-[var(--accent)]"
          >
            <div
              tabIndex={0}
              role="group"
              aria-label="Gráfico da média. Use as setas esquerda e direita para percorrer as datas, Esc para sair."
              onKeyDown={onKeyDown}
              onBlur={() => setHoverDate(null)}
              className="block outline-none"
            >
              <svg
                ref={svgRef}
                viewBox={`0 0 ${W} ${H}`}
                className="block w-full"
                style={{ touchAction: "pan-y" }}
                role="img"
                aria-label={`Evolução da média das pesquisas — ${basisLabel}. Médias atuais: ${srSummary}.`}
                onPointerMove={onPointer}
                onPointerDown={onPointer}
                onPointerLeave={() => setHoverDate(null)}
              >
                {gridVals.map((v) => (
                  <g key={v}>
                    <line
                      x1={pad.left}
                      x2={W - pad.right}
                      y1={model.y(v)}
                      y2={model.y(v)}
                      stroke={v === 0 ? "var(--axis)" : "var(--grid)"}
                      strokeWidth={1}
                    />
                    <text
                      x={pad.left - 6}
                      y={model.y(v) + 3.5}
                      textAnchor="end"
                      fontSize={11}
                      fill="var(--text-muted)"
                      className="tabular"
                    >
                      {v}
                    </text>
                  </g>
                ))}

                {monthTicks.map((d) => (
                  <text
                    key={d}
                    x={model.x(d)}
                    y={H - 8}
                    textAnchor="middle"
                    fontSize={11}
                    fill="var(--text-muted)"
                  >
                    {fmtShort(d)}
                  </text>
                ))}

                {activeDate && (
                  <line
                    x1={model.x(activeDate)}
                    x2={model.x(activeDate)}
                    y1={pad.top}
                    y2={H - pad.bottom}
                    stroke="var(--axis)"
                    strokeWidth={1}
                    strokeDasharray="3 3"
                  />
                )}

                {model.vis.map(({ s, points }) => {
                  if (!points.length) return null;
                  // One point draws no path — a lone `M` renders nothing — so
                  // the dot below is what makes a single-date race visible.
                  const d = points
                    .map(
                      (p, i) =>
                        `${i ? "L" : "M"}${model.x(p.date).toFixed(1)},${model.y(p.avg).toFixed(1)}`,
                    )
                    .join("");
                  return (
                    <g key={s.key} opacity={s.muted ? 0.5 : 1}>
                      {points.length > 1 && (
                        <path
                          d={d}
                          fill="none"
                          stroke={s.color}
                          strokeWidth={2}
                          strokeLinejoin="round"
                          strokeLinecap="round"
                        />
                      )}
                      <circle
                        cx={model.x(points[points.length - 1].date)}
                        cy={model.y(points[points.length - 1].avg)}
                        r={points.length > 1 ? 2.5 : 4}
                        fill={s.color}
                      />
                    </g>
                  );
                })}

                {/* Leader lines from each panel row back to the true line end
                    (or to the crosshair intersection while scrubbing). */}
                {!stacked &&
                  rows.map((r, i) => {
                    if (!r.connect || placed[i] === undefined) return null;
                    const rowYSvg = vScale > 0 ? placed[i] / vScale : r.target;
                    return (
                      <line
                        key={`lead-${r.s.key}`}
                        x1={r.connect.x + 4}
                        y1={r.connect.y}
                        x2={W - pad.right + 6}
                        y2={rowYSvg}
                        stroke={r.s.color}
                        strokeWidth={0.9}
                        opacity={r.s.muted ? 0.3 : 0.55}
                      />
                    );
                  })}

                {activeDate &&
                  rows.map((r) =>
                    r.shown === null || !r.connect ? null : (
                      <circle
                        key={`dot-${r.s.key}`}
                        cx={model.x(activeDate)}
                        cy={r.connect.y}
                        r={4}
                        fill={r.s.color}
                        stroke="var(--surface-1)"
                        strokeWidth={2}
                        opacity={r.s.muted ? 0.6 : 1}
                      />
                    ),
                  )}
              </svg>
            </div>

            {/* The panel: inside the frame on wide layouts. It IS the readout —
                there is no floating tooltip anywhere in this component. */}
            {!stacked && (
              <div
                className="pointer-events-none absolute inset-y-0"
                style={{ left: `${panelLeftPct}%`, right: 4 }}
                aria-hidden="true"
              >
                <div
                  className="absolute left-0 top-0 truncate text-[10px] font-semibold uppercase tracking-wide"
                  style={{ color: "var(--text-muted)" }}
                >
                  {activeDate ? fmtFull(activeDate) : "média atual"}
                </div>
                {rows.map((r, i) => (
                  <div
                    key={r.s.key}
                    className="absolute left-0 right-0 flex items-center gap-1.5 text-xs"
                    style={{
                      top: (placed[i] ?? 0) - ROW_H / 2,
                      height: ROW_H,
                      opacity: r.s.muted ? 0.55 : 1,
                      transition: "top 160ms ease-out",
                    }}
                  >
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ background: r.s.color }}
                    />
                    <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                      {r.s.name}
                    </span>
                    <span className="tabular ml-auto shrink-0 pl-1 font-semibold">
                      {r.shown === null ? "—" : pct(r.shown)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Phones: the same panel, stacked below the frame. */}
          {stacked && (
            <ul className="mt-2 space-y-1" aria-hidden="true">
              <li className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                {activeDate ? fmtFull(activeDate) : "média atual"}
              </li>
              {rows.map((r) => (
                <li
                  key={r.s.key}
                  className="flex items-center gap-1.5 text-xs"
                  style={{ opacity: r.s.muted ? 0.55 : 1 }}
                >
                  <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: r.s.color }} />
                  <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                    {r.s.name}
                  </span>
                  <span className="tabular ml-auto shrink-0 pl-1 font-semibold">
                    {r.shown === null ? "—" : pct(r.shown)}
                  </span>
                </li>
              ))}
            </ul>
          )}

          <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
            Janela do gráfico: {lens?.eff.name} · base: {basisLabel} · média das {average.pollCount}{" "}
            pesquisa{average.pollCount === 1 ? "" : "s"} mais recentes
            {rows.some((r) => r.s.muted) ? " · em cinza, candidatos presentes em parte das pesquisas" : ""}
          </p>

          {/* Screen readers get the numbers, not the picture. */}
          <div className="sr-only" aria-live="polite">
            {activeDate
              ? `${fmtFull(activeDate)}: ${rows
                  .map((r) => `${r.s.name} ${r.shown === null ? "sem dados" : pct(r.shown)}`)
                  .join(", ")}`
              : ""}
          </div>
          <table className="sr-only">
            <caption>
              Médias das pesquisas ({basisLabel}) — janela do gráfico: {lens?.eff.name}
            </caption>
            <thead>
              <tr>
                <th scope="col">Candidato</th>
                <th scope="col">Média atual</th>
                <th scope="col">Pesquisas na média</th>
                <th scope="col">Início da janela</th>
                <th scope="col">Fim da janela</th>
              </tr>
            </thead>
            <tbody>
              {model.vis.map(({ s, points }) => (
                <tr key={s.key}>
                  <th scope="row">{s.name}</th>
                  <td>{pct(s.avg)}</td>
                  <td>
                    {s.nPolls} de {average.pollCount}
                  </td>
                  <td>
                    {points.length
                      ? `${fmtFull(points[0].date)}: ${pct(points[0].avg)}`
                      : "sem dados na janela"}
                  </td>
                  <td>
                    {points.length
                      ? `${fmtFull(points[points.length - 1].date)}: ${pct(points[points.length - 1].avg)}`
                      : "sem dados na janela"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}
    </div>
  );
}
