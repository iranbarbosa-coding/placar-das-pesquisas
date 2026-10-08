// A ELEIÇÃO — o calendário e o que as urnas já decidiram.
//
// Até 04/10 o site era um placar de 1º turno: toda média lia o 1º turno e o
// 2º turno era um cenário hipotético. Com o resultado oficial carregado
// (data/resultados-oficiais.json, lido do TSE por scripts/tse-resultados.mjs),
// as disputas se dividem em duas classes, e este módulo é a ÚNICA fonte dessa
// divisão para o resto do site:
//
//   · ENCERRADAS no 1º turno — alguém passou de 50% dos válidos (presidente e
//     governador) ou são do Senado (uma vaga cada, sem 2º turno). O 1º turno
//     fica arquivado: as médias finais ao lado do resultado oficial.
//   · EM 2º TURNO — ninguém passou de 50%: os dois primeiros das urnas disputam
//     em 25/10. É o foco da home.
//
// REGRAS
//  1. Quem vai ao 2º turno vem das URNAS, nunca das pesquisas: os dois mais
//     votados numa disputa em que o primeiro ficou abaixo de 50% dos válidos.
//     Sem resultado oficial, não há confronto — e a home volta ao 1º turno.
//  2. A média de 2º turno de um confronto só usa pesquisas de campo DEPOIS do
//     1º turno (`POS_PRIMEIRO_TURNO`). As simulações feitas antes mediam uma
//     pergunta hipotética num eleitorado que ainda não tinha votado; misturá-las
//     com as pesquisas reais daria uma média de duas corridas diferentes. A
//     última média hipotética fica disponível à parte, com esse nome.
//  3. A pesquisa precisa ser DESTE par: os dois nomes das urnas (por `candKey`,
//     que ignora acentos — o TSE grafa "Flavio") e nenhum outro.
//  4. Nada aqui inventa número: sem pesquisa pós-1º turno, a média é null e a
//     interface diz isso.
import { candKey, computeAverage, sortPollsDesc } from "./average";
import { pollsFor } from "./data";
import { resultadosOficiais, type ResultadoDisputa } from "./acerto";
import type { Poll, RaceAverage, RaceKind, UF } from "./types";

export const PRIMEIRO_TURNO = "2026-10-04";
export const SEGUNDO_TURNO = "2026-10-25";
/** Primeiro dia de campo que conta como pesquisa de 2º turno "de verdade". */
export const POS_PRIMEIRO_TURNO = "2026-10-05";

export type RaceComTurno = "presidente" | "governador";

export interface Candidato1T {
  nome: string;
  /** % de votos válidos no 1º turno, como o TSE publica. */
  pct: number;
}

export interface Confronto {
  race: RaceComTurno;
  uf: UF | null;
  /** Os dois mais votados, na ordem das urnas. */
  nomes: [Candidato1T, Candidato1T];
  totalizacao: "parcial" | "final" | null;
}

export interface MediaConfronto {
  confronto: Confronto;
  /** Média das pesquisas de campo após o 1º turno, ou null se não há nenhuma. */
  media: RaceAverage | null;
  /** Pesquisas pós-1º turno deste par (as mesmas da média, mais as fora dela). */
  pesquisas: Poll[];
  /** Última média das simulações ANTES do 1º turno, para contexto. */
  mediaHipotetica: RaceAverage | null;
}

export interface DisputaEncerrada {
  race: RaceKind;
  uf: UF | null;
  /** Ordem das urnas; para o Senado os dois primeiros são os eleitos. */
  resultado: Candidato1T[];
  eleitos: Candidato1T[];
  totalizacao: "parcial" | "final" | null;
}

/**
 * O nome como o SITE o grafa. O TSE publica "Flavio Bolsonaro"; o banco de
 * pesquisas tem "Flávio Bolsonaro". A chave (`candKey`) é a mesma, então a
 * grafia das pesquisas vence quando existe — é a que o leitor já viu em toda
 * média. Sem pesquisa com esse nome, fica o do TSE.
 */
function nomeDoSite(nome: string, race: RaceKind, uf: UF | null): string {
  const k = candKey(nome);
  for (const p of pollsFor(race, uf)) for (const r of p.results) if (candKey(r.candidate) === k) return r.candidate;
  return nome;
}

const ordenar = (r: ResultadoDisputa): Candidato1T[] =>
  Object.entries(r.validos)
    .map(([nome, pct]) => ({ nome: nomeDoSite(nome, r.race, r.uf ?? null), pct }))
    .sort((a, b) => b.pct - a.pct);

function disputa(race: RaceKind, uf: UF | null): ResultadoDisputa | null {
  const res = resultadosOficiais();
  if (!res || res.turno !== 1) return null;
  return res.disputas.find((d) => d.race === race && (d.uf ?? null) === uf && d.round === 1) ?? null;
}

/** Há resultado oficial do 1º turno carregado para alguma disputa. */
export function primeiroTurnoApurado(): boolean {
  return !!resultadosOficiais()?.disputas.length;
}

/** Dias (inteiros) até o 2º turno a partir de `hoje` (ISO AAAA-MM-DD); negativo depois dele. */
export function diasAteSegundoTurno(hoje = new Date().toISOString().slice(0, 10)): number {
  return Math.round((Date.parse(`${SEGUNDO_TURNO}T00:00:00Z`) - Date.parse(`${hoje}T00:00:00Z`)) / 864e5);
}

/** O confronto de 2º turno de uma disputa, ou null quando ela se decidiu no 1º (regra 1). */
export function confronto(race: RaceComTurno, uf: UF | null): Confronto | null {
  const d = disputa(race, uf);
  if (!d) return null;
  const ord = ordenar(d);
  if (ord.length < 2 || ord[0].pct >= 50) return null;
  return { race, uf, nomes: [ord[0], ord[1]], totalizacao: d.totalizacao ?? null };
}

/** Todos os confrontos de 2º turno: presidente primeiro, depois governadores por UF. */
export function confrontosSegundoTurno(): Confronto[] {
  const res = resultadosOficiais();
  if (!res) return [];
  const out: Confronto[] = [];
  const pres = confronto("presidente", null);
  if (pres) out.push(pres);
  const ufs = [...new Set(res.disputas.filter((d) => d.race === "governador" && d.uf).map((d) => d.uf as UF))].sort();
  for (const uf of ufs) {
    const c = confronto("governador", uf);
    if (c) out.push(c);
  }
  return out;
}

/** A disputa como as urnas a fecharam, ou null se foi ao 2º turno ou não há resultado. */
export function disputaEncerrada(race: RaceKind, uf: UF | null): DisputaEncerrada | null {
  const d = disputa(race, uf);
  if (!d) return null;
  const resultado = ordenar(d);
  if (!resultado.length) return null;
  if (race === "senador") {
    return { race, uf, resultado, eleitos: resultado.slice(0, 2), totalizacao: d.totalizacao ?? null };
  }
  if (resultado[0].pct < 50) return null;
  return { race, uf, resultado, eleitos: resultado.slice(0, 1), totalizacao: d.totalizacao ?? null };
}

const dataDeCampo = (p: Poll): string | null => p.fieldwork_start ?? p.fieldwork_end ?? null;

/** Regra 2: campo iniciado depois do 1º turno. Sem data, fica fora. */
export function posPrimeiroTurno(p: Poll): boolean {
  const d = dataDeCampo(p);
  return !!d && d >= POS_PRIMEIRO_TURNO;
}

/** Regra 3: a pesquisa testa exatamente os dois nomes do confronto. */
export function pesquisaDoPar(p: Poll, c: Confronto): boolean {
  const alvo = new Set(c.nomes.map((n) => candKey(n.nome)));
  const nomes = new Set(p.results.map((r) => candKey(r.candidate)));
  if (nomes.size !== alvo.size) return false;
  for (const k of alvo) if (!nomes.has(k)) return false;
  return true;
}

export function rotuloConfronto(c: Confronto): string {
  return `2º turno: ${c.nomes[0].nome} vs ${c.nomes[1].nome}`;
}

/** A média de 2º turno de um confronto (regras 2–4). */
export function mediaConfronto(c: Confronto): MediaConfronto {
  const key = { race: c.race, state: c.uf, round: 2 as const };
  const scenario = rotuloConfronto(c);
  const doPar = pollsFor(c.race, c.uf, 2).filter((p) => pesquisaDoPar(p, c));
  const pesquisas = sortPollsDesc(doPar.filter(posPrimeiroTurno));
  const antes = sortPollsDesc(doPar.filter((p) => !posPrimeiroTurno(p)));
  return {
    confronto: c,
    media: pesquisas.length ? computeAverage(key, scenario, pesquisas, "validos") : null,
    pesquisas,
    mediaHipotetica: antes.length ? computeAverage(key, scenario, antes, "validos") : null,
  };
}

/** Todos os confrontos com suas médias, na ordem de `confrontosSegundoTurno`. */
export function mediasSegundoTurno(): MediaConfronto[] {
  return confrontosSegundoTurno().map(mediaConfronto);
}
