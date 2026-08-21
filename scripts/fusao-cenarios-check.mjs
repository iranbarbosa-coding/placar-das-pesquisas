#!/usr/bin/env node
// A FUSÃO DE CENÁRIOS E O PASSE-NULO DE DATA — os dois defeitos mecânicos de
// `mergePolls` consertados em 21/08/2026, cada um com seu caso real:
//
//   · senador:AC — `datesClose` devolvia true quando QUALQUER lado não tinha
//     data, então a pesquisa de dez/2025 (p360-13111, ano-typo "2005" anulado
//     pela sanitização) foi absorvida pela de 25/07/2026 (p360-13593) só
//     porque os elencos batiam. Sete meses de distância, um registro só.
//   · governador:SP 19/11 (e toda a classe provada pela varredura de
//     21/08/2026) — fragmentos da mesma rodada com rótulos "cenário X/Y"
//     DISTINTOS são perguntas distintas, e o merge cego a cenário os costurava
//     num registro cuja identidade vinha de um fragmento e a tabela de outro.
//
// ⚠ AS DUAS METADES SÃO IGUALMENTE OBRIGATÓRIAS, como em
// `existencia-pos-guarda-check.mjs`: o conserto não pode virar "nada mais
// funde". A duplicata legítima entre fontes (mesmo cenário, mesma data — o
// padrão SP 23/02) ainda funde; o fragmento sem data ainda completa o irmão
// quando a chave forte (mesmo registro nativo da fonte) liga os dois; e a
// tabela mais cheia ainda vence entre fontes (o caso do Acre 6×3). Metade dos
// casos abaixo afirma isso.
//
// ⚠ E O AUTOTESTE REPROVA (CONVENTIONS §2). `--self-test` roda a bateria com
// cada conserto REVERTIDO para o comportamento antigo — `dataNulaCasa: () =>
// true` é exatamente o passe-nulo, `cenarioCompativel: () => true` é
// exatamente o merge cego a cenário, as duas mutações honestas sobre as
// funções de verdade — e exige que cada modo derrube o SEU conjunto de casos
// SEM derrubar controle nenhum e sem falha inesperada.
//
// TERCEIRO CONSERTO DA MESMA FRENTE (21/08/2026): o ESTÍMULO declarado.
// senador:PR IRG 08–12/08 — a espontânea do Poder360 (p360-13833-1-1, Deltan
// 7,6 · indecisos 71, intacta na fonte) caiu no slot da linha estimulada da
// Wikipédia (9 candidatos, soma ~180, viva sob o teto de 260 do Senado) e,
// sendo a mais cheia, a estimulada doou: a espontânea foi destruída na
// construção e o legacy dela colado na pergunta estimulada. Perguntas de
// estímulos declarados DIFERENTES nunca se fundem; sem marca declarada, a
// regra de sempre (§4). A mutação honesta é `estimuloCompativel: () => true`
// — a fusão cega a estímulo de antes — sobre `mergePolls` E sobre
// `keepFullestRound1`, porque o funil de 1º turno desfazia a recusa uma
// decisão adiante (a mais cheia engolia a espontânea por outra porta).
//
// Uso: node scripts/fusao-cenarios-check.mjs [--self-test] [--verbose]
import { mergePolls, keepFullestRound1 } from "./scrape.mjs";

const VERBOSE = process.argv.includes("--verbose");

// ---------------------------------------------------------------- fixtures
//
// Nomes deliberadamente inexistentes no registro do TSE, pela mesma razão das
// outras baterias: um nome real faria o caso depender de
// `data/candidaturas.ndjson`.
const base = (over = {}) => ({
  id: "", source: "wikipedia", source_url: "https://exemplo/wiki",
  pollster: "Instituto da Fusao", race: "senador", state: "AC", round: 1,
  scenario: "1º turno", contractor: null,
  fieldwork_start: null, fieldwork_end: "2026-07-25", published_date: "2026-07-25",
  sample_size: null, margin_of_error: null, tse_registration: null,
  results: [], others_pct: null, undecided_pct: null, blank_null_pct: null,
  ...over,
});
const linhas = (...pares) => pares.map(([candidate, pct]) => ({ candidate, party: null, pct }));

// O par do caso senador:AC: a datada com o elenco cheio, e a de OUTRO registro
// nativo cuja data a sanitização anulou — elenco quase igual (a assinatura do
// caso real: 0,86 de sobreposição), percentuais de outra medição.
const acDatada = () => base({
  id: "p360-881001-1-0-aaaaaaaaaaaa", source: "poder360",
  sample_size: 1600, margin_of_error: 2, tse_registration: "AC-90001/2026",
  results: linhas(["Alfa Fusao", 25], ["Beta Fusao", 20], ["Gama Fusao", 16],
    ["Delta Fusao", 13], ["Epsilon Fusao", 5], ["Zeta Fusao", 5], ["Eta Fusao", 3]),
  undecided_pct: 7, blank_null_pct: 6,
});
const acSemData = () => base({
  id: "p360-881002-1-0-bbbbbbbbbbbb", source: "poder360",
  fieldwork_end: null, published_date: null,
  sample_size: 1200, margin_of_error: 3,
  results: linhas(["Alfa Fusao", 27], ["Beta Fusao", 17], ["Gama Fusao", 14],
    ["Delta Fusao", 10], ["Epsilon Fusao", 9], ["Zeta Fusao", 6]),
  undecided_pct: 9, blank_null_pct: 8,
});

// O trio do caso governador:SP 19/11: três cenários da MESMA rodada, elencos
// que se sobrepõem acima do piso do `rostersMatch` (é o que fazia o merge cego
// costurá-los) e percentuais próprios de cada pergunta.
const SP = { pollster: "Instituto dos Cenarios", race: "governador", state: "SP", fieldwork_end: "2026-11-19", published_date: "2026-11-19" };
const spCen = (n, results, extra = {}) => base({
  ...SP, id: "", scenario: `1º turno — cenário ${n}/3`, results, ...extra,
});
const spTrio = () => [
  spCen(1, linhas(["Alfa Fusao", 30], ["Beta Fusao", 25], ["Gama Fusao", 20], ["Delta Fusao", 10]), { undecided_pct: 15 }),
  spCen(2, linhas(["Alfa Fusao", 32], ["Beta Fusao", 24], ["Gama Fusao", 21], ["Epsilon Fusao", 8]), { undecided_pct: 15 }),
  spCen(3, linhas(["Alfa Fusao", 35], ["Beta Fusao", 28], ["Gama Fusao", 22]), { undecided_pct: 15 }),
];

// A fusão em cadeia: o fragmento do Poder360 sem rótulo de cenário ocupa UM
// cenário da Wikipédia — e o registro fundido, que herdou o rótulo sem ordinal
// da fonte vencedora, não pode virar ímã do cenário seguinte.
const CADEIA = { pollster: "Instituto da Cadeia", race: "presidente", state: null, fieldwork_end: "2026-08-07", published_date: "2026-08-07" };
const cadeiaP360 = () => base({
  ...CADEIA, id: "p360-882001-1-0-cccccccccccc", source: "poder360",
  scenario: "1º turno", sample_size: 2000, margin_of_error: 2,
  results: linhas(["Alfa Fusao", 44], ["Beta Fusao", 40], ["Gama Fusao", 2],
    ["Delta Fusao", 1], ["Epsilon Fusao", 1], ["Zeta Fusao", 1]),
  undecided_pct: 6, blank_null_pct: 5,
});
const cadeiaCen1 = () => base({
  ...CADEIA, scenario: "1º turno — cenário 1/2",
  results: linhas(["Alfa Fusao", 44], ["Beta Fusao", 40], ["Gama Fusao", 2],
    ["Delta Fusao", 1], ["Epsilon Fusao", 1], ["Zeta Fusao", 1], ["Eta Fusao", 1], ["Teta Fusao", 0]),
  undecided_pct: 6, blank_null_pct: 5,
});
const cadeiaCen2 = () => base({
  ...CADEIA, scenario: "1º turno — cenário 2/2",
  results: linhas(["Alfa Fusao", 45], ["Beta Fusao", 41], ["Gama Fusao", 3],
    ["Delta Fusao", 2], ["Epsilon Fusao", 1]),
  undecided_pct: 4, blank_null_pct: 4,
});

// A duplicata legítima entre fontes (o padrão SP 23/02): mesma data, mesmo
// cenário, a Wikipédia relatando um subconjunto com os MESMOS percentuais.
const dupP360 = () => base({
  id: "p360-883001-1-0-dddddddddddd", source: "poder360",
  pollster: "Instituto da Duplicata", race: "governador", state: "SP",
  fieldwork_end: "2026-02-23", published_date: "2026-02-23",
  sample_size: 1500, margin_of_error: 3, tse_registration: "SP-90002/2026",
  results: linhas(["Alfa Fusao", 34], ["Beta Fusao", 21], ["Gama Fusao", 12],
    ["Delta Fusao", 8], ["Epsilon Fusao", 6], ["Zeta Fusao", 3]),
  undecided_pct: 9, blank_null_pct: 7,
});
const dupWiki = () => base({
  pollster: "Instituto da Duplicata", race: "governador", state: "SP",
  scenario: "1º turno — cenário único",
  fieldwork_end: "2026-02-23", published_date: null,
  results: linhas(["Alfa Fusao", 34], ["Beta Fusao", 21], ["Gama Fusao", 12], ["Delta Fusao", 8]),
  undecided_pct: null,
});

// O irmão sem data do MESMO registro nativo: a única ligação que a chave
// forte aceita no lugar da data.
const irmaoDatado = () => base({
  id: "p360-884001-2-0-eeeeeeeeeeee", source: "poder360", round: 2,
  pollster: "Instituto do Registro", race: "governador", state: "AC",
  scenario: "2º turno: Alfa Fusao vs Beta Fusao",
  sample_size: 1000, margin_of_error: 3,
  results: linhas(["Alfa Fusao", 48], ["Beta Fusao", 41]),
  undecided_pct: 6, blank_null_pct: 5,
});
const irmaoSemData = () => base({
  id: "p360-884001-2-1-ffffffffffff", source: "poder360", round: 2,
  pollster: "Instituto do Registro", race: "governador", state: "AC",
  scenario: "2º turno: Alfa Fusao vs Beta Fusao",
  fieldwork_end: null, published_date: null,
  sample_size: null, margin_of_error: null, contractor: "Contratante do Registro",
  results: linhas(["Alfa Fusao", 48], ["Beta Fusao", 41]),
  undecided_pct: 6, blank_null_pct: 5,
});

// O caso do Acre 6×3: o Poder360 com o fragmento de 3 linhas, a Wikipédia com
// a tabela cheia — a mais cheia doa, a prioridade segue mandando nos metadados.
const acre360 = () => base({
  id: "p360-885001-1-0-999999999999", source: "poder360",
  pollster: "Instituto da Doacao", race: "senador", state: "AC",
  sample_size: 900, margin_of_error: 3, tse_registration: "AC-90003/2026",
  results: linhas(["Alfa Fusao", 50], ["Beta Fusao", 30], ["Gama Fusao", 15]),
  undecided_pct: null, blank_null_pct: null,
});
const acreWiki = () => base({
  pollster: "Instituto da Doacao", race: "senador", state: "AC",
  scenario: "1º turno — cenário único",
  results: linhas(["Alfa Fusao", 40], ["Beta Fusao", 28], ["Gama Fusao", 12],
    ["Delta Fusao", 7], ["Epsilon Fusao", 5], ["Zeta Fusao", 3]),
  undecided_pct: 3, blank_null_pct: 2,
});

// O par do caso senador:PR IRG 08–12/08, com as marcas DECLARADAS que os
// parsers passam a carregar: a espontânea do Poder360 (oito nomes, soma 100,
// 71 de indecisos) e a estimulada da Wikipédia (nove nomes, seis em comum —
// 0,75 de sobreposição, acima do piso do `rostersMatch` —, soma ~180, que
// SOBREVIVE ao teto de 260 do Senado e é a tabela mais cheia: sem o conserto
// ela doa e a espontânea morre na construção, com o legacy colado nela).
const irgEspontanea = () => base({
  id: "p360-886001-1-1-abcabcabcabc", source: "poder360",
  pollster: "Instituto do Estimulo", race: "senador", state: "PR",
  fieldwork_end: "2026-08-12", published_date: "2026-08-12",
  sample_size: 1350, margin_of_error: 2.67, tse_registration: "PR-90004/2026",
  stimulus: "espontânea",
  results: linhas(["Alfa Estimulo", 7.6], ["Beta Estimulo", 5.7], ["Gama Estimulo", 3.8],
    ["Delta Estimulo", 2.8], ["Epsilon Estimulo", 1.5], ["Zeta Estimulo", 0.6],
    ["Eta Estimulo", 1.6], ["Teta Estimulo", 0.1]),
  undecided_pct: 71, blank_null_pct: 5.3,
});
const irgEstimulada = () => base({
  pollster: "Instituto do Estimulo", race: "senador", state: "PR",
  scenario: "1º turno — cenário único",
  fieldwork_end: "2026-08-12", published_date: null,
  stimulus: "estimulada",
  results: linhas(["Alfa Estimulo", 32.1], ["Beta Estimulo", 29.2], ["Gama Estimulo", 29.4],
    ["Delta Estimulo", 14.5], ["Epsilon Estimulo", 25.2], ["Zeta Estimulo", 18.2],
    ["Iota Estimulo", 2.1], ["Capa Estimulo", 0.7], ["Lambda Estimulo", 0.3]),
  undecided_pct: 28.3,
});
// A mesma estimulada relatada mais rala por outra página — para afirmar que
// estimulada×estimulada do MESMO cenário segue fundindo e colapsando.
const irgEstimuladaRala = () => {
  const p = irgEstimulada();
  p.results = p.results.slice(0, 6);
  return p;
};

// ------------------------------------------------------------------ runner
//
// `mutacao` reverte UM conserto — e só ele — sobre as funções de verdade:
//   passe-nulo    → mergePolls com dataNulaCasa: () => true
//   cega-cenario  → mergePolls com cenarioCompativel: () => true
//   cega-estimulo → mergePolls E keepFullestRound1 com estimuloCompativel:
//                   () => true (as duas portas do mesmo defeito: a fusão na
//                   construção e o funil que desfaria a recusa uma decisão
//                   adiante)
function rodar({ mutacao = null } = {}) {
  const opts = mutacao === "passe-nulo" ? { dataNulaCasa: () => true }
    : mutacao === "cega-cenario" ? { cenarioCompativel: () => true }
    : mutacao === "cega-estimulo" ? { estimuloCompativel: () => true }
    : {};
  const merge = (poder, wiki) => mergePolls([poder, wiki], opts);
  const funil = (polls) => keepFullestRound1(polls,
    mutacao === "cega-estimulo" ? { estimuloCompativel: () => true } : {});

  const falhas = [];
  let ok = 0;
  const caso = (nome, fn) => {
    const problemas = [];
    const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
    try {
      fn({ afirma });
    } catch (e) {
      problemas.push(`exceção: ${e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message}`);
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
  // A. O PASSE-NULO DE DATA — o caso senador:AC
  // ====================================================================

  caso("data nula: a pesquisa sem data de OUTRO registro nativo não é absorvida pela datada (o caso senador:AC)", ({ afirma }) => {
    const depois = merge([acDatada(), acSemData()], []);
    afirma(depois.length === 2,
      `${depois.length} registro(s), esperados 2 — a medição de dez/2025 ${depois.length === 1 ? "foi engolida pela de jul/2026 (o defeito do AC)" : "se multiplicou"}`);
    const semData = depois.find((p) => p.id === "p360-881002-1-0-bbbbbbbbbbbb");
    afirma(semData?.results.length === 6 && semData?.results[0].pct === 27,
      "a pesquisa sem data perdeu a própria tabela");
  });

  caso("data nula (controle): o fragmento sem data ainda completa o irmão quando a chave forte liga (mesmo registro nativo)", ({ afirma }) => {
    const depois = merge([irmaoDatado(), irmaoSemData()], []);
    afirma(depois.length === 1,
      `${depois.length} registro(s), esperado 1 — a chave forte não ligou os fragmentos do mesmo registro da fonte`);
    afirma(depois[0]?.contractor === "Contratante do Registro",
      "o metadado do fragmento sem data não completou o irmão datado");
    afirma(depois[0]?.fieldwork_end === "2026-07-25", "o registro fundido perdeu a data do irmão datado");
  });

  // ====================================================================
  // B. A FUSÃO DE CENÁRIOS — o caso governador:SP 19/11 e a fusão em cadeia
  // ====================================================================

  caso("cenário: três \"cenário X/3\" do mesmo dia viram três registros, cada um com a própria tabela (o caso governador:SP 19/11)", ({ afirma }) => {
    const depois = merge([], spTrio());
    afirma(depois.length === 3,
      `${depois.length} registro(s), esperados 3 — cenários distintos ${depois.length < 3 ? "fundidos" : "multiplicados"}`);
    // Nenhuma identidade trocada: cada registro carrega o rótulo E a tabela do
    // seu próprio cenário (era a assinatura do defeito: id de um, tabela de outro).
    const c2 = depois.find((p) => /2\/3/.test(p.scenario));
    afirma(c2?.results.some((r) => r.candidate === "Epsilon Fusao") && c2?.results[0].pct === 32,
      `o registro do cenário 2/3 não carrega a tabela do cenário 2/3`);
    const c3 = depois.find((p) => /3\/3/.test(p.scenario));
    afirma(c3?.results.length === 3 && c3?.results[0].pct === 35,
      `o registro do cenário 3/3 não carrega a tabela do cenário 3/3`);
  });

  caso("cenário: o registro que absorveu um cenário não vira ímã do cenário seguinte (a fusão em cadeia)", ({ afirma }) => {
    const depois = merge([cadeiaP360()], [cadeiaCen1(), cadeiaCen2()]);
    afirma(depois.length === 2,
      `${depois.length} registro(s), esperados 2 — o rótulo sem ordinal herdado da fonte vencedora ${depois.length === 1 ? "deixou o segundo cenário entrar" : "impediu até o primeiro"}`);
    const fundido = depois.find((p) => p.id === "p360-882001-1-0-cccccccccccc");
    afirma(fundido?.results.length === 8, "o cenário 1/2 (tabela mais cheia) não doou para o registro do Poder360");
    const c2 = depois.find((p) => /2\/2/.test(p.scenario));
    afirma(c2?.results.length === 5 && c2?.results[0].pct === 45, "o cenário 2/2 não ficou com a própria tabela");
  });

  // ====================================================================
  // C. CONTROLES DE NÃO-REGRESSÃO — o que AINDA funde
  // ====================================================================

  caso("cenário (controle): a duplicata legítima entre fontes ainda funde (mesmo cenário, mesma data — o padrão SP 23/02)", ({ afirma }) => {
    const depois = merge([dupP360()], [dupWiki()]);
    afirma(depois.length === 1, `${depois.length} registro(s), esperado 1 — o conserto separou a mesma pesquisa relatada por duas fontes`);
    afirma(depois[0]?.id === "p360-883001-1-0-dddddddddddd", "a identidade do Poder360 se perdeu na fusão legítima");
    afirma(depois[0]?.results.length === 6, "a tabela mais cheia não ficou na fusão legítima");
  });

  caso("doação (controle): a tabela mais cheia ainda vence entre fontes, com os metadados da prioridade (o caso do Acre 6×3)", ({ afirma }) => {
    const depois = merge([acre360()], [acreWiki()]);
    afirma(depois.length === 1, `${depois.length} registro(s), esperado 1`);
    afirma(depois[0]?.results.length === 6, `${depois[0]?.results.length} linha(s), esperadas as 6 da tabela mais cheia`);
    afirma(depois[0]?.tse_registration === "AC-90003/2026", "o merge perdeu o registro TSE do Poder360");
  });

  // ====================================================================
  // D. O ESTÍMULO DECLARADO — o caso senador:PR IRG 08–12/08
  // ====================================================================

  caso("estímulo: espontânea declarada não funde com estimulada declarada, e o legacy fica na espontânea (o caso senador:PR IRG 08–12/08)", ({ afirma }) => {
    const depois = merge([irgEspontanea()], [irgEstimulada()]);
    afirma(depois.length === 2,
      `${depois.length} registro(s), esperados 2 — a espontânea ${depois.length === 1 ? "foi destruída na construção (o defeito do IRG)" : "se multiplicou"}`);
    const esp = depois.find((p) => p.id === "p360-886001-1-1-abcabcabcabc");
    afirma(esp?.results.length === 8 && esp?.undecided_pct === 71 && esp?.results[0].pct === 7.6,
      "a espontânea perdeu a própria tabela");
    afirma(esp?.stimulus === "espontânea", "a marca declarada da espontânea se perdeu na passagem");
    const est = depois.find((p) => p.id !== "p360-886001-1-1-abcabcabcabc");
    afirma(est?.results.length === 9 && est?.undecided_pct === 28.3,
      "a estimulada não ficou com registro próprio — o legacy da espontânea teria sido colado nela");
  });

  caso("estímulo: o funil de 1º turno não recolapsa espontânea e estimulada declaradas do mesmo dia", ({ afirma }) => {
    // A recusa da fusão não vale nada se `keepFullestRound1` engolir a
    // espontânea uma decisão adiante — a estimulada é a tabela mais cheia.
    const finais = funil([irgEspontanea(), irgEstimulada()]);
    afirma(finais.length === 2,
      `${finais.length} registro(s), esperados 2 — o funil ${finais.length === 1 ? "desfez a recusa da fusão (a mais cheia engoliu a espontânea)" : "multiplicou"}`);
    afirma(finais.some((p) => p.stimulus === "espontânea" && p.undecided_pct === 71),
      "a espontânea não saiu do funil com a própria tabela");
  });

  caso("estímulo (controle): fragmento sem marca declarada segue fundindo pela regra atual (§4)", ({ afirma }) => {
    // O estado REAL do caso IRG na coleta: o rótulo nativo do Poder360
    // ("Senador - Cenário 2") não declara estímulo, então o fragmento chega
    // NULO e a regra atual decide — funde, e a marca declarada do outro lado
    // preenche o metadado. É o que documenta que este conserto NÃO desfaz o
    // caso IRG sozinho: a declaração de espontânea daquele registro só existe
    // no PDF do instituto.
    const semMarca = irgEspontanea();
    semMarca.stimulus = null;
    const depois = merge([semMarca], [irgEstimulada()]);
    afirma(depois.length === 1,
      `${depois.length} registro(s), esperado 1 — sem marca declarada não há recusa (§4: não inferir do conteúdo)`);
    afirma(depois[0]?.id === "p360-886001-1-1-abcabcabcabc", "a identidade do Poder360 se perdeu na fusão pela regra atual");
    afirma(depois[0]?.stimulus === "estimulada", "a marca declarada de um lado não preencheu o metadado do registro fundido");
  });

  caso("estímulo (controle): estimulada×estimulada do mesmo cenário segue fundindo e colapsando", ({ afirma }) => {
    const cheia = irgEstimulada();
    cheia.id = "p360-886002-1-0-dededededede";
    cheia.source = "poder360";
    const depois = merge([cheia], [irgEstimuladaRala()]);
    afirma(depois.length === 1, `${depois.length} registro(s), esperado 1 — o conserto separou a mesma pergunta estimulada relatada por duas fontes`);
    afirma(depois[0]?.results.length === 9, "a tabela mais cheia não ficou na fusão legítima");
    const finais = funil([irgEstimulada(), irgEstimuladaRala()]);
    afirma(finais.length === 1 && finais[0].results.length === 9,
      `o funil tinha de colapsar duas estimuladas do mesmo dia na mais cheia (veio ${finais.length} registro(s))`);
  });

  return { ok, falhas };
}

// ------------------------------------------------------------------- saída
const CONTROLES = [
  "data nula (controle): o fragmento sem data ainda completa o irmão quando a chave forte liga (mesmo registro nativo)",
  "cenário (controle): a duplicata legítima entre fontes ainda funde (mesmo cenário, mesma data — o padrão SP 23/02)",
  "doação (controle): a tabela mais cheia ainda vence entre fontes, com os metadados da prioridade (o caso do Acre 6×3)",
  "estímulo (controle): fragmento sem marca declarada segue fundindo pela regra atual (§4)",
  "estímulo (controle): estimulada×estimulada do mesmo cenário segue fundindo e colapsando",
];

if (process.argv.includes("--self-test")) {
  // CADA REVERSÃO DERRUBA O SEU CONJUNTO — E NADA MAIS. Uma mutação que
  // derrubasse um controle provaria que a bateria não distingue o conserto do
  // comportamento antigo; uma falha fora do conjunto esperado seria a bateria
  // reprovando pelo lado errado.
  const esperado = {
    "passe-nulo": [
      "data nula: a pesquisa sem data de OUTRO registro nativo não é absorvida pela datada (o caso senador:AC)",
    ],
    "cega-cenario": [
      "cenário: três \"cenário X/3\" do mesmo dia viram três registros, cada um com a própria tabela (o caso governador:SP 19/11)",
      "cenário: o registro que absorveu um cenário não vira ímã do cenário seguinte (a fusão em cadeia)",
    ],
    "cega-estimulo": [
      "estímulo: espontânea declarada não funde com estimulada declarada, e o legacy fica na espontânea (o caso senador:PR IRG 08–12/08)",
      "estímulo: o funil de 1º turno não recolapsa espontânea e estimulada declaradas do mesmo dia",
    ],
  };
  let ok = true;
  for (const [modo, devemCair] of Object.entries(esperado)) {
    const { falhas } = rodar({ mutacao: modo });
    const faltando = devemCair.filter((n) => !falhas.includes(n));
    const inesperadas = falhas.filter((n) => !devemCair.includes(n));
    if (faltando.length || inesperadas.length) {
      ok = false;
      for (const n of faltando) console.error(`AUTOTESTE FALHOU (${modo}): não reprovou → ${n}`);
      for (const n of inesperadas) console.error(`AUTOTESTE FALHOU (${modo}): ${CONTROLES.includes(n) ? "controle caiu sob mutação" : "falha fora do conjunto esperado"} → ${n}`);
      continue;
    }
    console.log(`autoteste (${modo}): a bateria REPROVA ${falhas.length} caso(s) com o conserto revertido, controles de pé`);
    for (const n of falhas) console.log(`  detectado → ${n}`);
  }
  process.exit(ok ? 0 : 1);
}

const { ok, falhas } = rodar();
console.log(`\n${ok} passaram · ${falhas.length} falharam`);
if (falhas.length) {
  console.error("FUSÃO DE CENÁRIOS FALHOU — o merge ainda funde perguntas distintas ou deixou de fundir a duplicata legítima.");
  process.exit(1);
}
console.log("FUSÃO DE CENÁRIOS OK — data nula exige chave forte, cenários declarados distintos nunca fundem, estímulos declarados distintos nunca fundem nem recolapsam; duplicata legítima, irmão de registro, doação de tabela e regra do sem-marca intactos.");
