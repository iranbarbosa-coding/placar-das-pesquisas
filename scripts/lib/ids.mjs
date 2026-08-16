// Identity minting.
//
// The whole point of the store is that an id, once minted, NEVER changes —
// so that improving the entity resolution can never re-insert an existing
// survey as a new one. Two properties matter:
//
//   * Ids are derived from a `mint_seed` that is RECORDED on the record and
//     never re-evaluated. The seed is raw source data (a TSE registration, a
//     source's native id), never a canonicalised name.
//   * Minting is deterministic, not random, so the migration can be re-run
//     any number of times while parity diffs are chased and produce the same
//     store byte-for-byte.
import crypto from "node:crypto";

function hash12(seed) {
  return crypto.createHash("sha1").update(seed).digest("hex").slice(0, 12);
}

export function mintSurveyId(seed) {
  return `s_${hash12(seed)}`;
}
export function mintQuestionId(seed) {
  return `q_${hash12(seed)}`;
}
export function mintCrosstabId(seed) {
  return `x_${hash12(seed)}`;
}
export function mintInstituteId(seed) {
  return `i_${hash12(seed)}`;
}
export function mintCandidateId(seed) {
  return `c_${hash12(seed)}`;
}
/**
 * A conflict's id is a function of WHAT IT SAYS, never of when it was logged.
 *
 * It was `k_<n>_<runDate>` — an index plus the run's date. Under the migration
 * that was harmless, because the migration logged almost nothing. Once the
 * scraper started writing through the ladder, every run produced ~333
 * conflicts whose ids changed with the calendar, so rebuilding on a different
 * day rewrote the whole table with nothing but the ids differing. Same class as
 * the `Date.now()` it originally replaced: an id you cannot match against the
 * one you already recorded is not an id.
 */
export function mintConflictId(seed) {
  return `k_${hash12(seed)}`;
}

/** "BR -07845/2026" and "br-07845/2026" are the same registration. */
export function normalizeRegistration(reg) {
  if (!reg) return null;
  const t = String(reg).replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}-?\d+\/\d{4}$/.test(t) ? t.replace(/^([A-Z]{2})-?/, "$1-") : t || null;
}

/** Accent- and case-insensitive key for alias lookups (never for ids). */
export function nameKey(s) {
  return (s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Contest scope for candidate identity: candidates are per-race, per-UF. */
export function contestKey(race, uf) {
  return `${race}:${uf ?? "BR"}`;
}
