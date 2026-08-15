// Canonical party labels.
//
// Sources spell the same party several ways and we render whatever arrives, so
// one page could show "UNIÃO" beside "União Brasil", or "PSOL", "Psol" and
// "psol" in three rows of one table. Worse, party is evidence: the candidate
// review weighs "do both spellings of this name follow the same party
// trajectory?", and three spellings of one party make a single person look like
// two.
//
// THE GOVERNING RULE (creator, 2026-08-15): **a poll keeps the party it was
// taken with.** The database is historical; each record stands at its own date.
// This module may only unify SPELLINGS of one party as it was named at that
// moment — case, accents, abbreviation-versus-name, source encoding bugs.
//
// It must never map a party onto a later one. Renames, mergers, absorptions and
// dissolutions are all changes to the political record, not to spelling: a poll
// that named PMDB named PMDB, and rewriting it as MDB would put a word in the
// respondent's mouth. Every such case belongs in NOT_MERGED at the bottom, with
// its reason, and stays there unless the creator says otherwise.
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
};

/**
 * Deliberately NOT normalised. Each would move a poll onto a party from a
 * different moment, which the governing rule forbids:
 *   PMDB        renamed MDB in 2017.
 *   PSDC        renamed DC in 2017.
 *   DEM         extinct 2022, absorbed into União Brasil.
 *   Pros        merged into Solidariedade in 2023.
 *   Democrata   ambiguous — possibly DC, possibly a mistranslation. No basis
 *               to choose, so it stands.
 *
 * WORTH KNOWING, since it cuts against leaving PMDB and PSDC alone: every row
 * carrying them is a 2026 poll, years after both renames — so in THIS dataset
 * they are a stale source label rather than a preserved historical one. That is
 * a separate question (is the source wrong?) from the one this rule answers (may
 * we rewrite the past?), and it is the creator's to decide. Do not settle it
 * here by adding an alias.
 */
export const NOT_MERGED = ["PMDB", "PSDC", "DEM", "Pros", "Democrata"];

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
