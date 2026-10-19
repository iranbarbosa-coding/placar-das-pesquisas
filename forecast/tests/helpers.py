"""Fábrica de exportações sintéticas para os testes (formato do exportador, schema 1)."""

from __future__ import annotations

import copy
import json
import os

import numpy as np

HERE = os.path.dirname(os.path.abspath(__file__))
CONFIG = os.path.join(HERE, "..", "config", "model-v1.json")


def cfg(**overrides) -> dict:
    with open(CONFIG, encoding="utf-8") as f:
        c = json.load(f)
    c = copy.deepcopy(c)
    c["ssm"].update({"chains": 4, "warmup": 300, "draws": 400})
    for k, v in overrides.items():
        c[k].update(v)
    return c


def poll(pid: str, end: str, a: float, b: float, *, pollster="Inst A", n=1000, start=None, round_=2,
         contest="governador:XX", ids=("c_a", "c_b"), extra=None, available=None, exclusion=None,
         others=0.0, sample=True) -> dict:
    res = [
        {"candidate_id": ids[0], "person_id": None, "name": "A", "party": None, "pct": a, "pct_result_basis": a},
        {"candidate_id": ids[1], "person_id": None, "name": "B", "party": None, "pct": b, "pct_result_basis": b},
    ]
    if extra:
        res += extra
    return {
        "id": pid, "contest": contest, "race": contest.split(":")[0], "uf": contest.split(":")[1], "round": round_,
        "scenario": "", "pollster": pollster, "pollster_key": pollster.lower(),
        "survey_key": f"{pollster.lower()}|{contest}|{end}|{n if sample else ''}|{pid if extra is None else ''}",
        "fieldwork_start": start or end, "fieldwork_end": end, "published_date": None,
        "available_from": available or end, "sample_size": n if sample else None, "margin_of_error": None,
        "tse_registration": None, "source_url": None, "exclusion": exclusion, "results": res,
        "others_result_basis": others, "others_pct": others, "undecided_pct": None, "blank_null_pct": None,
        "valid_fraction": 0.9,
    }


def export_doc(polls: list[dict], official=None) -> dict:
    return {"schema_version": 1, "as_of": None, "source": {"kind": "test", "polls_sha256": "x", "polls_generated_at": None},
            "polls": polls, "site_averages": [], "official_results": official or [], "candidates": [],
            "runoff_contests": [], "calendar": None}


def synthetic_runoff(rng: np.random.Generator, *, true_logit_path, house: dict[str, float], days: int,
                     polls_per_day: float, n=1000, bias=0.0, start="2026-09-01") -> list[dict]:
    """Pesquisas de 2º turno geradas do PRÓPRIO modelo: logit verdadeiro + casa + viés comum + amostragem."""
    import datetime as dt
    out = []
    t0 = dt.date.fromisoformat(start)
    names = sorted(house)
    k = 0
    for d in range(days):
        m = rng.poisson(polls_per_day)
        for _ in range(m):
            j = names[rng.integers(len(names))]
            lg = true_logit_path[d] + house[j] + bias
            p = 1 / (1 + np.exp(-lg))
            a = rng.binomial(n, p) / n * 100
            end = (t0 + dt.timedelta(days=d)).isoformat()
            out.append(poll(f"p{k:04d}", end, a, 100 - a, pollster=j, n=n))
            k += 1
    return out
