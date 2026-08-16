// The ONE way a candidate name is reduced to a lookup key.
//
// This module exists because the rule had two implementations and they
// disagreed on punctuation. `match-ballot-names.mjs` folded "Dr. Wanderley" to
// `dr wanderley`; `lib/candidates.mjs` folded the same string to
// `dr. wanderley`. The matcher WRITES the keys of `data/ballot-names.json` and
// candidates.mjs READS them, so every ballot name carrying a dot, a comma or an
// apostrophe was written to a key nothing would ever look up — 9 of 370
// entries, silently dead, with no error anywhere because the consume side loads
// the file inside a `catch {}` that treats the register as optional.
//
// The damage was not merely a missed rename. In `senador:AL` the two spellings
// of ONE person resolved to two different candidate ids and CROSSED: the rows
// published as "Dr. Wanderley" were attached to the entity canonicalised as
// "José Wanderley Neto" and vice versa, so the site showed one man under two
// names in a single contest — 10 rows as one, 1 row as the other — and
// contradicted the TSE ballot name on both.
//
// CONVENTIONS §5: one rule, one implementation. Two copies of a normaliser do
// not drift loudly, they drift into a key that never matches.

/**
 * Accent-folded, punctuation-folded, lowercase, single-spaced.
 *
 * Punctuation becomes a SPACE rather than being deleted, so "Manuela D'Ávila"
 * folds to `manuela d avila` and keeps its token boundary. Deleting it instead
 * would glue tokens together (`davila`) and quietly change which names look
 * like subsets of which — the token matcher above this decides who a number
 * belongs to, so that is not a cosmetic difference.
 */
export const normNome = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();
