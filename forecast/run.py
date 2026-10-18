#!/usr/bin/env python3
"""Linha de comando da camada de previsão.

  python3 forecast/run.py update   [--ref-date AAAA-MM-DD] [--config …]
      Rodada de produção: exporta o banco atual, ajusta as disputas de
      2º turno com material novo, valida e grava snapshots imutáveis.
  python3 forecast/run.py migrate
      Cria/atualiza a estrutura de data/forecast (idempotente).
  python3 forecast/run.py validate
      Revalida todos os snapshots publicados (esquema, somas, hashes).
  python3 forecast/run.py backtest-fit [--workers 4] [--contest presidente:BR …]
      Etapa cara do backtest (ajustes por horizonte, em cache).
  python3 forecast/run.py backtest-evaluate
      Calibração + simulação + métricas sobre o cache; grava resultados.
  python3 forecast/run.py reproduce <snapshot.json>
      Refaz um snapshot a partir do que ele registra e compara os números.
"""

from __future__ import annotations

import argparse
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)

DEFAULT_CONFIG = os.path.join(HERE, "config", "model-v1.json")
CACHE = os.path.join(HERE, ".cache")


def load_cfg(path: str) -> dict:
    with open(path, encoding="utf-8") as f:
        return json.load(f)


def main(argv=None) -> int:
    ap = argparse.ArgumentParser(prog="forecast/run.py")
    ap.add_argument("command", choices=["update", "validate", "migrate", "backtest-fit", "backtest-evaluate", "reproduce"])
    ap.add_argument("target", nargs="?")
    ap.add_argument("--config", default=DEFAULT_CONFIG)
    ap.add_argument("--ref-date")
    ap.add_argument("--workers", type=int, default=4)
    ap.add_argument("--contest", action="append")
    ap.add_argument("--force", action="store_true")
    a = ap.parse_args(argv)
    cfg = load_cfg(a.config)

    if a.command == "backtest-fit":
        from placar_forecast.backtest import run_fits
        recs = run_fits(cfg, os.path.join(CACHE, "backtest"), workers=a.workers, contests=a.contest)
        ok = sum(r["status"] == "ok" for r in recs)
        print(f"ajustes: {ok}/{len(recs)} ok")
        return 0
    if a.command == "backtest-evaluate":
        from placar_forecast.evaluate import evaluate
        evaluate(cfg, os.path.join(CACHE, "backtest"))
        return 0
    if a.command == "update":
        from placar_forecast.publish import update
        return update(cfg, a.config, ref_date=a.ref_date, force=a.force)
    if a.command == "migrate":
        from placar_forecast.publish import migrate
        done = migrate()
        print("migrações aplicadas: " + (", ".join(done) if done else "nenhuma (em dia)"))
        return 0
    if a.command == "validate":
        from placar_forecast.publish import validate_all
        return validate_all()
    if a.command == "reproduce":
        from placar_forecast.publish import reproduce
        return reproduce(a.target, cfg)
    return 1


if __name__ == "__main__":
    sys.exit(main())
