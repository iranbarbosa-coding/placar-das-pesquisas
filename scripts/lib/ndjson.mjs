// Deterministic NDJSON I/O.
//
// The store is committed by a bot twice a day, so byte-stability matters more
// than it normally would: a record that serialises differently between two
// runs with identical data turns a three-line diff into a three-thousand-line
// one and destroys the reviewability that motivated NDJSON in the first place.
//
// Three rules enforce that:
//   1. Fields are emitted through an explicit FIELD_ORDER, never in object
//      insertion order (which varies with how a record was built).
//   2. Numbers are rounded to fixed precision BEFORE serialising.
//   3. Records sort ASCENDING by date, so newly published polls append at the
//      end of the file instead of shifting every line down.
// `scripts/validate-store.mjs` asserts writeStore(readStore(x)) === x.
import fs from "node:fs";
import path from "node:path";

export const FIELD_ORDER = {
  survey: [
    "survey_id", "legacy_ids", "tse_registration", "tse_registration_status",
    "institute_id", "institute_names_raw", "contractor_raw", "universe",
    "fieldwork_start", "fieldwork_end", "published_date",
    "sample_size", "margin_of_error", "confidence_level",
    "methodology", "cost_brl", "statistician", "cnpj",
    "electoral_cycle", "pre_electoral",
    "source_refs", "integra_url", "article_url",
    "crosstabs_status", "crosstabs_unavailable_reason",
    "retracted", "mint_seed", "provenance",
  ],
  question: [
    "question_id", "survey_id", "legacy_id", "race", "round", "uf",
    "scenario_ordinal", "scenario_label_raw", "stimulus", "is_headline",
    "results", "others_pct", "undecided_pct", "blank_null_pct", "basis",
    "parse_warnings", "repaired", "retracted", "mint_seed", "provenance",
  ],
  crosstab: [
    "crosstab_id", "question_id", "survey_id", "dimension", "dimension_label_raw",
    "categories", "candidates", "matrix", "extras", "orientation_raw",
    "extraction", "reconciliation", "status",
  ],
  institute: ["institute_id", "canonical", "aliases", "cnpj", "merged_into", "first_seen"],
  // A pessoa: identidade GLOBAL, acima da disputa. `sq_candidato` é lista
  // porque duas pessoas do Piauí têm dois registros cada (re-registro, não
  // homônimo). `display_from` grava POR QUE o nome exibido é o que é — até aqui
  // esse motivo vivia numa ordem de escritas dentro de `lib/candidates.mjs` e
  // não existia em lugar nenhum nos dados.
  // `obs_scope` é o escopo de identidade de quem NÃO se registrou (opção C:
  // `presidente` na presidencial, `race|UF` nas estaduais). Declarado aqui de
  // propósito: uma chave fora de FIELD_ORDER ainda é gravada, mas no FIM do
  // registro, e o campo é lido por dois índices — deixá-lo escorregar para o
  // rabo do JSON esconde de quem revisa o diff justamente o campo que decide
  // quem é quem.
  person: [
    "person_id", "mint_seed", "obs_scope", "registered", "sq_candidato",
    "nome_completo", "nome_urna", "display", "display_from",
    "polled_names", "candidacies", "merged_into", "first_seen",
  ],
  candidate: [
    "candidate_id", "legacy_ids", "person_id", "contest", "canonical",
    "aliases", "party", "mint_seed", "first_seen",
  ],
  registry: [
    "registration_id", "uf", "ue", "cargos", "cnpj", "institute_name_registry",
    "institute_id", "dt_registro", "dt_inicio", "dt_fim", "dt_divulgacao",
    "sample_size", "cost_brl", "methodology", "statistician", "conre",
    "contractor", "match", "publication_status", "first_seen_in_registry",
  ],
  search: [
    "search_id", "registration_id", "performed_at", "performed_by",
    "queries", "sources_checked", "outcome", "found_url", "notes",
  ],
  conflict: [
    "conflict_id", "at", "run_id", "type", "table", "record_id", "field",
    "stored", "incoming", "source", "severity", "note",
  ],
};

/** Round every number to `places` so 40.20000000000001 never appears. */
function fix(value, places = 4) {
  if (typeof value === "number") {
    if (!Number.isFinite(value)) return null;
    return Number(value.toFixed(places));
  }
  if (Array.isArray(value)) return value.map((v) => fix(v, places));
  if (value && typeof value === "object") {
    const out = {};
    for (const k of Object.keys(value).sort()) out[k] = fix(value[k], places);
    return out;
  }
  return value;
}

/** Serialise one record through its FIELD_ORDER; unknown keys follow, sorted. */
export function serializeRecord(rec, kind) {
  const order = FIELD_ORDER[kind];
  if (!order) throw new Error(`ndjson: unknown record kind "${kind}"`);
  const out = {};
  for (const key of order) {
    if (rec[key] === undefined) continue;
    out[key] = fix(rec[key]);
  }
  for (const key of Object.keys(rec).sort()) {
    if (!order.includes(key) && rec[key] !== undefined) out[key] = fix(rec[key]);
  }
  return JSON.stringify(out);
}

export function readNdjson(file) {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf-8");
  const rows = [];
  for (const [i, line] of text.split("\n").entries()) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t));
    } catch (e) {
      throw new Error(`${path.basename(file)}:${i + 1} — JSON inválido: ${e.message}`);
    }
  }
  return rows;
}

/** Atomic write: temp file then rename, so a crash never leaves a half file. */
export function writeNdjson(file, records, kind, sortKey) {
  const sorted = sortKey ? [...records].sort((a, b) => cmp(sortKey(a), sortKey(b))) : records;
  const body = sorted.map((r) => serializeRecord(r, kind)).join("\n");
  const tmp = `${file}.tmp`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(tmp, body ? body + "\n" : "");
  fs.renameSync(tmp, file);
  return sorted.length;
}

function cmp(a, b) {
  const A = Array.isArray(a) ? a : [a];
  const B = Array.isArray(b) ? b : [b];
  for (let i = 0; i < Math.max(A.length, B.length); i++) {
    const x = A[i] ?? "";
    const y = B[i] ?? "";
    if (x < y) return -1;
    if (x > y) return 1;
  }
  return 0;
}

/**
 * Ascending sort keys. Undated records sort last under "9999-12-31" rather
 * than first, so the tail of each file is where new data lands.
 */
export const SORT = {
  survey: (s) => [s.fieldwork_end ?? s.published_date ?? "9999-12-31", s.survey_id],
  question: (q) => [q.survey_id, String(q.race), String(q.round), String(q.scenario_ordinal ?? 0), q.question_id],
  crosstab: (c) => [c.question_id, c.dimension, c.crosstab_id],
  institute: (i) => [i.institute_id],
  // Pelo id, como institutos: a pessoa não tem data nem disputa única por onde
  // ordenar, e o id é a única chave estável que ela carrega.
  person: (p) => [p.person_id],
  candidate: (c) => [c.contest, c.candidate_id],
  registry: (r) => [r.dt_fim ?? "9999-12-31", r.registration_id],
  search: (s) => [s.performed_at, s.search_id],
  conflict: (c) => [c.at, c.conflict_id],
};
