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
import { toBasis } from "./validos";
import { PRIMEIRO_TURNO, resultadoDisputa } from "./eleicao";
import { JANELA_DIAS } from "./acerto";
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
/** Elenco mínimo para uma pesquisa contar: exclui hipotéticos reduzidos (2–4
 *  nomes), onde o % em válidos de cada candidato incha por causa do tamanho do
 *  campo, não do viés do instituto. */
const MIN_FIELD = 5;

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
  /** No modo resultado: fim de campo da última pesquisa, a comparada. */
  fieldworkEnd?: string | null;
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
  /** Contra o que o desvio foi medido: a média das demais pesquisas (padrão) ou
   *  o resultado oficial do 1º turno (`houseEffectsVsResultado`). */
  base?: "media" | "resultado";
  /** No modo resultado: a janela de campo considerada (ISO) e o resultado usado. */
  janela?: { desde: string; ate: string };
  resultado?: { candidate: string; pct: number }[];
}

/** DESVIO DA ÚLTIMA PESQUISA PARA O RESULTADO (08/10/2026, decisão de Iran):
 *  a mesma janela do ranking de acerto (`JANELA_DIAS` antes do pleito). */
export const RESULTADO_JANELA_DIAS = JANELA_DIAS;

/** Colunas (campo registrado, por média) e campo comparável de uma disputa —
 *  o mesmo recorte para os dois modos, para que a tabela não troque de forma
 *  quando o leitor alterna a base. */
function campoComparavel(race: RaceKind, state: UF | null, round: 1 | 2) {
  const polls = pollsFor(race, state, round).map((p) => toBasis(p, "validos"));
  const evo = raceEvolutionData(race, state, round);
  const reg = new Set(evo.registeredKeys);
  const columns = (evo.average?.candidates ?? [])
    .filter((c) => reg.size === 0 || reg.has(candKey(c.candidate)))
    .slice(0, MAX_COLUMNS)
    .map((c) => ({ candidate: c.candidate, party: c.party, key: candKey(c.candidate) }));
  const anchors = columns.slice(0, 2).map((c) => c.key);
  const comparable =
    anchors.length === 2
      ? polls.filter((p) => {
          if (p.results.length < MIN_FIELD) return false;
          const keys = new Set(p.results.map((r) => candKey(r.candidate)));
          return anchors.every((a) => keys.has(a));
        })
      : polls;
  return { polls, columns, comparable };
}

/**
 * A ÚLTIMA PESQUISA DE CADA INSTITUTO CONTRA O RESULTADO OFICIAL do 1º turno —
 * a visão por candidato do ranking "Quem chegou mais perto" (decisão de Iran,
 * 08/10/2026: não é viés sistemático, é a distância da última leitura). Para
 * cada instituto, a pesquisa de campo mais recente até `RESULTADO_JANELA_DIAS`
 * dias antes do pleito que testou os dois primeiros das urnas; cada célula é
 *     p.pct(c) em válidos − resultado(c) em válidos (TSE),
 * com uma observação só. Mesmas colunas do modo média. Sem exigência de elenco
 * mínimo: a Veritá da véspera publicou só os dois primeiros em válidos, e é
 * exatamente a pesquisa que o leitor quer ver aqui — as colunas que ela não
 * testou ficam "—". Ordenado do menor para o maior desvio médio, como o
 * ranking. Null sem resultado carregado.
 */
export function houseEffectsVsResultado(race: RaceKind, state: UF | null): HouseEffectsData | null {
  const resultado = resultadoDisputa(race, state);
  if (!resultado) return null;
  const urna = new Map(resultado.map((c) => [candKey(c.nome), c.pct] as const));
  const { polls, columns } = campoComparavel(race, state, 1);
  if (!columns.length) return null;
  const anchors = columns.slice(0, 2).map((c) => c.key);
  const ate = PRIMEIRO_TURNO;
  const desde = new Date(Date.parse(`${ate}T00:00:00Z`) - RESULTADO_JANELA_DIAS * 864e5).toISOString().slice(0, 10);
  const naJanela = polls.filter((p) => {
    const d = p.fieldwork_end;
    if (!d || d < desde || d > ate) return false;
    const keys = new Set(p.results.map((r) => candKey(r.candidate)));
    return anchors.every((a) => keys.has(a));
  });
  const ultima = new Map<string, Poll>();
  for (const p of naJanela) {
    const k = pollsterKey(p.pollster);
    const atual = ultima.get(k);
    if (!atual || (p.fieldwork_end ?? "") > (atual.fieldwork_end ?? "")) ultima.set(k, p);
  }
  const pollsters: PollsterEffect[] = [];
  for (const p of ultima.values()) {
    const cells: (HouseEffectCell | null)[] = columns.map((col) => {
      const alvo = urna.get(col.key);
      const mine = p.results.find((r) => candKey(r.candidate) === col.key)?.pct;
      if (alvo === undefined || mine === undefined || mine === null) return null;
      return { effect: round1(mine - alvo), n: 1 };
    });
    const filled = cells.filter((c): c is HouseEffectCell => c !== null);
    if (!filled.length) continue;
    pollsters.push({ pollster: p.pollster, nPolls: 1, fieldworkEnd: p.fieldwork_end ?? null, cells, magnitude: round1(mean(filled.map((c) => Math.abs(c.effect)))) });
  }
  pollsters.sort((a, b) => a.magnitude - b.magnitude || (b.fieldworkEnd ?? "").localeCompare(a.fieldworkEnd ?? ""));
  const keep = columns.map((_, i) => i).filter((i) => pollsters.some((p) => p.cells[i] !== null));
  return {
    candidates: keep.map((i) => ({ candidate: columns[i].candidate, party: columns[i].party })),
    pollsters: pollsters.map((p) => ({ ...p, cells: keep.map((i) => p.cells[i]) })),
    pollCount: pollsters.length,
    base: "resultado",
    janela: { desde, ate },
    resultado: keep.map((i) => ({ candidate: columns[i].candidate, pct: urna.get(columns[i].key) ?? 0 })),
  };
}

export function houseEffects(race: RaceKind, state: UF | null, round: 1 | 2 = 1): HouseEffectsData {
  // Medimos o viés em VOTOS VÁLIDOS, não na base bruta. Os institutos alocam
  // indecisos de forma diferente, então a base bruta não é comparável entre
  // eles: um instituto que "força" a escolha (menos indeciso, base bruta mais
  // alta) apareceria superestimando TODOS os candidatos — um artefato de base,
  // não um viés por candidato. Converter cada pesquisa a válidos ANTES de
  // qualquer conta (regra 1 de `toBasis`) coloca instituto e consenso na mesma
  // base e isola o desvio real por candidato.
  // (Ver `campoComparavel`: colunas = campo registrado por média; campo
  // comparável = pesquisas que testam os dois primeiros com elenco ≥ MIN_FIELD —
  // o mesmo recorte do modo resultado.)
  const { polls, columns, comparable } = campoComparavel(race, state, round);
  if (!polls.length || !columns.length) return { candidates: [], pollsters: [], pollCount: 0, base: "media" };

  // Institutos com pesquisas suficientes na disputa (no campo comparável).
  const byPollster = new Map<string, Poll[]>();
  for (const p of comparable) {
    const k = pollsterKey(p.pollster);
    if (!byPollster.has(k)) byPollster.set(k, []);
    byPollster.get(k)!.push(p);
  }

  const pollsters: PollsterEffect[] = [];
  for (const [k, own] of byPollster) {
    if (own.length < MIN_POLLS_PER_POLLSTER) continue;
    const others = comparable.filter((p) => pollsterKey(p.pollster) !== k);
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

  // Poda colunas 100% vazias: um candidato sem NENHUMA célula com base comparável
  // (ex.: um minoritário testado só em cenários reduzidos, agora excluídos) não
  // vira uma coluna inteira de "—".
  const keep = columns.map((_, i) => i).filter((i) => pollsters.some((p) => p.cells[i] !== null));
  return {
    candidates: keep.map((i) => ({ candidate: columns[i].candidate, party: columns[i].party })),
    pollsters: pollsters.map((p) => ({ ...p, cells: keep.map((i) => p.cells[i]) })),
    pollCount: comparable.length,
    base: "media",
  };
}
