#!/usr/bin/env python3
"""Calibração da CHANCE DE VITÓRIA ao vivo na apuração do 2º turno.

Refaz a apuração do 1º turno de 2026 (Lula × Flávio, só os dois) NA ORDEM REAL em
que cada município terminou de ser totalizado (horário "dt/ht" do arquivo de
andamento do TSE) e, a cada 10 minutos, projeta o resultado final com o mesmo
método da página ao vivo, usando como base o 2º turno de 2022 (Lula × Bolsonaro,
Portal de Dados Abertos do TSE). O erro de cada projeção contra o resultado final
verdadeiro mede quanto o método erra em função da fração que falta apurar —
é essa medida, e não um número escolhido, que vira a incerteza da chance.

Método (igual ao de src/lib/chance-vitoria.ts):
  • votos dos dois que faltam no município m = eleitorado que falta × comparecimento
    observado na UF × (votos dos dois ÷ comparecimento) observado na UF;
  • fatia de Flávio no que falta = base_m + variação da UF (já contados na UF vs. a
    base nesses mesmos municípios); UF sem nada contado usa a variação nacional;
  • erro = projeção − final; r = fração estimada dos votos que faltam.

Saída: data/apuracao/calibracao-chance.json.
Roda onde o TSE é alcançável (GitHub Actions). Só biblioteca padrão.
"""
import csv, io, json, math, os, sys, urllib.request, zipfile
from collections import defaultdict
from datetime import datetime

UA = {"User-Agent": "Mozilla/5.0 (placardaspesquisas.com.br)", "Referer": "https://resultados.tse.jus.br/"}
UFS = "ac al am ap ba ce df es go ma mg ms mt pa pb pe pi pr rj rn ro rr rs sc se sp to zz".split()
RES = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados"


def get(url, binario=False):
    req = urllib.request.Request(url, headers=UA)
    for i in range(4):
        try:
            with urllib.request.urlopen(req, timeout=300) as r:
                b = r.read()
                return b if binario else json.loads(b)
        except Exception:
            if i == 3:
                raise


def num(s):
    return float(str(s).replace(",", ".")) if s not in (None, "") else 0.0


# ── 1. Base: 2º turno de 2022 por município ─────────────────────────────────
def base_2022():
    pkg = get("https://dadosabertos.tse.jus.br/api/3/action/package_show?id=resultados-2022")
    recs = [r for r in pkg["result"]["resources"] if "votacao_candidato_munzona" in (r.get("url") or "") and r["url"].endswith(".zip")]
    for r in pkg["result"]["resources"]:
        print("  ·", r.get("name"), r.get("url"))
    if not recs:
        sys.exit("sem recurso votacao_candidato_munzona em resultados-2022")
    url = recs[0]["url"]
    print("base 2022:", url)
    z = zipfile.ZipFile(io.BytesIO(get(url, binario=True)))
    votos = defaultdict(lambda: [0, 0])  # (uf+cd) → [Lula, Bolsonaro]
    vistos = set()
    for nome in z.namelist():
        if not nome.lower().endswith(".csv"):
            continue
        # O arquivo _BRASIL repete as UFs: lê só os por UF.
        if "BRASIL" in nome.upper():
            continue
        with z.open(nome) as f:
            for row in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";"):
                if row.get("NR_TURNO") != "2" or row.get("CD_CARGO") != "1":
                    continue
                n = row.get("NR_CANDIDATO")
                if n not in ("13", "22"):
                    continue
                k = row["SG_UF"].lower() + row["CD_MUNICIPIO"].zfill(5)
                vistos.add(nome)
                votos[k][0 if n == "13" else 1] += int(row["QT_VOTOS_NOMINAIS"])
    L = sum(v[0] for v in votos.values())
    B = sum(v[1] for v in votos.values())
    print(f"2022 2º turno: {len(votos)} municípios, Lula {L}, Bolsonaro {B} (arquivos: {len(vistos)})")
    # Resultado oficial de 2022: Lula 60.345.999 × Bolsonaro 58.206.354.
    if abs(L - 60345999) > 1000 or abs(B - 58206354) > 1000:
        sys.exit("totais de 2022 não batem com o oficial — base recusada")
    return votos


# ── 2. 1º turno de 2026: votos (já no repo) + ordem de totalização ──────────
def alvo_2026():
    t1 = json.load(open("data/apuracao/t1-municipios.json"))["mun"]
    mun = {}
    for uf in UFS:
        ab = get(f"{RES}/{uf}/{uf}-e006257-ab.json")
        for a in ab.get("abr", []):
            if a.get("tpabr") != "mun":
                continue
            k = uf + a["cdabr"]
            if k not in t1 or not a.get("dt") or not a.get("ht"):
                continue
            L, F, c, te = t1[k]
            mun[k] = {
                "uf": uf, "L": L, "F": F, "c": num(a["e"]["c"]), "te": num(a["e"]["te"]),
                "t": datetime.strptime(f'{a["dt"]} {a["ht"]}', "%d/%m/%Y %H:%M:%S"),
            }
    print(f"2026 1º turno com horário: {len(mun)} municípios")
    return mun


# ── 3. Projeção (mesmo método da página) ─────────────────────────────────────
def projeta(mun, contados, base, escopo=None):
    tot = defaultdict(lambda: {"L": 0, "F": 0, "c": 0, "te": 0, "bF": 0.0, "dois": 0})
    for k in contados:
        m = mun[k]
        t = tot[m["uf"]]
        dois = m["L"] + m["F"]
        t["L"] += m["L"]; t["F"] += m["F"]; t["c"] += m["c"]; t["te"] += m["te"]
        t["bF"] += dois * base[k]; t["dois"] += dois
    N = {x: sum(t[x] for t in tot.values()) for x in ("L", "F", "c", "te", "bF", "dois")}
    if N["dois"] == 0:
        return None
    s_nac = N["F"] / N["dois"] - N["bF"] / N["dois"]
    comp_nac, teta_nac = N["c"] / N["te"], N["dois"] / N["c"]
    F, V, falta = N["F"], N["dois"], 0.0
    for k, m in mun.items():
        if k in contados or (escopo and m["uf"] != escopo):
            continue
        t = tot.get(m["uf"])
        if t and t["dois"] > 0:
            s, comp, teta = t["F"] / t["dois"] - t["bF"] / t["dois"], t["c"] / t["te"], t["dois"] / t["c"]
        else:
            s, comp, teta = s_nac, comp_nac, teta_nac
        v = m["te"] * comp * teta
        F += v * min(1, max(0, base[k] + s)); V += v; falta += v
    return 100 * F / V, falta / V


def main():
    b22 = base_2022()
    mun = alvo_2026()
    base = {}
    for k in list(mun):
        if k in b22 and sum(b22[k]) > 0:
            base[k] = b22[k][1] / sum(b22[k])
        else:
            del mun[k]
    print(f"municípios com base 2022: {len(mun)}")
    final = 100 * sum(m["F"] for m in mun.values()) / sum(m["L"] + m["F"] for m in mun.values())
    ordem = sorted(mun, key=lambda k: mun[k]["t"])
    t0, t1 = mun[ordem[0]]["t"], mun[ordem[-1]]["t"]

    def caminho(chaves, alvo, escopo=None):
        pts, i, cont = [], 0, set()
        t = t0
        while t <= t1:
            while i < len(chaves) and mun[chaves[i]]["t"] <= t:
                cont.add(chaves[i]); i += 1
            p = projeta(mun, cont, base, escopo) if cont else None
            if p:
                pts.append({"hora": t.strftime("%H:%M"), "proj": round(p[0], 4), "falta": round(p[1], 4), "erro": round(p[0] - alvo, 4)})
            t = t.replace(minute=t.minute) if False else datetime.fromtimestamp(t.timestamp() + 600)
        return pts

    nac = caminho(ordem, final)
    ufs = {}
    for uf in UFS:
        ch = [k for k in ordem if mun[k]["uf"] == uf]
        if len(ch) < 5:
            continue
        alvo = 100 * sum(mun[k]["F"] for k in ch) / sum(mun[k]["L"] + mun[k]["F"] for k in ch)
        sub = {k: mun[k] for k in ch}
        pts, cont = [], set()
        for j, k in enumerate(ch):
            cont.add(k)
            if j % max(1, len(ch) // 20) == 0:
                p = projeta(sub, cont, base)
                if p:
                    pts.append({"falta": round(p[1], 4), "erro": round(p[0] - alvo, 4)})
        ufs[uf] = pts

    def kappa(pts, lo=0.05, hi=0.95):
        z = [(p["erro"] / p["falta"]) ** 2 for p in pts if lo <= p["falta"] <= hi]
        return (math.sqrt(sum(z) / len(z)), len(z)) if z else (None, 0)

    k_nac, n_nac = kappa(nac)
    k_uf, n_uf = kappa([p for v in ufs.values() for p in v])
    out = {
        "descricao": "Apuração do 1º turno de 2026 refeita na ordem real de totalização dos municípios; base: 2º turno de 2022 (Lula × Bolsonaro).",
        "final_flavio_dois": round(final, 4),
        "kappa_nacional": k_nac, "pontos_nacional": n_nac,
        "kappa_ufs": k_uf, "pontos_ufs": n_uf,
        "nacional": nac,
        "ufs": {u: v for u, v in ufs.items()},
        "gerado_em": datetime.utcnow().isoformat() + "Z",
    }
    os.makedirs("data/apuracao", exist_ok=True)
    json.dump(out, open("data/apuracao/calibracao-chance.json", "w"), ensure_ascii=False, indent=1)
    print(f"final Flávio (dois): {final:.3f}%  κ nacional {k_nac} ({n_nac} pts)  κ UFs {k_uf} ({n_uf} pts)")
    for p in nac:
        print(p)


if __name__ == "__main__":
    main()
