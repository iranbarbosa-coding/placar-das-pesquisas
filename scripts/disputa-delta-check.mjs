#!/usr/bin/env node
// O GUARDA DE DELTA POR DISPUTA — a rodada não comita perda que não provou.
//
// O que ele fecha (medido no ensaio de 20/08/2026): 56 perguntas sumiriam em 13
// disputas com o TOTAL SUBINDO (2.996 → 3.029) — piso absoluto não vê (o banco
// tem ~996 perguntas de folga sobre o piso, e a fraqueza do piso foi observada
// DUAS vezes, por sessões independentes: scrape.mjs/PERTENCE_A_FONTE e o
// cabeçalho de lib/ensaio.mjs), e delta de totais não vê perda compensada por
// ganho alheio. E presidente:AM terminou 0 → 0 com reparo curado no banco —
// isso nem delta vê: quem pega é a lista declarada (`exigida` reprova vazia
// mesmo partindo de zero).
//
// ANTERIOR = O COMMIT, NUNCA A WORKING TREE. No momento em que os portões
// rodam, `data/` no disco JÁ é a coleta nova; o único estado anterior que
// existe é o comitado — daí o `git show HEAD:data/…`.
//
// O núcleo (comparação, sucessão, veredito) vive PURO em `lib/delta.mjs`, como
// `lib/ensaio.mjs`: este arquivo só faz a fiação (git, arquivos, exit code) e
// carrega a bateria do `--self-test`, que exercita o núcleo sem git, sem rede e
// sem tocar em `data/`.
//
// ⚠ A REDE DE SEGURANÇA (QUARENTENA), 28/08/2026. Antes, UMA disputa com perda
// sem prova REPROVAVA a rodada inteira — e uma disputa churny (governador:MT na
// semana anterior) deixou o site 7 dias parado, mesmo com presidente + 26
// estados frescos e válidos. Agora, quando toda a falha é RESTAURÁVEL (a
// disputa tinha dado no commit anterior), a fiação CONGELA só essa disputa no
// dado do commit anterior, CONFERE o store congelado no `validate-store` e
// comita o resto fresco; a rodada SUCEDE e grava um conflito visível
// (`disputa_em_quarentena`) que o site conta. A DECISÃO ("quais disputas") é
// pura, no núcleo; a APLICAÇÃO (reescrever `data/`, re-derivar `polls.json`) é
// aqui. O que NÃO é restaurável — `exigida` vazia dos dois lados (o FATO 1),
// lista malformada, promoção pendente — segue REPROVANDO a rodada inteira: a
// rede é para perda, jamais para afrouxar a prova. Se a restauração não passa no
// validador, é fallback seguro: reprova, sem comitar nada.
//
// Uso: node scripts/disputa-delta-check.mjs [--self-test] [--verbose]
//                                           [--raiz=DIR] [--data=AAAA-MM-DD]
//
// `--raiz` existe para UM caso: reproduzir um cenário (o ensaio de 20/08) num
// repositório de fixture, com o banco comitado como HEAD e a coleta ensaiada na
// working tree. O workflow nunca o passa. `--data` injeta o runDate (§8).
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { deltaPorDisputa, validarLista, podeQuarentenar, restaurarDisputas, linhasDeQuarentena } from "./lib/delta.mjs";
import { today, readStore, writeStore } from "./lib/store.mjs";
import { disputaDe } from "./lib/ensaio.mjs";
import { validateStore, contagem } from "./validate-store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const VERBOSE = process.argv.includes("--verbose");
const argVal = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");

const ndjson = (txt) => txt.split("\n").filter(Boolean).map((l) => JSON.parse(l));

// ===========================================================================
// A BATERIA (--self-test) — fixtures sintéticos, nomes inexistentes no TSE
// ===========================================================================
//
// Como em `roster-retention-check.mjs`: um caso que casasse com uma candidatura
// real dependeria do conteúdo de `data/candidaturas.ndjson`, e um teste que
// quebra quando o TSE republica o arquivo não prova nada sobre o guarda.
//
// AS DUAS METADES SÃO IGUALMENTE OBRIGATÓRIAS: um guarda que reprovasse sempre
// passaria numa bateria só de casos "reprova" — e travaria toda reorganização
// legítima de fonte, que é o adubo da jogada proibida (§10: alargar a
// tolerância até o portão calar). Metade dos casos abaixo afirma que o guarda
// NÃO acusou.

const q = (id, race, uf, results, extra = {}) => ({
  question_id: id, survey_id: extra.survey_id ?? `s_${id}`,
  race, uf, round: extra.round ?? 1, results,
  ...extra,
});
const r = (cid, pct, nome) => ({ candidate_id: cid, pct, name_raw: nome ?? cid });
const cand = (cid, pid, legacy = []) => ({ candidate_id: cid, person_id: pid, legacy_ids: legacy, canonical: cid });
const banco = (questions, candidates = [], surveys = []) => ({ questions, candidates, surveys });
const LISTA0 = { version: 1, disputas: {} };
const D = "2026-08-21";

// ------------------------------------------------------------- as mutações
//
// Cada uma mutila o JUIZ (`julgarPadrao`) de UM jeito, e cada uma tem de
// derrubar um conjunto DIFERENTE de casos — uma mutação só, que quebrasse
// tudo, reprovaria por tudo ao mesmo tempo e não provaria nada sobre nenhuma
// das duas metades (o molde é o de roster-retention-check.mjs).
const MUTACOES = {
  // CEGO: toda acusação é tolerada como sucessão. É o guarda que dorme — os
  // casos que têm de REPROVAR (1–5) passam a passar, e a bateria tem de cair.
  cego: (a) => ({ classe: "sucessora", sucessora: "q_mutilada", via: "elenco" }),
  // PARANOICO: toda acusação é perda — nega sucessão, ratificação e a
  // desativada. É o guarda que congela o banco — os casos que têm de PASSAR
  // caem. (O caso 6, coleta idêntica, não produz ACUSAÇÃO nenhuma, então
  // nenhuma mutação do juiz o alcança — não há decisão a mutilar. É a mesma
  // razão de roster-retention não listar todos os casos em cada mutação.)
  paranoico: () => ({ classe: "perda", motivo: null }),
};

function rodar({ mutacao = null } = {}) {
  const julgar = mutacao ? MUTACOES[mutacao] : undefined;
  const delta = (args) => deltaPorDisputa({ lista: LISTA0, reparos: {}, runDate: D, ...args, ...(julgar ? { julgar } : {}) });
  const falhas = [];
  let ok = 0;

  const caso = (nome, fn) => {
    const problemas = [];
    const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
    try {
      fn({ delta, afirma });
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

  // ======================================================================
  // A. REPROVA — a perda sem prova cai, e a mensagem nomeia
  // ======================================================================

  caso("1 REPROVA: disputa zerada sem prova, nomeando disputa e contagem", ({ delta, afirma }) => {
    const anterior = banco([
      q("q_pi1", "governador", "PI", [r("c_at", 40, "Alfa Testeira"), r("c_bp", 30, "Beta Provador")]),
      q("q_pi2", "governador", "PI", [r("c_ge", 20, "Gama Ensaio"), r("c_da", 10, "Delta Amostra")]),
      q("q_pi3", "governador", "PI", [r("c_ec", 5, "Epsilon Cobaia"), r("c_zn", 2, "Zeta Novata")]),
    ]);
    const v = delta({ anterior, novo: banco([]) });
    afirma(!v.ok, "3 → 0 sem sucessora e sem reparo tinha de reprovar");
    afirma(v.semProva === 3, `3 SEM PROVA (veio ${v.semProva})`);
    afirma(v.linhas.some((l) => /governador:PI/.test(l) && /3 → 0/.test(l)),
      `a mensagem nomeia a disputa e a contagem (veio: ${v.linhas.join(" | ")})`);
    afirma(v.linhas.some((l) => /3 SEM PROVA/.test(l)), "e diz quantas ficaram sem prova");
  });

  caso("2 REPROVA: disputa exigida vazia dos dois lados (0 → 0)", ({ delta, afirma }) => {
    // O FATO 1 partindo do banco atual: presidente:AM já estava a zero, então
    // nem um delta N→0 veria. A lista compara com a INTENÇÃO, não com ontem.
    const lista = {
      version: 1,
      disputas: { "presidente:AM": { estado: "exigida", motivo: "reparo curado existe; zerar aqui é o FATO 1", declarado_em: D } },
    };
    const v = delta({ anterior: banco([]), novo: banco([]), lista });
    afirma(!v.ok, "exigida vazia tinha de reprovar mesmo partindo de zero");
    afirma(v.linhas.some((l) => /presidente:AM/.test(l) && /EXIGIDA/.test(l)),
      `a mensagem nomeia a disputa exigida (veio: ${v.linhas.join(" | ")})`);
    afirma(v.linhas.some((l) => /FATO 1/.test(l)), "e publica o motivo declarado");
  });

  caso("3 REPROVA: perda diluída em crescimento do total", ({ delta, afirma }) => {
    // O que enterra as alternativas A (piso) e B (delta de totais): o total
    // líquido SOBE (4 → 6) enquanto senador:PR perde 2 sem prova.
    const anterior = banco([
      q("q_pr1", "senador", "PR", [r("c_at", 40), r("c_bp", 30)]),
      q("q_pr2", "senador", "PR", [r("c_ge", 20), r("c_da", 10)]),
      q("q_pr3", "senador", "PR", [r("c_ec", 5), r("c_zn", 2)]),
      q("q_br1", "presidente", null, [r("c_lu", 45), r("c_op", 35)]),
    ]);
    const novo = banco([
      q("q_pr1", "senador", "PR", [r("c_at", 40), r("c_bp", 30)]),
      q("q_br1", "presidente", null, [r("c_lu", 45), r("c_op", 35)]),
      q("q_br2", "presidente", null, [r("c_lu", 44), r("c_es", 20)]),
      q("q_br3", "presidente", null, [r("c_lu", 43), r("c_hs", 18)]),
      q("q_br4", "presidente", null, [r("c_lu", 42), r("c_ts", 16)]),
      q("q_br5", "presidente", null, [r("c_lu", 41), r("c_qs", 14)]),
    ]);
    const v = delta({ anterior, novo });
    afirma(v.contagens.depois > v.contagens.antes, "o fixture tem de crescer no total, senão não testa a diluição");
    afirma(!v.ok, "perda por disputa dentro de crescimento global tinha de reprovar");
    afirma(v.semProva === 2, `2 SEM PROVA (veio ${v.semProva})`);
    afirma(v.linhas.some((l) => /senador:PR/.test(l) && /2 SEM PROVA/.test(l)), "a mensagem nomeia senador:PR");
  });

  caso("4 REPROVA: fonte falhada não é prova — sucessora por elenco recusada", ({ delta, afirma }) => {
    // Degradação de fonte é o cenário em que a perda é MAIS provável; a
    // recuperação de fonte caída promete MANTER as perguntas dela, e este caso
    // confere a promessa por fora. A sucessora por elenco existe DE PROPÓSITO:
    // é ela que a fonte falhada não pode usar como álibi.
    const candsAnt = [cand("c_ba1", "p_ba1"), cand("c_ba2", "p_ba2")];
    const candsNov = [cand("c_ba1n", "p_ba1", ["c_ba1"]), cand("c_ba2n", "p_ba2", ["c_ba2"])];
    const anterior = banco(
      [q("q_ba1", "governador", "BA", [r("c_ba1", 40, "Alfa Testeira"), r("c_ba2", 30, "Beta Provador")], { survey_id: "s_p360" })],
      candsAnt,
      [{ survey_id: "s_p360", source_refs: [{ source: "poder360", native_id: "900001" }] }]);
    const novo = banco(
      [q("q_ba2", "governador", "BA", [r("c_ba1n", 40, "Alfa Testeira"), r("c_ba2n", 30, "Beta Provador")], { survey_id: "s_p360n" })],
      candsNov,
      // O MESMO levantamento, pelo source_ref nativo em comum (degrau 1) — a
      // sucessora é legítima de propósito: é o álibi que a fonte falhada não
      // pode usar.
      [{ survey_id: "s_p360n", source_refs: [{ source: "poder360", native_id: "900001" }] }]);
    const comFalha = delta({ anterior, novo, fontesFalhadas: new Set(["poder360"]) });
    afirma(!comFalha.ok, "pergunta do espaço da fonte falhada sumindo tinha de reprovar");
    afirma(comFalha.semProva === 1, `1 SEM PROVA (veio ${comFalha.semProva})`);
    afirma(comFalha.linhas.some((l) => /poder360 falhou/.test(l)), "a mensagem diz que a fonte falhou");
    // A metade simétrica DO MESMO fixture: com a fonte sã, a mesma sucessora
    // por elenco prova, e o caso passa — senão o juiz estaria reprovando por
    // elenco errado, não pela fonte.
    const semFalha = delta({ anterior, novo });
    afirma(semFalha.ok, `com a fonte sã a mesma sucessão tinha de provar (veio ${semFalha.linhas.join(" | ")})`);
  });

  caso("5 REPROVA: identidade de levantamento não prova sucessão (4 confrontos → 1)", ({ delta, afirma }) => {
    // Um levantamento nacional de 2º turno carrega até 4 confrontos
    // indistinguíveis por registro+disputa+turno (repairs.mjs; medido 17/08:
    // PoderData e Quaest com 4 cenários cada). Se um refactor futuro subir o
    // predicado de sucessão da PERGUNTA para o LEVANTAMENTO, este caso cai.
    const mk = (id, adversario) =>
      q(id, "presidente", null, [r("c_lu", 45, "Lula Sintético"), r(adversario, 35, adversario)],
        { survey_id: "s_nac", round: 2, tse_registration: "BR-90001/2026" });
    const anterior = banco([mk("q_t1", "c_alfa"), mk("q_t2", "c_beta"), mk("q_t3", "c_gama"), mk("q_t4", "c_delta")]);
    const novo = banco([mk("q_t1", "c_alfa")]);
    const v = delta({ anterior, novo });
    afirma(!v.ok, "3 confrontos sumidos sob o mesmo levantamento tinham de reprovar");
    afirma(v.semProva === 3, `3 SEM PROVA (veio ${v.semProva})`);
    afirma(v.toleradas.sucessoras === 0,
      `o sobrevivente não pode provar a sucessão dos mortos (sucessoras = ${v.toleradas.sucessoras})`);
  });

  caso("5b REPROVA: elenco igual em OUTRO levantamento não prova sucessão", ({ delta, afirma }) => {
    // O espelho do caso 5, e o defeito que o teste de fogo contra o ensaio de
    // 20/08 mediu na primeira rodada deste guarda: numa disputa estadual TODOS
    // os levantamentos partilham o elenco, então sem o recorte de levantamento
    // UMA pergunta sobrevivente de outra pesquisa "provava" 5 sumidas de
    // senador:MT (pcts distintos, institutos distintos) e as 56 do ensaio
    // saíam todas toleradas. Elenco igual é necessário, nunca suficiente:
    // `resolveQuestion` só compara elenco DENTRO do mesmo levantamento.
    const anterior = banco(
      [q("q_mt1", "senador", "MT", [r("c_mm", 40, "Alfa Testeira"), r("c_jr", 37.8, "Beta Provador")], { survey_id: "s_percent" })],
      [],
      [{ survey_id: "s_percent", legacy_ids: ["hex111"] }]);
    const novo = banco(
      // Mesmo elenco, mas o levantamento é OUTRO: nenhuma chave exata liga
      // s_percent a s_outra (sem legacy em comum, sem ref nativo, sem registro).
      [q("q_mt9", "senador", "MT", [r("c_mm", 25.1, "Alfa Testeira"), r("c_jr", 18.5, "Beta Provador")], { survey_id: "s_outra" })],
      [],
      [{ survey_id: "s_outra", legacy_ids: ["hex999"] }]);
    const v = delta({ anterior, novo });
    afirma(!v.ok, "a sumida de um levantamento não pode ser provada por pergunta de outro");
    afirma(v.semProva === 1, `1 SEM PROVA (veio ${v.semProva})`);
    afirma(v.toleradas.sucessoras === 0, `nenhuma sucessora (veio ${v.toleradas.sucessoras})`);
    // E a metade que impede a trava: com a linhagem de levantamento GRAVADA
    // (legacy_ids em comum — a forma medida no ensaio: s_59ea56a4ad3f →
    // s_bf142e7c42c2), a MESMA pergunta re-endereçada prova, e passa.
    const novoLigado = banco(
      [q("q_mt9", "senador", "MT", [r("c_mm", 40, "Alfa Testeira"), r("c_jr", 37.8, "Beta Provador")], { survey_id: "s_outra" })],
      [],
      [{ survey_id: "s_outra", legacy_ids: ["hex111"] }]);
    const v2 = delta({ anterior, novo: novoLigado });
    afirma(v2.ok, `com a linhagem de levantamento gravada, a sucessão prova (veio ${v2.linhas.join(" | ")})`);
  });

  // ======================================================================
  // B. PASSA — a metade que impede a trava
  // ======================================================================

  caso("6 PASSA: coleta idêntica não acusa nada", ({ delta, afirma }) => {
    const anterior = banco(
      [q("q_i1", "presidente", null, [r("c_lu", 45), r("c_op", 35)]),
       q("q_i2", "governador", "SP", [r("c_sp1", 30), r("c_sp2", 28)])]);
    const v = delta({ anterior, novo: structuredClone(anterior) });
    afirma(v.ok, `coleta idêntica reprovou: ${v.linhas.join(" | ")}`);
    afirma(v.semProva === 0 && v.toleradas.sucessoras === 0 && v.toleradas.ratificadas === 0,
      "e não tolera nada, porque não sumiu nada");
    afirma(v.conflitos.length === 0, "nem grava conflito");
  });

  caso("7 PASSA: sucessão por legacy_ids da pergunta, com conflito gravado", ({ delta, afirma }) => {
    const anterior = banco([q("q_ce1", "governador", "CE", [r("c_m", 40), r("c_n", 30)])]);
    const novo = banco([q("q_ce2", "governador", "CE", [r("c_m", 40), r("c_n", 30)], { legacy_ids: ["q_ce1"] })]);
    const v = delta({ anterior, novo });
    afirma(v.ok, `sucessão por legacy_ids tinha de passar (veio ${v.linhas.join(" | ")})`);
    afirma(v.toleradas.sucessoras === 1, `1 sucessora (veio ${v.toleradas.sucessoras})`);
    const c = v.conflitos.find((x) => x.type === "question_sumida_com_sucessora");
    afirma(!!c, "a tolerância deixa rastro em conflicts");
    afirma(/via legacy_ids/.test(c?.note ?? ""), `a nota diz a via (veio: ${c?.note})`);
    // O id do rastro é semeado do CONTEÚDO (§8): a rodada seguinte regrava
    // idêntico, e a evidência não evapora com o commit.
    const v2 = delta({ anterior, novo });
    afirma(v2.conflitos[0]?.conflict_id === c?.conflict_id, "o conflict_id é determinístico entre rodadas");
  });

  caso("7b PASSA: sucessão por elenco via linhagem de pessoa — e o líder não troca", ({ delta, afirma }) => {
    // O FATO 3 em miniatura: ids de candidato re-cunhados com `legacy_ids`
    // traduzido. Sem a linhagem, o casamento de elenco falharia (ids crus
    // diferentes) e o comparador acusaria "Lula → Lula".
    const candsAnt = [cand("c_p1", "p_1"), cand("c_p2", "p_2"), cand("c_p3", "p_3"), cand("c_lu", "p_lu"), cand("c_x", "p_x")];
    const candsNov = [
      cand("c_p1n", "p_1", ["c_p1"]), cand("c_p2n", "p_2", ["c_p2"]), cand("c_p3n", "p_3", ["c_p3"]),
      cand("c_lun", "p_lu", ["c_lu"]), cand("c_xn", "p_x", ["c_x"]),
    ];
    const anterior = banco([
      q("q_rs1", "governador", "RS", [r("c_p1", 40, "Alfa Testeira"), r("c_p2", 30, "Beta Provador"), r("c_p3", 10, "Gama Ensaio")], { survey_id: "s_rs" }),
      q("q_f3", "presidente", "AP", [r("c_lu", 45, "Lula Sintético"), r("c_x", 30, "Xi Cobaia")]),
    ], candsAnt, [{ survey_id: "s_rs", legacy_ids: ["hexrs1"] }]);
    const novo = banco([
      q("q_rs2", "governador", "RS", [r("c_p1n", 41, "Alfa Testeira"), r("c_p2n", 29, "Beta Provador"), r("c_p3n", 11, "Gama Ensaio")], { survey_id: "s_rsn" }),
      q("q_f3", "presidente", "AP", [r("c_lun", 45, "Lula Sintético"), r("c_xn", 30, "Xi Cobaia")]),
      // O levantamento também foi re-cunhado, com a linhagem preservada — o
      // formato medido no ensaio de 20/08 (legacy_ids em comum).
    ], candsNov, [{ survey_id: "s_rsn", legacy_ids: ["hexrs1"] }]);
    const v = delta({ anterior, novo });
    afirma(v.ok, `sucessão por elenco via linhagem tinha de passar (veio ${v.linhas.join(" | ")})`);
    afirma(v.toleradas.sucessoras === 1, `1 sucessora (veio ${v.toleradas.sucessoras})`);
    const c = v.conflitos.find((x) => x.type === "question_sumida_com_sucessora");
    afirma(/via elenco/.test(c?.note ?? ""), `a via é o elenco (veio: ${c?.note})`);
    afirma(v.trocaramLider.length === 0,
      `re-cunhagem com linhagem preservada não é troca de líder (veio ${JSON.stringify(v.trocaramLider)})`);
  });

  caso("8 PASSA: perda ratificada por reparo com fonte; sem fonte, RECUSA", ({ delta, afirma }) => {
    const anterior = banco([q("q_ms1", "senador", "MS", [r("c_ms1", 40), r("c_ms2", 30)])]);
    const comFonte = {
      repairs: [],
      allow_question_drop: [{
        question_id: "q_ms1", race: "senador", uf: "MS",
        source: "https://instituto.exemplo/errata.pdf",
        evidence: "o instituto descontinuou a série desta pesquisa",
        verified_at: "2026-08-20",
      }],
    };
    const v = delta({ anterior, novo: banco([]), reparos: comFonte });
    afirma(v.ok, `perda ratificada com fonte tinha de passar (veio ${v.linhas.join(" | ")})`);
    afirma(v.toleradas.ratificadas === 1, `1 ratificada (veio ${v.toleradas.ratificadas})`);
    afirma(v.linhas.some((l) => /RATIFICADA em voz alta/.test(l) && /errata\.pdf/.test(l)),
      "a ratificação sai em voz alta, com a fonte");
    const c = v.conflitos.find((x) => x.type === "question_drop_ratificado");
    afirma(!!c && /errata\.pdf/.test(c.note ?? ""), "e deixa rastro citando a fonte");
    // O MESMO reparo sem fonte é RECUSADO (§4): uma perda ratificada sem fonte
    // primária não é reparo, é perda com carimbo.
    const semFonte = structuredClone(comFonte);
    delete semFonte.allow_question_drop[0].source;
    const v2 = delta({ anterior, novo: banco([]), reparos: semFonte });
    afirma(!v2.ok, "reparo sem fonte citada não pode ratificar");
    afirma(v2.avisos.some((a) => /RECUSADO/.test(a) && /falta source/.test(a)),
      `a recusa é dita em voz alta (veio: ${v2.avisos.join(" | ")})`);
  });

  caso("9 PASSA: disputa desativada vazia, com aviso", ({ delta, afirma }) => {
    const lista = {
      version: 1,
      disputas: { "governador:AC": { estado: "desativada", motivo: "decisão editorial de 2026-08-21, fonte https://exemplo/ata" } },
    };
    const anterior = banco([
      q("q_ac1", "governador", "AC", [r("c_ac1", 40), r("c_ac2", 30)]),
      q("q_ac2", "governador", "AC", [r("c_ac3", 20), r("c_ac4", 10)]),
    ]);
    const v = delta({ anterior, novo: banco([]), lista });
    afirma(v.ok, `disputa desativada esvaziando tinha de passar (veio ${v.linhas.join(" | ")})`);
    afirma(v.toleradas.desativadas === 2, `as 2 sumidas saem contadas como desativadas (veio ${v.toleradas.desativadas})`);
    afirma(v.avisos.some((a) => /governador:AC/.test(a) && /DESATIVADA/.test(a)),
      "o guarda a ignora EM VOZ ALTA — uma linha de aviso por rodada");
  });

  caso("10 PASSA: duplicata entre marcas — sucessão por tabela idêntica, durável sob deriva de id", ({ delta, afirma }) => {
    // O caso governador:DF (Correio/Opinião pela Wikipédia ≡ Opinião Consultoria
    // pelo Poder360, 30/07–01/08): `dropExactDuplicates` funde as duas e mantém a
    // de maior prioridade; a perdedora SOME do banco e precisa provar sucessão.
    // A perdedora (commit) e a sobrevivente (rodada) NÃO partilham nada de id —
    // sem legacy em comum, sem ref nativo, sem registro — e os ids de pergunta
    // DIFEREM, que é o que a desambiguação de rótulo do PR #43 provocou e o que
    // reprovou a ponte por id-cunhado. O que casa é a TABELA IDÊNTICA: mesma
    // data, mesma amostra, pcts dígito a dígito. É a garantia durável.
    const tabela = () => [r("c_ce", 43.6, "Celina Sintetica"), r("c_ar", 40.1, "Arruda Sintetico")];
    const anterior = banco(
      [q("q_marcaA", "governador", "DF", tabela(), { round: 2, survey_id: "s_marcaA" })],
      [],
      [{ survey_id: "s_marcaA", legacy_ids: ["wiki-df-velho"], fieldwork_end: "2026-08-01", sample_size: 1109 }]);
    const novo = banco(
      [q("q_marcaB", "governador", "DF", tabela(), { round: 2, survey_id: "s_marcaB" })],
      [],
      [{ survey_id: "s_marcaB", legacy_ids: ["p360-13712-novo"],
        source_refs: [{ source: "poder360", native_id: "13712" }],
        fieldwork_end: "2026-08-01", sample_size: 1109 }]);
    const v = delta({ anterior, novo });
    afirma(v.ok, `a duplicata entre marcas tinha de provar sucessão (veio ${v.linhas.join(" | ")})`);
    afirma(v.toleradas.sucessoras === 1, `1 sucessora (veio ${v.toleradas.sucessoras})`);
    const c = v.conflitos.find((x) => x.type === "question_sumida_com_sucessora");
    afirma(/via duplicata/.test(c?.note ?? ""), `a via é a duplicata (veio: ${c?.note})`);

    // SEGURANÇA — a metade que impede a trava e o desastre de senador:MT. Elenco
    // igual não basta: é PCT idêntico que faz de duas marcas a mesma pesquisa.
    const novoPct = structuredClone(novo);
    novoPct.questions[0].results[0].pct = 44.0;
    const vp = delta({ anterior, novo: novoPct });
    afirma(!vp.ok && vp.semProva === 1,
      `pct diferente não é a mesma tabela — não pode provar (ok=${vp.ok}, semProva=${vp.semProva})`);

    // E o topline de 2 nomes exige a chave FORTE — mesma amostra — porque dois
    // institutos coincidem em 2 nomes por acaso (o mesmo recorte de dropExactDuplicates).
    const novoAmostra = structuredClone(novo);
    novoAmostra.surveys[0].sample_size = 1500;
    const va = delta({ anterior, novo: novoAmostra });
    afirma(!va.ok && va.semProva === 1,
      `amostra diferente derruba a chave forte do topline de 2 nomes (ok=${va.ok}, semProva=${va.semProva})`);
  });

  caso("11 PASSA: adição pura no mesmo levantamento prova linhagem; departure REPROVA", ({ delta, afirma }) => {
    // O caso JHC/CIRO (commit cb100ae): o coletor PAROU de apagar candidatos
    // cujo nome de urna parece sigla de partido — JHC = João Henrique Caldas,
    // nome de urna oficial do governador de AL. Des-apagá-lo ACRESCENTA um nome
    // ao MESMO levantamento (`[Renan Filho]` → `[JHC, Renan Filho]`), e como o
    // question_id semeia em elenco, a pergunta é re-cunhada sem que nada tenha
    // saído. `questionRostersMatch` lê 1-de-2 adicionado como 0,5 (abaixo de
    // 0,8) e a pergunta velha sairia SEM PROVA — uma perda inventada onde só
    // houve crescimento de elenco.
    const anterior = banco(
      [q("q_al1", "governador", "AL", [r("c_renan", 44, "Renan Filho")], { survey_id: "s_al" })],
      [],
      [{ survey_id: "s_al" }]);
    const novo = banco(
      [q("q_al2", "governador", "AL", [r("c_jhc", 20, "JHC"), r("c_renan", 44, "Renan Filho")], { survey_id: "s_al" })],
      [],
      [{ survey_id: "s_al" }]);
    const v = delta({ anterior, novo });
    afirma(v.ok, `adição pura no mesmo levantamento tinha de provar linhagem (veio ${v.linhas.join(" | ")})`);
    afirma(v.toleradas.sucessoras === 1, `1 sucessora (veio ${v.toleradas.sucessoras})`);
    const c = v.conflitos.find((x) => x.type === "question_sumida_com_sucessora");
    afirma(/via adicao/.test(c?.note ?? ""), `a via é a adição (veio: ${c?.note})`);

    // ⚠ SEGURANÇA — a metade que impede a trava: a ponte SÓ vale para superset.
    // Se um candidato de fato SAIU (aqui c_x sai e c_jhc entra — troca, não
    // adição), não é subconjunto: o overlap de elenco cai abaixo de 0,8 E a
    // regra de adição recusa (há partida), então a perda REPROVA como antes. É
    // o que prova que a regra não afrouxa nada — superset não esconde ausente.
    const antDepart = banco(
      [q("q_al1b", "governador", "AL", [r("c_renan", 44, "Renan Filho"), r("c_x", 12, "Xi Cobaia")], { survey_id: "s_al2" })],
      [],
      [{ survey_id: "s_al2" }]);
    const novDepart = banco(
      [q("q_al2b", "governador", "AL", [r("c_jhc", 20, "JHC"), r("c_renan", 44, "Renan Filho")], { survey_id: "s_al2" })],
      [],
      [{ survey_id: "s_al2" }]);
    const vd = delta({ anterior: antDepart, novo: novDepart });
    afirma(!vd.ok && vd.semProva === 1,
      `um candidato que SAIU não é subconjunto — tem de reprovar (ok=${vd.ok}, semProva=${vd.semProva})`);
    afirma(vd.toleradas.sucessoras === 0, `e não inventa sucessora (veio ${vd.toleradas.sucessoras})`);
  });

  caso("12 PASSA: bug de ano da Wikipédia — duplicata year-shift do MESMO instituto; instituto diverso e departure REPROVAM", ({ delta, afirma }) => {
    // O caso governador:MT (28/08/2026): a Wikipédia listou 9 toplines de 2º
    // turno com o ANO errado (2025) — o parse herdou o ano do cabeçalho da
    // seção —, e o Poder360 nativo trouxe a MESMA pesquisa com o ano certo
    // (2026). O `survey|nat` velho e o `survey|ref` novo são a mesma medição:
    // MESMO institute_id, MESMA amostra, MESMOS pcts. A diferença de um ano cai
    // fora da janela de operação (±3 dias), então a ponte de duplicata não os
    // ligava e as 9 saíam SEM PROVA — perda inventada onde só houve correção de
    // ano. O salto de ano é durável e estrito: só vale com o MESMO instituto.
    const tabela = () => [r("c_wf", 50, "Wagner Fictício"), r("c_jc", 26, "Joana Cenário")];
    const anterior = banco(
      [q("q_wiki25", "governador", "MT", tabela(), { round: 2, survey_id: "s_wiki25" })],
      [],
      [{ survey_id: "s_wiki25", institute_id: "i_teste", legacy_ids: ["wiki-mt-2025"],
         fieldwork_end: "2025-03-23", sample_size: 1600 }]);
    const novo = banco(
      [q("q_p360_26", "governador", "MT", tabela(), { round: 2, survey_id: "s_p360_26" })],
      [],
      [{ survey_id: "s_p360_26", institute_id: "i_teste", legacy_ids: ["p360-99999-novo"],
         source_refs: [{ source: "poder360", native_id: "99999" }],
         fieldwork_end: "2026-03-23", sample_size: 1600 }]);
    const v = delta({ anterior, novo });
    afirma(v.ok, `o year-shift do mesmo instituto tinha de provar sucessão (veio ${v.linhas.join(" | ")})`);
    afirma(v.toleradas.sucessoras === 1, `1 sucessora (veio ${v.toleradas.sucessoras})`);
    const c = v.conflitos.find((x) => x.type === "question_sumida_com_sucessora");
    afirma(/via duplicata/.test(c?.note ?? ""), `a via é a duplicata (veio: ${c?.note})`);

    // SEGURANÇA 1 — a metade que impede a trava e prova que o fix é estrito: um
    // salto de ano de OUTRO instituto NÃO é a mesma casa re-datada; sem a prova
    // compensatória do institute_id, a perda REPROVA (é o que cai se o fix for
    // revertido para exigir apenas mesmo dia/amostra).
    const novoOutroInst = structuredClone(novo);
    novoOutroInst.surveys[0].institute_id = "i_outro";
    const vi = delta({ anterior, novo: novoOutroInst });
    afirma(!vi.ok && vi.semProva === 1,
      `year-shift de instituto diverso não é a mesma pesquisa — tem de reprovar (ok=${vi.ok}, semProva=${vi.semProva})`);

    // SEGURANÇA 2 — mesmo instituto, mesmo ano trocado, mas um candidato SAIU:
    // a tabela não é idêntica, a duplicata não cobre, e a perda REPROVA. O salto
    // de ano não pode esconder uma saída de candidato.
    const novoDepart = structuredClone(novo);
    novoDepart.questions[0].results = [r("c_wf", 50, "Wagner Fictício"), r("c_novo", 26, "Terceiro Nome")];
    const vd = delta({ anterior, novo: novoDepart });
    afirma(!vd.ok && vd.semProva === 1,
      `candidato que SAIU sob year-shift tem de reprovar (ok=${vd.ok}, semProva=${vd.semProva})`);
  });

  // ======================================================================
  // C. O VALIDADOR DA LISTA E A TRAVA DE PROMOÇÃO (fora das mutações: não
  //    passam pelo juiz — mutilá-lo não os alcança, e está certo assim)
  // ======================================================================

  caso("lista malformada reprova: estado, motivo e chave", ({ delta, afirma }) => {
    const lista = {
      version: 1,
      disputas: {
        "governador:SP": { estado: "obrigatória" },          // estado fora do domínio
        "senador:RJ": { estado: "desativada" },              // desativada sem motivo
        "prefeito:XX": { estado: "exigida" },                // race e UF fora dos domínios
      },
    };
    const erros = validarLista(lista);
    afirma(erros.length === 3, `3 defeitos (veio ${erros.length}: ${erros.join(" | ")})`);
    const v = delta({ anterior: banco([]), novo: banco([]), lista });
    afirma(!v.ok, "lista malformada tinha de reprovar a rodada");
    afirma(v.linhas.some((l) => /MALFORMADA/.test(l)), "e dizer que o defeito é a lista, não a coleta");
  });

  caso("add_poll com a disputa ainda pendente reprova (R2: a promoção é parte do reparo)", ({ delta, afirma }) => {
    const reparos = { repairs: [{ match: {}, add_poll: { race: "presidente", state: "RR" } }] };
    const pendente = { version: 1, disputas: { "presidente:RR": { estado: "pendente" } } };
    const novo = banco([q("q_rr1", "presidente", "RR", [r("c_rr1", 40), r("c_rr2", 30)])]);
    const v = delta({ anterior: banco([]), novo, lista: pendente, reparos });
    afirma(!v.ok, "inserção curada com a disputa pendente tinha de reprovar");
    afirma(v.linhas.some((l) => /pendente/.test(l) && /presidente:RR/.test(l)), "nomeando a disputa");
    // Promovida no mesmo commit, o mesmo estado passa.
    const promovida = { version: 1, disputas: { "presidente:RR": { estado: "exigida" } } };
    const v2 = delta({ anterior: banco([]), novo, lista: promovida, reparos });
    afirma(v2.ok, `com a promoção a exigida no mesmo commit, passa (veio ${v2.linhas.join(" | ")})`);
  });

  return { ok, falhas };
}

// ===========================================================================
// A BATERIA DA QUARENTENA (--self-test) — a rede de segurança, em fixtures
// ===========================================================================
//
// A metade "reprova" da bateria acima prova que a perda sem prova é VISTA; esta
// prova que ela é CONTIDA — que uma disputa churny é congelada no dado do commit
// anterior sem travar a rodada, com integridade referencial e rastro visível.
//
// AS MUTAÇÕES SÃO OBRIGATÓRIAS (contrato §2/e): a `revertida` desliga a rede (a
// fiação de antes, que trava e não restaura), e a bateria TEM de derrubar os
// casos (a) e (c) sob ela — senão um teste que passasse com e sem a feature não
// provaria nada sobre a feature.

const instF = (id, nome) => ({ institute_id: id, legacy_ids: [], canonical: nome, aliases: [nome], cnpj: null, merged_into: null, first_seen: D });
const survF = (id, uf) => ({
  survey_id: id, legacy_ids: [], tse_registration: null, tse_registration_status: "none",
  institute_id: "i_1", institute_names_raw: [], contractor_raw: null,
  universe: { level: uf ? "estadual" : "nacional", uf: uf ?? null },
  fieldwork_start: "2026-08-01", fieldwork_end: "2026-08-03", published_date: null,
  sample_size: 2000, source_refs: [], integra_url: null, article_url: null,
  crosstabs_status: "pending", crosstabs_unavailable_reason: null, retracted: null,
  provenance: { created_at: D, updated_at: D, field_sources: {} },
});
const candF = (id, contest, nome) => ({ candidate_id: id, legacy_ids: [], person_id: null, contest, canonical: nome, aliases: [nome], party: "PT" });
const qF = (id, survey, race, uf, results) => ({
  question_id: id, survey_id: survey, race, round: 1, uf: uf ?? null,
  scenario_ordinal: 0, is_headline: true, results,
  provenance: { created_at: D, updated_at: D, field_sources: {} },
});
const storeF = ({ questions, surveys, candidates, institutes = [instF("i_1", "Quaest")] }) =>
  ({ meta: { schema_version: 1 }, questions, surveys, candidates, institutes,
     people: [], crosstabs: [], registry: [], searches: [], conflicts: [] });

// O COMMIT anterior: disputa A (governador:SP) intacta + disputa B
// (governador:MG), cada pergunta no seu levantamento (um headline por grupo).
function anteriorFixture() {
  return storeF({
    surveys: [survF("s_a1", "SP"), survF("s_a2", "SP"), survF("s_b1", "MG"), survF("s_b2", "MG")],
    candidates: [
      candF("c_a1", "governador:SP", "Alfa Testeira"), candF("c_a2", "governador:SP", "Beta Provador"),
      candF("c_b1", "governador:MG", "Gama Ensaio"), candF("c_b2", "governador:MG", "Delta Amostra"),
    ],
    questions: [
      qF("q_a1", "s_a1", "governador", "SP", [r("c_a1", 40), r("c_a2", 30)]),
      qF("q_a2", "s_a2", "governador", "SP", [r("c_a1", 41), r("c_a2", 29)]),
      qF("q_b1", "s_b1", "governador", "MG", [r("c_b1", 40), r("c_b2", 30)]),
      qF("q_b2", "s_b2", "governador", "MG", [r("c_b1", 42), r("c_b2", 28)]),
    ],
  });
}

// A coleta desta rodada com a disputa B CHURNY: as duas perguntas de MG sumiram
// sem sucessora, e a fonte deixou cair seus levantamentos e candidatos (é o que
// o v2/cenarios faz). A disputa A segue fresca.
function novoChurny() {
  return storeF({
    surveys: [survF("s_a1", "SP"), survF("s_a2", "SP")],
    candidates: [candF("c_a1", "governador:SP", "Alfa Testeira"), candF("c_a2", "governador:SP", "Beta Provador")],
    questions: [
      qF("q_a1", "s_a1", "governador", "SP", [r("c_a1", 40), r("c_a2", 30)]),
      qF("q_a2", "s_a2", "governador", "SP", [r("c_a1", 41), r("c_a2", 29)]),
    ],
  });
}

const FEATURE = {
  real: { pode: (v) => podeQuarentenar(v), restaurar: (a) => restaurarDisputas(a) },
  // A fiação de ANTES da rede: nada é restaurado e a rodada não passa. Prova que
  // (a) e (c) dependem da feature — some a feature, caem os casos.
  revertida: {
    pode: () => false,
    restaurar: ({ novo }) => ({ store: novo, conflitos: [], faltando: [], restauradasIds: [], removidasIds: [], disputas: [] }),
  },
};

function rodarQuarentena({ feature = "real" } = {}) {
  const F = FEATURE[feature];
  const falhas = [];
  let ok = 0;
  const caso = (nome, fn) => {
    const problemas = [];
    const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
    try { fn({ afirma }); }
    catch (e) { problemas.push(`exceção: ${e.stack?.split("\n").slice(0, 3).join(" | ") ?? e.message}`); }
    if (problemas.length) {
      falhas.push(nome);
      if (feature === "real" || VERBOSE) { console.log(`✗ ${nome}`); for (const p of problemas) console.log(`    ${p}`); }
    } else { ok++; if (feature === "real") console.log(`✓ ${nome}`); }
  };
  const delta = (anterior, novo) => deltaPorDisputa({ anterior, novo, lista: LISTA0, reparos: {}, runDate: D });

  caso("a QUARENTENA: perda sem prova é congelada e a rodada NÃO trava", ({ afirma }) => {
    const anterior = anteriorFixture();
    const novo = novoChurny();
    const v = delta(anterior, novo);
    afirma(!v.ok, "a coleta perdeu MG sem prova — o veredito do delta continua reprovando (não afrouxa)");
    afirma(F.pode(v), "mas a rede PODE agir: a disputa é restaurável (nAntes > 0)");
    const { store } = F.restaurar({ anterior, novo, disputas: v.quarentena, runDate: D });
    const val = validateStore(store, { minSurveys: 1, minQuestions: 1 });
    afirma(val.errorsTotal === 0, `o store congelado passa no validador (veio: ${val.errors[0] ?? ""})`);
    const ids = new Set(store.questions.map((q) => q.question_id));
    afirma(ids.has("q_b1") && ids.has("q_b2"), "as perguntas de MG voltaram ao dado do commit anterior");
    afirma(ids.has("q_a1") && ids.has("q_a2"), "e a disputa fresca (SP) segue comitando fresca");
  });

  caso("b NO-OP: rodada limpa não quarentena nada", ({ afirma }) => {
    const anterior = anteriorFixture();
    const novo = structuredClone(anterior);
    const v = delta(anterior, novo);
    afirma(v.ok, `coleta idêntica não reprova (veio ${v.linhas.join(" | ")})`);
    afirma(v.quarentena.length === 0, "nada a quarentenar");
    afirma(!F.pode(v), "a rede não age numa rodada limpa");
  });

  caso("c RASTRO: o conflito de quarentena nomeia cargo:UF, contagem e os ids", ({ afirma }) => {
    const anterior = anteriorFixture();
    const novo = novoChurny();
    const v = delta(anterior, novo);
    const { conflitos } = F.restaurar({ anterior, novo, disputas: v.quarentena, runDate: D });
    const c = conflitos.find((x) => x.type === "disputa_em_quarentena");
    afirma(!!c, "há um conflito de quarentena gravado");
    afirma(c?.record_id === "governador:MG", `nomeia a disputa cargo:UF (veio: ${c?.record_id})`);
    afirma(c?.stored === 2, `traz a contagem restaurada (veio: ${c?.stored})`);
    afirma(/2 pergunta\(s\) sumiram sem prova/.test(c?.note ?? ""), "diz quantas sumiram sem prova");
    afirma(/q_b1/.test(c?.note ?? "") && /q_b2/.test(c?.note ?? ""), `e lista os question_ids (veio: ${c?.note})`);
  });

  caso("d FALLBACK: restauração inconsistente reprova (não comita)", ({ afirma }) => {
    // A coleta re-usou o id c_b1 para OUTRA disputa (governador:SP). Restaurar a
    // pergunta de MG que cita c_b1 acha o id já presente (dedupe) mas com contest
    // trocado — o store fica inconsistente, e `validate-store` reprova. É o
    // fallback seguro do contrato §4.
    const anterior = anteriorFixture();
    const novo = novoChurny();
    novo.candidates.push(candF("c_b1", "governador:SP", "Gama Ensaio"));  // id reciclado noutra disputa
    const v = delta(anterior, novo);
    afirma(F.pode(v), "a decisão diz restaurável (o resíduo está na APLICAÇÃO, não na decisão)");
    const { store } = F.restaurar({ anterior, novo, disputas: v.quarentena, runDate: D });
    const val = validateStore(store, { minSurveys: 1, minQuestions: 1 });
    afirma(val.errorsTotal > 0, "a restauração inconsistente é PEGA pelo validador — a fiação reprova");
    afirma(val.errors.some((e) => /governador:SP/.test(e) && /governador:MG/.test(e)),
      `o erro é o elenco cruzado (veio: ${val.errors[0] ?? ""})`);
  });

  return { ok, falhas };
}

// ---------------------------------------------------------------- self-test
function autoteste() {
  console.log("— bateria com o juiz REAL —");
  const real = rodar();
  if (real.falhas.length) {
    console.error(`\nAUTOTESTE FALHOU: ${real.falhas.length} caso(s) com o juiz real: ${real.falhas.join("; ")}`);
    process.exit(1);
  }

  // CADA MUTAÇÃO TEM DE DERRUBAR A SUA METADE (molde: roster-retention-check).
  // Exigir apenas "alguma falha" deixaria passar uma bateria que só sabe
  // reprovar por um lado — e é o lado "passa" que impede a trava permanente.
  const esperado = {
    cego: [
      "1 REPROVA: disputa zerada sem prova, nomeando disputa e contagem",
      "2 REPROVA: disputa exigida vazia dos dois lados (0 → 0)",
      "3 REPROVA: perda diluída em crescimento do total",
      "4 REPROVA: fonte falhada não é prova — sucessora por elenco recusada",
      "5 REPROVA: identidade de levantamento não prova sucessão (4 confrontos → 1)",
      "5b REPROVA: elenco igual em OUTRO levantamento não prova sucessão",
    ],
    paranoico: [
      "7 PASSA: sucessão por legacy_ids da pergunta, com conflito gravado",
      "7b PASSA: sucessão por elenco via linhagem de pessoa — e o líder não troca",
      "8 PASSA: perda ratificada por reparo com fonte; sem fonte, RECUSA",
      "9 PASSA: disputa desativada vazia, com aviso",
      "10 PASSA: duplicata entre marcas — sucessão por tabela idêntica, durável sob deriva de id",
      "11 PASSA: adição pura no mesmo levantamento prova linhagem; departure REPROVA",
      "12 PASSA: bug de ano da Wikipédia — duplicata year-shift do MESMO instituto; instituto diverso e departure REPROVAM",
    ],
  };
  let okGeral = true;
  for (const [modo, devemCair] of Object.entries(esperado)) {
    const { falhas } = rodar({ mutacao: modo });
    const faltando = devemCair.filter((n) => !falhas.includes(n));
    if (faltando.length) {
      okGeral = false;
      console.error(`AUTOTESTE FALHOU (${modo}): a bateria PASSOU em ${faltando.length} caso(s) que a mutação quebra — ela não confere o que existe para conferir:`);
      for (const n of faltando) console.error(`  não reprovou → ${n}`);
      continue;
    }
    console.log(`autoteste (${modo}): a bateria REPROVA ${falhas.length} caso(s) quando o juiz é mutilado`);
    for (const n of falhas.slice(0, 5)) console.log(`  detectado → ${n}`);
  }

  // ── a rede de segurança (quarentena) ─────────────────────────────────────
  console.log("\n— bateria da QUARENTENA com a rede REAL —");
  const q = rodarQuarentena({ feature: "real" });
  if (q.falhas.length) {
    console.error(`\nAUTOTESTE FALHOU: ${q.falhas.length} caso(s) de quarentena com a rede real: ${q.falhas.join("; ")}`);
    okGeral = false;
  }
  // A mutação obrigatória: sem a rede, (a) e (c) TÊM de cair (contrato §2/e).
  const devemCairSemRede = [
    "a QUARENTENA: perda sem prova é congelada e a rodada NÃO trava",
    "c RASTRO: o conflito de quarentena nomeia cargo:UF, contagem e os ids",
  ];
  const semRede = rodarQuarentena({ feature: "revertida" });
  const naoCairam = devemCairSemRede.filter((n) => !semRede.falhas.includes(n));
  if (naoCairam.length) {
    okGeral = false;
    console.error(`AUTOTESTE FALHOU (revertida): a bateria PASSOU em ${naoCairam.length} caso(s) que a reversão da rede quebra:`);
    for (const n of naoCairam) console.error(`  não caiu → ${n}`);
  } else {
    console.log(`autoteste (revertida): sem a rede, a bateria derruba ${semRede.falhas.length} caso(s) — (a) e (c) dependem da feature`);
  }

  process.exit(okGeral ? 0 : 1);
}

// ===========================================================================
// A FIAÇÃO REAL — git, arquivos, exit code
// ===========================================================================

function gitShow(raiz, rel) {
  return execFileSync("git", ["-C", raiz, "show", `HEAD:${rel}`],
    { encoding: "utf-8", maxBuffer: 256 * 1024 * 1024 });
}

function lerJson(arq) {
  return JSON.parse(fs.readFileSync(arq, "utf-8"));
}

/** Lê uma tabela do COMMIT (git show HEAD:…), tolerando ausência como vazia. */
function ndjsonDoCommit(raiz, rel) {
  try { return ndjson(gitShow(raiz, rel)); } catch { return []; }
}

function real() {
  const raiz = argVal("raiz") ? path.resolve(argVal("raiz")) : ROOT;
  const runDate = argVal("data") ?? today();
  const dataDir = path.join(raiz, "data");
  const dado = (f) => path.join(dataDir, f);

  // ANTERIOR: o commit, tabela por tabela. A quarentena RESTAURA a disputa
  // churny para este estado, então o comparador precisa das tabelas de fecho
  // referencial (people/institutes/crosstabs) além de questions/surveys/
  // candidates. As três primeiras são obrigatórias — falhar em lê-las é defeito,
  // nunca "primeiro dia": o banco é comitado desde a Fase 1. As de fecho são
  // toleradas vazias (crosstabs hoje é vazio) porque sua ausência não cega o
  // delta, só limita o que a restauração alcança — e aí o validador reprova.
  let anterior, carimbos = new Map();
  try {
    anterior = {
      questions: ndjson(gitShow(raiz, "data/questions.ndjson")),
      surveys: ndjson(gitShow(raiz, "data/surveys.ndjson")),
      candidates: ndjson(gitShow(raiz, "data/candidates.ndjson")),
      people: ndjsonDoCommit(raiz, "data/people.ndjson"),
      institutes: ndjsonDoCommit(raiz, "data/institutes.ndjson"),
      crosstabs: ndjsonDoCommit(raiz, "data/crosstabs.ndjson"),
    };
  } catch (e) {
    console.error(`ERRO: não li o banco COMITADO (git show HEAD:data/…): ${e.message.split("\n")[0]}`);
    console.error("Sem o estado anterior não há delta — e um delta que assume 'vazio' aprovaria qualquer perda.");
    process.exit(1);
  }
  try {
    for (const c of ndjson(gitShow(raiz, "data/conflicts.ndjson"))) {
      if (c.conflict_id && c.at) carimbos.set(c.conflict_id, c.at);
    }
  } catch {
    // Sem conflitos anteriores não há carimbo a preservar; os novos usam runDate.
  }

  // NOVO: a working tree — que, no ponto do workflow em que este guarda roda,
  // JÁ é a coleta desta rodada. Lido como STORE COMPLETO (readStore) porque a
  // fiação da quarentena precisa reescrevê-lo inteiro, com integridade
  // referencial, e não só as três tabelas do delta.
  let novo;
  try {
    novo = readStore({ dir: dataDir, runDate });
  } catch (e) {
    console.error(`ERRO: não li o store da working tree (${e.message.split("\n")[0]}).`);
    process.exit(1);
  }

  let lista;
  try {
    lista = lerJson(dado("disputas-declaradas.json"));
  } catch (e) {
    console.error(`ERRO: data/disputas-declaradas.json ausente ou ilegível (${e.message.split("\n")[0]}).`);
    console.error("A lista declarada é o registro da intenção — sem ela o delta é cego às disputas que partem de zero.");
    process.exit(1);
  }
  let reparos = {};
  try { reparos = lerJson(dado("repairs.json")); } catch { /* sem reparos não há ratificação — segue */ }

  // Fonte falhada = `last_ok` que NÃO acompanhou o `generated_at` da rodada
  // (scrape.mjs só avança o carimbo da fonte que respondeu). O TSE fica de
  // fora: é enriquecimento, não dono de pergunta.
  const fontesFalhadas = new Set();
  try {
    const polls = lerJson(dado("polls.json"));
    for (const s of polls.sources ?? []) {
      if (s.last_ok === polls.generated_at) continue;
      if (/poder360/i.test(s.name ?? "")) fontesFalhadas.add("poder360");
      else if (/wikip/i.test(s.name ?? "")) fontesFalhadas.add("wikipedia");
    }
  } catch {
    console.warn("AVISO: data/polls.json ilegível — sem sumário de fontes, nenhuma é tratada como falhada.");
  }

  const v = deltaPorDisputa({ anterior, novo, lista, reparos, fontesFalhadas, runDate, carimbos });

  // ── CAMINHO LIMPO (ou tudo tolerado) — byte-idêntico ao comportamento
  //    anterior (contrato §5). Nenhuma linha aqui mudou.
  if (v.ok) {
    for (const l of v.linhas) console.log(l);
    if (v.conflitos.length) {
      const arq = dado("conflicts.ndjson");
      const existentes = new Set(
        fs.existsSync(arq) ? ndjson(fs.readFileSync(arq, "utf-8")).map((c) => c.conflict_id) : []);
      const novos = v.conflitos.filter((c) => !existentes.has(c.conflict_id));
      if (novos.length) {
        fs.appendFileSync(arq, novos.map((c) => JSON.stringify(c)).join("\n") + "\n");
        console.log(`  rastro: ${novos.length} conflito(s) de tolerância gravado(s) em conflicts.ndjson`);
      }
    }
    process.exit(0);
  }

  // ── HÁ FALHA. A rede de segurança age SÓ quando toda falha é restaurável
  //    (nenhum resíduo 0→0, nenhuma lista malformada, nenhuma promoção
  //    pendente). Do contrário, reprova inteira como antes — a mensagem do
  //    núcleo ("Nada foi comitado…") está correta e sai como estava.
  if (!podeQuarentenar(v)) {
    for (const l of v.linhas) console.log(l);
    process.exit(1);
  }

  // ── QUARENTENA. O núcleo decide a lista; a fiação aplica: restaura o dado do
  //    commit anterior das disputas churny, CONFERE no validador do store, e só
  //    então reescreve data/. Se a restauração não fecha, é fallback seguro:
  //    reprova (nada é comitado).
  const { store: resultado, conflitos: qConf, faltando } =
    restaurarDisputas({ anterior, novo, disputas: v.quarentena, runDate, carimbos });

  const val = validateStore(resultado, { minSurveys: 500, minQuestions: 2000 });
  if (val.errorsTotal) {
    console.error("DELTA POR DISPUTA — QUARENTENA ABORTADA (fallback seguro): a restauração não passou no validador do store.");
    console.error(`  disputas tentadas: ${v.quarentena.map((q) => q.disputa).join(", ")}`);
    if (faltando.length) {
      console.error(`  referências que o commit anterior não fechou: ${faltando.slice(0, 10).join(", ")}${faltando.length > 10 ? " …" : ""}`);
    }
    for (const e of val.errors.slice(0, 10)) console.error(`  ${e}`);
    console.error(`  ${contagem(val.errorsTotal, val.errors.length)} — nada foi comitado; a rodada reprova.`);
    process.exit(1);
  }

  writeStore(resultado, { dir: dataDir });

  // polls.json é DERIVADO do store (o site lê o store; polls.json serve o
  // validador legado, a paridade e o histórico). Congelamos o store, então
  // re-derivamos por UMA implementação só (§5): rodar o próprio derive-polls.
  try {
    execFileSync("node", [path.join(raiz, "scripts", "derive-polls.mjs")], { stdio: "inherit" });
  } catch (e) {
    console.error(`ERRO ao re-derivar data/polls.json após a quarentena: ${e.message.split("\n")[0]}`);
    process.exit(1);
  }

  // Rastros: as tolerâncias das disputas NÃO congeladas (as das congeladas
  // apontam para sucessoras que acabaram de sair) + as linhas de quarentena.
  const alvo = new Set(v.quarentena.map((q) => q.disputa));
  const antQById = new Map(anterior.questions.map((q) => [q.question_id, q]));
  const tolerancias = v.conflitos.filter((c) => {
    const q = antQById.get(c.record_id);
    return !q || !alvo.has(disputaDe(q));
  });
  const rastros = [...tolerancias, ...qConf];
  if (rastros.length) {
    const arq = dado("conflicts.ndjson");
    const existentes = new Set(
      fs.existsSync(arq) ? ndjson(fs.readFileSync(arq, "utf-8")).map((c) => c.conflict_id) : []);
    const novos = rastros.filter((c) => !existentes.has(c.conflict_id));
    if (novos.length) {
      fs.appendFileSync(arq, novos.map((c) => JSON.stringify(c)).join("\n") + "\n");
      console.log(`  rastro: ${novos.length} conflito(s) gravado(s) em conflicts.ndjson (${qConf.length} de quarentena)`);
    }
  }

  for (const l of linhasDeQuarentena(v)) console.log(l);
  process.exit(0);
}

if (process.argv.includes("--self-test")) autoteste();
else real();
