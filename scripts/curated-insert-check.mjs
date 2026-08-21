#!/usr/bin/env node
// A INSERÇÃO CURADA (`add_poll`) ACONTECE QUANDO DEVE — E RECUSA QUANDO NÃO DEVE.
//
// O defeito guardado está descrito em `scripts/lib/repairs.mjs`: quando o
// `v2/cenarios` do Poder360 apaga TODAS as linhas de candidato de um bloco,
// `sources/poder360.mjs` descarta a pesquisa inteira e ela nunca chega à lista
// que `applyRepairs` sabe mutar — de modo que **nenhum reparo de correção a
// alcança**. Medido em 17/08/2026: 41 blocos de disputa ausentes do banco por
// esse caminho. `add_poll` é a porta curada para eles.
//
// ⚠ AS DUAS METADES SÃO IGUALMENTE OBRIGATÓRIAS, pela mesma simetria que
// `roster-retention-check.mjs` mantém. Uma inserção que disparasse sempre é pior
// que nenhuma: ela DUPLICA a pesquisa no dia em que a fonte sarar, e duplicar uma
// operação de campo conta a mesma amostra duas vezes na média de uma disputa.
// Por isso metade dos casos abaixo afirma que NADA foi inserido.
//
// ⚠ E O AUTOTESTE REPROVA (CONVENTIONS §2). `--self-test` roda a bateria inteira
// com a decisão de inserir MUTILADA, de dois jeitos opostos — `nunca` (os casos
// "insere" têm de cair) e `sempre` (os casos "não insere" e as RECUSAS têm de
// cair) — e exige que cada mutação derrube o SEU conjunto. Exigir apenas "alguma
// falha" deixaria passar uma bateria que só sabe reprovar por um dos lados.
//
// ⚠ E A BARRA PROBATÓRIA É UM DOS CASOS, não uma convenção de quem escreve o
// arquivo. Uma pesquisa inserida sem `source`/`evidence`/`verified_at` é uma
// invenção com carimbo de reparo, e ela entra numa média. O guarda exige que
// `applyRepairs` a RECUSE.
//
// A bateria roda o CAMINHO DE VERDADE: `applyRepairs` do arquivo real de reparos
// (com um spec de teste passado por `file`, como faz o guarda de retenção) e
// `writeStoreFromPolls`, em diretório temporário. Chamar a decisão direto
// provaria uma propriedade de código que o pipeline não executa.
//
// Uso: node scripts/curated-insert-check.mjs [--self-test] [--verbose]
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeStoreFromPolls } from "./lib/build-store.mjs";
import { applyRepairs, inserirPesquisaCurada, montarPesquisaCurada } from "./lib/repairs.mjs";
import { usarRegistroDeUrna } from "./lib/candidates.mjs";
import { canonicalizeCandidates } from "./lib/canonicalize.mjs";
import { agruparPorDisputa, lerCandidaturas } from "./lib/candidaturas.mjs";
import { normNome } from "./lib/nomes.mjs";
import { projectPolls } from "./lib/project.mjs";
import { validateStore } from "./validate-store.mjs";
import { validate as validateLegado } from "./validate-data.mjs";

const VERBOSE = process.argv.includes("--verbose");
const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const D0 = "2026-08-10";
const D1 = "2026-08-17";

// ---------------------------------------------------------------- fixtures
//
// Instituto e candidatos deliberadamente inexistentes no registro do TSE, pela
// mesma razão de `roster-retention-check.mjs`: um nome que casasse com uma
// candidatura real faria o caso depender do conteúdo de
// `data/candidaturas.ndjson`, e um teste que quebra quando o TSE republica o
// arquivo não prova nada sobre o guarda.
const INSTITUTO = "Instituto de Inserção";
const REGISTRO = "PE-90002/2026";
const FIM = "2026-07-30";

// Soma 79 + branco 12 + indecisos 9 = 100, para que `expect_sum` seja um caso
// vivo e não um campo decorativo.
const ELENCO = [
  { candidate: "Alfa Insercao", party: "PT", pct: 41 },
  { candidate: "Beta Insercao", party: "PL", pct: 30 },
  { candidate: "Gama Insercao", party: "PSD", pct: 6 },
  { candidate: "Delta Insercao", party: "Novo", pct: 2 },
];

/**
 * A LINHA IRMÃ QUE A FONTE ENTREGA, e ela é load-bearing: reproduz a forma real
 * do defeito. No caso do Datafolha em PE o levantamento PE-04519/2026 existe no
 * banco com governador e senado, e só a presidencial foi apagada — então o que
 * a inserção tem de fazer é JUNTAR-SE a um levantamento existente pelo degrau 2
 * de `resolveSurvey` (o registro do TSE), nunca cunhar um segundo levantamento
 * para a mesma operação de campo.
 */
const irma = (over = {}) => ({
  id: "p360-900002-1-0-aaaaaaaaaaaa", source: "poder360",
  pollster: INSTITUTO, race: "senador", state: "PE", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/materia",
  fieldwork_start: "2026-07-28", fieldwork_end: FIM, published_date: FIM,
  sample_size: 1022, margin_of_error: 3, tse_registration: REGISTRO,
  results: [
    { candidate: "Epsilon Insercao", party: "PT", pct: 44 },
    { candidate: "Zeta Insercao", party: "PL", pct: 33 },
  ],
  others_pct: null, undecided_pct: 12, blank_null_pct: 11,
  ...over,
});

/** A presidencial COMO A FONTE A SERVIRIA se não a estivesse apagando. */
const daFonte = (over = {}) => ({
  id: "p360-900003-1-0-bbbbbbbbbbbb", source: "poder360",
  pollster: INSTITUTO, race: "presidente", state: "PE", round: 1,
  scenario: "1º turno", source_url: "https://exemplo/materia",
  fieldwork_start: "2026-07-28", fieldwork_end: FIM, published_date: FIM,
  sample_size: 1022, margin_of_error: 3, tse_registration: REGISTRO,
  results: structuredClone(ELENCO),
  others_pct: null, undecided_pct: 9, blank_null_pct: 12,
  ...over,
});

const CLAUSULA = {
  pollster: INSTITUTO, race: "presidente", state: "PE", round: 1, fieldwork_end: FIM,
};

/** O spec de reparo de teste, escrito em disco para atravessar `applyRepairs`. */
function specDeTeste(dir, { match = CLAUSULA, poll = {}, ...over } = {}) {
  const f = path.join(dir, "reparo-de-teste.json");
  fs.writeFileSync(f, JSON.stringify({
    version: 1,
    repairs: [{
      match,
      defect: "o v2/cenarios apagou o bloco inteiro da presidencial",
      source: "https://exemplo/relatorio-do-instituto.pdf",
      evidence: "p.8, tabela estimulada; lido duas vezes às cegas por leituras independentes",
      verified_at: "2026-08-17",
      add_poll: {
        pollster: INSTITUTO, race: "presidente", state: "PE", round: 1,
        scenario: "1º turno", contractor: "Contratante de Ensaio",
        fieldwork_start: "2026-07-28", fieldwork_end: FIM, published_date: "2026-08-03",
        sample_size: 1022, margin_of_error: 3, tse_registration: REGISTRO,
        results: structuredClone(ELENCO),
        others_pct: null, undecided_pct: 9, blank_null_pct: 12,
        ...poll,
      },
      expect_sum: 100,
      ...over,
    }],
  }, null, 1));
  return f;
}

const ler = (dir, t) => {
  const f = path.join(dir, `${t}.ndjson`);
  return fs.existsSync(f)
    ? fs.readFileSync(f, "utf-8").split("\n").filter(Boolean).map((l) => JSON.parse(l))
    : [];
};
const presidencial = (dir) => ler(dir, "questions").filter((q) => q.race === "presidente");

// ------------------------------------------------------------- as mutações
//
// Cada uma simula UM jeito de a decisão quebrar, e cada uma derruba um conjunto
// DIFERENTE de casos. Uma mutação só reprovaria por tudo ao mesmo tempo e não
// provaria nada sobre nenhuma das duas metades.
const MUTACOES = {
  // A inserção nunca chega à lista: a disputa apagada pela fonte segue ausente.
  //
  // ⚠ MUTILA SÓ O EFEITO, e é isso que a torna útil. A primeira versão devolvia
  // `{ warnings: [] }` e portanto apagava também as RECUSAS — com isso os dez
  // casos caíam de uma vez, e uma mutação que reprova tudo não prova nada sobre
  // nenhuma das duas metades (a mesma lição que `roster-retention-check.mjs`
  // registra). Aqui a decisão de verdade roda, com os seus avisos e o seu
  // `noop`, e só a pesquisa é retirada da lista — então caem exatamente os casos
  // que afirmam que ela ENTROU.
  nunca: (polls, rep, targets, label) => {
    const r = inserirPesquisaCurada(polls, rep, targets, label);
    if (!r.poll) return r;
    polls.pop();
    return { warnings: r.warnings };
  },
  // A inserção acontece SEMPRE: sem citação, sem conferir se a pesquisa já
  // existe, sem conferir a própria cláusula. É o duplicado que conta a mesma
  // amostra duas vezes. Usa a construção de verdade — só a decisão é mutilada.
  sempre: (polls, rep) => {
    const p = montarPesquisaCurada(rep);
    polls.push(p);
    return { warnings: [], poll: p };
  },
};

// ------------------------------------------------------------------ runner
function rodar({ mutacao = null } = {}) {
  const inserir = mutacao ? MUTACOES[mutacao] : undefined;
  const opcoes = (file) => (inserir ? { file, inserir } : { file });
  const falhas = [];
  let ok = 0;

  const caso = (nome, fn) => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-insercao-"));
    const problemas = [];
    const afirma = (cond, detalhe) => { if (!cond) problemas.push(detalhe); };
    // O construtor de verdade, o mesmo que o coletor roda.
    const construir = (polls, runDate) =>
      writeStoreFromPolls(polls, { runDate, dir, meta: { built_by: "curated-insert-check" } });
    try {
      fn({ dir, construir, afirma, opcoes });
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
  // A. INSERE — a disputa que o `v2/cenarios` apagou por inteiro
  // ======================================================================

  caso("insere a pesquisa ausente e ela atravessa o pipeline inteiro", ({ dir, construir, afirma, opcoes }) => {
    const polls = [irma()];
    const rel = applyRepairs(polls, opcoes(specDeTeste(dir)));

    afirma(rel.inserted.length === 1, `inserted = ${rel.inserted.length}, esperado 1`);
    afirma(rel.applied === 1, `applied = ${rel.applied}, esperado 1`);
    afirma(!rel.warnings.length, `avisos: ${rel.warnings.join(" | ")}`);
    afirma(!rel.unmatched.length, `a inserção se declarou órfã: ${rel.unmatched.join(" | ")}`);
    afirma(polls.length === 2, `${polls.length} pesquisas na lista, esperado 2`);

    const nova = polls.find((p) => p.race === "presidente");
    afirma(!!nova, "a pesquisa inserida não está na lista");
    afirma(String(nova?.id).startsWith("curado-"), `id "${nova?.id}" sem o prefixo curado-`);
    // §8: id cunhado da mesma `pollId()` do coletor, então é uma função dos
    // dados e não do relógio nem da ordem da lista.
    afirma(/^curado-[0-9a-f]{12}$/.test(String(nova?.id)), `id "${nova?.id}" fora da forma curado-<12 hex>`);

    const { store } = construir(polls, D0);
    const qs = presidencial(dir);
    afirma(qs.length === 1, `${qs.length} perguntas presidenciais no store, esperado 1`);
    const q = qs[0] ?? {};
    afirma(q.results?.length === 4, `${q.results?.length} linhas de resultado, esperado 4`);
    afirma(q.is_headline === true, "a pergunta inserida não virou manchete e não seria publicada");
    // ★ HANDOFF §4: os baldes viajam com as linhas, e `others_pct` NULO porque
    // o relatório não publica linha de outros.
    afirma(q.others_pct === null && q.undecided_pct === 9 && q.blank_null_pct === 12,
      `baldes: outros=${q.others_pct} indecisos=${q.undecided_pct} branco=${q.blank_null_pct}`);
    // JUNTA-SE AO LEVANTAMENTO EXISTENTE pelo registro do TSE, nunca cunha um
    // segundo levantamento para a mesma operação de campo.
    const svs = ler(dir, "surveys");
    afirma(svs.length === 1, `${svs.length} levantamentos, esperado 1 — a inserção partiu a operação de campo em duas`);
    afirma(q.survey_id === svs[0]?.survey_id, "a pergunta inserida ficou noutro levantamento");
    afirma((svs[0]?.legacy_ids ?? []).includes(nova.id),
      `legacy_ids do levantamento não registra a linhagem da pesquisa inserida: ${JSON.stringify(svs[0]?.legacy_ids)}`);
    // A CANONICALIZAÇÃO E OS VALIDADORES, de verdade.
    const { errorsTotal, errors } = validateStore(store, { minSurveys: 1, minQuestions: 1 });
    afirma(errorsTotal === 0, `validate-store reprovou o store com a pesquisa inserida: ${errors[0]}`);
    const projetadas = projectPolls(store);
    const proj = projetadas.find((p) => p.race === "presidente");
    afirma(!!proj, "a pesquisa inserida não foi projetada em polls.json");
    afirma(proj?.results.length === 4, `projeção com ${proj?.results.length} linhas, esperado 4`);
    afirma(!proj?.incomplete, "a pesquisa inserida saiu marcada como incompleta (soma < 90)");
    const legado = validateLegado({ generated_at: new Date().toISOString(), sources: [], polls: projetadas }, { minPolls: 1 });
    afirma(!legado.errors.length, `validate-data reprovou a projeção: ${legado.errors[0]}`);
  });

  caso("a pesquisa inserida se declara CURADA, não coletada", ({ dir, construir, afirma, opcoes }) => {
    const polls = [irma()];
    applyRepairs(polls, opcoes(specDeTeste(dir)));
    const { store } = construir(polls, D0);
    const q = presidencial(dir)[0] ?? {};

    // 1. O CARIMBO, com a marca que separa "corrigida" de "só existe porque foi
    //    curada". Sem `inserted`, um registro inserido é indistinguível de um
    //    coletado que ganhou um reparo — e a diferença é que a fonte nunca
    //    serviu este.
    afirma(q.repaired?.inserted === true, `question.repaired.inserted = ${JSON.stringify(q.repaired?.inserted)}`);
    afirma(/relatorio-do-instituto/.test(q.repaired?.source ?? ""), `o carimbo não cita a fonte: ${q.repaired?.source}`);
    afirma(!!q.repaired?.evidence && !!q.repaired?.verified_at, "o carimbo chegou ao store sem evidência ou sem data de verificação");
    // 2. A PROCEDÊNCIA POR CAMPO, com o prefixo `repair:` que `fillFields` já lê
    //    para tratar o campo como FIXADO e registrar `locked_field` quando uma
    //    fonte discordar depois.
    afirma(String(q.provenance?.field_sources?.results ?? "").startsWith("repair:"),
      `field_sources.results = ${JSON.stringify(q.provenance?.field_sources?.results)} — sem o prefixo repair:`);
    // 3. O CARIMBO ATRAVESSA A PROJEÇÃO, que é onde o site e as conferências o leem.
    const proj = projectPolls(store).find((p) => p.race === "presidente");
    afirma(proj?.repaired?.inserted === true, "a projeção perdeu a marca de inserção");
    afirma(String(proj?.id).startsWith("curado-"), `o id projetado é "${proj?.id}"`);
  });

  // ======================================================================
  // B. NÃO DUPLICA — a metade que impede contar a amostra duas vezes
  // ======================================================================

  caso("NÃO insere quando a fonte volta a servir a pesquisa", ({ dir, construir, afirma, opcoes }) => {
    const polls = [irma(), daFonte()];
    const rel = applyRepairs(polls, opcoes(specDeTeste(dir)));
    afirma(rel.inserted.length === 0, `inserted = ${rel.inserted.length}, esperado 0 — a fonte já serve esta pesquisa`);
    afirma(rel.noop.length === 1, `noop = ${rel.noop.length}, esperado 1`);
    afirma(/já serve/.test(rel.noop[0] ?? ""), `a linha de no-op não diz o motivo: ${rel.noop[0]}`);
    afirma(polls.length === 2, `${polls.length} pesquisas na lista, esperado 2 — a inserção duplicou a operação de campo`);
    afirma(!polls.some((p) => String(p.id).startsWith("curado-")), "entrou uma pesquisa curada ao lado da que a fonte serve");
    construir(polls, D0);
    afirma(presidencial(dir).length === 1, `${presidencial(dir).length} perguntas presidenciais, esperado 1`);
  });

  caso("a inserção é PONTO FIXO COM O MAPA DE URNA PARADO: duas datas, a mesma entrada, o mesmo arquivo", ({ dir, construir, afirma, opcoes }) => {
    // §8, na forma que o HANDOFF §5 dá à garantia depois da retenção de elenco:
    // reconstruir (mesma entrada, mesmo estado anterior) em duas datas quaisquer
    // produz tabelas byte-idênticas. A "mesma entrada" de uma rodada normal é a
    // coleta ao vivo — que continua SEM esta pesquisa, porque o `v2/cenarios`
    // continua apagando o bloco. Então a rodada 2 insere de novo, e o teste é
    // que inserir de novo dê exatamente o mesmo arquivo: mesmo id de pergunta,
    // mesmo `created_at`, sem uma linha reescrita. Sem isto, cada rodada
    // comitaria a pesquisa inserida de novo só com carimbo diferente — a
    // agitação que o NDJSON foi escolhido para não ter.
    //
    // ⚠ E O QUE ESTE CASO **NÃO** PROVA — a leitura anterior dele era falsa.
    // Ele afirmava que a inserção é ponto fixo DESDE A RODADA 1, e não é: o
    // elenco desta fixture é feito de nomes que não existem no registro do TSE,
    // então o mapa de nomes de urna não tem nada a reescrever nele e as duas
    // rodadas ficam iguais por CONSTRUÇÃO DA FIXTURE. Quando a pesquisa inserida
    // estreia na disputa um nome que o mapa reescreve — o caso real: `Samara
    // Martins` e `Edmilson Costa` entrando em `presidente:PE` —, a rodada 2
    // renomeia, a semente da pergunta muda com o elenco e o `question_id` se
    // move UMA vez, levando o `created_at` junto. Medido em três rodadas ao
    // vivo: `q_aee70a1239f0` → `q_875819b0e55b` da 1ª para a 2ª, e a 2ª para a
    // 3ª byte a byte igual. Quem prova isso é o caso seguinte; este aqui prova a
    // outra metade, com o mapa parado.
    const rodada1 = [irma()];
    const rel1 = applyRepairs(rodada1, opcoes(specDeTeste(dir)));
    afirma(rel1.inserted.length === 1, `rodada 1 inseriu ${rel1.inserted.length}, esperado 1`);
    construir(rodada1, D0);
    const antes = fs.readFileSync(path.join(dir, "questions.ndjson"), "utf-8");
    const idAntes = presidencial(dir)[0]?.question_id;

    const rodada2 = [irma()];
    const rel2 = applyRepairs(rodada2, opcoes(specDeTeste(dir)));
    afirma(rel2.inserted.length === 1, `rodada 2 inseriu ${rel2.inserted.length}, esperado 1 — a fonte continua apagando o bloco`);
    afirma(rodada2[1]?.id === rodada1[1]?.id,
      `o id cunhado mudou entre rodadas (${rodada1[1]?.id} → ${rodada2[1]?.id}) — não é função dos dados`);
    construir(rodada2, D1);
    afirma(presidencial(dir).length === 1, `${presidencial(dir).length} perguntas presidenciais, esperado 1 — a 2ª rodada duplicou`);
    afirma(presidencial(dir)[0]?.question_id === idAntes, "o question_id não sobreviveu à segunda rodada");
    afirma(fs.readFileSync(path.join(dir, "questions.ndjson"), "utf-8") === antes,
      "a 2ª rodada reescreveu questions.ndjson — a inserção não é um ponto fixo");
  });

  caso("a inserção converge em DUAS rodadas quando estreia um nome de urna: move uma vez, depois fica", ({ dir, construir, afirma, opcoes }) => {
    // A DEFASAGEM DE UMA RODADA DO CASADOR (CONVENTIONS §6), PROVADA — e não
    // escondida pela escolha da fixture.
    //
    // Todos os outros casos desta bateria usam nomes ausentes do registro do
    // TSE, de propósito: um caso que dependesse do conteúdo de
    // `data/candidaturas.ndjson` quebraria quando o TSE republicasse o arquivo.
    // Só que essa escolha esconde exatamente o comportamento que a inserção tem
    // no banco de verdade. `match-ballot-names.mjs` roda DEPOIS da coleta e o
    // mapa que ele gera vale para a rodada SEGUINTE — então a pesquisa inserida,
    // que estreia `Samara Martins` e `Edmilson Costa` em `presidente:PE`, não é
    // renomeada na rodada em que entra. Na rodada 2 o mapa já a alcança, o
    // elenco canônico vira `Samara`, a semente
    // `question|…|<elenco canônico>` muda, e o `question_id` é RECUNHADO uma
    // vez. Como `priorStamps` casa `created_at` POR ID, o carimbo do dia da
    // inserção morre junto — a mesma perda que a virada de 16/08 custou em 1.164
    // levantamentos, aqui em escala de uma pergunta.
    //
    // Isto NÃO é "pode acontecer": aconteceu, medido em três rodadas ao vivo do
    // pipeline (`q_aee70a1239f0` → `q_875819b0e55b`, `created_at` perdido; e a
    // 3ª rodada byte a byte igual à 2ª). O que este caso cobra é a forma exata
    // do fenômeno — MOVE UMA VEZ E DEPOIS FICA. Se um dia a inserção passar a
    // convergir na rodada 1, é AQUI que se descobre, porque a 1ª afirmação
    // abaixo cai.
    //
    // As duas rodadas veem mapas de urna DIFERENTES porque na vida real elas
    // veem: o mapa é a saída da rodada anterior. A rodada 1 vê um mapa sem a
    // disputa (o casador ainda não leu esses nomes crus); a 2ª e a 3ª veem a
    // entrada que o casador de verdade escreveu para este nome — copiada de
    // `data/ballot-names.json`, do elenco `presidente:BR`, que é o MESMO elenco
    // que `match-ballot-names.mjs` usa para as subamostras estaduais da
    // presidencial (`byContest.get("presidente:BR")` quando a chave começa com
    // `presidente:`). Não se remonta aqui a regra de casamento: usa-se a
    // resposta que o casador já deu.
    const NOME_PUBLICADO = "Samara Martins";
    const DISPUTA = "presidente:PE";
    const mapaReal = JSON.parse(fs.readFileSync(path.join(RAIZ, "data", "ballot-names.json"), "utf-8"));
    const entrada = mapaReal.mapping?.["presidente:BR"]?.[normNome(NOME_PUBLICADO)];
    afirma(!!entrada, `"${NOME_PUBLICADO}" não está em data/ballot-names.json (presidente:BR) — escolha outro nome que o registro reescreva`);
    afirma(normNome(entrada?.nome_urna ?? "") !== normNome(NOME_PUBLICADO),
      `o mapa não RENOMEIA "${NOME_PUBLICADO}" (nome_urna = ${entrada?.nome_urna}) — sem renomeação não há defasagem a provar`);
    // E o nome tem de estar mesmo no registro do TSE: é o registro que dá a
    // resposta, o mapa é só a materialização dela.
    const registrada = (agruparPorDisputa(lerCandidaturas()).get("presidente:BR") ?? [])
      .find((c) => c.sq_candidato === entrada?.sq_candidato);
    afirma(!!registrada && normNome(registrada.nome_urna) === normNome(entrada?.nome_urna ?? ""),
      `a candidatura ${entrada?.sq_candidato} não está em data/candidaturas.ndjson com o nome de urna ${entrada?.nome_urna}`);

    // Soma 79 como o `ELENCO` padrão (41+30+6+2), para `expect_sum` seguir vivo.
    const elenco = [
      { candidate: "Alfa Insercao", party: "PT", pct: 41 },
      { candidate: "Beta Insercao", party: "PL", pct: 30 },
      { candidate: "Gama Insercao", party: "PSD", pct: 6 },
      { candidate: NOME_PUBLICADO, party: entrada?.partido ?? "UP", pct: 2 },
    ];
    const spec = () => specDeTeste(dir, { poll: { results: structuredClone(elenco) } });
    const mapa = (nome, mapping) => {
      const f = path.join(dir, nome);
      fs.writeFileSync(f, JSON.stringify({ mapping }));
      return f;
    };
    const SEM = mapa("urna-antes.json", {});
    const COM = mapa("urna-depois.json", { [DISPUTA]: { [normNome(NOME_PUBLICADO)]: entrada } });

    // ⚠ ESTE CASO PRECISA DA CANONICALIZAÇÃO, e os outros não — por isso ela
    // aparece aqui e não no `construir` comum. É `canonicalizeCandidates` que
    // aplica o mapa de urna sobre `r.candidate` (o coletor a roda entre os
    // reparos e o store, linhas 410–414 de `scrape.mjs`), e é `r.candidate` que
    // semeia `question|…|<elenco canônico>`. Sem esta chamada o mapa não toca a
    // semente e o caso testaria um pipeline que não existe — foi exatamente o
    // que aconteceu na primeira versão dele, que passou verde por omitir a
    // etapa que causa a defasagem. `candidate_raw` é preso antes, como lá.
    const comoOColetor = (polls) => {
      for (const p of polls) for (const r of p.results ?? []) r.candidate_raw ??= r.candidate;
      return canonicalizeCandidates(polls);
    };
    // O nome EXIBIDO de cada linha vive na tabela de candidatos; `name_raw`
    // guarda de propósito a grafia publicada e não mudaria nem com o rename.
    const nomesDaPergunta = () => {
      const porId = new Map(ler(dir, "candidates").map((c) => [c.candidate_id, c.canonical]));
      return (presidencial(dir)[0]?.results ?? []).map((r) => porId.get(r.candidate_id) ?? r.name_raw);
    };

    try {
      // RODADA 1 — o casador ainda não viu estes nomes crus.
      usarRegistroDeUrna(SEM);
      const r1 = [irma()];
      afirma(applyRepairs(r1, opcoes(spec())).inserted.length === 1, "rodada 1 não inseriu");
      construir(comoOColetor(r1), D0);
      const q1 = presidencial(dir)[0] ?? {};
      afirma(nomesDaPergunta().includes(NOME_PUBLICADO),
        `a rodada 1 já renomeou o elenco (${nomesDaPergunta().join(", ")}) — a defasagem que este caso descreve não existe mais`);
      afirma(q1.provenance?.created_at === D0, `created_at da rodada 1 = ${q1.provenance?.created_at}, esperado ${D0}`);

      // RODADA 2 — o mapa que a rodada 1 gerou entra em vigor. A pergunta se MOVE.
      usarRegistroDeUrna(COM);
      const r2 = [irma()];
      afirma(applyRepairs(r2, opcoes(spec())).inserted.length === 1,
        "rodada 2 não inseriu — a fonte continua apagando o bloco, a inserção tinha de repetir");
      construir(comoOColetor(r2), D1);
      const q2 = presidencial(dir)[0] ?? {};
      afirma(presidencial(dir).length === 1, `${presidencial(dir).length} perguntas presidenciais na rodada 2, esperado 1`);
      afirma(nomesDaPergunta().includes(entrada?.nome_urna),
        `a rodada 2 não aplicou o nome de urna: ${nomesDaPergunta().join(", ")}`);
      afirma(q2.question_id !== q1.question_id,
        `o question_id NÃO se moveu (${q1.question_id}) — se a inserção passou a convergir na rodada 1, é este caso e o HANDOFF §5 que estão desatualizados`);
      afirma(q2.provenance?.created_at === D1,
        `created_at da rodada 2 = ${q2.provenance?.created_at}, esperado ${D1} — o carimbo do dia da inserção se perde com o id`);
      // O LEVANTAMENTO NÃO SE MOVE: a semente dele é o registro do TSE, não o
      // elenco. Quem paga a recunhagem é só a pergunta.
      afirma(ler(dir, "surveys").length === 1, `${ler(dir, "surveys").length} levantamentos na rodada 2, esperado 1`);
      afirma(q2.survey_id === q1.survey_id,
        `o levantamento também se moveu (${q1.survey_id} → ${q2.survey_id}) — a defasagem estaria partindo a operação de campo`);
      const depoisDa2 = fs.readFileSync(path.join(dir, "questions.ndjson"), "utf-8");

      // RODADA 3 — mesmo mapa, mesma entrada: agora sim, ponto fixo.
      const r3 = [irma()];
      afirma(applyRepairs(r3, opcoes(spec())).inserted.length === 1, "rodada 3 não inseriu");
      construir(comoOColetor(r3), "2026-08-24");
      const q3 = presidencial(dir)[0] ?? {};
      afirma(q3.question_id === q2.question_id,
        `o question_id se moveu DE NOVO (${q2.question_id} → ${q3.question_id}) — não converge em uma rodada extra`);
      afirma(q3.provenance?.created_at === D1, `created_at da rodada 3 = ${q3.provenance?.created_at}, esperado ${D1}`);
      afirma(fs.readFileSync(path.join(dir, "questions.ndjson"), "utf-8") === depoisDa2,
        "a 3ª rodada reescreveu questions.ndjson — a inserção não estabiliza depois da rodada extra");
    } finally {
      // O mapa real de volta: as caixas seguintes desta bateria (e as duas
      // rodadas mutiladas do `--self-test`) leem o arquivo de verdade.
      usarRegistroDeUrna();
    }
  });

  caso("NÃO insere de novo quando a pesquisa já voltou pela lista", ({ dir, construir, afirma, opcoes }) => {
    // O CENÁRIO DO FALLBACK DE FONTE. Quando o Poder360 falha, `runSource`
    // devolve `previous.polls.filter(p => p.source === name)` — as linhas
    // PROJETADAS de polls.json —, então a lista da rodada seguinte PODE já
    // conter a pesquisa que a inserção criou, agora com a fonte que a projeção
    // lhe dá. Se a cláusula não a reconhecer aí, cada rodada em que a fonte
    // falhar acrescenta uma cópia, e a média conta a mesma amostra duas vezes.
    //
    // ⚠ ESTE CASO NÃO AFIRMA IDENTIDADE DE BYTES, e a razão é um defeito
    // PRÉ-EXISTENTE deste caminho que `add_poll` não causa nem conserta:
    // `nativeOf()` em `build-store.mjs` só reconhece ids `p360-`, e a projeção
    // rotula toda pergunta com a fonte do PRIMEIRO source_ref do levantamento.
    // Logo qualquer pergunta cujo `legacy_id` não seja `p360-` volta como
    // "poder360" sem id nativo, é ordenada ANTES das linhas `p360-` (a
    // desempate final é o id em ordem lexicográfica) e faz `resolveSurvey`
    // cunhar `survey|reg|…` onde a rodada anterior tinha `survey|ref|…` — o
    // levantamento inteiro troca de id. Reproduzido com uma linha de estilo
    // Wikipédia, sem nenhuma inserção curada envolvida; o banco tem o caso real
    // em `s_b2fab1fde077`, cujo `legacy_ids` traz `da12282799ca` ao lado de
    // `p360-13239-1-0-fc7ac279c84e`. O que este caso cobra é o que a inserção
    // responde por: não inserir de novo, e não abrir uma segunda pergunta.
    const rodada1 = [irma()];
    applyRepairs(rodada1, opcoes(specDeTeste(dir)));
    const { store: s1 } = construir(rodada1, D0);

    const devolta = projectPolls(s1).filter((p) => p.race === "presidente");
    afirma(devolta.length === 1, `a projeção devolveu ${devolta.length} presidenciais, esperado 1`);
    const rodada2 = [irma(), ...devolta];
    const rel2 = applyRepairs(rodada2, opcoes(specDeTeste(dir)));
    afirma(rel2.inserted.length === 0, `inseriu de novo (${rel2.inserted.length}) sobre uma lista que já tinha a pesquisa`);
    afirma(rel2.noop.length === 1, `noop = ${rel2.noop.length}, esperado 1`);
    afirma(rodada2.length === 2, `a lista ficou com ${rodada2.length} pesquisas, esperado 2 — a operação de campo foi duplicada`);
    afirma(rodada2.filter((p) => p.race === "presidente").length === 1,
      "duas presidenciais na mesma operação de campo depois da 2ª rodada");
    construir(rodada2, D1);
    afirma(presidencial(dir).length === 1, `${presidencial(dir).length} perguntas presidenciais no store, esperado 1`);
  });

  caso("a pesquisa REAL, quando a fonte sarar, ocupa a MESMA pergunta", ({ dir, construir, afirma, opcoes }) => {
    // O requisito de não DESLOCAR: a semente da pergunta é
    // `question|<survey_id>|<race>|<round>|<ordinal>|<elenco canônico>`, e a do
    // levantamento sai do registro do TSE — nenhuma das duas contém o id da
    // pesquisa. Então a linha real, chegando com o mesmo elenco, cai na MESMA
    // pergunta que a inserida ocupava, herdando `created_at`. Se em vez disso
    // ela cunhasse uma pergunta nova, a antiga ficaria órfã e a inserção teria
    // roubado o lugar da pesquisa de verdade.
    const rodada1 = [irma()];
    applyRepairs(rodada1, opcoes(specDeTeste(dir)));
    construir(rodada1, D0);
    const antes = presidencial(dir)[0] ?? {};
    afirma(!!antes.question_id, "a rodada 1 não gravou a pergunta inserida");

    const rodada2 = [irma(), daFonte()];
    const rel2 = applyRepairs(rodada2, opcoes(specDeTeste(dir)));
    afirma(rel2.inserted.length === 0, `a fonte sarou e a inserção disparou assim mesmo (${rel2.inserted.length})`);
    construir(rodada2, D1);
    const qs = presidencial(dir);
    afirma(qs.length === 1, `${qs.length} perguntas presidenciais, esperado 1 — a pesquisa real virou uma segunda`);
    const depois = qs[0] ?? {};
    afirma(depois.question_id === antes.question_id,
      `question_id mudou (${antes.question_id} → ${depois.question_id}) — a pergunta curada ficou órfã`);
    afirma(depois.provenance?.created_at === D0,
      `created_at virou ${depois.provenance?.created_at}, esperado ${D0}`);
    afirma(ler(dir, "surveys").length === 1, `${ler(dir, "surveys").length} levantamentos, esperado 1`);
  });

  // ======================================================================
  // C. AS RECUSAS
  // ======================================================================

  caso("RECUSA sem fonte primária citada", ({ dir, afirma, opcoes }) => {
    // A barra probatória é a mesma de todo reparo do arquivo, e para `add_poll`
    // ela é mais grave: o reparo comum corrige um número num registro que a
    // fonte publicou; este CRIA o registro. Sem citação, é invenção.
    for (const campo of ["source", "evidence", "verified_at"]) {
      const polls = [irma()];
      const rel = applyRepairs(polls, opcoes(specDeTeste(dir, { [campo]: undefined })));
      afirma(rel.inserted.length === 0, `inseriu sem "${campo}"`);
      afirma(polls.length === 1, `a lista cresceu sem "${campo}"`);
      afirma(rel.warnings.some((w) => /RECUSADO/.test(w) && w.includes(campo)),
        `a recusa por falta de "${campo}" não foi dita em voz alta: ${rel.warnings.join(" | ")}`);
    }
  });

  caso("RECUSA quando a pesquisa não satisfaz a própria cláusula", ({ dir, afirma, opcoes }) => {
    // Sem esta trava, "nenhum alvo casou" deixa de significar "ainda não
    // existe": uma cláusula que descreva OUTRA pesquisa nunca casaria, e a
    // inserção aconteceria de novo em toda rodada. A idempotência do §8 seria
    // uma coincidência, não uma propriedade.
    const polls = [irma()];
    const rel = applyRepairs(polls, opcoes(specDeTeste(dir, {
      match: { ...CLAUSULA, fieldwork_end: "2026-07-22" }, // a cláusula diz 22/07; a pesquisa é de 30/07
    })));
    afirma(rel.inserted.length === 0, `inseriu com cláusula que não descreve a pesquisa (${rel.inserted.length})`);
    afirma(polls.length === 1, `${polls.length} pesquisas na lista, esperado 1`);
    afirma(rel.warnings.some((w) => /RECUSADO/.test(w) && /cláusula match/.test(w)),
      `a recusa não nomeia o motivo: ${rel.warnings.join(" | ")}`);
  });

  caso("RECUSA um quase-igual na janela de 3 dias", ({ dir, afirma, opcoes }) => {
    // `matches()` compara `fieldwork_end` por igualdade exata. Se a fonte passar
    // a servir a MESMA operação de campo datada um dia adiante, o alvo não casa
    // e o duplicado entraria — e duplicar uma operação de campo conta a mesma
    // amostra duas vezes na média. A janela é a mesma "uma operação de campo =
    // um levantamento" de `resolveSurvey` e de `datesClose`: derivada, não
    // escolhida (§10). Ambíguo recusa e loga, nunca escolhe (§4).
    const polls = [irma(), daFonte({ id: "p360-900003-1-0-cccccccccccc", fieldwork_end: "2026-07-31", published_date: "2026-07-31" })];
    const rel = applyRepairs(polls, opcoes(specDeTeste(dir)));
    afirma(rel.inserted.length === 0, `inseriu ao lado de um quase-igual (${rel.inserted.length})`);
    afirma(polls.length === 2, `${polls.length} pesquisas na lista, esperado 2`);
    afirma(rel.warnings.some((w) => /RECUSADO/.test(w) && /janela de 3 dias/.test(w)),
      `a recusa não explica a ambiguidade: ${rel.warnings.join(" | ")}`);
  });

  // ⚠ O PAR QUE O CONSERTO DO `mesmaOperacao` EXIGE (§2): a recusa de quase-igual
  //   passou a ser DOIS testes — "mesma operação de campo?" E "mesma pergunta?".
  //   Sozinho, o teste de operação recusava o segundo confronto de uma pesquisa
  //   que já tinha o primeiro, e foi o que deixou de fora os três confrontos da
  //   AtlasIntel. Os dois casos abaixo provam os DOIS lados: admite o confronto
  //   distinto E continua recusando o mesmo confronto em data derivada. Um sem o
  //   outro não vale — o primeiro sozinho passaria com o guarda desligado.
  const CONFRONTO = (a, b, over = {}) => ({
    id: `p360-90000${over.n ?? 4}-2-0-dddddddddddd`, source: "poder360",
    pollster: INSTITUTO, race: "presidente", state: "PE", round: 2,
    scenario: "2º turno", source_url: "https://exemplo/materia",
    fieldwork_start: "2026-07-28", fieldwork_end: "2026-07-31", published_date: "2026-07-31",
    sample_size: 1022, margin_of_error: 3, tse_registration: REGISTRO,
    results: [{ candidate: a, party: "PT", pct: 55 }, { candidate: b, party: "PL", pct: 40 }],
    others_pct: null, undecided_pct: 3, blank_null_pct: 2,
    ...over,
  });
  const SEGUNDO_TURNO = {
    match: { pollster: INSTITUTO, race: "presidente", state: "PE", round: 2, fieldwork_end: FIM },
    poll: {
      round: 2, scenario: "2º turno", fieldwork_end: FIM, published_date: FIM,
      results: [{ candidate: "Alfa Insercao", party: "PT", pct: 55 }, { candidate: "Beta Insercao", party: "PL", pct: 40 }],
      others_pct: null, undecided_pct: 3, blank_null_pct: 2,
    },
  };

  caso("ADMITE um confronto DISTINTO da mesma operação de campo", ({ dir, afirma, opcoes }) => {
    // Alfa × Gama já está na lista, na janela de 3 dias e fora da cláusula match.
    // O reparo insere Alfa × Beta: MESMA operação, PERGUNTA diferente — os dois
    // pares compartilham exatamente UM nome, que é o caso da AtlasIntel e o que
    // torna o fixture não-degenerado (dois pares iguais provariam outra coisa).
    const polls = [irma(), CONFRONTO("Alfa Insercao", "Gama Insercao")];
    const rel = applyRepairs(polls, opcoes(specDeTeste(dir, SEGUNDO_TURNO)));
    afirma(rel.inserted.length === 1, `o confronto distinto tinha de entrar (inseridos: ${rel.inserted.length}; avisos: ${rel.warnings.join(" | ")})`);
    afirma(polls.length === 3, `${polls.length} pesquisas na lista, esperado 3`);
    afirma(!rel.warnings.some((w) => /janela de 3 dias/.test(w)), `não podia recusar por vizinho: ${rel.warnings.join(" | ")}`);
  });

  caso("RECUSA o MESMO confronto em data derivada", ({ dir, afirma, opcoes }) => {
    // O contrafactual do caso acima, e a metade que impede o conserto de virar
    // um buraco: Alfa × Beta já está na lista com a data um dia adiante. Mesma
    // operação E mesma pergunta ⇒ duplicata, e duplicar conta a mesma amostra
    // duas vezes na média. Tem de recusar, como antes do conserto.
    const polls = [irma(), CONFRONTO("Alfa Insercao", "Beta Insercao")];
    const rel = applyRepairs(polls, opcoes(specDeTeste(dir, SEGUNDO_TURNO)));
    afirma(rel.inserted.length === 0, `inseriu o mesmo confronto duas vezes (${rel.inserted.length})`);
    afirma(polls.length === 2, `${polls.length} pesquisas na lista, esperado 2`);
    afirma(rel.warnings.some((w) => /RECUSADO/.test(w) && /janela de 3 dias/.test(w)),
      `a recusa não explica a ambiguidade: ${rel.warnings.join(" | ")}`);
  });

  caso("RECUSA add_poll misturado com ações de correção", ({ dir, afirma, opcoes }) => {
    // Misturar deixaria ambíguo se a correção se aplica à pesquisa inserida ou
    // às que a cláusula casou. Ambiguidade se recusa, não se resolve por
    // convenção tácita (§4).
    const polls = [irma()];
    const rel = applyRepairs(polls, opcoes(specDeTeste(dir, { set: { sample_size: 1200 } })));
    afirma(rel.inserted.length === 0, `inseriu uma entrada que mistura ações (${rel.inserted.length})`);
    afirma(polls.length === 1, `${polls.length} pesquisas na lista, esperado 1`);
    afirma(rel.warnings.some((w) => /RECUSADO/.test(w) && /insere OU corrige/.test(w)),
      `a recusa não nomeia o motivo: ${rel.warnings.join(" | ")}`);
  });

  // ======================================================================
  // D. A FOLGA DA SOMA É DERIVADA (§10) — nas duas direções
  // ======================================================================
  //
  // O `conferirSoma` cravava 0,6 fixo, e um teto escolhido erra dos dois
  // lados: numa tabela em décimos a folga merecida é 0,05 por figura, então o
  // 0,6 engolia meio ponto de dígito trocado — o erro MAIS provável numa
  // transcrição à mão; numa tabela em inteiros ele gritava contra
  // arredondamento legítimo (a PE de 58+33+8+2 = 101 merece 2,0 de folga).
  // Os dois casos abaixo REPROVAM contra o 0,6 fixo, um por cada direção —
  // sem eles, reintroduzir o teto passaria a bateria inteira em verde.
  //
  // Caminho de correção, não de inserção, de propósito: a conferência de soma
  // roda mesmo num casamento no-op, e assim as mutações do autoteste (que
  // mutilam só a DECISÃO DE INSERIR) não alcançam estes casos.

  const specSoma = (dir, expect_sum) => {
    const f = path.join(dir, "reparo-soma.json");
    fs.writeFileSync(f, JSON.stringify({
      version: 1,
      repairs: [{
        match: CLAUSULA,
        defect: "só a conferência de soma — reparo deliberadamente sem ação",
        source: "https://exemplo/relatorio-do-instituto.pdf",
        evidence: "p.8, total impresso pelo instituto",
        verified_at: "2026-08-18",
        expect_sum,
      }],
    }, null, 1));
    return f;
  };

  caso("AVISA meio ponto de sobra numa tabela em décimos (o 0,6 fixo engolia)", ({ dir, afirma, opcoes }) => {
    // 41,3+30,2+6,1+2,4 + indecisos 9,3 + branco 11,2 = 100,5 contra esperada
    // 100. Seis figuras em décimos merecem 0,30 de folga — meio ponto é dígito
    // trocado, não arredondamento.
    const polls = [daFonte({
      results: [
        { candidate: "Alfa Insercao", party: "PT", pct: 41.3 },
        { candidate: "Beta Insercao", party: "PL", pct: 30.2 },
        { candidate: "Gama Insercao", party: "PSD", pct: 6.1 },
        { candidate: "Delta Insercao", party: "Novo", pct: 2.4 },
      ],
      undecided_pct: 9.3, blank_null_pct: 11.2,
    })];
    const rel = applyRepairs(polls, opcoes(specSoma(dir, 100)));
    afirma(!rel.unmatched.length, `o reparo ficou órfão: ${rel.unmatched.join(" | ")}`);
    afirma(rel.warnings.some((w) => /soma 100.5/.test(w) && /folga derivada 0.30/.test(w)),
      `soma 100,5 ≠ 100 em tabela de décimos passou calada (avisos: ${rel.warnings.join(" | ") || "nenhum"})`);
  });

  caso("NÃO avisa arredondamento de inteiros dentro da folga merecida (o 0,6 fixo gritava)", ({ dir, afirma, opcoes }) => {
    // O elenco padrão soma 100 em seis figuras inteiras — 3,0 de folga
    // merecida. Esperada 102 é a sobra da PE (58+33+8+2 = 101 contra 100):
    // arredondamento da fonte, não defeito.
    const polls = [daFonte()];
    const rel = applyRepairs(polls, opcoes(specSoma(dir, 102)));
    afirma(!rel.unmatched.length, `o reparo ficou órfão: ${rel.unmatched.join(" | ")}`);
    afirma(!rel.warnings.some((w) => /soma/.test(w)),
      `arredondamento legítimo de inteiros virou aviso: ${rel.warnings.filter((w) => /soma/.test(w)).join(" | ")}`);
  });

  // ======================================================================
  // E. O ARQUIVO CURADO DE VERDADE
  // ======================================================================

  caso("todo add_poll de data/repairs.json passa pela barra probatória", ({ dir, afirma }) => {
    // Os casos acima provam o MECANISMO com fixtures; este confere o DADO. Um
    // `add_poll` escrito sem citação, ou com uma cláusula que não descreve a
    // própria pesquisa, seria recusado em silêncio na rodada e a disputa
    // continuaria ausente do banco — a falha que não se vê, porque a ausência de
    // uma pesquisa não dispara validador nenhum. Aqui ela reprova.
    //
    // ⚠ RODA O ARQUIVO REAL COM A DECISÃO REAL, sem a mutação injetada: mutilar
    // a decisão aqui só provaria de novo o que os casos de fixture já provam, e
    // o que esta linha existe para conferir é o CONTEÚDO de `data/repairs.json`.
    // A prova de que a afirmação pode falhar está logo abaixo, no controle
    // negativo (CONVENTIONS §2 — um verde que ninguém testou não é evidência).
    const arquivoReal = path.join(RAIZ, "data", "repairs.json");
    const spec = JSON.parse(fs.readFileSync(arquivoReal, "utf-8"));
    const entradas = (spec.repairs ?? []).filter((r) => r.add_poll);
    afirma(entradas.length > 0, "nenhuma entrada add_poll em data/repairs.json — o guarda não está conferindo nada");

    // Contra uma lista VAZIA: sem alvo e sem vizinho, a única razão para uma
    // entrada não inserir é ela estar mal escrita.
    const rel = applyRepairs([], { file: arquivoReal });
    afirma(!rel.warnings.some((w) => /RECUSADO/.test(w)),
      `recusas em data/repairs.json: ${rel.warnings.filter((w) => /RECUSADO/.test(w)).join(" | ")}`);
    for (const rep of entradas) {
      const a = rep.add_poll;
      const rotulo = `${a.pollster} ${a.race}/${a.state ?? "BR"} ${a.fieldwork_end}`;
      afirma(rel.inserted.some((s) => s.includes(a.pollster) && s.includes(String(a.fieldwork_end))),
        `${rotulo} não entrou numa lista vazia — entrada mal escrita`);
      // A soma esperada tem de fechar. Uma pesquisa transcrita à mão é onde um
      // dígito trocado é MAIS provável, e foi um `expect_sum` que ninguém leu
      // que deixou a Vox presidencial ir ao ar com 101,2%.
      afirma(!rel.warnings.some((w) => /soma/.test(w) && w.includes(rotulo.split(" ")[0])),
        `soma divergente em ${rotulo}: ${rel.warnings.filter((w) => /soma/.test(w)).join(" | ")}`);
    }
    afirma(rel.inserted.length === entradas.length,
      `${rel.inserted.length} inserções para ${entradas.length} entradas add_poll do arquivo`);

    // CONTROLE NEGATIVO: a MESMA entrada real, com a citação arrancada, tem de
    // ser recusada. Sem isto, "o arquivo real passa" poderia significar apenas
    // que esta checagem não sabe reprovar nada.
    const mutilado = path.join(dir, "repairs-sem-fonte.json");
    fs.writeFileSync(mutilado, JSON.stringify({
      version: 1,
      repairs: entradas.map((r) => ({ ...r, source: undefined })),
    }));
    const relMutilado = applyRepairs([], { file: mutilado });
    afirma(relMutilado.inserted.length === 0,
      `${relMutilado.inserted.length} entrada(s) real(is) inseridas mesmo sem "source" — a barra probatória não está sendo cobrada`);
    afirma(relMutilado.warnings.filter((w) => /RECUSADO/.test(w)).length === entradas.length,
      `${relMutilado.warnings.filter((w) => /RECUSADO/.test(w)).length} recusas para ${entradas.length} entradas sem fonte`);
  });

  return { ok, falhas };
}

// ------------------------------------------------------------------- saída
if (process.argv.includes("--self-test")) {
  // CADA MUTAÇÃO TEM DE DERRUBAR A SUA METADE. Exigir apenas "alguma falha"
  // deixaria passar uma bateria que só sabe reprovar por um dos lados — e é o
  // lado "não insere" que impede a duplicação de uma operação de campo.
  const esperado = {
    nunca: [
      "insere a pesquisa ausente e ela atravessa o pipeline inteiro",
      "a pesquisa inserida se declara CURADA, não coletada",
      "a inserção é PONTO FIXO COM O MAPA DE URNA PARADO: duas datas, a mesma entrada, o mesmo arquivo",
      "a inserção converge em DUAS rodadas quando estreia um nome de urna: move uma vez, depois fica",
      "a pesquisa REAL, quando a fonte sarar, ocupa a MESMA pergunta",
      // Afirma que a inserção ACONTECE, então quem a derruba é a mutação que
      // nunca insere. Sem estar aqui, ela passaria a ser cobertura incidental:
      // continuaria verde no dia em que o segundo teste da recusa fosse
      // desligado e voltasse a barrar o confronto distinto.
      "ADMITE um confronto DISTINTO da mesma operação de campo",
      // "todo add_poll de data/repairs.json…" NÃO entra em nenhuma das duas
      // listas de propósito: ele roda a decisão REAL (ver a nota no caso) e
      // prova a própria capacidade de reprovar pelo controle negativo interno.
    ],
    sempre: [
      "NÃO insere quando a fonte volta a servir a pesquisa",
      "NÃO insere de novo quando a pesquisa já voltou pela lista",
      "RECUSA sem fonte primária citada",
      "RECUSA quando a pesquisa não satisfaz a própria cláusula",
      "RECUSA um quase-igual na janela de 3 dias",
      // A outra metade do par: afirma que a inserção NÃO acontece, então cai
      // pela mutação que sempre insere. É ela que impede o conserto do
      // `mesmaOperacao` de virar buraco — sem esta, admitir confronto distinto
      // e admitir duplicata ficariam indistinguíveis.
      "RECUSA o MESMO confronto em data derivada",
      "RECUSA add_poll misturado com ações de correção",
    ],
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
    console.log(`autoteste (${modo}): a bateria REPROVA ${falhas.length} caso(s) quando a inserção é mutilada`);
    for (const n of falhas) console.log(`  detectado → ${n}`);
  }
  process.exit(ok ? 0 : 1);
}

const { ok, falhas } = rodar();
console.log(`\n${ok} passaram · ${falhas.length} falharam`);
if (falhas.length) {
  console.error("INSERÇÃO CURADA FALHOU — a disputa que a fonte apaga por inteiro não está guardada.");
  process.exit(1);
}
console.log("INSERÇÃO CURADA OK — insere o que a fonte apagou, não duplica quando ela volta, e recusa sem fonte citada.");
