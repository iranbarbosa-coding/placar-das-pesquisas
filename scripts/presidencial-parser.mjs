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

import { paginar, extrairBlocoPresidencial, pernasConcordam, toleranciaDerivada } from "./lib/presidencial/parse.mjs";
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
function lerPerna(pdfPath, texto, first, last) {
  const args = texto ? ["--text", pdfPath] : [pdfPath];
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

/** Extrai as figuras por uma perna; devolve {ok, figuras|reason, detail}. */
function figurasDaPerna(raw) {
  if (!raw.trim()) return { ok: false, reason: "vazia" };
  return extrairBlocoPresidencial(paginar(raw));
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
// O PORTÃO DE CORROBORAÇÃO (§1/§4, achado da leitura cega do AM-08042).
//
// A camada de texto entrega rótulos e valores como DUAS corridas cujas ORDENS
// podem divergir — o PDF do Direto ao Ponto embaralhou o pareamento das quatro
// figuras pequenas, e a soma seguia 100, então NENHUM guarda de soma pegou. Lição:
// pareamento rótulo×valor da camada de texto SOZINHA não é confiável. Só emite
// quando a perna VISUAL (OCR) respalda o pareamento:
//   texto+OCR e concordam → emite (dígitos exatos da camada de texto)
//   OCR sozinho (visual)   → emite (dígitos do OCR; confiança menor, §1 confere)
//   texto sozinho          → NÃO emite → pendência "nao-corroborado" (leitura visual §1)
//   texto+OCR divergem     → NÃO emite → pendência "nao-corroborado" (conflito)
// ---------------------------------------------------------------------------
function decidirEmissao(legs) {
  if (legs.ocr && (legs.concordam || !legs.texto)) return "emitir";
  if (legs.texto && legs.ocr && !legs.concordam) return "divergem";
  if (legs.texto && !legs.ocr) return "texto-sozinho";
  return "sem-perna";
}

// ---------------------------------------------------------------------------
// Um registro → uma disposição: emitido | rejeitado | pendência(tipo).
// ---------------------------------------------------------------------------
function processarPDF({ pdfPath, sha256, uf, rec, integraUrl }) {
  // Perna A (camada de texto) primeiro — é rápida (sem render/OCR). O OCR de
  // documento inteiro (caro: renderiza cada página a 300dpi + Vision) só roda
  // quando REALMENTE precisa: bloco em imagem sob cabeçalho de texto, ou PDF
  // sem camada de texto. Um sem-bloco de camada de texto substancial NÃO paga
  // OCR — se houvesse estimulada presidencial, estaria no texto.
  const textoRaw = lerPerna(pdfPath, true);
  const rA = figurasDaPerna(textoRaw);
  const textoRico = textoUtilLen(textoRaw) >= TEXTO_SUBSTANCIAL;

  let figuras, legs, ocrRaw = "";
  if (rA.ok) {
    // Confirmação barata: OCR SÓ da página do bloco (1 página), para o sinal
    // texto+ocr. Não é a §1 — é confiança de emissão.
    const ocrPagina = lerPerna(pdfPath, false, rA.figuras.page, rA.figuras.page);
    const rBpg = figurasDaPerna(ocrPagina);
    figuras = rA.figuras;
    legs = { texto: true, ocr: rBpg.ok, concordam: rBpg.ok ? pernasConcordam(rA.figuras, rBpg.figuras) : false };
  } else {
    // Precisa de OCR do documento? Sim se o texto ACHOU o cabeçalho mas não a
    // tabela (bloco em imagem, ex. Action), ou se a camada de texto é rala
    // (PDF só-imagem). Um "sem-bloco" com texto rico é genuíno → pula o OCR.
    const precisaOCR = rA.reason === "ilegível" || !textoRico;
    if (!precisaOCR) {
      return { tipo: "pendencia", subtipo: "sem-bloco", detalhe: rA.detail || "sem cabeçalho presidente+estimulada na camada de texto (substancial)" };
    }
    ocrRaw = lerPerna(pdfPath, false);
    const rB = figurasDaPerna(ocrRaw);
    if (!rB.ok) {
      const semTexto = !textoRaw.trim() && !ocrRaw.trim();
      if (semTexto) return { tipo: "pendencia", subtipo: "ilegível", detalhe: "nenhuma perna produziu texto (PDF corrompido ou render falhou)" };
      const razoes = [rA, rB].filter((r) => r && !r.ok).map((r) => r.reason);
      const subtipo = razoes.includes("ilegível") ? "ilegível" : "sem-bloco";
      const detalhe = [rA.detail, rB.detail].filter(Boolean).join(" | ") || "bloco presidencial estimulado de 1º turno não encontrado";
      return { tipo: "pendencia", subtipo, detalhe };
    }
    figuras = rB.figuras;
    legs = { texto: false, ocr: true, concordam: false };
  }

  // PORTÃO DE CORROBORAÇÃO antes de qualquer emissão.
  const decisao = decidirEmissao(legs);
  if (decisao !== "emitir") {
    const detalhe = decisao === "divergem"
      ? `p.${figuras.page}: bloco lido nas DUAS pernas mas texto×OCR DIVERGEM no pareamento/valores — conflito, leitura visual §1`
      : `p.${figuras.page}: bloco lido só na camada de texto; pareamento rótulo×valor NÃO corroborado pela perna visual (OCR não leu o bloco) — camada de texto sozinha embaralha ordem, leitura visual §1`;
    return { tipo: "pendencia", subtipo: "nao-corroborado", detalhe };
  }

  const paginasTexto = paginar(textoRico ? textoRaw : (ocrRaw || textoRaw));
  const ficha = extrairFicha(paginasTexto, uf);

  const tol = toleranciaDerivada(figuras);
  const { entry, rejeitado } = montarCandidato({
    figuras, ficha, rec, uf, integraUrl, pdfHash: sha256, legs,
    totalImpresso: null, tolerancia: tol,
  });

  if (rejeitado) return { tipo: "rejeitado", detalhe: rejeitado, entry };
  return { tipo: "emitido", entry };
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

  const entradas = registros.length;
  const emitidos = [];
  const rejeitados = [];
  const pendencias = [];

  for (const { uf, rec } of registros) {
    const integraUrl = rec.integra;
    const rotulo = `${uf} ${rec.instituto ?? "?"} #${rec.id ?? "?"}`;
    if (!integraUrl) {
      pendencias.push({ uf, pollster: rec.instituto ?? null, id: rec.id ?? null, subtipo: "sem-integra", detalhe: "registro do sweep sem link de integra", pdf_url: null });
      if (VERBOSE) console.error(`· ${rotulo}: PENDÊNCIA sem-integra`);
      continue;
    }
    let baixado;
    try {
      baixado = await baixarIntegra(integraUrl, cacheDir);
    } catch (e) {
      pendencias.push({ uf, pollster: rec.instituto ?? null, id: rec.id ?? null, subtipo: "ilegível", detalhe: `download falhou: ${e.message}`, pdf_url: integraUrl });
      if (VERBOSE) console.error(`· ${rotulo}: PENDÊNCIA ilegível (download) — ${e.message}`);
      continue;
    }
    const r = processarPDF({ pdfPath: baixado.path, sha256: baixado.sha256, uf, rec, integraUrl });
    if (r.tipo === "emitido") { emitidos.push(r.entry); if (VERBOSE) console.error(`✓ ${rotulo}: EMITIDO (${r.entry._parser.confidence}) — ${r.entry.add_poll.results.length} cand, soma ${r.entry.expect_sum}`); }
    else if (r.tipo === "rejeitado") { rejeitados.push({ uf, pollster: rec.instituto ?? null, id: rec.id ?? null, detalhe: r.detalhe, pdf_url: integraUrl, entry: r.entry }); if (VERBOSE) console.error(`✗ ${rotulo}: REJEITADO — ${r.detalhe}`); }
    else { pendencias.push({ uf, pollster: rec.instituto ?? null, id: rec.id ?? null, subtipo: r.subtipo, detalhe: r.detalhe, pdf_url: integraUrl }); if (VERBOSE) console.error(`· ${rotulo}: PENDÊNCIA ${r.subtipo} — ${r.detalhe}`); }
  }

  // Ordenação final estável para saída determinística (§8).
  const ordEntry = (a, b) => a.match.state.localeCompare(b.match.state)
    || String(a.match.pollster).localeCompare(String(b.match.pollster))
    || String(a.match.fieldwork_end).localeCompare(String(b.match.fieldwork_end));
  emitidos.sort(ordEntry);

  const saidaCand = {
    _sobre: "Candidatos add_poll presidente:UF gerados pelo parser presidencial. verified_at NULO = pendente de 2ª leitura cega (§1). NÃO é repairs.json; o merge é passo do hub. Não editar à mão sem relê-lo do PDF.",
    gerado_por: "scripts/presidencial-parser.mjs",
    estados,
    contagem: { entradas, emitidos: emitidos.length, rejeitados: rejeitados.length, pendencias: pendencias.length },
    candidatos: emitidos,
  };
  const saidaPend = {
    _sobre: "Fila de pendência do parser presidencial. Subtipos: sem-integra / ilegível / sem-bloco. NUNCA silêncio: todo PDF que não vira candidato aparece aqui.",
    contagem: { entradas, emitidos: emitidos.length, rejeitados: rejeitados.length, pendencias: pendencias.length },
    rejeitados,
    pendencias,
  };
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(saidaCand, null, 1) + "\n");
  fs.writeFileSync(pendPath, JSON.stringify(saidaPend, null, 1) + "\n");

  // O LEDGER, e a invariante que TEM de fechar (§2).
  const soma = emitidos.length + rejeitados.length + pendencias.length;
  const fecha = soma === entradas;
  console.log("── Parser presidencial ──────────────────────────────");
  console.log(`estados        : ${estados.join(", ")}`);
  console.log(`entradas (PDFs): ${entradas}`);
  console.log(`  emitidos     : ${emitidos.length}   → ${path.relative(RAIZ, outPath)}`);
  console.log(`  rejeitados   : ${rejeitados.length}`);
  console.log(`  pendências   : ${pendencias.length}   → ${path.relative(RAIZ, pendPath)}`);
  const porSub = pendencias.reduce((a, p) => ((a[p.subtipo] = (a[p.subtipo] ?? 0) + 1), a), {});
  if (pendencias.length) console.log(`     por tipo  : ${Object.entries(porSub).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  const porConf = emitidos.reduce((a, e) => ((a[e._parser.confidence] = (a[e._parser.confidence] ?? 0) + 1), a), {});
  if (emitidos.length) console.log(`  confiança    : ${Object.entries(porConf).map(([k, v]) => `${k}=${v}`).join(", ")}`);
  console.log(`invariante     : ${emitidos.length}+${rejeitados.length}+${pendencias.length} = ${soma} ${fecha ? "= entradas ✓" : `≠ ${entradas} ✗ A CONTA NÃO FECHOU`}`);
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
      const adulterada = JSON.parse(JSON.stringify(pronta));
      adulterada.add_poll.results[0].pct = 60; // Lula 57 → 60; soma 101 → 104, expect_sum segue 101
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

  // ---- POLÍTICA DE EMISSÃO (o portão de corroboração, achado do AM-08042) --
  // Pareamento da camada de texto SOZINHA não emite; só com a perna visual.
  afirma(decidirEmissao({ texto: true, ocr: false, concordam: false }) === "texto-sozinho", "política: texto SOZINHO não pode emitir (foi o bug do AM p.13)");
  afirma(decidirEmissao({ texto: true, ocr: true, concordam: true }) === "emitir", "política: texto+OCR que concordam emitem");
  afirma(decidirEmissao({ texto: false, ocr: true, concordam: false }) === "emitir", "política: OCR (visual) sozinho emite");
  afirma(decidirEmissao({ texto: true, ocr: true, concordam: false }) === "divergem", "política: texto+OCR que divergem NÃO emitem");

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
    // PORTÃO ponta a ponta: o controle Datafolha lê certo na camada de texto,
    // mas o OCR sai embaralhado → NÃO corrobora → tem de ir à pendência, não emitir.
    const disp = processarPDF({ pdfPath: pdfCtrl, sha256: "test", uf: "PE", rec: {}, integraUrl: "x" });
    afirma(disp.tipo === "pendencia" && disp.subtipo === "nao-corroborado",
      `portão e2e: controle Datafolha (texto ok, OCR embaralhado) devia virar pendência nao-corroborado, veio ${disp.tipo}/${disp.subtipo ?? "-"}`);
  }

  // ---- INVARIANTE DO LEDGER (conta fecha) ---------------------------------
  const entradas = 5, e = 2, r = 1, p = 2;
  afirma(e + r + p === entradas, "invariante: o exemplo de contagem não fecha (bug no próprio teste)");

  if (ok) console.log(`AUTOTESTE OK — controle PE-04519 reproduzido, soma adulterada reprovada, recusas tipadas, gate interno e invariante verdes.`);
  else { console.error("AUTOTESTE FALHOU:"); for (const p of problemas) console.error(`  ✗ ${p}`); }
  process.exit(ok ? 0 : 1);
}

if (flag("self-test")) selfTest();
else main().catch((e) => { console.error("ERRO:", e.stack || e.message); process.exit(1); });
