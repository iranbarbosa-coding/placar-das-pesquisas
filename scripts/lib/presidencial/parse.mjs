// O CORAÇÃO PURO DO PARSER PRESIDENCIAL — texto de página → figuras, ou RECUSA.
//
// Recebe as linhas que uma perna de extração (camada de texto embutida OU OCR
// Vision) produziu, acha o bloco presidencial ESTIMULADO de 1º turno e devolve
// as figuras — candidato/partido/percentual, DOIS baldes separados (branco/nulo
// × não sabe) — MAIS o MODO DE PAREAMENTO, que diz se o pareamento rótulo×valor
// é estruturalmente inequívoco. Determinístico (§8); falha sempre como RECUSA
// TIPADA (§4), nunca palpite.
//
// ★ O MODO DE PAREAMENTO (achado da leitura cega do AM-08042) — a classe de
// defeito que reprovou o AM foi AMBIGUIDADE DE ORDEM entre CORRIDAS SEPARADAS: o
// PDF entrega todos os rótulos, depois todos os valores, e a ordem dos valores
// pode não seguir a dos rótulos (some 100 e engana todo guarda de soma). Onde o
// valor está ESTRUTURALMENTE COLADO ao rótulo essa ambiguidade não existe:
//   adjacente-inline       — cada linha é "rótulo ... valor" (o valor na linha do rótulo)
//   adjacente-interleaved  — alternância estrita rótulo / valor / rótulo / valor
//   corridas-separadas     — corrida de rótulos, depois corrida de valores  ← AMBÍGUO
// O parser CLASSIFICA e o orquestrador DECIDE: adjacente emite do texto; corrida
// separada exige a perna visual (OCR) corroborar. CONSERVADOR: qualquer dúvida
// cai em corrida-separada (gated), nunca o contrário.
//
// Este módulo lê UMA perna. A reconciliação entre pernas e a 2ª leitura cega (§1)
// moram fora daqui.

// ---------------------------------------------------------------------------
// Reconhecedores. Deliberadamente conservadores; a rede de segurança é dupla:
// a contagem (rótulos≠valores recusa) e o modo (dúvida ⇒ corrida-separada).
// ---------------------------------------------------------------------------
const CANDIDATO_COM_PARTIDO = /^(.+?)\s*[\(\-–]\s*([A-Za-zÀ-ú][A-Za-zÀ-ú0-9.\/ ]{0,18}?)\)?\s*$/;
const LINHA_SO_VALORES = /^(?:\s*(?:\*|\d{1,3}(?:[.,]\d)?)\s*%?\s*)+$/;
const TOKEN_VALOR = /(\*|\d{1,3}(?:[.,]\d)?)/g;

const BALDE_BRANCO_NULO = /(branco|nulo|nenhum)/i;
const BALDE_NAO_SABE = /(n[aã]o\s*sabe|n[aã]o\s*respond|ns\/?nr|indecis)/i;
const LINHA_OUTROS = /^outros?\s*:?\s*$/i;

const ANCORA_PRESIDENTE = /presidente/i;
// Marcadores de ESTIMULADA por ENUNCIADO — nem todo instituto usa a palavra
// "estimulada"; distinguem mostrando a lista de nomes. Medidos em relatório real.
const MARCADORES_ESTIMULADA = [
  /estimulad/i,
  /candidatos?\s+(fossem|sejam|s[ãa]o|forem)\s+es[st]es/i,   // "candidatos fossem estes/esses"
  /es[st]es\s+fossem\s+os\s+candidatos/i,                     // "estes fossem os candidatos" (Veritá)
  /(destes|desses)\s+(candidatos|nomes)/i,
  /em\s+qual\s+dest/i,
  /mostr\w*\s+(o\s+)?cart[ãa]o/i,
  /disco\s+com\s+(os\s+)?nomes/i,
];
// Espontânea NÃO se guarda (decisão do criador). Exclusão DURA: qualquer sinal de
// espontaneidade no contexto do cabeçalho descarta — errar para "não detecto" é
// uma pendência; detectar espontânea como estimulada seria dado errado.
const MARCA_ESPONTANEA = /espont|sem\s+(apresentar|citar|mostrar)|n[ãa]o\s+cit/i;
const MARCA_SEGUNDO_TURNO = /2[ºo°]?\s*turno|segundo\s*turno/i;
const MARCA_SEGMENTO = /\b(manaus|interior|capital)\b/i;

const RUIDO = /(tse|registr|pesquisa|fonte|p[áa]gina|inten[çc][ãa]o|estimulad|espont|contratante|executora|margem|amostra|per[íi]odo|n[úu]mero|estat[íi]stico|respons|tribunal|intervalo|confian|coleta|disco|nomes|candidatos|resultado|geral|cen[áa]rio|total|manaus|interior|capital|prefeito|governador|senador|\bvoto|elei[çc]|conre|reg\.|frequ[êe]ncia|porcent|percent|v[áa]lid|acumulat|ausente|base:)/i;

const ehLinhaSoValores = (l) => { const t = l.trim(); return t.length > 0 && LINHA_SO_VALORES.test(t); };
const ehBalde = (l) => (BALDE_BRANCO_NULO.test(l) || BALDE_NAO_SABE.test(l)) && !ehLinhaSoValores(l);

function nomeProvavel(s) {
  const t = s.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (!/^[A-ZÀ-Ú]/.test(t)) return false;
  if (!/^[A-Za-zÀ-úçÇ .'\-]+$/.test(t)) return false;
  if (/\d/.test(t)) return false;
  if (RUIDO.test(t)) return false;
  if (t.split(/\s+/).length > 5) return false;
  if (/^(?:\S\s){2,}\S$/.test(t) && t.replace(/\s/g, "").length <= 8) return false;
  return true;
}

/** Classifica um rótulo (sem valor) → {tipo, candidate?, party?}. Baldes ANTES. */
function classificarRotulo(l) {
  const t = l.trim();
  if (ehBalde(t)) return { tipo: BALDE_BRANCO_NULO.test(t) ? "branco_nulo" : "nao_sabe" };
  if (LINHA_OUTROS.test(t)) return { tipo: "outros" };
  const mp = t.match(CANDIDATO_COM_PARTIDO);
  if (mp && !RUIDO.test(mp[1]) && nomeProvavel(mp[1])) return { tipo: "candidato", candidate: mp[1].trim(), party: (mp[2] || "").trim() || null };
  if (nomeProvavel(t)) return { tipo: "candidato", candidate: t, party: null };
  return null;
}
const ehRotulo = (l) => classificarRotulo(l) != null;

function valoresDaLinha(l) {
  const m = l.trim().match(TOKEN_VALOR) ?? [];
  return m.map((v) => (v === "*" ? null : Number(v.replace(",", "."))));
}

/**
 * Uma linha INLINE "rótulo ... valor(es)" → {rotulo, valores}, ou null. O rótulo
 * tem de terminar em caractere que NÃO é de valor (evita partir "2026" e afins),
 * e os valores são a corrida final de tokens numéricos.
 */
function separarRotuloValores(linha) {
  const t = linha.trim();
  const m = t.match(/^(.*?[^\d.,%\s])\s+((?:\*|\d{1,3}(?:[.,]\d)?\s*%?\s*)+)$/);
  if (!m) return null;
  const vs = valoresDaLinha(m[2]);
  if (!vs.length) return null;
  return { rotulo: m[1].trim(), valores: vs };
}

export function paginar(texto) {
  const paginas = [];
  let atual = null;
  for (const bruta of texto.split("\n")) {
    const m = bruta.match(/^===\s*página\s+(\d+)\s*===$/);
    if (m) { atual = { page: Number(m[1]), lines: [] }; paginas.push(atual); continue; }
    if (atual) atual.lines.push(bruta);
  }
  return paginas;
}

/**
 * Acha o cabeçalho do bloco presidencial ESTIMULADO de 1º turno POR ENUNCIADO,
 * com exclusão DURA de espontânea e 2º turno. Contexto = 4 linhas (o enunciado
 * às vezes cai uma ou duas linhas abaixo do "presidente").
 */
function acharCabecalho(paginas) {
  let viuSegundoTurno = false, viuEspontanea = false;
  for (const pg of paginas) {
    for (let i = 0; i < pg.lines.length; i++) {
      if (!ANCORA_PRESIDENTE.test(pg.lines[i])) continue;
      const ctx = [pg.lines[i], pg.lines[i + 1] ?? "", pg.lines[i + 2] ?? "", pg.lines[i + 3] ?? ""].join("  ");
      if (MARCA_ESPONTANEA.test(ctx)) { viuEspontanea = true; continue; }
      if (MARCA_SEGUNDO_TURNO.test(ctx)) { viuSegundoTurno = true; continue; }
      if (!MARCADORES_ESTIMULADA.some((m) => m.test(ctx))) continue;
      return { pg, i, viuSegundoTurno, viuEspontanea };
    }
  }
  return { pg: null, i: -1, viuSegundoTurno, viuEspontanea };
}

/** É início plausível de tabela: rótulo inline (com valor) ou rótulo puro. */
function inicioDeTabela(linha) {
  const inline = separarRotuloValores(linha);
  if (inline && classificarRotulo(inline.rotulo)) return true;
  return ehRotulo(linha) && !ehLinhaSoValores(linha);
}

/**
 * Colhe a tabela e CLASSIFICA O MODO. Devolve {pares, modo} ou {desalinhado}/null.
 *   modo ∈ "adjacente-inline" | "adjacente-interleaved" | "corridas-separadas"
 *   (e "inline-multi" quando cada linha tem VÁRIOS valores — coluna ambígua, §1)
 */
function colherTabela(pg, iCabecalho) {
  const linhas = pg.lines;
  let i = iCabecalho + 1, saltos = 0;
  // Pula prosa E números soltos (número de página, ano) entre o cabeçalho e a
  // tabela — abortar em qualquer valor solto matava blocos legítimos (o "8" da
  // p.8 do Paraná ficava entre o cabeçalho e a tabela interleaved). Se não houver
  // rótulo depois, as corridas saem vazias e o colher devolve null mesmo assim.
  while (i < linhas.length && saltos < 25 && !inicioDeTabela(linhas[i])) { i++; saltos++; }
  if (i >= linhas.length) return null;

  const primeira = separarRotuloValores(linhas[i]);
  // ---- MODO INLINE: a primeira linha da tabela já tem valor colado ----------
  if (primeira && classificarRotulo(primeira.rotulo)) {
    const pares = [];
    let multi = false;
    while (i < linhas.length) {
      const sv = separarRotuloValores(linhas[i]);
      if (!sv || !classificarRotulo(sv.rotulo)) break;
      if (sv.valores.length > 1) multi = true;
      pares.push({ rotulo: sv.rotulo, valores: sv.valores });
      i++;
    }
    if (pares.length < 2) return null;
    return { pares, modo: multi ? "inline-multi" : "adjacente-inline" };
  }

  // ---- primeira linha é rótulo PURO: interleaved ou corridas-separadas ------
  const proxima = linhas[i + 1] ?? "";
  const proxValores = ehLinhaSoValores(proxima) ? valoresDaLinha(proxima) : null;
  if (proxValores && proxValores.length === 1) {
    // ALTERNÂNCIA ESTRITA rótulo/valor/rótulo/valor.
    const pares = [];
    while (i + 1 < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i])) {
      const vs = ehLinhaSoValores(linhas[i + 1]) ? valoresDaLinha(linhas[i + 1]) : null;
      if (!vs || vs.length !== 1) break;
      pares.push({ rotulo: linhas[i].trim(), valores: vs });
      i += 2;
    }
    if (pares.length < 2) return null;
    return { pares, modo: "adjacente-interleaved" };
  }

  // ---- CORRIDAS SEPARADAS (ambíguo por ordem) ------------------------------
  const rotulos = [];
  while (i < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i])) { rotulos.push(linhas[i].trim()); i++; }
  const valores = [];
  while (i < linhas.length && ehLinhaSoValores(linhas[i])) { valores.push(...valoresDaLinha(linhas[i])); i++; }
  if (!rotulos.length || !valores.length) return null;
  if (rotulos.length !== valores.length) return { desalinhado: { nr: rotulos.length, nv: valores.length } };
  const pares = rotulos.map((r, k) => ({ rotulo: r, valores: [valores[k]] }));
  // pares rótulo→valor à frente (baldes soltos no fim)
  while (i + 1 < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i]) && ehLinhaSoValores(linhas[i + 1])) {
    const vs = valoresDaLinha(linhas[i + 1]);
    if (vs.length !== 1) break;
    pares.push({ rotulo: linhas[i].trim(), valores: vs });
    i += 2;
  }
  return { pares, modo: "corridas-separadas" };
}

/**
 * Acha, alinha, classifica. Devolve {ok:true, figuras} (com figuras.pareamento)
 * ou {ok:false, reason:"sem-bloco"|"ilegível", detail}.
 */
export function extrairBlocoPresidencial(paginas) {
  const { pg, i, viuSegundoTurno, viuEspontanea } = acharCabecalho(paginas);
  if (!pg) {
    const nota = viuSegundoTurno ? "; um 2º turno foi visto (fora do v1)"
      : viuEspontanea ? "; só bloco ESPONTÂNEO (não se guarda)" : "";
    return { ok: false, reason: "sem-bloco", detail: `nenhum cabeçalho de presidente estimulada de 1º turno${nota}` };
  }
  const regiao = pg.lines.slice(i, i + 45).join("  ");
  if (MARCA_SEGMENTO.test(regiao) && /\btotal\b/i.test(regiao)) {
    return { ok: false, reason: "ilegível", detail: `p.${pg.page}: bloco SEGMENTADO (Manaus/Interior/Total) — coluna total não isolável; leitura visual/§1` };
  }
  const t = colherTabela(pg, i);
  if (!t) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: cabeçalho presidencial sem tabela legível abaixo (bloco em imagem ou layout não coberto)` };
  if (t.desalinhado) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: ${t.desalinhado.nr} rótulos × ${t.desalinhado.nv} valores não alinham — recusado (§4)` };
  if (t.modo === "inline-multi") return { ok: false, reason: "ilegível", detail: `p.${pg.page}: tabela inline multi-coluna (ex. SPSS freq) — coluna de % ambígua, leitura §1` };

  const results = [];
  const absent = [];
  let blank_null_pct = null, undecided_pct = null, others_pct = null;
  for (const { rotulo, valores } of t.pares) {
    const c = classificarRotulo(rotulo);
    if (!c) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: rótulo não classificável "${rotulo}"` };
    const v = valores[0]; // modos não-multi têm 1 valor por par
    if (c.tipo === "branco_nulo") { blank_null_pct = v; continue; }
    if (c.tipo === "nao_sabe") { undecided_pct = v; continue; }
    if (c.tipo === "outros") { others_pct = v; continue; }
    if (v === null) { absent.push({ candidate: c.candidate, party: c.party }); continue; }
    results.push({ candidate: c.candidate, party: c.party, pct: v });
  }
  if (results.length < 2) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: menos de 2 candidatos com valor` };
  // ≥3 candidatos = 1º turno estimulada com o campo cheio; exatamente 2 é suspeito
  // de ser confronto de 2º turno mal-rotulado → recusa em vez de arriscar.
  if (results.length === 2) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: só 2 candidatos — possível confronto de 2º turno, não 1º estimulada; leitura §1` };

  const soma = (a, b) => a + b;
  const expect_sum = Number(
    (results.map((r) => r.pct).reduce(soma, 0) + (blank_null_pct ?? 0) + (undecided_pct ?? 0) + (others_pct ?? 0)).toFixed(1),
  );
  return { ok: true, figuras: { page: pg.page, pareamento: t.modo, results, blank_null_pct, undecided_pct, others_pct, absent, expect_sum } };
}

// ---------------------------------------------------------------------------
// §10 — tolerância derivada. 0,5/inteiro, 0,05/décimo. (conferirSoma crava 0,6.)
// ---------------------------------------------------------------------------
export function toleranciaDerivada(figuras) {
  const cells = [...figuras.results.map((r) => r.pct), figuras.blank_null_pct, figuras.undecided_pct, figuras.others_pct].filter((v) => v != null);
  let tol = 0;
  for (const v of cells) tol += Number.isInteger(v) ? 0.5 : 0.05;
  return Number(tol.toFixed(2));
}

/** As duas pernas leram a MESMA tabela? Sinal de confiança, não a §1. */
export function pernasConcordam(figA, figB) {
  if (!figA || !figB) return false;
  const chave = (f) => f.results.map((r) => `${r.candidate}|${r.party}`).join("§");
  if (chave(figA) !== chave(figB)) return false;
  const tol = Math.max(toleranciaDerivada(figA), toleranciaDerivada(figB));
  for (let k = 0; k < figA.results.length; k++) {
    if (Math.abs(figA.results[k].pct - figB.results[k].pct) > tol) return false;
  }
  const bal = (a, b) => (a == null && b == null) || (a != null && b != null && Math.abs(a - b) <= 0.6);
  return bal(figA.blank_null_pct, figB.blank_null_pct) && bal(figA.undecided_pct, figB.undecided_pct) && bal(figA.others_pct, figB.others_pct);
}

// Pareamento estruturalmente inequívoco? (o orquestrador usa para decidir emissão)
export function pareamentoConfiavel(modo) {
  return modo === "adjacente-inline" || modo === "adjacente-interleaved";
}
