"""Diagnósticos de convergência MCMC — R-hat e ESS com normalização por postos.

Implementação de Vehtari, Gelman, Simpson, Carpenter & Bürkner (2021),
"Rank-normalization, folding, and localization: an improved R-hat for assessing
convergence of MCMC", Bayesian Analysis 16(2). Sem SciPy: a inversa da normal
padrão é a aproximação racional de Acklam (erro relativo < 1,2e-9), suficiente
para converter postos em escores normais.

Convenção de forma: `draws` tem forma (cadeias, iterações).
"""

from __future__ import annotations

import numpy as np

_A = (-3.969683028665376e01, 2.209460984245205e02, -2.759285104469687e02,
      1.383577518672690e02, -3.066479806614716e01, 2.506628277459239e00)
_B = (-5.447609879822406e01, 1.615858368580409e02, -1.556989798598866e02,
      6.680131188771972e01, -1.328068155288572e01)
_C = (-7.784894002430293e-03, -3.223964580411365e-01, -2.400758277161838e00,
      -2.549732539343734e00, 4.374664141464968e00, 2.938163982698783e00)
_D = (7.784695709041462e-03, 3.224671290700398e-01, 2.445134137142996e00,
      3.754408661907416e00)


def ndtri(p: np.ndarray) -> np.ndarray:
    """Inversa da CDF normal padrão (Acklam), vetorizada, para p em (0, 1)."""
    p = np.asarray(p, dtype=float)
    if np.any((p <= 0) | (p >= 1)):
        raise ValueError("ndtri: p fora de (0, 1)")
    out = np.empty_like(p)
    lo, hi = 0.02425, 1 - 0.02425
    m = p < lo
    if m.any():
        q = np.sqrt(-2 * np.log(p[m]))
        out[m] = (((((_C[0] * q + _C[1]) * q + _C[2]) * q + _C[3]) * q + _C[4]) * q + _C[5]) / (
            (((_D[0] * q + _D[1]) * q + _D[2]) * q + _D[3]) * q + 1)
    m = p > hi
    if m.any():
        q = np.sqrt(-2 * np.log(1 - p[m]))
        out[m] = -(((((_C[0] * q + _C[1]) * q + _C[2]) * q + _C[3]) * q + _C[4]) * q + _C[5]) / (
            (((_D[0] * q + _D[1]) * q + _D[2]) * q + _D[3]) * q + 1)
    m = (p >= lo) & (p <= hi)
    if m.any():
        q = p[m] - 0.5
        r = q * q
        out[m] = (((((_A[0] * r + _A[1]) * r + _A[2]) * r + _A[3]) * r + _A[4]) * r + _A[5]) * q / (
            ((((_B[0] * r + _B[1]) * r + _B[2]) * r + _B[3]) * r + _B[4]) * r + 1)
    return out


def _split(draws: np.ndarray) -> np.ndarray:
    c, n = draws.shape
    half = n // 2
    return np.concatenate([draws[:, :half], draws[:, n - half:]], axis=0)


def _rank_normalize(draws: np.ndarray) -> np.ndarray:
    flat = draws.ravel()
    order = np.argsort(flat, kind="mergesort")
    ranks = np.empty(flat.size, dtype=float)
    # Postos médios para empates (amostras idênticas — ex.: cadeia travada).
    sorted_vals = flat[order]
    ranks_sorted = np.arange(1, flat.size + 1, dtype=float)
    uniq, start, counts = np.unique(sorted_vals, return_index=True, return_counts=True)
    for s, k in zip(start[counts > 1], counts[counts > 1]):
        ranks_sorted[s:s + k] = ranks_sorted[s:s + k].mean()
    ranks[order] = ranks_sorted
    z = ndtri((ranks - 3 / 8) / (flat.size + 1 / 4))
    return z.reshape(draws.shape)


def _rhat_basic(draws: np.ndarray) -> float:
    c, n = draws.shape
    means = draws.mean(axis=1)
    var_w = draws.var(axis=1, ddof=1).mean()
    var_b = n * means.var(ddof=1)
    if var_w <= 0:
        return float("inf") if var_b > 0 else 1.0
    var_plus = (n - 1) / n * var_w + var_b / n
    return float(np.sqrt(var_plus / var_w))


def rhat(draws: np.ndarray) -> float:
    """R-hat por postos com divisão das cadeias e dobra (máximo entre centro e cauda)."""
    draws = np.asarray(draws, dtype=float)
    if draws.ndim != 2 or draws.shape[0] < 2 or draws.shape[1] < 4:
        raise ValueError("rhat: precisa de ≥2 cadeias e ≥4 iterações")
    if not np.all(np.isfinite(draws)):
        return float("inf")
    if np.ptp(draws) == 0:
        return 1.0
    s = _split(draws)
    bulk = _rhat_basic(_rank_normalize(s))
    folded = np.abs(s - np.median(s))
    tail = _rhat_basic(_rank_normalize(folded))
    return max(bulk, tail)


def _autocov(x: np.ndarray) -> np.ndarray:
    n = x.size
    m = 1 << int(np.ceil(np.log2(2 * n)))
    f = np.fft.rfft(x - x.mean(), n=m)
    ac = np.fft.irfft(f * np.conj(f), n=m)[:n].real
    return ac / n


def ess_bulk(draws: np.ndarray) -> float:
    """Tamanho efetivo de amostra 'bulk' (postos normalizados, cadeias divididas)."""
    draws = np.asarray(draws, dtype=float)
    if not np.all(np.isfinite(draws)):
        return 0.0
    if np.ptp(draws) == 0:
        return float(draws.size)
    s = _rank_normalize(_split(draws))
    return _ess(s)


def _ess(s: np.ndarray) -> float:
    c, n = s.shape
    acov = np.stack([_autocov(s[i]) for i in range(c)])
    chain_var = acov[:, 0] * n / (n - 1)
    mean_var = chain_var.mean()
    var_plus = mean_var * (n - 1) / n
    if c > 1:
        var_plus += s.mean(axis=1).var(ddof=1)
    if var_plus <= 0:
        return float(c * n)
    rho = 1 - (mean_var - acov.mean(axis=0)) / var_plus
    rho[0] = 1.0
    # Sequência inicial positiva e monótona de Geyer, em pares.
    t = 0
    sum_pairs = 0.0
    prev = np.inf
    while t + 1 < n:
        pair = rho[t] + rho[t + 1]
        if pair < 0:
            break
        pair = min(pair, prev)
        sum_pairs += pair
        prev = pair
        t += 2
    tau = -1 + 2 * sum_pairs
    tau = max(tau, 1 / np.log10(c * n))
    return float(c * n / tau)


def summarize(draws: np.ndarray) -> dict:
    """R-hat, ESS e momentos de um escalar amostrado (cadeias, iterações)."""
    draws = np.asarray(draws, dtype=float)
    return {
        "rhat": rhat(draws),
        "ess_bulk": ess_bulk(draws),
        "mean": float(draws.mean()),
        "sd": float(draws.std(ddof=1)),
        "q05": float(np.quantile(draws, 0.05)),
        "q95": float(np.quantile(draws, 0.95)),
    }
