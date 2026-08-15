// Candidate identity: the curated table, applied.
//
// Replaces the guessing that `sameCandidate()` does with a decided answer.
// `data/candidate-aliases.json` records, per contest, which ballot names are
// one person and which are not — each decided against public record (article
// identity, sourced research, or a creator ruling) rather than by string
// similarity. See REVISAO_CANDIDATOS.md for the evidence dossier.
//
// TWO DIRECTIONS, and the second matters as much as the first:
//   · `canonicalCandidate` folds a group's spellings onto one display name.
//   · `areDistinct` answers "these two were CHECKED and are different people",
//     which is what stops the fuzzy matcher from merging "Ciro Nogueira" into
//     "Ciro", or any Bolsonaro into any other Bolsonaro.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "candidate-aliases.json");
const RULINGS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "candidate-rulings.json");

const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

let TABLE = null;
function table() {
  if (TABLE) return TABLE;
  let spec = { groups: [], distinct: [] };
  try { spec = JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { /* table is optional */ }
  const display = new Map();   // `${contest}|${norm(name)}` -> display name
  const distinct = new Set();  // `${contest}|${norm(a)}|${norm(b)}` (sorted)
  for (const g of spec.groups ?? []) {
    for (const m of g.members ?? []) display.set(`${g.contest}|${norm(m)}`, g.display);
  }
  // Rulings are applied HERE, at consume time, not only when the table is
  // regenerated. The generator discovers pairs by scanning the data — and once
  // a merge is applied the variants stop appearing in it, so the scan can no
  // longer rediscover a decision already made. The decision is the durable
  // artifact; the generated table is a materialisation of it.
  try {
    const ruled = JSON.parse(fs.readFileSync(RULINGS, "utf-8"));
    for (const r of ruled.rulings ?? []) {
      if (r.verdict !== "MESMA" || !r.canonical) continue;
      for (const n of r.names ?? []) display.set(`${r.contest}|${norm(n)}`, r.canonical);
    }
  } catch { /* rulings are optional */ }
  for (const d of spec.distinct ?? []) {
    const [a, b] = (d.names ?? []).map(norm).sort();
    if (a && b) distinct.add(`${d.contest}|${a}|${b}`);
  }
  TABLE = { display, distinct, groups: spec.groups ?? [] };
  return TABLE;
}

/**
 * The name this candidate should be recorded under in `contest`.
 * Unknown names pass through untouched — the table covers the pairs that were
 * flagged and checked, not the whole roster.
 */
export function canonicalCandidate(name, contest) {
  if (!name) return name;
  return table().display.get(`${contest}|${norm(name)}`) ?? name;
}

/** Were these two names CHECKED and found to be different people? */
export function areDistinct(a, b, contest) {
  const [x, y] = [norm(a), norm(b)].sort();
  return table().distinct.has(`${contest}|${x}|${y}`);
}

export function groups() { return table().groups; }

/** Reset for tests that rewrite the table on disk. */
export function reload() { TABLE = null; }
