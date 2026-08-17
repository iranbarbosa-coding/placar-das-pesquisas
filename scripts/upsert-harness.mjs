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
import {
  readStore, writeStore, markHeadlines, resolveCandidate, resolvePerson,
  priorStamps, emptyIndexes, TABLE_NAMES,
} from "./lib/store.mjs";
import { upsertPoll } from "./lib/upsert.mjs";
import { mintCandidateId, nameKey } from "./lib/ids.mjs";
import { normNome } from "./lib/nomes.mjs";
import { pessoasRegistradas } from "./lib/people.mjs";
import { ballotCandidacy } from "./lib/candidates.mjs";

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
