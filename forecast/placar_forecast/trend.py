"""MODELO DE TENDÊNCIA DA MÉDIA — a média do site (10 pesquisas) e para onde ela anda.

Pedido do criador (18/10/2026): partir da média que o site publica — as 10
pesquisas mais recentes, no máximo 2 por instituto — e da TENDÊNCIA dessa média
em relação às janelas anteriores, projetar o dia da eleição e dizer quem
provavelmente vence e com que chance.

A série é a do próprio site: `computeAverage` (src/lib/average.ts) já calcula
`trend`, a mesma regra aplicada para trás a cada 3 dias — o que a média marcava
em cada data. O exportador a entrega; aqui nada é recalculado.

  1. Frações na data de referência: a média publicada (o último ponto da série).
  2. Inclinação: mínimos quadrados sobre os pontos da série nos últimos
     L dias, na escala log-razão (ALR) — a mesma escala do resto da previsão,
     que mantém as frações entre 0 e 100% e somando 100%.
  3. Projeção para o dia da eleição, H dias à frente:
         y_E = y_T + φ · inclinação · H
     φ é o AMORTECIMENTO: φ = 1 estende a tendência inteira; φ = 0 é a média
     de hoje parada (a "média do site" do backtest). φ e L são escolhidos pelo
     desempenho fora da amostra, não por gosto — tendência de pesquisa nem
     sempre continua.
  4. Incerteza e probabilidade: o erro desse procedimento contra as urnas é
     calibrado exatamente como o dos outros métodos (calibration.py), e a
     chance de vitória é a fração das simulações em que o candidato termina
     na frente.

Senado: a série do site é bruta (dois votos, soma ~200); cada ponto é posto em
parte das menções dividindo pela soma dos candidatos naquela data.
"""

from __future__ import annotations

import datetime as dt

import numpy as np

from .transforms import alr, continuity, inv_alr


def _days(a: str, b: str) -> int:
    return (dt.date.fromisoformat(b) - dt.date.fromisoformat(a)).days


def series_matrix(site_avg: dict, candidate_ids: list[str], include_rest: bool, race: str,
                  ref_date: str, lookback_days: int) -> tuple[list[str], np.ndarray] | None:
    """Datas e frações (n_datas, K) da média do site nos últimos `lookback_days`."""
    by_id = {c["candidate_id"]: {p["date"]: p["avg"] for p in (c.get("trend") or [])}
             for c in site_avg["candidates"] if c.get("candidate_id")}
    if any(c not in by_id for c in candidate_ids):
        return None
    start = (dt.date.fromisoformat(ref_date) - dt.timedelta(days=lookback_days)).isoformat()
    dates = sorted(set.intersection(*[set(by_id[c]) for c in candidate_ids]))
    dates = [d for d in dates if start <= d <= ref_date]
    if not dates:
        return None
    totals = {}
    if race == "senador":
        for d in dates:
            totals[d] = sum(v[d] for v in by_id.values() if d in v)
    rows = []
    for d in dates:
        tot = totals.get(d, 100.0) or 100.0
        v = [by_id[c][d] / tot for c in candidate_ids]
        if include_rest:
            rows.append(v + [max(1e-4, 1 - sum(v))])
        else:
            s = sum(v)
            rows.append([x / s for x in v])
    return dates, np.array(rows)


def project(site_avg: dict, candidate_ids: list[str], include_rest: bool, ref: int, race: str,
            ref_date: str, horizon_days: float, lookback_days: int, damping: float) -> dict | None:
    """Ponto projetado (frações) e a tendência medida, ou None se a série não basta."""
    sm = series_matrix(site_avg, candidate_ids, include_rest, race, ref_date, lookback_days)
    if sm is None:
        return None
    dates, shares = sm
    # Correção de continuidade só onde há fração zero: a média publicada tem de
    # sair idêntica no ponto de hoje (φ = 0 é exatamente a média do site).
    y = np.stack([alr(continuity(s, 2000) if np.any(s <= 0) else s, ref) for s in shares])
    t = np.array([_days(dates[0], d) for d in dates], dtype=float)
    if len(dates) >= 3 and np.ptp(t) > 0:
        tc = t - t.mean()
        slope = (tc[:, None] * (y - y.mean(axis=0))).sum(axis=0) / (tc ** 2).sum()
    else:
        slope = np.zeros(y.shape[1])
    y_now = y[-1]
    # A série termina na última pesquisa, não na data de referência: a projeção
    # anda os dias desde o último ponto até a eleição.
    h_total = horizon_days + _days(dates[-1], ref_date)
    y_end = y_now + damping * slope * h_total
    now = inv_alr(y_now, ref)
    week = inv_alr(y_now + slope * 7, ref)
    return {
        "series_from": dates[0],
        "series_to": dates[-1],
        "points": len(dates),
        "y_now": y_now,
        "y_end": y_end,
        "shares_now": now,
        "shares_end": inv_alr(y_end, ref),
        # Tendência em pontos percentuais por semana, por categoria (para exibir).
        "pp_per_week": (week - now) * 100,
    }
