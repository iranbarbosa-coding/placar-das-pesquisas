// Candidate identity: the curated table, applied.
//
// Replaces the guessing that `sameCandidate()` does with a decided answer.
// `data/candidate-aliases.json` records, per contest, which ballot names are
// one person and which are not — each decided against public record (article
// identity, sourced research, or a creator ruling) rather than by string
// similarity. See REVISAO_CANDIDATOS.md for the evidence dossier.
//
// TWO DIRECTIONS, and the second matters as much as the first:
//   · `canonicalCandidate` folds a group's spellings onto one display name.
//   · `areDistinct` answers "these two were CHECKED and are different people",
//     which is what stops the fuzzy matcher from merging "Ciro Nogueira" into
//     "Ciro", or any Bolsonaro into any other Bolsonaro.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normNome } from "./nomes.mjs";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "candidate-aliases.json");
const RULINGS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "candidate-rulings.json");
const BALLOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "ballot-names.json");

// Shared with `match-ballot-names.mjs`, which WRITES the keys this file READS.
// When the two had a copy each they disagreed on punctuation and every ballot
// name containing a dot resolved to nothing. See `lib/nomes.mjs`.
const norm = normNome;

let TABLE = null;
function table() {
  if (TABLE) return TABLE;
  let spec = { groups: [], distinct: [] };
  try { spec = JSON.parse(fs.readFileSync(FILE, "utf-8")); } catch { /* table is optional */ }
  const display = new Map();   // `${contest}|${norm(name)}` -> display name
  const distinct = new Set();  // `${contest}|${norm(a)}|${norm(b)}` (sorted)
  // POR QUE O NOME EXIBIDO É O QUE É — gravado, não deduzido depois.
  //
  // A precedência abaixo (grupo curado → ruling → nome de urna → ruling) é
  // real e é decidida aqui, mas até `people.ndjson` existir ela ficava
  // implícita numa ordem de escritas: o mapa guardava só a resposta, e quem
  // lesse `candidates.ndjson` não tinha como saber se "Zema" veio do registro
  // do TSE, de uma decisão do criador ou da grafia mais curta observada. Como o
  // `candidate_id` acompanhava esse nome, a origem do nome era também a origem
  // do id — e ninguém conseguia auditar isso. Agora cada escrita registra a sua
  // camada, e `people.display_from` publica a resposta.
  const origem = new Map();    // `${contest}|${norm(name)}` -> qual camada decidiu
  const ballot = new Map();    // `${contest}|${norm(name)}` -> candidatura do TSE
  const decide = (chave, nome, camada) => { display.set(chave, nome); origem.set(chave, camada); };
  for (const g of spec.groups ?? []) {
    for (const m of g.members ?? []) decide(`${g.contest}|${norm(m)}`, g.display, "grupo curado");
  }
  // Rulings are applied HERE, at consume time, not only when the table is
  // regenerated. The generator discovers pairs by scanning the data — and once
  // a merge is applied the variants stop appearing in it, so the scan can no
  // longer rediscover a decision already made. The decision is the durable
  // artifact; the generated table is a materialisation of it.
  try {
    const ruled = JSON.parse(fs.readFileSync(RULINGS, "utf-8"));
    for (const r of ruled.rulings ?? []) {
      if (r.verdict !== "MESMA" || !r.canonical) continue;
      for (const n of r.names ?? []) decide(`${r.contest}|${norm(n)}`, r.canonical, "ruling");
    }
  } catch { /* rulings are optional */ }
  // THE OFFICIAL BALLOT NAME, applied under the creator's own rulings.
  //
  // (Iran, 2026-08-16) The nome de urna is what the site normalises on: it is
  // the string on the voting machine, not a judgement about what to call
  // someone. `data/ballot-names.json` holds only the unambiguous matches —
  // exact, or containment onto exactly one candidacy — and everything else
  // keeps whatever name it has today.
  //
  // ORDER MATTERS, and this sits BELOW the rulings written after it. A ruling
  // is a decision about WHO SOMEONE IS ("these two names are one person",
  // "these two are not"), which no register can overrule; the ballot name only
  // decides WHAT TO CALL a person already identified. Putting the register on
  // top would let a name match quietly undo a hand-decided identity.
  const porUrna = new Map();   // `${contest}|${norm(nome_urna)}` -> Set<sq>
  const urnaInfo = new Map();  // `${chaveUrna}|${sq}` -> candidatura
  try {
    const registro = JSON.parse(fs.readFileSync(BALLOT, "utf-8"));
    for (const [contest, nomes] of Object.entries(registro.mapping ?? {})) {
      for (const [key, info] of Object.entries(nomes)) {
        // A CANDIDATURA É GRAVADA MESMO QUANDO O NOME NÃO MUDA.
        //
        // `sq_candidato` é a semente do `person_id` de quem se registrou, e ele
        // não pode depender de a linha ter ou não mudado de nome: um nome que já
        // estava escrito como o nome de urna não produz renomeação nenhuma e
        // ainda assim identifica a pessoa. Guardar só o rename deixaria essas
        // pessoas sem `sq` e as cunharia como não-registradas.
        ballot.set(`${contest}|${key}`, info);
        // ⚠ O REGISTRO TEM DE SER ALCANÇÁVEL PELO NOME QUE ELE PRÓPRIO IMPÕE.
        //
        // As chaves deste mapa são as grafias PUBLICADAS de UMA rodada (saem de
        // `data/nomes-crus.json`), e ele é consultado também com o nome já
        // canonicalizado. Quando a canonicalização adota o nome de urna, o nome
        // resultante muitas vezes NÃO está entre as grafias publicadas e a
        // consulta erra: em `governador:AL` o instituto publicou
        // "João Henrique Caldas", o registro renomeia para "Jhc", e
        // `ballotCandidacy("Jhc", "governador:AL")` devolvia `null` — o registro
        // ficava inalcançável pelo único nome que o site exibe, e a linha caía
        // numa pessoa SEM registro ao lado de uma pessoa registrada idêntica.
        //
        // Indexar o próprio `nome_urna` fecha a classe inteira, e sem inventar
        // nada: a chave nova aponta para a MESMA candidatura que a entrada já
        // afirma. Nunca sobrescreve uma chave existente — uma grafia publicada
        // que case diretamente continua mandando, e assim esta linha não pode
        // roubar um nome de outra pessoa da mesma disputa.
        if (info?.nome_urna) {
          decide(`${contest}|${key}`, info.nome_urna, "nome_urna");
          const chaveUrna = `${contest}|${norm(info.nome_urna)}`;
          if (!porUrna.has(chaveUrna)) porUrna.set(chaveUrna, new Set());
          porUrna.get(chaveUrna).add(info.sq_candidato);
          urnaInfo.set(`${chaveUrna}|${info.sq_candidato}`, info);
        }
      }
    }
    // Fora do laço DE PROPÓSITO: dentro dele, "só se ainda não existe" faria a
    // resposta depender da ORDEM em que as entradas aparecem no JSON, que é o
    // defeito-família deste repositório (CONVENTIONS §8). Aqui a grafia
    // publicada sempre vence a chave derivada, seja qual for a ordem — e um
    // nome de urna que aponte para DUAS candidaturas na mesma disputa é
    // ambíguo e não decide nada, em vez de sortear (CONVENTIONS §4).
    for (const [chaveUrna, sqs] of porUrna) {
      if (ballot.has(chaveUrna) || sqs.size !== 1) continue;
      ballot.set(chaveUrna, urnaInfo.get(`${chaveUrna}|${[...sqs][0]}`));
    }
  } catch { /* the register is optional; the site predates it */ }

  // Rulings again, LAST, so a creator decision outranks the register.
  try {
    const ruled = JSON.parse(fs.readFileSync(RULINGS, "utf-8"));
    for (const r of ruled.rulings ?? []) {
      if (r.verdict !== "MESMA" || !r.canonical) continue;
      for (const n of r.names ?? []) decide(`${r.contest}|${norm(n)}`, r.canonical, "ruling");
    }
  } catch { /* rulings are optional */ }

  for (const d of spec.distinct ?? []) {
    const [a, b] = (d.names ?? []).map(norm).sort();
    if (a && b) distinct.add(`${d.contest}|${a}|${b}`);
  }
  TABLE = { display, origem, ballot, distinct, groups: spec.groups ?? [] };
  return TABLE;
}

/**
 * The name this candidate should be recorded under in `contest`.
 * Unknown names pass through untouched — the table covers the pairs that were
 * flagged and checked, not the whole roster.
 */
export function canonicalCandidate(name, contest) {
  if (!name) return name;
  return table().display.get(`${contest}|${norm(name)}`) ?? name;
}

/**
 * QUAL CAMADA decidiu o nome exibido de `name` em `contest`.
 *
 * `null` quando nenhuma decidiu — aí o nome que sai de `canonicalCandidate` é o
 * próprio nome de entrada, e quem escolheu a grafia foi `canonicalizeCandidates`
 * (a mais curta vista ao menos duas vezes no cluster). Quem consome traduz esse
 * `null` para "mais curta observada"; aqui ele é honesto: esta tabela não opinou.
 */
export function displayOrigin(name, contest) {
  if (!name) return null;
  return table().origem.get(`${contest}|${norm(name)}`) ?? null;
}

/**
 * A candidatura do TSE que `data/ballot-names.json` casou com este nome, ou
 * `null`. É por aqui que uma linha de pesquisa alcança um `SQ_CANDIDATO` — a
 * semente do `person_id` de quem se registrou.
 */
export function ballotCandidacy(name, contest) {
  if (!name) return null;
  return table().ballot.get(`${contest}|${norm(name)}`) ?? null;
}

/** Were these two names CHECKED and found to be different people? */
export function areDistinct(a, b, contest) {
  const [x, y] = [norm(a), norm(b)].sort();
  return table().distinct.has(`${contest}|${x}|${y}`);
}

export function groups() { return table().groups; }

/** Reset for tests that rewrite the table on disk. */
export function reload() { TABLE = null; }
