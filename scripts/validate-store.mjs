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
import { readStore, DATA_DIR, headlineGroupKey } from "./lib/store.mjs";
import { serializeRecord, FIELD_ORDER, SORT } from "./lib/ndjson.mjs";
import { selfTest as partySelfTest, partyExistedAt } from "./lib/parties.mjs";

const RACES = new Set(["presidente", "governador", "senador"]);
const UFS = new Set(["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"]);
const PUB_STATES = new Set(["results_held","published_not_obtained","scheduled_future","not_located","unchecked"]);
const XT_STATUS = new Set(["verified","unverified","rejected"]);
const DIMENSIONS = new Set(["sexo","faixa_etaria","escolaridade","renda","religiao","regiao","cor_raca","pea","capital_interior","voto_2022","desconhecida"]);

export function validateStore(store, { minSurveys = 1, minQuestions = 1 } = {}) {
  const errors = [];
  const warn = [];
  const E = (m) => errors.push(m);

  const surveys = store.surveys ?? [];
  const questions = store.questions ?? [];
  const crosstabs = store.crosstabs ?? [];
  const institutes = store.institutes ?? [];
  const candidates = store.candidates ?? [];
  const registry = store.registry ?? [];
  const searches = store.searches ?? [];

  // ---- shrink guard -------------------------------------------------------
  if (surveys.length < minSurveys) E(`apenas ${surveys.length} levantamentos (< ${minSurveys}) — encolhimento suspeito`);
  if (questions.length < minQuestions) E(`apenas ${questions.length} perguntas (< ${minQuestions}) — encolhimento suspeito`);

  // ---- ids unique within and across tables --------------------------------
  const seen = new Map();
  const idOf = { surveys: "survey_id", questions: "question_id", crosstabs: "crosstab_id",
                 institutes: "institute_id", candidates: "candidate_id",
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
                     institutes: institutes.length, candidates: candidates.length,
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
  return { surveys: [survey], questions: [question], crosstabs: [], institutes: [inst],
           candidates: [c1, c2], registry: [], searches: [], conflicts: [] };
}

function clone(o) { return JSON.parse(JSON.stringify(o)); }

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
  ];

  let failed = 0;
  for (const [name, store, shouldPass] of cases) {
    const { errors } = validateStore(store);
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
      `${counts.crosstabs} recortes · ${counts.institutes} institutos · ${counts.candidates} candidatos · ` +
      `${counts.registry} registros · ${counts.searches} buscas`);
  }
}
