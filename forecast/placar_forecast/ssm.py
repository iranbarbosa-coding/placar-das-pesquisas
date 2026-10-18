"""MODELO A — espaço de estados bayesiano para o apoio latente.

Escala: ALR das frações de votos válidos (ver transforms.py); com dois
candidatos é o logit. Para cada disputa, com D = K − 1 componentes:

  Estado (passeio aleatório em dias):
      μ_{g} = μ_{g−1} + η_g,         η_g ~ N(0, σ_rw² Δ_g I_D)
  Observação (pesquisa i do instituto j, no meio do campo t_i):
      y_i = μ_{t_i} + h_j + ε_i,     ε_i ~ N(0, S_i + τ² I_D)
  Efeito casa:
      h_j ~ N(0, σ_h² I_D) condicionado a Σ_j h_j = 0
  Priores (semi-normais):
      σ_rw ~ N⁺(0, s_rw²),  τ ~ N⁺(0, s_τ²),  σ_h ~ N⁺(0, s_h²),  μ_0 ~ N(m_0, s_0² I)

S_i é a covariância amostral multinomial pelo método delta, com o tamanho
EFETIVO (respondentes que declararam voto); τ² é o erro não amostral de cada
pesquisa (desenho, ponderação, modo, momento), estimado dos dados — a margem de
erro declarada não cobre tudo. A restrição de soma zero diz que a casa MÉDIA
não tem viés em relação ao estado latente; o viés da casa média em relação às
urnas é o erro sistemático, que as pesquisas não identificam e que o Modelo B
trata com a calibração histórica (Modelo C).

AMOSTRADOR — MCMC marginal ("colapsado"), exato para o modelo gaussiano:

  1. θ = (σ_rw, τ, σ_h) por Metropolis adaptativo (Haario et al., 2001),
     proposta refletida em zero, contra a verossimilhança MARGINAL p(y | θ), com μ e h integrados.
     Ela vem de um filtro de Kalman no estado aumentado
         x = [μ, f_1, …, f_{J−1}],   h_j = f_j (j < J),  h_J = −Σ f_j,
     cuja priori em f é σ_h² (I − 11ᵀ/J) — exatamente a normal condicionada
     à soma zero. Sem isso (Gibbs centrado) σ_rw, τ e σ_h ficavam presos ao
     caminho e aos efeitos amostrados na iteração anterior: ESS < 100 em 2.000
     iterações, medido no 2º turno presidencial.
  2. h | θ, y — como f é estático, o filtro no último ponto É a posteriori
     suavizada de f: amostra direta N(m_f, P_ff).
  3. μ_{1:G} | h, θ, y — filtro de Kalman D-dimensional com y − h e amostragem
     retroativa (FFBS, Carter & Kohn 1994; Frühwirth-Schnatter 1994).

Os passos 2–3 só rodam nas iterações guardadas: no aquecimento, só θ anda.
A grade tem os dias com pesquisa mais a data de referência (um intervalo de Δ
dias tem variância σ_rw² Δ — exato para o passeio aleatório).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

from .data import RaceData
from .diagnostics import ess_bulk, rhat
from .transforms import inv_alr

LOG2PI = np.log(2 * np.pi)


@dataclass
class FitResult:
    grid: np.ndarray            # (G,) dias
    mu: np.ndarray              # (C, S, G, D) estado latente
    h: np.ndarray               # (C, S, J, D) efeitos casa
    sigma_rw: np.ndarray        # (C, S)
    tau: np.ndarray             # (C, S)
    sigma_h: np.ndarray         # (C, S)
    accept: list                # taxa de aceitação do Metropolis por cadeia
    diagnostics: dict
    house_effects: bool

    @property
    def mu_ref(self) -> np.ndarray:
        return self.mu[:, :, -1, :]


class SamplerError(RuntimeError):
    """O amostrador produziu valor não finito — o ajuste é recusado, não remendado."""


def _sym(a: np.ndarray) -> np.ndarray:
    return 0.5 * (a + np.swapaxes(a, -1, -2))


def _mvn(rng: np.random.Generator, mean: np.ndarray, cov: np.ndarray) -> np.ndarray:
    d = mean.shape[-1]
    cov = _sym(cov)
    jitter = 1e-12 * max(1.0, float(np.abs(np.diagonal(cov, axis1=-2, axis2=-1)).max()))
    L = np.linalg.cholesky(cov + jitter * np.eye(d))
    z = rng.standard_normal(mean.shape)
    return mean + np.einsum("...ij,...j->...i", L, z)


class _Problem:
    """Estruturas fixas da disputa, compartilhadas pelos filtros."""

    def __init__(self, race: RaceData, cfg: dict, use_h: bool):
        self.y, self.S = race.y, race.S
        self.N, self.D = race.y.shape
        self.J = len(race.pollsters)
        self.use_h = bool(use_h and self.J > 1)
        self.pollster = race.pollster
        self.grid = np.unique(np.concatenate([race.t, [race.t_ref]]))
        if self.grid[-1] != race.t_ref:
            raise ValueError("observação posterior à data de referência")
        self.G = self.grid.size
        self.g_of = np.searchsorted(self.grid, race.t)
        self.dt = np.diff(self.grid).astype(float)
        order = np.lexsort((np.arange(self.N), self.g_of))
        self.by_g = [order[self.g_of[order] == g] for g in range(self.G)]
        scfg = cfg["ssm"]
        self.m0 = race.y[np.argsort(race.t, kind="stable")[: min(5, self.N)]].mean(axis=0)
        self.s0 = float(scfg["init_state_sd"])
        self.F = (self.J - 1) * self.D if self.use_h else 0
        self.d = self.D + self.F
        if self.use_h:
            Om = np.eye(self.J - 1) - np.full((self.J - 1, self.J - 1), 1.0 / self.J)
            self.Omega = np.kron(Om, np.eye(self.D))          # (F, F)
            self.coef = np.zeros((self.J, self.J - 1))
            self.coef[np.arange(self.J - 1), np.arange(self.J - 1)] = 1.0
            self.coef[self.J - 1, :] = -1.0                   # h_J = −Σ f

    def marginal(self, lsrw: np.ndarray, ltau: np.ndarray, lsh: np.ndarray):
        """log p(y | θ) por cadeia, e a posteriori final de f — filtro no estado aumentado.

        Atualização sequencial, observação a observação, na forma de
        covariância: a priori de f é singular por construção (soma zero) só na
        dimensão J, já eliminada; nenhuma inversa de P é necessária.
        """
        C = lsrw.shape[0]
        D, d = self.D, self.d
        q = np.exp(2 * lsrw)
        tau2 = np.exp(2 * ltau)
        m = np.zeros((C, d)); m[:, :D] = self.m0
        P = np.zeros((C, d, d))
        P[:, :D, :D] = self.s0 ** 2 * np.eye(D)
        if self.use_h:
            P[:, D:, D:] = np.exp(2 * lsh)[:, None, None] * self.Omega
        ll = np.zeros(C)
        I_D = np.eye(D)
        for g in range(self.G):
            if g > 0:
                P[:, :D, :D] += (q * self.dt[g - 1])[:, None, None] * I_D
            for i in self.by_g[g]:
                if self.use_h:
                    c = self.coef[self.pollster[i]]
                    # H = [I_D, c ⊗ I_D]:  P Hᵀ = P[:, :, μ] + Σ_k c_k P[:, :, f_k]
                    PHt = P[:, :, :D] + np.einsum("cdkl,k->cdl", P[:, :, D:].reshape(C, d, self.J - 1, D), c)
                    Hx = m[:, :D] + np.einsum("ckl,k->cl", m[:, D:].reshape(C, self.J - 1, D), c)
                    HPHt = PHt[:, :D, :] + np.einsum("ckdl,k->cdl", PHt[:, D:, :].reshape(C, self.J - 1, D, D), c)
                else:
                    PHt = P[:, :, :D]
                    Hx = m[:, :D]
                    HPHt = PHt[:, :D, :]
                Sm = _sym(HPHt) + self.S[i][None] + tau2[:, None, None] * I_D
                Sinv = np.linalg.inv(Sm)
                v = self.y[i][None] - Hx
                _, logdet = np.linalg.slogdet(Sm)
                ll += -0.5 * (D * LOG2PI + logdet + np.einsum("ci,cij,cj->c", v, Sinv, v))
                K = PHt @ Sinv                                    # (C, d, D)
                m = m + np.einsum("cij,cj->ci", K, v)
                P = _sym(P - K @ np.swapaxes(PHt, 1, 2))
        return ll, m[:, D:], P[:, D:, D:]

    def ffbs_mu(self, rng, h: np.ndarray, lsrw: np.ndarray, ltau: np.ndarray) -> np.ndarray:
        """Caminho μ_{1:G} | h, θ, y (forma de informação + amostragem retroativa)."""
        C = h.shape[0]
        D, G = self.D, self.G
        I = np.eye(D)
        R = self.S[None] + np.exp(2 * ltau)[:, None, None, None] * I
        Rinv = np.linalg.inv(R)
        z = self.y[None] - h[:, self.pollster, :]
        Mg = np.zeros((G, self.N)); Mg[self.g_of, np.arange(self.N)] = 1.0
        Ig = np.einsum("gn,cnij->cgij", Mg, Rinv)
        bg = np.einsum("gn,cnij,cnj->cgi", Mg, Rinv, z)
        q = np.exp(2 * lsrw)[:, None, None]
        mf = np.empty((C, G, D)); Pf = np.empty((C, G, D, D))
        m = np.broadcast_to(self.m0, (C, D)).copy()
        Pc = np.broadcast_to(self.s0 ** 2 * I, (C, D, D)).copy()
        for g in range(G):
            if g > 0:
                Pc = Pc + q * self.dt[g - 1] * I
            Pinv = np.linalg.inv(Pc)
            Pn = _sym(np.linalg.inv(Pinv + Ig[:, g]))
            m = np.einsum("cij,cj->ci", Pn, np.einsum("cij,cj->ci", Pinv, m) + bg[:, g])
            Pc = Pn
            mf[:, g] = m; Pf[:, g] = Pc
        mu = np.empty((C, G, D))
        x = _mvn(rng, mf[:, -1], Pf[:, -1])
        mu[:, -1] = x
        for g in range(G - 2, -1, -1):
            Q = q * self.dt[g] * I
            A = Pf[:, g] @ np.linalg.inv(Pf[:, g] + Q)
            mean = mf[:, g] + np.einsum("cij,cj->ci", A, x - mf[:, g])
            x = _mvn(rng, mean, Pf[:, g] - A @ Pf[:, g])
            mu[:, g] = x
        return mu

    def expand_h(self, f: np.ndarray) -> np.ndarray:
        C = f.shape[0]
        fr = f.reshape(C, self.J - 1, self.D)
        return np.concatenate([fr, -fr.sum(axis=1, keepdims=True)], axis=1)


def fit(race: RaceData, cfg: dict, seed: int, *, house_effects: bool | None = None,
        chains: int | None = None, warmup: int | None = None, draws: int | None = None) -> FitResult:
    scfg = cfg["ssm"]
    C = int(chains or scfg["chains"])
    W = int(warmup or scfg["warmup"])
    S_keep = int(draws or scfg["draws"])
    use_h = scfg["house_effects"] if house_effects is None else house_effects
    rng = np.random.default_rng(seed)
    pb = _Problem(race, cfg, use_h)
    scales = np.array([scfg["prior_sigma_rw"], scfg["prior_tau"], scfg["prior_sigma_h"]], dtype=float)
    npar = 3 if pb.use_h else 2

    # θ vive na escala NATURAL (desvios-padrão ≥ 0), com proposta refletida em
    # zero: q(σ'|σ) = φ(σ'−σ) + φ(σ'+σ) é simétrica, então o Metropolis não
    # precisa de correção. Na escala log, a cauda esquerda de τ (posteriori com
    # massa perto de zero, comum quando há poucas pesquisas) fica infinita e a
    # cadeia demora a cruzá-la: ESS de τ ~130 em 4×1.000 no AM; refletida, ver
    # FORECASTING_VALIDATION.md (diagnósticos).
    def log_prior(th):
        return (-0.5 * (th[:, :npar] / scales[:npar]) ** 2).sum(axis=1)     # semi-normal

    def log_lik(th):
        return pb.marginal(np.log(th[:, 0]), np.log(th[:, 1]), np.log(th[:, 2]))

    # Inícios dispersos em torno de metade da escala da priori (para o R-hat valer).
    th = (scales / 2)[None, :] * np.exp(0.7 * rng.standard_normal((C, 3)))
    if not pb.use_h:
        th[:, 2] = scales[2]
    ll, fm, fP = log_lik(th)
    lp = ll + log_prior(th)

    prop_chol = np.diag(scales[:npar] / 4)
    scale = np.ones(C)
    acc = np.zeros(C)
    hist: list[np.ndarray] = []
    G, D, J = pb.G, pb.D, pb.J
    out_mu = np.empty((C, S_keep, G, D)); out_h = np.zeros((C, S_keep, J, D))
    out_th = np.empty((C, S_keep, 3))
    tiny = 1e-8

    for it in range(W + S_keep):
        e = rng.standard_normal((C, npar)) @ prop_chol.T
        th_p = th.copy(); th_p[:, :npar] = np.maximum(np.abs(th[:, :npar] + scale[:, None] * e), tiny)
        ll_p, fm_p, fP_p = log_lik(th_p)
        lp_p = ll_p + log_prior(th_p)
        ok = np.isfinite(lp_p)
        a = ok & (np.log(rng.random(C)) < np.where(ok, lp_p - lp, -np.inf))
        th = np.where(a[:, None], th_p, th); lp = np.where(a, lp_p, lp)
        if pb.use_h:
            fm = np.where(a[:, None], fm_p, fm); fP = np.where(a[:, None, None], fP_p, fP)
        if it < W:
            gamma = 1.0 / np.sqrt(it + 10)
            scale = np.exp(np.log(scale) + gamma * (a.astype(float) - 0.3))
            hist.append(th[:, :npar].copy())
            if it >= 100 and it % 50 == 0:
                X = np.concatenate(hist[len(hist) // 2:], axis=0)
                cov = np.atleast_2d(np.cov(X.T)) + np.diag((1e-3 * scales[:npar]) ** 2)
                prop_chol = np.linalg.cholesky(cov * (2.38 ** 2 / npar))
                scale = np.ones(C)
            continue
        acc += a
        k = it - W
        h = pb.expand_h(_mvn(rng, fm, fP)) if pb.use_h else np.zeros((C, J, D))
        mu = pb.ffbs_mu(rng, h, np.log(th[:, 0]), np.log(th[:, 1]))
        if not (np.all(np.isfinite(mu)) and np.all(np.isfinite(h))):
            raise SamplerError(f"{race.contest}: estado não finito na iteração {it}")
        out_mu[:, k] = mu; out_h[:, k] = h; out_th[:, k] = th

    res = FitResult(grid=pb.grid, mu=out_mu, h=out_h, sigma_rw=out_th[..., 0],
                    tau=out_th[..., 1], sigma_h=out_th[..., 2],
                    accept=(acc / S_keep).round(3).tolist(), diagnostics={}, house_effects=pb.use_h)
    res.diagnostics = convergence(res, race)
    return res


def convergence(fit_: FitResult, race: RaceData) -> dict:
    """R-hat e ESS das quantidades publicadas e dos hiperparâmetros."""
    params = {"sigma_rw": fit_.sigma_rw, "tau": fit_.tau}
    if fit_.house_effects:
        params["sigma_h"] = fit_.sigma_h
    shares = inv_alr(fit_.mu_ref, race.ref)                         # (C, S, K)
    labels = race.labels()
    for k in range(shares.shape[-1]):
        params[f"fração_atual[{labels[k]}]"] = shares[..., k]
    rows = {}
    for name, d in params.items():
        rows[name] = {"rhat": round(rhat(d), 4), "ess_bulk": round(ess_bulk(d), 1)}
    return {
        "chains": int(fit_.mu.shape[0]),
        "draws_per_chain": int(fit_.mu.shape[1]),
        "params": rows,
        "rhat_max": max(r["rhat"] for r in rows.values()),
        "ess_min": min(r["ess_bulk"] for r in rows.values()),
        "accept": fit_.accept,
    }


def converged(diag: dict, cfg: dict) -> tuple[bool, list[str]]:
    g = cfg["gates"]
    reasons = []
    if not np.isfinite(diag["rhat_max"]) or diag["rhat_max"] > g["rhat_max"]:
        reasons.append(f"R-hat máximo {diag['rhat_max']:.3f} > {g['rhat_max']}")
    if diag["ess_min"] < g["ess_min"]:
        reasons.append(f"ESS mínimo {diag['ess_min']:.0f} < {g['ess_min']}")
    return (not reasons), reasons
