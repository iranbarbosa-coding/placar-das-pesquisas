#!/usr/bin/env node
// A REJEIÇÃO É CURADA COMO DEVE — E É ESTRUTURALMENTE ISOLADA DO VOTO.
//
// A rejeição ("em quem NÃO votaria de jeito nenhum") é uma tabela SEPARADA. Se
// uma linha de rejeição vazasse para `polls`, ela entraria numa média de VOTO —
// uma pesquisa de menção múltipla soma ~180 e faria o denominador de votos
// válidos e os guardas de soma reprovarem pesquisa boa, ou pior, a linha de
// rejeição de um candidato viraria intenção de voto dele. Este guarda prova, no
// CAMINHO DE VERDADE (o mesmo `loadRejection`, `writeRejectionProjection`,
// `writeStoreFromPolls` e `projectPolls` que o coletor roda), quatro coisas:
//
//   (a) CONTROLE DE RESPOSTA CONHECIDA — a bruta de um estado semente atravessa
//       o loader e a projeção e chega ao valor lido do PDF.
//   (b) A BARRA PROBATÓRIA — uma entrada sem `verified_at` é RECUSADA.
//   (c) ISOLAMENTO DE VOTO — construir o store de voto com a rejeição VAZIA vs.
//       POPULADA dá o store byte-idêntico, e nenhuma linha projetada tem id
//       `rej-`.
//   (d) MENÇÃO MÚLTIPLA (soma 180) NUNCA APARECE na projeção que o site lê — e
//       portanto nunca em `scenarioGroups`, que consome exatamente essa projeção.
//
// Uso: node scripts/rejection-check.mjs [--self-test]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadRejection, writeRejectionProjection } from "./lib/rejection.mjs";
import { writeStoreFromPolls } from "./lib/build-store.mjs";
import { projectPolls } from "./lib/project.mjs";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ARQUIVO_REAL = path.join(RAIZ, "data", "rejection.json");

const falhas = [];
let ok = 0;
// `afirmaGlobal` escreve no caso corrente, para os `caso` afirmarem sem carregar
// `afirma` por closure em cada linha. `caso` aponta e desaponta o ponteiro.
let _afirmaAtual = null;
function afirmaGlobal(cond, detalhe) {
  if (_afirmaAtual) _afirmaAtual(cond, detalhe);
  else if (!cond) throw new Error(detalhe);
}
function caso(nome, fn) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-rejeicao-"));
  const problemas = [];
  const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
  _afirmaAtual = afirma;
  try {
    fn({ dir, afirma });
  } catch (e) {
    problemas.push(`exceção: ${e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message}`);
  } finally {
    _afirmaAtual = null;
    fs.rmSync(dir, { recursive: true, force: true });
  }
  if (problemas.length) {
    falhas.push(nome);
    console.log(`✗ ${nome}`);
    for (const p of problemas) console.log(`    ${p}`);
  } else {
    ok++;
    console.log(`✓ ${nome}`);
  }
}

const ler = (dir, t) => {
  const f = path.join(dir, `${t}.ndjson`);
  return fs.existsSync(f)
    ? fs.readFileSync(f, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
};

// Um spec de rejeição de teste, escrito em disco para atravessar `loadRejection`
// pelo mesmo caminho `file` que o coletor não usa mas o guarda sim.
function specRejeicao(dir, entradas) {
  const f = path.join(dir, "rejection-de-teste.json");
  fs.writeFileSync(f, JSON.stringify({ version: 1, add_rejection: entradas }, null, 1));
  return f;
}

// Duas pesquisas de VOTO de fixture, para o store de voto ter o que construir.
// Instituto/candidatos deliberadamente fora do registro do TSE.
const votoFixture = () => ([
  {
    id: "p360-770001-1-0-aaaaaaaaaaaa", source: "poder360",
    pollster: "Instituto de Rejeicao", race: "presidente", state: "PE", round: 1,
    scenario: "1º turno", source_url: "https://exemplo/materia",
    fieldwork_start: "2026-07-28", fieldwork_end: "2026-07-30", published_date: "2026-07-30",
    sample_size: 1000, margin_of_error: 3, tse_registration: "PE-77001/2026",
    results: [
      { candidate: "Alfa Rejeicao", party: "PT", pct: 44 },
      { candidate: "Beta Rejeicao", party: "PL", pct: 33 },
      { candidate: "Gama Rejeicao", party: "PSD", pct: 8 },
    ],
    others_pct: null, undecided_pct: 9, blank_null_pct: 6,
  },
  {
    id: "p360-770002-1-0-bbbbbbbbbbbb", source: "poder360",
    pollster: "Outro Instituto", race: "presidente", state: "PE", round: 1,
    scenario: "1º turno", source_url: "https://exemplo/materia2",
    fieldwork_start: "2026-07-26", fieldwork_end: "2026-07-28", published_date: "2026-07-28",
    sample_size: 1100, margin_of_error: 3, tse_registration: "PE-77002/2026",
    results: [
      { candidate: "Alfa Rejeicao", party: "PT", pct: 45 },
      { candidate: "Beta Rejeicao", party: "PL", pct: 34 },
      { candidate: "Gama Rejeicao", party: "PSD", pct: 7 },
    ],
    others_pct: null, undecided_pct: 8, blank_null_pct: 6,
  },
]);

// Uma entrada de rejeição bem-formada (menção única), citada.
const entradaOK = (over = {}) => ({
  match: { pollster: "Veritá", race: "presidente", state: "AC", round: 1, fieldwork_end: "2026-03-24" },
  source: "https://exemplo/estadual", evidence: "P15 rejeição, leitura cega dupla §1, coluna Porcentual",
  verified_at: "2026-08-23", multi_mention: false,
  add_rejection: {
    pollster: "Veritá", race: "presidente", state: "AC", round: 1,
    fieldwork_start: "2026-03-18", fieldwork_end: "2026-03-24", published_date: null,
    sample_size: 1030, margin_of_error: 3.5, tse_registration: "AC-08882/2026",
    results: [
      { candidate: "Lula", party: "PT", pct_bruta: 46.4, conhece_pct: null },
      { candidate: "Flávio Bolsonaro", party: "PL", pct_bruta: 24.7, conhece_pct: null },
    ],
  },
  ...over,
});

// ────────────────────────────────────────────────────────────────────────────
// (a) CONTROLE DE RESPOSTA CONHECIDA
// ────────────────────────────────────────────────────────────────────────────
caso("(a) a bruta de um estado semente atravessa o loader e a projeção", ({ dir }) => {
  // Roda o ARQUIVO REAL: AC · Lula rejeição bruta = 46,4 (lido do PDF, §1).
  const { rejections, warnings } = loadRejection({ file: ARQUIVO_REAL });
  afirmaGlobal(rejections.length === 6, `carregou ${rejections.length} rejeições, esperado 6`);
  afirmaGlobal(!warnings.length, `avisos inesperados no arquivo real: ${warnings.join(" | ")}`);
  const ac = rejections.find((p) => p.state === "AC");
  afirmaGlobal(!!ac, "AC não carregou");
  afirmaGlobal(String(ac.id).startsWith("rej-"), `id "${ac?.id}" fora do espaço rej-`);
  afirmaGlobal(/^rej-[0-9a-f]{12}$/.test(String(ac.id)), `id "${ac?.id}" fora da forma rej-<12 hex>`);
  const lula = ac.results.find((r) => r.candidate === "Lula");
  afirmaGlobal(lula?.pct_bruta === 46.4, `AC Lula bruta = ${lula?.pct_bruta}, esperado 46,4`);
  // E o valor sobrevive à projeção ndjson (round-trip byte→número).
  writeRejectionProjection(dir, rejections);
  const proj = ler(dir, "rejection").find((p) => p.state === "AC");
  const lulaProj = proj?.results.find((r) => r.candidate === "Lula");
  afirmaGlobal(lulaProj?.pct_bruta === 46.4, `AC Lula bruta projetada = ${lulaProj?.pct_bruta}, esperado 46,4`);
  afirmaGlobal(proj?.multi_mention === false, "AC não saiu como menção única");
});

// ────────────────────────────────────────────────────────────────────────────
// (b) A BARRA PROBATÓRIA — RECUSA sem verified_at
// ────────────────────────────────────────────────────────────────────────────
caso("(b) uma entrada sem verified_at é RECUSADA", ({ dir }) => {
  const file = specRejeicao(dir, [entradaOK({ verified_at: undefined })]);
  const { rejections, warnings } = loadRejection({ file });
  afirmaGlobal(rejections.length === 0, `carregou ${rejections.length} sem verified_at, esperado 0`);
  afirmaGlobal(warnings.some((w) => /RECUSADO/.test(w) && /verified_at/.test(w)),
    `a recusa por falta de verified_at não foi dita em voz alta: ${warnings.join(" | ")}`);
  // Controle: a MESMA entrada, agora completa, entra.
  const fileOK = specRejeicao(dir, [entradaOK()]);
  const r2 = loadRejection({ file: fileOK });
  afirmaGlobal(r2.rejections.length === 1, `a entrada completa não entrou (${r2.rejections.length})`);
});

// ────────────────────────────────────────────────────────────────────────────
// (c) ISOLAMENTO DE VOTO — store byte-idêntico, rejeição vazia vs populada
// ────────────────────────────────────────────────────────────────────────────
caso("(c) o store de voto é byte-idêntico com a rejeição vazia vs populada, e nenhum id rej- vaza", ({ dir }) => {
  const construir = (sub, entradasRej) => {
    const d = path.join(dir, sub);
    fs.mkdirSync(d, { recursive: true });
    // 1. O store de VOTO — a mesma entrada de voto nos dois lados.
    const { store } = writeStoreFromPolls(votoFixture(), { runDate: "2026-08-10", dir: d, meta: { built_by: "rejection-check" } });
    // 2. A REJEIÇÃO — vazia num lado, populada no outro. Escreve rejection.ndjson.
    const file = specRejeicao(d, entradasRej);
    const { rejections } = loadRejection({ file });
    writeRejectionProjection(d, rejections);
    return { d, store, nRej: rejections.length };
  };

  const vazio = construir("vazio", []);
  const cheio = construir("cheio", [entradaOK()]);

  // A prova não é vacuosa: o lado populado escreveu MESMO uma rejeição.
  afirmaGlobal(vazio.nRej === 0 && cheio.nRej === 1, `rejeições: vazio=${vazio.nRej} cheio=${cheio.nRej}`);
  afirmaGlobal(fs.existsSync(path.join(cheio.d, "rejection.ndjson")), "o lado populado não escreveu rejection.ndjson");

  // O STORE DE VOTO é byte-idêntico dos dois lados — a rejeição não o perturba.
  for (const t of ["questions", "surveys", "candidates", "institutes"]) {
    const a = fs.readFileSync(path.join(vazio.d, `${t}.ndjson`), "utf-8");
    const b = fs.readFileSync(path.join(cheio.d, `${t}.ndjson`), "utf-8");
    afirmaGlobal(a === b, `${t}.ndjson diferiu entre rejeição vazia e populada — a rejeição tocou o store de voto`);
  }
  // E a projeção que o site consome (`projectPolls`, o que `scenarioGroups` lê)
  // não tem NENHUMA linha do espaço rej-.
  const projetadas = projectPolls(cheio.store);
  afirmaGlobal(projetadas.length > 0, "a projeção de voto ficou vazia — a fixture não construiu");
  afirmaGlobal(projetadas.every((p) => !String(p.id).startsWith("rej-")),
    `uma linha rej- vazou para a projeção de voto: ${projetadas.filter((p) => String(p.id).startsWith("rej-")).map((p) => p.id).join(", ")}`);
});

// ────────────────────────────────────────────────────────────────────────────
// (d) MENÇÃO MÚLTIPLA (soma 180) NUNCA APARECE na projeção que o site lê
// ────────────────────────────────────────────────────────────────────────────
caso("(d) uma rejeição multi_mention somando 180 nunca entra na projeção de voto", ({ dir }) => {
  // Uma rejeição de menção múltipla: cada candidato perguntado à parte, então a
  // soma é 90+90=180 — o número que, se vazasse para o voto, quebraria o guarda
  // de soma (cap 130) ou inflaria tudo. Ela é bem-formada como REJEIÇÃO.
  const multi = {
    match: { pollster: "Instituto Multi", race: "presidente", state: "PE", round: 1, fieldwork_end: "2026-07-30" },
    source: "https://exemplo/multi", evidence: "P15 rejeição multi-menção, leitura cega §1", verified_at: "2026-08-23",
    multi_mention: true,
    add_rejection: {
      pollster: "Instituto Multi", race: "presidente", state: "PE", round: 1,
      fieldwork_start: "2026-07-28", fieldwork_end: "2026-07-30", published_date: null,
      sample_size: 1000, margin_of_error: 3, tse_registration: "PE-77003/2026",
      results: [
        { candidate: "Alfa Rejeicao", party: "PT", pct_bruta: 90, conhece_pct: null },
        { candidate: "Beta Rejeicao", party: "PL", pct_bruta: 90, conhece_pct: null },
      ],
    },
  };
  const file = specRejeicao(dir, [multi]);
  const { rejections } = loadRejection({ file });
  afirmaGlobal(rejections.length === 1, `a multi_mention não carregou como rejeição (${rejections.length})`);
  const somaRej = rejections[0].results.reduce((a, r) => a + r.pct_bruta, 0);
  afirmaGlobal(somaRej === 180, `a soma da rejeição não é 180 (${somaRej}) — a fixture perdeu o ponto`);

  // Constrói o store de VOTO SEM a multi_mention (ela nunca entra em polls), e
  // escreve a rejeição à parte. `projectPolls` é o que `scenarioGroups` lê.
  writeRejectionProjection(dir, rejections);
  const { store } = writeStoreFromPolls(votoFixture(), { runDate: "2026-08-10", dir, meta: { built_by: "rejection-check" } });
  const projetadas = projectPolls(store);
  // Nenhuma linha projetada tem id rej-, e NENHUMA soma ~180 (a assinatura da
  // multi-menção): se a rejeição tivesse vazado, uma pergunta somaria 180.
  afirmaGlobal(projetadas.every((p) => !String(p.id).startsWith("rej-")), "id rej- vazou para a projeção");
  for (const p of projetadas) {
    const soma = (p.results ?? []).reduce((a, r) => a + r.pct, 0);
    afirmaGlobal(soma < 130, `uma pergunta de voto somou ${soma} — a rejeição multi-menção (180) vazou`);
  }
  // E a projeção de rejeição EXISTE à parte, com a multi_mention marcada.
  const rej = ler(dir, "rejection");
  afirmaGlobal(rej.length === 1 && rej[0].multi_mention === true, "a rejeição multi_mention não foi projetada isolada");
});

console.log(`\n${ok} passaram · ${falhas.length} falharam`);
if (falhas.length) {
  console.error("REJEIÇÃO FALHOU — a tabela de rejeição não está isolada ou não reproduz o dado semente.");
  process.exit(1);
}
console.log("REJEIÇÃO OK — reproduz a bruta semente, recusa sem citação, e nunca toca no store de voto.");
