#!/usr/bin/env node
// The database census: every record that is suspect, by fixed class, in one
// deterministic pass.
//
// WHY THIS EXISTS. "Is the database normalised?" had no answer you could check,
// so it was settled by opinion — which meant any adversarial look at 2.960
// polls found something, every finding reopened the work, and the work never
// converged. The supply of true findings in a database carrying years of source
// defects is effectively infinite; what was missing was not diligence but a
// FINITE LIST and a definition of done.
//
// So the classes here are fixed IN CODE. The census cannot discover a new kind
// of problem on a whim, which is the whole point: it turns an open question
// into a worklist that can be emptied. Add a class deliberately, as a change to
// this file, when one earns its place — never mid-triage.
//
// It is a REPORT, not a gate. It exits 0 with findings. `validate-store.mjs`
// owns the line between "impossible" (hard error, blocks a run) and this file's
// "suspect" (worth a human look). Keeping them separate is what stops a
// marginal rounding disagreement from red-lighting the twice-daily Action.
//
// Usage: node scripts/census.mjs [--out CENSO_BANCO.md]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR } from "./lib/store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const store = readStore({ dir: DATA_DIR });
const surveyById = new Map(store.surveys.map((s) => [s.survey_id, s]));
const candById = new Map(store.candidates.map((c) => [c.candidate_id, c]));

const dateOf = (s) => s?.fieldwork_end ?? s?.published_date ?? null;
const is2026 = (s) => (dateOf(s) ?? "").startsWith("2026");
const inst = (s) => s?.institute_names_raw?.[0] ?? "?";
const where = (q, s) => `${inst(s)} · ${q.uf ?? "BR"} ${q.race}/t${q.round} · ${dateOf(s) ?? "sem data"}`;

/** Rounding slack a poll has EARNED, from how its own figures are written. */
const slackOf = (vals) => vals.reduce((a, v) => a + (Number.isInteger(v) ? 0.5 : 0.05), 0);

const classes = [];
const add = (id, titulo, nota, itens) => classes.push({ id, titulo, nota, itens });

// ── 1. Single-winner rosters over 100 ───────────────────────────────────────
// Tighter than validate-store's hard error on purpose: this is the review line,
// that one is the impossibility line.
{
  const itens = [];
  for (const q of store.questions) {
    if (q.race === "senador") continue;
    const vals = (q.results ?? []).map((r) => r.pct).filter((v) => typeof v === "number");
    if (!vals.length) continue;
    const rows = vals.reduce((a, v) => a + v, 0);
    const slack = slackOf(vals);
    if (rows <= 100 + slack) continue;
    const s = surveyById.get(q.survey_id);
    itens.push({ s, texto: `${rows.toFixed(1)} (folga ${slack.toFixed(2)}) · ${where(q, s)} · ${q.legacy_id ?? q.question_id}\n  ` +
      (q.results ?? []).map((r) => `${r.name_raw ?? "?"} ${r.pct}`).join(" · ") });
  }
  add("SOMA", "Elenco de vaga única somando mais de 100",
    "Cada eleitor tem um voto: as linhas de candidato não podem passar de 100. A folga é derivada das próprias " +
    "casas decimais da fonte (0,5 por inteiro, 0,05 por décimo). O que aparecer aqui é arredondamento da fonte " +
    "ou linha a mais no elenco — o segundo caso é defeito nosso.", itens);
}

// ── 2. Candidates that are not people ───────────────────────────────────────
{
  const RESPOSTA = /\b(votar|votaria|votariam|votarem|voto|votos|todos|qualquer)\b|indecis|indiferen|absten[çc]|nenhum|^outros?$|^branco|^nulo|ns\/?nr/i;
  const itens = [];
  for (const c of store.candidates) {
    const n = (c.canonical ?? "").trim();
    const motivo = RESPOSTA.test(n) ? "parece opção de resposta"
      : /\d/.test(n) ? "contém dígito"
      : n.length < 3 ? "curto demais"
      : /[\[\]{}|]/.test(n) ? "wikitext não parseado"
      : null;
    if (motivo) itens.push({ s: null, texto: `${c.candidate_id} · ${c.contest} · ${JSON.stringify(n)} — ${motivo}` });
  }
  add("PESSOA", "Candidatos que podem não ser pessoas",
    "A tabela de candidatos guarda pessoas. Opções de resposta, nomes de partido e artefatos de tabela entram " +
    "por aqui e viram linhas de intenção de voto — uma delas somava 13,3% no Ceará.", itens);
}

// ── 3. Dangling candidate references ────────────────────────────────────────
{
  const itens = [];
  for (const q of store.questions) {
    for (const r of q.results ?? []) {
      if (r.candidate_id && !candById.has(r.candidate_id)) {
        itens.push({ s: surveyById.get(q.survey_id), texto: `${q.question_id} → ${r.candidate_id} (${r.name_raw ?? "?"}) não existe` });
      }
    }
  }
  add("ORFAO", "Resultados apontando para candidato inexistente",
    "Referência quebrada entre questions e candidates. Sempre defeito nosso, nunca da fonte.", itens);
}

// ── 4. Polls with no usable date ────────────────────────────────────────────
{
  const itens = [];
  for (const s of store.surveys) {
    if (dateOf(s)) continue;
    itens.push({ s, texto: `${s.survey_id} · ${inst(s)} · ${s.universe?.uf ?? "BR"} · registro ${s.tse_registration ?? "—"}` });
  }
  add("SEMDATA", "Levantamentos sem data utilizável",
    "Sem data de campo nem de publicação, a pesquisa não entra em média nem em série temporal: está no banco " +
    "e é invisível. Ou se acha a data na fonte, ou se descarta.", itens);
}

// ── 5. Same fieldwork held twice ────────────────────────────────────────────
// Heuristic and deliberately loose: same institute, same universe, same
// fieldwork end, same race and round, in two different surveys.
{
  const chave = new Map();
  for (const q of store.questions) {
    const s = surveyById.get(q.survey_id);
    const d = dateOf(s);
    if (!d) continue;
    const k = `${s.institute_id}|${s.universe?.uf ?? "BR"}|${d}|${q.race}|${q.round}`;
    if (!chave.has(k)) chave.set(k, []);
    chave.get(k).push({ q, s });
  }
  const itens = [];
  for (const [k, grupo] of chave) {
    const surveys = new Set(grupo.map((g) => g.s.survey_id));
    if (surveys.size < 2) continue;
    // Two questions with the SAME roster are the same question twice — that is
    // the case that actually double-counts in an average. Different rosters
    // across the two surveys are one fieldwork's scenarios split apart, which
    // is a survey-identity problem and not, by itself, a duplicated poll.
    const rosterKey = (q) => (q.results ?? []).map((r) => r.candidate_id).sort().join("+");
    const rosters = grupo.map((g) => rosterKey(g.q));
    const repetido = rosters.some((r, i) => rosters.indexOf(r) !== i);
    itens.push({ s: grupo[0].s, dupReal: repetido,
      texto: `${repetido ? "ELENCO REPETIDO — " : "cenários separados — "}${where(grupo[0].q, grupo[0].s)} — ${surveys.size} levantamentos\n  ` +
        grupo.map((g) => `${g.s.survey_id}: ${(g.q.results ?? []).map((r) => `${r.name_raw} ${r.pct}`).join(" · ")}`).join("\n  ") });
  }
  const reais = itens.filter((i) => i.dupReal).length;
  add("DUPLICATA", "Mesmo campo mantido como dois levantamentos",
    "Mesmo instituto, mesma UF, mesma data de campo, mesma disputa, em levantamentos separados. Duas coisas " +
    "diferentes caem aqui e o rótulo de cada item diz qual: *cenários separados* é uma operação de campo cujas " +
    "perguntas ficaram em levantamentos distintos — problema de identidade de levantamento, que a escada de " +
    `resolução (\`upsertPoll\`) une; *elenco repetido* (${reais} de ${itens.length}) é a mesma pergunta duas vezes, ` +
    "e essa sim entra duas vezes na média.", itens);
}

// ── 6. Conflicts still open ─────────────────────────────────────────────────
{
  const itens = store.conflicts
    .filter((c) => c.severity === "review" || c.severity === "locked_field")
    .map((c) => ({ s: surveyById.get(c.record_id), texto: `${c.type} · ${c.record_id} · ${c.field}: ${JSON.stringify(c.stored)} × ${JSON.stringify(c.incoming)}` }));
  add("CONFLITO", "Conflitos registrados aguardando decisão",
    "Divergências que o pipeline registrou em vez de resolver em silêncio. Cada uma precisa de uma fonte " +
    "primária ou de uma decisão editorial.", itens);
}

// ───────────────────────────────────────────────────────────── saída
const L = [];
L.push("# Censo do banco — Placar das Pesquisas 2026", "");
L.push(`Gerado por \`node scripts/census.mjs\` a partir de \`data/\`. Não editar à mão.`, "");
L.push(`Banco: **${store.surveys.length} levantamentos · ${store.questions.length} perguntas · ` +
  `${store.institutes.length} institutos · ${store.candidates.length} candidatos**.`, "");
L.push("Este arquivo é a definição operacional de *banco normalizado*: as classes abaixo são fixas em código, e");
L.push("o banco está normalizado quando todas estão vazias — ou quando o que resta está explicitamente parqueado");
L.push("como decisão editorial. Achado fora destas classes é anotado, não corrigido no meio de uma rodada.", "");

const total = classes.reduce((a, c) => a + c.itens.length, 0);
const de2026 = classes.reduce((a, c) => a + c.itens.filter((i) => is2026(i.s)).length, 0);
L.push("| classe | itens | de 2026 |", "|---|---|---|");
for (const c of classes) {
  L.push(`| **${c.id}** — ${c.titulo} | ${c.itens.length} | ${c.itens.filter((i) => is2026(i.s)).length} |`);
}
L.push(`| **total** | **${total}** | **${de2026}** |`, "");
L.push("A coluna *de 2026* é a que importa primeiro: a eleição é em outubro de 2026 e a média usa as pesquisas");
L.push("mais recentes, então um defeito num levantamento de 2023 não aparece em lugar nenhum do site.", "");

for (const c of classes) {
  L.push(`## ${c.id} — ${c.titulo} (${c.itens.length})`, "");
  L.push(c.nota, "");
  if (!c.itens.length) { L.push("*Nada a reportar.*", ""); continue; }
  for (const i of c.itens) L.push(`- ${is2026(i.s) ? "**[2026]** " : ""}${i.texto}`);
  L.push("");
}

const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
const out = path.join(ROOT, outArg ?? "CENSO_BANCO.md");
fs.writeFileSync(out, L.join("\n") + "\n");
console.log(`censo: ${total} item(ns) em ${classes.length} classes (${de2026} de 2026) → ${path.relative(ROOT, out)}`);
for (const c of classes) console.log(`  ${String(c.itens.length).padStart(4)}  ${c.id} — ${c.titulo}`);
