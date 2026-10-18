// Testes do lado Node da previsão: exportador (regras do site aplicadas pelo
// código do site), conferência de snapshot em TypeScript e paridade do hash
// canônico com o Python. Rodar: node --test scripts/forecast/forecast.test.mjs
import "./ts-hooks.mjs";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { buildResolver, exportInputs } from "./export-inputs.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const fc = await import(path.join(ROOT, "src", "lib", "forecast.ts"));

const CANDS = [
  { candidate_id: "c_a", person_id: "p_a", contest: "governador:XX", canonical: "Ana Souza", aliases: ["Ana"] },
  { candidate_id: "c_b", person_id: "p_b", contest: "governador:XX", canonical: "Bruno Lima", aliases: ["Bruno"] },
  { candidate_id: "c_s1", person_id: "p_s1", contest: "senador:XX", canonical: "Sen Um", aliases: [] },
  { candidate_id: "c_s2", person_id: "p_s2", contest: "senador:XX", canonical: "Sen Dois", aliases: [] },
  // Duas pessoas sob a mesma grafia: o resolvedor tem de RECUSAR, não escolher.
  { candidate_id: "c_x1", person_id: "p_x1", contest: "governador:YY", canonical: "Ciro", aliases: [] },
  { candidate_id: "c_x2", person_id: "p_x2", contest: "governador:YY", canonical: "Ciro Nogueira", aliases: ["Ciro"] },
];

function poll(id, over = {}) {
  return {
    id, source: "t", source_url: "", race: "governador", state: "XX", round: 2, scenario: "2º turno",
    pollster: "Inst", fieldwork_start: "2026-10-08", fieldwork_end: "2026-10-10", published_date: null,
    sample_size: 1000, margin_of_error: 3, others_pct: null, undecided_pct: 8, blank_null_pct: 6,
    results: [{ candidate: "Ana", party: null, pct: 46 }, { candidate: "Bruno", party: null, pct: 40 }],
    ...over,
  };
}

test("válidos por pesquisa, com o toBasis do site", () => {
  const out = exportInputs({ polls: [poll("p1")], candidates: CANDS, resultados: null, source: {} });
  const r = out.polls[0].results;
  assert.equal(r[0].candidate_id, "c_a");
  assert.ok(Math.abs(r[0].pct_result_basis - (46 / 86) * 100) < 1e-9);
  assert.ok(Math.abs(r[0].pct_result_basis + r[1].pct_result_basis - 100) < 1e-9);
  assert.equal(out.polls[0].valid_fraction, 0.86);
});

test("as exclusões do site viajam com a pesquisa", () => {
  const um = poll("s1", { race: "senador", round: 1, results: [{ candidate: "Sen Um", party: null, pct: 30 }, { candidate: "Sen Dois", party: null, pct: 25 }], undecided_pct: 20, blank_null_pct: 25 });
  const dois = poll("s2", { race: "senador", round: 1, results: [{ candidate: "Sen Um", party: null, pct: 60 }, { candidate: "Sen Dois", party: null, pct: 55 }], undecided_pct: 40, blank_null_pct: 25 });
  const inc = poll("i1", { incomplete: true });
  const mun = poll("m1", { municipal: { municipio: "Cidade" } });
  const semData = poll("d1", { fieldwork_end: null, fieldwork_start: null });
  const out = exportInputs({ polls: [um, dois, inc, mun, semData], candidates: CANDS, resultados: null, source: {} });
  const ex = Object.fromEntries(out.polls.map((p) => [p.id, p.exclusion]));
  assert.equal(ex.s1, "senado_sem_dois_votos");
  assert.equal(ex.s2, null);
  assert.equal(ex.i1, "incompleta_na_fonte");
  assert.equal(ex.m1, "amostra_municipal");
  assert.equal(ex.d1, "sem_data");
  // Senado na base do pvap do TSE: parte das menções, soma 100.
  const s2 = out.polls.find((p) => p.id === "s2");
  assert.ok(Math.abs(s2.results[0].pct_result_basis + s2.results[1].pct_result_basis - 100) < 1e-9);
});

test("disponibilidade: nada depois da data entra (contra vazamento)", () => {
  const ps = [poll("cedo", { fieldwork_end: "2026-10-01" }), poll("tarde", { fieldwork_end: "2026-10-09" }), poll("pub", { fieldwork_end: "2026-10-01", published_date: "2026-10-12" })];
  const out = exportInputs({ polls: ps, candidates: CANDS, resultados: null, asOf: "2026-10-10", lag: 2, source: {} });
  assert.deepEqual(out.polls.map((p) => p.id), ["cedo"]);
  assert.ok(out.polls.every((p) => p.available_from <= "2026-10-10"));
});

test("resolvedor recusa ambiguidade e não inventa id", () => {
  const r = buildResolver(CANDS);
  assert.equal(r("governador:YY", "Ciro"), null);
  assert.equal(r("governador:YY", "Ciro Nogueira").candidate_id, "c_x2");
  assert.equal(r("governador:XX", "ANA"), r("governador:XX", "Ana"));
  assert.equal(r("governador:XX", "Fulano"), null);
});

test("dois nomes da urna no mesmo candidate_id: nenhum resolve (caso Senado/SC)", () => {
  const cands = [{ candidate_id: "c_c", person_id: "p_c", contest: "senador:SC", canonical: "Carol", aliases: ["Carol de Toni"] }];
  const res = { turno: 1, eleicao: "2026-10-04", disputas: [{ race: "senador", uf: "SC", round: 1, validos: { "Carol de Toni": 33.46, Carol: 0.15, Outro: 10 } }] };
  const out = exportInputs({ polls: [], candidates: cands, resultados: res, source: {} });
  assert.ok(out.official_results[0].candidates.every((c) => c.candidate_id === null));
  assert.equal(out.ambiguous_official.length, 2);
});

test("sem resultados no treino quando pedido", () => {
  const out = exportInputs({ polls: [poll("p1")], candidates: CANDS, resultados: null, source: {} });
  assert.deepEqual(out.official_results, []);
});

// ── Snapshot: conferência em TS e paridade do hash com o Python ──────────────
function snapshotFixture() {
  return {
    schema: fc.SNAPSHOT_SCHEMA, race_id: "governador-xx-2026-t2", reference_date: "2026-10-18", election_date: "2026-10-25",
    model: { model_version: "1.0.0", seed: 123, x: 1.0, tiny: 1e-7, small: 0.00001234, big: 2 ** 60, neg: -0.5 },
    input: { input_sha256: "abc", n_polls: 7, polls: [{ id: "p", shares: [52.5, 47.5], ok: true, nada: null }] },
    status: { overall: "publicado", nowcast: "publicada", projection: "experimental", probability: "retida", reasons: ["ç ã — “aspas”"] },
    nowcast: { summary: [
      { label: "A", mean: 52.25, sd: 1.1, quantiles: { "0.1": 50.9, "0.5": 52.2, "0.9": 53.6 }, histogram: { bin_pp: 0.5, start_pp: 48, counts: [1, 2] } },
      { label: "B", mean: 47.75, sd: 1.1, quantiles: { "0.1": 46.4, "0.5": 47.8, "0.9": 49.1 }, histogram: { bin_pp: 0.5, start_pp: 46, counts: [2, 1] } },
    ], series: [] },
    projection: null, probabilities: null,
  };
}

test("hash canônico: TypeScript confere o que o Python gravou", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "prev-"));
  const f = path.join(tmp, "s.json");
  fs.writeFileSync(f, JSON.stringify(snapshotFixture()));
  const py = execFileSync("python3", ["-c", [
    "import json,sys",
    `sys.path.insert(0, ${JSON.stringify(path.join(ROOT, "forecast"))})`,
    "from placar_forecast.publish import output_hash",
    `s=json.load(open(${JSON.stringify(f)}))`,
    "s['run']={'executed_at':'x'}",
    "print(output_hash(s))",
  ].join("\n")], { encoding: "utf-8" }).trim();
  const s = snapshotFixture();
  assert.equal(fc.outputHash({ ...s, run: { executed_at: "y" } }), py);
  s.output_sha256 = py;
  assert.deepEqual(fc.validateSnapshot(s), []);
});

test("conferência TS recusa adulteração e distribuições inválidas", () => {
  const s = snapshotFixture();
  s.output_sha256 = fc.outputHash(s);
  assert.deepEqual(fc.validateSnapshot(s), []);
  const t = structuredClone(s); t.nowcast.summary[0].mean = 60;
  assert.ok(fc.validateSnapshot(t).some((e) => e.includes("hash")));
  const u = structuredClone(t); u.output_sha256 = fc.outputHash(u);
  assert.ok(fc.validateSnapshot(u).some((e) => e.includes("somam")));
  const v = structuredClone(s); v.probabilities = { first: [0.9, 0.9] }; v.output_sha256 = fc.outputHash(v);
  const ev = fc.validateSnapshot(v);
  assert.ok(ev.some((e) => e.includes("inválidas")) && ev.some((e) => e.includes("retida")));
});

test("artefatos publicados no repositório passam na conferência", () => {
  const idx = fc.forecastIndex();
  if (!idx) return; // sem previsão publicada: nada a conferir
  for (const r of idx.races) {
    for (const e of r.history) {
      assert.ok(fc.loadSnapshot(e.path), `snapshot reprovado: ${e.path}`);
    }
  }
});

test("precisão de exibição sem falsa precisão", () => {
  assert.equal(fc.casasPara(48, 55), 0);
  assert.equal(fc.casasPara(50.1, 52.3), 1);
});
