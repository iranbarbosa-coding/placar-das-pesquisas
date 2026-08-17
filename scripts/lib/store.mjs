// The consolidated store: load, resolve identity, upsert, write.
//
// THE INVERSION THIS MODULE EXISTS FOR: the store owns identity, not the
// scraper. Each run a source *proposes* match keys; `resolveSurvey` maps them
// onto an existing survey or mints a new one. Ids are never recomputed from
// content, so improving the institute/candidate canonicalisation can no longer
// re-insert an existing survey as a new row.
//
// UPSERT SEMANTICS — fill empty, never overwrite:
//   stored empty      → take incoming, record which source supplied it
//   equal             → no-op (and no timestamp churn: there is deliberately
//                       no `last_seen` field anywhere)
//   different         → KEEP STORED, append to conflicts.ndjson
//   locked by repair  → keep, log at elevated severity
//
// WHY THAT STILL HONOURS SOURCE PRIORITY: under first-writer-wins, whoever
// runs first sets the value. So sources MUST be ingested in priority order —
// poder360 → eleicaoemdados → wikipedia — which makes "first writer wins"
// exactly equivalent to today's SOURCE_PRIORITY. Reordering that ingestion
// (e.g. by parallelising it) silently changes which source wins. Don't.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readNdjson, writeNdjson, SORT } from "./ndjson.mjs";
import {
  mintSurveyId, mintQuestionId, mintInstituteId, mintCandidateId, mintConflictId,
  normalizeRegistration, nameKey, contestKey,
} from "./ids.mjs";
import { sameCandidate } from "./canonicalize.mjs";
import { normNome } from "./nomes.mjs";
import { ballotCandidacy, displayOrigin } from "./candidates.mjs";
import {
  raceOf, escopoObservado, pessoaPorSq, pessoasRegistradas, modeloObservada, melhorDisplay,
} from "./people.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const DATA_DIR = path.join(ROOT, "data");

export const SOURCE_ORDER = ["poder360", "eleicaoemdados", "wikipedia"];

/**
 * A versão de esquema em que `people.ndjson` passa a ser OBRIGATÓRIA.
 *
 * Existe porque um guarda não pode se condicionar ao dado que ele guarda. As
 * checagens de identidade em `validate-store.mjs` percorrem `people`, e
 * enquanto a tabela não existisse elas eram todas vacuamente verdadeiras: o
 * validador rodava contra o banco vivo e saía com 0 sem ter conferido uma
 * pessoa sequer — inclusive na PRIMEIRA rodada que cunhasse pessoas, que é
 * quando um erro de identidade é mais caro.
 *
 * Quem GRAVA (`build-store.mjs`) e quem CONFERE (`validate-store.mjs`) leem
 * esta constante, não um número literal cada um: duas cópias que divergissem
 * deixariam o portão permanentemente desligado sem que nada reclamasse.
 * CONVENTIONS §5.
 */
export const PEOPLE_SCHEMA_VERSION = 2;

const TABLES = {
  surveys: "survey", questions: "question", crosstabs: "crosstab",
  institutes: "institute", people: "person", candidates: "candidate",
  registry: "registry", searches: "search", conflicts: "conflict",
};

/**
 * A LISTA DE TABELAS, UMA VEZ SÓ.
 *
 * Ela existia copiada em `build-store.mjs`, em `migrate-to-store.mjs` e em
 * `idempotence-check.mjs`, e o defeito recorrente deste repositório é
 * exatamente esse: um índice ou uma lista que alguém esqueceu de atualizar.
 * Uma tabela ausente de `idempotence-check.TABLES` não é conferida por
 * `snapshot` nem por `stampsIn` — não dá erro, some da verificação.
 */
export const TABLE_NAMES = Object.keys(TABLES);

/**
 * `runDate` is the run's clock, injected rather than read from the wall.
 *
 * Every date this module stamps comes from here. Calling `new Date()` at the
 * point of use made the store's output a function of WHEN it ran as well as of
 * what it read: a rebuild on a later day rewrote all 4.613 records with nothing
 * but the stamps changed. That destroys the property NDJSON was chosen for — a
 * bot commit you can read in three lines — and it makes "re-run and diff" a
 * useless check, because real change is indistinguishable from date churn.
 * It also makes the two-date test in `--idempotence` writable at all.
 *
 * `prior` carries the stamps a previous store already recorded (see
 * `priorStamps`), so a rebuild re-dates nothing it already had.
 */
export function readStore({ dir = DATA_DIR, tables = Object.keys(TABLES), runDate = today(), prior = null } = {}) {
  const store = { dir, meta: {}, runDate, _prior: prior, _indexes: null, _report: newReport() };
  for (const t of tables) store[t] = readNdjson(path.join(dir, `${t}.ndjson`));
  for (const t of Object.keys(TABLES)) store[t] ??= [];
  const metaFile = path.join(dir, "meta.json");
  store.meta = fs.existsSync(metaFile) ? JSON.parse(fs.readFileSync(metaFile, "utf-8")) : {};
  buildIndexes(store);
  return store;
}

/**
 * Snapshot the stamps an existing store already holds, keyed by id.
 *
 * Safe precisely because ids are minted once from a recorded seed and never
 * recomputed: the same input always resolves to the same id, so carrying a
 * record's original dates forward across a rebuild restores what the field
 * actually means — "when we first saw this" — instead of "when we last ran the
 * script". Note this preserves; it does NOT derive dates from the data (say,
 * from the earliest fieldwork), which would change the field's meaning and
 * silently rewrite history every time a source is added.
 */
export function priorStamps(store) {
  const refs = new Map();
  for (const s of store.surveys ?? []) {
    for (const r of s.source_refs ?? []) refs.set(`${s.survey_id}|${r.source}:${r.native_id}`, r.first_seen);
  }
  // A PESSOA REENCONTRADA PELA GRAFIA, NÃO PELO ID — é isto que torna a semente
  // "cunhada uma vez" verdadeira para quem não se registrou. A semente
  // `person|obs|…` sai da primeira grafia vista, que é ordem de chegada; sem
  // esta volta pelo `polled_names`, uma rodada que visse as grafias em outra
  // ordem cunharia outra semente e moveria o id. Com ela, a semente gravada é
  // reusada COMO ESTÁ e nunca é recomputada.
  //
  // Só para quem NÃO se registrou: quem se registrou é reencontrado pelo
  // `sq_candidato`, que não depende de grafia nenhuma.
  //
  // ⚠ O ESCOPO SAI DO CAMPO `obs_scope`, e já saiu da semente por regex
  // (`/^person\|obs\|([^|]+)\|/`). Sob a opção C a semente estadual passou a ter
  // DUAS partes no escopo (`person|obs|senador|PR|alvaro dias`) e a regex
  // capturava só `senador`: este índice voltaria a fundir UFs em silêncio,
  // desfazendo aqui o corte que a semente faz lá. Ver `personPolledIndex`, o
  // gêmeo desta função — os dois têm de concordar byte a byte.
  const peopleByPolled = new Map();
  for (const p of store.people ?? []) {
    if (p.registered !== false || !p.obs_scope) continue;
    for (const n of p.polled_names ?? []) peopleByPolled.set(`${p.obs_scope}|${normNome(n)}`, p);
  }
  return {
    institutes: new Map((store.institutes ?? []).map((i) => [i.institute_id, i.first_seen])),
    candidates: new Map((store.candidates ?? []).map((c) => [c.candidate_id, c.first_seen])),
    people: new Map((store.people ?? []).map((p) => [p.person_id, p.first_seen])),
    peopleById: new Map((store.people ?? []).map((p) => [p.person_id, p])),
    peopleByPolled,
    surveys: new Map((store.surveys ?? []).map((s) => [s.survey_id, s.provenance])),
    questions: new Map((store.questions ?? []).map((q) => [q.question_id, q.provenance])),
    conflicts: new Map((store.conflicts ?? []).map((c) => [c.conflict_id, c.at])),
    // `run_id` travels with `at`: both mean "the run that FIRST recorded this
    // disagreement". Left to the current run's value it re-dated all 330
    // conflict rows on any rebuild that fell on a new day — the same churn the
    // conflict_id was just fixed for, one field over.
    conflictRuns: new Map((store.conflicts ?? []).map((c) => [c.conflict_id, c.run_id])),
    sourceRefs: refs,
  };
}

/** A record's original date if we already had it, else this run's date. */
export function firstSeenFor(store, kind, id) {
  return store._prior?.[kind]?.get(id) ?? store.runDate;
}

/** Provenance for a record, preserving a prior one's dates when it existed. */
export function provenanceFor(store, kind, id) {
  const p = store._prior?.[kind]?.get(id);
  return {
    created_at: p?.created_at ?? store.runDate,
    updated_at: p?.updated_at ?? store.runDate,
    field_sources: {},
  };
}

function newReport() {
  return { minted: { surveys: 0, questions: 0, institutes: 0, people: 0, candidates: 0 },
           matched: { registration: 0, source_ref: 0, natural: 0 },
           // Quantos ids mudaram de valor nesta rodada e tiveram o `first_seen`
           // resgatado do id antigo. Numa rodada normal é ZERO; um número
           // diferente de zero é a re-cunhagem acontecendo, e é a única coisa
           // que a torna visível sem ler o diff inteiro.
           //
           // AS DUAS TABELAS CONTAM SEPARADO de propósito: enquanto havia um
           // `orphaned` só, `people` sequer era traduzida — um contador comum
           // teria escondido isso mostrando o zero legítimo do candidato.
           translated: { candidates: 0, orphanedCandidates: 0, people: 0, orphanedPeople: 0 },
           filled: 0, conflicts: 0, retracted: 0 };
}

/**
 * EVERY index here needs an answer to "what keeps this current DURING a run?",
 * not only "what fills it at load". Two separate defects came from indexes that
 * were built once and only read: `byRef` (fixed in `addSourceRef`) and then
 * `byReg` (fixed in `fillFields`), the second surviving the first because
 * nobody enumerated the rest while they were in there.
 *   byReg             ← addSourceRef's sibling in fillFields, and at mint
 *   byRef             ← addSourceRef
 *   surveyById        ← at mint
 *   questionById      ← at mint
 *   questionsBySurvey ← at mint (and it is what the roster tests read)
 *   instituteByAlias  ← resolveInstitute
 *   candidateByAlias  ← resolveCandidate
 *   candidateById     ← resolveCandidate (é o que faz duas grafias da MESMA
 *                       pessoa caírem na MESMA linha em vez de cunharem duas —
 *                       o cruzamento de `senador:AL`)
 *   personById        ← resolvePerson
 *   personByPolled    ← resolvePerson (grafia crua → pessoa, por race)
 *   personByCluster   ← resolvePerson (nome exibido → pessoa, por race)
 *
 * There was an eighth, `rosters`: a per-survey union of every question's names,
 * built at load and never updated. Its only reader took the whole-survey union
 * as the identity test, which is what fragmented 322 surveys; the roster tests
 * now read `questionsBySurvey` live and per race+round, so the index is gone
 * rather than left sitting there looking maintained.
 */
function buildIndexes(store) {
  const byReg = new Map();
  const byRef = new Map();
  for (const s of store.surveys) {
    if (s.tse_registration) byReg.set(normalizeRegistration(s.tse_registration), s);
    for (const r of s.source_refs ?? []) byRef.set(`${r.source}:${r.native_id}`, s);
  }
  store._indexes = {
    ...emptyIndexes(),
    byReg, byRef,
    surveyById: new Map(store.surveys.map((s) => [s.survey_id, s])),
    questionById: new Map(store.questions.map((q) => [q.question_id, q])),
    questionsBySurvey: groupBy(store.questions, (q) => q.survey_id),
    instituteByAlias: aliasIndex(store.institutes),
    candidateByAlias: candidateAliasIndex(store.candidates),
    candidateById: new Map((store.candidates ?? []).map((c) => [c.candidate_id, c])),
    personById: new Map((store.people ?? []).map((p) => [p.person_id, p])),
    personByPolled: personPolledIndex(store.people ?? []),
    personByCluster: new Map(),
  };
}

/**
 * O conjunto VAZIO de índices, numa definição só.
 *
 * `build-store.mjs` e `migrate-to-store.mjs` montavam este literal cada um por
 * conta própria, e nenhum dos dois é obrigado a lembrar de um índice novo:
 * esquecer um deixa `store._indexes.X` indefinido e o primeiro `.get()` estoura
 * — ou, pior, um `?? new Map()` defensivo o deixa mudo. `buildIndexes` parte
 * daqui pelo mesmo motivo.
 */
export function emptyIndexes() {
  return {
    byReg: new Map(), byRef: new Map(), surveyById: new Map(),
    questionById: new Map(), questionsBySurvey: new Map(),
    instituteByAlias: new Map(),
    candidateByAlias: new Map(), candidateById: new Map(),
    personById: new Map(), personByPolled: new Map(), personByCluster: new Map(),
  };
}

/**
 * Grafia crua → pessoa, escopada por `obs_scope` (opção C). Ver `resolvePerson`.
 *
 * Gêmeo de `peopleByPolled` em `priorStamps`, e a chave TEM de ser a mesma: um
 * deles lê o estado anterior, o outro o desta rodada, e se discordarem a pessoa
 * não é reencontrada e o id se move. Os dois liam o escopo da semente por regex
 * — que sob a opção C captura só a race.
 */
function personPolledIndex(people) {
  const m = new Map();
  for (const p of people) {
    if (p.registered !== false || !p.obs_scope) continue;
    for (const n of p.polled_names ?? []) m.set(`${p.obs_scope}|${normNome(n)}`, p);
  }
  return m;
}

function groupBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
}

function aliasIndex(institutes) {
  const m = new Map();
  for (const i of institutes) {
    m.set(nameKey(i.canonical), i);
    for (const a of i.aliases ?? []) m.set(nameKey(a), i);
  }
  return m;
}

function candidateAliasIndex(candidates) {
  const m = new Map();
  for (const c of candidates) {
    m.set(`${c.contest}|${nameKey(c.canonical)}`, c);
    for (const a of c.aliases ?? []) m.set(`${c.contest}|${nameKey(a)}`, c);
  }
  return m;
}

/** Follow merged_into chains to the surviving institute. */
export function resolveInstitute(store, rawName, { mint = true } = {}) {
  const key = nameKey(rawName);
  let inst = store._indexes.instituteByAlias.get(key);
  const seen = new Set();
  while (inst?.merged_into && !seen.has(inst.institute_id)) {
    seen.add(inst.institute_id);
    inst = store._indexes.surveyById && store.institutes.find((i) => i.institute_id === inst.merged_into);
  }
  if (inst) return inst;
  if (!mint) return null;
  // An unknown institute must MINT, never fail a run — a new pollster
  // appearing mid-campaign is normal, not an error.
  const institute_id = mintInstituteId(`institute|${key}`);
  const rec = {
    institute_id,
    canonical: String(rawName).trim(),
    aliases: [String(rawName).trim()],
    cnpj: null, merged_into: null, first_seen: firstSeenFor(store, "institutes", institute_id),
  };
  store.institutes.push(rec);
  store._indexes.instituteByAlias.set(key, rec);
  store._report.minted.institutes++;
  return rec;
}

/**
 * A PESSOA por trás de uma linha de resultado.
 *
 * A escada, em ordem, e cada degrau existe por um caso concreto:
 *   1. o REGISTRO do TSE, alcançado pela grafia CRUA. `data/ballot-names.json`
 *      casa "Romeu Zema" com a candidatura de Zema e entrega o `SQ_CANDIDATO`,
 *      que é a semente. Nenhuma regra nossa move um `sq`.
 *   2. o registro alcançado pelo NOME EXIBIDO. É o que salva a ruling do Cadu:
 *      "Cadu Xavier" não casa com candidatura nenhuma (o casador diz, com razão,
 *      que "Cadu" não partilha token com "Carlos Eduardo"), mas o criador
 *      decidiu que ele é "Cadu de Lula", e ESSE nome casa. Sem este degrau a
 *      ruling produziria DUAS pessoas para um homem.
 *   3. a pessoa que uma rodada anterior já gravou para esta grafia — reusando
 *      `person_id` e `mint_seed` como estão. É o degrau que faz a semente ser
 *      cunhada uma vez e nunca recomputada.
 *   4. o cluster desta rodada: mesma DISPUTA, mesmo nome exibido. É o que impede
 *      "Ciro Gomes" e "Ciro" (não registrados) de virarem duas pessoas.
 *   5. cunhar de `person|obs|<escopo>|<grafia>`, com o escopo da opção C.
 */
export function resolvePerson(store, { raw, display, contest }) {
  const idx = store._indexes;
  const race = raceOf(contest);
  // O ESCOPO SAI DA MESMA FUNÇÃO QUE A SEMENTE USA. Quando `polledKey` usava a
  // race e a semente usava outra coisa, a consulta da rodada seguinte errava o
  // alvo e TODA pessoa sem registro era recunhada — o oposto exato do que esta
  // tabela existe para garantir. CONVENTIONS §5.
  const escopo = escopoObservado(race, contest);
  const grafia = String(raw ?? display ?? "").trim();
  const exibido = String(display ?? raw ?? "").trim();
  // O CLUSTER É POR DISPUTA, não por race, porque quem o forma é
  // `canonicalCandidate(nome, contest)` — a decisão de nome exibido já é
  // escopada por disputa. Chaveá-lo por race fundia estados: `Alvaro Dias` de
  // `governador:PR` caía no mesmo cluster que `Álvaro Costa Dias` de
  // `governador:RN` (as duas grafias exibem "Álvaro Dias"), que é exatamente o
  // par que `match-ballot-names.mjs` separa com a regra de estado — nomes de
  // urna idênticos, pessoas diferentes, 24 linhas de pesquisa.
  const clusterKey = `${contest}|${nameKey(exibido)}`;
  const polledKey = `${escopo}|${normNome(grafia)}`;

  const candidatura = ballotCandidacy(grafia, contest) ?? ballotCandidacy(exibido, contest);
  // QUEM SE REGISTROU SÓ É ALCANÇADO PELO REGISTRO.
  //
  // A volta pela grafia (`personByPolled`) é escopada pela opção C, que é a
  // decisão do criador para quem NÃO se registrou — e para quem se registrou ela seria
  // perigosa na direção pior: um "Alvaro Dias" de `governador:PR` acharia pela
  // grafia o ÁLVARO DIAS registrado em `governador:RN` e a linha de pesquisa
  // sairia carregando o `sq_candidato`, o número e o partido de outra pessoa.
  // O registro tem a regra de estado aplicada no casador; a grafia não tem.
  const semRegistro = (p) => (p && p.registered === false ? p : null);
  const modelo = (candidatura && pessoaPorSq(candidatura.sq_candidato))
    ?? semRegistro(idx.personByPolled.get(polledKey))
    ?? idx.personByCluster.get(clusterKey)
    ?? semRegistro(store._prior?.peopleByPolled?.get(polledKey))
    ?? modeloObservada(race, grafia, contest);

  const pessoa = ensurePerson(store, modelo);
  observePerson(store, pessoa, { grafia, exibido, origem: displayOrigin(grafia, contest) });
  idx.personByCluster.set(clusterKey, pessoa);
  if (!pessoa.registered) idx.personByPolled.set(polledKey, pessoa);
  return pessoa;
}

/**
 * A linha da pessoa, criada se ainda não existir, seguindo `merged_into` até
 * quem sobreviveu — o mesmo tratamento que `resolveInstitute` dá a institutos.
 * Sem isso, uma ruling futura do tipo "estas duas são a mesma pessoa" órfã um
 * `person_id` e o defeito que esta tabela conserta reaparece um nível acima.
 */
function ensurePerson(store, modelo) {
  const idx = store._indexes;
  let p = idx.personById.get(modelo.person_id);
  const visto = new Set();
  while (p?.merged_into && !visto.has(p.person_id)) {
    visto.add(p.person_id);
    const proximo = idx.personById.get(p.merged_into);
    if (!proximo) break;
    p = proximo;
  }
  if (p) return p;
  const rec = {
    person_id: modelo.person_id,
    // A LINHAGEM DA PESSOA, como a do candidato e a do levantamento. Faltava
    // aqui: um `person_id` que se movesse (uma pesquisa nova da fonte de topo
    // escrevendo de outro jeito o nome de quem NÃO se registrou) sumia sem
    // deixar rastro, levando o `first_seen` junto. Quem preenche é
    // `translatePersonStamps`, em `build-store.mjs`.
    legacy_ids: [],
    mint_seed: modelo.mint_seed,
    // Escopo de identidade de quem não se registrou (opção C). NULO para quem
    // se registrou: lá a identidade é o `sq_candidato` e não depende de escopo
    // nenhum. É este campo — e não a semente lida por regex — que os dois
    // índices de grafia consultam.
    obs_scope: modelo.obs_scope ?? null,
    registered: modelo.registered,
    sq_candidato: modelo.sq_candidato ?? [],
    nome_completo: modelo.nome_completo ?? null,
    nome_urna: modelo.nome_urna ?? null,
    display: modelo.nome_urna ?? null,
    display_from: modelo.nome_urna ? "nome_urna" : null,
    polled_names: [],
    candidacies: modelo.candidacies ?? [],
    // `merged_into` é CURADORIA, não derivação: o store é reconstruído do zero a
    // cada rodada, então uma fusão decidida à mão só sobrevive se for carregada
    // do estado anterior. Institutos têm o mesmo campo pelo mesmo motivo.
    merged_into: store._prior?.peopleById?.get(modelo.person_id)?.merged_into ?? null,
    first_seen: firstSeenFor(store, "people", modelo.person_id),
  };
  store.people.push(rec);
  idx.personById.set(rec.person_id, rec);
  store._report.minted.people = (store._report.minted.people ?? 0) + 1;
  return rec;
}

/** Registra uma grafia observada e reavalia o nome exibido pela precedência. */
function observePerson(store, pessoa, { grafia, exibido, origem }) {
  if (grafia && !pessoa.polled_names.includes(grafia)) {
    pessoa.polled_names = [...pessoa.polled_names, grafia].sort();
  }
  const escolha = melhorDisplay(
    { display: pessoa.display, display_from: pessoa.display_from },
    { display: exibido, display_from: origem ?? "mais curta observada" },
  );
  pessoa.display = escolha.display;
  pessoa.display_from = escolha.display_from;
}

/**
 * Todas as 519 pessoas do registro, mesmo as que nenhuma pesquisa mediu.
 *
 * A tabela é o cadastro de PESSOAS, não a lista de quem apareceu numa pesquisa:
 * é ela que dá alvo a uma ruling ("estas duas linhas são a mesma pessoa") e à
 * junção com as fotos do DivulgaCand quando o TSE publicar. Semear todas
 * também tira a ordem de chegada da conta para 519 das linhas.
 */
export function seedRegisteredPeople(store, opts) {
  for (const modelo of pessoasRegistradas(opts)) ensurePerson(store, modelo);
  return store.people.length;
}

/**
 * `fuzzy` controls token-subset matching ("Lula" ⊂ "Luiz Inácio Lula da
 * Silva"). It must be OFF when ingesting names that are already canonical —
 * notably the migration, whose job is structural, not to re-run entity
 * resolution. Leaving it on there merged "Ciro Nogueira" into "Ciro", who is a
 * different politician; the parity gate caught it. The same hazard is latent
 * in canonicalize.mjs for live ingestion and needs its own fix.
 *
 * `raw` É A GRAFIA COMO O INSTITUTO PUBLICOU, e é ela que decide a identidade.
 * `rawName` aqui sempre foi o nome PÓS-canonicalização, e a semente saía dele —
 * por isso todo rename cunhava um id novo. Agora o nome só escolhe COMO CHAMAR;
 * quem cunha é a pessoa.
 */
export function resolveCandidate(store, rawName, contest, party, { mint = true, fuzzy = true, raw = null } = {}) {
  const idx = store._indexes;
  const key = `${contest}|${nameKey(rawName)}`;
  const rawKey = raw ? `${contest}|${nameKey(raw)}` : null;
  let cand = idx.candidateByAlias.get(key) ?? (rawKey ? idx.candidateByAlias.get(rawKey) : null);
  if (cand) {
    attachAlias(store, cand, key, rawName);
    if (raw) attachAlias(store, cand, rawKey, raw);
    notePolledName(store, cand, { raw, rawName, contest });
    return cand;
  }
  if (fuzzy) {
    for (const c of store.candidates) {
      if (c.contest !== contest) continue;
      if (sameCandidate(c.canonical, rawName) || (c.aliases ?? []).some((a) => sameCandidate(a, rawName))) {
        attachAlias(store, c, key, rawName);
        notePolledName(store, c, { raw, rawName, contest });
        return c;
      }
    }
  }
  if (!mint) return null;

  const pessoa = resolvePerson(store, { raw: raw ?? rawName, display: rawName, contest });
  // A LINHA CONTINUA SENDO POR DISPUTA, de propósito. É ela que deixa
  // `validate-store.mjs` seguir afirmando `candidate.contest === question.race:uf`
  // — o guarda que pega um candidato a governador aparecendo numa pergunta de
  // Senado, que é justamente por onde o cruzamento de `senador:AL` passou.
  const seed = `candidate|${contest}|${pessoa.person_id}`;
  const candidate_id = mintCandidateId(seed);
  // DUAS GRAFIAS DA MESMA PESSOA NA MESMA DISPUTA CAEM NA MESMA LINHA. Antes,
  // "Dr. Wanderley" e "José Wanderley Neto" em `senador:AL` cunhavam dois
  // `candidate_id` e ainda se CRUZAVAM — o site publicava um homem sob dois
  // nomes na mesma disputa. Com a semente na pessoa, o id colide de propósito.
  const existente = idx.candidateById.get(candidate_id);
  if (existente) {
    attachAlias(store, existente, key, rawName);
    if (raw) attachAlias(store, existente, rawKey, raw);
    return existente;
  }

  const rec = {
    candidate_id,
    legacy_ids: [],
    mint_seed: seed,
    person_id: pessoa.person_id,
    contest, canonical: String(rawName).trim(),
    aliases: [String(rawName).trim()], party: party ?? null,
    first_seen: firstSeenFor(store, "candidates", candidate_id),
  };
  store.candidates.push(rec);
  idx.candidateByAlias.set(key, rec);
  idx.candidateById.set(candidate_id, rec);
  if (rawKey) attachAlias(store, rec, rawKey, raw);
  store._report.minted.candidates++;
  return rec;
}

/**
 * A grafia crua chega à PESSOA mesmo quando a linha de candidato já existia.
 *
 * O caminho rápido (índice de apelidos) devolve a linha sem passar por
 * `resolvePerson`, e sem isto o `polled_names` da pessoa só guardaria a
 * PRIMEIRA grafia vista: em `senador:AL`, "José Wanderley Neto" canonicaliza
 * para "Dr. Wanderley", acerta o índice na primeira consulta e a segunda grafia
 * do mesmo homem nunca era registrada. O campo existe justamente para dizer sob
 * quantos nomes uma pessoa foi medida — e uma tabela de identidade que perde as
 * grafias não serve para decidir identidade nenhuma.
 */
function notePolledName(store, cand, { raw, rawName, contest }) {
  const pessoa = store._indexes.personById.get(cand.person_id);
  if (!pessoa) return;
  const grafia = String(raw ?? rawName ?? "").trim();
  observePerson(store, pessoa, {
    grafia, exibido: String(rawName ?? "").trim(), origem: displayOrigin(grafia, contest),
  });
  // Só quem não se registrou entra no índice por grafia — ver `resolvePerson`.
  // A chave usa `obs_scope`, o mesmo escopo que cunhou a semente: derivá-la de
  // novo aqui (era `raceOf(contest)`) é a terceira cópia da regra, e uma cópia
  // que discorda faz o índice apontar para uma chave que ninguém consulta.
  if (grafia && !pessoa.registered && pessoa.obs_scope) {
    store._indexes.personByPolled.set(`${pessoa.obs_scope}|${normNome(grafia)}`, pessoa);
  }
}

function attachAlias(store, cand, key, nome) {
  const t = String(nome ?? "").trim();
  if (t && !(cand.aliases ?? []).includes(t)) cand.aliases = [...new Set([...(cand.aliases ?? []), t])].sort();
  if (key) store._indexes.candidateByAlias.set(key, cand);
}

const DAY = 86_400_000;

/**
 * The resolution ladder. First hit wins; every input is RAW source data so
 * that a canonicalisation change cannot move a key.
 *   1. source native ref — the finest truth about what one record is, and the
 *      only key that is stable within a source. Deliberately ABOVE
 *      registration: 133 registrations cover more than one native record
 *      (one fieldwork operation, several offices filed separately), so
 *      registration is not a unique survey key.
 *   2. TSE registration  — the cross-source anchor; a Wikipedia row carries no
 *      native Poder360 id, so this is what unites them
 *   3. natural key       — institute + universe + ±3 days, with the roster used
 *      only to CONTRADICT, and only within the same race and round
 *   4. mint
 */
export function resolveSurvey(store, incoming) {
  const idx = store._indexes;

  for (const ref of incoming.source_refs ?? []) {
    if (ref.native_id == null) continue;
    const k = `${ref.source}:${ref.native_id}`;
    if (idx.byRef.has(k)) {
      store._report.matched.source_ref++;
      return { survey: idx.byRef.get(k), matched_by: "source_ref" };
    }
  }

  // 2. TSE registration — one registration is one survey (creator, 2026-08-15),
  //    BUT only when the two records agree on when the fieldwork happened. A
  //    registration covering governor and senate on the same day is one
  //    operation; one covering dates months apart is a source defect (a year
  //    typo, a month typo), and merging it would invent a survey that never
  //    took place and give it a single fabricated date. Those stay separate and
  //    the disagreement is logged.
  const reg = normalizeRegistration(incoming.tse_registration);
  if (reg && idx.byReg.has(reg)) {
    const held = idx.byReg.get(reg);
    // Same registration, DIFFERENT universe is not one survey. A presidential
    // poll fielded in Minas carries a BR- registration just like a national
    // one; they poll different populations and must never merge. (Romeu Zema
    // reads 12% in MG and 2,8% nationally — merging would blend the two.)
    if ((held.universe?.uf ?? null) !== (incoming.universe?.uf ?? null)) {
      // fall through to the natural key / mint
    } else {
    const incomingDate = incoming.fieldwork_end ?? incoming.published_date;
    const heldDate = held.fieldwork_end ?? held.published_date;
    const contradictory = incomingDate && heldDate &&
      Math.abs(+new Date(heldDate) - +new Date(incomingDate)) > 3 * DAY;
    if (!contradictory) {
      store._report.matched.registration++;
      return { survey: held, matched_by: "registration" };
    }
    logConflict(store, {
      run_id: "resolve", type: "registration_dates_contradict", table: "surveys",
      record_id: held.survey_id, field: "fieldwork_end",
      stored: heldDate, incoming: incomingDate, source: "resolveSurvey", severity: "review",
      note: "mesmo registro TSE com datas de campo incompatíveis — não unificado, revisar a fonte",
    });
    }
  }

  const date = incoming.fieldwork_end ?? incoming.published_date;
  if (incoming.institute_id && date) {
    for (const s of store.surveys) {
      if (s.institute_id !== incoming.institute_id) continue;
      if ((s.universe?.uf ?? null) !== (incoming.universe?.uf ?? null)) continue;
      // Two DIFFERENT registrations are two different registered surveys, full
      // stop — the fuzzy rung must never override the exact one. Without this
      // the natural key absorbed a poll registered as MG-02222 into the survey
      // registered as MG-01234, then logged the registration disagreement as
      // if a source had erred.
      if (reg && s.tse_registration && s.tse_registration !== reg) continue;
      const sd = s.fieldwork_end ?? s.published_date;
      if (!sd || Math.abs(+new Date(sd) - +new Date(date)) > 3 * DAY) continue;
      // The sample size is a fact OF the field operation, so two rows that
      // report different ones are not it. Without this the rung fused an Ideia
      // poll of 27.600 with one of 1.500 taken the same day, an AtlasIntel
      // 4.399 with a 5.419, and a Paraná Pesquisas 1.400 with a 2.400 — 20
      // surveys in all, each one two distinct polls collapsed into one, with
      // whichever arrived second dropped from the averages.
      //
      // No tolerance, deliberately. Sources do round (1.006 against 1.000), and
      // a window wide enough to absorb rounding is also wide enough to absorb
      // real differences; picking its width would be picking how much
      // over-merging to allow. Refusing outright errs toward two surveys where
      // there is one, which keeps both records and loses no poll — the failure
      // that can be seen and repaired, rather than the one that silently
      // deletes a poll from an average. Rung 2 is unaffected: a shared TSE
      // registration is a stronger claim than a sample size, and it still
      // merges (and logs the disagreement).
      if (incoming.sample_size != null && s.sample_size != null && incoming.sample_size !== s.sample_size) continue;
      if (rosterContradicts(store, s, incoming)) continue;
      store._report.matched.natural++;
      return { survey: s, matched_by: "natural" };
    }
  }

  // The seed was `mint_seed ?? \`survey|${reg ?? ""}|${refs}\` ?? \`survey|natural…\``.
  // The middle expression is ALWAYS a string, so `??` never reached the third:
  // a poll with neither registration nor native id seeded on `survey||` — the
  // same value for every such poll — and they all minted the SAME survey_id.
  // Wikipedia rows carry neither, so the whole source collapsed onto one
  // record: 2.581 polls became 1.520, and unrelated institutes were merged.
  // Each branch is now chosen explicitly, in the ladder's own order.
  const refKey = (incoming.source_refs ?? [])
    .filter((r) => r.native_id != null)
    .map((r) => `${r.source}:${r.native_id}`).sort().join(",");
  const seed = incoming.mint_seed
    ?? (refKey ? `survey|ref|${refKey}`
      : reg ? `survey|reg|${reg}`
      : `survey|nat|${incoming.institute_id}|${incoming.universe?.uf ?? "BR"}|${date ?? "-"}|${incoming.sample_size ?? "-"}|${(incoming.roster ?? []).slice().sort().join(",")}`);
  const survey_id = mintSurveyId(seed);
  const survey = {
    survey_id,
    mint_seed: seed,
    legacy_ids: [],
    tse_registration: reg,
    tse_registration_status: reg ? "claimed_unverified" : "none",
    institute_id: incoming.institute_id,
    institute_names_raw: incoming.institute_names_raw ?? [],
    contractor_raw: null, universe: incoming.universe ?? { level: "nacional", uf: null },
    fieldwork_start: null, fieldwork_end: null, published_date: null,
    sample_size: null, margin_of_error: null, confidence_level: null,
    methodology: null, cost_brl: null, statistician: null, cnpj: null,
    electoral_cycle: incoming.electoral_cycle ?? 2026,
    pre_electoral: incoming.pre_electoral ?? false,
    source_refs: [], integra_url: null, article_url: null,
    crosstabs_status: "pending", crosstabs_unavailable_reason: null,
    retracted: null,
    provenance: provenanceFor(store, "surveys", survey_id),
  };
  store.surveys.push(survey);
  idx.surveyById.set(survey.survey_id, survey);
  if (reg) idx.byReg.set(reg, survey);
  store._report.minted.surveys++;
  return { survey, matched_by: "minted" };
}

/**
 * The rosters of a survey's questions for ONE race and round, read LIVE.
 *
 * Live because an index built once at readStore leaves a survey created earlier
 * in the SAME run with no roster — so the overlap test hit its "nothing to judge
 * on" branch and waved everything through. The guard then never fired during a
 * scrape, only across runs. `questionsBySurvey` is kept current by
 * resolveQuestion, so reading from it removes the class of bug rather than
 * adding a second thing to remember to update.
 */
function peerRosters(store, survey_id, race, round) {
  const out = [];
  for (const q of store._indexes.questionsBySurvey.get(survey_id) ?? []) {
    if (q.race !== race || q.round !== round) continue;
    const names = new Set();
    for (const r of q.results ?? []) {
      const n = r.name_raw ?? r.candidate;
      if (n) names.add(n);
    }
    if (names.size) out.push(names);
  }
  return out;
}

/**
 * Does the roster say "this is a DIFFERENT field operation"?
 *
 * The roster is evidence of difference only when there is something comparable
 * to differ from — the same race, in the same round. One fieldwork operation
 * routinely asks several questions with legitimately different rosters: the
 * governor and the senate on the same sample, a first round of ten names and a
 * runoff of two. Judged against the survey's WHOLE roster, those look like
 * disagreements and split one survey into several.
 *
 * That is how the ladder minted 485 surveys that do not exist — and WHICH ones
 * depended on arrival order, because the test divided the hits by the incoming
 * roster alone. A runoff arriving after its first round scored 2/2 and merged;
 * the same pair in the other order scored 2/10 and minted. The gate ingests in
 * source-priority order, the scraper will too, and within one source the order
 * is whatever the file happens to hold. Output that moves with record order and
 * not with the data is the defect this project keeps finding; here it decided
 * how many surveys exist.
 *
 * Round 2 is exempt from the test entirely: each head-to-head pairing is its own
 * question, so "Lula × Tarcísio" and "Lula × Zema" share exactly one name by
 * design. Distinguishing those is resolveQuestion's job, not the survey key's.
 */
function rosterContradicts(store, survey, incoming) {
  if (incoming.round === 2) return false;
  if (!incoming.roster?.length) return false;
  const peers = peerRosters(store, survey.survey_id, incoming.race, incoming.round);
  if (!peers.length) return false; // nothing comparable ⇒ no evidence either way
  return !peers.some((stored) => rosterOverlaps(stored, incoming.roster));
}

/**
 * Symmetric by construction: the SMALLER roster is the one that has to be
 * covered. Dividing by the incoming side alone made the answer depend on which
 * record arrived first (see rosterContradicts).
 */
function rosterOverlaps(stored, incoming) {
  if (!stored?.size || !incoming?.length) return true; // no roster to judge on
  let hits = 0;
  for (const name of incoming) {
    for (const s of stored) {
      if (sameCandidate(s, name)) { hits++; break; }
    }
  }
  return hits / Math.min(stored.size, incoming.length) >= 0.6;
}

/**
 * Are these two rosters the same QUESTION — the same matchup put to the same
 * sample?
 *
 * Compared by DECIDED identity (`candidate_id`) whenever both sides carry it.
 * Identity has already been settled upstream by the curated table
 * (`canonicalCandidate` → `resolveCandidate`); re-deciding it here by token
 * subset lets the matcher overrule that decision, which is precisely what the
 * candidate work removed its last word for.
 *
 * It bit: `sameCandidate` reads "Jair Bolsonaro" as a subset of "Michelle
 * Bolsonaro, com apoio do ex-presidente Jair Bolsonaro", so Paraná Pesquisas'
 * Lula × Michelle (43,4) was absorbed into Lula × Jair (32,2) and one of the
 * two runoffs stopped existing. Two rosters the curated table calls different
 * people are different questions, however alike the strings look.
 *
 * The name path remains for rosters that carry no ids (a store read from disk
 * before ids were assigned), and is the ONLY place the token matcher still
 * decides anything here.
 */
function questionRostersMatch(storedResults, incomingResults, incomingNames) {
  const ids = (rs) => (rs ?? []).map((r) => r.candidate_id).filter(Boolean);
  const a = ids(storedResults), b = ids(incomingResults);
  if (a.length === (storedResults ?? []).length && b.length === (incomingResults ?? []).length && a.length && b.length) {
    const set = new Set(a);
    return b.filter((id) => set.has(id)).length / b.length >= 0.8;
  }
  const stored = new Set((storedResults ?? []).map((r) => r.name_raw ?? r.candidate));
  if (!incomingNames.length) return false;
  let hits = 0;
  for (const n of incomingNames) { for (const s of stored) { if (sameCandidate(s, n)) { hits++; break; } } }
  return hits / incomingNames.length >= 0.8;
}

export function resolveQuestion(store, survey, incoming) {
  const existing = store._indexes.questionsBySurvey.get(survey.survey_id) ?? [];
  for (const ref of incoming.source_refs ?? []) {
    const k = `${ref.source}:${ref.native_id}`;
    const hit = existing.find((q) => (q.source_refs ?? []).some((r) => `${r.source}:${r.native_id}` === k));
    if (hit) return { question: hit, matched_by: "source_ref" };
  }
  const roster = (incoming.results ?? []).map((r) => r.name_raw ?? r.candidate);
  for (const q of existing) {
    if (q.race !== incoming.race || q.round !== incoming.round) continue;
    if (questionRostersMatch(q.results, incoming.results, roster)) {
      return { question: q, matched_by: "roster" };
    }
  }
  // A semente usa o elenco CANÔNICO quando o chamador o fornece — ver a nota em
  // `upsert.mjs`. `roster` (de `name_raw`) passou a guardar a grafia publicada,
  // e semear com ela recunharia toda pergunta em que uma fonte escrevesse o nome
  // de outro jeito. `roster_seed` não é gravado: o registro da pergunta é montado
  // campo a campo logo abaixo e não copia `incoming` inteiro.
  const sementeRoster = incoming.roster_seed ?? roster;
  const seed = incoming.mint_seed
    ?? `question|${survey.survey_id}|${incoming.race}|${incoming.round}|${incoming.scenario_ordinal ?? 0}|${sementeRoster.slice().sort().join(",")}`;
  const question_id = mintQuestionId(seed);
  const question = {
    question_id, mint_seed: seed,
    survey_id: survey.survey_id, legacy_id: incoming.legacy_id ?? null,
    race: incoming.race, round: incoming.round, uf: incoming.uf ?? null,
    scenario_ordinal: incoming.scenario_ordinal ?? 0,
    scenario_label_raw: incoming.scenario_label_raw ?? null,
    stimulus: incoming.stimulus ?? null,
    is_headline: false,
    results: [], others_pct: null, undecided_pct: null, blank_null_pct: null,
    basis: "total", parse_warnings: incoming.parse_warnings ?? [],
    repaired: null, retracted: null,
    provenance: provenanceFor(store, "questions", question_id),
  };
  store.questions.push(question);
  store._indexes.questionById.set(question.question_id, question);
  if (!store._indexes.questionsBySurvey.has(survey.survey_id)) {
    store._indexes.questionsBySurvey.set(survey.survey_id, []);
  }
  store._indexes.questionsBySurvey.get(survey.survey_id).push(question);
  store._report.minted.questions++;
  return { question, matched_by: "minted" };
}

const EMPTY = (v) => v === null || v === undefined || v === "" || (Array.isArray(v) && !v.length);

/** Fill empty fields; never overwrite; log every disagreement. */
export function fillFields(store, record, incoming, { source, runId, table, fields }) {
  for (const f of fields) {
    let inc = incoming[f];
    if (EMPTY(inc)) continue;
    // The registration is an INDEXED KEY, not merely a value, so it is
    // normalised and indexed here rather than by the caller. `byReg` was built
    // at load and updated only at mint, so a registration that ARRIVED on a
    // survey already matched by another rung was stored and yet invisible to
    // the rung whose whole purpose is to use it — the same hole `addSourceRef`
    // documents for `byRef`. Demonstrated: a Poder360 record filed without its
    // registration, the registration arriving on a later pass, and then a
    // Wikipedia row carrying that registration and spelling the institute
    // differently — the one case rung 2 exists for — minted a second survey.
    if (table === "surveys" && f === "tse_registration") inc = normalizeRegistration(inc);
    const cur = record[f];
    if (EMPTY(cur)) {
      record[f] = inc;
      if (table === "surveys" && f === "tse_registration") {
        store._indexes.byReg.set(inc, record);
        if (record.tse_registration_status === "none") record.tse_registration_status = "claimed_unverified";
      }
      record.provenance.field_sources[f] = source;
      record.provenance.updated_at = store.runDate;
      store._report.filled++;
      continue;
    }
    if (JSON.stringify(cur) === JSON.stringify(inc)) continue;
    const locked = String(record.provenance.field_sources[f] ?? "").startsWith("repair:");
    logConflict(store, {
      run_id: runId, type: "field_disagreement", table,
      record_id: record[table === "surveys" ? "survey_id" : "question_id"],
      field: f, stored: cur, incoming: inc, source,
      severity: locked ? "locked_field" : "normal",
      note: locked ? "campo fixado por reparo curado — fonte discorda" : null,
    });
  }
}

/**
 * The id was `k_<n>_<Date.now()>`, then `k_<n>_<runDate>`. Both made a conflict
 * row unrepeatable: the same disagreement logged on two different days produced
 * two different ids, so a rebuild could never match a conflict it had already
 * recorded — and once the scraper began writing through the ladder, that was
 * ~333 rows rewritten on every run that happened to fall on a new date.
 *
 * It is now a function of WHAT THE CONFLICT SAYS. The occurrence counter is
 * kept only to separate genuinely identical disagreements logged more than once
 * in one run, and it is derived from how many of that exact conflict already
 * exist — not from the row's position in the table, which would shift whenever
 * an unrelated conflict appeared earlier.
 */
export function logConflict(store, c) {
  const seed = [c.type, c.table, c.record_id, c.field,
    JSON.stringify(c.stored ?? null), JSON.stringify(c.incoming ?? null), c.source].join("|");
  store._conflictSeen ??= new Map();
  const n = (store._conflictSeen.get(seed) ?? 0) + 1;
  store._conflictSeen.set(seed, n);
  const conflict_id = mintConflictId(n === 1 ? seed : `${seed}|${n}`);
  const rec = {
    conflict_id,
    at: firstSeenFor(store, "conflicts", conflict_id),
    ...c,
    run_id: store._prior?.conflictRuns?.get(conflict_id) ?? c.run_id,
  };
  store.conflicts.push(rec);
  store._report.conflicts++;
  return rec;
}

/**
 * Record a source's native id on a survey, and INDEX IT.
 *
 * The indexing is the point. `byRef` was built once at readStore and never
 * updated, so a survey minted during a run could not be found by the very key
 * the ladder trusts most — its source's own id. Rung 1 therefore never fired
 * within a scrape: resolution silently fell through to registration, or to the
 * fuzzy natural key, or minted a duplicate. It looked correct because the only
 * caller was a test that re-read the store between runs.
 */
export function addSourceRef(store, survey, ref) {
  survey.source_refs ??= [];
  const k = `${ref.source}:${ref.native_id}`;
  if (!survey.source_refs.some((r) => `${r.source}:${r.native_id}` === k)) {
    const first_seen = ref.first_seen ?? firstSeenFor(store, "sourceRefs", `${survey.survey_id}|${k}`);
    survey.source_refs.push({ ...ref, first_seen });
  }
  if (ref.native_id != null) store._indexes.byRef.set(k, survey);
}

/**
 * The headline group key. Round 1 competes on the whole field, so one survey
 * yields ONE headline — that is what keepFullestRound1 used to accomplish by
 * deleting the alternates. Round 2 is different: each head-to-head pairing is
 * its own question, and every pairing must survive. Scoping the key by pairing
 * makes one rule serve both, and makes same-pairing duplicates resolvable by
 * `retracted` rather than by deletion.
 */
export function headlineGroupKey(q) {
  // The UF belongs in the key. Once presidential polling is collected per
  // state, ONE survey can hold a national presidential question and a
  // state-scoped one; without the UF they collide in the same headline group
  // and one of them silently stops being published.
  if (q.round !== 2) return `${q.survey_id}|${q.race}|${q.uf ?? "BR"}|${q.round}`;
  const pair = [...(q.results ?? [])]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, 2)
    .map((r) => r.candidate_id)
    .sort()
    .join("+");
  return `${q.survey_id}|${q.race}|${q.uf ?? "BR"}|2|${pair}`;
}

/**
 * Promote exactly one question per headline group: the fullest roster. The
 * alternates are KEPT (unlike the old keepFullestRound1, which deleted them)
 * and simply not promoted.
 */
export function markHeadlines(store) {
  const groups = new Map();
  for (const q of store.questions) {
    if (q.retracted) continue;
    const k = headlineGroupKey(q);
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(q);
  }
  for (const qs of groups.values()) {
    let best = qs[0];
    for (const q of qs) {
      const n = (q.results ?? []).length;
      const bn = (best.results ?? []).length;
      if (n > bn || (n === bn && String(q.question_id) < String(best.question_id))) best = q;
    }
    for (const q of qs) q.is_headline = q === best;
  }
}

export function writeStore(store, { dir = store.dir ?? DATA_DIR } = {}) {
  const counts = {};
  for (const [table, kind] of Object.entries(TABLES)) {
    counts[table] = writeNdjson(path.join(dir, `${table}.ndjson`), store[table] ?? [], kind, SORT[kind]);
  }
  fs.writeFileSync(path.join(dir, "meta.json"), JSON.stringify(store.meta, null, 1) + "\n");
  return counts;
}

export function runReport(store) {
  return store._report;
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
