#!/usr/bin/env node
// The migration gate: prove the store reproduces data/polls.json exactly.
//
// Three levels, all scripted, none eyeballed:
//   (a) bijection      — every legacy poll id maps to exactly one question and
//                        back, with no orphans in either direction
//   (b) field equality — institute, race, state, round, dates, sample, MOE and
//                        every result row, value by value
//   (c) averages       — computeAverage over the legacy dataset and over the
//                        store projection must agree on every candidate value,
//                        ordering, poll count, spread and last poll date
//
// Level (c) is the one that matters: (a) and (b) can pass while a grouping bug
// still changes what the site displays. It is deliberately run through the
// SAME average.ts the site uses, unmodified, so no behavioural change can hide
// inside the migration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";
import { canonicalPartyAt } from "./lib/parties.mjs";
import { canonicalCandidate, usarRegistroDeUrna } from "./lib/candidates.mjs";
import { canonicalizeCandidates } from "./lib/canonicalize.mjs";
import { partyOverride } from "./lib/repairs.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function keyOf(p) {
  return p.id;
}

function norm(v) {
  if (v === undefined) return null;
  return v;
}

// ---------------------------------------------------------------------------
// AS EXCEÇÕES DECLARADAS E O CINTO DOS CAMPOS EXATOS
// ---------------------------------------------------------------------------
//
// Fora de `comparar` e EXPORTADAS para que o `--self-test` possa afirmar a
// PREMISSA do cinto: nenhum portão de `DECLARED` pode incidir sobre campo de
// `EXACT`. A assinatura de `comparar` não muda — subir uma constante pura não é
// injetar dependência.
//
// Por que a premissa e não o caminho: o cinto `!EXACT.has(f)` FUNCIONA (um
// portão largo demais não absolve o campo exato), mas uma regra declarada que
// incida sobre campo exato fica SILENCIOSAMENTE INERTE — quem a escreveu pensa
// ter declarado uma exceção, o cinto a mata, e nada avisa. Medido: acrescentar
// um portão sobre `fieldwork_end` passa a bateria inteira VERDE.

//
// Some differences are structural consequences of the survey layer, not
// migration bugs, and pretending otherwise would mean either waving them
// through or corrupting the store to preserve them. They are DECLARED here,
// counted, and everything outside the list is a hard failure. In particular
// `fieldwork_end`, every result percentage and the institute name are held
// to exact equality, because those are what the averages are computed from.
export const DECLARED = {
  // A survey has one fieldwork window; scenarios of the same survey that
  // arrived from a source lacking the start date now inherit it.
  fieldwork_start_backfilled: (f, l, p) => f === "fieldwork_start" && l == null && p != null,
  // Registration is an identity key, so "BR -07845/2026" must normalise.
  registration_whitespace: (f, l, p) =>
    f === "tse_registration" && typeof l === "string" &&
    l.replace(/\s+/g, "").toUpperCase() === String(p).replace(/\s+/g, "").toUpperCase(),
  // published_date is likewise survey-level.
  published_date_backfilled: (f, l, p) => f === "published_date" && l == null && p != null,
  // Poder360 sometimes serves "" where it means "no registration".
  empty_registration_to_null: (f, l, p) => f === "tse_registration" && l === "" && p == null,
  // Two Poder360 records disagree with THEMSELVES on the fieldwork start
  // across scenarios of one poll id (13050, 13369 — a month apart, clearly a
  // source typo). A survey has one window, so one value wins and the other is
  // logged. Bounded deliberately: if this ever exceeds a handful of fields the
  // gate fails, because it would mean the grouping key had gone coarse again.
  source_self_contradiction_on_start: (f, l, p) =>
    f === "fieldwork_start" && l != null && p != null && l !== p,
  // Two rows carried by BOTH Wikipedia pages. The survey now holds one
  // article_url, and for a pt-BR site the Portuguese page is the right one.
  // Capped: this must stay two known rows, not a drift in source priority.
  wikipedia_en_to_pt: (f, l, p) =>
    f === "source_url" && /en\.wikipedia\.org/.test(String(l)) && /pt\.wikipedia\.org/.test(String(p)),
};
export const DECLARED_CAPS = { source_self_contradiction_on_start: 6, wikipedia_en_to_pt: 2 };
// Todo campo que o nível (b) compara. Exportada com as outras: é sobre ELA que o
// autoteste varre a alcançabilidade dos portões declarados.
export const FIELDS = ["pollster", "race", "state", "round", "fieldwork_start", "fieldwork_end",
                "published_date", "sample_size", "margin_of_error", "others_pct",
                "undecided_pct", "blank_null_pct", "source", "tse_registration",
                "scenario", "source_url", "contractor"];

export const EXACT = new Set(["pollster", "race", "state", "round", "fieldwork_end", "sample_size", "margin_of_error"]);

/**
 * A COMPARAÇÃO, SEM DISCO E SEM CONSOLE — os três níveis, sobre dois lados dados.
 *
 * Separada de `main` para que exista um `--self-test`: enquanto ler `data/` e
 * imprimir estivessem no mesmo lugar da comparação, este portão só podia ser
 * exercitado contra o banco vivo, e um portão que ninguém consegue testar é o
 * que o §2 do CONVENTIONS chama de guarda que mente (foi o destino do
 * `upsert-vs-migration.mjs`).
 *
 * As TRÊS FUNÇÕES DE TABELA entram por parâmetro, com o valor real por padrão.
 * Não é indireção decorativa: `canonicalCandidate` lê `candidate-rulings.json`,
 * `partyOverride` lê `repairs.json` e `canonicalPartyAt` lê a tabela de partidos
 * — todas dado VIVO. Um autoteste que dependesse delas envelheceria com a
 * coleta e passaria a medir o banco em vez do portão.
 *
 * Devolve as linhas a imprimir em vez de imprimi-las, para `main` sair
 * exatamente igual ao que saía antes desta separação.
 */
export function comparar({ legacy, projected, canon = canonicalCandidate, override = partyOverride, partido = canonicalPartyAt }) {
  const linhas = [];
  const errors = [];
  const E = (m) => errors.push(m);

  // ---------------------------------------------------------------- (a)
  const legacyById = new Map(legacy.polls.map((p) => [keyOf(p), p]));
  const projById = new Map(projected.map((p) => [keyOf(p), p]));
  if (legacy.polls.length !== legacyById.size) E(`polls.json tem ids duplicados (${legacy.polls.length} linhas, ${legacyById.size} ids)`);
  if (projected.length !== projById.size) E(`projeção tem ids duplicados (${projected.length} linhas, ${projById.size} ids)`);
  for (const id of legacyById.keys()) if (!projById.has(id)) E(`(a) ausente na projeção: ${id}`);
  for (const id of projById.keys()) if (!legacyById.has(id)) E(`(a) extra na projeção: ${id}`);
  linhas.push(`(a) bijeção: ${legacyById.size} legadas × ${projById.size} projetadas — ${errors.length ? "FALHA" : "ok"}`);

  // ---------------------------------------------------------------- (b)
  const declaredCounts = Object.fromEntries(Object.keys(DECLARED).map((k) => [k, 0]));

  const sameValue = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
    return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  };

  let fieldDiffs = 0;
  let resultRows = 0;
  // `scenario`, `source_url` and the per-result `party` were originally absent
  // here, which made them invisible to the gate even though two of the three
  // are rendered. They are compared now: a blind spot in a migration gate is
  // indistinguishable from a passing one until it ships.
  for (const [id, lp] of legacyById) {
    const pp = projById.get(id);
    if (!pp) continue;
    for (const f of FIELDS) {
      if (sameValue(lp[f], pp[f])) continue;
      const label = Object.entries(DECLARED).find(([, fn]) => fn(f, lp[f], pp[f]))?.[0];
      if (label && !EXACT.has(f)) { declaredCounts[label]++; continue; }
      if (fieldDiffs < 15) E(`(b) ${id}.${f}: legado ${JSON.stringify(lp[f])} ≠ projetado ${JSON.stringify(pp[f])}`);
      fieldDiffs++;
    }
    // Both sides are sorted by the CANONICAL name. Sorting the legacy side by
    // its raw name would misalign every row the alias table renames — the two
    // lists would be compared position by position while ordered differently,
    // and the mismatch would read as a data error rather than a sort bug.
    const contestOfPoll = `${lp.race}:${lp.state ?? "BR"}`;
    const lr = [...(lp.results ?? [])].sort((a, b) =>
      canon(a.candidate, contestOfPoll).localeCompare(canon(b.candidate, contestOfPoll)));
    const pr = [...(pp.results ?? [])].sort((a, b) => a.candidate.localeCompare(b.candidate));
    resultRows += lr.length;
    if (lr.length !== pr.length) {
      if (fieldDiffs < 15) E(`(b) ${id}: ${lr.length} resultados no legado, ${pr.length} na projeção`);
      fieldDiffs++;
      continue;
    }
    for (let i = 0; i < lr.length; i++) {
      // O nome canônico é o que se compara, então é o que a mensagem tem de
      // nomear: imprimindo o cru do legado, uma renomeação da tabela de alias
      // que o store não acompanhou saía como "Ravenna Castro ≠ Ravenna Castro"
      // — a divergência real ficava ilegível.
      const nome = canon(lr[i].candidate, contestOfPoll);
      // O cru vai junto como origem, mas SÓ quando difere: na esmagadora
      // maioria das linhas o alias não renomeia nada, e "Lula (cru "Lula")"
      // gastaria a metade da mensagem repetindo o mesmo nome. Consequência para
      // quem for testar isto: a mensagem muda de FORMA com o dado, e o caso raro
      // é justamente o que leva o sufixo — uma asserção ancorada no formato SEM
      // sufixo passa verde sem nunca tocar no caso que importa.
      const cru = nome !== lr[i].candidate ? ` (cru "${lr[i].candidate}")` : "";
      if (nome !== pr[i].candidate || Math.abs(lr[i].pct - pr[i].pct) > 0.001) {
        if (fieldDiffs < 15) E(`(b) ${id}: ${nome}${cru} ${lr[i].pct} ≠ ${pr[i].candidate} ${pr[i].pct}`);
        fieldDiffs++;
      }
      // The party label is rendered on every board and card. Compared THROUGH
      // the same two functions the store is built with — a curated repair
      // first, then date-aware normalisation — rather than exempted. The store
      // may differ from the legacy file by exactly those and by nothing else,
      // so a wrong party still fails here.
      // `partyOverride` casa pela grafia CRUA de propósito: o reparo curado está
      // gravado em data/repairs.json contra o nome que o instituto publicou, não
      // contra o canônico. Trocar esta chave por `canon` faria o reparo deixar de
      // casar em silêncio — foi assim que um reparo curado já se perdeu, com o
      // `upsertPoll` que não consultava `partyOverride`. Só o RÓTULO abaixo usa o
      // canônico, pelo mesmo motivo da mensagem de cima.
      const ovp = override(lp, lr[i].candidate);
      const expectedParty = ovp.has
        ? ovp.party
        : partido(lr[i].party, lp.fieldwork_end ?? lp.published_date ?? null);
      if ((pr[i].party ?? null) !== expectedParty) {
        if (fieldDiffs < 15) {
          E(`(b) ${id}: partido de ${nome}${cru}: legado ${JSON.stringify(lr[i].party)} → esperado ${JSON.stringify(expectedParty)}${ovp.has ? " (reparo curado)" : ""} ≠ projetado ${JSON.stringify(pr[i].party)}`);
        }
        fieldDiffs++;
      }
    }
  }
  linhas.push(`(b) igualdade de campos: ${resultRows} linhas de resultado — ${fieldDiffs} divergência(s) não declarada(s)`);
  for (const [k, n] of Object.entries(declaredCounts)) {
    if (!n) continue;
    const cap = DECLARED_CAPS[k];
    linhas.push(`    declarada · ${k}: ${n} campo(s)${cap ? ` (limite ${cap})` : ""}`);
    if (cap && n > cap) E(`(b) exceção declarada "${k}" excedeu o limite: ${n} > ${cap}`);
  }

  // ---------------------------------------------------------------- (c)
  // Compare the poll SETS that feed every average, per contest and scenario
  // group. Identical inputs to an unmodified computeAverage ⇒ identical output.
  const contests = new Map();
  const add = (map, p) => {
    const k = `${p.race}|${p.state ?? "BR"}|${p.round}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  };
  const legacyC = new Map();
  const projC = new Map();
  for (const p of legacy.polls) add(legacyC, p);
  for (const p of projected) add(projC, p);
  let contestDiffs = 0;
  const allKeys = new Set([...legacyC.keys(), ...projC.keys()]);
  for (const k of allKeys) {
    const a = (legacyC.get(k) ?? []).map(keyOf).sort();
    const b = (projC.get(k) ?? []).map(keyOf).sort();
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
      if (contestDiffs < 10) E(`(c) disputa ${k}: ${a.length} pesquisas no legado, ${b.length} na projeção`);
      contestDiffs++;
      continue;
    }
    // ordering by date must also match, since the average takes the newest 10
    const ao = (legacyC.get(k) ?? []).map((p) => `${p.fieldwork_end ?? p.published_date ?? ""}|${p.pollster}`);
    const bo = (projC.get(k) ?? []).map((p) => `${p.fieldwork_end ?? p.published_date ?? ""}|${p.pollster}`);
    ao.sort(); bo.sort();
    if (ao.join("~") !== bo.join("~")) {
      if (contestDiffs < 10) E(`(c) disputa ${k}: conjunto (data, instituto) diverge`);
      contestDiffs++;
    }
  }
  linhas.push(`(c) conjuntos por disputa: ${allKeys.size} disputas — ${contestDiffs} divergência(s)`);

  return { errors, linhas };
}

// ---------------------------------------------------------------------------
// AUTOTESTE — o guarda tem de FALHAR quando deve (§2)
// ---------------------------------------------------------------------------
//
// Este portão passou meses sem autoteste, e é o mesmo portão que o cabeçalho de
// `derive-polls.mjs` declara ter tido o trabalho encerrado ("compares the store
// against its own output"). Um guarda nessa situação só não mente porque o
// `canonicalCandidate` do lado esquerdo é aplicado AO VIVO — o que o transformou,
// sem ninguém projetar, num detector de store defasado em relação à tabela de
// nomes. Foi assim que a Ravenna acendeu aqui e em lugar nenhum mais.
//
// FIXTURES SINTÉTICOS, E AS TRÊS TABELAS DUBLADAS. Nada aqui lê `data/`: um
// autoteste que chamasse `canonicalCandidate` de verdade passaria a medir o
// banco em vez do portão, e envelheceria a cada ruling nova.

/** Uma pesquisa mínima com todos os campos que o nível (b) compara. */
function pesquisa(over = {}) {
  return {
    id: "px-1", pollster: "Instituto Sintético", race: "presidente", state: null, round: 1,
    fieldwork_start: "2026-01-01", fieldwork_end: "2026-01-03", published_date: "2026-01-04",
    sample_size: 1000, margin_of_error: 3, others_pct: 0, undecided_pct: 0, blank_null_pct: 0,
    source: "sintetico", tse_registration: "BR-00001/2026", scenario: "1º turno",
    source_url: "https://exemplo.invalido/1", contractor: null,
    results: [{ candidate: "Alfa", pct: 40, party: "AA" }, { candidate: "Beta", pct: 35, party: "BB" }],
    ...over,
  };
}
const clonar = (o) => JSON.parse(JSON.stringify(o));
/** As três tabelas, neutras: identidade, sem reparo curado, partido como veio. */
const NEUTRO = { canon: (n) => n, override: () => ({ has: false }), partido: (x) => x };

function autoteste() {
  const falhas = [];
  const ok = (cond, msg) => { if (!cond) falhas.push(msg); };
  const rodar = (legacyPolls, projected, opts = {}) =>
    comparar({ legacy: { polls: legacyPolls }, projected, ...NEUTRO, ...opts });

  // 1. LADOS IDÊNTICOS NÃO ACUSAM NADA. Sem isto, um portão que acusa sempre
  //    passaria por rigoroso.
  {
    const r = rodar([pesquisa()], [clonar(pesquisa())]);
    ok(r.errors.length === 0, `lados idênticos não podem acusar (veio ${r.errors.length}: ${r.errors[0] ?? ""})`);
    ok(r.linhas.some((l) => l.includes("(a) bijeção: 1 legadas × 1 projetadas — ok")), "a linha (a) sai com o veredito ok");
    ok(r.linhas.some((l) => l.includes("(b) igualdade de campos: 2 linhas de resultado — 0 divergência")), "a linha (b) conta as linhas de resultado");
    ok(r.linhas.some((l) => l.includes("(c) conjuntos por disputa: 1 disputas — 0 divergência")), "e a linha (c) as disputas");
  }

  // 2. (a) BIJEÇÃO — os dois sentidos, e ids duplicados.
  {
    ok(rodar([pesquisa()], []).errors.some((e) => /\(a\) ausente na projeção: px-1/.test(e)), "some da projeção → acusa ausente");
    ok(rodar([], [pesquisa()]).errors.some((e) => /\(a\) extra na projeção: px-1/.test(e)), "sobra na projeção → acusa extra");
    const dup = [pesquisa(), pesquisa()];
    ok(rodar(dup, [pesquisa()]).errors.some((e) => /ids duplicados/.test(e)), "id repetido no legado é acusado");
  }

  // 3. (b) UM CAMPO QUALQUER DIVERGINDO. `pollster` é EXATO por estar em
  //    `EXACT`: nenhuma exceção declarada o absolve.
  {
    const r = rodar([pesquisa()], [clonar(pesquisa({ pollster: "Outro Instituto" }))]);
    ok(r.errors.some((e) => /\(b\) px-1\.pollster:/.test(e)), `instituto diferente é acusado (veio ${r.errors[0] ?? "nada"})`);
  }

  // 4. (b) NÚMERO DE LINHAS DE RESULTADO.
  {
    const curto = pesquisa(); curto.results = [curto.results[0]];
    const r = rodar([pesquisa()], [clonar(curto)]);
    ok(r.errors.some((e) => /2 resultados no legado, 1 na projeção/.test(e)), "elenco encurtado na projeção é acusado");
    // ⚠ COMO ESTA É PEGA, dito com precisão: tirar o `continue` desta guarda NÃO
    //   avermelha esta asserção — o laço seguinte estoura em `pr[i].candidate`
    //   com `pr[i]` indefinido, e o autoteste CAI em vez de acusar. Falha alta e
    //   imediata, então protege; mas quem ler "vermelho" aqui está lendo um
    //   crash, não este `ok`. Registrado porque red-por-crash não é evidência da
    //   mesma qualidade que red-por-asserção — é a versão em runtime do mutante
    //   que não compila.
  }

  // 5. ⚠ O CASO RAVENNA, SINTÉTICO — a tabela de nomes renomeia e o store não
  //    acompanhou. É a única espécie que este portão ainda pega de verdade, e a
  //    que ficou ILEGÍVEL por anos porque a mensagem imprimia o cru dos dois
  //    lados ("Ravenna Castro ≠ Ravenna Castro").
  {
    const canon = (n, c) => (n === "Ravenna Castro" && c === "senador:PI" ? "Ravenna da Inclusão" : n);
    const leg = pesquisa({ race: "senador", state: "PI", results: [{ candidate: "Ravenna Castro", pct: 1, party: "DEM" }] });
    const proj = clonar(leg);
    const r = rodar([leg], [proj], { canon });
    ok(r.errors.length > 0, "renomeação que o store não acompanhou TEM de acusar");
    const msg = r.errors.find((e) => /\(b\) px-1:/.test(e)) ?? "";
    ok(/Ravenna da Inclusão/.test(msg), `a mensagem nomeia o CANÔNICO, que é o que foi comparado (veio "${msg}")`);
    ok(/\(cru "Ravenna Castro"\)/.test(msg), `e carrega o CRU como origem, entre parênteses (veio "${msg}")`);
    ok(!/^\(b\) px-1: Ravenna Castro \d/.test(msg), "e nunca abre com o cru dos dois lados, que era o ilegível");
  }

  // 5b. ⚠ E O SUFIXO SÓ SAI QUANDO DIFERE. A mensagem muda de FORMA com o dado:
  //     no caso comum o cru é igual ao canônico e o sufixo não aparece. Uma
  //     asserção ancorada só no formato SEM sufixo passaria verde sem nunca
  //     tocar no caso do bloco 5, que é o único que importa.
  {
    const proj = clonar(pesquisa()); proj.results[0].candidate = "Gama";
    const msg = rodar([pesquisa()], [proj]).errors.find((e) => /\(b\) px-1:/.test(e)) ?? "";
    ok(/Alfa 40 ≠/.test(msg), `sem renomeação a mensagem sai sem sufixo (veio "${msg}")`);
    ok(!/\(cru /.test(msg), "e o sufixo NÃO aparece quando o canônico é igual ao cru");
  }

  // 5c. ⚠ A ORDENAÇÃO DO LADO LEGADO É PELO NOME CANÔNICO, e isto não estava
  //     exercitado: todos os fixtures dublavam `canon` como identidade, e o
  //     único que renomeia tinha UMA linha de resultado — com uma linha só,
  //     ordenar por cru ou por canônico dá o mesmo. O cabeçalho do laço chama
  //     essa ordenação de load-bearing ("sorting the legacy side by its raw name
  //     would misalign every row the alias table renames"), e nada a trancava.
  //
  //     Aqui a renomeação INVERTE a ordem de propósito: no cru, "Alfa Cru" vem
  //     antes de "Zeta Cru"; nos canônicos, a ordem se inverte. Ordenar pelo cru
  //     desalinha as duas listas e o portão acusa uma divergência que não existe.
  {
    const MAPA = { "Alfa Cru": "Zeta Canônico", "Zeta Cru": "Alfa Canônico" };
    const canon = (n) => MAPA[n] ?? n;
    const leg = pesquisa({ results: [
      { candidate: "Zeta Cru", pct: 10, party: "AA" },
      { candidate: "Alfa Cru", pct: 20, party: "BB" },
    ] });
    const proj = pesquisa({ results: [
      { candidate: "Alfa Canônico", pct: 10, party: "AA" },
      { candidate: "Zeta Canônico", pct: 20, party: "BB" },
    ] });
    const r = rodar([leg], [proj], { canon });
    ok(r.errors.length === 0,
      `ordenado pelo canônico, as duas listas alinham (veio ${r.errors.length}: ${r.errors[0] ?? ""})`);
    // E a prova de que o fixture não é degenerado: as duas ordens DIFEREM.
    const porCru = [...leg.results].map((x) => x.candidate).sort();
    const porCanon = [...leg.results].sort((a, b) => canon(a.candidate).localeCompare(canon(b.candidate))).map((x) => x.candidate);
    ok(porCru.join() !== porCanon.join(),
      `o fixture tem de ter ordem crua diferente da canônica (veio ${porCru.join()} vs ${porCanon.join()})`);
  }

  // 5d. ⚠ CADA CAMPO DE `FIELDS` É COMPARADO, um a um. Tirar `scenario`,
  //     `source_url`, `contractor` ou `source` da lista passava VERDE: só o
  //     `pollster` era perturbado em algum caso, e os outros dezesseis não
  //     tinham nada os trancando. O cabeçalho de `FIELDS` conta que esses três
  //     eram ponto cego e foram incluídos — "a blind spot in a migration gate is
  //     indistinguishable from a passing one until it ships" —, e uma regressão
  //     que reabrisse o ponto cego passava neste autoteste.
  //     `fieldwork_start` fica de fora: uma exceção declarada o absolve de
  //     propósito, e ele é exercitado no bloco 9.
  {
    const CAMPOS = ["pollster", "race", "state", "round", "fieldwork_end", "published_date",
                    "sample_size", "margin_of_error", "others_pct", "undecided_pct",
                    "blank_null_pct", "source", "tse_registration", "scenario", "source_url", "contractor"];
    for (const f of CAMPOS) {
      const proj = clonar(pesquisa()); proj[f] = "PERTURBADO";
      const r = rodar([pesquisa()], [proj]);
      ok(r.errors.some((e) => e.startsWith(`(b) px-1.${f}:`)),
        `o campo \`${f}\` tem de ser comparado pelo nível (b) (veio ${r.errors[0] ?? "nada"})`);
    }
  }

  // 5e. ⚠ A CLASSE DOS NOMES NOVOS (rodada 32531108279, 21/08/2026, 140
  //     divergências) — o portão medindo com um estado da tabela de urna que o
  //     store NÃO consumiu. O casador reescrevia data/ballot-names.json ENTRE a
  //     coleta e este portão: todo nome que ESTREAVA com candidatura casável
  //     ganhava entrada nova, o lado legado era renomeado por ela e o store
  //     ainda carregava a grafia da tabela velha. O conserto não é regra nova de
  //     nome — é o workflow rodar o casador ANTES da coleta, para os dois lados
  //     consumirem a MESMA tabela (§5; §3: artefato reescrito no meio da
  //     verificação anula a verificação).
  //
  //     Este bloco usa o canonicalCandidate REAL (o default de `comparar`, não
  //     um dublê) sobre registros de urna injetados por `usarRegistroDeUrna` —
  //     a porta que existe exatamente para provar coisas que só existem ENTRE
  //     estados do arquivo. A disputa é sintética (UF "ZZ"), então as tabelas
  //     vivas de ruling/apelido, que `table()` sempre lê, não têm como opinar.
  //     As três subclasses medidas na rodada real, reproduzidas uma a uma:
  //       · SIGLA: o registro grava "JOAQUIM DO MLB", o titleCase do
  //         fetch-candidaturas rende "Joaquim do Mlb", e o exato renomeia sem
  //         mudar nada além da caixa — só o lado do portão vê;
  //       · LONGA/CURTA: "Paulo Rubem" estreia, o agrupador escolhe a mais
  //         curta vista 2× para o store, e a entrada nova por contenção manda
  //         o lado do portão para "Paulo Rubem Santiago";
  //       · CASCATA: os dois lados são ordenados por nomes DIFERENTES quando só
  //         um deles renomeia ("Edjane" → "Policial Edjane"), e a comparação
  //         posicional acusa par a par nomes e partidos que nada têm de errado.
  {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "paridade-urna-"));
    const T0 = path.join(dir, "t0.json"); // a tabela que o store consumiu
    const T1 = path.join(dir, "t1.json"); // a tabela reescrita no meio da rodada
    fs.writeFileSync(T0, JSON.stringify({ mapping: {} }));
    fs.writeFileSync(T1, JSON.stringify({ mapping: { "senador:ZZ": {
      "joaquim do mlb": { nome_urna: "Joaquim do Mlb", sq_candidato: "900000000001" },
      "paulo rubem": { nome_urna: "Paulo Rubem Santiago", sq_candidato: "900000000002" },
      "edjane": { nome_urna: "Policial Edjane", sq_candidato: "900000000003" },
    } } }));
    const linha = (candidate, pct, party = null) => ({ candidate, pct, party });
    const rodada = () => [
      pesquisa({ id: "pz-mlb", race: "senador", state: "ZZ", results: [linha("Joaquim do MLB", 1)] }),
      pesquisa({ id: "pz-pr1", race: "senador", state: "ZZ", results: [linha("Paulo Rubem", 1)] }),
      pesquisa({ id: "pz-pr2", race: "senador", state: "ZZ", results: [linha("Paulo Rubem", 2)] }),
      pesquisa({ id: "pz-prs", race: "senador", state: "ZZ", results: [linha("Paulo Rubem Santiago", 3)] }),
      pesquisa({ id: "pz-casc", race: "senador", state: "ZZ", results: [
        linha("Edjane", 0.4), linha("Fernando Haddad", 33.8, "PT"), linha("Izadora Dias", 0.4),
      ] }),
    ];
    try {
      // O store da rodada: canonicalizado com T0 — o agrupador REAL decide.
      usarRegistroDeUrna(T0);
      const store = canonicalizeCandidates(rodada());
      // O fixture não pode ser degenerado: a mais-curta-vista-2× tem de ter
      // vencido de verdade, senão a subclasse longa/curta não está no jogo.
      ok(store.find((p) => p.id === "pz-prs").results[0].candidate === "Paulo Rubem",
        "a grafia mais curta vista 2× tem de renomear a longa no lado do store");
      // polls.json é derivado da projeção, então os dois lados são o MESMO
      // registro — exatamente a tautologia de derive-polls.mjs.
      const legado = clonar(store);
      const projetado = clonar(store);
      const SEM_REPARO = { override: () => ({ has: false }), partido: (x) => x };
      // A REPRODUÇÃO (a ordem antiga): o portão lê T1, o store consumiu T0.
      usarRegistroDeUrna(T1);
      const r = comparar({ legacy: { polls: legado }, projected: projetado, ...SEM_REPARO });
      ok(r.errors.some((e) => /pz-mlb: Joaquim do Mlb \(cru "Joaquim do MLB"\) 1 ≠ Joaquim do MLB 1/.test(e)),
        `a subclasse da SIGLA tem de acusar com o canônico e o cru (veio ${r.errors[0] ?? "nada"})`);
      ok(r.errors.some((e) => /Paulo Rubem Santiago \(cru "Paulo Rubem"\)/.test(e)),
        `a subclasse LONGA⁄CURTA tem de acusar a renomeação por contenção (veio ${r.errors.find((e) => /pz-pr/.test(e)) ?? "nada"})`);
      ok(r.errors.some((e) => /pz-casc: Fernando Haddad 33.8 ≠ Edjane 0.4/.test(e)),
        `a CASCATA posicional tem de desalinhar o par (veio ${r.errors.find((e) => /pz-casc/.test(e)) ?? "nada"})`);
      ok(r.errors.some((e) => /pz-casc: partido de Fernando Haddad: .* ≠ projetado null/.test(e)),
        "e o partido desalinhado sai acusado no par errado, como na rodada real");
      // O CONSERTO: o portão lê a MESMA tabela que o store consumiu — verde.
      usarRegistroDeUrna(T0);
      const v = comparar({ legacy: { polls: clonar(legado) }, projected: clonar(projetado), ...SEM_REPARO });
      ok(v.errors.length === 0,
        `com a MESMA tabela dos dois lados não há divergência (veio ${v.errors.length}: ${v.errors[0] ?? ""})`);
    } finally {
      usarRegistroDeUrna();
      fs.rmSync(dir, { recursive: true, force: true });
    }
    // E A TRANCA DA ORDEM. O conserto vive na ordem dos passos do workflow —
    // casador ANTES da coleta —, e é a ordem executada, não um comentário:
    // o GitHub roda os passos na sequência do arquivo. Reverter a ordem é a
    // mutação que este bloco existe para avermelhar.
    {
      const wf = fs.readFileSync(path.join(ROOT, ".github", "workflows", "update-polls.yml"), "utf-8");
      // Âncora no comando executável, não na string solta: um comentário do
      // yml citando um script antes do outro enganaria o indexOf cru — verde
      // falso se citasse o casador, vermelho espúrio se citasse o scrape.
      const casador = wf.indexOf("run: node scripts/match-ballot-names.mjs");
      const coleta = wf.indexOf("run: node scripts/scrape.mjs");
      ok(casador > 0 && coleta > 0, "o workflow tem de conter o casador e a coleta");
      ok(casador < coleta,
        "o casador tem de rodar ANTES da coleta no workflow — depois dela, ele reescreve a tabela de urna no meio da verificação da rodada e este portão mede com um estado que o store não consumiu (140 divergências em 21/08/2026)");
    }
  }

  // 6. (b) PERCENTUAL — a tolerância é 0,001, e ela tem de barrar dos dois lados.
  {
    const dentro = clonar(pesquisa()); dentro.results[0].pct = 40.0005;
    ok(rodar([pesquisa()], [dentro]).errors.length === 0, "diferença abaixo da tolerância não acusa");
    const fora = clonar(pesquisa()); fora.results[0].pct = 40.01;
    ok(rodar([pesquisa()], [fora]).errors.some((e) => /40 ≠ Alfa 40\.01/.test(e)), "acima da tolerância acusa");
  }

  // 7. (b) PARTIDO, e a NORMALIZAÇÃO POR DATA. O esperado passa por `partido`;
  //    o portão compara contra ele, não contra o rótulo cru do legado.
  {
    const proj = clonar(pesquisa()); proj.results[0].party = "ZZ";
    ok(rodar([pesquisa()], [proj]).errors.some((e) => /partido de Alfa/.test(e)), "partido divergente é acusado");
    const norm = clonar(pesquisa()); norm.results[0].party = "AA-NOVO";
    ok(rodar([pesquisa()], [norm], { partido: (x) => (x === "AA" ? "AA-NOVO" : x) }).errors.length === 0,
      "e a renomeação de partido por data é absorvida, não acusada");
  }

  // 8. ⚠ O REPARO CURADO CASA PELA GRAFIA CRUA — a armadilha da linha do
  //    `override`. O reparo está gravado em `repairs.json` contra o nome que o
  //    instituto PUBLICOU, não contra o canônico. Trocar essa chave por `nome`
  //    faz o reparo deixar de casar EM SILÊNCIO: nos dados de hoje o fallback
  //    acerta por acaso, e o dano só aparece quando o rótulo cru está errado —
  //    que é justamente o caso que o reparo existe para corrigir.
  {
    const canon = (n) => (n === "Grafia Publicada" ? "Nome Canônico" : n);
    const override = (lp, n) => (n === "Grafia Publicada" ? { has: true, party: "CERTO" } : { has: false });
    const leg = pesquisa({ results: [{ candidate: "Grafia Publicada", pct: 10, party: "ERRADO" }] });
    const proj = clonar(leg); proj.results[0] = { candidate: "Nome Canônico", pct: 10, party: "CERTO" };
    const r = rodar([leg], [proj], { canon, override });
    ok(r.errors.length === 0,
      `o reparo curado tem de casar pela grafia CRUA (veio ${r.errors.length}: ${r.errors[0] ?? ""})`);
    // E o contrafactual: casando pelo canônico, o reparo não é achado e o
    // fallback publica o rótulo errado — que é o dano que a armadilha causa.
    const porCanonico = (lp, n) => (n === "Nome Canônico" ? { has: true, party: "CERTO" } : { has: false });
    ok(rodar([leg], [proj], { canon, override: porCanonico }).errors.length > 0,
      "e o contrafactual prova a diferença: casando pelo canônico, o reparo se perde");
  }

  // 9. (b) EXCEÇÃO DECLARADA não é falha — mas o teto dela é.
  {
    const semInicio = pesquisa({ fieldwork_start: null });
    const r = rodar([semInicio], [clonar(pesquisa())]);
    ok(r.errors.length === 0, `o backfill de fieldwork_start é declarado, não acusado (veio ${r.errors[0] ?? ""})`);
    ok(r.linhas.some((l) => /declarada · fieldwork_start_backfilled: 1 campo/.test(l)), "e sai CONTADO na saída, nunca silencioso");
    // O teto: `source_self_contradiction_on_start` tem limite 6. Sete pesquisas
    // com o começo divergente estouram e viram erro.
    const legs = [], projs = [];
    for (let i = 0; i < 7; i++) {
      legs.push(pesquisa({ id: `px-${i}`, fieldwork_start: "2026-01-01" }));
      projs.push(pesquisa({ id: `px-${i}`, fieldwork_start: "2026-02-01" }));
    }
    const t = rodar(legs, projs);
    ok(t.errors.some((e) => /excedeu o limite: 7 > 6/.test(e)), `o teto da exceção declarada reprova quando estourado (veio ${t.errors[0] ?? "nada"})`);
    // ⚠ O QUE ESTE BLOCO NÃO ALCANÇA, medido e anotado em vez de fingido: o
    //   cinto `!EXACT.has(f)`, que impede uma exceção declarada de absolver um
    //   campo exato. Ele é INALCANÇÁVEL com a tabela de hoje — os quatro portões
    //   declarados exigem `fieldwork_start`, `published_date`, `source_url` e
    //   `tse_registration`, e nenhum desses está em `EXACT` (interseção vazia,
    //   conferida). Ou seja, hoje ele é cinto para uma regra declarada FUTURA
    //   larga demais, e nenhuma mutação o avermelha porque nenhuma o executa.
    //   Alcançá-lo exigiria içar `DECLARED` para parâmetro, como as três funções
    //   de tabela — decisão de escopo, não descuido.
  }

  // 9b. ⚠ A PREMISSA DO CINTO: NENHUM PORTÃO DECLARADO INCIDE SOBRE CAMPO EXATO.
  //
  //     O cinto `!EXACT.has(f)` funciona — um portão largo demais não absolve um
  //     campo exato, e as médias saem desses campos. O que ele NÃO faz é avisar.
  //     Uma regra declarada que incida sobre campo exato fica SILENCIOSAMENTE
  //     INERTE: quem a escreveu pensa ter declarado uma exceção, o cinto a mata,
  //     e nada reprova. Medido antes desta asserção existir: acrescentar um
  //     portão sobre `fieldwork_end` passava a bateria inteira VERDE.
  //
  //     Por isso o que se amarra aqui é a PREMISSA, não o caminho. O caminho
  //     (`!EXACT.has(f)`) é inalcançável enquanto a premissa valer — testá-lo
  //     exigiria uma regra que não existe. A premissa é o que quebra primeiro, e
  //     é ela que denuncia a regra morta no dia em que alguém a escrever.
  //
  //     Os portões são funções, então a incidência não se lê por introspecção:
  //     pergunta-se a cada um, para cada campo exato, com pares de valores que
  //     maximizam a chance de ele dizer sim (nulo↔valor, vazio↔nulo, dois
  //     valores diferentes). Todos os portões de hoje decidem no `f` logo na
  //     primeira cláusula, então isso os cobre.
  {
    const AMOSTRAS = [
      [null, "x"], ["x", null], ["", null], [null, ""],
      ["a", "b"], [1, 2], ["BR-1/2026", "BR 1/2026"],
      // ⚠ WHITESPACE PURO. O par acima difere por hífen-vs-espaço, então a
      //   normalização de espaço NÃO os iguala e `registration_whitespace` não
      //   era alcançado por amostra nenhuma — medido. Sem este par, um portão
      //   FUTURO sobre campo exato moldado como normalização-de-espaço escapava
      //   da varredura inteira.
      ["BR 1", "BR1"],
      ["https://en.wikipedia.org/a", "https://pt.wikipedia.org/a"],
    ];
    let incidencias = 0;
    for (const campo of EXACT) {
      for (const [nome, portao] of Object.entries(DECLARED)) {
        for (const [l, pr] of AMOSTRAS) {
          if (portao(campo, l, pr)) {
            incidencias++;
            ok(false, `o portão declarado "${nome}" incide sobre o campo EXATO \`${campo}\` (com ${JSON.stringify(l)} ≠ ${JSON.stringify(pr)}) — ou a regra está larga demais, ou ela é letra morta, porque o cinto a mata em silêncio`);
          }
        }
      }
    }
    ok(incidencias === 0, `nenhum portão declarado pode incidir sobre campo exato (incidências: ${incidencias})`);
    // E as duas listas não podem estar vazias, senão a varredura acima não
    // varre nada e a asserção vira decorativa — a degenerescência de sempre.
    ok(EXACT.size > 0, `EXACT tem de ter conteúdo, senão a varredura não varre nada (veio ${EXACT.size})`);
    ok(Object.keys(DECLARED).length > 0, `DECLARED idem (veio ${Object.keys(DECLARED).length})`);
    // ⚠ CADA PORTÃO INCIDE EM EXATAMENTE UM CAMPO — e isto é duas guardas numa.
    //
    //   ≥ 1 é a alcançabilidade: um portão que NENHUMA amostra alcança passaria
    //   pela varredura acima sem ser exercitado. Aconteceu com
    //   `registration_whitespace` até esta rodada, e é por isso que um portão de
    //   forma nova reprova aqui até ganhar a sua amostra.
    //
    //   ≤ 1 é o acidental: um portão que casa por engano contra um campo alheio
    //   passa a incidir em DOIS, e reprova. Fecha isso SEM precisar saber qual é
    //   o campo próprio de cada portão — um mapa nome→campo aqui seria a segunda
    //   declaração da mesma regra (§5) e sairia de sincronia em silêncio.
    //
    //   ⚠ O QUE ESTA GUARDA NÃO PEGA, medido, para ela não parecer cobrir mais
    //   do que cobre — que é o defeito que este arquivo inteiro persegue:
    //   uma cláusula MORTA sobre campo exato, isto é, com forma que nenhuma
    //   amostra tem (`f === "fieldwork_end" && l === "ZZZ" && p === "YYY"`),
    //   somada ao portão legítimo. Ela nunca dispara nas amostras, então não
    //   conta como campo, e o portão segue incidindo em um só: PASSA VERDE aqui
    //   e passa verde no cinto também. Medido em 19/08/2026.
    //   É limite de QUALQUER guarda que decida por amostragem de valores, não
    //   desta em particular. O que a estreita é a riqueza de `AMOSTRAS`, e ela é
    //   incompleta por construção. Uma cláusula assim é inerte enquanto o dado
    //   não tiver aquela forma — e no dia em que tiver, quem reprova é o cinto.
    //
    //   ⚠ SE UM PORTÃO DE DOIS CAMPOS FOR DELIBERADO, é aqui que se alarga a
    //   asserção, em voz alta — mas pense duas vezes: exceção declarada
    //   abrangendo dois campos é a "regra larga demais" que a premissa acima
    //   existe para pegar, e merece olho humano antes de virar exceção.
    for (const [nome, portao] of Object.entries(DECLARED)) {
      const campos = FIELDS.filter((campo) => AMOSTRAS.some(([l, pr]) => portao(campo, l, pr)));
      ok(campos.length === 1,
        campos.length === 0
          ? `nenhuma amostra faz o portão "${nome}" dizer sim — a varredura passa por ele sem exercitá-lo; acrescente uma amostra da forma dele`
          : `o portão "${nome}" incide em ${campos.length} campos (${campos.join(", ")}) — um portão declarado deve gatilhar num campo só. Se os dois forem DELIBERADOS, alargue esta asserção aqui e diga por quê; se não, um deles é acidente e o cinto o mata em silêncio`);
    }
  }

  // 10. (c) OS CONJUNTOS POR DISPUTA. É o nível que importa: (a) e (b) podem
  //     passar e a média ainda mudar, se o agrupamento mudou.
  {
    const outraDisputa = clonar(pesquisa()); outraDisputa.round = 2;
    const r = rodar([pesquisa()], [outraDisputa]);
    ok(r.errors.some((e) => /\(c\) disputa presidente\|BR\|/.test(e)), `mudar a disputa de uma pesquisa quebra o conjunto (veio ${r.errors[0] ?? "nada"})`);
    // ⚠ E O CONJUNTO DE IDS, SEPARADO DA ORDENAÇÃO. O nível (c) tem DUAS
    //   verificações — o conjunto de ids e o de (data, instituto) — e o caso
    //   acima é pego pelas duas, então desligar a primeira passava verde.
    //   Aqui os dois lados têm a MESMA data e o MESMO instituto e diferem só no
    //   id: só a primeira verificação vê, e a mensagem sai com as contagens
    //   IGUAIS dos dois lados, que é a assinatura dela.
    const trocado = clonar(pesquisa()); trocado.id = "px-2";
    const r2 = rodar([pesquisa()], [trocado]);
    ok(r2.errors.some((e) => /\(c\) disputa presidente\|BR\|1: 1 pesquisas no legado, 1 na projeção/.test(e)),
      `troca de id com mesma data e instituto é vista pelo conjunto de ids (veio ${r2.errors.filter((e) => /\(c\)/.test(e))[0] ?? "nada"})`);
    // ⚠ E A OUTRA METADE, isolada pelo mesmo motivo: MESMO id, data diferente.
    //   O conjunto de ids bate, e só a comparação de (data, instituto) vê — é
    //   ela que garante que a média pegue as mesmas 10 mais recentes.
    const outraData = clonar(pesquisa()); outraData.fieldwork_end = "2026-01-05";
    const r3 = rodar([pesquisa()], [outraData]);
    ok(r3.errors.some((e) => /\(c\) disputa presidente\|BR\|1: conjunto \(data, instituto\) diverge/.test(e)),
      `mesma pesquisa com data diferente é vista pelo conjunto (data, instituto) (veio ${r3.errors.filter((e) => /\(c\)/.test(e))[0] ?? "nada"})`);
    // ⚠ E A ORDENAÇÃO DENTRO DA DISPUTA. Com uma pesquisa por disputa, os dois
    //   `.sort()` do nível (c) não têm o que ordenar e tirá-los passa verde.
    //   Aqui a MESMA disputa tem duas pesquisas, e os dois lados as trazem em
    //   ordem INVERTIDA: o conjunto é o mesmo, então o portão tem de calar. Sem
    //   a ordenação ele acusaria uma divergência que não existe — falso
    //   positivo, que num portão bloqueante custa tanto quanto o falso negativo.
    const a1 = pesquisa({ id: "pc-1", fieldwork_end: "2026-01-03" });
    const a2 = pesquisa({ id: "pc-2", fieldwork_end: "2026-01-09" });
    const r4 = rodar([a1, a2], [clonar(a2), clonar(a1)]);
    ok(r4.errors.length === 0,
      `a mesma disputa em ordem invertida nos dois lados não é divergência (veio ${r4.errors.length}: ${r4.errors[0] ?? ""})`);
  }

  if (falhas.length) {
    console.error("AUTOTESTE FALHOU:");
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("autoteste ok — bijeção nos dois sentidos e ids duplicados, campo exato, elenco encurtado, renomeação que o store não acompanhou (com o canônico na mensagem e o cru só quando difere), a classe dos nomes novos (sigla, longa/curta e cascata posicional — vermelha com a tabela trocada no meio da rodada, verde com a mesma tabela, e o casador trancado ANTES da coleta no workflow), tolerância de percentual dos dois lados, partido e normalização por data, reparo curado casando pela grafia CRUA com contrafactual, exceção declarada contada e seu teto, e conjuntos por disputa");
}

function main() {
  const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "polls.json"), "utf-8"));
  const projected = projectPolls(readStore({ dir: DATA_DIR }));
  const { errors, linhas } = comparar({ legacy, projected });
  for (const l of linhas) console.log(l);
  if (errors.length) {
    console.error("");
    for (const e of errors.slice(0, 30)) console.error(`ERRO ${e}`);
    console.error(`\nPARIDADE FALHOU — ${errors.length} divergência(s). Nada deve prosseguir.`);
    process.exit(1);
  }
  console.log(`\nPARIDADE OK — a projeção do store reproduz data/polls.json em todos os três níveis`);
}

if (process.argv.includes("--self-test")) autoteste();
else main();
