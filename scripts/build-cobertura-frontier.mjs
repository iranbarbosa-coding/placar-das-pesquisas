#!/usr/bin/env node
// build-cobertura-frontier.mjs
// -----------------------------------------------------------------------------
// Rebuilds the presidential-coverage frontier (the "faltantes" work-list) from
// the RAW TSE structured fields, replacing the old NLP-over-free-text heuristic
// that miscounted national presidential polls (and multi-office field ops) as
// per-STATE presidential faltantes.
//
// SCOPE CLASSIFIER
//   For every cargo=Presidente registration it decides:
//     NATIONAL          -> a presidential poll fielded across the country
//     STATE(uf)         -> a presidential poll fielded inside ONE state
//     UNCERTAIN         -> the structured fields do not decide; needs a human
//   using the REAL fields, chiefly DS_DADO_MUNICIPIO (the "área de abrangência"
//   statement) and DS_PLANO_AMOSTRAL (the sampling universe), never the cargo.
//
// The old _ufs/_nat/_scope/_how/_muni_flag fields on the input are treated as
// SUSPECT and are NOT read.
//
// USAGE
//   node scripts/build-cobertura-frontier.mjs \
//        [--registros <path>] [--store <path>] [--outdir <dir>] [--report]
//   Defaults resolve to the committed registros-pres-br.json, data/surveys.ndjson,
//   and data-research/cobertura-presidencial/ so it is runnable now. In the
//   GitHub Action, point --registros at the fresh fetchTseRegistry output.
// -----------------------------------------------------------------------------

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

// ---------------------------------------------------------------------------
// UF reference table. Names carry accents; matching is accent-insensitive with
// a couple of accent-sensitive guards (see matchUFs) to avoid the "Pará" vs the
// preposition "para" trap.
// ---------------------------------------------------------------------------
const UF_NAMES = {
  AC: ['Acre'],
  AL: ['Alagoas'],
  AP: ['Amapá'],
  AM: ['Amazonas'],
  BA: ['Bahia'],
  CE: ['Ceará'],
  DF: ['Distrito Federal', 'Brasília'],
  ES: ['Espírito Santo'],
  GO: ['Goiás'],
  MA: ['Maranhão'],
  MS: ['Mato Grosso do Sul'],
  MT: ['Mato Grosso'],
  MG: ['Minas Gerais'],
  PA: ['Pará'],
  PB: ['Paraíba'],
  PR: ['Paraná'],
  PE: ['Pernambuco'],
  PI: ['Piauí'],
  RJ: ['Rio de Janeiro'],
  RN: ['Rio Grande do Norte'],
  RS: ['Rio Grande do Sul'],
  RO: ['Rondônia'],
  RR: ['Roraima'],
  SC: ['Santa Catarina'],
  SP: ['São Paulo'],
  SE: ['Sergipe'],
  TO: ['Tocantins'],
};

// Order names longest-first so "Mato Grosso do Sul" wins over "Mato Grosso" and
// "Rio Grande do ..." over any shorter prefix.
const UF_PATTERNS = Object.entries(UF_NAMES)
  .flatMap(([uf, names]) => names.map((n) => ({ uf, name: n })))
  .sort((a, b) => b.name.length - a.name.length);

const stripAccents = (s) =>
  s.normalize('NFD').replace(/[̀-ͯ]/g, '');

const norm = (s) => stripAccents(String(s || '')).toLowerCase();

// Short single-word UF names that collide with common Portuguese words when
// accents are stripped. For these we require the ACCENTED spelling to be present
// in the original text, OR an explicit governing context ("estado do/de <name>",
// "no/na <name>"). "Pará" -> "para" (preposition) is the main offender; "Piauí",
// "Ceará", "Goiás", "Amapá", "Paraíba", "Maranhão", "Rondônia" are guarded the
// same way for safety.
const ACCENT_GUARDED = new Set(['PA', 'PI', 'CE', 'GO', 'AP', 'PB', 'MA', 'RO']);

// ---------------------------------------------------------------------------
// matchUFs(text) -> ordered list of distinct UF codes referenced as a place.
// Greedy longest-first; once a span is consumed it is blanked so a shorter name
// cannot re-match inside it.
// ---------------------------------------------------------------------------
function matchUFs(text) {
  if (!text) return [];
  const original = String(text);
  let hay = norm(original); // accent-stripped, lowercased working copy
  const found = [];
  for (const { uf, name } of UF_PATTERNS) {
    const needle = norm(name);
    const re = new RegExp(`\\b${needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g');
    let m;
    let matchedHere = false;
    while ((m = re.exec(hay)) !== null) {
      if (ACCENT_GUARDED.has(uf)) {
        // Require accented spelling in original OR a governing context word.
        // The \b before the context word matters: without it, a word ENDING in
        // "das/dos" (selecionaDAS, entrevistaDOS) would falsely satisfy context
        // and let the preposition "para" match PA.
        const idx = m.index;
        const before = hay.slice(Math.max(0, idx - 16), idx);
        const hasContext = /(^|[^a-zà-ú])(estado|estados|do|da|de|no|na|em|dos|das)\s+$/.test(before);
        const accentedInOriginal = new RegExp(
          `\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`,
          'i'
        ).test(original);
        if (!hasContext && !accentedInOriginal) continue;
      }
      // "Amazonas" also names Pará mesoregions/rivers ("Baixo/Médio/Alto
      // Amazonas", "rio Amazonas"). Reject those so they don't false-match AM.
      if (uf === 'AM') {
        const before = hay.slice(Math.max(0, m.index - 8), m.index);
        if (/(baixo|medio|alto|rio)\s+$/.test(before)) {
          re.lastIndex = m.index + m[0].length;
          continue;
        }
      }
      matchedHere = true;
      // blank the span so shorter names can't nest inside it
      hay =
        hay.slice(0, m.index) +
        ' '.repeat(m[0].length) +
        hay.slice(m.index + m[0].length);
      re.lastIndex = m.index; // continue scanning the blanked copy
    }
    if (matchedHere && !found.includes(uf)) found.push(uf);
  }
  return found;
}

// National markers. Any hit is a strong "spans the country" signal.
const NATIONAL_RE = new RegExp(
  [
    'nacional',
    'todo o brasil',
    'em todo o pais',
    'territorio nacional',
    'ambito nacional',
    'nivel nacional',
    'escala nacional',
    'abrangencia nacional',
    'todo o territorio',
    '\\b27\\s+(unidades|estados|ufs)',
    'todas as (27|unidades|regioes)',
    'unidades da federacao',
    'cinco regioes',
    '5 regioes',
    'todas as regioes',
    '(as|nas|das)\\s+(cinco|5)\\s+\\(?(cinco)?\\)?\\s*regioes',
    'regi[oõ]es\\s+do\\s+(brasil|pais)',
    '(cinco|5)[^.]{0,14}regi[oõ]es',
    'centro-oeste',
  ].join('|'),
  'i'
);

const isNational = (t) => NATIONAL_RE.test(norm(t));

// Explicit "(UF)" 2-letter abbreviation, e.g. "Estado do Pará (PA)". Strong,
// unambiguous state signal. Restricted to the 27 valid codes.
const VALID_UF = new Set(Object.keys(UF_NAMES));
function parenUFs(text) {
  const out = [];
  const re = /\(([A-Z]{2})\)/g;
  let m;
  while ((m = re.exec(String(text))) !== null) {
    if (VALID_UF.has(m[1]) && !out.includes(m[1])) out.push(m[1]);
  }
  return out;
}

// UF abbreviations, only in shapes that unambiguously denote a place — never a
// bare standalone token (municipality tables are full of stray 2-letter cells):
//   (SP)            parenthesized
//   TRE-SP TRE/CE   electoral-court prefix
//   São Mateus/ES   attached to a place name via hyphen/slash (letter before)
//   BRASILIA - DF   place name, spaced hyphen
// Restricted to the 27 valid codes.
function abbrevUFs(text) {
  const out = new Set(parenUFs(text));
  const s = String(text);
  const add = (re) => {
    let m;
    while ((m = re.exec(s)) !== null) if (VALID_UF.has(m[1])) out.add(m[1]);
  };
  add(/\bTRE[-/\s]?([A-Z]{2})\b/g);                          // TRE-SP / TRE SP
  add(/[A-Za-zÀ-ÿ]\s*[-/]\s*([A-Z]{2})(?=[\s.,;:)\]]|$)/g);  // "São Mateus/ES", "BRASILIA - DF"
  add(/\bestad[o]s?\s+d[eo]\s+([A-Z]{2})\b/g);               // "estado do RN"
  return [...out];
}

// From a universe/coverage clause, resolve the named PLACE:
//   -> {national:true} if it is Brasil / the whole country
//   -> {uf} if it names exactly one state
//   -> null otherwise
const UNIVERSE_LEAD =
  /(?:eleitor(?:ado|es)|universo|popula[cç][aã]o|aptos?\s+a\s+votar|representa(?:ndo|tiv[oa])[^.]{0,30}?eleitorado|abrang[eê]ncia[^.]{0,20}?(?:é|e|compreende|corresponde|abrange))/gi;
function placeFromUniverse(text) {
  if (!text) return null;
  const src = String(text);
  const nsrc = norm(src);
  let m;
  UNIVERSE_LEAD.lastIndex = 0;
  while ((m = UNIVERSE_LEAD.exec(nsrc)) !== null) {
    const tail = src.slice(m.index, m.index + m[0].length + 70);
    const ntail = norm(tail);
    // whole-country phrasing right after the lead
    if (/\b(?:d[eo]\s+)?brasil\b/.test(ntail) || /\bnacional\b/.test(ntail)) {
      return { national: true };
    }
    const ufs = matchUFs(tail);
    if (ufs.length === 1) return { uf: ufs[0] };
    if (ufs.length > 1) return { ambiguous: ufs };
    // bare 2-letter code form: "eleitorado do estado do RN"
    const codeM = tail.match(/\bestad[o]s?\s+d[eo]\s+([A-Z]{2})\b/);
    if (codeM && VALID_UF.has(codeM[1])) return { uf: codeM[1] };
  }
  return null;
}

// ---------------------------------------------------------------------------
// classify(rec) -> { scope, uf, confidence, basis }
//   scope: 'NATIONAL' | 'STATE' | 'UNCERTAIN'
// Field priority: DS_DADO_MUNICIPIO "abrangência" > explicit "realizada no
// Estado de X (UF)" in methodology > sampling-universe clause > "(UF)" token >
// national marker > single-UF fallback.
// ---------------------------------------------------------------------------
function classify(rec) {
  const muni = String(rec.DS_DADO_MUNICIPIO || '');
  const plano = String(rec.DS_PLANO_AMOSTRAL || '');
  const meto = String(rec.DS_METODOLOGIA_PESQUISA || '');
  const isNulo = (s) => !s.trim() || /#NULO#/i.test(s);

  // --- E1: explicit "área de abrangência" statement in DS_DADO_MUNICIPIO. ------
  // Only trusted when the field actually carries the "abrang" coverage keyword;
  // a bare bairro/municipality list is NOT read here (a neighbourhood named
  // "Maranhão" must not be mistaken for the state).
  if (!isNulo(muni)) {
    const abrIdx = norm(muni).indexOf('abrang');
    if (abrIdx >= 0) {
      const clause = muni.slice(abrIdx, abrIdx + 170);
      if (isNational(clause)) {
        return { scope: 'NATIONAL', uf: null, confidence: 'high', basis: 'muni:abrangencia=nacional' };
      }
      const ufsClause = matchUFs(clause);
      if (ufsClause.length === 1) {
        return { scope: 'STATE', uf: ufsClause[0], confidence: 'high', basis: 'muni:abrangencia=estado' };
      }
    }
  }

  // --- E2: explicit "pesquisa realizada no Estado de X" (+ "(UF)") in the -------
  // methodology / municipality field. This is where Real Time Big Data etc. put
  // the definitive place when the abrangência clause is boilerplate.
  const metoMuni = `${meto}\n${muni}`;
  {
    const REALIZADA =
      /(?:pesquisa[^.]{0,30}?realizada|area[^.]{0,25}?(?:em estudo|de realiza[cç][aã]o|f[ií]sica)[^.]{0,25}?)\s+n[oa]?\s+(?:estado\s+d[eo]\s+)?/gi;
    let m;
    const nsrc = norm(metoMuni);
    REALIZADA.lastIndex = 0;
    while ((m = REALIZADA.exec(nsrc)) !== null) {
      const tail = metoMuni.slice(m.index, m.index + m[0].length + 60);
      if (/\bnacional\b|\bbrasil\b/.test(norm(tail))) {
        return { scope: 'NATIONAL', uf: null, confidence: 'high', basis: 'meto:realizada=nacional' };
      }
      const ufs = matchUFs(tail);
      if (ufs.length === 1) {
        return { scope: 'STATE', uf: ufs[0], confidence: 'high', basis: 'meto:realizada=estado' };
      }
    }
  }

  // --- E3: sampling-universe clause naming one state or Brasil. ----------------
  // Handles #NULO# muni (AtlasIntel "eleitorado de Amazonas" / "de Brasil").
  const uPlano = placeFromUniverse(plano);
  if (uPlano && uPlano.national) {
    return { scope: 'NATIONAL', uf: null, confidence: 'high', basis: 'plano:universo=brasil' };
  }
  if (uPlano && uPlano.uf) {
    return { scope: 'STATE', uf: uPlano.uf, confidence: 'high', basis: 'plano:universo=estado' };
  }
  const uMuni = placeFromUniverse(muni);
  if (uMuni && uMuni.national) {
    return { scope: 'NATIONAL', uf: null, confidence: 'high', basis: 'muni:universo=brasil' };
  }
  if (uMuni && uMuni.uf) {
    return { scope: 'STATE', uf: uMuni.uf, confidence: 'high', basis: 'muni:universo=estado' };
  }
  // methodology universe clause, e.g. "...eleitorado da Unidade da Federação (Paraná)"
  const uMeto = placeFromUniverse(meto);
  if (uMeto && uMeto.national) {
    return { scope: 'NATIONAL', uf: null, confidence: 'high', basis: 'meto:universo=brasil' };
  }
  if (uMeto && uMeto.uf) {
    return { scope: 'STATE', uf: uMeto.uf, confidence: 'high', basis: 'meto:universo=estado' };
  }

  // --- E3.5: explicit "(UF)" / "TRE-UF" / place-attached abbreviation. ---------
  // Runs only after the (more reliable) universe clauses so a data typo like
  // "Acre-GO" is resolved to AC by "eleitorado do Estado do Acre..." first.
  {
    const abbr = abbrevUFs(metoMuni);
    if (abbr.length === 1) {
      return { scope: 'STATE', uf: abbr[0], confidence: 'high', basis: 'abbrev:(UF)' };
    }
  }

  // --- E4: national marker anywhere, with no competing single-state signal. ----
  const natAnywhere = isNational(muni) || isNational(plano) || isNational(meto);
  // Distinct UFs from the informative (non-tabular) parts: muni + methodology +
  // the universe head of the plano (avoid demographic tables / IBGE URLs deeper).
  const ufsCore = matchUFs(`${muni}\n${meto}\n${plano.slice(0, 400)}`);
  const parAll = abbrevUFs(metoMuni);
  const ufsAll = [...new Set([...ufsCore, ...parAll])];

  if (natAnywhere && ufsAll.length <= 1) {
    return { scope: 'NATIONAL', uf: null, confidence: 'medium', basis: 'nacional-marker' };
  }
  if (ufsAll.length >= 5) {
    return { scope: 'NATIONAL', uf: null, confidence: 'medium', basis: 'many-ufs' };
  }

  // --- E5: single distinct UF fallback (no national marker). -------------------
  if (ufsAll.length === 1 && !natAnywhere) {
    return { scope: 'STATE', uf: ufsAll[0], confidence: 'medium', basis: 'fallback:single-uf' };
  }
  if (natAnywhere && ufsAll.length > 1) {
    return { scope: 'UNCERTAIN', uf: null, confidence: 'low', basis: 'conflict:nacional+multi-uf', ufs: ufsAll };
  }
  if (ufsAll.length > 1) {
    return { scope: 'UNCERTAIN', uf: null, confidence: 'low', basis: 'ambiguous:multi-uf', ufs: ufsAll };
  }
  return { scope: 'UNCERTAIN', uf: null, confidence: 'low', basis: 'no-signal' };
}

// ---------------------------------------------------------------------------
// Store join. A state-fielded presidential registration is "already captured"
// if the live store holds the same presidential operation:
//   (1) by TSE protocol   registro protocol == store.tse_registration, or
//   (2) by institute + uf + overlapping fieldwork window.
// ---------------------------------------------------------------------------
function protoToStoreFmt(p) {
  // "BR027612026" -> "BR-02761/2026"
  const m = String(p).match(/^([A-Z]{2})(\d+)(\d{4})$/);
  if (!m) return null;
  return `${m[1]}-${m[2].padStart(5, '0')}/${m[3]}`;
}

function instituteKey(name) {
  return norm(name)
    .replace(/\b(instituto|pesquisa[s]?|de|e|opiniao|assessoria|consultoria|ltda|epp|me|eireli|analise|mercado|estatistica|comunicacao|marketing|inteligencia|dados)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .join(' ');
}

function windowsOverlap(aS, aE, bS, bE, slackDays = 3) {
  const d = (x) => (x ? new Date(x).getTime() : NaN);
  const as = d(aS), ae = d(aE) || d(aS), bs = d(bS), be = d(bE) || d(bS);
  if ([as, bs].some(Number.isNaN)) return false;
  const slack = slackDays * 86400000;
  return as - slack <= (be || bs) && (bs - slack) <= (ae || as);
}

// The live store is a GENERAL poll store: its uf-level rows include 2024
// municipal and 2026 governor/senate polls, NOT only presidential subsamples.
// A same-institute+uf+window match against a governor poll would falsely mark a
// presidential registration "captured" (the multi-office conflation). So the
// fuzzy join is restricted to store rows that are actually presidential:
//   - carry a BR- presidential TSE registration, or
//   - their mint_seed candidate slate names a presidential figure.
// "Lula" is the robust anchor (in ~every presidential poll, never a state-office
// candidate); the rest are national-only 2026 names. Sitting governors who double
// as their own state's candidate (Zema, Caiado, Ratinho, Tarcísio, Eduardo Leite,
// Flávio Bolsonaro) are deliberately EXCLUDED as anchors to avoid false matches.
const PRES_ANCHORS = [
  'lula', 'jair bolsonaro', 'michelle bolsonaro', 'ciro gomes', 'pablo marçal',
  'pablo marcal', 'simone tebet', 'fernando haddad', 'geraldo alckmin',
  'aldo rebelo', 'gusttavo lima', 'augusto cury', 'joaquim barbosa', 'cabo daciolo',
];
function isPresidentialStoreSurvey(s) {
  if (/^BR-/.test(s.tse_registration || '')) return true;
  const seed = norm(s.mint_seed || '');
  const cand = seed.split('|').pop() || '';
  return PRES_ANCHORS.some((a) => cand.includes(norm(a)));
}

function buildStoreIndex(storeRecs) {
  const byProto = new Set();
  const byInstUf = [];
  for (const s of storeRecs) {
    if (s.tse_registration) byProto.add(String(s.tse_registration));
    const uf = s.universe && s.universe.uf;
    if (uf && isPresidentialStoreSurvey(s)) {
      for (const nm of s.institute_names_raw || []) {
        byInstUf.push({
          key: instituteKey(nm),
          uf,
          fs: s.fieldwork_start,
          fe: s.fieldwork_end,
          survey_id: s.survey_id,
          reg: s.tse_registration || null,
        });
      }
    }
  }
  return { byProto, byInstUf };
}

function findInStore(rec, cls, idx) {
  const proto = protoToStoreFmt(rec.NR_PROTOCOLO_REGISTRO);
  if (proto && idx.byProto.has(proto)) {
    return { captured: true, how: 'protocol', ref: proto };
  }
  if (cls.scope === 'STATE' && cls.uf) {
    const k = instituteKey(rec.NM_EMPRESA_FANTASIA || rec.NM_EMPRESA);
    for (const e of idx.byInstUf) {
      if (
        e.uf === cls.uf &&
        e.key &&
        k &&
        e.key === k &&
        windowsOverlap(rec.DT_INICIO_PESQUISA, rec.DT_FIM_PESQUISA, e.fs, e.fe)
      ) {
        return { captured: true, how: 'institute+uf+window', ref: e.survey_id };
      }
    }
  }
  return { captured: false, how: null, ref: null };
}

// ---------------------------------------------------------------------------
// CSV helpers (schema-compatible with the previous faltantes.csv).
// ---------------------------------------------------------------------------
const CSV_COLS = ['uf', 'protocolo', 'instituto', 'campo', 'n', 'classe', 'contratante', 'registro_dt', 'p360_noticia', 'nota'];
function csvCell(v) {
  const s = v == null ? '' : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}
function toCsv(rows, cols) {
  return [cols.join(','), ...rows.map((r) => cols.map((c) => csvCell(r[c])).join(','))].join('\n') + '\n';
}
const ymd = (s) => (s ? String(s).slice(0, 10) : '');

// ---------------------------------------------------------------------------
// main
// ---------------------------------------------------------------------------
function parseArgs(argv) {
  const a = { report: false };
  for (let i = 2; i < argv.length; i++) {
    const t = argv[i];
    if (t === '--report') a.report = true;
    else if (t === '--registros') a.registros = argv[++i];
    else if (t === '--store') a.store = argv[++i];
    else if (t === '--outdir') a.outdir = argv[++i];
  }
  return a;
}

function main() {
  const args = parseArgs(process.argv);
  const here = path.dirname(new URL(import.meta.url).pathname);
  const repo = path.resolve(here, '..');
  const covDir = args.outdir || path.join(repo, 'data-research', 'cobertura-presidencial');
  const registrosPath = args.registros || path.join(covDir, 'registros-pres-br.json');
  const storePath = args.store || path.join(repo, 'data', 'surveys.ndjson');

  const registros = JSON.parse(fs.readFileSync(registrosPath, 'utf8'));
  const storeRecs = fs.existsSync(storePath)
    ? fs.readFileSync(storePath, 'utf8').trim().split('\n').filter(Boolean).map((l) => JSON.parse(l))
    : [];
  const storeIdx = buildStoreIndex(storeRecs);

  // Classify + join.
  const classified = registros.map((rec) => {
    const cls = classify(rec);
    const store = cls.scope === 'STATE' ? findInStore(rec, cls, storeIdx) : { captured: false, how: null, ref: null };
    return { rec, cls, store };
  });

  const national = classified.filter((c) => c.cls.scope === 'NATIONAL');
  const uncertain = classified.filter((c) => c.cls.scope === 'UNCERTAIN');
  const state = classified.filter((c) => c.cls.scope === 'STATE');
  const stateCaptured = state.filter((c) => c.store.captured);
  const faltantes = state.filter((c) => !c.store.captured); // the corrected frontier

  // --- faltantes.csv (schema-compatible) --------------------------------------
  const faltRows = faltantes
    .map(({ rec, cls }) => ({
      uf: cls.uf,
      protocolo: rec.NR_PROTOCOLO_REGISTRO,
      instituto: rec.NM_EMPRESA_FANTASIA || rec.NM_EMPRESA,
      campo: `${ymd(rec.DT_INICIO_PESQUISA)}..${ymd(rec.DT_FIM_PESQUISA)}`,
      n: parseInt(rec.QT_ENTREVISTADO, 10) || '',
      classe: cls.confidence === 'high' ? 'state-pres' : 'state-pres-review',
      contratante: rec.NM_EMPRESA,
      registro_dt: ymd(rec.DT_REGISTRO),
      p360_noticia: '',
      nota: cls.confidence === 'high' ? '' : `conf=${cls.confidence};${cls.basis}`,
    }))
    .sort((a, b) => (a.uf < b.uf ? -1 : a.uf > b.uf ? 1 : a.campo < b.campo ? -1 : 1));

  // --- nacionais.csv ----------------------------------------------------------
  const natRows = national
    .map(({ rec, cls }) => ({
      protocolo: rec.NR_PROTOCOLO_REGISTRO,
      instituto: rec.NM_EMPRESA_FANTASIA || rec.NM_EMPRESA,
      campo: `${ymd(rec.DT_INICIO_PESQUISA)}..${ymd(rec.DT_FIM_PESQUISA)}`,
      n: parseInt(rec.QT_ENTREVISTADO, 10) || '',
      contratante: rec.NM_EMPRESA,
      registro_dt: ymd(rec.DT_REGISTRO),
      confianca: cls.confidence,
      base: cls.basis,
    }))
    .sort((a, b) => (a.registro_dt < b.registro_dt ? -1 : 1));
  const NAT_COLS = ['protocolo', 'instituto', 'campo', 'n', 'contratante', 'registro_dt', 'confianca', 'base'];

  // --- tabela-uf.json ---------------------------------------------------------
  const perUf = {};
  for (const c of state) {
    const uf = c.cls.uf;
    perUf[uf] = perUf[uf] || { registradas: 0, capturadas: 0, faltantes: 0, faltantes_revisar: 0 };
    perUf[uf].registradas++;
    if (c.store.captured) perUf[uf].capturadas++;
    else {
      perUf[uf].faltantes++;
      if (c.cls.confidence !== 'high') perUf[uf].faltantes_revisar++;
    }
  }
  const tabelaUf = Object.fromEntries(
    Object.entries(perUf).sort((a, b) => b[1].faltantes - a[1].faltantes)
  );

  // --- write ------------------------------------------------------------------
  fs.writeFileSync(path.join(covDir, 'faltantes.csv'), toCsv(faltRows, CSV_COLS));
  fs.writeFileSync(path.join(covDir, 'nacionais.csv'), toCsv(natRows, NAT_COLS));
  fs.writeFileSync(path.join(covDir, 'tabela-uf.json'), JSON.stringify(tabelaUf, null, 1) + '\n');

  // --- summary ----------------------------------------------------------------
  const summary = {
    total: registros.length,
    national: national.length,
    state_total: state.length,
    state_captured: stateCaptured.length,
    state_faltantes: faltantes.length,
    uncertain: uncertain.length,
  };
  process.stdout.write(JSON.stringify(summary, null, 2) + '\n');

  if (args.report) {
    return { classified, national, state, stateCaptured, faltantes, uncertain, summary, storeIdx };
  }
}

// Export internals for the test harness; run main when invoked directly.
export { classify, matchUFs, isNational, protoToStoreFmt, buildStoreIndex, findInStore, instituteKey };
if (import.meta.url === `file://${process.argv[1]}`) main();
