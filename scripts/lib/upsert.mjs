// The single write path into the store: one normalised poll in, store mutated.
//
// This is the seam Phase 3 rewrites `scrape.mjs` around — sources → normalise →
// **upsert** → repairs → validate → write. It exists now, ahead of that rewrite,
// because the resolution ladder it drives (`resolveSurvey`, `resolveQuestion`,
// `fillFields`, `addSourceRef`, `logConflict`) had **no caller anywhere in the
// repo**: ~150 lines of unexecuted code that the whole phase is built on. A
// harness against a driver invented inside the harness would have proved
// nothing about the code that eventually ships, so the driver lives here.
//
// Deliberately thin. It decides nothing the store does not already decide; it
// only feeds the ladder in the right order and records where each value came
// from. Phase 3 should grow this file, not replace it.
//
// ORDER MATTERS. Upsert is first-writer-wins, so callers MUST ingest in source
// priority order — poder360 → eleicaoemdados → wikipedia. Parallelising the
// sources silently changes which one wins.
import {
  resolveInstitute, resolveCandidate, resolveSurvey, resolveQuestion,
  fillFields, addSourceRef, logConflict,
} from "./store.mjs";
import { contestKey } from "./ids.mjs";
import { canonicalPartyAt } from "./parties.mjs";

const SURVEY_FIELDS = [
  "contractor_raw", "fieldwork_start", "fieldwork_end", "published_date",
  "sample_size", "margin_of_error", "tse_registration", "article_url", "integra_url",
];
const QUESTION_FIELDS = [
  "scenario_label_raw", "results", "others_pct", "undecided_pct", "blank_null_pct",
];

/**
 * @param {object} store    from readStore()
 * @param {object} poll     normalised flat poll (the `Poll` shape sources emit)
 * @param {{source: string, runId?: string, nativeId?: string|number|null, fuzzyCandidates?: boolean}} opts
 * @returns {{survey, question, matched_by: string, question_matched_by: string}}
 */
export function upsertPoll(store, poll, { source, runId = "run", nativeId = null, fuzzyCandidates = false } = {}) {
  const institute = resolveInstitute(store, poll.pollster);
  const date = poll.fieldwork_end ?? poll.published_date ?? null;
  const roster = (poll.results ?? []).map((r) => r.candidate);

  const { survey, matched_by } = resolveSurvey(store, {
    source_refs: nativeId == null ? [] : [{ source, native_id: nativeId }],
    tse_registration: poll.tse_registration ?? null,
    institute_id: institute.institute_id,
    institute_names_raw: [poll.pollster],
    universe: { level: poll.state ? "uf" : "nacional", uf: poll.state ?? null },
    fieldwork_end: poll.fieldwork_end ?? null,
    published_date: poll.published_date ?? null,
    sample_size: poll.sample_size ?? null,
    roster,
    electoral_cycle: 2026,
    pre_electoral: (date ?? "") < "2026-01-01",
  });

  if (nativeId != null) addSourceRef(store, survey, { source, native_id: nativeId, url: poll.source_url ?? null });
  fillFields(store, survey, {
    contractor_raw: poll.contractor ?? null,
    fieldwork_start: poll.fieldwork_start ?? null,
    fieldwork_end: poll.fieldwork_end ?? null,
    published_date: poll.published_date ?? null,
    sample_size: poll.sample_size ?? null,
    margin_of_error: poll.margin_of_error ?? null,
    tse_registration: poll.tse_registration ?? null,
    article_url: poll.source_url ?? null,
  }, { source, runId, table: "surveys", fields: SURVEY_FIELDS });

  // Candidates resolve against the store's alias index. `fuzzyCandidates` is
  // OFF by default and must stay off until the curated alias table exists:
  // the token-subset matcher merges "Ciro Nogueira" into "Ciro" (different
  // politicians) while failing to merge "Tião Bocalom" with "Sebastião
  // Bocalom" (one person). See REVISAO_CANDIDATOS.md.
  const contest = contestKey(poll.race, poll.state);
  const results = (poll.results ?? []).map((r) => {
    const party = canonicalPartyAt(r.party, date);
    const c = resolveCandidate(store, r.candidate, contest, party, { fuzzy: fuzzyCandidates });
    return { candidate_id: c.candidate_id, name_raw: r.candidate, party_raw: r.party ?? null, party, pct: r.pct };
  });

  const { question, matched_by: question_matched_by } = resolveQuestion(store, survey, {
    source_refs: nativeId == null ? [] : [{ source, native_id: `${nativeId}:${poll.race}:${poll.round}:${poll.scenario ?? ""}` }],
    race: poll.race, round: poll.round, uf: poll.state ?? null,
    scenario_label_raw: poll.scenario ?? null,
    legacy_id: poll.id ?? null,
    results,
  });

  fillFields(store, question, {
    scenario_label_raw: poll.scenario ?? null,
    results,
    others_pct: poll.others_pct ?? null,
    undecided_pct: poll.undecided_pct ?? null,
    blank_null_pct: poll.blank_null_pct ?? null,
  }, { source, runId, table: "questions", fields: QUESTION_FIELDS });

  return { survey, question, matched_by, question_matched_by };
}

/** Ingest a whole batch in the caller's order. See the ORDER MATTERS note. */
export function upsertAll(store, polls, opts) {
  const report = { source_ref: 0, registration: 0, natural: 0, minted: 0 };
  for (const p of polls) {
    const { matched_by } = upsertPoll(store, p, { ...opts, nativeId: p.native_id ?? null });
    report[matched_by] = (report[matched_by] ?? 0) + 1;
  }
  return report;
}

export { logConflict };
