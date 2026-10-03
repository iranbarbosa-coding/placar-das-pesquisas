#!/usr/bin/env node
// O REGISTRO DE PREDIÇÕES É VERIFICÁVEL OU NÃO É REGISTRO (ver PREDICOES.md).
//
// Confere `data/predicoes.ndjson`: uma linha por afirmação, esquema fechado, ids
// únicos, disputa declarada em `data/disputas-declaradas.json`, base copiada da
// média (generated_at ISO, media não vazia), `resultado` nulo ou avaliado.
// `--self-test` prova que a bateria REPROVA linhas malformadas.
//
// Uso: node scripts/predicoes-check.mjs [--self-test] [caminho.ndjson]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const TIPOS = new Set(["vence_1o_turno", "segundo_turno", "ordem_dois_primeiros", "senado_duas_vagas", "faixa"]);
const CONFIANCAS = new Set(["alta", "media", "baixa"]);
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?Z$/;
const DATA = /^\d{4}-\d{2}-\d{2}$/;

export function validarPredicoes(texto, disputas) {
  const erros = [];
  const ids = new Set();
  const linhas = texto.split("\n").map((l, i) => [i + 1, l.trim()]).filter(([, l]) => l);
  for (const [n, l] of linhas) {
    let p;
    try { p = JSON.parse(l); } catch { erros.push(`linha ${n}: JSON inválido`); continue; }
    const at = `linha ${n} (${p.id ?? "sem id"})`;
    if (typeof p.id !== "string" || !/^pred-\d{4}-\d{2}-\d{2}-[a-z]+-[A-Z]{2}-\d+$/.test(p.id)) erros.push(`${at}: id fora do padrão pred-<data>-<cargo>-<UF>-<n>`);
    else if (ids.has(p.id)) erros.push(`${at}: id duplicado`); else ids.add(p.id);
    if (!ISO.test(p.registrada_em ?? "")) erros.push(`${at}: registrada_em não é ISO UTC`);
    if (!disputas.has(p.disputa)) erros.push(`${at}: disputa "${p.disputa}" não está em disputas-declaradas.json`);
    if (p.turno !== 1 && p.turno !== 2) erros.push(`${at}: turno tem de ser 1 ou 2`);
    if (!TIPOS.has(p.tipo)) erros.push(`${at}: tipo "${p.tipo}" desconhecido`);
    if (typeof p.afirmacao !== "string" || p.afirmacao.trim().length < 10) erros.push(`${at}: afirmacao vazia ou curta demais`);
    if (!CONFIANCAS.has(p.confianca)) erros.push(`${at}: confianca "${p.confianca}" desconhecida`);
    const b = p.base;
    if (!b || typeof b !== "object") erros.push(`${at}: base ausente`);
    else {
      if (!ISO.test(b.generated_at ?? "")) erros.push(`${at}: base.generated_at não é ISO UTC`);
      if (!b.media || typeof b.media !== "object" || !Object.keys(b.media).length) erros.push(`${at}: base.media vazia`);
      else for (const [c, v] of Object.entries(b.media)) if (typeof v !== "number" || v < 0 || v > 100) erros.push(`${at}: base.media[${c}] não é percentual`);
      if (b.last_poll_date != null && !DATA.test(b.last_poll_date)) erros.push(`${at}: base.last_poll_date não é AAAA-MM-DD`);
      if (typeof b.em_quarentena !== "boolean") erros.push(`${at}: base.em_quarentena tem de ser true/false`);
      if (b.em_quarentena && p.confianca !== "baixa") erros.push(`${at}: disputa em quarentena só admite confianca "baixa"`);
    }
    if (p.publicacao != null) {
      const u = p.publicacao;
      if (typeof u !== "object" || typeof u.canal !== "string") erros.push(`${at}: publicacao.canal ausente`);
      if (u.publicada_em != null && !ISO.test(u.publicada_em)) erros.push(`${at}: publicacao.publicada_em não é ISO UTC`);
      if (u.publicada_em && !u.url) erros.push(`${at}: publicada sem url`);
    }
    if (p.resultado != null) {
      const r = p.resultado;
      if (typeof r.acertou !== "boolean") erros.push(`${at}: resultado.acertou tem de ser true/false`);
      if (!r.apurado || typeof r.apurado !== "object") erros.push(`${at}: resultado.apurado ausente`);
      if (!ISO.test(r.avaliado_em ?? "")) erros.push(`${at}: resultado.avaliado_em não é ISO UTC`);
    }
  }
  return { erros, total: linhas.length };
}

function disputasDeclaradas() {
  const d = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "disputas-declaradas.json"), "utf-8"));
  return new Set(Object.keys(d.disputas ?? {}));
}

function selfTest() {
  const disputas = new Set(["presidente:BR", "governador:SP"]);
  const boa = JSON.stringify({
    id: "pred-2026-10-03-presidente-BR-1", registrada_em: "2026-10-03T16:00:00Z", disputa: "presidente:BR", turno: 1,
    tipo: "segundo_turno", afirmacao: "Lula e Flávio Bolsonaro vão ao 2º turno, Lula à frente.", confianca: "alta",
    base: { generated_at: "2026-10-03T14:17:08Z", basis: "validos", poll_count: 10, last_poll_date: "2026-09-28", spread: 2.6,
      media: { Lula: 44.3, "Flávio Bolsonaro": 41.7 }, em_quarentena: false },
    publicacao: { canal: "video", url: null, publicada_em: null }, resultado: null,
  });
  const ok = validarPredicoes(boa, disputas);
  if (ok.erros.length) { console.error("AUTOTESTE FALHOU: a linha boa reprovou:", ok.erros); process.exit(1); }
  const casos = [
    ["id duplicado", boa + "\n" + boa, /duplicado/],
    ["disputa não declarada", boa.replace("presidente:BR", "governador:ZZ"), /não está em disputas/],
    ["tipo desconhecido", boa.replace('"segundo_turno"', '"palpite"'), /tipo .* desconhecido/],
    ["quarentena com confiança alta", boa.replace('"em_quarentena":false', '"em_quarentena":true'), /só admite confianca "baixa"/],
    ["media vazia", boa.replace(/"media":\{[^}]*\}/, '"media":{}'), /base\.media vazia/],
    ["publicada sem url", boa.replace('"publicada_em":null', '"publicada_em":"2026-10-03T18:00:00Z"'), /publicada sem url/],
    ["resultado sem acertou", boa.replace('"resultado":null', '"resultado":{"apurado":{"Lula":48}}'), /acertou/],
    ["JSON inválido", "{isto não é json", /JSON inválido/],
  ];
  const falhas = [];
  for (const [nome, texto, re] of casos) {
    const { erros } = validarPredicoes(texto, disputas);
    if (!erros.some((e) => re.test(e))) falhas.push(`${nome}: não reprovou (erros: ${erros.join(" | ") || "nenhum"})`);
  }
  if (falhas.length) { console.error("AUTOTESTE FALHOU:\n  " + falhas.join("\n  ")); process.exit(1); }
  console.log(`predicoes-check --self-test: OK — a linha boa passa e ${casos.length} defeitos reprovam`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--self-test")) { selfTest(); }
  else {
    const arquivo = process.argv[2] ?? path.join(ROOT, "data", "predicoes.ndjson");
    const texto = fs.existsSync(arquivo) ? fs.readFileSync(arquivo, "utf-8") : "";
    const { erros, total } = validarPredicoes(texto, disputasDeclaradas());
    if (erros.length) { for (const e of erros) console.error(`ERRO: ${e}`); console.error(`\n${erros.length} erro(s) em ${total} predição(ões)`); process.exit(1); }
    console.log(`predicoes: ${total} registrada(s), esquema OK`);
  }
}
