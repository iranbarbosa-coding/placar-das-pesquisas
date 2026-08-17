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
import { nomeSemClausula, nameTokens } from "./lib/canonicalize.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  readStore, writeStore, markHeadlines, resolveCandidate, resolvePerson,
  priorStamps, emptyIndexes, TABLE_NAMES, DATA_DIR,
} from "./lib/store.mjs";
import { upsertPoll } from "./lib/upsert.mjs";
import { writeStoreFromPolls } from "./lib/build-store.mjs";
import { mintCandidateId, mintInstituteId, nameKey } from "./lib/ids.mjs";
import { validateStore } from "./validate-store.mjs";
import { normNome } from "./lib/nomes.mjs";
import { pessoasRegistradas } from "./lib/people.mjs";
import {
  ballotCandidacy, areDistinct, canonicalCandidate, displayOrigin, usarTabelaDeApelidos,
  identityConflicts, usarRegistroDeUrna, groups as gruposCurados,
} from "./lib/candidates.mjs";
import { chaveDeDisputa, ufDaCandidatura } from "./lib/nomes.mjs";
import { build as revisao } from "./candidate-review.mjs";

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

check("A OUTRA METADE, e SÓ PARA QUEM SE REGISTROU: o id não se move quando uma pesquisa nova escreve o nome de outro jeito", (store, assert) => {
  // O defeito que a metade "nome exibido" não cobria, e que a verificação
  // independente mediu em 814 das 1.078 linhas de então: a semente saía da grafia da
  // PRIMEIRA pesquisa, então uma pesquisa nova publicando "Tarcísio de Freitas"
  // onde as anteriores publicavam "Tarcísio" cunhava outra pessoa e outro id.
  // Não é rename nenhum — é CHEGADA DE DADO, e nenhum dado antigo mudou.
  //
  // O que o fecha: a pessoa registrada é alcançada pelo REGISTRO, e o registro
  // é alcançável tanto pela grafia publicada quanto pelo nome de urna que ele
  // próprio impõe (`data/ballot-names.json`, indexado também pelo `nome_urna`).
  // Sem essa segunda chave, "Jhc" — que é o nome que o site EXIBE em
  // `governador:AL` — não achava a candidatura de "João Henrique Caldas" e a
  // linha caía numa pessoa sem registro ao lado da registrada idêntica.
  //
  // ⚠ E O TÍTULO DESTE CASO JÁ FOI GERAL DEMAIS — dizia "o id NÃO se move", sem
  // o "para quem se registrou", e isso é FALSO para quem NÃO se registrou. O
  // gatilho exato, reproduzido em 16/08/2026 contra o banco vivo reconstruído em
  // diretório temporário: uma pesquisa NOVA da FONTE DE TOPO (poder360)
  // escrevendo de outro jeito o nome de uma pessoa SEM REGISTRO re-cunha a
  // pessoa E a linha de candidato — `Gustavo Mendanha Silva` em `governador:GO`
  // moveu `p_6a008686f578 → p_b1007931a4c8` e `c_e920793fae2d → c_dbe6ddc2e667`.
  // É dependente de ORDEM DE CHEGADA: `build-store.mjs` ordena por prioridade de
  // fonte e depois por `fieldwork_end` DESC, então a pesquisa fresca da fonte
  // primária é ingerida PRIMEIRO, os três degraus anteriores de `resolvePerson`
  // erram todos e a semente sai da grafia nova. A MESMA pesquisa datada de 2020,
  // ou vinda da Wikipédia, é ingerida por último e o id NÃO se move.
  //
  // O movimento não foi eliminado — é da escada, não do carimbo, e eliminá-lo é
  // decisão de escopo do criador. O que existe hoje é `translatePersonStamps`
  // (em `lib/build-store.mjs`): o `first_seen` ATRAVESSA o salto, o id antigo
  // fica em `legacy_ids` e o que não casa vai para `conflicts.ndjson`. A perda
  // deixou de ser silenciosa; a limitação continua e está escrita.
  const contest = "governador:AL";
  const A = storeVazio();
  const B = storeVazio();
  try {
    // Rodada 1: o instituto publica o nome civil. Rodada 2 (outro store, do
    // zero): outro instituto publica o nome de urna. Mesmo homem, e o id tem de
    // ser o MESMO byte a byte.
    const a = resolveCandidate(A, "Jhc", contest, "PSDB", { fuzzy: false, raw: "João Henrique Caldas" });
    const b = resolveCandidate(B, "Jhc", contest, "PSDB", { fuzzy: false, raw: "JHC" });
    assert(a.candidate_id === b.candidate_id,
      `o id se moveu com a grafia da pesquisa: ${a.candidate_id} × ${b.candidate_id}`);
    const pa = A.people.find((p) => p.person_id === a.person_id);
    const pb = B.people.find((p) => p.person_id === b.person_id);
    assert(pa?.registered === true && pb?.registered === true,
      `o registro ficou inalcançável por uma das grafias (reg: ${pa?.registered} × ${pb?.registered})`);
    assert(pa?.mint_seed === pb?.mint_seed && /^person\|tse\|/.test(pa?.mint_seed ?? ""),
      `sementes divergentes: "${pa?.mint_seed}" × "${pb?.mint_seed}"`);
  } finally {
    fs.rmSync(A._tmpdir, { recursive: true, force: true });
    fs.rmSync(B._tmpdir, { recursive: true, force: true });
  }
});

check("o registro é alcançável pelo NOME DE URNA que ele próprio impõe", (store, assert) => {
  // 65 linhas de pesquisa sentavam numa pessoa NÃO registrada enquanto uma
  // pessoa REGISTRADA da mesma disputa carregava o mesmo nome. A causa: as
  // chaves de `data/ballot-names.json` são as grafias publicadas de UMA rodada,
  // e o mapa é consultado também com o nome já canonicalizado — que, quando a
  // canonicalização adota o nome de urna, muitas vezes não está entre elas.
  const casos = [
    ["governador:AL", "Jhc", "João Henrique Caldas"],
    ["presidente:BR", "Zema", "Romeu Zema"],
    ["senador:MG", "Zema", "Romeu Zema"],
  ];
  for (const [contest, urna, publicado] of casos) {
    const viaPublicado = ballotCandidacy(publicado, contest);
    const viaUrna = ballotCandidacy(urna, contest);
    assert(!!viaPublicado, `${contest}: "${publicado}" não alcança o registro — o casador não rodou?`);
    assert(!!viaUrna, `${contest}: "${urna}" (o nome que o site EXIBE) não alcança o registro`);
    assert(viaPublicado?.sq_candidato === viaUrna?.sq_candidato,
      `${contest}: as duas grafias apontam para candidaturas diferentes (${viaPublicado?.sq_candidato} × ${viaUrna?.sq_candidato})`);
  }
});

check("a cláusula de cenário nunca entrega o voto ao APOIADOR", (store, assert) => {
  // O RISCO QUE `ballotCandidacy(rawFull)` ABRE, e que só um caso fecha.
  //
  // A cláusula está barrada da identidade — não vira alias, não semeia id —, mas
  // `resolvePerson` ainda a consulta para ENCONTRAR a candidatura oficial. É o
  // que devolve a "Marina Cândia, esposa do JHC" o seu nome de urna "Marina Jhc"
  // (o token `jhc` é o único caminho até ela) sem o qual uma candidata
  // REGISTRADA se partia em duas.
  //
  // O buraco: `match-ballot-names.mjs` casa por CONTENÇÃO e não sabe qual token
  // é a cabeça do nome. Numa cláusula "X, com apoio de Y", se Y tem candidatura
  // registrada naquela disputa e X não tem, existe exatamente UMA candidatura
  // compatível — a de Y — e o voto de X iria para o apoiador. É a mesma família
  // do 32,2 da Tereza Cristina publicado como do Jair Bolsonaro (`6231cca`),
  // entrando por outra porta.
  //
  // Hoje isso não acontece porque Jair Bolsonaro não tem candidatura em 2026, o
  // que é um fato sobre ESTA eleição, não uma propriedade da regra. Este caso
  // existe para que a próxima cláusula que chegue não o descubra em produção.
  // ⚠ LÊ O BANCO REAL, não o `store` fixture que `check()` entrega — a fixture
  // não tem cláusula nenhuma, e um caso que só a percorresse seria vacuamente
  // verde para sempre. É o mesmo motivo pelo qual o caso do nome de urna acima
  // consulta `ballotCandidacy`, que lê `data/ballot-names.json` de verdade.
  const clausulas = new Map();
  for (const linha of fs.readFileSync(path.join(DATA_DIR, "questions.ndjson"), "utf-8").trim().split("\n")) {
    const q = JSON.parse(linha);
    for (const r of q.results ?? []) {
      const n = r.name_raw ?? "";
      if (n.includes(",")) clausulas.set(`${q.race}:${q.uf ?? "BR"}|${n}`, { contest: `${q.race}:${q.uf ?? "BR"}`, nome: n });
    }
  }
  assert(clausulas.size > 0, "nenhuma cláusula no banco — este caso não está exercitando nada");
  for (const { contest, nome } of clausulas.values()) {
    const achado = ballotCandidacy(nome, contest);
    if (!achado) continue; // não casar é o resultado seguro
    const cabeca = nomeSemClausula(nome);
    const viaCabeca = ballotCandidacy(cabeca, contest);
    // A candidatura alcançada PELA CLÁUSULA tem de ser a mesma que a CABEÇA
    // alcança — ou, quando a cabeça sozinha não casa (o caso da Marina), tem de
    // ao menos partilhar token com ela, nunca ser puro apoiador.
    const ok = viaCabeca
      ? achado.sq_candidato === viaCabeca.sq_candidato
      : nameTokens(achado.nome_urna ?? "").size > 0 &&
        [...nameTokens(cabeca)].some((t) => nameTokens(achado.nome_urna ?? "").has(t));
    assert(ok,
      `${contest}: "${nome}" resolveu para a candidatura "${achado.nome_urna}" ` +
      `(sq ${achado.sq_candidato}), que NÃO é a de "${cabeca}" — o voto foi para o apoiador`);
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

check("opção C: sem registro, a UF SEPARA nas estaduais e NÃO separa na presidencial", (store, assert) => {
  // A decisão do criador (16/08/2026, opção C, medida antes de decidida): a
  // identidade de quem não se registrou é escopada por `race|UF` nas estaduais e
  // pela RACE SOZINHA na presidencial.
  //
  // ⚠ ESTE CASO JÁ AFIRMOU O CONTRÁRIO — "a mesma race em duas UFs é uma" — e
  // fundir era o defeito, não a especificação. Quatro fusões reais foram
  // medidas (`Álvaro Dias` senador:PR+RN, `Ratinho Jr` e `Zeca Dirceu`
  // senador:PR+RS, `José Carlos do Pátio` governador:BA+MT): homônimos de
  // estados diferentes que a linha de `people.ndjson` AFIRMAVA ser um homem só.
  //
  // As três metades estão aqui de propósito. Uma regra que funde tudo passaria
  // num teste só de fusão; uma que separa tudo passaria num teste só de
  // separação e estilhaçaria a presidencial em até 26 pessoas.
  const nome = "Fulano Inexistente de Tal";
  const g = resolveCandidate(store, nome, "governador:MG", "PT", { fuzzy: false, raw: nome });
  const s = resolveCandidate(store, nome, "senador:MG", "PT", { fuzzy: false, raw: nome });
  assert(g.person_id !== s.person_id,
    "governador e senado viraram a MESMA pessoa — sem registro, races diferentes não se fundem");

  // (a) mesma race, UFs diferentes, disputa ESTADUAL → duas pessoas.
  const pr = resolveCandidate(store, nome, "senador:PR", "PT", { fuzzy: false, raw: nome });
  const rs = resolveCandidate(store, nome, "senador:RS", "PT", { fuzzy: false, raw: nome });
  assert(pr.person_id !== rs.person_id,
    "senador:PR e senador:RS viraram a MESMA pessoa — nas estaduais a UF É a corrida");
  const pessoaPR = store.people.find((p) => p.person_id === pr.person_id);
  assert(pessoaPR?.mint_seed === `person|obs|senador|PR|${nameKey(nome)}`,
    `semente estadual inesperada: "${pessoaPR?.mint_seed}"`);
  assert(pessoaPR?.obs_scope === "senador|PR",
    `o escopo tem de ir GRAVADO no campo, não só dentro da semente: "${pessoaPR?.obs_scope}"`);

  // (b) presidencial: `presidente:MG` é a corrida NACIONAL perguntada a
  // mineiros. Separar aqui partiria um candidato a presidente em 26 pessoas.
  const p1 = resolveCandidate(store, nome, "presidente:BR", "PT", { fuzzy: false, raw: nome });
  const p2 = resolveCandidate(store, nome, "presidente:MG", "PT", { fuzzy: false, raw: nome });
  assert(p1.person_id === p2.person_id,
    "a corrida presidencial nacional e a subamostra estadual viraram DUAS pessoas");
  assert(p1.candidate_id !== p2.candidate_id,
    "a linha de candidato tem de continuar POR DISPUTA — é ela que guarda contest === race:uf");
  const pessoa = store.people.find((p) => p.person_id === p1.person_id);
  assert(pessoa?.mint_seed === `person|obs|presidente|${nameKey(nome)}`,
    `semente inesperada para quem não se registrou: "${pessoa?.mint_seed}"`);
  assert(pessoa?.obs_scope === "presidente", `escopo presidencial inesperado: "${pessoa?.obs_scope}"`);
  assert(pessoa?.registered === false && pessoa?.nome_completo === null && pessoa?.nome_urna === null,
    "quem não se registrou não tem nome civil apurado — o campo fica NULO, nunca adivinhado");
});

check("opção C: o escopo gravado e o escopo da semente NÃO podem divergir", (store, assert) => {
  // A armadilha que este campo existe para fechar. O escopo era recuperado da
  // semente com `/^person\|obs\|([^|]+)\|/` em DOIS lugares (`priorStamps` e
  // `personPolledIndex`); sob a opção C essa regex captura `senador` de
  // `person|obs|senador|PR|…` e chaveia o índice de grafias pela RACE — que
  // re-funde, no índice, exatamente o que a semente separa. O sintoma seria
  // mudo: nenhum erro, só o id se movendo ou a pessoa errada sendo reencontrada.
  const nome = "Beltrano Improvável";
  for (const contest of ["senador:PR", "governador:BA", "presidente:MG", "presidente:BR"]) {
    const c = resolveCandidate(store, nome, contest, "PT", { fuzzy: false, raw: nome });
    const p = store.people.find((x) => x.person_id === c.person_id);
    assert(p.mint_seed === `person|obs|${p.obs_scope}|${nameKey(nome)}`,
      `${contest}: semente "${p.mint_seed}" não bate com obs_scope "${p.obs_scope}"`);
    // E a regex antiga TEM de discordar do campo nas estaduais, senão o caso
    // não prova nada sobre o defeito que ele existe para pegar.
    const porRegex = /^person\|obs\|([^|]+)\|/.exec(p.mint_seed)?.[1];
    if (contest.startsWith("presidente")) assert(porRegex === p.obs_scope, `${contest}: escopo presidencial deveria coincidir`);
    else assert(porRegex !== p.obs_scope, `${contest}: a regex antiga daria "${porRegex}" e o campo dá "${p.obs_scope}" — se coincidem, o caso não exercita nada`);
  }
});

check("opção C ATRAVESSA a rodada: a pessoa da rodada anterior é reencontrada, e só na SUA UF", (store, assert) => {
  // A armadilha 2. `priorStamps` indexa as grafias da rodada anterior e
  // `resolvePerson` consulta esse índice; se as duas chaves não forem idênticas
  // a consulta erra sempre, ninguém percebe, e TODA pessoa sem registro é
  // recunhada a cada rodada — com o `first_seen` indo junto, que é a perda
  // silenciosa que esta camada inteira existe para acabar.
  //
  // Um `idempotence-check` que reconstrói o MESMO `polls.json` duas vezes não
  // alcança isto: a semente é determinística, então a pessoa é recunhada com o
  // mesmo id e as tabelas saem byte-idênticas mesmo com o índice quebrado. O
  // caso só aparece quando a rodada nova vê uma grafia que a antiga não viu.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-prior-"));
  try {
    const antes = readStore({ dir, tables: [], runDate: RUN_DATE });
    // Rodada 1: DUAS grafias da mesma pessoa em senador:PR. A semente sai da
    // PRIMEIRA — e é justamente por isso que o índice por grafia tem de existir:
    // sem ele, uma rodada que visse as duas na ordem inversa cunharia outra
    // semente e moveria o id, e a saída passaria a depender da ordem em que os
    // registros estão no disco (CONVENTIONS §8).
    resolveCandidate(antes, "Fulano Improvável", "senador:PR", "PT", { fuzzy: false, raw: "Fulano Improvável de Tal" });
    resolveCandidate(antes, "Fulano Improvável", "senador:PR", "PT", { fuzzy: false, raw: "F. Improvável" });
    writeStore(antes, { dir });

    const prior = priorStamps(readStore({ dir }));
    const depois = readStore({ dir, tables: [], runDate: "2027-01-01", prior });
    for (const t of TABLE_NAMES) depois[t] = [];
    depois._indexes = emptyIndexes();

    // Rodada 2: a SEGUNDA grafia chega PRIMEIRO. A semente calculada agora
    // seria outra; só o índice de grafias da rodada anterior salva o id.
    const mesma = resolveCandidate(depois, "Fulano Improvável", "senador:PR", "PT",
      { fuzzy: false, raw: "F. Improvável" });
    const alvo = antes.people.find((p) => !p.registered);
    assert(alvo?.mint_seed === `person|obs|senador|PR|${nameKey("Fulano Improvável de Tal")}`,
      `a semente não saiu da PRIMEIRA grafia — o caso não exercitaria o índice: "${alvo?.mint_seed}"`);
    assert(mesma.person_id === alvo.person_id,
      `a pessoa da rodada anterior não foi reencontrada: ${mesma.person_id} × ${alvo.person_id}`);

    // …e a MESMA grafia em OUTRA UF NÃO pode cair nela. Um índice chaveado pela
    // race (a regex antiga sobre a semente) devolveria a pessoa do PR aqui.
    const outraUf = resolveCandidate(depois, "Fulano Improvável", "senador:RS", "PT",
      { fuzzy: false, raw: "F. Improvável" });
    assert(outraUf.person_id !== alvo.person_id,
      "a grafia do PR alcançou a pessoa no RS — o índice está chaveado pela race, não pelo escopo da opção C");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ==========================================================================
// 6. Os dois lugares onde o escopo da opção C é ESCRITO no índice
// ==========================================================================
//
// ⚠ POR QUE ESTES DOIS CASOS EXISTEM. A verificação independente mediu, em
// 16/08/2026, que `personPolledIndex` e `notePolledName` podiam ser REVERTIDOS
// — o primeiro para a regex antiga sobre a semente
// (`/^person\|obs\|([^|]+)\|/`, que devolve `senador` para
// `person|obs|senador|PR|…`), o segundo para `raceOf(contest)` — com esta
// bateria ainda 29/29 e o store real saindo BYTE-IDÊNTICO. A correção estava
// protegida por construção, não por teste, e CONVENTIONS §2 diz exatamente o
// que isso vale: um verde que ninguém testou não é evidência.
//
// Nenhum dos dois aparece num diff de tabela porque o defeito não muda o que se
// GRAVA — muda o que se ENCONTRA na rodada seguinte, e o sintoma é o id se
// mover em silêncio.

check("personPolledIndex: o store CARREGADO reencontra a pessoa pelo escopo, não pela race", (_store, assert) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-polled-"));
  try {
    const antes = readStore({ dir, tables: [], runDate: RUN_DATE });
    const grafia = "Sicrano Improvável de Tal";
    const pr = resolveCandidate(antes, "Sicrano Improvável", "senador:PR", "PT", { fuzzy: false, raw: grafia });
    writeStore(antes, { dir });

    // Recarregado do disco: quem povoa `personByPolled` aqui é
    // `personPolledIndex` e mais ninguém — é este o caminho sob teste.
    const recarregado = readStore({ dir });
    assert(recarregado._indexes.personByPolled.get(`senador|PR|${normNome(grafia)}`)?.person_id === pr.person_id,
      "a chave do índice não é `<obs_scope>|<grafia>` — a pessoa gravada não é alcançável pelo escopo que a cunhou");
    // E a chave da regex antiga TEM de estar ausente, senão o caso não
    // distingue a versão certa da errada.
    assert(!recarregado._indexes.personByPolled.has(`senador|${normNome(grafia)}`),
      "o índice carrega a chave derivada só da RACE — é a regex sobre a semente, que refunde UFs em silêncio");

    // O efeito, não só a chave: a escada tem de devolver a MESMA pessoa. O nome
    // exibido é outro de propósito, para o degrau do cluster não mascarar o do
    // índice de grafias.
    const mesma = resolvePerson(recarregado, { raw: grafia, display: "Rótulo Diferente", contest: "senador:PR" });
    assert(mesma.person_id === pr.person_id,
      `a pessoa da rodada anterior não foi reencontrada: ${mesma.person_id} × ${pr.person_id}`);
    // …e a MESMA grafia em OUTRA UF não pode cair nela (a metade que uma chave
    // por race atenderia fundindo).
    const outra = resolvePerson(recarregado, { raw: grafia, display: "Rótulo Diferente", contest: "senador:RS" });
    assert(outra.person_id !== pr.person_id,
      "a grafia do PR alcançou a pessoa no RS — o índice está chaveado pela race");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("notePolledName: a grafia do caminho rápido entra no índice pelo obs_scope", (store, assert) => {
  const grafiaA = "Beltrano Improvável de Tal";
  const grafiaB = "B. Improvável de Tal";
  // A 1ª grafia cunha a pessoa e a linha. A 2ª cai no CAMINHO RÁPIDO (o índice
  // de apelidos já tem o nome exibido) e nunca passa por `resolvePerson`: quem
  // registra a grafia na pessoa e a indexa é `notePolledName`.
  const a = resolveCandidate(store, "Beltrano Improvável", "senador:PR", "PT", { fuzzy: false, raw: grafiaA });
  const b = resolveCandidate(store, "Beltrano Improvável", "senador:PR", "PT", { fuzzy: false, raw: grafiaB });
  assert(a.candidate_id === b.candidate_id, "as duas grafias do mesmo nome exibido caíram em linhas diferentes");
  const pessoa = store.people.find((p) => p.person_id === a.person_id);
  assert(pessoa?.polled_names.includes(grafiaB), `a 2ª grafia não foi registrada: ${JSON.stringify(pessoa?.polled_names)}`);

  assert(!store._indexes.personByPolled.has(`senador|${normNome(grafiaB)}`),
    "a grafia foi indexada por `raceOf(contest)` — chave que nenhum leitor consulta");
  const mesma = resolvePerson(store, { raw: grafiaB, display: "Rótulo Diferente", contest: "senador:PR" });
  assert(mesma.person_id === a.person_id,
    `a grafia registrada por notePolledName não é alcançável pela escada: ${mesma.person_id} × ${a.person_id}`);
});

// ==========================================================================
// 9. AS DECISÕES DE IDENTIDADE TÊM DE SER ALCANÇÁVEIS PELA CHAVE QUE A
//    VARREDURA EMITE
// ==========================================================================
//
// ⚠ POR QUE ESTA SEÇÃO EXISTE, e por que ela não aparece num diff de tabela.
//
// `areDistinct` é consultada num lugar só — a cláusula de `canonicalizeCandidates`
// que PROÍBE o agrupador por subconjunto de tokens de fundir duas pessoas já
// conferidas. Um `false` ali não grava nada de errado: ele apenas desliga o
// guarda, e o estrago só aparece na rodada em que a coleta trouxer as duas
// grafias na mesma disputa. Por isso o store sai byte-idêntico com o defeito
// dentro, e por isso a prova tem de ser feita CONTRA A TABELA REAL, aqui, e não
// esperando um número mudar.
//
// As duas metades são independentes e cada uma matava um conjunto próprio de
// decisões:
//   (a) a chave da DISPUTA — gravada em `presidente:BR`, consultada em
//       `presidente:<UF>`;
//   (b) a chave do NOME — gravada na grafia PESQUISADA, consultada no nome que
//       a escada de exibição publica.
check("(a) a decisão nacional vale na subamostra estadual da presidencial", (store, assert) => {
  // A disputa é a mesma corrida: `presidente:PR` é a presidencial perguntada ao
  // eleitor do Paraná. Medido em 17/08/2026: 5 pares curados × 18 disputas = 28
  // ocorrências com o guarda DESLIGADO, entre elas todos os Bolsonaro entre si.
  const pares = [
    ["Flávio Bolsonaro", "Jair Bolsonaro"],
    ["Flávio Bolsonaro", "Michelle Bolsonaro"],
    ["Eduardo Bolsonaro", "Flávio Bolsonaro"],
    ["Renan Filho", "Renan Santos"],
    ["Eduardo Bolsonaro", "Eduardo Leite"],
  ];
  for (const [a, b] of pares) {
    assert(areDistinct(a, b, "presidente:BR"), `${a} × ${b}: a decisão nem na chave nacional resolve — a tabela mudou?`);
    for (const uf of ["PR", "SP", "AC", "TO"]) {
      assert(areDistinct(a, b, `presidente:${uf}`),
        `presidente:${uf}: "${a}" × "${b}" foram conferidos e são pessoas diferentes, e o guarda respondeu false`);
    }
  }
});

check("(a) a dobra é SÓ da presidencial — a regra, e não um efeito dela", (store, assert) => {
  // ⚠ ESTE CASO JÁ FOI FRACO E DEIXOU DUAS MUTAÇÕES PASSAREM. Ele afirmava
  // `!areDistinct(…, "senador:SP")` e concluía daí que a dobra não era do
  // cargo. Não conclui nada: uma dobra que mandasse TODA disputa para `<race>:BR`
  // levaria `senador:SP` a `senador:BR`, uma terceira chave que não guarda
  // decisão nenhuma — a asserção passa verde justamente porque o destino está
  // vazio. Era um teste que media o acaso do arquivo, não a regra.
  //
  // A regra, afirmada diretamente. É barato e é o único jeito de a asserção
  // falhar quando o escopo da dobra muda, em vez de quando os dados mudam.
  assert(chaveDeDisputa("presidente:PR") === "presidente:BR", `presidente:PR dobrou para ${chaveDeDisputa("presidente:PR")}`);
  assert(chaveDeDisputa("presidente:BR") === "presidente:BR", "presidente:BR não é ponto fixo");
  for (const c of ["senador:SP", "senador:RJ", "governador:PR", "governador:GO"]) {
    assert(chaveDeDisputa(c) === c,
      `${c} dobrou para ${chaveDeDisputa(c)} — a dobra é da CANDIDATURA presidencial, que é nacional; num cargo estadual ela funde estados`);
  }
  assert(ufDaCandidatura("presidente", "PR") === "BR", "a candidatura presidencial deixou de ser nacional");
  for (const [race, uf] of [["senador", "SP"], ["governador", "PR"]]) {
    assert(ufDaCandidatura(race, uf) === uf,
      `${race}:${uf} → ${ufDaCandidatura(race, uf)} — no casador de urna isso deixa uma disputa estadual casar candidatura de QUALQUER estado`);
  }

  // E o efeito, mantido: nenhuma decisão vaza para onde não foi gravada.
  assert(areDistinct("Flávio Bolsonaro", "Rogéria Bolsonaro", "senador:RJ"),
    "a decisão de senador:RJ deixou de resolver na própria chave");
  assert(!areDistinct("Flávio Bolsonaro", "Rogéria Bolsonaro", "senador:SP"),
    "uma decisão de senador:RJ vazou para senador:SP");
  assert(!areDistinct("Flávio Bolsonaro", "Jair Bolsonaro", "governador:PR"),
    "uma decisão de presidente:BR vazou para governador:PR");
  assert(!areDistinct("Lula", "Jair Bolsonaro", "presidente:PR"),
    "um par NUNCA conferido voltou true — a dobra está inventando decisão");
});

check("(a) a chave EXATA manda; a nacional é a SEGUNDA tentativa", (store, assert) => {
  // Existe ruling deliberadamente estadual numa disputa nacional. A de
  // `presidente:PR` é a que tirou os 32,2 de Tereza Cristina de cima de Jair
  // Bolsonaro; dobrar a chave ANTES de tentar a exata a apagaria e publicaria o
  // número errado de novo.
  assert(canonicalCandidate("Tereza Cristina, ex-presidente Jair Bolsonaro", "presidente:PR") === "Tereza Cristina",
    "a ruling estadual de presidente:PR ficou inalcançável — a dobra substituiu a chave em vez de completá-la");

  // ⚠ E O MESMO PARA `areDistinct`, que o arquivo real NÃO CONSEGUE exercitar:
  // as 25 decisões de `.distinct` estão em `presidente:BR` ou em disputas
  // estaduais, nenhuma em `presidente:<UF>`. Sem esta tabela injetada, trocar o
  // `||` por substituição passa verde — e passou, na primeira rodada de mutação
  // deste reparo. A tabela abaixo tem UMA decisão gravada na chave estadual de
  // uma disputa nacional, que é exatamente o caso que a substituição apaga.
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-apelidos-"));
  const arquivo = path.join(dir, "candidate-aliases.json");
  fs.writeFileSync(arquivo, JSON.stringify({
    version: 1, groups: [],
    distinct: [
      { contest: "presidente:PR", names: ["Fulano Estadual", "Fulano Nacional"] },
      { contest: "presidente:BR", names: ["Beltrano Nacional", "Beltrano Outro"] },
    ],
  }));
  try {
    usarTabelaDeApelidos(arquivo);
    assert(areDistinct("Fulano Estadual", "Fulano Nacional", "presidente:PR"),
      "a decisão gravada em presidente:PR ficou inalcançável — a consulta SUBSTITUI a chave em vez de tentar as duas");
    assert(areDistinct("Beltrano Nacional", "Beltrano Outro", "presidente:SP"),
      "a decisão gravada em presidente:BR não alcançou presidente:SP");
    assert(!areDistinct("Fulano Estadual", "Fulano Nacional", "presidente:SP"),
      "a decisão de presidente:PR vazou para presidente:SP — a dobra só sobe para a nacional, nunca desce dela");
  } finally {
    usarTabelaDeApelidos();
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("(a) a decisão nacional alcança a linha estadual pelo NOME EXIBIDO e pela ORIGEM", (store, assert) => {
  // A outra metade da dobra, e a que nenhuma asserção cobria: não é só
  // `areDistinct` que consulta a tabela por disputa. A ruling `presidente:BR`
  // "Ciro" → "Ciro Gomes" tem de alcançar as subamostras estaduais, ou toda
  // decisão que o dossiê novo produzir (ele emite `presidente|BR`) nasce morta
  // nas 25 amostras da mesma corrida.
  for (const uf of ["AC", "SP", "PR", "BA"]) {
    assert(canonicalCandidate("Ciro", `presidente:${uf}`) === "Ciro Gomes",
      `presidente:${uf}: a ruling nacional não alcança a linha estadual (exibe "${canonicalCandidate("Ciro", `presidente:${uf}`)}")`);
    // ⚠ E A ORIGEM TEM DE ACOMPANHAR. Enquanto `canonicalCandidate` dobrava e
    // `displayOrigin` não, estas duas discordavam em 22 disputas: o nome vinha
    // de uma ruling do criador e a origem dizia `null`, que `lib/store.mjs`
    // grava na pessoa e o consumo lê como "grafia mais curta observada".
    assert(displayOrigin("Ciro", `presidente:${uf}`) === "ruling",
      `presidente:${uf}: nome decidido por ruling com origem "${displayOrigin("Ciro", `presidente:${uf}`)}" — a tabela mente sobre quem decidiu`);
  }
  // O par indissociável, afirmado como invariante: as duas respondem sobre a
  // MESMA entrada da tabela, ou sobre nenhuma.
  for (const c of ["presidente:BR", "presidente:RO", "presidente:TO", "presidente:AC", "governador:GO", "senador:PB"]) {
    for (const n of ["Ciro", "Gustavo Medanha", "Marcelo Queiroga", "Nome Que Ninguém Decidiu"]) {
      const decidiu = canonicalCandidate(n, c) !== n;
      const origem = displayOrigin(n, c);
      assert(decidiu === (origem !== null),
        `${c} "${n}": exibido ${decidiu ? "" : "não "}decidido, mas origem ${JSON.stringify(origem)}`);
    }
  }
});

check("(b) a decisão resolve pelo nome que a escada de exibição publica", (store, assert) => {
  // Uma decisão é gravada contra a grafia PESQUISADA, e é o nome EXIBIDO que
  // chega a `areDistinct` (o agrupador compara nomes de cluster, já
  // canonicalizados). Os dois casos reais, medidos em 17/08/2026:
  const casos = [
    // grupo curado: "Gustavo Medanha" (pesquisado) → "Gustavo Mendanha" (exibido)
    ["governador:GO", "Gustavo Gayer", "Gustavo Medanha", "Gustavo Mendanha"],
    // nome de urna: "Marcelo Queiroga" (pesquisado) → "Dr. Marcelo Queiroga"
    // ⚠ o perigoso: Queiroga e Queiroz são DOIS homens do mesmo partido (PL) a
    // dois caracteres de distância. É o par que `candidate-resolve.mjs` cita
    // como o que a regra tipográfica fundiria se a evidência documental não o
    // tivesse decidido antes — e a decisão estava morta.
    ["senador:PB", "Marcelo Queiroz", "Marcelo Queiroga", "Dr. Marcelo Queiroga"],
  ];
  for (const [contest, outro, cru, exibido] of casos) {
    assert(canonicalCandidate(cru, contest) === exibido,
      `${contest}: a escada não exibe mais "${exibido}" para "${cru}" (exibe "${canonicalCandidate(cru, contest)}") — o caso mudou de forma`);
    assert(areDistinct(outro, cru, contest),
      `${contest}: a chave CRUA parou de resolver — as duas têm de resolver, nunca só a nova`);
    assert(areDistinct(outro, exibido, contest),
      `${contest}: "${outro}" × "${exibido}" é a decisão gravada, e o guarda respondeu false pelo nome que o site publica`);
  }
});

check("(d) o grupo curado DOBRA a entidade; o nome de urna nomeia o grupo INTEIRO", (store, assert) => {
  // O DEFEITO: um MESMA curado sendo revertido em silêncio pelo registro.
  //
  // Em `governador:TO` a curadoria decidiu que "Dorinha Rezende" e "Professora
  // Dorinha" são a MESMA mulher. Só o segundo nome casava com uma candidatura
  // (sq 270002544599), então só ele era renomeado — e o grupo saía partido em
  // dois nomes, duas linhas de candidato e duas pessoas, uma delas SEM registro.
  // O site publicava as duas. Um registro decide COMO CHAMAR alguém e nunca
  // QUEM ALGUÉM É; um grupo curado é decisão de identidade igual a uma ruling.
  const casos = [
    ["governador:TO", ["Dorinha Rezende", "Professora Dorinha"], "Professora Dorinha"],
    // O segundo caso da mesma classe, medido na mesma varredura: aqui é o
    // membro que ESTÁ no registro que era arrastado para longe do grupo.
    ["senador:TO", ["Carlos Caguin", "Carlos Gaguim"], "Gaguim"],
  ];
  for (const [contest, membros, esperado] of casos) {
    for (const m of membros) {
      assert(canonicalCandidate(m, contest) === esperado,
        `${contest}: "${m}" exibe "${canonicalCandidate(m, contest)}", e o grupo inteiro tem de exibir "${esperado}"`);
      assert(displayOrigin(m, contest) === "nome_urna",
        `${contest}: "${m}" saiu por "${displayOrigin(m, contest)}" — quem NOMEIA a entidade dobrada é o registro`);
    }
  }
  // A METADE QUE IMPEDE A DOBRA DE VIRAR UM FUNIL: um nome fora de qualquer
  // grupo continua sendo nomeado chave a chave, e um nome que nenhuma camada
  // tocou continua passando inteiro. Sem estas duas, a caixa acima passaria
  // numa implementação que renomeasse a disputa toda.
  assert(canonicalCandidate("Rogério Marinho", "senador:RN") === "Rogério Marinho",
    "um nome fora de grupo mudou — a dobra vazou para quem não é membro");
  assert(canonicalCandidate("Nome Que Nao Existe", "governador:TO") === "Nome Que Nao Existe",
    "um nome desconhecido deixou de passar inteiro");
  // E a ruling continua ACIMA do registro: a dobra mexe na camada do meio.
  assert(canonicalCandidate("Tereza Cristina, ex-presidente Jair Bolsonaro", "presidente:PR") === "Tereza Cristina",
    "a ruling estadual de presidente:PR foi derrubada pela dobra — ruling não é negociável");

  // ⚠ A CAMADA, E NÃO SÓ O NOME. Seis grupos curados têm membros cobertos por
  // ruling MESMA, e nos seis a ruling e o nome de urna escrevem A MESMA STRING
  // ("Jeferson Bezerra", "William Siri", "Cadu de Lula"…). Então trocar a ordem
  // das duas camadas não move UM caractere do que o site publica — só troca
  // `people.display_from` de "ruling" para "nome_urna", isto é, faz a tabela de
  // pessoas AFIRMAR que o TSE decidiu o nome quando quem decidiu foi o criador.
  // Sem esta asserção a inversão passava verde: foi uma mutação que sobreviveu.
  for (const [contest, membro] of [
    ["governador:MS", "Jefferson Bezerra"], ["governador:RJ", "Wiliam Siri"],
    ["governador:RN", "Cadu Xavier"], ["senador:CE", "Pastor Alcides"],
    ["senador:GO", "Vanderlan Gomes"],
  ]) {
    assert(displayOrigin(membro, contest) === "ruling",
      `${contest}: "${membro}" saiu por "${displayOrigin(membro, contest)}" — a ruling do criador foi rebaixada pelo registro`);
  }
});

check("(e) grupo curado CONTRADITO pelo registro: recusa, não escolha", (store, assert) => {
  // CONVENTIONS §4. Se os membros de um grupo curado carregam DOIS nomes de urna
  // distintos, o registro está afirmando que são pessoas diferentes e a
  // curadoria que são a mesma. Não há resposta certa a derivar daí — escolher um
  // lado é a forma exata do erro que juntou "Ciro" a "Ciro Nogueira". O grupo
  // mantém o comportamento anterior e a contradição vai para um humano.
  //
  // Nenhum grupo real está nesse estado hoje (medido em 17/08/2026: 0 de 39), e
  // é por isso que o caso é construído — um ramo de recusa que nunca é
  // percorrido é um ramo que ninguém provou. A porta é `usarRegistroDeUrna`, que
  // existe justamente para não sujar `data/ballot-names.json` no meio de uma
  // verificação (CONVENTIONS §3).
  const grupo = gruposCurados().find((g) => g.contest === "governador:TO" && g.display === "Dorinha Rezende");
  assert(!!grupo, "o grupo de governador:TO sumiu da tabela — este caso perdeu o seu sujeito");
  if (!grupo) return;
  const [a, b] = grupo.members;
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-urna-"));
  const arquivo = path.join(dir, "ballot-names.json");
  fs.writeFileSync(arquivo, JSON.stringify({
    mapping: {
      "governador:TO": {
        [normNome(a)]: { nome_urna: "Dorinha Um", sq_candidato: "900000000001", cargo: "governador", uf: "TO" },
        [normNome(b)]: { nome_urna: "Dorinha Dois", sq_candidato: "900000000002", cargo: "governador", uf: "TO" },
      },
    },
  }));
  try {
    usarRegistroDeUrna(arquivo);
    // RECUSA: cada grafia fica com o SEU nome de urna, como antes desta mudança.
    assert(canonicalCandidate(a, "governador:TO") === "Dorinha Um",
      `recusa quebrada: "${a}" virou "${canonicalCandidate(a, "governador:TO")}", esperado "Dorinha Um"`);
    assert(canonicalCandidate(b, "governador:TO") === "Dorinha Dois",
      `recusa quebrada: "${b}" virou "${canonicalCandidate(b, "governador:TO")}", esperado "Dorinha Dois"`);
    // E A RECUSA É VISÍVEL. Recusar em silêncio é o guarda que mente
    // (CONVENTIONS §2) — `buildStoreFromPolls` transforma isto em linha de
    // `conflicts.ndjson`, e é a única coisa que faz um humano olhar.
    const conflitos = identityConflicts();
    const c = conflitos.find((x) => x.contest === "governador:TO");
    assert(!!c, "a contradição não foi registrada — o grupo foi recusado em SILÊNCIO");
    assert(c && JSON.stringify(c.nomes_urna) === JSON.stringify(["Dorinha Dois", "Dorinha Um"]),
      `os nomes de urna em conflito saíram como ${JSON.stringify(c?.nomes_urna)} — esperado ambos, em ordem estável`);
  } finally {
    usarRegistroDeUrna();
    fs.rmSync(dir, { recursive: true, force: true });
  }
  // E O ARQUIVO REAL NÃO DEIXA CONFLITO PARA TRÁS: hoje nenhum grupo é
  // contraditado, então a lista volta vazia. Se um dia parar de voltar vazia, é
  // um humano que decide, e esta linha é o aviso.
  assert(identityConflicts().length === 0,
    `o registro real contradiz ${identityConflicts().length} grupo(s) curado(s): ` +
    `${identityConflicts().map((c) => `${c.contest} "${c.display}" → ${c.nomes_urna.join(" / ")}`).join("; ")} — ` +
    "decisão do criador, não do agente");
});

check("(c) a varredura EMITE a chave que a consulta procura", (store, assert) => {
  // O outro lado da mesma moeda. `candidate-resolve.mjs` grava
  // `x.contest.replace("|", ":")` em `data/candidate-aliases.json`, então a
  // chave que `candidate-review.mjs` monta É a chave sob a qual a decisão vai
  // ser gravada. Emitindo `presidente|PR`, uma decisão sobre a corrida
  // presidencial nasceria valendo em 1 das 26 amostras dela — e a metade (a)
  // acima teria de existir para sempre para tapar o buraco em vez de fechá-lo.
  const pares = revisao();
  const chaves = [...new Set(pares.map((p) => p.contest))];
  const estaduais = chaves.filter((c) => c.startsWith("presidente|") && c !== "presidente|BR");
  assert(estaduais.length === 0,
    `a varredura emitiu disputa presidencial com UF de amostra: ${estaduais.join(", ")}`);
  // ⚠ E A METADE OPOSTA, sem a qual uma dobra que colapsasse TODO cargo em
  // `<race>|BR` passaria verde aqui: as disputas estaduais têm de continuar
  // separadas por UF. Fundir `senador|SP` com `senador|RJ` compararia dois
  // homens diferentes que só dividem o nome, que é como a automação já foi
  // enganada uma vez (Professor Alcides, GO × CE).
  for (const race of ["senador", "governador"]) {
    assert(!chaves.includes(`${race}|BR`),
      `a varredura emitiu ${race}|BR — um cargo estadual não tem disputa nacional, a dobra vazou de cargo`);
    assert(chaves.filter((c) => c.startsWith(`${race}|`)).length > 1,
      `${race} caiu para uma chave só — as UFs foram fundidas`);
  }
  assert(pares.some((p) => p.contest === "presidente|BR"),
    "nenhum par presidencial na varredura — a bateria não está exercitando nada");
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

// ==========================================================================
// 10. O INSTITUTO — a terceira tabela cujo id se move
// ==========================================================================
//
// Os três casos abaixo rodam o CAMINHO DE VERDADE (`writeStoreFromPolls`, o
// mesmo que o coletor chama) contra um estado anterior gravado em diretório
// temporário. Chamar `traduzirCarimbos` direto provaria uma propriedade de
// código que o pipeline não executa — CONVENTIONS §2.

/** Um estado anterior com UMA linha de instituto, em diretório temporário. */
function dirComInstituto(linha) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-inst-"));
  fs.writeFileSync(path.join(dir, "institutes.ndjson"), JSON.stringify(linha) + "\n");
  return dir;
}

check("o instituto RECUNHADO leva o first_seen e grava a linhagem", (_store, assert) => {
  // O caso REAL, medido na rodada de 17/08/2026: `canonicalizePollsters` passou
  // a preferir o nome atestado mais curto, "Percent Brasil" virou "Percent", o
  // `institute_id` (cunhado do nome canônico) se moveu de `i_836e2d6c6f26` para
  // `i_661f5eabdd5a` — e três dias de `first_seen` morreram sem uma linha de log,
  // porque esta tabela não tinha tradução nenhuma nem campo `legacy_ids`.
  const dir = dirComInstituto({
    institute_id: "i_836e2d6c6f26", canonical: "Percent Brasil", aliases: ["Percent Brasil"],
    cnpj: null, merged_into: null, first_seen: "2026-08-14",
  });
  try {
    const { store: novo } = writeStoreFromPolls([poll({ pollster: "Percent" })],
      { runDate: "2026-08-17", dir });
    const inst = novo.institutes.find((i) => i.canonical === "Percent");
    assert(!!inst, "o instituto 'Percent' não foi cunhado");
    assert(inst?.institute_id === "i_661f5eabdd5a",
      `id inesperado: ${inst?.institute_id} (a semente do id mudou; o caso deixou de reproduzir o real)`);
    assert(inst?.first_seen === "2026-08-14",
      `first_seen ${inst?.first_seen} — a data NÃO atravessou a recunhagem`);
    assert((inst?.legacy_ids ?? []).includes("i_836e2d6c6f26"),
      `legacy_ids ${JSON.stringify(inst?.legacy_ids)} — o id antigo não ficou registrado`);
    assert(novo._report.translated.institutes === 1,
      `contador translated.institutes = ${novo._report.translated.institutes}, esperado 1`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("a linhagem do instituto NÃO evapora na rodada seguinte", (_store, assert) => {
  // O defeito que custou 1.080 linhas de candidato: a rodada N grava
  // `legacy_ids`, na N+1 nenhum id some, a tradução não roda, e como o store é
  // RECONSTRUÍDO DO ZERO a linha nasce com `legacy_ids: []`. A união com o
  // estado anterior é feita em `traduzirCarimbos`, antes de qualquer tradução —
  // este caso confere que ela vale também para institutos.
  const dir = dirComInstituto({
    institute_id: "i_836e2d6c6f26", canonical: "Percent Brasil", aliases: ["Percent Brasil"],
    cnpj: null, merged_into: null, first_seen: "2026-08-14",
  });
  try {
    writeStoreFromPolls([poll({ pollster: "Percent" })], { runDate: "2026-08-17", dir });
    const { store: n2 } = writeStoreFromPolls([poll({ pollster: "Percent" })],
      { runDate: "2026-09-20", dir });
    const inst = n2.institutes.find((i) => i.canonical === "Percent");
    assert((inst?.legacy_ids ?? []).includes("i_836e2d6c6f26"),
      `legacy_ids ${JSON.stringify(inst?.legacy_ids)} na rodada N+1 — a linhagem evaporou`);
    assert(inst?.first_seen === "2026-08-14",
      `first_seen ${inst?.first_seen} na rodada N+1 — a data se perdeu na segunda rodada`);
    assert(n2._report.translated.institutes === 0,
      `translated.institutes = ${n2._report.translated.institutes} na N+1 — nada se moveu, nada devia ser traduzido`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("recusa: token que alcança DOIS institutos novos não traduz nada", (_store, assert) => {
  // A chave de reencontro é GROSSA de propósito — é a mesma contenção de tokens
  // que decidiu que as duas linhas são um instituto só. O preço é que um token
  // pode alcançar mais de um alvo, e aí a única resposta honesta é NÃO escolher
  // (CONVENTIONS §4): sem isto, "Alfa Brasil" doaria a sua data ao primeiro
  // "Alfa" que aparecesse na ordem do array, que é procedência inventada.
  //
  // No banco vivo isto NÃO acontece hoje (medido: 0 de 137 institutos têm token
  // compartilhado, porque o próprio agrupamento já teria fundido dois nomes que
  // dividem um token distintivo). O caso é sintético porque a recusa tem de ser
  // exercitada mesmo assim — um guarda cujo caminho de falha nunca rodou não é
  // evidência de nada.
  const dir = dirComInstituto({
    institute_id: "i_ffffffffffff", canonical: "Alfa Brasil", aliases: ["Alfa Brasil"],
    cnpj: null, merged_into: null, first_seen: "2026-01-01",
  });
  try {
    const { store: novo } = writeStoreFromPolls([
      poll({ id: "a", pollster: "Alfa Pesquisas", tse_registration: "MG-11111/2026" }),
      poll({ id: "b", pollster: "Alfa Consultoria", tse_registration: "MG-22222/2026" }),
    ], { runDate: "2026-08-17", dir });
    assert(novo.institutes.length === 2, `${novo.institutes.length} institutos, esperado 2`);
    assert(novo._report.translated.institutes === 0,
      `traduziu ${novo._report.translated.institutes} — a ambiguidade foi resolvida por escolha`);
    assert(novo._report.translated.orphanedInstitutes === 1,
      `órfãos ${novo._report.translated.orphanedInstitutes}, esperado 1`);
    for (const i of novo.institutes) {
      assert(i.first_seen === "2026-08-17", `${i.canonical} herdou ${i.first_seen} de um casamento ambíguo`);
      assert(!(i.legacy_ids ?? []).length, `${i.canonical} herdou linhagem ${JSON.stringify(i.legacy_ids)}`);
    }
    const k = novo.conflicts.find((c) => c.type === "institute_id_orphaned");
    assert(!!k, "a recusa não deixou linha em conflicts.ndjson — silêncio não é sucesso (§2)");
    assert(k?.record_id === "i_ffffffffffff", `conflito sobre ${k?.record_id}`);
    assert((k?.incoming ?? []).length === 2, `o conflito não nomeia os dois alvos: ${JSON.stringify(k?.incoming)}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ==========================================================================
// 11. A FUSÃO DE INSTITUTOS — `merged_into`, a curadoria que se perdia
// ==========================================================================
//
// Os três casos abaixo também rodam o CAMINHO DE VERDADE
// (`writeStoreFromPolls`), pelo mesmo motivo do bloco 10: chamar
// `resolveInstitute` direto provaria uma propriedade de código que o coletor
// não executa (§2). O que eles exercitam é a caminhada de `merged_into` em
// `lib/store.mjs`, e cada um morre sob UMA mutação diferente dela.

const I_ALFA = mintInstituteId(`institute|${nameKey("Alfa")}`);
const I_BETA = mintInstituteId(`institute|${nameKey("Beta")}`);

/**
 * Estado anterior com a fusão CURADA "Alfa foi absorvida pela Beta", em
 * diretório temporário. Curadoria válida: as duas linhas existem e a cadeia
 * termina — é exatamente o que `validate-store.mjs` exige.
 */
function dirComFusao() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-fusao-"));
  fs.writeFileSync(path.join(dir, "institutes.ndjson"),
    JSON.stringify({ institute_id: I_ALFA, legacy_ids: [], canonical: "Alfa", aliases: ["Alfa"],
      cnpj: null, merged_into: I_BETA, first_seen: "2026-01-01" }) + "\n" +
    JSON.stringify({ institute_id: I_BETA, legacy_ids: [], canonical: "Beta", aliases: ["Beta"],
      cnpj: null, merged_into: null, first_seen: "2026-01-01" }) + "\n");
  return dir;
}

/**
 * Pesquisas com data DECRESCENTE, que é a ordem em que `buildStoreFromPolls` as
 * ingere (prioridade de fonte, depois `fieldwork_end` DESC). É por aqui que a
 * ORDEM DE CHEGADA é controlada — e é a ordem de chegada, não a curadoria, que
 * decide se o alvo da fusão já existe quando a cadeia é caminhada.
 */
const pesquisaDe = (pollster, reg, fim) => poll({
  id: `${pollster}-${reg}`, pollster, tse_registration: `MG-${reg}/2026`,
  fieldwork_start: fim, fieldwork_end: fim, published_date: fim,
});

check("instituto: fusão cujo alvo ainda não chegou NÃO cunha linha duplicada", (_store, assert) => {
  // A REPRODUÇÃO, sem curadoria ruim nenhuma. `store.institutes` é construído
  // incrementalmente na ordem de chegada; aqui as duas pesquisas da Alfa chegam
  // ANTES da primeira pesquisa da Beta, então na segunda consulta a "Alfa" o
  // alvo da fusão ainda não tem linha. Sem o `break`, `resolveInstitute` caía
  // para a cunhagem a partir do MESMO `nameKey` e produzia uma segunda linha com
  // o MESMO `institute_id` — e `validate-store.mjs` reprovava a rodada inteira
  // na unicidade de id entre tabelas. Medido antes do reparo:
  //   linhas: 2 · ids: ["i_c6677180a1c2","i_c6677180a1c2"]
  //   ERRO: id duplicado "i_c6677180a1c2" em institutes e institutes
  const dir = dirComFusao();
  try {
    const { store: novo } = writeStoreFromPolls([
      pesquisaDe("Alfa", "11111", "2026-06-05"),
      pesquisaDe("Alfa", "22222", "2026-06-04"),
      pesquisaDe("Beta", "33333", "2026-05-01"),
    ], { runDate: "2026-08-17", dir });
    const ids = novo.institutes.map((i) => i.institute_id);
    assert(new Set(ids).size === ids.length,
      `institute_id duplicado: ${JSON.stringify(ids)} — a cadeia caiu na cunhagem em vez de parar`);
    assert(novo.institutes.length === 2, `${novo.institutes.length} institutos, esperado 2 (Alfa e Beta)`);
    // E o guarda que reprovaria a rodada é consultado DE VERDADE, não citado de
    // memória: silêncio não é sucesso (§2).
    const { errors } = validateStore(novo);
    const dup = errors.filter((e) => /id duplicado/.test(e));
    assert(dup.length === 0, `validate-store reprovaria: ${dup.join(" · ")}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("instituto: o `merged_into` curado ATRAVESSA a reconstrução do zero", (_store, assert) => {
  // O store é refeito do zero a cada rodada, então tudo que não se re-deriva da
  // entrada tem de ser carregado do estado anterior — `legacy_ids` e o
  // `merged_into` da PESSOA já pagaram este defeito. `resolveInstitute` fixava
  // `merged_into: null` na cunhagem: uma fusão decidida à mão sobrevivia a UMA
  // reconstrução e evaporava na coleta seguinte, sem erro e sem log. O carry lê
  // `priorStamps().institutesById`, gêmeo de `peopleById` (§5).
  const dir = dirComFusao();
  try {
    const { store: novo } = writeStoreFromPolls([
      pesquisaDe("Alfa", "11111", "2026-06-05"),
      pesquisaDe("Beta", "33333", "2026-05-01"),
    ], { runDate: "2026-08-17", dir });
    const alfa = novo.institutes.find((i) => i.institute_id === I_ALFA);
    assert(!!alfa, "a linha da Alfa não foi cunhada");
    assert(alfa?.merged_into === I_BETA,
      `merged_into = ${JSON.stringify(alfa?.merged_into)} — a fusão curada evaporou na reconstrução`);
    // E a metade oposta, sem a qual um carry que copiasse qualquer coisa passaria
    // verde: quem NÃO foi fundido continua nascendo com o campo nulo.
    const beta = novo.institutes.find((i) => i.institute_id === I_BETA);
    assert(beta?.merged_into === null, `Beta nasceu com merged_into ${JSON.stringify(beta?.merged_into)}`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

check("instituto: o índice acha o sobrevivente cunhado NESTA rodada", (_store, assert) => {
  // CONVENTIONS §7 — o índice tem de responder "o que me atualiza DURANTE uma
  // rodada?". No caminho de reconstrução o load traz NADA (`emptyIndexes()`),
  // então `instituteById` só existe pelo `set` no mint. Aqui a Beta chega
  // PRIMEIRO (data mais recente), a Alfa depois: a segunda consulta a "Alfa"
  // caminha a fusão e só alcança a Beta se o índice tiver sido atualizado no
  // write. Com o índice construído e não mantido, a fusão é ignorada em silêncio
  // e a pesquisa fica pendurada no instituto absorvido.
  const dir = dirComFusao();
  try {
    const { store: novo } = writeStoreFromPolls([
      pesquisaDe("Beta", "33333", "2026-07-01"),
      pesquisaDe("Alfa", "11111", "2026-06-05"),
      pesquisaDe("Alfa", "22222", "2026-06-04"),
    ], { runDate: "2026-08-17", dir });
    const segunda = novo.surveys.find((s) => s.tse_registration === "MG-22222/2026");
    assert(!!segunda, "a segunda pesquisa da Alfa não foi gravada");
    assert(segunda?.institute_id === I_BETA,
      `pesquisa em ${segunda?.institute_id}, esperado ${I_BETA} — a fusão não foi seguida dentro da rodada`);
    // ⚠ COMPORTAMENTO REGISTRADO, NÃO ENDOSSADO. A PRIMEIRA pesquisa da Alfa
    // fica no instituto ABSORVIDO, porque a cunhagem devolve a linha recém-criada
    // sem caminhar a cadeia — exatamente como `ensurePerson` faz com pessoas. O
    // efeito é que a mesma fusão dá dois `institute_id` diferentes a duas
    // pesquisas da mesma rodada, conforme a ordem de chegada. Fica fixado aqui
    // para que a assimetria seja VISÍVEL: mudá-la é decisão do criador (§12), e
    // vale para as duas tabelas ao mesmo tempo (§5), não só para esta.
    const primeira = novo.surveys.find((s) => s.tse_registration === "MG-11111/2026");
    assert(primeira?.institute_id === I_ALFA,
      `a primeira pesquisa da Alfa saiu em ${primeira?.institute_id} — o comportamento mudou, releia a nota acima`);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ---------------------------------------------------------------- resultado
console.log(`\n${passes} passaram · ${failures} falharam`);
if (failures) {
  console.error("HARNESS FALHOU — o caminho de escrita não se comporta como especificado.");
  process.exit(1);
}
console.log("CAMINHO DE ESCRITA OK — escada, recusas, semântica de upsert, idempotência e identidade.");
