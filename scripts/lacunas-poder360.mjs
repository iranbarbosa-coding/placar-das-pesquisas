#!/usr/bin/env node
// O QUE A FONTE ESTÁ ESCONDENDO DE NÓS AGORA — enumeração, nunca reparo.
//
// O defeito, em uma frase: o `v2/cenarios` do Poder360 APAGA em silêncio toda
// linha de candidato cujo campo `nome` chegou vazio, e o `v1/api` MANTÉM a mesma
// linha (mesmo `percentual`, quase sempre o `partido`, só sem o nome). Foi assim
// que uma pesquisa da Vox chegou sem Flávio Bolsonaro somando 54,9%, e é assim
// que uma Palver nacional chega ao `v2` SEM OS DOIS PRIMEIROS COLOCADOS — 44 e
// 40 — enquanto o `v1` os serve normalmente.
//
// O que isso muda: o estrago é ENUMERÁVEL, não estimável. Duas leituras da mesma
// pesquisa, a diferença é a perda. Este relatório é essa diferença.
//
// ---------------------------------------------------------------------------
// TRÊS POPULAÇÕES, PORQUE O REMÉDIO DE CADA UMA É OUTRO
// ---------------------------------------------------------------------------
//
//   CURTA      guardamos a pesquisa, e a fonte tem MAIS linhas do que gravamos.
//              Ancorada no NOSSO registro, nunca no id do Poder360: a pergunta é
//              "o que falta nesta linha do banco?". Remédio: `add_results` em
//              `data/repairs.json`, contra o `integra` do instituto.
//   AUSENTE    a fonte tem a pesquisa (id do `v1` com linhas de candidato) e nós
//              não temos NADA para aquela disputa/instituto/data. Remédio:
//              `add_poll` curado — nenhum outro alcança, porque `applyRepairs`
//              só sabe mutar pesquisa que já está na lista.
//   RECUPERADA `v1` e `v2` concordam e o nosso registro está completo. Só a
//              contagem, como denominador: sem ela os dois números acima não
//              querem dizer nada.
//
// E uma quarta, que é uma RECUSA e não uma população: INDETERMINADA. Ver
// `segmentar()` — quando não dá para provar a que cenário uma linha apagada
// pertence, ela não é atribuída a nenhum (CONVENTIONS §4).
//
// ---------------------------------------------------------------------------
// POR QUE "AUSENTE" NÃO SE TESTA CONTRA O PREFIXO `p360-`
// ---------------------------------------------------------------------------
//
// Uma varredura anterior disse 75 ausentes e estava ERRADA: parte da perda do
// Poder360 é resgatada por OUTRA FONTE — uma nacional da AtlasIntel está no
// banco pela Wikipédia, sem nenhum id `p360-`. Ausente é ausente do BANCO, não
// do espaço de ids de uma fonte. O teste aqui é instituto + disputa + data, em
// TODAS as fontes, e o instituto é resolvido pelo `resolveInstitute` do próprio
// store (que segue `merged_into` e os aliases) em vez de por comparação de
// string — é o que junta "Futura" e "Futura Inteligência".
//
// A janela de data é a MESMA "uma operação de campo = um levantamento" que o
// repositório já usa em `resolveSurvey`, em `datesClose` e em `repairs.mjs`, e
// ela é LIDA de onde mora (ver `janelaOperacaoDias`) em vez de escrita aqui:
// escolher uma tolerância é a jogada proibida do §10, e uma quarta cópia do
// mesmo 3 divergiria na primeira correção feita de um lado só (§5).
//
// ---------------------------------------------------------------------------
// CUSTO DE UMA RODADA
// ---------------------------------------------------------------------------
//
// 2 chamadas por combinação (uma POST `v1`, uma GET `v2`) × 137 combinações
// (presidencial nacional em 2 turnos + 27 UFs × 5) = **274 chamadas**, na mesma
// ordem e no mesmo ritmo do coletor. É por isso que a coleta é agendada 2×/dia:
// a sequência é serial, com pausa entre chamadas, e NÃO se paraleliza. Use
// `--cache=` para reler a mesma varredura sem tocar na API.
//
// Uso:
//   node scripts/lacunas-poder360.mjs [--out=LACUNAS_PODER360.md]
//                                     [--cache=<arquivo.json>] [--self-test]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { readStore, DATA_DIR, resolveInstitute, JANELA_OPERACAO_MS } from "./lib/store.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

// ---------------------------------------------------------------------------
// A JANELA DE "MESMA OPERAÇÃO DE CAMPO" É IMPORTADA, NUNCA ESCRITA AQUI
// ---------------------------------------------------------------------------
//
// `JANELA_OPERACAO_MS` mora em `lib/store.mjs`, ao lado do `resolveSurvey` que a
// aplica, e é a MESMA que `datesClose` do coletor e `mesmaOperacao` de
// `repairs.mjs` usam. Escrever um `3` aqui seria escolher uma tolerância — a
// jogada proibida do §10 — e uma quarta cópia divergiria na primeira correção
// feita de um lado só (§5). Se a constante sumir do `store.mjs`, este import
// falha alto, que é o comportamento certo.
const JANELA_DIAS = JANELA_OPERACAO_MS / 86_400_000;

// ---------------------------------------------------------------------------
// OS MAPAS E O CLIENTE HTTP SAEM DO PRÓPRIO COLETOR
// ---------------------------------------------------------------------------
//
// `cargosId`, `unidadesFederativasId` (BR = 6), o `Origin` obrigatório e os dois
// regexes de balde ("não sabe" / "branco, nulo") vivem em
// `scripts/sources/poder360.mjs` e são privados do módulo. Redigitá-los aqui
// seria a segunda cópia que o §5 proíbe — e a primeira divergência apareceria no
// dia em que a fonte trocar um id de UF.
//
// Então o módulo é IMPORTADO com um re-export acrescentado em memória (nada é
// escrito no arquivo): o valor que este relatório usa é, literalmente, o valor
// que o coletor usa. Se um dos nomes sumir, o import falha alto.
async function mapasDoColetor() {
  const arq = path.join(ROOT, "scripts/sources/poder360.mjs");
  const base = pathToFileURL(arq).href;
  // Sob `data:` não há base para resolver `../lib/util.mjs` — absolutiza.
  const src = fs
    .readFileSync(arq, "utf8")
    .replace(/(\bfrom\s*["'])(\.\.?\/[^"']+)(["'])/g, (_m, a, spec, c) => a + new URL(spec, base).href + c);
  const reexport = "\nexport { HOST, HEADERS, UF_IDS, CARGO, UNDECIDED_RE, BLANK_RE };\n";
  const url = "data:text/javascript;base64," + Buffer.from(src + reexport, "utf8").toString("base64");
  const m = await import(url);
  for (const nome of ["HOST", "HEADERS", "UF_IDS", "CARGO", "UNDECIDED_RE", "BLANK_RE"]) {
    if (m[nome] == null) throw new Error(`scripts/sources/poder360.mjs não expõe mais \`${nome}\` — atualize esta leitura`);
  }
  return m;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------------------
// SEGMENTAÇÃO: A QUE CENÁRIO PERTENCE UMA LINHA QUE NÃO TEM NOME
// ---------------------------------------------------------------------------
//
// O `v1` ACHATA os cenários de um turno numa lista só (é o bug que fez o `v2`
// existir), e a lista achatada é a CONCATENAÇÃO dos blocos, na mesma ordem em
// que o `v2` devolve os cenários. As linhas NOMEADAS de cada bloco são exatamente
// as que o `v2` serve para aquele cenário, na mesma ordem — o que permite alinhar
// os dois e ler, no meio, as linhas que o `v2` apagou.
//
// POSIÇÃO RESOLVE QUASE TUDO, E RESOLVE SEM SUPOR NADA:
//   · linha sem nome ANTES do primeiro nome do primeiro bloco → primeiro bloco
//     (não há bloco antes dela). É o que salva os 38,8 e 34,1 da Futura, que o
//     `v2` apagou junto com mais dez linhas;
//   · linha sem nome ENTRE dois nomes do mesmo bloco → aquele bloco;
//   · linha sem nome DEPOIS do último nome do último bloco → aquele bloco.
//
// Sobra a FRONTEIRA: o intervalo entre o último nome do bloco k e o primeiro nome
// do bloco k+1. Ali a divisão é decidida pela ordenação da própria fonte — cada
// bloco vem em percentual NÃO CRESCENTE —, e a ordenação é CONFERIDA nas linhas
// nomeadas dos dois blocos antes de ser usada. Vale a divisão em que o prefixo
// continua o bloco k (todo ≤ ao último nome dele, e não crescente) e o sufixo
// abre o bloco k+1 (todo ≥ ao primeiro nome dele, e não crescente).
//
// **Uma única divisão válida decide; zero ou mais de uma RECUSA** e as linhas
// viram INDETERMINADAS. Recusar ambiguidade é §4 — e a recusa não é decorativa:
// a Palver intercala o balde por valor (44 40 10 2 1 1 branco 0 0 0 0 0 nãosabe)
// enquanto a Futura o pendura no fim (… 0,1 · 6,2 · 4,8), então NENHUMA regra
// sobre onde ficam os baldes vale para as duas. A ordenação, sim — e onde ela
// não fecha, ninguém atribui.
export function segmentar(linhas, cenarios) {
  const nome = (r) => (r?.nome ?? "").trim();
  const numericas = (a) => (a ?? []).filter((r) => typeof r?.percentual === "number");
  const v1 = numericas(linhas);
  const semNome = [];
  for (let i = 0; i < v1.length; i++) if (!nome(v1[i])) semNome.push({ r: v1[i], i });

  // Sem cenário nenhum no `v2`, o bloco inteiro é invisível: não há fronteira a
  // decidir, e toda linha sem nome é perda desta pesquisa.
  if (!cenarios.length) {
    return { blocos: [{ apagadas: semNome.map((x) => x.r) }], indeterminadas: [], falha: null, semCenario: true };
  }

  const esperadas = cenarios.map((c) => numericas(c.apuracao));
  const casa = (b, idx, r) =>
    idx < esperadas[b].length && nome(esperadas[b][idx]) === nome(r) && esperadas[b][idx].percentual === r.percentual;

  // 1. ALINHAMENTO — onde começa e onde termina cada bloco na lista achatada.
  const marca = cenarios.map(() => ({ primeira: -1, ultima: -1, pcts: [] }));
  let k = 0;
  let pos = 0;
  for (let i = 0; i < v1.length; i++) {
    const r = v1[i];
    if (!nome(r)) continue;
    if (!casa(k, pos, r)) {
      let alvo = k + 1;
      while (alvo < cenarios.length && !casa(alvo, 0, r)) alvo++;
      if (alvo >= cenarios.length) {
        return {
          blocos: cenarios.map(() => ({ apagadas: [] })),
          indeterminadas: semNome.map((x) => x.r),
          falha: `linha nomeada sem cenário correspondente: ${nome(r)} ${r.percentual}`,
          semCenario: false,
        };
      }
      k = alvo;
      pos = 0;
    }
    if (marca[k].primeira < 0) marca[k].primeira = i;
    marca[k].ultima = i;
    marca[k].pcts.push(r.percentual);
    pos++;
  }

  // 2. DISTRIBUIÇÃO por posição, e a fronteira por ordenação conferida.
  const blocos = cenarios.map(() => ({ apagadas: [] }));
  const indeterminadas = [];
  const comNome = marca.map((m, j) => ({ j, ...m })).filter((m) => m.primeira >= 0);
  if (!comNome.length) {
    // Nenhum bloco pôde ser localizado: não afirmo cenário para nada.
    return { blocos, indeterminadas: semNome.map((x) => x.r), falha: null, semCenario: false };
  }
  const naoCrescente = (a) => a.every((v, n) => n === 0 || v <= a[n - 1]);

  for (const { r, i } of semNome) {
    const dentro = comNome.find((m) => i > m.primeira && i < m.ultima);
    if (dentro) { blocos[dentro.j].apagadas.push(r); continue; }
    if (i < comNome[0].primeira) { blocos[comNome[0].j].apagadas.push(r); continue; }
    if (i > comNome[comNome.length - 1].ultima) { blocos[comNome[comNome.length - 1].j].apagadas.push(r); continue; }
    indeterminadas.push({ r, i }); // fronteira: decidida abaixo, em conjunto
  }

  // As linhas de fronteira só se decidem em GRUPO — a divisão é do intervalo
  // inteiro, não de cada linha por vez.
  const pendentes = indeterminadas.splice(0, indeterminadas.length);
  for (let n = 0; n + 1 < comNome.length; n++) {
    const esq = comNome[n];
    const dir = comNome[n + 1];
    const corrida = pendentes.filter((x) => x.i > esq.ultima && x.i < dir.primeira).sort((a, b) => a.i - b.i);
    if (!corrida.length) continue;
    if (!naoCrescente(esq.pcts) || !naoCrescente(dir.pcts)) {
      indeterminadas.push(...corrida.map((x) => x.r));
      continue;
    }
    const a = esq.pcts[esq.pcts.length - 1];
    const b = dir.pcts[0];
    const validas = [];
    for (let s = 0; s <= corrida.length; s++) {
      const pre = corrida.slice(0, s).map((x) => x.r.percentual);
      const suf = corrida.slice(s).map((x) => x.r.percentual);
      if (!naoCrescente([a, ...pre])) continue;
      if (!naoCrescente([...suf, b])) continue;
      validas.push(s);
    }
    if (validas.length !== 1) { indeterminadas.push(...corrida.map((x) => x.r)); continue; }
    const s = validas[0];
    blocos[esq.j].apagadas.push(...corrida.slice(0, s).map((x) => x.r));
    blocos[dir.j].apagadas.push(...corrida.slice(s).map((x) => x.r));
  }
  // O que caiu fora de toda corrida (blocos do `v2` que não foram localizados no
  // meio) fica indeterminado.
  for (const x of pendentes) {
    const numaCorrida = comNome.some((m, n) => n + 1 < comNome.length && x.i > m.ultima && x.i < comNome[n + 1].primeira);
    if (!numaCorrida) indeterminadas.push(x.r);
  }
  return { blocos, indeterminadas, falha: null, semCenario: false };
}

// ---------------------------------------------------------------------------
// O BANCO
// ---------------------------------------------------------------------------

/** A mesma normalização de instituto do `bucketKey` do coletor. Só usada quando
 *  o instituto do `v1` é DESCONHECIDO do store (aí não há `institute_id` a
 *  comparar) — o caminho normal é a identidade resolvida por `resolveInstitute`. */
const chaveNome = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

const NATIVO_RE = /^p360-(\d+)-(\d+)-(\d+)-/;

/**
 * Os reparos JÁ ESCRITOS, para que a lista não peça duas vezes o mesmo trabalho.
 *
 * Um reparo em `data/repairs.json` só entra no banco numa rodada COMPLETA do
 * pipeline (`applyRepairs` roda dentro de `scrape.mjs`), então uma pesquisa pode
 * estar corretamente listada como AUSENTE aqui e já ter o `add_poll` escrito
 * esperando a próxima coleta — foi o que aconteceu com a presidencial do
 * Datafolha em PE. A leitura é do bloco `match`, que é a chave de identidade de
 * todo reparo (§5), e o cruzamento usa a mesma janela de operação de campo.
 */
function lerReparos() {
  const arq = path.join(DATA_DIR, "repairs.json");
  if (!fs.existsSync(arq)) return [];
  const cru = JSON.parse(fs.readFileSync(arq, "utf8"));
  const arr = Array.isArray(cru) ? cru : (cru.repairs ?? cru.reparos ?? []);
  return arr.map((e) => ({
    m: e.match ?? {},
    tipo: e.add_poll ? "add_poll" : e.add_results ? "add_results" : e.set_party ? "set_party" : "set",
  }));
}

function reparoJaEscrito(reparos, alvo, janelaMs) {
  const r = reparos.find(
    (x) =>
      chaveNome(x.m.pollster) === chaveNome(alvo.instituto) &&
      (x.m.race ?? null) === alvo.race &&
      (x.m.state ?? null) === (alvo.uf ?? null) &&
      (x.m.round ?? 1) === alvo.round &&
      perto(x.m.fieldwork_end ?? x.m.published_date, alvo.data, janelaMs),
  );
  return r?.tipo ?? null;
}

function lerBanco() {
  const store = readStore({ dir: DATA_DIR });
  const surveyById = new Map(store.surveys.map((s) => [s.survey_id, s]));
  const instById = new Map(store.institutes.map((i) => [i.institute_id, i]));
  const raiz = (id) => {
    let inst = instById.get(id);
    const visto = new Set();
    while (inst?.merged_into && !visto.has(inst.institute_id)) {
      visto.add(inst.institute_id);
      inst = instById.get(inst.merged_into);
    }
    return inst ?? null;
  };

  const guardadas = []; // toda pergunta viva do banco, de QUALQUER fonte
  const porNativo = new Map(); // `${id}|${turno}` → [registro…]
  for (const q of store.questions) {
    if (q.retracted) continue;
    const s = surveyById.get(q.survey_id);
    if (!s || s.retracted) continue;
    const inst = raiz(s.institute_id);
    const reg = {
      q,
      s,
      race: q.race,
      uf: q.uf ?? null,
      round: q.round,
      data: s.fieldwork_end ?? s.published_date ?? null,
      instituteId: inst?.institute_id ?? null,
      instituto: inst?.canonical ?? s.institute_names_raw?.[0] ?? null,
      fonte: s.source_refs?.[0]?.source ?? "wikipedia/curado",
    };
    guardadas.push(reg);
    const m = NATIVO_RE.exec(q.legacy_id ?? "");
    if (m) {
      reg.nativo = { id: Number(m[1]), turno: Number(m[2]), idx: Number(m[3]) };
      const k = `${m[1]}|${m[2]}`;
      if (!porNativo.has(k)) porNativo.set(k, []);
      porNativo.get(k).push(reg);
    }
    for (const ref of s.source_refs ?? []) {
      if (ref?.source !== "poder360") continue;
      const nid = String(ref.ref ?? ref.id ?? "").match(/(\d+)/)?.[1];
      if (!nid) continue;
      const k = `${nid}|${q.round}`;
      if (!porNativo.has(k)) porNativo.set(k, []);
      if (!porNativo.get(k).includes(reg)) porNativo.get(k).push(reg);
    }
  }
  return { store, guardadas, porNativo, raiz };
}

// ---------------------------------------------------------------------------
// A VARREDURA
// ---------------------------------------------------------------------------

function combinacoes({ UF_IDS, CARGO }) {
  // Mesma lista e MESMA ORDEM do coletor — o relatório vê o que o coletor vê.
  const jobs = [
    { cargoId: CARGO.presidente, ufId: 6, uf: null, race: "presidente", round: 1, cidade: "Brasil" },
    { cargoId: CARGO.presidente, ufId: 6, uf: null, race: "presidente", round: 2, cidade: "Brasil" },
  ];
  for (const [uf, ufId] of Object.entries(UF_IDS)) {
    jobs.push({ cargoId: CARGO.governador, ufId, uf, race: "governador", round: 1, cidade: "" });
    jobs.push({ cargoId: CARGO.governador, ufId, uf, race: "governador", round: 2, cidade: "" });
    jobs.push({ cargoId: CARGO.senador, ufId, uf, race: "senador", round: 1, cidade: "" });
    jobs.push({ cargoId: CARGO.presidente, ufId, uf, race: "presidente", round: 1, cidade: "" });
    jobs.push({ cargoId: CARGO.presidente, ufId, uf, race: "presidente", round: 2, cidade: "" });
  }
  return jobs;
}

async function varrer({ HOST, HEADERS, UF_IDS, CARGO }, { cache }) {
  const jobs = combinacoes({ UF_IDS, CARGO });
  if (cache && fs.existsSync(cache)) {
    console.log(`lendo varredura em cache (0 chamadas à API): ${path.relative(ROOT, cache)}`);
    return { jobs, bruto: JSON.parse(fs.readFileSync(cache, "utf8")), chamadas: 0 };
  }
  const pedir = async (url, init) => {
    const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(45_000), ...init });
    if (!res.ok) throw new Error(`poder360 HTTP ${res.status}`);
    return res.json();
  };
  const bruto = {};
  let chamadas = 0;
  let falhas = 0;
  for (const [n, j] of jobs.entries()) {
    const chave = `${j.cargoId}|${j.ufId}|${j.round}`;
    try {
      const v1 = await pedir(`${HOST}/pesquisas/v1/api`, {
        method: "POST",
        body: JSON.stringify({ cargosId: j.cargoId, unidadesFederativasId: j.ufId, ano: 2026, turno: String(j.round), cidade: j.cidade }),
      });
      chamadas++;
      await sleep(300);
      const qs = `cargosId=${j.cargoId}&unidadesFederativasId=${j.ufId}&ano=2026&turno=${j.round}&cidade=${encodeURIComponent(j.cidade)}`;
      const v2 = await pedir(`${HOST}/pesquisas/v2/cenarios?${qs}`);
      chamadas++;
      bruto[chave] = { v1, cenarios: v2?.data?.cenarios ?? [] };
    } catch (e) {
      falhas++;
      bruto[chave] = { erro: String(e.message) };
      // Silêncio não é sucesso (§2): uma varredura que perdeu combinações não
      // pode ser lida como "não há lacunas ali".
      if (falhas > jobs.length / 4) throw new Error(`varredura abortada: ${falhas}/${jobs.length} combinações falharam`);
    }
    await sleep(300);
    if ((n + 1) % 20 === 0) process.stderr.write(`  ${n + 1}/${jobs.length} combinações\n`);
  }
  if (falhas) console.warn(`AVISO: ${falhas} combinação(ões) falharam — os números abaixo são um PISO.`);
  if (cache) fs.writeFileSync(cache, JSON.stringify(bruto));
  return { jobs, bruto, chamadas, falhas };
}

// ---------------------------------------------------------------------------
// CLASSIFICAÇÃO
// ---------------------------------------------------------------------------

function classificar({ jobs, bruto }, banco, { UNDECIDED_RE, BLANK_RE, UF_IDS }, janelaMs) {
  const reparos = lerReparos();
  const ehBalde = (n) => UNDECIDED_RE.test(n) || BLANK_RE.test(n);
  const { store, guardadas, porNativo } = banco;

  const curtas = [];
  const ausentes = [];
  const indeterminadas = [];
  const naoAlinhadas = [];
  const naoConferidas = [];
  let recuperadas = 0;
  let jaCobertas = 0; // o `v2` apagou linhas, mas o banco já as tem (reparo aplicado)
  let resgatadas = 0; // sem id nativo nosso, mas OUTRA fonte já trouxe a pesquisa
  let idsComPerda = 0;
  let idsVistos = 0;
  const combinacoesComErro = [];

  // Peso da UF, DERIVADO do próprio banco (quantas pesquisas vivas guardamos
  // dela) em vez de uma tabela de eleitorado escrita à mão. Serve só de
  // desempate na ordenação e está declarado no relatório.
  const pesoUf = new Map();
  for (const g of guardadas) pesoUf.set(g.uf ?? "BR", (pesoUf.get(g.uf ?? "BR") ?? 0) + 1);

  for (const j of jobs) {
    const chave = `${j.cargoId}|${j.ufId}|${j.round}`;
    const bloco = bruto[chave];
    if (!bloco || bloco.erro) { combinacoesComErro.push({ ...j, erro: bloco?.erro ?? "sem dados" }); continue; }
    const porId = new Map();
    for (const c of bloco.cenarios) {
      if (!porId.has(c.id)) porId.set(c.id, []);
      porId.get(c.id).push(c);
    }
    const lista = [...bloco.v1].sort((a, b) => a.id - b.id); // ordem estável (§8)
    for (const m of lista) {
      const v1rows = (m.apuracoes ?? []).flat().filter((r) => typeof r?.percentual === "number");
      const candidatosV1 = v1rows.filter((r) => !ehBalde((r.nome ?? "").trim()));
      if (!candidatosV1.length) continue; // pesquisa sem linha de candidato: nada a enumerar
      idsVistos++;
      const cenarios = porId.get(m.id) ?? [];
      const seg = segmentar(v1rows, cenarios);
      const apagadasTotal = seg.blocos.flatMap((b) => b.apagadas).concat(seg.indeterminadas);
      if (apagadasTotal.length) idsComPerda++;

      // O Poder360 arquiva pesquisa sob a UF ERRADA (uma Veritá do Paraná volta na
      // consulta do Pará), e o prefixo do registro do TSE é a autoridade. O
      // coletor já corrige assim em `fetchCombo`; sem a mesma correção aqui, a
      // pesquisa que o banco guarda como PR viraria uma AUSENTE fantasma no PA —
      // e virou, nas três primeiras leituras desta lista. Mesma regra, mesmo
      // regex; se um dia divergirem, é este relatório que grita primeiro.
      const regUf = (m.registro ?? "").match(/^([A-Z]{2})-/)?.[1];
      const uf = regUf && regUf !== "BR" && UF_IDS[regUf] && j.uf && regUf !== j.uf ? regUf : j.uf;

      const comum = {
        id: m.id,
        instituto: (m.instituto ?? "").trim() || null,
        race: j.race,
        uf,
        round: j.round,
        data: typeof m.data === "string" ? m.data.slice(0, 10) : null,
        registro: m.registro ?? null,
        integra: m.integra ?? null,
        noticia: m.noticias ?? null,
        entrevistas: m.entrevistas ?? null,
      };

      if (seg.falha) naoAlinhadas.push({ ...comum, motivo: seg.falha, apagadas: apagadasTotal.length });

      // Sem filtro de disputa: medido nesta varredura, cada par (id nativo, turno)
      // é servido por UMA combinação só (1.172 de 1.172), então todo registro
      // nosso com este id é desta disputa — e filtrar por UF aqui reintroduziria
      // justamente a UF errada que a linha acima acabou de corrigir.
      const nossosDaDisputa = porNativo.get(`${m.id}|${j.round}`) ?? [];

      if (!nossosDaDisputa.length) {
        // AUSENTE — mas só depois de perguntar a TODAS as fontes.
        const resgate = guardadas.find(
          (g) =>
            g.race === j.race &&
            (g.uf ?? null) === (j.uf ?? null) &&
            g.round === j.round &&
            mesmoInstituto(store, g, comum.instituto) &&
            perto(g.data, comum.data, janelaMs),
        );
        if (resgate) { resgatadas++; continue; } // outra fonte já trouxe: não é AUSENTE
        const apagadas = apagadasTotal.map((r) => r.percentual);
        ausentes.push({
          ...comum,
          apagadas: apagadas.sort((a, b) => b - a),
          linhasV1: candidatosV1.length,
          lider: Math.max(...candidatosV1.map((r) => r.percentual)),
          maiorOculta: apagadas.length ? Math.max(...apagadas) : 0,
          pontosOcultos: Math.round(apagadas.reduce((a, b) => a + b, 0) * 10) / 10,
          v2Cenarios: cenarios.length,
          pesoUf: pesoUf.get(uf ?? "BR") ?? 0,
          reparo: reparoJaEscrito(reparos, { ...comum }, janelaMs),
        });
        continue;
      }

      // CURTA / RECUPERADA — ancoradas em CADA registro nosso.
      for (const reg of nossosDaDisputa) {
        const idx = reg.nativo?.idx ?? 0;
        const cen = escolherCenario(cenarios, idx, reg, ehBalde);
        if (!cen) {
          // Nenhum cenário do `v2` bate com os percentuais que guardamos. NÃO é
          // desalinhamento entre `v1` e `v2`: é a fonte tendo REPUBLICADO outros
          // números desde a nossa coleta (o mesmo id serve 1,1 hoje onde o banco
          // tem 1,6, ou passa de 26,42 para 26,4), ou o `mergePolls` tendo
          // guardado sob um id `p360-` a tabela MAIS RICA da Wikipédia — que é a
          // regra do `richerRoster`, não um defeito. Sem cenário, não há como
          // atribuir uma linha apagada a esta pergunta, então ela sai da conta de
          // CURTA e é listada aqui com o estrago no nível da PESQUISA.
          naoConferidas.push({
            ...comum,
            registroBanco: reg.q.legacy_id ?? reg.q.question_id,
            armazenado: (reg.q.results ?? []).length,
            apagadas: apagadasTotal.map((r) => r.percentual).sort((a, b) => b - a),
            v2Cenarios: cenarios.length,
          });
          continue;
        }
        const b = seg.blocos[cen.i] ?? { apagadas: [] };
        const doCenario = (cen.cen.apuracao ?? []).filter((r) => typeof r?.percentual === "number" && !ehBalde((r.nome ?? "").trim()));
        const esperado = doCenario.length + b.apagadas.length;
        const armazenado = (reg.q.results ?? []).length;
        if (armazenado >= esperado) { if (b.apagadas.length) jaCobertas++; else recuperadas++; continue; }
        const pcts = b.apagadas.map((r) => r.percentual).sort((a, b2) => b2 - a);
        curtas.push({
          ...comum,
          registroBanco: reg.q.legacy_id ?? reg.q.question_id,
          questionId: reg.q.question_id,
          fonteBanco: reg.fonte,
          armazenado,
          esperado,
          faltam: esperado - armazenado,
          apagadas: pcts,
          maiorOculta: pcts.length ? pcts[0] : 0,
          pontosOcultos: Math.round(pcts.reduce((a, b2) => a + b2, 0) * 10) / 10,
          integra: reg.s.integra_url ?? m.integra ?? null,
          registro: reg.s.tse_registration ?? m.registro ?? null,
          pesoUf: pesoUf.get(uf ?? "BR") ?? 0,
          reparo: reparoJaEscrito(reparos, { ...comum }, janelaMs),
        });
      }
      if (seg.indeterminadas.length) {
        indeterminadas.push({ ...comum, linhas: seg.indeterminadas.map((r) => r.percentual).sort((a, b) => b - a) });
      }
    }
  }
  return { curtas, ausentes, indeterminadas, naoAlinhadas, naoConferidas, recuperadas, jaCobertas, resgatadas, idsComPerda, idsVistos, combinacoesComErro };
}

/**
 * A que cenário do `v2` corresponde ESTE registro nosso.
 *
 * O `idx` do id (`p360-<id>-<turno>-<idx>-…`) é o contrato de identidade do
 * cenário e é tentado primeiro; se não conferir (a fonte pode ter reordenado ou
 * inserido cenários desde a última coleta), procura-se o que confere. Não
 * conferir NENHUM é motivo de recusa, não de escolha (§4).
 *
 * A conferência é por PERCENTUAL, nunca por nome. O `name_raw` do banco não é a
 * grafia da fonte: ele já passou pela canonicalização, e é por isso que uma
 * comparação por nome reprovava 262 registros bons — "Lula" virou "Luiz Inácio
 * Lula da Silva", "Ratinho Jr" virou "Ratinho Júnior", "Professora Dorinha"
 * virou "Dorinha Rezende". O percentual não é reescrito por ninguém.
 *
 * Conferir é um dos dois conjuntos conter o outro: IGUAL no caso normal;
 * o nosso CONTENDO o do cenário quando um reparo acrescentou linhas ou a
 * retenção de elenco guardou as que a fonte largou.
 */
function escolherCenario(cenarios, idx, reg, ehBalde) {
  const guardados = (reg.q.results ?? []).map((r) => r.pct).filter((v) => typeof v === "number").sort((a, b) => a - b);
  const contido = (a, b) => {
    const resto = [...b];
    return a.every((v) => {
      const j = resto.indexOf(v);
      if (j < 0) return false;
      resto.splice(j, 1);
      return true;
    });
  };
  const confere = (c) => {
    const pcts = (c.apuracao ?? [])
      .filter((r) => typeof r?.percentual === "number" && !ehBalde((r.nome ?? "").trim()))
      .map((r) => r.percentual)
      .sort((a, b) => a - b);
    if (!pcts.length && !guardados.length) return true;
    return contido(pcts, guardados) || contido(guardados, pcts);
  };
  if (cenarios[idx] && confere(cenarios[idx])) return { i: idx, cen: cenarios[idx] };
  for (let i = 0; i < cenarios.length; i++) if (confere(cenarios[i])) return { i, cen: cenarios[i] };
  return null;
}

function mesmoInstituto(store, guardado, nomeV1) {
  if (!nomeV1) return false;
  const inst = resolveInstitute(store, nomeV1, { mint: false });
  if (inst && guardado.instituteId) return inst.institute_id === guardado.instituteId;
  return chaveNome(guardado.instituto) === chaveNome(nomeV1);
}

function perto(a, b, janelaMs) {
  if (!a || !b) return false; // sem data não se afirma que é a mesma operação
  return Math.abs(+new Date(a) - +new Date(b)) <= janelaMs;
}

// ---------------------------------------------------------------------------
// RELATÓRIO
// ---------------------------------------------------------------------------

const RACE_NOME = { presidente: "Presidente", governador: "Governador", senador: "Senado" };
const disputa = (r) => `${RACE_NOME[r.race] ?? r.race} · ${r.uf ?? "Brasil"}${r.round === 2 ? " · 2º turno" : ""}`;
const num = (n) => (n == null ? "—" : String(n).replace(".", ","));
const lista = (a) => (a.length ? a.map(num).join(" · ") : "—");

// Ordenação de IMPACTO, declarada: quanto do que está escondido é grande, depois
// se a disputa é nacional, depois o peso da UF (nº de pesquisas que o banco
// guarda dela — derivado do banco, não de uma tabela de eleitorado escrita à
// mão), depois a data mais recente e por fim o id. Determinístico (§8).
const porImpacto = (a, b) =>
  b.maiorOculta - a.maiorOculta ||
  (a.uf === null ? 0 : 1) - (b.uf === null ? 0 : 1) ||
  b.pesoUf - a.pesoUf ||
  b.pontosOcultos - a.pontosOcultos ||
  String(b.data ?? "").localeCompare(String(a.data ?? "")) ||
  a.id - b.id;

function relatorio(res, ctx) {
  const L = [];
  const { curtas, ausentes, indeterminadas, naoAlinhadas, naoConferidas, recuperadas, jaCobertas, resgatadas, idsComPerda, idsVistos, combinacoesComErro } = res;
  L.push("# Lacunas do Poder360 — o que a fonte está escondendo");
  L.push("");
  L.push("Gerado por `node scripts/lacunas-poder360.mjs`. **Enumeração, não reparo.**");
  L.push("");
  L.push("O `v2/cenarios` apaga em silêncio toda linha de candidato cujo campo `nome` chegou vazio;");
  L.push("o `v1/api` mantém a mesma linha, com o mesmo `percentual` e quase sempre o partido. A");
  L.push("diferença entre as duas leituras é o estrago, e ela é **enumerável** — é isto aqui.");
  L.push("");
  L.push(`Custo de uma rodada: **${ctx.chamadas} chamadas** à API (2 por combinação × ${ctx.combinacoes} combinações),`);
  L.push("em série e com pausa entre elas. O coletor gasta o mesmo, e é por isso que a coleta roda");
  L.push("2×/dia. Use `--cache=` para reler a mesma varredura sem tocar na fonte.");
  L.push("");
  L.push(`Janela de "mesma operação de campo": **${ctx.janelaDias} dias** — \`JANELA_OPERACAO_MS\` importada de`);
  L.push("`scripts/lib/store.mjs`, a mesma que `resolveSurvey`, `datesClose` e `repairs.mjs` usam. Não");
  L.push("escolhida aqui: escolher uma tolerância é a jogada proibida do §10.");
  L.push("");
  L.push("## Placar");
  L.push("");
  L.push("| população | o que é | quantas |");
  L.push("|---|---|---|");
  L.push(`| **CURTA** | guardamos a pesquisa e a fonte tem MAIS linhas do que gravamos | **${curtas.length}** |`);
  L.push(`| **AUSENTE** | a fonte tem a pesquisa e o banco não tem NADA para a disputa/instituto/data | **${ausentes.length}** |`);
  L.push(`| **RECUPERADA** | \`v1\` e \`v2\` concordam e o registro está completo | **${recuperadas}** |`);
  L.push(`| *já coberta* | o \`v2\` apagou linhas mas o banco já as tem (reparo aplicado ou elenco retido) | ${jaCobertas} |`);
  L.push(`| *resgatada* | sem id nativo nosso, mas OUTRA fonte já trouxe a pesquisa — **não** é AUSENTE | ${resgatadas} |`);
  L.push(`| *indeterminada* | linha apagada cuja fronteira de cenário não é demonstrável — **recusada**, não atribuída | ${indeterminadas.length} |`);
  L.push(`| *não conferida* | nenhum cenário do \`v2\` bate com os percentuais que guardamos — a fonte republicou | ${naoConferidas.length} |`);
  L.push(`| *não alinhada* | \`v1\` e \`v2\` não alinham entre si; a pesquisa é listada sem conta de linhas | ${naoAlinhadas.length} |`);
  L.push("");
  L.push(`Ids do \`v1\` varridos: **${idsVistos}** · ids em que o \`v2\` apaga ao menos uma linha: **${idsComPerda}**.`);
  if (combinacoesComErro.length) {
    L.push("");
    L.push(`⚠ **${combinacoesComErro.length} combinação(ões) falharam na varredura** — os números acima são um PISO:`);
    for (const c of combinacoesComErro) L.push(`- ${RACE_NOME[c.race]} · ${c.uf ?? "Brasil"} · ${c.round}º turno — ${c.erro}`);
  }
  L.push("");
  L.push("**AUSENTE não se testa contra o prefixo `p360-`.** Parte da perda do Poder360 é resgatada");
  L.push("por outra fonte — uma nacional da AtlasIntel está no banco pela Wikipédia, sem id nativo.");
  L.push("O teste aqui é instituto (resolvido pelo `resolveInstitute` do store, que segue aliases e");
  L.push("`merged_into`) + disputa + data dentro da janela, em TODAS as fontes.");
  L.push("");

  L.push("## AUSENTE — precisam de `add_poll` curado");
  L.push("");
  L.push("Ordenadas por impacto: maior percentual escondido, depois disputa nacional, depois peso da");
  L.push("UF (nº de pesquisas que o banco guarda dela — **derivado do banco**, não de uma tabela de");
  L.push("eleitorado escrita à mão), depois pontos ocultos, data e id.");
  L.push("");
  L.push("| # | id | instituto | disputa | campo | registro TSE | cenários v2 | linhas v1 | apagadas | % apagados | líder | integra | reparo já escrito |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  [...ausentes].sort(porImpacto).forEach((a, i) => {
    L.push(
      `| ${i + 1} | ${a.id} | ${a.instituto ?? "—"} | ${disputa(a)} | ${a.data ?? "—"} | ${a.registro ?? "—"} | ` +
        `${a.v2Cenarios} | ${a.linhasV1} | ${a.apagadas.length} | ${lista(a.apagadas)} | ${num(a.lider)} | ${a.integra ? `[PDF](${a.integra})` : "—"} | ${a.reparo ? `\`${a.reparo}\`` : "—"} |`,
    );
  });
  L.push("");

  L.push("## CURTA — precisam de `add_results`");
  L.push("");
  L.push("Ancoradas no NOSSO registro. `guardadas` é quantas linhas de candidato o banco tem;");
  L.push("`esperadas` é o que o cenário do `v2` traz **mais** as linhas que o `v2` apagou dele.");
  L.push("");
  L.push("| # | id | registro no banco | instituto | disputa | campo | registro TSE | guardadas | esperadas | faltam | % apagados | integra | reparo já escrito |");
  L.push("|---|---|---|---|---|---|---|---|---|---|---|---|---|");
  [...curtas].sort(porImpacto).forEach((c, i) => {
    L.push(
      `| ${i + 1} | ${c.id} | \`${c.registroBanco}\` | ${c.instituto ?? "—"} | ${disputa(c)} | ${c.data ?? "—"} | ` +
        `${c.registro ?? "—"} | ${c.armazenado} | ${c.esperado} | ${c.faltam} | ${lista(c.apagadas)} | ${c.integra ? `[PDF](${c.integra})` : "—"} | ${c.reparo ? `\`${c.reparo}\`` : "—"} |`,
    );
  });
  L.push("");

  if (indeterminadas.length) {
    L.push("## Indeterminadas — a fronteira de cenário não é demonstrável");
    L.push("");
    L.push("O `v1` achata os cenários numa lista só. Posição resolve quase tudo: o que está entre dois");
    L.push("nomes do mesmo bloco, antes do primeiro nome do primeiro bloco ou depois do último nome do");
    L.push("último é certo. Na FRONTEIRA entre dois blocos a divisão sai da ordenação da fonte (cada");
    L.push("bloco vem em percentual não crescente), conferida nas linhas nomeadas dos dois lados. Quando");
    L.push("mais de uma divisão fecha — ou nenhuma —, a linha não vai para lado nenhum: recusar");
    L.push("ambiguidade é §4, e o percentual fica registrado aqui para o curador decidir no PDF.");
    L.push("");
    L.push("| id | instituto | disputa | campo | % sem cenário provável |");
    L.push("|---|---|---|---|---|");
    for (const d of [...indeterminadas].sort((a, b) => a.id - b.id || String(a.race).localeCompare(String(b.race)))) {
      L.push(`| ${d.id} | ${d.instituto ?? "—"} | ${disputa(d)} | ${d.data ?? "—"} | ${lista(d.linhas)} |`);
    }
    L.push("");
  }
  if (naoConferidas.length) {
    L.push("## Não conferidas — a fonte republicou outros números");
    L.push("");
    L.push("Nenhum cenário que o `v2` serve hoje bate com os percentuais que o banco guarda para este");
    L.push("id. Não é desalinhamento entre `v1` e `v2`: é a fonte tendo mexido nos números depois da");
    L.push("nossa coleta (`1,6` virou `1,1`; `26,42` virou `26,4`), ou o `mergePolls` tendo guardado sob");
    L.push("um id `p360-` a tabela MAIS RICA da Wikipédia — que é a regra do `richerRoster`, não um");
    L.push("defeito. Sem cenário identificado não se afirma quantas linhas faltam **nesta pergunta**, e");
    L.push("por isso estas ficam FORA da conta de CURTA. O estrago abaixo é o da PESQUISA inteira.");
    L.push("");
    L.push("| id | registro no banco | instituto | disputa | campo | guardadas | cenários v2 | apagadas | % apagados |");
    L.push("|---|---|---|---|---|---|---|---|---|");
    for (const d of [...naoConferidas].sort((a, b) => b.apagadas.length - a.apagadas.length || a.id - b.id || String(a.registroBanco).localeCompare(String(b.registroBanco)))) {
      L.push(`| ${d.id} | \`${d.registroBanco}\` | ${d.instituto ?? "—"} | ${disputa(d)} | ${d.data ?? "—"} | ${d.armazenado} | ${d.v2Cenarios} | ${d.apagadas.length} | ${lista(d.apagadas)} |`);
    }
    L.push("");
  }
  if (naoAlinhadas.length) {
    L.push("## Não alinhadas — `v1` e `v2` não casam");
    L.push("");
    L.push("| id | instituto | disputa | campo | motivo |");
    L.push("|---|---|---|---|---|");
    for (const d of [...naoAlinhadas].sort((a, b) => a.id - b.id || String(a.race).localeCompare(String(b.race)))) {
      L.push(`| ${d.id} | ${d.instituto ?? "—"} | ${disputa(d)} | ${d.data ?? "—"} | ${d.motivo} |`);
    }
    L.push("");
  }
  L.push("---");
  L.push("");
  L.push("Nenhum reparo se escreve a partir desta tabela sozinha: a fonte primária de um reparo é o");
  L.push("relatório do instituto (`integra`), e o `v1` só diz **onde procurar** e **quantas linhas");
  L.push("procurar**. Uma linha do `v1` não tem nome — é exatamente o que falta para escrever o");
  L.push("reparo, e é o PDF que o supre.");
  return L.join("\n") + "\n";
}

// ---------------------------------------------------------------------------
// AUTOTESTE — o guarda tem de FALHAR quando deve (§2)
// ---------------------------------------------------------------------------

async function autoteste() {
  const r = (nome, percentual) => ({ nome, percentual });
  const falhas = [];
  const ok = (cond, msg) => { if (!cond) falhas.push(msg); };

  // 1. Palver 13807, 1º turno, tal como a fonte serve: os dois primeiros
  //    colocados de CADA cenário chegam sem nome.
  {
    const v1 = [
      r("", 44), r("", 40), r("Renan Santos", 10), r("Ronaldo Caiado", 2), r("Romeu Zema", 1), r("", 1),
      r("brancos / nulos", 1), r("Augusto Cury", 0), r("Cabo Daciolo", 0), r("Hertz Dias", 0),
      r("Rui Costa Pimenta", 0), r("", 0), r("não sabe dizer", 0),
      r("", 45), r("", 40), r("Renan Santos", 10), r("Ronaldo Caiado", 2), r("Romeu Zema", 1),
      r("brancos / nulos", 1), r("não iria votar", 0), r("não souberam", 0),
    ];
    const cen = [
      { apuracao: [r("Renan Santos", 10), r("Ronaldo Caiado", 2), r("Romeu Zema", 1), r("brancos / nulos", 1), r("Augusto Cury", 0), r("Cabo Daciolo", 0), r("Hertz Dias", 0), r("Rui Costa Pimenta", 0), r("não sabe dizer", 0)] },
      { apuracao: [r("Renan Santos", 10), r("Ronaldo Caiado", 2), r("Romeu Zema", 1), r("brancos / nulos", 1), r("não iria votar", 0), r("não souberam", 0)] },
    ];
    const s = segmentar(v1, cen);
    ok(!s.falha, "Palver: alinhou");
    ok(s.blocos[0].apagadas.map((x) => x.percentual).join() === "44,40,1,0", `Palver cenário 1: 44,40,1,0 (veio ${s.blocos[0].apagadas.map((x) => x.percentual)})`);
    ok(s.blocos[1].apagadas.map((x) => x.percentual).join() === "45,40", `Palver cenário 2: 45,40 (veio ${s.blocos[1].apagadas.map((x) => x.percentual)})`);
    ok(s.indeterminadas.length === 0, "Palver: nada indeterminado");
  }

  // 2. FRONTEIRA RESOLVIDA PELA ORDENAÇÃO — o 2º turno real do 13807. O bloco 1
  //    é só um balde (8) e o 46 que vem depois dele não pode continuar um bloco
  //    não crescente que terminou em 8, mas pode abrir o bloco que começa em 31.
  {
    const v1 = [r("", 46), r("", 46), r("brancos/nulos/não sabem", 8), r("", 46), r("Renan Santos", 31), r("não iria votar", 15)];
    const cen = [
      { apuracao: [r("brancos/nulos/não sabem", 8)] },
      { apuracao: [r("Renan Santos", 31), r("não iria votar", 15)] },
    ];
    const s = segmentar(v1, cen);
    ok(!s.falha, "fronteira: alinhou");
    ok(s.blocos[0].apagadas.length === 2, `fronteira: bloco 1 fica com os dois 46 iniciais (veio ${s.blocos[0].apagadas.length})`);
    ok(s.blocos[1].apagadas.length === 1 && s.blocos[1].apagadas[0].percentual === 46, "fronteira: o terceiro 46 abre o bloco 2");
    ok(s.indeterminadas.length === 0, "fronteira: nada indeterminado");
  }

  // 3. A RECUSA TEM DE DISPARAR (§2). Aqui as DUAS divisões fecham — 30 pode
  //    fechar o bloco que terminou em 50 ou abrir o que começa em 10 — e um
  //    empate desses se recusa, não se desempata.
  {
    const v1 = [r("A", 50), r("", 30), r("B", 10), r("não sabem", 5)];
    const cen = [{ apuracao: [r("A", 50)] }, { apuracao: [r("B", 10), r("não sabem", 5)] }];
    const s = segmentar(v1, cen);
    ok(!s.falha, "empate: alinhou");
    ok(s.indeterminadas.length === 1 && s.blocos[0].apagadas.length === 0 && s.blocos[1].apagadas.length === 0,
      `empate: a linha de fronteira tem de ficar INDETERMINADA (blocos ${s.blocos.map((b) => b.apagadas.length)}, indet ${s.indeterminadas.length})`);
  }

  // 3b. E a Futura 13816, em que o balde vem PENDURADO no fim do bloco: os 12
  //     apagados de antes do único nome sobrevivente são certos, e os dois de
  //     depois (6,2 e 4,8) não cabem em nenhum dos lados ⇒ recusados.
  {
    const v1 = [
      r("", 38.8), r("", 34.1), r("", 5.9), r("", 3.6), r("", 3.6), r("", 1.2), r("Rui Costa Pimenta", 0.8),
      r("", 0.7), r("", 0.4), r("", 0.1), r("", 6.2), r("", 4.8),
      r("Lula", 36.3), r("", 32.7), r("não sabe / não opinou", 3.9),
    ];
    const cen = [
      { apuracao: [r("Rui Costa Pimenta", 0.8)] },
      { apuracao: [r("Lula", 36.3), r("não sabe / não opinou", 3.9)] },
    ];
    const s = segmentar(v1, cen);
    ok(!s.falha, "Futura: alinhou");
    ok(s.blocos[0].apagadas.map((x) => x.percentual).join() === "38.8,34.1,5.9,3.6,3.6,1.2",
      `Futura: os 6 líderes apagados antes do único nome são certos (veio ${s.blocos[0].apagadas.map((x) => x.percentual)})`);
    ok(s.blocos[1].apagadas.map((x) => x.percentual).join() === "32.7",
      `Futura: o 32,7 entre Lula e o balde é certo (veio ${s.blocos[1].apagadas.map((x) => x.percentual)})`);
    ok(s.indeterminadas.map((x) => x.percentual).join() === "0.7,0.4,0.1,6.2,4.8",
      `Futura: a corrida de fronteira inteira é recusada (veio ${s.indeterminadas.map((x) => x.percentual)})`);
  }

  // 4. Desalinhamento é FALHA, não silêncio.
  {
    const s = segmentar([r("A", 50)], [{ apuracao: [r("Z", 99)] }]);
    ok(!!s.falha, "desalinhamento tem de virar falha");
  }

  // 5. Sem cenário nenhum no `v2`, tudo que não tem nome é perda desta pesquisa.
  {
    const s = segmentar([r("", 40), r("", 35), r("brancos", 5)], []);
    ok(s.semCenario && s.blocos[0].apagadas.length === 2, "sem cenário: 2 apagadas");
  }

  // 6. A janela vem do store, não daqui — e é um número inteiro de dias.
  {
    ok(Number.isFinite(JANELA_OPERACAO_MS) && JANELA_OPERACAO_MS > 0, "JANELA_OPERACAO_MS importada de lib/store.mjs");
    ok(Number.isInteger(JANELA_DIAS), `a janela é um número inteiro de dias (veio ${JANELA_DIAS})`);
  }

  // 7. Os mapas do coletor são lidos do próprio coletor, e BR = 6.
  {
    const m = await mapasDoColetor();
    ok(m.UF_IDS.SP === 27 && m.CARGO.presidente === 3, "UF_IDS/CARGO lidos de sources/poder360.mjs");
    ok(m.HEADERS.origin === "https://drive.poder360.com.br", "o Origin obrigatório vem do coletor");
    ok(Object.keys(m.UF_IDS).length === 27, `27 UFs (veio ${Object.keys(m.UF_IDS).length})`);
    ok(combinacoes(m).length === 137, `137 combinações = 274 chamadas (veio ${combinacoes(m).length})`);
  }

  if (falhas.length) {
    console.error("AUTOTESTE FALHOU:");
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("autoteste ok — segmentação, fronteira por ordenação, recusa de empate, desalinhamento, janela e mapas do coletor");
}

// ---------------------------------------------------------------------------

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");

if (process.argv.includes("--self-test")) {
  await autoteste();
} else {
  const mod = await mapasDoColetor();
  const banco = lerBanco();
  const cache = arg("cache") ? path.resolve(ROOT, arg("cache")) : null;
  const varredura = await varrer(mod, { cache });
  const res = classificar(varredura, banco, mod, JANELA_OPERACAO_MS);
  const md = relatorio(res, {
    chamadas: varredura.jobs.length * 2,
    combinacoes: varredura.jobs.length,
    janelaDias: JANELA_DIAS,
  });
  const out = path.resolve(ROOT, arg("out") ?? "LACUNAS_PODER360.md");
  fs.writeFileSync(out, md);
  console.log(`CURTA ${res.curtas.length} · AUSENTE ${res.ausentes.length} · RECUPERADA ${res.recuperadas}`);
  console.log(`  indeterminadas ${res.indeterminadas.length} · não conferidas ${res.naoConferidas.length} · não alinhadas ${res.naoAlinhadas.length}`);
  console.log(`  ids do v1 varridos ${res.idsVistos} · ids em que o v2 apaga ≥1 linha ${res.idsComPerda}`);
  console.log(`  com PDF do instituto: AUSENTE ${res.ausentes.filter((a) => a.integra).length}/${res.ausentes.length} · CURTA ${res.curtas.filter((c) => c.integra).length}/${res.curtas.length}`);
  console.log(`→ ${path.relative(ROOT, out)}`);
}
