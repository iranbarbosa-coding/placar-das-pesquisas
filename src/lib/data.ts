import fs from "node:fs";
import path from "node:path";
import { candKey, computeAverage, sortPollsDesc } from "./average";
import type { Poll, PollDataset, RaceAverage, RaceKey, RaceKind, UF } from "./types";

// The entire site is statically generated from this one file. The daily
// scraper rewrites it and the resulting commit triggers a Vercel rebuild.
const DATA_PATH = path.join(process.cwd(), "data", "polls.json");

let cache: PollDataset | null = null;

export function loadDataset(): PollDataset {
  if (cache) return cache;
  const raw = fs.readFileSync(DATA_PATH, "utf-8");
  cache = JSON.parse(raw) as PollDataset;
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
  average: RaceAverage | null;
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
    return [{ scenario: "1º turno", polls: sorted, average: computeAverage(key, "1º turno", sorted) }];
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
    return { scenario, polls: sorted, average: computeAverage(key, scenario, sorted) };
  });
  groups.sort((a, b) => {
    if (b.polls.length !== a.polls.length) return b.polls.length - a.polls.length;
    const da = a.average?.lastPollDate ?? "0000";
    const db = b.average?.lastPollDate ?? "0000";
    return db.localeCompare(da);
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
    .sort((a, b) => b.count - a.count);
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
    .sort((a, b) => b.count - a.count);
}

export function latestPolls(limit = 25): Poll[] {
  return sortPollsDesc(loadDataset().polls).slice(0, limit);
}

export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m ? `${d}/${m}/${y}` : iso;
}
