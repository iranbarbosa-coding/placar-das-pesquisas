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

/** How many diacritics a string carries — the tiebreak for the case below. */
export const acentos = (s) => (String(s ?? "").normalize("NFD").match(/[̀-ͯ]/g) ?? []).length;

/**
 * The register's diacritics are not reliable, and dropping ours would look like
 * a typo on every page.
 *
 * TSE writes "PABLO MARÇAL" and "VETERINÁRIO WILSON GRASSI" with their accents
 * and "FLAVIO BOLSONARO" and "CLARIANA BARAO" without — 29 of 521 candidacies
 * carry a ballot name stripped of accents the name actually has. Publishing
 * "Flavio Bolsonaro" is not adopting the official name, it is misspelling it.
 *
 * So when the polled name and the ballot name are THE SAME NAME apart from
 * diacritics, the better-accented spelling wins. This is not overriding the
 * register — the string is identical under accent folding, which is exactly why
 * it is safe. When the two differ as names ("Allyson Bezerra" vs "Allyson"),
 * the ballot name wins outright, accents or not.
 *
 * Mora aqui, e não em `match-ballot-names.mjs`, desde que `people.ndjson`
 * passou a precisar da MESMA decisão para escolher o `display` de uma pessoa
 * vista sob várias grafias. Uma cópia teria feito o site publicar "Flávio
 * Bolsonaro" e a tabela de pessoas dizer "Flavio Bolsonaro" — a mesma pessoa,
 * dois nomes, que é o defeito de `senador:AL` outra vez (CONVENTIONS §5).
 */
export function melhorGrafia(nomePesquisa, nomeUrna) {
  if (normNome(nomePesquisa) !== normNome(nomeUrna)) return nomeUrna;
  return acentos(nomePesquisa) > acentos(nomeUrna) ? nomePesquisa : nomeUrna;
}
