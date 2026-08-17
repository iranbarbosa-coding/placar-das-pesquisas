#!/usr/bin/env node
// A RECUPERAÇÃO DE FONTE CAÍDA GUARDA MESMO O QUE DIZ GUARDAR?
//
// Quando uma fonte falha, `runSource` promete "mantendo dados anteriores desta
// fonte" e reaproveita as pesquisas já gravadas. Para a Wikipédia essa promessa
// foi FALSA desde sempre: o filtro era `p.source === "wikipedia"`, e
// `polls.json` — que é projeção do store — nunca emite esse rótulo. Uma pesquisa
// da Wikipédia não tem id nativo, logo não gera `source_ref`, logo o
// levantamento só dela projeta `source: null` e a pergunta dela sob um
// levantamento do Poder360 projeta `source: "poder360"`.
//
// Resultado: numa falha de coleta da Wikipédia o ramo guardava ZERO e apagava
// 1.039 pesquisas, imprimindo uma mensagem de sucesso. O piso de `minQuestions`
// segurava por 58 perguntas; passando de ~3.040 perguntas, pararia de segurar.
//
// Esta bateria existe para que a promessa seja VERIFICÁVEL e não uma frase no
// console. Roda contra `data/polls.json` real, porque é ele que a recuperação lê.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { PERTENCE_A_FONTE } from "./scrape.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const polls = JSON.parse(fs.readFileSync(path.join(ROOT, "data", "polls.json"), "utf-8")).polls ?? [];

const MUTACOES = {
  // O defeito histórico, exatamente como era: casar pelo rótulo projetado.
  rotulo: { wikipedia: (p) => p.source === "wikipedia", poder360: (p) => p.source === "poder360" },
  // Predicados que se sobrepõem — a mesma pesquisa recuperada por duas fontes,
  // que numa falha dupla a duplicaria.
  sobreposto: { wikipedia: () => true, poder360: (p) => String(p.id).startsWith("p360-") },
};

function rodar(pred) {
  const falhas = [];
  const ok = (nome, cond) => { if (!cond) falhas.push(nome); };
  const wiki = polls.filter(pred.wikipedia);
  const p360 = polls.filter(pred.poder360);

  // 1. Nenhuma fonte pode recuperar vazio — é o defeito original.
  ok("wikipedia recupera alguma coisa", wiki.length > 0);
  ok("poder360 recupera alguma coisa", p360.length > 0);

  // 2. Partição: cada pesquisa pertence a EXATAMENTE uma fonte. Sobreposição
  //    duplicaria numa falha dupla; buraco apagaria em silêncio.
  const ids = (a) => new Set(a.map((p) => p.id));
  const w = ids(wiki), s = ids(p360);
  ok("nenhuma pesquisa pertence às duas fontes", [...w].every((id) => !s.has(id)));
  ok("nenhuma pesquisa fica fora das duas", w.size + s.size === polls.length);

  // 3. As curadas ficam fora: `applyRepairs` as reinsere toda rodada, e mantê-las
  //    aqui as duplicaria. (Vacuamente verdadeiro enquanto não houver nenhuma —
  //    e é por isso que o caso diz o que verifica.)
  const curadas = polls.filter((p) => String(p.id).startsWith("curado-"));
  ok("pesquisa curada não é recuperada por nenhuma fonte",
    curadas.every((p) => !w.has(p.id) && !s.has(p.id)));

  return falhas;
}

const auto = process.argv.includes("--self-test");
if (!auto) {
  const falhas = rodar(PERTENCE_A_FONTE);
  for (const f of falhas) console.error(`  ✗ ${f}`);
  console.log(`${polls.length - falhas.length ? "" : ""}${4 - falhas.length} de 4 conferências passaram`);
  console.log(falhas.length
    ? "RECUPERAÇÃO DE FONTE FALHOU — a promessa de manter os dados anteriores não se cumpre."
    : `RECUPERAÇÃO DE FONTE OK — wikipedia ${polls.filter(PERTENCE_A_FONTE.wikipedia).length} · ` +
      `poder360 ${polls.filter(PERTENCE_A_FONTE.poder360).length} · partição completa.`);
  process.exit(falhas.length ? 1 : 0);
}

// AUTOTESTE: cada mutação tem de derrubar a sua metade. Sem isto a bateria
// poderia estar verde por não conferir nada — que é como o defeito original
// sobreviveu a tantas rodadas.
const esperado = {
  rotulo: ["wikipedia recupera alguma coisa", "nenhuma pesquisa fica fora das duas"],
  sobreposto: ["nenhuma pesquisa pertence às duas fontes"],
};
let ok = true;
for (const [modo, devemCair] of Object.entries(esperado)) {
  const falhas = rodar(MUTACOES[modo]);
  const faltando = devemCair.filter((n) => !falhas.includes(n));
  if (faltando.length) {
    ok = false;
    console.error(`AUTOTESTE FALHOU (${modo}): passou em ${faltando.length} caso(s) que a mutação quebra:`);
    for (const n of faltando) console.error(`  não reprovou → ${n}`);
  } else {
    console.log(`autoteste (${modo}): a bateria REPROVA ${falhas.length} conferência(s) quando o predicado é mutilado`);
    for (const n of falhas) console.log(`  detectado → ${n}`);
  }
}
process.exit(ok ? 0 : 1);
