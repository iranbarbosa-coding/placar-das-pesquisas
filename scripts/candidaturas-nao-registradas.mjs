#!/usr/bin/env node
// Quem foi testado em pesquisa e não se registrou — enumeração, nunca reparo.
//
// Lê o store e o casamento de nomes de urna já decidido, e lista, por disputa,
// quem apareceu em resultado de pesquisa sem ter candidatura registrada naquela
// disputa. Não escreve em `data/`, não repara nada, não reimplementa a média.
//
// Uso:
//   node scripts/candidaturas-nao-registradas.mjs [--out=CANDIDATURAS_NAO_REGISTRADAS.md]
//                                                 [--self-test]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { normNome, chaveDeDisputa } from "./lib/nomes.mjs";
import { contestOf, lerCandidaturas } from "./lib/candidaturas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Início da campanha — o corte do "período eleitoral" das colunas. */
export const INICIO_PERIODO_ELEITORAL = "2026-08-16";

/**
 * As grafias que `match-ballot-names.mjs` examinou, por disputa pesquisada.
 *
 * É a entrada dele — `data/nomes-crus.json` —, lida e não recontada: um segundo
 * casador aqui seria a segunda implementação da mesma regra (CONVENTIONS §5).
 * A forma de string pura é aceita porque um clone só tem `{nome, partidos}`
 * depois da primeira coleta.
 */
function universoExaminado(crus) {
  const m = new Map();
  for (const [contest, nomes] of Object.entries(crus ?? {})) {
    m.set(contest, new Set(nomes.map((n) => normNome(typeof n === "string" ? n : n?.nome))));
  }
  return m;
}

/** As recusas que o casador GRAVOU, indexadas como ele as gravou. */
function recusasDoCasador(ballot) {
  const s = new Set();
  for (const a of ballot?.ambiguos ?? []) s.add(`${a.contest}|${normNome(a.nome)}`);
  return s;
}

/**
 * A situação de uma pessoa numa disputa. Cinco desfechos, nunca menos.
 *
 * `grafias` são as formas sob as quais ela aparece nesta disputa — a grafia crua
 * publicada, o nome canônico e os apelidos da linha de candidato —, cada uma
 * carimbada com a chave de disputa PESQUISADA.
 *
 *   1. tem candidatura NESTA disputa                     → registrada
 *   2. tem candidatura em OUTRA                          → outra disputa
 *   3. o casador recusou alguma grafia por ambiguidade   → não determinado
 *   4. alguma grafia nunca foi examinada pelo casador    → não determinado
 *   5. outra linha de pessoa carrega a mesma grafia e
 *      TEM candidatura                                   → contradição
 *   6. todas examinadas, nenhuma achou candidatura       → sem candidatura
 *
 * O passo 4 é conjuntivo ("alguma", não "nenhuma"): basta uma grafia fora do
 * universo examinado para a negativa deixar de ser sobre a PESSOA.
 *
 * A chave de exame NÃO dobra `presidente:<UF>` para `presidente:BR`, ao
 * contrário da pergunta sobre candidatura: o conjunto de grafias publicadas de
 * uma subamostra estadual não é o da nacional.
 *
 * O passo 5 não decide nada — registra que o banco se contradiz sobre uma
 * grafia. Ele mistura espécies (a mesma pessoa em duas linhas, homônimos já
 * declarados diferentes, casos sem documento) e separá-las é ruling de humano.
 */
export function situacao(pessoa, disputa, grafias, { examinado, recusado, registradoPorGrafia }) {
  const candidaturas = (pessoa?.candidacies ?? []).map((c) => contestOf(c.cargo, c.uf));
  if (candidaturas.includes(disputa)) return { classe: "registrada", outras: [] };
  // Registrada em outra disputa. `outras` sai ordenada e sem repetição: a linha
  // vai para arquivo versionado e não pode depender da ordem do NDJSON (§8).
  if (candidaturas.length) {
    return { classe: "outra-disputa", outras: [...new Set(candidaturas)].sort() };
  }
  for (const g of grafias) if (recusado.has(`${g.contest}|${normNome(g.nome)}`)) {
    return { classe: "nao-determinado", outras: [], motivo: `o casador recusou "${g.nome}" em ${g.contest} por ambiguidade` };
  }
  for (const g of grafias) if (!examinado.get(g.contest)?.has(normNome(g.nome))) {
    return { classe: "nao-determinado", outras: [], motivo: `"${g.nome}" não está entre as grafias que o casador examinou em ${g.contest}` };
  }
  // A consulta de contradição é mais larga que a de exame: "o casador examinou
  // esta grafia?" é pergunta sobre uma disputa; "o banco se contradiz sobre esta
  // pessoa?" é pergunta sobre a pessoa, que é global.
  const contradiz = [];
  const amplas = [...grafias.map((g) => g.nome), pessoa?.display, ...(pessoa?.polled_names ?? [])].filter(Boolean);
  for (const nome of amplas) {
    for (const o of registradoPorGrafia?.get(normNome(nome)) ?? []) {
      if (o.person_id === pessoa?.person_id) continue;
      // A mesma linha registrada alcançada por duas grafias é uma linha só.
      if (contradiz.some((x) => x.person_id === o.person_id)) continue;
      // A grafia vai como foi PUBLICADA: `normNome` casa, não exibe.
      contradiz.push({ ...o, grafia: nome });
    }
  }
  if (contradiz.length) {
    // Ordem estável: `person_id` não empata (§8).
    contradiz.sort((a, b) => porNome(a.person_id, b.person_id));
    return { classe: "contradicao", outras: [], contradiz };
  }
  return { classe: "sem-candidatura", outras: [] };
}

/**
 * Índice `normNome(grafia)` → linhas de pessoa que TÊM candidatura e carregam
 * aquela grafia (`polled_names`, `display`, `nome_urna`).
 *
 * Indexação do que `people.ndjson` já afirma, com o único normalizador do
 * repositório. Não é casamento.
 */
export function registradosPorGrafia(people) {
  const m = new Map();
  for (const p of people ?? []) {
    const contests = (p.candidacies ?? []).map((c) => contestOf(c.cargo, c.uf));
    if (!contests.length) continue;
    const linha = { person_id: p.person_id, display: p.display ?? p.person_id, contests: [...new Set(contests)].sort() };
    for (const g of [...(p.polled_names ?? []), p.display, p.nome_urna]) {
      const k = normNome(g);
      if (!k) continue;
      if (!m.has(k)) m.set(k, []);
      if (!m.get(k).some((x) => x.person_id === p.person_id)) m.get(k).push(linha);
    }
  }
  // Ordem estável dentro de cada grafia (§8).
  for (const lista of m.values()) lista.sort((a, b) => porNome(a.person_id, b.person_id));
  return m;
}

/**
 * O que a negativa desta disputa realmente cobre.
 *
 * A reserva de registro inteiro de `match-ballot-names.mjs` descarta candidatura
 * de outra UF quando a UF da candidatura não é "BR". Então numa disputa estadual
 * o provado é "nenhuma nesta UF nem entre as nacionais"; só na disputa nacional
 * é "nenhuma no registro inteiro".
 */
export function alcanceDaNegativa(disputa) {
  const uf = String(disputa).split(":")[1] ?? "BR";
  return uf === "BR"
    ? "nenhuma no registro inteiro"
    : `nenhuma em \`${uf}\` nem nacional`;
}

// ---------------------------------------------------------------------------
// AGREGAÇÃO
// ---------------------------------------------------------------------------

/** A chave de disputa de uma pergunta: `presidente:SP` dobra para `presidente:BR`. */
const disputaDaPergunta = (q) => chaveDeDisputa(`${q.race}:${q.uf ?? "BR"}`);
/** A chave de disputa PESQUISADA, que é a que o casador usou. NÃO dobra. */
const chavePesquisada = (q) => `${q.race}:${q.uf ?? "BR"}`;

/**
 * Ordem estável de rótulos de confronto e de nomes.
 *
 * `localeCompare` sem locale é o que o resto do repositório usa (`identityConflicts`,
 * os desempates de `lacunas-poder360.mjs`), e o desempate final é sempre um campo
 * que não pode empatar — `person_id` ou a própria chave do confronto (§8).
 */
const porNome = (a, b) => a.localeCompare(b) || (a < b ? -1 : a > b ? 1 : 0);

/**
 * A janela de campo de um levantamento, com a ausência REPRESENTADA.
 *
 * `fieldwork_end` é nulo em 2 dos 1.010 levantamentos. Contar um nulo como
 * "fora do período eleitoral" seria afirmar uma data que não temos; ele sai numa
 * coluna própria (§4). O fim do campo é a data usada porque é ela que diz quando
 * a pergunta parou de ser feita — que é a pergunta do criador.
 */
const fimDeCampo = (s) => s?.fieldwork_end ?? null;

/**
 * O catálogo inteiro, como dado. Puro: recebe as tabelas e devolve estrutura.
 *
 * Nada de `Date.now()`, nada de ordem de array decidindo saída (§8) — o autoteste
 * embaralha as entradas e compara o JSON, e é ele que segura essa promessa.
 */
export function catalogar({ questions, surveys, candidates, people, crus, ballot, candidaturas = [], inicioPeriodo = INICIO_PERIODO_ELEITORAL }) {
  const examinado = universoExaminado(crus);
  const recusado = recusasDoCasador(ballot);
  const porGrafia = registradosPorGrafia(people);
  const porId = new Map(candidates.map((c) => [c.candidate_id, c]));
  const pessoaPorId = new Map(people.map((p) => [p.person_id, p]));
  const levantamento = new Map(surveys.map((s) => [s.survey_id, s]));

  // 1. Por (disputa, pessoa): grafias vistas, cenários, levantamentos, datas.
  const pessoas = new Map();
  // 2. Por (disputa, conjunto de pessoas) nos cenários de 2º turno: o confronto.
  const confrontos = new Map();
  // 3. O denominador: todos os confrontos de 2º turno da disputa, inclusive os
  //    em que todo mundo se registrou.
  const totais = new Map();
  const total = (d) => {
    let t = totais.get(d);
    if (!t) { t = { confrontos: new Set(), cenarios: 0, confrontosNacionais: new Set(), cenariosNacionais: 0 }; totais.set(d, t); }
    return t;
  };
  // O denominador do período eleitoral: quantos cenários o banco tem após o corte.
  const periodo = { cenarios: 0, levantamentos: new Set() };

  const registrar = (mapa, chave, base) => {
    let e = mapa.get(chave);
    if (!e) { e = { ...base, cenarios: 0, levantamentos: new Set(), primeiro: null, ultimo: null, noPeriodo: 0, semData: 0, nacionais: 0 }; mapa.set(chave, e); }
    return e;
  };
  const contar = (e, q, s) => {
    e.cenarios++;
    e.levantamentos.add(q.survey_id);
    if (q.uf == null) e.nacionais++;
    const d = fimDeCampo(s);
    if (!d) { e.semData++; return; }
    if (!e.primeiro || d < e.primeiro) e.primeiro = d;
    if (!e.ultimo || d > e.ultimo) e.ultimo = d;
    if (d >= inicioPeriodo) e.noPeriodo++;
  };

  for (const q of questions) {
    const disputa = disputaDaPergunta(q);
    const pesquisada = chavePesquisada(q);
    const s = levantamento.get(q.survey_id) ?? null;
    const fim = fimDeCampo(s);
    if (fim && fim >= inicioPeriodo) { periodo.cenarios++; periodo.levantamentos.add(q.survey_id); }
    const ids = [];
    for (const r of q.results ?? []) {
      const c = porId.get(r.candidate_id);
      // Resultado sem candidato no store é defeito de integridade, e quem
      // reprova por isso é `validate-store.mjs`. Aqui é ignorado.
      if (!c) continue;
      ids.push(c.person_id);
      const chave = `${disputa}|${c.person_id}`;
      const e = registrar(pessoas, chave, { disputa, person_id: c.person_id, grafias: new Map() });
      for (const nome of [r.name_raw, c.canonical, ...(c.aliases ?? [])]) {
        if (nome) e.grafias.set(`${pesquisada}|${normNome(nome)}`, { contest: pesquisada, nome });
      }
      contar(e, q, s);
    }
    if (q.round !== 2) continue;
    const conjunto = [...new Set(ids)].sort();
    if (!conjunto.length) continue;
    const chave = `${disputa}|${conjunto.join(",")}`;
    contar(registrar(confrontos, chave, { disputa, pessoas: conjunto }), q, s);
    const t = total(disputa);
    t.confrontos.add(chave); t.cenarios++;
    if (q.uf == null) { t.confrontosNacionais.add(chave); t.cenariosNacionais++; }
  }

  // 3. Situação de cada pessoa, e só então a do confronto.
  const situacoes = new Map();
  for (const e of pessoas.values()) {
    const p = pessoaPorId.get(e.person_id) ?? null;
    e.pessoa = p;
    e.situacao = situacao(p, e.disputa, [...e.grafias.values()], { examinado, recusado, registradoPorGrafia: porGrafia });
    situacoes.set(`${e.disputa}|${e.person_id}`, e.situacao);
    e.display = p?.display ?? e.person_id;
  }
  for (const c of confrontos.values()) {
    const ss = c.pessoas.map((id) => situacoes.get(`${c.disputa}|${id}`)?.classe ?? "nao-determinado");
    c.semCandidatura = c.pessoas.filter((id, i) => ss[i] === "sem-candidatura" || ss[i] === "outra-disputa");
    // Contradição conta como recusa, nunca como afirmação.
    c.indeterminados = c.pessoas.filter((id, i) => ss[i] === "nao-determinado" || ss[i] === "contradicao");
    c.classe = c.semCandidatura.length ? "afirmado" : c.indeterminados.length ? "nao-determinado" : "todos-registrados";
    c.rotulo = c.pessoas.map((id) => pessoaPorId.get(id)?.display ?? id).sort(porNome).join(" × ");
  }

  // 4. Ordem determinística e final: nada aqui depende de ordem de leitura.
  const disputas = new Map();
  const secao = (d) => {
    if (!disputas.has(d)) {
      const t = totais.get(d);
      disputas.set(d, {
        disputa: d, candidatos: [], indeterminados: [], contradicoes: [], confrontos: [], confrontosIndeterminados: [],
        total2T: t?.confrontos.size ?? 0, cenarios2T: t?.cenarios ?? 0,
        total2TNacional: t?.confrontosNacionais.size ?? 0, cenarios2TNacional: t?.cenariosNacionais ?? 0,
      });
    }
    return disputas.get(d);
  };
  for (const e of [...pessoas.values()]) {
    if (e.situacao.classe === "registrada") continue;
    const linha = {
      disputa: e.disputa, person_id: e.person_id, display: e.display,
      classe: e.situacao.classe, outras: e.situacao.outras, motivo: e.situacao.motivo ?? null,
      contradiz: e.situacao.contradiz ?? [],
      cenarios: e.cenarios, levantamentos: e.levantamentos.size, nacionais: e.nacionais,
      primeiro: e.primeiro, ultimo: e.ultimo, noPeriodo: e.noPeriodo, semData: e.semData,
      grafias: [...e.grafias.values()].map((g) => g.nome).sort(porNome),
    };
    const s = secao(e.disputa);
    const destino = { "nao-determinado": s.indeterminados, contradicao: s.contradicoes }[linha.classe] ?? s.candidatos;
    destino.push(linha);
  }
  for (const c of confrontos.values()) {
    if (c.classe === "todos-registrados") continue;
    const linha = {
      disputa: c.disputa, rotulo: c.rotulo, chave: c.pessoas.join(","),
      cenarios: c.cenarios, levantamentos: c.levantamentos.size, nacionais: c.nacionais,
      primeiro: c.primeiro, ultimo: c.ultimo, noPeriodo: c.noPeriodo, semData: c.semData,
      quem: c.semCandidatura.map((id) => pessoaPorId.get(id)?.display ?? id).sort(porNome),
      indeterminados: c.indeterminados.map((id) => pessoaPorId.get(id)?.display ?? id).sort(porNome),
    };
    const s = secao(c.disputa);
    (c.classe === "afirmado" ? s.confrontos : s.confrontosIndeterminados).push(linha);
  }

  // Desempate final sempre num campo que não empata: `person_id` para candidato,
  // o conjunto de ids para confronto (§8). Nomes iguais existem no banco.
  const porPeso = (a, b) =>
    b.cenarios - a.cenarios ||
    String(b.ultimo ?? "").localeCompare(String(a.ultimo ?? "")) ||
    porNome(a.display ?? a.rotulo, b.display ?? b.rotulo) ||
    porNome(a.person_id ?? a.chave, b.person_id ?? b.chave);
  for (const s of disputas.values()) {
    s.candidatos.sort(porPeso); s.indeterminados.sort(porPeso); s.contradicoes.sort(porPeso);
    s.confrontos.sort(porPeso); s.confrontosIndeterminados.sort(porPeso);
  }

  // A ordem das seções: presidencial, depois governador por UF, depois senador.
  const ordemRace = { presidente: 0, governador: 1, senador: 2 };
  const lista = [...disputas.values()].sort((a, b) => {
    const [ra, ua] = a.disputa.split(":");
    const [rb, ub] = b.disputa.split(":");
    return (ordemRace[ra] ?? 9) - (ordemRace[rb] ?? 9) || porNome(ua, ub);
  });

  const somar = (f) => lista.reduce((n, s) => n + f(s), 0);
  return {
    disputas: lista,
    inicioPeriodo,
    // Os dois números que a prosa cita saem do REGISTRO, nunca digitados.
    candidaturasNacionais: (candidaturas ?? []).filter((c) => c.uf == null).length,
    ufsNaoProcuradas: Math.max(0, new Set((candidaturas ?? []).map((c) => c.uf).filter(Boolean)).size - 1),
    periodo: { cenarios: periodo.cenarios, levantamentos: periodo.levantamentos.size },
    placar: {
      total2T: [...totais.values()].reduce((n, t) => n + t.confrontos.size, 0),
      cenarios2T: [...totais.values()].reduce((n, t) => n + t.cenarios, 0),
      disputasComLinha: lista.length,
      candidatos: somar((s) => s.candidatos.length),
      semCandidatura: somar((s) => s.candidatos.filter((c) => c.classe === "sem-candidatura").length),
      // O corte que a glosa do placar precisa: a negativa não tem o mesmo
      // alcance nos dois casos. Ver `alcanceDaNegativa`.
      semCandidaturaNacional: somar((s) => (s.disputa.endsWith(":BR") ? s.candidatos.filter((c) => c.classe === "sem-candidatura").length : 0)),
      semCandidaturaEstadual: somar((s) => (s.disputa.endsWith(":BR") ? 0 : s.candidatos.filter((c) => c.classe === "sem-candidatura").length)),
      outraDisputa: somar((s) => s.candidatos.filter((c) => c.classe === "outra-disputa").length),
      indeterminados: somar((s) => s.indeterminados.length),
      contradicoes: somar((s) => s.contradicoes.length),
      confrontos: somar((s) => s.confrontos.length),
      confrontosIndeterminados: somar((s) => s.confrontosIndeterminados.length),
      cenariosDeConfronto: somar((s) => s.confrontos.reduce((n, c) => n + c.cenarios, 0)),
      noPeriodoCandidatos: somar((s) => s.candidatos.reduce((n, c) => n + c.noPeriodo, 0)),
      noPeriodoConfrontos: somar((s) => s.confrontos.reduce((n, c) => n + c.noPeriodo, 0)),
    },
  };
}

/**
 * `ESCOPO_ESTREITO` é derivado de `alcanceDaNegativa`: a disputa em que a
 * negativa sai escopada é aquela em que a busca não varreu o registro inteiro.
 */
export const ESCOPO_ESTREITO = alcanceDaNegativa("governador:XX").includes("nem nacional") ? "estadual" : "nacional";
export const ESCOPO_AMPLO = ESCOPO_ESTREITO === "estadual" ? "nacional" : "estadual";

/**
 * A seção "o que esta lista não enxerga", em linhas de markdown.
 *
 * Pura e com dois ramos opostos, para que o autoteste possa exercitar os dois:
 * inverter o sentido exige inverter o ramo.
 */
export function fraseResiduo(cat) {
  const p = cat.placar;
  const L = ["## ⚠ O que esta lista NÃO enxerga", ""];
  if (!p.semCandidaturaEstadual) {
    L.push(`Nada — **as ${p.semCandidatura} linhas afirmadas são todas da disputa ${ESCOPO_AMPLO}**, onde o casador de nomes`);
    L.push("varreu o registro inteiro. Não há resíduo desta espécie neste arquivo hoje.");
    L.push("");
    return L;
  }
  L.push(`Numa disputa **${ESCOPO_ESTREITO}** o casador de nomes só procurou o nome na UF daquela disputa e`);
  L.push(`entre as ${cat.candidaturasNacionais} candidaturas nacionais — **ele não olha os outros ${cat.ufsNaoProcuradas} estados**. Então quem se`);
  L.push("registrou num estado que não foi procurado, **e** que nunca foi pesquisado sob uma grafia que");
  L.push("colidisse com a de alguém registrado, **continua aparecendo aqui como sem candidatura**: são as");
  L.push(`**${p.semCandidaturaEstadual} de ${p.semCandidatura}** linhas afirmadas que saem de disputa ${ESCOPO_ESTREITO}.`);
  L.push("");
  L.push("**Se uma linha desta lista importar para uma decisão, confira o nome no registro antes de agir.**");
  L.push("");
  L.push(`Nas ${p.semCandidaturaNacional} linhas da disputa ${ESCOPO_AMPLO} a busca varreu o registro inteiro, e ali a negativa é forte.`);
  L.push("");
  return L;
}

// ---------------------------------------------------------------------------
// RELATÓRIO
// ---------------------------------------------------------------------------

const RACE_NOME = { presidente: "Presidente", governador: "Governador", senador: "Senado" };
const tituloDisputa = (d) => {
  const [race, uf] = d.split(":");
  return `${RACE_NOME[race] ?? race} · ${uf === "BR" ? "Brasil" : uf}`;
};
/** Data em pt-BR: `DD/MM/AAAA` (§11). Nulo vira travessão, nunca uma data inventada. */
const dt = (s) => (s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : "—");
const outrasCol = (l) =>
  l.classe === "outra-disputa" ? l.outras.map((o) => `\`${o}\``).join(" · ") : alcanceDaNegativa(l.disputa);

function relatorio(cat) {
  const L = [];
  const p = cat.placar;
  L.push("# Candidaturas não registradas — quem foi testado e não se registrou");
  L.push("");
  L.push("Gerado por `node scripts/candidaturas-nao-registradas.mjs`. **Enumeração, não reparo.**");
  L.push("");
  L.push("Muita pesquisa deste banco testou gente que depois não registrou candidatura para aquela");
  L.push("disputa. **Isso não é erro de dado e não se corrige aqui**: o instituto perguntou mesmo, e na");
  L.push("data em que perguntou ninguém sabia quem ia se registrar. Quem foi testado e não se registrou");
  L.push("fica, porque é fato sobre a pesquisa. Este arquivo apenas cataloga.");
  L.push("");
  L.push(`**Período eleitoral: a partir de ${dt(cat.inicioPeriodo)}** (início da campanha). A coluna **no período** conta`);
  L.push("cenários cujo **fim de campo** é dessa data em diante.");
  L.push("");
  L.push("Nenhuma conta de média aqui: `src/lib/average.ts` é dono de quais pesquisas entram na média.");
  L.push("As colunas são fato cru — cenários, datas, e qual candidatura consta do registro.");
  L.push("");

  L.push("## Placar");
  L.push("");
  L.push("| população | o que é | quantas |");
  L.push("|---|---|---|");
  L.push(`| **SEM CANDIDATURA** | a pessoa não tem candidatura nesta disputa, e o casador procurou o nome dela **até onde alcança**: no registro inteiro nas ${p.semCandidaturaNacional} linhas da disputa nacional, e só na UF da disputa mais as ${cat.candidaturasNacionais} candidaturas nacionais nas ${p.semCandidaturaEstadual} estaduais | **${p.semCandidatura}** |`);
  L.push(`| **OUTRA DISPUTA** | a pessoa não tem candidatura nesta disputa mas TEM em outra — o caso Tarcísio | **${p.outraDisputa}** |`);
  L.push(`| *contradição no nosso banco* | outra linha de pessoa carrega a MESMA grafia e TEM candidatura — **recusado**, nunca afirmado | ${p.contradicoes} |`);
  L.push(`| *não determinado* | não dá para afirmar nem uma coisa nem outra — **recusado**, nunca contado como não registrada | ${p.indeterminados} |`);
  L.push(`| **confrontos de 2º turno** | confrontos com ao menos um dos dois acima | **${p.confrontos}** |`);
  L.push(`| *confrontos não determinados* | nenhum afirmado, mas ao menos um não determinado | ${p.confrontosIndeterminados} |`);
  L.push(`| *denominador* | confrontos de 2º turno que o banco guarda ao todo, inclusive os em que todo mundo se registrou | ${p.total2T} |`);
  L.push("");
  L.push(`Disputas com ao menos uma linha: **${p.disputasComLinha}** · cenários de 2º turno alcançados pelos confrontos afirmados: **${p.cenariosDeConfronto}** de ${p.cenarios2T}.`);
  L.push(`Cenários no período eleitoral: **${p.noPeriodoCandidatos}** nas linhas de candidato, **${p.noPeriodoConfrontos}** nas de confronto —`);
  L.push(`de **${cat.periodo.cenarios}** cenários que o banco tem com campo encerrado em ${dt(cat.inicioPeriodo)} ou depois, em ${cat.periodo.levantamentos} levantamento(s).`);
  L.push("");

  for (const linha of fraseResiduo(cat)) L.push(linha);
  L.push("## Como cada linha é classificada");
  L.push("");
  L.push("\"Esta pessoa tem candidatura nesta disputa?\" é respondida por `data/people.ndjson`, onde");
  L.push("`resolvePerson` — via `ballotCandidacy` e `data/ballot-names.json` — já gravou com que");
  L.push("candidatura do TSE cada pessoa casou. Não há segundo casador nem segundo normalizador aqui.");
  L.push("");
  L.push("1. tem candidatura **nesta** disputa → registrada, não entra neste arquivo;");
  L.push("2. tem candidatura em **outra** disputa → **OUTRA DISPUTA**, e a disputa vai na coluna;");
  L.push("3. o casador **recusou** alguma grafia por ambiguidade (`ballot-names.json.ambiguos`) → **não determinado**;");
  L.push("4. alguma grafia **nunca foi examinada** pelo casador (não está em `data/nomes-crus.json` da disputa pesquisada) → **não determinado**;");
  L.push("5. **outra linha de pessoa deste banco carrega a mesma grafia e TEM candidatura** → *contradição*;");
  L.push("6. todas examinadas e nenhuma achou candidatura ao alcance do casador → **SEM CANDIDATURA**.");
  L.push("");
  L.push("O balde de *contradição* não decide nada: ele mistura a mesma pessoa partida em duas linhas,");
  L.push("homônimos que a curadoria já declarou pessoas diferentes, e casos indecidíveis sem documento.");
  L.push("Separar as três espécies é decisão de um humano.");
  L.push("");
  L.push("---");
  L.push("");

  for (const s of cat.disputas) {
    L.push(`## ${tituloDisputa(s.disputa)} — \`${s.disputa}\``);
    L.push("");
    const nac = s.disputa === "presidente:BR";
    if (s.candidatos.length) {
      L.push("### Testados sem candidatura na disputa");
      L.push("");
      L.push(`| # | candidato | \`person_id\` | cenários |${nac ? " nacionais |" : ""} levantamentos | 1º campo | último campo | no período | s/ data | candidatura em outra disputa |`);
      L.push(`|---|---|---|---|${nac ? "---|" : ""}---|---|---|---|---|---|`);
      s.candidatos.forEach((l, i) => {
        L.push(`| ${i + 1} | ${l.display} | \`${l.person_id}\` | ${l.cenarios} |${nac ? ` ${l.nacionais} |` : ""} ${l.levantamentos} | ${dt(l.primeiro)} | ${dt(l.ultimo)} | ${l.noPeriodo} | ${l.semData} | ${outrasCol(l)} |`);
      });
      L.push("");
    }
    if (s.confrontos.length) {
      L.push("### Confrontos de 2º turno com ao menos um deles");
      L.push("");
      L.push(`${s.confrontos.length} de **${s.total2T}** confrontos de 2º turno que o banco guarda nesta disputa` +
        (nac ? ` (amostra nacional: ${s.confrontos.filter((c) => c.nacionais > 0).length} de ${s.total2TNacional}, em ${s.confrontos.reduce((n, c) => n + c.nacionais, 0)} de ${s.cenarios2TNacional} cenários).` : "."));
      L.push("");
      L.push(`| # | confronto | cenários |${nac ? " nacionais |" : ""} levantamentos | 1º campo | último campo | no período | s/ data | quem não tem candidatura na disputa |`);
      L.push(`|---|---|---|${nac ? "---|" : ""}---|---|---|---|---|---|`);
      s.confrontos.forEach((l, i) => {
        L.push(`| ${i + 1} | ${l.rotulo} | ${l.cenarios} |${nac ? ` ${l.nacionais} |` : ""} ${l.levantamentos} | ${dt(l.primeiro)} | ${dt(l.ultimo)} | ${l.noPeriodo} | ${l.semData} | ${l.quem.join(" · ")} |`);
      });
      L.push("");
    }
    if (s.contradicoes.length) {
      L.push("### Recusados — o nosso próprio banco carrega a mesma grafia registrada");
      L.push("");
      L.push("Outra linha de `people.ndjson` carrega a mesma grafia normalizada **e tem** candidatura.");
      L.push("Não é afirmação de que sejam a mesma pessoa, nem de que não sejam.");
      L.push("");
      L.push("| candidato | `person_id` | cenários | 1º campo | último campo | no período | a linha que contradiz |");
      L.push("|---|---|---|---|---|---|---|");
      for (const l of s.contradicoes) {
        const c = l.contradiz.map((x) => `${x.display} \`${x.person_id}\` ${x.contests.map((k) => `\`${k}\``).join(" · ")} — pela grafia \"${x.grafia}\"`).join(" ; ");
        L.push(`| ${l.display} | \`${l.person_id}\` | ${l.cenarios} | ${dt(l.primeiro)} | ${dt(l.ultimo)} | ${l.noPeriodo} | ${c} |`);
      }
      L.push("");
    }
    if (s.indeterminados.length || s.confrontosIndeterminados.length) {
      L.push("### Não determinados — recusa, não afirmação");
      L.push("");
      if (s.indeterminados.length) {
        L.push(`| candidato | \`person_id\` | cenários | 1º campo | último campo | no período | por que não dá para afirmar |`);
        L.push("|---|---|---|---|---|---|---|");
        for (const l of s.indeterminados) {
          L.push(`| ${l.display} | \`${l.person_id}\` | ${l.cenarios} | ${dt(l.primeiro)} | ${dt(l.ultimo)} | ${l.noPeriodo} | ${l.motivo ?? "—"} |`);
        }
        L.push("");
      }
      if (s.confrontosIndeterminados.length) {
        L.push(`| confronto | cenários | 1º campo | último campo | no período | quem não foi determinado |`);
        L.push("|---|---|---|---|---|---|");
        for (const l of s.confrontosIndeterminados) {
          L.push(`| ${l.rotulo} | ${l.cenarios} | ${dt(l.primeiro)} | ${dt(l.ultimo)} | ${l.noPeriodo} | ${l.indeterminados.join(" · ")} |`);
        }
        L.push("");
      }
    }
  }

  L.push("---");
  L.push("");
  L.push("Nada se corrige a partir deste arquivo.");
  return L.join("\n") + "\n";
}

// Sem o registro do TSE toda pessoa pareceria não registrada; sem
// `nomes-crus.json` nada consta como examinado e tudo cai em não determinado.
// As duas falham alto, ancoradas nas ENTRADAS — este gerador nunca lê a própria
// saída (CONVENTIONS §6).
function exigirEntradas({ candidaturas, crus, ballot }) {
  const faltas = [];
  if (!candidaturas.length) faltas.push("`data/candidaturas.ndjson` está vazio ou ausente — sem o registro do TSE toda pessoa pareceria não registrada. Rode `scripts/fetch-candidaturas.mjs` primeiro.");
  if (!Object.keys(crus ?? {}).length) faltas.push("`data/nomes-crus.json` está vazio ou ausente — sem ele nenhuma grafia consta como examinada e tudo cairia em não determinado.");
  if (!Object.keys(ballot?.mapping ?? {}).length) faltas.push("`data/ballot-names.json` não tem mapeamento — rode `scripts/match-ballot-names.mjs` primeiro.");
  if (faltas.length) {
    console.error("RECUSADO — este relatório não roda sem as entradas que o sustentam:");
    for (const f of faltas) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
}

const lerJson = (f, padrao) => (fs.existsSync(f) ? JSON.parse(fs.readFileSync(f, "utf-8")) : padrao);

/** O caminho único de produção do arquivo — usado pelo CLI e pelo autoteste. */
export function gerar(entrada) {
  const cat = catalogar(entrada);
  return { cat, md: relatorio(cat) };
}

// ---------------------------------------------------------------------------
// AUTOTESTE — o guarda tem de FALHAR quando deve (§2)
// ---------------------------------------------------------------------------

function fixtures() {
  // Uma disputa presidencial e uma estadual, com um representante de cada classe.
  const surveys = [
    { survey_id: "s1", fieldwork_end: "2026-03-23" },
    { survey_id: "s2", fieldwork_end: "2026-08-17" },  // dentro do período eleitoral
    { survey_id: "s3", fieldwork_end: null },          // sem data — nunca "fora"
    // ⚠ O PRÓPRIO DIA DO CORTE. Sem ele, `>=` e `>` dão o mesmo resultado e a
    // data que dá nome ao relatório nunca é exercitada — foi assim que duas
    // mutações de fronteira passaram verdes na primeira bateria.
    { survey_id: "s4", fieldwork_end: "2026-08-16" },
    // Véspera: prova que o corte não pegou um dia a mais para o lado de trás.
    { survey_id: "s5", fieldwork_end: "2026-08-15" },
  ];
  const people = [
    { person_id: "p_lula", display: "Lula", registered: true, candidacies: [{ cargo: "presidente", uf: null }] },
    { person_id: "p_tarc", display: "Tarcísio", registered: true, candidacies: [{ cargo: "governador", uf: "SP" }] },
    { person_id: "p_jair", display: "Jair Bolsonaro", registered: false, candidacies: [] },
    { person_id: "p_neblina", display: "Fulano Da Névoa", registered: false, candidacies: [] },
    { person_id: "p_amb", display: "Ciro Gomes", registered: false, candidacies: [] },
    // AS DUAS METADES DA DOBRA (ver o cabeçalho "A CHAVE DE EXAME NÃO SE DOBRA").
    // `p_clausula` é o caso Ciro Nogueira em miniatura: só aparece em
    // `presidente:PR`, sob uma grafia com cláusula que foi examinada LÁ, e o
    // nome curto dele é examinado em `presidente:BR` — onde pertence a OUTRA
    // pessoa, registrada. Dobrar os dois lados o afirmaria como sem candidatura.
    { person_id: "p_clausula", display: "Xará Registrado", registered: false, candidacies: [] },
    // `p_estadual` é a outra metade: aparece só em `presidente:PR` e TODAS as
    // grafias dele estão na lista de `presidente:PR`. Dobrar só a grafia
    // observada torna essa lista inalcançável e o afirmado vira recusa.
    { person_id: "p_estadual", display: "Beltrano Do Paraná", registered: false, candidacies: [] },
    // ⚠ EMPATE REAL, para o desempate final de `porPeso` ter o que desempatar.
    // Mesmo nome exibido, mesma contagem, mesma data: só o `person_id` separa.
    // O banco de verdade tem esses empates (duas linhas "Ciro Nogueira", duas
    // "Ciro Gomes"); sem eles no fixture, tirar o desempate passava verde.
    { person_id: "p_gemeo_a", display: "Homônimo Empatado", registered: false, candidacies: [] },
    { person_id: "p_gemeo_b", display: "Homônimo Empatado", registered: false, candidacies: [] },
    // ⚠ A CONTRADIÇÃO NO NOSSO PRÓPRIO BANCO (o caso Michelle/Tebet/Ciro Gomes).
    // Duas linhas de pessoa com a MESMA grafia: uma registrada noutra disputa,
    // outra vazia. Numa disputa estadual o casador não olha fora do estado, e a
    // linha vazia era publicada como "nenhuma no registro" — falso.
    // Seis pontes ligam uma linha sem registro a uma registrada: o índice lê
    // `polled_names`, `display` e `nome_urna` da REGISTRADA; a consulta lê as
    // grafias vistas na disputa, o `display` e as `polled_names` da SEM
    // registro. Cada par abaixo isola UMA delas.
    //   · ponte pelo `display` da linha REGISTRADA;
    { person_id: "p_rachado_reg", display: "Nome Rachado", registered: true, polled_names: ["Grafia Só Do Registro"], candidacies: [{ cargo: "senador", uf: "DF" }] },
    { person_id: "p_rachado_obs", display: "Nome Rachado", registered: false, polled_names: ["Nome Rachado"], candidacies: [] },
    //   · ponte pelas `polled_names` da REGISTRADA, publicada sob outro nome;
    { person_id: "p_urna_reg", display: "Outro Nome De Urna", registered: true, polled_names: ["Grafia Compartilhada"], candidacies: [{ cargo: "governador", uf: "PI" }] },
    { person_id: "p_urna_obs", display: "Grafia Compartilhada", registered: false, polled_names: ["Grafia Compartilhada"], candidacies: [] },
    //   · ponte pelas `polled_names` da linha SEM registro, vindas de outra
    //     disputa e ausentes desta;
    { person_id: "p_larga_reg", display: "Apelido Alheio", registered: true, polled_names: ["Apelido Alheio"], candidacies: [{ cargo: "senador", uf: "RR" }] },
    { person_id: "p_larga_obs", display: "Nome Largo", registered: false, polled_names: ["Nome Largo", "Apelido Alheio"], candidacies: [] },
    //   · ponte SÓ pelo `display` da linha SEM registro. `people.display` é
    //     global e `candidates.canonical` é por disputa, então uma pessoa vista
    //     em duas disputas pode exibir o nome de uma e ser publicada com o da
    //     outra — é a única grafia que não está nem nas vistas aqui nem nas
    //     `polled_names`.
    { person_id: "p_disp_reg", display: "Registrado Do Display", registered: true, polled_names: ["Só No Display"], candidacies: [{ cargo: "senador", uf: "RO" }] },
    { person_id: "p_disp_obs", display: "Só No Display", registered: false, polled_names: ["Grafia Publicada"], candidacies: [] },
    //   · ponte SÓ pelo `nome_urna` da linha REGISTRADA: ela é publicada sob
    //     outro nome e nunca foi pesquisada sob o nome de urna do TSE.
    { person_id: "p_urna2_reg", display: "Display Diferente", registered: true, polled_names: ["Outra Grafia Ainda"], nome_urna: "Nome De Urna Só", candidacies: [{ cargo: "senador", uf: "TO" }] },
    { person_id: "p_urna2_obs", display: "Nome De Urna Só", registered: false, polled_names: ["Nome De Urna Só"], candidacies: [] },
    // ⚠ TRÊS LINHAS CONTRADITÓRIAS PARA UMA PESSOA SÓ — as guardas de ordem e de
    // deduplicação não têm o que exercitar no banco real, onde toda linha colide
    // com exatamente uma. Inseridos em ordem INVERSA à do `person_id` de
    // propósito: assim a ordenação do índice tem de trabalhar para acertar.
    { person_id: "p_ord_c", display: "Cê Registrado", registered: true, polled_names: ["Zeta Grafia"], candidacies: [{ cargo: "senador", uf: "AC" }] },
    { person_id: "p_ord_b", display: "Bê Registrado", registered: true, polled_names: ["Zeta Grafia"], candidacies: [{ cargo: "senador", uf: "AL" }] },
    { person_id: "p_ord_a", display: "Á Registrado", registered: true, polled_names: ["Alfa Grafia"], candidacies: [{ cargo: "senador", uf: "AM" }] },
    { person_id: "p_ord_obs", display: "Alfa Grafia", registered: false, polled_names: ["Alfa Grafia", "Zeta Grafia"], candidacies: [] },
    //   · e a sexta ponte: a grafia vista NESTA disputa, que não é nem o
    //     `display` da linha nem nenhuma das `polled_names` dela. Sem esta,
    //     apagar as grafias da consulta passava verde.
    { person_id: "p_gr_reg", display: "Registrado Da Grafia", registered: true, polled_names: ["Grafia Da Disputa"], candidacies: [{ cargo: "senador", uf: "SE" }] },
    { person_id: "p_gr_obs", display: "Outro Display", registered: false, polled_names: ["Outro Display"], candidacies: [] },
    // ⚠ O XARÁ REGISTRADO DE VERDADE. `p_clausula` acima é a linha SEM registro
    // nascida da grafia com cláusula; esta é a pessoa REGISTRADA que carrega o
    // nome curto — o par Ciro Nogueira × Ciro Nogueira do banco real. Sem ela o
    // fixture modelava o mundo ANTES do passo 5, e a bateria continuava
    // afirmando que dobrar produz afirmação falsa, o que deixou de ser verdade.
    { person_id: "p_xara_reg", display: "Xará Registrado", registered: true, polled_names: ["Xará Registrado"], candidacies: [{ cargo: "senador", uf: "PI" }] },
    // ⚠ UMA DISPUTA ESTADUAL. Sem ela `semCandidaturaEstadual` era ZERO no
    // fixture, e trocar os dois contadores de lugar — que fez o arquivo publicar
    // "292 da disputa nacional … 292 estaduais", de 320 — passava verde.
    { person_id: "p_gov_obs", display: "Testado Em Goiás", registered: false, polled_names: ["Testado Em Goiás"], candidacies: [] },
  ];
  const candidates = [
    { candidate_id: "c_lula", person_id: "p_lula", contest: "presidente:BR", canonical: "Lula", aliases: ["Lula"] },
    { candidate_id: "c_tarc", person_id: "p_tarc", contest: "presidente:BR", canonical: "Tarcísio", aliases: ["Tarcísio"] },
    { candidate_id: "c_jair", person_id: "p_jair", contest: "presidente:BR", canonical: "Jair Bolsonaro", aliases: ["Jair Bolsonaro"] },
    { candidate_id: "c_neb", person_id: "p_neblina", contest: "presidente:PR", canonical: "Fulano Da Névoa", aliases: [] },
    { candidate_id: "c_amb", person_id: "p_amb", contest: "presidente:BR", canonical: "Ciro Gomes", aliases: [] },
    { candidate_id: "c_cla", person_id: "p_clausula", contest: "presidente:PR", canonical: "Xará Registrado", aliases: [] },
    { candidate_id: "c_est", person_id: "p_estadual", contest: "presidente:PR", canonical: "Beltrano Do Paraná", aliases: [] },
    { candidate_id: "c_gem_a", person_id: "p_gemeo_a", contest: "presidente:BR", canonical: "Homônimo Empatado", aliases: [] },
    { candidate_id: "c_gem_b", person_id: "p_gemeo_b", contest: "presidente:BR", canonical: "Homônimo Empatado", aliases: [] },
    { candidate_id: "c_rac", person_id: "p_rachado_obs", contest: "presidente:BR", canonical: "Nome Rachado", aliases: [] },
    { candidate_id: "c_urn", person_id: "p_urna_obs", contest: "presidente:BR", canonical: "Grafia Compartilhada", aliases: [] },
    { candidate_id: "c_lrg", person_id: "p_larga_obs", contest: "presidente:BR", canonical: "Nome Largo", aliases: [] },
    { candidate_id: "c_dsp", person_id: "p_disp_obs", contest: "presidente:BR", canonical: "Grafia Publicada", aliases: [] },
    { candidate_id: "c_urn2", person_id: "p_urna2_obs", contest: "presidente:BR", canonical: "Nome De Urna Só", aliases: [] },
    { candidate_id: "c_ord", person_id: "p_ord_obs", contest: "presidente:BR", canonical: "Zeta Grafia", aliases: [] },
    { candidate_id: "c_gr", person_id: "p_gr_obs", contest: "presidente:BR", canonical: "Grafia Da Disputa", aliases: [] },
    { candidate_id: "c_gov", person_id: "p_gov_obs", contest: "governador:GO", canonical: "Testado Em Goiás", aliases: [] },
  ];
  // A grafia CRUA é a que o instituto publicou; quando ela difere do canônico, o
  // fixture a declara — é justamente essa diferença que separa as duas metades.
  // ⚠ `c_amb` publica "Ciro" e o site canoniza para "Ciro Gomes". A recusa do
  // casador está gravada contra "Ciro" — a grafia CRUA. Se `name_raw` sumir do
  // conjunto de grafias, sobra só o canônico, que é examinado e não é ambíguo,
  // e a linha vira afirmação. É o que torna visível apagar `name_raw`.
  const CRU = { c_cla: "Xará Registrado, com apoio de alguém", c_amb: "Ciro" };
  const q = (id, survey_id, uf, round, ids, race = "presidente") => ({
    question_id: id, survey_id, race, round, uf,
    results: ids.map((c) => ({ candidate_id: c, name_raw: CRU[c] ?? candidates.find((x) => x.candidate_id === c).canonical })),
  });
  const questions = [
    q("q1", "s1", null, 2, ["c_lula", "c_tarc"]),
    q("q2", "s2", null, 2, ["c_lula", "c_jair"]),
    q("q3", "s3", null, 2, ["c_lula", "c_jair"]),
    q("q4", "s1", "PR", 2, ["c_lula", "c_neb"]),
    q("q5", "s1", null, 2, ["c_lula", "c_amb"]),
    q("q6", "s1", "PR", 2, ["c_lula", "c_cla"]),
    q("q7", "s1", "PR", 2, ["c_lula", "c_est"]),
    q("q8", "s4", null, 2, ["c_lula", "c_gem_a"]),   // no DIA do corte
    q("q9", "s4", null, 2, ["c_lula", "c_gem_b"]),   // no DIA do corte
    q("q10", "s5", null, 2, ["c_lula", "c_rac"]),    // véspera do corte
    q("q11", "s5", null, 2, ["c_lula", "c_urn"]),
    q("q12", "s5", null, 2, ["c_lula", "c_lrg"]),
    q("q13", "s5", null, 2, ["c_lula", "c_dsp"]),
    q("q14", "s5", null, 2, ["c_lula", "c_urn2"]),
    q("q15", "s5", null, 2, ["c_lula", "c_ord"]),
    q("q16", "s5", null, 2, ["c_lula", "c_gr"]),
    q("q17", "s5", "GO", 1, ["c_gov"], "governador"),
  ];
  // O registro do TSE, reduzido ao que este relatório lê dele: quantas
  // candidaturas são nacionais (`uf` nulo) e quantas UFs existem. Os dois
  // números aparecem em frases do relatório e SAEM DAQUI — digitados, ficariam
  // errados no dia em que o registro mudasse, e ninguém veria.
  const candidaturas = [
    { cargo: "presidente", uf: null }, { cargo: "presidente", uf: null }, { cargo: "presidente", uf: null },
    { cargo: "governador", uf: "GO" }, { cargo: "senador", uf: "GO" },
    { cargo: "governador", uf: "PI" }, { cargo: "senador", uf: "SP" }, { cargo: "governador", uf: "RN" },
  ];
  const crus = {
    // "Fulano Da Névoa" NÃO consta: é a grafia que o casador nunca examinou.
    // "Xará Registrado" consta AQUI e não em `presidente:PR` — é o nome curto,
    // que na vida real pertence a uma pessoa registrada noutra disputa.
    "presidente:BR": [{ nome: "Lula" }, { nome: "Tarcísio" }, { nome: "Jair Bolsonaro" }, { nome: "Ciro" }, { nome: "Ciro Gomes" },
      { nome: "Xará Registrado" }, { nome: "Homônimo Empatado" }, { nome: "Nome Rachado" }, { nome: "Grafia Compartilhada" }, { nome: "Nome Largo" },
      { nome: "Grafia Publicada" }, { nome: "Nome De Urna Só" }, { nome: "Zeta Grafia" }, { nome: "Grafia Da Disputa" }],
    "governador:GO": [{ nome: "Testado Em Goiás" }],
    "presidente:PR": [{ nome: "Lula" }, { nome: "Xará Registrado, com apoio de alguém" }, { nome: "Beltrano Do Paraná" }],
  };
  const ballot = { mapping: { "presidente:BR": {} }, ambiguos: [{ contest: "presidente:BR", nome: "Ciro", motivo: "compatível com mais de uma pessoa" }] };
  return { questions, surveys, candidates, people, crus, ballot, candidaturas };
}

function autoteste() {
  const falhas = [];
  const ok = (cond, msg) => { if (!cond) falhas.push(msg); };
  const f = fixtures();
  const cat = catalogar(f);
  const pres = cat.disputas.find((s) => s.disputa === "presidente:BR");
  const acha = (nome) => pres?.candidatos.find((c) => c.display === nome);
  const achaNd = (nome) => pres?.indeterminados.find((c) => c.display === nome);
  const achaContra = (nome) => pres?.contradicoes.find((c) => c.display === nome);

  // 1. Lula tem candidatura presidencial: NÃO entra no relatório.
  ok(!acha("Lula") && !achaNd("Lula"), "quem tem candidatura na disputa não pode aparecer");

  // 2. TARCÍSIO — a consulta entre disputas. Registrado em `governador:SP`,
  //    testado para presidente: sai como OUTRA DISPUTA, com a disputa nomeada.
  //    ⚠ Este é o caso que a mutação (ii) tem de avermelhar.
  ok(acha("Tarcísio")?.classe === "outra-disputa", "Tarcísio tem de sair como outra-disputa");
  ok(acha("Tarcísio")?.outras.join() === "governador:SP", `a outra disputa tem de ser governador:SP (veio ${acha("Tarcísio")?.outras.join()})`);

  // 3. Jair — examinado, nenhuma candidatura em lugar nenhum.
  ok(acha("Jair Bolsonaro")?.classe === "sem-candidatura", "Jair sai como sem-candidatura");
  ok(acha("Jair Bolsonaro")?.outras.length === 0, "sem-candidatura não pode listar outra disputa");

  // 4. GRAFIA NUNCA EXAMINADA → NÃO DETERMINADO, jamais "sem candidatura".
  //    ⚠ Este é o caso que a mutação (i) tem de avermelhar.
  ok(!!achaNd("Fulano Da Névoa"), "grafia não examinada tem de cair em não determinado");
  ok(!acha("Fulano Da Névoa"), "grafia não examinada NÃO pode ser afirmada como sem candidatura");
  ok(/não está entre as grafias/.test(achaNd("Fulano Da Névoa")?.motivo ?? ""), "o motivo tem de dizer que a grafia não foi examinada");

  // 5. RECUSA GRAVADA PELO CASADOR → não determinado, e o motivo cita ambiguidade.
  //    ⚠ A recusa está gravada contra a grafia CRUA ("Ciro"), não contra o
  //    canônico ("Ciro Gomes"). Esta é a linha que torna visível apagar
  //    `name_raw` do conjunto de grafias — a primeira bateria não tinha isso e a
  //    mutação passava verde, apesar de o argumento inteiro deste relatório
  //    ("o casador examinou a grafia que o instituto PUBLICOU") depender dela.
  ok(!!achaNd("Ciro Gomes"), "grafia recusada por ambiguidade tem de cair em não determinado");
  ok(/ambiguidade/.test(achaNd("Ciro Gomes")?.motivo ?? ""), "o motivo tem de citar a recusa do casador");
  ok(/"Ciro"/.test(achaNd("Ciro Gomes")?.motivo ?? ""), "a recusa é sobre a grafia CRUA publicada, não sobre o nome canônico");
  ok((achaNd("Ciro Gomes")?.grafias ?? []).includes("Ciro"), "a grafia CRUA (`name_raw`) tem de entrar no conjunto examinado");
  ok((achaNd("Ciro Gomes")?.grafias ?? []).includes("Ciro Gomes"), "o nome canônico também entra no conjunto");

  // 5b. A CHAVE DE EXAME É POR DISPUTA PESQUISADA, nas duas direções: dobrá-la
  //     afirmaria `Xará Registrado`, e dobrar só um lado esconderia
  //     `Beltrano Do Paraná`, que é afirmável.
  ok(!!achaNd("Xará Registrado"), "a grafia com cláusula não pode herdar o exame do nome curto da disputa nacional");
  ok(!acha("Xará Registrado"), "a grafia com cláusula não pode sair afirmada");
  ok(acha("Beltrano Do Paraná")?.classe === "sem-candidatura", "quem tem TODAS as grafias na lista estadual é afirmável — dobrar só um lado esconderia isto");

  // 6. CONFRONTOS: os que têm alguém sem candidatura são afirmados; o que só tem
  //    não determinado fica na tabela de recusa; nenhum dos dois some.
  const rot = (l) => l.rotulo;
  ok(pres.confrontos.map(rot).includes("Lula × Tarcísio"), "Lula × Tarcísio é confronto afirmado");
  ok(pres.confrontos.map(rot).includes("Jair Bolsonaro × Lula"), "Jair × Lula é confronto afirmado");
  ok(pres.confrontosIndeterminados.map(rot).includes("Ciro Gomes × Lula"), "Ciro Gomes × Lula fica em não determinado");
  ok(!pres.confrontos.map(rot).includes("Ciro Gomes × Lula"), "um confronto não determinado NÃO pode ser afirmado");
  // O confronto da subamostra estadual dobra para a disputa nacional, e o
  // "Fulano Da Névoa" (não determinado) não o promove a afirmado.
  ok(pres.confrontosIndeterminados.map(rot).includes("Fulano Da Névoa × Lula"), "a subamostra PR dobra para presidente:BR e fica em não determinado");

  // 6b. CONTRADIÇÃO NO NOSSO PRÓPRIO BANCO — o defeito que a conferência achou.
  //     Duas linhas de pessoa com a mesma grafia, uma registrada em `senador:DF`:
  //     a linha vazia NÃO pode sair afirmada como "nenhuma no registro".
  ok(!!achaContra("Nome Rachado"), "grafia que outra linha de pessoa carrega REGISTRADA tem de ser recusada");
  ok(!acha("Nome Rachado"), "a linha contradita NÃO pode aparecer como sem candidatura");
  ok(achaContra("Nome Rachado")?.contradiz?.[0]?.contests?.join() === "senador:DF",
    `a recusa tem de nomear a candidatura que contradiz (veio ${achaContra("Nome Rachado")?.contradiz?.[0]?.contests?.join()})`);
  ok(achaContra("Nome Rachado")?.contradiz?.[0]?.person_id === "p_rachado_reg", "e o `person_id` da linha que contradiz");
  //     A ponte pelo `display` e a ponte pelas `polled_names` são exercitadas
  //     em linhas SEPARADAS: no fixture acima a primeira só é alcançável pelo
  //     `display` da pessoa registrada, e esta só pelas grafias pesquisadas
  //     dela — que é literalmente o caso Ravenna Castro × Ravenna da Inclusão.
  ok(!!achaContra("Grafia Compartilhada"), "a ponte pelas `polled_names` da pessoa registrada também recusa");
  ok(achaContra("Grafia Compartilhada")?.contradiz?.[0]?.person_id === "p_urna_reg", "e nomeia a linha registrada publicada sob outro nome de urna");
  //     E a ponte pelo lado DE CÁ: a grafia que colide não é nenhuma das vistas
  //     NESTA disputa — vem das `polled_names` da própria linha sem registro.
  ok(!!achaContra("Nome Largo"), "a consulta de contradição é mais larga que a de exame e usa as `polled_names` da própria pessoa");
  ok(achaContra("Nome Largo")?.contradiz?.[0]?.person_id === "p_larga_reg", "e nomeia quem colide");
  //     ...e pelo `display` da própria linha sem registro, que não está nem nas
  //     grafias vistas aqui nem nas `polled_names` dela.
  ok(!!achaContra("Só No Display"), "a consulta de contradição usa também o `display` da linha sem registro");
  ok(achaContra("Só No Display")?.contradiz?.[0]?.person_id === "p_disp_reg", "e nomeia quem colide pelo display");
  //     E do lado do ÍNDICE, a ponte pelo `nome_urna` do TSE: a pessoa
  //     registrada é publicada sob outro nome e nunca foi pesquisada sob o dela.
  ok(!!achaContra("Nome De Urna Só"), "o índice de contradição usa o `nome_urna` da pessoa registrada");
  ok(achaContra("Nome De Urna Só")?.contradiz?.[0]?.person_id === "p_urna2_reg", "e nomeia quem colide pelo nome de urna");
  //     E a grafia vista NESTA disputa, que não é o `display` nem `polled_names`.
  ok(!!achaContra("Outro Display"), "a consulta de contradição usa a grafia vista NESTA disputa");
  ok(achaContra("Outro Display")?.contradiz?.[0]?.person_id === "p_gr_reg", "e nomeia quem colide pela grafia da disputa");

  // 6d. A GRAFIA PUBLICADA VAI COMO FOI PUBLICADA. Trocar por `normNome(nome)`
  //     reescreve as 6 linhas do arquivo real em minúsculas sem acento, e a
  //     bateria não via. `normNome` casa; não exibe.
  ok(achaContra("Grafia Compartilhada")?.contradiz?.[0]?.grafia === "Grafia Compartilhada",
    `a grafia sai como publicada, não normalizada (veio ${achaContra("Grafia Compartilhada")?.contradiz?.[0]?.grafia})`);
  ok(achaContra("Nome Rachado")?.contradiz?.[0]?.grafia === "Nome Rachado", "e o mesmo na ponte pelo display");

  // 6e. ORDEM E DEDUPLICAÇÃO COM MAIS DE UMA LINHA CONTRADITÓRIA (§8). No banco
  //     real toda linha colide com exatamente uma, então as três guardas abaixo
  //     só existem porque este fixture as executa.
  {
    const o = achaContra("Alfa Grafia");
    ok(o?.contradiz?.length === 3, `três linhas contraditórias, sem repetir a mesma duas vezes (veio ${o?.contradiz?.length})`);
    ok(o?.contradiz?.map((x) => x.person_id).join() === "p_ord_a,p_ord_b,p_ord_c",
      `a lista de contradições sai ordenada por person_id (veio ${o?.contradiz?.map((x) => x.person_id).join()})`);
    const idx = registradosPorGrafia(f.people).get(normNome("Zeta Grafia"));
    ok(idx?.map((x) => x.person_id).join() === "p_ord_b,p_ord_c",
      `o índice ordena as pessoas de uma mesma grafia por person_id (veio ${idx?.map((x) => x.person_id).join()})`);
  }
  ok(!pres.confrontos.map(rot).includes("Lula × Nome Rachado"), "confronto cujo único nome fora da urna é contradito NÃO é afirmado");
  ok(pres.confrontosIndeterminados.map(rot).includes("Lula × Nome Rachado"), "ele sai na tabela de recusa");

  // 6c. O ALCANCE DA NEGATIVA É DITO, NÃO SUBENTENDIDO. Numa disputa estadual o
  //     casador só olhou aquela UF e as nacionais; em `presidente:BR` ele varreu
  //     o registro inteiro. Escrever a frase forte nos dois casos foi o que
  //     tornou três linhas falsas.
  ok(alcanceDaNegativa("presidente:BR") === "nenhuma no registro inteiro", "na nacional a negativa é sobre o registro inteiro");
  ok(alcanceDaNegativa("governador:GO") === "nenhuma em `GO` nem nacional", `na estadual a negativa é escopada (veio ${alcanceDaNegativa("governador:GO")})`);
  ok(alcanceDaNegativa("senador:MS") === "nenhuma em `MS` nem nacional", "e vale para o senado também");

  // 7. PERÍODO ELEITORAL: s2 (17/08) conta, s1 (23/03) não, s3 (sem data) NUNCA
  //    é contado como fora — sai na coluna própria (§4).
  const jair = acha("Jair Bolsonaro");
  ok(jair?.cenarios === 2 && jair?.noPeriodo === 1 && jair?.semData === 1,
    `Jair: 2 cenários, 1 no período, 1 sem data (veio ${jair?.cenarios}/${jair?.noPeriodo}/${jair?.semData})`);
  ok(jair?.primeiro === "2026-08-17" && jair?.ultimo === "2026-08-17", "a data nula não pode virar primeiro/último campo");
  ok(acha("Tarcísio")?.noPeriodo === 0, "Tarcísio, só com campo de março, não tem cenário no período");

  // 7b. ⚠ O PRÓPRIO DIA DO CORTE CONTA — a fronteira é `>=`, não `>`.
  //     A primeira bateria só tinha 17/08 no fixture, então trocar `>=` por `>`
  //     passava verde e a data que dá nome ao relatório nunca era exercitada.
  ok(acha("Homônimo Empatado")?.noPeriodo === 1, `o cenário do DIA do corte conta no período (veio ${acha("Homônimo Empatado")?.noPeriodo})`);
  ok(achaContra("Nome Rachado")?.noPeriodo === 0, "a véspera do corte NÃO conta");
  //     E o denominador do período usa a MESMA fronteira: s2 (17/08) + s4 (16/08,
  //     duas perguntas) = 3 cenários; s5 (15/08) fica fora.
  ok(cat.periodo.cenarios === 3 && cat.periodo.levantamentos === 2,
    `o denominador do período inclui o dia do corte (veio ${cat.periodo.cenarios}/${cat.periodo.levantamentos})`);

  // 8. AMOSTRA NACIONAL contada à parte da subamostra estadual.
  const nevoa = achaNd("Fulano Da Névoa");
  ok(nevoa?.cenarios === 1 && nevoa?.nacionais === 0, `a subamostra PR não conta como nacional (veio ${nevoa?.nacionais})`);

  // 8b. ⚠ EMPATE REAL, DESEMPATADO POR `person_id`. Duas linhas com o mesmo nome
  //     exibido, a mesma contagem e a mesma data: só o id as separa, e sem esse
  //     desempate a ordem passa a ser a de leitura do NDJSON (§8). O banco de
  //     verdade tem esses empates; o fixture não tinha, e a mutação passou verde.
  {
    const g = pres.candidatos.filter((c) => c.display === "Homônimo Empatado").map((c) => c.person_id);
    ok(g.length === 2, `os dois homônimos empatados têm de estar na tabela (veio ${g.length})`);
    ok(g.join() === "p_gemeo_a,p_gemeo_b", `o empate desempata por person_id (veio ${g.join()})`);
  }

  // 9. DETERMINISMO (§8): a mesma entrada em ordem embaralhada dá o MESMO JSON.
  //    Sem isto, um empate de contagem trocaria de lugar entre rodadas e o diff
  //    do commit mentiria sobre o que mudou.
  {
    const inverso = { ...f, questions: [...f.questions].reverse(), candidates: [...f.candidates].reverse(), people: [...f.people].reverse(), surveys: [...f.surveys].reverse() };
    const limpo = (c) => JSON.stringify(c, (k, v) => (v instanceof Set ? [...v] : v));
    ok(limpo(catalogar(inverso)) === limpo(cat), "a ordem das tabelas de entrada não pode mudar a saída");
  }

  // 10. O RELATÓRIO SE RENDERIZA e carrega as duas tabelas — um catálogo que
  //     agrega certo e imprime errado não vale nada.
  {
    // Pelo mesmo caminho do CLI. Ver `gerar`.
    const { md } = gerar(f);
    ok(md.includes("| Tarcísio |") && md.includes("`governador:SP`"), "a tabela tem de publicar Tarcísio com a outra disputa");
    ok(md.includes("Lula × Tarcísio"), "a tabela de confrontos tem de publicar o par");
    ok(md.includes("Fulano Da Névoa"), "o não determinado tem de aparecer no relatório, não sumir");
    ok(md.includes("23/03/2026"), "as datas saem em DD/MM/AAAA (§11)");
    ok(md.includes("p_rachado_reg"), "a recusa por contradição tem de nomear no relatório a linha que contradiz");
    ok(md.includes("nenhuma no registro inteiro"), "a negativa nacional sai com o alcance escrito");
    // Toda prosa que sobrevive carrega número, e todo número é afirmado.
    ok(!/registro inteiro sem achar nada/.test(md), "a glosa do placar NÃO pode alegar o registro inteiro para todas as linhas");
    ok(md.includes("até onde alcança"), "a glosa do placar diz até onde a busca alcançou");
    ok(md.includes("O que esta lista NÃO enxerga"), "o relatório tem de dizer o que NÃO consegue ver");
    ok(md.includes(`não olha os outros ${cat.ufsNaoProcuradas} estados`), "e dizer, em português claro, qual é o resíduo — com o número saindo do registro");
    ok(md.includes(`mais as ${cat.candidaturasNacionais} candidaturas nacionais`), "a glosa do placar publica o número de candidaturas nacionais que o registro tem");
    ok(md.includes(`as ${cat.candidaturasNacionais} candidaturas nacionais —`), "e o resíduo também");
    ok(!/\b13 candidaturas nacionais\b/.test(md) || cat.candidaturasNacionais === 13, "nenhum literal solto de candidaturas nacionais");
  }

  // 11. O PLACAR SOMA O QUE AS TABELAS MOSTRAM. Um placar derivado por outra
  //     conta é a segunda implementação da mesma regra (§5).
  {
    const p = cat.placar;
    const cand = cat.disputas.reduce((n, s) => n + s.candidatos.length, 0);
    ok(p.contradicoes === cat.disputas.reduce((n, s) => n + s.contradicoes.length, 0), "o placar conta as contradições");
    ok(p.candidatos === cand && p.candidatos === p.semCandidatura + p.outraDisputa,
      `o placar tem de bater com as linhas (${p.candidatos} vs ${cand})`);
  }

  // 12. OS NÚMEROS DA PROSA, LIGADOS AO QUE ELES CONTAM.
  {
    const p = cat.placar;
    ok(p.semCandidaturaNacional + p.semCandidaturaEstadual === p.semCandidatura,
      `o corte nacional/estadual tem de fechar com o total (${p.semCandidaturaNacional} + ${p.semCandidaturaEstadual} ≠ ${p.semCandidatura})`);
    ok(p.semCandidaturaNacional > 0 && p.semCandidaturaEstadual > 0,
      `os dois lados do corte têm de ser exercitados (veio ${p.semCandidaturaNacional}/${p.semCandidaturaEstadual})`);
    // E cada lado tem de bater com as seções, contadas por outro caminho.
    const nac = cat.disputas.filter((s) => s.disputa.endsWith(":BR")).reduce((n, s) => n + s.candidatos.filter((c) => c.classe === "sem-candidatura").length, 0);
    const est = cat.disputas.filter((s) => !s.disputa.endsWith(":BR")).reduce((n, s) => n + s.candidatos.filter((c) => c.classe === "sem-candidatura").length, 0);
    ok(p.semCandidaturaNacional === nac && p.semCandidaturaEstadual === est,
      `o placar tem de bater com as seções (${p.semCandidaturaNacional}/${p.semCandidaturaEstadual} vs ${nac}/${est})`);
    // Os dois números que a prosa cita saem do REGISTRO.
    ok(cat.candidaturasNacionais === f.candidaturas.filter((c) => c.uf == null).length && cat.candidaturasNacionais === 3,
      `as candidaturas nacionais saem do registro (veio ${cat.candidaturasNacionais})`);
    ok(cat.ufsNaoProcuradas === 3, `as UFs não procuradas saem do registro (veio ${cat.ufsNaoProcuradas})`);
  }

  // 13. O RESÍDUO TEM DOIS RAMOS OPOSTOS, e os dois são exercitados: inverter o
  //     sentido da seção exige inverter o ramo, e aí o outro quebra.
  {
    const comResiduo = fraseResiduo(cat).join("\n");
    ok(/Numa disputa \*\*estadual\*\*/.test(comResiduo), "o resíduo é da disputa ESTADUAL, não da nacional");
    ok(!/Numa disputa \*\*nacional\*\*/.test(comResiduo), "e não pode dizer o contrário");
    ok(/continua aparecendo aqui como sem candidatura/.test(comResiduo), "e diz que essas linhas CONTINUAM aparecendo");
    ok(!/não aparece aqui/.test(comResiduo), "nunca que elas não aparecem");
    ok(/\*\*e\*\* que nunca foi pesquisado sob uma grafia que\n?/.test(comResiduo) && /colidisse com a de alguém registrado/.test(comResiduo),
      "as duas condições são conjuntas e a conjunção é explícita");
    ok(/confira o nome no registro antes de agir/.test(comResiduo), "e diz ao leitor o que fazer com isso");
    ok(comResiduo.includes(`**${cat.placar.semCandidaturaEstadual} de ${cat.placar.semCandidatura}**`), "o tamanho da sombra sai dos contadores, não digitado");
    // O ramo oposto: um catálogo SEM linha estadual tem de dizer o contrário.
    const semEstaduais = { ...cat, placar: { ...cat.placar, semCandidaturaEstadual: 0, semCandidatura: cat.placar.semCandidaturaNacional } };
    const sem = fraseResiduo(semEstaduais).join("\n");
    ok(/são todas da disputa nacional/.test(sem), "sem linha estadual, a seção diz que não há resíduo desta espécie");
    ok(!/continua aparecendo aqui/.test(sem), "e não repete a frase do outro ramo");
    ok(ESCOPO_ESTREITO === "estadual" && ESCOPO_AMPLO === "nacional", "o escopo estreito é derivado de `alcanceDaNegativa`, não digitado");
  }

  if (falhas.length) {
    console.error("AUTOTESTE FALHOU:");
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("autoteste ok — outra-disputa, grafia não examinada, recusa do casador pela grafia crua, contradição no próprio banco pelas 6 pontes, grafia publicada sem normalizar, ordem e deduplicação, alcance da negativa, invariante do corte nacional/estadual, números da prosa derivados do registro, resíduo nos dois ramos, confrontos, dia do corte, data nula, empate por person_id, determinismo, renderização e placar");
}

// ---------------------------------------------------------------------------

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");

if (process.argv.includes("--self-test")) {
  autoteste();
} else {
  const store = readStore({ tables: ["surveys", "questions", "candidates", "people"] });
  const crus = lerJson(path.join(DATA_DIR, "nomes-crus.json"), {});
  const ballot = lerJson(path.join(DATA_DIR, "ballot-names.json"), {});
  const candidaturas = lerCandidaturas();
  exigirEntradas({ candidaturas, crus, ballot });
  const { cat, md } = gerar({
    questions: store.questions, surveys: store.surveys,
    candidates: store.candidates, people: store.people,
    crus, ballot, candidaturas,
  });
  const out = path.resolve(ROOT, arg("out") ?? "CANDIDATURAS_NAO_REGISTRADAS.md");
  fs.writeFileSync(out, md);
  const p = cat.placar;
  console.log(`SEM CANDIDATURA ${p.semCandidatura} · OUTRA DISPUTA ${p.outraDisputa} · não determinados ${p.indeterminados}`);
  console.log(`  confrontos de 2º turno afirmados ${p.confrontos} (${p.cenariosDeConfronto} cenários) · não determinados ${p.confrontosIndeterminados}`);
  console.log(`  disputas com linha ${p.disputasComLinha} · cenários no período eleitoral (desde ${cat.inicioPeriodo}): candidatos ${p.noPeriodoCandidatos}, confrontos ${p.noPeriodoConfrontos}`);
  console.log(`→ ${path.relative(ROOT, out)}`);
}
