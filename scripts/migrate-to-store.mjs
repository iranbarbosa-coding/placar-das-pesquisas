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
  emptyIndexes, TABLE_NAMES,
} from "./lib/store.mjs";
import { mintSurveyId, mintQuestionId, normalizeRegistration, contestKey } from "./lib/ids.mjs";
import { canonicalPartyAt } from "./lib/parties.mjs";
import { canonicalCandidate } from "./lib/candidates.mjs";
import { partyOverride } from "./lib/repairs.mjs";
import { validateStore } from "./validate-store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEGACY = path.join(ROOT, "data", "polls.json");

/**
 * Grouping key: ONE REGISTRATION = ONE SURVEY (creator, 2026-08-15).
 *
 * A TSE registration identifies a fieldwork operation, and 137 of them cover
 * more than one Poder360 record — because one operation legitimately polls
 * several offices (governor and senate on the same day, same sample) and
 * Poder360 files each office as its own record. Those are not two surveys;
 * they are one survey with several questions, which is what the schema is for.
 *
 * This was deliberately NOT done during the structural migration, so that a
 * behaviour change could not hide inside it. It is that deliberate change,
 * made on its own, with its own before/after diff — and it aligns the
 * migration with the upsert ladder, which puts registration above the natural
 * key. `scripts/upsert-vs-migration.mjs` holds the two to the same answer.
 *
 * The registration now outranks the source's record boundary. Where rows of
 * one registration disagree on a hoisted field, `pick()` logs it rather than
 * silently choosing — that log is how the 7 registrations with contradictory
 * fieldwork dates surface.
 */
function surveyGroupKey(p, regCohort) {
  const reg = normalizeRegistration(p.tse_registration);
  // One registration is one survey — UNLESS the rows filed under it contradict
  // each other on when the fieldwork happened. A registration covering
  // governor and senate on the same day is one operation; one covering dates
  // four months apart is a source defect, and merging it would invent a survey
  // that never took place and hand it a single fabricated date. Those rows stay
  // separate and are logged for review.
  if (reg && regCohort.get(reg) !== "contraditorio") return `reg:${reg}`;
  const m = /^p360-(\d+)-/.exec(p.id ?? "");
  if (m) return `p360:${m[1]}`;
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

function main({ runDate = today(), dir = DATA_DIR, quiet = false, allowDerived = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const legacy = JSON.parse(fs.readFileSync(LEGACY, "utf-8"));
  // MIGRAR A PARTIR DO ARQUIVO DERIVADO PERDE DADOS, EM SILÊNCIO.
  //
  // `derive-polls.mjs` escreve uma PROJEÇÃO: só as perguntas headline, e sem
  // os campos crus (`name_raw`, `party_raw`). Remigrar a partir dela descarta
  // as perguntas alternativas e apaga o que a fonte tinha dito — cada rodada
  // erodindo um pouco mais. A entrada legítima é sempre a saída fresca do
  // coletor.
  // `allowDerived` exists for `idempotence-check.mjs`, which runs this twice
  // into scratch directories and compares the two outputs. Feeding it a
  // projection loses nothing there — both runs get the same input and the real
  // store is never touched — and refusing would silently disable the check,
  // which is what happened the first time this guard went in.
  if (legacy.derived_from_store && !allowDerived) {
    console.error("RECUSADO: data/polls.json é a projeção do store, não a saída do coletor.");
    console.error("Migrar a partir dela perde as perguntas não-headline e os campos crus.");
    console.error("Rode `node scripts/scrape.mjs` antes, ou use o store que já existe.");
    process.exit(1);
  }
  const polls = legacy.polls;
  log(`lendo ${polls.length} linhas de data/polls.json`);

  // Whatever we already hold. This rebuild replaces the CONTENT of every table,
  // but a record's "first seen" date is not content — re-deriving it from the
  // wall clock turned "when we first saw this" into "when the script last ran",
  // and rewrote all 4.613 rows on any run after the first day.
  const prior = priorStamps(readStore({ dir }));

  // Start from an empty store so the migration is a pure function of the input.
  const store = readStore({ dir, tables: [], runDate, prior });
  // A lista e os índices vazios moram em `lib/store.mjs`. Estavam copiados aqui
  // e em `lib/build-store.mjs`, e uma tabela nova que alguém esqueça de somar a
  // uma das cópias fica de fora sem erro nenhum.
  for (const t of TABLE_NAMES) store[t] = [];
  store._indexes = emptyIndexes();

  // Which registrations hold rows that contradict each other on fieldwork end.
  // ±3 days of slack, because sources round the last day of a window.
  const DAY = 86_400_000;
  const datesByReg = new Map();
  for (const p of polls) {
    const reg = normalizeRegistration(p.tse_registration);
    const d = p.fieldwork_end ?? p.published_date;
    if (!reg || !d) continue;
    if (!datesByReg.has(reg)) datesByReg.set(reg, new Set());
    datesByReg.get(reg).add(d);
  }
  const regCohort = new Map();
  const contraditorios = [];
  for (const [reg, ds] of datesByReg) {
    const sorted = [...ds].sort();
    const spread = +new Date(sorted[sorted.length - 1]) - +new Date(sorted[0]);
    if (spread > 3 * DAY) {
      regCohort.set(reg, "contraditorio");
      contraditorios.push({ reg, datas: sorted, dias: Math.round(spread / DAY) });
    }
  }
  if (contraditorios.length) {
    console.warn(`\nAVISO: ${contraditorios.length} registro(s) TSE com datas de campo contraditórias — NÃO unificados, ficam para revisão:`);
    for (const c of contraditorios) console.warn(`  ${c.reg}: ${c.datas.join(" × ")} (${c.dias} dias)`);
  }

  const groups = new Map();
  for (const p of polls) {
    const k = surveyGroupKey(p, regCohort);
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
      // Ordenados: a ordem vinha da posição no arquivo, e o coletor ordena por
      // data sem desempate total — então empates saíam trocados entre execuções
      // e 504 levantamentos apareciam no diff a cada rodada, sem nada ter mudado.
      legacy_ids: rows.map((r) => r.id).sort(),
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
      integra_url: pick(rows, "integra_url", key) ?? null,
      article_url: pick(rows, "source_url", key) ?? null,
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
        // Identidade decidida na tabela curada; name_raw guarda o que a fonte disse.
        const nome = canonicalCandidate(r.candidate, contest);
        const c = resolveCandidate(store, nome, contest, party, { fuzzy: false });
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
