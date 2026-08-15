#!/usr/bin/env node
// Institute naming must not depend on WHAT ELSE is in the dataset.
//
// It did. `canonicalizePollsters` seeded its clusters in FREQUENCY order, so
// the most-polled name became the seed others attached to. Adding 365
// state-level presidential polls shifted those counts, one institute split in
// two, a cross-source merge that had depended on the shared name stopped
// happening, and an Acre SENATE poll fell out of the averages — a race with no
// presidential polls in it at all.
//
// The property: canonicalising a set of polls, and canonicalising that same set
// with unrelated polls added, must give the ORIGINAL polls identical names.
//
// Run: node scripts/pollster-clustering-check.mjs
import { canonicalizePollsters } from "./lib/canonicalize.mjs";

let failures = 0;
const check = (name, fn) => {
  const problems = [];
  try { fn((c, d) => { if (!c) problems.push(d); }); }
  catch (e) { problems.push(`exceção: ${e.message}`); }
  if (problems.length) { failures++; console.log(`✗ ${name}`); for (const p of problems) console.log(`    ${p}`); }
  else console.log(`✓ ${name}`);
};

const poll = (pollster, over = {}) => ({
  pollster, race: "governador", state: "AC", round: 1,
  results: [{ candidate: "A", party: "PT", pct: 40 }], ...over,
});
const names = (ps) => ps.map((p) => p.pollster);

check("adicionar pesquisas NÃO RELACIONADAS não renomeia as existentes", (assert) => {
  // The real case, with the real names. Poder360 files the Acre institute as
  // "Instituto Travessia"; Wikipedia writes "Travessia Diagnóstico"; and
  // "Diagnóstico/Acieg" appears elsewhere. The middle name shares a token with
  // each of the other two, so whichever becomes a cluster SEED first decides
  // the outcome — and seeds were ordered by frequency, which any new data
  // changes.
  const base = [
    poll("Instituto Travessia"), poll("Travessia Diagnóstico"),
    poll("Diagnóstico/Acieg"), poll("Diagnóstico/Acieg"),
    poll("Quaest"), poll("AtlasIntel"),
  ];
  const antes = names(canonicalizePollsters(base.map((p) => ({ ...p }))));

  // 40 presidential polls by one of them — exactly what collecting a new race did.
  const ruido = Array.from({ length: 40 }, () => poll("Diagnóstico/Acieg", { race: "presidente", state: null }));
  const depois = names(canonicalizePollsters([...base.map((p) => ({ ...p })), ...ruido])).slice(0, base.length);

  for (let i = 0; i < antes.length; i++) {
    assert(antes[i] === depois[i],
      `pesquisa ${i} (${base[i].pollster}): "${antes[i]}" sozinha, "${depois[i]}" com dados alheios juntos`);
  }
});

check("a ordem das pesquisas na entrada não muda os nomes", (assert) => {
  const base = [
    poll("Paraná Pesquisas"), poll("Paraná Pesquisas"), poll("Instituto Paraná"),
    poll("Real Time Big Data"), poll("Real Time"), poll("Quaest"), poll("Genial/Quaest"),
  ];
  const a = names(canonicalizePollsters(base.map((p) => ({ ...p }))));
  const b = names(canonicalizePollsters([...base].reverse().map((p) => ({ ...p })))).reverse();
  for (let i = 0; i < a.length; i++) {
    assert(a[i] === b[i], `pesquisa ${i} (${base[i].pollster}): "${a[i]}" × "${b[i]}" invertendo a entrada`);
  }
});

check("o que já é conhecido continua se unificando", (assert) => {
  const ps = canonicalizePollsters([poll("Quaest"), poll("Genial/Quaest"), poll("Genial /Quaest")]);
  const uniq = new Set(names(ps));
  assert(uniq.size === 1, `"Quaest" e "Genial/Quaest" deveriam ser um só nome, vieram ${[...uniq].join(" | ")}`);
});

check("institutos distintos continuam distintos", (assert) => {
  const ps = canonicalizePollsters([poll("Quaest"), poll("AtlasIntel"), poll("Datafolha"), poll("Ipec")]);
  assert(new Set(names(ps)).size === 4, `4 institutos viraram ${new Set(names(ps)).size}`);
});

console.log(`\n${failures ? `${failures} falha(s)` : "todas passaram"}`);
if (failures) {
  console.error("AGRUPAMENTO DE INSTITUTOS INSTÁVEL — o nome depende de dados alheios à pesquisa.");
  process.exit(1);
}
console.log("AGRUPAMENTO DE INSTITUTOS OK — estável a acréscimos e à ordem de entrada.");
