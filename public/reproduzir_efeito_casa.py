#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""
reproduzir_efeito_casa.py
=========================

Reimplementação INDEPENDENTE (só stdlib) do "efeito casa" (house effects)
publicado no Placar das Pesquisas. Prova, com uma segunda implementação escrita
do zero a partir da definição matemática, que a matriz instituto × candidato do
site é reproduzível a partir dos dados brutos (`data/polls.json`).

Espelha, sem importar, a lógica de:
  - src/lib/average.ts      (sortPollsDesc, selectWindow, candKey, computeAverage)
  - src/lib/validos.ts      (toBasis / validDenominator — o cut de votos válidos)
  - src/lib/houseEffects.ts (o método leave-one-out e os portões de robustez)

BASE = VOTOS VÁLIDOS (endurecido após revisão adversarial, 25/08/2026).
Cada pesquisa é convertida a votos válidos ANTES de qualquer conta — instituto e
consenso na mesma base efetiva — para isolar o viés por candidato do artefato de
alocação de indecisos (institutos "forçam" o indeciso em graus diferentes; sem a
conversão, quem espreme mais indeciso parece superestimar TODOS os candidatos).
Isto espelha `houseEffects.ts`, cuja 1ª linha agora é
`pollsFor(...).map(p => toBasis(p, "validos"))`.

MÉTODO (leave-one-out). Para cada pesquisa p do instituto J na data d testando o
candidato c, com pct JÁ em votos válidos:

    resíduo(p, c) = pct_p^válidos(c) − consenso_sem_J(c, d)

onde consenso_sem_J(c, d) é a média móvel do site (regra `selectWindow`: as
LATEST_N pesquisas mais recentes até d, no máximo MAX_PER_POLLSTER por instituto)
sobre as pesquisas dos OUTROS institutos (também em válidos) publicadas até d. O
efeito casa de (J, c) é a média dos resíduos; a magnitude do instituto é a média
de |efeito| entre as células preenchidas.

Uso:
    python3 reproduzir_efeito_casa.py [caminho/para/polls.json]
"""

import csv
import json
import math
import os
import random
import statistics
import sys
from functools import cmp_to_key

# ─────────────────────────────────────────────────────────────────────────────
# PARÂMETROS DO MODELO — extraídos LENDO o código, não presumidos.
# ─────────────────────────────────────────────────────────────────────────────
LATEST_N = 10               # tamanho da janela (nº de pesquisas)
MAX_PER_POLLSTER = 2        # teto de pesquisas por instituto dentro da janela
MIN_POLLS = 3               # piso: se o teto deixar menos que isto, faz backfill
MIN_POLLS_PER_POLLSTER = 3  # instituto precisa de ≥ isto de pesquisas na disputa
MIN_OBS_PER_CELL = 2        # célula (J,c) precisa de ≥ isto de resíduos
MIN_CONSENSUS_POLLS = 3     # consenso só conta com ≥ isto de valores na janela
MAX_COLUMNS = 6             # nº de colunas (candidatos) exibidas

# t de Student, bicaudal 95% (t_{df, 0.975}). Para df ausente usa 1,960.
T95 = {1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571, 6: 2.447, 7: 2.365,
       8: 2.306, 9: 2.262, 10: 2.228, 11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145,
       15: 2.131, 16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
       21: 2.080, 22: 2.074, 23: 2.069, 24: 2.064, 25: 2.060, 26: 2.056,
       27: 2.052, 28: 2.048, 29: 2.045, 30: 2.042}


def t_crit(df):
    """Valor crítico t bicaudal 95% para `df` graus de liberdade."""
    if df <= 0:
        return float("inf")
    return T95.get(df, 1.960)


# ─────────────────────────────────────────────────────────────────────────────
# PRIMITIVAS — espelham average.ts
# ─────────────────────────────────────────────────────────────────────────────
def cand_key(name):
    """average.ts candKey: NFD → remove acentos → minúsculas → trim."""
    import unicodedata
    s = unicodedata.normalize("NFD", name or "")
    s = "".join(ch for ch in s if unicodedata.category(ch) != "Mn")
    return s.lower().strip()


def pollster_key(name):
    return (name or "").lower().strip()


def poll_date(p):
    """average.ts pollDate: fieldwork_end ?? published_date ?? fieldwork_start."""
    for k in ("fieldwork_end", "published_date", "fieldwork_start"):
        v = p.get(k)
        if v is not None:
            return v
    return None


def _cmp_desc(x, y):
    """sortPollsDesc: data DESC, desempate por id ASC."""
    dx = poll_date(x) or "0000"
    dy = poll_date(y) or "0000"
    if dy != dx:
        return -1 if dy < dx else 1
    ix, iy = x.get("id", ""), y.get("id", "")
    if ix != iy:
        return -1 if ix < iy else 1
    return 0


def sort_polls_desc(polls):
    return sorted(polls, key=cmp_to_key(_cmp_desc))


def select_window(sorted_polls):
    """selectWindow: até LATEST_N pesquisas, ≤ MAX_PER_POLLSTER por instituto;
    backfill até MIN_POLLS se o teto esvaziar a janela. Retorna (window, relax)."""
    picked, skipped, held = [], [], {}
    for p in sorted_polls:
        if len(picked) >= LATEST_N:
            break
        k = pollster_key(p["pollster"])
        n = held.get(k, 0)
        if n >= MAX_PER_POLLSTER:
            skipped.append(p)
            continue
        held[k] = n + 1
        picked.append(p)
    cap_relaxed = False
    for p in skipped:
        if len(picked) >= MIN_POLLS:
            break
        picked.append(p)
        cap_relaxed = True
    return sort_polls_desc(picked), cap_relaxed


def mean(xs):
    return sum(xs) / len(xs) if xs else 0.0


def round1(x):
    """Math.round(x*10)/10 do JS (half-up em direção a +∞)."""
    return math.floor(x * 10 + 0.5) / 10


# ─────────────────────────────────────────────────────────────────────────────
# VOTOS VÁLIDOS — espelha validos.ts (validDenominator / toBasis).
# Agora aplicado ANTES do cálculo dos resíduos (instituto E consenso).
# ─────────────────────────────────────────────────────────────────────────────
def to_validos(p):
    """Converte p ao cut de votos válidos: denominador = candidatos + others_pct.
    Presidencial é convertível. Denom ≤ 0 ou escala ≈ 1 → devolve a própria."""
    denom = sum(r["pct"] for r in p["results"]) + (p.get("others_pct") or 0)
    if denom <= 0:
        return p
    scale = 100.0 / denom
    if abs(scale - 1) < 1e-9:
        return p
    q = dict(p)
    q["results"] = [dict(r, pct=r["pct"] * scale) for r in p["results"]]
    if p.get("others_pct") is not None:
        q["others_pct"] = p["others_pct"] * scale
    return q


# ─────────────────────────────────────────────────────────────────────────────
# CONSENSO (leave-one-out) — espelha houseEffects.ts asOfAverage
# ─────────────────────────────────────────────────────────────────────────────
def as_of_average(polls, date, key):
    """Média móvel do site (selectWindow) para `key`, sobre `polls` (já sem J e
    já em válidos) publicadas ATÉ `date`. None se < MIN_CONSENSUS_POLLS valores."""
    upto = [p for p in polls if poll_date(p) is not None and poll_date(p) <= date]
    if not upto:
        return None
    window, _ = select_window(sort_polls_desc(upto))
    vals = []
    for p in window:
        for r in p["results"]:
            if cand_key(r["candidate"]) == key and r.get("pct") is not None:
                vals.append(r["pct"])
                break
    return mean(vals) if len(vals) >= MIN_CONSENSUS_POLLS else None


# ─────────────────────────────────────────────────────────────────────────────
# COLUNAS — espelha presidente.ts raceEvolutionData: média válidos (computeAverage)
# → filtra registrados → top-MAX_COLUMNS. Recebe as pesquisas BRUTAS (converte
# internamente, como o site: `evo` roda seu próprio pollsFor cru).
# ─────────────────────────────────────────────────────────────────────────────
def registered_keys(data_dir, cargo="presidente"):
    """Chaves candKey de nome_urna registrados (candidaturas.ndjson). home.ts."""
    path = os.path.join(data_dir, "candidaturas.ndjson")
    keys = set()
    if not os.path.exists(path):
        return keys
    with open(path, encoding="utf-8") as f:
        for line in f:
            t = line.strip()
            if not t:
                continue
            try:
                r = json.loads(t)
            except json.JSONDecodeError:
                continue
            if r.get("cargo") == cargo and r.get("nome_urna"):
                keys.add(cand_key(r["nome_urna"]))
    return keys


def compute_columns(raw_polls, reg):
    """Colunas = campo registrado, ordenado por média (válidos), top-MAX_COLUMNS."""
    usable = [p for p in raw_polls
              if not p.get("incomplete") and not p.get("municipal")]
    converted = [to_validos(p) for p in usable]
    window, _ = select_window(sort_polls_desc(converted))
    roster = {}
    for p in window:
        for r in p["results"]:
            k = cand_key(r["candidate"])
            if k not in roster:
                roster[k] = r["candidate"]
    avgs = []
    for k, disp in roster.items():
        vals = []
        for p in window:
            for r in p["results"]:
                if cand_key(r["candidate"]) == k and r.get("pct") is not None:
                    vals.append(r["pct"])
                    break
        if vals:
            avgs.append((k, disp, round1(mean(vals))))
    avgs.sort(key=lambda t: -t[2])
    cols = [(k, disp) for (k, disp, a) in avgs if not reg or k in reg]
    return cols[:MAX_COLUMNS]


# ─────────────────────────────────────────────────────────────────────────────
# INCERTEZA — EP ingênuo (s/√n) e EP por moving-block bootstrap (autocorrelação).
# ─────────────────────────────────────────────────────────────────────────────
def block_bootstrap_se(residuals, seed=20260825, B=4000):
    """EP da média por moving-block bootstrap. Blocos de comprimento
    L=max(1, round(n**(1/3))) — capta a autocorrelação dos resíduos do mesmo
    instituto (janelas de consenso sobrepostas + tendência da opinião). Só é
    confiável para n≳6; para n pequeno retorna None (lá vale o t(df) sobre s/√n).
    Determinístico dado o seed."""
    n = len(residuals)
    if n < 6:
        return None
    L = max(1, round(n ** (1.0 / 3.0)))
    rng = random.Random(seed)
    starts = list(range(0, n - L + 1))
    nblocks = math.ceil(n / L)
    means = []
    for _ in range(B):
        sample = []
        for _ in range(nblocks):
            s = rng.choice(starts)
            sample.extend(residuals[s:s + L])
        sample = sample[:n]
        means.append(sum(sample) / len(sample))
    return statistics.pstdev(means)


# ─────────────────────────────────────────────────────────────────────────────
# EFEITO CASA — espelha houseEffects.ts. Recebe pesquisas JÁ em válidos.
# ─────────────────────────────────────────────────────────────────────────────
def house_effects(validos_polls, columns):
    by_pollster = {}
    for p in validos_polls:
        by_pollster.setdefault(pollster_key(p["pollster"]), []).append(p)

    rows = []
    for k, own in by_pollster.items():
        if len(own) < MIN_POLLS_PER_POLLSTER:
            continue
        others = [p for p in validos_polls if pollster_key(p["pollster"]) != k]
        if not others:
            continue

        cells = []
        for (col_key, _disp) in columns:
            residuals = []
            for p in own:
                d = poll_date(p)
                if not d:
                    continue
                mine = None
                for r in p["results"]:
                    if cand_key(r["candidate"]) == col_key:
                        mine = r.get("pct")
                        break
                if mine is None:
                    continue
                consensus = as_of_average(others, d, col_key)
                if consensus is None:
                    continue
                residuals.append(mine - consensus)

            if len(residuals) >= MIN_OBS_PER_CELL:
                raw_mean = mean(residuals)
                eff = round1(raw_mean)
                std = statistics.stdev(residuals) if len(residuals) >= 2 else 0.0
                n = len(residuals)
                se = std / math.sqrt(n) if n else 0.0
                se_block = block_bootstrap_se(residuals)
                df = n - 1
                # teste t bicaudal 95% (H0: média dos resíduos = 0), com o EP
                # HONESTO (block bootstrap quando disponível, senão s/√n).
                se_hon = se_block if se_block else se
                tstat = abs(raw_mean) / se_hon if se_hon > 0 else float("inf")
                sig = tstat > t_crit(df)
                cells.append({
                    "effect": eff, "raw_mean": raw_mean, "n": n, "df": df,
                    "std": std, "se": se, "se_block": se_block,
                    "se_hon": se_hon, "tstat": tstat, "sig95": sig,
                    "residuals": residuals,
                })
            else:
                cells.append(None)

        filled = [c for c in cells if c is not None]
        if not filled:
            continue
        magnitude = round1(mean([abs(c["effect"]) for c in filled]))
        rows.append({
            "pollster": own[0]["pollster"], "n_polls": len(own),
            "cells": cells, "magnitude": magnitude,
        })

    rows.sort(key=lambda r: (-r["magnitude"], -r["n_polls"]))
    return rows


# ─────────────────────────────────────────────────────────────────────────────
# APRESENTAÇÃO
# ─────────────────────────────────────────────────────────────────────────────
def fmt_signed(v, places=1):
    """format.ts fmtSigned + regra do componente (|v|<0,5 → '≈0')."""
    if v is None:
        return "—"
    if abs(v) < 0.5:
        return "≈0"
    s = f"{abs(v):.{places}f}".replace(".", ",")
    return ("−" if v < 0 else "+") + s


def find_polls_json(argv):
    if len(argv) > 1:
        return argv[1]
    here = os.path.dirname(os.path.abspath(__file__))
    for cand in ("data/polls.json",
                 os.path.join(here, "polls.json"),
                 os.path.join(here, "data_link", "polls.json")):
        if os.path.exists(cand):
            return cand
    return "data/polls.json"


def build(path):
    """Carrega, filtra a disputa presidencial 1º turno e devolve (colunas, linhas,
    n_pesquisas). Fonte única de verdade também para o verificador de fidelidade."""
    data_dir = os.path.dirname(os.path.abspath(path))
    dataset = json.load(open(path, encoding="utf-8"))
    raw = [p for p in dataset["polls"]
           if p.get("race") == "presidente" and p.get("state") is None
           and p.get("round") == 1]
    reg = registered_keys(data_dir)
    columns = compute_columns(raw, reg)               # colunas: converte internamente
    validos = [to_validos(p) for p in raw]            # base VÁLIDOS p/ os resíduos
    rows = house_effects(validos, columns)
    return columns, rows, len(raw)


def main():
    path = find_polls_json(sys.argv)
    if not os.path.exists(path):
        sys.exit(f"não encontrei polls.json em: {path}")
    columns, rows, npolls = build(path)
    col_disp = [disp for (_k, disp) in columns]

    print(f"\nEFEITO CASA — presidencial, 1º turno · VOTOS VÁLIDOS "
          f"({npolls} pesquisas na disputa)\n")
    header = ["Instituto".ljust(20), "n".rjust(3)] + [d[:8].rjust(8) for d in col_disp]
    print("  ".join(header))
    print("-" * (26 + 10 * len(col_disp)))
    for r in rows:
        line = [r["pollster"].ljust(20), str(r["n_polls"]).rjust(3)]
        for c in r["cells"]:
            line.append((fmt_signed(c["effect"]) if c else "—").rjust(8))
        print("  ".join(line))
    print()

    out_csv = os.path.join(os.path.dirname(os.path.abspath(__file__)),
                           "matriz_efeito_casa.csv")
    with open(out_csv, "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["instituto", "n_pesquisas", "candidato", "efeito",
                    "n_observacoes", "erro_padrao", "erro_padrao_bloco",
                    "gl", "t", "significativo_95"])
        for r in rows:
            for (col_key, disp), c in zip(columns, r["cells"]):
                if c is None:
                    w.writerow([r["pollster"], r["n_polls"], disp, "", 0,
                                "", "", "", "", ""])
                else:
                    w.writerow([
                        r["pollster"], r["n_polls"], disp, f"{c['effect']:.1f}",
                        c["n"], f"{c['se']:.2f}",
                        f"{c['se_block']:.2f}" if c["se_block"] else "",
                        c["df"], f"{c['tstat']:.1f}",
                        "sim" if c["sig95"] else "nao",
                    ])
    print(f"CSV gravado em: {out_csv}")
    return columns, rows


if __name__ == "__main__":
    main()
