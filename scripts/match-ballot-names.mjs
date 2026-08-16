#!/usr/bin/env node
// Map the names institutes publish onto the OFFICIAL BALLOT NAME (nome de urna).
//
// RULING (Iran, 2026-08-16): the ballot name is what the site normalises on. It
// is not an opinion about what to call someone — it is the string that appears
// on the voting machine, the only name every voter sees. Registration closed on
// 15/08/2026, so for the first time there is an authoritative list to normalise
// against instead of a precedence ladder applied by hand.
//
// WHAT IS AND IS NOT MAPPED (Iran, 2026-08-16):
//   · matched EXACTLY, or by containment onto exactly ONE candidacy → renamed
//   · everything else → LEFT AS IT IS TODAY. Not guessed, not dropped.
// Roughly 311 of 714 polled names are renamed and 403 keep their current form.
//
// AMBIGUITY IS REFUSED, NEVER RESOLVED. If a polled name is compatible with two
// candidacies in the same contest, it is skipped and reported. This is the rule
// that keeps "Ciro" from being folded into Ciro Gomes or Ciro Nogueira by a
// coin-toss — the exact failure that cost this project 63 hand-decided pairs and
// a session of repair after the token matcher merged Flávio into Jair Bolsonaro.
//
// A polled name with NO candidacy is also left alone. Polls from 2023–2025
// legitimately tested people who never registered; that is a fact about the
// poll, not an error to correct.
//
// Usage: node scripts/match-ballot-names.mjs [--out data/ballot-names.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CANDIDATURAS = path.join(ROOT, "data", "candidaturas.ndjson");
const CRUS = path.join(ROOT, "data", "nomes-crus.json");

const norm = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/**
 * Tokens worth matching on. Short words are dropped because "de", "da" and "do"
 * are in half of Brazilian names and would make everything look compatible.
 */
const tokens = (s) => norm(s).split(" ").filter((w) => w.length > 2);

/**
 * Is one name a token-subset of the other?
 *
 * "Ricardo Salles" ⊃ "Salles" and "Romeu Zema" ⊃ "Zema" — the institute writes
 * the fuller name, the ballot carries the short one, and every token of the
 * shorter appears in the longer. Deliberately NOT a similarity score: a
 * threshold invites tuning until the answer looks right, and this decides who
 * a number belongs to.
 */
function subset(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return false;
  const [small, large] = A.size <= B.size ? [A, B] : [B, A];
  for (const t of small) if (!large.has(t)) return false;
  return true;
}

const contestOf = (cargo, uf) => `${cargo}:${uf ?? "BR"}`;

function main() {
  const cands = fs.readFileSync(CANDIDATURAS, "utf-8").trim().split("\n").map((l) => JSON.parse(l));
  // The names exactly as the institutes published them, dumped by `scrape.mjs`
  // before it canonicalises anything. Reading the canonicalised output instead
  // makes this script eat its own tail — see the note at that dump site.
  const polled = new Map();
  for (const [contest, nomes] of Object.entries(JSON.parse(fs.readFileSync(CRUS, "utf-8")))) {
    polled.set(contest, new Set(nomes));
  }

  const mapping = {};
  const stats = { exato: 0, contencao: 0, ambiguo: 0, sem: 0 };
  const ambiguos = [];

  for (const [contest, nomes] of polled) {
    const lista = byContest.get(contest) ?? [];
    for (const nome of nomes) {
      const exato = lista.filter((c) => norm(c.nome_urna_raw) === norm(nome));
      if (exato.length === 1) {
        add(mapping, contest, nome, exato[0], "exato");
        stats.exato++;
        continue;
      }
      // More than one candidacy registered under the identical ballot name is
      // possible (namesakes) and is NOT resolvable here.
      if (exato.length > 1) {
        stats.ambiguo++;
        ambiguos.push({ contest, nome, candidatos: exato.map((c) => c.nome_urna_raw), motivo: "nome de urna repetido" });
        continue;
      }
      const compat = lista.filter((c) => subset(c.nome_urna_raw, nome) || subset(c.nome_completo, nome));
      if (compat.length === 1) {
        add(mapping, contest, nome, compat[0], "contencao");
        stats.contencao++;
      } else if (compat.length > 1) {
        stats.ambiguo++;
        ambiguos.push({ contest, nome, candidatos: compat.map((c) => c.nome_urna_raw), motivo: "compatível com mais de uma candidatura" });
      } else {
        stats.sem++;
      }
    }
  }

  const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
  const out = path.join(ROOT, outArg ?? "data/ballot-names.json");
  const payload = {
    note:
      "Nome de urna oficial do TSE por disputa, aplicado ao nome que o instituto publicou. " +
      "Gerado por scripts/match-ballot-names.mjs a partir de data/candidaturas.ndjson — não editar à mão. " +
      "Só entram aqui os casos EXATOS e os de contenção com uma única candidatura compatível; " +
      "ambíguos e sem candidatura ficam de fora e mantêm o nome atual.",
    gerado_de: "consulta_cand_2026 (TSE Dados Abertos)",
    stats,
    ambiguos,
    mapping,
  };
  fs.writeFileSync(out, JSON.stringify(payload, null, 1) + "\n");

  console.log(`nomes de urna mapeados → ${path.relative(ROOT, out)}`);
  console.log(`  exatos: ${stats.exato} · por contenção: ${stats.contencao} · ` +
    `AMBÍGUOS (não mapeados): ${stats.ambiguo} · sem candidatura (mantidos): ${stats.sem}`);
  for (const a of ambiguos.slice(0, 10)) {
    console.log(`   ambíguo — ${a.contest} "${a.nome}" ~ ${a.candidatos.join(" / ")} (${a.motivo})`);
  }
}

/** How many diacritics a string carries — the tiebreak for the case below. */
const acentos = (s) => (s.normalize("NFD").match(/[\u0300-\u036f]/g) ?? []).length;

/**
 * The register's diacritics are not reliable, and dropping ours would look like
 * a typo on every page.
 *
 * TSE writes "PABLO MARÇAL" and "VETERINÁRIO WILSON GRASSI" with their accents
 * and "FLAVIO BOLSONARO" and "CLARIANA BARAO" without — 29 of 521 candidacies
 * carry a ballot name stripped of accents the name actually has. Publishing
 * "Flavio Bolsonaro" is not adopting the official name, it is misspelling it.
 *
 * So when the polled name and the ballot name are THE SAME NAME apart from
 * diacritics, the better-accented spelling wins. This is not overriding the
 * register — the string is identical under accent folding, which is exactly why
 * it is safe. When the two differ as names ("Allyson Bezerra" vs "Allyson"),
 * the ballot name wins outright, accents or not.
 */
function melhorGrafia(nomePesquisa, nomeUrna) {
  if (norm(nomePesquisa) !== norm(nomeUrna)) return nomeUrna;
  return acentos(nomePesquisa) > acentos(nomeUrna) ? nomePesquisa : nomeUrna;
}

function add(mapping, contest, nome, cand, how) {
  mapping[contest] ??= {};
  mapping[contest][norm(nome)] = {
    nome_urna: melhorGrafia(nome, cand.nome_urna),
    sq_candidato: cand.sq_candidato,
    partido: cand.partido,
    numero: cand.numero,
    origem: how,
  };
}

if (import.meta.url === `file://${process.argv[1]}`) main();
