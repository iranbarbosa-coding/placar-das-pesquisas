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
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeRegistration } from "./ids.mjs";

// ── Universe ledger ─────────────────────────────────────────────────────────
// KEEP IN LOCKSTEP WITH `src/lib/store.ts`. The cited, blind-certified ledger
// `data/universe-verdicts.json` names the surveys that sample a single
// MUNICIPALITY though filed under a state contest; its `municipal` subset is the
// gate's allowlist. A poll of one of those surveys is stamped `municipal` and
// kept out of the state/national average by `geographyAverageable`.
//
// RESOLVED AGAINST THE STORE, NOT READ BY ID ALONE. A survey_id is minted from
// the survey's seed (institute, UF, dates, sample, roster) and is re-minted when
// the source edits any of them — measured on 18/09/2026: the Ranking/PB
// Campina Grande governor poll (n=782, certified municipal on 20/08) had
// re-minted from s_a0a23c8e8c0f to s_10efbc0a473f and, keyed by id alone, was
// back in the state average with nobody told; the IPR/MS estadual control
// had drifted the same way. So each entry may also carry a FINGERPRINT —
// institute name, UF, fieldwork_end, sample_size — and a survey matches by id
// first, by fingerprint second. The fingerprint is what the certification
// actually read (the source names the institute, the dates and the sample; it
// never saw our id), so it is the more honest key, and the id stays as the
// fast path. An entry without `fieldwork_end` matches by id only.
function loadLedgerEntries() {
  const file = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "universe-verdicts.json");
  if (!fs.existsSync(file)) return [];
  const doc = JSON.parse(fs.readFileSync(file, "utf-8"));
  return (doc.certified ?? []).filter((e) => e.verdict === "municipal");
}
const LEDGER_ENTRIES = loadLedgerEntries();

/**
 * survey_id → municipio (or null) for every store survey the municipal ledger
 * covers, by id or by fingerprint. Exported so the gate self-test derives its
 * expectations from the SAME resolution the projection ships.
 */
export function resolveMunicipalLedger(store, entries = LEDGER_ENTRIES) {
  const instById = new Map((store.institutes ?? []).map((i) => [i.institute_id, i]));
  const nomes = (s) => {
    const out = new Set((s.institute_names_raw ?? []).map((n) => String(n).toLowerCase()));
    let inst = instById.get(s.institute_id);
    const seen = new Set();
    while (inst && !seen.has(inst.institute_id)) {
      seen.add(inst.institute_id);
      if (inst.canonical) out.add(String(inst.canonical).toLowerCase());
      inst = inst.merged_into ? instById.get(inst.merged_into) : null;
    }
    return [...out];
  };
  const mesmaMarca = (entry, s) => {
    const alvo = String(entry.institute ?? "").toLowerCase().trim();
    if (!alvo) return false;
    return nomes(s).some((n) => n === alvo || n.includes(alvo) || alvo.includes(n));
  };
  const byId = new Map(entries.map((e) => [e.survey_id, e]));
  const byFp = new Map();
  for (const e of entries) {
    if (!e.fieldwork_end) continue;
    const k = `${e.uf ?? ""}|${e.fieldwork_end}|${e.sample_size ?? ""}`;
    if (!byFp.has(k)) byFp.set(k, []);
    byFp.get(k).push(e);
  }
  const m = new Map();
  for (const s of store.surveys ?? []) {
    let e = byId.get(s.survey_id);
    if (!e) {
      const k = `${s.universe?.uf ?? ""}|${s.fieldwork_end ?? ""}|${s.sample_size ?? ""}`;
      e = (byFp.get(k) ?? []).find((c) => mesmaMarca(c, s));
    }
    if (e) m.set(s.survey_id, e.municipio ?? null);
  }
  return m;
}


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
  const MUNICIPAL_LEDGER = resolveMunicipalLedger(store);
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
      ...(MUNICIPAL_LEDGER.has(q.survey_id)
        ? { municipal: { municipio: MUNICIPAL_LEDGER.get(q.survey_id) ?? null } }
        : {}),
      ...(q.parse_warnings?.length ? { parse_warnings: q.parse_warnings.join("; ") } : {}),
      ...(q.repaired ? { repaired: q.repaired } : {}),
    });
  }
  return polls;
}
