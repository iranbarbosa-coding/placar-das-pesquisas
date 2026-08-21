#!/usr/bin/env node
// DECISÃO DE EXISTÊNCIA SÓ CONTA REGISTRO QUE SOBREVIVE AO GUARDA DE SOMA.
//
// O defeito guardado é de COMPOSIÇÃO, não de nenhuma peça isolada: mergePolls,
// applyRepairs (a dispensa "a fonte já serve esta pesquisa"),
// dropExactDuplicates e keepFullestRound1 decidem quem EXISTE antes de o
// guarda de soma do coletor rodar — e cada um podia preferir um registro que
// morria no guarda logo depois, levando a pesquisa inteira junto. Dois casos
// medidos no ensaio de 20/08/2026:
//
//   · presidente:AM — a curada do Direto ao Ponto foi inserida, a dedupe entre
//     marcas manteve "a de maior prioridade" (o nativo "Direito ao Ponto",
//     soma 21), o nativo morreu no guarda (21 < 30) → coleta final ZERADA;
//   · presidente:RO 1º turno — o add_poll foi dispensado apontando para
//     p360-13645-…, que somava 16 e morreu no guarda → pesquisa perdida.
//
// A regra consertada mora em `veredictoDeSoma` (lib/soma.mjs), UMA
// implementação para o guarda e para as quatro decisões (CONVENTIONS §5).
//
// ⚠ AS DUAS METADES SÃO IGUALMENTE OBRIGATÓRIAS. O conserto não pode virar
// "quebrado sempre perde a identidade": quando os DOIS lados sobrevivem, a
// prioridade de fonte e a riqueza de elenco decidem exatamente como antes —
// metade dos casos abaixo afirma isso, e é ela que impede o conserto de
// rebaixar registro válido.
//
// ⚠ E O AUTOTESTE REPROVA (CONVENTIONS §2). `--self-test` roda a bateria com a
// decisão REVERTIDA para a antiga — `sobrevive: () => true`, que é exatamente o
// comportamento pré-conserto sobre as funções de verdade, o mesmo padrão de
// mutação honesta do `inserir` de `curated-insert-check.mjs` — em dois modos
// (dedupe/merge e dispensa), e exige que cada modo derrube o SEU conjunto de
// casos SEM derrubar os controles de não-regressão.
//
// Uso: node scripts/existencia-pos-guarda-check.mjs [--self-test] [--verbose]
import { mergePolls, dropExactDuplicates, keepFullestRound1 } from "./scrape.mjs";
import { applyRepairs, inserirPesquisaCurada } from "./lib/repairs.mjs";
import { veredictoDeSoma } from "./lib/soma.mjs";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const VERBOSE = process.argv.includes("--verbose");

// O filtro do coletor, remontado do MESMO veredicto que ele usa — a única parte
// que fica de fora é o console.warn, que não decide nada.
const guarda = (polls) => polls.filter((p) => veredictoDeSoma(p).ok);

// ---------------------------------------------------------------- fixtures
//
// Nomes deliberadamente inexistentes no registro do TSE, pela mesma razão de
// `curated-insert-check.mjs`: um nome real faria o caso depender de
// `data/candidaturas.ndjson`. As grafias de instituto reproduzem a FORMA do
// caso AM — duas marcas do mesmo instituto ("Direito"/"Direto") que só a
// dedupe entre marcas junta, porque `bucketKey` as separa.
const FIM = "2026-06-20";

/** A curada: elenco cheio, soma 100 — sobrevive ao guarda. */
const curada = (over = {}) => ({
  id: "curado-eeeeeeeeeeee", source: "repair:curadoria",
  pollster: "Direto de Ensaio Pesquisas", race: "presidente", state: "AM", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/relatorio.pdf",
  fieldwork_start: "2026-06-18", fieldwork_end: FIM, published_date: FIM,
  sample_size: null, margin_of_error: null, tse_registration: null,
  results: [
    { candidate: "Alfa Existencia", party: "PT", pct: 34 },
    { candidate: "Beta Existencia", party: "PL", pct: 21 },
    { candidate: "Gama Existencia", party: "PSD", pct: 12 },
    { candidate: "Delta Existencia", party: "Novo", pct: 8 },
    { candidate: "Epsilon Existencia", party: "PV", pct: 6 },
    { candidate: "Zeta Existencia", party: "PCB", pct: 3 },
    { candidate: "Eta Existencia", party: "UP", pct: 1 },
  ],
  others_pct: null, undecided_pct: 9, blank_null_pct: 6,
  repaired: { source: "https://exemplo/relatorio.pdf", evidence: "p.3", verified_at: "2026-08-20", inserted: true },
  ...over,
});

/**
 * O nativo QUEBRADO da mesma pesquisa: um fragmento com 3 dos 7 candidatos,
 * pcts idênticos aos da curada (é o que dispara a dedupe entre marcas), soma 21
 * — reprova no guarda, como o "Direito ao Ponto" real.
 */
const nativoQuebrado = (over = {}) => ({
  id: "wiki-fragmento-am", source: "wikipedia",
  pollster: "Direito de Ensaio", race: "presidente", state: "AM", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/wiki",
  fieldwork_start: "2026-06-18", fieldwork_end: FIM, published_date: FIM,
  sample_size: null, margin_of_error: null, tse_registration: null,
  results: [
    { candidate: "Gama Existencia", party: "PSD", pct: 12 },
    { candidate: "Delta Existencia", party: "Novo", pct: 8 },
    { candidate: "Eta Existencia", party: "UP", pct: 1 },
  ],
  others_pct: null, undecided_pct: null, blank_null_pct: null,
  ...over,
});

/** O nativo VÁLIDO: mesma tabela cheia da curada — os dois sobrevivem. */
const nativoValido = () => nativoQuebrado({
  results: structuredClone(curada().results),
  undecided_pct: 9, blank_null_pct: 6,
});

// O par do caso de MERGE: mesma marca nas duas fontes (mesmo balde do
// `bucketKey`), o Poder360 com MAIS linhas somando 20 — "mais rico" para
// `richerRoster` e morto para o guarda — e a Wikipédia com 4 linhas somando 100.
const MARCA = "Instituto de Existencia";
const merge360 = () => ({
  id: "p360-990001-1-0-ffffffffffff", source: "poder360",
  pollster: MARCA, race: "governador", state: "AM", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/materia",
  fieldwork_start: "2026-06-18", fieldwork_end: FIM, published_date: FIM,
  sample_size: 1000, margin_of_error: 3, tse_registration: "AM-99001/2026",
  results: [
    { candidate: "Alfa Existencia", party: "PT", pct: 5 },
    { candidate: "Beta Existencia", party: "PL", pct: 4 },
    { candidate: "Gama Existencia", party: "PSD", pct: 3 },
    { candidate: "Delta Existencia", party: "Novo", pct: 3 },
    { candidate: "Epsilon Existencia", party: "PV", pct: 2 },
    { candidate: "Zeta Existencia", party: "PCB", pct: 2 },
    { candidate: "Eta Existencia", party: "UP", pct: 1 },
  ],
  others_pct: null, undecided_pct: null, blank_null_pct: null,
});
const mergeWiki = (results, buckets = { undecided_pct: 8, blank_null_pct: 5 }) => ({
  id: "wiki-am-gov", source: "wikipedia",
  pollster: MARCA, race: "governador", state: "AM", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/wiki",
  fieldwork_start: "2026-06-18", fieldwork_end: FIM, published_date: FIM,
  sample_size: null, margin_of_error: null, tse_registration: null,
  results, others_pct: null, ...buckets,
});
const QUATRO_VIVAS = [
  { candidate: "Alfa Existencia", party: "PT", pct: 40 },
  { candidate: "Beta Existencia", party: "PL", pct: 28 },
  { candidate: "Gama Existencia", party: "PSD", pct: 12 },
  { candidate: "Delta Existencia", party: "Novo", pct: 7 },
];

// O spec de add_poll do caso RO, escrito em disco para atravessar `applyRepairs`
// de verdade — chamar a decisão direto provaria uma propriedade que o coletor
// não executa (o mesmo argumento de `curated-insert-check.mjs`).
const RTBD = "Instituto da Dispensa";
function specAddPoll(dir) {
  const f = path.join(dir, "reparo-de-teste.json");
  fs.writeFileSync(f, JSON.stringify({
    version: 1,
    repairs: [{
      match: { pollster: RTBD, race: "presidente", state: "RO", round: 1, fieldwork_end: "2026-07-15" },
      defect: "a fonte serve só um fragmento (soma 16) desta pesquisa",
      source: "https://exemplo/relatorio-ro.pdf",
      evidence: "p.5, tabela estimulada; duas leituras cegas",
      verified_at: "2026-08-20",
      add_poll: {
        pollster: RTBD, race: "presidente", state: "RO", round: 1,
        scenario: "1º turno", fieldwork_start: "2026-07-13", fieldwork_end: "2026-07-15",
        published_date: "2026-07-16", sample_size: 1200, margin_of_error: 3,
        results: [
          { candidate: "Alfa Existencia", party: "PT", pct: 39 },
          { candidate: "Beta Existencia", party: "PL", pct: 33 },
          { candidate: "Gama Existencia", party: "PSD", pct: 11 },
        ],
        others_pct: null, undecided_pct: 10, blank_null_pct: 7,
      },
      expect_sum: 100,
    }],
  }, null, 1));
  return f;
}

/**
 * O alvo da dispensa: casa a cláusula match E o elenco (os mesmos 3 nomes),
 * mas com pcts de fragmento — soma 16, como o p360-13645 real. É o pior caso
 * de propósito: sem o conserto da DISPENSA ele dispensa, e sem o filtro do
 * VIZINHO ele recusa — os dois lados do conserto são exercitados por um só
 * registro, que é exatamente a forma do caso RO.
 */
const alvoDispensa = (over = {}) => ({
  id: "p360-990002-1-0-a1a1a1a1a1a1", source: "poder360",
  pollster: RTBD, race: "presidente", state: "RO", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/materia",
  fieldwork_start: "2026-07-13", fieldwork_end: "2026-07-15", published_date: "2026-07-16",
  sample_size: 1200, margin_of_error: 3, tse_registration: null,
  results: [
    { candidate: "Alfa Existencia", party: "PT", pct: 9 },
    { candidate: "Beta Existencia", party: "PL", pct: 5 },
    { candidate: "Gama Existencia", party: "PSD", pct: 2 },
  ],
  others_pct: null, undecided_pct: null, blank_null_pct: null,
  ...over,
});
/**
 * A curada do caso de `keepFullestRound1`: os MESMOS 3 nomes do fragmento
 * `alvoDispensa` (elenco igual, pcts de tabela viva), mesma marca, mesma data
 * — a chave e o tamanho empatam, e só o guarda de soma os separa.
 */
const curadaRo = (over = {}) => alvoDispensa({
  id: "curado-a2a2a2a2a2a2", source: "repair:curadoria",
  results: [
    { candidate: "Alfa Existencia", party: "PT", pct: 39 },
    { candidate: "Beta Existencia", party: "PL", pct: 33 },
    { candidate: "Gama Existencia", party: "PSD", pct: 11 },
  ],
  undecided_pct: 10, blank_null_pct: 7,
  repaired: { source: "https://exemplo/relatorio-ro.pdf", evidence: "p.5", verified_at: "2026-08-20", inserted: true },
  ...over,
});

const alvoValido = () => alvoDispensa({
  results: [
    { candidate: "Alfa Existencia", party: "PT", pct: 39 },
    { candidate: "Beta Existencia", party: "PL", pct: 33 },
    { candidate: "Gama Existencia", party: "PSD", pct: 11 },
  ],
  undecided_pct: 10, blank_null_pct: 7,
});

// ------------------------------------------------------------------ runner
//
// `mutacao` reverte o conserto — e SÓ ele — sobre as funções de verdade:
//   cega-dedupe   → dropExactDuplicates e mergePolls com sobrevive: () => true
//   cega-dispensa → inserirPesquisaCurada com sobrevive: () => true
function rodar({ mutacao = null } = {}) {
  const CEGO = { sobrevive: () => true };
  const oDedupe = mutacao === "cega-dedupe" ? CEGO : {};
  const oInserir = mutacao === "cega-dispensa"
    ? { inserir: (polls, rep, targets, label) => inserirPesquisaCurada(polls, rep, targets, label, CEGO) }
    : {};

  const falhas = [];
  let ok = 0;
  const caso = (nome, fn) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-existencia-"));
    const problemas = [];
    const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
    try {
      fn({ dir, afirma });
    } catch (e) {
      problemas.push(`exceção: ${e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message}`);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
    if (problemas.length) {
      falhas.push(nome);
      if (!mutacao || VERBOSE) {
        console.log(`✗ ${nome}`);
        for (const p of problemas) console.log(`    ${p}`);
      }
    } else {
      ok++;
      if (!mutacao) console.log(`✓ ${nome}`);
    }
  };

  // ====================================================================
  // A. O CASO presidente:AM — dedupe entre marcas contra nativo quebrado
  // ====================================================================

  caso("dedupe: a curada VÁLIDA sobrevive ao nativo quebrado da mesma pesquisa", ({ afirma }) => {
    const depois = guarda(dropExactDuplicates([nativoQuebrado(), curada()], oDedupe));
    afirma(depois.length === 1, `${depois.length} pesquisas depois do guarda, esperado 1 — a disputa fechou ${depois.length === 0 ? "ZERADA (o defeito do AM)" : "duplicada"}`);
    afirma(depois[0]?.id === "curado-eeeeeeeeeeee", `sobrou "${depois[0]?.id}", esperada a curada`);
  });

  caso("dedupe (controle): o nativo VÁLIDO ainda vence a curada por prioridade", ({ afirma }) => {
    const depois = guarda(dropExactDuplicates([nativoValido(), curada()], oDedupe));
    afirma(depois.length === 1, `${depois.length} pesquisas depois do guarda, esperado 1`);
    afirma(depois[0]?.id === "wiki-fragmento-am",
      `sobrou "${depois[0]?.id}", esperado o nativo — o conserto rebaixou um registro válido`);
  });

  // ====================================================================
  // B. A DOAÇÃO DE TABELA NO MERGE ENTRE FONTES
  // ====================================================================

  caso("merge: a tabela que sobrevive doa, mesmo sendo a menos rica", ({ afirma }) => {
    const depois = guarda(mergePolls([[merge360()], [mergeWiki(structuredClone(QUATRO_VIVAS))]], oDedupe));
    afirma(depois.length === 1, `${depois.length} pesquisas depois do guarda, esperado 1 — a tabela morta doou e a pesquisa morreu com ela`);
    afirma(depois[0]?.results.length === 4, `${depois[0]?.results.length} linhas, esperadas as 4 vivas da Wikipédia`);
    // A prioridade segue mandando nos METADADOS — só a tabela muda de doador.
    afirma(depois[0]?.tse_registration === "AM-99001/2026", "o merge perdeu o registro TSE do Poder360");
  });

  caso("merge (controle): entre duas tabelas vivas, a mais rica ainda doa (o caso do Acre)", ({ afirma }) => {
    // O Poder360 com 3 linhas somando 95, a Wikipédia com 6 linhas somando 108
    // com os baldes: os dois sobrevivem, então vale `richerRoster` — como no
    // Senado do Acre.
    const p360 = merge360();
    p360.results = [
      { candidate: "Alfa Existencia", party: "PT", pct: 50 },
      { candidate: "Beta Existencia", party: "PL", pct: 30 },
      { candidate: "Gama Existencia", party: "PSD", pct: 15 },
    ];
    const wiki = mergeWiki([
      ...structuredClone(QUATRO_VIVAS),
      { candidate: "Epsilon Existencia", party: "PV", pct: 5 },
      { candidate: "Zeta Existencia", party: "PCB", pct: 3 },
    ]);
    const depois = guarda(mergePolls([[p360], [wiki]], oDedupe));
    afirma(depois.length === 1, `${depois.length} pesquisas depois do guarda, esperado 1`);
    afirma(depois[0]?.results.length === 6,
      `${depois[0]?.results.length} linhas, esperadas as 6 da tabela mais rica — o conserto revogou o richerRoster entre vivas`);
  });

  // ====================================================================
  // C. O "MAIS CHEIO" DO 1º TURNO — a quarta decisão da mesma família
  // ====================================================================

  caso("round 1: a curada VIVA vence o fragmento morto de elenco IGUAL (o empate ficava com o nativo)", ({ afirma }) => {
    // O pior caso do RO real: a curada tem os MESMOS 3 nomes do fragmento
    // (elenco igual ⇒ empate de tamanho, que a regra antiga dava ao primeiro
    // da lista — o nativo, porque a curada entra pelo fim). Mesma marca e
    // mesma data ⇒ mesma chave de `keepFullestRound1`.
    const polls = keepFullestRound1([alvoDispensa(), curadaRo()], oDedupe);
    const depois = guarda(polls);
    afirma(depois.length === 1, `${depois.length} pesquisas depois do guarda, esperado 1 — ${depois.length === 0 ? "o empate elegeu o fragmento morto e a disputa fechou ZERADA" : "as duas ficaram"}`);
    afirma(String(depois[0]?.id).startsWith("curado-"), `sobrou "${depois[0]?.id}", esperada a curada`);
  });

  caso("round 1 (controle): entre duas vivas, a de elenco mais cheio ainda fica", ({ afirma }) => {
    const cheia = curadaRo();
    const curta = curadaRo({
      id: "curado-b2b2b2b2b2b2",
      results: cheia.results.slice(0, 2), undecided_pct: 30, blank_null_pct: 26,
    });
    const polls = keepFullestRound1([curta, cheia], oDedupe);
    afirma(polls.length === 1 && polls[0]?.id === cheia.id,
      `ficou "${polls.map((p) => p.id).join(", ")}", esperada a de elenco mais cheio — o conserto revogou a regra entre vivas`);
  });

  // ====================================================================
  // D. O CASO presidente:RO — a dispensa do add_poll
  // ====================================================================

  caso("add_poll: alvo que reprovaria a soma NÃO dispensa — insere, e a pesquisa fecha a rodada viva", ({ dir, afirma }) => {
    const polls = [alvoDispensa()];
    const rel = applyRepairs(polls, { file: specAddPoll(dir), ...oInserir });
    afirma(rel.inserted.length === 1, `inserted = ${rel.inserted.length}, esperado 1 (noop: ${rel.noop.join(" | ") || "nenhum"}; avisos: ${rel.warnings.join(" | ") || "nenhum"})`);
    afirma(rel.noop.length === 0, `a inserção foi dispensada: ${rel.noop.join(" | ")}`);
    afirma(rel.warnings.some((w) => /reprovaria/.test(w) && /MANTIDA/.test(w)),
      `a decisão não disse em voz alta que o alvo morreria: ${rel.warnings.join(" | ") || "nenhum aviso"}`);
    const depois = guarda(polls);
    afirma(depois.length === 1, `${depois.length} pesquisas depois do guarda, esperado 1 — ${depois.length === 0 ? "a pesquisa se perdeu pelos dois caminhos (o defeito do RO)" : "o fragmento sobreviveu junto"}`);
    afirma(String(depois[0]?.id).startsWith("curado-"), `sobrou "${depois[0]?.id}", esperada a curada`);
  });

  caso("add_poll (controle): alvo VÁLIDO ainda dispensa a inserção", ({ dir, afirma }) => {
    const polls = [alvoValido()];
    const rel = applyRepairs(polls, { file: specAddPoll(dir), ...oInserir });
    afirma(rel.inserted.length === 0, `inseriu ao lado de um alvo válido (${rel.inserted.length}) — a operação de campo foi duplicada`);
    afirma(rel.noop.length === 1 && /já serve/.test(rel.noop[0] ?? ""),
      `a dispensa não aconteceu ou não disse o motivo: ${rel.noop.join(" | ") || "nenhum noop"}`);
    afirma(polls.length === 1, `${polls.length} pesquisas na lista, esperado 1`);
  });

  return { ok, falhas };
}

// ------------------------------------------------------------------- saída
const CONTROLES = [
  "dedupe (controle): o nativo VÁLIDO ainda vence a curada por prioridade",
  "merge (controle): entre duas tabelas vivas, a mais rica ainda doa (o caso do Acre)",
  "round 1 (controle): entre duas vivas, a de elenco mais cheio ainda fica",
  "add_poll (controle): alvo VÁLIDO ainda dispensa a inserção",
];

if (process.argv.includes("--self-test")) {
  // CADA REVERSÃO DERRUBA O SEU CONJUNTO — E NENHUM CONTROLE. Exigir só "alguma
  // falha" deixaria passar uma bateria que reprova pelo lado errado; um
  // controle caindo sob mutação significaria que a bateria não distingue o
  // conserto do comportamento antigo.
  const esperado = {
    "cega-dedupe": [
      "dedupe: a curada VÁLIDA sobrevive ao nativo quebrado da mesma pesquisa",
      "merge: a tabela que sobrevive doa, mesmo sendo a menos rica",
      "round 1: a curada VIVA vence o fragmento morto de elenco IGUAL (o empate ficava com o nativo)",
    ],
    "cega-dispensa": [
      "add_poll: alvo que reprovaria a soma NÃO dispensa — insere, e a pesquisa fecha a rodada viva",
    ],
  };
  let ok = true;
  for (const [modo, devemCair] of Object.entries(esperado)) {
    const { falhas } = rodar({ mutacao: modo });
    const faltando = devemCair.filter((n) => !falhas.includes(n));
    const controlesCaidos = CONTROLES.filter((n) => falhas.includes(n));
    if (faltando.length || controlesCaidos.length) {
      ok = false;
      for (const n of faltando) console.error(`AUTOTESTE FALHOU (${modo}): não reprovou → ${n}`);
      for (const n of controlesCaidos) console.error(`AUTOTESTE FALHOU (${modo}): controle caiu sob mutação → ${n}`);
      continue;
    }
    console.log(`autoteste (${modo}): a bateria REPROVA ${falhas.length} caso(s) com a decisão revertida, controles de pé`);
    for (const n of falhas) console.log(`  detectado → ${n}`);
  }
  process.exit(ok ? 0 : 1);
}

const { ok, falhas } = rodar();
console.log(`\n${ok} passaram · ${falhas.length} falharam`);
if (falhas.length) {
  console.error("EXISTÊNCIA PÓS-GUARDA FALHOU — uma decisão de existência ainda prefere registro que morre no guarda de soma.");
  process.exit(1);
}
console.log("EXISTÊNCIA PÓS-GUARDA OK — dedupe, merge, mais-cheio do 1º turno e dispensa só contam registro que sobrevive ao guarda de soma; prioridade e riqueza intactas entre vivos.");
