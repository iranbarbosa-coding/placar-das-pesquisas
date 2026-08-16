// Build the store from a flat poll list, through the RESOLUTION LADDER.
//
// This is the Phase-3 write path: the scraper calls it, and so does
// `idempotence-check.mjs`. It lives here rather than inside `scrape.mjs`
// precisely so there is ONE implementation. The alternative — the scraper
// doing it inline and the guard driving `migrate-to-store.mjs` — would leave
// the guard proving a property of code the pipeline no longer runs, which is
// the shape of defect this repo keeps finding (a battery that never tested
// path resolvability; a cross-check that TypeError'd and reported agreement).
//
// THE STORE IS REBUILT FROM SCRATCH, never accumulated. That is what keeps the
// output a pure function of the scrape: a record that disappears from the
// sources disappears here, and re-running over the same input gives the same
// file byte for byte. `priorStamps` carries forward the "first seen" dates,
// which are the only thing that cannot be re-derived from the input.
//
// It carries them BY ID, so it carries nothing across a change to how ids are
// minted. On the switchover run itself (2026-08-16) not one survey or question
// id survived, so every `created_at` was reset to that day and the earlier
// first-seen history was lost — the claim above held for every run except the
// one that changed the id space. That is a one-time cost of switching paths,
// not a recurring one, and `idempotence-check.mjs` is what proves it does not
// recur. Anything that re-seeds an id pays it again.
//
// ORDER MATTERS. Upsert is first-writer-wins, so ingestion follows source
// priority (poder360 → eleicaoemdados → wikipedia). Parallelising it silently
// changes which source wins a disagreement.
import {
  readStore, writeStore, markHeadlines, priorStamps, DATA_DIR, SOURCE_ORDER,
} from "./store.mjs";
import { upsertPoll } from "./upsert.mjs";

const TABLES = ["surveys", "questions", "crosstabs", "institutes", "candidates", "registry", "searches", "conflicts"];

/**
 * @param {Array} polls  normalised flat polls, as `scrape.mjs` produces them
 * @param {{runDate: string, dir?: string, meta?: object}} opts
 * @returns {{store: object, report: object}}  the store, UNWRITTEN
 */
export function buildStoreFromPolls(polls, { runDate, dir = DATA_DIR, meta = {} } = {}) {
  const previous = readStore({ dir });
  const prior = priorStamps(previous);
  const store = readStore({ dir, tables: [], runDate, prior });
  for (const t of TABLES) store[t] = [];
  store._indexes = {
    byReg: new Map(), byRef: new Map(), surveyById: new Map(),
    questionById: new Map(), questionsBySurvey: new Map(),
    instituteByAlias: new Map(), candidateByAlias: new Map(),
  };

  const rank = (s) => { const i = SOURCE_ORDER.indexOf(s); return i === -1 ? SOURCE_ORDER.length : i; };
  const ordered = [...polls].sort((a, b) =>
    rank(a.source) - rank(b.source) ||
    (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? "") ||
    String(a.id).localeCompare(String(b.id)));

  const nativeOf = (p) => /^p360-(\d+)-/.exec(p.id ?? "")?.[1] ?? null;
  const report = {};
  for (const p of ordered) {
    const { matched_by } = upsertPoll(store, p, { source: p.source, runId: runDate, nativeId: nativeOf(p) });
    report[matched_by] = (report[matched_by] ?? 0) + 1;
  }
  markHeadlines(store);
  settleProvenance(store, previous, runDate);
  store.meta = { schema_version: 1, ...meta };
  return { store, report };
}

/**
 * `updated_at` must mean "when this record's content last changed" — not "when
 * the script last ran".
 *
 * `fillFields` stamps `updated_at` with the run date every time it fills a
 * field, which is right for an incremental update and wrong for a rebuild:
 * rebuilding from scratch fills EVERY field of EVERY record, so a run on a new
 * date re-dated the lot. Measured on the switchover: 2.954 questions rewritten
 * with nothing but the stamp differing. That is precisely the churn NDJSON was
 * chosen to avoid — it destroys the three-line reviewable bot commit and makes
 * "re-run and diff" useless, because real change becomes indistinguishable
 * from calendar change.
 *
 * So the run date is kept only where the content actually moved. Comparison is
 * on the record MINUS its provenance, since provenance is the thing being
 * decided; an unchanged record gets its previous provenance back wholesale,
 * `field_sources` included. A genuinely new record keeps the run date it was
 * built with, which is correct — that is the day we first saw it.
 */
function settleProvenance(store, previous, runDate) {
  // Key order must NOT count as a difference. The stored record comes back from
  // NDJSON in the writer's field order while the in-memory one is in insertion
  // order, so a plain JSON.stringify reports every record as changed — which is
  // exactly what it did on the first attempt, leaving the churn in place while
  // looking like the fix had been applied.
  const canon = (v) => {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
    }
    return v;
  };
  const content = (r) => { const { provenance, ...rest } = r; return JSON.stringify(canon(rest)); };
  for (const [table, idField] of [["surveys", "survey_id"], ["questions", "question_id"]]) {
    const before = new Map((previous[table] ?? []).map((r) => [r[idField], r]));
    for (const rec of store[table] ?? []) {
      const old = before.get(rec[idField]);
      if (!old) continue;                                  // novo: fica com runDate
      if (content(old) !== content(rec)) { rec.provenance.updated_at = runDate; continue; }
      if (old.provenance) rec.provenance = old.provenance; // inalterado: devolve as datas
    }
  }
}

/** Build and write, in one call. Returns the row counts per table. */
export function writeStoreFromPolls(polls, opts = {}) {
  const { store, report } = buildStoreFromPolls(polls, opts);
  return { counts: writeStore(store, { dir: opts.dir ?? DATA_DIR }), store, report };
}
