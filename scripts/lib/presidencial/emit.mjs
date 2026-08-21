// MONTA O add_poll CANDIDATO — puro, determinístico, e DELIBERADAMENTE não-pronto.
//
// A saída é uma entrada no formato de data/repairs.json (match / add_poll /
// expect_sum / source / evidence / verified_at), MAS com `verified_at: null`: o
// número não é certificado até a 2ª leitura cega (§1) do hub. Isso NÃO é um
// esquecimento — `inserirPesquisaCurada` RECUSA entrada sem verified_at, então um
// candidato deste arquivo, se caísse em repairs.json antes da revisão, seria
// rejeitado pelo próprio portão. É a trava "não insere direto" do escopo, em
// código.
//
// Divisão de origem (escopo + §1):
//   FIGURAS presidenciais (results/baldes/absent) ...... do PDF (o motivo do parser)
//   FICHA (amostra/margem/datas/registro) .............. do PDF, conferida vs sweep
//   IDENTIDADE (pollster/contractor/fieldwork_end) ..... do SWEEP (alinha ao
//       levantamento estadual já no banco — a chave match tem de bater a grafia
//       do agregador, senão não encontra as linhas irmãs)

const iso = (s) => (s == null ? null : String(s).slice(0, 10));

/**
 * @param {object} a
 * @param {object} a.figuras   saída de extrairBlocoPresidencial().figuras
 * @param {object} a.ficha     saída de extrairFicha()
 * @param {object} a.rec       registro do sweep (v1 do Poder360) do governador
 * @param {string} a.uf        UF alvo (do poll estadual, não do BR- do bloco)
 * @param {string} a.integraUrl
 * @param {string} a.pdfHash   sha256 do PDF lido (rastro de proveniência)
 * @param {{texto:boolean, ocr:boolean, concordam:boolean}} a.legs
 * @returns {{entry:object, rejeitado:string|null}}
 *   `rejeitado` != null quando o gate aritmético interno reprova a montagem
 *   (soma × total impresso divergem além da tolerância derivada) — a entrada
 *   ainda é devolvida, marcada, para o rastro; o orquestrador a conta como
 *   rejeitada, nunca a emite como candidata limpa.
 */
export function montarCandidato({ figuras, ficha, rec, uf, integraUrl, pdfHash, legs, pareamento = null, cenarioRotulo = null, assinatura = null, totalImpresso = null, tolerancia = 0 }) {
  const sweepData = iso(rec?.data ?? rec?.dataOriginal ?? null);

  // Conferência de campo a campo: PDF manda no que é número de metodologia
  // (domínio da §1); o sweep entra como fallback SÓ quando a ficha do PDF não
  // expôs o campo (relatório imagem sem camada de texto), e isso fica marcado.
  const divergencias = [...(ficha?.divergencias ?? [])];
  const campo = (nomeCampo, doPDF, doSweep) => {
    if (doPDF != null) return doPDF;
    if (doSweep != null) { divergencias.push(`${nomeCampo}: ficha do PDF não lida; usado valor do sweep (${doSweep})`); return doSweep; }
    return null;
  };

  const sample_size = campo("sample_size", ficha?.sample_size, rec?.entrevistas ?? null);
  const margin_of_error = campo("margin_of_error", ficha?.margin_of_error, rec?.margem ?? null);
  const tse_registration = campo("tse_registration", ficha?.tse_registration,
    rec?.registro ? String(rec.registro).replace(/\s+/g, "").toUpperCase() : null);

  // fieldwork_end é CRÍTICO para o match (alinha ao levantamento estadual). Usa
  // o do sweep, que é o que as linhas irmãs carregam, e confere contra o fim de
  // período lido do PDF; divergência é sinalizada, não silenciada.
  const fieldwork_end = sweepData ?? ficha?.fieldwork_end ?? null;
  if (ficha?.fieldwork_end && sweepData && ficha.fieldwork_end !== sweepData) {
    divergencias.push(`fieldwork_end: PDF=${ficha.fieldwork_end} × sweep=${sweepData} — match usa o do sweep (alinhamento)`);
  }
  if (ficha?.tse_registration_ambiguo) {
    divergencias.push(`mais de um registro do estado ${uf} no PDF (${(ficha.tse_todos ?? []).join(", ")}) — §1 decide`);
  }

  // PROCEDÊNCIA §4: dados do add_poll vêm do PDF. contratante NUNCA do sweep
  // (foi assim que 'DCastro' — grafia do agregador — divergiu do rodapé do
  // relatório). pollster do PDF; se não extraível, cai no sweep MAS com a
  // procedência marcada em voz alta para a §1 conferir, nunca calado.
  const contractor = ficha?.contractor ?? null;
  const pollsterDoPDF = ficha?.pollster ?? null;
  const pollster = pollsterDoPDF ?? ((rec?.instituto ?? "").trim() || null);
  const procedencia = {
    pollster: pollsterDoPDF ? "pdf" : (pollster ? "sweep(conferir no PDF §1)" : "ausente"),
    contractor: contractor ? "pdf" : "ausente(não impresso)",
    sample_size: ficha?.sample_size != null ? "pdf" : (rec?.entrevistas != null ? "sweep(conferir §1)" : "ausente"),
    margin_of_error: ficha?.margin_of_error != null ? "pdf" : (rec?.margem != null ? "sweep(conferir §1)" : "ausente"),
    tse_registration: ficha?.tse_registration ? "pdf" : (rec?.registro ? "sweep(conferir §1)" : "ausente"),
    fieldwork_end: "sweep(alinhamento; confere fim de período do PDF)",
  };
  if (pollster && !pollsterDoPDF) divergencias.push(`pollster '${pollster}' veio do sweep — não extraído do PDF; §1 confere no relatório`);
  if (!contractor) divergencias.push("contratante não impresso no PDF (ou não extraído) — nulo, NÃO puxado do sweep (§4)");

  // Confiança agora reflete o MODO DE PAREAMENTO (§1 precisa saber o que confere):
  // adjacente-* = pareamento estruturalmente inequívoco (o valor cola no rótulo);
  // corroborado-visual = corrida-separada que a perna visual/OCR confirmou.
  const confidence = pareamento ?? (legs.texto && legs.ocr && legs.concordam ? "texto+ocr" : legs.texto ? "texto" : "ocr");

  // Gate aritmético interno (§10 derivada). Só REPROVA quando há um total
  // IMPRESSO independente para conferir; sem ele, a soma é auto-consistente e a
  // conferência real é a §1 — dito em voz alta na evidência.
  let rejeitado = null;
  if (totalImpresso != null && Math.abs(figuras.expect_sum - totalImpresso) > tolerancia) {
    rejeitado = `soma transcrita ${figuras.expect_sum} × total impresso ${totalImpresso} divergem além de ${tolerancia} (tolerância derivada §10)`;
  }

  const add_poll = {
    pollster,
    race: "presidente",
    state: uf,
    round: 1,
    // Documento com VÁRIOS cenários estimulados de 1º turno (Paraná AP testou
    // Jair/Michelle/Tarcísio/Eduardo): o rótulo distingue por índice e página do
    // relatório — descrição do impresso, nunca um nome inventado. Doc de cenário
    // único fica "1º turno", a grafia das entradas curadas.
    scenario: cenarioRotulo ?? "1º turno",
    contractor,
    fieldwork_start: ficha?.fieldwork_start ?? null,
    fieldwork_end,
    published_date: null,
    sample_size,
    margin_of_error,
    tse_registration,
    results: figuras.results.map((r) => ({ candidate: r.candidate, party: r.party ?? null, pct: r.pct })),
    others_pct: figuras.others_pct,
    undecided_pct: figuras.undecided_pct,
    blank_null_pct: figuras.blank_null_pct,
  };

  const match = {
    pollster,
    race: "presidente",
    state: uf,
    round: 1,
    fieldwork_end,
  };

  const entry = {
    match,
    defect: `Bloco presidencial ESTIMULADO (1º turno) presente no relatório-integra do ${pollster ?? "instituto"} `
      + `(${uf}, campo ${fieldwork_end ?? "?"}) mas ausente do banco: o v2/cenarios do Poder360 serve o bloco `
      + `presidencial estadual como registro nacional e as linhas se perdem. Transcrito do PDF pelo parser presidencial `
      + `para presidente:${uf}. A UF vem do poll estadual, não do BR- do bloco.`,
    source: integraUrl,
    // Evidência RASCUNHO, gerada pelo parser. Marcada como pendente para que
    // ninguém a confunda com a dupla leitura cega — que ainda não aconteceu.
    evidence: rascunhoEvidencia({ figuras, ficha, uf, pollster, fieldwork_end, confidence, legs, pdfHash }),
    verified_at: null,
    add_poll,
    expect_sum: figuras.expect_sum,
    _parser: {
      status: "pendente-2a-leitura",
      confidence,
      pareamento,                        // adjacente-inline | corroborado-visual | corroborado-geometrico | ocr-*
      legs,
      page: figuras.page,
      assinatura_elenco: assinatura,     // identidade do cenário (dedupe §1)
      coluna_resolvida: figuras.coluna_resolvida ?? null, // SPSS: a coluna-que-soma escolhida
      absent: figuras.absent,            // asterisco = ausência ≠ zero (§4)
      tse_todos: ficha?.tse_todos ?? [],
      total_impresso: totalImpresso,
      tolerancia_derivada: tolerancia,
      procedencia,
      divergencias_sweep: divergencias,
      rejeitado,
      pdf_sha256: pdfHash,
      pdf_url: integraUrl,
      generated_by: "presidencial-parser",
    },
  };

  return { entry, rejeitado };
}

function rascunhoEvidencia({ figuras, ficha, uf, pollster, fieldwork_end, confidence, legs, pdfHash }) {
  const linhas = figuras.results.map((r) => `${r.candidate} (${r.party ?? "?"}) ${r.pct}`).join(" · ");
  const ausentes = figuras.absent.length
    ? ` Estimulados e NÃO citados (asterisco no relatório, ausência ≠ zero, §4): ${figuras.absent.map((a) => `${a.candidate} (${a.party ?? "?"})`).join(", ")}.`
    : "";
  const pernas = legs.texto && legs.ocr && legs.concordam ? "camada de texto E OCR Vision batem"
    : legs.texto ? "camada de texto embutida (OCR não corroborou — texto é a leitura exata do gerador do PDF)"
    : "APENAS OCR Vision (relatório sem camada de texto) — CONFIANÇA MENOR, foco da 2ª leitura";
  return (
    `⚠ RASCUNHO GERADO PELO PARSER PRESIDENCIAL — PENDENTE DE 2ª LEITURA CEGA (§1). `
    + `verified_at NULO de propósito: esta entrada NÃO entra em repairs.json até um agente DIFERENTE reler o PDF às cegas e bater em todas as figuras. `
    + `p.${figuras.page} do relatório-integra, intenção de voto ESTIMULADA para presidente, 1º turno, na ordem impressa: ${linhas}. `
    + `Baldes SEPARADOS (o relatório separa, o agregador funde): "Em branco/nulo/nenhum" ${figuras.blank_null_pct ?? "—"}, "Não sabe" ${figuras.undecided_pct ?? "—"}. `
    + `others_pct ${figuras.others_pct == null ? "NULO (sem linha de 'Outros' na estimulada; não confundir com 'Outras respostas' da espontânea)" : figuras.others_pct}.${ausentes} `
    + `Ficha lida do PDF: ${ficha?.sample_size ?? "?"} entrevistas, margem ${ficha?.margin_of_error ?? "?"} p.p., `
    + `confiança ${ficha?.confidence ?? "?"}%, campo ${ficha?.fieldwork_start ?? "?"} a ${ficha?.fieldwork_end ?? "?"}, `
    + `registro do estado ${ficha?.tse_registration ?? "?"} (todos no PDF: ${(ficha?.tse_todos ?? []).join(", ") || "—"}; o BR- do bloco fica AQUI, não vira a chave). `
    + `Perna de leitura: ${pernas}. Confiança do parser: ${confidence}. sha256 do PDF: ${pdfHash}. `
    + `Nada aqui foi conferido contra pesquisa vizinha nem contra o agregador — o Poder360 não serve esta pesquisa presidencial, é a razão do reparo.`
  );
}
