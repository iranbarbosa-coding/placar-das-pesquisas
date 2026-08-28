// OBSERVABILIDADE DE COLETA — o relatório de cobertura da rodada.
//
// Por que este arquivo existe: a coleta parou de trazer Quaest presidencial
// nacional nova (mais recente no banco: 12/08/2026) e NINGUÉM percebeu, porque
// o build não relatava o que descarta nem o que uma fonte deixou de servir.
// `poder360.mjs` só CONTAVA falhas ("N combo(s) failed, last: …") sem dizer
// QUAIS nem por quê; os descartes (soma<30, sem data, duplicata, dedup) eram
// linhas de log espalhadas, sem um resumo. Um lote perdido em silêncio (o caso
// Quaest) ficava invisível.
//
// Este módulo NÃO muda o que é coletado, filtrado ou mantido — é observabilidade
// PURA: acumula eventos (falhas/zeros de fetch, descartes nomeados) e, no fim da
// coleta, imprime um RESUMO DE COBERTURA alto e auditável, visível no log do
// GitHub Actions. O store sai byte a byte idêntico.
//
// Módulo sem import de rede nem de dado do banco de propósito: só formata o que
// o coletor lhe entrega, para não abrir uma segunda porta de coleta.

/**
 * A FONTE DE UM REGISTRO PELO ESPAÇO DE ID — a mesma partição que
 * `PERTENCE_A_FONTE` (scrape.mjs) e o guarda de recuperação de fonte usam, e a
 * única que a projeção do store preserva. `p.source` some na fusão (o registro
 * fundido herda a fonte vencedora), mas o id nativo não: `p360-…` é do Poder360,
 * `curado-…` é inserção curada, e o que sobra é da Wikipédia.
 */
export function fonteDoRegistro(p) {
  const id = typeof p?.id === "string" ? p.id : "";
  if (id.startsWith("p360-")) return "poder360";
  if (id.startsWith("curado-")) return "curada";
  if (id) return "wikipedia";
  // Registro ainda sem id cunhado: cai para o campo `source`, que existe na
  // saída crua das fontes antes de qualquer fusão.
  return typeof p?.source === "string" ? p.source : "desconhecida";
}

/** O rótulo de cargo do resumo por instituto. A presidencial NACIONAL
 * (state nulo) é separada da estadual de propósito: é ela que a média nacional
 * usa, e era ela que estava velha no caso Quaest — presidente(BR) tem de saltar
 * aos olhos sozinho, sem a presidencial coletada num estado o disfarçar. */
export function rotuloCargo(p) {
  const uf = p?.state ?? null;
  if (p?.race === "presidente") return uf ? "presidente(estadual)" : "presidente(BR)";
  return p?.race ?? "?";
}

const dataDe = (p) => p?.fieldwork_end ?? null;

function identidade(p) {
  return `${p?.pollster ?? "?"} · ${p?.race ?? "?"}/${p?.state ?? "BR"} · ` +
    `campo ${dataDe(p) ?? "?"} · ${fonteDoRegistro(p)} · id=${p?.id ?? "?"}`;
}

/**
 * O COLETOR DE COBERTURA. Um por rodada. O coletor só ACUMULA e FORMATA; quem
 * decide o que é descarte é o coletor de verdade (scrape.mjs), que chama
 * `descartar` no ponto exato em que a decisão já foi tomada. `descartar`
 * devolve a linha pronta para o canal único de log — assim o texto do descarte
 * é cunhado num lugar só (§5), e não remontado em cada ponto do pipeline.
 */
export function novoRelatorioCobertura() {
  // fetchLog: [{ source, alvo, fetched, error }]. `alvo` é o combo/página.
  const fetchLog = [];
  // descartes: [{ source, motivo, poll }]
  const descartes = [];
  const contadores = { fundidasEntreFontes: 0, curadasInseridas: 0, curadasGateadas: 0 };

  return {
    /** Registra o log de fetch de uma fonte (lista de combos/páginas com
     * quantos trouxe e, se falhou, por quê). Combos que voltam ZERO entram como
     * suspeitos (fetched 0, sem error). */
    registrarFetch(entradas) {
      for (const e of entradas ?? []) fetchLog.push(e);
    },

    /** Um descarte NOMEADO: identidade + motivo padronizado. Devolve a linha do
     * canal único (o chamador imprime), e acumula para o resumo. `detalhe` é
     * texto livre da linha (ex.: "soma 21.0 < 30") que NÃO vira chave da quebra
     * por motivo — o motivo padronizado é o único agregador. */
    descartar(motivo, poll, detalhe = null) {
      descartes.push({ source: fonteDoRegistro(poll), motivo, poll });
      return `descartada [${motivo}]: ${identidade(poll)}${detalhe ? ` — ${detalhe}` : ""}`;
    },

    fundidas(n) { contadores.fundidasEntreFontes += n; },
    curadaInserida(n = 1) { contadores.curadasInseridas += n; },
    curadaGateada(n = 1) { contadores.curadasGateadas += n; },

    /** As linhas do RESUMO DE COBERTURA, prontas para console.log. `polls` é a
     * lista FINAL mantida (o que a rodada de fato ingeriu). */
    resumo(polls) {
      return montarResumo({ polls: polls ?? [], fetchLog, descartes, contadores });
    },

    /** O objeto legível por máquina, para persistência opcional fora de data/. */
    paraJson(polls) {
      return montarJson({ polls: polls ?? [], fetchLog, descartes, contadores });
    },
  };
}

/** Agrupa os descartes por fonte e por motivo: { [source]: { total, motivos } }. */
function descartesPorFonte(descartes) {
  const m = new Map();
  for (const d of descartes) {
    if (!m.has(d.source)) m.set(d.source, { total: 0, motivos: new Map() });
    const e = m.get(d.source);
    e.total++;
    e.motivos.set(d.motivo, (e.motivos.get(d.motivo) ?? 0) + 1);
  }
  return m;
}

/** fetched por fonte = soma do que cada combo/página trouxe. */
function fetchedPorFonte(fetchLog) {
  const m = new Map();
  for (const e of fetchLog) m.set(e.source, (m.get(e.source) ?? 0) + (e.fetched ?? 0));
  return m;
}

/** kept por fonte = registros finais atribuídos pela partição de id. */
function keptPorFonte(polls) {
  const m = new Map();
  for (const p of polls) m.set(fonteDoRegistro(p), (m.get(fonteDoRegistro(p)) ?? 0) + 1);
  return m;
}

/** { [pollster]: { total, cargos: Map<rotulo,{latest,n}> } } sobre os finais. */
function porInstituto(polls) {
  const m = new Map();
  for (const p of polls) {
    const nome = p.pollster || "(sem instituto)";
    if (!m.has(nome)) m.set(nome, { total: 0, cargos: new Map() });
    const e = m.get(nome);
    e.total++;
    const rot = rotuloCargo(p);
    if (!e.cargos.has(rot)) e.cargos.set(rot, { latest: null, n: 0 });
    const c = e.cargos.get(rot);
    c.n++;
    const d = dataDe(p);
    if (d && (!c.latest || d > c.latest)) c.latest = d;
  }
  return m;
}

const ordemCargo = { "presidente(BR)": 0, "presidente(estadual)": 1, governador: 2, senador: 3 };

function montarResumo({ polls, fetchLog, descartes, contadores }) {
  const L = [];
  const fetched = fetchedPorFonte(fetchLog);
  const kept = keptPorFonte(polls);
  const drop = descartesPorFonte(descartes);

  L.push("════════ RESUMO DE COBERTURA DA COLETA ════════");

  // ── POR FONTE ──────────────────────────────────────────────────────────
  L.push("POR FONTE (fetched = cru da fonte · kept = final ingerido · dropped = descartado):");
  const fontes = [...new Set([...fetched.keys(), ...kept.keys(), ...drop.keys()])].sort();
  for (const f of fontes) {
    const d = drop.get(f);
    const quebra = d
      ? " (" + [...d.motivos.entries()].sort((a, b) => b[1] - a[1]).map(([mo, n]) => `${mo}: ${n}`).join(", ") + ")"
      : "";
    L.push(`  ${f} — fetched ${fetched.get(f) ?? 0} · kept ${kept.get(f) ?? 0} · ` +
      `dropped ${d?.total ?? 0}${quebra}`);
  }
  L.push(`  (fundidas entre fontes: ${contadores.fundidasEntreFontes} · ` +
    `curadas inseridas: ${contadores.curadasInseridas} · curadas gateadas: ${contadores.curadasGateadas})`);

  // ── FALHAS / ZEROS DE FETCH ────────────────────────────────────────────
  const falhas = fetchLog.filter((e) => e.error);
  const zeros = fetchLog.filter((e) => !e.error && (e.fetched ?? 0) === 0);
  L.push(`FALHAS/ZEROS DE FETCH — ${falhas.length} falha(s), ${zeros.length} combo(s)/página(s) com ZERO registro(s):`);
  if (!falhas.length && !zeros.length) {
    L.push("  (nenhuma — toda busca de fonte trouxe ao menos um registro)");
  } else {
    for (const e of falhas) L.push(`  ✗ ${e.source} ${e.alvo} — ${e.error}`);
    for (const e of zeros) L.push(`  ⓿ ${e.source} ${e.alvo} — zero registros (suspeito)`);
  }

  // ── POR INSTITUTO ──────────────────────────────────────────────────────
  L.push("POR INSTITUTO (voto) — quantidade ingerida e fieldwork_end MAIS RECENTE por cargo:");
  const inst = porInstituto(polls);
  // Ordena por total desc: os institutos grandes primeiro, que são os que
  // importam quando o dado deles está velho.
  const ordenados = [...inst.entries()].sort((a, b) => b[1].total - a[1].total);
  for (const [nome, e] of ordenados) {
    const cargos = [...e.cargos.entries()]
      .sort((a, b) => (ordemCargo[a[0]] ?? 9) - (ordemCargo[b[0]] ?? 9))
      .map(([rot, c]) => `${rot}: ${c.latest ?? "sem data"} (n=${c.n})`)
      .join(" · ");
    L.push(`  ${nome} — ${e.total} · ${cargos}`);
  }

  L.push("═══════════════════════════════════════════════");
  return L;
}

function montarJson({ polls, fetchLog, descartes, contadores }) {
  const fetched = fetchedPorFonte(fetchLog);
  const kept = keptPorFonte(polls);
  const drop = descartesPorFonte(descartes);
  const fontes = [...new Set([...fetched.keys(), ...kept.keys(), ...drop.keys()])].sort();
  const inst = porInstituto(polls);
  return {
    schema: "fetch-coverage/1",
    por_fonte: fontes.map((f) => ({
      fonte: f,
      fetched: fetched.get(f) ?? 0,
      kept: kept.get(f) ?? 0,
      dropped: drop.get(f)?.total ?? 0,
      motivos: drop.get(f) ? Object.fromEntries(drop.get(f).motivos) : {},
    })),
    fundidas_entre_fontes: contadores.fundidasEntreFontes,
    curadas_inseridas: contadores.curadasInseridas,
    curadas_gateadas: contadores.curadasGateadas,
    falhas_fetch: fetchLog.filter((e) => e.error).map((e) => ({ source: e.source, alvo: e.alvo, error: e.error })),
    zeros_fetch: fetchLog.filter((e) => !e.error && (e.fetched ?? 0) === 0).map((e) => ({ source: e.source, alvo: e.alvo })),
    descartes: descartes.map((d) => ({
      source: d.source,
      motivo: d.motivo,
      pollster: d.poll?.pollster ?? null,
      race: d.poll?.race ?? null,
      state: d.poll?.state ?? null,
      fieldwork_end: d.poll?.fieldwork_end ?? null,
      id: d.poll?.id ?? null,
    })),
    por_instituto: [...inst.entries()]
      .sort((a, b) => b[1].total - a[1].total)
      .map(([nome, e]) => ({
        instituto: nome,
        total: e.total,
        cargos: [...e.cargos.entries()]
          .sort((a, b) => (ordemCargo[a[0]] ?? 9) - (ordemCargo[b[0]] ?? 9))
          .map(([rot, c]) => ({ cargo: rot, mais_recente: c.latest, n: c.n })),
      })),
  };
}
