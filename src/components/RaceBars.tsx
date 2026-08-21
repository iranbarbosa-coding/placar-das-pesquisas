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
const FIFTY_LEFT = (50 / AXIS_MAX) * 100;
/** Registered candidates below this fold into "Outros" instead of their own bar. */
const BAR_MIN = 1;

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
  /** Show the aggregate "Outros" bar. Pass false for the Senate (2-vote ballot). */
  showOutros?: boolean;
}

export default function RaceBars({ average, significantKeys, registeredKeys = [], atDate = null, showOutros = true }: RaceBarsProps) {
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

  // Coloured significant candidates + registered sub-5% (≥1%) drawn grey.
  const named = cands.filter((c) => displayable(c) && (isSig(c) || c.avg >= BAR_MIN));
  const rows: BarRow[] = named
    .map((c) => ({
      key: candKey(c.candidate),
      name: displayName(c.candidate),
      party: c.party,
      color: isSig(c) ? colorOf(cmap, c.candidate) : "var(--series-muted)",
      value: val(c),
    }))
    .sort((a, b) => b.value - a.value);

  // "Outros" is the remainder to 100 on válidos; on bruto it is the non-named
  // candidate share, and a separate Brancos/Nulos/NR bar takes the rest.
  const namedSum = rows.reduce((s, r) => s + r.value, 0);
  const allSum = cands.reduce((s, c) => s + val(c), 0);
  const outros = Math.max(0, validos ? 100 - namedSum : allSum - namedSum);
  const bn = validos ? null : Math.max(0, 100 - allSum);

  const bars: BarRow[] = [...rows];
  if (showOutros && outros > 0.05) bars.push({ key: "__outros", name: "Outros", party: null, color: "var(--series-muted)", value: outros });
  if (bn != null && bn > 0.05) bars.push({ key: "__bn", name: "Brancos/Nulos/NR", party: null, color: "var(--text-muted)", value: bn });

  return (
    <ul className="flex flex-col gap-2.5">
      {bars.map((b) => {
        const width = Math.max(0, Math.min(100, (b.value / AXIS_MAX) * 100));
        return (
          <li key={b.key} className="grid grid-cols-[7rem_minmax(0,1fr)_3.5rem] items-center gap-x-2 sm:grid-cols-[8.5rem_minmax(0,1fr)_3.5rem]">
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
            <div className="relative h-5 min-w-0 rounded" style={{ background: "var(--surface-2)" }}>
              <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${width}%`, background: b.color }} />
              <span aria-hidden="true" className="absolute inset-y-[-3px] w-0 border-l border-dashed" style={{ left: `${FIFTY_LEFT}%`, borderColor: "var(--axis)" }} />
            </div>
            <div className="tabular text-right text-base font-bold leading-none" style={{ color: "var(--text-primary)" }}>
              {fmtPct(b.value)}
              <span className="align-baseline text-[0.6em] font-bold">%</span>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
