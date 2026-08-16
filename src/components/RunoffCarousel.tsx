"use client";

import { type KeyboardEvent, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { colorMap, PALETTE } from "@/lib/colors";
import { candKey } from "@/lib/average";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { Headline } from "@/lib/home";
import type { CandidateAverage, RaceAverage } from "@/lib/types";

/**
 * The homepage runoff carousel: one donut card per second-round pairing the
 * institutes actually tested, scrolling horizontally.
 *
 * ── THE DONUT IS A PIE, SO THE WHOLE IS NAMED ─────────────────────────────
 * A ring reads as parts of a whole whether or not anyone says what the whole
 * is, so this card says it three times over: inside the ring ("100,0% —
 * válidos"), in the caption under it, and in the screen-reader label. Nothing
 * here is normalized: each candidate's arc is their own number over that named
 * base, and whatever the listed candidates do NOT account for is drawn as a
 * neutral "não atribuído" arc rather than quietly rescaled away. On today's
 * data that arc is empty — the runoff pairings are two candidates on votos
 * válidos and they sum to exactly 100,0 — but a card that only works while the
 * numbers happen to sum to 100 is a card that lies the first time they don't.
 *
 * Branco/nulo and NS/NR are NOT drawn as a slice. They are not candidates and,
 * on the válidos cut, they are not in this denominator at all — they were
 * removed upstream by the basis conversion. Drawing them inside the same ring
 * would put two different denominators in one circle. They are reported as
 * text, from `average.setAside`, which is the honest place for them.
 *
 * ── WHY THERE IS NO `shortName` IMPORT ────────────────────────────────────
 * `@/lib/home` re-exports through `@/lib/data` → `@/lib/store` → `node:fs`, so
 * a VALUE import from it drags the filesystem across the client boundary and
 * kills the build (see the note at the top of `lib/format.ts`). The `Headline`
 * import below is `import type`, which is erased before bundling. Badges
 * therefore carry the leader's name as stored, truncated by CSS — the same
 * trade `RaceBadge` and `RaceTable` make with their own local helpers.
 */

// ── props ─────────────────────────────────────────────────────────────────

/** Exactly one element of `runoffCards()` — the parent loads, this renders. */
export interface RunoffCardData {
  /** Scenario label as grouped, e.g. `2º turno: Lula vs Ronaldo Caiado`. */
  scenario: string;
  average: RaceAverage;
  headline: Headline;
}

export interface RunoffCarouselProps {
  /**
   * The cards, in the order `runoffCards()` returned them. Rendered as given:
   * this component never reorders, never pads to five, and never drops one.
   */
  cards: RunoffCardData[];
  /** Optional heading rendered above the row. Omitted → the page owns the heading. */
  title?: string;
  className?: string;
}

// ── ring geometry ─────────────────────────────────────────────────────────
const VB = 120; // viewBox side
const CX = VB / 2;
const R = 44; // ring radius
const SW = 18; // ring thickness
/** Circumference — every arc length is a fraction of this, never an arc path. */
const RING_C = 2 * Math.PI * R;
/** Below this, a remainder is rounding noise: absorbed into the base, not drawn. */
const REMAINDER_MIN = 0.05;

export interface RingArc {
  /** Dash length along the circumference. Always finite, always in [0, RING_C]. */
  len: number;
  /** Distance from 12 o'clock to the arc's start, along the circumference. */
  start: number;
  /** The arc closes the circle — drawn as a plain stroked circle, no dashes. */
  full: boolean;
}

export interface RingMath {
  arcs: RingArc[];
  /** The denominator the arcs are drawn against, in percentage points. */
  whole: number;
  /** What the listed values add up to. */
  sum: number;
  /** `whole − sum`: drawn neutral when ≥ REMAINDER_MIN, absorbed when below. */
  remainder: number;
  remainderArc: RingArc | null;
}

/**
 * Values → arc lengths, with every degenerate case answered before the maths.
 *
 * No `A` arc commands anywhere: a 100% slice is a 360° arc, and a 360° arc path
 * has identical start and end points, which renders as *nothing*. Dash offsets
 * along a circle have no such discontinuity — 0% draws nothing because its dash
 * is zero-length, 100% draws the whole ring, and neither can produce a NaN.
 *
 * Non-finite and negative inputs are floored to 0 (a NaN pct in, an empty slice
 * out — never a NaN in a `stroke-dasharray`). The denominator is `max(100, sum)`
 * so it can never be 0 and the arcs can never wrap past the circle.
 */
export function ringMath(values: readonly number[], circumference: number = RING_C): RingMath {
  const safe = values.map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
  const sum = safe.reduce((a, b) => a + b, 0);
  // Over-100 can only arrive from a basis this card should not be handed, but
  // it must not overflow the circle if it does: the base grows instead, and the
  // centre label reports that larger base rather than hiding it.
  const whole = Math.max(100, sum);
  const rawRemainder = whole - sum;
  const remainder = rawRemainder < REMAINDER_MIN ? 0 : rawRemainder;
  // Rounding dust (e.g. three thirds summing to 99,999) would otherwise leave a
  // hairline gap and a "0,0%" legend row; it is folded into the base instead.
  const base = remainder > 0 ? whole : sum > 0 ? sum : 100;

  const mk = (v: number, start: number): RingArc => {
    const len = Math.min(circumference, Math.max(0, (v / base) * circumference));
    return { len, start, full: len >= circumference - 1e-6 };
  };

  let acc = 0;
  const arcs = safe.map((v) => {
    const a = mk(v, acc);
    acc += a.len;
    return a;
  });
  return {
    arcs,
    whole: base,
    sum,
    remainder,
    remainderArc: remainder > 0 ? mk(remainder, acc) : null,
  };
}

// ── deterministic colour (same rule as AverageChart: hash, never position) ──
// Palette, hash and slot assignment live in `@/lib/colors` — see the note
// there on why probing makes the KEY SET part of the answer, and why three
// private copies of this could give one candidate two colours on one page.
const assignColors = (keys: string[]) => colorMap(keys);

/** The remainder slice: deliberately NOT from the palette. It is not a
 *  candidate, and giving it a candidate colour would say it were one. */
const NEUTRAL = "var(--grid)";

// ── text helpers ──────────────────────────────────────────────────────────
/** `53,5%` — and an em dash, never a fabricated `0,0%`, for an unusable number. */
function pct(v: number): string {
  return Number.isFinite(v) ? `${fmtPct(v)}%` : "—";
}

/** `2º turno: Lula vs Zema` → `Lula vs Zema`; anything else passes through. */
function matchupTitle(scenario: string): string {
  const m = scenario.match(/^\s*2\s*[ºo°]?\s*turno\s*[:—-]\s*(.+)$/i);
  return (m ? m[1] : scenario).trim() || scenario;
}

function baseWord(basis: RaceAverage["basis"]): string {
  return basis === "validos" ? "válidos" : "amostra";
}

function baseLabel(basis: RaceAverage["basis"]): string {
  return basis === "validos" ? "votos válidos" : "total da amostra";
}

/** The same base, in a sentence: `…% dos votos válidos` / `…% do total da amostra`. */
function baseOf(basis: RaceAverage["basis"]): string {
  return basis === "validos" ? "dos votos válidos" : "do total da amostra";
}

/** "14,4% entre branco, nulo e não sabe" — whatever the válidos cut removed. */
function setAsideLine(avg: RaceAverage): string | null {
  if (avg.basis !== "validos") return null;
  const { blankNull, undecided, combined } = avg.setAside;
  if (blankNull != null && undecided != null) {
    return `Fora dessa base: ${pct(blankNull)} branco/nulo e ${pct(undecided)} não sabe.`;
  }
  if (combined != null) {
    return `Fora dessa base: ${pct(combined)} entre branco, nulo e não sabe.`;
  }
  return null;
}

function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}

// ── one card ──────────────────────────────────────────────────────────────

interface Slice {
  key: string;
  name: string;
  value: number;
  color: string;
  leader: boolean;
}

function RunoffCard({ card }: { card: RunoffCardData }) {
  const { average, headline } = card;
  const title = matchupTitle(card.scenario);

  const slices = useMemo<Slice[]>(() => {
    const seen = new Set<string>();
    const picked: CandidateAverage[] = [];
    for (const c of average.candidates) {
      const k = candKey(c.candidate);
      if (seen.has(k)) continue; // a duplicated name would double-count the base
      seen.add(k);
      picked.push(c);
    }
    const colors = assignColors(picked.map((c) => candKey(c.candidate)));
    const leadKey = candKey(headline.leader);
    return picked.map((c) => {
      const k = candKey(c.candidate);
      return {
        key: k,
        name: c.candidate,
        // Carried raw: `ringMath` floors an unusable number to an empty arc,
        // and the legend prints "—" for it rather than inventing a 0,0%.
        value: c.avg,
        color: colors.get(k) ?? PALETTE[0],
        leader: k === leadKey,
      };
    });
  }, [average.candidates, headline.leader]);

  const ring = useMemo(() => ringMath(slices.map((s) => s.value)), [slices]);

  const legend = [
    ...slices.map((s) => ({ key: s.key, name: s.name, value: s.value, color: s.color, leader: s.leader })),
    ...(ring.remainderArc
      ? [{ key: "__resto", name: "não atribuído", value: ring.remainder, color: NEUTRAL, leader: false }]
      : []),
  ];

  const srNumbers = legend.map((l) => `${l.name} ${pct(l.value)}`).join(", ");
  const srLabel =
    `Rosca do cenário ${title}. Base: ${pct(ring.whole)} — ${baseLabel(average.basis)}. ${srNumbers}.`;
  const aside = setAsideLine(average);

  const arc = (a: RingArc, color: string, key: string) => {
    if (a.len <= 0) return null; // a 0% candidate draws nothing, not a NaN
    return (
      <circle
        key={key}
        cx={CX}
        cy={CX}
        r={R}
        fill="none"
        stroke={color}
        strokeWidth={SW}
        // A full ring gets no dash pattern at all: `dasharray="C 0"` is legal
        // but leaves engines to interpret a zero-length gap. This does not.
        strokeDasharray={a.full ? undefined : `${a.len.toFixed(3)} ${(RING_C - a.len).toFixed(3)}`}
        strokeDashoffset={a.full ? undefined : (-a.start).toFixed(3)}
        transform={`rotate(-90 ${CX} ${CX})`}
      />
    );
  };

  return (
    <article
      className="card flex w-[min(78vw,17rem)] shrink-0 snap-start flex-col p-3.5"
      aria-label={`Cenário de segundo turno: ${title}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className="text-[11px] font-semibold uppercase tracking-wide"
          style={{ color: "var(--text-muted)" }}
        >
          2º turno
        </span>
        {/* The margin badge: leader | distance to 50%. The "de 50%" suffix is
            not decoration — RaceBadge shows a runoff's lead OVER THE RIVAL in
            the same shape, and without the suffix the two identical-looking
            numbers (here half the size of there) would be read as the same
            claim. */}
        <span
          className="inline-flex shrink-0 items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
          style={{ border: "1px solid var(--ring)", background: "var(--page)" }}
          title={`${headline.leader}: distância dos 50% dos votos válidos.`}
        >
          <span className="max-w-[6.5rem] truncate font-semibold">{headline.leader}</span>
          <span aria-hidden="true" style={{ color: "var(--grid)" }}>
            |
          </span>
          <span className="tabular font-semibold">{fmtSigned(headline.toFifty)}</span>
          <span className="text-[10px]" style={{ color: "var(--text-muted)" }}>
            de 50%
          </span>
        </span>
      </div>

      <h3 className="mt-1 text-sm font-semibold leading-snug">{title}</h3>

      <div className="mt-2 flex justify-center">
        <svg
          viewBox={`0 0 ${VB} ${VB}`}
          className="block h-[7rem] w-[7rem]"
          role="img"
          aria-label={srLabel}
        >
          {/* The track IS the whole: whatever the arcs leave uncovered is
              visible as track rather than as an implied zero. */}
          <circle cx={CX} cy={CX} r={R} fill="none" stroke="var(--grid)" strokeWidth={SW} />
          {slices.map((s, i) => arc(ring.arcs[i], s.color, s.key))}
          {ring.remainderArc ? arc(ring.remainderArc, NEUTRAL, "__resto") : null}
          <text
            x={CX}
            y={CX - 1}
            textAnchor="middle"
            fontSize={17}
            fontWeight={700}
            fill="var(--text-primary)"
            className="tabular"
          >
            {pct(ring.whole)}
          </text>
          <text x={CX} y={CX + 13} textAnchor="middle" fontSize={9.5} fill="var(--text-muted)">
            {baseWord(average.basis)}
          </text>
        </svg>
      </div>

      <ul className="mt-2 space-y-1">
        {legend.map((l) => (
          <li key={l.key} className="flex items-center gap-1.5 text-xs">
            <span
              aria-hidden="true"
              className="h-2.5 w-2.5 shrink-0 rounded-full"
              style={{ background: l.color }}
            />
            <span
              className="truncate"
              style={{
                color: l.key === "__resto" ? "var(--text-muted)" : "var(--text-secondary)",
                fontWeight: l.leader ? 700 : 400,
              }}
              title={l.key === "__resto" ? "O que a base não distribui entre os candidatos listados." : l.name}
            >
              {l.name}
            </span>
            <span className="tabular ml-auto shrink-0 pl-1 font-semibold">{pct(l.value)}</span>
          </li>
        ))}
      </ul>

      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        A rosca inteira = {pct(ring.whole)} {baseOf(average.basis)}.
        {aside ? ` ${aside}` : ""}
      </p>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        {average.pollCount} pesquisa{average.pollCount === 1 ? "" : "s"} · última em{" "}
        {fmtDate(average.lastPollDate)}
      </p>
    </article>
  );
}

// ── the carousel ──────────────────────────────────────────────────────────

interface Metrics {
  atStart: boolean;
  atEnd: boolean;
  /** Scrolled fraction of the full track, for the indicator's left edge. */
  left: number;
  /** Visible fraction of the full track, for the indicator's width. */
  frac: number;
  index: number;
}

/** Gap between cards, in px. Must match the `gap-3` class on the scroller. */
const GAP = 12;

export default function RunoffCarousel({ cards, title, className }: RunoffCarouselProps) {
  const scroller = useRef<HTMLDivElement>(null);
  const count = cards.length;
  // SSR and the first client render agree on this; the observer corrects it a
  // frame later. `atEnd` starts true when there is provably nothing to scroll.
  const [m, setM] = useState<Metrics>({ atStart: true, atEnd: count <= 1, left: 0, frac: 1, index: 0 });

  const stepOf = useCallback((el: HTMLDivElement): number => {
    const first = el.firstElementChild;
    const w = first instanceof HTMLElement ? first.getBoundingClientRect().width : 0;
    const step = w > 0 ? w + GAP : el.clientWidth * 0.9;
    return step > 0 ? step : 1; // never a 0 divisor, never a 0 scroll
  }, []);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    const { scrollLeft, scrollWidth, clientWidth } = el;
    const max = Math.max(0, scrollWidth - clientWidth);
    const step = stepOf(el);
    setM({
      atStart: scrollLeft <= 1,
      atEnd: scrollLeft >= max - 1,
      left: scrollWidth > 0 ? clamp(scrollLeft / scrollWidth, 0, 1) : 0,
      frac: scrollWidth > 0 ? clamp(clientWidth / scrollWidth, 0.06, 1) : 1,
      index: clamp(Math.round(scrollLeft / step), 0, Math.max(0, count - 1)),
    });
  }, [count, stepOf]);

  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    measure();
    el.addEventListener("scroll", measure, { passive: true });
    let ro: ResizeObserver | null = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(measure);
      ro.observe(el);
      // Card widths are viewport-relative, so the track resizes without the
      // scroller's own box changing on some layouts.
      if (el.firstElementChild) ro.observe(el.firstElementChild);
    }
    window.addEventListener("resize", measure);
    return () => {
      el.removeEventListener("scroll", measure);
      ro?.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  const behavior = (): ScrollBehavior =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
      ? "auto"
      : "smooth";

  const page = useCallback(
    (dir: -1 | 1) => {
      const el = scroller.current;
      if (!el) return;
      el.scrollBy({ left: dir * stepOf(el), behavior: behavior() });
    },
    [stepOf],
  );

  const toEdge = useCallback((edge: "start" | "end") => {
    const el = scroller.current;
    if (!el) return;
    const max = Math.max(0, el.scrollWidth - el.clientWidth);
    el.scrollTo({ left: edge === "start" ? 0 : max, behavior: behavior() });
  }, []);

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      page(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      page(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      toEdge("start");
    } else if (e.key === "End") {
      e.preventDefault();
      toEdge("end");
    }
  };

  if (count === 0) {
    return (
      <section className={className}>
        {title && <h2 className="mb-2 text-base font-semibold">{title}</h2>}
        <p className="card p-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Nenhum cenário de segundo turno com pesquisas suficientes para uma média.
        </p>
      </section>
    );
  }

  const btn = "rounded-md border px-2 py-1 transition-colors";
  const btnStyle = (off: boolean) => ({
    borderColor: "var(--ring)",
    background: "var(--surface-1)",
    color: off ? "var(--text-muted)" : "var(--text-secondary)",
    opacity: off ? 0.45 : 1,
    cursor: off ? "default" : "pointer",
  });

  return (
    <section className={className}>
      {title && <h2 className="mb-2 text-base font-semibold">{title}</h2>}

      <div
        ref={scroller}
        tabIndex={0}
        role="region"
        aria-label="Cenários de segundo turno. Role para o lado ou use as setas esquerda e direita."
        onKeyDown={onKeyDown}
        className="flex snap-x snap-mandatory gap-3 overflow-x-auto rounded-md pb-2 outline-2 outline-offset-2 outline-transparent focus-visible:outline-[var(--accent)]"
        style={{ scrollbarWidth: "thin", overscrollBehaviorX: "contain", touchAction: "pan-x pan-y" }}
      >
        {cards.map((c) => (
          <RunoffCard key={c.scenario} card={c} />
        ))}
      </div>

      <div className="mt-2 flex items-center gap-2">
        <button
          type="button"
          className={btn}
          style={btnStyle(m.atStart)}
          onClick={() => page(-1)}
          disabled={m.atStart}
          aria-label="Ver cenários anteriores"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M10 2 L4 8 L10 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
        <button
          type="button"
          className={btn}
          style={btnStyle(m.atEnd)}
          onClick={() => page(1)}
          disabled={m.atEnd}
          aria-label="Ver próximos cenários"
        >
          <svg viewBox="0 0 16 16" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M6 2 L12 8 L6 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          className="relative h-1 flex-1 overflow-hidden rounded-full"
          style={{ background: "var(--grid)" }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 rounded-full"
            style={{
              background: "var(--accent)",
              left: `${m.left * 100}%`,
              width: `${m.frac * 100}%`,
              transition: "left 120ms linear, width 120ms linear",
            }}
          />
        </div>

        <span className="tabular shrink-0 text-xs" style={{ color: "var(--text-muted)" }} aria-hidden="true">
          {m.index + 1}/{count}
        </span>
        <span className="sr-only" aria-live="polite">
          Cenário {m.index + 1} de {count}: {matchupTitle(cards[clamp(m.index, 0, count - 1)].scenario)}
        </span>
      </div>
    </section>
  );
}
