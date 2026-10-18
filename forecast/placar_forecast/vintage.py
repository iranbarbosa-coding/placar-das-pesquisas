"""O que o banco sabia numa data — vintages do git e o exportador.

O cron comita `data/polls.json` a cada rodada, então o histórico do git É a
série de vintages: para uma previsão "feita no fim do dia T", o vintage é o
último commit que tocou `data/polls.json` antes de T 23:59 em Brasília. Isso
elimina, além das pesquisas futuras, a outra forma de vazamento que um filtro
por data não pega — CORREÇÕES posteriores (reparos curados, datas consertadas,
nomes reconciliados) aplicadas a pesquisas antigas.

Antes do primeiro vintage (12/08/2026) não há como saber o que estava
disponível: a data é RECONSTRUÍDA sobre o banco atual, com a regra de
disponibilidade (divulgação, ou fim de campo + defasagem). O registro de
cada previsão diz qual dos dois modos foi usado.
"""

from __future__ import annotations

import datetime as dt
import os
import subprocess
from dataclasses import dataclass

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
EXPORTER = os.path.join(REPO, "scripts", "forecast", "export-inputs.mjs")


@dataclass(frozen=True)
class Vintage:
    kind: str                 # "vintage" | "reconstructed" | "current"
    commit: str | None
    committed_at: str | None


def git(*args: str) -> str:
    return subprocess.run(["git", "-C", REPO, *args], check=True, capture_output=True, text=True).stdout


def list_vintages(path: str = "data/polls.json") -> list[tuple[str, dt.datetime]]:
    out = git("log", "--format=%H %cI", "--", path)
    rows = []
    for line in out.strip().splitlines():
        sha, when = line.split(" ", 1)
        rows.append((sha, dt.datetime.fromisoformat(when).astimezone(dt.timezone.utc)))
    rows.sort(key=lambda r: r[1])
    return rows


def vintage_for(ref_date: str, offset_hours: int, vintages: list[tuple[str, dt.datetime]]) -> Vintage:
    """Último commit antes do fim do dia `ref_date` no horário de Brasília (UTC−offset)."""
    d = dt.date.fromisoformat(ref_date)
    cutoff = dt.datetime(d.year, d.month, d.day, tzinfo=dt.timezone.utc) + dt.timedelta(days=1, hours=offset_hours)
    before = [v for v in vintages if v[1] < cutoff]
    if not before:
        return Vintage("reconstructed", None, None)
    sha, when = before[-1]
    return Vintage("vintage", sha, when.isoformat())


def export(out_path: str, *, as_of: str | None, lag: int, vintage: Vintage, scratch: str,
           with_results: bool) -> None:
    """Roda o exportador sobre o vintage pedido (ou o banco atual)."""
    polls = os.path.join(REPO, "data", "polls.json")
    if vintage.kind == "vintage":
        polls = os.path.join(scratch, f"polls-{vintage.commit[:12]}.json")
        if not os.path.exists(polls):
            blob = subprocess.run(["git", "-C", REPO, "show", f"{vintage.commit}:data/polls.json"],
                                  check=True, capture_output=True).stdout
            with open(polls + ".tmp", "wb") as f:
                f.write(blob)
            os.replace(polls + ".tmp", polls)
    cmd = ["node", "--no-warnings", EXPORTER, "--out", out_path, "--polls", polls, "--lag", str(lag),
           "--source-kind", vintage.kind]
    if as_of:
        cmd += ["--as-of", as_of]
    if vintage.commit:
        cmd += ["--commit", vintage.commit, "--committed-at", vintage.committed_at or ""]
    if not with_results:
        cmd += ["--results", "none"]
    subprocess.run(cmd, check=True, cwd=REPO, capture_output=True, text=True)
