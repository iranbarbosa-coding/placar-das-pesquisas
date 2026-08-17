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
import {
  readStore, writeStore, markHeadlines, priorStamps, emptyIndexes,
  seedRegisteredPeople, logConflict, DATA_DIR, SOURCE_ORDER, TABLE_NAMES,
  PEOPLE_SCHEMA_VERSION,
} from "./store.mjs";
import { upsertPoll } from "./upsert.mjs";
import { retainRicherRosters } from "./roster.mjs";
import { nameKey } from "./ids.mjs";
import { normNome } from "./nomes.mjs";

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

  const rank = (s) => { const i = SOURCE_ORDER.indexOf(s); return i === -1 ? SOURCE_ORDER.length : i; };
  const ordered = [...polls].sort((a, b) =>
    rank(a.source) - rank(b.source) ||
    (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? "") ||
    String(a.id).localeCompare(String(b.id)));

  const nativeOf = (p) => /^p360-(\d+)-/.exec(p.id ?? "")?.[1] ?? null;
  const report = {};
  for (const p of ordered) {
    const { matched_by } = upsertPoll(store, p, { source: p.source, runId: runDate, nativeId: nativeOf(p) });
    report[matched_by] = (report[matched_by] ?? 0) + 1;
  }
  // A RETENÇÃO ANTES DA MANCHETE, e a ordem não é arbitrária: `markHeadlines`
  // promove a pergunta de ELENCO MAIS CHEIO, então decidir a manchete sobre uma
  // tabela que a fonte truncou promoveria o cenário errado e publicaria o
  // truncado. Ver `scripts/lib/roster.mjs`.
  reterElencos(store, previous, runDate);
  markHeadlines(store);
  // A PESSOA PRIMEIRO, a linha que a cita depois. As duas traduções são
  // independentes (cada uma casa a sua tabela contra a anterior), mas a ordem
  // que se lê é a da identidade → a linha, e é assim que ela fica escrita.
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

/** Build and write, in one call. Returns the row counts per table. */
export function writeStoreFromPolls(polls, opts = {}) {
  const { store, report } = buildStoreFromPolls(polls, opts);
  return { counts: writeStore(store, { dir: opts.dir ?? DATA_DIR }), store, report };
}
