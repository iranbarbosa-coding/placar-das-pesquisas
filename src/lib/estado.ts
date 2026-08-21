import { candKey } from "./average";
import { colorMap, colorOf } from "./colors";
import { displayName } from "./names";
import { candDelta, raceEvolutionData } from "./presidente";
import type { CandidateAverage, RaceAverage, UF } from "./types";

/**
 * The state "Visão geral" trends card — server-side assembly for the
 * TENDÊNCIAS · ÚLTIMOS N DIAS panel: who leads each of the state's races, and
 * who moved most (up and down) over the window.
 *
 * Names only REGISTERED candidates (per cargo + UF), exactly like the race
 * charts and tables — so a hypothetical a pollster tested (e.g. the governor
 * candidate probed in a senate question) never surfaces as a "leader". The
 * registered set comes from `raceEvolutionData`, the same source the charts use;
 * when a seat has no registration data the set is empty and we name the field as
 * polled (matching the charts' "no filter" fallback). Deltas reuse `candDelta`.
 *
 * The leader standings are a snapshot and do NOT depend on the window; only the
 * movers do. So both cuts are precomputed here — the leaders once, the movers for
 * EACH of the 15/30/60-day windows — and the client toggle only picks one, never
 * recomputing an average in the browser (§5). Server-only (reaches `node:fs`).
 */

/** The windows the trends toggle offers, in days (ascending). */
export type TrendWindow = 15 | 30 | 60;
export const TREND_WINDOWS: TrendWindow[] = [15, 30, 60];
/** Below this, a move is noise, not a trend (same floor as `recentMovers`). */
const MOVE_FLOOR = 0.1;

type Race = "governador" | "presidente" | "senador";

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

function partySuffix(p: string | null): string {
  return p ? ` (${p})` : "";
}

export interface LeaderEntry {
  /** null for a single-winner race; 1 or 2 for the two senate seats. */
  rank: number | null;
  name: string;
  party: string | null;
  pct: number;
  /** Points over the reference (runner-up, or the 3rd place for senate). */
  margin: number;
  /** What the margin is measured against: `Haddad (PT)` or `3º colocado`. */
  overLabel: string;
}

export interface StateLeaderGroup {
  cargo: string;
  /** The leader's own identity colour (a stripe), never a colour-by-position. */
  accent: string;
  entries: LeaderEntry[];
}

export interface StateMover {
  name: string;
  party: string | null;
  cargo: string;
  /** Signed points over the window. */
  delta: number;
}

export interface StateMoversWindow {
  windowDays: TrendWindow;
  gainers: StateMover[];
  losers: StateMover[];
}

export interface StateTrendsData {
  leaders: StateLeaderGroup[];
  /** Movers precomputed for each window in `TREND_WINDOWS`, in the same order. */
  windows: StateMoversWindow[];
}

interface NamedRace {
  avg: RaceAverage | null;
  /** Candidates registered to name in this race, in average order. */
  named: CandidateAverage[];
}

/** A race's average plus only the candidates that may be named (registered). */
function namedRace(race: Race, uf: UF): NamedRace {
  const evo = raceEvolutionData(race, uf, 1);
  const avg = evo.average;
  if (!avg) return { avg: null, named: [] };
  const reg = new Set(evo.registeredKeys);
  const named = reg.size > 0 ? avg.candidates.filter((c) => reg.has(candKey(c.candidate))) : avg.candidates;
  return { avg, named };
}

/** The leader's fixed identity colour, for the group's left stripe. */
function leaderAccent(avg: RaceAverage, leader: CandidateAverage): string {
  const cmap = colorMap(avg.candidates.map((c) => c.candidate));
  return colorOf(cmap, leader.candidate);
}

/** Top gainers and losers across the state's races over one window. */
function moversFor(races: { r: NamedRace; cargo: string }[], windowDays: TrendWindow): StateMoversWindow {
  const movers: StateMover[] = [];
  for (const { r, cargo } of races) {
    for (const c of r.named) {
      const d = candDelta(c.trend, windowDays);
      if (d == null) continue;
      const val = round1(d);
      if (Math.abs(val) < MOVE_FLOOR) continue;
      movers.push({ name: displayName(c.candidate), party: c.party, cargo, delta: val });
    }
  }
  const gainers = movers.filter((m) => m.delta > 0).sort((a, b) => b.delta - a.delta).slice(0, 3);
  const losers = movers.filter((m) => m.delta < 0).sort((a, b) => a.delta - b.delta).slice(0, 3);
  return { windowDays, gainers, losers };
}

export function stateTrends(uf: UF): StateTrendsData {
  const gov = namedRace("governador", uf);
  const pres = namedRace("presidente", uf);
  const sen = namedRace("senador", uf);

  const leaders: StateLeaderGroup[] = [];

  // Single-winner races: the leader, with the margin over the registered runner-up.
  const single = (r: NamedRace, cargo: string) => {
    const top = r.named[0];
    if (!r.avg || !top) return;
    const second = r.named[1];
    leaders.push({
      cargo,
      accent: leaderAccent(r.avg, top),
      entries: [
        {
          rank: null,
          name: displayName(top.candidate),
          party: top.party,
          pct: top.avg,
          margin: second ? round1(top.avg - second.avg) : 0,
          overLabel: second ? `${displayName(second.candidate)}${partySuffix(second.party)}` : "2º colocado",
        },
      ],
    });
  };
  single(gov, "Governador");
  single(pres, "Presidente");

  // Senate elects two, so both top seats "lead"; the margin is over the 3rd.
  if (sen.avg && sen.named[0]) {
    const third = sen.named[2];
    const entries: LeaderEntry[] = [];
    for (let i = 0; i < Math.min(2, sen.named.length); i++) {
      const c = sen.named[i]!;
      entries.push({
        rank: i + 1,
        name: displayName(c.candidate),
        party: c.party,
        pct: c.avg,
        margin: third ? round1(c.avg - third.avg) : 0,
        overLabel: "3º colocado",
      });
    }
    leaders.push({ cargo: "Senado · 2 vagas", accent: leaderAccent(sen.avg, sen.named[0]), entries });
  }

  // Movers: every registered candidate across the three races, precomputed for
  // each window so the client toggle only picks one.
  const races = [
    { r: gov, cargo: "Governador" },
    { r: pres, cargo: "Presidente" },
    { r: sen, cargo: "Senado" },
  ];
  const windows = TREND_WINDOWS.map((w) => moversFor(races, w));

  return { leaders, windows };
}
