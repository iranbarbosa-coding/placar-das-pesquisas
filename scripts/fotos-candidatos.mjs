#!/usr/bin/env node
// Baixa as fotos oficiais de candidaturas do Portal de Dados Abertos do TSE e
// grava em public/candidatos/<sq_candidato>.jpg só as pedidas.
//
//   node scripts/fotos-candidatos.mjs <id-do-recurso-ckan> <sq> [<sq> ...]
//
// O recurso (ex.: d58fc30b-4eea-4286-a330-15511029e00e, fotos de 2026) é um ZIP
// com um arquivo por candidatura, nomeado pelo sequencial (sq_candidato). O
// endereço do ZIP vem da API do CKAN — nada adivinhado. Se alguma foto pedida
// não estiver no ZIP, falha e não grava nada.
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const [id, ...sqs] = process.argv.slice(2);
if (!id || !sqs.length) {
  console.error("uso: fotos-candidatos.mjs <id-do-recurso> <sq> [<sq> ...]");
  process.exit(2);
}
const UA = { "User-Agent": "Mozilla/5.0 (placardaspesquisas.com.br)" };
const meta = await (await fetch(`https://dadosabertos.tse.jus.br/api/3/action/resource_show?id=${id}`, { headers: UA })).json();
const url = meta?.result?.url;
if (!url) throw new Error(`recurso ${id} sem URL: ${JSON.stringify(meta).slice(0, 300)}`);
console.log(`recurso: ${meta.result.name ?? ""} → ${url}`);

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
