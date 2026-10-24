#!/usr/bin/env node
// Baixa as fotos oficiais de candidaturas do Portal de Dados Abertos do TSE e
// grava em public/candidatos/<sq_candidato>.jpg só as pedidas.
//
//   node scripts/fotos-candidatos.mjs candidatos-2026 [--uf=AC] <sq> [<sq> ...]
//   (sem --uf, a circunscrição BR — presidente)
//
// O conjunto tem um ZIP de fotos por circunscrição, um arquivo por candidatura
// nomeado pelo sequencial (sq_candidato). O endereço do ZIP vem da API do CKAN
// (package_show) — nada adivinhado. Se alguma foto pedida
// não estiver no ZIP, falha e não grava nada.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const args = process.argv.slice(2);
const ufArg = args.find((a) => a.startsWith("--uf="));
const UF = ufArg ? ufArg.slice(5).toUpperCase() : "BR";
const [dataset, ...sqs] = args.filter((a) => a !== ufArg);
if (!dataset || !sqs.length) {
  console.error("uso: fotos-candidatos.mjs <conjunto-ckan> <sq> [<sq> ...]");
  process.exit(2);
}
const UA = { "User-Agent": "Mozilla/5.0 (placardaspesquisas.com.br)" };
const meta = await (await fetch(`https://dadosabertos.tse.jus.br/api/3/action/package_show?id=${dataset}`, { headers: UA })).json();
const recursos = meta?.result?.resources ?? [];
if (!process.env.SILENCIO) for (const r of recursos) console.log(`  · ${r.id} ${r.name} → ${r.url}`);
// Um ZIP por circunscrição (foto_cand<ano>_<UF>_div.zip); presidente fica no BR.
const fotos = recursos.filter((r) => /foto/i.test(`${r.name} ${r.url}`) && new RegExp(`(^|[^A-Z])${UF}([^A-Z]|$)`).test(`${r.name} ${r.url}`));
if (fotos.length !== 1) throw new Error(`esperava 1 recurso de fotos ${UF} em ${dataset}, achei ${fotos.length}`);
const url = fotos[0].url;
console.log(`recurso: ${fotos[0].name} → ${url}`);

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "fotos-"));
const zip = path.join(tmp, "fotos.zip");
const r = await fetch(url, { headers: UA });
if (!r.ok) throw new Error(`download ${r.status} em ${url}`);
fs.writeFileSync(zip, Buffer.from(await r.arrayBuffer()));

const nomes = execFileSync("unzip", ["-Z1", zip], { encoding: "utf8", maxBuffer: 1 << 28 }).split("\n").filter(Boolean);
const achados = sqs.map((sq) => {
  const m = nomes.filter((n) => new RegExp(`(^|[^0-9])${sq}([^0-9]|$)`).test(path.basename(n)) && /\.(jpe?g)$/i.test(n));
  if (m.length !== 1) throw new Error(`sq ${sq}: ${m.length} arquivos no ZIP (${m.join(", ")})`);
  return [sq, m[0]];
});
fs.mkdirSync("public/candidatos", { recursive: true });
for (const [sq, nome] of achados) {
  const buf = execFileSync("unzip", ["-p", zip, nome], { maxBuffer: 1 << 26 });
  if (buf[0] !== 0xff || buf[1] !== 0xd8) throw new Error(`${nome} não é JPEG`);
  fs.writeFileSync(`public/candidatos/${sq}.jpg`, buf);
  console.log(`public/candidatos/${sq}.jpg ← ${nome} (${buf.length} bytes)`);
}
