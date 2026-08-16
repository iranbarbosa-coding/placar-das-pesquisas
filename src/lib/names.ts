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

const bare = (w: string) =>
  w.replace(/\.$/, "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function shortName(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  if (parts.length <= 1) return name ?? "";
  return HONORIFIC.has(bare(parts[0])) ? `${parts[0]} ${parts[1]}` : parts[0];
}

/** Initials for a monogram avatar: at most two letters, honorifics skipped. */
export function initials(name: string): string {
  const parts = (name ?? "").trim().split(/\s+/).filter(Boolean);
  const useful = parts.filter((p) => !HONORIFIC.has(bare(p)) && bare(p).length > 1);
  const pick = useful.length ? useful : parts;
  const first = pick[0]?.[0] ?? "";
  const last = pick.length > 1 ? pick[pick.length - 1][0] : "";
  return (first + last).toLocaleUpperCase("pt-BR");
}
