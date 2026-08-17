// O registro de candidaturas do TSE, lido e com os re-registros colapsados.
//
// Este módulo NÃO é código novo: é o agrupamento que `match-ballot-names.mjs`
// já fazia, movido para cá quando `lib/people.mjs` passou a precisar do MESMO
// colapso para saber quantas pessoas existem. Copiar a chave de colapso para o
// segundo consumidor seria a segunda instância do defeito que CONVENTIONS §5
// registra — este repositório já pagou por duas cópias de `norm()`, que
// divergiram em pontuação e mataram 9 de 370 entradas em silêncio.
//
// A direção da dependência importa: um módulo de `lib/` não pode importar de um
// script de entrada (que tem `main()` e efeitos), então a regra mora aqui e o
// casador importa daqui.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normNome } from "./nomes.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
export const CANDIDATURAS = path.join(ROOT, "data", "candidaturas.ndjson");

export const contestOf = (cargo, uf) => `${cargo}:${uf ?? "BR"}`;

/**
 * `SQ_CANDIDATO` ordered as a number, not as text.
 *
 * It is the only ordering the register carries — there is no date on a
 * candidacy row — so "the most recent registration" can only mean the highest
 * sequential id. The ids are 11 digits today and a plain `>` on the strings
 * agrees with that, but only while every id has the same length: the day one
 * arrives with 12, lexicographic order silently puts "9…" above "10…" and the
 * collapse below starts keeping the WRONG row. Padding costs nothing and
 * removes the trap.
 */
export const maisRecente = (a, b) =>
  a.sq_candidato.padStart(20, "0") > b.sq_candidato.padStart(20, "0") ? a : b;

/** A ordem estável de um `sq`: numérica, não lexicográfica. Ver `maisRecente`. */
export const ordemSq = (sq) => String(sq).padStart(20, "0");

/**
 * A chave que diz "estas duas linhas são a MESMA candidatura, arquivada duas
 * vezes": disputa + nome de urna + número + partido. Ver `colapsarReRegistros`.
 */
export const chaveColapso = (c) =>
  `${contestOf(c.cargo, c.uf)}|${normNome(c.nome_urna_raw)}|${c.numero}|${c.partido}`;

/**
 * O registro com os re-registros do TSE colapsados, em grupos.
 *
 * A MESMA PESSOA APARECE DUAS VEZES. Piauí tem dois casos de uma candidatura
 * arquivada de novo — mesmo nome de urna, mesmo número, mesmo partido, mesmo
 * nome civil, dois `SQ_CANDIDATO`. Deixadas soltas, as duas linhas caem na
 * mesma disputa, o casamento exato acha DUAS candidaturas para um nome
 * pesquisado, e o nome é recusado como ambíguo. Isso é uma regra de homônimo
 * disparando sobre quem não tem homônimo: a disputa inteira perde um mapeamento
 * por um artefato de arquivamento.
 *
 * Então linhas idênticas em disputa + nome de urna + número + partido são UMA
 * candidatura, e o registro mais recente vence. Linhas que diferem em número ou
 * em partido NÃO são colapsadas — ou são duas pessoas reais, ou uma pessoa cujo
 * arquivamento mudou de fato, e nos dois casos a ambiguidade é real e continua
 * recusada. Colapsar só pelo nome é o que reintroduziria o cara-ou-coroa que
 * este casamento existe para recusar.
 *
 * @returns {Map<string, {vencedor: object, membros: object[]}>} por `chaveColapso`
 */
export function colapsarReRegistros(cands) {
  const grupos = new Map();
  for (const c of cands) {
    const chave = chaveColapso(c);
    const g = grupos.get(chave);
    if (!g) grupos.set(chave, { vencedor: c, membros: [c] });
    else { g.vencedor = maisRecente(g.vencedor, c); g.membros.push(c); }
  }
  // Ordem estável dentro do grupo: o `sq` é a única ordenação que a candidatura
  // carrega, e a lista vai para `people.ndjson`, que é lido em diff de commit.
  for (const g of grupos.values()) {
    g.membros.sort((a, b) => ordemSq(a.sq_candidato).localeCompare(ordemSq(b.sq_candidato)));
  }
  return grupos;
}

/**
 * O registro indexado por disputa, com os re-registros já colapsados — uma
 * linha por candidatura real.
 */
export function agruparPorDisputa(cands) {
  const byContest = new Map();
  for (const { vencedor } of colapsarReRegistros(cands).values()) {
    const contest = contestOf(vencedor.cargo, vencedor.uf);
    if (!byContest.has(contest)) byContest.set(contest, []);
    byContest.get(contest).push(vencedor);
  }
  // Stable order so `ambiguos` reports the same list every run: the report is
  // read by a human deciding cases, and a list that reshuffles between runs
  // looks like the data moved when nothing did.
  for (const lista of byContest.values()) {
    lista.sort((a, b) => ordemSq(a.sq_candidato).localeCompare(ordemSq(b.sq_candidato)));
  }
  return byContest;
}

let CACHE = null;

/**
 * O registro cru. Devolve `[]` quando o arquivo não existe — um clone só o tem
 * depois de `fetch-candidaturas.mjs`, e falhar aqui reprovaria a rodada por um
 * motivo que nada tem a ver com identidade. A AUSÊNCIA NÃO É SILENCIOSA: quem
 * consome (`lib/people.mjs`, `validate-store.mjs`) reporta que o registro não
 * estava disponível em vez de tratar zero candidaturas como resposta.
 */
export function lerCandidaturas({ file = CANDIDATURAS } = {}) {
  if (CACHE?.file === file) return CACHE.rows;
  if (!fs.existsSync(file)) { CACHE = { file, rows: [] }; return CACHE.rows; }
  const rows = fs.readFileSync(file, "utf-8").trim().split("\n")
    .filter((l) => l.trim()).map((l) => JSON.parse(l));
  CACHE = { file, rows };
  return rows;
}

/** Todos os `SQ_CANDIDATO` que o registro conhece — o domínio que valida uma pessoa. */
export function sqsRegistrados(opts) {
  return new Set(lerCandidaturas(opts).map((c) => String(c.sq_candidato)));
}

/** Recarrega o registro (testes que reescrevem o arquivo no disco). */
export function reload() { CACHE = null; }
