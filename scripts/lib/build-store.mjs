// Build the store from a flat poll list, through the RESOLUTION LADDER.
//
// This is the Phase-3 write path: the scraper calls it, and so does
// `idempotence-check.mjs`. It lives here rather than inside `scrape.mjs`
// precisely so there is ONE implementation. The alternative — the scraper
// doing it inline and the guard driving `migrate-to-store.mjs` — would leave
// the guard proving a property of code the pipeline no longer runs, which is
// the shape of defect this repo keeps finding (a battery that never tested
// path resolvability; a cross-check that TypeError'd and reported agreement).
//
// THE STORE IS REBUILT FROM SCRATCH, never accumulated. That is what keeps the
// output a pure function of the scrape: a record that disappears from the
// sources disappears here, and re-running over the same input gives the same
// file byte for byte. `priorStamps` carries forward the "first seen" dates,
// which are the only thing that cannot be re-derived from the input.
//
// It carries them BY ID, so it carries nothing across a change to how ids are
// minted. On the switchover run itself (2026-08-16) not one survey or question
// id survived, so every `created_at` was reset to that day and the earlier
// first-seen history was lost — the claim above held for every run except the
// one that changed the id space. That is a one-time cost of switching paths,
// not a recurring one, and `idempotence-check.mjs` is what proves it does not
// recur. Anything that re-seeds an id pays it again.
//
// ORDER MATTERS. Upsert is first-writer-wins, so ingestion follows source
// priority (poder360 → eleicaoemdados → wikipedia). Parallelising it silently
// changes which source wins a disagreement.
import fs from "node:fs";
import path from "node:path";
import {
  readStore, writeStore, markHeadlines, priorStamps, emptyIndexes,
  seedRegisteredPeople, logConflict, DATA_DIR, SOURCE_ORDER, TABLE_NAMES,
  PEOPLE_SCHEMA_VERSION, questionRostersMatch,
} from "./store.mjs";
import { upsertPoll } from "./upsert.mjs";
import { identityConflicts } from "./candidates.mjs";
import { retainRicherRosters } from "./roster.mjs";
import { nameKey } from "./ids.mjs";
import { normNome } from "./nomes.mjs";
import { pollsterTokens } from "./canonicalize.mjs";

// A lista mora em `store.mjs`. Ela existia copiada aqui, em
// `migrate-to-store.mjs` e em `idempotence-check.mjs` — e o defeito recorrente
// deste repositório é a lista que alguém esqueceu de atualizar.
const TABLES = TABLE_NAMES;

/**
 * @param {Array} polls  normalised flat polls, as `scrape.mjs` produces them
 * @param {{runDate: string, dir?: string, meta?: object, reterElencos?: Function}} opts
 * @returns {{store: object, report: object}}  the store, UNWRITTEN
 *
 * `reterElencos` é injetável por UM motivo só: `roster-retention-check.mjs`
 * precisa provar que ele mesmo REPROVA quando a retenção quebra, e a única
 * maneira honesta de fazer isso é rodar o pipeline de verdade com a retenção
 * mutilada. Um autoteste que chamasse a retenção direto provaria uma
 * propriedade de código que o coletor não executa — o padrão que CONVENTIONS §2
 * nomeia. Em produção o parâmetro nunca é passado.
 */
export function buildStoreFromPolls(polls, {
  runDate, dir = DATA_DIR, meta = {}, reterElencos = retainRicherRosters,
} = {}) {
  const previous = readStore({ dir });
  const prior = priorStamps(previous);
  const store = readStore({ dir, tables: [], runDate, prior });
  for (const t of TABLES) store[t] = [];
  store._indexes = emptyIndexes();

  // O CADASTRO DE PESSOAS ANTES DA PRIMEIRA PESQUISA.
  //
  // As 519 pessoas do registro do TSE entram independentemente de terem sido
  // medidas: a tabela é o cadastro de PESSOAS, e é ela que dá alvo a uma ruling
  // e à junção com as fotos quando o DivulgaCand publicar. Semear antes também
  // tira a ordem de chegada da conta para essas 519 linhas.
  seedRegisteredPeople(store);

  // O GRUPO CURADO QUE O REGISTRO CONTRADIZ, uma linha por rodada.
  //
  // `lib/candidates.mjs` RECUSA resolver um grupo cujos membros carregam mais de
  // um `nome_urna` distinto: a curadoria diz "uma pessoa", o TSE diz "duas", e
  // escolher um dos lados seria inventar (CONVENTIONS §4). A recusa mantém o
  // comportamento anterior para aquele grupo — o que, sozinho, é silêncio, e
  // silêncio não é sucesso (CONVENTIONS §2). Aqui ela vira uma linha que um
  // humano vê, porque só o criador desfaz uma decisão curada.
  for (const c of identityConflicts()) {
    logConflict(store, {
      run_id: runDate, type: "grupo_curado_contradito", table: "candidates",
      record_id: `${c.contest}|${c.display}`, field: "canonical",
      stored: c.members, incoming: c.nomes_urna,
      source: "candidate-aliases", severity: "review",
      note: `grupo curado declara ${c.members.length} grafia(s) como UMA pessoa, e o registro ` +
        `do TSE devolve ${c.nomes_urna.length} nomes de urna distintos — contradição, ` +
        "grupo NÃO dobrado sob o nome de urna (decisão do criador)",
    });
  }

  const rank = (s) => { const i = SOURCE_ORDER.indexOf(s); return i === -1 ? SOURCE_ORDER.length : i; };
  const ordered = [...polls].sort((a, b) =>
    rank(a.source) - rank(b.source) ||
    (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? "") ||
    String(a.id).localeCompare(String(b.id)));

  const nativeOf = (p) => /^p360-(\d+)-/.exec(p.id ?? "")?.[1] ?? null;
  const report = {};
  // A pergunta que cada poll RESOLVEU nesta rodada — para `ligarAbsorvidos`
  // achar o vencedor do colapso sem re-resolver (e sem depender de `legacy_id`,
  // que só o PRIMEIRO escritor da pergunta grava).
  const perguntaDe = new Map();
  for (const p of ordered) {
    const { question, matched_by } = upsertPoll(store, p, { source: p.source, runId: runDate, nativeId: nativeOf(p) });
    perguntaDe.set(p, question);
    report[matched_by] = (report[matched_by] ?? 0) + 1;
  }
  ligarAbsorvidos(store, previous, ordered, perguntaDe);
  // A RETENÇÃO ANTES DA MANCHETE, e a ordem não é arbitrária: `markHeadlines`
  // promove a pergunta de ELENCO MAIS CHEIO, então decidir a manchete sobre uma
  // tabela que a fonte truncou promoveria o cenário errado e publicaria o
  // truncado. Ver `scripts/lib/roster.mjs`.
  reterElencos(store, previous, runDate);
  markHeadlines(store);
  // A PESSOA PRIMEIRO, a linha que a cita depois. As três traduções são
  // independentes (cada uma casa a sua tabela contra a anterior), mas a ordem
  // que se lê é a da identidade → a linha, e é assim que ela fica escrita. O
  // instituto entra junto porque a sua ausência aqui era a MESMA perda
  // silenciosa: ver `translateInstituteStamps`.
  translateInstituteStamps(store, previous, runDate);
  translatePersonStamps(store, previous, runDate);
  translateCandidateStamps(store, previous, runDate);
  settleProvenance(store, previous, runDate);
  // A VERSÃO É A PROMESSA QUE O VALIDADOR COBRA. Este caminho cunha pessoas,
  // então o store que sai daqui DECLARA a camada — e `validate-store.mjs`
  // reprova um store que a declare e venha com `people` vazio, em vez de
  // desculpá-lo por a tabela ainda não existir. Ver PEOPLE_SCHEMA_VERSION.
  //
  // ⚠ A DECLARAÇÃO VEM DEPOIS DO ESPALHAMENTO, e já veio antes. Com
  // `{ schema_version: …, ...meta }` um chamador que passasse `schema_version`
  // em `meta` sobrescrevia em silêncio a própria promessa deste caminho — e
  // `schema_version` é o que LIGA as onze checagens de identidade do validador.
  // Um `meta` inocente desligaria o guarda sem uma linha de aviso. A precedência
  // agora é a que a frase acima descreve: quem cunha pessoas declara a camada, e
  // nenhum chamador rebaixa isso.
  store.meta = { ...meta, schema_version: PEOPLE_SCHEMA_VERSION };
  return { store, report };
}

/**
 * A LINHAGEM DO COLAPSO DE CENÁRIO vira sucessão PROVADA para o guarda de delta.
 *
 * `keepFullestRound1` (scrape.mjs) mantém, por (marca, disputa, UF, turno,
 * data), só o cenário de 1º turno mais cheio e grava em `absorvidos` do
 * vencedor os cenários que engoliu. O perdedor não é publicado — o funil sempre
 * foi assim — mas a PERGUNTA que ele tinha no commit anterior some do store
 * reconstruído, e `disputa-delta-check` lia isso como "perda sem prova".
 * Medido em 13/09/2026: presidente:BR 1422 → 1199, 185 sem prova — a
 * quarentena congelava a corrida presidencial inteira no commit anterior TODA
 * rodada (o baseline congelado ainda tinha os cenários; a coleta fresca os
 * colapsava; o guarda re-congelava), auto-perpetuando desde ~30/08 e jogando
 * fora a coleta fresca — inclusive a pesquisa nacional nova que a fonte trazia.
 *
 * Aqui, com o store ANTERIOR na mão (o mesmo padrão de `reterElencos` e das
 * traduções de carimbo): para cada vencedor, cada perdedor é procurado entre as
 * perguntas anteriores do MESMO levantamento — por `legacy_id` (o `poll.id` que
 * a cunhagem grava; exato) e, faltando, por elenco POR NOME (`questionRostersMatch`
 * no caminho de nomes: o perdedor não passa por `resolveCandidate`, de propósito,
 * para não cunhar candidato fantasma de uma tabela que não é publicada). O
 * `question_id` comitado do perdedor entra em `legacy_ids` do vencedor, e
 * `acharSucessora` (lib/delta.mjs) o aceita como sucessão "gravada, não
 * inferida" — a via `legacy_ids`, que vale sozinha.
 *
 * ⚠ NÃO AFROUXA O GUARDA. Nenhum predicado do juiz muda: só passa a existir a
 * prova que faltava, gravada no ponto em que a decisão de colapsar é tomada. Um
 * cenário que a FONTE apaga inteiro (a classe `v2/cenarios`) não passa por aqui
 * — não foi colapsado por nós, não ganha linhagem, e segue reprovando como
 * antes. Perdedor sem pergunta anterior (estreia) não tem perda a provar e não
 * gera nada.
 *
 * O `legacy_ids` da rodada anterior VOLTA por id antes de tudo — a mesma lição
 * de `traduzirCarimbos`: o store é reconstruído do zero, e sem isto a linhagem
 * evaporaria na rodada seguinte, num diff que ora grava, ora apaga.
 */
export function ligarAbsorvidos(store, previous, polls, perguntaDe) {
  const anteriores = previous?.questions ?? [];
  const antPorId = new Map(anteriores.map((q) => [q.question_id, q]));
  // 0) A linhagem anterior volta por id — só onde existia; nada nasce vazio.
  for (const q of store.questions) {
    const ant = antPorId.get(q.question_id);
    if (ant?.legacy_ids?.length) q.legacy_ids = [...new Set([...(q.legacy_ids ?? []), ...ant.legacy_ids])].sort();
  }
  const antPorSurvey = new Map();
  for (const q of anteriores) {
    if (!antPorSurvey.has(q.survey_id)) antPorSurvey.set(q.survey_id, []);
    antPorSurvey.get(q.survey_id).push(q);
  }
  const nomesDe = (poll) => (poll.results ?? []).map((r) => r.candidate).filter(Boolean);
  let ligados = 0;
  for (const p of polls) {
    if (!p.absorvidos?.length) continue;
    const vencedora = perguntaDe.get(p);
    if (!vencedora) continue;
    // Só as irmãs que DE FATO sumiram: uma pergunta anterior que ainda existe
    // no store novo não foi colapsada (foi re-produzida pela coleta), e ligá-la
    // como "absorvida" seria linhagem falsa — inerte para o juiz (ele só consulta
    // sucessora de pergunta SUMIDA), mas errada no dado. `questionById` é o
    // índice do store novo.
    const irmas = (antPorSurvey.get(vencedora.survey_id) ?? [])
      .filter((q) => q.question_id !== vencedora.question_id && !store._indexes.questionById.has(q.question_id));
    for (const perdedor of p.absorvidos) {
      // O ID NATIVO É EXATO EM QUALQUER LEVANTAMENTO. `perdedor.id` é o id que a
      // fonte deu àquela tabela (`p360-<nativo>-…`, o pollId de rótulo da
      // Wikipédia) e `legacy_id` é esse mesmo id gravado na pergunta quando ela
      // foi cunhada — a igualdade não infere nada. E a pergunta anterior do
      // absorvido está, via de regra, em OUTRO levantamento: a linha da Wikipédia
      // cunhou um `survey|nat|…` semanas antes de o Poder360 chegar com o
      // `survey|ref|…` que a absorve (medido em 16/09/2026: AM, BA, PA, RJ, RN,
      // senador RJ/SP/PE). Restrita às irmãs do levantamento vencedor, a busca
      // exata não achava nada e a perda ficava "sem prova". O casamento por
      // ELENCO, que infere, segue restrito ao mesmo levantamento (o recorte de
      // `resolveQuestion`, pelas razões de senador:MT em lib/delta.mjs).
      const exata = perdedor.id != null
        ? anteriores.find((q) => q.legacy_id === perdedor.id && q.race === perdedor.race && q.round === perdedor.round
            && q.question_id !== vencedora.question_id && !store._indexes.questionById.has(q.question_id))
        : null;
      const nomes = nomesDe(perdedor);
      const anterior = exata ?? irmas.find((q) =>
        q.race === perdedor.race && q.round === perdedor.round &&
        questionRostersMatch(q.results, nomes.map((candidate) => ({ candidate })), nomes));
      if (!anterior) continue;
      const ja = new Set(vencedora.legacy_ids ?? []);
      if (ja.has(anterior.question_id)) continue;
      vencedora.legacy_ids = [...ja, anterior.question_id].sort();
      ligados++;
    }
  }
  if (ligados) {
    console.log(`linhagem de colapso/fusão: ${ligados} pergunta(s) anterior(es) ligada(s) em legacy_ids do registro sobrevivente`);
  }
  return ligados;
}

/**
 * O `first_seen` ATRAVESSA a re-cunhagem de id — a parte que foi pulada em
 * 16/08 e que custou `created_at` em 1.164 levantamentos e 2.961 perguntas.
 *
 * `priorStamps` carrega `first_seen` POR ID. Um id que muda de valor não acha
 * nada e leva `runDate` em silêncio: sem erro, sem conflito, sem nada no diff
 * que diga "isto não é uma data nova, é uma data perdida". Como esta mudança
 * re-cunha TODA a tabela de candidatos (a semente passou do nome para a
 * pessoa), ela pagaria o preço inteiro de novo.
 *
 * Então a tradução é feita aqui, com o store anterior na mão: cada linha antiga
 * cujo id sumiu é procurada entre as novas por qualquer CHAVE DE REENCONTRO que
 * as duas compartilhem. Casando exatamente uma, a data antiga volta e o id
 * antigo fica gravado em `legacy_ids` — do jeito que levantamento já faz — para
 * que a linhagem não dependa de alguém lembrar desta rodada.
 *
 * O QUE NÃO CASA VIRA CONFLITO, nunca silêncio. Uma linha antiga órfã é ou uma
 * pessoa que saiu dos dados (legítimo) ou uma tradução que falhou (defeito), e
 * as duas merecem ser vistas — foi a ausência exata desta linha de log que fez
 * a perda de 16/08 passar despercebida.
 *
 * ⚠ UMA REGRA, UMA IMPLEMENTAÇÃO (CONVENTIONS §5). Esta função era só de
 * candidato, e `people` — a tabela que o `candidate_id` passou a CITAR — não
 * tinha nenhuma das três proteções. A verificação independente achou: um
 * `person_id` que se movesse levava o `first_seen` junto sem log nenhum. Duplicar
 * o corpo para a segunda tabela era garantir que as duas divergissem na primeira
 * correção feita só de um lado, então o que varia entre elas é PARÂMETRO — a
 * chave de reencontro — e o resto é o mesmo código. Ver `translatePersonStamps`.
 */
function traduzirCarimbos(store, previous, runDate, {
  tabela, idField, chavesDe, tipoConflito, contador, orfaos, descrever,
}) {
  // ---- O `legacy_ids` DA RODADA ANTERIOR VOLTA ANTES DE QUALQUER TRADUÇÃO ----
  //
  // A linhagem EVAPORAVA na rodada seguinte, e o efeito era um diff de tabela
  // inteira a cada duas rodadas: a rodada N traduzia 1.080 ids e gravava
  // `legacy_ids` nas 1.080 linhas; na rodada N+1 nenhum id sumia, a tradução
  // abaixo não rodava, e como o store é RECONSTRUÍDO DO ZERO cada linha nascia
  // com `legacy_ids: []` — 1.080 linhas mudando de novo, agora perdendo a
  // linhagem em silêncio.
  //
  // `merged_into` (em `ensurePerson`) já é carregado do estado anterior pelo
  // mesmo motivo e com o mesmo argumento: reconstruir do zero significa que
  // TUDO que não se re-deriva da entrada tem de ser carregado explicitamente.
  // `legacy_ids` é registro histórico — "este id já se chamou assim" — e não
  // existe na entrada; ninguém pode re-derivá-lo depois que a tradução que o
  // produziu deixou de acontecer.
  //
  // A união é com o que a tradução desta rodada acrescentar, nunca a
  // substituição: um id pode ser recunhado mais de uma vez ao longo da vida e
  // cada salto pertence à linhagem.
  const anteriores = new Map((previous[tabela] ?? []).map((r) => [r[idField], r.legacy_ids ?? []]));
  for (const r of store[tabela] ?? []) {
    const herdados = anteriores.get(r[idField]);
    if (herdados?.length) r.legacy_ids = [...new Set([...(r.legacy_ids ?? []), ...herdados])].sort();
  }

  const novos = new Set((store[tabela] ?? []).map((r) => r[idField]));
  const antigos = (previous[tabela] ?? []).filter((r) => !novos.has(r[idField]));
  if (!antigos.length) return;

  // Chave de reencontro → linhas novas. Uma chave que aponte para mais de uma
  // linha nova é ambígua e NÃO decide nada: escolher uma seria inventar uma
  // procedência, que é o oposto do que CONVENTIONS §4 manda fazer.
  const porChave = new Map();
  for (const r of store[tabela] ?? []) {
    for (const k of chavesDe(r)) {
      if (!porChave.has(k)) porChave.set(k, new Set());
      porChave.get(k).add(r);
    }
  }

  // Ordem estável: a tradução escreve `legacy_ids`, que vai para o disco.
  for (const velho of [...antigos].sort((a, b) => (a[idField] < b[idField] ? -1 : 1))) {
    const alvos = new Set();
    for (const k of chavesDe(velho)) for (const r of porChave.get(k) ?? []) alvos.add(r);
    if (alvos.size === 1) {
      const novo = [...alvos][0];
      if (velho.first_seen) novo.first_seen = velho.first_seen;
      // A linhagem do id antigo viaja JUNTO com ele. Sem `...velho.legacy_ids` a
      // segunda recunhagem apagaria a primeira: A→B grava [A] em B, B→C gravaria
      // só [B] em C e A sumiria da história sem que nada reclamasse.
      novo.legacy_ids = [...new Set([...(novo.legacy_ids ?? []), ...(velho.legacy_ids ?? []), velho[idField]])].sort();
      store._report.translated[contador]++;
      continue;
    }
    store._report.translated[orfaos]++;
    logConflict(store, {
      run_id: runDate, type: tipoConflito, table: tabela,
      record_id: velho[idField], field: idField,
      stored: velho[idField], incoming: alvos.size ? [...alvos].map((r) => r[idField]).sort() : null,
      source: "build-store", severity: "review",
      note: alvos.size
        ? `id antigo compatível com ${alvos.size} linhas novas (${descrever(velho)}) — ambíguo, first_seen NÃO traduzido`
        : `id antigo sem linha nova correspondente (${descrever(velho)}) — first_seen perdido se isto não for uma saída legítima dos dados`,
    });
  }
}

/** A tradução aplicada à linha de candidato: reencontro por disputa + grafia. */
function translateCandidateStamps(store, previous, runDate) {
  traduzirCarimbos(store, previous, runDate, {
    tabela: "candidates", idField: "candidate_id",
    chavesDe: (c) => [...new Set([c.canonical, ...(c.aliases ?? [])])]
      .filter(Boolean).map((n) => `${c.contest}|${nameKey(n)}`),
    tipoConflito: "candidate_id_orphaned", contador: "candidates", orfaos: "orphanedCandidates",
    descrever: (c) => `${c.contest} — "${c.canonical}"`,
  });
}

/**
 * A MESMA TRADUÇÃO PARA O INSTITUTO — a terceira tabela, e a última que ainda
 * perdia data em silêncio.
 *
 * O `institute_id` é cunhado do NOME CANÔNICO (`institute|${nameKey(nome)}` em
 * `resolveInstitute`), e o nome canônico é decidido por `canonicalizePollsters`,
 * que escolhe o nome ATESTADO mais curto do agrupamento. Então basta uma coleta
 * nova mudar a atestação para o canônico mudar e o id se mover — que é
 * agrupamento legítimo, não defeito. O defeito era o que acontecia depois:
 * `priorStamps` carrega `first_seen` POR ID, o id novo não achava nada, e a
 * linha nascia com a data da rodada.
 *
 * MEDIDO no banco vivo (rodada de 17/08/2026, `bc18b57` → `d908912`):
 *   antes  {"institute_id":"i_836e2d6c6f26","canonical":"Percent Brasil",…,"first_seen":"2026-08-14"}
 *   depois {"institute_id":"i_661f5eabdd5a","canonical":"Percent",…,"first_seen":"2026-08-17"}
 * Três dias de `first_seen` morreram, o nome antigo sumiu, e NADA foi logado —
 * a tabela sequer tinha `legacy_ids`.
 *
 * A CHAVE DE REENCONTRO SAI DA REGRA QUE FUNDIU AS DUAS LINHAS, não de uma
 * parecida. Casar por alias NÃO funciona e isso foi medido, não suposto: os
 * conjuntos de aliases são DISJUNTOS (`["Percent Brasil"]` vs `["Percent"]`,
 * porque `resolveInstitute` cunha a linha com um alias só, o nome canônico da
 * rodada). Uma chave por alias logaria um órfão e perderia a data do mesmo
 * jeito. Quem decidiu que as duas são um instituto só foi a contenção de tokens
 * de `canonicalizePollsters`, então a chave sai de `pollsterTokens` — essa
 * função importada, não uma cópia dela (§5).
 *
 * ⚠ O CASAMENTO É POR TOKEN COMPARTILHADO, NÃO POR CONJUNTO IGUAL. Uma versão
 * anterior deste comentário dizia que "Percent Brasil" e "Percent" casam porque
 * `POLLSTER_STOP` contém "brasil" e os dois reduzem a `{percent}`. É falso, e a
 * verificação independente derrubou por mutação: tirando "brasil" da lista de
 * genéricas, o caso da Percent CONTINUA traduzindo. `chavesDe` emite uma chave
 * POR TOKEN, e basta um token em comum. A stopword não é o que faz isto
 * funcionar — ela só reduz a chance de colisão.
 *
 * A CHAVE É GROSSA, e a recusa por ambiguidade é o que a torna segura. Um token
 * que alcance mais de uma linha nova não decide nada: `traduzirCarimbos` conta
 * órfão e escreve `institute_id_orphaned` em `conflicts.ndjson`, em vez de
 * escolher a primeira (§4).
 *
 * QUANTO ISSO ACONTECE, MEDIDO no banco vivo (137 institutos, 157 tokens): ZERO
 * tokens são compartilhados por mais de um instituto, e zero linhas alcançam
 * mais de um alvo. Não é sorte — é o mesmo agrupamento: dois nomes que dividem
 * um token distintivo já teriam sido fundidos num instituto só lá em cima. A
 * recusa continua exercitada por um caso sintético no `upsert-harness`, porque
 * um caminho de falha que nunca roda não é evidência de nada (§2).
 *
 * O QUE ESTA CHAVE NÃO ALCANÇA, e é o custo honesto dela: 6 dos 137 institutos
 * têm conjunto de tokens VAZIO, porque o nome inteiro cai em `POLLSTER_STOP` ou
 * no piso de 3 letras — "SM Pesquisas", "Opinião", "Opinião Consultoria",
 * "Data AZ", "W1", "MT Dados". Se um deles for recunhado, não há chave, a
 * tradução falha e o `first_seen` se perde — mas AGORA com uma linha
 * `institute_id_orphaned` em `conflicts.ndjson` dizendo isso, que é a diferença
 * entre uma perda vista e a perda silenciosa que este caso existe para acabar.
 */
function translateInstituteStamps(store, previous, runDate) {
  traduzirCarimbos(store, previous, runDate, {
    tabela: "institutes", idField: "institute_id",
    chavesDe: (i) => [...new Set([i.canonical, ...(i.aliases ?? [])])]
      .filter(Boolean).flatMap((n) => [...pollsterTokens(n)]).map((t) => `tok|${t}`),
    tipoConflito: "institute_id_orphaned", contador: "institutes", orfaos: "orphanedInstitutes",
    descrever: (i) => `"${i.canonical}"`,
  });
}

/**
 * A MESMA TRADUÇÃO PARA A PESSOA — e ela faltava, uma tabela acima.
 *
 * `translateCandidateStamps` protegia só `candidates`. `people` não tinha
 * `legacy_ids`, não tinha tradução de `first_seen` e não logava NADA quando um
 * `person_id` se movia: a pessoa movida simplesmente nascia com
 * `first_seen = runDate`, que é exatamente a perda silenciosa de data que esta
 * camada inteira existe para acabar — só que um nível acima de onde ela foi
 * consertada.
 *
 * E a pessoa AINDA PODE se mover. Caso reproduzido em 16/08/2026 contra o banco
 * vivo, reconstruído em diretório temporário: uma pesquisa nova do Poder360 em
 * `governador:GO` escrevendo `Gustavo Mendanha Silva` (nome exibido inalterado)
 * moveu `p_6a008686f578 → p_b1007931a4c8`, com o `first_seen` da pessoa saltando
 * de 16/08 para a data da rodada. É dependente da ORDEM DE CHEGADA:
 * `buildStoreFromPolls` ordena por prioridade de fonte e depois por
 * `fieldwork_end` DESC, então uma pesquisa fresca da fonte primária é ingerida
 * PRIMEIRO, os três degraus anteriores de `resolvePerson` erram todos, e a
 * semente sai da grafia nova. A mesma pesquisa datada de 2020, ou vinda da
 * Wikipédia, seria ingerida por último e o id NÃO se moveria. Quem se registrou
 * é imune: o índice de `nome_urna` alcança a pessoa pelo `sq_candidato`.
 *
 * Esta função NÃO elimina o movimento — ele é da escada, não do carimbo. Ela
 * faz o que o candidato já tinha: a data ATRAVESSA o salto, o id antigo fica em
 * `legacy_ids`, e o que não casa vira linha em `conflicts.ndjson` em vez de
 * silêncio.
 *
 * AS CHAVES DE REENCONTRO são as MESMAS por onde a identidade é alcançada em
 * `resolvePerson`, e não podiam ser outras: quem se registrou é alcançada pelo
 * `sq_candidato` (nunca por grafia — ver `resolvePerson`), e quem não se
 * registrou pela grafia dentro do seu `obs_scope` (opção C). Casar pessoa
 * registrada por grafia reencontraria o "Alvaro Dias" do PR no ÁLVARO DIAS do
 * RN, que é o par que a opção C existe para separar.
 */
function translatePersonStamps(store, previous, runDate) {
  traduzirCarimbos(store, previous, runDate, {
    tabela: "people", idField: "person_id",
    chavesDe: (p) => (p.registered === true
      ? (p.sq_candidato ?? []).map((sq) => `sq|${sq}`)
      : (p.obs_scope ? (p.polled_names ?? []).map((n) => `obs|${p.obs_scope}|${normNome(n)}`) : [])),
    tipoConflito: "person_id_orphaned", contador: "people", orfaos: "orphanedPeople",
    descrever: (p) => `${p.obs_scope ?? "registrada"} — "${p.display ?? p.nome_urna ?? "?"}"`,
  });
}

/**
 * `updated_at` must mean "when this record's content last changed" — not "when
 * the script last ran".
 *
 * `fillFields` stamps `updated_at` with the run date every time it fills a
 * field, which is right for an incremental update and wrong for a rebuild:
 * rebuilding from scratch fills EVERY field of EVERY record, so a run on a new
 * date re-dated the lot. Measured on the switchover: 2.954 questions rewritten
 * with nothing but the stamp differing. That is precisely the churn NDJSON was
 * chosen to avoid — it destroys the three-line reviewable bot commit and makes
 * "re-run and diff" useless, because real change becomes indistinguishable
 * from calendar change.
 *
 * So the run date is kept only where the content actually moved. Comparison is
 * on the record MINUS its provenance, since provenance is the thing being
 * decided; an unchanged record gets its previous provenance back wholesale,
 * `field_sources` included. A genuinely new record keeps the run date it was
 * built with, which is correct — that is the day we first saw it.
 */
function settleProvenance(store, previous, runDate) {
  // Key order must NOT count as a difference. The stored record comes back from
  // NDJSON in the writer's field order while the in-memory one is in insertion
  // order, so a plain JSON.stringify reports every record as changed — which is
  // exactly what it did on the first attempt, leaving the churn in place while
  // looking like the fix had been applied.
  const canon = (v) => {
    if (Array.isArray(v)) return v.map(canon);
    if (v && typeof v === "object") {
      return Object.fromEntries(Object.keys(v).sort().map((k) => [k, canon(v[k])]));
    }
    return v;
  };
  const content = (r) => { const { provenance, ...rest } = r; return JSON.stringify(canon(rest)); };
  for (const [table, idField] of [["surveys", "survey_id"], ["questions", "question_id"]]) {
    const before = new Map((previous[table] ?? []).map((r) => [r[idField], r]));
    for (const rec of store[table] ?? []) {
      const old = before.get(rec[idField]);
      if (!old) continue;                                  // novo: fica com runDate
      if (content(old) !== content(rec)) { rec.provenance.updated_at = runDate; continue; }
      if (old.provenance) rec.provenance = old.provenance; // inalterado: devolve as datas
    }
  }
}

/**
 * RECONSTRUIR O `data/` REAL A PARTIR DA PROJEÇÃO RE-CHAVEIA LEVANTAMENTOS EM
 * SILÊNCIO — e é o reflexo natural de quem quer consertar algo sem rede.
 *
 * MEDIDO em 17/08/2026, reconstruindo do `data/polls.json` commitado:
 * **127 dos 1.009 `survey_id` se movem**, e os seeds trocam de CLASSE —
 * `survey|ref|poder360:13144` vira `survey|reg|BR-00835/2026`.
 *
 * A CAUSA NÃO É ENTRADA FALTANDO, e duas hipóteses melhores caíram antes desta:
 * dos 747 ids nativos que o store cita, só 1 some da projeção, e os 1.757
 * registros `p360-` têm `source` preenchido — a chave do degrau 1 é formável.
 * O que muda é QUAL DEGRAU a pesquisa acerta. `polls.json` é ENRIQUECIDO pelo
 * store: `project.mjs` escreve o registro TSE do LEVANTAMENTO em toda pesquisa
 * dele, então 1.380 das 2.984 linhas chegam com registro contra 392
 * levantamentos que de fato têm um. Realimentando isso, pesquisas que na coleta
 * chegavam sem registro passam a chegar com ele, o degrau 2 (registro) atende
 * antes do degrau 1 (id nativo), e a semente sai de outro lugar. A correlação
 * fecha: 84 dos 127 movidos têm registro (66%) contra 308 dos 882 estáveis
 * (35%), e a reconstrução produziu 82 seeds `reg` novos.
 *
 * É CONVENTIONS §6 um nível acima. Ali o gerador lia a própria saída
 * canonicalizada; aqui a saída não está errada, está ENRIQUECIDA — e é o
 * enriquecimento que desvia a escada.
 *
 * O guarda é ESTREITO de propósito: só recusa quando o alvo é o `data/` real.
 * Os checadores (`idempotence-check`, `curated-insert-check`,
 * `roster-retention-check`) alimentam a projeção em diretório TEMPORÁRIO e isso
 * é legítimo — as duas rodadas deles recebem a mesma entrada e o store real não
 * é tocado. Recusar ali desligaria a conferência em silêncio, que é o defeito
 * que este arquivo inteiro existe para não repetir.
 *
 * O coletor passa: `scrape.mjs` grava `data/polls.json` (sem a marca) ANTES de
 * construir o store, então no momento da construção a marca não está lá.
 *
 * ⚠ O QUE ESTE GUARDA NÃO PROVA: que uma coleta reproduz o store. Isso só uma
 * coleta real testaria, e ninguém testa. `idempotence-check` prova ausência de
 * dependência de relógio sobre a PROJEÇÃO — propriedade real, entrada que a
 * produção não usa.
 */
export function recusaEntradaDerivada(dir) {
  const alvo = path.resolve(dir ?? DATA_DIR);
  if (alvo !== path.resolve(DATA_DIR)) return;
  const arquivo = path.join(alvo, "polls.json");
  if (!fs.existsSync(arquivo)) return;
  let marcado = false;
  try { marcado = JSON.parse(fs.readFileSync(arquivo, "utf-8")).derived_from_store === true; } catch { return; }
  if (!marcado) return;
  throw new Error(
    "RECUSADO: reconstruir data/ a partir de data/polls.json, que se declara " +
    "`derived_from_store: true`.\n" +
    "  A projeção carrega o registro TSE do LEVANTAMENTO em toda pesquisa dele, " +
    "então a escada acerta outro degrau:\n" +
    "  medido, 127 dos 1.009 survey_id se movem e as sementes trocam de classe " +
    "(survey|ref|… vira survey|reg|…).\n" +
    "  A entrada legítima do data/ real é a saída FRESCA do coletor: rode " +
    "`node scripts/scrape.mjs`.\n" +
    "  (Checadores reconstroem em diretório temporário e não passam por aqui, " +
    "de propósito.)");
}

/** Build and write, in one call. Returns the row counts per table. */
export function writeStoreFromPolls(polls, opts = {}) {
  recusaEntradaDerivada(opts.dir);
  const { store, report } = buildStoreFromPolls(polls, opts);
  return { counts: writeStore(store, { dir: opts.dir ?? DATA_DIR }), store, report };
}
