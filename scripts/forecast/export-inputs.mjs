#!/usr/bin/env node
// EXPORTADOR DA PREVISÃO — banco de pesquisas → conjunto de entrada do modelo.
//
// A camada de previsão (forecast/, Python) NÃO lê o store nem reimplementa regra
// do site. Este script projeta as pesquisas como o site as vê e aplica, com o
// código do próprio site, cada regra que já decide o que é uma pesquisa válida:
//
//   · `incomplete` e `municipal` — carimbados pela projeção (store.ts/project.mjs);
//   · `averageable` (src/lib/senado.ts) — Senado só com pergunta de dois votos;
//   · `toBasis(p, "validos")` (src/lib/validos.ts) — votos válidos, POR PESQUISA;
//   · `senadoEmValidos` (src/lib/acerto.ts) — Senado na base do `pvap` do TSE;
//   · `computeAverage` (src/lib/average.ts) — a média publicada, como BASE de
//     comparação no backtest (nunca alterada aqui).
//
// A identidade de candidato é a do store: `candidate_id` por disputa
// (`presidente:BR`, `governador:AC`…), resolvido por `candKey` sobre o canônico
// e os apelidos de `data/candidates.ndjson`. Nome que não resolve sai com
// `candidate_id: null` e o modelo o trata como "demais" — nunca o adivinha.
//
// DISPONIBILIDADE (contra vazamento de informação futura). Cada pesquisa recebe
// `available_from`: a data de divulgação quando o banco a tem; senão o fim de
// campo + `--lag` dias. Com `--as-of`, pesquisas ainda não disponíveis naquela
// data ficam de fora e a média do site é recalculada só com as disponíveis.
// Num VINTAGE (o polls.json de um commit antigo, `--polls <arquivo>`), o próprio
// commit já é o que existia; o filtro por data é uma segunda trava.
//
// Uso:
//   node scripts/forecast/export-inputs.mjs --out <arquivo.json>
//        [--polls data/polls.json] [--as-of AAAA-MM-DD] [--lag 2]
//        [--source-kind current|vintage|reconstructed] [--commit <sha>] [--committed-at <iso>]
import "./ts-hooks.mjs";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const lib = (m) => import(path.join(ROOT, "src", "lib", `${m}.ts`));
const { candKey, computeAverage } = await lib("average");
const { toBasis } = await lib("validos");
const { averageable } = await lib("senado");
const { geographyAverageable } = await lib("universe");
const { senadoEmValidos } = await lib("acerto");

export const EXPORT_SCHEMA_VERSION = 1;

function args(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[++i] : "true";
    out[k] = v;
  }
  return out;
}

function readNdjson(file) {
  if (!fs.existsSync(file)) return [];
  return fs
    .readFileSync(file, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .map((l) => JSON.parse(l));
}

const isoDate = (s) => (typeof s === "string" && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const pollDate = (p) => p.fieldwork_end ?? p.published_date ?? p.fieldwork_start ?? null;
const contestOf = (race, uf) => `${race}:${uf ?? "BR"}`;

/** candKey → candidato, por disputa. Ambiguidade (duas pessoas na mesma chave) não resolve. */
export function buildResolver(candidates) {
  const byContest = new Map();
  for (const c of candidates) {
    if (!byContest.has(c.contest)) byContest.set(c.contest, new Map());
    const m = byContest.get(c.contest);
    for (const name of new Set([c.canonical, ...(c.aliases ?? [])])) {
      if (!name) continue;
      const k = candKey(String(name));
      const prev = m.get(k);
      if (prev && prev.candidate_id !== c.candidate_id) m.set(k, { ambiguous: true });
      else m.set(k, { candidate_id: c.candidate_id, person_id: c.person_id ?? null, canonical: c.canonical });
    }
  }
  return (contest, name) => {
    const hit = byContest.get(contest)?.get(candKey(String(name ?? "")));
    return hit && !hit.ambiguous ? hit : null;
  };
}

function exclusionOf(p) {
  if (p.incomplete) return "incompleta_na_fonte";
  if (!geographyAverageable(p)) return "amostra_municipal";
  if (!averageable(p)) return "senado_sem_dois_votos";
  if (!isoDate(p.fieldwork_end) && !isoDate(p.published_date)) return "sem_data";
  return null;
}

/** Uma pesquisa na base que o TSE publica: válidos (presidente/governador) ou menções (Senado). */
function onResultBasis(p) {
  return p.race === "senador" ? senadoEmValidos(p) : toBasis(p, "validos");
}

export function exportInputs({ polls, candidates, resultados, asOf = null, lag = 2, source, runoffs = null, calendar = null }) {
  const resolve = buildResolver(candidates);
  const rows = [];
  const unresolved = new Map();
  for (const p of polls) {
    const contest = contestOf(p.race, p.state);
    const available_from = isoDate(p.published_date) ?? (isoDate(p.fieldwork_end) ? addDays(p.fieldwork_end, lag) : null);
    const exclusion = exclusionOf(p);
    const conv = exclusion ? p : onResultBasis(p);
    const brutoSum = p.results.reduce((a, r) => a + (r.pct ?? 0), 0) + (p.others_pct ?? 0);
    const results = p.results.map((r, i) => {
      const hit = resolve(contest, r.candidate);
      if (!hit) unresolved.set(`${contest}|${r.candidate}`, (unresolved.get(`${contest}|${r.candidate}`) ?? 0) + 1);
      return {
        candidate_id: hit?.candidate_id ?? null,
        person_id: hit?.person_id ?? null,
        name: r.candidate,
        party: r.party ?? null,
        pct: r.pct,
        pct_result_basis: exclusion ? null : conv.results[i].pct,
      };
    });
    const othersBasis = exclusion
      ? null
      : p.race === "senador"
        ? (p.others_pct ?? 0) * (100 / (brutoSum || 1))
        : (conv.others_pct ?? 0);
    rows.push({
      id: p.id,
      contest,
      race: p.race,
      uf: p.state ?? null,
      round: p.round,
      scenario: p.scenario ?? "",
      pollster: p.pollster,
      pollster_key: String(p.pollster ?? "").toLowerCase().trim(),
      // Mesma amostra = mesmo instituto, UF, fim de campo e tamanho. Usado para
      // não contar duas vezes cenários/perguntas de uma única operação de campo.
      survey_key: [String(p.pollster ?? "").toLowerCase().trim(), p.state ?? "BR", p.fieldwork_end ?? "", p.sample_size ?? ""].join("|"),
      fieldwork_start: isoDate(p.fieldwork_start),
      fieldwork_end: isoDate(p.fieldwork_end),
      published_date: isoDate(p.published_date),
      available_from,
      sample_size: Number.isFinite(p.sample_size) && p.sample_size > 0 ? p.sample_size : null,
      margin_of_error: p.margin_of_error ?? null,
      tse_registration: p.tse_registration ?? null,
      source_url: p.source_url ?? null,
      exclusion,
      results,
      others_result_basis: othersBasis,
      others_pct: p.others_pct ?? null,
      undecided_pct: p.undecided_pct ?? null,
      blank_null_pct: p.blank_null_pct ?? null,
      // Fração da amostra que manifestou voto em candidato (base do tamanho efetivo).
      // Senado: duas menções por eleitor, então a soma é dividida por 200.
      valid_fraction: brutoSum > 0 ? Math.min(1, brutoSum / (p.race === "senador" ? 200 : 100)) : null,
    });
  }

  const available = asOf ? rows.filter((r) => r.available_from && r.available_from <= asOf) : rows;
  const availableIds = new Set(available.map((r) => r.id));
  const pollsAvail = polls.filter((p) => availableIds.has(p.id));

  // A média do site na data — a base de comparação "média das pesquisas".
  const siteAverages = [];
  const keys = new Map();
  for (const p of pollsAvail) {
    if (p.round !== 1) continue;
    keys.set(contestOf(p.race, p.state), { race: p.race, state: p.state ?? null, round: 1 });
  }
  for (const [contest, key] of [...keys.entries()].sort()) {
    const group = pollsAvail.filter((p) => p.race === key.race && (p.state ?? null) === key.state && p.round === 1);
    const avg = computeAverage(key, "1º turno", group, "validos");
    if (!avg) continue;
    siteAverages.push({
      contest,
      round: 1,
      pairing: null,
      basis: avg.basis,
      windowPollIds: avg.windowPollIds,
      capRelaxed: avg.capRelaxed,
      lastPollDate: avg.lastPollDate,
      candidates: avg.candidates.map((c) => ({ candidate_id: resolve(contest, c.candidate)?.candidate_id ?? null, name: c.candidate, avg: c.avg, nPolls: c.nPolls })),
    });
  }

  // Dois nomes do TSE que resolvem para o MESMO candidate_id são ambíguos e
  // nenhum dos dois resolve (CONVENTIONS §4: recusar, não escolher). Caso real:
  // Senado/SC tem "Carol de Toni" (33,46%) e uma outra "Carol" (0,15%) na urna,
  // e o candidato do store "Carol" traz as duas grafias como apelido.
  const ambiguousOfficial = [];
  const official = (resultados?.disputas ?? []).map((d) => {
    const contest = contestOf(d.race, d.uf ?? null);
    const hits = Object.keys(d.validos).map((name) => [name, resolve(contest, name)]);
    const count = new Map();
    for (const [, h] of hits) if (h) count.set(h.candidate_id, (count.get(h.candidate_id) ?? 0) + 1);
    for (const [name, h] of hits) if (h && count.get(h.candidate_id) > 1) ambiguousOfficial.push({ contest, name, candidate_id: h.candidate_id });
    const ok = (h) => (h && count.get(h.candidate_id) === 1 ? h : null);
    return {
      contest,
      race: d.race,
      uf: d.uf ?? null,
      round: d.round ?? resultados.turno,
      election_date: resultados.eleicao,
      totalizacao: d.totalizacao ?? null,
      fonte: d.fonte ?? resultados.fonte ?? null,
      candidates: Object.entries(d.validos)
        .map(([name, pct]) => {
          const hit = ok(resolve(contest, name));
          return { name, candidate_id: hit?.candidate_id ?? null, person_id: hit?.person_id ?? null, pct };
        })
        .sort((a, b) => b.pct - a.pct || a.name.localeCompare(b.name)),
    };
  });

  const candidatesOut = candidates
    .map((c) => ({ candidate_id: c.candidate_id, person_id: c.person_id ?? null, contest: c.contest, canonical: c.canonical, party: c.party ?? null }))
    .sort((a, b) => a.candidate_id.localeCompare(b.candidate_id));

  // Confrontos de 2º turno: a lista vem de `confrontosSegundoTurno()`
  // (src/lib/eleicao.ts) — as URNAS decidem quem disputa, nunca as pesquisas, e
  // as decisões da Justiça Eleitoral já estão aplicadas (RJ, 10/2026).
  const runoffContests = (runoffs ?? []).map((c) => {
    const contest = contestOf(c.race, c.uf ?? null);
    const ids = c.nomes.map((n) => resolve(contest, n.nome)?.candidate_id ?? null);
    // A média publicada do confronto: `computeAverage` sobre as pesquisas que
    // testaram EXATAMENTE o par (regra 3 de eleicao.ts), antes e depois do 1º
    // turno (regra 2). É o número que o site mostra — fato, não modelo.
    const pair = pollsAvail.filter((p) => {
      if (p.round !== 2 || p.race !== c.race || (p.state ?? null) !== (c.uf ?? null) || p.results.length !== 2) return false;
      const got = p.results.map((r) => resolve(contest, r.candidate)?.candidate_id ?? null).sort();
      return ids.every(Boolean) && JSON.stringify(got) === JSON.stringify([...ids].sort());
    });
    const avg = pair.length ? computeAverage({ race: c.race, state: c.uf ?? null, round: 2 }, "2º turno", pair, "validos") : null;
    return {
      site_average: avg
        ? {
            basis: avg.basis,
            windowPollIds: avg.windowPollIds,
            pollCount: avg.pollCount,
            capRelaxed: avg.capRelaxed,
            lastPollDate: avg.lastPollDate,
            candidates: avg.candidates.map((x) => ({ candidate_id: resolve(contest, x.candidate)?.candidate_id ?? null, name: x.candidate, avg: x.avg, nPolls: x.nPolls })),
          }
        : null,
      contest,
      race: c.race,
      uf: c.uf ?? null,
      round: 2,
      note: c.nota ?? null,
      first_round: c.nomes.map((n) => {
        const hit = resolve(contest, n.nome);
        return { name: n.nome, pct: n.pct, candidate_id: hit?.candidate_id ?? null, person_id: hit?.person_id ?? null };
      }),
    };
  });

  return {
    schema_version: EXPORT_SCHEMA_VERSION,
    as_of: asOf,
    calendar,
    runoff_contests: runoffContests,
    availability_lag_days: lag,
    source,
    counts: { polls_total: rows.length, polls_available: available.length, unresolved_names: unresolved.size },
    polls: available.sort((a, b) => a.id.localeCompare(b.id)),
    site_averages: siteAverages,
    official_results: official,
    candidates: candidatesOut,
    ambiguous_official: ambiguousOfficial,
    unresolved_names: [...unresolved.entries()].map(([k, n]) => ({ key: k, n })).sort((a, b) => a.key.localeCompare(b.key)),
  };
}

async function main() {
  const a = args(process.argv.slice(2));
  const pollsFile = a.polls ?? path.join(ROOT, "data", "polls.json");
  const raw = fs.readFileSync(pollsFile);
  const ds = JSON.parse(raw.toString("utf-8"));
  const candidates = readNdjson(path.join(ROOT, "data", "candidates.ndjson"));
  const resFile = a.results ?? path.join(ROOT, "data", "resultados-oficiais.json");
  const resultados = a.results === "none" || !fs.existsSync(resFile) ? null : JSON.parse(fs.readFileSync(resFile, "utf-8"));
  const asOf = a["as-of"] ? isoDate(a["as-of"]) : null;
  if (a["as-of"] && !asOf) throw new Error(`--as-of inválido: ${a["as-of"]}`);
  // O calendário e os confrontos só fazem sentido sobre o banco ATUAL: o módulo
  // do site lê data/ do diretório de trabalho. Num vintage (backtest) eles não
  // entram — o backtest não precisa deles e não pode ler o presente.
  const kind = a["source-kind"] ?? "current";
  let runoffs = null;
  let calendar = null;
  if (kind === "current") {
    const eleicao = await lib("eleicao");
    runoffs = eleicao.confrontosSegundoTurno();
    calendar = { first_round: eleicao.PRIMEIRO_TURNO, second_round: eleicao.SEGUNDO_TURNO };
  }
  const out = exportInputs({
    runoffs,
    calendar,
    polls: ds.polls ?? [],
    candidates,
    resultados,
    asOf,
    lag: Number(a.lag ?? 2),
    source: {
      kind,
      commit: a.commit ?? null,
      committed_at: a["committed-at"] ?? null,
      polls_generated_at: ds.generated_at ?? null,
      polls_sha256: crypto.createHash("sha256").update(raw).digest("hex"),
    },
  });
  const text = JSON.stringify(out);
  if (a.out) fs.writeFileSync(a.out, text);
  else process.stdout.write(text);
  process.stderr.write(
    `exportado: ${out.counts.polls_available}/${out.counts.polls_total} pesquisas` +
      `${asOf ? ` disponíveis em ${asOf}` : ""}; ${out.site_averages.length} médias; ` +
      `${out.counts.unresolved_names} nomes sem candidate_id\n`,
  );
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  await main();
}
