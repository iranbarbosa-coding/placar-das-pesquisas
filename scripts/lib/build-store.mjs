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
import { nameKey } from "./ids.mjs";

// A lista mora em `store.mjs`. Ela existia copiada aqui, em
// `migrate-to-store.mjs` e em `idempotence-check.mjs` — e o defeito recorrente
// deste repositório é a lista que alguém esqueceu de atualizar.
const TABLES = TABLE_NAMES;

/**
 * @param {Array} polls  normalised flat polls, as `scrape.mjs` produces them
 * @param {{runDate: string, dir?: string, meta?: object}} opts
 * @returns {{store: object, report: object}}  the store, UNWRITTEN
 */
export function buildStoreFromPolls(polls, { runDate, dir = DATA_DIR, meta = {} } = {}) {
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
  markHeadlines(store);
  translateCandidateStamps(store, previous, runDate);
  settleProvenance(store, previous, runDate);
  // A VERSÃO É A PROMESSA QUE O VALIDADOR COBRA. Este caminho cunha pessoas,
  // então o store que sai daqui DECLARA a camada — e `validate-store.mjs`
  // reprova um store que a declare e venha com `people` vazio, em vez de
  // desculpá-lo por a tabela ainda não existir. Ver PEOPLE_SCHEMA_VERSION.
  store.meta = { schema_version: PEOPLE_SCHEMA_VERSION, ...meta };
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
 * cujo id sumiu é procurada entre as novas da MESMA disputa por qualquer grafia
 * que as duas compartilhem. Casando exatamente uma, a data antiga volta e o id
 * antigo fica gravado em `legacy_ids` — do jeito que levantamento já faz — para
 * que a linhagem não dependa de alguém lembrar desta rodada.
 *
 * O QUE NÃO CASA VIRA CONFLITO, nunca silêncio. Uma linha antiga órfã é ou uma
 * pessoa que saiu dos dados (legítimo) ou uma tradução que falhou (defeito), e
 * as duas merecem ser vistas — foi a ausência exata desta linha de log que fez
 * a perda de 16/08 passar despercebida.
 */
function translateCandidateStamps(store, previous, runDate) {
  // ---- O `legacy_ids` DA RODADA ANTERIOR VOLTA ANTES DE QUALQUER TRADUÇÃO ----
  //
  // A linhagem EVAPORAVA na rodada seguinte, e o efeito era um diff de tabela
  // inteira a cada duas rodadas: a rodada N traduzia 1.078 ids e gravava
  // `legacy_ids` nas 1.078 linhas; na rodada N+1 nenhum id sumia, a tradução
  // abaixo não rodava, e como o store é RECONSTRUÍDO DO ZERO cada linha nascia
  // com `legacy_ids: []` — 1.078 linhas mudando de novo, agora perdendo a
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
  const anteriores = new Map((previous.candidates ?? []).map((c) => [c.candidate_id, c.legacy_ids ?? []]));
  for (const c of store.candidates ?? []) {
    const herdados = anteriores.get(c.candidate_id);
    if (herdados?.length) c.legacy_ids = [...new Set([...(c.legacy_ids ?? []), ...herdados])].sort();
  }

  const novos = new Set((store.candidates ?? []).map((c) => c.candidate_id));
  const antigos = (previous.candidates ?? []).filter((c) => !novos.has(c.candidate_id));
  if (!antigos.length) return;

  // Grafia → linhas novas, por disputa. Uma grafia que aponte para mais de uma
  // linha nova é ambígua e NÃO decide nada: escolher uma seria inventar uma
  // procedência, que é o oposto do que CONVENTIONS §4 manda fazer.
  const porGrafia = new Map();
  for (const c of store.candidates ?? []) {
    for (const n of new Set([c.canonical, ...(c.aliases ?? [])])) {
      const k = `${c.contest}|${nameKey(n)}`;
      if (!porGrafia.has(k)) porGrafia.set(k, new Set());
      porGrafia.get(k).add(c);
    }
  }

  // Ordem estável: a tradução escreve `legacy_ids`, que vai para o disco.
  for (const velho of [...antigos].sort((a, b) => (a.candidate_id < b.candidate_id ? -1 : 1))) {
    const alvos = new Set();
    for (const n of new Set([velho.canonical, ...(velho.aliases ?? [])])) {
      for (const c of porGrafia.get(`${velho.contest}|${nameKey(n)}`) ?? []) alvos.add(c);
    }
    if (alvos.size === 1) {
      const novo = [...alvos][0];
      if (velho.first_seen) novo.first_seen = velho.first_seen;
      // A linhagem do id antigo viaja JUNTO com ele. Sem `...velho.legacy_ids` a
      // segunda recunhagem apagaria a primeira: A→B grava [A] em B, B→C gravaria
      // só [B] em C e A sumiria da história sem que nada reclamasse.
      novo.legacy_ids = [...new Set([...(novo.legacy_ids ?? []), ...(velho.legacy_ids ?? []), velho.candidate_id])].sort();
      store._report.translated.candidates++;
      continue;
    }
    store._report.translated.orphaned++;
    logConflict(store, {
      run_id: runDate, type: "candidate_id_orphaned", table: "candidates",
      record_id: velho.candidate_id, field: "candidate_id",
      stored: velho.candidate_id, incoming: alvos.size ? [...alvos].map((c) => c.candidate_id).sort() : null,
      source: "build-store", severity: "review",
      note: alvos.size
        ? `id antigo compatível com ${alvos.size} linhas novas em ${velho.contest} — ambíguo, first_seen NÃO traduzido`
        : `id antigo sem linha nova correspondente em ${velho.contest} ("${velho.canonical}") — first_seen perdido se isto não for uma saída legítima dos dados`,
    });
  }
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
