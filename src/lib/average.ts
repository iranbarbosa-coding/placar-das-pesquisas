import type {
  CandidateAverage,
  Poll,
  RaceAverage,
  RaceKey,
} from "./types";

// RCP-style average: for each contest (seat + scenario), the mean of each
// candidate's numbers across the LATEST_N most recent polls of that contest,
// with at most MAX_PER_POLLSTER polls from any one institute so a house that
// publishes weekly cannot carry the average on its own house effect.
//
// A fixed poll count — not a date window — so every seat is on the same basis
// regardless of how densely it is polled. MIN_POLLS is a floor that outranks
// the cap: in a thinly polled seat (e.g. four polls, all from one institute)
// the cap would leave a two-poll average or less, so it yields and the board
// says so rather than silently showing a capped-but-tiny base.
const LATEST_N = 10;
const MAX_PER_POLLSTER = 2;
const MIN_POLLS = 3;

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

function pollsterKey(p: Poll): string {
  return p.pollster.toLowerCase().trim();
}

/**
 * The polls that make up the average (input must be newest-first): walk from
 * the newest, taking a poll unless its institute already holds
 * MAX_PER_POLLSTER slots, until LATEST_N are held. If the cap leaves fewer
 * than MIN_POLLS, backfill the skipped polls (newest first) up to that floor
 * and report it via `capRelaxed`.
 */
function selectWindow(sorted: Poll[]): { window: Poll[]; capRelaxed: boolean } {
  const picked: Poll[] = [];
  const skipped: Poll[] = [];
  const held = new Map<string, number>();

  for (const p of sorted) {
    if (picked.length >= LATEST_N) break;
    const k = pollsterKey(p);
    const n = held.get(k) ?? 0;
    if (n >= MAX_PER_POLLSTER) {
      skipped.push(p);
      continue;
    }
    held.set(k, n + 1);
    picked.push(p);
  }

  let capRelaxed = false;
  for (const p of skipped) {
    if (picked.length >= MIN_POLLS) break;
    picked.push(p);
    capRelaxed = true;
  }

  return { window: sortPollsDesc(picked), capRelaxed };
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
    // Same selection rule as the headline average, applied to the polls
    // published up to `day` (`dated` is newest-first).
    const { window } = selectWindow(dated.filter((p) => pollDate(p)! <= day));
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
  const { window, capRelaxed } = selectWindow(sorted);

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
    maxPerPollster: MAX_PER_POLLSTER,
    capRelaxed,
    pollCount: window.length,
    lastPollDate: pollDate(sorted[0]),
  };
}
