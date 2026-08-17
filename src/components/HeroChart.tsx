import { candKey } from "@/lib/average";
import { colorMap, colorOf, hashName, PALETTE_SIZE } from "@/lib/colors";
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

// Palette, hash and slot assignment live in `@/lib/colors` — see the note
// there on why probing makes the KEY SET part of the answer, and why three
// private copies of this could give one candidate two colours on one page.
const assignColors = (keys: string[]) => colorMap(keys);

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
  const seen = new Set<string>();
  const uniq: CandidateAverage[] = [];
  for (const c of average.candidates) {
    const k = candKey(c.candidate);
    if (seen.has(k)) continue;
    seen.add(k);
    uniq.push(c);
  }
  const colors = assignColors(uniq.slice(0, PALETTE_SIZE).map((c) => candKey(c.candidate)));
  return uniq.slice(0, Math.max(1, maxSeries)).map((c) => {
    const k = candKey(c.candidate);
    const pts = (Array.isArray(c.trend) ? c.trend : [])
      .filter((p) => typeof p?.date === "string" && p.date.length >= 7 && Number.isFinite(p.avg))
      .map((p) => ({ date: p.date, avg: fin(p.avg) }));
    return {
      key: k,
      name: c.candidate,
      avg: fin(c.avg),
      color: colorOf(colors, c.candidate),
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

function fmtLong(iso: string): string {
  const [y, m, d] = iso.split("-");
  const mes = MES[Number(m) - 1];
  return mes ? `${Number(d)} de ${mes} de ${y}` : iso;
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
}

export default function HeroChart({ average, maxSeries = 6, className }: HeroChartProps) {
  const model = heroChartModel(average, maxSeries);
  if (!model) return null;

  const { painted, y, from, to, flat } = model;
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

      {painted.map((p) =>
        p.kind === "area" ? (
          <g key={p.s.key}>
            <path d={p.area} fill={`url(#${p.gradientId})`} stroke="none" />
            <path
              d={p.line}
              fill="none"
              stroke={p.s.color}
              strokeWidth={2}
              strokeLinejoin="round"
              strokeLinecap="round"
              opacity={0.9}
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
    </svg>
  );
}
