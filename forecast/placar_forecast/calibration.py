"""MODELO C — calibração do erro histórico das pesquisas contra as urnas.

Dado: para cada disputa c com resultado oficial e cada horizonte h, o erro na
escala ALR entre o resultado e a média a posteriori do Modelo A em T = E − h,

    e_ch = y_urna − E[μ_T],

e a variância que o modelo JÁ atribui a esse erro,

    A_ch = Cov[μ_T] + E[σ_rw²] · h · I        (posteriori + deriva até a eleição).

O que sobra é o erro SISTEMÁTICO: o quanto a média das pesquisas erra, como
grupo, além do que amostragem, efeitos casa e mudança de opinião explicam.
Modelo (escala s_ch do termo sistemático, caudas t de ν graus):

    e_ch | w ~ N(0, A_ch + (s_ch²/w) I),   w ~ Gamma(ν/2, taxa ν/2)
    log s_ch = α_cat(c) + β · log(1 + h/7) + γᵀ x_ch
    α_cat ~ N(α_0, ω²)                     (agrupamento parcial entre tipos)
    α_0 ~ N(log 0,05; 1,5²),  β ~ N(0, 1),  γ ~ N(0, 0,5²)

Tipos de disputa (cat): presidente_t1, governador_t1, senador_t1 — cada um com
seu α, mas puxado para o α_0 comum na medida em que tem poucos dados (o
presidencial tem UMA disputa). x_ch: log do nº de institutos com campo nos
últimos 30 dias e a dispersão das pesquisas nesse período, padronizados.

Estimação por máximo a posteriori (Nelder–Mead), com a densidade t avaliada por
quadratura de Monte Carlo com nós FIXOS em w (semente fixa: determinística).
A escolha entre variantes (sem erro sistemático; só α; α + horizonte;
α + horizonte + covariáveis) e entre os ν da grade é feita pela densidade
preditiva FORA DA AMOSTRA, com a regra de um erro-padrão (a mais simples entre
as que empatam estatisticamente com a melhor), deixando de fora um estado inteiro por vez
(leave-one-state-out: governador, Senado e presidente de uma UF saem juntos,
porque o erro de um estado contamina as três disputas dele).

Limite, dito sem rodeio: todas as disputas são da MESMA eleição. O erro
nacional comum a 2026 está em todos os estados; validar deixando um estado de
fora não remove esse componente, então a calibração estimada aqui descreve
2026 e tende a ser OTIMISTA para uma eleição futura. É por isso que a
publicação de probabilidades exige ≥ 2 eleições na categoria (config.gates).
"""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np

VARIANTS = ("sem_sistematico", "agrupado", "horizonte", "covariaveis")
COMPLEXITY = {"sem_sistematico": 0, "agrupado": 1, "horizonte": 2, "covariaveis": 3}


@dataclass
class ErrorSet:
    lam: np.ndarray        # (R, Dmax) autovalores de A (0 no preenchimento)
    e2: np.ndarray         # (R, Dmax) (Uᵀe)² (0 no preenchimento)
    mask: np.ndarray       # (R, Dmax) bool
    cat: np.ndarray        # (R,) índice da categoria
    H: np.ndarray          # (R,) horizonte em dias
    X: np.ndarray          # (R, P) covariáveis padronizadas
    group: np.ndarray      # (R,) grupo da validação cruzada (UF)
    cats: list[str]
    logdetL: np.ndarray    # (R,) log|L| do branqueamento pela estrutura do erro (Jacobiano)

    @property
    def R(self) -> int:
        return self.lam.shape[0]

    def subset(self, idx: np.ndarray) -> "ErrorSet":
        return ErrorSet(self.lam[idx], self.e2[idx], self.mask[idx], self.cat[idx], self.H[idx],
                        self.X[idx], self.group[idx], self.cats, self.logdetL[idx])


def build_error_set(records: list[dict], cats: list[str], structure: str = "iso") -> ErrorSet:
    """records: e (D,), A (D,D), M (D,D) opcional, cat, H, x (P,), group.

    `structure` é a FORMA da covariância do erro sistemático, Σ_sys = s² · M:
      "iso"  — M = I: o mesmo erro em toda razão log (a primeira versão);
      "mult" — M = diag(1/p̄_k) + (1/p̄_r) 11ᵀ, a forma multinomial nas frações
               PREVISTAS p̄ (nunca nas do resultado): o erro comum se comporta
               como amostragem extra de tamanho efetivo 1/s², e na fração de um
               candidato vale ≈ s·√(p(1−p)). Um candidato de 5% erra menos
               pontos que um de 45%, como nas urnas.
    Branqueando por L (M = L Lᵀ): e' = L⁻¹e ~ N(0, L⁻¹AL⁻ᵀ + s² I), e a
    densidade de e soma o Jacobiano −log|L|.
    """
    Dmax = max(len(r["e"]) for r in records)
    R = len(records)
    lam = np.zeros((R, Dmax)); e2 = np.zeros((R, Dmax)); mask = np.zeros((R, Dmax), dtype=bool)
    ldl = np.zeros(R)
    for i, r in enumerate(records):
        A = np.atleast_2d(np.asarray(r["A"], dtype=float))
        e = np.asarray(r["e"], dtype=float)
        if structure == "mult":
            L = np.linalg.cholesky(np.atleast_2d(np.asarray(r["M"], dtype=float)))
            Li = np.linalg.inv(L)
            e = Li @ e
            A = Li @ A @ Li.T
            ldl[i] = float(np.sum(np.log(np.diag(L))))
        w, U = np.linalg.eigh(0.5 * (A + A.T))
        w = np.maximum(w, 0.0)
        d = e.size
        lam[i, :d] = w
        e2[i, :d] = (U.T @ e) ** 2
        mask[i, :d] = True
    X = np.array([r["x"] for r in records], dtype=float)
    return ErrorSet(lam, e2, mask, np.array([cats.index(r["cat"]) for r in records]),
                    np.array([r["H"] for r in records], dtype=float), X,
                    np.array([r["group"] for r in records]), cats, ldl)


_NODES: dict[float, np.ndarray] = {}


def w_nodes(nu: float, k: int = 64) -> np.ndarray:
    """Nós de quadratura em w ~ Gamma(ν/2, taxa ν/2): quantis nos pontos médios (determinísticos).

    Quantis de 200.000 sorteios com semente fixa; o erro de quadratura na
    log-densidade é medido no teste `test_quadrature_accuracy`.
    """
    if nu >= 500:
        return np.ones(1)
    if nu not in _NODES:
        rng = np.random.default_rng(7)
        big = np.sort(rng.gamma(nu / 2, 2 / nu, size=200_000))
        _NODES[nu] = np.quantile(big, (np.arange(k) + 0.5) / k)
    return _NODES[nu]


def record_logdens(es: ErrorSet, s: np.ndarray, nu: float) -> np.ndarray:
    """log p(e_r) para cada registro, com escala sistemática s_r (R,)."""
    w = w_nodes(nu)
    var = es.lam[:, None, :] + (s[:, None, None] ** 2) / w[None, :, None]     # (R, K, Dmax)
    var = np.where(es.mask[:, None, :], np.maximum(var, 1e-300), 1.0)
    term = -0.5 * (np.log(2 * np.pi * var) + es.e2[:, None, :] / var)
    term = np.where(es.mask[:, None, :], term, 0.0)
    lk = term.sum(axis=2)                                                      # (R, K)
    mx = lk.max(axis=1, keepdims=True)
    return (mx[:, 0] + np.log(np.mean(np.exp(lk - mx), axis=1))) - es.logdetL


@dataclass
class CalibFit:
    variant: str
    nu: float
    alpha0: float
    alpha: np.ndarray       # (ncat,)
    beta: float
    gamma: np.ndarray       # (P,)
    cats: list[str]
    n_records: int
    structure: str = "iso"

    def scale(self, cat: str | None, H: float, x: np.ndarray | None = None) -> float:
        if self.variant == "sem_sistematico":
            return 0.0
        a = self.alpha[self.cats.index(cat)] if (cat in self.cats) else self.alpha0
        b = self.beta if self.variant in ("horizonte", "covariaveis") else 0.0
        g = float(self.gamma @ x) if (self.variant == "covariaveis" and x is not None) else 0.0
        return float(np.exp(a + b * np.log1p(H / 7.0) + g))

    def to_json(self) -> dict:
        return {"variant": self.variant, "structure": self.structure, "nu": self.nu, "alpha0": self.alpha0,
                "alpha": dict(zip(self.cats, [float(v) for v in self.alpha])),
                "beta": self.beta, "gamma": [float(v) for v in self.gamma], "n_records": self.n_records}


def _pack(cf: "CalibFit") -> np.ndarray:
    parts = [np.array([cf.alpha0]), cf.alpha]
    if cf.variant in ("horizonte", "covariaveis"):
        parts.append(np.array([cf.beta]))
    if cf.variant == "covariaveis":
        parts.append(cf.gamma)
    return np.concatenate(parts)


def _unpack(theta, variant, ncat, P):
    a0 = theta[0]
    al = theta[1:1 + ncat]
    i = 1 + ncat
    beta = theta[i] if variant in ("horizonte", "covariaveis") else 0.0
    i += 1 if variant in ("horizonte", "covariaveis") else 0
    gam = theta[i:i + P] if variant == "covariaveis" else np.zeros(P)
    return a0, al, beta, gam


def _scales(es: ErrorSet, a0, al, beta, gam):
    return np.exp(al[es.cat] + beta * np.log1p(es.H / 7.0) + es.X @ gam)


def _objective(theta, es, variant, nu, omega, present):
    ncat, P = len(es.cats), es.X.shape[1]
    a0, al, beta, gam = _unpack(theta, variant, ncat, P)
    s = _scales(es, a0, al, beta, gam)
    ll = record_logdens(es, s, nu).sum()
    lp = -0.5 * ((a0 - np.log(0.05)) / 1.5) ** 2
    # Categorias sem dado ficam presas a α_0 pela própria priori de agrupamento.
    lp += -0.5 * np.sum(((al - a0) / omega) ** 2)
    lp += -0.5 * beta ** 2 - 0.5 * np.sum((gam / 0.5) ** 2)
    return -(ll + lp)


def nelder_mead(f, x0, step=0.5, iters=1500, tol=1e-7):
    """Nelder–Mead determinístico (coeficientes padrão), sem dependência externa."""
    n = x0.size
    simplex = [x0] + [x0 + step * np.eye(n)[i] for i in range(n)]
    vals = [f(x) for x in simplex]
    for _ in range(iters):
        order = np.argsort(vals)
        simplex = [simplex[i] for i in order]; vals = [vals[i] for i in order]
        if abs(vals[-1] - vals[0]) < tol * (1 + abs(vals[0])):
            break
        c = np.mean(simplex[:-1], axis=0)
        xr = c + (c - simplex[-1]); fr = f(xr)
        if fr < vals[0]:
            xe = c + 2 * (c - simplex[-1]); fe = f(xe)
            simplex[-1], vals[-1] = (xe, fe) if fe < fr else (xr, fr)
        elif fr < vals[-2]:
            simplex[-1], vals[-1] = xr, fr
        else:
            xc = c + 0.5 * (simplex[-1] - c); fc = f(xc)
            if fc < vals[-1]:
                simplex[-1], vals[-1] = xc, fc
            else:
                simplex = [simplex[0]] + [simplex[0] + 0.5 * (x - simplex[0]) for x in simplex[1:]]
                vals = [vals[0]] + [f(x) for x in simplex[1:]]
    i = int(np.argmin(vals))
    return simplex[i], vals[i]


def fit_calibration(es: ErrorSet, variant: str, nu: float, omega: float, x0: np.ndarray | None = None) -> CalibFit:
    ncat, P = len(es.cats), es.X.shape[1]
    if variant == "sem_sistematico":
        return CalibFit(variant, nu, -np.inf, np.full(ncat, -np.inf), 0.0, np.zeros(P), es.cats, es.R)
    npar = 1 + ncat + (1 if variant in ("horizonte", "covariaveis") else 0) + (P if variant == "covariaveis" else 0)
    present = np.bincount(es.cat, minlength=ncat) > 0
    f = lambda th: _objective(th, es, variant, nu, omega, present)
    if x0 is None:
        x0 = np.zeros(npar); x0[0] = np.log(0.05); x0[1:1 + ncat] = np.log(0.05)
        best, val = nelder_mead(f, x0)
        best, val = nelder_mead(f, best, step=0.2)      # reinício: NM para cedo em vales estreitos
    else:                                               # partida a quente (dobras da validação cruzada)
        best, val = nelder_mead(f, x0, step=0.15)
    a0, al, beta, gam = _unpack(best, variant, ncat, P)
    return CalibFit(variant, nu, float(a0), np.array(al, dtype=float), float(beta), np.array(gam, dtype=float),
                    es.cats, es.R)


def loso_logdens(es: ErrorSet, variant: str, nu: float, omega: float) -> tuple[np.ndarray, dict]:
    """Densidade preditiva de cada registro com a calibração ajustada SEM o grupo dele."""
    out = np.empty(es.R)
    fits = {}
    full = fit_calibration(es, variant, nu, omega)
    x0 = None if variant == "sem_sistematico" else _pack(full)
    for g in sorted(set(es.group.tolist())):
        tr = np.where(es.group != g)[0]
        te = np.where(es.group == g)[0]
        cf = fit_calibration(es.subset(tr), variant, nu, omega, x0=x0)
        fits[g] = cf
        sub = es.subset(te)
        s = np.array([cf.scale(es.cats[c], h, x) for c, h, x in zip(sub.cat, sub.H, sub.X)])
        out[te] = record_logdens(sub, s, nu)
    return out, fits


def select(records: list[dict], cats: list[str], nu_grid: list[float], omega: float, variants=VARIANTS,
           structures=("iso", "mult")) -> dict:
    """Tabela de seleção (fora da amostra) sobre forma × variante × ν, e a melhor combinação."""
    table = []
    best = None
    cache = {}
    for st in structures:
        es = build_error_set(records, cats, st)
        for v in variants:
            grid = [1000.0] if v == "sem_sistematico" else nu_grid
            if v == "sem_sistematico" and st != structures[0]:
                continue                      # sem erro sistemático, a forma não importa
            for nu in grid:
                ld, fits = loso_logdens(es, v, float(nu), omega)
                for f in fits.values():
                    f.structure = st
                row = {"structure": st, "variant": v, "nu": float(nu), "loso_mean_logdens": float(ld.mean()),
                       "loso_sum_logdens": float(ld.sum()), "n": int(es.R)}
                table.append(row)
                cache[(st, v, float(nu))] = (ld, fits)
                if best is None or row["loso_sum_logdens"] > best["loso_sum_logdens"]:
                    best = row
    # Regra de um erro-padrão (Breiman et al., 1984; Hastie, Tibshirani & Friedman,
    # §7.10): entre as combinações cuja densidade fora da amostra fica a menos de
    # UM erro-padrão (pareado, por registro) da melhor, fica a mais SIMPLES. Sem
    # isso a seleção de 2026 escolhia as covariáveis por 0,008 nat/registro — um
    # empate — e o 2º turno presidencial, com 22 institutos (2,6 dp acima do que a
    # calibração viu), extrapolava um coeficiente mal identificado.
    ld_best = cache[(best["structure"], best["variant"], best["nu"])][0]
    for row in table:
        d = ld_best - cache[(row["structure"], row["variant"], row["nu"])][0]
        se = float(np.std(d, ddof=1) / np.sqrt(d.size)) if d.size > 1 else 0.0
        row["diff_vs_best"] = float(d.mean())
        row["se_diff"] = se
        # Densidade não finita (ex.: previsão pontual sem erro sistemático, −∞)
        # nunca empata com nada: um EP infinito não é "dentro de um EP".
        row["within_1se"] = bool(np.all(np.isfinite(d)) and np.isfinite(se) and d.mean() <= se)
    cand = [r for r in table if r["within_1se"]]
    chosen = min(cand, key=lambda r: (COMPLEXITY[r["variant"]], -r["loso_sum_logdens"]))
    return {"table": table, "best": chosen, "best_raw": best, "rule": "um_erro_padrao", "cache": cache}
