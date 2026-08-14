// The consolidated store: load, resolve identity, upsert, write.
//
// THE INVERSION THIS MODULE EXISTS FOR: the store owns identity, not the
// scraper. Each run a source *proposes* match keys; `resolveSurvey` maps them
// onto an existing survey or mints a new one. Ids are never recomputed from
// content, so improving the institute/candidate canonicalisation can no longer
// re-insert an existing survey as a new row.
//
// UPSERT SEMANTICS — fill empty, never overwrite:
//   stored empty      → take incoming, record which source supplied it
//   equal             → no-op (and no timestamp churn: there is deliberately
//                       no `last_seen` field anywhere)
//   different         → KEEP STORED, append to conflicts.ndjson
//   locked by repair  → keep, log at elevated severity
//
// WHY THAT STILL HONOURS SOURCE PRIORITY: under first-writer-wins, whoever
// runs first sets the value. So sources MUST be ingested in priority order —
// poder360 → eleicaoemdados → wikipedia — which makes "first writer wins"
// exactly equivalent to today's SOURCE_PRIORITY. Reordering that ingestion
// (e.g. by parallelising it) silently changes which source wins. Don't.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readNdjson, writeNdjson, SORT } from "./ndjson.mjs";
import {
  mintSurveyId, mintQuestionId, mintInstituteId, mintCandidateId,
  normalizeRegistration, nameKey, contestKey,
} from "./ids.mjs";
import { sameCandidate } from "./canonicalize.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA_DIR = path.join(ROOT, "data");

export const SOURCE_ORDER = ["poder360", "eleicaoemdados", "wikipedia"];

const TABLES = {
  surveys: "survey", questions: "question", crosstabs: "crosstab",
  institutes: "institute", candidates: "candidate", registry: "registry",
  searches: "search", conflicts: "conflict",
};

export function readStore({ dir = DATA_DIR, tables = Object.keys(TABLES) } = {}) {
  const store = { dir, meta: {}, _indexes: null, _report: newReport() };
  for (const t of tables) store[t] = readNdjson(path.join(dir, `${t}.ndjson`));
  for (const t of Object.keys(TABLES)) store[t] ??= [];
  const metaFile = path.join(dir, "meta.json");
  store.meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf-8")) : {};
  buildIndexes(store);
  return store;
}

function newReport() {
  return { minted: { surveys: 0, questions: 0, institutes: 0, candidates: 0 },
           matched: { registration: 0, source_ref: 0, natural: 0 },
           filled: 0, conflicts: 0, retracted: 0 };
}

function buildIndexes(store) {
  const byReg = new Map();
  const byRef = new Map();
  const rosters = new Map();
  for (const s of store.surveys) {
    if (s.tse_registration) byReg.set(normalizeRegistration(s.tse_registration), s);
    for (const r of s.source_refs ?? []) byRef.set(`${r.source}:${r.native_id}`, s);
  }
  for (const q of store.questions) {
    if (!rosters.has(q.survey_id)) rosters.set(q.survey_id, new Set());
    for (const r of q.results ?? []) rosters.get(q.survey_id).add(r.name_raw ?? r.candidate);
  }
  store._indexes = {
    byReg, byRef, rosters,
    surveyById: new Map(store.surveys.map((s) => [s.survey_id, s])),
    questionById: new Map(store.questions.map((q) => [q.question_id, q])),
    questionsBySurvey: groupBy(store.questions, (q) => q.survey_id),
    instituteByAlias: aliasIndex(store.institutes),
    candidateByAlias: candidateAliasIndex(store.candidates),
  };
}

function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

function aliasIndex(institutes) {
  const m = new Map();
  for (const i of institutes) {
    m.set(nameKey(i.canonical), i);
    for (const a of i.aliases ?? []) m.set(nameKey(a), i);
  }
  return m;
}

function candidateAliasIndex(candidates) {
  const m = new Map();
  for (const c of candidates) {
    m.set(`${c.contest}|${nameKey(c.canonical)}`, c);
    for (const a of c.aliases ?? []) m.set(`${c.contest}|${nameKey(a)}`, c);
  }
  return m;
}

/** Follow merged_into chains to the surviving institute. */
export function resolveInstitute(store, rawName, { mint = true } = {}) {
  const key = nameKey(rawName);
  let inst = store._indexes.instituteByAlias.get(key);
  const seen = new Set();
  while (inst?.merged_into && !seen.has(inst.institute_id)) {
    seen.add(inst.institute_id);
    inst = store._indexes.surveyById && store.institutes.find((i) => i.institute_id === inst.merged_into);
  }
  if (inst) return inst;
  if (!mint) return null;
  // An unknown institute must MINT, never fail a run — a new pollster
  // appearing mid-campaign is normal, not an error.
  const rec = {
    institute_id: mintInstituteId(`institute|${key}`),
    canonical: String(rawName).trim(),
    aliases: [String(rawName).trim()],
    cnpj: null, merged_into: null, first_seen: today(),
  };
  store.institutes.push(rec);
  store._indexes.instituteByAlias.set(key, rec);
  store._report.minted.institutes++;
  return rec;
}

/**
 * `fuzzy` controls token-subset matching ("Lula" ⊂ "Luiz Inácio Lula da
 * Silva"). It must be OFF when ingesting names that are already canonical —
 * notably the migration, whose job is structural, not to re-run entity
 * resolution. Leaving it on there merged "Ciro Nogueira" into "Ciro", who is a
 * different politician; the parity gate caught it. The same hazard is latent
 * in canonicalize.mjs for live ingestion and needs its own fix.
 */
export function resolveCandidate(store, rawName, contest, party, { mint = true, fuzzy = true } = {}) {
  const key = `${contest}|${nameKey(rawName)}`;
  let cand = store._indexes.candidateByAlias.get(key);
  if (cand) return cand;
  if (fuzzy) {
    for (const c of store.candidates) {
      if (c.contest !== contest) continue;
      if (sameCandidate(c.canonical, rawName) || (c.aliases ?? []).some((a) => sameCandidate(a, rawName))) {
        c.aliases = [...new Set([...(c.aliases ?? []), String(rawName).trim()])];
        store._indexes.candidateByAlias.set(key, c);
        return c;
      }
    }
  }
  if (!mint) return null;
  const rec = {
    candidate_id: mintCandidateId(`candidate|${key}`),
    contest, canonical: String(rawName).trim(),
    aliases: [String(rawName).trim()], party: party ?? null, first_seen: today(),
  };
  store.candidates.push(rec);
  store._indexes.candidateByAlias.set(key, rec);
  store._report.minted.candidates++;
  return rec;
}

const DAY = 86_400_000;

/**
 * The resolution ladder. First hit wins; every input is RAW source data so
 * that a canonicalisation change cannot move a key.
 *   1. source native ref — the finest truth about what one record is, and the
 *      only key that is stable within a source. Deliberately ABOVE
 *      registration: 133 registrations cover more than one native record
 *      (one fieldwork operation, several offices filed separately), so
 *      registration is not a unique survey key.
 *   2. TSE registration  — the cross-source anchor; a Wikipedia row carries no
 *      native Poder360 id, so this is what unites them
 *   3. natural key       — institute + universe + ±3 days + roster ≥60%
 *   4. mint
 */
export function resolveSurvey(store, incoming) {
  const idx = store._indexes;

  for (const ref of incoming.source_refs ?? []) {
    if (ref.native_id == null) continue;
    const k = `${ref.source}:${ref.native_id}`;
    if (idx.byRef.has(k)) {
      store._report.matched.source_ref++;
      return { survey: idx.byRef.get(k), matched_by: "source_ref" };
    }
  }

  const reg = normalizeRegistration(incoming.tse_registration);
  if (reg && idx.byReg.has(reg)) {
    store._report.matched.registration++;
    return { survey: idx.byReg.get(reg), matched_by: "registration" };
  }

  const date = incoming.fieldwork_end ?? incoming.published_date;
  if (incoming.institute_id && date) {
    for (const s of store.surveys) {
      if (s.institute_id !== incoming.institute_id) continue;
      if ((s.universe?.uf ?? null) !== (incoming.universe?.uf ?? null)) continue;
      const sd = s.fieldwork_end ?? s.published_date;
      if (!sd || Math.abs(+new Date(sd) - +new Date(date)) > 3 * DAY) continue;
      if (!rosterOverlaps(idx.rosters.get(s.survey_id), incoming.roster)) continue;
      store._report.matched.natural++;
      return { survey: s, matched_by: "natural" };
    }
  }

  const seed = incoming.mint_seed
    ?? `survey|${reg ?? ""}|${(incoming.source_refs ?? []).map((r) => `${r.source}:${r.native_id}`).sort().join(",")}`
    ?? `survey|${incoming.institute_id}|${incoming.universe?.uf ?? "BR"}|${date}|${incoming.sample_size}`;
  const survey = {
    survey_id: mintSurveyId(seed),
    mint_seed: seed,
    legacy_ids: [],
    tse_registration: reg,
    tse_registration_status: reg ? "claimed_unverified" : "none",
    institute_id: incoming.institute_id,
    institute_names_raw: incoming.institute_names_raw ?? [],
    contractor_raw: null, universe: incoming.universe ?? { level: "nacional", uf: null },
    fieldwork_start: null, fieldwork_end: null, published_date: null,
    sample_size: null, margin_of_error: null, confidence_level: null,
    methodology: null, cost_brl: null, statistician: null, cnpj: null,
    electoral_cycle: incoming.electoral_cycle ?? 2026,
    pre_electoral: incoming.pre_electoral ?? false,
    source_refs: [], integra_url: null, article_url: null,
    crosstabs_status: "pending", crosstabs_unavailable_reason: null,
    retracted: null,
    provenance: { created_at: today(), updated_at: today(), field_sources: {} },
  };
  store.surveys.push(survey);
  idx.surveyById.set(survey.survey_id, survey);
  if (reg) idx.byReg.set(reg, survey);
  store._report.minted.surveys++;
  return { survey, matched_by: "minted" };
}

function rosterOverlaps(stored, incoming) {
  if (!stored?.size || !incoming?.length) return true; // no roster to judge on
  let hits = 0;
  for (const name of incoming) {
    for (const s of stored) {
      if (sameCandidate(s, name)) { hits++; break; }
    }
  }
  return hits / incoming.length >= 0.6;
}

export function resolveQuestion(store, survey, incoming) {
  const existing = store._indexes.questionsBySurvey.get(survey.survey_id) ?? [];
  for (const ref of incoming.source_refs ?? []) {
    const k = `${ref.source}:${ref.native_id}`;
    const hit = existing.find((q) => (q.source_refs ?? []).some((r) => `${r.source}:${r.native_id}` === k));
    if (hit) return { question: hit, matched_by: "source_ref" };
  }
  const roster = (incoming.results ?? []).map((r) => r.name_raw ?? r.candidate);
  for (const q of existing) {
    if (q.race !== incoming.race || q.round !== incoming.round) continue;
    const stored = new Set((q.results ?? []).map((r) => r.name_raw ?? r.candidate));
    let hits = 0;
    for (const n of roster) { for (const s of stored) { if (sameCandidate(s, n)) { hits++; break; } } }
    if (roster.length && hits / roster.length >= 0.8) return { question: q, matched_by: "roster" };
  }
  const seed = incoming.mint_seed
    ?? `question|${survey.survey_id}|${incoming.race}|${incoming.round}|${incoming.scenario_ordinal ?? 0}|${roster.slice().sort().join(",")}`;
  const question = {
    question_id: mintQuestionId(seed), mint_seed: seed,
    survey_id: survey.survey_id, legacy_id: incoming.legacy_id ?? null,
    race: incoming.race, round: incoming.round, uf: incoming.uf ?? null,
    scenario_ordinal: incoming.scenario_ordinal ?? 0,
    scenario_label_raw: incoming.scenario_label_raw ?? null,
    stimulus: incoming.stimulus ?? null,
    is_headline: false,
    results: [], others_pct: null, undecided_pct: null, blank_null_pct: null,
    basis: "total", parse_warnings: incoming.parse_warnings ?? [],
    repaired: null, retracted: null,
    provenance: { created_at: today(), updated_at: today(), field_sources: {} },
  };
  store.questions.push(question);
  store._indexes.questionById.set(question.question_id, question);
  if (!store._indexes.questionsBySurvey.has(survey.survey_id)) {
    store._indexes.questionsBySurvey.set(survey.survey_id, []);
  }
  store._indexes.questionsBySurvey.get(survey.survey_id).push(question);
  store._report.minted.questions++;
  return { question, matched_by: "minted" };
}

const EMPTY = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length);

/** Fill empty fields; never overwrite; log every disagreement. */
export function fillFields(store, record, incoming, { source, runId, table, fields }) {
  for (const f of fields) {
    const inc = incoming[f];
    if (EMPTY(inc)) continue;
    const cur = record[f];
    if (EMPTY(cur)) {
      record[f] = inc;
      record.provenance.field_sources[f] = source;
      record.provenance.updated_at = today();
      store._report.filled++;
      continue;
    }
    if (JSON.stringify(cur) === JSON.stringify(inc)) continue;
    const locked = String(record.provenance.field_sources[f] ?? "").startsWith("repair:");
    logConflict(store, {
      run_id: runId, type: "field_disagreement", table,
      record_id: record[table === "surveys" ? "survey_id" : "question_id"],
      field: f, stored: cur, incoming: inc, source,
      severity: locked ? "locked_field" : "normal",
      note: locked ? "campo fixado por reparo curado — fonte discorda" : null,
    });
  }
}

export function logConflict(store, c) {
  const rec = {
    conflict_id: `k_${store.conflicts.length + 1}_${Date.now().toString(36)}`,
    at: new Date().toISOString(), ...c,
  };
  store.conflicts.push(rec);
  store._report.conflicts++;
  return rec;
}

export function addSourceRef(survey, ref) {
  survey.source_refs ??= [];
  const k = `${ref.source}:${ref.native_id}`;
  if (!survey.source_refs.some((r) => `${r.source}:${r.native_id}` === k)) {
    survey.source_refs.push({ ...ref, first_seen: ref.first_seen ?? today() });
  }
}

/**
 * The headline group key. Round 1 competes on the whole field, so one survey
 * yields ONE headline — that is what keepFullestRound1 used to accomplish by
 * deleting the alternates. Round 2 is different: each head-to-head pairing is
 * its own question, and every pairing must survive. Scoping the key by pairing
 * makes one rule serve both, and makes same-pairing duplicates resolvable by
 * `retracted` rather than by deletion.
 */
export function headlineGroupKey(q) {
  if (q.round !== 2) return `${q.survey_id}|${q.race}|${q.round}`;
  const pair = [...(q.results ?? [])]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)
    .map((r) => r.candidate_id)
    .sort()
    .join("+");
  return `${q.survey_id}|${q.race}|2|${pair}`;
}

/**
 * Promote exactly one question per headline group: the fullest roster. The
 * alternates are KEPT (unlike the old keepFullestRound1, which deleted them)
 * and simply not promoted.
 */
export function markHeadlines(store) {
  const groups = new Map();
  for (const q of store.questions) {
    if (q.retracted) continue;
    const k = headlineGroupKey(q);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(q);
  }
  for (const qs of groups.values()) {
    let best = qs[0];
    for (const q of qs) {
      const n = (q.results ?? []).length;
      const bn = (best.results ?? []).length;
      if (n > bn || (n === bn && String(q.question_id) < String(best.question_id))) best = q;
    }
    for (const q of qs) q.is_headline = q === best;
  }
}

export function writeStore(store, { dir = store.dir ?? DATA_DIR } = {}) {
  const counts = {};
  for (const [table, kind] of Object.entries(TABLES)) {
    counts[table] = writeNdjson(path.join(dir, `${table}.ndjson`), store[table] ?? [], kind, SORT[kind]);
  }
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(store.meta, null, 1) + "\n");
  return counts;
}

export function runReport(store) {
  return store._report;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
