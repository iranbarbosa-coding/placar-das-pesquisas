"""Etapa `evaluate` do backtest: calibração fora da amostra, simulação e métricas.

Métodos comparados (todos com o MESMO mecanismo de calibração do erro, ajustado
deixando de fora o estado avaliado — a comparação é justa):

  modelo                  Modelo A (efeitos casa) + B + C
  modelo_sem_casa         Modelo A sem efeitos casa + B + C (ablação)
  modelo_sem_sistematico  Modelo A + B, sem erro sistemático (o "bayesiano ingênuo")
  media_site              a média publicada pelo site em T (10 mais recentes, ≤ 2
                          por instituto), com erro calibrado
  ultima_pesquisa         a pesquisa elegível mais recente em T, com erro calibrado

O padrão de produção é escolhido pela densidade preditiva fora da amostra
(ver calibration.select), não por preferência.
"""

from __future__ import annotations

import datetime as dt
import glob
import hashlib
import json
import os
from concurrent.futures import ProcessPoolExecutor

import numpy as np

from . import calibration as CAL
from . import data as D
from .backtest import plan, task_seed
from .scoring import pit_histogram, reliability, score_record
from .simulate import simulate, sys_structure
from .transforms import alr, alr_sampling_cov, continuity, inv_alr
from .vintage import Vintage, export

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
OUT_DIR = os.path.join(REPO, "data", "forecast")
METHODS = ("modelo", "modelo_sem_casa", "modelo_sem_sistematico", "media_site", "ultima_pesquisa")
SCORE_DRAWS = 20000


def _outcome(cur: dict, rec: dict) -> np.ndarray | None:
    res = next((o for o in cur["official_results"] if o["contest"] == rec["contest"] and o["round"] == rec["round"]), None)
    if res is None:
        return None
    by = {c["candidate_id"]: c["pct"] / 100 for c in res["candidates"] if c["candidate_id"]}
    if any(c not in by for c in rec["candidate_ids"]):
        return None
    v = [by[c] for c in rec["candidate_ids"]]
    total = sum(c["pct"] for c in res["candidates"]) / 100
    if rec["include_rest"]:
        return np.array(v + [max(1e-6, total - sum(v))]) / total
    v = np.array(v)
    return v / v.sum()


def _vector(shares_by_id: dict[str, float], rec: dict) -> np.ndarray | None:
    if any(c not in shares_by_id for c in rec["candidate_ids"]):
        return None
    v = [shares_by_id[c] for c in rec["candidate_ids"]]
    if rec["include_rest"]:
        return np.array(v + [max(1e-4, 1 - sum(v))])
    v = np.array(v)
    return v / v.sum()


def _baselines(train: dict, rec: dict, cfg: dict) -> dict:
    """Média do site (pelas pesquisas da janela) e última pesquisa, no vetor do registro."""
    polls = {p["id"]: p for p in train["polls"]}
    out = {}
    avg = next((a for a in train["site_averages"] if a["contest"] == rec["contest"] and a["round"] == rec["round"]), None)
    if avg:
        acc: dict[str, list[float]] = {}
        for pid in avg["windowPollIds"]:
            p = polls.get(pid)
            if not p:
                continue
            for r in p["results"]:
                if r["candidate_id"] and r["pct_result_basis"] is not None:
                    acc.setdefault(r["candidate_id"], []).append(r["pct_result_basis"] / 100)
        out["media_site"] = _vector({k: float(np.mean(v)) for k, v in acc.items()}, rec)
    elig, _ = D.select_polls(train, rec["contest"], rec["round"], rec["ref_date"], cfg)
    elig = [p for p in elig if set(rec["candidate_ids"]) <= {r["candidate_id"] for r in p["results"]}]
    if elig:
        last = sorted(elig, key=lambda p: ((p["fieldwork_end"] or p["published_date"]), p["id"]))[-1]
        out["ultima_pesquisa"] = _vector({r["candidate_id"]: r["pct_result_basis"] / 100 for r in last["results"] if r["candidate_id"]}, rec)
    return out


def _cat(rec: dict) -> str:
    return f"{rec['contest'].split(':')[0]}_t{rec['round']}"


def _group(rec: dict) -> str:
    return rec["contest"].split(":")[1]


def evaluate(cfg: dict, cache_dir: str, log=print) -> dict:
    recs = []
    for f in sorted(glob.glob(os.path.join(cache_dir, "*.json"))):
        with open(f, encoding="utf-8") as fh:
            r = json.load(fh)
        if "variant" in r:
            recs.append(r)
    cur = D.load_export(os.path.join(cache_dir, "current-with-results.json"))
    rows = {r["ref_date"]: r for r in plan(cfg)}
    trains = {}
    for T, row in rows.items():
        v = row["vintage"]
        tag = v.commit[:12] if v.commit else "reconstruido"
        trains[T] = D.load_export(os.path.join(cache_dir, f"train-{T}-{tag}.json"))

    status_counts: dict[str, int] = {}
    for r in recs:
        status_counts[f"{r['variant']}:{r['status']}"] = status_counts.get(f"{r['variant']}:{r['status']}", 0) + 1

    # Pares (contest, T) com ajuste completo nas duas variantes e resultado mapeável.
    by_key: dict[tuple, dict] = {}
    for r in recs:
        if r["status"] == "ok":
            by_key.setdefault((r["contest"], r["ref_date"]), {})[r["variant"]] = r
    items = []
    skipped = []
    for (contest, T), vs in sorted(by_key.items()):
        if "full" not in vs or "noh" not in vs:
            skipped.append({"contest": contest, "ref_date": T, "reason": "falta uma das variantes"})
            continue
        full = vs["full"]
        y = _outcome(cur, full)
        if y is None:
            skipped.append({"contest": contest, "ref_date": T, "reason": "candidato acompanhado sem resultado oficial"})
            continue
        base = _baselines(trains[T], full, cfg)
        items.append({"full": full, "noh": vs["noh"], "y": y, "base": base,
                      "H": float(D.days_between(T, cfg["backtest"]["election_date"]))})

    cats = list(cfg["calibration"]["categories"])
    nu_grid = [float(v) for v in cfg["calibration"]["nu_grid"]]
    omega = float(cfg["calibration"]["pooling_sd"])

    # Covariáveis padronizadas (só das pesquisas: nº de institutos e dispersão em 30 dias).
    ninst = np.array([np.log1p(it["full"]["n_institutes_30d"]) for it in items])
    disp_raw = np.array([it["full"]["dispersion_30d"] if it["full"]["dispersion_30d"] is not None else np.nan for it in items])
    disp = np.where(np.isfinite(disp_raw), disp_raw, np.nanmean(disp_raw))
    z = lambda v: (v - v.mean()) / (v.std() or 1.0)
    X = np.stack([z(ninst), z(disp)], axis=1)

    def err_records(method: str):
        out, keep = [], []
        for i, it in enumerate(items):
            rec = it["full"] if method != "modelo_sem_casa" else it["noh"]
            ref = rec["ref"]
            y_alr = alr(continuity(it["y"], 1e6), ref)
            if method.startswith("modelo"):
                m = np.array(rec["posterior_mean"]); P = np.atleast_2d(rec["posterior_cov"])
                A = P + rec["sigma_rw2_mean"] * it["H"] * np.eye(m.size)
            else:
                pt = it["base"].get(method)
                if pt is None:
                    continue
                m = alr(continuity(pt, 2000), ref); A = np.zeros((m.size, m.size))
            # Forma multinomial do erro sistemático nas frações PREVISTAS (sem o resultado).
            pbar = inv_alr(m, ref)
            M = alr_sampling_cov(np.maximum(pbar, 1e-4) / np.maximum(pbar, 1e-4).sum(), ref, 1.0)
            out.append({"e": (y_alr - m).tolist(), "A": A.tolist(), "M": M.tolist(), "cat": _cat(rec), "H": it["H"],
                        "x": X[i].tolist(), "group": _group(rec)})
            keep.append(i)
        return out, keep

    results = {}
    selected = {}
    jobs = {}
    with ProcessPoolExecutor(max_workers=min(4, len(METHODS))) as pool:
        for method in METHODS:
            er, keep = err_records(method)
            if not er:
                continue
            variants = ("sem_sistematico",) if method == "modelo_sem_sistematico" else CAL.VARIANTS
            jobs[method] = (keep, pool.submit(_select_job, er, cats, nu_grid, omega, variants))
        sels = {m: (keep, fu.result()) for m, (keep, fu) in jobs.items()}
    for method in METHODS:
        if method not in sels:
            continue
        keep, sel = sels[method]
        best = sel["best"]
        ld, fits = sel["cache"][(best["structure"], best["variant"], best["nu"])]
        selected[method] = {"best": best, "best_raw": sel["best_raw"], "rule": sel["rule"], "table": sel["table"]}
        log(f"{method}: melhor = {best['structure']}/{best['variant']} ν={best['nu']:g} (log-dens. LOSO média {best['loso_mean_logdens']:.3f})")
        scored = []
        for j, i in enumerate(keep):
            it = items[i]
            rec = it["full"] if method != "modelo_sem_casa" else it["noh"]
            cf = fits[_group(rec)]
            s = cf.scale(_cat(rec), it["H"], X[i])
            seed = task_seed(cfg["seed"], "score", method, rec["contest"], rec["ref_date"])
            if method.startswith("modelo"):
                npz = np.load(os.path.join(cache_dir, rec["draws_file"]))
                mu, srw = npz["mu_ref"], npz["sigma_rw"]
                L = sys_structure(np.array(rec["posterior_mean"])[None, :], rec["ref"], best["structure"])
                sh = simulate(mu, srw, rec["ref"], it["H"], s, best["nu"], SCORE_DRAWS, seed, L)
            else:
                pt = alr(continuity(it["base"][method], 2000), rec["ref"])[None, :]
                L = sys_structure(pt, rec["ref"], best["structure"])
                sh = simulate(pt, np.zeros(1), rec["ref"], 0.0, s, best["nu"], SCORE_DRAWS, seed, L)
            race = rec["contest"].split(":")[0]
            sc = score_record(sh, it["y"], len(rec["candidate_ids"]), race, rec["round"])
            q = np.quantile(sh * 100, [0.1, 0.5, 0.9], axis=0)
            scored.append({
                "contest": rec["contest"], "ref_date": rec["ref_date"], "horizon": rec["horizon"],
                "category": _cat(rec), "source": rec["source"]["kind"], "sys_scale": s,
                "loso_logdens": float(ld[j]),
                "labels": rec["candidate_names"] + (["Demais"] if rec["include_rest"] else []),
                "median": q[1].round(2).tolist(), "q10": q[0].round(2).tolist(), "q90": q[2].round(2).tolist(),
                "outcome": (it["y"] * 100).round(2).tolist(), **sc,
            })
        results[method] = scored

    summary = {m: _aggregate(rows_, cfg) for m, rows_ in results.items()}

    # Calibração de produção: a variante escolhida para `modelo`, ajustada em TODOS os registros.
    er, keep = err_records("modelo")
    best = selected["modelo"]["best"]
    es = CAL.build_error_set(er, cats, best["structure"])
    prod = CAL.fit_calibration(es, best["variant"], best["nu"], omega)
    prod.structure = best["structure"]
    n_contests = {c: len({items[i]["full"]["contest"] for i in keep if _cat(items[i]["full"]) == c}) for c in cats}
    calib = {
        "calibration_id": None,     # preenchido abaixo: endereçado pelo conteúdo (imutável)
        "model_version": cfg["model_version"],
        "config_id": cfg["config_id"],
        "elections": [{"date": cfg["backtest"]["election_date"], "round": cfg["backtest"]["round"]}],
        "fit": prod.to_json(),
        # Exatamente as estatísticas usadas em `z` acima (a dispersão já com as lacunas na média).
        "covariate_standardization": {"log1p_n_institutes_30d": [float(ninst.mean()), float(ninst.std())],
                                      "dispersion_30d": [float(disp.mean()), float(disp.std())]},
        "categories": {c: {"n_contests": n_contests.get(c, 0), "n_elections": 1 if n_contests.get(c, 0) else 0,
                           "scale_alr_by_horizon": {str(h): prod.scale(c, h, np.zeros(2)) for h in (1, 3, 7, 14, 21, 30, 60, 90)},
                           "borrowed": n_contests.get(c, 0) == 0}
                       for c in cats},
        "selection": selected["modelo"]["table"],
        "selection_rule": "um erro-padrão: a combinação mais simples a menos de 1 EP (pareado) da melhor densidade fora da amostra",
        "selected": best,
        "best_raw": selected["modelo"]["best_raw"],
        "notes": [
            "Todas as disputas de calibração são do 1º turno de 2026: o erro comum da eleição está em todas.",
            "Categorias sem disputa (2º turno) usam α_0, a média agrupada — erro EMPRESTADO, não validado.",
        ],
    }

    # O id carrega o hash do conteúdo: uma calibração refeita com outro resultado
    # ganha OUTRO arquivo, e um snapshot antigo continua apontando para a que usou.
    digest = hashlib.sha256(json.dumps(calib, sort_keys=True, default=_np).encode()).hexdigest()[:10]
    calib["calibration_id"] = f"calibracao-{cfg['backtest']['election_date'][:4]}t{cfg['backtest']['round']}-{digest}"

    leakage = _revision_check(cfg, cache_dir, trains, items)

    out = {
        "backtest_id": f"backtest-{cfg['backtest']['election_date']}-t{cfg['backtest']['round']}-{cfg['config_id']}",
        "model_version": cfg["model_version"],
        "config_id": cfg["config_id"],
        "election": {"date": cfg["backtest"]["election_date"], "round": cfg["backtest"]["round"]},
        "horizons": cfg["backtest"]["horizons_days"],
        "sources": [{"horizon": rows[T]["horizon"], "ref_date": T, "kind": rows[T]["vintage"].kind,
                     "commit": rows[T]["vintage"].commit, "committed_at": rows[T]["vintage"].committed_at}
                    for T in sorted(rows)],
        "fit_status": dict(sorted(status_counts.items())),
        "fit_diagnostics": _diag_summary(recs),
        "skipped": skipped,
        "n_items": len(items),
        "selection": selected,
        "summary": summary,
        "records": results,
        "revision_leakage": leakage,
        "calibration_id": calib["calibration_id"],
    }
    os.makedirs(os.path.join(OUT_DIR, "backtests"), exist_ok=True)
    os.makedirs(os.path.join(OUT_DIR, "calibration"), exist_ok=True)
    _write(os.path.join(OUT_DIR, "backtests", f"{out['backtest_id']}.json"), out)
    _write(os.path.join(OUT_DIR, "calibration", f"{calib['calibration_id']}.json"), calib)
    log(f"calibração: {calib['calibration_id']} — para usá-la em produção, fixe `calibration_id` na configuração")
    log(f"gravado: {out['backtest_id']} ({len(items)} pares disputa×horizonte)")
    return out


def _select_job(er, cats, nu_grid, omega, variants):
    return CAL.select(er, cats, nu_grid, omega, variants)


def finite_or_null(o):
    """JSON não tem ±Infinity nem NaN (o `json.dump` do Python os escreve e o
    `JSON.parse` do site recusa o arquivo inteiro). Densidade −∞ de uma previsão
    pontual sem erro sistemático vira null — "não definido", não um número."""
    if isinstance(o, dict):
        return {k: finite_or_null(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return [finite_or_null(v) for v in o]
    if isinstance(o, np.ndarray):
        return finite_or_null(o.tolist())
    if isinstance(o, (float, np.floating)):
        return float(o) if np.isfinite(o) else None
    return o


def _write(path: str, obj) -> None:
    tmp = path + ".tmp"
    with open(tmp, "w", encoding="utf-8") as f:
        json.dump(finite_or_null(obj), f, ensure_ascii=False, indent=1, default=_np, allow_nan=False)
        f.write("\n")
    os.replace(tmp, path)


def _np(o):
    if isinstance(o, (np.floating,)):
        return float(o)
    if isinstance(o, (np.integer,)):
        return int(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    if isinstance(o, (np.bool_,)):
        return bool(o)
    raise TypeError(type(o))


def _diag_summary(recs: list[dict]) -> dict:
    ok = [r for r in recs if r["status"] == "ok"]
    rh = np.array([r["diagnostics"]["rhat_max"] for r in ok])
    es = np.array([r["diagnostics"]["ess_min"] for r in ok])
    return {"n_fits": len(ok), "rhat_max_median": float(np.median(rh)), "rhat_max_worst": float(rh.max()),
            "share_rhat_le_1.01": float(np.mean(rh <= 1.01)), "share_rhat_le_1.05": float(np.mean(rh <= 1.05)),
            "ess_min_median": float(np.median(es)), "ess_min_worst": float(es.min()),
            "seconds_total": float(sum(r["seconds"] for r in recs))}


def _aggregate(rows: list[dict], cfg: dict) -> dict:
    def agg(sub: list[dict]) -> dict:
        if not sub:
            return {}
        ae = [x for r in sub for x in r["abs_err"]]
        cr = [x for r in sub for x in r["crps"]]
        cov = {l: float(np.mean([x for r in sub for x in r["cover"][l]])) for l in ("50", "80", "95")}
        ev = [r["events"] for r in sub]
        o = {
            "n": len(sub),
            "n_contests": len({r["contest"] for r in sub}),
            "mae_pp": float(np.mean(ae)),
            "crps_pp": float(np.mean(cr)),
            "coverage": cov,
            "brier_first": float(np.mean([e["brier_first"] for e in ev])),
            "log_first": float(np.mean([e["log_first"] for e in ev])),
            "leader_correct": float(np.mean([int(np.argmax(e["p_first"]) == int(np.argmax(e["o_first"]))) for e in ev])),
            "zero_prob_events": int(sum(e["zero_prob_first"] for e in ev)),
            "pit_hist": pit_histogram([x for r in sub for x in r["pit"]]),
            "loso_mean_logdens": float(np.mean([r["loso_logdens"] for r in sub])),
        }
        t2 = [e["brier_top2"] for e in ev if "brier_top2" in e]
        if t2:
            o["brier_top2"] = float(np.mean(t2))
        dec = [e["brier_decided"] for e in ev if "brier_decided" in e]
        if dec:
            o["brier_decided"] = float(np.mean(dec))
        return o

    out = {"overall": agg(rows), "by_horizon": {}, "by_category": {}, "by_category_horizon": {}}
    for h in cfg["backtest"]["horizons_days"]:
        out["by_horizon"][str(h)] = agg([r for r in rows if r["horizon"] == h])
    for c in sorted({r["category"] for r in rows}):
        out["by_category"][c] = agg([r for r in rows if r["category"] == c])
        out["by_category_horizon"][c] = {str(h): agg([r for r in rows if r["category"] == c and r["horizon"] == h])
                                         for h in cfg["backtest"]["horizons_days"]}
    pf = [(p, o) for r in rows for p, o in zip(r["events"]["p_first"], r["events"]["o_first"])]
    p2 = [(p, o) for r in rows if "p_top2" in r["events"] for p, o in zip(r["events"]["p_top2"], r["events"]["o_top2"])]
    out["reliability_first"] = reliability(pf)
    out["reliability_top2"] = reliability(p2)
    return out


def _revision_check(cfg: dict, cache_dir: str, trains: dict, items: list[dict]) -> list[dict]:
    """Vazamento por REVISÃO: a média do site no vintage × no banco atual filtrado pela data.

    Onde há vintage, refaz a mesma data sobre o banco de hoje (com a regra de
    disponibilidade) e mede quanto a base de comparação muda. É o tamanho do
    viés que um backtest só com filtro por data teria — e o motivo de usar vintages.
    """
    out = []
    lag = int(cfg["data"]["availability_lag_days"])
    for T, train in sorted(trains.items()):
        if train["source"]["kind"] != "vintage":
            continue
        path = os.path.join(cache_dir, f"recon-{T}.json")
        if not os.path.exists(path):
            export(path, as_of=T, lag=lag, vintage=Vintage("reconstructed", None, None), scratch=cache_dir, with_results=False)
        recon = D.load_export(path)
        diffs, err_v, err_r = [], [], []
        n_polls_v = len(train["polls"]); n_polls_r = len(recon["polls"])
        for it in items:
            if it["full"]["ref_date"] != T:
                continue
            bv = it["base"].get("media_site")
            br = _baselines(recon, it["full"], cfg).get("media_site")
            if bv is None or br is None:
                continue
            n = len(it["full"]["candidate_ids"])
            diffs += list(np.abs(bv[:n] - br[:n]) * 100)
            err_v += list(np.abs(bv[:n] - it["y"][:n]) * 100)
            err_r += list(np.abs(br[:n] - it["y"][:n]) * 100)
        if diffs:
            out.append({"ref_date": T, "commit": train["source"]["commit"], "polls_vintage": n_polls_v,
                        "polls_reconstructed": n_polls_r, "mean_abs_diff_pp": float(np.mean(diffs)),
                        "max_abs_diff_pp": float(np.max(diffs)), "mae_vintage_pp": float(np.mean(err_v)),
                        "mae_reconstructed_pp": float(np.mean(err_r)), "n_candidates": len(diffs)})
    return out
