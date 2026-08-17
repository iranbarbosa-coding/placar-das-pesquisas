import { candKey } from "@/lib/average";
import { dualColor, hashName } from "@/lib/colors";
import type { CandidateAverage, RaceAverage } from "@/lib/types";

/**
 * The hero backdrop: an OVERLAPPING (not stacked) area chart of the presidential
 * average, drawn edge to edge behind the front-page headline.
 *
 * Server component on purpose — it is a picture of build-time data with no
 * hover, no range buttons and no state, so there is nothing for a client bundle
 * to do. `AverageChart` is the interactive one; this is deliberately NOT that
 * component and must not grow into it.
 *
 * WHY OVERLAPPING AND NOT STACKED
 * -------------------------------
 * With the top two around 45% and 38% a stack fills the frame from baseline to
 * ceiling: the second band's *top edge* would sit at ~83% and its height would
 * be the only honest reading of its number — a shape readers systematically
 * misread, and one that leaves no quiet region for a 48px headline to sit over.
 * Stacking also asserts a total, and these percentages do not total anything
 * meaningful (the cut is votos válidos, and the six drawn candidates are not
 * the whole field). Overlapping areas keep every series anchored at zero, so
 * the height of a shape IS that candidate's percentage, and the sub-5% field
 * stays visible as ribbons along the baseline instead of being crushed into
 * slivers between two large bands. Areas are painted largest-first so the small
 * ones and their top strokes are never buried.
 *
 * NO COLOUR BY POSITION. Same rule, same algorithm as `AverageChart`: the slot
 * is hashed from the candidate's normalized name. The algorithm is duplicated
 * here rather than imported because `AverageChart` is a client component and
 * importing from it would drag this one across the client boundary; the two
 * copies must be edited together.
 */

// ── geometry ──────────────────────────────────────────────────────────────
// The SVG is stretched to its box (`preserveAspectRatio="none"`), so the
// viewBox is a coordinate space, not an aspect ratio. Strokes are pinned with
// `vector-effect="non-scaling-stroke"` so nothing distorts, and there is no
// text inside the SVG — labels live in HTML where they cannot be squashed.
const W = 1200;
const H = 320;
const PAD_TOP = 16;
const PAD_BOTTOM = 8;

// DUAL PALETTE (2026-08-17): the home hero colours by RANK, not by name — the
// leader red, the rival blue, the rest muted grey, matching the redesign mockup.
// (State pages keep the per-candidate hash via `colorMap` elsewhere.)

// ── numbers that can never reach the DOM broken ───────────────────────────
/** Any non-finite input becomes 0. Nothing else is allowed near a path. */
function fin(v: number | null | undefined, fallback = 0): number {
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

/** Coordinate → string. The last gate: no NaN, no Infinity, ever, in any `d`. */
function co(v: number): string {
  return (Number.isFinite(v) ? v : 0).toFixed(2);
}

function isoTime(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(fin(y, 1970), fin(m, 1) - 1, fin(d, 1));
  return Number.isFinite(t) ? t : 0;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// DISPLAY WINDOW (2026-08-17 redesign). The framed hero shows the CURRENT CYCLE
// — the last ~6 months ending at the newest poll — not the full multi-year
// trend, so the lines read as clean recent tracking with ~6 monthly ticks
// (mar–ago). This is a view over real data, not a crop of it: the averages and
// the KPI numbers are untouched; only the DRAWN span is trimmed here.
const WINDOW_DAYS = 180;

/** ISO date `WINDOW_DAYS` before the newest poll, or null if unknown. Points
 *  older than this are dropped from the drawn trend (string compare is safe on
 *  zero-padded YYYY-MM-DD). */
function windowStartIso(lastIso: string | null | undefined): string | null {
  if (!lastIso || lastIso.length < 10) return null;
  const t = isoTime(lastIso) - WINDOW_DAYS * 86400000;
  if (!Number.isFinite(t) || t <= 0) return null;
  const d = new Date(t);
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${d.getUTCFullYear()}-${mm}-${dd}`;
}

export interface HeroSeries {
  /** Normalized name — the identity used for colour and dedupe. */
  key: string;
  name: string;
  /** Current average, already finite. */
  avg: number;
  color: string;
  /** Trend points, ascending, non-finite values dropped. */
  points: { date: string; avg: number }[];
}

/**
 * The drawn series, with colours — exported so the hero's legend labels the
 * same candidates in the same colours from one computation instead of two.
 */
export function heroSeries(average: RaceAverage | null, maxSeries = 6): HeroSeries[] {
  if (!average) return [];
  // Trim the drawn trend to the last ~6 months (see WINDOW_DAYS). The KPI
  // averages come from `c.avg`, untouched — only the drawn points are windowed.
  const cutoff = windowStartIso(average.lastPollDate);
  const seen = new Set<string>();
  const uniq: CandidateAverage[] = [];
  for (const c of average.candidates) {
    const k = candKey(c.candidate);
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(c);
  }
  return uniq.slice(0, Math.max(1, maxSeries)).map((c, rank) => {
    const k = candKey(c.candidate);
    const pts = (Array.isArray(c.trend) ? c.trend : [])
      .filter((p) => typeof p?.date === "string" && p.date.length >= 7 && Number.isFinite(p.avg))
      .filter((p) => !cutoff || p.date >= cutoff)
      .map((p) => ({ date: p.date, avg: fin(p.avg) }));
    return {
      key: k,
      name: c.candidate,
      avg: fin(c.avg),
      color: dualColor(rank, "red"),
      points: pts,
    };
  });
}

/**
 * One drawn shape. `area` is the normal case; `dot` is a series with a single
 * trend point inside a real time span — see the comment on the branch below.
 */
export type Painted =
  | {
      kind: "area";
      s: HeroSeries;
      area: string;
      line: string;
      /** DOM-safe id for this series' fill gradient. */
      gradientId: string;
      /** Top of the gradient: this series' own peak, in user space. */
      gradientTop: string;
    }
  | { kind: "dot"; s: HeroSeries; cx: string; cy: string };

/**
 * Candidate keys carry spaces, accents and punctuation; ids must not. The hash
 * is appended because sanitizing alone can map two distinct names onto one id,
 * and two areas sharing a gradient is a wrong-colour bug that only shows up for
 * whichever pair of candidates happens to collide.
 */
function domId(key: string): string {
  const slug = key.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "") || "x";
  return `hero-fill-${slug}-${hashName(key).toString(36)}`;
}

interface Model {
  series: HeroSeries[];
  /** Painting order: largest average first, so small ribbons stay on top. */
  painted: Painted[];
  yMax: number;
  y: (v: number) => number;
  from: string | null;
  to: string | null;
  /** True when the whole race sits on a single date — every band is drawn flat. */
  flat: boolean;
}

/**
 * Scales and paths. Exported for verification: every number it produces is
 * checked finite by `co` before it becomes an attribute, and this is the
 * function a test drives with degenerate races.
 */
export function heroChartModel(average: RaceAverage | null, maxSeries = 6): Model | null {
  const series = heroSeries(average, maxSeries);
  if (!series.length) return null;

  const dates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const t0 = dates.length ? isoTime(dates[0]) : 0;
  const t1 = dates.length ? isoTime(dates[dates.length - 1]) : 0;
  const span = t1 - t0;
  // One date (or none) has no time extent. Rather than divide by zero — or draw
  // a zero-width area nobody can see — every band is drawn flat at its current
  // average and the caption says the series is a single date.
  const flat = !(span > 0);

  const x = (iso: string) => (flat ? 0 : ((isoTime(iso) - t0) / span) * W);

  const peak = Math.max(10, ...series.map((s) => s.avg), ...series.flatMap((s) => s.points.map((p) => p.avg)));
  // `peak` is finite by construction (every input passed `fin`), and the
  // Math.max(10, …) floor means yMax >= 10 — the divisor can never be 0.
  const yMax = clamp(Math.ceil((fin(peak, 10) + 5) / 10) * 10, 10, 100);
  const plot = H - PAD_TOP - PAD_BOTTOM;
  const y = (v: number) => PAD_TOP + (1 - clamp(fin(v), 0, yMax) / yMax) * plot;
  const y0 = y(0);

  const painted: Painted[] = [...series]
    .sort((a, b) => b.avg - a.avg || (a.key < b.key ? -1 : 1))
    .map((s): Painted => {
      // THE WHOLE RACE ON ONE DATE. There is no time axis to misread, so every
      // band is held flat across the frame at the one value that exists. The
      // value is a fact from the average; only its extent is a drawing choice,
      // and the accessible description says the chart covers a single date.
      if (flat) {
        const v = s.points.length ? s.points[s.points.length - 1].avg : s.avg;
        const line = `M${co(0)},${co(y(v))} L${co(W)},${co(y(v))}`;
        return {
          kind: "area",
          s,
          line,
          area: `${line} L${co(W)},${co(y0)} L${co(0)},${co(y0)} Z`,
          gradientId: domId(s.key),
          gradientTop: co(y(v)),
        };
      }
      // ONE POINT INSIDE A REAL SPAN. This is a candidate who entered the
      // polling late — `buildTrends` starts a candidate's series on the first
      // day they appear in a window, so their trend is legitimately shorter
      // than everyone else's. Stretching that single value across the frame
      // would assert they were polling at that number months before anyone
      // asked about them. It gets a dot at its date instead, and its number is
      // in the legend like everybody else's.
      if (s.points.length < 2) {
        const p = s.points[0];
        if (!p) return { kind: "dot", s, cx: co(W), cy: co(y(s.avg)) };
        return { kind: "dot", s, cx: co(x(p.date)), cy: co(y(p.avg)) };
      }
      const pts = s.points.map((p) => ({ px: x(p.date), v: p.avg }));
      const line = pts.map((p, i) => `${i ? "L" : "M"}${co(p.px)},${co(y(p.v))}`).join(" ");
      const area = `${line} L${co(pts[pts.length - 1].px)},${co(y0)} L${co(pts[0].px)},${co(y0)} Z`;
      return {
        kind: "area",
        s,
        area,
        line,
        gradientId: domId(s.key),
        gradientTop: co(y(Math.max(...pts.map((p) => p.v)))),
      };
    });

  return {
    series,
    painted,
    yMax,
    y,
    from: dates.length ? dates[0] : null,
    to: dates.length ? dates[dates.length - 1] : null,
    flat,
  };
}

const MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];
const MES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function fmtLong(iso: string): string {
  const [y, m, d] = iso.split("-");
  const mes = MES[Number(m) - 1];
  return mes ? `${Number(d)} de ${mes} de ${y}` : iso;
}

/**
 * Month ticks for the FRAMED hero, as {label, leftPct} — the x-axis the brief
 * (§4) asks for so a reader can place "when", not just "what". Geometry stays
 * here, in the one module that owns the x-scale, instead of being re-derived in
 * the hero. Each tick is the first of a month inside the drawn span, placed by
 * the same linear time scale the paths use. Returns [] on a flat/single-date
 * race, where there is no time extent to label.
 */
export function heroAxisTicks(model: Model | null): { label: string; leftPct: number }[] {
  if (!model || model.flat || !model.from || !model.to) return [];
  const t0 = isoTime(model.from);
  const t1 = isoTime(model.to);
  const span = t1 - t0;
  if (!(span > 0)) return [];
  // Collect every month-first inside the span, then THIN to ~8 labels so a
  // two-year series does not print a solid ribbon of month names (the mockup's
  // span was four months; real data reaches two years). The step keeps January
  // preferentially so year boundaries survive the thinning and carry the year.
  const months: { y: number; m: number; t: number }[] = [];
  const start = new Date(t0);
  let y = start.getUTCFullYear();
  let m = start.getUTCMonth();
  if (start.getUTCDate() !== 1) { m += 1; if (m > 11) { m = 0; y += 1; } }
  for (;;) {
    const t = Date.UTC(y, m, 1);
    if (t > t1) break;
    months.push({ y, m, t });
    m += 1; if (m > 11) { m = 0; y += 1; }
  }
  const MAX = 8;
  // Snap the stride to a divisor of 12, so kept months stay evenly spaced FROM
  // January. A raw stride of 5 (what ~3 years produces) would keep Jan and Nov,
  // two months apart, and the year label collides with the Nov tick at 375px.
  const raw = Math.max(1, Math.ceil(months.length / MAX));
  const step = [1, 2, 3, 4, 6, 12].find((s) => s >= raw) ?? 12;
  const ticks: { label: string; leftPct: number }[] = [];
  for (const mo of months) {
    // Anchor on January (m 0) so kept ticks line up with year turns, and a
    // January tick carries the year instead of the month name.
    if (mo.m % step !== 0) continue;
    ticks.push({
      label: mo.m === 0 ? String(mo.y) : MES_ABREV[mo.m],
      leftPct: ((mo.t - t0) / span) * 100,
    });
  }
  return ticks;
}

/** Vertical position (top %, 0 at the box top) of a value on the framed scale.
 *  Lets the hero place an HTML "50%" label exactly on the SVG's dashed line. */
export function heroLevelTopPct(model: Model | null, value: number): number | null {
  if (!model) return null;
  return (model.y(value) / H) * 100;
}

/** The last-poll marker for the framed hero: the leader series' final point,
 *  as {leftPct, topPct, label, value, color}. Null when there is no span. */
export function heroLastMarker(model: Model | null):
  | { leftPct: number; topPct: number; name: string; value: number; color: string; date: string }
  | null {
  if (!model || model.flat || !model.from || !model.to) return null;
  const t0 = isoTime(model.from);
  const span = isoTime(model.to) - t0;
  if (!(span > 0)) return null;
  // Leader = the largest current average (painting order's first area).
  const leader = [...model.series].sort((a, b) => b.avg - a.avg)[0];
  const last = leader?.points[leader.points.length - 1];
  if (!leader || !last) return null;
  return {
    leftPct: ((isoTime(last.date) - t0) / span) * 100,
    topPct: (model.y(last.avg) / H) * 100,
    name: leader.name,
    value: last.avg,
    color: leader.color,
    date: last.date,
  };
}

function pct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

export interface HeroChartProps {
  /** The presidential average. `null` renders nothing — the hero copes. */
  average: RaceAverage | null;
  /** Hard cap on drawn areas. Default 6, per the hero spec. */
  maxSeries?: number;
  className?: string;
  /**
   * FRAMED mode (2026-08-17 redesign). Draws the 50% line inside the plot.
   * The old note below explains why the line was REMOVED from the full-bleed
   * hero: unlabelled, over a full-bleed backdrop, near the scrimmed top, it read
   * as a section divider. The redesign puts the chart inside a bordered card
   * with an axis and an HTML "50%" label beside the line (see Hero), so the
   * objection no longer holds and the brief (§4) asks for it back. Off by
   * default, so the full-bleed usage — if any survives — is unchanged.
   */
  framed?: boolean;
}

export default function HeroChart({ average, maxSeries = 6, className, framed = false }: HeroChartProps) {
  const model = heroChartModel(average, maxSeries);
  if (!model) return null;

  const { painted, y, from, to, flat, yMax } = model;
  const marker = framed ? heroLastMarker(model) : null;
  const top = model.series.slice(0, 3).map((s) => `${s.name} ${pct(s.avg)}`).join(", ");
  const period =
    flat || !from || !to
      ? from
        ? `com dados de ${fmtLong(from)}`
        : "sem série temporal"
      : `de ${fmtLong(from)} a ${fmtLong(to)}`;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className={`block h-full w-full ${className ?? ""}`}
      role="img"
      aria-label={`Gráfico de áreas sobrepostas com a evolução da média das pesquisas ${period}. Cada área começa em zero, então a altura é a porcentagem do candidato. Líderes: ${top}. Os números completos de cada candidato acompanham o título desta seção.`}
    >
      {/* NO 50% THRESHOLD LINE. It was drawn here and removed after looking at
          it: the hero SVG carries no text by design, so an unlabelled dashed
          rule across the full bleed reads as a section divider rather than as
          the 50% mark, and it lands near the top of the box where the scrim
          half-erases it anyway. The distance to 50% is stated twice in words
          above — badge and sentence — which is where it belongs. */}

      {/* One vertical gradient per area, in USER SPACE from that series' own peak
          down to the baseline. Flat fills were the first attempt and they mud:
          six overlapping areas at 16% stack to ~65% along the baseline, which
          printed a grey bar across the bottom of the hero. Fading each area out
          as it approaches zero keeps the accumulation near the baseline at a few
          percent while the informative part — the top edge — keeps its colour.
          `userSpaceOnUse` rather than the default bounding box because a
          zero-height area (a candidate on 0,0%) has a degenerate bbox and would
          not paint at all; in user space that same case is defined behaviour. */}
      <defs>
        {painted.map((p) =>
          p.kind !== "area" ? null : (
            <linearGradient
              key={p.s.key}
              id={p.gradientId}
              gradientUnits="userSpaceOnUse"
              x1={0}
              x2={0}
              y1={p.gradientTop}
              y2={co(y(0))}
            >
              <stop offset="0%" stopColor={p.s.color} stopOpacity={0.34} />
              <stop offset="100%" stopColor={p.s.color} stopOpacity={0.03} />
            </linearGradient>
          ),
        )}
      </defs>

      {/* FRAMED y-gridlines at 0/20/40/60 (≤ yMax): the target chart reads as a
          gridded trend, not a filled backdrop. Labels are HTML in Hero. */}
      {framed &&
        [0, 20, 40, 60, 80, 100]
          .filter((v) => v <= yMax)
          .map((v) => (
            <line
              key={`grid-${v}`}
              x1={0}
              x2={W}
              y1={co(y(v))}
              y2={co(y(v))}
              stroke="var(--grid)"
              strokeWidth={1}
              vectorEffect="non-scaling-stroke"
            />
          ))}

      {painted.map((p) =>
        p.kind === "area" ? (
          <g key={p.s.key}>
            {/* Area fill only in the legacy full-bleed backdrop; the framed hero
                draws thin LINES over the gridlines, matching the target. */}
            {!framed && <path d={p.area} fill={`url(#${p.gradientId})`} stroke="none" />}
            <path
              d={p.line}
              fill="none"
              stroke={p.s.color}
              strokeWidth={framed ? 1.75 : 2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={framed ? 1 : 0.9}
              vectorEffect="non-scaling-stroke"
            />
          </g>
        ) : (
          /* A zero-length subpath with a round cap: a dot that stays a circle
             under `preserveAspectRatio="none"`, which a <circle> would not. */
          <path
            key={p.s.key}
            d={`M${p.cx},${p.cy} L${p.cx},${p.cy}`}
            fill="none"
            stroke={p.s.color}
            strokeWidth={7}
            strokeLinecap="round"
            vectorEffect="non-scaling-stroke"
          />
        ),
      )}

      {/* Baseline. Zero is a real value here and the areas sit on it. */}
      <line
        x1={0}
        x2={W}
        y1={co(y(0))}
        y2={co(y(0))}
        stroke="var(--grid)"
        strokeWidth={1}
        vectorEffect="non-scaling-stroke"
      />

      {/* FRAMED extras — see the `framed` prop note. The 50% line only exists
          when 50 is on the drawn scale; below that it would sit off the top. */}
      {framed && yMax >= 50 && (
        <line
          x1={0}
          x2={W}
          y1={co(y(50))}
          y2={co(y(50))}
          stroke="var(--axis)"
          strokeWidth={1}
          strokeDasharray="4 4"
          vectorEffect="non-scaling-stroke"
        />
      )}
      {framed && marker && (
        <path
          d={`M${co((marker.leftPct / 100) * W)},${co((marker.topPct / 100) * H)} L${co((marker.leftPct / 100) * W)},${co((marker.topPct / 100) * H)}`}
          fill="none"
          stroke={marker.color}
          strokeWidth={8}
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
      )}
    </svg>
  );
}
