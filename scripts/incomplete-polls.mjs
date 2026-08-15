#!/usr/bin/env node
// Surface the polls that are incomplete AT SOURCE, for editorial decision.
//
// These are gated out of the averages by `completeness.mjs`, and gated is not
// the same as discarded: each one is listed here with the institute, the
// missing share, the article the aggregator points at, and the institute's own
// PDF where one exists — so the call can be made against the document rather
// than against the number.
//
// Usage: node scripts/incomplete-polls.mjs [--out PESQUISAS_INCOMPLETAS.md]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";
import { completeness, LIMIAR } from "./lib/completeness.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const UF_NOME = { AC:"Acre",AL:"Alagoas",AM:"Amazonas",AP:"Amapá",BA:"Bahia",CE:"Ceará",DF:"Distrito Federal",
  ES:"Espírito Santo",GO:"Goiás",MA:"Maranhão",MG:"Minas Gerais",MS:"Mato Grosso do Sul",MT:"Mato Grosso",
  PA:"Pará",PB:"Paraíba",PE:"Pernambuco",PI:"Piauí",PR:"Paraná",RJ:"Rio de Janeiro",RN:"Rio Grande do Norte",
  RO:"Rondônia",RR:"Roraima",RS:"Rio Grande do Sul",SC:"Santa Catarina",SE:"Sergipe",SP:"São Paulo",TO:"Tocantins" };

const store = readStore({ dir: DATA_DIR });
const surveyOf = new Map();
for (const q of store.questions) surveyOf.set(q.legacy_id ?? q.question_id, store.surveys.find((s) => s.survey_id === q.survey_id));

const rows = [];
for (const p of projectPolls(store)) {
  const c = completeness(p);
  if (!c.incomplete) continue;
  const s = surveyOf.get(p.id);
  rows.push({ p, c, integra: s?.integra_url ?? null, artigo: s?.article_url ?? p.source_url ?? null,
              registro: p.tse_registration ?? null });
}
rows.sort((a, b) => a.c.sum - b.c.sum);

const L = [];
L.push("# Pesquisas incompletas na fonte — decisão editorial");
L.push("");
L.push(`Geradas por \`node scripts/incomplete-polls.mjs\`. **${rows.length} pesquisas** em que os números`);
L.push(`publicados somam menos de **${LIMIAR}%** da amostra: candidatos, "outros", branco/nulo e indecisos`);
L.push("juntos não fecham a conta. Não são pesquisas erradas — são pesquisas em que faltam linhas na");
L.push("origem (o instituto divulgou só os primeiros colocados, ou a tabela veio truncada).");
L.push("");
L.push("**Estão FORA das médias.** Por que isso importa mais do que parece: votos válidos dividem pela");
L.push("soma do que está presente, então uma pesquisa a que faltam 40 pontos infla todo mundo que");
L.push("sobrou nela. Manter na média com um sinalizador não resolve — o número já sai errado.");
L.push("");
L.push("Senado fica de fora desta conta: com dois votos por eleitor a tabela soma ~200%, a aritmética");
L.push("não diz nada, e votos válidos não se aplicam ali.");
L.push("");
L.push("Para cada uma: quanto falta, o link do agregador e o PDF do próprio instituto quando existe.");
L.push("A decisão é olhando o documento — se o relatório mostrar os candidatos que faltam, é caso de");
L.push("reparo em `data/repairs.json` (e a pesquisa volta para a média); se o instituto realmente só");
L.push("divulgou parte, ela fica fora.");
L.push("");
L.push("- [ ] revisadas todas");
L.push("");

let atual = null;
for (const { p, c, integra, artigo, registro } of rows) {
  const disputa = `${p.race === "presidente" ? "Presidente" : p.race === "governador" ? "Governador" : "Senado"}` +
    `${p.state ? ` · ${UF_NOME[p.state] ?? p.state}` : " · Brasil"}${p.round === 2 ? " · 2º turno" : ""}`;
  if (disputa !== atual) { atual = disputa; L.push(`## ${disputa}`); L.push(""); }
  L.push(`### ${p.pollster} — ${p.fieldwork_end ?? p.published_date ?? "sem data"}`);
  L.push("");
  L.push(`Soma **${c.sum}%** · faltam **${c.missing} pontos** · ${p.results.length} candidato(s) na tabela` +
    `${p.sample_size ? ` · amostra ${p.sample_size}` : ""}${registro ? ` · registro ${registro}` : ""}`);
  L.push("");
  L.push(`| candidato | % |`);
  L.push(`|---|---|`);
  for (const r of [...p.results].sort((a, b) => b.pct - a.pct)) L.push(`| ${r.candidate} | ${r.pct} |`);
  const extra = [["outros", p.others_pct], ["branco/nulo", p.blank_null_pct], ["não sabe/não respondeu", p.undecided_pct]]
    .filter(([, v]) => v != null);
  for (const [k, v] of extra) L.push(`| *${k}* | ${v} |`);
  L.push("");
  if (integra) L.push(`- PDF do instituto: ${integra}`);
  if (artigo) L.push(`- ${artigo.includes("wikipedia") ? "Página da Wikipédia" : "Publicação"}: ${artigo}`);
  if (!integra && !artigo) L.push(`- *sem link de origem registrado*`);
  L.push("");
  L.push("- [ ] reparar (o relatório traz os que faltam) · [ ] manter fora (o instituto só divulgou parte) · [ ] descartar");
  L.push("");
}

const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
const out = path.join(ROOT, outArg ?? "PESQUISAS_INCOMPLETAS.md");
fs.writeFileSync(out, L.join("\n") + "\n");
console.log(`${rows.length} pesquisas incompletas → ${path.relative(ROOT, out)}`);
const comPdf = rows.filter((r) => r.integra).length;
console.log(`  com PDF do instituto: ${comPdf} · só com link de publicação: ${rows.length - comPdf}`);
