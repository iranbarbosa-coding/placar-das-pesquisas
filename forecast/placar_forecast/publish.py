"""Rodada de produção: snapshots imutáveis, portões de publicação e índice.

Fluxo de `update` (chamado pelo cron depois que os guardas do banco passaram):

  1. trava exclusiva (data/forecast/.lock) — duas rodadas nunca correm juntas;
  2. exporta o banco ATUAL (o que está no store já foi validado pelo pipeline);
  3. para cada confronto de 2º turno (as urnas decidem quem disputa):
       a. seleciona as pesquisas do par e calcula o hash do que o modelo consome;
       b. MUDANÇA MATERIAL = hash diferente do último snapshot (pesquisa nova,
          correção, outra data de referência, outra configuração ou código);
          sem mudança, nada é escrito;
       c. ajusta o Modelo A, confere convergência (R-hat, ESS) e validade
          numérica (frações finitas que somam 100%, probabilidades em [0, 1]);
       d. simula o Modelo B com a calibração do Modelo C;
       e. aplica os portões: estimativa atual, projeção e probabilidade têm
          cada uma o seu (ver `gates`); o que não passa é RETIDO e o motivo vai
          no snapshot;
       f. grava o snapshot num arquivo NOVO (nunca sobrescreve: se o caminho
          existe com outro conteúdo, é erro);
  4. só então reescreve `index.json` (troca atômica). Se qualquer passo de uma
     disputa falha, o índice continua apontando para o último snapshot válido
     dela, e a falha fica registrada em `runs.ndjson`.

Nada aqui substitui uma falha por um número: falhou, não publica.
"""

from __future__ import annotations

import contextlib
import datetime as dt
import fcntl
import glob
import hashlib
import json
import os
import tempfile
import time

import numpy as np

from . import data as D
from . import ssm
from .backtest import task_seed
from .calibration import CalibFit
from .simulate import event_probabilities, posterior_flat, simulate, summarize_shares, sys_structure, variance_decomposition
from .transforms import inv_alr
from .vintage import Vintage, export
from . import trend as TR

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
FORECAST_DIR = os.path.join(REPO, "data", "forecast")
SNAP_DIR = os.path.join(FORECAST_DIR, "snapshots")
INDEX = os.path.join(FORECAST_DIR, "index.json")
RUNS = os.path.join(FORECAST_DIR, "runs.ndjson")
CALIB_DIR = os.path.join(FORECAST_DIR, "calibration")
BACKTEST_DIR = os.path.join(FORECAST_DIR, "backtests")
SNAPSHOT_SCHEMA = "placar.previsao.snapshot/1"
INDEX_SCHEMA = "placar.previsao.indice/1"
CODE_FILES = ("data.py", "transforms.py", "ssm.py", "simulate.py", "calibration.py", "trend.py", "publish.py")


class LockBusy(RuntimeError):
    pass


EXPECTED_SCHEMAS = {"snapshot": 1, "index": 1, "runs": 1, "calibration": 1, "backtest": 1}


def migrate() -> list[str]:
    """Aplica as migrações pendentes do armazenamento (forecast/migrations/m*.py), em ordem."""
    import importlib
    import sys
    base = os.path.join(REPO, "forecast")
    if base not in sys.path:
        sys.path.insert(0, base)
    names = sorted(f[:-3] for f in os.listdir(os.path.join(base, "migrations")) if f.startswith("m") and f.endswith(".py"))
    done = []
    for n in names:
        if importlib.import_module(f"migrations.{n}").apply(FORECAST_DIR):
            done.append(n)
    return done


def check_manifest() -> None:
    """Recusa gravar num armazenamento cujo esquema não é o que o código espera."""
    path = os.path.join(FORECAST_DIR, "manifest.json")
    if not os.path.exists(path):
        raise RuntimeError("data/forecast/manifest.json ausente: rode `python3 forecast/run.py migrate`")
    with open(path, encoding="utf-8") as f:
        man = json.load(f)
    if man.get("schema_versions") != EXPECTED_SCHEMAS:
        raise RuntimeError(f"esquema do armazenamento {man.get('schema_versions')} ≠ esperado {EXPECTED_SCHEMAS}: migração pendente")


@contextlib.contextmanager
def exclusive_lock(path: str):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fh = open(path, "w")
    try:
        try:
            fcntl.flock(fh, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError as e:
            raise LockBusy("outra rodada da previsão está em execução") from e
        yield
    finally:
        with contextlib.suppress(Exception):
            fcntl.flock(fh, fcntl.LOCK_UN)
        fh.close()


def sha256_file(path: str) -> str:
    with open(path, "rb") as f:
        return hashlib.sha256(f.read()).hexdigest()


def code_sha256() -> str:
    h = hashlib.sha256()
    base = os.path.dirname(__file__)
    for name in CODE_FILES:
        with open(os.path.join(base, name), "rb") as f:
            h.update(name.encode()); h.update(f.read())
    return h.hexdigest()


def js_number(x) -> str:
    """Número como o `String(n)` do JavaScript (ECMA-262, Number::toString).

    O hash de saída é conferido também pelo site (src/lib/forecast.ts), que lê
    o JSON e já não sabe se `52` era `52.0`. A forma canônica, então, é a do JS:
    inteiro sem ".0", dígitos mínimos de ida e volta (os mesmos de `repr`), e
    notação exponencial só fora de [1e-7, 1e21).
    """
    if isinstance(x, bool):
        raise TypeError("booleano não é número")
    x = float(x)
    if not np.isfinite(x):
        raise ValueError("número não finito no snapshot")
    if x == 0:
        return "0"
    if x.is_integer() and abs(x) < 2 ** 53:
        return str(int(x))
    sign = "-" if x < 0 else ""
    r = repr(abs(x))
    mant, _, exp = r.partition("e")
    digits = mant.replace(".", "")
    point = mant.index(".") if "." in mant else len(mant)
    e10 = int(exp) if exp else 0
    lead = len(digits) - len(digits.lstrip("0"))
    digits = digits.strip("0") or "0"
    n = point + e10 - lead                    # posição do ponto decimal (k dígitos, expoente n)
    k = len(digits)
    if k <= n <= 21:
        return sign + digits + "0" * (n - k)
    if 0 < n <= 21:
        return sign + digits[:n] + "." + digits[n:]
    if -6 < n <= 0:
        return sign + "0." + "0" * (-n) + digits
    e = n - 1
    es = f"e{'+' if e >= 0 else '-'}{abs(e)}"
    return sign + (digits if k == 1 else digits[0] + "." + digits[1:]) + es


def _canon(o) -> str:
    if o is None:
        return "null"
    if o is True:
        return "true"
    if o is False:
        return "false"
    if isinstance(o, str):
        return json.dumps(o, ensure_ascii=False)
    if isinstance(o, (int, float, np.integer, np.floating)):
        return js_number(o)
    if isinstance(o, dict):
        return "{" + ",".join(f"{json.dumps(str(k), ensure_ascii=False)}:{_canon(v)}" for k, v in sorted(o.items())) + "}"
    if isinstance(o, (list, tuple)):
        return "[" + ",".join(_canon(v) for v in o) + "]"
    if isinstance(o, np.ndarray):
        return _canon(o.tolist())
    if isinstance(o, np.bool_):
        return "true" if o else "false"
    raise TypeError(type(o))


def canonical_json(obj) -> bytes:
    return _canon(obj).encode("utf-8")


def _np(o):
    if isinstance(o, np.floating):
        return float(o)
    if isinstance(o, np.integer):
        return int(o)
    if isinstance(o, np.bool_):
        return bool(o)
    if isinstance(o, np.ndarray):
        return o.tolist()
    raise TypeError(type(o))


def atomic_write(path: str, data: bytes) -> None:
    os.makedirs(os.path.dirname(path), exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=os.path.dirname(path), prefix=".tmp-")
    with os.fdopen(fd, "wb") as f:
        f.write(data)
    os.replace(tmp, path)


def write_immutable(path: str, data: bytes) -> str:
    """Grava um arquivo que NUNCA muda: mesmo caminho só com conteúdo idêntico."""
    if os.path.exists(path):
        with open(path, "rb") as f:
            if f.read() == data:
                return "identico"
        raise FileExistsError(f"snapshot já publicado com outro conteúdo: {os.path.relpath(path, REPO)}")
    atomic_write(path, data)
    return "novo"


def race_id_of(contest: str, round_: int, election_date: str) -> str:
    race, uf = contest.split(":")
    return f"{race}-{uf.lower()}-{election_date[:4]}-t{round_}"


def load_calibration(cfg: dict) -> tuple[dict | None, CalibFit | None]:
    """A calibração FIXADA na configuração (`calibration_id`), nunca "a mais recente".

    Trocar de calibração é mudar a configuração — e, com ela, o hash de entrada
    de todo snapshot, que então é refeito. Sem id ou sem arquivo: projeção retida.
    """
    cid = cfg.get("calibration_id")
    path = os.path.join(CALIB_DIR, f"{cid}.json") if cid else None
    if not path or not os.path.exists(path):
        return None, None
    with open(path, encoding="utf-8") as f:
        c = json.load(f)
    if c.get("calibration_id") != cid:
        raise ValueError(f"arquivo de calibração {cid} declara outro id: {c.get('calibration_id')}")
    fj = c["fit"]
    cats = list(fj["alpha"].keys())
    cf = CalibFit(fj["variant"], float(fj["nu"]), float(fj["alpha0"]), np.array([fj["alpha"][k] for k in cats]),
                  float(fj["beta"]), np.array(fj["gamma"]), cats, int(fj["n_records"]), fj.get("structure", "iso"))
    return c, cf


def load_backtest_summary() -> dict | None:
    files = sorted(glob.glob(os.path.join(BACKTEST_DIR, "*.json")))
    if not files:
        return None
    with open(files[-1], encoding="utf-8") as f:
        b = json.load(f)
    return {"backtest_id": b["backtest_id"], "overall": b["summary"].get("modelo", {}).get("overall", {})}


def probability_gate(cfg: dict, calib: dict | None, category: str, backtest: dict | None) -> tuple[bool, list[str]]:
    """Probabilidade só com calibração ADEQUADA para a categoria da disputa."""
    g = cfg["gates"]["probability"]
    reasons = []
    if calib is None:
        return False, ["sem calibração histórica carregada"]
    cat = calib["categories"].get(category)
    if cat is None or cat["n_contests"] == 0:
        reasons.append(f"nenhuma disputa histórica da categoria {category} com resultado oficial no banco")
    else:
        if cat["n_elections"] < g["min_elections_same_category"]:
            reasons.append(f"{cat['n_elections']} eleição(ões) na categoria {category} (mínimo {g['min_elections_same_category']})")
        if cat["n_contests"] < g["min_contests_same_category"]:
            reasons.append(f"{cat['n_contests']} disputa(s) na categoria {category} (mínimo {g['min_contests_same_category']})")
    if backtest and backtest.get("overall", {}).get("coverage"):
        c80 = backtest["overall"]["coverage"]["80"]
        if abs(c80 - 0.8) > g["coverage80_tolerance"]:
            reasons.append(f"cobertura do intervalo de 80% no backtest = {c80:.0%} (tolerância ±{g['coverage80_tolerance']:.0%})")
    return (not reasons), reasons


LIMITATIONS = [
    "Não há no banco pesquisas de eleições anteriores a 2026 (2010–2022): a calibração do erro histórico usa apenas o 1º turno de 2026.",
    "Nenhum 2º turno com resultado oficial está no banco. O erro sistemático do 2º turno é emprestado da média agrupada do 1º turno, sem validação — por isso a projeção é marcada como experimental e nenhuma probabilidade de vitória é publicada.",
    "Comparecimento não é modelado à parte; seu efeito sobre os votos válidos entra no erro sistemático.",
    "A metodologia de coleta (presencial, telefone, internet) não está registrada no banco; diferenças de método entram apenas como efeito casa de cada instituto.",
    "Pesquisas de 2º turno feitas antes do 1º turno (simulações do mesmo par) entram no modelo; o passeio aleatório lhes dá menos peso à medida que envelhecem, mas o modelo não prevê um salto no dia do 1º turno.",
    "O efeito casa é medido em relação ao instituto médio; se a média dos institutos erra, esse erro comum não aparece no efeito casa — está no erro sistemático.",
]


def _q(col: np.ndarray, qs=(0.05, 0.1, 0.25, 0.5, 0.75, 0.9, 0.95)) -> dict:
    v = np.quantile(col, qs)
    return {f"{q:g}": round(float(x), 3) for q, x in zip(qs, v)}


def _round_tree(o, nd=4):
    if isinstance(o, float):
        return round(o, nd)
    if isinstance(o, dict):
        return {k: _round_tree(v, nd) for k, v in o.items()}
    if isinstance(o, list):
        return [_round_tree(v, nd) for v in o]
    return o


class Unchanged(Exception):
    """A entrada é a mesma do último snapshot: nada a ajustar nem a gravar."""


def build_snapshot(cfg: dict, cfg_sha: str, export_doc: dict, rc: dict, ref_date: str, calib: dict | None,
                   cf: CalibFit | None, backtest: dict | None, election_date: str,
                   prev_input_sha: str | None = None) -> tuple[dict, D.RaceData | None, ssm.FitResult | None]:
    contest = rc["contest"]
    race_id = race_id_of(contest, 2, election_date)
    pairing = [c["candidate_id"] for c in rc["first_round"]]
    base = {
        "schema": SNAPSHOT_SCHEMA,
        "race_id": race_id,
        "contest": contest,
        "race": rc["race"],
        "uf": rc["uf"],
        "round": 2,
        "election_date": election_date,
        "reference_date": ref_date,
        "horizon_days": D.days_between(ref_date, election_date),
        "model": {"model_version": cfg["model_version"], "config_id": cfg["config_id"], "config_sha256": cfg_sha,
                  "code_sha256": code_sha256(), "calibration_id": calib["calibration_id"] if calib else None,
                  "numpy_version": np.__version__},
        "candidates": [{"candidate_id": c["candidate_id"], "person_id": c["person_id"], "name": c["name"],
                        "first_round_pct": c["pct"]} for c in rc["first_round"]],
        "site_average": rc.get("site_average"),
        "note": rc.get("note"),
        "limitations": LIMITATIONS,
    }
    if None in pairing:
        base["status"] = {"overall": "insuficiente", "nowcast": "insuficiente", "projection": "retida",
                          "probability": "retida", "reasons": ["candidato do par sem identificador estável"]}
        base["input"] = {"input_sha256": hashlib.sha256(canonical_json([race_id, ref_date, "sem-id"])).hexdigest()}
        return base, None, None
    try:
        race = D.build_race(export_doc, contest, 2, ref_date, cfg, pairing=pairing)
    except D.InsufficientData as e:
        polls, excl = D.select_polls(export_doc, contest, 2, ref_date, cfg, pairing)
        base["status"] = {"overall": "insuficiente", "nowcast": "insuficiente", "projection": "retida",
                          "probability": "retida", "reasons": [str(e)]}
        base["input"] = {"input_sha256": hashlib.sha256(canonical_json([race_id, ref_date, [p["id"] for p in polls], cfg_sha, code_sha256()])).hexdigest(),
                         "n_polls": len(polls)}
        return base, None, None

    dataset_sha = race.dataset_hash()
    input_sha = hashlib.sha256(canonical_json([dataset_sha, cfg_sha, code_sha256(), base["model"]["calibration_id"]])).hexdigest()
    seed = task_seed(cfg["seed"], race_id, ref_date, input_sha)
    ex_counts: dict[str, int] = {}
    for e in race.exclusions:
        ex_counts[e["reason"]] = ex_counts.get(e["reason"], 0) + 1
    last_end = max(p["fieldwork_end"] or "" for p in race.included)
    base["input"] = {
        "dataset_sha256": dataset_sha,
        "input_sha256": input_sha,
        "source_polls_sha256": export_doc["source"]["polls_sha256"],
        "source_generated_at": export_doc["source"]["polls_generated_at"],
        "n_polls": len(race.poll_ids),
        "n_institutes": len(race.pollsters),
        "latest_fieldwork_end": last_end,
        "polls": race.included,
        "exclusion_counts": dict(sorted(ex_counts.items())),
        # `par_diferente` e `fora_da_janela` são outras perguntas, não decisões de
        # qualidade: só a contagem. As demais exclusões vão uma a uma.
        "exclusions": [e for e in race.exclusions if e["reason"] not in ("par_diferente", "fora_da_janela")],
    }
    base["model"]["seed"] = seed
    if prev_input_sha is not None and prev_input_sha == input_sha:
        raise Unchanged()                    # antes do ajuste: rodada ociosa custa segundos

    t0 = time.time()
    fit = ssm.fit(race, cfg, seed)
    ok_conv, conv_reasons = ssm.converged(fit.diagnostics, cfg)
    base["diagnostics"] = _round_tree(fit.diagnostics)
    base["model"]["fit_seconds"] = round(time.time() - t0, 1)

    labels = race.labels()
    mu_flat, srw = posterior_flat(fit)
    now_sh = inv_alr(mu_flat, race.ref)
    qs = cfg["simulation"]["quantiles"]
    base["nowcast"] = {"summary": _round_tree(summarize_shares(now_sh, labels, qs, cfg["simulation"]["histogram_bin_pp"]), 3)}
    grid_dates = [D.add_days(race.t0, int(g)) for g in fit.grid]
    mu_g = fit.mu.reshape(-1, fit.mu.shape[2], fit.mu.shape[3])[:: max(1, fit.mu.shape[0] * fit.mu.shape[1] // 2000)]
    series = []
    for gi, d in enumerate(grid_dates):
        sh = inv_alr(mu_g[:, gi, :], race.ref) * 100
        series.append({"date": d, "values": [{"q10": round(float(np.quantile(sh[:, k], 0.1)), 2),
                                              "median": round(float(np.median(sh[:, k])), 2),
                                              "q90": round(float(np.quantile(sh[:, k], 0.9)), 2)} for k in range(len(labels))]})
    base["nowcast"]["series"] = series

    # Efeito casa em p.p. sobre a fração do 1º candidato, na fração atual (Δp ≈ p(1−p)·Δlogit).
    p_now = float(np.median(now_sh[:, 0]))
    he = []
    hflat = fit.h.reshape(-1, fit.h.shape[2], fit.h.shape[3])
    for j, name in enumerate(race.pollsters):
        eff = hflat[:, j, 0] * p_now * (1 - p_now) * 100 * (1 if race.ref == 1 else -1)
        he.append({"pollster": name, "n_polls": int(np.sum(race.pollster == j)),
                   "effect_pp_first_candidate": _q(eff, (0.1, 0.5, 0.9))})
    he.sort(key=lambda r: -abs(r["effect_pp_first_candidate"]["0.5"]))
    base["house_effects"] = {"reference_candidate": labels[0], "rows": he if fit.house_effects else []}
    base["hyperparameters"] = {k: _round_tree(_q(getattr(fit, k).reshape(-1), (0.05, 0.5, 0.95)), 5)
                               for k in ("sigma_rw", "tau", "sigma_h")}

    # Portões
    gates = cfg["gates"]
    reasons = list(conv_reasons)
    days_since = D.days_between(last_end, ref_date)
    now_ok = ok_conv
    if len(race.poll_ids) < gates["min_polls_publish"]:
        now_ok = False; reasons.append(f"{len(race.poll_ids)} pesquisas (mínimo {gates['min_polls_publish']})")
    if len(race.pollsters) < gates["min_institutes_publish"]:
        now_ok = False; reasons.append(f"{len(race.pollsters)} instituto(s) (mínimo {gates['min_institutes_publish']})")
    if days_since > gates["max_days_since_last_poll"]:
        now_ok = False; reasons.append(f"última pesquisa com campo há {days_since} dias (máximo {gates['max_days_since_last_poll']})")

    category = f"{rc['race']}_t2"
    proj_status = "retida"
    prob_status = "retida"
    base["projection"] = None
    base["probabilities"] = None
    if now_ok and cf is not None:
        H = float(base["horizon_days"])
        x = race_covariates(race, ref_date, calib)
        s = cf.scale(category, H, x)
        L = sys_structure(mu_flat, race.ref, cf.structure)
        sh = simulate(mu_flat, srw, race.ref, H, s, cf.nu, int(cfg["simulation"]["draws"]), seed + 1, L)
        _validate_shares(sh)
        borrowed = calib["categories"].get(category, {}).get("borrowed", True)
        proj_status = "experimental" if borrowed else "publicada"
        if borrowed:
            reasons.append("erro sistemático do 2º turno emprestado do 1º turno (sem disputa de 2º turno com resultado no banco)")
        base["projection"] = {
            "summary": _round_tree(summarize_shares(sh, labels, qs, cfg["simulation"]["histogram_bin_pp"]), 3),
            "draws": int(sh.shape[0]),
            "sys_scale_alr": round(s, 5),
            "sys_structure": cf.structure,
            "covariates_std": [round(float(v), 4) for v in x],
            "nu": cf.nu,
            "category": category,
            "error_borrowed": bool(borrowed),
            "variance_decomposition": _round_tree(variance_decomposition(mu_flat, srw, H, s, cf.nu, L), 4),
        }
        p_ok, p_reasons = probability_gate(cfg, calib, category, backtest)
        probs = event_probabilities(sh, len(race.candidate_ids), rc["race"], 2)
        _validate_probs(probs)
        override = cfg["gates"]["probability"].get("editorial_override") or {}
        if p_ok:
            base["probabilities"] = _round_tree(probs, 4)
            prob_status = "publicada"
        elif override.get("enabled"):
            # Decisão editorial registrada na configuração: a probabilidade sai,
            # mas como EXPERIMENTAL — os motivos do portão continuam no snapshot
            # e na página, para o leitor saber por que ela não está validada.
            base["probabilities"] = _round_tree(probs, 4)
            prob_status = "experimental"
            reasons += p_reasons
            reasons.append(f"probabilidade publicada como experimental por decisão editorial ({override.get('decided_at')})")
        else:
            reasons += p_reasons
        # Modelo de tendência da média (trend.py): mesma data, mesmo par, mesma
        # semente-base; publicado com o mesmo status de probabilidade.
        base["trend_model"] = trend_block(calib, rc, race, ref_date, H, category, x, seed + 2,
                                          int(cfg["simulation"]["draws"]), qs, cfg["simulation"]["histogram_bin_pp"],
                                          include_probs=base["probabilities"] is not None)
    elif cf is None:
        reasons.append("sem calibração histórica: projeção retida")

    base["headline_method"] = cfg.get("headline_method", "modelo")
    if base["headline_method"] == "tendencia" and not (base.get("trend_model") or {}).get("probabilities"):
        base["headline_method"] = "modelo"
    base["status"] = {
        "overall": "publicado" if now_ok else ("nao_convergiu" if not ok_conv else "insuficiente"),
        "nowcast": "publicada" if now_ok else ("nao_convergiu" if not ok_conv else "insuficiente"),
        "projection": proj_status,
        "probability": prob_status,
        "reasons": reasons,
    }
    return base, race, fit


def trend_block(calib: dict | None, rc: dict, race: D.RaceData, ref_date: str, H: float, category: str,
                x: np.ndarray, seed: int, draws: int, qs: list[float], bin_pp: float, include_probs: bool) -> dict | None:
    """A média do site, sua tendência e a projeção dela até a eleição, com incerteza calibrada."""
    tcal = (calib or {}).get("trend")
    sa = rc.get("site_average")
    if not tcal or not sa:
        return None
    pr = TR.project(sa, race.candidate_ids, False, race.ref, rc["race"], ref_date, H,
                    int(tcal["lookback_days"]), float(tcal["damping"]))
    if pr is None:
        return None
    fj = tcal["fit"]
    cats = list(fj["alpha"].keys())
    tcf = CalibFit(fj["variant"], float(fj["nu"]), float(fj["alpha0"]), np.array([fj["alpha"][k] for k in cats]),
                   float(fj["beta"]), np.array(fj["gamma"]), cats, int(fj["n_records"]), fj.get("structure", "iso"))
    s = tcf.scale(category, H, x)
    pt = pr["y_end"][None, :]
    L = sys_structure(pt, race.ref, tcf.structure)
    sh = simulate(pt, np.zeros(1), race.ref, 0.0, s, tcf.nu, draws, seed, L)
    _validate_shares(sh)
    probs = event_probabilities(sh, len(race.candidate_ids), rc["race"], 2)
    _validate_probs(probs)
    return _round_tree({
        "method": tcal["method"],
        "lookback_days": int(tcal["lookback_days"]),
        "damping": float(tcal["damping"]),
        "series_from": pr["series_from"],
        "series_to": pr["series_to"],
        "points": pr["points"],
        "average_now_pct": [float(v) * 100 for v in pr["shares_now"]],
        "trend_pp_per_week": [float(v) for v in pr["pp_per_week"]],
        "point_election_pct": [float(v) * 100 for v in pr["shares_end"]],
        "sys_scale_alr": s,
        "summary": summarize_shares(sh, race.labels(), qs, bin_pp),
        "probabilities": probs if include_probs else None,
    }, 4)


def race_covariates(race: D.RaceData, ref_date: str, calib: dict) -> np.ndarray:
    """As covariáveis da calibração para esta disputa, padronizadas como no backtest.

    Mesma definição do backtest (backtest._fit_task): log(1 + nº de institutos
    com campo nos últimos 30 dias) e a dispersão do 1º componente ALR dessas
    pesquisas (≥ 3 pesquisas; senão a média, isto é, 0 padronizado).
    """
    recent = [p for p in race.included if p["fieldwork_end"] and D.days_between(p["fieldwork_end"], ref_date) <= 30]
    st = calib.get("covariate_standardization", {})
    m1, s1 = st.get("log1p_n_institutes_30d", [0.0, 1.0])
    m2, s2 = st.get("dispersion_30d", [0.0, 1.0])
    ninst = np.log1p(len({p["pollster"] for p in recent}))
    if len(recent) >= 3:
        idx = [race.poll_ids.index(p["id"]) for p in recent]
        disp = float(np.std(race.y[idx, 0]))
    else:
        disp = m2
    return np.array([(ninst - m1) / (s1 or 1.0), (disp - m2) / (s2 or 1.0)])


def _validate_shares(sh: np.ndarray) -> None:
    if not np.all(np.isfinite(sh)):
        raise FloatingPointError("frações não finitas")
    if np.any(sh < 0) or np.any(sh > 1):
        raise FloatingPointError("fração fora de [0, 1]")
    if np.max(np.abs(sh.sum(axis=1) - 1)) > 1e-9:
        raise FloatingPointError("frações não somam 100%")


def _validate_probs(p: dict) -> None:
    first = np.array(p["first"])
    if np.any(first < 0) or np.any(first > 1) or abs(first.sum() - 1) > 1e-9:
        raise FloatingPointError("distribuição de probabilidade inválida")


def output_hash(snap: dict) -> str:
    payload = {k: v for k, v in snap.items() if k not in ("run", "output_sha256")}
    return hashlib.sha256(canonical_json(payload)).hexdigest()


def latest_snapshot(race_id: str) -> dict | None:
    """O snapshot mais recente: data de referência, depois horário de execução (não o nome)."""
    rows = []
    for f in glob.glob(os.path.join(SNAP_DIR, race_id, "*.json")):
        with open(f, encoding="utf-8") as fh:
            s = json.load(fh)
        rows.append(((s["reference_date"], (s.get("run") or {}).get("executed_at", ""), f), s))
    rows.sort(key=lambda r: r[0])
    return rows[-1][1] if rows else None



def append_run(row: dict) -> None:
    os.makedirs(FORECAST_DIR, exist_ok=True)
    with open(RUNS, "a", encoding="utf-8") as f:
        f.write(json.dumps(row, ensure_ascii=False, sort_keys=True) + "\n")


def update(cfg: dict, cfg_path: str, ref_date: str | None = None, force: bool = False, log=print) -> int:
    ref_date = ref_date or dt.datetime.now(dt.timezone.utc).date().isoformat()
    dt.date.fromisoformat(ref_date)
    cfg_sha = sha256_file(cfg_path)
    failures = 0
    check_manifest()
    try:
        with exclusive_lock(os.path.join(FORECAST_DIR, ".lock")):
            with tempfile.TemporaryDirectory() as tmp:
                path = os.path.join(tmp, "atual.json")
                # Lag 0: no modo atual, a pesquisa que está no banco JÁ foi divulgada.
                export(path, as_of=ref_date, lag=0, vintage=Vintage("current", None, None), scratch=tmp, with_results=True)
                ex = D.load_export(path)
            calib, cf = load_calibration(cfg)
            bt = load_backtest_summary()
            election = (ex.get("calendar") or {}).get("second_round")
            if not election:
                log("sem calendário de 2º turno no exportador: nada a fazer")
                return 0
            if ref_date > election:
                log(f"data de referência {ref_date} depois do 2º turno ({election}): previsão encerrada")
                return 0
            for rc in ex["runoff_contests"]:
                rid = race_id_of(rc["contest"], 2, election)
                executed_at = dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds")
                try:
                    prev = latest_snapshot(rid)
                    prev_sha = prev["input"].get("input_sha256") if (prev and not force) else None
                    try:
                        snap, race, fit = build_snapshot(cfg, cfg_sha, ex, rc, ref_date, calib, cf, bt, election, prev_sha)
                    except Unchanged:
                        log(f"{rid}: sem mudança material")
                        continue
                    if prev_sha is not None and prev_sha == snap["input"].get("input_sha256"):
                        log(f"{rid}: sem mudança material")
                        continue
                    snap["output_sha256"] = output_hash(snap)
                    snap["run"] = {"executed_at": executed_at}
                    name = f"{ref_date}_{snap['input']['input_sha256'][:10]}.json"
                    target = os.path.join(SNAP_DIR, rid, name)
                    data = json.dumps(snap, ensure_ascii=False, indent=1, default=_np, allow_nan=False).encode() + b"\n"
                    if snap["status"]["overall"] == "nao_convergiu":
                        # Não publica: registra a falha e o índice segue no último válido.
                        failures += 1
                        append_run({"race_id": rid, "reference_date": ref_date, "executed_at": executed_at,
                                    "status": "nao_convergiu", "reasons": snap["status"]["reasons"],
                                    "input_sha256": snap["input"]["input_sha256"]})
                        log(f"{rid}: NÃO CONVERGIU — {snap['status']['reasons']}")
                        continue
                    res = write_immutable(target, data)
                    append_run({"race_id": rid, "reference_date": ref_date, "executed_at": executed_at,
                                "status": snap["status"]["overall"], "snapshot": os.path.relpath(target, FORECAST_DIR),
                                "input_sha256": snap["input"]["input_sha256"], "output_sha256": snap["output_sha256"],
                                "write": res})
                    log(f"{rid}: {snap['status']['overall']} ({res}) → {os.path.relpath(target, REPO)}")
                except Exception as e:  # falha registrada; o último snapshot válido continua no ar
                    failures += 1
                    append_run({"race_id": rid, "reference_date": ref_date, "executed_at": executed_at,
                                "status": "falhou", "error": f"{type(e).__name__}: {e}"})
                    log(f"{rid}: FALHOU — {type(e).__name__}: {e}")
            rebuild_index()
    except LockBusy as e:
        log(str(e))
        return 2
    return 1 if failures else 0


def rebuild_index() -> dict:
    """Índice = para cada disputa, todos os snapshots publicados, do mais antigo ao mais novo."""
    races = []
    for d in sorted(glob.glob(os.path.join(SNAP_DIR, "*"))):
        if not os.path.isdir(d):
            continue
        hist = []
        for f in sorted(glob.glob(os.path.join(d, "*.json"))):
            with open(f, encoding="utf-8") as fh:
                s = json.load(fh)
            if output_hash(s) != s.get("output_sha256"):
                raise ValueError(f"hash de saída não confere: {os.path.relpath(f, REPO)}")
            entry = {
                "path": os.path.relpath(f, FORECAST_DIR),
                "reference_date": s["reference_date"],
                "status": s["status"],
                "n_polls": s["input"].get("n_polls"),
                "latest_fieldwork_end": s["input"].get("latest_fieldwork_end"),
                "output_sha256": s["output_sha256"],
                "executed_at": (s.get("run") or {}).get("executed_at", ""),
            }
            if s.get("probabilities"):
                entry["probability_first"] = s["probabilities"]["first"]
            if s.get("nowcast"):
                entry["nowcast_median"] = [r["quantiles"]["0.5"] for r in s["nowcast"]["summary"]]
                entry["nowcast_q10"] = [r["quantiles"]["0.1"] for r in s["nowcast"]["summary"]]
                entry["nowcast_q90"] = [r["quantiles"]["0.9"] for r in s["nowcast"]["summary"]]
            if s.get("projection"):
                entry["projection_median"] = [r["quantiles"]["0.5"] for r in s["projection"]["summary"]]
                entry["projection_q10"] = [r["quantiles"]["0.1"] for r in s["projection"]["summary"]]
                entry["projection_q90"] = [r["quantiles"]["0.9"] for r in s["projection"]["summary"]]
            hist.append(entry)
        # Na mesma data pode haver mais de um snapshot (pesquisa nova à tarde, código
        # novo): o nome traz um hash, então a ordem é a da EXECUÇÃO, não a do nome.
        hist.sort(key=lambda e: (e["reference_date"], e["executed_at"], e["path"]))
        if not hist:
            continue
        latest = hist[-1]
        with open(os.path.join(FORECAST_DIR, latest["path"]), encoding="utf-8") as fh:
            s = json.load(fh)
        races.append({
            "race_id": s["race_id"], "contest": s["contest"], "race": s["race"], "uf": s["uf"], "round": s["round"],
            "election_date": s["election_date"],
            "candidates": [{"candidate_id": c["candidate_id"], "name": c["name"]} for c in s["candidates"]],
            "latest": latest["path"], "history": hist,
        })
    races.sort(key=lambda r: (r["race"] != "presidente", r["uf"] or ""))
    idx = {"schema": INDEX_SCHEMA, "races": races}
    atomic_write(INDEX, json.dumps(idx, ensure_ascii=False, indent=1, allow_nan=False).encode() + b"\n")
    return idx


def validate_snapshot(s: dict) -> list[str]:
    errs = []
    for k in ("schema", "race_id", "reference_date", "election_date", "model", "input", "status", "output_sha256"):
        if k not in s:
            errs.append(f"campo ausente: {k}")
    if errs:
        return errs
    if s["schema"] != SNAPSHOT_SCHEMA:
        errs.append(f"schema inesperado: {s['schema']}")
    if output_hash(s) != s["output_sha256"]:
        errs.append("hash de saída não confere (snapshot alterado depois de publicado?)")
    for block in ("nowcast", "projection", "trend_model"):
        b = s.get(block)
        if not b:
            continue
        means = sum(r["mean"] for r in b["summary"])
        if abs(means - 100) > 0.05:
            errs.append(f"{block}: médias somam {means:.3f}, não 100")
        for r in b["summary"]:
            q = [r["quantiles"][k] for k in sorted(r["quantiles"], key=float)]
            if any(b2 < a2 - 1e-9 for a2, b2 in zip(q, q[1:])):
                errs.append(f"{block}: quantis não monótonos para {r['label']}")
            if any(v < 0 or v > 100 for v in q):
                errs.append(f"{block}: quantil fora de [0, 100] para {r['label']}")
    for where, pr in (("modelo", s.get("probabilities")), ("tendência", (s.get("trend_model") or {}).get("probabilities"))):
        if pr:
            f = pr["first"]
            if abs(sum(f) - 1) > 1e-3 or any(v < 0 or v > 1 for v in f):
                errs.append(f"probabilidades inválidas ({where})")
    if s["status"]["probability"] == "retida" and (s.get("trend_model") or {}).get("probabilities"):
        errs.append("probabilidade retida, mas o modelo de tendência traz probabilidades")
    if s["status"]["probability"] in ("publicada", "experimental") and not s.get("probabilities"):
        errs.append(f"status diz probabilidade {s['status']['probability']}, mas não há probabilidades")
    if s["status"]["probability"] == "retida" and s.get("probabilities"):
        errs.append("probabilidade retida, mas o snapshot contém probabilidades")
    return errs


def validate_all(log=print) -> int:
    bad = 0
    try:
        check_manifest()
    except RuntimeError as e:
        log(f"✗ {e}")
        return 1
    files = sorted(glob.glob(os.path.join(SNAP_DIR, "*", "*.json")))
    for f in files:
        with open(f, encoding="utf-8") as fh:
            s = json.load(fh)
        errs = validate_snapshot(s)
        if errs:
            bad += 1
            log(f"✗ {os.path.relpath(f, REPO)}: {'; '.join(errs)}")
    if os.path.exists(INDEX):
        with open(INDEX, encoding="utf-8") as fh:
            idx = json.load(fh)
        for r in idx["races"]:
            if not os.path.exists(os.path.join(FORECAST_DIR, r["latest"])):
                bad += 1
                log(f"✗ índice aponta para snapshot inexistente: {r['latest']}")
    log(f"{len(files)} snapshots conferidos, {bad} com problema")
    return 1 if bad else 0


def reproduce(path: str, cfg: dict, log=print) -> int:
    """Refaz um snapshot com o MESMO banco (o commit que o gerou) e compara.

    Bit a bit na mesma plataforma e versão do numpy; entre plataformas o MCMC
    pode divergir no último dígito e a comparação vira tolerância de Monte
    Carlo (0,3 p.p. nos quantis).
    """
    with open(path, encoding="utf-8") as f:
        snap = json.load(f)
    if snap.get("input", {}).get("source_polls_sha256") is None:
        log("snapshot sem estimativas: nada a reproduzir"); return 0
    cur_sha = sha256_file(os.path.join(REPO, "data", "polls.json"))
    if cur_sha != snap["input"]["source_polls_sha256"]:
        log("o data/polls.json atual não é o que gerou este snapshot; faça checkout do commit correspondente "
            f"(sha256 esperado {snap['input']['source_polls_sha256'][:12]}…, atual {cur_sha[:12]}…)")
        return 2
    cfg_path = os.path.join(REPO, "forecast", "config", "model-v1.json")
    with tempfile.TemporaryDirectory() as tmp:
        p = os.path.join(tmp, "atual.json")
        export(p, as_of=snap["reference_date"], lag=0, vintage=Vintage("current", None, None), scratch=tmp, with_results=True)
        ex = D.load_export(p)
    rc = next(r for r in ex["runoff_contests"] if r["contest"] == snap["contest"])
    calib, cf = load_calibration(cfg)
    new, _, _ = build_snapshot(cfg, sha256_file(cfg_path), ex, rc, snap["reference_date"], calib, cf,
                               load_backtest_summary(), snap["election_date"])
    new["output_sha256"] = output_hash(new)
    if new["output_sha256"] == snap["output_sha256"]:
        log("reproduzido bit a bit ✓"); return 0
    worst = 0.0
    for block in ("nowcast", "projection"):
        if snap.get(block) and new.get(block):
            for a, b in zip(snap[block]["summary"], new[block]["summary"]):
                for k in a["quantiles"]:
                    worst = max(worst, abs(a["quantiles"][k] - b["quantiles"][k]))
    log(f"não idêntico; maior diferença de quantil = {worst:.3f} p.p.")
    return 0 if worst <= 0.3 else 1
