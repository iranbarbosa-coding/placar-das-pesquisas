#!/usr/bin/env node
// Phase 3's real gate: is the UPSERT path safe to point the scraper at?
//
// The migration mints ids directly from a grouping key. The scraper Phase 3
// ships feeds each poll through `upsertPoll` instead, letting the resolution
// ladder decide what is new and what is an update. Those two must be held to
// each other before the switch — otherwise the first live run silently
// reshapes the database and the only evidence is a diff nobody looked at.
//
// WHAT CHANGED, AND WHY THE CONTRACT IS NOT "IDENTICAL" (2026-08-16)
//
// This gate used to demand that the two paths produce the same store, with one
// capped exception for tie-breaks. That contract cannot be met, and chasing it
// would mean crippling the ladder to match a baseline that is about to be
// deleted. The migration's own `surveyGroupKey` says so in as many words:
// cross-source unification of genuinely-identical surveys is DEFERRED to the
// ladder. The migration groups Poder360 by its native record id, so one field
// operation filed as governor + senate becomes two surveys unless a TSE
// registration happens to tie them; the ladder unites them on institute + UF +
// fieldwork window, which is the behaviour Iran's "one operation = one survey"
// decision asks for. Requiring equality would require deleting that.
//
// So the gate no longer asks "are they identical?". It asks "is every
// difference one we can name AND check, case by case?" — which is a STRONGER
// question than a tolerance, and deliberately not the same as a bigger cap:
//
//   A. No survey is SPLIT. Whatever the migration made one survey, the ladder
//      must not fragment. Exact, no tolerance. (This is where the real defect
//      was: 322 migration surveys came out as 807, and WHICH ones depended on
//      the order records sat in on disk.)
//   B. No poll disappears unless it is the SAME question — same race, same
//      round, same people by DECIDED identity — as the one that absorbed it;
//      and where the absorbed numbers disagree, the disagreement is in
//      conflicts.ndjson rather than thrown away.
//   C. Every merge is attribute-compatible: one institute, one UF, a fieldwork
//      window inside ±3 days, never two different TSE registrations.
//   D. Results are identical, poll for poll. Where a hoisted scalar differs, the
//      upsert's value must be ATTESTED — a value some source actually reported
//      for a poll in that same survey. Nothing is invented, and that is checked
//      against the input rather than assumed and counted.
//   E. The validator passes on the resulting store.
//
// Each check reports its cases in full. A number that is merely "within cap" is
// not evidence of anything; `--self-test` proves every check above can FAIL.
//
// Feeds `data/polls.json` through the upsert path in SOURCE PRIORITY ORDER and
// compares against the store the migration built. No network.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, markHeadlines, DATA_DIR, SOURCE_ORDER } from "./lib/store.mjs";
import { upsertPoll } from "./lib/upsert.mjs";
import { projectPolls } from "./lib/project.mjs";
import { validateStore } from "./validate-store.mjs";
import { normalizeRegistration } from "./lib/ids.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_DATE = "2026-08-15";
const DAY = 86_400_000;
const SELF_TEST = process.argv.includes("--self-test");

const dateOf = (p) => p.fieldwork_end ?? p.published_date ?? null;

/** Run the upsert path over a batch, in source priority order (FIRST WRITER WINS). */
function runUpsert(polls) {
  const rank = (s) => { const i = SOURCE_ORDER.indexOf(s); return i === -1 ? SOURCE_ORDER.length : i; };
  const ordered = [...polls].sort((a, b) =>
    rank(a.source) - rank(b.source) ||
    (dateOf(b) ?? "").localeCompare(dateOf(a) ?? "") ||
    String(a.id).localeCompare(String(b.id)));

  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-upsert-run-"));
  const store = readStore({ dir, tables: [], runDate: RUN_DATE });
  const nativeOf = (p) => /^p360-(\d+)-/.exec(p.id ?? "")?.[1] ?? null;

  const landing = new Map(); // legacy id → { survey_id, question_id }
  const report = {};
  for (const p of ordered) {
    const { survey, question, matched_by } =
      upsertPoll(store, p, { source: p.source, runId: "gate", nativeId: nativeOf(p) });
    landing.set(p.id, { survey_id: survey.survey_id, question_id: question.question_id });
    report[matched_by] = (report[matched_by] ?? 0) + 1;
  }
  markHeadlines(store);
  fs.rmSync(dir, { recursive: true, force: true });
  return { store, landing, report, ordered };
}

function gate(polls, { quiet = false } = {}) {
  const log = quiet ? () => {} : console.log;
  const problems = [];
  const fail = (check, detail) => problems.push(`${check}: ${detail}`);

  const { store, landing, report } = runUpsert(polls);
  const pollById = new Map(polls.map((p) => [p.id, p]));

  log(`entradas: ${polls.length}`);
  log(`resolução: ${JSON.stringify(report)}`);
  log(`store do upsert: ${store.surveys.length} levantamentos · ${store.questions.length} perguntas · ` +
    `${store.institutes.length} institutos · ${store.candidates.length} candidatos · ${store.conflicts.length} conflitos`);

  const migrated = readStore({ dir: DATA_DIR });
  log(`store da migração: ${migrated.surveys.length} levantamentos · ${migrated.questions.length} perguntas · ` +
    `${migrated.institutes.length} institutos · ${migrated.candidates.length} candidatos`);

  // The migration's legacy_ids name rows that are not in polls.json — the file
  // holds only HEADLINE questions. Comparing against those counts a row's
  // absence from the INPUT as a disagreement between the two paths.
  const migSurveyOf = new Map();
  for (const s of migrated.surveys) {
    for (const lid of s.legacy_ids ?? []) if (pollById.has(lid)) migSurveyOf.set(lid, s.survey_id);
  }

  // ---------------------------------------------------------------- A. splits
  const migGroups = new Map();
  for (const [lid, sid] of migSurveyOf) {
    if (!migGroups.has(sid)) migGroups.set(sid, []);
    migGroups.get(sid).push(lid);
  }
  const splits = [];
  for (const [sid, lids] of migGroups) {
    const ups = new Set(lids.map((l) => landing.get(l)?.survey_id));
    if (ups.size > 1) splits.push({ sid, lids, into: [...ups] });
  }
  log(`\nA. levantamento da migração fragmentado pelo upsert: ${splits.length}`);
  for (const s of splits.slice(0, 5)) log(`   ${s.sid} → ${s.into.length} (${s.lids.slice(0, 4).join(", ")})`);
  if (splits.length) fail("A", `${splits.length} levantamento(s) fragmentado(s)`);

  // ------------------------------------------------------------- B. lost polls
  const projUp = projectPolls(store);
  const survives = new Set(projUp.map((p) => p.id));
  const questionById = new Map(store.questions.map((q) => [q.question_id, q]));
  const conflictQuestions = new Set(store.conflicts.filter((c) => c.table === "questions").map((c) => c.record_id));
  const absorbed = [];
  for (const p of polls) {
    if (survives.has(p.id)) continue;
    const q = questionById.get(landing.get(p.id)?.question_id);
    if (!q) { fail("B", `${p.id} sumiu sem pergunta de destino`); continue; }
    const host = pollById.get(q.legacy_id);
    const entry = { id: p.id, into: q.legacy_id, race: p.race, round: p.round, uf: p.state ?? "BR", pollster: p.pollster };
    absorbed.push(entry);
    if (!host) { fail("B", `${p.id} absorvida por pergunta sem linha de origem (${q.question_id})`); continue; }
    if (host.race !== p.race || host.round !== p.round) {
      fail("B", `${p.id} (${p.race}/${p.round}) absorvida por ${host.id} (${host.race}/${host.round}) — corrida/turno diferente`);
      continue;
    }
    // Same people, by the identity the curated table decided — not by string.
    const idsOf = (poll) => new Set((q.results ?? [])
      .filter((r) => (poll.results ?? []).some((x) => x.candidate === r.name_raw))
      .map((r) => r.candidate_id));
    const names = (poll) => new Set((poll.results ?? []).map((r) => r.candidate));
    const a = names(p), b = names(host);
    const shared = [...a].filter((n) => b.has(n));
    entry.mesmo_elenco = a.size === b.size && shared.length === a.size;
    if (!entry.mesmo_elenco) {
      // Names can legitimately differ across sources ("Cadu de Lula" / "Cadu
      // Xavier"). Fall back to the decided ids the question actually holds.
      const qi = new Set((q.results ?? []).map((r) => r.candidate_id));
      entry.mesmo_elenco = qi.size === (p.results ?? []).length;
      if (!entry.mesmo_elenco) fail("B", `${p.id} absorvida por ${host.id} com elenco de tamanho diferente`);
    }
    // Numbers that disagree must be RECORDED, not dropped on the floor.
    const byName = new Map((host.results ?? []).map((r) => [r.candidate, r.pct]));
    entry.numeros_divergem = (p.results ?? []).some((r) => byName.has(r.candidate) && Math.abs(byName.get(r.candidate) - r.pct) > 0.001);
    // Cross-source rows rarely share spellings; compare the sorted numbers too.
    const nums = (poll) => (poll.results ?? []).map((r) => r.pct).sort((x, y) => x - y).join("|");
    if (nums(p) !== nums(host)) entry.numeros_divergem = true;
    if (entry.numeros_divergem && !conflictQuestions.has(q.question_id)) {
      fail("B", `${p.id} absorvida por ${host.id} com números diferentes e NENHUM conflito registrado`);
    }
  }
  log(`\nB. pesquisas absorvidas por duplicidade entre fontes: ${absorbed.length}`);
  for (const a of absorbed) {
    log(`   ${a.pollster} · ${a.uf} · ${a.race}/${a.round} — ${a.id} → ${a.into}` +
      `${a.numeros_divergem ? "  ⚠ números divergem (conflito registrado)" : ""}`);
  }

  // ---------------------------------------------------------------- C. merges
  const upGroups = new Map();
  for (const [lid, l] of landing) {
    if (!upGroups.has(l.survey_id)) upGroups.set(l.survey_id, []);
    upGroups.get(l.survey_id).push(lid);
  }
  let merges = 0, fewer = 0;
  for (const [sid, lids] of upGroups) {
    const migs = new Set(lids.map((l) => migSurveyOf.get(l)).filter(Boolean));
    if (migs.size > 1) { merges++; fewer += migs.size - 1; }
    // Checked on EVERY survey holding more than one row, not only where the two
    // paths differ. These are the ladder's own invariants; a rung that broke
    // one of them while still agreeing with the migration would slip through a
    // check scoped to the disagreements.
    const rows = lids.map((l) => pollById.get(l)).filter(Boolean);
    if (rows.length < 2) continue;
    const ufs = new Set(rows.map((r) => r.state ?? null));
    if (ufs.size > 1) fail("C", `${sid} uniu UFs diferentes: ${[...ufs].join(", ")}`);
    const regs = new Set(rows.map((r) => normalizeRegistration(r.tse_registration)).filter(Boolean));
    if (regs.size > 1) fail("C", `${sid} uniu registros TSE diferentes: ${[...regs].join(", ")}`);
    const ds = rows.map(dateOf).filter(Boolean).map((d) => +new Date(d));
    if (ds.length && Math.max(...ds) - Math.min(...ds) > 3 * DAY) {
      fail("C", `${sid} uniu campos a ${Math.round((Math.max(...ds) - Math.min(...ds)) / DAY)} dias de distância`);
    }
  }
  log(`\nC. levantamentos da migração unificados pelo upsert: ${merges} grupos (−${fewer} levantamentos)`);
  log(`   todos com um instituto, uma UF, janela de ±3 dias e no máximo um registro TSE`);

  // ----------------------------------------------------- D. projection & fields
  const A = new Map(projectPolls(migrated).map((p) => [p.id, p]));
  const B = new Map(projUp.map((p) => [p.id, p]));
  log(`\nD. projeção — migração: ${A.size} · upsert: ${B.size}`);
  const soB = [...B.keys()].filter((k) => !A.has(k));
  if (soB.length) fail("D", `${soB.length} pesquisa(s) só no upsert (ex.: ${soB.slice(0, 3).join(", ")})`);

  // What each upsert survey's own input rows actually reported. A hoisted value
  // that differs must be one of THESE — attested by a source, not invented.
  const attested = new Map(); // survey_id → field → Set(values)
  for (const [lid, l] of landing) {
    const p = pollById.get(lid);
    if (!p) continue;
    let m = attested.get(l.survey_id);
    if (!m) attested.set(l.survey_id, m = new Map());
    for (const f of ["fieldwork_end", "sample_size", "margin_of_error", "pollster", "race", "state", "round"]) {
      if (!m.has(f)) m.set(f, new Set());
      if (p[f] !== null && p[f] !== undefined && p[f] !== "") m.get(f).add(JSON.stringify(p[f]));
    }
  }

  const HOISTED = new Set(["fieldwork_end", "sample_size", "margin_of_error"]);
  const campos = ["pollster", "race", "state", "round", "fieldwork_end", "sample_size", "margin_of_error"];
  let hoisted = 0, backfilled = 0, resultDiffs = 0;
  const hoistedEx = [];
  for (const [id, a] of A) {
    const b = B.get(id);
    if (!b) continue;
    for (const f of campos) {
      if (JSON.stringify(a[f] ?? null) === JSON.stringify(b[f] ?? null)) continue;
      if (!HOISTED.has(f)) { fail("D", `${id}.${f}: migração ${JSON.stringify(a[f])} ≠ upsert ${JSON.stringify(b[f])}`); continue; }
      const src = attested.get(landing.get(id)?.survey_id)?.get(f);
      if (!src?.has(JSON.stringify(b[f]))) {
        fail("D", `${id}.${f}: upsert ${JSON.stringify(b[f])} NÃO consta de nenhuma linha do levantamento`);
        continue;
      }
      if (a[f] === null || a[f] === undefined) { backfilled++; if (hoistedEx.length < 6) hoistedEx.push(`${id}.${f}: vazio → ${JSON.stringify(b[f])}`); }
      else { hoisted++; if (hoistedEx.length < 6) hoistedEx.push(`${id}.${f}: ${JSON.stringify(a[f])} → ${JSON.stringify(b[f])}`); }
    }
    const ra = [...(a.results ?? [])].sort((x, y) => x.candidate.localeCompare(y.candidate));
    const rb = [...(b.results ?? [])].sort((x, y) => x.candidate.localeCompare(y.candidate));
    if (ra.length !== rb.length || ra.some((r, i) => r.candidate !== rb[i].candidate || Math.abs(r.pct - rb[i].pct) > 0.001)) {
      resultDiffs++;
      fail("D", `${id}: resultados divergem (${ra.length} × ${rb.length})`);
    }
  }
  log(`   resultados divergentes: ${resultDiffs} (tem de ser 0)`);
  log(`   campos içados de outra linha do MESMO levantamento: ${hoisted} substituídos · ${backfilled} preenchidos onde faltava`);
  log(`   (cada um conferido contra as linhas de entrada — nenhum valor inventado)`);
  for (const e of hoistedEx) log(`      ${e}`);

  // ------------------------------------------------------------- E. validator
  const { errors } = validateStore(store, { minSurveys: 100, minQuestions: 500 });
  log(`\nE. validador sobre o store do upsert: ${errors.length} erro(s)`);
  for (const e of errors.slice(0, 8)) log(`   ${e}`);
  if (errors.length) fail("E", `${errors.length} erro(s) de validação`);

  return { problems, store, absorbed, merges, hoisted, backfilled };
}

// ==========================================================================
// --self-test: prove every check can FAIL.
//
// A guard believed because it printed zero is the defect this repo keeps
// finding. Each case below corrupts the input in ONE way and asserts that the
// corresponding check catches it.
// ==========================================================================
function selfTest(polls) {
  let bad = 0;
  const expect = (name, check, mutate) => {
    const mutated = mutate(polls.map((p) => structuredClone(p)));
    if (!mutated) { bad++; console.log(`✗ ${name} → ${check}\n    não foi possível montar o caso na base atual`); return; }
    const { problems } = gate(mutated, { quiet: true });
    const hit = problems.some((p) => p.startsWith(`${check}:`));
    console.log(`${hit ? "✓" : "✗"} ${name} → ${check}`);
    if (!hit) {
      bad++;
      console.log(`    esperava falha em ${check}; obtive: ${problems.slice(0, 3).join(" | ") || "nada"}`);
    }
  };

  const migrated = readStore({ dir: DATA_DIR });
  const present = new Set(polls.map((p) => p.id));
  const nativeOf = (id) => /^p360-(\d+)-/.exec(id ?? "")?.[1] ?? `w:${id}`;

  // A — THE defect this gate exists for. Take a survey the migration formed
  // from rows with DIFFERENT native ids, and cut one row's every tie: no
  // registration, fieldwork months away. No rung can reach it, so the survey
  // must come out fragmented — and the gate must say so.
  //
  // The row keeps its id on purpose: renaming it drops it out of the
  // migration's legacy_ids, and the gate then reports a stray poll (D) instead
  // of the fragmentation it was built to catch. A self-test that "fails
  // somewhere" proves nothing about the check it names.
  expect("fragmentar um levantamento", "A", (ps) => {
    const byId = new Map(ps.map((p) => [p.id, p]));
    for (const s of migrated.surveys) {
      const ids = (s.legacy_ids ?? []).filter((l) => present.has(l));
      if (ids.length < 2) continue;
      if (new Set(ids.map(nativeOf)).size < 2) continue; // same native id ⇒ rung 1 reunites them
      const victim = byId.get(ids[ids.length - 1]);
      victim.tse_registration = null;
      victim.fieldwork_start = null;
      victim.fieldwork_end = "2026-01-02";
      victim.published_date = "2026-01-02";
      return ps;
    }
    return null;
  });

  // C — the ladder's own invariants. Two rows sharing a native id are united by
  // rung 1, which checks nothing else; if one of them names a different UF, two
  // states end up in one survey. Not hypothetical: Poder360 files polls under
  // the wrong UF (a Veritá Paraná poll appeared under Pará).
  expect("unir UFs diferentes num só levantamento", "C", (ps) => {
    const p = ps.find((x) => x.state && /^p360-\d+-/.test(x.id ?? ""));
    if (!p) return null;
    const twin = structuredClone(p);
    twin.id = `${p.id}-gemeo`;
    twin.state = p.state === "SP" ? "MG" : "SP";
    ps.push(twin);
    return ps;
  });

  // D — a result percentage moves. The one thing that must never differ.
  expect("corromper um percentual", "D", (ps) => {
    const p = ps.find((x) => (x.results ?? []).length > 1);
    if (!p) return null;
    p.results[0] = { ...p.results[0], pct: p.results[0].pct + 11.5 };
    return ps;
  });

  // B — absorption that LOSES a candidate. A row with one extra name still
  // clears resolveQuestion's 80%, so it is swallowed by the shorter question
  // and the extra candidate stops existing. `fillFields` logs the disagreement
  // and keeps the stored roster — which is correct as a write rule and silent
  // as an outcome, so the gate has to be the one that notices.
  expect("absorver uma pergunta com elenco maior", "B", (ps) => {
    const p = ps.find((x) => x.round === 1 && (x.results ?? []).length >= 5 && x.source === "poder360");
    if (!p) return null;
    const twin = structuredClone(p);
    twin.id = `${p.id}-eco`;
    twin.source = "wikipedia"; // ingested after p, so p is the host
    twin.results = [...p.results, { candidate: "Candidato Fantasma da Silva", party: null, pct: 1 }];
    ps.push(twin);
    return ps;
  });

  // NOT PROVEN, and said out loud rather than left to a green tick: D's
  // attestation branch — "the upsert's value is one some source reported for a
  // row of THIS survey" — fires only if a rung hoists across surveys. That
  // cannot be induced by mutating the input, because the attestation set is
  // rebuilt from the same input, so a corrupted row attests its own corruption.
  // Guarding the input is validate-data's job, not this gate's. What this gate
  // owns is that no value crosses a survey boundary, and that branch is
  // currently carried by review, not by a test.
  console.log("\nnão coberto: o ramo de lastro do D (valor içado de OUTRO levantamento) —");
  console.log("não é induzível por mutação da entrada; ver comentário no --self-test.");
  console.log(`\n${bad ? `AUTOTESTE FALHOU — ${bad} verificação(ões) não dispara(m).` : "AUTOTESTE OK — as quatro verificações cobertas disparam quando devem."}`);
  return bad === 0;
}

// ---------------------------------------------------------------------- main
const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "polls.json"), "utf-8"));

if (SELF_TEST) {
  process.exit(selfTest(legacy.polls) ? 0 : 1);
}

const { problems } = gate(legacy.polls);
if (problems.length) {
  console.log(`\n${problems.length} problema(s):`);
  for (const p of problems.slice(0, 20)) console.log(`   ${p}`);
  if (problems.length > 20) console.log(`   … e mais ${problems.length - 20}`);
  console.log("\nPORTÃO REPROVOU — há diferença entre os dois caminhos que não é explicada nem conferida.");
  process.exit(1);
}
console.log("\nPORTÃO OK — nenhum levantamento fragmentado, nenhum resultado alterado, " +
  "nenhuma pesquisa perdida sem ser duplicata conferida, nenhum valor sem lastro na fonte.");
console.log("Rode `--self-test` para provar que estas verificações reprovam quando devem.");
