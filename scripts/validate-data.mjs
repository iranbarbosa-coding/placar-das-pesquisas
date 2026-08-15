#!/usr/bin/env node
// Validation gate for data/polls.json (or a candidate file passed as argv).
// The scraper only replaces the live dataset if this passes — the site must
// never build from a corrupt or truncated dataset.
//
// IMPORTANT (learned the hard way): every guard below is exercised by
// `npm run validate-data -- --self-test`, which feeds known-bad datasets and
// asserts each one FAILS. A validator whose failure paths never fired proves
// nothing.
import fs from "node:fs";

const RACES = new Set(["presidente", "governador", "senador"]);
const UFS = new Set(["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"]);

export function validate(ds, { minPolls = 50 } = {}) {
  const errors = [];
  const warn = [];
  if (!ds || typeof ds !== "object") return { errors: ["dataset is not an object"], warn };
  if (!Array.isArray(ds.polls)) return { errors: ["polls is not an array"], warn };
  if (!ds.generated_at || Number.isNaN(Date.parse(ds.generated_at))) errors.push("generated_at missing/invalid");
  if (ds.polls.length < minPolls) errors.push(`only ${ds.polls.length} polls (< ${minPolls}) — refusing suspicious shrink`);

  const ids = new Set();
  ds.polls.forEach((p, i) => {
    const at = `poll[${i}] (${p?.pollster ?? "?"} ${p?.fieldwork_end ?? ""})`;
    if (!p.id) errors.push(`${at}: missing id`);
    else if (ids.has(p.id)) errors.push(`${at}: duplicate id ${p.id}`);
    else ids.add(p.id);
    if (!RACES.has(p.race)) errors.push(`${at}: bad race ${p.race}`);
    // Presidential polls may be national (state null) OR state-scoped: state
    // institutes ask the presidential question to their own sample. Both are
    // valid; the site separates them by matching `state` exactly.
    if (p.state !== null && !UFS.has(p.state)) errors.push(`${at}: bad state ${p.state}`);
    if (p.race !== "presidente" && p.state === null) errors.push(`${at}: ${p.race} requires a state`);
    if (p.round !== 1 && p.round !== 2) errors.push(`${at}: bad round ${p.round}`);
    if (!p.pollster) errors.push(`${at}: missing pollster`);
    if (!p.source_url) errors.push(`${at}: missing source_url`);
    if (!Array.isArray(p.results) || p.results.length < 1) errors.push(`${at}: no results`);
    else {
      let sum = 0;
      for (const r of p.results) {
        if (!r.candidate) errors.push(`${at}: result missing candidate`);
        if (typeof r.pct !== "number" || r.pct < 0 || r.pct > 100) errors.push(`${at}: bad pct ${r.pct} for ${r.candidate}`);
        else sum += r.pct;
      }
      sum += (p.undecided_pct ?? 0) + (p.blank_null_pct ?? 0) + (p.others_pct ?? 0);
      // Senate 2026 elects two seats per state — polls ask for two votes, so
      // totals legitimately approach 200% (plus undecided overlap).
      const sumCap = p.race === "senador" ? 260 : 130;
      if (sum > sumCap) errors.push(`${at}: results sum ${sum.toFixed(1)} > ${sumCap}`);
      if (sum < 30) warn.push(`${at}: results sum only ${sum.toFixed(1)}`);
    }
    const dates = [p.fieldwork_start, p.fieldwork_end, p.published_date].filter(Boolean);
    for (const d of dates) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(d)) errors.push(`${at}: non-ISO date ${d}`);
      else if (d < "2023-01-01" || d > "2027-01-01") errors.push(`${at}: implausible date ${d}`);
    }
    if (!p.fieldwork_end && !p.published_date) warn.push(`${at}: no usable date`);
  });
  return { errors: errors.slice(0, 40), warn: warn.slice(0, 20), total: ds.polls.length };
}

function selfTest() {
  const good = {
    generated_at: new Date().toISOString(),
    sources: [],
    polls: Array.from({ length: 60 }, (_, i) => ({
      id: `id${i}`, source: "t", source_url: "https://x", race: "presidente", state: null,
      round: 1, scenario: "s", pollster: "P", fieldwork_start: "2026-08-01",
      fieldwork_end: "2026-08-03", sample_size: 1000, margin_of_error: 2,
      results: [{ candidate: "A", party: null, pct: 40 }, { candidate: "B", party: null, pct: 35 }],
      undecided_pct: 10,
    })),
  };
  const cases = [
    ["valid dataset passes", good, true],
    ["shrunk dataset fails", { ...good, polls: good.polls.slice(0, 5) }, false],
    ["duplicate ids fail", { ...good, polls: good.polls.map((p) => ({ ...p, id: "same" })) }, false],
    ["pct>100 fails", { ...good, polls: good.polls.map((p) => ({ ...p, results: [{ candidate: "A", party: null, pct: 140 }] })) }, false],
    ["sum>130 fails", { ...good, polls: good.polls.map((p) => ({ ...p, results: [{ candidate: "A", party: null, pct: 90 }, { candidate: "B", party: null, pct: 90 }] })) }, false],
    ["bad race fails", { ...good, polls: good.polls.map((p) => ({ ...p, race: "prefeito" })) }, false],
    ["governador without state fails", { ...good, polls: good.polls.map((p) => ({ ...p, race: "governador", state: null })) }, false],
    ["non-ISO date fails", { ...good, polls: good.polls.map((p) => ({ ...p, fieldwork_end: "03/08/2026" })) }, false],
    ["missing generated_at fails", { ...good, generated_at: undefined }, false],
  ];
  let failed = 0;
  for (const [name, ds, shouldPass] of cases) {
    const { errors } = validate(ds);
    const passed = errors.length === 0;
    const ok = passed === shouldPass;
    if (!ok) failed++;
    console.log(`${ok ? "✓" : "✗ SELF-TEST FAILURE"}: ${name} (${errors.length} errors)`);
  }
  if (failed) {
    console.error(`${failed} self-test case(s) did not behave as expected`);
    process.exit(1);
  }
  console.log("self-test: all guards fire correctly");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    const file = process.argv[2] ?? "data/polls.json";
    const ds = JSON.parse(fs.readFileSync(file, "utf-8"));
    const { errors, warn, total } = validate(ds);
    for (const w of warn) console.warn(`WARN: ${w}`);
    if (errors.length) {
      for (const e of errors) console.error(`ERROR: ${e}`);
      process.exit(1);
    }
    console.log(`OK: ${total} polls valid`);
  }
}
