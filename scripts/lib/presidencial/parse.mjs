// O CORAÇÃO PURO DO PARSER PRESIDENCIAL — texto de página → figuras, ou RECUSA.
//
// Recebe as linhas que uma perna de extração (camada de texto embutida OU OCR
// Vision) produziu, acha os blocos presidenciais ESTIMULADOS de 1º turno e
// devolve as figuras — candidato/partido/percentual, DOIS baldes separados
// (branco/nulo × não sabe) — MAIS o MODO DE PAREAMENTO, que diz se o pareamento
// rótulo×valor é estruturalmente inequívoco. Determinístico (§8); falha sempre
// como RECUSA TIPADA (§4), nunca palpite.
//
// ★ O MODO DE PAREAMENTO (achado da leitura cega do AM-08042, endurecido pela
// reprovação do lote 3 em 20/08) — a classe de defeito que reprovou o AM foi
// AMBIGUIDADE DE ORDEM entre CORRIDAS SEPARADAS: o PDF entrega todos os rótulos,
// depois todos os valores, e a ordem dos valores pode não seguir a dos rótulos
// (some 100 e engana todo guarda de soma). A reprovação do lote 3 mostrou que a
// ALTERNÂNCIA rótulo/valor sofre do MESMO defeito em potência: no Paraná AP
// (jul/2025) a camada de texto vinha em DUAS CORRIDAS e só PARECIA interleaved
// porque a ordem vertical coincidiu — o índice casar foi sorte, não estrutura.
//   adjacente-inline       — valor NA MESMA linha de texto do rótulo  ← único inequívoco
//   adjacente-interleaved  — alternância rótulo/valor  ← GATED (ordem pode mentir)
//   corridas-separadas     — corrida de rótulos, depois corrida de valores  ← GATED
// O parser CLASSIFICA e o orquestrador DECIDE: só o inline emite do texto puro;
// interleaved e corrida-separada exigem uma perna INDEPENDENTE corroborando
// (OCR linha a linha, ou pareamento GEOMÉTRICO por caixa delimitadora).
// CONSERVADOR: qualquer dúvida cai na classe gated, nunca o contrário.
//
// O QUE SE RECUSA DE PROPÓSITO: crosstab SEGMENTADO (ex.: Manaus/Interior/Total)
// tem k valores por candidato e a coluna "Total" não se isola mecanicamente —
// vira recusa tipada para leitura visual/§1, nunca um chute de qual barra é o total.
//
// Este módulo lê UMA perna. A reconciliação entre as duas pernas e a segunda
// leitura cega (§1) moram fora daqui — no orquestrador e no hub, respectivamente.
import { folgaDerivada } from "../soma.mjs";

// ---------------------------------------------------------------------------
// Reconhecedores. Deliberadamente conservadores; a rede de segurança é dupla:
// a contagem (rótulos≠valores recusa) e o modo (dúvida ⇒ classe gated).
// ---------------------------------------------------------------------------
const CANDIDATO_COM_PARTIDO = /^(.+?)\s*[\(\-–]\s*([A-Za-zÀ-ú][A-Za-zÀ-ú0-9.\/ ]{0,18}?)\)?\s*$/;
// Token de valor: percentual com até 2 decimais ("55,28%" do SPSS), contagem de
// frequência com milhar ("1.383", "2.502") ou crua até 4 dígitos ("1383"). O
// alargamento (era 3 dígitos/1 decimal) existe para a REGRA DA COLUNA-QUE-SOMA
// das tabelas SPSS; o risco de um ano ("2026") virar token é fechado adiante
// pelo guarda de escala: percentual > 100 recusa o bloco (§4), nunca emite.
const FONTE_VALOR = "\\*|\\d{1,3}(?:\\.\\d{3})+(?:,\\d{1,2})?|\\d{1,4}(?:[.,]\\d{1,2})?";
const LINHA_SO_VALORES = new RegExp(`^(?:\\s*(?:${FONTE_VALOR})\\s*%?\\s*)+$`);
const TOKEN_VALOR = new RegExp(FONTE_VALOR, "g");

const BALDE_BRANCO_NULO = /(branco|nulo|nenhum)/i;
// "N.Sabe/N.Opinou" é a grafia abreviada do SPSS (INOP MA) — sem ela o balde
// não classifica, a coleta para nele e a coluna-que-soma perde o fechamento.
const BALDE_NAO_SABE = /(n[aã]o\s*sabe|n\.?\s?sabe|n[aã]o\s*respond|n\.?\s?respond|n[aã]o\s*opinou|n\.?\s?opinou|ns\/?nr|indecis)/i;
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
const MARCA_ESPONTANEA = /espont|sem\s+(apresentar|citar|mostrar)|n[ãa]o\s+cit|fale\s+o\s+nome/i;
const MARCA_SEGUNDO_TURNO = /2[ºo°]?\s*turno|segundo\s*turno/i;
// Avaliação de governo e rejeição também imprimem "Presidente" + "ESTIMULADA"
// (Paraná AP p.17: "Avaliação e Aprovação da administração do Presidente Lula /
// ESTIMULADA" — sem esta exclusão a enumeração por cenário emitiria "Ótima
// 12,1%" como candidato). Exclusão DURA como a da espontânea: detectar avaliação
// como intenção de voto seria dado errado; não detectar é só uma pendência.
const MARCA_AVALIACAO = /avalia[çc]|aprova[çc]|\baprova\b|desaprova|administra[çc]|[óo]tim[ao]|p[ée]ssim[ao]/i;
const MARCA_REJEICAO = /rejei[çc]|n[ãa]o\s+votaria/i;
// Crosstab SEGMENTADO (geográfico OU demográfico): a página repete o cenário
// quebrado por segmento — não é um cenário novo e a coluna do total não se isola
// mecanicamente. Exigem-se DOIS acertos de marcador na região (um só pode ser
// prosa; "Masculino" e "Feminino" juntos são a assinatura da tabela de perfil).
const MARCA_SEGMENTO = /\b(manaus|interior|capital|masculino|feminino|escolaridade|renda\s+familiar|religi[ãoõe]|ensino\s+(fundamental|m[ée]dio|superior)|de\s+\d{1,2}\s+a\s+\d{1,2}\s+anos|\d{1,2}\s+anos\s+ou\s+mais|faixa\s+et[áa]ria|PEA|sal[áa]rios?[\s-]m[íi]nimos|cor\s+ou\s+ra[çc]a)\b/gi;

const RUIDO = /(tse|registr|pesquisa|fonte|p[áa]gina|inten[çc][ãa]o|estimulad|espont|contratante|executora|margem|amostra|per[íi]odo|n[úu]mero|estat[íi]stico|respons|tribunal|intervalo|confian|coleta|disco|nomes|candidatos|resultado|geral|cen[áa]rio|total|manaus|interior|capital|prefeito|governador|senador|\bvoto|elei[çc]|conre|reg\.|frequ[êe]ncia|porcent|percent|v[áa]lid|acumulat|ausente|base:|[óo]tima|\bboa\b|regular|ruim|p[ée]ssima|aprova|desaprova|avalia|situa[çc]|sim\b|perfil|sexo|ocupa[çc]|janeiro|fevereiro|mar[çc]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)/i;

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
export function classificarRotulo(l) {
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
  // "1.383" é milhar (frequência SPSS), "55,28" é decimal: o ponto seguido de
  // exatamente 3 dígitos cai, a vírgula vira ponto.
  return m.map((v) => (v === "*" ? null : Number(v.replace(/\.(?=\d{3}\b)/g, "").replace(",", "."))));
}

/**
 * Uma linha INLINE "rótulo ... valor(es)" → {rotulo, valores}, ou null. O rótulo
 * tem de terminar em caractere que NÃO é de valor (evita partir "2026" e afins),
 * e os valores são a corrida final de tokens numéricos.
 */
export function separarRotuloValores(linha) {
  const t = linha.trim();
  const m = t.match(new RegExp(`^(.*?[^\\d.,%\\s])\\s+((?:(?:${FONTE_VALOR})\\s*%?\\s*)+)$`));
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
 * Testa se a linha `i` da página é um cabeçalho de bloco presidencial ESTIMULADO
 * de 1º turno POR ENUNCIADO, com exclusão DURA de espontânea, 2º turno, avaliação
 * de governo e rejeição. Contexto = 4 linhas (o enunciado às vezes cai uma ou
 * duas linhas abaixo do "presidente"). Devolve "cabecalho" ou o nome da exclusão.
 */
function tipoDeCabecalho(pg, i) {
  if (!ANCORA_PRESIDENTE.test(pg.lines[i])) return null;
  const ctx = [pg.lines[i], pg.lines[i + 1] ?? "", pg.lines[i + 2] ?? "", pg.lines[i + 3] ?? ""].join("  ");
  if (MARCA_ESPONTANEA.test(ctx)) return "espontanea";
  if (MARCA_SEGUNDO_TURNO.test(ctx)) return "segundo-turno";
  if (MARCA_AVALIACAO.test(ctx)) return "avaliacao";
  if (MARCA_REJEICAO.test(ctx)) return "rejeicao";
  if (!MARCADORES_ESTIMULADA.some((m) => m.test(ctx))) return null;
  return "cabecalho";
}

/** É início plausível de tabela: rótulo inline (com valor) ou rótulo puro. */
function inicioDeTabela(linha) {
  const inline = separarRotuloValores(linha);
  if (inline && classificarRotulo(inline.rotulo)) return true;
  return ehRotulo(linha) && !ehLinhaSoValores(linha);
}

// ---------------------------------------------------------------------------
// REGRA SPSS DA COLUNA-QUE-SOMA (§5/§10): em tabela inline multi-coluna
// (Frequência / Porcentual / Porcentagem válida / acumulativa), a coluna cujas
// linhas do bloco — candidatos E baldes — fecham em 100 dentro da folga
// DERIVADA é a coluna de percentual da amostra, e o pareamento rótulo×valor
// dela é inline (colado na linha) — seguro. Nenhuma coluna fecha, ou duas
// fecham com valores DIFERENTES → ambíguo, gated. Duas fecham com valores
// idênticos (Porcentual = válida quando não há "Ausente") não é ambiguidade.
// Só colunas presentes em TODAS as linhas do bloco concorrem: a "válida" que
// existe para candidatos mas não para os baldes NS/NR somaria 100 excluindo
// os baldes — exatamente a coluna errada para uma tabela com baldes.
// ---------------------------------------------------------------------------
function resolverColunaQueSoma(pares) {
  const nMin = Math.min(...pares.map((p) => p.valores.length));
  const fecham = [];
  for (let k = 0; k < nMin; k++) {
    const vals = pares.map((p) => p.valores[k]);
    const soma = vals.reduce((a, v) => a + (v ?? 0), 0);
    if (Math.abs(soma - 100) <= folgaDerivada(vals)) fecham.push({ k, vals, soma: Number(soma.toFixed(2)) });
  }
  if (!fecham.length) return { ok: false, motivo: "nenhuma coluna fecha em 100 dentro da folga derivada" };
  const iguais = (a, b) => a.length === b.length && a.every((v, j) => v === b[j]);
  const distintas = fecham.filter((f, j) => !fecham.slice(0, j).some((g) => iguais(g.vals, f.vals)));
  if (distintas.length > 1) {
    return { ok: false, motivo: `${fecham.length} colunas fecham em 100 com valores divergentes (ex.: col ${distintas[0].k + 1} × col ${distintas[1].k + 1})` };
  }
  return { ok: true, ...distintas[0] };
}

// Linhas estruturais do SPSS entre/apos as linhas de dados ("Total 488 47,3
// 100,0", "Válido", "Ausente Ausente 838 81,3") — não são rótulos do bloco, mas
// os BALDES vêm DEPOIS delas (NS/NR e Branco/nulo ficam fora do "Válido"), então
// pulá-las (com teto) em vez de parar é o que deixa os baldes entrarem na conta.
const LINHA_ESTRUTURAL_SPSS = /^(total|v[áa]lido|ausente)\b/i;

/**
 * Colhe a tabela e CLASSIFICA O MODO. Devolve {pares, modo, fim} ou
 * {desalinhado}/{multiAmbigua}/null. `fim` = índice da 1ª linha após a tabela
 * (a enumeração por cenário continua a varredura dali).
 *   modo ∈ "adjacente-inline" | "adjacente-interleaved" | "corridas-separadas"
 */
function colherTabela(pg, iCabecalho) {
  const linhas = pg.lines;
  let i = iCabecalho + 1, saltos = 0;
  // Pula prosa E números soltos (número de página, ano) entre o cabeçalho e a
  // tabela — abortar em qualquer valor solto matava blocos legítimos (o "8" da
  // p.8 do Paraná ficava entre o cabeçalho e a tabela interleaved). Se não houver
  // rótulo depois, as corridas saem vazias e o colher devolve null mesmo assim.
  while (i < linhas.length && saltos < 25 && !inicioDeTabela(linhas[i])) { i++; saltos++; }
  if (i >= linhas.length || saltos >= 25) return null;

  const primeira = separarRotuloValores(linhas[i]);
  // ---- MODO INLINE: a primeira linha da tabela já tem valor colado ----------
  if (primeira && classificarRotulo(primeira.rotulo)) {
    const pares = [];
    let multi = false, estruturais = 0;
    while (i < linhas.length) {
      const sv = separarRotuloValores(linhas[i]);
      if (sv && LINHA_ESTRUTURAL_SPSS.test(sv.rotulo) && estruturais < 4) { estruturais++; i++; continue; }
      if (!sv || !classificarRotulo(sv.rotulo)) break;
      if (sv.valores.length > 1) multi = true;
      pares.push({ rotulo: sv.rotulo, valores: sv.valores });
      i++;
    }
    if (pares.length < 2) return null;
    if (!multi) return { pares, modo: "adjacente-inline", fim: i };
    const col = resolverColunaQueSoma(pares);
    if (!col.ok) return { multiAmbigua: col.motivo, fim: i };
    return {
      pares: pares.map((p) => ({ rotulo: p.rotulo, valores: [p.valores[col.k]] })),
      modo: "adjacente-inline",
      colunaResolvida: { indice: col.k, colunas: Math.min(...pares.map((p) => p.valores.length)), soma: col.soma },
      fim: i,
    };
  }

  // ---- primeira linha é rótulo PURO: interleaved ou corridas-separadas ------
  const proxima = linhas[i + 1] ?? "";
  const proxValores = ehLinhaSoValores(proxima) ? valoresDaLinha(proxima) : null;
  if (proxValores && proxValores.length === 1) {
    // ALTERNÂNCIA rótulo/valor/rótulo/valor — classificada, mas GATED: a ordem
    // de emissão do gerador do PDF pode alternar sem parear (lote 3, Paraná AP).
    const pares = [];
    while (i + 1 < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i])) {
      const vs = ehLinhaSoValores(linhas[i + 1]) ? valoresDaLinha(linhas[i + 1]) : null;
      if (!vs || vs.length !== 1) break;
      pares.push({ rotulo: linhas[i].trim(), valores: vs });
      i += 2;
    }
    if (pares.length < 2) return null;
    return { pares, modo: "adjacente-interleaved", fim: i };
  }

  // ---- CORRIDAS SEPARADAS (ambíguo por ordem) ------------------------------
  const rotulos = [];
  while (i < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i])) { rotulos.push(linhas[i].trim()); i++; }
  const valores = [];
  while (i < linhas.length && ehLinhaSoValores(linhas[i])) { valores.push(...valoresDaLinha(linhas[i])); i++; }
  if (!rotulos.length || !valores.length) return null;
  if (rotulos.length !== valores.length) return { desalinhado: { nr: rotulos.length, nv: valores.length }, fim: i };
  const pares = rotulos.map((r, k) => ({ rotulo: r, valores: [valores[k]] }));
  // pares rótulo→valor à frente (baldes soltos no fim)
  while (i + 1 < linhas.length && ehRotulo(linhas[i]) && !ehLinhaSoValores(linhas[i]) && ehLinhaSoValores(linhas[i + 1])) {
    const vs = valoresDaLinha(linhas[i + 1]);
    if (vs.length !== 1) break;
    pares.push({ rotulo: linhas[i].trim(), valores: vs });
    i += 2;
  }
  return { pares, modo: "corridas-separadas", fim: i };
}

/**
 * Pares rótulo×valor → figuras (results/baldes/absent/expect_sum), ou recusa
 * tipada. COMPARTILHADO entre a leitura por texto e o pareamento GEOMÉTRICO
 * (geometria.mjs) — uma regra, uma implementação (§5).
 */
export function figurasDosPares(pares, page, modo, colunaResolvida = null) {
  const results = [];
  const absent = [];
  let blank_null_pct = null, undecided_pct = null, others_pct = null;
  for (const { rotulo, valores } of pares) {
    const c = classificarRotulo(rotulo);
    if (!c) return { ok: false, reason: "ilegível", detail: `p.${page}: rótulo não classificável "${rotulo}"` };
    const v = valores[0]; // pares já resolvidos têm 1 valor
    // Guarda de ESCALA (§4): percentual não passa de 100. É o que impede um ano
    // ("2026") ou uma frequência SPSS tokenizada de virar figura emitível.
    if (v != null && (v > 100 || v < 0)) return { ok: false, reason: "ilegível", detail: `p.${page}: valor ${v} fora da escala percentual (0–100) em "${rotulo}" — recusado (§4)` };
    if (c.tipo === "branco_nulo") { blank_null_pct = v; continue; }
    if (c.tipo === "nao_sabe") { undecided_pct = v; continue; }
    if (c.tipo === "outros") { others_pct = v; continue; }
    if (v === null) { absent.push({ candidate: c.candidate, party: c.party }); continue; }
    results.push({ candidate: c.candidate, party: c.party, pct: v });
  }
  if (results.length < 2) return { ok: false, reason: "ilegível", detail: `p.${page}: menos de 2 candidatos com valor` };
  // ≥3 candidatos = 1º turno estimulada com o campo cheio; exatamente 2 é suspeito
  // de ser confronto de 2º turno mal-rotulado → recusa em vez de arriscar.
  if (results.length === 2) return { ok: false, reason: "ilegível", detail: `p.${page}: só 2 candidatos — possível confronto de 2º turno, não 1º estimulada; leitura §1` };

  const soma = (a, b) => a + b;
  const expect_sum = Number(
    (results.map((r) => r.pct).reduce(soma, 0) + (blank_null_pct ?? 0) + (undecided_pct ?? 0) + (others_pct ?? 0)).toFixed(1),
  );
  const figuras = { page, pareamento: modo, results, blank_null_pct, undecided_pct, others_pct, absent, expect_sum };
  if (colunaResolvida) figuras.coluna_resolvida = colunaResolvida;
  return { ok: true, figuras };
}

/**
 * ASSINATURA DE ELENCO — a identidade de um CENÁRIO estimulado. Nome completo
 * normalizado (caixa, acento, honorífico fora), ordenado. Sobrenome sozinho NÃO
 * serve: Jair, Michelle e Eduardo Bolsonaro são três cenários distintos com o
 * mesmo sobrenome — é o nome inteiro que distingue (Paraná AP, 4 cenários).
 */
export function assinaturaElenco(nomes) {
  return (nomes ?? [])
    .map((n) => String(n).normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
      .replace(/^(ministro|ministra|doutor|doutora|dr|dra|presidente|ex-presidente)\s+/, "")
      .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .sort()
    .join("§");
}

// Duas leituras do MESMO elenco no MESMO documento têm de bater figura a figura
// — se divergem, nenhuma das duas é confiável e o cenário vira recusa (§4),
// nunca "a primeira ganha".
function mesmasFiguras(a, b) {
  if (a.results.length !== b.results.length) return false;
  const chave = (f) => f.results.map((r) => `${r.candidate}|${r.pct}`).sort().join("§");
  return chave(a) === chave(b)
    && a.blank_null_pct === b.blank_null_pct && a.undecided_pct === b.undecided_pct && a.others_pct === b.others_pct;
}

/**
 * ENUMERAÇÃO POR CENÁRIO (reprovação do lote 3, ponto 2): TODOS os blocos
 * presidenciais estimulados de 1º turno do documento — um doc de 4 estimuladas
 * conta 4 — pulando os crosstabs SEGMENTADOS (geográficos e demográficos), que
 * repetem um cenário quebrado por segmento e não são cenário novo.
 *
 * Devolve { cenarios: [{ok:true, figuras} | {ok:false, reason, detail, page}],
 *           crosstabs: [páginas puladas], notas: {exclusões vistas} }.
 * Regras de ruído (medidas nos controles):
 *   - página com bloco extraído com sucesso não gera TAMBÉM pendência pelo
 *     enunciado repetido no rodapé ("Fonte: ...em quem você votaria?");
 *   - página já marcada crosstab não gera pendência pelo enunciado sob a tabela;
 *   - no máximo UMA falha por página (vários âncoras quebrados = um defeito);
 *   - mesmo elenco duas vezes no doc: leituras iguais colapsam na primeira,
 *     divergentes viram recusa tipada.
 */
export function extrairBlocosPresidenciais(paginas) {
  const cenarios = [];
  const crosstabs = [];
  const notas = { espontanea: 0, segundoTurno: 0, avaliacao: 0, rejeicao: 0 };

  for (const pg of paginas) {
    const okDaPagina = [];
    const falhasDaPagina = [];
    let i = 0;
    while (i < pg.lines.length) {
      const tipo = tipoDeCabecalho(pg, i);
      if (!tipo) { i++; continue; }
      if (tipo !== "cabecalho") {
        if (tipo === "espontanea") notas.espontanea++;
        else if (tipo === "segundo-turno") notas.segundoTurno++;
        else if (tipo === "avaliacao") notas.avaliacao++;
        else notas.rejeicao++;
        i++; continue;
      }
      const regiao = pg.lines.slice(i, i + 45).join("  ");
      const hitsSegmento = regiao.match(MARCA_SEGMENTO)?.length ?? 0;
      if (hitsSegmento >= 2) {
        if (!crosstabs.includes(pg.page)) crosstabs.push(pg.page);
        i++; continue;
      }
      const t = colherTabela(pg, i);
      if (!t) { falhasDaPagina.push({ ok: false, reason: "ilegível", detail: `p.${pg.page}: cabeçalho presidencial sem tabela legível abaixo (bloco em imagem ou layout não coberto)`, page: pg.page }); i++; continue; }
      if (t.desalinhado) { falhasDaPagina.push({ ok: false, reason: "ilegível", detail: `p.${pg.page}: ${t.desalinhado.nr} rótulos × ${t.desalinhado.nv} valores não alinham — recusado (§4)`, page: pg.page }); i = Math.max(i + 1, t.fim); continue; }
      if (t.multiAmbigua) { falhasDaPagina.push({ ok: false, reason: "ilegível", detail: `p.${pg.page}: tabela inline multi-coluna sem coluna-que-soma (${t.multiAmbigua}) — gated, leitura §1`, page: pg.page }); i = Math.max(i + 1, t.fim); continue; }
      const r = figurasDosPares(t.pares, pg.page, t.modo, t.colunaResolvida ?? null);
      if (!r.ok) { falhasDaPagina.push({ ...r, page: pg.page }); i = Math.max(i + 1, t.fim); continue; }
      okDaPagina.push(r);
      i = Math.max(i + 1, t.fim);
    }
    // Sucesso na página cala as falhas da MESMA página (enunciado repetido no
    // rodapé); página já marcada CROSSTAB também as cala (o enunciado impresso
    // sob a tabela de perfil dispara âncora sem tabela — Paraná AP p.9); sem
    // nada disso, UMA falha representa a página.
    if (okDaPagina.length) cenarios.push(...okDaPagina);
    else if (falhasDaPagina.length && !crosstabs.includes(pg.page)) cenarios.push(falhasDaPagina[0]);
  }

  // Colapso por elenco DENTRO do documento (gráfico que repete a tabela).
  const porAssinatura = new Map();
  const finais = [];
  for (const c of cenarios) {
    if (!c.ok) { finais.push(c); continue; }
    const ass = assinaturaElenco([...c.figuras.results.map((r) => r.candidate), ...c.figuras.absent.map((a) => a.candidate)]);
    const visto = porAssinatura.get(ass);
    if (!visto) { porAssinatura.set(ass, c); finais.push(c); continue; }
    if (!mesmasFiguras(visto.figuras, c.figuras)) {
      finais.push({ ok: false, reason: "ilegível", detail: `p.${visto.figuras.page} × p.${c.figuras.page}: o MESMO elenco aparece duas vezes com figuras divergentes — nenhuma leitura é confiável (§4)`, page: c.figuras.page });
    }
    // leituras iguais: colapsa na primeira, sem entrada nova
  }
  return { cenarios: finais, crosstabs, notas };
}

/**
 * Compatibilidade: o PRIMEIRO cenário do documento (ou a recusa mais
 * informativa). O caminho por cenário é extrairBlocosPresidenciais.
 */
export function extrairBlocoPresidencial(paginas) {
  const { cenarios, crosstabs, notas } = extrairBlocosPresidenciais(paginas);
  const ok = cenarios.find((c) => c.ok);
  if (ok) return ok;
  const falha = cenarios.find((c) => !c.ok);
  if (falha) return falha;
  if (crosstabs.length) return { ok: false, reason: "ilegível", detail: `p.${crosstabs[0]}: só blocos SEGMENTADOS (crosstab geográfico/demográfico) — coluna total não isolável; leitura visual/§1` };
  const nota = notas.segundoTurno ? "; um 2º turno foi visto (fora do v1)"
    : notas.espontanea ? "; só bloco ESPONTÂNEO (não se guarda)" : "";
  return { ok: false, reason: "sem-bloco", detail: `nenhum cabeçalho de presidente estimulada de 1º turno${nota}` };
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
  return bal(figA.blank_null_pct, figB.blank_null_pct) && bal(figA.undecided_pct, figB.undecided_pct) && bal(figA.others_pct, figB.others_pct);
}

// Pareamento estruturalmente inequívoco? (o orquestrador usa para decidir emissão)
// SÓ o inline: valor NA MESMA linha de texto do rótulo. O interleaved saiu da
// lista na reprovação do lote 3 — no Paraná AP a camada de texto vinha em duas
// corridas separadas e os índices casarem foi sorte da ordem vertical, não
// estrutura; alternância aparente é a MESMA classe de defeito em potência.
export function pareamentoConfiavel(modo) {
  return modo === "adjacente-inline";
}
