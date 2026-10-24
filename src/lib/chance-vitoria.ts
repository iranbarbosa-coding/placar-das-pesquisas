/**
 * Chance de vitória AO VIVO na apuração do 2º turno (pedido do criador, 24/10/2026).
 *
 * 1. Projeção do resultado final. Para cada município que ainda tem votos a
 *    apurar, a fatia de Flávio no que falta = a fatia dele ali no 1º turno (só
 *    Lula × Flávio) + a variação já observada na UF (fatia no 2º turno dos votos
 *    contados na UF − fatia no 1º turno desses mesmos lugares). UF sem nada
 *    contado usa a variação nacional. Votos que faltam = eleitorado das seções
 *    não apuradas × comparecimento observado (no município, senão na UF) ×
 *    votos nos dois por comparecimento observado na UF.
 * 2. Incerteza. O erro dessa projeção foi MEDIDO refazendo a apuração do 1º turno
 *    de 2026 na ordem real de totalização dos municípios, com o 2º turno de 2022
 *    como base (scripts/apuracao/backtest_chance.py → data/apuracao/calibracao-chance.json):
 *    desvio ≈ κ × fração dos votos que falta. Chance = P(normal > 50%).
 *
 * O município é a menor unidade publicada ao vivo; dentro dele, as seções já
 * apuradas são tomadas como representativas das que faltam.
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

/** Votos já contados na UF (arquivo da UF do 2º turno). */
export interface ContadosUf {
  lula: number;
  flavio: number;
  /** Comparecimento nas seções apuradas da UF. */
  c: number;
}

export interface ChanceVitoria {
  /** Probabilidade (0–1) de cada um terminar com mais votos. */
  flavio: number;
  lula: number;
  /** Projeção do resultado final, % dos válidos. */
  projecaoFlavio: number;
  projecaoLula: number;
  /** Desvio-padrão da projeção (p.p.) e fração dos votos que falta (0–100). */
  desvio: number;
  falta: number;
  cobertura: number;
}

/** Abaixo disso de eleitorado casado com o 1º turno, a chance não é publicada. */
export const COBERTURA_MINIMA = 99.5;

/** Φ(x) da normal padrão (Abramowitz–Stegun 7.1.26, erro < 1,5e-7). */
export function phi(x: number): number {
  const t = 1 / (1 + 0.3275911 * (Math.abs(x) / Math.SQRT2));
  const y = 1 - ((((1.061405429 * t - 1.453152027) * t + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-(x * x) / 2);
  return x >= 0 ? (1 + y) / 2 : (1 - y) / 2;
}

export function chanceDeVitoria(
  t1: T1Municipios,
  t2: Map<string, AndamentoMun>,
  ufs: Map<string, ContadosUf>,
  nacional: { lula: number; flavio: number },
  kappa: number,
): ChanceVitoria | null {
  const V2 = nacional.lula + nacional.flavio;
  if (V2 <= 0) return null;

  // Fatia de Flávio no 1º turno dos lugares já contados, por UF e no país, pesada
  // pelos votos nos dois esperados ali (comparecimento apurado × votos nos dois
  // por eleitor no 1º turno) — no 1º turno de governador, com muitos candidatos,
  // essa fração varia bastante entre municípios.
  const base = new Map<string, { peso: number; bF: number; te: number; est: number; c: number }>();
  let teTotal = 0;
  let teCasado = 0;
  for (const [k, m] of t2) {
    teTotal += m.te;
    const b = t1.mun[k];
    if (!b || b[0] + b[1] <= 0) continue;
    teCasado += m.te;
    const uf = k.slice(0, 2);
    const x = base.get(uf) ?? { peso: 0, bF: 0, te: 0, est: 0, c: 0 };
    const dois1 = b[2] > 0 ? (b[0] + b[1]) / b[2] : 0;
    x.peso += m.c * dois1;
    x.bF += m.c * dois1 * (b[1] / (b[0] + b[1]));
    x.te += m.te;
    x.est += m.est;
    x.c += m.c;
    base.set(uf, x);
  }
  const cobertura = teTotal ? (100 * teCasado) / teTotal : 0;
  if (cobertura < COBERTURA_MINIMA) return null;

  let pesoN = 0, bFN = 0, cN = 0, estN = 0, cUfN = 0;
  for (const [uf, x] of base) {
    pesoN += x.peso;
    bFN += x.bF;
    cN += x.c;
    estN += x.est;
    const u = ufs.get(uf);
    if (u) cUfN += u.c;
  }
  if (pesoN <= 0) return null;
  const sNac = nacional.flavio / V2 - bFN / pesoN;
  const compNac = estN > 0 ? cN / estN : 0;
  // Votos nos dois por comparecimento: nacional, dos arquivos das UFs.
  let doisUf = 0;
  for (const u of ufs.values()) doisUf += u.lula + u.flavio;
  const razaoNac = cUfN > 0 && cN > 0 ? doisUf / cUfN / (pesoN / cN) : 1;

  let F = nacional.flavio;
  let V = V2;
  let falta = 0;
  for (const [k, m] of t2) {
    const b = t1.mun[k];
    if (!b || b[0] + b[1] <= 0 || m.te <= m.est) continue;
    const uf = k.slice(0, 2);
    const x = base.get(uf)!;
    const u = ufs.get(uf);
    const dois = u ? u.lula + u.flavio : 0;
    const s = u && dois > 0 && x.peso > 0 ? u.flavio / dois - x.bF / x.peso : sNac;
    const comp = m.est > 0 ? m.c / m.est : x.est > 0 ? x.c / x.est : compNac;
    // Votos nos dois por eleitor: o do município no 1º turno, corrigido pela razão
    // 2º/1º turno observada na UF (nacional se a UF não tem nada contado).
    const dois1 = b[2] > 0 ? (b[0] + b[1]) / b[2] : 0;
    const razao = u && u.c > 0 && dois > 0 && x.c > 0 && x.peso > 0 ? dois / u.c / (x.peso / x.c) : razaoNac;
    const v = (m.te - m.est) * comp * dois1 * razao;
    F += v * Math.min(1, Math.max(0, b[1] / (b[0] + b[1]) + s));
    V += v;
    falta += v;
  }
  const projecaoFlavio = (100 * F) / V;
  const fracao = falta / V;
  const desvio = kappa * fracao;
  const pF = desvio > 0 ? phi((projecaoFlavio - 50) / desvio) : projecaoFlavio > 50 ? 1 : projecaoFlavio < 50 ? 0 : 0.5;
  return {
    flavio: pF,
    lula: 1 - pF,
    projecaoFlavio,
    projecaoLula: 100 - projecaoFlavio,
    desvio,
    falta: 100 * fracao,
    cobertura,
  };
}
