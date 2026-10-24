#!/usr/bin/env node
// GOVERNADOR · 1º TURNO POR MUNICÍPIO, dos estados com 2º turno → data/apuracao/t1-governador.json
//
// Base da chance de vitória dos governadores na apuração do 2º turno. Os dois
// finalistas de cada UF vêm do arquivo do 2º turno (eleição 6260, cargo 3: só
// eles aparecem); o voto deles em cada município, do 1º turno (eleição 6259):
//
//   .../ele2026/6260/dados/<uf>/<uf>-c0003-e006260-u.json            finalistas
//   .../ele2026/6259/dados/<uf>/<uf>-e006259-ab.json                 municípios
//   .../ele2026/6259/dados/<uf>/<uf><cdmun>-c0003-e006259-u.json     votos no município
//
// Conferência: a soma dos municípios bate, voto a voto, com o arquivo da UF
// (<uf>-c0003-e006259-u.json); qualquer diferença aborta sem gravar.
import fs from "node:fs";
import path from "node:path";

const UFS = (process.argv[2] ?? "ac,am,df,es,rn,to").split(",");
const R = "https://resultados.tse.jus.br/oficial/ele2026";
const UA = { "User-Agent": "Mozilla/5.0 (placardaspesquisas.com.br)", Referer: "https://resultados.tse.jus.br/" };
const OUT = path.join(process.cwd(), "data", "apuracao", "t1-governador.json");
const int = (s) => {
  const n = Number(String(s ?? "").replace(",", "."));
  if (!Number.isFinite(n)) throw new Error(`número inválido: ${s}`);
  return n;
};
async function get(url, tentativas = 4) {
  for (let i = 0; ; i++) {
    try {
      const r = await fetch(url, { headers: UA });
      if (!r.ok) throw new Error(`HTTP ${r.status} em ${url}`);
      return await r.json();
    } catch (e) {
      if (i + 1 >= tentativas) throw e;
      await new Promise((ok) => setTimeout(ok, 1000 * 2 ** i));
    }
  }
}
const cands = (doc) =>
  (doc.carg?.[0]?.agr ?? []).flatMap((a) =>
    (a.par ?? []).flatMap((p) => (p.cand ?? []).map((c) => ({ sq: String(c.sqcand), n: String(c.n), nome: c.nmu ?? c.nm, partido: p.sg ?? a.com ?? "", vap: c.vap }))),
  );
async function emLotes(itens, n, f) {
  const out = new Array(itens.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < itens.length) {
      const k = i++;
      out[k] = await f(itens[k]);
    }
  }));
  return out;
}

const saida = {};
for (const uf of UFS) {
  const t2 = cands(await get(`${R}/6260/dados/${uf}/${uf}-c0003-e006260-u.json`));
  if (t2.length !== 2) throw new Error(`${uf}: o 2º turno traz ${t2.length} candidatos`);
  const ufDoc = await get(`${R}/6259/dados/${uf}/${uf}-c0003-e006259-u.json`);
  if (ufDoc.tf !== "s") throw new Error(`${uf}: totalização do 1º turno não está final`);
  const alvo = t2.map((c) => int(cands(ufDoc).find((x) => x.sq === c.sq)?.vap));
  const ab = await get(`${R}/6259/dados/${uf}/${uf}-e006259-ab.json`);
  const lista = (ab.abr ?? []).filter((a) => a.tpabr === "mun");
  const linhas = await emLotes(lista, 12, async (a) => {
    const d = cands(await get(`${R}/6259/dados/${uf}/${uf}${a.cdabr}-c0003-e006259-u.json`));
    const v = t2.map((c) => {
      const x = d.find((y) => y.sq === c.sq);
      if (!x) throw new Error(`${uf}${a.cdabr}: sem ${c.nome}`);
      return int(x.vap);
    });
    // [votos A, votos B, comparecimento, eleitorado] no 1º turno; A e B na ordem de `candidatos`.
    return [`${uf}${a.cdabr}`, [v[0], v[1], int(a.e?.c), int(a.e?.te)]];
  });
  const soma = linhas.reduce((s, [, x]) => [s[0] + x[0], s[1] + x[1]], [0, 0]);
  if (soma[0] !== alvo[0] || soma[1] !== alvo[1]) throw new Error(`${uf}: municípios somam ${soma}; a UF diz ${alvo}`);
  saida[uf] = { candidatos: t2.map(({ vap, ...c }) => c), mun: Object.fromEntries(linhas) };
  console.log(`${uf}: ${linhas.length} municípios; ${t2.map((c, k) => `${c.nome} ${alvo[k]}`).join(" × ")} — confere com a UF`);
  console.log(`SQS ${uf} ${t2.map((c) => c.sq).join(" ")}`);
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({
    fonte: "TSE — Divulgação de Resultados: finalistas da eleição 6260 (2º turno estadual), votos por município da 6259 (1º turno), cargo 3",
    campos: ["candidato A", "candidato B", "comparecimento", "eleitorado"],
    lido_em: new Date().toISOString(),
    ufs: saida,
  }) + "\n",
);
