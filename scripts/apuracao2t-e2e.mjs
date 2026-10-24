#!/usr/bin/env node
// Ponta a ponta da página da apuração do 2º turno contra o site CONSTRUÍDO,
// com um servidor local no lugar do TSE (o host do TSE não é alcançável daqui).
//
//   node scripts/apuracao2t-e2e.mjs servir 3124 &                 # "TSE" de teste
//   APURACAO_2T_TSE=http://localhost:3124 npm run build
//   APURACAO_2T_TSE=http://localhost:3124 npx next start -p 3123 &
//   node scripts/apuracao2t-e2e.mjs testar http://localhost:3123 http://localhost:3124 [pasta-de-capturas]
//
// Os arquivos servidos seguem o formato do TSE (vírgula decimal, números como
// string, carg/agr/par/cand) com NÚMEROS SINTÉTICOS de teste — nunca vão ao ar.
// Etapas trocadas por GET /__etapa/<antes|zero|meio|final>.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";

const UFS = ["AC","AL","AM","AP","BA","CE","DF","ES","GO","MA","MG","MS","MT","PA","PB","PE","PI","PR","RJ","RN","RO","RR","RS","SC","SE","SP","TO"];
// Municípios REAIS (códigos, eleitorado, comparecimento e voto do 1º turno) de
// data/apuracao/t1-municipios.json; o 2º turno sintético é o 1º turno com uma
// mudança UNIFORME de VIRADA p.p. para Flávio. Nesse mundo a projeção da chance
// tem de acertar o final exato — é o teste da conta.
const VIRADA = -0.015;
const T1 = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/apuracao/t1-municipios.json"), "utf8")).mun;
const MUN = Object.entries(T1).map(([k, [l1, f1, c1, te1]], i) => ({
  k, uf: k.slice(0, 2), cd: k.slice(2), i, te: te1,
  comp: te1 ? c1 / te1 : 0, dois: c1 ? (l1 + f1) / c1 : 0, f: l1 + f1 ? f1 / (l1 + f1) + VIRADA : 0,
}));
// Andamento sintético por etapa: fração das seções totalizadas por município.
const AVANCO = {
  zero: () => 0,
  meio: (m) => (m.i % 5 === 0 ? 0 : [0.12, 0.47, 0.83, 1][m.i % 4]),
  final: () => 1,
};

const br = (x) => String(x).replace(".", ",");
function conta(m, frac) {
  const ts = Math.max(1, Math.ceil(m.te / 300));
  const st = Math.round(ts * frac(m));
  const est = Math.round((m.te * st) / ts);
  const c = Math.round(est * m.comp);
  const vv = Math.round(c * m.dois);
  const f = Math.round(vv * m.f);
  return { ts, st, te: m.te, est, c, vv, f, l: vv - f };
}
function soma(lista, frac) {
  const t = { ts: 0, st: 0, te: 0, est: 0, c: 0, vv: 0, f: 0, l: 0 };
  for (const m of lista) {
    const x = conta(m, frac);
    for (const k in t) t[k] += x[k];
  }
  return t;
}
const se = (t) => ({
  s: { ts: String(t.ts), st: String(t.st), pst: br(((100 * t.st) / t.ts).toFixed(2)), pstn: br(((100 * t.st) / t.ts).toFixed(9)) },
  e: { te: String(t.te), est: String(t.est), c: String(t.c), a: String(t.est - t.c) },
});
function doc(lista, frac) {
  const t = soma(lista, frac);
  const pv = (x) => br(t.vv ? ((100 * x) / t.vv).toFixed(9) : "0");
  const brancos = Math.round((t.c - t.vv) / 3);
  return {
    dg: "25/10/2026", hg: "19:42:10", dt: "25/10/2026", ht: "19:42:10",
    md: t.st === t.ts ? "s" : "n", tf: t.st === t.ts ? "s" : "n",
    ...se(t),
    v: { vv: String(t.vv), vb: String(brancos), tvn: String(t.c - t.vv - brancos) },
    carg: [{ cd: "1", nmn: "Presidente", agr: [
      { com: "PT", par: [{ sg: "PT", cand: [{ n: "13", nm: "LUIZ INÁCIO LULA DA SILVA", nmu: "LULA", sqcand: "280002542548", vap: String(t.l), pvapn: pv(t.l), e: "n", st: "" }] }] },
      { com: "PL", par: [{ sg: "PL", cand: [{ n: "22", nm: "FLÁVIO NANTES BOLSONARO", nmu: "FLÁVIO BOLSONARO", sqcand: "280002551544", vap: String(t.f), pvapn: pv(t.f), e: "n", st: "" }] }] },
    ] }],
  };
}
const daUf = (uf) => MUN.filter((m) => m.uf === uf);

// Governador (eleição 6260, cargo 3): municípios reais do 1º turno de governador
// (data/apuracao/t1-governador.json) com a mesma virada uniforme para o 2º candidato.
const GOV = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data/apuracao/t1-governador.json"), "utf8")).ufs;
const GMUN = Object.fromEntries(
  Object.entries(GOV).map(([uf, g]) => [
    uf,
    Object.entries(g.mun).map(([k, [a1, b1, c1, te1]], i) => ({
      k, uf, cd: k.slice(2), i: i * 7 + uf.charCodeAt(0), te: te1,
      comp: te1 ? c1 / te1 : 0, dois: c1 ? (a1 + b1) / c1 : 0, f: a1 + b1 ? b1 / (a1 + b1) + VIRADA : 0,
    })),
  ]),
);
function docGov(uf, frac) {
  const t = soma(GMUN[uf], frac);
  const pv = (x) => br(t.vv ? ((100 * x) / t.vv).toFixed(9) : "0");
  const [A, B] = GOV[uf].candidatos;
  const cand = (c, v) => ({ com: c.partido, par: [{ sg: c.partido, cand: [{ n: c.n, nm: c.nome, nmu: c.nome, sqcand: c.sq, vap: String(v), pvapn: pv(v), e: "n", st: "" }] }] });
  return { dg: "25/10/2026", hg: "19:42:10", tf: t.st === t.ts ? "s" : "n", ...se(t), carg: [{ cd: "3", nmn: "Governador", agr: [cand(A, t.l), cand(B, t.f)] }] };
}

function servir(porta) {
  let etapa = "antes";
  http
    .createServer((req, res) => {
      const u = new URL(req.url, "http://x");
      const m = u.pathname.match(/^\/__etapa\/(\w+)$/);
      if (m) {
        etapa = m[1];
        res.end(etapa);
        return;
      }
      const json = (o) => {
        res.setHeader("Content-Type", "application/json");
        res.end(JSON.stringify(o));
      };
      if (etapa === "antes") {
        res.statusCode = 403; // o TSE responde assim antes de publicar
        res.end();
        return;
      }
      const frac = AVANCO[etapa];
      let k;
      if ((k = u.pathname.match(/\/oficial\/ele2026\/6258\/dados\/br\/br-e006258-ab\.json$/)))
        return json({ abr: [...UFS.map((x) => x.toLowerCase()), "zz"].map((uf) => ({ tpabr: "uf", cdabr: uf, ...se(soma(daUf(uf), frac)) })) });
      if ((k = u.pathname.match(/\/oficial\/ele2026\/6258\/dados\/(\w\w)\/\1-e006258-ab\.json$/)))
        return json({ abr: daUf(k[1]).map((m) => ({ tpabr: "mun", cdabr: m.cd, ...se(soma([m], frac)) })) });
      if ((k = u.pathname.match(/\/oficial\/ele2026\/6258\/dados\/(\w\w)\/\1-c0001-e006258-u\.json$/)))
        return json(doc(k[1] === "br" ? MUN : daUf(k[1]), frac));
      if ((k = u.pathname.match(/\/oficial\/ele2026\/6260\/dados\/(\w\w)\/\1-c0003-e006260-u\.json$/)) && GOV[k[1]])
        return json(docGov(k[1], frac));
      if ((k = u.pathname.match(/\/oficial\/ele2026\/6260\/dados\/(\w\w)\/\1-e006260-ab\.json$/)) && GOV[k[1]])
        return json({ abr: GMUN[k[1]].map((m) => ({ tpabr: "mun", cdabr: m.cd, ...se(soma([m], frac)) })) });
      res.statusCode = 404;
      res.end();
    })
    .listen(porta, () => console.log(`TSE de teste em http://localhost:${porta}`));
}

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
  throw new Error("Playwright não encontrado");
}

async function testar(BASE, TSE, SHOTS) {
  const { chromium } = loadPlaywright();
  const browser = await chromium.launch();
  const results = [];
  const check = async (name, fn) => {
    try {
      await fn();
      results.push(["ok", name]);
    } catch (e) {
      results.push(["FALHOU", `${name}: ${e.message}`]);
    }
  };
  const etapa = (x) => fetch(`${TSE}/__etapa/${x}`);
  const api = async () => (await fetch(`${BASE}/api/apuracao-2t.json`)).json();
  const abrir = async (opts = {}) => {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
    const p = await ctx.newPage();
    await p.goto(`${BASE}/apuracao`, { waitUntil: "networkidle" });
    return { ctx, p };
  };
  // color-mix() sai como "color(srgb r g b)" em 0–1; normaliza para 0–255.
  const preenchimento = async (p, uf) => {
    const f = await p.evaluate((uf) => getComputedStyle(document.querySelector(`#apuracao2t-mapa [data-uf="${uf}"] path, #apuracao2t-mapa path[data-uf="${uf}"]`)).fill, uf);
    const n = f.match(/\d+(\.\d+)?/g).map(Number).slice(0, 3);
    return (f.startsWith("color(") ? n.map((x) => x * 255) : n).map(Math.round);
  };
  const BRANCO = [255, 255, 255];

  await etapa("antes");
  // A página tem ISR de 30s: depois de trocar a etapa, deixa vencer e pede uma
  // vez para o Next refazer o desenho antes de conferir.
  await new Promise((r) => setTimeout(r, 31_000));
  await fetch(`${BASE}/apuracao`);
  await new Promise((r) => setTimeout(r, 3_000));
  await check("antes: API diz aguardando", async () => assert.equal((await api()).aguardando, true));
  await check("antes: página zerada, mapa branco, aviso", async () => {
    const { ctx, p } = await abrir();
    const t = await p.textContent("body");
    assert.match(t, /ainda não publicou números do 2º turno/);
    assert.match(t, /Lula/);
    assert.match(t, /Flávio Bolsonaro/);
    assert.deepEqual(await preenchimento(p, "SP"), BRANCO);
    assert.equal(await p.locator('[data-testid="barras-estados"] li[data-uf]').count(), 27);
    assert.equal(await p.locator('[data-testid="chance-vitoria"]').count(), 0);
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "2t-antes.png"), fullPage: true });
    await ctx.close();
  });

  await etapa("meio");
  await check("meio: API traz 27 UFs com líder onde há voto", async () => {
    const d = await api();
    assert.ok(!d.aguardando, JSON.stringify(d).slice(0, 200));
    assert.equal(d.estados.length, 27);
    for (const s of d.estados) {
      if (s.secoes === 0) assert.equal(s.lider, null);
      else assert.equal(s.lider, s.flavio > s.lula ? "22" : "13", s.uf);
    }
    assert.ok(d.nacional.pct > 0 && d.nacional.pct < 100);
    assert.ok(d.nacional.votosAApurar > 0);
    assert.equal(d.lula.votos + d.flavio.votos, d.nacional.validos);
  });
  let govMeio = null;
  await check("meio: governadores — 6 blocos, chance em 5 (DF sem)", async () => {
    const d = await api();
    assert.equal(d.governadores.length, 6);
    for (const g of d.governadores) {
      assert.ok(!g.aguardando, g.uf);
      if (g.uf === "DF") assert.equal(g.chance, null);
      else if (g.andamento.secoes > 0) {
        assert.ok(g.chance, `${g.uf} sem chance`);
        assert.equal(g.chance.flavio > 0.5, g.chance.projecaoFlavio > 50, g.uf);
      }
    }
    govMeio = Object.fromEntries(d.governadores.filter((g) => g.chance).map((g) => [g.uf, g.chance.projecaoFlavio]));
  });
  let projecaoMeio = null;
  await check("meio: chance de vitória coerente", async () => {
    const d = await api();
    const c = d.chance;
    assert.ok(c, "chance ausente");
    assert.ok(c.cobertura >= 99.5, `cobertura ${c.cobertura}`);
    assert.ok(Math.abs(c.flavio + c.lula - 1) < 1e-9);
    assert.ok(c.falta > 0 && c.falta < 100 && c.desvio > 0);
    // Lado da chance = lado da projeção.
    assert.equal(c.flavio > 0.5, c.projecaoFlavio > 50);
    projecaoMeio = c.projecaoFlavio;
  });
  await check("meio: cor do mapa = líder, mais forte com mais apurado", async () => {
    const d = await api();
    const { ctx, p } = await abrir();
    await p.waitForFunction(() => /apurado/.test(document.body.textContent) && !/ainda não publicou/.test(document.body.textContent));
    for (const s of d.estados) {
      const [r, g, b] = await preenchimento(p, s.uf);
      if (s.secoes === 0) assert.deepEqual([r, g, b], [255, 255, 255], s.uf);
      else if (s.lider === "22") assert.ok(b > r, `${s.uf} deveria ser azul: ${r},${g},${b}`);
      else assert.ok(r > b, `${s.uf} deveria ser vermelho: ${r},${g},${b}`);
    }
    // Duas UFs do mesmo líder: a mais apurada é mais escura (menos branca).
    const mesmo = d.estados.filter((s) => s.lider === d.estados.find((x) => x.lider)?.lider).sort((a, b) => a.pct - b.pct);
    const claro = (c) => c.reduce((a, x) => a + x, 0);
    if (mesmo.length > 1 && mesmo[0].pct < mesmo.at(-1).pct)
      assert.ok(claro(await preenchimento(p, mesmo[0].uf)) > claro(await preenchimento(p, mesmo.at(-1).uf)));
    const t = await p.textContent("body");
    assert.match(t, /Votos apurados/);
    assert.match(t, /A apurar/);
    assert.match(t, /Comparecimento\d+,\d\d%/);
    assert.match(t, /à frente por/);
    assert.match(t, /Chance de vitória/i);
    assert.match(t, /resultado final fica perto de/);
    assert.match(t, /Governadores · 2º turno/i);
    assert.equal(await p.locator('[data-testid^="gov-"]').count(), 6);
    // As fotos oficiais carregam e aparecem.
    const fotos = await p.evaluate(() =>
      [...document.querySelectorAll('img[alt^="Foto de"]')].map((i) => i.naturalWidth > 0 && getComputedStyle(i).opacity === "1"),
    );
    assert.equal(fotos.length, 14); // presidente (2) + governadores (12)
    assert.ok(fotos.every(Boolean), JSON.stringify(fotos));
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "2t-meio.png"), fullPage: true });
    await ctx.close();
  });

  for (const [w, scheme] of [[320, "light"], [375, "dark"], [768, "light"], [1440, "dark"]])
    await check(`sem rolagem horizontal ${w}px ${scheme}`, async () => {
      const { ctx, p } = await abrir({ viewport: { width: w, height: 800 }, colorScheme: scheme });
      const sw = await p.evaluate(() => document.documentElement.scrollWidth);
      assert.ok(sw <= w, `scrollWidth ${sw} > ${w}`);
      if (SHOTS) await p.screenshot({ path: path.join(SHOTS, `2t-meio-${w}-${scheme}.png`), fullPage: true });
      await ctx.close();
    });

  await etapa("final");
  await check("final: com virada uniforme, a projeção do meio acerta o final", async () => {
    const d = await api();
    assert.equal(d.chance, null);
    assert.ok(projecaoMeio != null);
    assert.ok(Math.abs(projecaoMeio - d.flavio.pct) < 0.05, `projeção ${projecaoMeio} × final ${d.flavio.pct}`);
  });
  await check("final: governadores — projeção do meio acerta o final (virada uniforme)", async () => {
    const d = await api();
    for (const g of d.governadores) {
      assert.equal(g.chance, null);
      if (govMeio?.[g.uf] != null) assert.ok(Math.abs(govMeio[g.uf] - g.candidatos[1].pct) < 0.1, `${g.uf}: ${govMeio[g.uf]} × ${g.candidatos[1].pct}`);
    }
  });
  await check("final: 100% apurado, cores cheias", async () => {
    const d = await api();
    assert.equal(Math.round(d.nacional.pct), 100);
    const { ctx, p } = await abrir();
    await p.waitForFunction(() => /100,00%/.test(document.body.textContent));
    for (const s of d.estados) assert.notDeepEqual(await preenchimento(p, s.uf), BRANCO, s.uf);
    if (SHOTS) await p.screenshot({ path: path.join(SHOTS, "2t-final.png"), fullPage: true });
    await ctx.close();
  });

  await check("ao vivo: a página aberta antes avança sozinha", async () => {
    await etapa("antes");
    await new Promise((r) => setTimeout(r, 21_000)); // passa o s-maxage da rota
    const { ctx, p } = await abrir();
    await etapa("meio");
    await p.waitForFunction(() => !/ainda não publicou/.test(document.body.textContent), null, { timeout: 75_000 });
    await ctx.close();
  });

  await browser.close();
  for (const [s, n] of results) console.log(`${s === "ok" ? "✓" : "✗"} ${n}`);
  const falhas = results.filter(([s]) => s !== "ok").length;
  console.log(`${results.length - falhas}/${results.length} conferências`);
  process.exit(falhas ? 1 : 0);
}

const [cmd, a, b, c] = process.argv.slice(2);
if (cmd === "servir") servir(Number(a ?? 3124));
else if (cmd === "testar") await testar(a ?? "http://localhost:3123", b ?? "http://localhost:3124", c ?? null);
else {
  console.error("uso: apuracao2t-e2e.mjs servir <porta> | testar <site> <tse> [capturas]");
  process.exit(2);
}
