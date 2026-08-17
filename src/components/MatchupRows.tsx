import Link from "next/link";
import { dualColor } from "@/lib/colors";
import { fmtDate, fmtPct } from "@/lib/format";
import type { RaceAverage, UF } from "@/lib/types";

/**
 * The "Maiores colégios eleitorais" grid: the five largest electorates, each a
 * small card with the leader, runner-up and "Outros" as CLEAN horizontal bars.
 *
 * Server component — nothing here is interactive. Data arrives as a prop
 * (`matchupRows()` output); this file loads nothing and decides nothing about
 * which states appear.
 *
 * ── The bars carry no text (2026-08-17, owner's directive) ──────────────────
 * This REVERSES the previously ratified "names inside the bar" design that lived
 * here — the double-painted `NameLayer` (one glyph layer on the track, one
 * clipped to the fill), the `PhotoSlot`, and the big right-hand number column
 * are all gone at the owner's explicit request. The redesign mockup wants each
 * row as a plain line — candidate name + (party) on the left, the % bold on the
 * right — with a THIN full-width bar directly below it, filled to the
 * candidate's share of the track. Nothing is drawn inside the bar, so there is
 * no contrast problem to solve and no name to abbreviate.
 *
 * ── The fill is the DUAL PALETTE, by rank ───────────────────────────────────
 * Leader blue, runner-up red, "Outros" grey — `dualColor(rank, "blue")`, the
 * same two-tone the presidential hero and the runoff bars use. The bar is now a
 * pure magnitude cue beside the name that labels it, so colouring by rank (not
 * by candidate) is the honest choice here: the name is right there in text.
 *
 * ── On the arithmetic ───────────────────────────────────────────────────────
 * The three bars are NOT parts of a whole and are deliberately never stacked.
 * A first-round average pools polls whose candidate lists differ, so the
 * per-candidate averages of one state can sum past 100 (São Paulo sums to
 * 111,8 today). Each bar is drawn on an absolute percentage-point scale — the
 * track is 100 points wide, widened only if some value exceeds 100 — so no bar
 * overflows its track and the 50% dashed marker sits at a comparable place.
 *
 * ── The state flags are a placeholder ───────────────────────────────────────
 * Brazilian state flags are not emoji, and none are bundled yet, so a small
 * neutral chip stands in to the left of each name. It drops out for a real
 * per-state image the moment one is supplied (see `FlagChip`).
 */

export interface MatchupBar {
  label: string;
  party: string | null;
  pct: number;
  kind: "leader" | "runner" | "others";
}

export interface MatchupRow {
  uf: UF;
  name: string;
  average: RaceAverage | null;
  /** Empty exactly when the state has no governor average yet. */
  bars: MatchupBar[];
  /** Electorate in millions (TSE 2022), for the card subtitle. */
  eleitoresMi?: number | null;
  /** The leader's rolling-average change over 30 days. */
  leaderDelta30?: number | null;
}

export default function MatchupRows({
  rows,
  title = "Maiores colégios eleitorais",
  className = "",
}: {
  rows: MatchupRow[];
  title?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby="matchup-rows-title" className={className}>
      <div className="flex items-baseline justify-between gap-3">
        <h2
          id="matchup-rows-title"
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: "var(--text-secondary)" }}
        >
          {title}
        </h2>
        <Link
          href="/estados"
          className="shrink-0 text-sm font-semibold"
          style={{ color: "var(--accent)" }}
        >
          Ver todos os estados <span aria-hidden="true">→</span>
        </Link>
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Governador · 1º turno · do maior eleitorado para o menor (ordem conforme o eleitorado de 2022).
      </p>

      <ol className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">
        {rows.map((row) => (
          <li
            key={row.uf}
            className="flex flex-col rounded-lg border p-3"
            style={{ background: "var(--surface-2)", borderColor: "var(--ring)" }}
          >
            <div className="flex items-center gap-1.5">
              <FlagChip />
              <h3 className="min-w-0 flex-1 truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                <Link href={`/estados/${row.uf.toLowerCase()}`} className="hover:underline">
                  {row.name}
                </Link>
              </h3>
              <span
                className="tabular shrink-0 rounded px-1.5 text-[10px] font-bold"
                style={{ background: "var(--grid)", color: "var(--text-secondary)" }}
              >
                {row.uf}
              </span>
            </div>
            {row.eleitoresMi != null && (
              <p className="tabular mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                {fmtPct(row.eleitoresMi)} milhões de eleitores
              </p>
            )}

            {row.bars.length === 0 || !row.average ? (
              <p className="mt-3 text-sm italic" style={{ color: "var(--text-muted)" }}>
                Sem média de governador registrada.
              </p>
            ) : (
              <>
                <Bars bars={row.bars} />
                <div className="mt-3 space-y-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                  <p>A linha tracejada marca 50%.</p>
                  <p className="tabular">
                    {row.average.pollCount} pesquisa{row.average.pollCount === 1 ? "" : "s"} · última em {fmtDate(row.average.lastPollDate)}
                  </p>
                  {row.leaderDelta30 != null && Math.abs(row.leaderDelta30) >= 0.1 && (
                    <p
                      className="tabular font-semibold"
                      style={{ color: row.leaderDelta30 > 0 ? "var(--series-3)" : "var(--cand-red)" }}
                    >
                      {row.leaderDelta30 > 0 ? "▲" : "▼"} {fmtPct(Math.abs(row.leaderDelta30))} p.p. em 30 dias
                    </p>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Rank order is the order given: leader, runner-up, Outros. Hence `<ol>`. */
function Bars({ bars }: { bars: MatchupBar[] }) {
  const scale = trackScale(bars);
  return (
    <ol className="mt-3 space-y-2">
      {bars.map((bar, i) => (
        <li key={`${bar.kind}-${bar.label}-${i}`}>
          <Bar bar={bar} scale={scale} />
        </li>
      ))}
    </ol>
  );
}

function Bar({ bar, scale }: { bar: MatchupBar; scale: number }) {
  const width = barWidth(bar.pct, scale);
  const fiftyLeft = barWidth(50, scale);
  const isLeader = bar.kind === "leader";
  const isOthers = bar.kind === "others";
  // Dual palette, by rank: leader blue, runner-up red, aggregate grey. The name
  // beside the bar labels it, so colour is free to encode rank here.
  const fill = isLeader
    ? dualColor(0, "blue")
    : isOthers
      ? "var(--series-muted)"
      : dualColor(1, "blue");

  return (
    <div>
      {/* The row's real text: name + party on the left, % bold on the right.
          The bar below is `aria-hidden`, so this line is what a reader gets. */}
      <div className="flex items-baseline justify-between gap-2 text-[11px]">
        <span
          className="min-w-0 truncate"
          style={{ color: "var(--text-secondary)", fontWeight: isLeader ? 600 : 400 }}
        >
          {bar.label}
          {bar.party && (
            <span style={{ color: "var(--text-muted)" }}> ({bar.party})</span>
          )}
        </span>
        <span
          className="tabular shrink-0 font-bold"
          style={{ color: isOthers ? "var(--text-muted)" : "var(--text-primary)" }}
        >
          {fmtPct(bar.pct).replace("-", "−")}%
        </span>
      </div>

      <div
        className="relative mt-1 h-2 overflow-hidden rounded-full"
        style={{ background: "var(--grid)" }}
        aria-hidden="true"
      >
        <div
          className="absolute inset-y-0 left-0 rounded-full"
          style={{ width: `${width}%`, background: fill }}
        />
        {/* 50 points, in track coordinates. */}
        <div
          className="absolute inset-y-0 w-0 border-l border-dashed"
          style={{ left: `${fiftyLeft}%`, borderColor: "var(--text-muted)" }}
        />
      </div>
    </div>
  );
}

/**
 * A stand-in for the state flag, to the left of the name. Brazilian state flags
 * are not emoji and none are bundled, so this is a small neutral chip — a
 * placeholder, not a claim. Decorative: the state is named in text beside it.
 * Swap this for an <img> under /public the moment real flag assets exist.
 */
function FlagChip() {
  return (
    <span
      aria-hidden="true"
      className="inline-block h-3.5 w-5 shrink-0 rounded-[3px] border"
      style={{ background: "var(--surface-1)", borderColor: "var(--ring)" }}
    />
  );
}

/**
 * Track width in percentage points. 100 unless some value is larger, which
 * keeps every bar inside its track no matter what is passed in.
 */
function trackScale(bars: MatchupBar[]): number {
  const finite = bars.map((b) => b.pct).filter((p) => Number.isFinite(p));
  return Math.max(100, ...finite);
}

/** Clamped to [0, 100] of the track. Never negative, never overflowing. */
function barWidth(pct: number, scale: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 100;
  return Math.min(100, (pct / safeScale) * 100);
}
