#!/usr/bin/env node
// Write data/polls.json FROM the store — the dual-write the plan calls for.
//
// Phase 3 inverts the relationship: the store is the database and polls.json
// becomes a derived artifact, kept for 1–2 weeks so a rollback is one revert.
// The site already reads the store (Phase 2), so this file now serves the
// legacy validator, the diff history, and anything outside the repo.
//
// WHAT THIS DOES TO THE PARITY GATE, said plainly: once polls.json is derived,
// `parity-check.mjs` compares the store against its own output and can no
// longer fail. Its job is done — it existed to prove the migration lost
// nothing, and it did that. From here the guards that carry weight are
// `upsert-vs-migration.mjs` (the write path agrees with the migration),
// `upsert-harness.mjs` (the ladder behaves), `validate-store.mjs`, and the
// before/after diff of this file, which git keeps.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "polls.json");

const store = readStore({ dir: DATA_DIR });
const polls = projectPolls(store);

// Same ordering the scraper used: newest first, id as the deterministic tie-break.
polls.sort((a, b) =>
  (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? "") ||
  String(a.id).localeCompare(String(b.id)));

const dataset = {
  generated_at: store.meta.generated_at ?? new Date().toISOString(),
  // Marca o arquivo como projeção. `migrate-to-store.mjs` recusa lê-lo: ele
  // só traz as perguntas headline e não traz os campos crus, então remigrar a
  // partir daqui apagaria dados a cada rodada.
  derived_from_store: true,
  sources: store.meta.sources ?? [],
  polls,
};

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf-8")) : { polls: [] };
const tmp = OUT + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(dataset, null, 1));
fs.renameSync(tmp, OUT);

console.log(`data/polls.json derivado do store: ${previous.polls.length} → ${polls.length} pesquisas`);
