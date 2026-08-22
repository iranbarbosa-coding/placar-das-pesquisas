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

def extract(text, source_url, lang, race='presidente', state=None):
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
    last_year = None   # running year context in document order
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
            polls.extend(parse_one_table(tbl, h2, h3, h4, hidden, source_url, lang, race, state, last_year))
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

def parse_one_table(tbl_lines, h2, h3, h4, hidden, source_url, lang, race='presidente', state=None, year_ctx=None):
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
    rnd = 2 if ('segundo turno' in low or 'second round' in low) else 1
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
                    st, en, ok = parse_dates(txt, ym)
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

def main():
    import urllib.request
    cfg_path = sys.argv[1]
    with open(cfg_path, encoding='utf-8') as f:
        pages = json.load(f)
    all_polls, failures = [], []
    for pg in pages:
        try:
            req = urllib.request.Request(pg['raw_url'], headers={
                'User-Agent': 'PlacarDasPesquisas/1.0 (agregador de pesquisas eleitorais)'})
            with urllib.request.urlopen(req, timeout=45) as r:
                text = r.read().decode('utf-8')
            polls = extract(text, pg['url'], pg.get('lang', 'pt'),
                            pg.get('race', 'presidente'), pg.get('state'))
            all_polls.extend(polls)
            print(f"  wiki: {pg.get('race')}/{pg.get('state') or 'BR'} ({pg.get('lang')}): {len(polls)} polls", file=sys.stderr)
        except Exception as e:
            failures.append(f"{pg['raw_url']}: {e}")
            print(f"  wiki FAIL {pg['raw_url']}: {e}", file=sys.stderr)
    if failures and not all_polls:
        sys.exit('all wiki pages failed: ' + '; '.join(failures))
    all_polls = desambigua_2t(all_polls)
    json.dump(all_polls, sys.stdout, ensure_ascii=False)

if __name__ == '__main__':
    main()
