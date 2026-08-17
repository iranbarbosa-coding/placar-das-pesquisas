#!/usr/bin/env node
// Exercise the store's WRITE path — the code Phase 3 is built on.
//
// Why this exists: `resolveSurvey`, `resolveQuestion`, `fillFields`,
// `addSourceRef` and `logConflict` had no caller anywhere in the repo. They
// were never executed, by anything, ever. The migration mints ids directly and
// only touches `resolveInstitute`/`resolveCandidate`. So the resolution ladder,
// the fill-empty-never-overwrite semantics and the conflict log were all
// unproven — and Phase 3 rewrites the scraper on top of them.
//
// Each case names ONE behaviour and asserts it. Cases that assert a merge are
// paired with cases that assert a REFUSAL to merge: a ladder that unified
// everything would pass a suite made only of the former, and would silently
// destroy the database.
//
// Run: node scripts/upsert-harness.mjs [--verbose]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { readStore, markHeadlines, resolveCandidate } from "./lib/store.mjs";
import { upsertPoll } from "./lib/upsert.mjs";
import { mintCandidateId, nameKey } from "./lib/ids.mjs";
import { pessoasRegistradas } from "./lib/people.mjs";

const VERBOSE = process.argv.includes("--verbose");
const RUN_DATE = "2026-08-15";

let failures = 0;
let passes = 0;

function check(name, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-upsert-"));
  const store = readStore({ dir, tables: [], runDate: RUN_DATE });
  const problems = [];
  const assert = (cond, detail) => { if (!cond) problems.push(detail); };
  try {
    fn(store, assert);
  } catch (e) {
    problems.push(`exceção: ${e.message}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (problems.length) {
    failures++;
    console.log(`✗ ${name}`);
    for (const p of problems) console.log(`    ${p}`);
  } else {
    passes++;
    console.log(`✓ ${name}`);
  }
}

// ---------------------------------------------------------------- fixtures
const poll = (over = {}) => ({
  id: "x", pollster: "Quaest", race: "governador", state: "MG", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/1",
  fieldwork_start: "2026-05-01", fieldwork_end: "2026-05-05", published_date: "2026-05-06",
  sample_size: 1200, margin_of_error: 3, tse_registration: "MG-01234/2026",
  results: [
    { candidate: "Ana Lima", party: "PT", pct: 40 },
    { candidate: "Bruno Sá", party: "PL", pct: 30 },
    { candidate: "Carla Reis", party: "Novo", pct: 10 },
  ],
  ...over,
});

// ==========================================================================
// 1. The ladder, rung by rung
// ==========================================================================

check("degrau 1: mesmo source_ref → mesmo levantamento", (store, assert) => {
  const a = upsertPoll(store, poll(), { source: "poder360", nativeId: 999 });
  const b = upsertPoll(store, poll(), { source: "poder360", nativeId: 999 });
  assert(a.survey.survey_id === b.survey.survey_id, "ids divergiram");
  assert(b.matched_by === "source_ref", `casou por "${b.matched_by}", esperado source_ref`);
  assert(store.surveys.length === 1, `${store.surveys.length} levantamentos, esperado 1`);
  assert(store.questions.length === 1, `${store.questions.length} perguntas, esperado 1`);
});

check("degrau 2: registro TSE une fontes diferentes", (store, assert) => {
  const a = upsertPoll(store, poll(), { source: "poder360", nativeId: 999 });
  // A Wikipedia row carries no native id — the registration is the only anchor.
  const b = upsertPoll(store, poll({ source_url: "https://pt.wikipedia.org/x" }), { source: "wikipedia", nativeId: null });
  assert(a.survey.survey_id === b.survey.survey_id, "não uniu pelo registro");
  assert(b.matched_by === "registration", `casou por "${b.matched_by}", esperado registration`);
  assert(store.surveys.length === 1, `${store.surveys.length} levantamentos, esperado 1`);
});

check("degrau 3: chave natural (instituto+UF+±3 dias+elenco)", (store, assert) => {
  upsertPoll(store, poll({ tse_registration: null }), { source: "poder360", nativeId: 1 });
  const b = upsertPoll(store, poll({ tse_registration: null, fieldwork_end: "2026-05-07" }), { source: "wikipedia", nativeId: null });
  assert(b.matched_by === "natural", `casou por "${b.matched_by}", esperado natural`);
  assert(store.surveys.length === 1, `${store.surveys.length} levantamentos, esperado 1`);
});

check("degrau 4: nada casa → cunha novo", (store, assert) => {
  upsertPoll(store, poll(), { source: "poder360", nativeId: 1 });
  const b = upsertPoll(store, poll({ pollster: "Datafolha", tse_registration: "MG-99999/2026" }), { source: "poder360", nativeId: 2 });
  assert(b.matched_by === "minted", `casou por "${b.matched_by}", esperado minted`);
  assert(store.surveys.length === 2, `${store.surveys.length} levantamentos, esperado 2`);
});

// ==========================================================================
// 2. The refusals — the half that protects the database
// ==========================================================================

check("recusa: fora da janela de ±3 dias não une", (store, assert) => {
  upsertPoll(store, poll({ tse_registration: null }), { source: "poder360", nativeId: 1 });
  const b = upsertPoll(store, poll({ tse_registration: null, fieldwork_end: "2026-05-20" }), { source: "wikipedia", nativeId: null });
  assert(b.matched_by === "minted", `casou por "${b.matched_by}" — 15 dias de distância deveria cunhar`);
  assert(store.surveys.length === 2, `${store.surveys.length} levantamentos, esperado 2`);
});

check("recusa: elenco diferente não une (guarda de 60%)", (store, assert) => {
  upsertPoll(store, poll({ tse_registration: null }), { source: "poder360", nativeId: 1 });
  const outro = poll({
    tse_registration: null,
    results: [
      { candidate: "Zeca Melo", party: "PP", pct: 33 },
      { candidate: "Yara Nunes", party: "PSB", pct: 22 },
      { candidate: "Xavier Rocha", party: "PDT", pct: 11 },
    ],
  });
  const b = upsertPoll(store, outro, { source: "wikipedia", nativeId: null });
  assert(b.matched_by === "minted", `casou por "${b.matched_by}" — elenco disjunto deveria cunhar`);
});

check("cunhagem sem registro E sem id nativo gera ids DISTINTOS", (store, assert) => {
  // The shape every Wikipedia row has. The mint seed used to fall back to the
  // constant string `survey||` for these, so they all minted the SAME id and
  // the entire source collapsed into one survey — 2.581 polls became 1.520,
  // with unrelated institutes merged into each other.
  const a = upsertPoll(store, poll({ tse_registration: null, pollster: "Instituto A", state: "BA" }), { source: "wikipedia", nativeId: null });
  const b = upsertPoll(store, poll({ tse_registration: null, pollster: "Instituto B", state: "PE" }), { source: "wikipedia", nativeId: null });
  const c = upsertPoll(store, poll({ tse_registration: null, pollster: "Instituto C", state: "CE" }), { source: "wikipedia", nativeId: null });
  const ids = new Set([a.survey.survey_id, b.survey.survey_id, c.survey.survey_id]);
  assert(ids.size === 3, `3 pesquisas distintas geraram ${ids.size} id(s) — colisão de semente`);
  assert(store.surveys.length === 3, `${store.surveys.length} levantamentos, esperado 3`);
});

check("recusa: mesmo registro TSE com datas contraditórias NÃO une", (store, assert) => {
  // Uma operação de campo cobrindo governador e senado no mesmo dia é UM
  // levantamento. Um registro cobrindo datas com meses de distância é defeito
  // da fonte — unificar inventaria um levantamento que nunca existiu e lhe
  // daria uma data fabricada. Na base real são 3 casos, todos erro de dígito
  // (365, 120 e 31 dias de distância).
  upsertPoll(store, poll(), { source: "poder360", nativeId: 1 });
  const b = upsertPoll(store, poll({ fieldwork_end: "2026-09-05", fieldwork_start: "2026-09-01", published_date: null }),
    { source: "poder360", nativeId: 2 });
  assert(b.matched_by === "minted", `casou por "${b.matched_by}" — datas a 4 meses deveriam impedir a união`);
  assert(store.surveys.length === 2, `${store.surveys.length} levantamentos, esperado 2`);
  assert(store.conflicts.some((c) => c.type === "registration_dates_contradict"),
    "a divergência de datas não foi registrada como conflito");
});

check("mesmo registro TSE, mesmo dia, cargos diferentes → UM levantamento", (store, assert) => {
  const a = upsertPoll(store, poll({ race: "governador" }), { source: "poder360", nativeId: 1 });
  const b = upsertPoll(store, poll({ race: "senador",
    results: [{ candidate: "Ana Lima", party: "PT", pct: 40 }, { candidate: "Dora Pi", party: "PSD", pct: 20 }] }),
    { source: "poder360", nativeId: 2 });
  assert(a.survey.survey_id === b.survey.survey_id, "não unificou governador e senado do mesmo registro");
  assert(store.surveys.length === 1, `${store.surveys.length} levantamentos, esperado 1`);
  assert(store.questions.length === 2, `${store.questions.length} perguntas, esperado 2`);
});

check("recusa: UF diferente não une", (store, assert) => {
  upsertPoll(store, poll({ tse_registration: null }), { source: "poder360", nativeId: 1 });
  const b = upsertPoll(store, poll({ tse_registration: null, state: "SP" }), { source: "wikipedia", nativeId: null });
  assert(b.matched_by === "minted", `casou por "${b.matched_by}" — MG e SP são disputas distintas`);
});

// ==========================================================================
// 3. Upsert semantics: fill empty, never overwrite, always log
// ==========================================================================

check("preenche vazio e registra a procedência", (store, assert) => {
  const a = upsertPoll(store, poll({ published_date: null }), { source: "poder360", nativeId: 1 });
  assert(a.survey.published_date === null, "deveria começar vazio");
  upsertPoll(store, poll({ published_date: "2026-05-06" }), { source: "wikipedia", nativeId: null });
  assert(a.survey.published_date === "2026-05-06", `não preencheu (${a.survey.published_date})`);
  assert(a.survey.provenance.field_sources.published_date === "wikipedia",
    `procedência ${a.survey.provenance.field_sources.published_date}, esperado wikipedia`);
});

check("primeiro escritor vence: divergência NÃO sobrescreve e vira conflito", (store, assert) => {
  const a = upsertPoll(store, poll({ sample_size: 1200 }), { source: "poder360", nativeId: 1 });
  upsertPoll(store, poll({ sample_size: 800 }), { source: "wikipedia", nativeId: null });
  assert(a.survey.sample_size === 1200, `sobrescreveu para ${a.survey.sample_size} — prioridade de fonte quebrada`);
  const c = store.conflicts.find((c) => c.field === "sample_size");
  assert(!!c, "divergência não gerou conflito");
  assert(c?.stored === 1200 && c?.incoming === 800, `conflito com valores errados: ${JSON.stringify(c)}`);
  assert(c?.severity === "normal", `severidade ${c?.severity}, esperado normal`);
});

check("campo fixado por reparo: conflito com severidade elevada", (store, assert) => {
  const a = upsertPoll(store, poll({ sample_size: 1200 }), { source: "poder360", nativeId: 1 });
  a.survey.provenance.field_sources.sample_size = "repair:curado";
  upsertPoll(store, poll({ sample_size: 800 }), { source: "wikipedia", nativeId: null });
  assert(a.survey.sample_size === 1200, "reparo curado foi sobrescrito");
  const c = store.conflicts.find((c) => c.field === "sample_size");
  assert(c?.severity === "locked_field", `severidade ${c?.severity}, esperado locked_field`);
});

check("valores iguais não geram conflito nem ruído", (store, assert) => {
  upsertPoll(store, poll(), { source: "poder360", nativeId: 1 });
  const antes = store.conflicts.length;
  upsertPoll(store, poll(), { source: "wikipedia", nativeId: null });
  assert(store.conflicts.length === antes, `${store.conflicts.length - antes} conflito(s) para dados idênticos`);
});

// ==========================================================================
// 4. Re-running a scrape must not duplicate anything
// ==========================================================================

check("idempotência: o mesmo lote duas vezes não duplica", (store, assert) => {
  const lote = [
    poll({ id: "a", native_id: 1 }),
    poll({ id: "b", native_id: 2, race: "senador", tse_registration: "MG-02222/2026",
           results: [{ candidate: "Ana Lima", party: "PT", pct: 40 }, { candidate: "Dora Pi", party: "PSD", pct: 20 }] }),
  ];
  for (const p of lote) upsertPoll(store, p, { source: "poder360", nativeId: p.native_id });
  const s1 = store.surveys.length, q1 = store.questions.length, c1 = store.candidates.length;
  for (const p of lote) upsertPoll(store, p, { source: "poder360", nativeId: p.native_id });
  assert(store.surveys.length === s1, `levantamentos ${s1} → ${store.surveys.length}`);
  assert(store.questions.length === q1, `perguntas ${q1} → ${store.questions.length}`);
  assert(store.candidates.length === c1, `candidatos ${c1} → ${store.candidates.length}`);
  assert(store.conflicts.length === 0, `${store.conflicts.length} conflito(s) numa reexecução idêntica`);
});

check("referência de fonte não duplica ao reexecutar", (store, assert) => {
  const a = upsertPoll(store, poll(), { source: "poder360", nativeId: 7 });
  upsertPoll(store, poll(), { source: "poder360", nativeId: 7 });
  assert(a.survey.source_refs.length === 1, `${a.survey.source_refs.length} refs, esperado 1`);
});

// ==========================================================================
// 5. Identity is stable — the central decision of the whole design
// ==========================================================================

check("id não se move quando a canonicalização do instituto melhora", (store, assert) => {
  const a = upsertPoll(store, poll(), { source: "poder360", nativeId: 1 });
  const idAntes = a.survey.survey_id;
  // Someone later teaches the store that "Genial/Quaest" is the same house.
  const inst = store.institutes.find((i) => i.canonical === "Quaest");
  inst.aliases.push("Genial/Quaest");
  store._indexes.instituteByAlias.set("genial quaest", inst);
  const b = upsertPoll(store, poll({ pollster: "Genial/Quaest" }), { source: "wikipedia", nativeId: null });
  assert(b.survey.survey_id === idAntes, "o id do levantamento MUDOU ao melhorar a canonicalização");
  assert(store.institutes.length === 1, `${store.institutes.length} institutos, esperado 1`);
});

// ==========================================================================
// 6. Headlines
// ==========================================================================

check("markHeadlines promove exatamente uma pergunta por grupo", (store, assert) => {
  upsertPoll(store, poll({ id: "curto", scenario: "cenário 1" }), { source: "poder360", nativeId: 1 });
  upsertPoll(store, poll({
    id: "cheio", scenario: "cenário 2",
    results: [...poll().results, { candidate: "Dora Pi", party: "PSD", pct: 5 }],
  }), { source: "poder360", nativeId: 2 });
  markHeadlines(store);
  const heads = store.questions.filter((q) => q.is_headline);
  assert(heads.length === 1, `${heads.length} headlines, esperado 1`);
  assert(heads[0]?.results.length === 4, `headline com ${heads[0]?.results.length} candidatos — deveria ser o elenco mais cheio`);
});

check("2º turno: cada confronto mantém sua própria headline", (store, assert) => {
  const base = { race: "governador", state: "MG", round: 2, tse_registration: "MG-03333/2026" };
  upsertPoll(store, poll({ ...base, id: "p1", scenario: "A vs B",
    results: [{ candidate: "Ana Lima", party: "PT", pct: 50 }, { candidate: "Bruno Sá", party: "PL", pct: 40 }] }),
    { source: "poder360", nativeId: 1 });
  upsertPoll(store, poll({ ...base, id: "p2", scenario: "A vs C",
    results: [{ candidate: "Ana Lima", party: "PT", pct: 52 }, { candidate: "Carla Reis", party: "Novo", pct: 30 }] }),
    { source: "poder360", nativeId: 2 });
  markHeadlines(store);
  const heads = store.questions.filter((q) => q.is_headline);
  assert(heads.length === 2, `${heads.length} headlines — cada pareamento de 2º turno deve sobreviver`);
});

// ==========================================================================
// 7. The real case still open in the data
// ==========================================================================

check("caso real: os dois registros da Delta no AC (mesmo campo, duas fontes)", (store, assert) => {
  // Poder360 filed the governor round-1 question with the registration.
  const p360 = poll({
    id: "p360-13808", pollster: "Delta", state: "AC", race: "governador", round: 1,
    fieldwork_start: "2026-08-04", fieldwork_end: "2026-08-09", published_date: null,
    sample_size: 1006, tse_registration: "AC-06787/2026",
    results: [
      { candidate: "Alan Rick", party: "Republicanos", pct: 38.17 },
      { candidate: "Mailza Assis", party: "PP", pct: 25.15 },
      { candidate: "Sebastião Bocalom", party: "PSDB", pct: 14.02 },
    ],
  });
  // Wikipedia carried the SAME fieldwork, without the registration, as a runoff.
  const wiki = poll({
    id: "wiki-ac", pollster: "Delta", state: "AC", race: "governador", round: 2,
    fieldwork_start: "2026-08-04", fieldwork_end: "2026-08-09", published_date: null,
    sample_size: 1006, tse_registration: null,
    results: [
      { candidate: "Alan Rick", party: "Republicanos", pct: 58.35 },
      { candidate: "Tião Bocalom", party: "PSDB", pct: 20.68 },
    ],
  });
  const a = upsertPoll(store, p360, { source: "poder360", nativeId: 13808 });
  const b = upsertPoll(store, wiki, { source: "wikipedia", nativeId: null });

  // Same institute, same UF, same window, same sample: the natural key SHOULD
  // reach for it. Whether it lands depends on the 60% roster rule, and the
  // rosters differ by exactly the Bocalom spelling the alias table will fix.
  const unified = a.survey.survey_id === b.survey.survey_id;
  if (VERBOSE) console.log(`      → casou por "${b.matched_by}"; unificado: ${unified}`);
  assert(store.surveys.length === (unified ? 1 : 2), "contagem inconsistente com o veredito");
  // Documented as an observation, not a demand: this is the pair Phase 3 has
  // to get right, and the harness pins TODAY's behaviour so the rewrite cannot
  // change it without someone noticing.
  assert(b.matched_by === "natural" || b.matched_by === "minted", `veredito inesperado: ${b.matched_by}`);
  console.log(`    · comportamento atual: "${b.matched_by}" (${unified ? "unifica" : "NÃO unifica"}) — ` +
    `${unified ? "" : "os dois registros Delta seguem separados; "}elencos divergem em Tião/Sebastião Bocalom`);
});

// ==========================================================================
// 8. A PESSOA — a identidade que não acompanha o nome exibido
// ==========================================================================

/** Um store limpo à parte, para comparar DUAS reconstruções independentes. */
function storeVazio() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-pessoa-"));
  const s = readStore({ dir, tables: [], runDate: RUN_DATE });
  s._tmpdir = dir;
  return s;
}

check("O PONTO INTEIRO: o candidate_id NÃO se move quando o nome exibido muda", (store, assert) => {
  // Dois stores independentes, mesma grafia CRUA, nomes exibidos diferentes —
  // que é exatamente o que uma mudança de regra de exibição faz sobre uma
  // reconstrução do zero. Em 16/08/2026 isso moveu 27 de 1.078 ids, e cada id
  // movido levou junto o `first_seen`, porque `priorStamps` carrega POR ID.
  const contest = "governador:MG";
  const crua = "Ana Lima da Silva";
  const A = storeVazio();
  const B = storeVazio();
  try {
    const a = resolveCandidate(A, "Ana Lima", contest, "PT", { fuzzy: false, raw: crua });
    const b = resolveCandidate(B, "Aninha da Silva", contest, "PT", { fuzzy: false, raw: crua });
    assert(a.candidate_id === b.candidate_id,
      `o id se moveu com o nome exibido: ${a.candidate_id} × ${b.candidate_id}`);
    assert(a.person_id === b.person_id, `person_id divergiu: ${a.person_id} × ${b.person_id}`);
    assert(a.mint_seed === `candidate|${contest}|${a.person_id}`, `semente inesperada: ${a.mint_seed}`);
    // E o teste só prova alguma coisa se a semente ANTIGA de fato se movia.
    const antigoA = mintCandidateId(`candidate|${contest}|${nameKey("Ana Lima")}`);
    const antigoB = mintCandidateId(`candidate|${contest}|${nameKey("Aninha da Silva")}`);
    assert(antigoA !== antigoB, "a semente antiga não se movia neste caso — o teste não prova nada");
  } finally {
    fs.rmSync(A._tmpdir, { recursive: true, force: true });
    fs.rmSync(B._tmpdir, { recursive: true, force: true });
  }
});

check("duas grafias da MESMA pessoa registrada caem numa linha só (senador:AL)", (store, assert) => {
  // O cruzamento real: "Dr. Wanderley" e "José Wanderley Neto" são o mesmo
  // homem (SQ 20002553726 no registro), e cunhavam DOIS candidate_id que ainda
  // por cima se cruzavam — o site publicava um homem sob dois nomes na mesma
  // disputa. Com a semente na pessoa, o id colide de propósito.
  const base = {
    pollster: "Quaest", race: "senador", state: "AL", round: 1,
    tse_registration: "AL-01111/2026", sample_size: 1200,
    fieldwork_start: "2026-06-01", fieldwork_end: "2026-06-03", published_date: "2026-06-04",
  };
  const a = upsertPoll(store, poll({ ...base, id: "al-1",
    results: [{ candidate: "Dr. Wanderley", party: "MDB", pct: 20 }, { candidate: "Arthur Lira", party: "PP", pct: 30 }] }),
    { source: "poder360", nativeId: 41 });
  const b = upsertPoll(store, poll({ ...base, id: "al-2", tse_registration: "AL-02222/2026",
    fieldwork_end: "2026-07-03", fieldwork_start: "2026-07-01", published_date: "2026-07-04",
    results: [{ candidate: "José Wanderley Neto", party: "MDB", pct: 22 }, { candidate: "Arthur Lira", party: "PP", pct: 31 }] }),
    { source: "poder360", nativeId: 42 });
  const idA = a.question.results.find((r) => r.name_raw === "Dr. Wanderley")?.candidate_id;
  const idB = b.question.results.find((r) => r.name_raw === "José Wanderley Neto")?.candidate_id;
  assert(!!idA && idA === idB, `duas grafias de um homem viraram ${idA} × ${idB}`);
  const linhas = store.candidates.filter((c) => c.contest === "senador:AL");
  assert(linhas.length === 2, `${linhas.length} linhas em senador:AL, esperado 2 (Wanderley + Lira)`);
  const pessoa = store.people.find((p) => p.person_id === store.candidates.find((c) => c.candidate_id === idA).person_id);
  assert(pessoa?.registered === true, "a pessoa deveria ter vindo do registro do TSE");
  assert(pessoa?.polled_names.length === 2, `polled_names: ${JSON.stringify(pessoa?.polled_names)}`);
});

check("pessoa com DOIS sq_candidato (re-registro do Piauí) é UMA pessoa", (store, assert) => {
  // Piauí tem dois casos de uma candidatura arquivada de novo: mesmo nome de
  // urna, mesmo número, mesmo partido, dois SQ_CANDIDATO. Colapsá-los é o que
  // separa "re-registro" de "homônimo" — e o colapso é o de
  // `lib/candidaturas.mjs`, o mesmo que o casador de nomes de urna usa.
  const registradas = pessoasRegistradas();
  if (!registradas.length) {
    assert(false, "data/candidaturas.ndjson ausente — este caso não pôde ser exercitado");
    return;
  }
  const duplas = registradas.filter((p) => p.sq_candidato.length > 1);
  assert(duplas.length >= 1, "nenhuma pessoa com dois sq — o colapso de re-registro não está agindo");
  for (const p of duplas) {
    assert(p.mint_seed === `person|tse|${p.sq_candidato[0]}`,
      `a semente tem de ser o MENOR sq do grupo, não "${p.mint_seed}"`);
    assert(new Set(p.candidacies.map((c) => `${c.cargo}:${c.uf}`)).size === 1,
      `${p.nome_urna}: um re-registro não muda de disputa — ${JSON.stringify(p.candidacies)}`);
  }
  // Nenhum sq pode pertencer a duas pessoas: seria o mesmo registro cunhando
  // duas identidades.
  const dono = new Map();
  for (const p of registradas) for (const sq of p.sq_candidato) {
    assert(!dono.has(sq), `sq ${sq} em duas pessoas (${dono.get(sq)} e ${p.person_id})`);
    dono.set(sq, p.person_id);
  }
  console.log(`    · ${dono.size} candidaturas → ${registradas.length} pessoas ` +
    `(${duplas.length} com dois registros: ${duplas.map((p) => p.nome_urna).join(", ")})`);
});

check("sem registro: duas RACES são duas pessoas; a mesma race em duas UFs é uma", (store, assert) => {
  // A decisão do criador (16/08/2026): a identidade de quem não se registrou é
  // escopada POR RACE. Global por nome fundiria `Rui Costa` (senador:BA) com
  // `Rui Costa Pimenta` (presidente) e `Ciro` com `Ciro Nogueira`; por disputa
  // (`race:UF`) estilhaçaria o presidencial, porque `presidente:MG` é a mesma
  // corrida perguntada a mineiros. As duas metades estão aqui de propósito: um
  // teste só da fusão passaria com uma regra que funde tudo.
  const nome = "Fulano Inexistente de Tal";
  const g = resolveCandidate(store, nome, "governador:MG", "PT", { fuzzy: false, raw: nome });
  const s = resolveCandidate(store, nome, "senador:MG", "PT", { fuzzy: false, raw: nome });
  assert(g.person_id !== s.person_id,
    "governador e senado viraram a MESMA pessoa — sem registro, races diferentes não se fundem");

  const p1 = resolveCandidate(store, nome, "presidente:BR", "PT", { fuzzy: false, raw: nome });
  const p2 = resolveCandidate(store, nome, "presidente:MG", "PT", { fuzzy: false, raw: nome });
  assert(p1.person_id === p2.person_id,
    "a corrida presidencial nacional e a subamostra estadual viraram DUAS pessoas");
  assert(p1.candidate_id !== p2.candidate_id,
    "a linha de candidato tem de continuar POR DISPUTA — é ela que guarda contest === race:uf");
  const pessoa = store.people.find((p) => p.person_id === p1.person_id);
  assert(pessoa?.mint_seed === `person|obs|presidente|${nameKey(nome)}`,
    `semente inesperada para quem não se registrou: "${pessoa?.mint_seed}"`);
  assert(pessoa?.registered === false && pessoa?.nome_completo === null && pessoa?.nome_urna === null,
    "quem não se registrou não tem nome civil apurado — o campo fica NULO, nunca adivinhado");
});

check("toda linha de candidato carrega person_id e mint_seed", (store, assert) => {
  upsertPoll(store, poll(), { source: "poder360", nativeId: 1 });
  for (const c of store.candidates) {
    assert(!!c.person_id, `${c.canonical} sem person_id`);
    assert(c.mint_seed === `candidate|${c.contest}|${c.person_id}`, `${c.canonical}: semente "${c.mint_seed}"`);
    assert(Array.isArray(c.legacy_ids), `${c.canonical} sem legacy_ids`);
    assert(store.people.some((p) => p.person_id === c.person_id), `${c.canonical}: pessoa inexistente`);
  }
  for (const p of store.people) {
    assert(!!p.mint_seed, `pessoa ${p.person_id} sem mint_seed`);
    assert(p.merged_into === null, `pessoa ${p.person_id} nasceu com merged_into preenchido`);
  }
});

// ---------------------------------------------------------------- resultado
console.log(`\n${passes} passaram · ${failures} falharam`);
if (failures) {
  console.error("HARNESS FALHOU — o caminho de escrita não se comporta como especificado.");
  process.exit(1);
}
console.log("CAMINHO DE ESCRITA OK — escada, recusas, semântica de upsert, idempotência e identidade.");
