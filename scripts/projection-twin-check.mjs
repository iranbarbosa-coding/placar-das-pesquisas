#!/usr/bin/env node
// The site and the parity gate must project the store IDENTICALLY.
//
// `scripts/lib/project.mjs` is what `parity-check.mjs` proves correct.
// `src/lib/store.ts` is what actually renders the pages. Nothing but a comment
// held those two in agreement, which means the parity gate could go green
// while the site rendered something else entirely — the exact failure mode
// this project keeps hitting: a green result with no live check behind it.
//
// This runs BOTH and compares their output record by record. The TypeScript
// twin is imported directly; Node ≥22.6 strips the types (store.ts imports its
// types with `import type`, so nothing relative survives erasure).
import assert from "node:assert";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore as readStoreJs, DATA_DIR } from "./lib/store.mjs";
import { projectPolls as projectJs } from "./lib/project.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const ts = await import(path.join(ROOT, "src", "lib", "store.ts"));

const fromJs = projectJs(readStoreJs({ dir: DATA_DIR }));
const fromTs = ts.projectPolls(ts.readStore(DATA_DIR));

const errors = [];
if (fromJs.length !== fromTs.length) {
  errors.push(`contagem diverge: project.mjs ${fromJs.length} × store.ts ${fromTs.length}`);
}

const tsById = new Map(fromTs.map((p) => [p.id, p]));
let compared = 0;
for (const a of fromJs) {
  const b = tsById.get(a.id);
  if (!b) { errors.push(`ausente em store.ts: ${a.id}`); continue; }
  compared++;
  try {
    // `null` and `""` are NOT interchangeable here: the TS twin types the
    // always-present fields as string, so an empty string standing in for a
    // missing value would be a real divergence, not a formatting one.
    assert.deepStrictEqual(normalise(b), normalise(a));
  } catch {
    if (errors.length < 10) {
      errors.push(`divergência em ${a.id}:\n    project.mjs ${JSON.stringify(normalise(a))}\n    store.ts    ${JSON.stringify(normalise(b))}`);
    }
  }
}

// project.mjs emits null where store.ts emits "" for the four fields the site
// types as non-nullable. That substitution is deliberate and is the ONLY
// difference permitted between the twins.
function normalise(p) {
  const out = { ...p };
  for (const f of ["source", "source_url", "scenario", "pollster"]) {
    if (out[f] === null || out[f] === undefined) out[f] = "";
  }
  out.results = (out.results ?? []).map((r) => ({ ...r, candidate: r.candidate ?? "" }));
  return out;
}

if (errors.length) {
  for (const e of errors) console.error(`ERRO ${e}`);
  console.error(`\nGÊMEOS DIVERGIRAM — ${errors.length} problema(s). A projeção do site não é a que a paridade certifica.`);
  process.exit(1);
}
console.log(`GÊMEOS OK — project.mjs e src/lib/store.ts projetam ${compared} pesquisas de forma idêntica`);
