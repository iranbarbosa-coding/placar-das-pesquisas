#!/usr/bin/env node
// Rebuilding the store twice, on two DIFFERENT dates, must produce byte-identical
// tables. `meta.migrated_at` is the single permitted difference.
//
// This is the guard for a defect that was live and invisible: every date was
// read from the wall clock at the point of use, so a rebuild on a later day
// rewrote all 4.613 records with nothing but the stamps changed. Nothing failed
// — the store stayed valid and parity stayed green — you simply lost the
// three-line reviewable diff that NDJSON exists to give you, and with it the
// ability to tell a real regression from date churn.
//
// Three properties are checked, because any one alone would pass while broken:
//   (1) INJECTION  — a fresh build stamps the date it was GIVEN, never today's.
//                    Without this, `runDate` could be ignored entirely.
//   (2) PRESERVATION — a rebuild carries forward the stamps it already had.
//                    Without this, every run re-dates the whole store.
//   (3) LINHAGEM   — o que uma RECUNHAGEM gravou sobrevive à rodada seguinte.
//
// ⚠ POR QUE (3) EXISTE, e por que a verificação era ESTRUTURALMENTE INCAPAZ de
// ver o defeito que ela agora vê. As duas rodadas eram construídas num diretório
// VAZIO. Num diretório vazio nenhum id "some", então `translateCandidateStamps`
// nunca disparava, então `legacy_ids` nunca era escrito — e a pergunta "o que
// a tradução gravou sobrevive?" jamais chegava a ser feita. O defeito real:
// `legacy_ids` era escrito na rodada N e voltava a `[]` na N+1, um segundo diff
// de tabela inteira, invisível a um guarda verde. É o padrão que CONVENTIONS §2
// nomeia — um guarda que passa a proteger código que ninguém executa mente.
//
// Por isso a rodada 1 agora parte de um estado anterior SEMEADO com ids
// deliberadamente alheios ao espaço de ids atual: eles somem, a tradução roda,
// `legacy_ids` é escrito, e a rodada 2 tem algo real a preservar.
//
// `--self-test` prova as três, cada uma pelo seu defeito: apagar o store entre
// as rodadas (perde a preservação) e desligar o carregamento de `legacy_ids`
// (perde a linhagem). Um guarda cujo caminho de falha nunca foi executado não é
// evidência de nada.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { writeStoreFromPolls } from "./lib/build-store.mjs";
import { TABLE_NAMES } from "./lib/store.mjs";

// Drives the SAME builder the scraper does. It used to drive
// `migrate-to-store.mjs`; once the scraper switched to the resolution ladder
// (2026-08-16) that would have left this guard proving a property of code the
// pipeline no longer runs — a green check for a dead path.
const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEGACY = path.join(ROOT, "data", "polls.json");
const build = (runDate, dir) =>
  writeStoreFromPolls(JSON.parse(fs.readFileSync(LEGACY, "utf-8")).polls, {
    runDate, dir, meta: { built_by: "idempotence-check" },
  });

// A LISTA VEM DO STORE, não de uma cópia.
//
// Uma tabela ausente daqui não é conferida por `snapshot` NEM por `stampsIn` —
// não dá erro, apenas some das duas metades da verificação, e o guarda segue
// verde enquanto a tabela nova re-data o banco inteiro a cada rodada. É a mesma
// família de defeito do `byRef` consertado e do `byReg` deixado quebrado.
const TABLES = TABLE_NAMES;
const DATE_A = "2026-01-02";
const DATE_B = "2027-09-30";

const snapshot = (dir) =>
  Object.fromEntries(TABLES.map((t) => {
    const f = path.join(dir, `${t}.ndjson`);
    return [t, fs.existsSync(f) ? fs.readFileSync(f, "utf-8") : ""];
  }));

/** Every date this store stamps, flattened, so a stray wall-clock read shows up. */
function stampsIn(dir) {
  const found = new Set();
  const walk = (v) => {
    if (Array.isArray(v)) return v.forEach(walk);
    if (v && typeof v === "object") {
      for (const [k, val] of Object.entries(v)) {
        if (["first_seen", "created_at", "updated_at", "at"].includes(k) && typeof val === "string") {
          found.add(val.slice(0, 10));
        } else walk(val);
      }
    }
  };
  for (const t of TABLES) {
    const f = path.join(dir, `${t}.ndjson`);
    if (!fs.existsSync(f)) continue;
    for (const line of fs.readFileSync(f, "utf-8").split("\n")) {
      if (line.trim()) walk(JSON.parse(line));
    }
  }
  return found;
}

/**
 * Planta um estado ANTERIOR cujos `candidate_id` não existem mais, para que a
 * rodada 1 tenha uma RECUNHAGEM de verdade a traduzir.
 *
 * Sem isto as duas rodadas partiam de um diretório vazio, nenhum id sumia,
 * `translateCandidateStamps` nunca era executada e nada da linhagem que ela
 * escreve chegava a ser conferido. O estado é derivado de uma construção
 * descartável (0,4 s) em vez de lido do `data/` vivo: o guarda continua
 * dependendo só de `polls.json`, e não passa a certificar o banco contra ele
 * mesmo.
 *
 * A mutação do id é a INVERSÃO do payload hexadecimal — determinística, e
 * conferida contra colisão: um "id antigo" que por acaso fosse um id novo não
 * sumiria, e o caso deixaria de exercitar a tradução em silêncio.
 */
function plantarAnterior(dir) {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "placar-idem-seed-"));
  try {
    build(DATE_A, tmp);
    const linhas = fs.readFileSync(path.join(tmp, "candidates.ndjson"), "utf-8")
      .split("\n").filter(Boolean).map((l) => JSON.parse(l));
    const reais = new Set(linhas.map((c) => c.candidate_id));
    const antigos = linhas.map((c) => {
      const [pre, hex] = [c.candidate_id.slice(0, 2), c.candidate_id.slice(2)];
      const id = pre + [...hex].reverse().join("");
      if (reais.has(id)) throw new Error(`semente colidiu com id real (${id}) — o caso não exercitaria a tradução`);
      return { ...c, candidate_id: id, legacy_ids: [], first_seen: DATE_A };
    });
    fs.writeFileSync(path.join(dir, "candidates.ndjson"),
      antigos.map((c) => JSON.stringify(c)).join("\n") + "\n");
    return antigos.length;
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

function run({ selfTest = false } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "placar-idem-"));
  const errors = [];
  try {
    const plantados = plantarAnterior(dir);

    // ---- run 1: a fresh build on DATE_A -----------------------------------
    build(DATE_A, dir);

    // (3) linhagem: a tradução TEM de ter acontecido, senão o resto da
    // verificação abaixo não prova nada sobre ela. Um guarda que confere um
    // campo que nunca foi escrito é o zero em que este projeto já acreditou.
    const comLinhagem = fs.readFileSync(path.join(dir, "candidates.ndjson"), "utf-8")
      .split("\n").filter(Boolean).map((l) => JSON.parse(l))
      .filter((c) => (c.legacy_ids ?? []).length).length;
    if (!comLinhagem) {
      errors.push(`(3) linhagem: plantados ${plantados} ids antigos e NENHUMA linha saiu com legacy_ids — a tradução não rodou, e a comparação abaixo não exercita a linhagem`);
    }
    const first = snapshot(dir);
    const stampsA = stampsIn(dir);

    // (1) injection: nothing may carry a date other than the one we injected.
    const strays = [...stampsA].filter((d) => d !== DATE_A);
    if (strays.length) {
      errors.push(`(1) injeção: carimbos fora de ${DATE_A} → ${JSON.stringify(strays.slice(0, 5))} (relógio de parede vazando)`);
    }

    if (selfTest === "carimbos") {
      // Simulate the old behaviour: nothing survives for run 2 to preserve.
      for (const t of TABLES) fs.rmSync(path.join(dir, `${t}.ndjson`), { force: true });
    }
    if (selfTest === "linhagem") {
      // Simula EXATAMENTE o defeito do carregamento quebrado: a rodada 2 lê um
      // estado anterior sem `legacy_ids`, que é o que ela veria se
      // `build-store.mjs` deixasse de carregar o campo. Se a comparação (2) não
      // reprovar aqui, ela é cega para a evaporação da linhagem — que foi
      // precisamente o caso enquanto as duas rodadas partiam do vazio.
      const f = path.join(dir, "candidates.ndjson");
      fs.writeFileSync(f, fs.readFileSync(f, "utf-8").split("\n").filter(Boolean)
        .map((l) => JSON.stringify({ ...JSON.parse(l), legacy_ids: [] })).join("\n") + "\n");
    }

    // ---- run 2: rebuild on DATE_B ------------------------------------------
    build(DATE_B, dir);
    const second = snapshot(dir);

    // (2) preservation: byte-identical tables despite the different date.
    for (const t of TABLES) {
      if (first[t] === second[t]) continue;
      const a = first[t].split("\n"), b = second[t].split("\n");
      const changed = a.filter((l, i) => l !== b[i]).length;
      errors.push(`(2) preservação: ${t}.ndjson mudou em ${changed} linha(s) entre ${DATE_A} e ${DATE_B}`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
  return errors;
}

const selfTest = process.argv.includes("--self-test");

if (selfTest) {
  // CADA DEFEITO TEM O SEU AUTOTESTE. Um autoteste só, que apaga o store
  // inteiro, reprova por tudo ao mesmo tempo e não prova nada sobre nenhuma das
  // propriedades em separado: ele passaria intacto mesmo que a linhagem
  // deixasse de ser conferida, que foi o estado real deste arquivo.
  const casos = [
    ["carimbos", "os carimbos não são preservados (store apagado entre as rodadas)"],
    ["linhagem", "a linhagem evapora (legacy_ids some do estado anterior)"],
  ];
  let ok = true;
  for (const [modo, descricao] of casos) {
    const errors = run({ selfTest: modo });
    if (!errors.length) {
      console.error(`AUTOTESTE FALHOU (${modo}): a verificação passou mesmo com ${descricao} — ela não detecta o defeito que existe para detectar.`);
      ok = false;
      continue;
    }
    console.log(`autoteste (${modo}): a verificação DISPARA quando ${descricao}`);
    for (const e of errors.slice(0, 2)) console.log(`  detectado → ${e}`);
  }
  process.exit(ok ? 0 : 1);
}

const errors = run();
if (errors.length) {
  for (const e of errors) console.error(`ERRO ${e}`);
  console.error(`\nIDEMPOTÊNCIA FALHOU — reconstruir em outra data altera o store.`);
  process.exit(1);
}
console.log(`IDEMPOTÊNCIA OK — reconstruir em ${DATE_A} e em ${DATE_B} produz tabelas byte-idênticas`);
