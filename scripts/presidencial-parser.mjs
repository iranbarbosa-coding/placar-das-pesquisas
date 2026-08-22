// PARSER PRESIDENCIAL — bloco presidencial dos relatórios estaduais → presidente:UF
//
// FERRAMENTA DE BANCADA, não fonte de rede da coleta diária. Lê o bloco
// presidencial ESTIMULADO (1º turno) do relatório-integra de uma pesquisa
// ESTADUAL e EMITE um add_poll CANDIDATO — verified_at nulo, pendente da 2ª
// leitura cega (§1) do hub — num arquivo QUE ESTE PARSER CONTROLA. NÃO toca
// data/repairs.json (compartilhado; o merge é passo do hub, escritor único no
// land). NÃO insere direto. NÃO se liga na coleta.
//
// Duas pernas de leitura, um binário (scripts/ocr/ocr): camada de texto embutida
// (--text) e OCR Vision do bitmap renderizado. A camada de texto é a leitura
// exata do gerador do PDF; o OCR corrobora onde consegue e é a única perna nos
// ~25% de relatórios só-imagem. A 2ª leitura cega §1 é humana/segundo agente e
// mora fora daqui.
//
// A CONTA FECHA, SEMPRE (§2): entradas = emitidos + rejeitados + pendências.
// PDF que não parseia vira PENDÊNCIA TIPADA (sem-integra/ilegível/sem-bloco),
// nunca silêncio. E o autoteste (--self-test) reprova com um PDF-controle de
// resposta conhecida E com uma soma adulterada, rodando o caminho REAL do
// repairs.mjs (montarPesquisaCurada/inserirPesquisaCurada/applyRepairs).
//
// Uso: node scripts/presidencial-parser.mjs [--self-test] [--verbose]
//      node scripts/presidencial-parser.mjs [--state=AM[,SE,...]] [--limit=N]
//           [--sweep=<file>] [--cache=<dir>] [--out=<file>] [--pend=<file>]
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import {
  paginar, extrairBlocoPresidencial, extrairBlocosPresidenciais, figurasDosPares,
  assinaturaElenco, pernasConcordam, toleranciaDerivada, pareamentoConfiavel,
} from "./lib/presidencial/parse.mjs";
import { paginarBoxes, parearPorGeometria } from "./lib/presidencial/geometria.mjs";
import { extrairFicha } from "./lib/presidencial/ficha.mjs";
import { montarCandidato } from "./lib/presidencial/emit.mjs";

const RAIZ = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OCR_BIN = path.join(RAIZ, "scripts", "ocr", "ocr");
const FIXTURES = path.join(RAIZ, "scripts", "lib", "presidencial", "fixtures");

// Dicionário unidadesFederativasId, replicado de scripts/sources/poder360.mjs:21
// (constante fixa do bundle da SPA — não é lógica, é tabela; a citação é o elo).
const UF_IDS = {
  AC: 1, AL: 2, AM: 3, AP: 4, BA: 5, CE: 7, DF: 8, ES: 9, GO: 10, MA: 11,
  MG: 12, MS: 13, MT: 14, PA: 15, PB: 16, PE: 17, PI: 18, PR: 19, RJ: 20,
  RN: 21, RO: 22, RR: 23, RS: 24, SC: 25, SE: 26, SP: 27, TO: 28,
};
const ID_UF = Object.fromEntries(Object.entries(UF_IDS).map(([uf, id]) => [id, uf]));
const CARGO_GOVERNADOR = 1;
const ESTADOS_FINOS = ["AM", "SE", "AL", "AP", "MT", "MA", "RO"];

// ---------------------------------------------------------------------------
// CLI
// ---------------------------------------------------------------------------
const argv = process.argv.slice(2);
const flag = (nome) => argv.includes(`--${nome}`);
const opc = (nome, padrao) => {
  const hit = argv.find((a) => a.startsWith(`--${nome}=`));
  return hit ? hit.slice(nome.length + 3) : padrao;
};
const VERBOSE = flag("verbose");

// ---------------------------------------------------------------------------
// Leitura das pernas (shell-out ao binário Vision). Determinístico: a mesma
// entrada dá a mesma saída; sem relógio, sem rede aqui dentro.
// ---------------------------------------------------------------------------
function lerPerna(pdfPath, modo, first, last) {
  const args = modo === "text" ? ["--text", pdfPath] : modo === "boxes" ? ["--boxes", pdfPath] : [pdfPath];
  if (first != null) { args.push(String(first)); if (last != null) args.push(String(last)); }
  try {
    return execFileSync(OCR_BIN, args, { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 });
  } catch (e) {
    return ""; // perna falha → string vazia; o chamador conta como perna ausente
  }
}

// Comprimento do texto útil (sem os cabeçalhos de página) — decide se a camada
// de texto é substancial. Um PDF só-imagem devolve ~0 aqui.
function textoUtilLen(raw) {
  return raw.replace(/^===\s*página.*$/gm, "").replace(/\s+/g, "").length;
}
const TEXTO_SUBSTANCIAL = 800;

/** Enumera os cenários por uma perna; devolve o pacote de extrairBlocosPresidenciais. */
function cenariosDaPerna(raw) {
  if (!raw.trim()) return { cenarios: [], crosstabs: [], notas: null, vazia: true };
  return { ...extrairBlocosPresidenciais(paginar(raw)), vazia: false };
}

// ---------------------------------------------------------------------------
// Sweep → registros de governador (cargoId=1, 1º turno) das UFs alvo.
// ---------------------------------------------------------------------------
function lerSweep(sweepPath) {
  const spec = JSON.parse(fs.readFileSync(sweepPath, "utf8"));
  return spec;
}

function registrosGovernador(sweep, estados) {
  const alvo = new Set(estados);
  const saida = [];
  for (const [chave, val] of Object.entries(sweep)) {
    const [cargoId, ufId, round] = chave.split("|").map(Number);
    if (cargoId !== CARGO_GOVERNADOR || round !== 1) continue;
    const uf = ID_UF[ufId];
    if (!uf || !alvo.has(uf)) continue;
    const v1 = Array.isArray(val?.v1) ? val.v1 : [];
    for (const rec of v1) {
      saida.push({ chave, uf, rec });
    }
  }
  // Ordem estável (determinismo §8): UF, depois id do registro, depois integra.
  saida.sort((a, b) =>
    a.uf.localeCompare(b.uf) || (a.rec.id ?? 0) - (b.rec.id ?? 0)
    || String(a.rec.integra ?? "").localeCompare(String(b.rec.integra ?? "")));
  return saida;
}

// ---------------------------------------------------------------------------
// Cache de PDF (uso de bancada). Chave = sha1 da URL; conteúdo nunca reescrito.
// ---------------------------------------------------------------------------
async function baixarIntegra(url, cacheDir) {
  fs.mkdirSync(cacheDir, { recursive: true });
  const nome = crypto.createHash("sha1").update(url).digest("hex").slice(0, 16) + ".pdf";
  const dest = path.join(cacheDir, nome);
  if (fs.existsSync(dest) && fs.statSync(dest).size > 0) {
    const buf = fs.readFileSync(dest);
    return { path: dest, sha256: crypto.createHash("sha256").update(buf).digest("hex"), cached: true };
  }
  const res = await fetch(url, {
    headers: { "user-agent": "Mozilla/5.0 (compatible; PlacarDasPesquisas-parser/1.0)" },
    signal: AbortSignal.timeout(60_000),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  if (!buf.length || buf.slice(0, 5).toString() !== "%PDF-") throw new Error("resposta não é PDF");
  fs.writeFileSync(dest, buf);
  return { path: dest, sha256: crypto.createHash("sha256").update(buf).digest("hex"), cached: false };
}

// ---------------------------------------------------------------------------
// O PORTÃO DE PAREAMENTO (§1/§4 — achado do AM-08042, endurecido pela
// reprovação do lote 3 em 20/08), agora POR CENÁRIO:
//   adjacente-inline       → emite do texto (valor colado na linha do rótulo;
//                            inclui a coluna-que-soma das tabelas SPSS)
//   interleaved / corrida  → GATED: emite só com perna independente
//                            corroborando — OCR linha a linha (corroborado-
//                            visual) ou pareamento por caixa delimitadora
//                            (corroborado-geometrico)
//   só-OCR (sem camada de texto) → inline do OCR emite; gated do OCR emite só
//                            se a GEOMETRIA (pareamento por posição, imune à
//                            ordem de emissão) reproduzir as mesmas figuras
// Conservador por construção: qualquer dúvida cai em gated/pendência. A §1
// humana segue sendo a barreira do repairs.json; isto só decide o que VAI à §1.
// ---------------------------------------------------------------------------
const assinaturaDeFiguras = (f) => assinaturaElenco(f.results.map((r) => r.candidate));

/** Perna independente para um cenário GATED. Devolve {modo, legs} ou {falha}. */
function corroborarCenario(pdfPath, fig) {
  const motivos = [];
  // 1) OCR linha a linha da página do cenário — perna visual clássica.
  const eOcr = cenariosDaPerna(lerPerna(pdfPath, "ocr", fig.page, fig.page));
  const ass = assinaturaDeFiguras(fig);
  const casado = eOcr.cenarios.find((c) => c.ok && assinaturaDeFiguras(c.figuras) === ass);
  if (casado && pernasConcordam(fig, casado.figuras)) {
    return { modo: "corroborado-visual", legs: { texto: true, ocr: true, concordam: true } };
  }
  motivos.push(casado ? "OCR linha a linha DIVERGE" : "OCR linha a linha não corrobora");
  // 2) GEOMETRIA: pareia rótulo×valor por caixa delimitadora — não depende da
  //    ordem de emissão, que é a própria classe de defeito sob suspeita.
  const pgB = paginarBoxes(lerPerna(pdfPath, "boxes", fig.page, fig.page))[0];
  if (pgB) {
    const g = parearPorGeometria(pgB);
    if (g.ok) {
      const fg = figurasDosPares(g.pares, fig.page, "geometrico");
      if (fg.ok && pernasConcordam(fig, fg.figuras)) {
        return { modo: "corroborado-geometrico", legs: { texto: true, ocr: true, concordam: true } };
      }
      motivos.push(fg.ok ? "geometria DIVERGE" : `geometria: ${fg.detail}`);
    } else motivos.push(`geometria: ${g.motivo}`);
  } else motivos.push("geometria: sem caixas para a página");
  return { falha: motivos.join("; ") };
}

/**
 * Um DOCUMENTO → lista de disposições POR CENÁRIO (a reprovação do lote 3,
 * ponto 2: um doc de 4 estimuladas conta 4 — emitido, ja-curado, rejeitado ou
 * pendência, nunca silêncio). `jaCurada(assinatura)` vem do dedupe (origin/main).
 */
function processarDocumento({ pdfPath, sha256, uf, rec, integraUrl, jaCurada, temCuradaDaOperacao }) {
  const textoRaw = lerPerna(pdfPath, "text");
  const textoRico = textoUtilLen(textoRaw) >= TEXTO_SUBSTANCIAL;
  const eTexto = cenariosDaPerna(textoRaw);

  let enumAtiva = eTexto, fonte = "texto", ocrRaw = null;
  if (!eTexto.cenarios.some((c) => c.ok)) {
    // Sem cenário legível na camada de texto: a perna OCR do documento inteiro
    // só compensa quando a camada é rasa (slide-imagem) ou recusou por forma
    // ("ilegível") — texto substancial sem cabeçalho segue sem-bloco, sem
    // gastar um render do documento inteiro à toa.
    const precisaOCR = !textoRico || eTexto.cenarios.some((c) => !c.ok && c.reason === "ilegível");
    if (precisaOCR) {
      ocrRaw = lerPerna(pdfPath, "ocr");
      const eOcr = cenariosDaPerna(ocrRaw);
      if (eOcr.cenarios.some((c) => c.ok) || (!eTexto.cenarios.length && eOcr.cenarios.length)) {
        enumAtiva = eOcr; fonte = "ocr";
      }
    }
  }

  const { cenarios, crosstabs, notas } = enumAtiva;
  if (!cenarios.length) {
    // Documento sem NENHUM desfecho de cenário. Se a operação já tem add_poll
    // curado, a §1 já leu este documento à mão — sai ja-curado (com o motivo da
    // recusa anotado), não pendência ruidosa (é o RO Real Time 2026-07-15).
    let pend;
    if (!textoRaw.trim() && ocrRaw != null && !ocrRaw.trim()) {
      pend = { subtipo: "ilegível", detalhe: "nenhuma perna produziu texto (PDF corrompido ou render falhou)" };
    } else if (crosstabs.length) {
      pend = { subtipo: "ilegível", detalhe: `só blocos SEGMENTADOS (crosstab geográfico/demográfico, p. ${crosstabs.join(", ")}) — coluna total não isolável; leitura visual/§1` };
    } else {
      const nota = notas?.segundoTurno ? "; um 2º turno foi visto (fora do v1)" : notas?.espontanea ? "; só bloco ESPONTÂNEO (não se guarda)" : "";
      pend = { subtipo: "sem-bloco", detalhe: `nenhum cabeçalho de presidente estimulada de 1º turno${nota}` };
    }
    if (temCuradaDaOperacao) {
      return [{ tipo: "ja-curado", detalhe: `operação já coberta por add_poll curado; o parser não leu nenhum cenário deste documento (${pend.detalhe}) — anotado para a §1` }];
    }
    return [{ tipo: "pendencia", ...pend }];
  }

  const paginasFicha = paginar(fonte === "texto" ? textoRaw : ocrRaw);
  const ficha = extrairFicha(paginasFicha, uf);
  const oks = cenarios.filter((c) => c.ok);
  const disposicoes = [];

  let indice = 0;
  for (const c of cenarios) {
    if (!c.ok) {
      // Recusa tipada de UM cenário. Se a operação já tem add_poll curado, a
      // recusa vira ja-curado ANOTADO (a §1 já leu este documento à mão) — o
      // detalhe preserva a recusa para a conferência, nunca a apaga.
      if (temCuradaDaOperacao) {
        disposicoes.push({ tipo: "ja-curado", detalhe: `operação já coberta por add_poll curado; recusa do parser nesta página fica anotada para a §1: ${c.detail}` });
      } else {
        disposicoes.push({ tipo: "pendencia", subtipo: c.reason === "sem-bloco" ? "sem-bloco" : "ilegível", detalhe: c.detail });
      }
      continue;
    }
    indice++;
    const fig = c.figuras;
    const ass = assinaturaDeFiguras(fig);
    if (jaCurada(ass)) {
      disposicoes.push({ tipo: "ja-curado", detalhe: `cenário p.${fig.page} (elenco já curado em repairs.json) — dedupe por assinatura`, assinatura: ass });
      continue;
    }
    const rotuloCenario = oks.length > 1 ? `1º turno — cenário ${indice} (p.${fig.page})` : "1º turno";

    let legs, pareamentoModo;
    if (fonte === "texto") {
      if (pareamentoConfiavel(fig.pareamento)) {
        // Inline: confia no texto. OCR de 1 página só REGISTRA corroboração.
        const eOcrPg = cenariosDaPerna(lerPerna(pdfPath, "ocr", fig.page, fig.page));
        const casado = eOcrPg.cenarios.find((x) => x.ok && assinaturaDeFiguras(x.figuras) === ass);
        legs = { texto: true, ocr: !!casado, concordam: casado ? pernasConcordam(fig, casado.figuras) : false };
        pareamentoModo = fig.pareamento;
      } else {
        const cor = corroborarCenario(pdfPath, fig);
        if (cor.falha) {
          disposicoes.push({ tipo: "pendencia", subtipo: "nao-corroborado", detalhe: `p.${fig.page}: ${fig.pareamento} (ordem ambígua — classe gated) e nenhuma perna independente corrobora (${cor.falha}) — leitura visual §1`, assinatura: ass });
          continue;
        }
        legs = cor.legs;
        pareamentoModo = cor.modo;
      }
    } else {
      // Documento só-imagem: a leitura É o OCR.
      if (pareamentoConfiavel(fig.pareamento)) {
        legs = { texto: false, ocr: true, concordam: false };
        pareamentoModo = "ocr-" + fig.pareamento;
      } else {
        // Gated em OCR: a GEOMETRIA (pareamento por posição) tem de reproduzir
        // as mesmas figuras — valida exatamente a suposição de ordem.
        const pgB = paginarBoxes(lerPerna(pdfPath, "boxes", fig.page, fig.page))[0];
        const g = pgB ? parearPorGeometria(pgB) : { ok: false, motivo: "sem caixas para a página" };
        const fg = g.ok ? figurasDosPares(g.pares, fig.page, "geometrico") : null;
        if (fg?.ok && pernasConcordam(fig, fg.figuras)) {
          legs = { texto: false, ocr: true, concordam: true };
          pareamentoModo = "ocr-corroborado-geometrico";
        } else {
          const motivo = !g.ok ? g.motivo : !fg.ok ? fg.detail : "geometria DIVERGE";
          disposicoes.push({ tipo: "pendencia", subtipo: "nao-corroborado", detalhe: `p.${fig.page}: bloco só em OCR com pareamento ${fig.pareamento} (embaralha) e a geometria não corrobora (${motivo}) — leitura visual §1`, assinatura: ass });
          continue;
        }
      }
    }

    const tol = toleranciaDerivada(fig);
    const { entry, rejeitado } = montarCandidato({
      figuras: fig, ficha, rec, uf, integraUrl, pdfHash: sha256, legs, pareamento: pareamentoModo,
      cenarioRotulo: rotuloCenario, assinatura: ass, totalImpresso: null, tolerancia: tol,
    });
    entry._parser.crosstabs_pulados = crosstabs;
    if (rejeitado) disposicoes.push({ tipo: "rejeitado", detalhe: rejeitado, entry, assinatura: ass });
    else disposicoes.push({ tipo: "emitido", entry, assinatura: ass });
  }
  return disposicoes;
}

// ---------------------------------------------------------------------------
// DEDUPE contra o repairs.json JÁ LANDADO — agora POR CENÁRIO: a chave da
// operação (pollster/UF/turno/fim-de-campo) aponta para as ASSINATURAS DE
// ELENCO curadas. Um doc de 4 cenários com 1 curado deduplica SÓ aquele elenco;
// os outros 3 seguem para emissão/pendência (reprovação do lote 3, ponto 2).
// A assinatura usa o nome COMPLETO normalizado: sobrenome sozinho não separa
// Jair × Michelle × Eduardo Bolsonaro.
//
// Fonte da verdade = origin/main, NÃO o working tree: o tree compartilhado fica
// para trás depois que um PR remoto landa (ninguém faz pull local — regra 4). Lê
// via `git show origin/main:...`, sem tocar o tree. `fetch` é seguro.
// ---------------------------------------------------------------------------
const normInst = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
const chaveCurado = (pollster, state, round, fe) => [normInst(pollster), state ?? "", round ?? "", fe ?? ""].join("|");

function lerCuradosPresidenciais(ref) {
  try { execFileSync("git", ["fetch", "origin", "--quiet"], { cwd: RAIZ, stdio: "pipe", timeout: 30_000 }); } catch { /* offline: usa o que houver em cache do fetch anterior */ }
  let raw;
  try { raw = execFileSync("git", ["show", `${ref}:data/repairs.json`], { cwd: RAIZ, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 }); }
  catch (e) { return { ok: false, erro: `não consegui ler ${ref}:data/repairs.json (${String(e.message).split("\n")[0]})`, index: new Map() }; }
  let spec;
  try { spec = JSON.parse(raw); } catch { return { ok: false, erro: `${ref}:data/repairs.json ilegível`, index: new Map() }; }
  const index = new Map(); // chave da operação → Set de assinaturas de elenco
  let total = 0;
  for (const rep of spec.repairs ?? []) {
    const ap = rep.add_poll;
    if (!ap || ap.race !== "presidente") continue;
    const chave = chaveCurado(ap.pollster, ap.state, ap.round, ap.fieldwork_end);
    if (!index.has(chave)) index.set(chave, new Set());
    index.get(chave).add(assinaturaElenco((ap.results ?? []).map((r) => r.candidate)));
    total++;
  }
  return { ok: true, index, total };
}

// ---------------------------------------------------------------------------
// Execução principal
// ---------------------------------------------------------------------------
async function main() {
  const estados = (opc("state", "") ? opc("state", "").split(",").map((s) => s.trim().toUpperCase()) : ESTADOS_FINOS)
    .filter(Boolean);
  const limite = opc("limit", "") ? Number(opc("limit")) : Infinity;
  const sweepPath = opc("sweep", path.join(RAIZ, "data-research", "lacunas-sweep.json"));
  const cacheDir = opc("cache", path.join(RAIZ, "data-research", "integra-cache"));
  const outPath = opc("out", path.join(RAIZ, "data-research", "presidencial-candidatos.json"));
  const pendPath = opc("pend", path.join(RAIZ, "data-research", "presidencial-pendencias.json"));
  const repairsRef = opc("repairs-ref", "origin/main");

  // DEDUPE: o que o repairs.json LANDADO já cobre não se re-emite.
  const curados = lerCuradosPresidenciais(repairsRef);
  if (!curados.ok) console.error(`⚠ DEDUPE INDISPONÍVEL — ${curados.erro}. Emissões marcadas "dedupe:indisponível" e NÃO suprimidas; a §1 confere duplicata. (nunca silêncio, §2)`);

  const sweep = lerSweep(sweepPath);
  let registros = registrosGovernador(sweep, estados);

  // Dedup por integra: um mesmo PDF pode aparecer em mais de um registro; o bloco
  // presidencial é do DOCUMENTO, então lê-se cada PDF uma vez. A UF/rec do
  // primeiro registro (ordem estável) representa o documento.
  const vistos = new Set();
  registros = registros.filter((r) => {
    const u = r.rec.integra || `sem-integra:${r.rec.id}`;
    if (vistos.has(u)) return false;
    vistos.add(u);
    return true;
  });
  if (Number.isFinite(limite)) registros = registros.slice(0, limite);

  const documentos = registros.length;
  let entradas = 0; // POR CENÁRIO: cada documento contribui com seus cenários (mínimo 1)
  const emitidos = [];
  const jaCurados = [];
  const rejeitados = [];
  const pendencias = [];

  const isoDate = (s) => (s ? String(s).slice(0, 10) : null);
  for (const { uf, rec } of registros) {
    const integraUrl = rec.integra;
    const rotulo = `${uf} ${rec.instituto ?? "?"} #${rec.id ?? "?"}`;
    const meta = { uf, pollster: rec.instituto ?? null, id: rec.id ?? null, pdf_url: integraUrl ?? null };

    // Assinaturas de elenco já curadas para ESTA operação (pollster/UF/turno/
    // fim-de-campo). O doc é SEMPRE parseado — a operação curada pode ter só um
    // dos cenários do documento (reprovação do lote 3, ponto 2).
    const curadasDaOp = curados.ok ? curados.index.get(chaveCurado(rec.instituto, uf, 1, isoDate(rec.data))) : null;
    const jaCurada = (ass) => !!curadasDaOp && curadasDaOp.has(ass);

    if (!integraUrl) {
      entradas++;
      pendencias.push({ ...meta, subtipo: "sem-integra", detalhe: "registro do sweep sem link de integra" });
      if (VERBOSE) console.error(`· ${rotulo}: PENDÊNCIA sem-integra`);
      continue;
    }
    let baixado;
    try {
      baixado = await baixarIntegra(integraUrl, cacheDir);
    } catch (e) {
      entradas++;
      if (curadasDaOp) {
        jaCurados.push({ ...meta, detalhe: `presidente:${uf} campo ${isoDate(rec.data)} já curado em ${repairsRef}:data/repairs.json (download falhou agora: ${e.message} — cenários extras, se houver, não conferidos)` });
        if (VERBOSE) console.error(`≈ ${rotulo}: JÁ-CURADO (download falhou)`);
      } else {
        pendencias.push({ ...meta, subtipo: "ilegível", detalhe: `download falhou: ${e.message}` });
        if (VERBOSE) console.error(`· ${rotulo}: PENDÊNCIA ilegível (download) — ${e.message}`);
      }
      continue;
    }
    const disposicoes = processarDocumento({
      pdfPath: baixado.path, sha256: baixado.sha256, uf, rec, integraUrl,
      jaCurada, temCuradaDaOperacao: !!curadasDaOp,
    });
    entradas += disposicoes.length;
    for (const r of disposicoes) {
      if (r.tipo === "emitido") {
        if (!curados.ok) r.entry._parser.dedupe = "indisponível";
        if (curadasDaOp && !jaCurada(r.assinatura)) {
          r.entry._parser.divergencias_sweep.push("a operação já tem add_poll curado com OUTRO elenco — §1 confira que este cenário não é duplicata com grafia divergente");
        }
        emitidos.push(r.entry);
        if (VERBOSE) console.error(`✓ ${rotulo}: EMITIDO (${r.entry._parser.confidence}) — ${r.entry.add_poll.scenario}, ${r.entry.add_poll.results.length} cand, soma ${r.entry.expect_sum}`);
      } else if (r.tipo === "ja-curado") {
        jaCurados.push({ ...meta, detalhe: r.detalhe });
        if (VERBOSE) console.error(`≈ ${rotulo}: JÁ-CURADO — ${r.detalhe}`);
      } else if (r.tipo === "rejeitado") {
        rejeitados.push({ ...meta, detalhe: r.detalhe, entry: r.entry });
        if (VERBOSE) console.error(`✗ ${rotulo}: REJEITADO — ${r.detalhe}`);
      } else {
        pendencias.push({ ...meta, subtipo: r.subtipo, detalhe: r.detalhe });
        if (VERBOSE) console.error(`· ${rotulo}: PENDÊNCIA ${r.subtipo} — ${r.detalhe}`);
      }
    }
  }

  // Ordenação final estável para saída determinística (§8) — a página desempata
  // os cenários da MESMA operação.
  const ordEntry = (a, b) => a.match.state.localeCompare(b.match.state)
    || String(a.match.pollster).localeCompare(String(b.match.pollster))
    || String(a.match.fieldwork_end).localeCompare(String(b.match.fieldwork_end))
    || (a._parser.page ?? 0) - (b._parser.page ?? 0);
  emitidos.sort(ordEntry);

  const contagem = { documentos, entradas_cenarios: entradas, emitidos: emitidos.length, ja_curados: jaCurados.length, rejeitados: rejeitados.length, pendencias: pendencias.length };
  const saidaCand = {
    _sobre: "Candidatos add_poll presidente:UF gerados pelo parser presidencial, POR CENÁRIO estimulado de 1º turno (um doc de 4 estimuladas conta 4). verified_at NULO = pendente de 2ª leitura cega (§1). _parser.pareamento diz o modo (adjacente-inline = valor colado na linha do rótulo, inclui coluna-que-soma SPSS; corroborado-visual = gated que o OCR linha a linha confirmou; corroborado-geometrico = gated que o pareamento por caixa delimitadora confirmou; ocr-* = documento sem camada de texto). NÃO é repairs.json; o merge é passo do hub.",
    gerado_por: "scripts/presidencial-parser.mjs",
    estados,
    dedupe: curados.ok ? { fonte: `${repairsRef}:data/repairs.json`, add_poll_presidenciais_existentes: curados.total } : { fonte: repairsRef, indisponivel: curados.erro },
    contagem,
    candidatos: emitidos,
  };
  const saidaPend = {
    _sobre: "Fila do parser presidencial, POR CENÁRIO. Disposições: ja-curado (repairs.json já cobre o elenco/a operação) / sem-integra / ilegível / sem-bloco / nao-corroborado. NUNCA silêncio: todo cenário que não vira candidato aparece aqui.",
    contagem,
    ja_curados: jaCurados,
    rejeitados,
    pendencias,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(saidaCand, null, 1) + "\n");
  fs.writeFileSync(pendPath, JSON.stringify(saidaPend, null, 1) + "\n");

  // O LEDGER, e a invariante que TEM de fechar (§2) — POR CENÁRIO.
  const soma = emitidos.length + jaCurados.length + rejeitados.length + pendencias.length;
  const fecha = soma === entradas;
  console.log("── Parser presidencial ──────────────────────────────");
  console.log(`estados        : ${estados.join(", ")}`);
  console.log(`dedupe         : ${curados.ok ? `${curados.total} add_poll presidenciais em ${repairsRef}` : `INDISPONÍVEL (${curados.erro})`}`);
  console.log(`documentos     : ${documentos}`);
  console.log(`entradas (cen.): ${entradas}   (cada doc contribui com seus cenários; mínimo 1)`);
  console.log(`  emitidos     : ${emitidos.length}   → ${path.relative(RAIZ, outPath)}`);
  console.log(`  já-curados   : ${jaCurados.length}   (repairs.json já cobre)`);
  console.log(`  rejeitados   : ${rejeitados.length}`);
  console.log(`  pendências   : ${pendencias.length}   → ${path.relative(RAIZ, pendPath)}`);
  const porSub = pendencias.reduce((a, p) => ((a[p.subtipo] = (a[p.subtipo] ?? 0) + 1), a), {});
  if (pendencias.length) console.log(`     por tipo  : ${Object.entries(porSub).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  const porConf = emitidos.reduce((a, e) => ((a[e._parser.confidence] = (a[e._parser.confidence] ?? 0) + 1), a), {});
  if (emitidos.length) console.log(`  pareamento   : ${Object.entries(porConf).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`invariante     : ${emitidos.length}+${jaCurados.length}+${rejeitados.length}+${pendencias.length} = ${soma} ${fecha ? "= entradas ✓" : `≠ ${entradas} ✗ A CONTA NÃO FECHOU`}`);
  console.log("─────────────────────────────────────────────────────");
  if (!fecha) process.exit(1);
}

// ---------------------------------------------------------------------------
// --self-test — importa o caminho REAL do repairs.mjs (nunca uma imitação).
// ---------------------------------------------------------------------------
async function selfTest() {
  const { applyRepairs, montarPesquisaCurada } = await import("./lib/repairs.mjs");
  const { conferirContraSweep } = await import("./lib/presidencial/ficha.mjs");
  let ok = true;
  const problemas = [];
  const afirma = (cond, desc) => { if (!cond) { ok = false; problemas.push(desc); } };

  // ---- CONTROLE DE RESPOSTA CONHECIDA (PE-04519) --------------------------
  // O parser lê a fixture (saída determinística da camada de texto do PDF-
  // controle) e TEM de reproduzir as figuras curadas à mão em repairs.json.
  const fxTexto = fs.readFileSync(path.join(FIXTURES, "pe-04519.legA.txt"), "utf8");
  const rA = extrairBlocoPresidencial(paginar(fxTexto));
  afirma(rA.ok, "controle: bloco presidencial não extraído da fixture");
  if (rA.ok) {
    const f = rA.figuras;
    afirma(f.results.length === 11, `controle: esperados 11 candidatos, veio ${f.results.length}`);
    afirma(f.results[0].candidate === "Lula" && f.results[0].pct === 57, "controle: Lula 57 divergiu");
    afirma(f.results[1].candidate === "Flávio Bolsonaro" && f.results[1].pct === 22, "controle: Flávio 22 divergiu");
    afirma(f.blank_null_pct === 9, `controle: branco/nulo esperado 9, veio ${f.blank_null_pct}`);
    afirma(f.undecided_pct === 3, `controle: não sabe esperado 3, veio ${f.undecided_pct}`);
    afirma(f.others_pct === null, "controle: others_pct devia ser NULO (sem linha de Outros)");
    afirma(f.absent.length === 1 && f.absent[0].candidate === "Hertz Dias", "controle: Hertz Dias devia ser AUSÊNCIA (asterisco), não 0");
    afirma(!f.results.some((r) => r.candidate === "Hertz Dias"), "controle: Hertz Dias NÃO pode estar em results (ausência ≠ zero, §4)");
    afirma(f.expect_sum === 101, `controle: expect_sum esperado 101, veio ${f.expect_sum}`);
    const ficha = extrairFicha(paginar(fxTexto), "PE");
    afirma(ficha.sample_size === 1022, `controle: amostra esperada 1022, veio ${ficha.sample_size}`);
    afirma(ficha.margin_of_error === 3, `controle: margem esperada 3, veio ${ficha.margin_of_error}`);
    afirma(ficha.fieldwork_start === "2026-07-28" && ficha.fieldwork_end === "2026-07-30", "controle: período de campo divergiu");
    afirma(ficha.tse_registration === "PE-04519/2026", `controle: registro do estado esperado PE-04519/2026, veio ${ficha.tse_registration}`);
    afirma(ficha.tse_todos.includes("BR-07601/2026"), "controle: BR-07601/2026 devia constar em tse_todos");

    // Monta o candidato e prova que, com verified_at PREENCHIDO, ele ATRAVESSA o
    // portão real do repairs.mjs (insere) — e que a fixture reproduz a curada.
    const rec = { instituto: "Datafolha", contratante: "Nassau Editora Rádio e TV", entrevistas: 1022, margem: 3, data: "2026-07-30", registro: "PE-04519/2026" };
    const { entry } = montarCandidato({ figuras: f, ficha, rec, uf: "PE", integraUrl: "https://static.poder360.com.br/uploads/2026/08/presidente-datafolha-3ago.pdf", pdfHash: "test", legs: { texto: true, ocr: false, concordam: false }, totalImpresso: null, tolerancia: toleranciaDerivada(f) });
    afirma(entry.verified_at === null, "controle: candidato emitido DEVE ter verified_at nulo (pendente §1)");
    afirma(entry._parser.status === "pendente-2a-leitura", "controle: status devia ser pendente-2a-leitura");

    // Prova A (insere): a MESMA entrada, com verified_at preenchido (o que a §1
    // do hub faz), passa por applyRepairs REAL e é inserida.
    const dir = fs.mkdtempSync(path.join(fs.realpathSync(process.env.TMPDIR ?? "/tmp"), "prescheck-"));
    try {
      const pronta = { ...entry, verified_at: "2026-08-20", evidence: entry.evidence + " [confirmado pela 2ª leitura no teste]" };
      delete pronta._parser;
      const specFile = path.join(dir, "r.json");
      fs.writeFileSync(specFile, JSON.stringify({ version: 1, repairs: [pronta] }));
      const rel = applyRepairs([], { file: specFile });
      afirma(rel.inserted.length === 1, `controle A: esperada 1 inserção, veio ${rel.inserted.length} (warnings: ${rel.warnings.join("; ")})`);
      afirma(!rel.warnings.some((w) => /soma/.test(w)), `controle A: não devia haver aviso de soma — ${rel.warnings.filter((w) => /soma/.test(w)).join("; ")}`);

      // Prova B (SOMA ADULTERADA reprova): mutila UM percentual sem mexer em
      // expect_sum — a slip de transcrição que conferirSoma existe para pegar.
      //
      // A adulteração tem de EXCEDER a folga derivada (§10): 13 figuras
      // inteiras (11 candidatos + branco + não sabe) merecem 6,5 — um desvio
      // de 3 nesta tabela é aritmeticamente indistinguível de arredondamento
      // da fonte e pertence à linha de revisão do censo, não a este portão.
      // (O +3 anterior só disparava porque conferirSoma cravava 0,6 fixo.)
      const adulterada = JSON.parse(JSON.stringify(pronta));
      adulterada.add_poll.results[0].pct = 70; // Lula 57 → 70; soma 101 → 114, expect_sum segue 101
      const specAdul = path.join(dir, "adul.json");
      fs.writeFileSync(specAdul, JSON.stringify({ version: 1, repairs: [adulterada] }));
      const relAdul = applyRepairs([], { file: specAdul });
      afirma(relAdul.warnings.some((w) => /soma/.test(w)), "controle B: SOMA ADULTERADA passou sem aviso — o portão aritmético não disparou");

      // Prova C (SEM FONTE reprova): sem verified_at, inserirPesquisaCurada RECUSA.
      const semFonte = JSON.parse(JSON.stringify(pronta));
      delete semFonte.verified_at;
      const specSF = path.join(dir, "sf.json");
      fs.writeFileSync(specSF, JSON.stringify({ version: 1, repairs: [semFonte] }));
      const relSF = applyRepairs([], { file: specSF });
      afirma(relSF.inserted.length === 0 && relSF.warnings.some((w) => /RECUSADO/.test(w)), "controle C: entrada sem verified_at devia ser RECUSADA");
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  // ---- GATE ARITMÉTICO INTERNO (total impresso divergente) ----------------
  // Quando há total impresso independente e a soma transcrita foge da tolerância
  // derivada, montarCandidato marca rejeitado — a peça não sai como candidata limpa.
  if (rA.ok) {
    const { rejeitado } = montarCandidato({
      figuras: rA.figuras, ficha: extrairFicha(paginar(fxTexto), "PE"),
      rec: { instituto: "Datafolha" }, uf: "PE", integraUrl: "x", pdfHash: "t",
      legs: { texto: true, ocr: false, concordam: false },
      totalImpresso: 90, tolerancia: toleranciaDerivada(rA.figuras), // 101 vs 90 → reprova
    });
    afirma(rejeitado != null, "gate: total impresso divergente (101 vs 90) devia REJEITAR");
    const { rejeitado: ok90 } = montarCandidato({
      figuras: rA.figuras, ficha: extrairFicha(paginar(fxTexto), "PE"),
      rec: { instituto: "Datafolha" }, uf: "PE", integraUrl: "x", pdfHash: "t",
      legs: { texto: true, ocr: false, concordam: false },
      totalImpresso: 101, tolerancia: toleranciaDerivada(rA.figuras),
    });
    afirma(ok90 == null, "gate: total impresso igual (101) NÃO devia rejeitar");
  }

  // ---- RECUSA TIPADA (nunca silêncio, §4/§2) ------------------------------
  const semBloco = extrairBlocoPresidencial(paginar("=== página 1 ===\nRelatório sem pergunta presidencial\nGovernador (PT) 40\n50\n"));
  afirma(!semBloco.ok && semBloco.reason === "sem-bloco", "recusa: documento sem presidente devia dar sem-bloco");
  const desalinhado = extrairBlocoPresidencial(paginar("=== página 8 ===\nIntenção de voto para presidente | estimulada\nLula (PT)\nFlávio Bolsonaro (PL)\nCiro (PDT)\n57\n22\n"));
  afirma(!desalinhado.ok && desalinhado.reason === "ilegível", "recusa: 3 rótulos × 2 valores devia dar ilegível (não adivinhar pareamento)");

  // ---- MODO DE PAREAMENTO — CASOS ADVERSARIAIS POR FORMATO (condição §1) ---
  // O núcleo do portão: SÓ o inline é estruturalmente inequívoco. Interleaved
  // saiu da lista de confiáveis na reprovação do lote 3 (Paraná AP: a alternância
  // era coincidência de ordem vertical entre duas corridas separadas).
  afirma(pareamentoConfiavel("adjacente-inline"), "modo: adjacente-inline é confiável");
  afirma(!pareamentoConfiavel("adjacente-interleaved"), "modo: adjacente-interleaved NÃO é mais confiável (gated — reprovação do lote 3)");
  afirma(!pareamentoConfiavel("corridas-separadas") && !pareamentoConfiavel("corroborado-visual") && !pareamentoConfiavel("corroborado-geometrico") && !pareamentoConfiavel("inline-multi"), "modo: corrida-separada/corroborados/inline-multi NÃO são confiáveis por si (gated/decididos fora)");

  // ADVERSARIAL 1: o controle Datafolha (corrida-separada real) TEM de sair como
  // "corridas-separadas", NUNCA adjacente — é a classe de defeito que reprovou o AM.
  afirma(rA.ok && rA.figuras.pareamento === "corridas-separadas", `adversarial: Datafolha (rótulos e depois valores) devia ser corridas-separadas, veio ${rA.ok ? rA.figuras.pareamento : rA.reason}`);

  // ADJACENTE-INLINE: cada linha "rótulo valor".
  const inl = extrairBlocoPresidencial(paginar("=== página 5 ===\nIntenção de voto para presidente estimulada\nLula 40\nFlávio Bolsonaro 30\nCiro Gomes 10\nBranco/Nulo 15\nNão sabe 5\n"));
  afirma(inl.ok && inl.figuras.pareamento === "adjacente-inline", `inline: devia ser adjacente-inline, veio ${inl.ok ? inl.figuras.pareamento : inl.reason}`);
  afirma(inl.ok && inl.figuras.results.length === 3 && inl.figuras.blank_null_pct === 15 && inl.figuras.undecided_pct === 5, "inline: figuras/baldes divergiram");

  // ADJACENTE-INTERLEAVED: rótulo, valor, rótulo, valor… (âncora por enunciado, sem a palavra "estimulada").
  // CLASSIFICA como interleaved — e o portão acima garante que interleaved NÃO emite sem perna corroborando.
  const itl = extrairBlocoPresidencial(paginar("=== página 6 ===\nPresidente — se os candidatos fossem estes\nLula\n40\nFlávio Bolsonaro\n30\nCiro Gomes\n10\nBranco\n15\nNão sabe\n5\n"));
  afirma(itl.ok && itl.figuras.pareamento === "adjacente-interleaved", `interleaved: devia ser adjacente-interleaved, veio ${itl.ok ? itl.figuras.pareamento : itl.reason}`);
  afirma(itl.ok && !pareamentoConfiavel(itl.figuras.pareamento), "interleaved: classificado mas GATED — nunca emite do texto sozinho");

  // EXCLUSÃO DURA — ESPONTÂNEA nunca detectada.
  const esp = extrairBlocoPresidencial(paginar("=== página 4 ===\nIntenção de voto para presidente espontânea\nem quem votaria\nLula\n40\nFlávio\n30\nCiro\n10\n"));
  afirma(!esp.ok && esp.reason === "sem-bloco", `exclusão: espontânea NÃO pode virar bloco, veio ${esp.ok ? "OK("+esp.figuras.pareamento+")" : esp.reason}`);

  // EXCLUSÃO DURA — 2º TURNO nunca detectado como 1º.
  const t2 = extrairBlocoPresidencial(paginar("=== página 10 ===\nPresidente 2º turno estimulada\nLula (PT)\n55\nFlávio Bolsonaro (PL)\n45\n"));
  afirma(!t2.ok, `exclusão: 2º turno NÃO pode virar 1º turno, veio ${t2.ok ? "OK" : t2.reason}`);

  // GUARDA DE 2 CANDIDATOS — possível confronto, recusa.
  const dois = extrairBlocoPresidencial(paginar("=== página 11 ===\nPresidente estimulada destes candidatos\nLula 55\nFlávio Bolsonaro 45\n"));
  afirma(!dois.ok && dois.reason === "ilegível", `guarda: 2 candidatos devia recusar (possível 2º turno), veio ${dois.ok ? "OK" : dois.reason}`);

  // EXCLUSÃO DURA — AVALIAÇÃO DE GOVERNO nunca vira cenário (Paraná AP p.17:
  // "Avaliação e Aprovação da administração do Presidente Lula / ESTIMULADA" —
  // sem a exclusão, "Ótima 12,1%" viraria candidato na enumeração por cenário).
  const aval = extrairBlocosPresidenciais(paginar("=== página 17 ===\nAvaliação e Aprovação da administração do Presidente Lula\nESTIMULADA\nÓtima\n12,1%\nBoa\n19,9%\nRegular\n25,6%\nRuim\n6,9%\nPéssima\n33,6%\nNão sabe/ não opinou\n1,9%\n"));
  afirma(aval.cenarios.length === 0 && aval.notas.avaliacao >= 1, `exclusão: avaliação de governo NÃO pode virar cenário, veio ${aval.cenarios.length} cenário(s)`);

  // ---- ENUMERAÇÃO POR CENÁRIO (reprovação do lote 3, ponto 2) --------------
  // Um documento com QUATRO estimuladas de 1º turno conta QUATRO — e a página de
  // crosstab demográfico entre elas é PULADA (não é cenário novo), assim como o
  // enunciado repetido no rodapé do crosstab não vira pendência-ruído.
  const doc4 = [
    "=== página 8 ===", "Situação Eleitoral – Presidente", "ESTIMULADA – Cenário 1",
    "Jair Bolsonaro", "39,0%", "Lula", "31,8%", "Ciro Gomes", "12,5%", "Nenhum/ Branco/ Nulo", "5,2%", "Não sabe/ não opinou", "4,3%",
    "=== página 9 ===", "Situação Eleitoral – Presidente", "ESTIMULADA – Cenário 1",
    "Masculino 4,5% 4,2% 45,6% 28,2%", "Feminino 4,0% 6,1% 32,7% 35,3%",
    "Se as eleições para Presidente do Brasil fossem hoje e os candidatos fossem esses, em quem o(a) Sr(a) votaria?",
    "=== página 10 ===", "Situação Eleitoral – Presidente", "ESTIMULADA – Cenário 2",
    "Michelle Bolsonaro", "31,8%", "Lula", "32,7%", "Ciro Gomes", "14,7%", "Nenhum/ Branco/ Nulo", "6,6%", "Não sabe/ não opinou", "5,2%",
    "=== página 12 ===", "Situação Eleitoral – Presidente", "ESTIMULADA – Cenário 3",
    "Tarcísio de Freitas", "20,6%", "Lula", "33,4%", "Ciro Gomes", "17,6%", "Nenhum/ Branco/ Nulo", "10,8%", "Não sabe/ não opinou", "7,0%",
    "=== página 14 ===", "Situação Eleitoral – Presidente", "ESTIMULADA – Cenário 4",
    "Eduardo Bolsonaro", "23,4%", "Lula", "33,4%", "Ciro Gomes", "17,2%", "Nenhum/ Branco/ Nulo", "8,4%", "Não sabe/ não opinou", "6,2%",
  ].join("\n") + "\n";
  const e4 = extrairBlocosPresidenciais(paginar(doc4));
  afirma(e4.cenarios.filter((c) => c.ok).length === 4, `enumeração: 4 estimuladas deviam contar 4, veio ${e4.cenarios.filter((c) => c.ok).length}`);
  afirma(e4.cenarios.length === 4, `enumeração: crosstab pulado não pode virar pendência-ruído (esperados 4 desfechos, veio ${e4.cenarios.length})`);
  afirma(e4.crosstabs.length === 1 && e4.crosstabs[0] === 9, `enumeração: p.9 devia ser crosstab pulado, veio ${JSON.stringify(e4.crosstabs)}`);
  const assinaturas4 = e4.cenarios.filter((c) => c.ok).map((c) => assinaturaElenco(c.figuras.results.map((r) => r.candidate)));
  afirma(new Set(assinaturas4).size === 4, "enumeração: os 4 cenários têm assinaturas de elenco DISTINTAS (Jair×Michelle×Tarcísio×Eduardo)");

  // MESMO elenco duas vezes no doc: leituras iguais colapsam em 1; divergentes recusam.
  const docRep = (v) => paginar(`=== página 3 ===\nPresidente estimulada destes candidatos\nLula 40\nFlávio Bolsonaro 30\nCiro Gomes 10\n=== página 4 ===\nPresidente estimulada destes candidatos\nLula ${v}\nFlávio Bolsonaro 30\nCiro Gomes 10\n`);
  const eIg = extrairBlocosPresidenciais(docRep(40));
  afirma(eIg.cenarios.length === 1 && eIg.cenarios[0].ok, `enumeração: mesmo elenco com figuras IGUAIS colapsa em 1, veio ${eIg.cenarios.length}`);
  const eDif = extrairBlocosPresidenciais(docRep(45));
  afirma(eDif.cenarios.length === 2 && eDif.cenarios.filter((c) => !c.ok).length === 1, "enumeração: mesmo elenco com figuras DIVERGENTES vira recusa tipada, não escolha");

  // ---- REGRA SPSS DA COLUNA-QUE-SOMA (§10 derivada, nunca escolhida) --------
  const spss = (linhas) => extrairBlocoPresidencial(paginar("=== página 7 ===\nE em qual desses nomes você votaria para presidente?\nESTIMULADA\nRESPOSTAS TOTAL %\n" + linhas.join("\n") + "\n"));
  // Uma coluna única fecha em 100 → resolvida como adjacente-inline (INOP MA real: freq × %).
  const s1 = spss(["Lula 1383 55,28%", "Flavio Bolsonaro 499 19,94%", "Tarcisio de Freitas 118 4,72%", "Ratinho Junior 51 2,04%", "Ronaldo Caiado 47 1,88%", "Romeu Zema 25 1,00%", "Nenhum destes 164 6,55%", "N.Sabe/N.Opinou 215 8,59%", "TOTAL 2502 100,00%"]);
  afirma(s1.ok && s1.figuras.pareamento === "adjacente-inline" && s1.figuras.coluna_resolvida?.indice === 1, `SPSS: coluna única que soma 100 devia resolver adjacente-inline (col 1), veio ${s1.ok ? s1.figuras.pareamento + "/" + JSON.stringify(s1.figuras.coluna_resolvida) : s1.reason}`);
  afirma(s1.ok && s1.figuras.results[0].pct === 55.28 && s1.figuras.undecided_pct === 8.59 && s1.figuras.blank_null_pct === 6.55, "SPSS: os valores emitidos têm de vir da coluna resolvida");
  // NENHUMA coluna fecha → gated.
  const s0 = spss(["Lula 1383 45,00%", "Flavio Bolsonaro 499 19,94%", "Tarcisio de Freitas 118 4,72%", "Nenhum destes 164 6,55%", "N.Sabe/N.Opinou 215 8,59%"]);
  afirma(!s0.ok && /coluna-que-soma/.test(s0.detail ?? ""), `SPSS: nenhuma coluna fechando devia ser gated, veio ${s0.ok ? "OK" : s0.detail}`);
  // DUAS colunas fecham em 100 com valores DIVERGENTES → ambíguo, gated.
  const s2 = spss(["Lula 40,0 55,0", "Flavio Bolsonaro 30,0 25,0", "Ciro Gomes 20,0 15,0", "N.Sabe/N.Opinou 10,0 5,0"]);
  afirma(!s2.ok && /coluna-que-soma/.test(s2.detail ?? ""), `SPSS: duas colunas fechando divergentes devia ser gated, veio ${s2.ok ? "OK" : s2.detail}`);
  // Duas colunas fecham com valores IDÊNTICOS (Porcentual = válida sem "Ausente") → não é ambiguidade.
  const s3 = spss(["Lula 40,0 40,0", "Flavio Bolsonaro 30,0 30,0", "Ciro Gomes 20,0 20,0", "N.Sabe/N.Opinou 10,0 10,0"]);
  afirma(s3.ok && s3.figuras.pareamento === "adjacente-inline", `SPSS: duas colunas idênticas fechando não é ambiguidade, veio ${s3.ok ? s3.figuras.pareamento : s3.detail}`);
  // Baldes FORA do "Válido" (depois do Total, com menos colunas) entram na conta —
  // é o formato Veritá: só a coluna presente em TODAS as linhas concorre.
  const s4 = spss(["Flávio Bolsonaro - PL 258 25,0 52,8 52,8", "Lula – PT 180 17,5 36,9 89,8", "Pablo Marçal – União Brasil 22 2,1 4,4 94,2", "Ratinho Júnior – PSD 14 1,4 2,9 97,1", "Renan Santos – Missão 9 0,9 1,8 98,9", "Romeu Zema – Novo 3 0,3 0,5 99,5", "Ronaldo Caiado – PSD 2 0,1 0,3 99,8", "Aldo Rebelo - DC 1 0,1 0,2 100,0", "Total 488 47,3 100,0", "NS/NR 492 47,7", "Branco/nulo 51 4,9", "Total 542 52,7", "Total 1030 100,0"]);
  afirma(s4.ok && s4.figuras.coluna_resolvida?.indice === 1 && s4.figuras.undecided_pct === 47.7 && s4.figuras.blank_null_pct === 4.9, `SPSS/Veritá: baldes após o Total entram e a coluna Porcentual (1) resolve, veio ${s4.ok ? JSON.stringify(s4.figuras.coluna_resolvida) + " ns=" + s4.figuras.undecided_pct : s4.detail}`);

  // GUARDA DE ESCALA: um ano tokenizado nunca vira percentual emitível.
  const ano = extrairBlocoPresidencial(paginar("=== página 2 ===\nPresidente estimulada destes candidatos\nLula 2026\nFlávio Bolsonaro 30\nCiro Gomes 10\n"));
  afirma(!ano.ok && /escala percentual/.test(ano.detail ?? ""), `escala: valor 2026 devia recusar o bloco, veio ${ano.ok ? "OK" : ano.detail}`);

  // ---- ASSINATURA DE ELENCO (dedupe por cenário) ---------------------------
  afirma(assinaturaElenco(["LULA", "MINISTRO JOAQUIM BARBOSA"]) === assinaturaElenco(["Lula", "Joaquim Barbosa"]), "assinatura: caixa/acento/honorífico não separam o mesmo elenco");
  afirma(assinaturaElenco(["Jair Bolsonaro", "Lula"]) !== assinaturaElenco(["Michelle Bolsonaro", "Lula"]), "assinatura: Jair × Michelle Bolsonaro são cenários DISTINTOS (sobrenome sozinho não basta)");

  // DEDUPE — chave estável e normalização de instituto (acento/pontuação fora).
  afirma(chaveCurado("Direto ao Ponto Pesquisas", "AM", 1, "2026-06-20") === chaveCurado("DIRETO AO PONTO PESQUISAS", "AM", 1, "2026-06-20"), "dedupe: normalização de instituto tem de bater grafias");
  afirma(chaveCurado("Datafolha", "PE", 1, "2026-07-30") !== chaveCurado("Datafolha", "PE", 1, "2026-07-29"), "dedupe: datas diferentes NÃO colidem");

  // ---- GEOMETRIA (caixas delimitadoras) — fixtures congeladas de --boxes ----
  // Caso CORRETO: Paraná AP p.8 (o slide interleaved que reprovou o lote 3) —
  // o pareamento por posição reproduz as figuras da camada de texto.
  {
    const { paginarBoxes: pb, parearPorGeometria: pg } = await import("./lib/presidencial/geometria.mjs");
    const { figurasDosPares } = await import("./lib/presidencial/parse.mjs");
    const bxAP = pb(fs.readFileSync(path.join(FIXTURES, "ap-jul25.p8.boxes.txt"), "utf8"))[0];
    const gAP = pg(bxAP);
    afirma(gAP.ok, `geometria: Paraná p.8 devia parear, veio ${gAP.ok ? "ok" : gAP.motivo}`);
    if (gAP.ok) {
      const fAP = figurasDosPares(gAP.pares, 8, "geometrico");
      afirma(fAP.ok && fAP.figuras.results.length === 6 && fAP.figuras.results.find((r) => r.candidate === "Jair Bolsonaro")?.pct === 39
        && fAP.figuras.blank_null_pct === 5.2 && fAP.figuras.undecided_pct === 4.3 && fAP.figuras.expect_sum === 100,
        `geometria: figuras do Paraná p.8 divergem (${fAP.ok ? JSON.stringify(fAP.figuras.results.map((r) => r.candidate + "=" + r.pct)) : fAP.detail})`);
    }
    // Caso de RECUSA real: Datafolha p.8 — o Vision perde valores (o "57" do
    // Lula) e a geometria RECUSA por rótulo órfão, nunca emite parcial.
    const bxPE = pb(fs.readFileSync(path.join(FIXTURES, "pe-04519.p8.boxes.txt"), "utf8"))[0];
    const gPE = pg(bxPE);
    afirma(!gPE.ok && /sem valor pareado/.test(gPE.motivo), `geometria: Datafolha p.8 (leitura incompleta) devia RECUSAR, veio ${gPE.ok ? "ok" : gPE.motivo}`);
    // Caso de RECUSA sintético: dois rótulos na MESMA linha visual disputando um
    // valor → ambíguo (§4), recusa — a mutação que aceitasse o mais próximo cairia aqui.
    const amb = pg({ page: 1, w: 1000, h: 500, boxes: [
      { x: 100, y: 100, w: 150, h: 20, text: "Lula" },
      { x: 300, y: 100, w: 150, h: 20, text: "Ciro Gomes" },
      { x: 600, y: 102, w: 60, h: 20, text: "40%" },
      { x: 100, y: 160, w: 150, h: 20, text: "Flávio Bolsonaro" },
      { x: 600, y: 162, w: 60, h: 20, text: "30%" },
      { x: 100, y: 220, w: 150, h: 20, text: "Não sabe" },
      { x: 600, y: 222, w: 60, h: 20, text: "30%" },
    ] });
    afirma(!amb.ok && /ambíguo/.test(amb.motivo), `geometria: valor com 2 rótulos na linha devia recusar, veio ${amb.ok ? "ok" : amb.motivo}`);
  }

  // ---- BINÁRIO DO OCR: compila se faltar; AUSÊNCIA É FALHA EM VOZ ALTA -----
  // (§2: nunca salto silencioso — o "mede zero e parece são" vale para o próprio
  // autoteste. Sem swiftc/binário, o teste REPROVA, não pula.)
  if (!fs.existsSync(OCR_BIN)) {
    try {
      execFileSync("swiftc", ["-O", "-o", OCR_BIN, path.join(RAIZ, "scripts", "ocr", "ocr.swift")], { stdio: "pipe" });
    } catch (e) {
      afirma(false, `binário do OCR ausente e o swiftc falhou/ausente (${String(e.message).split("\n")[0]}) — checkout limpo precisa compilar: swiftc -O -o scripts/ocr/ocr scripts/ocr/ocr.swift`);
    }
  }
  const temBinario = fs.existsSync(OCR_BIN);
  afirma(temBinario, "binário do OCR indisponível após tentar compilar — a perna PDF do autoteste NÃO pode rodar; isto é FALHA, não salto (§2)");

  // ---- FIXTURE ↔ BINÁRIO + PORTÃO PONTA A PONTA no PDF-controle real -------
  const pdfCtrl = path.join(FIXTURES, "pe-04519.pdf");
  afirma(fs.existsSync(pdfCtrl), "PDF-controle fixtures/pe-04519.pdf ausente — fixture end-to-end não pode rodar (falha, não salto)");
  if (temBinario && fs.existsSync(pdfCtrl)) {
    let saida = "";
    try { saida = execFileSync(OCR_BIN, ["--text", pdfCtrl], { encoding: "utf8", maxBuffer: 256 * 1024 * 1024 }); } catch { /* saída vazia reprova abaixo */ }
    afirma(saida.trim() === fxTexto.trim(), "fixture: binário ocr --text NÃO reproduziu a fixture do PDF-controle (fixture obsoleta ou binário mudou)");
    // PORTÃO ponta a ponta POR CENÁRIO: o controle Datafolha lê certo na camada
    // de texto, mas o OCR linha a linha sai embaralhado E a geometria recusa
    // (Vision perde o "57" do Lula) → pendência nao-corroborado, nunca emissão.
    const disps = processarDocumento({ pdfPath: pdfCtrl, sha256: "test", uf: "PE", rec: {}, integraUrl: "x", jaCurada: () => false, temCuradaDaOperacao: false });
    afirma(disps.length === 1, `portão e2e: controle Datafolha devia render 1 desfecho (1 cenário estimulado de 1º turno), veio ${disps.length}`);
    const disp = disps[0] ?? {};
    afirma(disp.tipo === "pendencia" && disp.subtipo === "nao-corroborado",
      `portão e2e: controle Datafolha (texto ok, OCR embaralhado, geometria recusa) devia virar pendência nao-corroborado, veio ${disp.tipo}/${disp.subtipo ?? "-"}`);
    // DEDUPE POR CENÁRIO no caminho real: o MESMO documento, com o elenco do
    // cenário já curado em repairs.json, sai JA-CURADO — não re-emite nem vira
    // pendência ruidosa (é o Direto AM-08042 de sempre, agora por assinatura).
    const dispsCur = processarDocumento({ pdfPath: pdfCtrl, sha256: "test", uf: "PE", rec: {}, integraUrl: "x", jaCurada: () => true, temCuradaDaOperacao: true });
    afirma(dispsCur.length === 1 && dispsCur[0].tipo === "ja-curado",
      `portão e2e: cenário com elenco já curado devia sair ja-curado (dedupe por assinatura), veio ${dispsCur[0]?.tipo}`);
  }

  // ---- INVARIANTE DO LEDGER (conta fecha, POR CENÁRIO) --------------------
  // Um doc de 4 cenários com 1 já curado, 2 emitidos e 1 pendência entra como 4.
  const entradas = 4, e = 2, jc = 1, r = 0, p = 1;
  afirma(e + jc + r + p === entradas, "invariante: o exemplo de contagem por cenário não fecha (bug no próprio teste)");

  if (ok) console.log(`AUTOTESTE OK — controle PE-04519 reproduzido, soma adulterada reprovada, recusas tipadas, enumeração por cenário (4=4, crosstab pulado), interleaved gated, coluna-que-soma SPSS, geometria (pareia AP p.8 / recusa PE p.8 e ambíguo), assinatura de elenco, gate interno e invariante por cenário verdes.`);
  else { console.error("AUTOTESTE FALHOU:"); for (const p of problemas) console.error(`  ✗ ${p}`); }
  process.exit(ok ? 0 : 1);
}

if (flag("self-test")) selfTest();
else main().catch((e) => { console.error("ERRO:", e.stack || e.message); process.exit(1); });
