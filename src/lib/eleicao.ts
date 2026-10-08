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
//  2. A média de 2º turno de um confronto é a SÉRIE CONTÍNUA das simulações
//     daquele par: as feitas antes do 1º turno e as feitas depois, sob a regra
//     de sempre (até 10 mais recentes, 2 por instituto). Decisão de Iran em
//     08/10: a simulação Flávio × Lula de setembro mediu a mesma pergunta que a
//     pesquisa de 2º turno de outubro, e não há por que perdê-la. Quando as
//     pesquisas novas chegam, a janela de 10 as privilegia sozinha. O site
//     informa quantas das pesquisas da média têm campo após o 1º turno.
//  3. A pesquisa precisa ser DESTE par: os dois nomes das urnas (por `candKey`,
//     que ignora acentos — o TSE grafa "Flavio") e nenhum outro.
//  4. Nada aqui inventa número: sem pesquisa do par, a média é null e a
//     interface diz isso.
//  5. DECISÕES DA JUSTIÇA ELEITORAL (data/decisoes-eleitorais.json, curado à
//     mão com fonte) corrigem o resultado publicado antes de qualquer regra:
//     `votos_anulados` tira o candidato dos válidos e recalcula os demais. Foi
//     o caso do RJ em 10/2026 (Garotinho): Ruas passou de 49,27% a 50,88% e a
//     disputa se encerrou no 1º turno. A nota da decisão acompanha a disputa.
import fs from "node:fs";
import path from "node:path";
import { candKey, computeAverage, sortPollsDesc } from "./average";
import { pollsFor } from "./data";
import { resultadosOficiais, type ResultadoDisputa } from "./acerto";
import type { Poll, RaceAverage, RaceKind, UF } from "./types";

export const PRIMEIRO_TURNO = "2026-10-04";
export const SEGUNDO_TURNO = "2026-10-25";
/** Primeiro dia de campo possível depois do 1º turno. */
export const POS_PRIMEIRO_TURNO = "2026-10-05";
/** Início da série dos gráficos COMPACTOS de evolução do 2º turno (campanha: três meses antes do 1º turno). O herói tem seletor. */
export const EVOLUCAO_DESDE = "2026-07-01";

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
  /** Decisão judicial que alterou o resultado publicado (regra 5), se houver. */
  nota?: string;
}

export interface MediaConfronto {
  confronto: Confronto;
  /** Média de todas as simulações deste par (regra 2), ou null se nunca foi pesquisado. */
  media: RaceAverage | null;
  /** Todas as pesquisas deste par, mais recente primeiro. */
  pesquisas: Poll[];
  /** Quantas pesquisas DA MÉDIA têm campo iniciado após o 1º turno. */
  posPrimeiroTurnoNaMedia: number;
  /** Quantas pesquisas deste par, no total, têm campo iniciado após o 1º turno. */
  posPrimeiroTurno: number;
}

export interface DisputaEncerrada {
  race: RaceKind;
  uf: UF | null;
  /** Ordem das urnas; para o Senado os dois primeiros são os eleitos. */
  resultado: Candidato1T[];
  eleitos: Candidato1T[];
  totalizacao: "parcial" | "final" | null;
  /** Decisão judicial que alterou o resultado publicado (regra 5), se houver. */
  nota?: string;
}

export interface DecisaoEleitoral {
  race: RaceKind;
  uf: UF | null;
  tipo: "votos_anulados";
  candidato: string;
  motivo: string;
  efeito: string;
  fontes: string[];
  registrado_em: string;
  registrado_por: string;
}

let decisoesCache: DecisaoEleitoral[] | undefined;

/** As decisões curadas em data/decisoes-eleitorais.json (regra 5); [] se o arquivo não existe. */
export function decisoesEleitorais(): DecisaoEleitoral[] {
  if (decisoesCache) return decisoesCache;
  decisoesCache = [];
  const p = path.join(process.cwd(), "data", "decisoes-eleitorais.json");
  if (!fs.existsSync(p)) return decisoesCache;
  try {
    const raw = JSON.parse(fs.readFileSync(p, "utf-8")) as { decisoes?: DecisaoEleitoral[] };
    decisoesCache = (raw.decisoes ?? []).map((d) => ({ ...d, uf: d.uf ?? null }));
  } catch {
    decisoesCache = [];
  }
  return decisoesCache;
}

function decisoesDe(race: RaceKind, uf: UF | null): DecisaoEleitoral[] {
  return decisoesEleitorais().filter((d) => d.race === race && (d.uf ?? null) === uf);
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

/**
 * A disputa como publicada pelo TSE, CORRIGIDA pelas decisões curadas (regra 5):
 * um candidato com votos anulados sai dos válidos e os demais são recalculados
 * sobre o que sobra (a mesma conta do TSE numa retotalização).
 */
function disputa(race: RaceKind, uf: UF | null): (ResultadoDisputa & { nota?: string }) | null {
  const res = resultadosOficiais();
  if (!res || res.turno !== 1) return null;
  const d = res.disputas.find((d) => d.race === race && (d.uf ?? null) === uf && d.round === 1);
  if (!d) return null;
  const decisoes = decisoesDe(race, uf).filter((x) => x.tipo === "votos_anulados");
  if (!decisoes.length) return d;
  const anulados = new Set(decisoes.map((x) => candKey(x.candidato)));
  const restantes = Object.entries(d.validos).filter(([nome]) => !anulados.has(candKey(nome)));
  const soma = restantes.reduce((a, [, pct]) => a + pct, 0);
  if (soma <= 0) return d;
  const validos: Record<string, number> = {};
  for (const [nome, pct] of restantes) validos[nome] = Math.round((pct / soma) * 10000) / 100;
  return { ...d, validos, nota: decisoes.map((x) => x.efeito).join(" ") };
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
  return { race, uf, nomes: [ord[0], ord[1]], totalizacao: d.totalizacao ?? null, ...(d.nota ? { nota: d.nota } : {}) };
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
  const nota = d.nota ? { nota: d.nota } : {};
  if (race === "senador") {
    return { race, uf, resultado, eleitos: resultado.slice(0, 2), totalizacao: d.totalizacao ?? null, ...nota };
  }
  if (resultado[0].pct < 50) return null;
  return { race, uf, resultado, eleitos: resultado.slice(0, 1), totalizacao: d.totalizacao ?? null, ...nota };
}

const dataDeCampo = (p: Poll): string | null => p.fieldwork_start ?? p.fieldwork_end ?? null;

/** Campo iniciado depois do 1º turno. Sem data, conta como anterior. */
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
  const pesquisas = sortPollsDesc(pollsFor(c.race, c.uf, 2).filter((p) => pesquisaDoPar(p, c)));
  const media = pesquisas.length ? computeAverage(key, scenario, pesquisas, "validos") : null;
  const naMedia = new Set(media?.windowPollIds ?? []);
  return {
    confronto: c,
    media,
    pesquisas,
    posPrimeiroTurnoNaMedia: pesquisas.filter((p) => naMedia.has(p.id) && posPrimeiroTurno(p)).length,
    posPrimeiroTurno: pesquisas.filter(posPrimeiroTurno).length,
  };
}

/** Todos os confrontos com suas médias, na ordem de `confrontosSegundoTurno`. */
export function mediasSegundoTurno(): MediaConfronto[] {
  return confrontosSegundoTurno().map(mediaConfronto);
}

export interface PontoEvolucao {
  date: string;
  a: number;
  b: number;
}

/**
 * A evolução da média do confronto desde `desde`: a série do 1º das urnas (a) e
 * do 2º (b), lidas da MESMA média móvel que o site publica (`trend` de cada
 * candidato), nunca recalculadas. Onde um lado não tem amostra numa data, vale
 * 100 − outro (válidos de um confronto somam 100).
 */
export function evolucaoConfronto(mc: MediaConfronto, desde: string | null = null): PontoEvolucao[] {
  const m = mc.media;
  if (!m) return [];
  const [n1, n2] = mc.confronto.nomes;
  const ca = m.candidates.find((c) => candKey(c.candidate) === candKey(n1.nome));
  const cb = m.candidates.find((c) => candKey(c.candidate) === candKey(n2.nome));
  if (!ca || !cb) return [];
  const bPorData = new Map<string, number>();
  for (const p of cb.trend ?? []) if (Number.isFinite(p.avg)) bPorData.set(p.date, p.avg);
  return (ca.trend ?? [])
    .filter((p) => Number.isFinite(p.avg) && (!desde || p.date >= desde))
    .map((p) => ({ date: p.date, a: p.avg, b: bPorData.get(p.date) ?? 100 - p.avg }));
}
