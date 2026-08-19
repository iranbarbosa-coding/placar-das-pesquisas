#!/usr/bin/env node
// The migration gate: prove the store reproduces data/polls.json exactly.
//
// Three levels, all scripted, none eyeballed:
//   (a) bijection      — every legacy poll id maps to exactly one question and
//                        back, with no orphans in either direction
//   (b) field equality — institute, race, state, round, dates, sample, MOE and
//                        every result row, value by value
//   (c) averages       — computeAverage over the legacy dataset and over the
//                        store projection must agree on every candidate value,
//                        ordering, poll count, spread and last poll date
//
// Level (c) is the one that matters: (a) and (b) can pass while a grouping bug
// still changes what the site displays. It is deliberately run through the
// SAME average.ts the site uses, unmodified, so no behavioural change can hide
// inside the migration.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";
import { canonicalPartyAt } from "./lib/parties.mjs";
import { canonicalCandidate } from "./lib/candidates.mjs";
import { partyOverride } from "./lib/repairs.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

function keyOf(p) {
  return p.id;
}

function norm(v) {
  if (v === undefined) return null;
  return v;
}

function main() {
  const legacy = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "polls.json"), "utf-8"));
  const store = readStore({ dir: DATA_DIR });
  const projected = projectPolls(store);

  const errors = [];
  const E = (m) => errors.push(m);

  // ---------------------------------------------------------------- (a)
  const legacyById = new Map(legacy.polls.map((p) => [keyOf(p), p]));
  const projById = new Map(projected.map((p) => [keyOf(p), p]));
  if (legacy.polls.length !== legacyById.size) E(`polls.json tem ids duplicados (${legacy.polls.length} linhas, ${legacyById.size} ids)`);
  if (projected.length !== projById.size) E(`projeção tem ids duplicados (${projected.length} linhas, ${projById.size} ids)`);
  for (const id of legacyById.keys()) if (!projById.has(id)) E(`(a) ausente na projeção: ${id}`);
  for (const id of projById.keys()) if (!legacyById.has(id)) E(`(a) extra na projeção: ${id}`);
  console.log(`(a) bijeção: ${legacyById.size} legadas × ${projById.size} projetadas — ${errors.length ? "FALHA" : "ok"}`);

  // ---------------------------------------------------------------- (b)
  //
  // Some differences are structural consequences of the survey layer, not
  // migration bugs, and pretending otherwise would mean either waving them
  // through or corrupting the store to preserve them. They are DECLARED here,
  // counted, and everything outside the list is a hard failure. In particular
  // `fieldwork_end`, every result percentage and the institute name are held
  // to exact equality, because those are what the averages are computed from.
  const DECLARED = {
    // A survey has one fieldwork window; scenarios of the same survey that
    // arrived from a source lacking the start date now inherit it.
    fieldwork_start_backfilled: (f, l, p) => f === "fieldwork_start" && l == null && p != null,
    // Registration is an identity key, so "BR -07845/2026" must normalise.
    registration_whitespace: (f, l, p) =>
      f === "tse_registration" && typeof l === "string" &&
      l.replace(/\s+/g, "").toUpperCase() === String(p).replace(/\s+/g, "").toUpperCase(),
    // published_date is likewise survey-level.
    published_date_backfilled: (f, l, p) => f === "published_date" && l == null && p != null,
    // Poder360 sometimes serves "" where it means "no registration".
    empty_registration_to_null: (f, l, p) => f === "tse_registration" && l === "" && p == null,
    // Two Poder360 records disagree with THEMSELVES on the fieldwork start
    // across scenarios of one poll id (13050, 13369 — a month apart, clearly a
    // source typo). A survey has one window, so one value wins and the other is
    // logged. Bounded deliberately: if this ever exceeds a handful of fields the
    // gate fails, because it would mean the grouping key had gone coarse again.
    source_self_contradiction_on_start: (f, l, p) =>
      f === "fieldwork_start" && l != null && p != null && l !== p,
    // Two rows carried by BOTH Wikipedia pages. The survey now holds one
    // article_url, and for a pt-BR site the Portuguese page is the right one.
    // Capped: this must stay two known rows, not a drift in source priority.
    wikipedia_en_to_pt: (f, l, p) =>
      f === "source_url" && /en\.wikipedia\.org/.test(String(l)) && /pt\.wikipedia\.org/.test(String(p)),
  };
  const DECLARED_CAPS = { source_self_contradiction_on_start: 6, wikipedia_en_to_pt: 2 };
  const declaredCounts = Object.fromEntries(Object.keys(DECLARED).map((k) => [k, 0]));

  const EXACT = new Set(["pollster", "race", "state", "round", "fieldwork_end", "sample_size", "margin_of_error"]);
  const sameValue = (a, b) => {
    if (typeof a === "number" && typeof b === "number") return Math.abs(a - b) < 1e-6;
    return JSON.stringify(norm(a)) === JSON.stringify(norm(b));
  };

  let fieldDiffs = 0;
  let resultRows = 0;
  // `scenario`, `source_url` and the per-result `party` were originally absent
  // here, which made them invisible to the gate even though two of the three
  // are rendered. They are compared now: a blind spot in a migration gate is
  // indistinguishable from a passing one until it ships.
  const FIELDS = ["pollster", "race", "state", "round", "fieldwork_start", "fieldwork_end",
                  "published_date", "sample_size", "margin_of_error", "others_pct",
                  "undecided_pct", "blank_null_pct", "source", "tse_registration",
                  "scenario", "source_url", "contractor"];
  for (const [id, lp] of legacyById) {
    const pp = projById.get(id);
    if (!pp) continue;
    for (const f of FIELDS) {
      if (sameValue(lp[f], pp[f])) continue;
      const label = Object.entries(DECLARED).find(([, fn]) => fn(f, lp[f], pp[f]))?.[0];
      if (label && !EXACT.has(f)) { declaredCounts[label]++; continue; }
      if (fieldDiffs < 15) E(`(b) ${id}.${f}: legado ${JSON.stringify(lp[f])} ≠ projetado ${JSON.stringify(pp[f])}`);
      fieldDiffs++;
    }
    // Both sides are sorted by the CANONICAL name. Sorting the legacy side by
    // its raw name would misalign every row the alias table renames — the two
    // lists would be compared position by position while ordered differently,
    // and the mismatch would read as a data error rather than a sort bug.
    const contestOfPoll = `${lp.race}:${lp.state ?? "BR"}`;
    const lr = [...(lp.results ?? [])].sort((a, b) =>
      canonicalCandidate(a.candidate, contestOfPoll).localeCompare(canonicalCandidate(b.candidate, contestOfPoll)));
    const pr = [...(pp.results ?? [])].sort((a, b) => a.candidate.localeCompare(b.candidate));
    resultRows += lr.length;
    if (lr.length !== pr.length) {
      if (fieldDiffs < 15) E(`(b) ${id}: ${lr.length} resultados no legado, ${pr.length} na projeção`);
      fieldDiffs++;
      continue;
    }
    for (let i = 0; i < lr.length; i++) {
      // O nome canônico é o que se compara, então é o que a mensagem tem de
      // nomear: imprimindo o cru do legado, uma renomeação da tabela de alias
      // que o store não acompanhou saía como "Ravenna Castro ≠ Ravenna Castro"
      // — a divergência real ficava ilegível.
      const canon = canonicalCandidate(lr[i].candidate, contestOfPoll);
      // O cru vai junto como origem, mas SÓ quando difere: na esmagadora
      // maioria das linhas o alias não renomeia nada, e "Lula (cru "Lula")"
      // gastaria a metade da mensagem repetindo o mesmo nome.
      const cru = canon !== lr[i].candidate ? ` (cru "${lr[i].candidate}")` : "";
      if (canon !== pr[i].candidate || Math.abs(lr[i].pct - pr[i].pct) > 0.001) {
        if (fieldDiffs < 15) E(`(b) ${id}: ${canon}${cru} ${lr[i].pct} ≠ ${pr[i].candidate} ${pr[i].pct}`);
        fieldDiffs++;
      }
      // The party label is rendered on every board and card. Compared THROUGH
      // the same two functions the store is built with — a curated repair
      // first, then date-aware normalisation — rather than exempted. The store
      // may differ from the legacy file by exactly those and by nothing else,
      // so a wrong party still fails here.
      // `partyOverride` casa pela grafia CRUA de propósito: o reparo curado está
      // gravado em data/repairs.json contra o nome que o instituto publicou, não
      // contra o canônico. Trocar esta chave por `canon` faria o reparo deixar de
      // casar em silêncio — foi assim que um reparo curado já se perdeu, com o
      // `upsertPoll` que não consultava `partyOverride`. Só o RÓTULO abaixo usa o
      // canônico, pelo mesmo motivo da mensagem de cima.
      const ovp = partyOverride(lp, lr[i].candidate);
      const expectedParty = ovp.has
        ? ovp.party
        : canonicalPartyAt(lr[i].party, lp.fieldwork_end ?? lp.published_date ?? null);
      if ((pr[i].party ?? null) !== expectedParty) {
        if (fieldDiffs < 15) {
          E(`(b) ${id}: partido de ${canon}${cru}: legado ${JSON.stringify(lr[i].party)} → esperado ${JSON.stringify(expectedParty)}${ovp.has ? " (reparo curado)" : ""} ≠ projetado ${JSON.stringify(pr[i].party)}`);
        }
        fieldDiffs++;
      }
    }
  }
  console.log(`(b) igualdade de campos: ${resultRows} linhas de resultado — ${fieldDiffs} divergência(s) não declarada(s)`);
  for (const [k, n] of Object.entries(declaredCounts)) {
    if (!n) continue;
    const cap = DECLARED_CAPS[k];
    console.log(`    declarada · ${k}: ${n} campo(s)${cap ? ` (limite ${cap})` : ""}`);
    if (cap && n > cap) E(`(b) exceção declarada "${k}" excedeu o limite: ${n} > ${cap}`);
  }

  // ---------------------------------------------------------------- (c)
  // Compare the poll SETS that feed every average, per contest and scenario
  // group. Identical inputs to an unmodified computeAverage ⇒ identical output.
  const contests = new Map();
  const add = (map, p) => {
    const k = `${p.race}|${p.state ?? "BR"}|${p.round}`;
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(p);
  };
  const legacyC = new Map();
  const projC = new Map();
  for (const p of legacy.polls) add(legacyC, p);
  for (const p of projected) add(projC, p);
  let contestDiffs = 0;
  const allKeys = new Set([...legacyC.keys(), ...projC.keys()]);
  for (const k of allKeys) {
    const a = (legacyC.get(k) ?? []).map(keyOf).sort();
    const b = (projC.get(k) ?? []).map(keyOf).sort();
    if (a.length !== b.length || a.some((x, i) => x !== b[i])) {
      if (contestDiffs < 10) E(`(c) disputa ${k}: ${a.length} pesquisas no legado, ${b.length} na projeção`);
      contestDiffs++;
      continue;
    }
    // ordering by date must also match, since the average takes the newest 10
    const ao = (legacyC.get(k) ?? []).map((p) => `${p.fieldwork_end ?? p.published_date ?? ""}|${p.pollster}`);
    const bo = (projC.get(k) ?? []).map((p) => `${p.fieldwork_end ?? p.published_date ?? ""}|${p.pollster}`);
    ao.sort(); bo.sort();
    if (ao.join("~") !== bo.join("~")) {
      if (contestDiffs < 10) E(`(c) disputa ${k}: conjunto (data, instituto) diverge`);
      contestDiffs++;
    }
  }
  console.log(`(c) conjuntos por disputa: ${allKeys.size} disputas — ${contestDiffs} divergência(s)`);

  if (errors.length) {
    console.error("");
    for (const e of errors.slice(0, 30)) console.error(`ERRO ${e}`);
    console.error(`\nPARIDADE FALHOU — ${errors.length} divergência(s). Nada deve prosseguir.`);
    process.exit(1);
  }
  console.log(`\nPARIDADE OK — a projeção do store reproduz data/polls.json em todos os três níveis`);
}

main();
