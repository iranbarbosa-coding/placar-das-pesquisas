#!/usr/bin/env node
// One-time migration: data/polls.json → the NDJSON store.
//
// Idempotent and re-runnable by construction — ids are minted deterministically
// from recorded seeds, so this can be run as many times as it takes to chase
// parity diffs and produce a byte-identical store each time.
//
// DEVIATION FROM THE PLAN, recorded deliberately: the plan called for seeding
// the alias tables from a fresh raw scrape, because polls.json holds names that
// have already been canonicalised. This migration seeds from polls.json alone.
// Parity does not need raw names (the projection back out reproduces exactly
// what polls.json holds), and Phase 3 accumulates raw aliases naturally: when
// the rewritten scraper ingests a raw name, resolveCandidate/resolveInstitute
// match it to the existing record and append it as an alias. Seeding from a
// scrape taken at a different moment than the file would have risked a
// mismatch for no parity benefit.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  readStore, writeStore, resolveInstitute, resolveCandidate,
  markHeadlines, priorStamps, firstSeenFor, provenanceFor, today, DATA_DIR,
} from "./lib/store.mjs";
import { mintSurveyId, mintQuestionId, normalizeRegistration, contestKey } from "./lib/ids.mjs";
import { canonicalPartyAt } from "./lib/parties.mjs";
import { partyOverride } from "./lib/repairs.mjs";
import { validateStore } from "./validate-store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEGACY = path.join(ROOT, "data", "polls.json");

/**
 * Grouping key, finest source truth first.
 *
 * A TSE registration is NOT a unique survey key: 133 registrations cover more
 * than one Poder360 record, because one registration legitimately covers a
 * single fieldwork operation across several offices, and Poder360 files each
 * as its own record. Grouping by registration would therefore merge two
 * round-1 governor questions into one survey, where only one can be headline —
 * silently dropping a poll from the averages relative to polls.json.
 *
 * Merging those siblings may well be the better model, but it is a BEHAVIOUR
 * change and must not ride along with a structural migration: it would be
 * indistinguishable from a migration bug. So the source's own record boundary
 * wins here, the shared registration is recorded, and consolidating siblings
 * becomes a later, deliberate change with its own before/after diff.
 */
function surveyGroupKey(p) {
  const m = /^p360-(\d+)-/.exec(p.id ?? "");
  if (m) return `p360:${m[1]}`;
  const reg = normalizeRegistration(p.tse_registration);
  if (reg) return `reg:${reg}`;
  // No source-native id: the key must contain EVERY field the resulting survey
  // will share, or hoisting silently discards whichever value loses. A coarser
  // key (pollster|state|date|sample) merged distinct Wikipedia polls that
  // differ in margin of error and start date — the parity gate caught it.
  // Cross-source unification of genuinely-identical surveys is the scraper's
  // job later, through the registration and natural-key ladder.
  return [
    "nat", (p.pollster ?? "").toLowerCase().trim(), p.state ?? "BR",
    p.fieldwork_start ?? "-", p.fieldwork_end ?? "-", p.published_date ?? "-",
    p.sample_size ?? "-", p.margin_of_error ?? "-",
  ].join("|");
}

function main({ runDate = today(), dir = DATA_DIR, quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const legacy = JSON.parse(fs.readFileSync(LEGACY, "utf-8"));
  const polls = legacy.polls;
  log(`lendo ${polls.length} linhas de data/polls.json`);

  // Whatever we already hold. This rebuild replaces the CONTENT of every table,
  // but a record's "first seen" date is not content — re-deriving it from the
  // wall clock turned "when we first saw this" into "when the script last ran",
  // and rewrote all 4.613 rows on any run after the first day.
  const prior = priorStamps(readStore({ dir }));

  // Start from an empty store so the migration is a pure function of the input.
  const store = readStore({ dir, tables: [], runDate, prior });
  for (const t of ["surveys", "questions", "crosstabs", "institutes", "candidates", "registry", "searches", "conflicts"]) {
    store[t] = [];
  }
  store._indexes = {
    byReg: new Map(), byRef: new Map(), rosters: new Map(), surveyById: new Map(),
    questionById: new Map(), questionsBySurvey: new Map(),
    instituteByAlias: new Map(), candidateByAlias: new Map(),
  };

  const groups = new Map();
  for (const p of polls) {
    const k = surveyGroupKey(p);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  log(`agrupadas em ${groups.size} levantamentos`);

  // Hoisting a field to survey level must never silently discard a competing
  // value: if rows of one group disagree, that is a grouping bug and is logged.
  const disagreements = [];
  const pick = (rows, field, groupKey) => {
    const vals = [...new Set(rows.map((r) => r[field]).filter((v) => v !== null && v !== undefined && v !== ""))];
    if (vals.length > 1) disagreements.push({ groupKey, field, values: vals });
    return vals[0];
  };

  for (const [key, rows] of [...groups.entries()].sort()) {
    const first = rows[0];
    const inst = resolveInstitute(store, first.pollster);
    const reg = normalizeRegistration(pick(rows, "tse_registration", key));
    const seed = `survey|${key}`;
    const survey_id = mintSurveyId(seed);
    const survey = {
      survey_id,
      mint_seed: seed,
      legacy_ids: rows.map((r) => r.id),
      tse_registration: reg,
      tse_registration_status: reg ? "claimed_unverified" : "none",
      institute_id: inst.institute_id,
      institute_names_raw: [...new Set(rows.map((r) => r.pollster))],
      contractor_raw: pick(rows, "contractor", key) ?? null,
      universe: { level: first.state ? "uf" : "nacional", uf: first.state ?? null },
      fieldwork_start: pick(rows, "fieldwork_start", key) ?? null,
      fieldwork_end: pick(rows, "fieldwork_end", key) ?? null,
      published_date: pick(rows, "published_date", key) ?? null,
      sample_size: pick(rows, "sample_size", key) ?? null,
      margin_of_error: pick(rows, "margin_of_error", key) ?? null,
      confidence_level: null, methodology: null, cost_brl: null,
      statistician: null, cnpj: null,
      electoral_cycle: 2026,
      pre_electoral: ((pick(rows, "fieldwork_end", key) ?? pick(rows, "published_date", key) ?? "") < "2026-01-01"),
      source_refs: [...new Set(rows.map((r) => r.source))].map((s) => {
        const m = /^p360-(\d+)-/.exec(rows.find((r) => r.source === s)?.id ?? "");
        const native_id = m ? m[1] : null;
        return {
          source: s, native_id,
          url: rows.find((r) => r.source === s)?.source_url ?? null,
          first_seen: firstSeenFor(store, "sourceRefs", `${survey_id}|${s}:${native_id}`),
        };
      }),
      integra_url: null, article_url: pick(rows, "source_url", key) ?? null,
      crosstabs_status: "pending", crosstabs_unavailable_reason: null,
      retracted: null,
      provenance: provenanceFor(store, "surveys", survey_id),
    };
    store.surveys.push(survey);
    if (reg) store._indexes.byReg.set(reg, survey);

    // questions: one per legacy row, ordinal by stable ordering within the survey
    const ordered = [...rows].sort((a, b) =>
      String(a.race).localeCompare(String(b.race)) || a.round - b.round ||
      String(a.scenario ?? "").localeCompare(String(b.scenario ?? "")) || String(a.id).localeCompare(String(b.id)));
    ordered.forEach((p, i) => {
      const contest = contestKey(p.race, p.state);
      const results = (p.results ?? []).map((r) => {
        // fuzzy: false — polls.json names are already canonical; re-running
        // entity resolution here would silently re-cluster them.
        // The party LABEL is unified here (PSOL/Psol/psol, UNIÃO/União Brasil,
        // Missão/Mission); `party_raw` keeps exactly what the source said, so
        // normalising is never lossy and can be revisited.
        // A curated repair outranks normalisation: it cites the institute's own report.
        const ov = partyOverride(p, r.candidate);
        const party = ov.has ? ov.party : canonicalPartyAt(r.party, p.fieldwork_end ?? p.published_date ?? null);
        const c = resolveCandidate(store, r.candidate, contest, party, { fuzzy: false });
        return { candidate_id: c.candidate_id, name_raw: r.candidate, party_raw: r.party ?? null, party, pct: r.pct };
      });
      const qseed = `question|${survey.survey_id}|${p.id}`;
      const question_id = mintQuestionId(qseed);
      store.questions.push({
        question_id, mint_seed: qseed,
        survey_id: survey.survey_id, legacy_id: p.id,
        race: p.race, round: p.round, uf: p.state ?? null,
        scenario_ordinal: i, scenario_label_raw: p.scenario ?? null,
        stimulus: null, is_headline: false,
        results,
        others_pct: p.others_pct ?? null,
        undecided_pct: p.undecided_pct ?? null,
        blank_null_pct: p.blank_null_pct ?? null,
        basis: "total",
        parse_warnings: p.parse_warnings ? [p.parse_warnings] : [],
        repaired: p.repaired ?? null, retracted: null,
        provenance: provenanceFor(store, "questions", question_id),
      });
    });
  }

  if (disagreements.length && !quiet) {
    console.warn(`\nAVISO: ${disagreements.length} desacordo(s) de campo dentro de um mesmo grupo — chave de agrupamento grosseira demais:`);
    for (const d of disagreements.slice(0, 8)) console.warn(`  ${d.groupKey} · ${d.field}: ${JSON.stringify(d.values)}`);
  }

  markHeadlines(store);

  // Record registrations shared by several surveys. Not an error — it is the
  // worklist for the later consolidation change described in surveyGroupKey.
  const byReg = new Map();
  for (const s of store.surveys) {
    if (!s.tse_registration) continue;
    if (!byReg.has(s.tse_registration)) byReg.set(s.tse_registration, []);
    byReg.get(s.tse_registration).push(s.survey_id);
  }
  let shared = 0;
  for (const [reg, ids] of byReg) {
    if (ids.length < 2) continue;
    shared++;
    const conflict_id = `k_reg_${reg.replace(/[^A-Z0-9]/g, "")}`;
    store.conflicts.push({
      conflict_id,
      at: firstSeenFor(store, "conflicts", conflict_id), run_id: "migration", type: "registration_shared_by_surveys",
      table: "surveys", record_id: ids[0], field: "tse_registration",
      stored: reg, incoming: ids, source: "migration", severity: "review",
      note: "um registro TSE cobre vários levantamentos nativos da fonte; consolidar é mudança de comportamento, a fazer em separado",
    });
  }
  log(`registros TSE compartilhados por >1 levantamento: ${shared} (anotados em conflicts.ndjson)`);

  // `migrated_at` is the ONE field allowed to carry a wall-clock reading: it
  // records when the rebuild ran, which is exactly what it should mean, and it
  // is a single line in meta.json rather than a stamp on 4.613 records.
  store.meta = {
    generated_at: legacy.generated_at ?? new Date().toISOString(),
    schema_version: 1,
    sources: legacy.sources ?? [],
    migrated_from: "data/polls.json",
    migrated_at: new Date().toISOString(),
  };

  const { errors, warn } = validateStore(store, { minSurveys: 500, minQuestions: 2000 });
  if (!quiet) for (const w of warn.slice(0, 10)) console.warn(`AVISO: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERRO: ${e}`);
    console.error(`\nmigração abortada: ${errors.length} erro(s) de validação — nada foi gravado`);
    process.exit(1);
  }

  const counts = writeStore(store, { dir });
  log(`\ngravado: ${counts.surveys} levantamentos · ${counts.questions} perguntas · ` +
    `${counts.institutes} institutos · ${counts.candidates} candidatos`);
  const headline = store.questions.filter((q) => q.is_headline).length;
  log(`perguntas headline: ${headline} (linhas originais: ${polls.length})`);
  return store;
}

export { main as migrate };

// `--run-date=YYYY-MM-DD` injects the clock; `--dir=` writes elsewhere. Both
// exist so the idempotence guard can rebuild twice, on two different dates,
// into scratch directories without touching data/.
if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (name) => process.argv.find((a) => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
  main({ runDate: arg("run-date") ?? today(), dir: arg("dir") ?? DATA_DIR });
}
