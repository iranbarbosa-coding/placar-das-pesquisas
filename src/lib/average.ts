import type {
  CandidateAverage,
  Poll,
  RaceAverage,
  RaceKey,
} from "./types";

// RCP-style average: mean of each candidate's numbers over the most recent
// polls in a trailing window. Rules, in order:
//   1. Window = polls with fieldwork_end within WINDOW_DAYS of the most
//      recent poll in the scenario group (not of "today" — a race whose last
//      poll is 3 months old still shows an average, clearly dated).
//   2. If the window holds fewer than MIN_POLLS, extend to the last
//      MIN_POLLS polls regardless of date.
//   3. One poll per pollster per window (the most recent) — prevents a
//      pollster that publishes weekly from dominating the average.
const WINDOW_DAYS = 30;
const MIN_POLLS = 3;

function daysBetween(a: string, b: string): number {
  return Math.abs(+new Date(a) - +new Date(b)) / 86_400_000;
}

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

/** Latest poll per pollster within a list (assumes newest-first input). */
function dedupePollster(polls: Poll[]): Poll[] {
  const seen = new Set<string>();
  return polls.filter((p) => {
    const k = p.pollster.toLowerCase();
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function selectWindow(sorted: Poll[]): Poll[] {
  const anchor = sorted.length ? pollDate(sorted[0]) : null;
  if (!anchor) return sorted.slice(0, MIN_POLLS);
  const inWindow = sorted.filter((p) => {
    const d = pollDate(p);
    return d !== null && daysBetween(d, anchor) <= WINDOW_DAYS;
  });
  const base = inWindow.length >= MIN_POLLS ? inWindow : sorted.slice(0, MIN_POLLS);
  return dedupePollster(base);
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
 * Daily rolling-average series for the trendline chart: for each day between
 * first and last poll, average of polls in the trailing WINDOW_DAYS
 * (pollster-deduped), per candidate. Sampled every `stepDays` to keep the
 * series small.
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

  for (let t = +first; t <= +last; t += stepDays * 86_400_000) {
    const day = new Date(t).toISOString().slice(0, 10);
    const upTo = dated.filter((p) => pollDate(p)! <= day);
    const inWindow = dedupePollster(
      upTo.filter((p) => daysBetween(pollDate(p)!, day) <= WINDOW_DAYS),
    );
    if (!inWindow.length) continue;
    for (const [key, meta] of candidates) {
      const vals = inWindow
        .map((p) => p.results.find((r) => candKey(r.candidate) === key)?.pct)
        .filter((v): v is number => v !== undefined);
      if (!vals.length) continue;
      if (!trends.has(key)) trends.set(key, []);
      trends.get(key)!.push({ date: day, avg: round1(mean(vals)) });
    }
    void candidates.get; // keep meta referenced for clarity
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
    windowDays: WINDOW_DAYS,
    pollCount: window.length,
    lastPollDate: pollDate(sorted[0]),
  };
}
