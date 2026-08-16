#!/usr/bin/env node
// Rebuilding the store twice, on two DIFFERENT dates, must produce byte-identical
// tables. `meta.migrated_at` is the single permitted difference.
//
// This is the guard for a defect that was live and invisible: every date was
// read from the wall clock at the point of use, so a rebuild on a later day
// rewrote all 4.613 records with nothing but the stamps changed. Nothing failed
// — the store stayed valid and parity stayed green — you simply lost the
// three-line reviewable diff that NDJSON exists to give you, and with it the
// ability to tell a real regression from date churn.
//
// Two properties are checked, because either alone would pass while broken:
//   (1) INJECTION  — a fresh build stamps the date it was GIVEN, never today's.
//                    Without this, `runDate` could be ignored entirely.
//   (2) PRESERVATION — a rebuild carries forward the stamps it already had.
//                    Without this, every run re-dates the whole store.
//
// `--self-test` proves the check can fail, by wiping the store between the two
// runs so nothing is available to preserve — exactly the old behaviour. A guard
// whose failure path has never been executed is not evidence of anything.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeStoreFromPolls } from "./lib/build-store.mjs";

// Drives the SAME builder the scraper does. It used to drive
// `migrate-to-store.mjs`; once the scraper switched to the resolution ladder
// (2026-08-16) that would have left this guard proving a property of code the
// pipeline no longer runs — a green check for a dead path.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEGACY = path.join(ROOT, "data", "polls.json");
const build = (runDate, dir) =>
  writeStoreFromPolls(JSON.parse(fs.readFileSync(LEGACY, "utf-8")).polls, {
    runDate, dir, meta: { built_by: "idempotence-check" },
  });

const TABLES = ["surveys", "questions", "crosstabs", "institutes", "candidates", "registry", "searches", "conflicts"];
const DATE_A = "2026-01-02";
const DATE_B = "2027-09-30";

const snapshot = (dir) =>
  Object.fromEntries(TABLES.map((t) => {
    const f = path.join(dir, `${t}.ndjson`);
    return [t, fs.existsSync(f) ? fs.readFileSync(f, "utf-8") : ""];
  }));

/** Every date this store stamps, flattened, so a stray wall-clock read shows up. */
function stampsIn(dir) {
  const found = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (["first_seen", "created_at", "updated_at", "at"].includes(k) && typeof val === "string") {
          found.add(val.slice(0, 10));
        } else walk(val);
      }
    }
  };
  for (const t of TABLES) {
    const f = path.join(dir, `${t}.ndjson`);
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf-8").split("\n")) {
      if (line.trim()) walk(JSON.parse(line));
    }
  }
  return found;
}

function run({ selfTest = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-idem-"));
  const errors = [];
  try {
    // ---- run 1: a fresh build on DATE_A -----------------------------------
    build(DATE_A, dir);
    const first = snapshot(dir);
    const stampsA = stampsIn(dir);

    // (1) injection: nothing may carry a date other than the one we injected.
    const strays = [...stampsA].filter((d) => d !== DATE_A);
    if (strays.length) {
      errors.push(`(1) injeção: carimbos fora de ${DATE_A} → ${JSON.stringify(strays.slice(0, 5))} (relógio de parede vazando)`);
    }

    if (selfTest) {
      // Simulate the old behaviour: nothing survives for run 2 to preserve.
      for (const t of TABLES) fs.rmSync(path.join(dir, `${t}.ndjson`), { force: true });
    }

    // ---- run 2: rebuild on DATE_B ------------------------------------------
    build(DATE_B, dir);
    const second = snapshot(dir);

    // (2) preservation: byte-identical tables despite the different date.
    for (const t of TABLES) {
      if (first[t] === second[t]) continue;
      const a = first[t].split("\n"), b = second[t].split("\n");
      const changed = a.filter((l, i) => l !== b[i]).length;
      errors.push(`(2) preservação: ${t}.ndjson mudou em ${changed} linha(s) entre ${DATE_A} e ${DATE_B}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return errors;
}

const selfTest = process.argv.includes("--self-test");

if (selfTest) {
  const errors = run({ selfTest: true });
  if (!errors.length) {
    console.error("AUTOTESTE FALHOU: a verificação passou mesmo sem nada a preservar — ela não detecta o defeito que existe para detectar.");
    process.exit(1);
  }
  console.log("autoteste: a verificação DISPARA quando os carimbos não são preservados");
  for (const e of errors.slice(0, 3)) console.log(`  detectado → ${e}`);
  process.exit(0);
}

const errors = run();
if (errors.length) {
  for (const e of errors) console.error(`ERRO ${e}`);
  console.error(`\nIDEMPOTÊNCIA FALHOU — reconstruir em outra data altera o store.`);
  process.exit(1);
}
console.log(`IDEMPOTÊNCIA OK — reconstruir em ${DATE_A} e em ${DATE_B} produz tabelas byte-idênticas`);
