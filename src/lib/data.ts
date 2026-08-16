import { candKey, computeAverage, sortPollsDesc } from "./average";
// Re-exported so existing server-side callers keep working; the implementation
// lives in a Node-free module so client components can use it too.
export { fmtDate } from "./format";
import { loadStoreDataset } from "./store";
import type { Poll, PollDataset, RaceAverage, RaceKey, RaceKind, UF } from "./types";

// The entire site is statically generated from the NDJSON store under `data/`.
// The daily scraper rewrites it and the resulting commit triggers a Vercel
// rebuild.
//
// This is the ONLY function that knows where the data physically lives. The
// eight exports below it, and every page, see the same flat `Poll[]` they
// always did — which is what made moving off `data/polls.json` a one-function
// change rather than a site-wide one.

let cache: PollDataset | null = null;

export function loadDataset(): PollDataset {
  if (cache) return cache;
  cache = loadStoreDataset();
  return cache;
}

export function pollsFor(race: RaceKind, state: UF | null, round?: 1 | 2): Poll[] {
  return loadDataset().polls.filter(
    (p) =>
      p.race === race &&
      p.state === state &&
      (round === undefined || p.round === round),
  );
}

/**
 * Race grouping (RCP-style):
 *  - Round 1 → ONE group per race. Each candidate's average uses the polls
 *    that tested them (candidate names are canonicalized at scrape time).
 *  - Round 2 → one group per head-to-head PAIRING (top-2 candidates), since
 *    averaging across different match-ups would be meaningless.
 */
export interface ScenarioGroup {
  scenario: string;
  polls: Poll[]; // newest first
  /** The válidos cut — the site default. Null when nothing is averageable. */
  average: RaceAverage | null;
  /**
   * The same race on the bruto cut, precomputed at BUILD time.
   *
   * The site is fully static and the basis toggle is a client-side control, so
   * the alternative had to be either shipped alongside or recomputed in the
   * browser. Recomputing means a second implementation of the averaging rule
   * living in client code, drifting from `average.ts` — this repo already keeps
   * `projection-twin-check.mjs` around because exactly that happened once. Two
   * precomputed objects cost a few KB and keep the maths in one place.
   *
   * Senate has no second cut: `toBasis` refuses to convert it, so this is the
   * same numbers under a different label and the toggle is not offered.
   */
  averageBruto: RaceAverage | null;
}

function pairingKey(p: Poll): string {
  return [...p.results]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)
    .map((r) => candKey(r.candidate))
    .sort()
    .join("|");
}

export function scenarioGroups(race: RaceKind, state: UF | null, round: 1 | 2): ScenarioGroup[] {
  const polls = pollsFor(race, state, round);
  const key: RaceKey = { race, state, round };
  if (!polls.length) return [];

  if (round === 1) {
    const sorted = sortPollsDesc(polls);
    return [{
      scenario: "1º turno",
      polls: sorted,
      average: computeAverage(key, "1º turno", sorted, "validos"),
      averageBruto: computeAverage(key, "1º turno", sorted, "bruto"),
    }];
  }

  const byPairing = new Map<string, Poll[]>();
  for (const p of polls) {
    if (p.results.length < 2) continue;
    const k = pairingKey(p);
    if (!byPairing.has(k)) byPairing.set(k, []);
    byPairing.get(k)!.push(p);
  }
  const groups: ScenarioGroup[] = [...byPairing.values()].map((ps) => {
    const sorted = sortPollsDesc(ps);
    const top = [...sorted[0].results].sort((a, b) => b.pct - a.pct).slice(0, 2);
    const scenario = `2º turno: ${top.map((r) => r.candidate).join(" vs ")}`;
    return {
      scenario,
      polls: sorted,
      average: computeAverage(key, scenario, sorted, "validos"),
      averageBruto: computeAverage(key, scenario, sorted, "bruto"),
    };
  });
  // Most-polled first, then most-recent. Both can tie — Acre's two leading
  // pairings sit at 10 polls apiece with the same last fieldwork date — so the
  // scenario label is the final, deterministic tiebreak. Without it the
  // matchup a state page leads with is decided by the order the polls happen
  // to be stored in, and a rescrape can flip it with no data change at all.
  groups.sort((a, b) => {
    if (b.polls.length !== a.polls.length) return b.polls.length - a.polls.length;
    const da = a.average?.lastPollDate ?? "0000";
    const db = b.average?.lastPollDate ?? "0000";
    return db.localeCompare(da) || a.scenario.localeCompare(b.scenario, "pt-BR");
  });
  return groups;
}

/** States that actually have polls, for nav + the states index. */
export function statesWithPolls(): { uf: UF; count: number; latest: string | null }[] {
  const map = new Map<UF, Poll[]>();
  for (const p of loadDataset().polls) {
    if (!p.state) continue;
    if (!map.has(p.state)) map.set(p.state, []);
    map.get(p.state)!.push(p);
  }
  return [...map.entries()]
    .map(([uf, ps]) => {
      const sorted = sortPollsDesc(ps);
      return {
        uf,
        count: ps.length,
        latest: sorted[0]?.fieldwork_end ?? sorted[0]?.published_date ?? null,
      };
    })
    .sort((a, b) => b.count - a.count || a.uf.localeCompare(b.uf));
}

export function pollsters(): { name: string; count: number; races: number; latest: string | null }[] {
  const map = new Map<string, Poll[]>();
  for (const p of loadDataset().polls) {
    const k = p.pollster.trim();
    if (!map.has(k)) map.set(k, []);
    map.get(k)!.push(p);
  }
  return [...map.entries()]
    .map(([name, ps]) => {
      const sorted = sortPollsDesc(ps);
      const races = new Set(ps.map((p) => `${p.race}:${p.state ?? "BR"}`));
      return {
        name,
        count: ps.length,
        races: races.size,
        latest: sorted[0]?.fieldwork_end ?? sorted[0]?.published_date ?? null,
      };
    })
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

export function latestPolls(limit = 25): Poll[] {
  return sortPollsDesc(loadDataset().polls).slice(0, limit);
}

