#!/usr/bin/env node
// 1º TURNO PRESIDENCIAL POR MUNICÍPIO → data/apuracao/t1-municipios.json
//
// Base da "linha de chegada" da apuração do 2º turno: o voto de Lula (13) e de
// Flávio Bolsonaro (22) em cada município no 1º turno (eleição 6257), lido da
// Divulgação de Resultados do TSE:
//
//   .../ele2026/6257/dados/<uf>/<uf>-e006257-ab.json            municípios da UF
//   .../ele2026/6257/dados/<uf>/<uf><cdmun>-c0001-e006257-u.json votos no município
//
// Conferência: a soma dos municípios de cada UF tem de bater, voto a voto, com o
// arquivo da UF (<uf>-c0001-e006257-u.json); qualquer diferença aborta sem gravar.
// Roda onde o TSE é alcançável (GitHub Actions); o resultado do 1º turno é final.
import fs from "node:fs";
import path from "node:path";

const BASE = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados";
const UA = { "User-Agent": "Mozilla/5.0 (placardaspesquisas.com.br)", Referer: "https://resultados.tse.jus.br/" };
const UFS = ["ac","al","am","ap","ba","ce","df","es","go","ma","mg","ms","mt","pa","pb","pe","pi","pr","rj","rn","ro","rr","rs","sc","se","sp","to","zz"];
const OUT = path.join(process.cwd(), "data", "apuracao", "t1-municipios.json");

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

function votos(doc) {
  const out = { "13": null, "22": null };
  for (const agr of doc.carg?.[0]?.agr ?? [])
    for (const par of agr.par ?? [])
      for (const c of par.cand ?? []) if (c.n === "13" || c.n === "22") out[c.n] = int(c.vap);
  if (out["13"] == null || out["22"] == null) throw new Error(`sem 13/22 em ${doc.cdabr}`);
  return out;
}

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

const mun = {};
let total = 0;
for (const uf of UFS) {
  const ab = await get(`${BASE}/${uf}/${uf}-e006257-ab.json`);
  const lista = (ab.abr ?? []).filter((a) => a.tpabr === "mun");
  const ufDoc = await get(`${BASE}/${uf}/${uf}-c0001-e006257-u.json`);
  if (ufDoc.tf !== "s") throw new Error(`${uf}: totalização do 1º turno não está final`);
  const alvo = votos(ufDoc);
  const linhas = await emLotes(lista, 12, async (a) => {
    const d = await get(`${BASE}/${uf}/${uf}${a.cdabr}-c0001-e006257-u.json`);
    const v = votos(d);
    // [Lula, Flávio, comparecimento, eleitorado] no 1º turno.
    return [`${uf}${a.cdabr}`, [v["13"], v["22"], int(a.e?.c), int(a.e?.te)]];
  });
  const soma = linhas.reduce((s, [, x]) => [s[0] + x[0], s[1] + x[1]], [0, 0]);
  if (soma[0] !== alvo["13"] || soma[1] !== alvo["22"])
    throw new Error(`${uf}: municípios somam Lula ${soma[0]} / Flávio ${soma[1]}; a UF diz ${alvo["13"]} / ${alvo["22"]}`);
  for (const [k, x] of linhas) mun[k] = x;
  total += linhas.length;
  console.log(`${uf}: ${linhas.length} municípios, Lula ${soma[0]}, Flávio ${soma[1]} — confere com a UF`);
}

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(
  OUT,
  JSON.stringify({
    fonte: "TSE — Divulgação de Resultados, eleição 6257 (1º turno presidencial), arquivos por município",
    campos: ["lula", "flavio", "comparecimento", "eleitorado"],
    lido_em: new Date().toISOString(),
    municipios: total,
    mun,
  }) + "\n",
);
console.log(`${total} municípios → ${OUT}`);
