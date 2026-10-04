// ACERTO DOS INSTITUTOS — quem chegou mais perto do resultado das urnas.
//
// Compara a ÚLTIMA pesquisa de cada instituto em cada disputa com o resultado
// oficial do TSE (data/resultados-oficiais.json). É a versão pós-eleição do
// "efeito casa": lá o instituto é medido contra a média das pesquisas; aqui,
// contra o voto apurado. Descritivo, não acusatório — uma pesquisa de 7 dias
// antes mede um eleitorado que ainda se moveu.
//
// REGRAS
//  1. Uma pesquisa por instituto por disputa: a de campo mais recente dentro da
//     janela final (`JANELA_DIAS` antes do pleito). Fora da janela não entra —
//     não é "erro" medir setembro e errar outubro.
//  2. Mesma base dos dois lados. Presidente e governador em VOTOS VÁLIDOS
//     (`toBasis`, regra 1 de validos.ts), contra o `pvap` do TSE. Senado: só
//     pesquisas de DOIS votos (as mesmas da média, `averageable`), contra
//     2 × pvap — cada eleitor tem dois votos, o TSE publica a parte de cada
//     candidato nos votos válidos totais, e a pesquisa de dois votos soma ~200.
//  3. Só candidatos presentes nos DOIS lados (pesquisa e urna) entram no erro;
//     um nome que a pesquisa não testou não é erro dela. Entre os presentes, os
//     com ≥ `PISO_PCT` nas urnas ou no top-`TOPO` — os nanicos a 0,3% só
//     adicionam ruído de arredondamento.
//  4. Métricas por (instituto, disputa): erro médio absoluto por candidato
//     (p.p.), erro na margem entre os dois primeiros das urnas, e se a pesquisa
//     apontou o mesmo líder.
//  5. Ranking só para quem cobriu ≥ `MIN_DISPUTAS` disputas, ordenado pelo erro
//     médio; empate pela margem. Os demais aparecem numa lista secundária, sem
//     posição — uma disputa só não é amostra de nada.
//  6. Sem resultado em `data/resultados-oficiais.json`, nada é calculado e a
//     home não mostra o bloco. Nunca inferimos resultado.
import fs from "node:fs";
import path from "node:path";
import { candKey } from "./average";
import { pollsFor } from "./data";
import { averageable } from "./senado";
import { toBasis } from "./validos";
import type { Poll, RaceKind, UF } from "./types";

export const JANELA_DIAS = 10;
export const PISO_PCT = 2;
export const TOPO = 4;
export const MIN_DISPUTAS = 3;

export interface ResultadoDisputa {
  race: RaceKind;
  uf: UF | null;
  round: 1 | 2;
  /** % de seções totalizadas no momento da leitura. */
  apurado_pct: number | null;
  /** % de votos válidos por candidato, como o TSE publica (`pvap`). */
  validos: Record<string, number>;
  fonte?: string;
  lido_em?: string;
}

export interface ResultadosOficiais {
  turno: 1 | 2;
  eleicao: string;
  atualizado_em: string | null;
  fonte: string;
  disputas: ResultadoDisputa[];
}

export interface AcertoDisputa {
  race: RaceKind;
  uf: UF | null;
  pollster: string;
  fieldwork_end: string;
  sample_size: number | null;
  /** Erro médio absoluto por candidato comparado, em p.p. */
  erroMedio: number;
  /** |margem na pesquisa − margem nas urnas| entre os dois primeiros das urnas. */
  erroMargem: number | null;
  /** A pesquisa apontou o mesmo líder das urnas. */
  acertouLider: boolean;
  comparados: number;
}

export interface AcertoInstituto {
  pollster: string;
  disputas: number;
  erroMedio: number;
  erroMargem: number | null;
  lideresCertos: number;
  detalhes: AcertoDisputa[];
}

export interface RankingAcerto {
  turno: 1 | 2;
  eleicao: string;
  atualizado_em: string | null;
  fonte: string;
  /** Disputas com resultado oficial carregado. */
  disputasComResultado: number;
  /** Menor % de seções totalizadas entre as disputas usadas (null = não informado). */
  apuracaoMinima: number | null;
  ranqueados: AcertoInstituto[];
  demais: AcertoInstituto[];
}

const round1 = (x: number): number => Math.round(x * 10) / 10;
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const pollsterKey = (name: string): string => name.toLowerCase().trim();

let cache: ResultadosOficiais | null | undefined;

/** O arquivo de resultados, ou null quando não existe / está vazio / malformado. */
export function resultadosOficiais(): ResultadosOficiais | null {
  if (cache !== undefined) return cache;
  cache = null;
  const p = path.join(process.cwd(), "data", "resultados-oficiais.json");
  if (!fs.existsSync(p)) return cache;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as ResultadosOficiais;
    if (Array.isArray(raw?.disputas) && raw.disputas.length) cache = raw;
  } catch {
    cache = null;
  }
  return cache;
}

function dentroDaJanela(p: Poll, eleicao: string): boolean {
  if (!p.fieldwork_end) return false;
  const fim = Date.parse(`${p.fieldwork_end}T00:00:00Z`);
  const dia = Date.parse(`${eleicao}T00:00:00Z`);
  const dias = (dia - fim) / 864e5;
  return dias >= 0 && dias <= JANELA_DIAS;
}

/** A pesquisa comparável de cada instituto numa disputa: a última dentro da janela. */
function ultimaPorInstituto(race: RaceKind, uf: UF | null, round: 1 | 2, eleicao: string): Poll[] {
  const polls = pollsFor(race, uf, round)
    .filter((p) => !p.incomplete && !p.municipal && dentroDaJanela(p, eleicao))
    .filter((p) => (race === "senador" ? averageable(p) : true))
    // 1º turno: só o cenário completo (o colapso de cenários já deixou um por
    // levantamento; um 2º turno hipotético não compara com um 1º turno real).
    .filter((p) => p.round === round);
  const porInstituto = new Map<string, Poll>();
  for (const p of polls) {
    const k = pollsterKey(p.pollster);
    const atual = porInstituto.get(k);
    if (!atual || (p.fieldwork_end ?? "") > (atual.fieldwork_end ?? "")) porInstituto.set(k, p);
  }
  return [...porInstituto.values()];
}

function compararDisputa(p: Poll, r: ResultadoDisputa): AcertoDisputa | null {
  // Senado: a pesquisa de dois votos soma ~200; o pvap do TSE soma 100. Dobrar
  // o TSE põe os dois na mesma grandeza (regra 2).
  const fator = r.race === "senador" ? 2 : 1;
  const pesquisa = r.race === "senador" ? p : toBasis(p, "validos");
  const urna = new Map<string, number>();
  for (const [nome, pct] of Object.entries(r.validos)) urna.set(candKey(nome), pct * fator);
  const ordem = [...urna.entries()].sort((a, b) => b[1] - a[1]);
  const topo = new Set(ordem.slice(0, TOPO).map(([k]) => k));

  const pares: { key: string; pesquisa: number; urna: number }[] = [];
  for (const res of pesquisa.results) {
    const k = candKey(res.candidate);
    const v = urna.get(k);
    if (v === undefined) continue;
    if (v < PISO_PCT * fator && !topo.has(k)) continue;
    pares.push({ key: k, pesquisa: res.pct, urna: v });
  }
  if (pares.length < 2) return null;

  const erroMedio = mean(pares.map((x) => Math.abs(x.pesquisa - x.urna)));
  const [l1, l2] = ordem;
  const p1 = pares.find((x) => x.key === l1?.[0]);
  const p2 = pares.find((x) => x.key === l2?.[0]);
  const erroMargem = p1 && p2 ? Math.abs((p1.pesquisa - p2.pesquisa) - (p1.urna - p2.urna)) : null;
  const liderPesquisa = [...pesquisa.results].sort((a, b) => b.pct - a.pct)[0];
  const acertouLider = !!l1 && !!liderPesquisa && candKey(liderPesquisa.candidate) === l1[0];

  return {
    race: r.race,
    uf: r.uf,
    pollster: p.pollster,
    fieldwork_end: p.fieldwork_end ?? "",
    sample_size: p.sample_size,
    erroMedio: round1(erroMedio),
    erroMargem: erroMargem === null ? null : round1(erroMargem),
    acertouLider,
    comparados: pares.length,
  };
}

/**
 * O ranking. Null quando não há resultado oficial carregado — a home então não
 * mostra o bloco (regra 6).
 */
export function rankingAcerto(): RankingAcerto | null {
  const res = resultadosOficiais();
  if (!res) return null;

  const porInstituto = new Map<string, AcertoDisputa[]>();
  let apuracaoMinima: number | null = null;
  let disputasComResultado = 0;
  for (const r of res.disputas) {
    if (!r.validos || !Object.keys(r.validos).length) continue;
    disputasComResultado++;
    if (r.apurado_pct != null) apuracaoMinima = apuracaoMinima === null ? r.apurado_pct : Math.min(apuracaoMinima, r.apurado_pct);
    for (const p of ultimaPorInstituto(r.race, r.uf, r.round, res.eleicao)) {
      const a = compararDisputa(p, r);
      if (!a) continue;
      const k = pollsterKey(p.pollster);
      if (!porInstituto.has(k)) porInstituto.set(k, []);
      porInstituto.get(k)!.push(a);
    }
  }

  const todos: AcertoInstituto[] = [...porInstituto.values()].map((detalhes) => {
    const margens = detalhes.map((d) => d.erroMargem).filter((v): v is number => v !== null);
    return {
      pollster: detalhes[0].pollster,
      disputas: detalhes.length,
      erroMedio: round1(mean(detalhes.map((d) => d.erroMedio))),
      erroMargem: margens.length ? round1(mean(margens)) : null,
      lideresCertos: detalhes.filter((d) => d.acertouLider).length,
      detalhes: detalhes.sort((a, b) => `${a.race}${a.uf ?? ""}`.localeCompare(`${b.race}${b.uf ?? ""}`)),
    };
  });
  const ordenar = (a: AcertoInstituto, b: AcertoInstituto) =>
    a.erroMedio - b.erroMedio || (a.erroMargem ?? 99) - (b.erroMargem ?? 99) || b.disputas - a.disputas;

  return {
    turno: res.turno,
    eleicao: res.eleicao,
    atualizado_em: res.atualizado_em,
    fonte: res.fonte,
    disputasComResultado,
    apuracaoMinima,
    ranqueados: todos.filter((x) => x.disputas >= MIN_DISPUTAS).sort(ordenar),
    demais: todos.filter((x) => x.disputas < MIN_DISPUTAS).sort(ordenar),
  };
}
