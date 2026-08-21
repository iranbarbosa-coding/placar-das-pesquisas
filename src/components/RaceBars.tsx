"use client";

import { candKey } from "@/lib/average";
import { colorMap, colorOf, PALETTE_SIZE } from "@/lib/colors";
import { fmtPct } from "@/lib/format";
import { displayName } from "@/lib/names";
import type { RaceAverage } from "@/lib/types";

/**
 * The first-round average as one horizontal bar per registered candidate — the
 * client, hover-aware counterpart of the server `PresidentBars`. Given an
 * `average` (already the chosen basis) and an `atDate`, it reads each candidate's
 * value at that date (carry-forward on their own trend) so a sibling evolution
 * chart's hover moves these numbers in lockstep; with `atDate = null` it shows
 * the current averages.
 *
 * Naming follows the rest of the site: significant (≥5% válidos) candidates get
 * their fixed colour, registered sub-5% (≥1%) draw grey, and everyone else folds
 * into "Outros" (plus a Brancos/Nulos/NR bar on the bruto cut). The axis runs
 * 0–60 with the dashed 50% first-round-win marker, matching `PresidentBars`.
 */

const AXIS_MAX = 60;

type Pt = { date: string; avg: number };

function cleanTrend(trend: Pt[] | undefined): Pt[] {
  return (Array.isArray(trend) ? trend : [])
    .filter((p): p is Pt => !!p && typeof p.date === "string" && Number.isFinite(p.avg))
    .slice()
    .sort((a, b) => (a.date < b.date ? -1 : 1));
}

/** Carry-forward value at `date` (last point at or before it), or `fallback`. */
function valueAt(points: Pt[], date: string | null, fallback: number): number {
  if (date == null || !points.length) return fallback;
  let v = points[0].avg;
  for (const p of points) {
    if (p.date <= date) v = p.avg;
    else break;
  }
  return v;
}

interface BarRow {
  key: string;
  name: string;
  party: string | null;
  color: string;
  value: number;
}

export interface RaceBarsProps {
  average: RaceAverage | null;
  /** `candKey`s coloured in their own hue (≥5% válidos); the rest draw grey. */
  significantKeys: string[];
  /** `candKey`s allowed to be named; [] = no filter (governor/senate). */
  registeredKeys?: string[];
  /** Read values at this ISO date; null = current averages. */
  atDate?: string | null;
  /** Show the aggregate "Outros" bar. */
  showOutros?: boolean;
  /** Single-vote reconciliation: "Outros" fills the remainder to 100. Pass false
   *  for a 2-vote ballot (Senate), where shares don't sum to 100 and "Outros" is
   *  simply the sum of the candidates not drawn individually. */
  reconcileTo100?: boolean;
  /** Narrower name/value columns for tight half-width panels, so the bar keeps a
   *  usable width instead of being squeezed to a sliver. */
  compact?: boolean;
}

export default function RaceBars({ average, significantKeys, registeredKeys = [], atDate = null, showOutros = true, reconcileTo100 = true, compact = false }: RaceBarsProps) {
  if (!average || !average.candidates.length) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Ainda não há pesquisas suficientes para uma média.
      </p>
    );
  }

  const sigSet = new Set(significantKeys);
  const regSet = new Set(registeredKeys);
  const filterReg = regSet.size > 0;
  const validos = average.basis === "validos";
  const cands = average.candidates;
  const cmap = colorMap(cands.slice(0, PALETTE_SIZE).map((c) => c.candidate));

  const displayable = (c: { candidate: string }) => !filterReg || regSet.has(candKey(c.candidate));
  const isSig = (c: { candidate: string }) => displayable(c) && sigSet.has(candKey(c.candidate));
  const val = (c: { avg: number; trend: Pt[] }) => valueAt(cleanTrend(c.trend), atDate, c.avg);

  // Individual bars for the "principais" only (registered ≥ threshold, in
  // `significantKeys`); everyone below folds into "Outros". All shown bars are
  // significant, so each takes its own fixed colour.
  const shownCands = cands.filter((c) => isSig(c));
  const rows: BarRow[] = shownCands
    .map((c) => ({
      key: candKey(c.candidate),
      name: displayName(c.candidate),
      party: c.party,
      color: colorOf(cmap, c.candidate),
      value: val(c),
    }))
    .sort((a, b) => b.value - a.value);

  // "Outros": single-vote válidos → the remainder to 100; a 2-vote ballot (Senate,
  // reconcileTo100=false) → the sum of the registered candidates below the bar
  // threshold (not the meaningless full non-shown mass); bruto → the non-shown
  // candidate share, with a separate Brancos/Nulos/NR bar for the rest.
  const shownSum = rows.reduce((s, r) => s + r.value, 0);
  const allSum = cands.reduce((s, c) => s + val(c), 0);
  const foldedNamedSum = cands.filter((c) => displayable(c) && !isSig(c)).reduce((s, c) => s + val(c), 0);
  // Senate (reconcileTo100=false) keys off the ballot type, NOT the basis: its
  // "Outros" is only the folded REGISTERED field (never the full 2-vote mass).
  // Single-vote válidos → remainder to 100; bruto → non-shown share + a
  // Brancos/Nulos/NR bar.
  const outros = Math.max(0, !reconcileTo100 ? foldedNamedSum : validos ? 100 - shownSum : allSum - shownSum);
  const bn = !reconcileTo100 || validos ? null : Math.max(0, 100 - allSum);

  const bars: BarRow[] = [...rows];
  if (showOutros && outros > 0.05) bars.push({ key: "__outros", name: "Outros", party: null, color: "var(--series-muted)", value: outros });
  if (bn != null && bn > 0.05) bars.push({ key: "__bn", name: "Brancos/Nulos/NR", party: null, color: "var(--text-muted)", value: bn });

  return (
    <ul className="flex flex-col gap-2.5">
      {bars.map((b) => {
        const width = Math.max(0, Math.min(100, (b.value / AXIS_MAX) * 100));
        const name = (
          <div className="flex min-w-0 items-baseline gap-1">
            <span className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }} title={b.party ? `${b.name} (${b.party})` : b.name}>
              {b.name}
            </span>
            {b.party ? (
              <span className="shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
                ({b.party})
              </span>
            ) : null}
          </div>
        );
        const pct = (
          <div className="tabular shrink-0 text-right text-base font-bold leading-none" style={{ color: "var(--text-primary)" }}>
            {fmtPct(b.value)}
            <span className="align-baseline text-[0.6em] font-bold">%</span>
          </div>
        );
        const bar = (
          <div className={`relative min-w-0 rounded ${compact ? "h-2.5" : "h-5"}`} style={{ background: "var(--surface-2)" }}>
            <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${width}%`, background: b.color }} />
          </div>
        );
        // Narrow panels stack the name above a full-width bar; wide panels lay the
        // name, bar and value out on one row.
        if (compact) {
          return (
            <li key={b.key} className="flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                {name}
                {pct}
              </div>
              {bar}
            </li>
          );
        }
        return (
          <li key={b.key} className="grid grid-cols-[7rem_minmax(0,1fr)_3.5rem] items-center gap-x-2 sm:grid-cols-[8.5rem_minmax(0,1fr)_3.5rem]">
            {name}
            {bar}
            {pct}
          </li>
        );
      })}
    </ul>
  );
}
