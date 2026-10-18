"""Validação histórica walk-forward, fora da amostra.

Para cada eleição com resultado oficial (hoje: 1º turno de 2026) e cada
horizonte h (90, 60, 30, 14, 7, 3 e 1 dia antes):

  1. T = dia da eleição − h. O banco é o VINTAGE de T (vintage.py): o
     `data/polls.json` do último commit antes do fim do dia T. Antes do
     primeiro vintage, reconstrução sobre o banco atual (marcada).
  2. O exportador roda SEM o arquivo de resultados (`--results none`): o
     conjunto de treino não contém o resultado nem por acidente — e um teste
     verifica isso.
  3. Os candidatos acompanhados saem das pesquisas disponíveis em T, nunca do
     resultado.
  4. O Modelo A é ajustado (com e sem efeitos casa); a posteriori em T e a
     volatilidade são guardadas em cache.
  5. Só depois, na etapa `evaluate`, o resultado oficial entra — para ajustar a
     calibração (deixando de fora o estado avaliado) e pontuar.

Etapa `fit` é a cara (minutos por disputa no presidencial); roda em paralelo e
é retomável: uma tarefa com cache válido não é refeita.
"""

from __future__ import annotations

import hashlib
import json
import os
import time
import traceback
from concurrent.futures import ProcessPoolExecutor, as_completed

import numpy as np

from . import data as D
from . import ssm
from .vintage import Vintage, export, list_vintages, vintage_for

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def task_seed(base: int, *parts: str) -> int:
    h = hashlib.sha256(("|".join([str(base), *parts])).encode()).hexdigest()
    return int(h[:8], 16)


def _bt_cfg(cfg: dict) -> dict:
    c = json.loads(json.dumps(cfg))
    c["ssm"].update(cfg["backtest_ssm"])
    return c


def plan(cfg: dict) -> list[dict]:
    b = cfg["backtest"]
    vints = list_vintages()
    rows = []
    for h in b["horizons_days"]:
        T = D.add_days(b["election_date"], -int(h))
        v = vintage_for(T, int(b["end_of_day_utc_offset_hours"]), vints)
        rows.append({"horizon": int(h), "ref_date": T, "vintage": v})
    return rows


def _fit_task(args) -> dict:
    export_path, contest, round_, ref_date, horizon, variant, cfg, cache_dir, vint = args
    key = f"{contest}|{ref_date}|{variant}"
    fname = os.path.join(cache_dir, hashlib.sha1(key.encode()).hexdigest()[:16])
    if os.path.exists(fname + ".json"):
        with open(fname + ".json", encoding="utf-8") as f:
            return json.load(f)
    rec = {"contest": contest, "round": round_, "ref_date": ref_date, "horizon": horizon, "variant": variant,
           "source": vint, "status": "ok"}
    t0 = time.time()
    try:
        ex = D.load_export(export_path)
        if ex.get("official_results"):
            raise RuntimeError("vazamento: o conjunto de treino contém resultados oficiais")
        race = D.build_race(ex, contest, round_, ref_date, cfg)
        seed = task_seed(cfg["seed"], contest, ref_date, variant)
        f = ssm.fit(race, cfg, seed, house_effects=(variant == "full"))
        mu = f.mu_ref.reshape(-1, race.D)
        srw = f.sigma_rw.reshape(-1)
        # Guarda 2.000 sorteios (afinamento regular, determinístico).
        step = max(1, mu.shape[0] // 2000)
        np.savez_compressed(fname + ".npz", mu_ref=mu[::step], sigma_rw=srw[::step])
        recent = [p for p in race.included if p["fieldwork_end"] and D.days_between(p["fieldwork_end"], ref_date) <= 30]
        disp = float(np.std(race.y[[race.poll_ids.index(p["id"]) for p in recent], 0])) if len(recent) >= 3 else None
        rec.update({
            "candidate_ids": race.candidate_ids,
            "candidate_names": race.candidate_names,
            "include_rest": race.include_rest,
            "ref": race.ref,
            "n_polls": len(race.poll_ids),
            "n_institutes": len(race.pollsters),
            "n_polls_30d": len(recent),
            "n_institutes_30d": len({p["pollster"] for p in recent}),
            "dispersion_30d": disp,
            "share_imputed_n": float(np.mean(race.n_imputed)),
            "last_fieldwork_end": max(p["fieldwork_end"] or "" for p in race.included),
            "dataset_sha256": race.dataset_hash(),
            "diagnostics": f.diagnostics,
            "posterior_mean": mu.mean(axis=0).tolist(),
            "posterior_cov": np.atleast_2d(np.cov(mu.T)).tolist(),
            "sigma_rw2_mean": float(np.mean(srw ** 2)),
            "draws_file": os.path.basename(fname) + ".npz",
            "included_ids": race.poll_ids,
            "exclusion_counts": _count(race.exclusions),
        })
    except D.InsufficientData as e:
        rec.update({"status": "insufficient", "reason": str(e)})
    except Exception as e:  # registrado, nunca substituído por um número
        rec.update({"status": "error", "reason": f"{type(e).__name__}: {e}", "trace": traceback.format_exc()[-800:]})
    rec["seconds"] = round(time.time() - t0, 1)
    with open(fname + ".json.tmp", "w", encoding="utf-8") as fh:
        json.dump(rec, fh, ensure_ascii=False)
    os.replace(fname + ".json.tmp", fname + ".json")
    return rec


def _count(excl: list[dict]) -> dict:
    out: dict[str, int] = {}
    for e in excl:
        out[e["reason"]] = out.get(e["reason"], 0) + 1
    return dict(sorted(out.items()))


def run_fits(cfg: dict, cache_dir: str, workers: int = 4, contests: list[str] | None = None,
             variants: tuple[str, ...] = ("full", "noh"), log=print) -> list[dict]:
    os.makedirs(cache_dir, exist_ok=True)
    bcfg = _bt_cfg(cfg)
    lag = int(cfg["data"]["availability_lag_days"])
    # O resultado só serve aqui para LISTAR as disputas avaliáveis; não entra no treino.
    cur = os.path.join(cache_dir, "current-with-results.json")
    export(cur, as_of=None, lag=lag, vintage=Vintage("current", None, None), scratch=cache_dir, with_results=True)
    official = D.load_export(cur)["official_results"]
    want = sorted({o["contest"] for o in official if o["round"] == cfg["backtest"]["round"]
                   and o["race"] in cfg["backtest"]["races"]})
    if contests:
        want = [c for c in want if c in contests]
    tasks = []
    for row in plan(cfg):
        v: Vintage = row["vintage"]
        tag = v.commit[:12] if v.commit else "reconstruido"
        path = os.path.join(cache_dir, f"train-{row['ref_date']}-{tag}.json")
        if not os.path.exists(path):
            export(path, as_of=row["ref_date"], lag=lag, vintage=v, scratch=cache_dir, with_results=False)
        vinfo = {"kind": v.kind, "commit": v.commit, "committed_at": v.committed_at}
        log(f"h={row['horizon']:>3} T={row['ref_date']} fonte={v.kind} {v.commit[:10] if v.commit else ''}")
        for c in want:
            for var in variants:
                tasks.append((path, c, cfg["backtest"]["round"], row["ref_date"], row["horizon"], var, bcfg, cache_dir, vinfo))
    # Os ajustes mais caros (presidencial) primeiro, para equilibrar os processos.
    tasks.sort(key=lambda t: (not t[1].startswith("presidente"), t[4], t[1], t[5]))
    out = []
    with ProcessPoolExecutor(max_workers=workers) as pool:
        futs = [pool.submit(_fit_task, t) for t in tasks]
        for i, fu in enumerate(as_completed(futs), 1):
            r = fu.result()
            out.append(r)
            if i % 10 == 0 or r["status"] != "ok":
                log(f"[{i}/{len(tasks)}] {r['contest']} h={r['horizon']} {r['variant']} {r['status']} "
                    f"{r.get('reason', '')[:80]} ({r['seconds']}s)")
    out.sort(key=lambda r: (r["contest"], -r["horizon"], r["variant"]))
    return out
