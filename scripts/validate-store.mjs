#!/usr/bin/env node
// Validation gate for the NDJSON store.
//
// Same discipline as validate-data.mjs: EVERY guard below has a self-test case
// that feeds a known-bad store and asserts the guard FAILS. A validator whose
// failure paths never fire proves nothing — `--self-test` is what proves they
// fire.
//
// The single most important guard here is CONSTRAINT 6: a registration may
// only carry publication_status "not_located" if a recorded search actually
// failed. Absence from our store is evidence about US, never about the
// institute, so it must map to "unchecked". A future refactor is more likely
// to break this rule than any other, which is why it is enforced in code and
// asserted in a named self-test.
import path from "node:path";
import { readStore, DATA_DIR, headlineGroupKey, PEOPLE_SCHEMA_VERSION } from "./lib/store.mjs";
import { serializeRecord, FIELD_ORDER, SORT } from "./lib/ndjson.mjs";
import { selfTest as partySelfTest, partyExistedAt } from "./lib/parties.mjs";
import { sqsRegistrados } from "./lib/candidaturas.mjs";

const RACES = new Set(["presidente", "governador", "senador"]);
const UFS = new Set(["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"]);
const PUB_STATES = new Set(["results_held","published_not_obtained","scheduled_future","not_located","unchecked"]);
const XT_STATUS = new Set(["verified","unverified","rejected"]);
const DIMENSIONS = new Set(["sexo","faixa_etaria","escolaridade","renda","religiao","regiao","cor_raca","pea","capital_interior","voto_2022","desconhecida"]);

export function validateStore(store, { minSurveys = 1, minQuestions = 1, sqsConhecidos = null } = {}) {
  const errors = [];
  const warn = [];
  const E = (m) => errors.push(m);

  const surveys = store.surveys ?? [];
  const questions = store.questions ?? [];
  const crosstabs = store.crosstabs ?? [];
  const institutes = store.institutes ?? [];
  const people = store.people ?? [];
  const candidates = store.candidates ?? [];
  const registry = store.registry ?? [];
  const searches = store.searches ?? [];

  // ---- shrink guard -------------------------------------------------------
  if (surveys.length < minSurveys) E(`apenas ${surveys.length} levantamentos (< ${minSurveys}) — encolhimento suspeito`);
  if (questions.length < minQuestions) E(`apenas ${questions.length} perguntas (< ${minQuestions}) — encolhimento suspeito`);

  // ---- ids unique within and across tables --------------------------------
  const seen = new Map();
  // `people` ENTRA AQUI, e não é detalhe: fora desta lista um `p_…` escapa da
  // unicidade entre tabelas por inteiro. `hash12` são 12 hex sobre oito
  // namespaces; um nono não conferido é superfície de colisão silenciosa — e é
  // também a única coisa que garante `person_id` único.
  const idOf = { surveys: "survey_id", questions: "question_id", crosstabs: "crosstab_id",
                 institutes: "institute_id", people: "person_id", candidates: "candidate_id",
                 registry: "registration_id", searches: "search_id" };
  for (const [table, key] of Object.entries(idOf)) {
    for (const r of store[table] ?? []) {
      const id = r[key];
      if (!id) { E(`${table}: registro sem ${key}`); continue; }
      if (seen.has(id)) E(`id duplicado "${id}" em ${table} e ${seen.get(id)}`);
      else seen.set(id, table);
    }
  }

  const surveyById = new Map(surveys.map((s) => [s.survey_id, s]));
  const instById = new Map(institutes.map((i) => [i.institute_id, i]));
  const candById = new Map(candidates.map((c) => [c.candidate_id, c]));
  const questionById = new Map(questions.map((q) => [q.question_id, q]));

  // ---- surveys ------------------------------------------------------------
  for (const s of surveys) {
    const at = `survey ${s.survey_id}`;
    if (!s.institute_id) E(`${at}: sem institute_id`);
    else if (!instById.has(s.institute_id)) E(`${at}: institute_id ${s.institute_id} inexistente`);
    if (s.universe?.uf && !UFS.has(s.universe.uf)) E(`${at}: UF inválida ${s.universe.uf}`);
    for (const f of ["fieldwork_start", "fieldwork_end", "published_date"]) {
      const d = s[f];
      if (d == null) continue;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) E(`${at}: ${f} não-ISO "${d}"`);
      else if (d < "2023-01-01" || d > "2027-01-01") E(`${at}: ${f} implausível ${d}`);
    }
    if (s.fieldwork_start && s.fieldwork_end && s.fieldwork_start > s.fieldwork_end) {
      E(`${at}: início ${s.fieldwork_start} posterior ao fim ${s.fieldwork_end}`);
    }
    if (s.sample_size != null && (!Number.isFinite(s.sample_size) || s.sample_size <= 0)) {
      E(`${at}: amostra inválida ${s.sample_size}`);
    }
    // A NON-INTEGER sample size is impossible — nobody interviews 2,004 tenths
    // of a person — so it is an error, not a warning.
    //
    // It is here because Poder360 SERVES the mangled value: `entrevistas`
    // arrives as the JSON number 2.004 for Quaest's 2.004 respondents and 1.2
    // for Real Time Big Data's 1.200, the Brazilian thousands separator having
    // already collapsed into a decimal point upstream. Confirmed against the
    // API directly, so there is nothing to fix in our parse. Eleven rows sat in
    // data/polls.json passing every check, because a finite positive number is
    // exactly what they are.
    //
    // Deliberately NOT auto-corrected by multiplying by 1000: that reconstruction
    // assumes one decimal place means one dropped digit, which is an inference,
    // and inferences do not belong upstream of an average. The repair is
    // per-poll in data/repairs.json against the institute's own report — the
    // integra_url is captured and scripts/ocr/ reads the image-only PDFs.
    if (s.sample_size != null && Number.isFinite(s.sample_size) && !Number.isInteger(s.sample_size)) {
      E(`${at}: amostra não-inteira ${s.sample_size} — separador de milhar virou decimal na fonte; reparar em data/repairs.json`);
    }
    // The INTEGER form of the same defect, which the rule above cannot see:
    // `1.000` and `2.000` respondents collapse to the JSON numbers 1 and 2 —
    // finite, positive and integer, so they pass everything. A floor closes the
    // class instead of the instance. 100 is below any real electoral sample
    // here (the current minimum across 1.163 surveys is 300) and far above the
    // 1–27 range this defect produces.
    if (s.sample_size != null && Number.isFinite(s.sample_size) && s.sample_size > 0 && s.sample_size < 100) {
      E(`${at}: amostra implausível ${s.sample_size} — provável milhar colapsado na fonte; reparar em data/repairs.json`);
    }
  }

  // merged_into chains terminate and are acyclic
  for (const i of institutes) {
    const path_ = new Set([i.institute_id]);
    let cur = i;
    while (cur?.merged_into) {
      if (path_.has(cur.merged_into)) { E(`institutes: ciclo de merged_into em ${i.institute_id}`); break; }
      path_.add(cur.merged_into);
      const next = instById.get(cur.merged_into);
      if (!next) { E(`institutes: ${cur.institute_id} funde em ${cur.merged_into}, inexistente`); break; }
      cur = next;
    }
  }

  // ---- people -------------------------------------------------------------
  //
  // A pessoa é a identidade que o `candidate_id` passou a citar. Se ela puder
  // apontar para o nada, para si mesma em ciclo, ou para um `SQ_CANDIDATO` que
  // o TSE não conhece, a correção inteira é decorativa.
  //
  // ⚠ O GATILHO É O QUE O STORE DECLARA SER, NÃO O QUE ELE TEM.
  //
  // Todas as onze afirmações abaixo percorrem `people`, e todas eram
  // VACUAMENTE verdadeiras enquanto a tabela não existia: o validador rodava
  // contra o banco vivo, imprimia um aviso e saía com 0 tendo conferido NADA de
  // pessoa. A primeira escrita de `people.ndjson` — justamente a rodada em que
  // um defeito de identidade custa mais caro — passaria sem exame, e o guarda
  // teria se desligado sozinho no momento em que começava a servir para algo.
  // É o padrão nomeado em CONVENTIONS §2 e no HANDOFF ("um guarda que
  // silenciosamente desliga algo em vez de reprovar").
  //
  // `schema_version` é o que declara a expectativa: um store gravado pelo
  // caminho que cunha pessoas sai com PEOPLE_SCHEMA_VERSION. Um store anterior
  // (o site é mais velho que a tabela, e um clone só a tem depois da primeira
  // coleta) declara 1 e continua tolerado — mas em voz alta, como aviso.
  const esperaPessoas = Number(store.meta?.schema_version ?? 0) >= PEOPLE_SCHEMA_VERSION;
  if (esperaPessoas && !people.length) {
    E(`store declara schema_version ${store.meta?.schema_version} (camada de pessoas) e people.ndjson está VAZIO — ` +
      `${candidates.length} candidatos sem pessoa e nenhuma das checagens de identidade tem o que conferir`);
  }
  const personById = new Map(people.map((p) => [p.person_id, p]));
  for (const p of people) {
    const at = `person ${p.person_id}`;
    if (!p.mint_seed) E(`${at}: sem mint_seed — id sem semente registrada não é id (ver lib/ids.mjs)`);
    if (!Array.isArray(p.sq_candidato)) E(`${at}: sq_candidato deve ser lista (há pessoas com dois registros)`);
    if (p.registered === false && (p.sq_candidato?.length || p.nome_completo || p.nome_urna)) {
      E(`${at}: marcada como não registrada mas carrega dado de registro`);
    }
    // Nunca inferir (CONVENTIONS §4): quem não se registrou não tem nome civil
    // apurado, e escrever o nome da pesquisa ali seria afirmar o que não se sabe.
    if (p.registered === true && !p.sq_candidato?.length) E(`${at}: marcada como registrada sem sq_candidato`);
    // O ESCOPO GRAVADO TEM DE SER O ESCOPO QUE CUNHOU A SEMENTE.
    //
    // `obs_scope` existe porque dois índices o liam da semente com
    // `/^person\|obs\|([^|]+)\|/`, que sob a opção C captura só a race de
    // `person|obs|senador|PR|…` e re-funde UFs em silêncio. Um campo à parte só
    // fecha essa porta enquanto os dois concordarem: um `obs_scope` que
    // discorde da semente é o mesmo defeito com outro nome, e não dá sintoma
    // nenhum — o id simplesmente para de ser reencontrado entre rodadas.
    if (p.registered === false) {
      if (!p.obs_scope) E(`${at}: sem registro e sem obs_scope — o escopo de identidade (opção C) não pode ficar implícito na semente`);
      else if (!String(p.mint_seed ?? "").startsWith(`person|obs|${p.obs_scope}|`)) {
        E(`${at}: obs_scope "${p.obs_scope}" não é o escopo da semente "${p.mint_seed}"`);
      }
    }
    if (p.registered === true && p.obs_scope) {
      E(`${at}: registrada carregando obs_scope "${p.obs_scope}" — quem se registrou é alcançada pelo sq_candidato, nunca por escopo de grafia`);
    }
  }

  // merged_into chains terminate and are acyclic — mesma regra dos institutos,
  // e obrigatória aqui: sem ela uma ruling futura do tipo "estas duas são a
  // mesma pessoa" órfã um person_id e o defeito volta um nível acima.
  for (const p of people) {
    const path_ = new Set([p.person_id]);
    let cur = p;
    while (cur?.merged_into) {
      if (path_.has(cur.merged_into)) { E(`people: ciclo de merged_into em ${p.person_id}`); break; }
      path_.add(cur.merged_into);
      const next = personById.get(cur.merged_into);
      if (!next) { E(`people: ${cur.person_id} funde em ${cur.merged_into}, inexistente`); break; }
      cur = next;
    }
  }

  // Todo `sq_candidato` tem de existir em data/candidaturas.ndjson. O `sq` é a
  // SEMENTE do person_id de quem se registrou; um sq inventado é um id cunhado
  // do nada.
  {
    const sqs = sqsConhecidos ?? sqsRegistrados();
    if (!sqs.size) {
      // Ausente ≠ vazio. Sem o registro no disco a checagem não roda, e isso é
      // dito em voz alta — um guarda que se desliga em silêncio é o padrão que
      // este repositório já pagou para não repetir.
      if (people.some((p) => p.sq_candidato?.length)) {
        warn.push("registro de candidaturas indisponível — os sq_candidato de people.ndjson NÃO foram conferidos");
      }
    } else {
      for (const p of people) {
        for (const sq of p.sq_candidato ?? []) {
          if (!sqs.has(String(sq))) E(`person ${p.person_id}: sq_candidato ${sq} não existe no registro do TSE`);
        }
      }
    }
  }

  // Toda linha de candidato aponta para uma pessoa que existe.
  //
  // A condição é a EXPECTATIVA do store, não o tamanho da tabela — pelo mesmo
  // motivo do bloco acima. Com `if (people.length)` a checagem se auto-desligava
  // exatamente no caso que ela existe para pegar: a rodada em que a camada de
  // pessoas roda e nenhuma pessoa é cunhada.
  for (const c of candidates) {
    if (c.person_id == null) {
      if (esperaPessoas || people.length) {
        E(`candidate ${c.candidate_id}: sem person_id, num store que declara a camada de pessoas` +
          (people.length ? ` (${people.length} pessoas)` : " (e com people.ndjson vazio)"));
      }
      continue;
    }
    if (!personById.has(c.person_id)) E(`candidate ${c.candidate_id}: person_id ${c.person_id} inexistente`);
  }
  if (!esperaPessoas && !people.length && candidates.length) {
    warn.push(`people.ndjson vazio — ${candidates.length} candidatos sem pessoa; store anterior à camada de pessoas (schema_version ${store.meta?.schema_version ?? "ausente"})`);
  }

  // ---- questions ----------------------------------------------------------
  const headlines = new Map();
  for (const q of questions) {
    const at = `question ${q.question_id}`;
    if (!surveyById.has(q.survey_id)) E(`${at}: survey_id ${q.survey_id} inexistente`);
    if (!RACES.has(q.race)) E(`${at}: race inválida ${q.race}`);
    if (q.round !== 1 && q.round !== 2) E(`${at}: round inválido ${q.round}`);
    // A presidential question may be NATIONAL (uf null) or STATE-SCOPED: state
    // pollsters routinely ask the presidential question to their state sample
    // to see who leads there. Those are real polls of a different population,
    // not national ones — the site must keep them out of the national average,
    // which `pollsFor("presidente", null)` does by matching uf exactly.
    if (q.uf != null && !UFS.has(q.uf)) E(`${at}: uf ${q.uf} inválida`);
    if (q.race !== "presidente" && q.uf == null) E(`${at}: ${q.race} exige uf`);
    if (!Array.isArray(q.results) || !q.results.length) E(`${at}: sem resultados`);
    else {
      let sum = 0;
      for (const r of q.results) {
        if (!r.candidate_id) E(`${at}: resultado sem candidate_id`);
        else if (!candById.has(r.candidate_id)) E(`${at}: candidate_id ${r.candidate_id} inexistente`);
        else {
          const c = candById.get(r.candidate_id);
          const expected = `${q.race}:${q.uf ?? "BR"}`;
          if (c.contest !== expected) E(`${at}: candidato ${c.canonical} pertence a ${c.contest}, não a ${expected}`);
        }
        if (typeof r.pct !== "number" || r.pct < 0 || r.pct > 100) E(`${at}: pct inválido ${r.pct}`);
        else sum += r.pct;
      }
      sum += (q.others_pct ?? 0) + (q.undecided_pct ?? 0) + (q.blank_null_pct ?? 0);
      const cap = q.race === "senador" ? 260 : 130;
      if (sum > cap) E(`${at}: soma ${sum.toFixed(1)} > ${cap}`);

      // CANDIDATE ROWS ALONE, in a race with ONE winner, cannot exceed 100:
      // each respondent has one vote. The 130 cap above never saw this — a
      // Ceará poll carrying the response option "poderia votar em todos" as a
      // candidate summed 110,4 and passed clean for months.
      //
      // The tolerance is derived, not picked. A source that publishes whole
      // numbers can be off by up to 0,5 per figure; one that publishes tenths,
      // by 0,05. So the slack a poll has earned is a function of how ITS OWN
      // figures are written — which is why Real Time Big Data's PE poll
      // (58+33+8+2 = 101, four integers, 2,0 of slack) passes, while the same
      // excess on tenths would not.
      //
      // The extra point on top is a judgement and is worth naming as one: it
      // separates "the source rounded" from "a row is here that should not
      // be". Everything observed from double-rounding sits within 0,25 of the
      // slack; everything from a stray row is a whole candidate's share. The
      // two polls in between (AtlasIntel CE 100,9 · Veritá AP 100,2) are real
      // enough to look at but not impossible, so they belong on the census
      // worklist rather than red-lighting every run — `scripts/census.mjs`
      // lists them at the tighter 100 + slack line. Senate is excluded: two
      // votes per voter, totals legitimately near 200.
      if (q.race !== "senador" && (q.results ?? []).length) {
        const vals = q.results.map((r) => r.pct).filter((v) => typeof v === "number");
        const rows = vals.reduce((a, v) => a + v, 0);
        const slack = vals.reduce((a, v) => a + (Number.isInteger(v) ? 0.5 : 0.05), 0);
        if (rows > 100 + slack + 1) {
          E(`${at}: candidatos somam ${rows.toFixed(1)} numa disputa de vaga única ` +
            `(máximo 100 + ${slack.toFixed(2)} de arredondamento) — linha a mais no elenco?`);
        }
      }
    }
    if (q.is_headline && !q.retracted) {
      const k = headlineGroupKey(q);
      headlines.set(k, (headlines.get(k) ?? 0) + 1);
    }
  }
  for (const [k, n] of headlines) if (n > 1) E(`${n} perguntas marcadas is_headline em ${k} — deve haver exatamente 1`);
  // every headline group with live questions needs exactly one headline
  const groups = new Map();
  for (const q of questions) {
    if (q.retracted) continue;
    const k = headlineGroupKey(q);
    groups.set(k, (groups.get(k) ?? 0) + 1);
  }
  for (const k of groups.keys()) if (!headlines.has(k)) E(`nenhuma pergunta is_headline em ${k}`);

  // ---- crosstabs ----------------------------------------------------------
  for (const x of crosstabs) {
    const at = `crosstab ${x.crosstab_id}`;
    const q = questionById.get(x.question_id);
    if (!q) { E(`${at}: question_id ${x.question_id} inexistente`); continue; }
    if (!DIMENSIONS.has(x.dimension)) E(`${at}: dimensão desconhecida ${x.dimension}`);
    if (!XT_STATUS.has(x.status)) E(`${at}: status inválido ${x.status}`);
    const rows = x.categories?.length ?? 0;
    const cols = x.candidates?.length ?? 0;
    if (!Array.isArray(x.matrix) || x.matrix.length !== rows) E(`${at}: matriz tem ${x.matrix?.length} linhas, esperado ${rows}`);
    else for (const [i, row] of x.matrix.entries()) {
      if (!Array.isArray(row) || row.length !== cols) E(`${at}: linha ${i} tem ${row?.length} colunas, esperado ${cols}`);
    }
    const roster = new Set((q.results ?? []).map((r) => r.candidate_id));
    for (const cid of x.candidates ?? []) {
      if (!roster.has(cid)) E(`${at}: candidato ${cid} fora do roster da pergunta`);
    }
    if (x.status === "verified" && x.reconciliation?.passed !== true) {
      E(`${at}: status "verified" sem reconciliation.passed — proibido`);
    }
  }

  // ---- registry + CONSTRAINT 6 -------------------------------------------
  const searchesByReg = new Map();
  for (const s of searches) {
    if (!s.registration_id) { E(`search ${s.search_id}: sem registration_id`); continue; }
    if (!searchesByReg.has(s.registration_id)) searchesByReg.set(s.registration_id, []);
    searchesByReg.get(s.registration_id).push(s);
  }
  const regIds = new Set(registry.map((r) => r.registration_id));
  for (const s of searches) {
    if (s.registration_id && !regIds.has(s.registration_id)) {
      E(`search ${s.search_id}: registration_id ${s.registration_id} inexistente`);
    }
  }
  for (const r of registry) {
    const at = `registry ${r.registration_id}`;
    if (r.publication_status && !PUB_STATES.has(r.publication_status)) {
      E(`${at}: publication_status inválido ${r.publication_status}`);
    }
    if (r.publication_status === "not_located") {
      const ev = (searchesByReg.get(r.registration_id) ?? []).filter(
        (s) => s.outcome === "nothing_found" && (s.queries?.length ?? 0) > 0 &&
               (s.sources_checked?.length ?? 0) > 0 && s.performed_at && s.performed_by,
      );
      if (!ev.length) {
        E(`${at}: publication_status "not_located" sem busca registrada que tenha falhado — ` +
          `ausência no nosso banco NÃO é evidência sobre o instituto (constraint 6)`);
      } else {
        const newest = ev.map((s) => s.performed_at).sort().at(-1);
        if (+new Date() - +new Date(newest) > 30 * 86_400_000) {
          warn.push(`${at}: "not_located" vencido (busca mais recente em ${newest.slice(0, 10)})`);
        }
      }
    }
  }

  // ---- a poll cannot name a party that did not exist on its date ----------
  //
  // The database is historical and each record stands at its own date — but a
  // party that had already been renamed, absorbed or never existed is the
  // SOURCE being wrong, not history worth keeping. Creator's ruling
  // (2026-08-15): fix those as repairs and normalise.
  //
  // A warning, not an error: the fix requires primary-source evidence per
  // record, so the pipeline must keep running while the worklist is worked
  // through. What it must not do is go quiet.
  {
    const surveyById = new Map((store.surveys ?? []).map((s) => [s.survey_id, s]));
    const offenders = new Map();
    for (const q of store.questions ?? []) {
      const s = surveyById.get(q.survey_id);
      const date = s?.fieldwork_end ?? s?.published_date ?? null;
      for (const r of q.results ?? []) {
        const v = partyExistedAt(r.party, date);
        if (v.ok) continue;
        const k = `${r.party}|${v.reason}|${v.became ?? ""}`;
        if (!offenders.has(k)) offenders.set(k, { party: r.party, v, n: 0, sample: `${r.name_raw ?? r.candidate} · ${date}` });
        offenders.get(k).n++;
      }
    }
    for (const { party, v, n, sample } of offenders.values()) {
      const fix = v.became
        ? `renomeado para ${v.became} em ${v.until} — reparo determinado pela própria renomeação`
        : `sem sucessor automático (${v.kind}) — exige fonte primária por registro`;
      warn.push(`partido inexistente na data: "${party}" em ${n} resultado(s) (ex.: ${sample}) — ${fix}`);
    }
  }

  // ---- round-trip determinism --------------------------------------------
  for (const [table, kind] of Object.entries({ surveys: "survey", questions: "question", crosstabs: "crosstab" })) {
    const rows = store[table] ?? [];
    for (const r of rows.slice(0, 200)) {
      const once = serializeRecord(r, kind);
      const twice = serializeRecord(JSON.parse(once), kind);
      if (once !== twice) { E(`${table}: serialização não é idempotente para ${r[Object.keys(r)[0]]}`); break; }
    }
    const sortFn = SORT[kind];
    if (sortFn && rows.length > 1) {
      const a = [...rows].sort((x, y) => String(sortFn(x)) < String(sortFn(y)) ? -1 : 1);
      const b = [...a].sort((x, y) => String(sortFn(x)) < String(sortFn(y)) ? -1 : 1);
      if (a.map((r) => serializeRecord(r, kind)).join() !== b.map((r) => serializeRecord(r, kind)).join()) {
        E(`${table}: ordenação não é estável`);
      }
    }
  }
  for (const kind of Object.keys(FIELD_ORDER)) {
    if (new Set(FIELD_ORDER[kind]).size !== FIELD_ORDER[kind].length) E(`FIELD_ORDER.${kind} tem chaves repetidas`);
  }

  return { errors: errors.slice(0, 60), warn: warn.slice(0, 30),
           counts: { surveys: surveys.length, questions: questions.length, crosstabs: crosstabs.length,
                     institutes: institutes.length, people: people.length, candidates: candidates.length,
                     registry: registry.length, searches: searches.length } };
}

// ---------------------------------------------------------------- self-test
function baseStore() {
  const inst = { institute_id: "i_1", canonical: "Quaest", aliases: ["Quaest"], merged_into: null };
  const cand = (id, n) => ({ candidate_id: id, contest: "presidente:BR", canonical: n, aliases: [n], party: "PT" });
  const c1 = cand("c_1", "Lula");
  const c2 = cand("c_2", "Flávio Bolsonaro");
  const survey = {
    survey_id: "s_1", institute_id: "i_1", universe: { level: "nacional", uf: null },
    fieldwork_start: "2026-08-01", fieldwork_end: "2026-08-03", sample_size: 2000,
    source_refs: [], provenance: { created_at: "2026-08-03", updated_at: "2026-08-03", field_sources: {} },
  };
  const question = {
    question_id: "q_1", survey_id: "s_1", race: "presidente", round: 1, uf: null,
    scenario_ordinal: 0, is_headline: true,
    results: [{ candidate_id: "c_1", name_raw: "Lula", pct: 40 }, { candidate_id: "c_2", name_raw: "Flávio", pct: 34 }],
    undecided_pct: 10, provenance: { created_at: "2026-08-03", updated_at: "2026-08-03", field_sources: {} },
  };
  // `meta` entra no fixture porque o gatilho das checagens de pessoa é o que o
  // store DECLARA. Sem ele todo caso rodaria no ramo tolerante e a transição
  // que importa nunca seria exercitada.
  return { meta: { schema_version: 1 },
           surveys: [survey], questions: [question], crosstabs: [], institutes: [inst],
           people: [], candidates: [c1, c2], registry: [], searches: [], conflicts: [] };
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

/**
 * O mesmo store, com a tabela de pessoas povoada.
 *
 * Separado de `baseStore()` de propósito: assim que `people` existe, "candidato
 * sem person_id" vira ERRO, e é essa transição que os casos abaixo provam. Um
 * autoteste que só exercitasse o caminho tolerante não provaria nada sobre o
 * dia em que a tabela existir — que é o dia inteiro daqui para a frente.
 */
const SQ_FICTICIO = new Set(["10000000001"]);
function pessoasStore() {
  const s = clone(baseStore());
  s.meta = { schema_version: PEOPLE_SCHEMA_VERSION };
  s.people = [
    { person_id: "p_1", mint_seed: "person|tse|10000000001", registered: true,
      sq_candidato: ["10000000001"], nome_completo: "Luiz Inacio Lula da Silva", nome_urna: "Lula",
      display: "Lula", display_from: "nome_urna", polled_names: ["Lula"],
      candidacies: [{ sq_candidato: "10000000001", cargo: "presidente", uf: null, numero: "13", partido: "PT", ano: 2026 }],
      merged_into: null, first_seen: "2026-08-03" },
    { person_id: "p_2", mint_seed: "person|obs|presidente|flavio bolsonaro", registered: false,
      obs_scope: "presidente",
      sq_candidato: [], nome_completo: null, nome_urna: null,
      display: "Flávio Bolsonaro", display_from: "mais curta observada",
      polled_names: ["Flávio Bolsonaro"], candidacies: [], merged_into: null, first_seen: "2026-08-03" },
  ];
  s.candidates[0].person_id = "p_1";
  s.candidates[1].person_id = "p_2";
  return s;
}

function selfTest() {
  const cases = [
    ["store válido passa", baseStore(), true],
    ["encolhimento é rejeitado", { ...baseStore(), surveys: [], questions: [] }, false],
    ["question órfã é rejeitada", (() => { const s = clone(baseStore()); s.questions[0].survey_id = "s_missing"; return s; })(), false],
    ["candidate_id inexistente é rejeitado", (() => { const s = clone(baseStore()); s.questions[0].results[0].candidate_id = "c_ghost"; return s; })(), false],
    ["candidato de outra disputa é rejeitado", (() => { const s = clone(baseStore()); s.candidates[0].contest = "governador:SP"; return s; })(), false],
    ["pct fora de 0–100 é rejeitado", (() => { const s = clone(baseStore()); s.questions[0].results[0].pct = 140; return s; })(), false],
    ["soma acima do teto é rejeitada", (() => { const s = clone(baseStore()); s.questions[0].results[0].pct = 90; s.questions[0].results[1].pct = 90; return s; })(), false],
    ["dois headlines na mesma disputa são rejeitados", (() => {
      const s = clone(baseStore());
      s.questions.push({ ...clone(s.questions[0]), question_id: "q_2", is_headline: true });
      return s; })(), false],
    ["nenhum headline é rejeitado", (() => { const s = clone(baseStore()); s.questions[0].is_headline = false; return s; })(), false],
    ["id duplicado entre tabelas é rejeitado", (() => { const s = clone(baseStore()); s.institutes[0].institute_id = "s_1"; s.surveys[0].institute_id = "s_1"; return s; })(), false],
    ["início posterior ao fim é rejeitado", (() => { const s = clone(baseStore()); s.surveys[0].fieldwork_start = "2026-08-09"; return s; })(), false],
    ["data não-ISO é rejeitada", (() => { const s = clone(baseStore()); s.surveys[0].fieldwork_end = "03/08/2026"; return s; })(), false],
    // The exact shape Poder360 serves: a finite, positive, plausible-looking
    // number that passed every guard for eleven rows.
    ["amostra não-inteira é rejeitada", (() => { const s = clone(baseStore()); s.surveys[0].sample_size = 2.004; return s; })(), false],
    // The integer form of the same source defect: 1.000 respondents arriving as 1.
    ["amostra implausivelmente pequena é rejeitada", (() => { const s = clone(baseStore()); s.surveys[0].sample_size = 2; return s; })(), false],
    // The junk-row shape: an extra row pushes a single-winner roster past 100.
    ["elenco de vaga única acima de 100 é rejeitado", (() => {
      const s = clone(baseStore());
      const q = s.questions.find((x) => x.race !== "senador" && (x.results ?? []).length);
      q.results = q.results.map((r, i) => ({ ...r, pct: i === 0 ? 95.5 : 12.3 }));
      return s;
    })(), false],
    // …and the other half of the same guard: ROUNDING must still pass, or the
    // check would red-light every source that publishes whole numbers.
    ["elenco de vaga única dentro do arredondamento é aceito", (() => {
      const s = clone(baseStore());
      const q = s.questions.find((x) => x.race !== "senador" && (x.results ?? []).length >= 2);
      q.results = q.results.map((r, i) => ({ ...r, pct: i === 0 ? 58 : 43 })); // 101, dois inteiros ⇒ folga 1,0
      q.others_pct = null; q.undecided_pct = null; q.blank_null_pct = null;
      return s;
    })(), true],
    ["ciclo de merged_into é rejeitado", (() => {
      const s = clone(baseStore());
      s.institutes.push({ institute_id: "i_2", canonical: "Genial/Quaest", aliases: [], merged_into: "i_1" });
      s.institutes[0].merged_into = "i_2";
      return s; })(), false],
    ["crosstab com candidato fora do roster é rejeitado", (() => {
      const s = clone(baseStore());
      s.crosstabs.push({ crosstab_id: "x_1", question_id: "q_1", survey_id: "s_1", dimension: "sexo",
        categories: [{ key: "f" }], candidates: ["c_ghost"], matrix: [[40]], status: "unverified" });
      return s; })(), false],
    ["crosstab 'verified' sem reconciliação é rejeitado", (() => {
      const s = clone(baseStore());
      s.crosstabs.push({ crosstab_id: "x_2", question_id: "q_1", survey_id: "s_1", dimension: "sexo",
        categories: [{ key: "f" }], candidates: ["c_1"], matrix: [[40]],
        reconciliation: { passed: false }, status: "verified" });
      return s; })(), false],
    ["matriz com dimensões erradas é rejeitada", (() => {
      const s = clone(baseStore());
      s.crosstabs.push({ crosstab_id: "x_3", question_id: "q_1", survey_id: "s_1", dimension: "sexo",
        categories: [{ key: "f" }, { key: "m" }], candidates: ["c_1"], matrix: [[40]], status: "unverified" });
      return s; })(), false],
    // ---- CONSTRAINT 6 ----
    ["not_located SEM busca registrada é rejeitado (constraint 6)", (() => {
      const s = clone(baseStore());
      s.registry.push({ registration_id: "BR-00001/2026", publication_status: "not_located" });
      return s; })(), false],
    ["not_located COM busca registrada é aceito", (() => {
      const s = clone(baseStore());
      s.registry.push({ registration_id: "BR-00001/2026", publication_status: "not_located" });
      s.searches.push({ search_id: "b_1", registration_id: "BR-00001/2026", performed_at: new Date().toISOString(),
        performed_by: "bot:coverage-sweep", queries: ["BR-00001/2026 pesquisa"],
        sources_checked: [{ name: "poder360" }], outcome: "nothing_found" });
      return s; })(), true],
    ["ausência do nosso banco mapeada como 'unchecked' é aceita", (() => {
      const s = clone(baseStore());
      s.registry.push({ registration_id: "BR-00002/2026", publication_status: "unchecked" });
      return s; })(), true],
    ["publication_status fora do domínio é rejeitado", (() => {
      const s = clone(baseStore());
      s.registry.push({ registration_id: "BR-00003/2026", publication_status: "UNPUBLISHED" });
      return s; })(), false],
    // ---- PESSOAS ----
    // O registro é injetado nestes casos porque o autoteste não pode depender
    // do conteúdo de data/candidaturas.ndjson: um caso que quebra quando o TSE
    // republica o arquivo não prova nada sobre o guarda.
    ["store com pessoas passa", pessoasStore(), true, { sqsConhecidos: SQ_FICTICIO }],
    // ⚠ OS DOIS CASOS QUE PROVAM QUE O PORTÃO NÃO SE DESLIGA SOZINHO.
    //
    // Enquanto a condição era `if (people.length)`, um store SEM pessoas passava
    // — e era exatamente esse o estado do banco vivo: `validate-store.mjs`
    // imprimia um aviso e saía com 0 tendo conferido nada. O primeiro caso é a
    // rodada em que a camada roda e nada é cunhado (tem de REPROVAR); o segundo
    // é o store legado, anterior à tabela (tem de PASSAR, com aviso). Sem os
    // dois lados, uma regra que reprovasse tudo passaria no autoteste.
    ["store que DECLARA a camada de pessoas e vem com a tabela vazia é rejeitado", (() => {
      const s = clone(baseStore()); s.meta = { schema_version: PEOPLE_SCHEMA_VERSION }; return s;
    })(), false],
    ["store anterior à camada (schema_version 1) sem pessoas ainda passa", baseStore(), true],
    ["candidate.person_id inexistente é rejeitado", (() => {
      const s = pessoasStore(); s.candidates[0].person_id = "p_fantasma"; return s;
    })(), false, { sqsConhecidos: SQ_FICTICIO }],
    // O caso que a re-cunhagem cria: a tabela existe e uma linha ficou sem pessoa.
    ["candidato sem person_id com people povoado é rejeitado", (() => {
      const s = pessoasStore(); delete s.candidates[1].person_id; return s;
    })(), false, { sqsConhecidos: SQ_FICTICIO }],
    ["ciclo de merged_into entre pessoas é rejeitado", (() => {
      const s = pessoasStore();
      s.people[0].merged_into = "p_2";
      s.people[1].merged_into = "p_1";
      return s; })(), false, { sqsConhecidos: SQ_FICTICIO }],
    ["merged_into para pessoa inexistente é rejeitado", (() => {
      const s = pessoasStore(); s.people[1].merged_into = "p_fantasma"; return s;
    })(), false, { sqsConhecidos: SQ_FICTICIO }],
    ["sq_candidato fora do registro do TSE é rejeitado", (() => {
      const s = pessoasStore();
      s.people[0].sq_candidato = ["99999999999"];
      return s; })(), false, { sqsConhecidos: SQ_FICTICIO }],
    ["person_id duplicado é rejeitado", (() => {
      const s = pessoasStore(); s.people[1].person_id = "p_1"; return s;
    })(), false, { sqsConhecidos: SQ_FICTICIO }],
    // A outra metade da unicidade: um p_ colidindo com um id de OUTRA tabela.
    ["person_id colidindo com id de outra tabela é rejeitado", (() => {
      const s = pessoasStore();
      s.people[1].person_id = "i_1";
      s.candidates[1].person_id = "i_1";
      return s; })(), false, { sqsConhecidos: SQ_FICTICIO }],
    ["pessoa sem mint_seed é rejeitada", (() => {
      const s = pessoasStore(); delete s.people[1].mint_seed; return s;
    })(), false],
    // A armadilha da opção C: o campo e a semente discordando. Sem sintoma
    // visível — o id apenas para de ser reencontrado entre rodadas.
    ["obs_scope que não é o escopo da semente é rejeitado", (() => {
      const s = pessoasStore(); s.people[1].obs_scope = "governador|SP"; return s;
    })(), false],
    ["pessoa sem registro e sem obs_scope é rejeitada", (() => {
      const s = pessoasStore(); delete s.people[1].obs_scope; return s;
    })(), false],
    ["pessoa REGISTRADA carregando obs_scope é rejeitada", (() => {
      const s = pessoasStore(); s.people[0].obs_scope = "presidente"; return s;
    })(), false, { sqsConhecidos: SQ_FICTICIO }],
    ["pessoa não registrada carregando dado de registro é rejeitada", (() => {
      const s = pessoasStore(); s.people[1].nome_urna = "Flávio"; return s;
    })(), false, { sqsConhecidos: SQ_FICTICIO }],
  ];

  let failed = 0;
  for (const [name, store, shouldPass, opts] of cases) {
    const { errors } = validateStore(store, opts ?? {});
    const passed = errors.length === 0;
    const ok = passed === shouldPass;
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗ FALHA DO AUTOTESTE"}: ${name} (${errors.length} erro(s))`);
    if (!ok && errors.length) console.log(`     primeiro erro: ${errors[0]}`);
  }
  // Party-label canonicalisation carries its own assertions — including the one
  // that matters most, that an UNKNOWN party survives untouched. A new party
  // appearing mid-campaign must never be dropped or coerced by the table.
  const partyErrors = partySelfTest();
  for (const e of partyErrors) console.log(`✗ FALHA DO AUTOTESTE: partidos · ${e}`);
  if (partyErrors.length) failed += partyErrors.length;
  else console.log(`✓: rótulos de partido (aliases, idempotência, vazios, desconhecido preservado)`);

  if (failed) {
    console.error(`\n${failed} caso(s) de autoteste não se comportaram como esperado`);
    process.exit(1);
  }
  console.log("\nautoteste: todos os guardas disparam corretamente");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    const dir = process.argv[2] ?? DATA_DIR;
    const store = readStore({ dir });
    const { errors, warn, counts } = validateStore(store, { minSurveys: 500, minQuestions: 2000 });
    for (const w of warn) console.warn(`AVISO: ${w}`);
    if (errors.length) {
      for (const e of errors) console.error(`ERRO: ${e}`);
      console.error(`\nvalidação falhou (${errors.length} erro(s))`);
      process.exit(1);
    }
    console.log(`OK: ${counts.surveys} levantamentos · ${counts.questions} perguntas · ` +
      `${counts.crosstabs} recortes · ${counts.institutes} institutos · ${counts.people} pessoas · ` +
      `${counts.candidates} candidatos · ${counts.registry} registros · ${counts.searches} buscas`);
  }
}
