#!/usr/bin/env python3
"""Parse Wikipedia (pt+en) wikitext polling tables for the 2026 Brazilian presidential election."""
import json, re, sys, unicodedata

PT_URL = "https://pt.wikipedia.org/wiki/Pesquisas_de_opini%C3%A3o_para_a_elei%C3%A7%C3%A3o_presidencial_no_Brasil_em_2026"
EN_URL = "https://en.wikipedia.org/wiki/Opinion_polling_for_the_2026_Brazilian_presidential_election"

MONTHS = {
    'jan': 1, 'fev': 2, 'feb': 2, 'mar': 3, 'abr': 4, 'apr': 4, 'mai': 5, 'may': 5,
    'jun': 6, 'jul': 7, 'ago': 8, 'aug': 8, 'set': 9, 'sep': 9, 'out': 10, 'oct': 10,
    'nov': 11, 'dez': 12, 'dec': 12,
    'janeiro': 1, 'fevereiro': 2, 'marco': 3, 'março': 3, 'abril': 4, 'maio': 5,
    'junho': 6, 'julho': 7, 'agosto': 8, 'setembro': 9, 'outubro': 10,
    'novembro': 11, 'dezembro': 12,
}

def strip_refs(t):
    t = re.sub(r'<ref[^>/]*/\s*>', '', t)
    t = re.sub(r'<ref[^>]*>.*?</ref>', '', t, flags=re.S)
    return t

def strip_templates(t, keep_small_inner=True):
    # iteratively remove innermost templates; keep {{small|X}} inner text
    prev = None
    while prev != t:
        prev = t
        def repl(m):
            inner = m.group(1)
            parts = inner.split('|')
            name = parts[0].strip().lower()
            if keep_small_inner and name in ('small', 'nowrap', 'abbr', 'fmtn', 'formatnum', 'nts', 'val') and len(parts) > 1:
                return parts[1]
            return ''
        t = re.sub(r'\{\{([^{}]*)\}\}', repl, t)
    return t

def strip_links(t):
    # [[target|display]] -> display ; [[target]] -> target ; files removed
    t = re.sub(r'\[\[(?:File|Ficheiro|Image|Imagem):[^\[\]]*(?:\[\[[^\]]*\]\][^\[\]]*)*\]\]', '', t, flags=re.I)
    t = re.sub(r'\[\[([^|\]]*)\|([^\]]*)\]\]', r'\2', t)
    t = re.sub(r'\[\[([^\]]*)\]\]', r'\1', t)
    return t

def clean_cell(t):
    t = strip_refs(t)
    t = strip_links(strip_templates(t))
    t = re.sub(r'<br\s*/?>', ' ', t)
    t = re.sub(r'<[^>]+>', '', t)
    t = t.replace(' ', ' ').replace("'''", '').replace("''", '')
    return t.strip()

def split_row_cells(chunk, sep):
    """Split on || or !! at template/link depth 0."""
    cells, depth, cur, i = [], 0, '', 0
    while i < len(chunk):
        two = chunk[i:i+2]
        if two in ('{{', '[['):
            depth += 1; cur += two; i += 2; continue
        if two in ('}}', ']]'):
            depth -= 1; cur += two; i += 2; continue
        if depth == 0 and two == sep:
            cells.append(cur); cur = ''; i += 2; continue
        cur += chunk[i]; i += 1
    cells.append(cur)
    return cells

def parse_cell(raw, is_header):
    """Return (attrs, text). Attrs precede a single | at depth 0 with an = and no link."""
    depth = 0
    for i in range(len(raw)):
        two = raw[i:i+2]
        if two in ('{{', '[['): depth += 1
        elif two in ('}}', ']]'): depth -= 1
        elif depth == 0 and raw[i] == '|' and (i == 0 or raw[i-1] != '|') and (i+1 >= len(raw) or raw[i+1] != '|'):
            attrs = raw[:i]
            if '=' in attrs and '[[' not in attrs and '{{' not in strip_templates(attrs, False).join(['']) or ('=' in attrs and '[[' not in attrs):
                return attrs, raw[i+1:]
            break
    return '', raw

def get_span(attrs, name):
    m = re.search(name + r'\s*=\s*"?(\d+)', attrs)
    return int(m.group(1)) if m else 1

def parse_table(lines):
    """Parse wikitext table lines into rows of dicts {header, attrs, raw}."""
    rows, cur = [], []
    def flush():
        nonlocal cur
        if cur: rows.append(cur); cur = []
    i = 0
    while i < len(lines):
        ln = lines[i]
        s = ln.strip()
        if s.startswith('{|') or s.startswith('|+'):
            i += 1; continue
        if s.startswith('|}'):
            break
        # A multi-line {{citar web|…}} inside <ref> wraps onto lines starting
        # with "|". Those are continuations of the current cell, not new cells:
        # treating them as cells shifts every column of the row by one.
        if cur and (cur[-1]['raw'].count('{{') > cur[-1]['raw'].count('}}')
                    or cur[-1]['raw'].count('<ref') > cur[-1]['raw'].count('</ref>') + cur[-1]['raw'].count('/>')):
            cur[-1]['raw'] += '\n' + ln
            i += 1; continue
        if s.startswith('|-'):
            flush(); i += 1; continue
        if s.startswith('!') or (s.startswith('|') and not s.startswith('|}')):
            is_h = s.startswith('!')
            body = s[1:]
            sep = '!!' if is_h else '||'
            for part in split_row_cells(body, sep):
                cur.append({'header': is_h, 'raw': part})
        else:
            if cur:
                cur[-1]['raw'] += '\n' + ln
        i += 1
    flush()
    # attrs/text split + spans
    for row in rows:
        for c in row:
            attrs, text = parse_cell(c['raw'], c['header'])
            c['attrs'], c['text'] = attrs, text
            c['rowspan'] = get_span(attrs, 'rowspan')
            c['colspan'] = get_span(attrs, 'colspan')
    return rows

def expand_grid(rows):
    """Expand rowspan/colspan into a rectangular grid of cell dicts (shared refs)."""
    grid = []
    pending = {}  # col -> (cell, remaining_rows)
    for r, row in enumerate(rows):
        line, col, ci = [], 0, 0
        while ci < len(row) or col in pending:
            if col in pending:
                cell, rem = pending[col]
                line.append(cell)
                if rem > 1: pending[col] = (cell, rem - 1)
                else: del pending[col]
                col += 1; continue
            if ci >= len(row): break
            cell = row[ci]; ci += 1
            for k in range(cell['colspan']):
                line.append(cell)
                if cell['rowspan'] > 1:
                    pending[col] = (cell, cell['rowspan'] - 1)
                col += 1
        # leftover pendings beyond declared cells
        while col in pending:
            cell, rem = pending[col]
            line.append(cell)
            if rem > 1: pending[col] = (cell, rem - 1)
            else: del pending[col]
            col += 1
        grid.append(line)
    return grid

def cand_from_header(raw):
    """Extract (candidate_fullname, party) from a header cell.

    Two layouts exist and the difference matters:
      presidential pages: [[Full|Short]]<br>{{small|[[Party|ABBR]]}}
      state pages:        [[Full]]<br><small>([[Party|ABBR]])</small>
    On state pages the only PIPED link in the cell is the party's, so a regex
    that grabs the first piped link labels every column with a party name.
    Anchor on the <small>/{{small}} boundary instead: the party is inside it,
    the candidate is what precedes it.
    """
    t = strip_refs(raw)
    # the party is sometimes only recoverable from a photo's link= target
    lk = re.search(r'\[\[(?:File|Ficheiro|Image|Imagem):[^\]]*\blink=([^|\]]+)', t, flags=re.I)
    file_party = lk.group(1).strip() if lk else None
    t = re.sub(r'\[\[(?:File|Ficheiro|Image|Imagem):[^\[\]]*(?:\[\[[^\]]*\]\][^\[\]]*)*\]\]', '', t, flags=re.I)
    if not t.strip():
        return None, None

    m = (re.search(r'<small>(.*?)</small>', t, flags=re.S | re.I)
         or re.search(r'\{\{\s*small\s*\|(.*?)\}\}', t, flags=re.S))
    if m is None:
        # some tables put the party on the NEXT line in bare parens and no
        # <small>: "!Sabará\n([[Partido Novo|NOVO]])". Without this the party
        # link becomes the candidate whenever the name itself is unlinked.
        m = re.search(r'\(\s*(\[\[[^\]]*\]\][^()]*)\)\s*$', t.strip())
    party_raw = m.group(1) if m else None
    name_raw = re.split(r'<br\s*/?>', t[:m.start()] if m else t, flags=re.I)[0]

    def link_display(s):
        lm = re.search(r'\[\[([^|\]]*)\|([^\]]*)\]\]', s)
        if lm:
            return lm.group(2).strip()
        lm = re.search(r'\[\[([^\]]*)\]\]', s)
        return lm.group(1).strip() if lm else None

    if party_raw is not None:
        party = (link_display(party_raw) or clean_cell(party_raw) or '').strip('() ') or None
    else:
        party = file_party

    lm = re.search(r'\[\[([^|\]]*)\|([^\]]*)\]\]', name_raw)
    if lm:
        name = lm.group(1).strip()          # link target carries the full name
    else:
        lm2 = re.search(r'\[\[([^\]]*)\]\]', name_raw)
        name = lm2.group(1).strip() if lm2 else clean_cell(name_raw)
    name = re.sub(r'\s+', ' ', name).strip()
    # not candidates: the {{Tooltip|Cen.|Cenários}} scenario-counter column,
    # bare numbers, and leftover file refs
    low = name.lower().strip('. ')
    if re.match(r'^cen(\.|arios?|ários?)?$', low) or re.match(r'^[\d\s.,%/-]+$', name):
        return None, None
    if low.startswith(('ficheiro:', 'file:', 'imagem:', 'image:')):
        return None, None
    return (name or None), party

def classify_columns(grid, n_header_rows):
    """Label each column from the stacked header texts."""
    ncols = max(len(r) for r in grid[:n_header_rows]) if n_header_rows else 0
    cols = []
    for c in range(ncols):
        texts, raws = [], []
        for r in range(n_header_rows):
            if c < len(grid[r]):
                cell = grid[r][c]
                txt = clean_cell(cell.get('text', cell['raw']))
                if txt and txt not in texts:
                    texts.append(txt); raws.append(cell.get('text', cell['raw']))
        label = ' / '.join(texts)
        low = unicodedata.normalize('NFD', label.lower())
        low = ''.join(ch for ch in low if not unicodedata.combining(ch))
        kind = None
        if 'contratante' in low or 'pollster' in low or 'firm' in low or 'instituto' in low or ('pesquisa' in low and 'data' not in low):
            kind = 'pollster'
        elif 'data' in low or 'polling' in low or 'period' in low or 'date' in low:
            kind = 'dates'
        elif 'amostra' in low or 'sample' in low:
            kind = 'sample'
        elif 'margem' in low or 'margin' in low:
            kind = 'moe'
        elif 'outros' in low or 'others' in low:
            kind = 'others'
        elif 'indecis' in low or 'undec' in low or 'branco' in low or 'blank' in low or 'nulo' in low or 'absten' in low or 'absent' in low:
            kind = 'undecided'
        elif re.search(r'\bvanta', low) or 'lead' in low:  # 'Vantagem', and TO's 'Vantangem' typo
            kind = 'lead'
        elif 'link' in low or low == '' :
            kind = 'skip'
        else:
            name, party = None, None
            for raw in raws:
                name, party = cand_from_header(raw)
                if name: break
            if name:
                kind = 'candidate'
                cols.append({'kind': kind, 'label': label, 'name': name, 'party': party})
                continue
            kind = 'skip'
        cols.append({'kind': kind, 'label': label})
    return cols

def parse_pct(text):
    t = text.strip().rstrip('%').strip()
    t = t.replace(',', '.')
    if t in ('', '-', '–', '—', '?'): return None, False
    # Marcador "menor que" ("<4", "≤4", "&lt;4"): o candidato ficou ABAIXO do
    # limiar de reporte e a página não deu figura exata. Ler o N como valor
    # infla a linha — três "<4%" viravam 12 pontos-fantasma e estouravam a soma
    # da disputa de assento único (validate-store). Piso em 0,0, como os
    # minoritários sub-limiar já são guardados no banco; `False` mantém o aviso.
    if re.match(r'^(?:<|≤|&lt;)\s*\d', t): return 0.0, False
    m = re.match(r'^-?\d+(\.\d+)?$', t)
    if m: return float(t), True
    m = re.search(r'\d+(\.\d+)?', t)
    if m: return float(m.group(0)), False  # parsed with leftovers -> warn
    return None, False

def parse_sample(text):
    t = re.sub(r'[^\d]', '', text)
    return int(t) if t else None

def parse_moe(text):
    t = text.replace('±', '').replace('pp', '').replace('p.p.', '')
    t = t.replace(',', '.').strip().rstrip('%').strip()
    m = re.search(r'\d+(\.\d+)?', t)
    return float(m.group(0)) if m else None

def parse_dates(text, year_hint):
    """Parse '6 Ago - 10 Ago', '7–9 Aug 2026', '10 Ago', '28 Jul - 2 Ago' -> (start,end) ISO."""
    t = text.strip().replace('–', '-').replace('—', '-').replace('a ', '- ') if False else text.strip()
    t = t.replace('–', '-').replace('—', '-')
    t = re.sub(r'\s+', ' ', t)
    # PT normalisations: "1º/1°" ordinals, and "a" used as the range separator
    # ("11 a 12 de maio", "29 de novembro a 1º de dezembro"). Doing this here
    # lets the existing day/month patterns below cover the Portuguese forms.
    t = re.sub(r'(\d)\s*\.?\s*[º°ᵒ]', r'\1', t)  # "1º", "1°", "1.º"
    t = re.sub(r'\s+a\s+', ' - ', t, flags=re.I)
    ym = re.search(r'(20\d\d)', t)
    year = int(ym.group(1)) if ym else year_hint
    t2 = re.sub(r'20\d\d', '', t).strip().strip(',').strip()
    t2 = re.sub(r'\s*\bde\s*$', '', t2, flags=re.I).strip()  # leftover "de" after year removal
    t2 = re.sub(r'^(\d{1,2})\s*([A-Za-zçã]+)\s*-\s*(\d{1,2})\s*-\s*([A-Za-zçã]+)$', r'\1 \2 - \3 \4', t2)  # typo "10 Set - 14 - Set"
    # forms: "D Mon - D Mon" | "D-D Mon" | "D Mon" | "Mon D - Mon D"
    mm = re.match(r'^(\d{1,2})\s*(?:de\s+)?([A-Za-zçã]+)\.?\s*-\s*(\d{1,2})\s*(?:de\s+)?([A-Za-zçã]+)\.?$', t2)
    if mm:
        d1, m1, d2, m2 = mm.groups()
        mo1, mo2 = MONTHS.get(m1.lower()[:3]), MONTHS.get(m2.lower()[:3])
        if mo1 and mo2 and year:
            y1 = year - 1 if (mo1 > mo2 and mo2 and year) else year
            return f"{y1:04d}-{mo1:02d}-{int(d1):02d}", f"{year:04d}-{mo2:02d}-{int(d2):02d}", True
    mm = re.match(r'^(\d{1,2})\s*-\s*(\d{1,2})\s*(?:de\s+)?([A-Za-zçã]+)\.?$', t2)
    if mm:
        d1, d2, m1 = mm.groups()
        mo = MONTHS.get(m1.lower()[:3])
        if mo and year:
            return f"{year:04d}-{mo:02d}-{int(d1):02d}", f"{year:04d}-{mo:02d}-{int(d2):02d}", True
    # PT state pages: "28 e 31 de julho" — two field days in the same month
    mm = re.match(r'^(\d{1,2})\s*e\s*(\d{1,2})\s*(?:de\s+)?([A-Za-zçã]+)\.?$', t2, flags=re.I)
    if mm:
        d1, d2, m1 = mm.groups()
        mo = MONTHS.get(m1.lower()[:3])
        if mo and year:
            a, b = sorted((int(d1), int(d2)))
            return f"{year:04d}-{mo:02d}-{a:02d}", f"{year:04d}-{mo:02d}-{b:02d}", True
    # PT: "28 de julho a 2 de agosto" / "28 de julho e 2 de agosto" — crosses months
    mm = re.match(r'^(\d{1,2})\s*(?:de\s+)?([A-Za-zçã]+)\.?\s*(?:a|e|至)\s*(\d{1,2})\s*(?:de\s+)?([A-Za-zçã]+)\.?$', t2, flags=re.I)
    if mm:
        d1, m1, d2, m2 = mm.groups()
        mo1, mo2 = MONTHS.get(m1.lower()[:3]), MONTHS.get(m2.lower()[:3])
        if mo1 and mo2 and year:
            y1 = year - 1 if mo1 > mo2 else year
            return f"{y1:04d}-{mo1:02d}-{int(d1):02d}", f"{year:04d}-{mo2:02d}-{int(d2):02d}", True
    mm = re.match(r'^(\d{1,2})\s*(?:de\s+)?([A-Za-zçã]+)\.?$', t2)
    if mm:
        d1, m1 = mm.groups()
        mo = MONTHS.get(m1.lower()[:3])
        if mo and year:
            d = f"{year:04d}-{mo:02d}-{int(d1):02d}"
            return d, d, True
    mm = re.match(r'^([A-Za-zçã]+)\.?\s*(\d{1,2})\s*-\s*([A-Za-zçã]+)\.?\s*(\d{1,2})$', t2)
    if mm:
        m1, d1, m2, d2 = mm.groups()
        mo1, mo2 = MONTHS.get(m1.lower()[:3]), MONTHS.get(m2.lower()[:3])
        if mo1 and mo2 and year:
            return f"{year:04d}-{mo1:02d}-{int(d1):02d}", f"{year:04d}-{mo2:02d}-{int(d2):02d}", True
    mm = re.match(r'^([A-Za-zçã]+)\.?\s*(\d{1,2})$', t2)  # "Aug 9"
    if mm:
        m1, d1 = mm.groups()
        mo = MONTHS.get(m1.lower()[:3])
        if mo and year:
            d = f"{year:04d}-{mo:02d}-{int(d1):02d}"
            return d, d, True
    # Month-only cells ("novembro") carry no day. Previously this invented a
    # 1st–28th range, which reads as precise fieldwork dates downstream. An
    # unknown date must stay unknown.
    return None, None, False

def _mes_do_campo(dcell):
    """Mês (1-12) do FIM do campo lido da célula de datas, ou None."""
    if not dcell:
        return None
    st, en, ok = parse_dates(dcell, 2000)   # ano fictício só para extrair o mês
    return int(en[5:7]) if en else None

_RE_PUB_PT = re.compile(r'(?<![a-z\-])data\s*=\s*(\d{1,2})[º°]?\s*de\s+([a-zçã]+)\s+de\s+(20\d\d)', re.I)
_RE_PUB_ISO = re.compile(r'(?<![a-z\-])dat[ae]\s*=\s*(20\d\d)-(\d\d)-\d\d', re.I)
_RE_PUB_EN = re.compile(r'(?<![a-z\-])date\s*=\s*(?:(\d{1,2})\s+([A-Za-z]+)|([A-Za-z]+)\s+\d{1,2},?)\s+(20\d\d)', re.I)
_RE_ACESSO = re.compile(r'(?:acessodata|access-?date)\s*=\s*[^|}]*?(20\d\d)', re.I)

def resolver_ano(dcell, bruto, ctx):
    """Ano de um levantamento numa subpágina de INTERVALO sem cabeçalho de ano.

    Por que existe: a subpágina "…/Primeiro Turno/2023-2025" tem só cabeçalhos
    de mês ("==== Janeiro e Fevereiro ====") e células de campo sem ano
    ("7 Jan – 10 Jan"). Três degraus, do mais forte ao mais fraco:
      1. ÂNCORA — a data de publicação da citação da própria linha
         (`data=13 de janeiro de 2025` / `date=…`): a pesquisa não é publicada
         antes do campo, então ano = ano da publicação, menos um se o mês do
         campo for posterior ao da publicação (campo em dezembro, matéria em
         janeiro). Uma `acessodata` só limita por cima.
      2. ORDEM — as páginas listam em ordem cronológica INVERSA; quando o mês
         de um levantamento é MAIOR que o do anterior, virou o ano para trás.
      3. FAIXA — o resultado nunca sai do intervalo do título.
    A âncora também recalibra o cursor da ordem, e o cursor segue de onde a
    âncora deixou. Sem faixa (página configurada) a função não é chamada.
    """
    faixa = ctx['faixa']
    mes = _mes_do_campo(dcell)
    ano = None
    pubs = []
    for m in _RE_PUB_PT.finditer(bruto or ''):
        mm = MONTHS.get(_fold(m.group(2))[:3])
        if mm: pubs.append((int(m.group(3)), mm))
    for m in _RE_PUB_ISO.finditer(bruto or ''):
        pubs.append((int(m.group(1)), int(m.group(2))))
    for m in _RE_PUB_EN.finditer(bruto or ''):
        nome = m.group(2) or m.group(3)
        mm = MONTHS.get(_fold(nome)[:3])
        if mm: pubs.append((int(m.group(4)), mm))
    # A âncora só vale se for PLAUSÍVEL como publicação deste campo: a matéria
    # sai depois do campo e perto dele (até 3 meses). Uma citação reaproveitada
    # de matéria antiga (a Paraná Pesquisas de nov/2024 cita `data=27 de agosto
    # de 2024`) não pode puxar o ano para trás — cai para a ordem.
    candidatos = []
    for pa, pm in pubs:
        if not mes:
            candidatos.append((0, pa)); continue
        for y in (pa, pa - 1):
            gap = (pa - y) * 12 + pm - mes
            if 0 <= gap <= 3:
                candidatos.append((gap, y))
    if candidatos:
        ano = min(candidatos)[1]
    else:
        acessos = [int(a) for a in _RE_ACESSO.findall(bruto or '')]
        cursor = ctx.get('cursor_ano')
        if cursor is not None and mes and ctx.get('cursor_mes') and mes > ctx['cursor_mes']:
            cursor -= 1
        ano = cursor
        if acessos and ano is not None:
            ano = min(ano, min(acessos))
    if ano is None:
        return None
    ano = max(faixa[0], min(faixa[1], ano))
    if mes:
        ctx['cursor_ano'], ctx['cursor_mes'] = ano, mes
    return ano

def extract(text, source_url, lang, race='presidente', state=None, title_hint=None):
    lines = text.split('\n')
    # O ESTÍMULO QUE A PÁGINA DECLARA, e só ele (§4 do CONVENTIONS). As páginas
    # estaduais abrem com "Todos os cenários se referem a pesquisas
    # estimuladas, quando uma lista de candidatos é apresentada ao
    # entrevistado" — e NENHUMA linha de tabela carrega marca própria (medido
    # em 21/08/2026: toda ocorrência de "espontânea" no corpo das 29 páginas é
    # título de notícia dentro de <ref>). A frase declara TODOS os cenários da
    # página, então a marca vale por página; página sem a frase fica sem marca
    # — nunca deduzida do conteúdo das linhas. Foi a ausência desta marca que
    # deixou a estimulada da Wikipédia fundir com a espontânea do Poder360 no
    # caso senador:PR IRG 08-12/08 (ver estimulosCompativeis em scrape.mjs).
    lead = text.split('\n==', 1)[0]
    page_stimulus = 'estimulada' if re.search(
        r'cen[áa]rios?\s+se\s+referem\s+a\s+pesquisas?\s+estimuladas?', lead, re.I) else None
    polls = []
    h2 = h3 = h4 = hidden = None
    # Contexto herdado do TÍTULO da subpágina (ver discover_subpages). A
    # Wikipédia dividiu a presidencial em subpáginas como
    # ".../Primeiro Turno/2026/Janeiro a Agosto": lá dentro os cabeçalhos são
    # só os meses — o ano e o turno ficaram NO TÍTULO. Sem isto, as datas saem
    # sem ano (o Node as anula) e um 2º turno inteiro viraria 1º. Para as
    # páginas configuradas `title_hint` é None e nada muda: o ano segue vindo
    # dos cabeçalhos, em ordem de documento, como sempre veio.
    default_round, last_year, faixa_anos = hints_from_title(title_hint)
    # Estado da resolução de ano em subpágina de INTERVALO ("2023-2025"), cujos
    # cabeçalhos são só meses: cursor cronológico inverso, semeado no ano mais
    # recente da faixa e ancorado pelas datas de publicação das citações.
    ano_ctx = {'faixa': faixa_anos, 'cursor_ano': faixa_anos[1] if faixa_anos else None, 'cursor_mes': None}
    i = 0
    n = len(lines)
    while i < n:
        ln = lines[i]
        s = ln.strip()
        m = re.match(r'^(={2,4})\s*(.*?)\s*={2,4}\s*$', s)
        if m:
            lvl, title = len(m.group(1)), m.group(2).strip()
            if lvl == 2: h2, h3, h4, hidden = title, None, None, None
            elif lvl == 3: h3, h4 = title, None
            elif lvl == 4: h4 = title
            ym0 = re.search(r'(20\d\d)', title)
            if ym0: last_year = int(ym0.group(1))
            i += 1; continue
        if s.startswith('{{hidden begin'):
            hidden = None
            j = i
            while j < n and '}}' not in lines[j] or j == i:
                tm = re.search(r'\|\s*title\s*=\s*(.*)', lines[j])
                if tm:
                    hidden = clean_cell(tm.group(1)); break
                j += 1
                if j - i > 6: break
            i += 1; continue
        if s.startswith('{{hidden end'):
            # keep hidden until next hidden begin; safe to clear
            hidden = None
            i += 1; continue
        if s.startswith('{|') and 'wikitable' in s:
            # collect table lines
            tbl, depth = [], 0
            while i < n:
                st = lines[i].strip()
                if st.startswith('{|'): depth += 1
                tbl.append(lines[i])
                if st.startswith('|}'):
                    depth -= 1
                    if depth == 0: break
                i += 1
            polls.extend(parse_one_table(tbl, h2, h3, h4, hidden, source_url, lang, race, state, last_year, default_round, ano_ctx))
        i += 1
    if page_stimulus:
        for p in polls:
            p['stimulus'] = page_stimulus
    return polls

def _is_event_banner(row):
    """A row of <=3 wide cells whose text reads as a date/news marker."""
    cells = []
    for c in row:
        if not cells or cells[-1] is not c:
            cells.append(c)
    if len(cells) > 3 or max((c['colspan'] for c in cells), default=1) < 4:
        return False
    txt = ' '.join(clean_cell(c.get('text', c['raw'])) for c in cells).lower()
    txt = ''.join(ch for ch in unicodedata.normalize('NFD', txt) if not unicodedata.combining(ch))
    return bool(re.search(r'\b(jan|fev|mar|abr|mai|jun|jul|ago|set|out|nov|dez)', txt))

def parse_one_table(tbl_lines, h2, h3, h4, hidden, source_url, lang, race='presidente', state=None, year_ctx=None, default_round=1, ano_ctx=None):
    rows = parse_table(tbl_lines)
    if not rows: return []
    grid = expand_grid(rows)
    # header rows: leading rows where every cell is header-marked or cleans to empty
    n_header = 0
    for row in grid:
        # A timeline banner ("! colspan=5 |17 de julho" + "! colspan=9 |…") is
        # header-marked but is NOT a header row. Counted as one, its date text
        # stacks onto a column and becomes a phantom candidate.
        if _is_event_banner(row):
            break
        if all(c['header'] or clean_cell(c['raw']) == '' for c in row):
            n_header += 1
        else:
            break
    if n_header == 0: return []
    cols = classify_columns(grid, n_header)

    # round / year context
    ctx = ' | '.join(x for x in (h2, h3, h4) if x)
    low = unicodedata.normalize('NFD', ctx.lower())
    low = ''.join(ch for ch in low if not unicodedata.combining(ch))
    # O cabeçalho manda; sem cabeçalho de turno, vale o turno herdado do título
    # da subpágina (1 nas páginas configuradas — comportamento de sempre).
    rnd = 2 if ('segundo turno' in low or 'second round' in low) else default_round
    if race == 'auto':
        if 'senad' in low:
            race = 'senador'
        elif 'governador' in low or 'governo' in low:
            race = 'governador'
        else:
            return []  # presidential/approval/other tables on state pages
        rnd = 1 if race == 'senador' else rnd
    ym = None
    for part in (h4, h3, h2):
        if part:
            m = re.search(r'(20\d\d)', part)
            if m: ym = int(m.group(1)); break
    # Some pages put the year and the month at the SAME heading level
    # ("=== 2026 ===" then "=== Abril - Julho ==="), so the month overwrites the
    # year; runoff subsections are titled by candidate pair and carry none at
    # all. Fall back to the last year seen earlier in the document.
    if ym is None:
        ym = year_ctx
    # month hint from h4 like "Agosto" or "Setembro - Outubro"
    scenario_base = hidden or (h3 if (rnd == 2 and h3 and not re.match(r'^20\d\d$', h3 or '')) else None)

    # group data rows by pollster rowspan groups
    data = grid[n_header:]
    out = []
    group_rows = []
    groups = []
    prev_pollster_cell = None
    for row in data:
        pc = None
        for ci, col in enumerate(cols):
            if col['kind'] == 'pollster' and ci < len(row):
                pc = row[ci]; break
        if pc is not prev_pollster_cell or pc is None:
            if group_rows: groups.append(group_rows)
            group_rows = []
            prev_pollster_cell = pc
        group_rows.append(row)
    if group_rows: groups.append(group_rows)

    for grows in groups:
        # drop event/news rows (a cell spanning >=3 columns is a timeline marker, not poll data)
        grows = [r for r in grows if not any(c['colspan'] >= 3 for c in r)]
        nsc = len(grows)
        # O ano deste grupo de linhas (um levantamento): o dos cabeçalhos quando
        # existe; senão, em subpágina de intervalo, resolvido por âncora de
        # citação e ordem cronológica inversa (ver resolver_ano).
        ym_grupo = ym
        if ym_grupo is None and ano_ctx and ano_ctx.get('faixa') and grows:
            dcell = next((clean_cell(grows[0][ci].get('text', grows[0][ci]['raw'])) for ci, col in enumerate(cols)
                          if col['kind'] == 'dates' and ci < len(grows[0])), None)
            bruto = ' '.join(c.get('text', c['raw']) for r in grows for c in r)
            ym_grupo = resolver_ano(dcell, bruto, ano_ctx)
        for k, row in enumerate(grows):
            poll = {
                'source': 'wikipedia', 'race': race, 'state': state, 'round': rnd,
                'scenario': None, 'pollster': None, 'contractor': None,
                'fieldwork_start': None, 'fieldwork_end': None,
                'sample_size': None, 'margin_of_error': None,
                'results': [], 'others_pct': None, 'undecided_pct': None,
                'source_url': source_url,
            }
            warnings = []
            others_extra = []
            und_parts = []
            for ci, col in enumerate(cols):
                if ci >= len(row): break
                raw = row[ci].get('text', row[ci]['raw'])
                txt = clean_cell(raw)
                kind = col['kind']
                if kind == 'pollster':
                    poll['pollster'] = re.sub(r'\s+', ' ', txt).strip() or None
                elif kind == 'dates':
                    st, en, ok = parse_dates(txt, ym_grupo)
                    if st and en and st > en:   # source typos like "22 a 18 de julho"
                        warnings.append(f"inverted date range '{txt}' - start dropped")
                        st = None
                    poll['fieldwork_start'], poll['fieldwork_end'] = st, en
                    if not st:
                        warnings.append(f"unparsed dates: '{txt}'")
                    elif not ok:
                        warnings.append(f"approximate dates from '{txt}'")
                elif kind == 'sample':
                    poll['sample_size'] = parse_sample(txt)
                elif kind == 'moe':
                    poll['margin_of_error'] = parse_moe(txt)
                elif kind == 'others':
                    v, ok = parse_pct(txt)
                    poll['others_pct'] = v
                    nre = re.search(r'\{\{\s*Nre\s*\|(.*?)\}\}', raw, flags=re.S|re.I)
                    if nre:
                        others_extra.append(clean_cell(nre.group(1)))
                elif kind == 'undecided':
                    v, ok = parse_pct(txt)
                    if v is not None: und_parts.append(v)
                elif kind == 'candidate':
                    v, ok = parse_pct(txt)
                    if v is not None:
                        poll['results'].append({'candidate': col['name'], 'party': col.get('party'), 'pct': v})
                        if not ok:
                            warnings.append(f"pct for {col['name']} parsed loosely from '{txt}'")
            if und_parts:
                poll['undecided_pct'] = round(sum(und_parts), 2)
                if len(und_parts) > 1:
                    warnings.append(f"undecided_pct = sum of {len(und_parts)} columns (brancos/nulos + indecisos): {und_parts}")
            if others_extra:
                poll['others_detail'] = '; '.join(others_extra)
            # scenario label
            if rnd == 2:
                cands = [r['candidate'] for r in poll['results']]
                if scenario_base:
                    poll['scenario'] = f"2º turno: {scenario_base}"
                elif len(cands) >= 2:
                    poll['scenario'] = "2º turno: " + " vs ".join(cands)
                else:
                    poll['scenario'] = "2º turno"
                if len(cands) > 2:
                    poll['scenario'] = "2º turno: " + " vs ".join(cands)
            else:
                poll['scenario'] = f"1º turno — cenário {k+1}/{nsc}" if nsc > 1 else "1º turno — cenário único"
            if not poll['results']:
                continue  # blank/rowspan artifact
            if not poll['pollster']:
                warnings.append('missing pollster')
            if warnings:
                poll['parse_warnings'] = warnings
            out.append(poll)
    return out


def desambigua_2t(polls):
    """Resolve colisoes de id no 2o turno vindas de rotulo por legenda de secao.
    O pollId (scrape.mjs) hasheia pollster|race|state|round|fieldwork|scenario e
    NAO inclui o elenco; a legenda de subsecao da Wikipedia (h3) as vezes rotula
    pesquisas de PARES DIFERENTES com a mesma legenda (medido: governador:MG,
    Cleitinho x Kalil e Cleitinho x Patrus Ananias sob 'Cleitinho e Alexandre
    Kalil'), cunhando UM id para dois confrontos distintos e abortando o scrape.
    Agrupa por TODA a chave do id; so quando um grupo tem >1 elenco distinto
    (colisao real) reescreve o scenario pelo par real. Blast minimo: toca apenas
    as linhas que de fato colidiriam."""
    from collections import defaultdict
    groups = defaultdict(list)
    for p in polls:
        if p.get('round') == 2 and len(p.get('results') or []) >= 2:
            key = (p.get('pollster'), p.get('race'), p.get('state'),
                   p.get('fieldwork_end') or p.get('published_date'), p.get('scenario'))
            groups[key].append(p)
    for ps in groups.values():
        rosters = {tuple(sorted(r['candidate'] for r in p['results'])) for p in ps}
        if len(rosters) > 1:
            for p in ps:
                cands = [r['candidate'] for r in p['results']]
                p['scenario'] = "2º turno: " + " vs ".join(cands)
    return polls

def _fold(t):
    t = unicodedata.normalize('NFD', (t or '').lower())
    return ''.join(ch for ch in t if not unicodedata.combining(ch))

def hints_from_title(tail):
    """(turno padrão, ano inicial, faixa de anos) lidos do título RELATIVO de
    uma subpágina.

    `tail` é o que vem depois de "<página configurada>/" — ex.
    "Primeiro Turno/2026/Janeiro a Agosto" → (1, 2026, (2026, 2026));
    "Segundo Turno/2025" → (2, 2025, (2025, 2025)).
    "Primeiro Turno/2023-2025" → (1, None, (2023, 2025)): um INTERVALO não é um
    ano — devolver o primeiro (2023) datou 331 pesquisas de três anos em 2023
    na rodada 64 (14/09/2026). Com a faixa, `parse_one_table` resolve o ano de
    cada linha por âncora de citação e pela ordem cronológica inversa (ver
    `resolver_ano`). None (página configurada) → (1, None, None), que é
    exatamente o estado inicial que `extract` sempre teve.
    """
    if not tail:
        return 1, None, None
    low = _fold(tail)
    rnd = 2 if ('segundo turno' in low or 'second round' in low or '2o turno' in low or '2º turno' in tail.lower()) else 1
    anos = [int(y) for y in re.findall(r'(20\d\d)', tail)]
    if not anos:
        return rnd, None, None
    faixa = (min(anos), max(anos))
    return rnd, (faixa[0] if faixa[0] == faixa[1] else None), faixa

def page_title_from_url(url):
    """Título (com espaços) a partir de .../wiki/<Título> ou ...?title=<Título>."""
    from urllib.parse import unquote, urlparse, parse_qs
    u = urlparse(url)
    qs = parse_qs(u.query)
    if 'title' in qs:
        t = qs['title'][0]
    else:
        m = re.search(r'/wiki/([^?#]+)', url)
        t = m.group(1) if m else ''
    return unquote(t).replace('_', ' ').strip()

def _norm_title(t):
    t = re.sub(r'\s+', ' ', (t or '').replace('_', ' ')).strip().strip('/')
    return (t[:1].upper() + t[1:]) if t else t

def discover_subpages(text, title):
    """Subpáginas de `title` referenciadas no wikitext CRU de `title`.

    Por que existe: em setembro de 2026 a Wikipédia lusófona moveu as tabelas
    antigas da presidencial para subpáginas ("…/Primeiro Turno/2026/Janeiro a
    Agosto") e passou a TRANSCLUÍ-las na principal. `action=raw` devolve só o
    marcador `{{:Subpágina}}` — as tabelas sumiram da coleta sem erro nenhum de
    fetch, e o guarda de delta por disputa congelou presidente:BR em 30/08
    (179 perguntas "sem prova"). Em vez de adivinhar nomes de subpágina, o
    coletor lê o que a própria página referencia:
      • transclusão absoluta   {{:Título/Sub}}
      • transclusão relativa   {{:/Sub}}
      • link absoluto          [[Título/Sub|…]]
      • link relativo          [[/Sub|…]]
      • {{AP|Título/Sub}}, {{Ver artigo principal|…}}, {{Main|…}} etc. — caem no
        caso absoluto, porque o título aparece por extenso.
    Âncoras (#…) e parâmetros (|…) são cortados. Só o que começa pelo título
    da página — outras páginas linkadas (eleição, categoria) NÃO entram.
    """
    if not title:
        return []
    base = _norm_title(title)
    words = [re.escape(w) for w in base.split(' ')]
    base_pat = r'[ _]+'.join(words)
    # primeira letra insensível a caixa (MediaWiki trata "pesquisas…" = "Pesquisas…")
    if base_pat and base_pat[0].isalpha():
        base_pat = '[' + base_pat[0].upper() + base_pat[0].lower() + ']' + base_pat[1:]
    tail_pat = r'([^\[\]\{\}\|#<>\n]+)'
    found = []
    for m in re.finditer(r'(?<![\w/])' + base_pat + r'/' + tail_pat, text):
        found.append(m.group(1))
    for m in re.finditer(r'(?:\[\[|\{\{:)\s*/' + tail_pat, text):
        found.append(m.group(1))
    out, seen = [], set()
    for tail in found:
        tail = _norm_title(tail)
        if not tail or tail.lower().startswith(('ficheiro:', 'file:', 'imagem:', 'image:')):
            continue
        full = f"{base}/{tail}"
        key = full.lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(full)
    return out

def _entry_from_title(parent, title):
    """Entrada no formato de scripts/wiki-pages.json para uma subpágina descoberta."""
    from urllib.parse import quote
    lang = parent.get('lang', 'pt')
    t = quote(title.replace(' ', '_'), safe='/:(),')
    return {
        'url': f"https://{lang}.wikipedia.org/wiki/{t}",
        'lang': lang,
        'race': parent.get('race', 'presidente'),
        'state': parent.get('state'),
        'raw_url': f"https://{lang}.wikipedia.org/w/index.php?title={t}&action=raw",
    }

def _self_test():
    """Guarda: a descoberta de subpáginas e o contexto herdado do título."""
    base = 'Pesquisas de opinião para a eleição presidencial no Brasil em 2026'
    text = '\n'.join([
        "Texto da página.",
        "{{:Pesquisas de opinião para a eleição presidencial no Brasil em 2026/Primeiro Turno/2026/Janeiro a Agosto}}",
        "{{AP|Pesquisas_de_opinião_para_a_eleição_presidencial_no_Brasil_em_2026/Segundo_Turno/2025}}",
        "Ver [[Pesquisas de opinião para a eleição presidencial no Brasil em 2026/Primeiro Turno/2025#Dezembro|2025]].",
        "[[/Primeiro Turno/2024|2024]] e {{:/Segundo Turno/2024}}",
        "[[Eleição presidencial no Brasil em 2026]] [[Ficheiro:Foto.svg|thumb]]",
        "{{:Pesquisas de opinião para a eleição presidencial no Brasil em 2026/Primeiro Turno/2026/Janeiro a Agosto}}",
    ])
    got = discover_subpages(text, base)
    want = [f"{base}/Primeiro Turno/2026/Janeiro a Agosto", f"{base}/Segundo Turno/2025",
            f"{base}/Primeiro Turno/2025", f"{base}/Primeiro Turno/2024", f"{base}/Segundo Turno/2024"]
    assert got == want, ('discover_subpages', got)
    assert discover_subpages("nada aqui [[Outra página/Sub]]", base) == []
    assert page_title_from_url("https://pt.wikipedia.org/w/index.php?title=Pesquisas_de_opini%C3%A3o_para_a_elei%C3%A7%C3%A3o_presidencial_no_Brasil_em_2026&action=raw") == base
    assert page_title_from_url("https://pt.wikipedia.org/wiki/Pesquisas_de_opini%C3%A3o_para_a_elei%C3%A7%C3%A3o_presidencial_no_Brasil_em_2026/Primeiro_Turno/2026/Janeiro_a_Agosto") == f"{base}/Primeiro Turno/2026/Janeiro a Agosto"
    e = _entry_from_title({'lang': 'pt', 'race': 'presidente', 'state': None}, f"{base}/Primeiro Turno/2026/Janeiro a Agosto")
    assert e['raw_url'] == "https://pt.wikipedia.org/w/index.php?title=Pesquisas_de_opini%C3%A3o_para_a_elei%C3%A7%C3%A3o_presidencial_no_Brasil_em_2026/Primeiro_Turno/2026/Janeiro_a_Agosto&action=raw", e['raw_url']
    assert hints_from_title(None) == (1, None, None)
    assert hints_from_title('Primeiro Turno/2026/Janeiro a Agosto') == (1, 2026, (2026, 2026))
    assert hints_from_title('Segundo Turno/2025') == (2, 2025, (2025, 2025))
    assert hints_from_title('Second round/2025') == (2, 2025, (2025, 2025))
    assert hints_from_title('Primeiro Turno/2023-2025') == (1, None, (2023, 2025)), 'intervalo não é ano'

    # Uma tabela como as da subpágina: cabeçalho só com o MÊS, sem ano nem turno.
    tabela = '\n'.join([
        "=== Janeiro ===",
        "{| class=\"wikitable\"",
        "! Instituto !! Data !! Amostra !! [[Luiz Inácio Lula da Silva|Lula]]<br>{{small|[[Partido dos Trabalhadores|PT]]}} !! [[Flávio Bolsonaro|Flávio]]<br>{{small|[[Partido Liberal (2006)|PL]]}} !! Outros !! Indecisos",
        "|-",
        "| Quaest || 5 a 7 de janeiro || 2.004 || 36 || 29 || 10 || 15",
        "|}",
    ])
    url = f"https://pt.wikipedia.org/wiki/{base}"
    sem = extract(tabela, url, 'pt', 'presidente', None)
    assert len(sem) == 1 and sem[0]['round'] == 1 and sem[0]['fieldwork_end'] is None, ('sem título: ano indefinido', sem)
    p1 = extract(tabela, url, 'pt', 'presidente', None, title_hint='Primeiro Turno/2026/Janeiro a Agosto')
    assert len(p1) == 1 and p1[0]['round'] == 1 and p1[0]['fieldwork_end'] == '2026-01-07', p1
    assert [r['candidate'] for r in p1[0]['results']] == ['Luiz Inácio Lula da Silva', 'Flávio Bolsonaro'], p1
    p2 = extract(tabela, url, 'pt', 'presidente', None, title_hint='Segundo Turno/2025')
    assert len(p2) == 1 and p2[0]['round'] == 2 and p2[0]['fieldwork_end'] == '2025-01-07', p2
    # O cabeçalho continua mandando sobre o título.
    p3 = extract("== Segundo turno ==\n" + tabela, url, 'pt', 'presidente', None, title_hint='Primeiro Turno/2026/Janeiro a Agosto')
    assert p3[0]['round'] == 2, p3
    # Subpágina de INTERVALO ("2023-2025"), sem cabeçalho de ano, em ordem
    # cronológica inversa — a forma real da "/Primeiro Turno/2023-2025" em
    # 14/09/2026. Três levantamentos: (a) ancorado pela citação (jan/2025),
    # (b) sem citação, mês maior que o anterior → virou 2024 pela ordem,
    # (c) só com acessodata=2024 e mês menor → segue 2024 (acesso só limita).
    cab = "! Instituto !! Data !! Amostra !! [[Luiz Inácio Lula da Silva|Lula]]<br>{{small|[[Partido dos Trabalhadores|PT]]}} !! [[Flávio Bolsonaro|Flávio]]<br>{{small|[[Partido Liberal (2006)|PL]]}} !! Outros !! Indecisos"
    faixa = '\n'.join([
        "==== Janeiro e Fevereiro ====",
        "{| class=\"wikitable\"", cab, "|-",
        "| Quaest<ref>{{citar web|url=https://x.example/a|titulo=T|data=13 de janeiro de 2025|acessodata=2 de fevereiro de 2025}}</ref> || 7 Jan – 10 Jan || 2.004 || 36 || 29 || 10 || 15",
        "|}",
        "==== De setembro a dezembro ====",
        "{| class=\"wikitable\"", cab, "|-",
        "| Datafolha || 21 Nov – 25 Nov || 2.000 || 35 || 30 || 10 || 15",
        "|-",
        "| Paraná Pesquisas<ref>{{citar web|url=https://x.example/b|titulo=T|acessodata=13 de outubro de 2024}}</ref> || 29 Set – 3 Out || 2.000 || 34 || 31 || 10 || 15",
        "|}",
    ])
    pf = extract(faixa, url, 'pt', 'presidente', None, title_hint='Primeiro Turno/2023-2025')
    got = [(p['pollster'], p['fieldwork_start'], p['fieldwork_end']) for p in pf]
    assert got == [('Quaest', '2025-01-07', '2025-01-10'), ('Datafolha', '2024-11-21', '2024-11-25'),
                   ('Paraná Pesquisas', '2024-09-29', '2024-10-03')], got
    # Âncora com campo em dezembro e matéria em janeiro: ano da publicação menos um.
    dez = '\n'.join(["==== Novembro - Dezembro ====", "{| class=\"wikitable\"", cab, "|-",
        "| Quaest<ref>{{citar web|url=https://x.example/c|titulo=T|data=3 de janeiro de 2025}}</ref> || 18 Dez – 22 Dez || 2.004 || 36 || 29 || 10 || 15", "|}"])
    pd = extract(dez, url, 'pt', 'presidente', None, title_hint='Primeiro Turno/2023-2025')
    assert [(p['fieldwork_start'], p['fieldwork_end']) for p in pd] == [('2024-12-18', '2024-12-22')], pd
    # Citação REAPROVEITADA de matéria antiga (agosto) numa linha de novembro:
    # não é publicação deste campo (campo depois da matéria) → vale a ordem.
    velha = '\n'.join(["==== De setembro a dezembro ====", "{| class=\"wikitable\"", cab, "|-",
        "| AtlasIntel<ref>{{citar web|url=https://x.example/e|titulo=T|data=31 de dezembro de 2024}}</ref> || 26 Dez – 31 Dez || 2.000 || 36 || 29 || 10 || 15",
        "|-",
        "| Paraná Pesquisas<ref>{{Citar web|url=https://x.example/f|titulo=T|acessodata=27 de novembro de 2024|data=27 de agosto de 2024}}</ref> || 21 Nov – 25 Nov || 2.000 || 34 || 31 || 10 || 15",
        "|}"])
    pv = extract(velha, url, 'pt', 'presidente', None, title_hint='Primeiro Turno/2023-2025')
    assert [p['fieldwork_end'] for p in pv] == ['2024-12-31', '2024-11-25'], pv
    # A faixa é teto e piso: nunca sai de 2023–2025.
    piso = '\n'.join(["==== Janeiro ====", "{| class=\"wikitable\"", cab, "|-",
        "| Quaest<ref>{{citar web|url=https://x.example/d|titulo=T|data=3 de janeiro de 2020}}</ref> || 18 Dez – 22 Dez || 2.004 || 36 || 29 || 10 || 15", "|}"])
    pp = extract(piso, url, 'pt', 'presidente', None, title_hint='Primeiro Turno/2023-2025')
    assert pp[0]['fieldwork_end'] == '2023-12-22', pp
    # Página configurada (sem título): comportamento intacto — sem ano, sem data.
    assert extract(faixa, url, 'pt', 'presidente', None)[0]['fieldwork_end'] is None
    # A FILA: subpágina descoberta entra logo depois da página-mãe — antes da
    # inglesa —, cada página é buscada uma vez, e o ano herdado chega lá.
    base_en = 'Opinion polling for the 2026 Brazilian presidential election'
    paginas = {
        base: "{{:" + base + "/Primeiro Turno/2023-2025}}\n[[/Primeiro Turno/2026/Janeiro a Agosto|2026]]\n== 2026 ==\n=== Setembro ===\n" + tabela.split('\n', 1)[1].replace('5 a 7 de janeiro', '4 a 7 de setembro').replace('Quaest', 'Nexus'),
        base + '/Primeiro Turno/2023-2025': "[[/Dezembro|dez]]\n" + faixa,
        base + '/Primeiro Turno/2023-2025/Dezembro': dez,
        base + '/Primeiro Turno/2026/Janeiro a Agosto': tabela,
        base_en: "nothing here",
    }
    pedidos = []
    def falso_buscar(raw_url):
        t = page_title_from_url(raw_url); pedidos.append(t)
        if t not in paginas: raise Exception('HTTP Error 404')
        return paginas[t]
    cfg = [
        _entry_from_title({'lang': 'pt', 'race': 'presidente', 'state': None}, base),
        _entry_from_title({'lang': 'pt', 'race': 'presidente', 'state': None}, base + '/Primeiro Turno/2026/Janeiro a Agosto'),
        _entry_from_title({'lang': 'en', 'race': 'presidente', 'state': None}, base_en),
    ]
    polls, log, falhas = coletar(cfg, falso_buscar)
    assert pedidos == [base, base + '/Primeiro Turno/2023-2025', base + '/Primeiro Turno/2023-2025/Dezembro',
                       base + '/Primeiro Turno/2026/Janeiro a Agosto', base_en], ('ordem da fila', pedidos)
    assert len(pedidos) == len(set(pedidos)) and not falhas, (pedidos, falhas)
    assert [p['fieldwork_end'] for p in polls] == ['2026-09-07', '2025-01-10', '2024-11-25', '2024-10-03', '2024-12-22', '2026-01-07'], polls
    assert [e['alvo'] for e in log] == ['presidente:BR (pt)', 'presidente:BR (pt) ⊂ /Primeiro Turno/2023-2025',
        'presidente:BR (pt) ⊂ /Primeiro Turno/2023-2025/Dezembro', 'presidente:BR (pt) ⊂ /Primeiro Turno/2026/Janeiro a Agosto', 'presidente:BR (en)'], log
    print("wiki_parse --self-test: OK (descoberta + fila PT-antes-de-EN + contexto do título + ano por âncora/ordem)")

def _buscar_http(raw_url):
    import urllib.request
    req = urllib.request.Request(raw_url, headers={
        'User-Agent': 'PlacarDasPesquisas/1.0 (agregador de pesquisas eleitorais)'})
    with urllib.request.urlopen(req, timeout=45) as r:
        return r.read().decode('utf-8')

def coletar(pages, buscar):
    """Baixa e extrai as páginas configuradas e as subpáginas que elas referenciam.

    A ORDEM É PARTE DO CONTRATO. wikipedia.mjs elimina quase-duplicatas
    (instituto, disputa, turno, data, elenco) ficando com a PRIMEIRA — é assim
    que a lusófona (PT, cenários com ordinal declarado) prevalece sobre a
    inglesa (EN, que lista UM cenário por pesquisa, sem ordinal). Uma subpágina
    descoberta entra na fila LOGO DEPOIS da página que a referencia, nunca no
    fim: quando a "/Primeiro Turno/2023-2025" foi enfileirada depois da EN
    (rodada 66, 14/09/2026), o cenário "único" inglês sobreviveu à dedupe e,
    sem ordinal, virou ímã em `mergePolls`/`keepFullestRound1` — engoliu
    cenários alternativos da PT com ≥80% do elenco em comum (Futura 1/6, Neokemp
    4/4, AtlasIntel 1/5, Gerp 2/2) sem deixar linhagem, e presidente:BR seguiu
    em quarentena. Até 2 níveis: uma subpágina-índice pode apontar para as suas.
    Dedupe por (lang, título): uma subpágina já listada no JSON não é buscada de
    novo quando a principal também a referencia.
    Devolve (polls, page_log, failures).
    """
    MAX_DEPTH = 2
    all_polls, failures, page_log = [], [], []
    fila = []
    vistos = set()
    bases = {}
    for pg in pages:
        title = pg.get('title') or page_title_from_url(pg.get('raw_url') or pg.get('url') or '')
        key = (pg.get('lang', 'pt'), _norm_title(title).lower())
        if key in vistos:
            continue
        vistos.add(key)
        # Uma configurada que é subpágina de outra configurada (mesmo idioma)
        # herda o contexto do título relativo a ela.
        tail = None
        for (lang_b, base_b), base_title in bases.items():
            if lang_b == pg.get('lang', 'pt') and key[1].startswith(base_b + '/'):
                tail = _norm_title(title)[len(base_title) + 1:]
                break
        if '/' not in _norm_title(title):
            bases[key] = _norm_title(title)
        fila.append((pg, title, tail, 0, None))
    qi = 0
    while qi < len(fila):
        pg, title, tail, depth, parent = fila[qi]; qi += 1
        alvo = f"{pg.get('race', 'presidente')}:{pg.get('state') or 'BR'} ({pg.get('lang', 'pt')})"
        if tail:
            alvo += f" ⊂ /{tail}"
        try:
            text = buscar(pg['raw_url'])
            polls = extract(text, pg['url'], pg.get('lang', 'pt'),
                            pg.get('race', 'presidente'), pg.get('state'), title_hint=tail)
            all_polls.extend(polls)
            entry = {'source': 'wikipedia', 'alvo': alvo, 'fetched': len(polls)}
            if parent:
                entry['descoberta_em'] = parent
            page_log.append(entry)
            print(f"  wiki: {alvo}: {len(polls)} polls", file=sys.stderr)
            if depth < MAX_DEPTH:
                base_title = title if not tail else title[:len(title) - len(tail) - 1]
                novas = []
                for sub in discover_subpages(text, title):
                    skey = (pg.get('lang', 'pt'), sub.lower())
                    if skey in vistos:
                        continue
                    vistos.add(skey)
                    sub_tail = sub[len(base_title) + 1:] if sub.lower().startswith(base_title.lower() + '/') else sub
                    print(f"  wiki: subpágina descoberta em {title}: /{sub_tail}", file=sys.stderr)
                    novas.append((_entry_from_title(pg, sub), sub, sub_tail, depth + 1, title))
                # logo depois da página-mãe (ver docstring), na ordem em que ela as cita
                fila[qi:qi] = novas
        except Exception as e:
            failures.append(f"{pg['raw_url']}: {e}")
            page_log.append({'source': 'wikipedia', 'alvo': alvo, 'fetched': 0, 'error': str(e)})
            print(f"  wiki FAIL {pg['raw_url']}: {e}", file=sys.stderr)
    return all_polls, page_log, failures

def main():
    if sys.argv[1:] == ['--self-test']:
        _self_test(); return
    cfg_path = sys.argv[1]
    with open(cfg_path, encoding='utf-8') as f:
        pages = json.load(f)
    all_polls, page_log, failures = coletar(pages, _buscar_http)
    if failures and not all_polls:
        sys.exit('all wiki pages failed: ' + '; '.join(failures))
    all_polls = desambigua_2t(all_polls)
    json.dump({'polls': all_polls, 'pages': page_log}, sys.stdout, ensure_ascii=False)

if __name__ == '__main__':
    main()
