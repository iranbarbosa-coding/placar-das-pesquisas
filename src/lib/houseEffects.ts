// EFEITO CASA (house effects) — o viés sistemático de cada instituto em relação
// à média das pesquisas, por candidato. Descritivo, não acusatório: um efeito
// casa pode refletir metodologia legítima (amostragem, modo de coleta), não
// fraude. É a versão ABERTA do recurso que o concorrente cobra — e, sendo
// pública, é citável.
//
// MÉTODO (leave-one-out). Para cada pesquisa p do instituto J na data d testando
// o candidato c:
//     resíduo = p.pct(c) − consenso_sem_J(c, d)
// onde `consenso_sem_J` é a NOSSA própria média móvel (o mesmo `selectWindow` do
// site) calculada sobre as pesquisas de TODOS os outros institutos publicadas
// até d. Excluir J é essencial: senão um instituto que pesquisa muito puxa o
// consenso para si e mede o próprio viés contra si mesmo, encolhendo-o. O efeito
// casa de (J, c) é a média dos resíduos; positivo = J tende a SUPERESTIMAR c
// ante a média; negativo = subestimar.
//
// Reaproveita as primitivas de `average.ts` (`selectWindow`, `sortPollsDesc`,
// `candKey`) — a mesma regra de janela do resto do site, não uma segunda.
import { candKey, selectWindow, sortPollsDesc } from "./average";
import { pollsFor } from "./data";
import { raceEvolutionData } from "./presidente";
import type { Poll, RaceKind, UF } from "./types";

/** Instituto precisa de ao menos isto de pesquisas na disputa para ter efeito. */
const MIN_POLLS_PER_POLLSTER = 3;
/** Célula (instituto, candidato) precisa de ao menos isto de observações. */
const MIN_OBS_PER_CELL = 2;
/** O consenso (leave-one-out) só conta se ao menos isto de pesquisas de OUTROS
 *  institutos testam o candidato na janela — senão comparar contra "a média" é
 *  comparar contra uma pesquisa só, e o início ruidoso da série infla o efeito. */
const MIN_CONSENSUS_POLLS = 3;
/** Quantos candidatos (colunas) exibir — os primeiros por média. */
const MAX_COLUMNS = 6;

const pollDate = (p: Poll): string | null =>
  p.fieldwork_end ?? p.published_date ?? p.fieldwork_start ?? null;
const pollsterKey = (name: string): string => name.toLowerCase().trim();
const round1 = (x: number): number => Math.round(x * 10) / 10;
const mean = (xs: number[]): number => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

/** A média móvel do site (regra `selectWindow`) para o candidato `key`, sobre as
 *  pesquisas de `polls` publicadas ATÉ `date`. Null quando nenhuma testa o
 *  candidato na janela — não há consenso contra o qual medir. */
function asOfAverage(polls: Poll[], date: string, key: string): number | null {
  const upto = polls.filter((p) => {
    const d = pollDate(p);
    return d !== null && d <= date;
  });
  if (!upto.length) return null;
  const { window } = selectWindow(sortPollsDesc(upto));
  const vals = window
    .map((p) => p.results.find((r) => candKey(r.candidate) === key)?.pct)
    .filter((v): v is number => v !== undefined && v !== null);
  return vals.length >= MIN_CONSENSUS_POLLS ? mean(vals) : null;
}

export interface HouseEffectCell {
  effect: number; // pontos percentuais, sinalizado (+ superestima / − subestima)
  n: number; // observações que compõem a média
}

export interface PollsterEffect {
  pollster: string;
  /** Pesquisas deste instituto na disputa (independe de casar candidato). */
  nPolls: number;
  /** Uma célula por candidato-coluna, na mesma ordem de `candidates`; null quando
   *  o instituto não testou o candidato o bastante (< MIN_OBS_PER_CELL). */
  cells: (HouseEffectCell | null)[];
  /** Média do |efeito| entre as células preenchidas — ordena "quem mais desvia". */
  magnitude: number;
}

export interface HouseEffectsData {
  candidates: { candidate: string; party: string | null }[];
  pollsters: PollsterEffect[];
  /** Total de pesquisas da disputa consideradas. */
  pollCount: number;
}

/**
 * Efeito casa de uma disputa. Colunas = campo registrado (via
 * `raceEvolutionData`), os primeiros `MAX_COLUMNS` por média. Linhas = institutos
 * com ≥ `MIN_POLLS_PER_POLLSTER` pesquisas, ordenados por magnitude do desvio.
 * Server-only (alcança `node:fs`).
 */
export function houseEffects(race: RaceKind, state: UF | null, round: 1 | 2 = 1): HouseEffectsData {
  const polls = pollsFor(race, state, round);
  const evo = raceEvolutionData(race, state, round);
  const reg = new Set(evo.registeredKeys);

  // Colunas: campo registrado, já ordenado por média, cortado no topo.
  const columns = (evo.average?.candidates ?? [])
    .filter((c) => reg.size === 0 || reg.has(candKey(c.candidate)))
    .slice(0, MAX_COLUMNS)
    .map((c) => ({ candidate: c.candidate, party: c.party, key: candKey(c.candidate) }));

  if (!polls.length || !columns.length) return { candidates: [], pollsters: [], pollCount: 0 };

  // Institutos com pesquisas suficientes na disputa.
  const byPollster = new Map<string, Poll[]>();
  for (const p of polls) {
    const k = pollsterKey(p.pollster);
    if (!byPollster.has(k)) byPollster.set(k, []);
    byPollster.get(k)!.push(p);
  }

  const pollsters: PollsterEffect[] = [];
  for (const [k, own] of byPollster) {
    if (own.length < MIN_POLLS_PER_POLLSTER) continue;
    const others = polls.filter((p) => pollsterKey(p.pollster) !== k);
    if (!others.length) continue; // sem consenso externo, não há contra o quê medir

    const cells: (HouseEffectCell | null)[] = columns.map((col) => {
      const residuals: number[] = [];
      for (const p of own) {
        const d = pollDate(p);
        if (!d) continue;
        const mine = p.results.find((r) => candKey(r.candidate) === col.key)?.pct;
        if (mine === undefined || mine === null) continue;
        const consensus = asOfAverage(others, d, col.key);
        if (consensus === null) continue;
        residuals.push(mine - consensus);
      }
      return residuals.length >= MIN_OBS_PER_CELL
        ? { effect: round1(mean(residuals)), n: residuals.length }
        : null;
    });

    const filled = cells.filter((c): c is HouseEffectCell => c !== null);
    if (!filled.length) continue; // nada estável a mostrar deste instituto

    pollsters.push({
      pollster: own[0].pollster, // forma exibida (primeira ocorrência)
      nPolls: own.length,
      cells,
      magnitude: round1(mean(filled.map((c) => Math.abs(c.effect)))),
    });
  }

  pollsters.sort((a, b) => b.magnitude - a.magnitude || b.nPolls - a.nPolls);

  return {
    candidates: columns.map((c) => ({ candidate: c.candidate, party: c.party })),
    pollsters,
    pollCount: polls.length,
  };
}
