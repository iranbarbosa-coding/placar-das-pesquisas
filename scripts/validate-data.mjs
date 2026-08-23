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
    // Nobody interviews 2,004 tenths of a person. Poder360 serves `entrevistas`
    // with the Brazilian thousands separator already collapsed into a decimal
    // point — 2.004 for 2.004 respondents, 1.2 for 1.200 — and eleven rows sat
    // here passing every check, because a finite positive number is what they
    // are. Verified against the API: it is the source, not our parse. Repair
    // per-poll in data/repairs.json, never by multiplying by 1000.
    if (p.sample_size != null && (typeof p.sample_size !== "number" || !Number.isInteger(p.sample_size) || p.sample_size <= 0)) {
      errors.push(`${at}: non-integer sample_size ${p.sample_size} — thousands separator became a decimal at source`);
    } else if (p.sample_size != null && p.sample_size < 100) {
      // The integer form of the same defect: 1.000 respondents arrive as 1.
      errors.push(`${at}: implausible sample_size ${p.sample_size} — likely a collapsed thousands separator`);
    }
  });
  return { errors: errors.slice(0, 40), warn: warn.slice(0, 20), total: ds.polls.length };
}

/** Qual das duas cópias colididas fica: a mais COMPLETA (mais linhas) e, no
 * empate, a mais ANTIGA (menor data), com desempate estável para não depender
 * da ordem de entrada. Retorna true quando `a` deve ser mantida em vez de `b`. */
function preferKeep(a, b) {
  const ra = a.results?.length ?? 0;
  const rb = b.results?.length ?? 0;
  if (ra !== rb) return ra > rb;
  const da = a.fieldwork_end ?? a.published_date ?? "9999-99-99";
  const db = b.fieldwork_end ?? b.published_date ?? "9999-99-99";
  if (da !== db) return da < db;
  return JSON.stringify(a) <= JSON.stringify(b);
}

/**
 * DROP-AND-WARN em id duplicado — mesma filosofia dos guardas de soma do
 * coletor, e o retrato do backstop deste módulo: um único id colidido (um
 * cenário rotulado igual por engano, dois elencos no mesmo dia) NÃO pode
 * CONGELAR a ingestão inteira via `validate`, que ABORTA o dataset todo num id
 * repetido. Aqui a colisão é resolvida ANTES do portão estrito: mantém a
 * pesquisa mais completa/antiga por id, descarta a(s) outra(s), e devolve a
 * lista limpa com o registro do que caiu para o chamador gritar nominalmente.
 * O `validate` continua julgando — estrito — o que sobra.
 *
 * A desambiguação por elenco no coletor (`disambiguateCollidingIds` em
 * scrape.mjs) já separa elencos DIFERENTES antes daqui, de modo que o que chega
 * a este descarte são duplicatas de fato (mesmo id, mesma pesquisa) — mas o
 * backstop existe porque um `validate` que só sabe abortar deixa uma colisão
 * qualquer, de qualquer origem, derrubar a rodada.
 */
export function dedupeById(polls) {
  if (!Array.isArray(polls)) return { polls, dropped: [] };
  const winner = new Map();
  const dropped = [];
  for (const p of polls) {
    if (!p || !p.id) continue; // sem id: o guarda de `validate` cuida
    const cur = winner.get(p.id);
    if (!cur) { winner.set(p.id, p); continue; }
    if (preferKeep(cur, p)) dropped.push(p);
    else { dropped.push(cur); winner.set(p.id, p); }
  }
  if (!dropped.length) return { polls, dropped };
  const drop = new Set(dropped);
  return { polls: polls.filter((p) => !drop.has(p)), dropped };
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

  // O BACKSTOP DE `dedupeById` TAMBÉM REPROVA (CONVENTIONS §2): um drop-and-warn
  // que nunca dispara não prova que a ingestão deixou de congelar. Aqui um
  // dataset com um id colidido (uma cópia curta, uma cheia) tem de: (1) fazer
  // `validate` sozinho REPROVAR — o portão estrito continua abortando em id
  // repetido, que é o backstop-do-backstop; e (2) sair LIMPO e VÁLIDO depois de
  // `dedupeById`, mantida a mais completa e descartada exatamente uma.
  {
    const colidido = {
      ...good,
      polls: [
        { ...good.polls[0], id: "colide", results: [{ candidate: "A", party: null, pct: 40 }] },
        { ...good.polls[1], id: "colide", results: [{ candidate: "A", party: null, pct: 40 }, { candidate: "B", party: null, pct: 35 }] },
        ...good.polls.slice(2),
      ],
    };
    const antesErra = validate(colidido).errors.some((e) => /duplicate id/.test(e));
    const { polls: limpo, dropped } = dedupeById(colidido.polls);
    const caiuOMenor = dropped.length === 1 && (dropped[0].results?.length ?? 0) === 1;
    const ficouOMaior = limpo.find((p) => p.id === "colide")?.results.length === 2;
    const depoisPassa = validate({ ...colidido, polls: limpo }).errors.length === 0;
    for (const [cond, name] of [
      [antesErra, "validate ainda ABORTA em id duplicado (backstop estrito intacto)"],
      [caiuOMenor, "dedupeById descarta exatamente a cópia menos completa"],
      [ficouOMaior, "dedupeById mantém a cópia mais completa"],
      [depoisPassa, "o que sobra passa no validate estrito"],
    ]) {
      const ok = !!cond;
      if (!ok) failed++;
      console.log(`${ok ? "✓" : "✗ SELF-TEST FAILURE"}: dedupeById — ${name}`);
    }
    if (failed) {
      console.error(`${failed} self-test case(s) did not behave as expected`);
      process.exit(1);
    }
  }

  console.log("self-test: all guards fire correctly");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--self-test")) {
    selfTest();
  } else {
    const file = process.argv[2] ?? "data/polls.json";
    const ds = JSON.parse(fs.readFileSync(file, "utf-8"));
    // DROP-AND-WARN antes do portão estrito: um id colidido não congela a
    // ingestão (ver `dedupeById`). Descarta a duplicata, grita nominalmente, e
    // valida o que sobra — em vez de abortar o dataset inteiro num único id.
    const { polls, dropped } = dedupeById(ds.polls);
    for (const d of dropped) {
      console.warn(
        `WARN: id duplicado descartado (mantida a mais completa/antiga) — ${d.id} ` +
        `${d.pollster ?? "?"} ${d.race ?? "?"}/${d.state ?? "BR"} ` +
        `${d.fieldwork_end ?? d.published_date ?? "?"} "${d.scenario ?? ""}"`,
      );
    }
    const alvo = dropped.length ? { ...ds, polls } : ds;
    const { errors, warn, total } = validate(alvo);
    for (const w of warn) console.warn(`WARN: ${w}`);
    if (errors.length) {
      for (const e of errors) console.error(`ERROR: ${e}`);
      process.exit(1);
    }
    console.log(`OK: ${total} polls valid${dropped.length ? ` (${dropped.length} duplicata(s) de id descartada(s))` : ""}`);
  }
}
