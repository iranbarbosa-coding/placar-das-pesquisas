// The projection: store → the flat `Poll[]` the site has always consumed.
//
// This is what lets the storage layer change without touching a single page.
// `src/lib/data.ts` materialises the same shape on the TypeScript side; this
// module is the Node-side twin used by the parity check, so both are held to
// the identical definition.
//
// Only HEADLINE, non-retracted questions are projected — that is the store's
// non-destructive replacement for the old keepFullestRound1, which deleted the
// alternate line-ups outright.
import { normalizeRegistration } from "./ids.mjs";


/**
 * Share of the sample the published numbers account for, and whether that
 * falls short enough to keep the poll out of the averages.
 *
 * Votos válidos divide by the sum of what is present, so a poll missing 40
 * points inflates everyone left in it — a flag on the row would not save the
 * number. Senate is exempt: two votes per voter make the table sum to ~200%,
 * where this arithmetic means nothing. Threshold and the measured distribution
 * live in scripts/lib/completeness.mjs.
 */
function incompleteFlag(q) {
  if (q.race === "senador") return false;
  const sum = (q.results ?? []).reduce((a, r) => a + (r.pct ?? 0), 0) +
    (q.others_pct ?? 0) + (q.blank_null_pct ?? 0) + (q.undecided_pct ?? 0);
  return Math.round(sum * 10) / 10 < 90;
}

export function projectPolls(store) {
  const surveyById = new Map(store.surveys.map((s) => [s.survey_id, s]));
  const instById = new Map(store.institutes.map((i) => [i.institute_id, i]));
  const candById = new Map(store.candidates.map((c) => [c.candidate_id, c]));

  const canonicalInstitute = (id) => {
    let inst = instById.get(id);
    const seen = new Set();
    while (inst?.merged_into && !seen.has(inst.institute_id)) {
      seen.add(inst.institute_id);
      inst = instById.get(inst.merged_into);
    }
    return inst?.canonical ?? null;
  };

  const polls = [];
  for (const q of store.questions) {
    if (!q.is_headline || q.retracted) continue;
    const s = surveyById.get(q.survey_id);
    if (!s || s.retracted) continue;
    polls.push({
      id: q.legacy_id ?? q.question_id,
      source: s.source_refs?.[0]?.source ?? null,
      source_url: s.article_url ?? s.integra_url ?? null,
      integra_url: s.integra_url ?? null,
      race: q.race,
      state: q.uf ?? null,
      round: q.round,
      scenario: q.scenario_label_raw ?? null,
      pollster: canonicalInstitute(s.institute_id),
      contractor: s.contractor_raw ?? null,
      fieldwork_start: s.fieldwork_start ?? null,
      fieldwork_end: s.fieldwork_end ?? null,
      published_date: s.published_date ?? null,
      sample_size: s.sample_size ?? null,
      margin_of_error: s.margin_of_error ?? null,
      results: (q.results ?? []).map((r) => ({
        candidate: candById.get(r.candidate_id)?.canonical ?? r.name_raw,
        party: r.party ?? null,
        pct: r.pct,
      })),
      others_pct: q.others_pct ?? null,
      undecided_pct: q.undecided_pct ?? null,
      blank_null_pct: q.blank_null_pct ?? null,
      tse_registration: normalizeRegistration(s.tse_registration),
      ...(incompleteFlag(q) ? { incomplete: true } : {}),
      ...(q.parse_warnings?.length ? { parse_warnings: q.parse_warnings.join("; ") } : {}),
      ...(q.repaired ? { repaired: q.repaired } : {}),
    });
  }
  return polls;
}
