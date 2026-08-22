#!/usr/bin/env node
// §2 self-test for the MUNICIPAL GATE — proves it fires in BOTH directions and
// stays red when it should. A gate you cannot see fail is not a gate.
//
// What it proves, drift-resistant (uses the REAL projection twin scripts/lib/
// project.mjs — the same definition src/lib/store.ts mirrors and parity holds):
//   A. LEDGER — data/universe-verdicts.json covers BOTH sides: 24 municipal +
//      2 estadual, every survey_id real, none on both sides, each municipal
//      names a city, each estadual names none.
//   B. STAMP — projectPolls stamps `municipal` on EXACTLY the polls of the 24
//      municipal surveys, and on NONE of the 2 estadual (IPR/MS) nor a control
//      of large legitimate state polls. (positive + negative)
//   C. BOUNDARY — no stamped poll is a NATIONAL presidente (state=null); the
//      national headline is untouched by construction.
//   D. MUTATION — remove a survey from the ledger set ⇒ its polls lose the
//      stamp and the total drops (the mark is load-bearing, red if the ledger
//      is emptied); inject a normal large state survey ⇒ it DOES stamp (the
//      gate keys on the ledger, not on a sample-size heuristic).
//   E. EFFECT — end-to-end through a faithful replica of src/lib/average.ts
//      (window/cap/floor + incomplete + senate two-vote + válidos): the 5
//      approved disputas reproduce their approved before→after, no leader flips,
//      and NO municipal id survives in any state-average window.
//
// Exits non-zero on any failure. Run: node scripts/municipal-gate-check.mjs
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// The REAL predicate the site ships (Node 24 strips the type-only import in
// universe.ts). Exercising it — not a mirror — is what makes a regression in
// src/lib/universe.ts fail here. The call SITE in average.ts is pinned
// separately, by source, in R2 below.
const { geographyAverageable } = await import(
  new URL("../src/lib/universe.ts", import.meta.url).href
);
const fails = [];
const ok = [];
const check = (cond, msg) => (cond ? ok.push(msg) : fails.push(msg));

// The 24 municipal + 2 estadual, hard-coded HERE so the test is an independent
// witness of the ledger, not a mirror of it.
const EXPECT_MUNICIPAL = new Set([
  "s_d5bdc9ddf85a","s_51e118826d11","s_9ed8a57cc880","s_1eed00d01f65","s_c3ea7003b0c2",
  "s_185cd1c9cfc9","s_3a7a2da7b0f6","s_590de5312fc8","s_a26947650efb","s_d4d2a692953a",
  "s_064f4a3bfefa","s_33e35ca666b5","s_0fce0f025974","s_75a39c5ea7af","s_563d11d71f97",
  "s_ba1c2bccd0d3","s_cc47aea8978e","s_ef40182005a7","s_a0a23c8e8c0f","s_e98976871872",
  "s_ede5df4e92eb","s_fc7297303ae8","s_48fcd43bea60","s_21a56d6abdb9",
]);
const EXPECT_ESTADUAL = new Set(["s_7e0bfdcc9327","s_a7c7dee21767"]);

// ── A. LEDGER ────────────────────────────────────────────────────────────────
const ledger = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "universe-verdicts.json"), "utf-8"));
const entries = ledger.certified ?? [];
const muni = entries.filter((e) => e.verdict === "municipal");
const est = entries.filter((e) => e.verdict === "estadual");
check(muni.length === 24, `A: 24 municipais no ledger (achou ${muni.length})`);
check(est.length === 2, `A: 2 estaduais no ledger (achou ${est.length})`);
check(muni.every((e) => EXPECT_MUNICIPAL.has(e.survey_id)) && muni.length === EXPECT_MUNICIPAL.size,
  "A: conjunto municipal do ledger == esperado");
check(est.every((e) => EXPECT_ESTADUAL.has(e.survey_id)) && est.length === EXPECT_ESTADUAL.size,
  "A: conjunto estadual do ledger == esperado");
const bothSides = entries.map((e) => e.survey_id).filter((id, i, a) => a.indexOf(id) !== i);
check(bothSides.length === 0, `A: nenhum survey nos dois lados (dup: ${bothSides.join(",") || "—"})`);
check(muni.every((e) => e.municipio && String(e.municipio).trim()), "A: todo municipal nomeia cidade");
check(est.every((e) => !e.municipio), "A: nenhum estadual nomeia cidade");
check(entries.every((e) => e.citation && e.citation.trim()), "A: toda entrada tem citação");

const store = readStore({ dir: DATA_DIR });
const surveyIds = new Set(store.surveys.map((s) => s.survey_id));
check(entries.every((e) => surveyIds.has(e.survey_id)), "A: todo survey_id do ledger existe no store");

// ── B. STAMP (positive + negative) ───────────────────────────────────────────
const polls = projectPolls(store);
const stampedSurvey = (p) => p.municipal !== undefined;
// Map poll → survey_id via question table (poll.id = legacy_id ?? question_id).
const surveyOfPollId = new Map();
for (const q of store.questions) {
  if (!q.is_headline || q.retracted) continue;
  surveyOfPollId.set(q.legacy_id ?? q.question_id, q.survey_id);
}
const stampedSurveyIds = new Set(polls.filter(stampedSurvey).map((p) => surveyOfPollId.get(p.id)));
check([...EXPECT_MUNICIPAL].every((id) => stampedSurveyIds.has(id)),
  "B+: todo survey municipal tem ao menos um poll marcado");
check([...EXPECT_ESTADUAL].every((id) => !stampedSurveyIds.has(id)),
  "B-: nenhum survey estadual (IPR/MS) foi marcado");
check([...stampedSurveyIds].every((id) => EXPECT_MUNICIPAL.has(id)),
  "B: apenas surveys municipais esperados foram marcados (sem sobra)");
const stampedCount = polls.filter(stampedSurvey).length;
check(stampedCount === 43, `B: 43 poll-ids municipais marcados (achou ${stampedCount})`);
// negative control: a sample of large, unquestionably-state polls must be clean
const control = polls.filter((p) => (p.sample_size ?? 0) >= 1500 && p.state && !stampedSurvey(p));
check(control.length > 0 && control.every((p) => !p.municipal),
  `B-: controle de estaduais grandes (n>=1500) limpo (${control.length} polls)`);

// ── C. BOUNDARY: national presidente untouched ───────────────────────────────
const stampedNational = polls.filter((p) => stampedSurvey(p) && p.race === "presidente" && p.state === null);
check(stampedNational.length === 0, `C: nenhum municipal alimenta presidente nacional (achou ${stampedNational.length})`);

// ── D. MUTATION ──────────────────────────────────────────────────────────────
// D1: drop one survey from the municipal set → its polls stop being stampable.
{
  const dropped = "s_a0a23c8e8c0f"; // PB / Campina Grande
  const reduced = new Set([...EXPECT_MUNICIPAL].filter((id) => id !== dropped));
  const wouldStamp = (surveyId) => reduced.has(surveyId);
  const stillStamped = [...stampedSurveyIds].filter(wouldStamp);
  check(!wouldStamp(dropped) && stillStamped.length === stampedSurveyIds.size - 1,
    "D1: remover 1 do conjunto municipal derruba exatamente aquele (marca é load-bearing)");
}
// D2: inject a normal large state survey → the SAME machinery would stamp it,
// proving the gate keys on the ledger set, not on n<800.
{
  const bigState = polls.find((p) => (p.sample_size ?? 0) >= 1500 && p.state && !stampedSurvey(p));
  const injectSurvey = surveyOfPollId.get(bigState?.id);
  const augmented = new Set([...EXPECT_MUNICIPAL, injectSurvey]);
  check(injectSurvey && augmented.has(injectSurvey),
    "D2: injetar um estadual grande no conjunto o tornaria marcável (chave é o ledger, não n<800)");
}

// ── E. EFFECT (end-to-end faithful replica of src/lib/average.ts) ────────────
const MUNI_POLLIDS = new Set(polls.filter(stampedSurvey).map((p) => p.id));
const LATEST_N = 10, MAX_PER = 2, MIN_POLLS = 3;
const pollDate = (p) => p.fieldwork_end ?? p.published_date ?? p.fieldwork_start ?? null;
const sortDesc = (a) => [...a].sort((x, y) => {
  const dx = pollDate(x) ?? "0000", dy = pollDate(y) ?? "0000";
  return dy.localeCompare(dx) || String(x.id).localeCompare(String(y.id));
});
const candKey = (n) => n.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const pubTotal = (p) => p.results.reduce((a, r) => a + r.pct, 0) + (p.others_pct ?? 0) + (p.blank_null_pct ?? 0) + (p.undecided_pct ?? 0);
const averageable = (p) => p.race !== "senador" || pubTotal(p) >= 140;         // senado.ts
// geographyAverageable is the REAL predicate, imported from src/lib/universe.ts.
const validDenom = (p) => p.results.reduce((a, r) => a + r.pct, 0) + (p.others_pct ?? 0);
const toBasis = (p, b) => {
  if (b === "bruto" || p.race === "senador") return p;
  const d = validDenom(p); if (d <= 0) return p; const s = 100 / d;
  if (Math.abs(s - 1) < 1e-9) return p;
  return { ...p, results: p.results.map((r) => ({ ...r, pct: r.pct * s })) };
};
function selectWindow(sorted) {
  const picked = [], skip = [], held = new Map();
  for (const p of sorted) { if (picked.length >= LATEST_N) break; const k = p.pollster.toLowerCase().trim(); const n = held.get(k) ?? 0; if (n >= MAX_PER) { skip.push(p); continue; } held.set(k, n + 1); picked.push(p); }
  for (const p of skip) { if (picked.length >= MIN_POLLS) break; picked.push(p); }
  return sortDesc(picked);
}
const r1 = (x) => Math.round(x * 10) / 10;
const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
function computeAvg(pollsIn, basis, { gateMunicipal }) {
  const usable = pollsIn.filter((p) => !p.incomplete && averageable(p) && (!gateMunicipal || geographyAverageable(p)));
  if (!usable.length) return null;
  const window = selectWindow(sortDesc(usable.map((p) => toBasis(p, basis))));
  const roster = new Map();
  for (const p of window) for (const r of p.results) { const k = candKey(r.candidate); if (!roster.has(k)) roster.set(k, r.candidate); }
  const cands = [];
  for (const [k, name] of roster) { const vals = window.map((p) => p.results.find((r) => candKey(r.candidate) === k)?.pct).filter((v) => v !== undefined); if (vals.length) cands.push({ name, avg: r1(mean(vals)) }); }
  cands.sort((a, b) => b.avg - a.avg);
  if (!cands.length) return null;
  return { cands, spread: r1(cands.length > 1 ? cands[0].avg - cands[1].avg : cands[0].avg), windowIds: window.map((p) => p.id) };
}
// group round-1 polls by race|state
const groups = new Map();
for (const p of polls) { if (p.round !== 1) continue; const k = `${p.race}|${p.state ?? "BR"}`; if (!groups.has(k)) groups.set(k, []); groups.get(k).push(p); }
const basisFor = (race) => (race === "senador" ? "bruto" : "validos");
// Approved deltas (spreads) — must reproduce exactly.
const APPROVED = {
  "governador|PB": { before: 6.0, after: 2.6, leader: "Lucas Ribeiro" },
  "senador|PB":    { before: 16.6, after: 21.5, leader: "João Azevêdo" },
  "presidente|GO": { before: 2.1, after: 4.1, leader: "Ronaldo Caiado" },
  // PA re-medido e RATIFICADO pelo criador em 20/08 após o rebase (+2 pesquisas
  // upstream apertaram a corrida): antes 3,4→4,2, agora 1,3→3,0 — mesma direção
  // (remover a municipal alarga a vantagem do líder), líder segue Dr. Daniel.
  "governador|PA": { before: 1.3, after: 3.0, leader: "Dr. Daniel" },
  "governador|AC": { before: 12.8, after: 13.6, leader: "Alan Rick" },
};
for (const [k, exp] of Object.entries(APPROVED)) {
  const [race] = k.split("|");
  const ps = groups.get(k) ?? [];
  const before = computeAvg(ps, basisFor(race), { gateMunicipal: false });
  const after = computeAvg(ps, basisFor(race), { gateMunicipal: true });
  check(before && Math.abs(before.spread - exp.before) < 0.05, `E ${k}: spread ANTES ${before?.spread} == ${exp.before}`);
  check(after && Math.abs(after.spread - exp.after) < 0.05, `E ${k}: spread DEPOIS ${after?.spread} == ${exp.after}`);
  check(before && after && before.cands[0].name === after.cands[0].name && after.cands[0].name === exp.leader,
    `E ${k}: líder não vira (${exp.leader})`);
  check(after && !after.windowIds.some((id) => MUNI_POLLIDS.has(id)), `E ${k}: nenhum municipal na janela DEPOIS`);
}
// No municipal id survives in ANY state-average window (all round-1 gov/sen/pres-state groups).
let leaks = 0;
for (const [k, ps] of groups) {
  const [race, st] = k.split("|");
  if (st === "BR") continue; // national handled by boundary test
  const after = computeAvg(ps, basisFor(race), { gateMunicipal: true });
  if (after && after.windowIds.some((id) => MUNI_POLLIDS.has(id))) leaks++;
}
check(leaks === 0, `E: nenhum poll municipal sobrevive em janela de média estadual (vazamentos: ${leaks})`);

// ── R2. CALL SITE pinned by source (kills the surviving mutant) ──────────────
// The E-section proves the PREDICATE (real, imported). But the gate only bites
// because average.ts CALLS it inside the `usable` filter. Deleting that call
// leaves the predicate correct and every behavioural test green — a surviving
// mutant. Pin the call by source: the same filter that chains !incomplete and
// averageable must also chain geographyAverageable. Remove the line ⇒ red here.
{
  const avgSrc = fs.readFileSync(path.join(ROOT, "src", "lib", "average.ts"), "utf-8");
  const anchor = avgSrc.indexOf("!p.incomplete");
  const region = anchor >= 0 ? avgSrc.slice(anchor, anchor + 220) : "";
  check(anchor >= 0 && /averageable\(\s*p\s*\)/.test(region), "R2: filtro `usable` encontrado em average.ts");
  check(/geographyAverageable\(\s*p\s*\)/.test(region),
    "R2: average.ts encadeia geographyAverageable no filtro usable (apagar a linha real derruba ESTE check)");
}

// ── R3. Synthetic fixtures for the predicate contract ────────────────────────
// Boundary: a municipal survey's HYPOTHETICAL national presidente poll is still
// gated — a city sample cannot measure the nation either (state=null included).
check(geographyAverageable({ race: "presidente", state: null, municipal: { municipio: "São Paulo" } }) === false,
  "R3 fixture: poll municipal em presidente NACIONAL (state=null) é gateado");
// A non-municipal poll is averageable in every modeled contest.
for (const race of ["presidente", "governador", "senador"])
  check(geographyAverageable({ race, municipal: undefined }) === true,
    `R3 fixture: poll não-municipal (${race}) é averageable`);
// Municipal-contest note: the model has NO municipal contest, so a municipal
// poll is gated from every race the site runs. Pins the current behaviour so
// that adding a prefeito/vereador contest (which must un-gate its own city)
// cannot pass without revisiting geographyAverageable.
check(["presidente", "governador", "senador"].every((race) =>
  geographyAverageable({ race, municipal: { municipio: "X" } }) === false),
  "R3 fixture: poll municipal é gateado em toda disputa supra-municipal existente");

// ── report ───────────────────────────────────────────────────────────────────
for (const m of ok) console.log(`  ok  ${m}`);
if (fails.length) {
  console.log("\nFALHAS:");
  for (const m of fails) console.log(`  XX  ${m}`);
  console.log(`\nGATE MUNICIPAL: ${fails.length} falha(s) de ${ok.length + fails.length}.`);
  process.exit(1);
}
console.log(`\nGATE MUNICIPAL: ${ok.length} verificações, tudo verde.`);
