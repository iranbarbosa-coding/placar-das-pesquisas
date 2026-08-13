import type {
  CandidateAverage,
  Poll,
  RaceAverage,
  RaceKey,
} from "./types";

// RCP-style average: for each contest (seat + scenario), the mean of each
// candidate's numbers across the LATEST_N most recent polls of that contest.
// A fixed poll count — not a date window — so every seat shows an average on
// the same basis regardless of how densely it is polled; a seat with fewer
// than LATEST_N polls averages all it has, and the poll count is always shown
// beside the numbers.
const LATEST_N = 10;

function pollDate(p: Poll): string | null {
  return p.fieldwork_end ?? p.published_date ?? p.fieldwork_start ?? null;
}

/** Sort polls newest-first by best-available date. */
export function sortPollsDesc(polls: Poll[]): Poll[] {
  return [...polls].sort((x, y) => {
    const dx = pollDate(x) ?? "0000";
    const dy = pollDate(y) ?? "0000";
    return dy.localeCompare(dx);
  });
}

/** The polls that make up the average: the LATEST_N newest (newest-first in). */
function selectWindow(sorted: Poll[]): Poll[] {
  return sorted.slice(0, LATEST_N);
}

function mean(xs: number[]): number {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Normalize candidate names for matching across polls (accents/case kept simple). */
export function candKey(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

/**
 * Trendline series: the same LATEST_N rule applied backwards through time —
 * at each sampled day, the average of the LATEST_N polls published up to that
 * day. The line therefore shows what the site's headline average would have
 * read on that date. Sampled every `stepDays` to keep the series small.
 */
function buildTrends(
  sorted: Poll[],
  candidates: Map<string, { candidate: string; party: string | null }>,
  stepDays = 3,
): Map<string, { date: string; avg: number }[]> {
  const dated = sorted.filter((p) => pollDate(p) !== null);
  const trends = new Map<string, { date: string; avg: number }[]>();
  if (dated.length < 2) return trends;

  const first = new Date(pollDate(dated[dated.length - 1])!);
  const last = new Date(pollDate(dated[0])!);

  // Sampled days, always ending exactly on the last poll's date so the line's
  // final point equals the headline average (a 3-day step would otherwise
  // stop short and print a different number beside the same chart).
  const days: string[] = [];
  for (let t = +first; t <= +last; t += stepDays * 86_400_000) {
    days.push(new Date(t).toISOString().slice(0, 10));
  }
  const lastDay = pollDate(dated[0])!;
  if (days[days.length - 1] !== lastDay) days.push(lastDay);

  for (const day of days) {
    // `dated` is newest-first, so the first LATEST_N entries at or before
    // `day` are exactly that day's window.
    const window = dated.filter((p) => pollDate(p)! <= day).slice(0, LATEST_N);
    if (!window.length) continue;
    for (const key of candidates.keys()) {
      const vals = window
        .map((p) => p.results.find((r) => candKey(r.candidate) === key)?.pct)
        .filter((v): v is number => v !== undefined);
      if (!vals.length) continue;
      if (!trends.has(key)) trends.set(key, []);
      trends.get(key)!.push({ date: day, avg: round1(mean(vals)) });
    }
  }
  return trends;
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/** Compute the RCP-style average for one scenario group of polls. */
export function computeAverage(
  key: RaceKey,
  scenario: string,
  polls: Poll[],
): RaceAverage | null {
  if (!polls.length) return null;
  const sorted = sortPollsDesc(polls);
  const window = selectWindow(sorted);

  // Candidate roster = anyone appearing in the window polls.
  const roster = new Map<string, { candidate: string; party: string | null }>();
  for (const p of window) {
    for (const r of p.results) {
      const k = candKey(r.candidate);
      if (!roster.has(k)) roster.set(k, { candidate: r.candidate, party: r.party });
      else if (!roster.get(k)!.party && r.party) roster.get(k)!.party = r.party;
    }
  }

  const trends = buildTrends(sorted, roster);

  const candidates: CandidateAverage[] = [];
  for (const [k, meta] of roster) {
    const vals = window
      .map((p) => p.results.find((r) => candKey(r.candidate) === k)?.pct)
      .filter((v): v is number => v !== undefined);
    if (!vals.length) continue;
    const latest = sorted
      .flatMap((p) => p.results)
      .find((r) => candKey(r.candidate) === k);
    candidates.push({
      candidate: meta.candidate,
      party: meta.party,
      avg: round1(mean(vals)),
      nPolls: vals.length,
      latestPct: latest?.pct ?? vals[0],
      trend: trends.get(k) ?? [],
    });
  }
  candidates.sort((a, b) => b.avg - a.avg);
  if (!candidates.length) return null;

  return {
    key,
    scenario,
    candidates,
    spread: round1(
      candidates.length > 1 ? candidates[0].avg - candidates[1].avg : candidates[0].avg,
    ),
    windowSize: LATEST_N,
    pollCount: window.length,
    lastPollDate: pollDate(sorted[0]),
  };
}
