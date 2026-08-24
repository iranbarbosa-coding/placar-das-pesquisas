// A REJEIÇÃO — tabela SEPARADA, montada da fonte curada e SÓ dela.
//
// A rejeição ("em quem NÃO votaria de jeito nenhum") é uma estatística
// DIFERENTE da intenção de voto: não se converte para votos válidos, e uma
// pesquisa de menção única não precisa somar 100 (muita gente não rejeita
// ninguém). Por isso ela não pode entrar em `PollDataset.polls` — misturá-la ali
// contaminaria as médias de voto. Este módulo lê `data/rejection.json` (a
// fonte-de-verdade curada), aplica a MESMA barra probatória de `add_poll`
// (`source`/`evidence`/`verified_at` obrigatórios, RECUSA sem eles), cunha ids
// no espaço `rej-…` que não colide com nenhum id de voto, canonicaliza os nomes
// pela MESMA `canonicalizeCandidates` que o coletor usa (para casarem com o
// elenco de voto), e devolve uma lista de rejeição. NUNCA toca em `polls`.
//
// A projeção construída vai para `data/rejection.ndjson` (escrita pela coleta,
// pelo DESTINO — intocável sob --ensaio, como o store de voto).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import crypto from "node:crypto";
import { canonicalizeCandidates } from "./canonicalize.mjs";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const ARQUIVO = path.join(RAIZ, "data", "rejection.json");

// A barra probatória, a MESMA de `add_poll` em `repairs.mjs`: uma rejeição sem
// fonte primária citada é uma invenção com carimbo de curadoria, e ela entra na
// média de rejeição de uma disputa.
const CITACAO = ["source", "evidence", "verified_at"];

/** A pesquisa de rejeição CASA a própria cláusula? Espelha `matches()` de
 *  `repairs.mjs`: sem isto, "a cláusula não descreve o que seria inserido" e a
 *  idempotência vira coincidência. */
function casaClausula(p, m = {}) {
  if (m.pollster && (p.pollster ?? "").toLowerCase() !== m.pollster.toLowerCase()) return false;
  if (m.race && p.race !== m.race) return false;
  if (m.round && p.round !== m.round) return false;
  if (m.state !== undefined && p.state !== m.state) return false;
  if (m.fieldwork_end && p.fieldwork_end !== m.fieldwork_end) return false;
  return true;
}

/** O id de rejeição, cunhado da mesma chave determinística do coletor
 *  (`pollId`), com o cenário `rejeição` que garante que o hash NUNCA coincida
 *  com o de um cenário de voto da mesma operação de campo, e prefixo `rej-`. */
function rejectionId(p) {
  const key = [
    p.pollster?.toLowerCase().trim(),
    p.race,
    p.state ?? "BR",
    p.round,
    p.fieldwork_end ?? p.published_date ?? "",
    "rejeição",
  ].join("|");
  return `rej-${crypto.createHash("sha1").update(key).digest("hex").slice(0, 12)}`;
}

/**
 * A pesquisa de rejeição montada do bloco `add_rejection` e SÓ dele — campo a
 * campo, nunca `{...}`, pelo mesmo motivo de `montarPesquisaCurada`: um
 * espalhamento carregaria qualquer chave que um curador escrevesse por engano.
 */
function montarRejeicao(entrada) {
  const a = entrada.add_rejection ?? {};
  const p = {
    id: "",
    source: a.source ?? entrada.source,
    source_url: a.source_url ?? entrada.source,
    race: a.race ?? null,
    state: a.state ?? null,
    round: a.round ?? null,
    pollster: a.pollster ?? null,
    contractor: a.contractor ?? null,
    fieldwork_start: a.fieldwork_start ?? null,
    fieldwork_end: a.fieldwork_end ?? null,
    published_date: a.published_date ?? null,
    sample_size: a.sample_size ?? null,
    margin_of_error: a.margin_of_error ?? null,
    tse_registration: a.tse_registration ?? null,
    multi_mention: entrada.multi_mention === true,
    results: (a.results ?? []).map((r) => ({
      candidate: r.candidate,
      party: r.party ?? null,
      pct_bruta: r.pct_bruta,
      conhece_pct: r.conhece_pct ?? null,
    })),
    evidence: entrada.evidence,
    verified_at: entrada.verified_at,
  };
  p.id = rejectionId(p);
  return p;
}

/**
 * Canonicaliza os nomes de candidato PELA MESMA regra do coletor, para que a
 * rejeição case com o elenco de voto. `canonicalizeCandidates` opera sobre
 * objetos com `.results[].candidate`/`.pct` agrupados por `race:state`; montamos
 * um shim com `pct = pct_bruta`, deixamos a regra reescrever `candidate`/`party`
 * e trazemos de volta pela posição (os nomes de rejeição são únicos por estado,
 * então nada colapsa). NÃO se remonta a regra aqui — usa-se a resposta que o
 * coletor já dá (CONVENTIONS §5).
 */
function canonicalizarNomes(rejeicoes) {
  const shims = rejeicoes.map((p) => ({
    race: p.race,
    state: p.state,
    results: p.results.map((r) => ({ candidate: r.candidate, party: r.party, pct: r.pct_bruta })),
  }));
  canonicalizeCandidates(shims);
  for (let i = 0; i < rejeicoes.length; i++) {
    // Casa PELA POSIÇÃO (o shim é montado 1:1 a partir de `results`, e
    // `canonicalizeCandidates` só reescreve nome/partido — não reordena nem
    // remove linhas). Casar por `pct_bruta` COLAPSA empates: numa pesquisa
    // nacional vários candidatos de nicho ficam em 0,1% e um Map por valor
    // guarda só o último, reetiquetando todos os empatados com um único nome.
    const canon = shims[i].results;
    rejeicoes[i].results.forEach((r, k) => {
      const c = canon[k];
      if (c) { r.candidate = c.candidate; if (c.party) r.party = c.party; }
    });
  }
  return rejeicoes;
}

/**
 * Lê a fonte curada e devolve `{ rejections, warnings }`.
 *
 * RECUSA (com aviso legível, sem derrubar a coleta) toda entrada sem citação
 * primária ou cuja pesquisa montada não satisfaça a própria cláusula `match`.
 * NUNCA toca em `polls` — este módulo não conhece a lista de voto.
 */
export function loadRejection({ file = ARQUIVO } = {}) {
  const warnings = [];
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    return { rejections: [], warnings: [`data/rejection.json ausente ou ilegível — nenhuma rejeição carregada`] };
  }

  const rejections = [];
  for (const entrada of spec.add_rejection ?? []) {
    const rotulo = entrada.match
      ? `${entrada.match.pollster ?? "?"} ${entrada.match.race ?? "?"}/${entrada.match.state ?? "BR"} ${entrada.match.fieldwork_end ?? "?"}`
      : JSON.stringify(entrada.match ?? {});

    // A BARRA PROBATÓRIA PRIMEIRO. Nada mais importa se esta falha.
    const semCitacao = CITACAO.filter((f) => !String(entrada[f] ?? "").trim());
    if (semCitacao.length) {
      warnings.push(`add_rejection ${rotulo} RECUSADO — falta ${semCitacao.join(", ")}; nenhuma rejeição entra sem fonte primária citada`);
      continue;
    }

    const nova = montarRejeicao(entrada);
    if (!casaClausula(nova, entrada.match ?? {})) {
      warnings.push(`add_rejection ${rotulo} RECUSADO — a pesquisa montada não satisfaz a própria cláusula match`);
      continue;
    }
    if (!nova.results.length) {
      warnings.push(`add_rejection ${rotulo} RECUSADO — sem linhas de candidato`);
      continue;
    }
    rejections.push(nova);
  }

  canonicalizarNomes(rejections);
  return { rejections, warnings };
}

// ── A PROJEÇÃO DETERMINÍSTICA (data/rejection.ndjson) ───────────────────────
//
// Ordem de campo explícita e ordenação estável, pelo mesmo motivo de
// `ndjson.mjs`: a coleta comita este arquivo, e um registro que serializa
// diferente entre duas rodadas de dados idênticos vira um diff gigante.
const round1 = (x) => (x == null ? null : Math.round(x * 10) / 10);

function serializar(p) {
  return JSON.stringify({
    id: p.id,
    source: p.source,
    source_url: p.source_url,
    race: p.race,
    state: p.state,
    round: p.round,
    pollster: p.pollster,
    contractor: p.contractor ?? null,
    fieldwork_start: p.fieldwork_start ?? null,
    fieldwork_end: p.fieldwork_end ?? null,
    published_date: p.published_date ?? null,
    sample_size: p.sample_size ?? null,
    margin_of_error: p.margin_of_error ?? null,
    tse_registration: p.tse_registration ?? null,
    multi_mention: p.multi_mention === true,
    results: p.results.map((r) => ({
      candidate: r.candidate,
      party: r.party ?? null,
      pct_bruta: round1(r.pct_bruta),
      conhece_pct: round1(r.conhece_pct),
    })),
    evidence: p.evidence,
    verified_at: p.verified_at,
  });
}

/** Grava a projeção de rejeição em `<dir>/rejection.ndjson`. Ordenada por
 *  estado, data e id — determinística entre rodadas. */
export function writeRejectionProjection(dir, rejections) {
  const ordenadas = [...rejections].sort(
    (a, b) =>
      (a.state ?? "").localeCompare(b.state ?? "") ||
      (a.fieldwork_end ?? "").localeCompare(b.fieldwork_end ?? "") ||
      a.id.localeCompare(b.id),
  );
  const texto = ordenadas.map(serializar).join("\n") + (ordenadas.length ? "\n" : "");
  fs.writeFileSync(path.join(dir, "rejection.ndjson"), texto);
  return ordenadas.length;
}
