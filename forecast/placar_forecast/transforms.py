"""Escala composicional: razão log-aditiva (ALR) e covariância amostral.

As frações de votos válidos de K categorias (candidatos acompanhados e, quando
existir, "demais") vivem no simplex: são positivas e somam 1. Estimá-las uma a
uma, cada qual com seu intervalo, produz totais que não fecham 100%. O modelo
trabalha na escala ALR com uma categoria de referência r:

    y_k = log(p_k / p_r),   k ≠ r,

que é irrestrita em R^(K−1); a volta é o softmax com y_r = 0, e por construção
qualquer amostra devolvida soma exatamente 1. Para dois candidatos (2º turno)
isto é o logit da fração do primeiro.

Covariância amostral. Para proporções multinomiais com n respondentes válidos,
Cov(p̂) = (diag p − p pᵀ)/n. Pelo método delta, com G o jacobiano da ALR
(G_kj = δ_kj/p_k − δ_rj/p_r), Cov(y) = G Cov(p̂) Gᵀ. Como G p = 0, o termo p pᵀ
some e resta

    Cov(y) = (diag(1/p_k) + (1/p_r) 1 1ᵀ) / n,

que é a forma usada aqui. Ela é avaliada nas frações MÉDIAS da disputa, não nas
da própria pesquisa — ponderar uma pesquisa pela variância calculada com o seu
próprio valor puxa a média para os valores que, por acaso, saíram baixos.
"""

from __future__ import annotations

import numpy as np


def alr(p: np.ndarray, ref: int) -> np.ndarray:
    """Frações (…, K) → ALR (…, K−1) com referência `ref`."""
    p = np.asarray(p, dtype=float)
    if np.any(p <= 0):
        raise ValueError("alr: frações precisam ser estritamente positivas")
    lp = np.log(p)
    out = lp - lp[..., ref:ref + 1]
    return np.delete(out, ref, axis=-1)


def inv_alr(y: np.ndarray, ref: int) -> np.ndarray:
    """ALR (…, K−1) → frações (…, K), estável numericamente (softmax)."""
    y = np.asarray(y, dtype=float)
    z = np.insert(y, ref, 0.0, axis=-1)
    z = z - z.max(axis=-1, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=-1, keepdims=True)


def continuity(p: np.ndarray, n: float, c: float = 0.5) -> np.ndarray:
    """Correção de continuidade: soma c/n a cada categoria e renormaliza.

    Necessária porque uma categoria publicada como 0 (comum para "demais" num
    1º turno de dois nomes fortes) não tem log. Em amostras de ~1.000 o efeito
    numa fração de 40% é da ordem de 0,02 ponto.
    """
    p = np.asarray(p, dtype=float)
    k = p.shape[-1]
    q = (p * n + c) / (n + c * k)
    return q / q.sum(axis=-1, keepdims=True)


def alr_sampling_cov(pbar: np.ndarray, ref: int, n_eff: float) -> np.ndarray:
    """Cov(y) de uma pesquisa com n_eff respondentes válidos, nas frações `pbar`."""
    pbar = np.asarray(pbar, dtype=float)
    if n_eff <= 0:
        raise ValueError("alr_sampling_cov: n_eff precisa ser positivo")
    others = np.delete(pbar, ref)
    d = others.size
    return (np.diag(1.0 / others) + np.full((d, d), 1.0 / pbar[ref])) / n_eff
