#!/usr/bin/env node
// A TABELA QUE A FONTE TRUNCOU VOLTA DO COMMIT ANTERIOR — pelo mesmo id nativo.
//
// O defeito guardado (29/09/2026): o `v2/cenarios` do Poder360 serve cenários
// sem parte do elenco — o 2º turno "Lula × Renan Santos" chega como `[Lula]`,
// o 1º turno do Datafolha/RJ chega como `[Garotinho 9]`. O fragmento de 2º
// turno era absorvido por `mergePolls` no confronto ERRADO ("Flávio × Lula",
// 1/1 ≥ 0,6) sem linha nenhuma, e o 1º turno morria no guarda de soma; a
// retenção de elenco do store nunca os via, e o guarda de delta congelava a
// disputa por "perda sem prova" (13 presidenciais estaduais + RJ/BA/SC).
//
// `restaurarTruncadasDoCommit` (scrape.mjs) aplica a doutrina da retenção
// ANTES das decisões de existência: id nativo conhecido do commit, truncação
// real, subconjunto estrito ancorado pelos pcts, e nunca quando o confronto
// anterior chegou inteiro por outro cenário do mesmo poll.
//
// ⚠ AS DUAS METADES SÃO OBRIGATÓRIAS: a metade que restaura, e os controles
// que provam que NADA MAIS é tocado — tabela nova, nome entrando, pct
// diferente, confronto que chegou inteiro, outra fonte, poll saudável.
//
// ⚠ E O AUTOTESTE REPROVA (CONVENTIONS §2): `--self-test` roda a bateria com o
// doador REVERTIDO para o comportamento antigo (`() => null`: nada é
// restaurado) e exige que os casos de restauração caiam SEM derrubar os
// controles.
//
// Uso: node scripts/truncada-restaurada-check.mjs [--self-test] [--verbose]
import { restaurarTruncadasDoCommit, mergePolls } from "./scrape.mjs";

const VERBOSE = process.argv.includes("--verbose");

const anterior = (over = {}) => ({
  id: "p360-14069-2-3-a3b9f887c9d6", source: "poder360", race: "presidente", state: "AM", round: 2,
  scenario: "2º turno: Lula vs Renan Santos", pollster: "AtlasIntel", fieldwork_end: "2026-09-03", published_date: "2026-09-03",
  sample_size: 1185, results: [{ candidate: "Lula", party: "PT", pct: 41.3 }, { candidate: "Renan Santos", party: "Missão", pct: 33 }],
  others_pct: null, undecided_pct: 25.7, blank_null_pct: null, tse_registration: "BR-01799/2026", ...over,
});
const fragmento = (over = {}) => ({
  id: "p360-14069-2-3-0000deadbeef", source: "poder360", race: "presidente", state: "AM", round: 2,
  scenario: "2º turno: Lula", pollster: "AtlasIntel", fieldwork_end: "2026-09-03", published_date: "2026-09-03",
  sample_size: 1185, results: [{ candidate: "Lula", party: "PT", pct: 41.3 }],
  others_pct: null, undecided_pct: 25.7, blank_null_pct: null, tse_registration: "BR-01799/2026",
  parse_warnings: ["2º turno com um só nome na fonte (Lula); adversário em branco no v2/cenarios"], ...over,
});
const irmao = (over = {}) => fragmento({
  id: "p360-14069-2-0-8af3326db11b", scenario: "2º turno: Flávio Bolsonaro vs Lula",
  results: [{ candidate: "Lula", party: "PT", pct: 41.3 }, { candidate: "Flávio Bolsonaro", party: "PL", pct: 48 }],
  undecided_pct: 10.7, parse_warnings: undefined, ...over,
});
const cincoRJ = () => [
  { candidate: "Eduardo Paes", party: "PSD", pct: 41 }, { candidate: "Douglas Ruas", party: "PL", pct: 19 },
  { candidate: "Garotinho", party: "Republicanos", pct: 9 }, { candidate: "André Marinho", party: "Novo", pct: 2 },
  { candidate: "Coronel Busnello", party: "Missão", pct: 2 },
];
const anteriorRJ = () => ({
  id: "p360-13891-1-0-a1d0db5ee17a", source: "poder360", race: "governador", state: "RJ", round: 1, scenario: "1º turno",
  pollster: "Datafolha", fieldwork_end: "2026-08-21", published_date: "2026-08-21", sample_size: 1204,
  results: cincoRJ(), others_pct: null, undecided_pct: 10, blank_null_pct: 17, tse_registration: "RJ-05555/2026",
});
const truncadaRJ = (over = {}) => ({
  ...anteriorRJ(), id: "p360-13891-1-0-1111deadbeef",
  results: [{ candidate: "Garotinho", party: "Republicanos", pct: 9 }], undecided_pct: null, blank_null_pct: null, ...over,
});

const clone = (x) => structuredClone(x);

function rodar({ mutacao = null } = {}) {
  const opts = mutacao === "revertida" ? { doador: () => null } : {};
  const restaurar = (polls, prev) => restaurarTruncadasDoCommit(polls, prev, opts);
  const falhas = [];
  let ok = 0;
  const caso = (nome, fn) => {
    const problemas = [];
    const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
    try { fn({ restaurar, afirma }); } catch (e) { problemas.push(`exceção: ${e.message}`); }
    if (problemas.length) {
      falhas.push(nome);
      if (!mutacao || VERBOSE) { console.error(`✗ ${nome}`); for (const d of problemas) console.error(`    ${d}`); }
    } else {
      ok++;
      if (!mutacao) console.log(`✓ ${nome}`);
    }
  };

  // ── a metade que restaura ────────────────────────────────────────────────
  caso("R1 2º turno de um nome só volta inteiro do commit: elenco, buckets, rótulo, id e aviso", ({ restaurar, afirma }) => {
    const polls = [irmao(), fragmento()];
    const r = restaurar(polls, [anterior(), clone(irmao({ id: "p360-14069-2-0-8af3326db11b" }))]);
    afirma(r.length === 1, `1 restaurada (veio ${r.length})`);
    const f = polls[1];
    afirma(f.results.length === 2 && f.results[1].candidate === "Renan Santos" && f.results[1].pct === 33, `elenco não voltou: ${JSON.stringify(f.results)}`);
    afirma(f.scenario === "2º turno: Lula vs Renan Santos", `rótulo não voltou: ${f.scenario}`);
    afirma(f.id === "p360-14069-2-3-a3b9f887c9d6", `id não voltou ao do commit: ${f.id}`);
    afirma(f.undecided_pct === 25.7, "buckets não voltaram");
    afirma((f.parse_warnings ?? []).some((w) => /restaurado do commit anterior/.test(w) && /Renan Santos/.test(w)), `aviso ausente: ${f.parse_warnings}`);
    afirma(!(f.parse_warnings ?? []).some((w) => /um só nome/.test(w)), "o aviso de fragmento não foi retirado");
    // E a fusão que antes o engolia agora o deixa em paz: dois registros saem.
    const fundidos = mergePolls([polls, []]);
    afirma(fundidos.length === 2, `mergePolls fundiu o confronto restaurado (saíram ${fundidos.length})`);
  });

  caso("R2 1º turno sem os líderes (soma 9) volta inteiro do commit — cinco nomes e buckets", ({ restaurar, afirma }) => {
    const polls = [truncadaRJ()];
    const r = restaurar(polls, [anteriorRJ()]);
    afirma(r.length === 1 && r[0].faltaram.length === 4, `1 restaurada com 4 faltantes (veio ${JSON.stringify(r)})`);
    afirma(polls[0].results.length === 5 && polls[0].results[0].candidate === "Eduardo Paes", "elenco não voltou");
    afirma(polls[0].blank_null_pct === 17 && polls[0].undecided_pct === 10, "buckets não voltaram");
    afirma(polls[0].scenario === "1º turno", "o rótulo do 1º turno não muda");
  });

  caso("R3 1º turno com o ÍNDICE de cenário trocado pela fonte ainda volta do mesmo poll (âncora de pcts); o 2º turno não", ({ restaurar, afirma }) => {
    const polls = [truncadaRJ({ id: "p360-13891-1-1-4444deadbeef" })];
    const r = restaurar(polls, [anteriorRJ()]);
    afirma(r.length === 1 && polls[0].results.length === 5, "1º turno com outro índice de cenário não voltou");
    const polls2 = [fragmento({ id: "p360-14069-2-5-5555deadbeef" })];
    const r2 = restaurar(polls2, [anterior()]);
    afirma(r2.length === 0 && polls2[0].results.length === 1, "2º turno com outro índice foi restaurado — cada confronto é uma pergunta");
  });

  // ── os controles: nada mais é tocado ─────────────────────────────────────
  caso("C1 tabela NOVA (id nativo desconhecido do commit) não é tocada", ({ restaurar, afirma }) => {
    const polls = [fragmento({ id: "p360-99999-2-3-0000deadbeef" })];
    const r = restaurar(polls, [anterior()]);
    afirma(r.length === 0 && polls[0].results.length === 1, "restaurou uma tabela que o commit não conhecia");
  });
  caso("C2 alguém ENTRANDO (nome fora do elenco anterior) é outra tabela — não é tocada", ({ restaurar, afirma }) => {
    const polls = [truncadaRJ({ results: [{ candidate: "Cyro Garcia", party: "PSTU", pct: 0.7 }] })];
    const r = restaurar(polls, [anteriorRJ()]);
    afirma(r.length === 0 && polls[0].results.length === 1, "restaurou por cima de um nome que entrou");
  });
  caso("C3 pct diferente do commit (âncora) é outra tabela — não é tocada", ({ restaurar, afirma }) => {
    const polls = [fragmento({ results: [{ candidate: "Lula", party: "PT", pct: 40.1 }] })];
    const r = restaurar(polls, [anterior()]);
    afirma(r.length === 0 && polls[0].results.length === 1, "restaurou sem a âncora de pct");
  });
  caso("C4 o confronto anterior chegou INTEIRO por outro cenário do mesmo poll — o fragmento não é ele", ({ restaurar, afirma }) => {
    const inteiro = fragmento({ id: "p360-14069-2-5-2222deadbeef", scenario: "2º turno: Lula vs Renan Santos",
      results: [{ candidate: "Lula", party: "PT", pct: 41.3 }, { candidate: "Renan Santos", party: "Missão", pct: 33 }], parse_warnings: undefined });
    const polls = [inteiro, fragmento()];
    const r = restaurar(polls, [anterior()]);
    afirma(r.length === 0 && polls[1].results.length === 1, "restaurou um confronto que já chegou inteiro por outro cenário");
  });
  caso("C5 poll SAUDÁVEL (2 nomes / soma boa) não é tocada mesmo com elenco anterior maior", ({ restaurar, afirma }) => {
    const polls = [irmao(), { ...anteriorRJ(), id: "p360-13891-1-0-3333deadbeef", results: cincoRJ().slice(0, 4) }];
    const r = restaurar(polls, [anterior({ id: "p360-14069-2-0-8af3326db11b", results: [...anterior().results, { candidate: "Terceiro", party: null, pct: 5 }] }), anteriorRJ()]);
    afirma(r.length === 0 && polls[0].results.length === 2 && polls[1].results.length === 4, "tocou em poll saudável");
  });
  caso("C6 outra fonte (Wikipédia) nunca é restaurada por aqui", ({ restaurar, afirma }) => {
    const polls = [fragmento({ source: "wikipedia", id: "abcdefabcdef" })];
    const r = restaurar(polls, [anterior({ id: "abcdefabcdef" })]);
    afirma(r.length === 0 && polls[0].results.length === 1, "restaurou registro de outra fonte");
  });
  caso("C7 sem commit anterior (primeira rodada) nada acontece", ({ restaurar, afirma }) => {
    const polls = [fragmento()];
    const r = restaurar(polls, []);
    afirma(r.length === 0 && polls[0].results.length === 1, "restaurou sem commit anterior");
  });

  return { ok, falhas };
}

const CONTROLES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7"];
const RESTAURAM = ["R1", "R2", "R3"];
const prefixo = (n) => n.split(" ")[0];

if (process.argv.includes("--self-test")) {
  const real = rodar();
  if (real.falhas.length) { console.error(`\nAUTOTESTE FALHOU: ${real.falhas.length} caso(s) com a restauração real`); process.exit(1); }
  const { falhas } = rodar({ mutacao: "revertida" });
  const caidos = falhas.map(prefixo);
  const faltando = RESTAURAM.filter((n) => !caidos.includes(n));
  const controlesCaidos = CONTROLES.filter((n) => caidos.includes(n));
  if (faltando.length || controlesCaidos.length) {
    console.error(`AUTOTESTE FALHOU (revertida): ${faltando.length ? `não reprovou ${faltando.join(", ")}` : ""} ${controlesCaidos.length ? `derrubou controle(s) ${controlesCaidos.join(", ")}` : ""}`);
    process.exit(1);
  }
  console.log(`autoteste (revertida): a bateria REPROVA ${falhas.length} caso(s) com a restauração desligada, sem derrubar os ${CONTROLES.length} controles`);
  console.log("truncada-restaurada-check --self-test: OK");
} else {
  const { ok, falhas } = rodar();
  console.log(`\n${ok} passaram · ${falhas.length} falharam`);
  if (falhas.length) process.exit(1);
}
