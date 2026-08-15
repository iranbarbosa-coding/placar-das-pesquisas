// Canonical party labels.
//
// Sources spell the same party several ways and we render whatever arrives, so
// one page could show "UNIÃO" beside "União Brasil", or "PSOL", "Psol" and
// "psol" in three rows of one table. Worse, party is evidence: the candidate
// review weighs "do both spellings of this name follow the same party
// trajectory?", and three spellings of one party make a single person look like
// two.
//
// THE RULE HERE: this module unifies LABELS for what is unambiguously the same
// party today. It does NOT merge parties that merged, dissolved, or absorbed
// each other in the real world — that is a political judgement about a
// historical poll, not a normalisation, and it is left to the creator. See
// NOT_MERGED at the bottom.
//
// An unrecognised party passes through unchanged (trimmed). A new party
// appearing mid-campaign is normal, not an error, and must never be dropped.

/** Match key: accent-, case- and punctuation-insensitive. */
const key = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// canonical label -> every spelling seen in the wild
const ALIASES = {
  // — case / accent only ------------------------------------------------
  PSOL: ["PSOL", "Psol", "psol"],
  Novo: ["Novo", "NOVO"],
  Rede: ["Rede", "REDE"],
  Mobiliza: ["Mobiliza", "MOBILIZA"],
  PP: ["PP", "pp", "Progressistas"],
  "Sem partido": ["Sem partido", "sem partido"],

  // — abbreviation vs name, same party today ----------------------------
  "União Brasil": ["União Brasil", "UNIÃO", "União"],
  Podemos: ["Podemos", "PODE"],
  Republicanos: ["Republicanos", "REP", "Republicans (Brazil)"],

  // — leaks from the ENGLISH Wikipedia pages ----------------------------
  Missão: ["Missão", "MISSÃO", "Mission"],
  PT: ["PT", "Workers' Party (Brazil)"],

  // — wikitext the parser failed to unwrap ------------------------------
  //   "[[Partido Social Democrático (2011)|PSD]]" arrived with its brackets.
  PSD: ["PSD", "[Partido Social Democrático (2011)|PSD]]"],

  // — pure renames of the same legal party ------------------------------
  //   PMDB → MDB (2017), PSDC → DC (2017). The entity did not change.
  MDB: ["MDB", "PMDB"],
  DC: ["DC", "PSDC"],
};

/**
 * Deliberately NOT normalised — each would be a claim about political history,
 * not about spelling, and would rewrite what a poll actually asked:
 *   DEM         extinct 2022, absorbed into União Brasil. A 2023 poll naming
 *               DEM was naming DEM.
 *   Pros        merged into Solidariedade in 2023.
 *   Democrata   ambiguous — possibly DC, possibly a mistranslation. No basis
 *               to choose, so it stands.
 * If you decide any of these, add it above with a note; do not decide it here
 * by accident.
 */
export const NOT_MERGED = ["DEM", "Pros", "Democrata"];

/** Values that mean "no party was recorded". */
const EMPTY = new Set(["", "na", "n/a", "-", "--", "?", "null", "nenhum", "semlegenda"]);

const LOOKUP = new Map();
for (const [canonical, spellings] of Object.entries(ALIASES)) {
  for (const s of spellings) LOOKUP.set(key(s), canonical);
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null} canonical label, or null when no party was recorded
 */
export function canonicalParty(raw) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  const k = key(trimmed);
  if (!k || EMPTY.has(k) || EMPTY.has(trimmed.toLowerCase())) return null;
  return LOOKUP.get(k) ?? trimmed;
}

/** Spellings present in the data that this module does not recognise. */
export function unknownParties(values) {
  const out = new Map();
  for (const v of values) {
    const c = canonicalParty(v);
    if (c === null || LOOKUP.has(key(c))) continue;
    out.set(c, (out.get(c) ?? 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}

export const CANONICAL_LABELS = Object.keys(ALIASES);

// ---------------------------------------------------------------- self-test
export function selfTest() {
  const errors = [];
  const eq = (got, want, what) => { if (got !== want) errors.push(`${what}: esperado ${JSON.stringify(want)}, obtido ${JSON.stringify(got)}`); };

  for (const [canonical, spellings] of Object.entries(ALIASES)) {
    for (const s of spellings) eq(canonicalParty(s), canonical, `alias ${JSON.stringify(s)}`);
  }

  // Idempotence: normalising twice must equal normalising once, or repeated
  // pipeline runs would drift.
  for (const c of Object.keys(ALIASES)) eq(canonicalParty(canonicalParty(c)), canonicalParty(c), `idempotência ${c}`);

  // Empties collapse to null.
  for (const e of ["", "  ", "N/A", "n/a", "-", null, undefined]) eq(canonicalParty(e), null, `vazio ${JSON.stringify(e)}`);

  // THE IMPORTANT ONE: an unknown party survives untouched. A new party
  // appearing mid-campaign must never be silently dropped or coerced.
  eq(canonicalParty("Partido Novíssimo"), "Partido Novíssimo", "partido desconhecido preservado");
  eq(canonicalParty("  PXY  "), "PXY", "desconhecido apenas aparado");

  // The political mergers stay untouched.
  for (const p of NOT_MERGED) eq(canonicalParty(p), p, `não fundido ${p}`);

  return errors;
}
