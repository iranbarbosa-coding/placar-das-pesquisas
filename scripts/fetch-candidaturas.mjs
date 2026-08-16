#!/usr/bin/env node
// The TSE candidacy register: official ballot names (nome de urna) for 2026.
//
// WHY THIS IS THE NORMALISATION SOURCE (creator, 2026-08-16). Until now a
// candidate's display name came from a precedence ladder — official TSE name,
// then press usage, then Wikipedia, then an editorial call — applied by hand in
// `data/candidate-rulings.json` and backed by a token matcher. That ladder
// existed because there was no authoritative list. There is now: registration
// closed on 15/08/2026 and the register is published. A ballot name is not an
// opinion about what to call someone; it is the string that appears on the
// voting machine, which is the only name every voter sees.
//
// WHY OPEN DATA AND NOT DIVULGACAND. DivulgaCand is the natural home for this
// and it serves the photographs, but its public API returns ZERO candidates for
// every office and state as of 2026-08-16 — verified against
// `/rest/v1/candidatura/listar/2026/{UF}/6259/{cargo}/candidatos` for president,
// governor and senator across several states, all `candidatos: []`. The
// divulgation simply is not live yet, days after registration closed. The Open
// Data register IS live (rebuilt 2026-08-16 11:34 UTC), so the names come from
// there and the photographs wait. See `fetch-fotos.mjs` for that half.
//
// Usage: node scripts/fetch-candidaturas.mjs [--out data/candidaturas.ndjson]
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const ZIP_URL = "https://cdn.tse.jus.br/estatistica/sead/odsele/consulta_cand/consulta_cand_2026.zip";

/** The three offices this site covers. Deputies are registered too and ignored. */
const CARGOS = new Set(["PRESIDENTE", "GOVERNADOR", "SENADOR"]);

/**
 * TSE ships these CSVs in LATIN-1, not UTF-8.
 *
 * Read as UTF-8 they do not throw — they silently produce "TIÃO BOCALOM" as
 * "TI?O BOCALOM", and a name that is 99% right is worse than one that fails,
 * because it matches nothing and looks like a data problem rather than an
 * encoding one. Read the bytes and decode explicitly.
 */
function readLatin1(file) {
  return Buffer.from(fs.readFileSync(file)).toString("latin1");
}

/** `;`-separated, every field quoted. Quotes never contain separators in this file. */
function parseRows(text) {
  const lines = text.split("\n").filter((l) => l.trim().length);
  const split = (l) => l.split(";").map((s) => s.replace(/^"|"$/g, ""));
  const header = split(lines[0]);
  const idx = Object.fromEntries(header.map((h, i) => [h, i]));
  return { idx, rows: lines.slice(1).map(split) };
}

/**
 * Ballot names are registered in CAPITALS; the site does not shout.
 *
 * Lower-casing wholesale would produce "tião bocalom", so this title-cases and
 * then leaves the small connective words alone — "DA SILVA" → "da Silva" — the
 * way Portuguese actually writes a name. Party acronyms are NOT run through
 * this; they belong in caps and come from their own field.
 */
const MINUSCULAS = new Set(["da", "de", "do", "das", "dos", "e", "di", "du", "d'"]);
export function titleCase(s) {
  return s
    .toLocaleLowerCase("pt-BR")
    .split(/\s+/)
    .map((w, i) => {
      if (i > 0 && MINUSCULAS.has(w)) return w;
      // "D'ÁVILA" and hyphenated names keep their internal capitals.
      return w.replace(/(^|[-'])(\p{L})/gu, (_, sep, ch) => sep + ch.toLocaleUpperCase("pt-BR"));
    })
    .join(" ");
}

async function run(dir, zip, out) {
  const res = await fetch(ZIP_URL, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; PlacarDasPesquisas/1.0)" },
    signal: AbortSignal.timeout(180_000),
  });
  if (!res.ok) throw new Error(`TSE HTTP ${res.status} para ${ZIP_URL}`);
  const lastMod = res.headers.get("last-modified");
  fs.writeFileSync(zip, Buffer.from(await res.arrayBuffer()));
  console.log(`  ${(fs.statSync(zip).size / 1e6).toFixed(2)} MB · atualizado em ${lastMod ?? "?"}`);

  execFileSync("unzip", ["-o", "-q", zip, "-d", dir]);

  const csvs = fs.readdirSync(dir).filter((f) => /^consulta_cand_2026_.+\.csv$/i.test(f));
  // BRASIL is the national aggregate of every per-UF file; reading both would
  // double every candidate. The per-UF files plus BR (which holds the
  // presidential race) are the complete, non-overlapping set.
  const usar = csvs.filter((f) => !/_BRASIL\.csv$/i.test(f));
  console.log(`lendo ${usar.length} arquivos (BRASIL ignorado: é o agregado dos demais)`);

  const seen = new Map();
  let lidas = 0;
  for (const f of usar) {
    const { idx, rows } = parseRows(readLatin1(path.join(dir, f)));
    for (const r of rows) {
      lidas++;
      const cargo = r[idx.DS_CARGO];
      if (!CARGOS.has(cargo)) continue;
      if (r[idx.NR_TURNO] !== "1") continue; // o registro é do 1º turno
      const sq = r[idx.SQ_CANDIDATO];
      if (!sq || seen.has(sq)) continue;
      seen.set(sq, {
        sq_candidato: sq,
        cd_eleicao: r[idx.CD_ELEICAO],
        ano: Number(r[idx.ANO_ELEICAO]),
        cargo: cargo === "PRESIDENTE" ? "presidente" : cargo === "GOVERNADOR" ? "governador" : "senador",
        uf: cargo === "PRESIDENTE" ? null : r[idx.SG_UF],
        numero: r[idx.NR_CANDIDATO] || null,
        // The ballot name, as registered, and a display form. BOTH are kept:
        // the raw string is the record, the title-cased one is a rendering, and
        // conflating them would mean re-deriving the record from a rendering.
        nome_urna_raw: r[idx.NM_URNA_CANDIDATO],
        nome_urna: titleCase(r[idx.NM_URNA_CANDIDATO]),
        nome_completo: titleCase(r[idx.NM_CANDIDATO]),
        partido: r[idx.SG_PARTIDO] || null,
        // "#NE" means the court has not yet judged the registration. Days after
        // the deadline that is every row, so this CANNOT be used as a filter
        // yet — it is recorded and left for the consumer to weigh.
        situacao: r[idx.DS_SITUACAO_CANDIDATURA] || null,
      });
    }
  }

  const registros = [...seen.values()].sort(
    (a, b) =>
      a.cargo.localeCompare(b.cargo) ||
      String(a.uf ?? "").localeCompare(String(b.uf ?? "")) ||
      a.nome_urna_raw.localeCompare(b.nome_urna_raw, "pt-BR") ||
      a.sq_candidato.localeCompare(b.sq_candidato),
  );

  if (registros.length < 300) {
    // A register that suddenly shrinks is a broken download, not an election
    // with no candidates. Refuse rather than overwrite a good file with a bad one.
    throw new Error(`só ${registros.length} candidaturas — parece coleta quebrada, nada foi gravado`);
  }

  fs.writeFileSync(out, registros.map((r) => JSON.stringify(r)).join("\n") + "\n");
  fs.rmSync(dir, { recursive: true, force: true });

  const porCargo = {};
  for (const r of registros) porCargo[r.cargo] = (porCargo[r.cargo] ?? 0) + 1;
  const semSituacao = registros.filter((r) => !r.situacao || r.situacao === "#NE").length;
  console.log(`\n${registros.length} candidaturas → ${path.relative(ROOT, out)}`);
  console.log(`  ${JSON.stringify(porCargo)}  ·  ${lidas} linhas lidas no total`);
  console.log(`  sem situação julgada ("#NE"): ${semSituacao} — o registro fecha antes do julgamento`);
  return registros;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run(fs.mkdtempSync(path.join(os.tmpdir(), "tse-cand-")),
      path.join(os.tmpdir(), `cand-${Date.now()}.zip`),
      path.join(ROOT, process.argv.find((a) => a.startsWith("--out="))?.split("=")[1] ?? "data/candidaturas.ndjson"))
    .catch((e) => { console.error(`ERRO: ${e.message}`); process.exit(1); });
}

export { run as fetchCandidaturas };
