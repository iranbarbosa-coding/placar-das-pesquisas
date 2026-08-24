/**
 * Candidate-name helpers, free of Node built-ins.
 *
 * These live apart from `lib/home.ts` for the same reason `lib/format.ts` lives
 * apart from `lib/data.ts`: `home.ts` reaches the NDJSON store through
 * `data.ts` → `store.ts` → `node:fs`, so a VALUE import of anything in it from
 * a client component drags a filesystem read into the browser bundle and the
 * build dies on `UnhandledSchemeError`.
 *
 * Three separate components hit this independently — the runoff carousel, the
 * race table and the badge — and each worked around it with its own private
 * copy of the same helper. Three copies of one rule is how they drift. This is
 * the shared one; `home.ts` re-exports it so server callers are unaffected.
 */

/**
 * The short form of a candidate's name, for badges and dense tables.
 *
 * Usually the first token — but NOT when the first token is an honorific that
 * is part of how the person is actually known. "Cabo Daciolo" shortened to
 * "Cabo" names nobody; the same for "Professora Dorinha", "Delegado Alessandro"
 * and "Major Paulo Roberto". Brazilian ballot names lean heavily on these, so
 * the exception is the common case, not a curiosity.
 */
const HONORIFIC = new Set([
  "cabo", "major", "coronel", "capitao", "capitão", "sargento", "tenente",
  "soldado", "delegado", "delegada", "professor", "professora", "dr", "dra",
  "doutor", "doutora", "pastor", "pastora", "padre", "irmao", "irmão", "irma",
  "irmã", "senador", "senadora", "deputado", "deputada", "prefeito", "prefeita",
  "vereador", "vereadora", "general", "almirante", "brigadeiro", "juiz", "juiza",
  "juíza", "economista", "engenheiro", "engenheira", "advogado", "advogada",
]);

/**
 * Ballot PROFESSIONS that are NOT part of how the person is known, so they are
 * DROPPED rather than kept: "Escritor Augusto Cury" → "Augusto", "Veterinário
 * Wilson Grassi" → "Wilson". The line vs `HONORIFIC` is whether the title brands
 * the person (kept — "Cabo Daciolo") or is just an occupation label (dropped).
 */
const PROFESSION = new Set([
  "escritor", "escritora", "veterinario", "veterinaria",
  "empresario", "empresaria", "medico", "medica",
]);

const bare = (w: string) =>
  w.replace(/\.$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/**
 * People the public knows by a token that is NOT their first name — the
 * single-name form used in headlines and on the ballot. "Ronaldo Caiado" is
 * "Caiado", never "Ronaldo", the same way the surname wins for Lula/Bolsonaro/
 * Tarcísio. Keyed by the accent-folded full name.
 */
const KNOWN_AS = new Map<string, string>([
  ["ronaldo caiado", "Caiado"],
  ["cleitinho azevedo", "Cleitinho"],
]);

const foldFull = (name: string) =>
  (name ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim().replace(/\s+/g, " ");

export function shortName(name: string): string {
  const known = KNOWN_AS.get(foldFull(name));
  if (known) return known;
  let parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  // Drop leading occupation labels first (they name nobody), then keep a branding
  // honorific if that is what leads.
  while (parts.length > 1 && PROFESSION.has(bare(parts[0]))) parts = parts.slice(1);
  if (parts.length <= 1) return parts[0] ?? name ?? "";
  return HONORIFIC.has(bare(parts[0])) ? `${parts[0]} ${parts[1]}` : parts[0];
}

/**
 * The DISPLAY form of a name: the full name minus a leading occupation label
 * ("Escritor Augusto Cury" → "Augusto Cury"). Unlike `shortName` it keeps the
 * surname; unlike the raw ballot name it drops the profession. Use it for text
 * display only — never as a colour/identity key (`candKey` must see the original).
 *
 * A `KNOWN_AS` person is the exception: someone the public knows by a single
 * token (Caiado, Cleitinho) is shown by that token even here — writing the full
 * name would be the odd form, not the informative one.
 */
export function displayName(name: string): string {
  const known = KNOWN_AS.get(foldFull(name));
  if (known) return known;
  let parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && PROFESSION.has(bare(parts[0]))) parts = parts.slice(1);
  return parts.join(" ") || (name ?? "");
}

/** Initials for a monogram avatar: at most two letters, titles skipped. */
export function initials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const useful = parts.filter((p) => !HONORIFIC.has(bare(p)) && !PROFESSION.has(bare(p)) && bare(p).length > 1);
  const pick = useful.length ? useful : parts;
  const first = pick[0]?.[0] ?? "";
  const last = pick.length > 1 ? pick[pick.length - 1][0] : "";
  return (first + last).toLocaleUpperCase("pt-BR");
}
