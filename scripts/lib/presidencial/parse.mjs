// O CORAÇÃO PURO DO PARSER PRESIDENCIAL — texto de página → figuras, ou RECUSA.
//
// Recebe as linhas que uma perna de extração (camada de texto embutida OU OCR
// Vision) produziu para um relatório, acha o bloco presidencial ESTIMULADO de 1º
// turno e devolve as figuras estruturadas — candidato/partido/percentual e os
// DOIS baldes separados (branco/nulo × não sabe). Nada de rede, nada de relógio,
// nada de aleatório: a MESMA entrada dá a MESMA saída (§8). E o modo de falha é
// sempre uma RECUSA TIPADA (`sem-bloco` / `ilegível`), nunca um palpite (§4):
// tabela que não alinha não vira número inventado, vira pendência.
//
// FORMATOS COBERTOS (medidos em relatórios reais de governador estadual):
//   - Datafolha: "Nome (PARTIDO)" em coluna, valores um por linha, baldes na
//     própria corrida de rótulos.
//   - Direto ao Ponto: "Nome" SEM partido, valores VÁRIOS por linha ("44% 35%
//     3%"), baldes como pares rótulo→valor DEPOIS da corrida de candidatos.
// A trava comum: o N-ésimo rótulo casa com o N-ésimo valor, e contagens que não
// batem RECUSAM. Um formato novo que a heurística leia torto quase sempre
// desalinha a contagem — e então cai na fila, não no banco.
//
// O QUE SE RECUSA DE PROPÓSITO: crosstab SEGMENTADO (ex.: Manaus/Interior/Total)
// tem k valores por candidato e a coluna "Total" não se isola mecanicamente —
// vira recusa tipada para leitura visual/§1, nunca um chute de qual barra é o total.
//
// Este módulo lê UMA perna. A reconciliação entre as duas pernas e a segunda
// leitura cega (§1) moram fora daqui — no orquestrador e no hub, respectivamente.
import { folgaDerivada } from "../soma.mjs";

// ---------------------------------------------------------------------------
// Reconhecedores. Deliberadamente conservadores; a rede de segurança é a
// contagem: rótulo que a heurística pegue errado desalinha e RECUSA (§4).
// ---------------------------------------------------------------------------

// "Lula (PT)", "Augusto Cury (AVANTE)". Partido = último grupo entre parênteses.
const CANDIDATO_COM_PARTIDO = /^(.+?)\s*\(([A-Za-zÀ-ú][A-Za-zÀ-ú0-9.\/ ]{0,14}?)\)\s*$/;

// Uma LINHA só de valores: um ou mais tokens de célula, cada um inteiro/décimo/
// asterisco, com "%" opcional. "44% 35% 3% 1% 1%" e "57" e "*" batem; um nome não.
const LINHA_SO_VALORES = /^(?:\s*(?:\*|\d{1,3}(?:[.,]\d)?)\s*%?\s*)+$/;
const TOKEN_VALOR = /(\*|\d{1,3}(?:[.,]\d)?)/g;

// Os DOIS baldes, separados de propósito: o agregador funde, o relatório separa.
const BALDE_BRANCO_NULO = /(branco|nulo|nenhum)/i;
const BALDE_NAO_SABE = /(n[aã]o\s*sabe|n[aã]o\s*respond|ns\/?nr|indecis)/i;
const LINHA_OUTROS = /^outros?\s*:?\s*$/i;

// Âncora do bloco: cabeçalho que fala de PRESIDENTE e de estimulada. Exige
// `presidente` para não pegar o bloco de governador do MESMO relatório.
const ANCORA_PRESIDENTE = /presidente/i;
const ANCORA_ESTIMULADA = /estimulad/i;
const MARCA_ESPONTANEA = /espont[âa]nea/i;
const MARCA_SEGUNDO_TURNO = /2[ºo°]?\s*turno|segundo\s*turno/i;
// Marcas de crosstab segmentado por recorte geográfico/demográfico: mais de uma
// coluna de resultado, e a coluna "total" não é isolável sem ler a geometria.
const MARCA_SEGMENTO = /\b(manaus|interior|capital)\b/i;

// Palavras que um rótulo de candidato JAMAIS contém — barram prosa, ficha
// técnica, rodapé e legenda de sendo lidos como nome (a corrida sem partido é
// permissiva, então a lista de bloqueio faz o trabalho que o "(PARTIDO)" fazia).
// SUBSTRING, não \b…\b: as palavras são PREFIXOS ("estimulad" tem de pegar
// "ESTIMULADA", "registr" tem de pegar "registrada") — e \b no fim falha
// justamente aí, deixando o cabeçalho vazar como se fosse nome de candidato.
const RUIDO = /(tse|registr|pesquisa|fonte|p[áa]gina|inten[çc][ãa]o|estimulad|espont|contratante|executora|margem|amostra|per[íi]odo|n[úu]mero|estat[íi]stico|respons|tribunal|intervalo|confian|coleta|disco|nomes|candidatos|total|manaus|interior|capital|prefeito|governador|senador|\bvoto|elei[çc]|conre|reg\.)/i;

// Uma linha só de valores — inclui a linha que é apenas "*" (asterisco = célula
// de ausência, §4). O `.length` já garante ≥1 token; exigir dígito perderia o "*".
const ehLinhaSoValores = (l) => { const t = l.trim(); return t.length > 0 && LINHA_SO_VALORES.test(t); };
const ehBalde = (l) => (BALDE_BRANCO_NULO.test(l) || BALDE_NAO_SABE.test(l)) && !ehLinhaSoValores(l);

/** Um nome de candidato provável (sem partido). A rede de contagem cobre o resto. */
function nomeProvavel(s) {
  const t = s.trim();
  if (t.length < 2 || t.length > 40) return false;
  if (!/^[A-ZÀ-Ú]/.test(t)) return false;
  // Só letras (com acento), espaços, ponto, hífen e apóstrofo.
  if (!/^[A-Za-zÀ-úçÇ .'\-]+$/.test(t)) return false;
  if (/\d/.test(t)) return false;
  if (RUIDO.test(t)) return false;
  if (t.split(/\s+/).length > 5) return false;
  // "J U N H O" — letras isoladas separadas por espaço não são nome.
  if (/^(?:\S\s){2,}\S$/.test(t) && t.replace(/\s/g, "").length <= 8) return false;
  return true;
}

/** Classifica um rótulo → {tipo, candidate?, party?}. Baldes ANTES de candidato. */
function classificarRotulo(l) {
  const t = l.trim();
  if (ehBalde(t)) return { tipo: BALDE_BRANCO_NULO.test(t) ? "branco_nulo" : "nao_sabe" };
  if (LINHA_OUTROS.test(t)) return { tipo: "outros" };
  const mp = t.match(CANDIDATO_COM_PARTIDO);
  if (mp && !RUIDO.test(mp[1])) return { tipo: "candidato", candidate: mp[1].trim(), party: mp[2].trim() };
  if (nomeProvavel(t)) return { tipo: "candidato", candidate: t, party: null };
  return null;
}
const ehRotulo = (l) => classificarRotulo(l) != null;

/** Todos os valores de uma linha, em ordem. "*" → null. */
function valoresDaLinha(l) {
  const m = l.trim().match(TOKEN_VALOR) ?? [];
  return m.map((v) => (v === "*" ? null : Number(v.replace(",", "."))));
}

/** Quebra a saída do binário `ocr` (`=== página N ===`) em páginas. */
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

/** Acha o cabeçalho do bloco presidencial ESTIMULADO de 1º turno. */
function acharCabecalho(paginas) {
  let viuSegundoTurno = false, viuEspontanea = false;
  for (const pg of paginas) {
    for (let i = 0; i < pg.lines.length; i++) {
      if (!ANCORA_PRESIDENTE.test(pg.lines[i])) continue;
      const contexto = [pg.lines[i], pg.lines[i + 1] ?? "", pg.lines[i + 2] ?? ""].join("  ");
      if (!ANCORA_ESTIMULADA.test(contexto)) { if (MARCA_ESPONTANEA.test(contexto)) viuEspontanea = true; continue; }
      if (MARCA_SEGUNDO_TURNO.test(contexto)) { viuSegundoTurno = true; continue; }
      return { pg, i, viuSegundoTurno, viuEspontanea };
    }
  }
  return { pg: null, i: -1, viuSegundoTurno, viuEspontanea };
}

/**
 * Do cabeçalho para a frente: corrida de rótulos, corrida de valores (posicional),
 * e pares rótulo→valor à frente (baldes de layout interleaved). Devolve uma lista
 * ordenada de {rotulo, valor}, ou null se nada casar.
 */
function colherTabela(pg, iCabecalho) {
  const linhas = pg.lines;
  let i = iCabecalho + 1;
  // Pula prosa até o primeiro rótulo de candidato, com teto (não corre o doc).
  let saltos = 0;
  while (i < linhas.length && saltos < 25) {
    const c = classificarRotulo(linhas[i]);
    if (c && c.tipo === "candidato") break;
    if (ehLinhaSoValores(linhas[i]) && linhas[i].trim()) return null; // valor antes de rótulo: não abre tabela
    i++; saltos++;
  }
  if (i >= linhas.length) return null;

  // Corrida de rótulos (candidatos e, no estilo Datafolha, baldes juntos).
  const rotulos = [];
  while (i < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i])) {
    rotulos.push(linhas[i].trim()); i++;
  }
  // Corrida de valores (posicional).
  const valores = [];
  while (i < linhas.length && ehLinhaSoValores(linhas[i])) {
    valores.push(...valoresDaLinha(linhas[i])); i++;
  }
  if (!rotulos.length || !valores.length) return null;
  if (rotulos.length !== valores.length) {
    // Pode ser layout interleaved puro (rótulo,valor,rótulo,valor…): tenta.
    const inter = colherInterleaved(pg, iCabecalho);
    if (inter) return inter;
    return { desalinhado: { nr: rotulos.length, nv: valores.length } };
  }
  const pares = rotulos.map((r, k) => ({ rotulo: r, valor: valores[k] }));
  // Pares rótulo→valor à frente (baldes/outros no estilo Direto ao Ponto).
  while (i + 1 < linhas.length) {
    if (!ehRotulo(linhas[i]) || ehLinhaSoValores(linhas[i])) break;
    if (!ehLinhaSoValores(linhas[i + 1])) break;
    const vs = valoresDaLinha(linhas[i + 1]);
    if (vs.length !== 1) break;
    pares.push({ rotulo: linhas[i].trim(), valor: vs[0] });
    i += 2;
  }
  return { pares };
}

/** Layout estritamente interleaved: rótulo, valor, rótulo, valor… */
function colherInterleaved(pg, iCabecalho) {
  const linhas = pg.lines;
  let i = iCabecalho + 1, saltos = 0;
  while (i < linhas.length && saltos < 25) {
    const c = classificarRotulo(linhas[i]);
    if (c && c.tipo === "candidato" && ehLinhaSoValores(linhas[i + 1] ?? "")) break;
    i++; saltos++;
  }
  const pares = [];
  while (i + 1 < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i])) {
    const vs = valoresDaLinha(linhas[i + 1]);
    if (!ehLinhaSoValores(linhas[i + 1]) || vs.length !== 1) break;
    pares.push({ rotulo: linhas[i].trim(), valor: vs[0] });
    i += 2;
  }
  return pares.length >= 2 ? { pares } : null;
}

/**
 * Acha, alinha e classifica. Devolve
 *   { ok:true, figuras:{ page, results, blank_null_pct, undecided_pct,
 *                        others_pct, absent, expect_sum } }
 * ou { ok:false, reason:"sem-bloco"|"ilegível", detail }.
 */
export function extrairBlocoPresidencial(paginas) {
  const { pg, i, viuSegundoTurno, viuEspontanea } = acharCabecalho(paginas);
  if (!pg) {
    const nota = viuSegundoTurno ? "; um bloco de 2º turno foi visto (tarefa própria, fora do v1)"
      : viuEspontanea ? "; só bloco ESPONTÂNEO presente (não se guarda, decisão do criador)" : "";
    return { ok: false, reason: "sem-bloco", detail: `nenhum cabeçalho de presidente + estimulada de 1º turno${nota}` };
  }

  // Guarda de segmentação: crosstab por recorte não tem coluna total isolável.
  const regiao = pg.lines.slice(i, i + 45).join("  ");
  if (MARCA_SEGMENTO.test(regiao) && /\btotal\b/i.test(regiao)) {
    return { ok: false, reason: "ilegível", detail: `p.${pg.page}: bloco presidencial SEGMENTADO (recorte Manaus/Interior/Total) — a coluna total não se isola mecanicamente; leitura visual/§1` };
  }

  const t = colherTabela(pg, i);
  if (!t) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: cabeçalho presidencial sem corrida rótulo/valor legível abaixo (bloco em imagem ou layout não coberto)` };
  if (t.desalinhado) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: ${t.desalinhado.nr} rótulos × ${t.desalinhado.nv} valores não alinham — pareamento ambíguo, recusado (§4)` };

  const results = [];
  const absent = [];
  let blank_null_pct = null, undecided_pct = null, others_pct = null;

  for (const { rotulo, valor } of t.pares) {
    const c = classificarRotulo(rotulo);
    if (!c) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: rótulo não classificável "${rotulo}" dentro do bloco` };
    if (c.tipo === "branco_nulo") { blank_null_pct = valor; continue; }
    if (c.tipo === "nao_sabe") { undecided_pct = valor; continue; }
    if (c.tipo === "outros") { others_pct = valor; continue; }
    if (valor === null) { absent.push({ candidate: c.candidate, party: c.party }); continue; } // asterisco: ausência ≠ zero
    results.push({ candidate: c.candidate, party: c.party, pct: valor });
  }

  if (results.length < 2) return { ok: false, reason: "ilegível", detail: `p.${pg.page}: menos de 2 candidatos com valor — não é uma tabela de intenção` };

  const soma = (a, b) => a + b;
  const expect_sum = Number(
    (results.map((r) => r.pct).reduce(soma, 0) + (blank_null_pct ?? 0) + (undecided_pct ?? 0) + (others_pct ?? 0)).toFixed(1),
  );

  return { ok: true, figuras: { page: pg.page, results, blank_null_pct, undecided_pct, others_pct, absent, expect_sum } };
}

// ---------------------------------------------------------------------------
// §10 — TOLERÂNCIA DERIVADA, nunca escolhida. A redução (0,5 por inteiro, 0,05
// por décimo) mora em `../soma.mjs`: era uma de quatro cópias da regra, e o
// `conferirSoma` do repairs.mjs — que cravava 0,6 fixo — passou a derivar da
// mesma função. O import não fura a pureza deste módulo: `soma.mjs` também é
// livre de rede, relógio e fs.
// ---------------------------------------------------------------------------
export function toleranciaDerivada(figuras) {
  return folgaDerivada([
    ...figuras.results.map((r) => r.pct),
    figuras.blank_null_pct, figuras.undecided_pct, figuras.others_pct,
  ]);
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
  return bal(figA.blank_null_pct, figB.blank_null_pct)
    && bal(figA.undecided_pct, figB.undecided_pct)
    && bal(figA.others_pct, figB.others_pct);
}
