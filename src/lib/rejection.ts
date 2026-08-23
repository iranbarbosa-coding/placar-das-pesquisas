// The read side of the rejection table — structurally isolated from the vote
// store. `data/rejection.ndjson` is a flat projection (one RejectionPoll per
// line) written by the scraper; nothing here ever loads or touches `polls`, and
// no vote code loads this. The two tables only ever meet on the presidente page,
// side by side, never in one average.
//
// The window rule (latest N, cap per institute) is REUSED from `average.ts`
// verbatim — `sortPollsDesc`/`selectWindow`/`candKey` — so rejection and vote
// intention pick their window by one implementation, not two that drift.
import fs from "node:fs";
import path from "node:path";
import {
  LATEST_N,
  MAX_PER_POLLSTER,
  candKey,
  selectWindow,
  sortPollsDesc,
} from "./average";
import type {
  RaceKey,
  RaceKind,
  RejectionAverage,
  RejectionCandidateAverage,
  RejectionDataset,
  RejectionPoll,
  UF,
} from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

function readNdjson<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf-8");
  const rows: T[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t) as T);
    } catch (e) {
      throw new Error(`${path.basename(file)}:${i + 1} — JSON inválido: ${(e as Error).message}`);
    }
  }
  return rows;
}

let cache: RejectionDataset | null = null;

/** The rejection dataset, loaded once. `generated_at` is borrowed from the poll
 *  store's meta so the page can caption both tables with one date. */
export function loadRejection(dir: string = DATA_DIR): RejectionDataset {
  if (cache) return cache;
  const metaFile = path.join(dir, "meta.json");
  const generated_at = fs.existsSync(metaFile)
    ? ((JSON.parse(fs.readFileSync(metaFile, "utf-8")) as { generated_at?: string }).generated_at ?? "")
    : "";
  cache = { generated_at, polls: readNdjson<RejectionPoll>(path.join(dir, "rejection.ndjson")) };
  return cache;
}

/** Rejection polls for one contest. The rejection choke point — the twin of
 *  `pollsFor`, but it NEVER reads the vote store. */
export function rejectionFor(race: RaceKind, state: UF | null, round: 1 | 2 = 1): RejectionPoll[] {
  return loadRejection().polls.filter(
    (p) => p.race === race && p.state === state && p.round === round,
  );
}

const round1 = (x: number): number => Math.round(x * 10) / 10;
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/**
 * The rejection average for one contest — the same "latest N, cap per institute"
 * window as the vote average, but on the rejection statistic:
 *
 *  - `avgBruta`: the mean of each candidate's `pct_bruta` (% of the full sample)
 *    over the window polls that tested them.
 *  - `avgLiquida`: rejeição líquida = bruta ÷ conhece, meaned over the window
 *    polls that PRINT a `conhece_pct`; null when none do (the display reads "sem
 *    base"). Never invented from the vote sample.
 *  - NO válidos / toBasis conversion — rejection is not a vote share.
 *  - Multi-mention polls are averaged among themselves (per-candidate mean),
 *    never summed to 100.
 */
export function computeRejectionAverage(
  key: RaceKey,
  polls: RejectionPoll[],
): RejectionAverage | null {
  if (!polls.length) return null;
  const sorted = sortPollsDesc(polls);
  const { window } = selectWindow(sorted);
  if (!window.length) return null;

  // Roster = anyone appearing in the window.
  const roster = new Map<string, { candidate: string; party: string | null }>();
  for (const p of window) {
    for (const r of p.results) {
      const k = candKey(r.candidate);
      if (!roster.has(k)) roster.set(k, { candidate: r.candidate, party: r.party });
      else if (!roster.get(k)!.party && r.party) roster.get(k)!.party = r.party;
    }
  }

  const candidates: RejectionCandidateAverage[] = [];
  for (const [k, meta] of roster) {
    const brutas: number[] = [];
    const liquidas: number[] = [];
    for (const p of window) {
      const r = p.results.find((x) => candKey(x.candidate) === k);
      if (!r) continue;
      brutas.push(r.pct_bruta);
      if (r.conhece_pct != null && r.conhece_pct > 0) {
        liquidas.push((r.pct_bruta / r.conhece_pct) * 100);
      }
    }
    if (!brutas.length) continue;
    const latest = sorted
      .flatMap((p) => p.results)
      .find((r) => candKey(r.candidate) === k);
    candidates.push({
      candidate: meta.candidate,
      party: meta.party,
      avgBruta: round1(mean(brutas)),
      avgLiquida: liquidas.length ? round1(mean(liquidas)) : null,
      nPolls: brutas.length,
      latestBruta: latest?.pct_bruta ?? brutas[0],
    });
  }
  candidates.sort((a, b) => b.avgBruta - a.avgBruta);
  if (!candidates.length) return null;

  const pollDate = (p: RejectionPoll) => p.fieldwork_end ?? p.published_date ?? p.fieldwork_start ?? null;
  return {
    key,
    candidates,
    windowSize: LATEST_N,
    maxPerPollster: MAX_PER_POLLSTER,
    pollCount: window.length,
    windowPollIds: window.map((p) => p.id),
    lastPollDate: pollDate(sorted[0]),
    multiMention: window.every((p) => p.multi_mention),
  };
}

/** The rejection average for a contest, straight from the store. */
export function rejectionAverage(
  race: RaceKind,
  state: UF | null,
  round: 1 | 2 = 1,
): RejectionAverage | null {
  return computeRejectionAverage({ race, state, round }, rejectionFor(race, state, round));
}
