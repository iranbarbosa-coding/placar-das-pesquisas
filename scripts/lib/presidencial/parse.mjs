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
// Este módulo lê UMA perna. A reconciliação entre as duas pernas e a segunda
// leitura cega (§1) moram fora daqui — no orquestrador e no hub, respectivamente.

// ---------------------------------------------------------------------------
// Reconhecedores de linha. Deliberadamente estreitos: errar para "não reconheço"
// manda o relatório para a fila (revisável), enquanto um reconhecedor frouxo
// inventaria uma linha de tabela onde não há.
// ---------------------------------------------------------------------------

// "Lula (PT)", "Augusto Cury (AVANTE)", "Cabo Daciolo (MOBILIZA)". O partido é o
// último grupo entre parênteses; o nome é o que vem antes, aparado. Siglas vêm
// COMO IMPRESSAS (caixa alta inclusive) — a unificação de grafia é do pipeline
// (parties.mjs), não daqui.
const LINHA_CANDIDATO = /^(.+?)\s*\(([A-Za-zÀ-ú][A-Za-zÀ-ú0-9.\/ ]*?)\)\s*$/;

// Um valor de célula: inteiro, ou décimo com vírgula/ponto, ou o ASTERISCO — que
// NÃO é zero, é a ausência de medição (§4). Guardado como marca, não como número.
const LINHA_VALOR = /^(\*|\d{1,3}(?:[.,]\d)?)\s*$/;

// Os DOIS baldes, separados de propósito: o agregador funde, o relatório separa,
// e fundir aqui refaria o defeito que o parser existe para desfazer.
const BALDE_BRANCO_NULO = /(branco|nulo|nenhum)/i;
const BALDE_NAO_SABE = /(n[aã]o\s*sabe|n[aã]o\s*respond|ns\/?nr|indecis)/i;
// "Outros" DENTRO da estimulada. A armadilha vizinha — "Outras respostas" da
// pergunta ESPONTÂNEA — mora noutra pergunta e não pode vazar para cá; por isso
// só se lê "outros" que caia dentro do bloco já delimitado, nunca por varredura
// do documento inteiro.
const LINHA_OUTROS = /^outros?\s*$/i;

// A âncora do bloco: cabeçalho que fala de PRESIDENTE e de estimulada. Exige
// `presidente` para não pegar o bloco de governador do MESMO relatório, que tem
// geometria idêntica.
const ANCORA_PRESIDENTE = /presidente/i;
const ANCORA_ESTIMULADA = /estimulad/i;
// Marca de 2º turno (confronto par a par). Detectada só para NÃO confundir com o
// 1º turno e para deixar rastro na recusa; o 2º turno é tarefa própria (escopo).
const MARCA_SEGUNDO_TURNO = /2[ºo°]?\s*turno|segundo\s*turno/i;

const ehValor = (l) => LINHA_VALOR.test(l.trim());
const ehCandidato = (l) => LINHA_CANDIDATO.test(l.trim());
const ehBalde = (l) => BALDE_BRANCO_NULO.test(l) || BALDE_NAO_SABE.test(l);
const ehRotulo = (l) => ehCandidato(l) || ehBalde(l) || LINHA_OUTROS.test(l.trim());

/** Quebra a saída do binário `ocr` (`=== página N ===`) em páginas. */
export function paginar(texto) {
  const paginas = [];
  let atual = null;
  for (const bruta of texto.split("\n")) {
    const m = bruta.match(/^===\s*página\s+(\d+)\s*===$/);
    if (m) {
      atual = { page: Number(m[1]), lines: [] };
      paginas.push(atual);
      continue;
    }
    if (atual) atual.lines.push(bruta);
  }
  return paginas;
}

/**
 * Acha o cabeçalho do bloco presidencial ESTIMULADO (1º turno) e devolve o
 * índice {page, linha} do cabeçalho, ou null. Um cabeçalho que também marca 2º
 * turno é registrado à parte para a recusa saber diferenciar.
 */
function acharCabecalho(paginas) {
  let viuSegundoTurno = false;
  for (const pg of paginas) {
    for (let i = 0; i < pg.lines.length; i++) {
      const l = pg.lines[i];
      if (!ANCORA_PRESIDENTE.test(l)) continue;
      const contexto = [l, pg.lines[i + 1] ?? "", pg.lines[i + 2] ?? ""].join(" ");
      if (!ANCORA_ESTIMULADA.test(contexto)) continue;
      if (MARCA_SEGUNDO_TURNO.test(contexto)) { viuSegundoTurno = true; continue; }
      return { pg, i, viuSegundoTurno };
    }
  }
  return { pg: null, i: -1, viuSegundoTurno };
}

/**
 * Do cabeçalho para a frente, colhe a CORRIDA de rótulos e depois a CORRIDA de
 * valores. As duas correm contíguas na camada de texto porque o PDF desenha o
 * gráfico como duas colunas visuais; a extração as lê coluna a coluna. O
 * alinhamento é POSICIONAL — o N-ésimo rótulo casa com o N-ésimo valor — e é por
 * isso que contagens diferentes RECUSAM em vez de adivinhar o pareamento.
 */
function colherTabela(pg, iCabecalho) {
  const linhas = pg.lines;
  let i = iCabecalho + 1;
  // Pula a prosa entre cabeçalho e primeira linha de candidato (subtítulo,
  // enunciado da pergunta).
  while (i < linhas.length && !ehCandidato(linhas[i])) {
    // Se esbarrar num valor antes de qualquer rótulo, o cabeçalho não abre uma
    // tabela: aborta e deixa o chamador tratar como ausência de bloco legível.
    if (ehValor(linhas[i]) && !ehRotulo(linhas[i])) return null;
    i++;
  }
  const rotulos = [];
  while (i < linhas.length && ehRotulo(linhas[i]) && !ehValor(linhas[i])) {
    rotulos.push(linhas[i].trim());
    i++;
  }
  const valores = [];
  while (i < linhas.length && ehValor(linhas[i])) {
    valores.push(linhas[i].trim());
    i++;
  }
  if (rotulos.length === 0 || valores.length === 0) return null;
  return { rotulos, valores };
}

/** Um valor de célula → número, ou `null` para o asterisco (ausência, §4). */
function valorNumerico(v) {
  if (v === "*") return null;
  return Number(v.replace(",", "."));
}

/**
 * A saída pública: acha, alinha e classifica. Devolve
 *   { ok: true, figuras: { results, blank_null_pct, undecided_pct, others_pct,
 *                          absent, expect_sum } }
 * ou
 *   { ok: false, reason: "sem-bloco" | "ilegível", detail }
 *
 * `results` já EXCLUI os candidatos com asterisco (ausência ≠ zero); eles saem
 * em `absent` para o rastro. `expect_sum` é a soma do que foi transcrito nesta
 * perna — o total contra o qual `conferirSoma` do repairs.mjs confere a emissão.
 */
export function extrairBlocoPresidencial(paginas) {
  const { pg, i, viuSegundoTurno } = acharCabecalho(paginas);
  if (!pg) {
    return {
      ok: false,
      reason: "sem-bloco",
      detail: viuSegundoTurno
        ? "nenhum cabeçalho de presidente ESTIMULADA de 1º turno; um bloco de 2º turno foi visto (tarefa própria, fora do v1)"
        : "nenhum cabeçalho de presidente + estimulada no documento",
    };
  }
  const tabela = colherTabela(pg, i);
  if (!tabela) {
    return { ok: false, reason: "ilegível", detail: `cabeçalho presidencial na p.${pg.page} mas sem corrida rótulo/valor legível abaixo dele` };
  }
  const { rotulos, valores } = tabela;
  if (rotulos.length !== valores.length) {
    return {
      ok: false,
      reason: "ilegível",
      detail: `p.${pg.page}: ${rotulos.length} rótulos × ${valores.length} valores não alinham — pareamento ambíguo, recusado (§4)`,
    };
  }

  const results = [];
  const absent = [];
  let blank_null_pct = null;
  let undecided_pct = null;
  let others_pct = null;

  for (let k = 0; k < rotulos.length; k++) {
    const rotulo = rotulos[k];
    const num = valorNumerico(valores[k]);
    // Baldes primeiro: um rótulo de balde nunca é candidato. A ordem importa
    // porque "Nenhum/Branco" jamais casa LINHA_CANDIDATO, mas mantê-la explícita
    // documenta a precedência.
    if (BALDE_BRANCO_NULO.test(rotulo) && !LINHA_CANDIDATO.test(rotulo)) {
      blank_null_pct = num; continue;
    }
    if (BALDE_NAO_SABE.test(rotulo) && !LINHA_CANDIDATO.test(rotulo)) {
      undecided_pct = num; continue;
    }
    if (LINHA_OUTROS.test(rotulo)) { others_pct = num; continue; }
    const mc = rotulo.match(LINHA_CANDIDATO);
    if (!mc) {
      // Rótulo que não é candidato nem balde reconhecido, no meio da corrida:
      // ambíguo, recusa (não descartar em silêncio).
      return { ok: false, reason: "ilegível", detail: `p.${pg.page}: rótulo não classificável "${rotulo}" dentro do bloco` };
    }
    const candidate = mc[1].trim();
    const party = mc[2].trim();
    if (num === null) { absent.push({ candidate, party }); continue; } // asterisco: ausência
    results.push({ candidate, party, pct: num });
  }

  if (results.length < 2) {
    return { ok: false, reason: "ilegível", detail: `p.${pg.page}: menos de 2 candidatos com valor — não é uma tabela de intenção` };
  }

  const soma = (a, b) => a + b;
  const expect_sum = Number(
    (results.map((r) => r.pct).reduce(soma, 0)
      + (blank_null_pct ?? 0) + (undecided_pct ?? 0) + (others_pct ?? 0)
    ).toFixed(1),
  );

  return {
    ok: true,
    figuras: {
      page: pg.page,
      results,
      blank_null_pct,
      undecided_pct,
      others_pct,
      absent,
      expect_sum,
    },
  };
}

// ---------------------------------------------------------------------------
// §10 — TOLERÂNCIA DERIVADA, nunca escolhida. A folga é a que a própria fonte
// ganhou ao arredondar: 0,5 por figura publicada em inteiro, 0,05 por décimo.
// (O `conferirSoma` do repairs.mjs crava 0,6 fixo; este gate interno é mais
// estrito de propósito — o que ele deixa passar, o 0,6 também deixa.)
// ---------------------------------------------------------------------------
export function toleranciaDerivada(figuras) {
  const cells = [
    ...figuras.results.map((r) => r.pct),
    figuras.blank_null_pct, figuras.undecided_pct, figuras.others_pct,
  ].filter((v) => v != null);
  let tol = 0;
  for (const v of cells) {
    // Décimo publicado (tem casa decimal não nula na forma impressa) → 0,05;
    // inteiro → 0,5. Testa a representação, não o valor: 2,0 conta como inteiro.
    tol += Number.isInteger(v) ? 0.5 : 0.05;
  }
  return Number(tol.toFixed(2));
}

/**
 * As duas pernas leram a MESMA tabela? Compara figura a figura dentro da
 * tolerância derivada. Não é a §1 (aquela é humana/segundo agente), mas é o
 * sinal de confiança que separa "texto+OCR batem" de "só uma perna viu".
 */
export function pernasConcordam(figA, figB) {
  if (!figA || !figB) return false;
  const chave = (f) => [
    ...f.results.map((r) => `${r.candidate}|${r.party}`),
  ].join("§");
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
