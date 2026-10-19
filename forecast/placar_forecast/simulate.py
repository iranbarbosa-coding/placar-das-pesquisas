"""MODELO B — simulação Monte Carlo do resultado no dia da eleição.

Para cada sorteio n = 1…N (N = 100.000 em produção):

    m      ~ uniforme sobre os sorteios da posteriori do Modelo A
    μ_E    = μ_ref[m] + δ_drift + δ_sys
    δ_drift ~ N(0, σ_rw[m]² · H · I)        H = dias até a eleição
    δ_sys   = s · z / √w,  z ~ N(0, I),  w ~ Gamma(ν/2, taxa ν/2)
    frações = ALR⁻¹(μ_E)

Os componentes de incerteza, separados:
  1. amostral + 2. efeitos casa + 6. parâmetros — na posteriori de μ_ref (o
     Modelo A integra τ, σ_h e σ_rw; os sorteios de m os carregam);
  4. mudança de preferência até a eleição — δ_drift, com a volatilidade
     estimada da própria série (σ_rw da mesma iteração m, não um número fixo);
  3. erro sistemático compartilhado das pesquisas — δ_sys, COMUM a todas as
     pesquisas da disputa (é o que faz a média inteira errar para o mesmo
     lado). Escala s, forma L (isotrópica ou multinomial) e caudas ν vêm da
     calibração (Modelo C), escolhidas pelo desempenho fora da amostra; ν
     finito dá caudas pesadas: δ_sys = s · L z / √w.
  5. comparecimento — NÃO é modelado à parte: o banco não tem dado de
     comparecimento por segmento, e o efeito dele sobre as frações de votos
     válidos chega às urnas como parte do erro sistemático, que a calibração
     mede contra o resultado. Está dito na metodologia como limitação.

A posteriori sobre o PRESENTE (nowcast) é só μ_ref; a projeção para o dia da
eleição soma δ_drift e δ_sys. As duas são publicadas separadamente.

Reprodutibilidade: um único `numpy.random.Generator(PCG64(seed))`, sorteios em
ordem fixa; mesma entrada + mesma semente + mesma versão do numpy ⇒ mesmos
números.
"""

from __future__ import annotations

import numpy as np

from .transforms import inv_alr


def posterior_flat(fit_) -> tuple[np.ndarray, np.ndarray]:
    mu = fit_.mu_ref.reshape(-1, fit_.mu_ref.shape[-1])
    srw = fit_.sigma_rw.reshape(-1)
    return mu, srw


def draw_alr(mu_ref: np.ndarray, srw: np.ndarray, horizon_days: float, sys_scale: float,
             nu: float | None, n: int, rng: np.random.Generator, sys_chol: np.ndarray | None = None) -> np.ndarray:
    """N sorteios de μ_E na escala ALR. `sys_chol` é L com Σ_sys = s² L Lᵀ (None = identidade)."""
    M, D = mu_ref.shape
    idx = rng.integers(0, M, size=n)
    out = mu_ref[idx].copy()
    if horizon_days > 0:
        out += (srw[idx] * np.sqrt(horizon_days))[:, None] * rng.standard_normal((n, D))
    if sys_scale > 0:
        z = rng.standard_normal((n, D))
        if nu is not None and nu < 500:
            w = rng.gamma(nu / 2, 2 / nu, size=n)
            z = z / np.sqrt(w)[:, None]
        if sys_chol is not None:
            z = z @ np.asarray(sys_chol).T
        out += sys_scale * z
    return out


def summarize_shares(shares: np.ndarray, labels: list[str], quantiles: list[float], bin_pp: float) -> list[dict]:
    """Resumo por categoria em pontos percentuais."""
    pct = shares * 100
    edges = np.arange(0, 100 + bin_pp, bin_pp)
    rows = []
    for k, lab in enumerate(labels):
        col = pct[:, k]
        qs = np.quantile(col, quantiles)
        hist, _ = np.histogram(col, bins=edges)
        nz = np.nonzero(hist)[0]
        lo, hi = (int(nz[0]), int(nz[-1]) + 1) if nz.size else (0, 0)
        rows.append({
            "label": lab,
            "mean": float(col.mean()),
            "sd": float(col.std()),
            "quantiles": {f"{q:g}": float(v) for q, v in zip(quantiles, qs)},
            "histogram": {
                "bin_pp": bin_pp,
                "start_pp": float(edges[lo]),
                "counts": hist[lo:hi].astype(int).tolist(),
            },
        })
    return rows


def event_probabilities(shares: np.ndarray, n_candidates: int, race: str, round_: int) -> dict:
    """Probabilidades de eventos sobre os candidatos acompanhados (sem 'demais')."""
    cand = shares[:, :n_candidates]
    rank = np.argsort(-cand, axis=1)
    first = np.bincount(rank[:, 0], minlength=n_candidates) / shares.shape[0]
    out = {"first": first.tolist()}
    if n_candidates >= 2:
        top2 = np.zeros(n_candidates)
        for k in range(n_candidates):
            top2[k] = np.mean((rank[:, 0] == k) | (rank[:, 1] == k))
        out["top2"] = top2.tolist()
    if round_ == 1 and race in ("presidente", "governador"):
        out["decided_first_round"] = float(np.mean(shares.max(axis=1) >= 0.5))
        out["wins_outright"] = [float(np.mean(cand[:, k] >= 0.5)) for k in range(n_candidates)]
    return out


def variance_decomposition(mu_ref: np.ndarray, srw: np.ndarray, horizon_days: float,
                           sys_scale: float, nu: float | None, sys_chol: np.ndarray | None = None) -> dict:
    """Parcela de cada componente na variância total (escala ALR, média dos componentes)."""
    post = float(np.mean(np.var(mu_ref, axis=0)))
    drift = float(np.mean(srw ** 2) * horizon_days)
    t_var = (nu / (nu - 2)) if (nu is not None and 2 < nu < 500) else 1.0
    m_tr = float(np.mean(np.sum(np.asarray(sys_chol) ** 2, axis=1))) if sys_chol is not None else 1.0
    sysv = float(sys_scale ** 2 * t_var * m_tr)
    tot = post + drift + sysv
    if tot <= 0:
        return {"posterior": 1.0, "drift": 0.0, "systematic": 0.0}
    return {"posterior": post / tot, "drift": drift / tot, "systematic": sysv / tot}


def sys_structure(mu_ref: np.ndarray, ref: int, structure: str) -> np.ndarray | None:
    """L da forma do erro sistemático, nas frações MÉDIAS previstas (ver calibration.build_error_set)."""
    if structure != "mult":
        return None
    from .transforms import alr_sampling_cov
    pbar = inv_alr(mu_ref.mean(axis=0), ref)
    return np.linalg.cholesky(alr_sampling_cov(np.maximum(pbar, 1e-4) / np.maximum(pbar, 1e-4).sum(), ref, 1.0))


def simulate(mu_ref: np.ndarray, srw: np.ndarray, ref: int, horizon_days: float, sys_scale: float,
             nu: float | None, n: int, seed: int, sys_chol: np.ndarray | None = None) -> np.ndarray:
    rng = np.random.default_rng(seed)
    y = draw_alr(mu_ref, srw, horizon_days, sys_scale, nu, n, rng, sys_chol)
    shares = inv_alr(y, ref)
    if not np.all(np.isfinite(shares)):
        raise FloatingPointError("simulação produziu frações não finitas")
    return shares
