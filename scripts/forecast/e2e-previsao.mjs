#!/usr/bin/env node
// Ponta a ponta da seção Previsão Estatística contra o site CONSTRUÍDO.
//
//   npm run build && npx next start -p 3123 &
//   node scripts/forecast/e2e-previsao.mjs http://localhost:3123 [pasta-de-capturas]
//
// Confere o que um leitor vê: a seção existe e se chama "Previsão Estatística";
// as quatro grandezas estão nomeadas; fato e modelo aparecem separados; nenhuma
// probabilidade de vitória é exibida quando o snapshot a retém; nenhuma página
// estoura na horizontal (320–1440, claro e escuro — GUIA_DE_DESIGN §6); as rotas
// de API respondem JSON válido. Usa o Playwright instalado (local ou global).
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import path from "node:path";

const require = createRequire(import.meta.url);
function loadPlaywright() {
  for (const p of ["playwright", "/opt/node-tools/node_modules/playwright", `${process.env.NODE_PATH ?? ""}/playwright`]) {
    try {
      return require(p);
    } catch {}
  }
  for (const root of [path.join(process.execPath, "..", "..", "lib", "node_modules"), "/usr/local/lib/node_modules", "/node-tools/node_modules"]) {
    try {
      return require(path.join(root, "playwright"));
    } catch {}
  }
  throw new Error("Playwright não encontrado: instale `playwright` ou rode onde ele esteja disponível");
}

const BASE = process.argv[2] ?? "http://localhost:3123";
const SHOTS = process.argv[3] ?? null;
const { chromium } = loadPlaywright();
const browser = await chromium.launch(fs.existsSync("/opt/pw-browsers/chromium") ? { executablePath: undefined } : {});
const results = [];
async function check(name, fn) {
  try {
    await fn();
    results.push(["ok", name]);
  } catch (e) {
    results.push(["FALHOU", `${name}: ${e.message}`]);
  }
}

const races = await (await fetch(`${BASE}/api/forecast/races.json`)).json();
const raceIds = races.races.map((r) => r.race_id);

for (const scheme of ["light", "dark"]) {
  for (const width of [320, 375, 1440]) {
    const ctx = await browser.newContext({ viewport: { width, height: 900 }, colorScheme: scheme });
    const page = await ctx.newPage();
    for (const route of ["/previsao", `/previsao/${raceIds[0]}`, "/previsao/desempenho", "/previsao/metodologia"]) {
      await check(`${route} ${width}px ${scheme}: sem estouro horizontal`, async () => {
        const res = await page.goto(`${BASE}${route}`, { waitUntil: "networkidle" });
        assert.equal(res.status(), 200);
        const [sw, cw] = await page.evaluate(() => [document.documentElement.scrollWidth, document.documentElement.clientWidth]);
        assert.ok(sw <= cw, `scrollWidth ${sw} > clientWidth ${cw}`);
        if (SHOTS && (width === 375 || width === 1440)) {
          fs.mkdirSync(SHOTS, { recursive: true });
          await page.screenshot({ path: path.join(SHOTS, `${route.replaceAll("/", "_") || "_"}-${width}-${scheme}.png`), fullPage: true });
        }
      });
    }
    await ctx.close();
  }
}

const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await ctx.newPage();
await page.goto(`${BASE}/previsao`, { waitUntil: "networkidle" });
await check("título da seção", async () => assert.equal((await page.locator("h1").first().innerText()).trim(), "Previsão Estatística"));
await check("as quatro grandezas nomeadas", async () => {
  const txt = await page.locator("body").textContent();
  for (const t of ["Média das pesquisas", "Estimativa atual", "Projeção para o dia da eleição", "Intervalo de incerteza"]) assert.ok(txt.includes(t), t);
});
await check("um card por disputa", async () => assert.equal(await page.locator("section.card h2").filter({ hasText: "turno" }).count(), raceIds.length));
await check("metadados exibidos", async () => {
  const txt = await page.locator("body").textContent();
  for (const t of ["Data de referência", "Última pesquisa incluída", "Pesquisas · institutos", "Versão do modelo"]) assert.ok(txt.includes(t), t);
});
await check("probabilidade: retida não aparece; experimental aparece SEMPRE com o aviso", async () => {
  const txt = await page.locator("body").textContent();
  let experimentais = 0;
  let comProbabilidade = 0;
  for (const id of raceIds) {
    const d = await (await fetch(`${BASE}/api/forecast/${id}/latest.json`)).json();
    const st = d.latest.status.probability;
    if (st === "retida") {
      assert.ok(d.latest.candidates.every((c) => c.probability_first === null), `${id} expõe probabilidade retida`);
    } else {
      const ps = d.latest.candidates.map((c) => c.probability_first);
      assert.ok(ps.every((p) => typeof p === "number"), `${id} sem probabilidade`);
      assert.ok(Math.abs(ps.reduce((a, b) => a + b, 0) - 1) < 1e-3, `${id}: probabilidades não somam 1`);
      comProbabilidade++;
      if (st === "experimental") experimentais++;
    }
  }
  const destaques = await page.locator("text=de chance de vencer").count();
  assert.equal(destaques, comProbabilidade, "um destaque por disputa com probabilidade");
  if (experimentais) {
    assert.ok(txt.includes("Probabilidade: experimental"));
    assert.ok(txt.includes("Como ler a chance de vitória"));
  }
});
await check("menu do site leva à seção", async () => assert.ok((await page.locator('header a[href="/previsao"], header button:has-text("Previsão")').count()) > 0));
await page.goto(`${BASE}/previsao/${raceIds[0]}`, { waitUntil: "networkidle" });
await check("página da disputa: gráfico e diagnósticos", async () => {
  assert.ok((await page.locator('svg[role="img"]').count()) >= 3);
  assert.ok((await page.locator("body").textContent()).includes("Diagnósticos de convergência"));
});
for (const url of ["/api/forecast/races.json", "/api/forecast/health.json", "/api/forecast/model-performance.json", ...raceIds.flatMap((id) => ["latest", "history", "distribution", "methodology"].map((k) => `/api/forecast/${id}/${k}.json`))]) {
  await check(`API ${url}`, async () => {
    const r = await fetch(`${BASE}${url}`);
    assert.equal(r.status, 200);
    const j = await r.json();
    assert.equal(j.api_version, "1");
    assert.ok(typeof j.disclaimer === "string" && j.disclaimer.length > 40);
  });
}
await check("API: disputa desconhecida é 404", async () => assert.equal((await fetch(`${BASE}/api/forecast/nao-existe/latest.json`)).status, 404));
await check("API: desempenho e calibração disponíveis", async () => {
  const j = await (await fetch(`${BASE}/api/forecast/model-performance.json`)).json();
  assert.equal(j.available, true, "backtest ilegível ou ausente");
  assert.ok(j.summary?.modelo?.overall?.n > 0);
  const h = await (await fetch(`${BASE}/api/forecast/health.json`)).json();
  assert.ok(h.calibration_id && h.backtest_id, "calibração/backtest não carregados");
});
await check("página de desempenho mostra resultados", async () => {
  await page.goto(`${BASE}/previsao/desempenho`, { waitUntil: "networkidle" });
  const txt = await page.locator("body").textContent();
  assert.ok(!txt.includes("Nenhum backtest publicado"));
  assert.ok(txt.includes("Média do site") && txt.includes("Modelo completo"));
});
await check("API: saúde ok", async () => assert.equal((await (await fetch(`${BASE}/api/forecast/health.json`)).json()).ok, true));
await browser.close();

for (const [s, n] of results) console.log(`${s === "ok" ? "✓" : "✗"} ${n}`);
const bad = results.filter(([s]) => s !== "ok").length;
console.log(`${results.length - bad}/${results.length} verificações`);
process.exit(bad ? 1 : 0);
