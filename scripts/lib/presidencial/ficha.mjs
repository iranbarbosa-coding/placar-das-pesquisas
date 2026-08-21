// A FICHA TÉCNICA, lida do PRÓPRIO relatório — amostra, margem, datas, registro.
//
// O escopo pede que esses campos venham do relatório, não do agregador: a
// referência PE-04519 os leu DUAS VEZES ÀS CEGAS do PDF, e o registro de sweep é
// só a conferência cruzada. Este módulo extrai o que a camada de texto expõe com
// segurança e RECUSA o que não expõe (campo nulo, §4), nunca chutando um número
// de metodologia — que é número que vai ao ar e cai sob a §1 como qualquer outro.
//
// Puro e determinístico: recebe o texto plano das páginas, devolve um objeto de
// campos + a lista de registros TSE achados. Sem rede, sem relógio.

const MESES = {
  janeiro: 1, fevereiro: 2, "março": 3, marco: 3, abril: 4, maio: 5, junho: 6,
  julho: 7, agosto: 8, setembro: 9, outubro: 10, novembro: 11, dezembro: 12,
};

const dois = (n) => String(n).padStart(2, "0");

/** Todos os registros TSE no texto, na forma canônica UF-NNNNN/AAAA. */
export function registrosTSE(texto) {
  const achados = [];
  const re = /\b([A-Z]{2})-?(\d{3,6})\/(\d{4})\b/g;
  let m;
  while ((m = re.exec(texto))) {
    achados.push(`${m[1]}-${m[2]}/${m[3]}`);
  }
  // Únicos, ordem de aparição preservada (determinismo).
  return [...new Set(achados)];
}

/**
 * O registro do ESTADO (prefixo = UF alvo) entre os achados. É ele que casa a
 * pergunta presidencial ao levantamento estadual já no banco (degrau 2 de
 * resolveSurvey), NÃO o BR- do bloco nacional — a regra de atribuição do escopo.
 */
export function registroDoEstado(texto, uf) {
  const regs = registrosTSE(texto);
  const doEstado = regs.filter((r) => r.startsWith(`${uf}-`));
  return {
    escolhido: doEstado[0] ?? null,
    todos: regs,
    ambiguo: doEstado.length > 1, // mais de um registro do mesmo estado: §1 decide
  };
}

/** "28 a 30 de julho de 2026" → {start:"2026-07-28", end:"2026-07-30"}. */
export function periodoDeCampo(texto) {
  // DD a DD de MÊS de ANO (mesmo mês).
  let m = texto.match(/\b(\d{1,2})\s*a\s*(\d{1,2})\s*de\s*([a-zç]+)\s*de\s*(\d{4})/i);
  if (m) {
    const mes = MESES[m[3].toLowerCase()];
    if (mes) return { start: `${m[4]}-${dois(mes)}-${dois(m[1])}`, end: `${m[4]}-${dois(mes)}-${dois(m[2])}` };
  }
  // DD de MÊS a DD de MÊS de ANO (vira o mês no meio).
  m = texto.match(/\b(\d{1,2})\s*de\s*([a-zç]+)\s*a\s*(\d{1,2})\s*de\s*([a-zç]+)\s*de\s*(\d{4})/i);
  if (m) {
    const m1 = MESES[m[2].toLowerCase()], m2 = MESES[m[4].toLowerCase()];
    if (m1 && m2) return { start: `${m[5]}-${dois(m1)}-${dois(m[1])}`, end: `${m[5]}-${dois(m2)}-${dois(m[3])}` };
  }
  return { start: null, end: null };
}

/**
 * "1.022 entrevistas" → 1022. Duas armadilhas medidas em relatório real:
 *   - o ANO vaza: "...de 2026. ENTREVISTAS E MARGEM..." casava "2026" como
 *     amostra. Por isso o número é ou forma com separador de milhar (1.200,
 *     2.685) ou 3–6 dígitos crus SEM ponto colado — "2026." não casa (o ponto
 *     quebra o "\s+entrevistas").
 *   - havendo alternativa, um valor que É um ano provável (2020–2035) é
 *     descartado: instituto não faz 2026 entrevistas por acaso com o ano.
 */
export function amostra(texto) {
  const num = (s) => Number(s.replace(/\./g, ""));
  const plaus = (n) => Number.isFinite(n) && n >= 100 && n <= 200000 && !(n >= 2020 && n <= 2035);
  // 1) A palavra "amostra" manda: "amostra de 1310 eleitores", "amostra ... de N".
  //    O guarda de plausibilidade descarta "para o total da amostra é de 3 pontos"
  //    (isso é MARGEM, n<100), então não se confunde amostra com margem.
  for (const m of texto.matchAll(/amostra[^.\n]{0,40}?\bde\s+([\d.]{2,7})\b/gi)) {
    const n = num(m[1]); if (plaus(n)) return n;
  }
  // 2) "N entrevistas/eleitores/entrevistados" — EXCLUINDO contexto de controle
  //    de qualidade ("no mínimo 262 entrevistas foram validadas" é auditoria, não
  //    a amostra), que já mandou 262 no lugar de 1310.
  const re = /(\d{1,3}(?:\.\d{3})+|\d{3,6})\s+(?:entrevistas|entrevistados|eleitores)/gi;
  const cands = [];
  let m;
  while ((m = re.exec(texto))) {
    const antes = texto.slice(Math.max(0, m.index - 45), m.index);
    if (/no\s+m[íi]nimo|pelo\s+menos|ao\s+menos|validad|auditad|checad|recontat|conferid|refeit/i.test(antes)) continue;
    const n = num(m[1]); if (plaus(n)) cands.push(n);
  }
  return cands.length ? cands[0] : null;
}

/**
 * "margem de erro ... é de 3 pontos" → 3; "2,0 p.p." → 2; "3% pontos
 * percentuais" → 3 (o "%" entre o número e "pontos" aparece em relatório real,
 * daí o "%?" opcional).
 */
export function margem(texto) {
  const m = texto.match(/margem\s+de\s+erro[^0-9]{0,40}?(\d{1,2}(?:[.,]\d)?)\s*%?\s*(?:pontos?|p\.?\s*p)/i);
  if (!m) return null;
  const n = Number(m[1].replace(",", "."));
  return Number.isFinite(n) && n > 0 && n <= 20 ? n : null;
}

/** Nível de confiança, se impresso: "95%". */
export function confianca(texto) {
  const m = texto.match(/(?:n[ií]vel|[ií]ndice|grau)\s+de\s+confian[çc]a[^0-9]{0,20}?(\d{2})\s*%/i);
  return m ? Number(m[1]) : null;
}

/**
 * Contratante, LIDO DO RELATÓRIO — nunca do agregador (§4: a fonte do reparo é o
 * PDF; puxar do sweep já mandou 'DCastro' num relatório cujo rodapé diz outra
 * coisa). Nulo se não impresso. Dois padrões medidos:
 *   "O DIRETO AO PONTO PESQUISAS FOI A CONTRATANTE..." → nome antes de "FOI A CONTRATANTE"
 *   "Contratante: Nassau Editora..."                    → nome depois do rótulo
 */
export function contratante(texto) {
  let m = texto.match(/\b([A-ZÀ-Ú][A-Za-zÀ-ú0-9&.\- ]{2,60}?)\s+foi\s+(?:a|o)\s+contratante/i);
  if (m) return limparOrg(m[1]);
  m = texto.match(/contratante[\s(]*(?:da pesquisa|do estudo)?\s*[:\-]\s*([A-ZÀ-Ú][A-Za-zÀ-ú0-9&.\- ]{2,60})/i);
  if (m) return limparOrg(m[1]);
  return null;
}

/**
 * Instituto executor, LIDO DO RELATÓRIO. Nulo se não extraível — o chamador
 * decide o fallback e MARCA a procedência (§4), nunca sourceia calado do sweep.
 */
export function instituto(texto) {
  let m = texto.match(/\b([A-ZÀ-Ú][A-Za-zÀ-ú0-9&.\- ]{2,60}?)\s+foi\s+a\s+contratante\s+e\s+executora/i);
  if (m) return limparOrg(m[1]);
  m = texto.match(/(?:realizada|executada|elaborada)\s+pel[ao]s?\s+([A-ZÀ-Ú][A-Za-zÀ-ú0-9&.\- ]{2,60})/i);
  if (m) return limparOrg(m[1]);
  return null;
}

// Apara artigo/lixo comum de borda ("O ", "A ") e espaços.
function limparOrg(s) {
  return s.trim().replace(/^(o|a|os|as)\s+/i, "").replace(/\s+/g, " ").trim() || null;
}

/**
 * Reúne a ficha do texto plano de todas as páginas. `uf` é a UF alvo (para
 * escolher o registro do estado). Todo campo que não aparece com segurança fica
 * NULO — a ausência é registrada, não inventada.
 */
export function extrairFicha(paginas, uf) {
  const texto = paginas.map((p) => p.lines.join("\n")).join("\n");
  const periodo = periodoDeCampo(texto);
  const reg = registroDoEstado(texto, uf);
  return {
    sample_size: amostra(texto),
    margin_of_error: margem(texto),
    fieldwork_start: periodo.start,
    fieldwork_end: periodo.end,
    confidence: confianca(texto),
    tse_registration: reg.escolhido,
    tse_registration_ambiguo: reg.ambiguo,
    tse_todos: reg.todos,
    contractor: contratante(texto),
    pollster: instituto(texto),
  };
}

/**
 * Confere a ficha lida do PDF contra o registro do sweep (v1 do Poder360, que
 * também vem do relatório). Devolve as divergências como lista legível — não
 * decide nada: o hub/§1 lê e resolve. Concordância vira sinal de confiança.
 */
export function conferirContraSweep(fichaPDF, rec) {
  const div = [];
  const cmp = (campo, a, b) => {
    if (a != null && b != null && String(a) !== String(b)) div.push(`${campo}: PDF=${a} × sweep=${b}`);
  };
  cmp("sample_size", fichaPDF.sample_size, rec?.entrevistas ?? null);
  cmp("margin_of_error", fichaPDF.margin_of_error, rec?.margem ?? null);
  const sweepReg = rec?.registro ? String(rec.registro).replace(/\s+/g, "") : null;
  if (fichaPDF.tse_registration && sweepReg && !sweepReg.includes(fichaPDF.tse_registration.replace("-", "")) && fichaPDF.tse_registration !== sweepReg) {
    // Comparação frouxa: o sweep pode trazer com ou sem hífen. Só diverge se
    // claramente não for o mesmo registro.
    if (!sweepReg.startsWith(fichaPDF.tse_registration.slice(0, 2))) div.push(`tse_registration: PDF=${fichaPDF.tse_registration} × sweep=${sweepReg}`);
  }
  return div;
}
