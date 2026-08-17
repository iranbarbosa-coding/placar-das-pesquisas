#!/usr/bin/env node
// A RETENÇÃO DE ELENCO DISPARA QUANDO DEVE — E NÃO DISPARA QUANDO NÃO DEVE.
//
// O defeito guardado está descrito em `scripts/lib/roster.mjs`: o `v2/cenarios`
// do Poder360 apaga linhas de candidato cujo `nome` chega vazio, e o que ele
// apaga muda com o tempo. Nenhum validador o alcança — uma lista curta é uma
// lista bem formada — então a defesa é uma comparação entre RODADAS, e o que
// precisa ser provado é a comparação.
//
// ⚠ AS DUAS METADES SÃO IGUALMENTE OBRIGATÓRIAS. Uma retenção que disparasse
// sempre passaria numa bateria feita só de casos "retém", e congelaria o banco
// contra toda correção real que um instituto publicar: o elenco nunca mais
// mudaria. É a mesma simetria que `upsert-harness.mjs` mantém entre os degraus
// da escada e as RECUSAS. Por isso metade dos casos abaixo afirma que a
// retenção NÃO fez nada.
//
// ⚠ E O AUTOTESTE REPROVA (CONVENTIONS §2). `--self-test` roda a bateria inteira
// com a retenção MUTILADA, de dois jeitos opostos, e exige que ela reprove nos
// ⚠ O CASO MISTO SÓ TESTA O QUE DEVE PORQUE O PCT DIFERE. Ver a nota nele: com
// os dois pcts iguais, o desempate por soma de `richerRoster` já rejeitava o
// doador sozinho, e apagar `subconjuntoEstrito` — o único predicado que impede
// esta guarda de congelar o banco — deixava a bateria 9/9 VERDE. Achado por
// verificação independente. Provado depois do conserto: neutralizar aquele
// predicado no `roster.mjs` real derruba 2 casos.
//
// dois: desligada (os casos "retém" têm de cair) e cega, retendo sem conferir o
// subconjunto (os casos "não retém" têm de cair). Um verde que ninguém testou
// não é evidência — e este repositório já teve um guarda que silenciosamente
// desligava aquilo que devia proteger, três vezes numa sessão.
//
// A bateria roda o CAMINHO DE VERDADE (`writeStoreFromPolls`), o mesmo que o
// coletor roda, em diretório temporário. Chamar a retenção direto provaria uma
// propriedade de código que o pipeline não executa.
//
// Uso: node scripts/roster-retention-check.mjs [--self-test] [--verbose]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { writeStoreFromPolls } from "./lib/build-store.mjs";
import { retainRicherRosters } from "./lib/roster.mjs";
import { applyRepairs } from "./lib/repairs.mjs";
import { validateStore } from "./validate-store.mjs";

const VERBOSE = process.argv.includes("--verbose");
const D0 = "2026-08-10";
const D1 = "2026-08-17";

// ---------------------------------------------------------------- fixtures
//
// Nomes deliberadamente inexistentes no registro do TSE: o objetivo é exercitar
// a retenção, e um nome que casasse com uma candidatura real faria o caso
// depender do conteúdo de `data/candidaturas.ndjson` — um teste que quebra
// quando o TSE republica o arquivo não prova nada sobre o guarda.
const ELENCO = [
  { candidate: "Alfa Testeira", party: "PT", pct: 38.8 },
  { candidate: "Beta Provador", party: "PL", pct: 34.1 },
  { candidate: "Gama Ensaio", party: "PSD", pct: 5.9 },
  { candidate: "Delta Amostra", party: "Novo", pct: 3.6 },
  { candidate: "Epsilon Cobaia", party: "PCO", pct: 0.8 },
];

const pesquisa = (over = {}) => ({
  id: "p360-900001-1-0-aaaaaaaaaaaa", source: "poder360",
  pollster: "Instituto de Ensaio", race: "presidente", state: null, round: 1,
  scenario: "1º turno", source_url: "https://exemplo/1",
  fieldwork_start: "2026-08-03", fieldwork_end: "2026-08-07", published_date: "2026-08-08",
  sample_size: 2000, margin_of_error: 2, tse_registration: "BR-90001/2026",
  results: structuredClone(ELENCO),
  others_pct: 0.4, undecided_pct: 11, blank_null_pct: 5,
  ...over,
});

/** A pesquisa como o `v2/cenarios` a devolve hoje: só duas linhas de dez. */
function truncada(nomes) {
  const p = pesquisa({ id: "p360-900001-1-0-000000000000" });
  p.results = p.results.filter((r) => nomes.includes(r.candidate));
  return p;
}

const clone = (x) => structuredClone(x);
const ler = (dir, t) => {
  const f = path.join(dir, `${t}.ndjson`);
  return fs.existsSync(f)
    ? fs.readFileSync(f, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
};

// ------------------------------------------------------------- as mutações
//
// Cada uma simula UM jeito de a retenção quebrar, e cada uma tem de derrubar um
// conjunto DIFERENTE de casos. Uma mutação só — apagar tudo — reprovaria por
// tudo ao mesmo tempo e não provaria nada sobre nenhuma das duas metades.
const MUTACOES = {
  // A retenção nunca acontece: o encolhimento da fonte passa direto.
  desligada: () => {},
  // A retenção acontece sem conferir o subconjunto: qualquer pergunta anterior
  // do grupo que sumiu vira doadora. É a trava que congelaria o banco.
  cega: (store, previous) => {
    const grupo = (q) => `${q.survey_id}|${q.race}|${q.round}|${q.uf ?? "BR"}`;
    const vivas = new Set((store.questions ?? []).map((q) => q.question_id));
    for (const nova of store.questions ?? []) {
      const doador = (previous.questions ?? []).find(
        (p) => grupo(p) === grupo(nova) && !vivas.has(p.question_id));
      if (!doador) continue;
      nova.results = structuredClone(doador.results ?? []);
      nova.others_pct = doador.others_pct ?? null;
      nova.undecided_pct = doador.undecided_pct ?? null;
      nova.blank_null_pct = doador.blank_null_pct ?? null;
      store._report.retained.questions++;
    }
  },
};

// ------------------------------------------------------------------ runner
function rodar({ mutacao = null } = {}) {
  const reter = mutacao ? MUTACOES[mutacao] : retainRicherRosters;
  const falhas = [];
  let ok = 0;

  const caso = (nome, fn) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-retencao-"));
    const problemas = [];
    const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
    // O construtor de verdade, com a retenção (real ou mutilada) injetada.
    const construir = (polls, runDate) =>
      writeStoreFromPolls(polls, { runDate, dir, reterElencos: reter, meta: { built_by: "roster-retention-check" } });
    try {
      fn({ dir, construir, afirma });
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

  // ======================================================================
  // A. DISPARA — o defeito medido em 17/08/2026
  // ======================================================================

  caso("retém o elenco anterior quando a fonte devolve um subconjunto estrito", ({ dir, construir, afirma }) => {
    construir([pesquisa()], D0);
    const antes = ler(dir, "questions")[0];
    afirma(antes.results.length === 5, `rodada 0 gravou ${antes.results.length} candidatos, esperado 5`);

    const { store } = construir([truncada(["Alfa Testeira", "Epsilon Cobaia"])], D1);
    const depois = ler(dir, "questions");
    afirma(depois.length === 1, `${depois.length} perguntas, esperado 1`);
    const q = depois[0];
    afirma(q.results.length === 5, `elenco ficou com ${q.results.length} candidatos, esperado 5 (a fonte mandou 2)`);
    afirma(q.results.some((r) => r.name_raw === "Beta Provador" && r.pct === 34.1),
      "o vice-líder descartado pela fonte não voltou com o valor anterior");
    afirma(store._report.retained.questions === 1,
      `retained.questions = ${store._report.retained.questions}, esperado 1`);
    afirma(store._report.retained.results === 3,
      `retained.results = ${store._report.retained.results}, esperado 3`);
    // ★ HANDOFF §4: restaurar linhas sem restaurar os buckets conta a mesma
    // massa duas vezes — foi assim que a Vox presidencial foi ao ar com 101,2%.
    afirma(q.others_pct === 0.4 && q.undecided_pct === 11 && q.blank_null_pct === 5,
      `buckets não voltaram com as linhas: outros=${q.others_pct} indecisos=${q.undecided_pct} branco=${q.blank_null_pct}`);
    // A IDENTIDADE DA PERGUNTA SOBREVIVE: sem isto a pergunta antiga ficaria
    // órfã a cada rodada e `created_at` se perderia em silêncio.
    afirma(q.question_id === antes.question_id,
      `question_id mudou (${antes.question_id} → ${q.question_id}) — a pergunta anterior ficou órfã`);
    afirma(q.provenance.created_at === D0,
      `created_at virou ${q.provenance.created_at}, esperado ${D0} (a data de quando vimos a pergunta)`);
  });

  caso("grava o conflito, com nome e contagem, em conflicts.ndjson", ({ dir, construir, afirma }) => {
    construir([pesquisa()], D0);
    construir([truncada(["Alfa Testeira", "Epsilon Cobaia"])], D1);
    const cs = ler(dir, "conflicts").filter((c) => c.type === "roster_encolhido_na_fonte");
    afirma(cs.length === 1, `${cs.length} conflito(s) de encolhimento, esperado 1`);
    const c = cs[0] ?? {};
    afirma(c.severity === "review", `severidade "${c.severity}", esperada "review"`);
    afirma(/descartou 3 linha/.test(c.note ?? ""), `a nota não diz quantas linhas caíram: ${c.note}`);
    afirma(/Beta Provador/.test(c.note ?? ""), `a nota não nomeia os candidatos retidos: ${c.note}`);
    afirma((c.stored ?? []).length === 5 && (c.incoming ?? []).length === 2,
      `stored/incoming trazem ${(c.stored ?? []).length}/${(c.incoming ?? []).length} nomes, esperado 5/2`);
  });

  caso("devolve ao banco a linha de candidato que só aquela pesquisa tinha", ({ dir, construir, afirma }) => {
    construir([pesquisa()], D0);
    const candAntes = ler(dir, "candidates").length;
    const pessoasAntes = ler(dir, "people").length;
    const { store } = construir([truncada(["Alfa Testeira", "Epsilon Cobaia"])], D1);
    afirma(ler(dir, "candidates").length === candAntes,
      `${ler(dir, "candidates").length} candidatos, esperado ${candAntes} — a linha restaurada apontaria para um id inexistente`);
    afirma(ler(dir, "people").length === pessoasAntes,
      `${ler(dir, "people").length} pessoas, esperado ${pessoasAntes}`);
    // O guarda de referência do validador é quem prova que a restauração ficou
    // íntegra: `candidate_id inexistente` reprova a rodada inteira.
    const { errorsTotal, errors } = validateStore(store, { minSurveys: 1, minQuestions: 1 });
    afirma(errorsTotal === 0, `validate-store reprovou o store retido: ${errors[0]}`);
  });

  caso("a retenção ENCADEIA na coleta dupla (a 2ª tem a 1ª como anterior)", ({ dir, construir, afirma }) => {
    // O pipeline roda `scrape → match-ballot-names → scrape`, e `priorStamps` lê
    // o store DO DISCO: o "anterior" da coleta 2 é a saída da coleta 1, não o
    // store commitado. Foi por aí que 10 linhas de `presidente:DF` perderam a
    // história em 17/08 — e por aí que os conflitos da coleta 1 foram apagados.
    construir([pesquisa()], D0);
    const original = ler(dir, "questions")[0];
    const entrada = truncada(["Alfa Testeira", "Epsilon Cobaia"]);

    const r1 = construir([clone(entrada)], D1);
    const apos1 = ler(dir, "questions")[0];
    const conf1 = ler(dir, "conflicts").filter((c) => c.type === "roster_encolhido_na_fonte");

    const r2 = construir([clone(entrada)], D1);
    const apos2 = ler(dir, "questions")[0];
    const conf2 = ler(dir, "conflicts").filter((c) => c.type === "roster_encolhido_na_fonte");

    afirma(r1.store._report.retained.questions === 1, "a coleta 1 não reteve");
    afirma(r2.store._report.retained.questions === 1,
      `a coleta 2 reteve ${r2.store._report.retained.questions} — a cadeia se rompeu e o elenco cheio se perderia na segunda passada`);
    afirma(apos2.results.length === 5, `depois da coleta 2 sobraram ${apos2.results.length} candidatos, esperado 5`);
    afirma(apos2.question_id === original.question_id, "o id da pergunta não sobreviveu às duas coletas");
    afirma(apos1.provenance.updated_at === apos2.provenance.updated_at,
      "a coleta 2 re-datou a pergunta que a coleta 1 já tinha restaurado");
    // A EVIDÊNCIA NÃO PODE SER APAGADA PELA SEGUNDA COLETA. `conflicts.ndjson` é
    // reescrito do zero a cada rodada; como o `conflict_id` é semeado do
    // CONTEÚDO do conflito, a coleta 2 regrava a mesma linha com o mesmo id.
    afirma(conf1.length === 1 && conf2.length === 1,
      `conflitos: ${conf1.length} após a coleta 1, ${conf2.length} após a coleta 2`);
    afirma(conf1[0]?.conflict_id === conf2[0]?.conflict_id,
      "a coleta 2 gravou outro conflict_id — a evidência da coleta 1 sumiu com a perda");
    afirma(conf1[0]?.at === conf2[0]?.at, "o carimbo do conflito foi reescrito pela coleta 2");
  });

  // ======================================================================
  // B. NÃO DISPARA — a metade que impede a trava
  // ======================================================================

  caso("NÃO retém quando o elenco CRESCE", ({ dir, construir, afirma }) => {
    construir([pesquisa()], D0);
    const maior = pesquisa({ id: "p360-900001-1-0-111111111111" });
    maior.results.push({ candidate: "Zeta Novata", party: "PV", pct: 2.1 });
    maior.undecided_pct = 8.9;
    const { store } = construir([maior], D1);
    const q = ler(dir, "questions")[0];
    afirma(store._report.retained.questions === 0,
      `retenção disparou (${store._report.retained.questions}) num elenco que cresceu — o banco ficaria travado contra dado novo`);
    afirma(q.results.length === 6, `${q.results.length} candidatos, esperado 6`);
    afirma(q.results.some((r) => r.name_raw === "Zeta Novata"), "a candidata nova não entrou");
    afirma(q.undecided_pct === 8.9, `undecided_pct = ${q.undecided_pct}, esperado 8.9 — bucket antigo ressuscitado`);
    afirma(!ler(dir, "conflicts").some((c) => String(c.type).startsWith("roster_")),
      "um elenco que cresce não é conflito de elenco");
  });

  caso("NÃO retém quando o elenco é IGUAL (e nada é re-datado)", ({ dir, construir, afirma }) => {
    construir([pesquisa()], D0);
    const antes = fs.readFileSync(path.join(dir, "questions.ndjson"), "utf-8");
    const { store } = construir([pesquisa()], D1);
    afirma(store._report.retained.questions === 0,
      `retenção disparou (${store._report.retained.questions}) num elenco idêntico`);
    afirma(fs.readFileSync(path.join(dir, "questions.ndjson"), "utf-8") === antes,
      "reconstruir com o mesmo elenco mudou questions.ndjson");
  });

  caso("NÃO retém quando o elenco mudou nos DOIS sentidos", ({ dir, construir, afirma }) => {
    // Perdeu um nome e ganhou outro: não é o defeito da fonte, é a fonte
    // publicando outra tabela. Preferir a nossa cópia velha congelaria a
    // correção do instituto — ver a nota do caso MISTO em lib/roster.mjs.
    construir([pesquisa()], D0);
    const misto = pesquisa({ id: "p360-900001-1-0-222222222222" });
    misto.results = misto.results.filter((r) => r.candidate !== "Delta Amostra");
    // O pct DIFERE do que saiu (3,6 → 1,2), e isso é load-bearing.
    //
    // Com os dois iguais, a soma do elenco novo empatava com a do anterior e o
    // desempate por soma de `richerRoster` sozinho já rejeitava o doador — de
    // modo que apagar `subconjuntoEstrito`, o ÚNICO predicado que impede esta
    // guarda de congelar o banco, deixava a bateria inteira verde em 9/9. A
    // verificação independente achou: sem aquela cláusula, uma errata de
    // instituto era REVERTIDA (Delta ressuscitada, Zeta descartada) e nada
    // reprovava. Um número diferente tira a soma da jogada e devolve o caso ao
    // predicado que ele existe para testar.
    misto.results.push({ candidate: "Zeta Novata", party: "PV", pct: 1.2 });
    const { store } = construir([misto], D1);
    const q = ler(dir, "questions")[0];
    afirma(store._report.retained.questions === 0,
      `retenção disparou (${store._report.retained.questions}) numa troca de nomes`);
    afirma(q.results.length === 5 && !q.results.some((r) => r.name_raw === "Delta Amostra"),
      `elenco ficou ${q.results.map((r) => r.name_raw).join(", ")} — o nome retirado voltou`);
    afirma(q.results.some((r) => r.name_raw === "Zeta Novata"), "o nome novo não entrou");
  });

  // ======================================================================
  // C. AS RECUSAS E A SAÍDA CURADA
  // ======================================================================

  caso("RECUSA quando duas perguntas anteriores poderiam ser a doadora", ({ dir, construir, afirma }) => {
    // Dois cenários do mesmo levantamento, ambos supersets do que chegou:
    // escolher um seria inventar procedência (CONVENTIONS §4). Os elencos se
    // sobrepõem em só 2 de 5 de propósito — acima de 80% `resolveQuestion` os
    // trataria como a MESMA pergunta e o caso não teria dois doadores.
    const a = pesquisa({ id: "p360-900001-1-0-aaaaaaaaaaaa", scenario: "cenário A" });
    const b = pesquisa({ id: "p360-900001-1-1-bbbbbbbbbbbb", scenario: "cenário B" });
    b.results = [
      { candidate: "Alfa Testeira", party: "PT", pct: 41.2 },
      { candidate: "Epsilon Cobaia", party: "PCO", pct: 1.1 },
      { candidate: "Zeta Novata", party: "PV", pct: 12.4 },
      { candidate: "Eta Suplente", party: "PSB", pct: 6.3 },
      { candidate: "Teta Reserva", party: "PDT", pct: 4.2 },
    ];
    construir([a, b], D0);
    afirma(ler(dir, "questions").length === 2, `rodada 0 gravou ${ler(dir, "questions").length} perguntas, esperado 2`);

    const { store } = construir([truncada(["Alfa Testeira", "Epsilon Cobaia"])], D1);
    afirma(store._report.retained.questions === 0, "reteve mesmo com doador ambíguo");
    afirma(store._report.retained.refused === 1,
      `retained.refused = ${store._report.retained.refused}, esperado 1`);
    const c = ler(dir, "conflicts").find((x) => x.type === "roster_shrink_ambiguo");
    afirma(!!c, "a recusa não foi registrada em conflicts.ndjson");
    afirma(c?.severity === "review", `severidade "${c?.severity}", esperada "review"`);
  });

  caso("um reparo com allow_roster_shrink DESLIGA a retenção, em voz alta", ({ dir, construir, afirma }) => {
    // O caminho inteiro, de `data/repairs.json` até a retenção: o reparo de
    // teste passa pelo `applyRepairs` de verdade, porque uma imitação escrita
    // aqui provaria uma propriedade de código que o coletor não executa.
    construir([pesquisa()], D0);
    const repFile = path.join(dir, "reparo-de-teste.json");
    fs.writeFileSync(repFile, JSON.stringify({
      version: 1,
      repairs: [{
        match: { tse_registration: "BR-90001/2026", race: "presidente", round: 1 },
        allow_roster_shrink: true,
        source: "https://exemplo/errata-do-instituto.pdf",
        evidence: "errata do instituto retirando três nomes do cenário",
        verified_at: "2026-08-17",
      }],
    }));
    const entrada = [truncada(["Alfa Testeira", "Epsilon Cobaia"])];
    const rel = applyRepairs(entrada, { file: repFile });
    afirma(rel.applied === 1, `applyRepairs aplicou ${rel.applied}, esperado 1`);
    afirma(!rel.noop.length, `o reparo se declarou sem efeito: ${rel.noop.join("; ")}`);
    afirma(!!entrada[0].roster_shrink_allowed, "a pesquisa não saiu marcada por applyRepairs");

    const { store } = construir(entrada, D1);
    const q = ler(dir, "questions")[0];
    afirma(store._report.retained.questions === 0, "reteve apesar da ratificação");
    afirma(store._report.retained.ratified === 1,
      `retained.ratified = ${store._report.retained.ratified}, esperado 1`);
    afirma(q.results.length === 2, `elenco ficou com ${q.results.length}, esperado 2 (o encolhimento foi ratificado)`);
    const c = ler(dir, "conflicts").find((x) => x.type === "roster_shrink_ratificado");
    afirma(!!c, "ceder em silêncio — a ratificação não foi registrada");
    afirma(/errata-do-instituto/.test(c?.note ?? ""), `a nota não cita a fonte do reparo: ${c?.note}`);
  });

  return { ok, falhas };
}

// ------------------------------------------------------------------- saída
if (process.argv.includes("--self-test")) {
  // CADA MUTAÇÃO TEM DE DERRUBAR A SUA METADE. Exigir apenas "alguma falha"
  // deixaria passar uma bateria que só sabe reprovar por um dos lados — e é
  // justamente o lado "não retém" que impede a trava permanente.
  const esperado = {
    desligada: ["retém o elenco anterior quando a fonte devolve um subconjunto estrito",
                "grava o conflito, com nome e contagem, em conflicts.ndjson",
                "a retenção ENCADEIA na coleta dupla (a 2ª tem a 1ª como anterior)"],
    cega: ["NÃO retém quando o elenco CRESCE",
           "NÃO retém quando o elenco mudou nos DOIS sentidos"],
  };
  let ok = true;
  for (const [modo, devemCair] of Object.entries(esperado)) {
    const { falhas } = rodar({ mutacao: modo });
    const faltando = devemCair.filter((n) => !falhas.includes(n));
    if (faltando.length) {
      ok = false;
      console.error(`AUTOTESTE FALHOU (${modo}): a bateria PASSOU em ${faltando.length} caso(s) que a mutação quebra — ela não confere o que existe para conferir:`);
      for (const n of faltando) console.error(`  não reprovou → ${n}`);
      continue;
    }
    console.log(`autoteste (${modo}): a bateria REPROVA ${falhas.length} caso(s) quando a retenção é mutilada`);
    for (const n of falhas.slice(0, 4)) console.log(`  detectado → ${n}`);
  }
  process.exit(ok ? 0 : 1);
}

const { ok, falhas } = rodar();
console.log(`\n${ok} passaram · ${falhas.length} falharam`);
if (falhas.length) {
  console.error("RETENÇÃO DE ELENCO FALHOU — o encolhimento da fonte não está guardado.");
  process.exit(1);
}
console.log("RETENÇÃO DE ELENCO OK — retém o encolhimento puro, recusa o ambíguo, cede ao reparo, e não trava o dado novo.");
