"""Migração 0001 — estrutura inicial do armazenamento da previsão.

O "banco" do site é o store NDJSON versionado no git (data/*.ndjson); a camada
de previsão segue o mesmo princípio e NÃO toca nenhum arquivo existente. Esta
migração cria, se faltar, a estrutura de data/forecast/ e o manifesto com as
versões de esquema das "tabelas":

  snapshots/<disputa>/<data>_<hash>.json  previsões publicadas (imutáveis)
  index.json                              ponteiro: snapshots por disputa
  runs.ndjson                             registro de execuções (só acrescenta)
  calibration/<id>.json                   resultados de calibração
  backtests/<id>.json                     execuções de backtest
  manifest.json                           versões de esquema + migrações aplicadas

Idempotente: rodar de novo não muda nada. Uma migração futura que mude um
esquema sobe a versão no manifesto, e o publicador recusa gravar num store cuja
versão não é a que o código espera (publish.check_manifest).
"""

from __future__ import annotations

import json
import os

ID = "0001_estrutura_inicial"
SCHEMAS = {"snapshot": 1, "index": 1, "runs": 1, "calibration": 1, "backtest": 1}


def apply(forecast_dir: str) -> bool:
    os.makedirs(forecast_dir, exist_ok=True)
    for sub in ("snapshots", "calibration", "backtests"):
        os.makedirs(os.path.join(forecast_dir, sub), exist_ok=True)
        keep = os.path.join(forecast_dir, sub, ".gitkeep")
        if not os.listdir(os.path.join(forecast_dir, sub)):
            open(keep, "w").close()
    path = os.path.join(forecast_dir, "manifest.json")
    man = {"schema_versions": {}, "migrations": []}
    if os.path.exists(path):
        with open(path, encoding="utf-8") as f:
            man = json.load(f)
    if ID in man["migrations"]:
        return False
    man["schema_versions"].update(SCHEMAS)
    man["migrations"].append(ID)
    with open(path + ".tmp", "w", encoding="utf-8") as f:
        json.dump(man, f, ensure_ascii=False, indent=1, sort_keys=True)
        f.write("\n")
    os.replace(path + ".tmp", path)
    return True
