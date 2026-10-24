/**
 * "Linha de chegada" da apuração do 2º turno (pedido do criador, 24/10/2026):
 * quanto Flávio (ou Lula) precisa ter AGORA, nos votos já apurados, para vencer
 * se as urnas que faltam repetirem o padrão do 1º turno.
 *
 * Conta, por município (dados do TSE):
 *  • 1º turno (final): votos de Lula e Flávio → fatia de Flávio entre os dois, f1;
 *  • 2º turno (ao vivo): eleitorado apurado e comparecimento → votos já contados e
 *    votos que faltam (eleitorado das seções restantes × comparecimento já visto ali).
 *
 * Com A = votos já contados, R = votos que faltam, pc = f1 médio das urnas já
 * contadas e pr = f1 médio das que faltam (médias pesadas pelos votos), e supondo
 * que o 2º turno mude o voto de todo município pela mesma quantidade (variação
 * uniforme), o resultado final de Flávio é
 *
 *     final = atual + R/(A+R) · (pr − pc)
 *
 * e a linha de chegada (final = 50%) é 50% − R/(A+R) · (pr − pc). Lula, o
 * complemento. Supõe que, dentro de cada município, as seções já contadas
 * representam as que faltam — o município é a menor unidade que o TSE publica ao vivo.
 */

export interface T1Municipios {
  /** chave "<uf><cdmun>" → [Lula, Flávio, comparecimento, eleitorado] no 1º turno. */
  mun: Record<string, [number, number, number, number]>;
}

/** Andamento do 2º turno num município: eleitorado, eleitorado apurado, comparecimento apurado. */
export interface AndamentoMun {
  te: number;
  est: number;
  c: number;
}

export interface LinhaChegada {
  /** % dos válidos que Flávio precisa ter agora para vencer (0–100); Lula = 100 − isto. */
  limiarFlavio: number;
  limiarLula: number;
  /** Resultado final de cada um se o padrão do 1º turno se repetir no que falta (0–100). */
  projecaoFlavio: number;
  projecaoLula: number;
  /** Vantagem de Flávio, no 1º turno, das urnas que faltam sobre as já contadas (p.p.). */
  difRestante: number;
  /** % dos votos que ainda faltam (estimativa). */
  fracaoRestante: number;
  /** % do eleitorado do 2º turno coberto por municípios com 1º turno conhecido. */
  cobertura: number;
}

/** Abaixo disso de eleitorado casado com o 1º turno, a conta não é publicada. */
export const COBERTURA_MINIMA = 99.5;

export function linhaDeChegada(
  t1: T1Municipios,
  t2: Map<string, AndamentoMun>,
  atual: { flavioPct: number; validos: number },
): LinhaChegada | null {
  let teTotal = 0;
  let teCasado = 0;
  let A = 0;
  let R = 0;
  let somaA = 0;
  let somaR = 0;
  for (const [k, m] of t2) {
    teTotal += m.te;
    const base = t1.mun[k];
    if (!base) continue;
    const [l1, f1v, c1, te1] = base;
    if (l1 + f1v <= 0 || c1 <= 0) continue;
    teCasado += m.te;
    // Votos em Lula+Flávio por eleitor que compareceu, no 1º turno: converte
    // comparecimento em votos dos dois (brancos, nulos e os demais candidatos fora).
    const dois = (l1 + f1v) / c1;
    const f1 = f1v / (l1 + f1v);
    const contados = m.c * dois;
    const comparec = m.est > 0 ? m.c / m.est : te1 > 0 ? c1 / te1 : 0;
    const faltam = Math.max(0, m.te - m.est) * comparec * dois;
    A += contados;
    R += faltam;
    somaA += contados * f1;
    somaR += faltam * f1;
  }
  const cobertura = teTotal ? (100 * teCasado) / teTotal : 0;
  if (cobertura < COBERTURA_MINIMA || A <= 0 || atual.validos <= 0) return null;
  const pc = somaA / A;
  const pr = R > 0 ? somaR / R : pc;
  const restante = R / (A + R);
  const delta = 100 * restante * (pr - pc);
  const limiarFlavio = 50 - delta;
  const projecaoFlavio = atual.flavioPct + delta;
  return {
    limiarFlavio,
    limiarLula: 100 - limiarFlavio,
    projecaoFlavio,
    projecaoLula: 100 - projecaoFlavio,
    difRestante: 100 * (pr - pc),
    fracaoRestante: 100 * restante,
    cobertura,
  };
}
