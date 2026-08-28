/**
 * Machine-readable feed builders — the reusable core behind /api/*.json,
 * /data/*.csv and /feed.xml.
 *
 * One place turns the internal `RaceAverage`/`Poll` shapes into the stable,
 * documented, externally-consumed JSON. Every feed route and the Dataset schema
 * read from here, so a consumer of `/api/averages.json` sees exactly the numbers
 * the pages render — the maths still lives only in `average.ts`.
 */
import { scenarioGroups, statesWithPolls } from "./data";
import { SITE_NAME, SITE_TAGLINE } from "./brand";
import { BASE, LICENSE_NAME, LICENSE_URL } from "./jsonld";
import type { Poll, RaceAverage, RaceKind, UF } from "./types";

export interface FeedCandidate {
  candidate: string;
  party: string | null;
  avg: number;
  latest: number;
  n_polls: number;
}

export interface FeedAverage {
  race: RaceKind;
  state: UF | null;
  round: 1 | 2;
  scenario: string;
  basis: string;
  poll_count: number;
  last_poll_date: string | null;
  spread: number;
  candidates: FeedCandidate[];
}

/** The provenance + licence block every feed carries at its head. */
export function feedMeta(generated_at: string) {
  return {
    provider: SITE_NAME,
    slogan: SITE_TAGLINE,
    url: BASE,
    methodology_url: `${BASE}/metodologia`,
    license: LICENSE_URL,
    license_name: LICENSE_NAME,
    isAccessibleForFree: true,
    attribution: `Fonte: ${SITE_NAME} (${BASE}). Licença ${LICENSE_NAME}. Números pertencem aos institutos citados; agregação e computação próprias.`,
    generated_at,
  };
}

export function averageToFeed(
  race: RaceKind,
  state: UF | null,
  round: 1 | 2,
  avg: RaceAverage,
): FeedAverage {
  return {
    race,
    state,
    round,
    scenario: avg.scenario,
    basis: avg.basis,
    poll_count: avg.pollCount,
    last_poll_date: avg.lastPollDate,
    spread: avg.spread,
    candidates: avg.candidates.map((c) => ({
      candidate: c.candidate,
      party: c.party,
      avg: c.avg,
      latest: c.latestPct,
      n_polls: c.nPolls,
    })),
  };
}

/** President — 1st round (one group). */
export function presidentFeedAverage(): FeedAverage | null {
  const g = scenarioGroups("presidente", null, 1)[0] ?? null;
  return g?.average ? averageToFeed("presidente", null, 1, g.average) : null;
}

/** President — 2nd round (one per head-to-head pairing). */
export function presidentRunoffFeedAverages(): FeedAverage[] {
  return scenarioGroups("presidente", null, 2)
    .filter((g) => g.average)
    .map((g) => averageToFeed("presidente", null, 2, g.average!));
}

/** Every state race with an average: governador (1º e 2º) + senador. */
export function stateFeedAverages(): FeedAverage[] {
  const out: FeedAverage[] = [];
  for (const { uf } of statesWithPolls()) {
    const gov1 = scenarioGroups("governador", uf, 1)[0]?.average ?? null;
    if (gov1) out.push(averageToFeed("governador", uf, 1, gov1));
    for (const g of scenarioGroups("governador", uf, 2)) {
      if (g.average) out.push(averageToFeed("governador", uf, 2, g.average));
    }
    const sen = scenarioGroups("senador", uf, 1)[0]?.average ?? null;
    if (sen) out.push(averageToFeed("senador", uf, 1, sen));
  }
  return out;
}

/** All averages, flat — the master feed body. */
export function allFeedAverages(): FeedAverage[] {
  const pres = presidentFeedAverage();
  return [
    ...(pres ? [pres] : []),
    ...presidentRunoffFeedAverages(),
    ...stateFeedAverages(),
  ];
}

/** A poll, normalized for the public catalogue (/api/polls.json). */
export function pollToFeed(p: Poll) {
  return {
    pollster: p.pollster,
    contractor: p.contractor ?? null,
    race: p.race,
    state: p.state,
    round: p.round,
    scenario: p.scenario,
    fieldwork_start: p.fieldwork_start,
    fieldwork_end: p.fieldwork_end,
    published_date: p.published_date ?? null,
    sample_size: p.sample_size,
    margin_of_error: p.margin_of_error,
    tse_registration: p.tse_registration ?? null,
    source: p.source,
    source_url: p.source_url,
    results: p.results,
  };
}

// ─── CSV helpers ─────────────────────────────────────────────────────────────

/** RFC-4180 field quoting: wrap in quotes and double any inner quote when the
 *  value carries a comma, quote or newline. */
function csvCell(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csvFromRows(header: string[], rows: (string | number | null)[][]): string {
  const lines = [header, ...rows].map((r) => r.map(csvCell).join(","));
  // CRLF line endings — what RFC-4180 and spreadsheet apps expect.
  return lines.join("\r\n") + "\r\n";
}
