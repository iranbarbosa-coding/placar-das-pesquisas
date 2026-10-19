"""Conjunto de entrada de uma disputa: elegibilidade, deduplicação e observações.

Recebe o JSON do exportador (`scripts/forecast/export-inputs.mjs`), que já
aplicou as regras do site (incompleta, municipal, Senado de dois votos, votos
válidos). Aqui entram as regras PRÓPRIAS da previsão, cada exclusão registrada
com o motivo — nada some em silêncio:

  indisponivel_na_data     divulgada (ou fim de campo + defasagem) depois da data de referência
  campo_posterior_a_data   fim de campo depois da data de referência (trava redundante)
  fora_da_janela           campo mais antigo que `window_days`
  par_diferente            2º turno: a pesquisa não testou exatamente o par das urnas
  candidato_nao_resolvido  um nome do par sem `candidate_id` (o exportador não adivinha)
  percentual_invalido      percentual fora de [0, 100], não finito, ou soma > 100,5
  elenco_incompleto        1º turno: falta um candidato acompanhado
  mesma_amostra            outra pergunta da MESMA operação de campo já entrou
  provavel_republicacao    mesmo instituto, mesmos números e mesma amostra a ≤7 dias

A unidade estatística é a OPERAÇÃO DE CAMPO, não a pergunta: dois cenários do
mesmo levantamento compartilham os entrevistados e não são informação
independente. O banco já funde fontes que publicam a mesma operação (decisão de
04/10, `mergePolls`); `mesma_amostra` cuida de cenários dentro dela.
"""

from __future__ import annotations

import datetime as dt
import hashlib
import json
from dataclasses import dataclass, field

import numpy as np

from .transforms import alr, alr_sampling_cov, continuity


def parse_date(s: str) -> dt.date:
    return dt.date.fromisoformat(s)


def days_between(a: str, b: str) -> int:
    return (parse_date(b) - parse_date(a)).days


def add_days(s: str, n: int) -> str:
    return (parse_date(s) + dt.timedelta(days=n)).isoformat()


def load_export(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        d = json.load(f)
    if d.get("schema_version") != 1:
        raise ValueError(f"exportação com schema_version inesperado: {d.get('schema_version')}")
    return d


@dataclass
class RaceData:
    contest: str
    round: int
    ref_date: str
    candidate_ids: list[str]          # categorias acompanhadas, na ordem do vetor
    candidate_names: list[str]
    include_rest: bool                # última categoria = "demais"
    ref: int                          # índice da categoria de referência da ALR
    t0: str                           # dia zero da grade
    t: np.ndarray                     # (N,) dia de cada observação (meio do campo)
    t_ref: int                        # dia da data de referência
    y: np.ndarray                     # (N, D) ALR
    S: np.ndarray                     # (N, D, D) covariância amostral
    pollster: np.ndarray              # (N,) índice do instituto
    pollsters: list[str]
    poll_ids: list[str]
    shares: np.ndarray                # (N, K) frações observadas (sem correção)
    n_eff: np.ndarray                 # (N,)
    n_imputed: np.ndarray             # (N,) bool
    pbar: np.ndarray                  # (K,) frações médias usadas na covariância
    included: list[dict] = field(default_factory=list)
    exclusions: list[dict] = field(default_factory=list)

    @property
    def D(self) -> int:
        return self.y.shape[1]

    @property
    def K(self) -> int:
        return self.shares.shape[1]

    def labels(self) -> list[str]:
        return self.candidate_names + (["Demais candidatos"] if self.include_rest else [])

    def dataset_hash(self) -> str:
        """Hash canônico do que o modelo efetivamente consome (entrada reprodutível)."""
        payload = {
            "contest": self.contest,
            "round": self.round,
            "ref_date": self.ref_date,
            "candidates": self.candidate_ids,
            "include_rest": self.include_rest,
            "polls": [
                {
                    "id": pid,
                    "t": int(t),
                    "pollster": self.pollsters[j],
                    "shares": [round(float(x), 6) for x in sh],
                    "n_eff": round(float(n), 3),
                }
                for pid, t, j, sh, n in zip(self.poll_ids, self.t, self.pollster, self.shares, self.n_eff)
            ],
        }
        return hashlib.sha256(json.dumps(payload, sort_keys=True, ensure_ascii=False).encode()).hexdigest()


class InsufficientData(Exception):
    """A disputa não tem pesquisas elegíveis suficientes para ajustar o modelo."""


def _valid_pcts(p: dict) -> bool:
    vals = [r["pct_result_basis"] for r in p["results"]] + [p.get("others_result_basis") or 0.0]
    if any(v is None or not np.isfinite(v) or v < 0 or v > 100 for v in vals):
        return False
    raw = [r["pct"] for r in p["results"]]
    if any(v is None or not np.isfinite(v) or v < 0 or v > 100 for v in raw):
        return False
    return sum(vals) <= 100.5


def _midpoint(p: dict) -> str:
    end = p["fieldwork_end"] or p["published_date"]
    start = p["fieldwork_start"] or end
    if start > end:  # datas invertidas na fonte: o fim é o que vale (decisão de 03/10)
        start = end
    return add_days(start, days_between(start, end) // 2)


def select_polls(export: dict, contest: str, round_: int, ref_date: str, cfg: dict,
                 pairing: list[str] | None = None) -> tuple[list[dict], list[dict]]:
    """Pesquisas elegíveis da disputa na data, e o registro de exclusões."""
    dcfg = cfg["data"]
    window_start = add_days(ref_date, -int(dcfg["window_days"]))
    included: list[dict] = []
    excluded: list[dict] = []

    def out(p: dict, reason: str) -> None:
        excluded.append({"id": p["id"], "pollster": p["pollster"], "fieldwork_end": p["fieldwork_end"], "reason": reason})

    for p in sorted(export["polls"], key=lambda r: r["id"]):
        if p["contest"] != contest or p["round"] != round_:
            continue
        if p["exclusion"]:
            out(p, p["exclusion"])
            continue
        if not p["available_from"] or p["available_from"] > ref_date:
            out(p, "indisponivel_na_data")
            continue
        end = p["fieldwork_end"] or p["published_date"]
        if end > ref_date:
            out(p, "campo_posterior_a_data")
            continue
        if end < window_start:
            out(p, "fora_da_janela")
            continue
        if pairing is not None:
            ids = [r["candidate_id"] for r in p["results"]]
            if None in ids and set(i for i in ids if i) <= set(pairing):
                out(p, "candidato_nao_resolvido")
                continue
            if sorted(ids) != sorted(pairing):
                out(p, "par_diferente")
                continue
        if not _valid_pcts(p):
            out(p, "percentual_invalido")
            continue
        included.append(p)

    # Uma pergunta por operação de campo: a que mais nomes publicou, desempate pelo id.
    by_survey: dict[str, list[dict]] = {}
    for p in included:
        by_survey.setdefault(p["survey_key"], []).append(p)
    kept: list[dict] = []
    for key in sorted(by_survey):
        group = sorted(by_survey[key], key=lambda r: (-len(r["results"]), r["id"]))
        kept.append(group[0])
        for p in group[1:]:
            out(p, "mesma_amostra")

    # Republicação: mesmo instituto e mesmos números a ≤7 dias, mesma amostra.
    kept.sort(key=lambda r: (r["fieldwork_end"] or r["published_date"], r["id"]))
    final: list[dict] = []
    seen: dict[tuple, str] = {}
    for p in kept:
        sig = (p["pollster_key"], p["sample_size"],
               tuple(sorted((r["candidate_id"] or r["name"], round(r["pct"], 1)) for r in p["results"])))
        end = p["fieldwork_end"] or p["published_date"]
        if sig in seen and days_between(seen[sig], end) <= 7:
            out(p, "provavel_republicacao")
            continue
        seen[sig] = end
        final.append(p)
    return final, excluded


def choose_tracked(polls: list[dict], cfg: dict) -> list[str]:
    """1º turno: candidatos acompanhados individualmente, só a partir das PESQUISAS.

    Nunca a partir do resultado: no backtest isso seria vazamento. Critério:
    aparece em ≥ `min_presence` das pesquisas e tem fração média ≥ `min_share`
    nelas; no máximo `max_tracked`, pela média. O resto vira "demais".
    """
    dcfg = cfg["data"]
    stats: dict[str, list[float]] = {}
    for p in polls:
        for r in p["results"]:
            if r["candidate_id"]:
                stats.setdefault(r["candidate_id"], []).append(r["pct_result_basis"] / 100)
    n = len(polls)
    rows = [(cid, float(np.mean(v)), len(v) / n) for cid, v in stats.items()]
    rows = [r for r in rows if r[2] >= dcfg["min_presence"] and r[1] >= dcfg["min_share"]]
    rows.sort(key=lambda r: (-r[1], r[0]))
    return [r[0] for r in rows[: int(dcfg["max_tracked"])]]


def build_race(export: dict, contest: str, round_: int, ref_date: str, cfg: dict,
               pairing: list[str] | None = None, tracked: list[str] | None = None) -> RaceData:
    polls, excluded = select_polls(export, contest, round_, ref_date, cfg, pairing)
    dcfg = cfg["data"]
    if pairing is not None:
        tracked = list(pairing)
    elif tracked is None:
        tracked = choose_tracked(polls, cfg)
    if len(tracked) < 2:
        raise InsufficientData(f"{contest}: menos de dois candidatos acompanháveis")

    usable = []
    for p in polls:
        ids = {r["candidate_id"] for r in p["results"]}
        if not set(tracked) <= ids:
            excluded.append({"id": p["id"], "pollster": p["pollster"], "fieldwork_end": p["fieldwork_end"], "reason": "elenco_incompleto"})
            continue
        usable.append(p)
    if len(usable) < int(cfg["gates"]["min_polls_fit"]):
        raise InsufficientData(f"{contest}: {len(usable)} pesquisas elegíveis (mínimo {cfg['gates']['min_polls_fit']})")

    names_by_id = {}
    for c in export.get("candidates", []):
        names_by_id[c["candidate_id"]] = c["canonical"]
    for p in usable:
        for r in p["results"]:
            if r["candidate_id"] and r["candidate_id"] not in names_by_id:
                names_by_id[r["candidate_id"]] = r["name"]

    raw = []
    for p in usable:
        by = {r["candidate_id"]: r["pct_result_basis"] / 100 for r in p["results"] if r["candidate_id"]}
        v = [by[c] for c in tracked]
        raw.append(v + [max(0.0, 1.0 - sum(v))])
    raw = np.array(raw)
    include_rest = pairing is None and float(raw[:, -1].mean()) >= dcfg["min_rest_share"]
    shares = raw if include_rest else raw[:, :-1] / raw[:, :-1].sum(axis=1, keepdims=True)

    sizes = np.array([p["sample_size"] or np.nan for p in usable], dtype=float)
    vf = np.array([p["valid_fraction"] if p["valid_fraction"] else np.nan for p in usable], dtype=float)
    known = sizes[np.isfinite(sizes)]
    imputed = ~np.isfinite(sizes)
    if imputed.any():
        if known.size == 0:
            fill = float(dcfg["imputed_n_floor"])
        else:
            fill = max(float(dcfg["imputed_n_floor"]), float(np.quantile(known, dcfg["imputed_n_quantile"])))
        sizes = np.where(imputed, fill, sizes)
    vf = np.where(np.isfinite(vf), vf, np.nanmedian(vf) if np.isfinite(vf).any() else 0.85)
    n_eff = np.maximum(sizes * vf, float(dcfg["min_n_eff"]))

    pbar = shares.mean(axis=0)
    pbar = np.maximum(pbar, 1e-3)
    pbar = pbar / pbar.sum()
    ref = int(np.argmax(pbar[: len(tracked)]))

    mids = [_midpoint(p) for p in usable]
    t0 = min(mids)
    t = np.array([days_between(t0, m) for m in mids], dtype=int)
    t_ref = days_between(t0, ref_date)

    y = np.stack([alr(continuity(sh, n, dcfg["continuity"]), ref) for sh, n in zip(shares, n_eff)])
    S = np.stack([alr_sampling_cov(pbar, ref, n) for n in n_eff])

    pollster_names = sorted({p["pollster_key"] for p in usable})
    display = {}
    for p in usable:
        display.setdefault(p["pollster_key"], p["pollster"])
    pidx = {k: i for i, k in enumerate(pollster_names)}

    included_meta = [
        {
            "id": p["id"],
            "pollster": p["pollster"],
            "fieldwork_start": p["fieldwork_start"],
            "fieldwork_end": p["fieldwork_end"],
            "published_date": p["published_date"],
            "available_from": p["available_from"],
            "sample_size": p["sample_size"],
            "n_eff": round(float(n), 1),
            "n_imputado": bool(im),
            "tse_registration": p["tse_registration"],
            "source_url": p["source_url"],
            "shares": [round(float(x) * 100, 2) for x in sh],
        }
        for p, n, im, sh in zip(usable, n_eff, imputed, shares)
    ]

    return RaceData(
        contest=contest,
        round=round_,
        ref_date=ref_date,
        candidate_ids=list(tracked),
        candidate_names=[names_by_id.get(c, c) for c in tracked],
        include_rest=include_rest,
        ref=ref,
        t0=t0,
        t=t,
        t_ref=t_ref,
        y=y,
        S=S,
        pollster=np.array([pidx[p["pollster_key"]] for p in usable], dtype=int),
        pollsters=[display[k] for k in pollster_names],
        poll_ids=[p["id"] for p in usable],
        shares=shares,
        n_eff=n_eff,
        n_imputed=imputed,
        pbar=pbar,
        included=included_meta,
        exclusions=sorted(excluded, key=lambda e: (e["reason"], e["id"])),
    )


def outcome_shares(export: dict, race: RaceData) -> np.ndarray | None:
    """O resultado oficial no MESMO vetor de categorias do modelo (frações), ou None.

    Só para pontuar a previsão depois do fato. Nunca entra no ajuste.
    """
    res = next((o for o in export.get("official_results", [])
                if o["contest"] == race.contest and o["round"] == race.round), None)
    if res is None:
        return None
    by = {c["candidate_id"]: c["pct"] / 100 for c in res["candidates"] if c["candidate_id"]}
    if any(c not in by for c in race.candidate_ids):
        return None
    v = [by[c] for c in race.candidate_ids]
    total = sum(c["pct"] for c in res["candidates"]) / 100
    if race.include_rest:
        return np.array(v + [max(0.0, total - sum(v))]) / total
    v = np.array(v)
    return v / v.sum()
