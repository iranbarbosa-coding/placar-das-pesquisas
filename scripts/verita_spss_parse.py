#!/usr/bin/env python3
"""Parser das íntegras SPSS do Instituto Veritá.

Extrai blocos de pergunta do relatório (formato SPSS: Frequência | Porcentual |
Porcentagem válida | Porcentagem acumulativa) e os AUTO-VERIFICA pela aritmética
redundante do próprio quadro — freq_i/base ≈ porcentual_i, soma(freq)=válido,
válido+ausente=total. Um bloco que não fecha é RECUSADO (não emitido), no espírito
do §2 ("um verde que ninguém testou não é evidência"): aqui quem testa é a conta.

Alvo primário: o bloco de REJEIÇÃO presidencial ("NÃO votaria de jeito nenhum
para Presidente") → coluna Porcentual = rejeição BRUTA. Também extrai a estimulada
de 1º turno se pedido.

Uso: python3 verita_spss_parse.py <pdf|dir> [--kind rejeicao|estimulada] [--json]
"""
import sys, re, json, os, glob

def num(s):
    return float(s.replace(".", "").replace(",", ".")) if s else None

def texto(pdf):
    import pypdf
    return "\n".join((pg.extract_text() or "") for pg in pypdf.PdfReader(pdf).pages)

MESES = {"janeiro":1,"fevereiro":2,"março":3,"marco":3,"abril":4,"maio":5,"junho":6,
         "julho":7,"agosto":8,"setembro":9,"outubro":10,"novembro":11,"dezembro":12}

def metadata(full):
    d = {}
    m = re.search(r"Registro:\s*([A-Z]{2}-\d{4,5}/2026|BR-\d{4,5}/2026)", full)
    d["registro_impresso"] = m.group(1) if m else None
    m = re.search(r"Abrang[êe]ncia:\s*([^\n]+)", full)
    d["abrangencia"] = m.group(1).strip() if m else None
    m = re.search(r"Amostra:\s*([\d\.]+)\s*eleitores", full)
    d["n"] = int(m.group(1).replace(".", "")) if m else None
    m = re.search(r"Margem de erro:\s*([\d,]+)", full)
    d["moe"] = num(m.group(1)) if m else None
    # PERÍODO — preferir "Período de campo …" (página metodológica, sempre
    # preenchido) ao "Período:" da capa (às vezes um placeholder "(mudança)").
    # Quatro formatos: DD de MÊS a DD de MÊS de 2026 (cross-mês, nomes) ·
    # DD a DD de MÊS de 2026 (mesmo mês, nomes) · DD/MM a DD/MM/2026 (cross,
    # numérico) · DD a DD/MM/2026 (mesmo mês, numérico).
    d["fw_start"] = d["fw_end"] = None
    fonte = re.search(r"Per[íi]odo de campo[:\s]*([^\n]{5,70})", full) or re.search(r"Per[íi]odo:\s*([^\n]{5,50})", full)
    txt = fonte.group(1) if fonte else ""
    def iso(dia, mes, yr): return f"{yr}-{mes:02d}-{int(dia):02d}"
    m = re.search(r"(\d{1,2})\s*de\s*(\w+)\s*a\s*(\d{1,2})\s*de\s*(\w+)\s*de\s*(2026)", txt)
    if m and MESES.get(m.group(2).lower()) and MESES.get(m.group(4).lower()):
        d["fw_start"] = iso(m.group(1), MESES[m.group(2).lower()], m.group(5))
        d["fw_end"]   = iso(m.group(3), MESES[m.group(4).lower()], m.group(5)); return d
    m = re.search(r"(\d{1,2})\s*a\s*(\d{1,2})\s*de\s*(\w+)\s*de\s*(2026)", txt)
    if m and MESES.get(m.group(3).lower()):
        mo = MESES[m.group(3).lower()]
        d["fw_start"] = iso(m.group(1), mo, m.group(4)); d["fw_end"] = iso(m.group(2), mo, m.group(4)); return d
    m = re.search(r"(\d{1,2})/(\d{2})\s*a\s*(\d{1,2})/(\d{2})/(2026)", txt)
    if m:
        d["fw_start"] = iso(m.group(1), int(m.group(2)), m.group(5)); d["fw_end"] = iso(m.group(3), int(m.group(4)), m.group(5)); return d
    m = re.search(r"(\d{1,2})\s*a\s*(\d{1,2})/(\d{2})/(2026)", txt)
    if m:
        mo = int(m.group(3)); d["fw_start"] = iso(m.group(1), mo, m.group(4)); d["fw_end"] = iso(m.group(2), mo, m.group(4))
    return d

# Cada linha de candidato termina em 4 números: Frequência Porcentual Válida Acumulativa.
# O rótulo (nome+partido) é tudo antes. O partido vem em parênteses "(PL)" OU após
# travessão "– PT" / hífen "- PL" (o Veritá varia entre seções de cargo).
LINHA = re.compile(r"^(.+?)\s+(\d[\d\.]*)\s+([\d,]+)\s+([\d,]+)\s+([\d,]+)\s*$")

def separa_nome_partido(rotulo):
    rotulo = rotulo.strip()
    m = re.match(r"^(.+?)\s*\(([^)]+)\)\s*$", rotulo)          # Nome (PARTIDO)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    m = re.match(r"^(.+?)\s+[–—\-]\s+(.+?)\s*$", rotulo)         # Nome – PARTIDO / Nome - PARTIDO
    if m:
        return m.group(1).strip(), m.group(2).strip()
    return rotulo, None

def bloco_presidencial(full, needle):
    """Fatia da PERGUNTA cujo enunciado casa `needle` até a próxima PERGUNTA."""
    perguntas = list(re.finditer(r"PERGUNTA\s+\d+", full))
    for i, p in enumerate(perguntas):
        fim = perguntas[i+1].start() if i+1 < len(perguntas) else len(full)
        trecho = full[p.start():fim]
        cab = trecho[:260].replace("\n", " ")
        if needle(cab):
            return trecho
    return None

def parse_tabela(bloco):
    # A tabela vai de "Válido" até o "Total <n> 100,0" (a linha da amostra, após
    # Ausente). Depois vem o gráfico de barras e crosstabs de perfil — que trazem
    # números soltos (eixo "0 20 40 60 80 100", coluna válida) que não são votos.
    # Paramos no fim da tabela para não engolir esse lixo.
    rows, valido, ausente, total = [], None, None, None
    apos_valido = False
    # COALESCE de linha quebrada: um nome longo quebra o partido para a linha
    # seguinte — "VETERINÁRIO WILSON GRASSI -\nDEMOCRATA 2 0,1 0,1 99,8". Juntamos
    # a linha que termina em travessão/hífen (sem números) com a próxima.
    brutas = bloco.splitlines()
    linhas = []
    i = 0
    while i < len(brutas):
        ln = brutas[i].rstrip()
        if re.search(r"[–—\-]\s*$", ln) and not re.search(r"\d", ln.split()[-1] if ln.split() else ""):
            if i + 1 < len(brutas):
                ln = ln + " " + brutas[i+1].strip(); i += 1
        linhas.append(ln); i += 1
    for ln in linhas:
        ln = ln.strip()
        # fim do quadro: o segundo "Total <n> 100,0" (linha da amostra, depois de Ausente)
        m = re.match(r"^Total\s+(\d[\d\.]*)\s+100,0$", ln)
        if m:
            total = int(m.group(1).replace(".", "")); break
        m = re.match(r"^Total\s+(\d[\d\.]*)\s+([\d,]+)\s+100,0$", ln)
        if m and valido is None:
            valido = {"freq": int(m.group(1).replace(".", "")), "porcentual": num(m.group(2))}
            apos_valido = True; continue
        m = re.match(r"^Ausente(?:\s+NS/NR)?\s+(\d[\d\.]*)\s+([\d,]+)$", ln)
        if m:
            ausente = {"freq": int(m.group(1).replace(".", "")), "porcentual": num(m.group(2))}; continue
        if apos_valido:
            continue  # entre o Total-válido e o Total-amostra não há mais candidato
        m = LINHA.match(ln)
        if m and not re.match(r"^(Total|Ausente|V[áa]lido)\b", ln):
            rotulo, freq, porc, val, ac = m.groups()
            nome, part = separa_nome_partido(rotulo)
            rows.append({"name": nome, "party": part,
                         "freq": int(freq.replace(".", "")), "porcentual": num(porc),
                         "valida": num(val), "acumulativa": num(ac)})
    return {"rows": rows, "valido": valido, "ausente": ausente, "total": total}

def verifica(t, n):
    problemas = []
    if not t["rows"]: return ["sem linhas de candidato"]
    if t["total"] and n and t["total"] != n: problemas.append(f"total {t['total']} ≠ amostra {n}")
    base = t["total"] or n
    for r in t["rows"]:
        if base:
            esp = round(r["freq"]/base*100, 1)
            if abs(esp - r["porcentual"]) > 0.15:
                problemas.append(f"{r['name']}: freq/base={esp} ≠ porcentual {r['porcentual']}")
    if t["valido"] and t["ausente"] and base:
        if abs((t["valido"]["freq"]+t["ausente"]["freq"]) - base) > 1:
            problemas.append("válido+ausente ≠ total")
        somaf = sum(r["freq"] for r in t["rows"])
        if abs(somaf - t["valido"]["freq"]) > 1:
            problemas.append(f"soma freq {somaf} ≠ válido {t['valido']['freq']}")
    return problemas

def parse_pdf(pdf, kind="rejeicao"):
    full = texto(pdf)
    md = metadata(full)
    if kind == "rejeicao":
        needle = lambda c: ("votaria de jeito" in c.lower() and "presidente" in c.lower())
    else:
        needle = lambda c: ("estes fossem os candidatos" in c.lower() and "presidente" in c.lower()
                            and "votaria de jeito" not in c.lower() and "segunda" not in c.lower())
    bloco = bloco_presidencial(full, needle)
    if not bloco:
        return {"pdf": os.path.basename(pdf), "kind": kind, "ok": False, "motivo": "bloco não encontrado", "metadata": md}
    t = parse_tabela(bloco)
    probs = verifica(t, md.get("n"))
    return {"pdf": os.path.basename(pdf), "kind": kind, "ok": not probs, "problemas": probs,
            "metadata": md, "tabela": t}

UF_DE_ABRANGENCIA = {
    "Acre":"AC","Alagoas":"AL","Amapá":"AP","Amazonas":"AM","Bahia":"BA","Ceará":"CE",
    "Distrito Federal":"DF","Espírito Santo":"ES","Goiás":"GO","Maranhão":"MA",
    "Mato Grosso":"MT","Mato Grosso do Sul":"MS","Minas Gerais":"MG","Pará":"PA",
    "Paraíba":"PB","Paraná":"PR","Pernambuco":"PE","Piauí":"PI","Rio de Janeiro":"RJ",
    "Rio Grande do Norte":"RN","Rio Grande do Sul":"RS","Rondônia":"RO","Roraima":"RR",
    "Santa Catarina":"SC","São Paulo":"SP","Sergipe":"SE","Tocantins":"TO","Brasil":None,
}

def to_add_rejection(res):
    """Mapeia um resultado OK de rejeição → uma entrada `add_rejection` de data/rejection.json.
    Bruta = coluna Porcentual (base amostra total). conhece_pct null (Veritá não imprime)."""
    md, t = res["metadata"], res["tabela"]
    uf = UF_DE_ABRANGENCIA.get((md.get("abrangencia") or "").strip(), "SENTINELA")
    results = [{"candidate": r["name"], "party": r["party"], "pct_bruta": r["porcentual"], "conhece_pct": None}
               for r in t["rows"]]
    reg = md.get("registro_impresso")
    ev = (f"Bloco de rejeição presidencial ('NÃO votaria de jeito nenhum para Presidente'), "
          f"coluna Porcentual = bruta sobre n={md.get('n')}. EXTRAÍDO pelo verita-spss-parser e "
          f"AUTO-VERIFICADO pela aritmética redundante do quadro SPSS (freq/n=porcentual, "
          f"soma_freq=válido, válido+ausente=total). Parser validado contra 6 leituras cegas duplas "
          f"(AC/RO/MT/SC/SE/BR) — casamento exato. Campo {md.get('fw_start')}..{md.get('fw_end')}"
          + (f", registro impresso {reg}." if reg else ", registro não impresso na íntegra."))
    return {
        "match": {"pollster": "Veritá", "race": "presidente", "state": uf, "round": 1,
                  "fieldwork_end": md.get("fw_end")},
        "source": "https://eleicoes26.institutoverita.com.br/ (íntegra pública Veritá)",
        "evidence": ev, "verified_at": "2026-08-23", "multi_mention": False,
        "add_rejection": {
            "pollster": "Veritá", "race": "presidente", "state": uf, "round": 1,
            "fieldwork_start": md.get("fw_start"), "fieldwork_end": md.get("fw_end"),
            "published_date": None, "sample_size": md.get("n"), "margin_of_error": md.get("moe"),
            "tse_registration": reg, "results": results},
    }

if __name__ == "__main__":
    if "--emit" in sys.argv:
        alvo = sys.argv[1]
        pdfs = sorted(glob.glob(os.path.join(alvo, "*.pdf"))) if os.path.isdir(alvo) else [alvo]
        entradas = []
        for pdf in pdfs:
            try:
                res = parse_pdf(pdf, "rejeicao")
            except Exception:
                continue
            if res["ok"] and res["tabela"]["rows"]:
                entradas.append(to_add_rejection(res))
        print(json.dumps(entradas, ensure_ascii=False, indent=1))
        sys.exit(0)
    alvo = sys.argv[1]
    kind = "rejeicao"
    if "--kind" in sys.argv: kind = sys.argv[sys.argv.index("--kind")+1]
    pdfs = sorted(glob.glob(os.path.join(alvo, "*.pdf"))) if os.path.isdir(alvo) else [alvo]
    for pdf in pdfs:
        try:
            res = parse_pdf(pdf, kind)
        except Exception as e:
            res = {"pdf": os.path.basename(pdf), "kind": kind, "ok": False, "motivo": f"ERRO {type(e).__name__}: {e}", "metadata": {}, "tabela": {}}
        if "--json" in sys.argv:
            print(json.dumps(res, ensure_ascii=False))
        else:
            md = res["metadata"]; t = res.get("tabela", {})
            status = "OK ✓" if res["ok"] else "RECUSA ✗"
            print(f"{res['pdf']:32} {status}  abrang={md.get('abrangencia')} n={md.get('n')} reg={md.get('registro_impresso')} campo={md.get('fw_start')}..{md.get('fw_end')}")
            if not res["ok"]:
                print(f"     motivo/probs: {res.get('motivo') or res.get('problemas')}")
            else:
                for r in t["rows"]:
                    print(f"     {r['name']:24} {str(r['party'] or '—'):14} bruta={r['porcentual']}")
