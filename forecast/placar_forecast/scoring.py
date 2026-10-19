"""Métricas de avaliação de previsões probabilísticas.

  · erro absoluto da mediana (p.p.) — exatidão da estimativa pontual;
  · CRPS (p.p.) — escore contínuo ranqueado, avalia a distribuição inteira da
    fração de cada candidato; na mesma unidade do erro absoluto e igual a ele
    quando a previsão é um ponto. Estimador por amostras:
        CRPS = E|X − y| − ½ E|X − X'|;
  · cobertura dos intervalos centrais de 50%, 80% e 95%;
  · PIT, F(y): uniforme em [0, 1] se a previsão é calibrada;
  · Brier e log-escore de eventos (quem fica em 1º; quem fica entre os dois
    primeiros — Senado elege dois; se a disputa termina no 1º turno).

Acertar o vencedor NÃO é medido aqui como "acerto": um modelo que diz 99% e
acerta tem Brier melhor que um que diz 60% e acerta, e muito pior quando erra.
As probabilidades são comparadas com as frequências observadas (confiabilidade).
"""

from __future__ import annotations

import numpy as np

LOG_FLOOR = 1e-4   # piso do log-escore: um evento a que o modelo deu 0 vale log(1e-4) e é CONTADO


def crps_samples(x: np.ndarray, y: float) -> float:
    x = np.sort(np.asarray(x, dtype=float))
    n = x.size
    term1 = np.mean(np.abs(x - y))
    i = np.arange(1, n + 1)
    term2 = np.sum((2 * i - n - 1) * x) / (n * n)
    return float(term1 - term2)


def score_record(shares: np.ndarray, outcome: np.ndarray, n_cand: int, race: str, round_: int) -> dict:
    """Escores de uma previsão (sorteios de frações) contra o resultado (frações)."""
    pct = shares * 100
    out = outcome * 100
    abs_err, crps, cover, pit = [], [], {"50": [], "80": [], "95": []}, []
    for k in range(n_cand):
        col = pct[:, k]
        med = float(np.median(col))
        abs_err.append(abs(med - out[k]))
        crps.append(crps_samples(col[:: max(1, col.size // 20000)], out[k]))
        for lvl, lo, hi in (("50", 0.25, 0.75), ("80", 0.1, 0.9), ("95", 0.025, 0.975)):
            a, b = np.quantile(col, [lo, hi])
            cover[lvl].append(bool(a <= out[k] <= b))
        pit.append(float(np.mean(col <= out[k])))
    cand = shares[:, :n_cand]
    rank = np.argsort(-cand, axis=1)
    p_first = np.bincount(rank[:, 0], minlength=n_cand) / cand.shape[0]
    true_first = int(np.argmax(outcome[:n_cand]))
    o_first = np.zeros(n_cand); o_first[true_first] = 1
    ev = {
        "brier_first": float(np.sum((p_first - o_first) ** 2)),
        "log_first": float(np.log(max(p_first[true_first], LOG_FLOOR))),
        "p_first": p_first.tolist(),
        "o_first": o_first.tolist(),
        "zero_prob_first": bool(p_first[true_first] == 0),
    }
    if n_cand >= 3:
        top2 = np.array([np.mean((rank[:, 0] == k) | (rank[:, 1] == k)) for k in range(n_cand)])
        true_top2 = set(np.argsort(-outcome[:n_cand])[:2].tolist())
        o2 = np.array([1.0 if k in true_top2 else 0.0 for k in range(n_cand)])
        ev["brier_top2"] = float(np.mean((top2 - o2) ** 2))
        ev["p_top2"] = top2.tolist(); ev["o_top2"] = o2.tolist()
    if round_ == 1 and race in ("presidente", "governador"):
        p_dec = float(np.mean(shares.max(axis=1) >= 0.5))
        o_dec = float(outcome.max() >= 0.5)
        ev["brier_decided"] = (p_dec - o_dec) ** 2
        ev["p_decided"] = p_dec; ev["o_decided"] = o_dec
    return {
        "abs_err": abs_err,
        "crps": crps,
        "cover": cover,
        "pit": pit,
        "events": ev,
    }


def reliability(pairs: list[tuple[float, float]], bins: int = 10) -> list[dict]:
    """Diagrama de confiabilidade: probabilidade média prevista × frequência observada, por faixa."""
    if not pairs:
        return []
    p = np.array([a for a, _ in pairs]); o = np.array([b for _, b in pairs])
    edges = np.linspace(0, 1, bins + 1)
    rows = []
    for i in range(bins):
        m = (p >= edges[i]) & ((p < edges[i + 1]) if i < bins - 1 else (p <= edges[i + 1]))
        if not m.any():
            continue
        rows.append({"lo": float(edges[i]), "hi": float(edges[i + 1]), "n": int(m.sum()),
                     "p_mean": float(p[m].mean()), "freq": float(o[m].mean())})
    return rows


def pit_histogram(pits: list[float], bins: int = 10) -> list[int]:
    h, _ = np.histogram(np.clip(pits, 0, 1), bins=bins, range=(0, 1))
    return h.astype(int).tolist()
