#!/usr/bin/env node
// Phase 3's real gate: does the UPSERT path produce the same database the
// migration does?
//
// The migration mints ids directly from a grouping key. The scraper Phase 3
// ships will instead feed each poll through `upsertPoll`, letting the
// resolution ladder decide what is new and what is an update. Those two must
// agree before the scraper is switched over — otherwise the first live run
// silently reshapes the database and the only evidence is a diff nobody
// looked at.
//
// Feeds `data/polls.json` through the upsert path in SOURCE PRIORITY ORDER and
// compares the result against the store the migration built. No network.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, writeStore, markHeadlines, DATA_DIR, SOURCE_ORDER } from "./lib/store.mjs";
import { upsertPoll } from "./lib/upsert.mjs";
import { projectPolls } from "./lib/project.mjs";
import { validateStore } from "./validate-store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const RUN_DATE = "2026-08-15";

const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "polls.json"), "utf-8"));

// FIRST WRITER WINS, so the order is the source priority, not file order.
const rank = (s) => { const i = SOURCE_ORDER.indexOf(s); return i === -1 ? SOURCE_ORDER.length : i; };
const ordered = [...legacy.polls].sort((a, b) =>
  rank(a.source) - rank(b.source) ||
  (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? "") ||
  String(a.id).localeCompare(String(b.id)));

const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-upsert-run-"));
const store = readStore({ dir, tables: [], runDate: RUN_DATE });

const nativeOf = (p) => /^p360-(\d+)-/.exec(p.id ?? "")?.[1] ?? null;
const report = {};
for (const p of ordered) {
  const { matched_by } = upsertPoll(store, p, { source: p.source, runId: "gate", nativeId: nativeOf(p) });
  report[matched_by] = (report[matched_by] ?? 0) + 1;
}
markHeadlines(store);

console.log(`entradas: ${ordered.length}`);
console.log(`resolução: ${JSON.stringify(report)}`);
console.log(`store do upsert: ${store.surveys.length} levantamentos · ${store.questions.length} perguntas · ` +
  `${store.institutes.length} institutos · ${store.candidates.length} candidatos · ${store.conflicts.length} conflitos`);

const migrated = readStore({ dir: DATA_DIR });
console.log(`store da migração: ${migrated.surveys.length} levantamentos · ${migrated.questions.length} perguntas · ` +
  `${migrated.institutes.length} institutos · ${migrated.candidates.length} candidatos`);

const { errors } = validateStore(store, { minSurveys: 100, minQuestions: 500 });
console.log(`validador sobre o store do upsert: ${errors.length} erro(s)`);
for (const e of errors.slice(0, 8)) console.log(`   ${e}`);

// The comparison that matters: does the SITE see the same thing? Compare the
// projections, keyed by legacy id, on the fields every average is built from.
const A = new Map(projectPolls(migrated).map((p) => [p.id, p]));
const B = new Map(projectPolls(store).map((p) => [p.id, p]));
console.log(`\nprojeção — migração: ${A.size} · upsert: ${B.size}`);

const soA = [...A.keys()].filter((k) => !B.has(k));
const soB = [...B.keys()].filter((k) => !A.has(k));
if (soA.length) console.log(`  só na migração: ${soA.length} (ex.: ${soA.slice(0, 3).join(", ")})`);
if (soB.length) console.log(`  só no upsert:   ${soB.length} (ex.: ${soB.slice(0, 3).join(", ")})`);

let diff = 0;
const campos = ["pollster", "race", "state", "round", "fieldwork_end", "sample_size", "margin_of_error"];
const exemplos = [];
for (const [id, a] of A) {
  const b = B.get(id);
  if (!b) continue;
  for (const f of campos) {
    if (JSON.stringify(a[f] ?? null) !== JSON.stringify(b[f] ?? null)) {
      diff++;
      if (exemplos.length < 8) exemplos.push(`${id}.${f}: migração ${JSON.stringify(a[f])} ≠ upsert ${JSON.stringify(b[f])}`);
      break;
    }
  }
  const ra = [...(a.results ?? [])].sort((x, y) => x.candidate.localeCompare(y.candidate));
  const rb = [...(b.results ?? [])].sort((x, y) => x.candidate.localeCompare(y.candidate));
  if (ra.length !== rb.length || ra.some((r, i) => r.candidate !== rb[i].candidate || Math.abs(r.pct - rb[i].pct) > 0.001)) {
    diff++;
    if (exemplos.length < 8) exemplos.push(`${id}: resultados divergem (${ra.length} × ${rb.length})`);
  }
}
console.log(`  divergências em pesquisas comuns: ${diff}`);
for (const e of exemplos) console.log(`     ${e}`);

fs.rmSync(dir, { recursive: true, force: true });

const ok = !soA.length && !soB.length && !diff && !errors.length;
console.log(ok
  ? "\nPORTÃO OK — o caminho de upsert reproduz a migração."
  : "\nPORTÃO REPROVOU — o caminho de upsert produz um banco diferente do da migração.");
process.exit(ok ? 0 : 1);
