#!/usr/bin/env node
// QUEM FOI TESTADO EM PESQUISA E NÃO SE REGISTROU — enumeração, nunca reparo.
//
// O banco guarda muita pesquisa que testou gente que depois não registrou
// candidatura nenhuma para aquela disputa. `Lula × Tarcísio` são 78 cenários
// nacionais de 2º turno; `Jair Bolsonaro × Lula`, 68. Isso NÃO é erro de dado:
// o instituto perguntou mesmo, e na data em que perguntou ninguém sabia quem ia
// se registrar. A decisão do criador já está escrita no repositório — "quem foi
// testado em pesquisa e não se registrou fica também — é fato sobre a pesquisa,
// não erro a corrigir" — e este arquivo não a desfaz: ele a CATALOGA.
//
// Por que catalogar, então (decisão do criador, 17/08/2026): ele não quer gastar
// tempo com candidatura não registrada agora. Quer a lista à mão para o dia em
// que uma dessas linhas parecer estar distorcendo a análise de uma pesquisa do
// PERÍODO ELEITORAL — que começou em 16/08/2026. Um confronto cujas pesquisas
// todas são anteriores a essa data é história; um que continua sendo perguntado
// depois dela merece um olhar.
//
// ---------------------------------------------------------------------------
// TRÊS RESPOSTAS, E A TERCEIRA É UMA RECUSA
// ---------------------------------------------------------------------------
//
//   SEM CANDIDATURA   a pessoa não tem candidatura registrada NESTA disputa e o
//                     casador de nomes de urna procurou o nome dela no registro
//                     INTEIRO sem achar nada. É o Jair Bolsonaro da presidencial.
//   OUTRA DISPUTA     a pessoa não tem candidatura NESTA disputa mas tem em
//                     outra. É o Tarcísio: testado para presidente, registrado
//                     em `governador:SP`. É a linha mais interessante da lista.
//   NÃO DETERMINADO   não dá para afirmar nem uma coisa nem outra. NUNCA vira
//                     "não registrada" (CONVENTIONS §4). Ver `situacao()`.
//
// ⚠ POR QUE A TERCEIRA EXISTE, MEDIDO E NÃO SUPOSTO. Sem ela, quatro pessoas
// sairiam deste relatório com a afirmação "nenhuma candidatura no registro
// inteiro", e para TRÊS delas a afirmação é falsa contra o próprio
// `data/candidaturas.ndjson`:
//
//     governador:GO  Gustavo Mendanha  → registrado em `senador:GO`
//     governador:SP  Guilherme Derrite → registrado em `senador:SP`
//     presidente:BR  Ciro Nogueira     → registrado em `senador:PI`
//
// Em todos, a grafia que o instituto PUBLICOU ("Gustavo Medanha" com um "n" a
// menos, "Capitão Derrite", "Ciro Nogueira, com apoio do ex-presidente Jair
// Bolsonaro") é a que o casador examinou, e ela não alcança a candidatura; o
// nome que alcançaria é o nome CANONIZADO por nós, que o casador nunca viu.
// Afirmar a partir da nossa própria falha de casamento é exatamente a inferência
// que o §4 proíbe — e o repositório já tem a regra irmã escrita: "UNPUBLISHED
// nunca se infere da nossa própria ausência".
//
// ---------------------------------------------------------------------------
// O QUE ESTE ARQUIVO NÃO FAZ
// ---------------------------------------------------------------------------
//
// · NÃO escreve em `data/`, não escreve reparo, não muda o que o site exibe.
// · NÃO reimplementa a média. `src/lib/average.ts` é dono de "quais pesquisas
//   entram na média" e uma segunda cópia aqui seria o defeito do §5. Este
//   relatório reporta fato cru — quantos cenários, quais datas — e deixa o
//   julgamento para um humano. Onde eu achar que uma linha distorce alguma
//   coisa, isso vai em PROSA, não em conta.
// · NÃO escreve um segundo normalizador nem um segundo casador. `normNome` e
//   `chaveDeDisputa` vêm de `lib/nomes.mjs`; `contestOf` e `lerCandidaturas` de
//   `lib/candidaturas.mjs`; e a resposta "esta pessoa casou com que candidatura"
//   é lida de `data/people.ndjson`, que é onde `resolvePerson` (via
//   `ballotCandidacy`) já a gravou. Este repositório publicou um homem sob dois
//   nomes porque um auxiliar existia duas vezes (§5).
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

// ---------------------------------------------------------------------------
// A DATA DE CORTE É UM FATO DATADO, NÃO UMA JANELA ESCOLHIDA
// ---------------------------------------------------------------------------
//
// 16/08/2026 é o início da campanha, e é o gatilho que o criador declarou: antes
// dela, testar quem não se registrou é retrato de um cenário que ainda não
// existia; depois dela, o registro já está fechado e a pergunta passa a medir
// gente que não vai estar na urna. Não é tolerância de comparação — nada aqui a
// alarga para um portão passar (§10) —, é uma data do calendário eleitoral.
//
// Fica como parâmetro de `catalogar` porque o autoteste precisa exercitar os dois
// lados do corte com fixtures, e não porque o valor seja negociável.
export const INICIO_PERIODO_ELEITORAL = "2026-08-16";

// ---------------------------------------------------------------------------
// O UNIVERSO QUE O CASADOR EXAMINOU — e por que ele é lido, não recontado
// ---------------------------------------------------------------------------
//
// `scripts/match-ballot-names.mjs` percorre EXATAMENTE as grafias de
// `data/nomes-crus.json` (o despejo que `scrape.mjs` grava ANTES de
// canonicalizar, CONVENTIONS §6) e, para cada uma, ou grava um casamento em
// `data/ballot-names.json.mapping`, ou registra uma recusa em `.ambiguos`, ou
// conta um `stats.sem` — "nenhuma candidatura compatível no registro inteiro".
//
// Então a pergunta "o casador chegou a examinar este nome?" tem resposta EXATA
// nos dados, e é ela que separa uma negativa de verdade de um silêncio nosso.
// Recontar isso aqui seria escrever um segundo casador (§5); ler é ler.
function universoExaminado(crus) {
  const m = new Map();
  for (const [contest, nomes] of Object.entries(crus ?? {})) {
    // `nomes-crus.json` carrega `{nome, partidos}` desde 16/08; a forma de
    // string pura ainda é aceita, como no próprio casador — um clone só tem a
    // forma nova depois da primeira coleta.
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

// ---------------------------------------------------------------------------
// ⚠ A CHAVE DE EXAME NÃO SE DOBRA PARA A NACIONAL, E ISSO É MEDIDO
// ---------------------------------------------------------------------------
//
// Em quase tudo mais neste repositório, `presidente:PR` dobra para
// `presidente:BR`: a disputa é nacional e só a amostra é estadual (HANDOFF §1b).
// A pergunta "esta pessoa tem candidatura nesta disputa?" usa a dobra, e tem de
// usar — é a mesma corrida.
//
// A pergunta "o casador examinou esta grafia?" NÃO usa, e a medida é esta
// (rodada dos dois jeitos contra o banco real em 18/08/2026, dobrando os DOIS
// lados — a grafia observada e o universo examinado):
//
//     sem dobra   326 sem candidatura ·  8 não determinados
//     com dobra   328 sem candidatura ·  6 não determinados
//
// As duas linhas que a dobra "resolve" são `Tereza Cristina` e `Ciro Nogueira`.
// A primeira é ganho real — ela não tem candidatura nenhuma. A segunda é uma
// AFIRMAÇÃO FALSA: `presidente:PR` publica "Ciro Nogueira, com apoio do
// ex-presidente Jair Bolsonaro", que não casa com nada, e dessa grafia nasceu
// uma pessoa SEM registro; com a dobra ela herda o exame de "Ciro Nogueira" em
// `presidente:BR` e sai publicada como "nenhuma no registro" — sendo que Ciro
// Nogueira está registrado em `senador:PI`.
//
// Uma afirmação falsa contra duas recusas a mais: o repositório já declarou a
// direção do erro em `lacunas-poder360.mjs` — "erra para o lado de NÃO afirmar".
// O preço fica sendo `Lula × Tereza Cristina`, 5 cenários nacionais em não
// determinado.
//
// ⚠ E a dobra tem de ser dos DOIS lados ou de nenhum. Dobrar só a grafia
// observada torna as listas estaduais de `nomes-crus.json` inalcançáveis e joga
// 11 pessoas a mais em não determinado — um relatório que encolhe em silêncio,
// que é a família de defeito do §2. O autoteste cobre as duas metades.

/**
 * A situação de uma pessoa numa disputa. Três respostas, nunca duas.
 *
 * `grafias` são todas as formas sob as quais esta pessoa aparece nesta disputa,
 * cada uma carimbada com a CHAVE DE DISPUTA PESQUISADA em que foi vista — a
 * grafia crua que o instituto publicou, o nome canônico que o site exibe e os
 * apelidos que a linha de candidato acumulou.
 *
 * A ordem das checagens é a ordem da força da evidência:
 *   1. tem candidatura NESTA disputa                        → registrada
 *   2. tem candidatura em OUTRA                             → outra disputa
 *   3. o casador RECUSOU alguma grafia por ambiguidade      → não determinado
 *   4. alguma grafia nunca foi examinada pelo casador       → não determinado
 *   5. o NOSSO PRÓPRIO BANCO registra a mesma grafia noutra
 *      linha de pessoa                                      → contradição
 *   6. todas foram examinadas e nenhuma achou candidatura   → sem candidatura
 *
 * O passo 4 é conjuntivo de propósito ("alguma", não "nenhuma"): basta uma
 * grafia fora do universo examinado para que a negativa deixe de ser uma
 * negativa sobre a PESSOA e passe a ser uma negativa sobre uma string.
 *
 * ⚠ O PASSO 5 FOI ACRESCENTADO EM 18/08/2026 PORQUE A VERSÃO ANTERIOR PUBLICOU
 * AFIRMAÇÃO FALSA — e a conferência independente as achou conferindo TODAS as
 * 326 linhas afirmadas contra `data/candidaturas.ndjson`, não por amostra:
 *
 *     governador:GO  Michelle Bolsonaro  "nenhuma no registro"  → `senador:DF`
 *     senador:MS     Simone Tebet        "nenhuma no registro"  → `senador:SP`
 *     governador:GO  Ciro Gomes          "nenhuma no registro"  → `governador:CE`
 *
 * O ARQUIVO CONTRADIZIA A SI MESMO: a seção `presidente:BR` publicava Ciro Gomes
 * em `governador:CE` e Michelle em `senador:DF`, e a seção `governador:GO`
 * publicava os dois como não tendo nada no registro.
 *
 * A CAUSA está em `match-ballot-names.mjs`, na reserva de registro inteiro:
 *
 *     if (ufPesquisa !== "BR" && c.uf && c.uf !== ufPesquisa) continue;
 *
 * Uma candidatura de OUTRO estado é recusada DE PROPÓSITO — é a regra que impede
 * o "Álvaro Dias" do Paraná de sair carregando o registro do "ÁLVARO DIAS" do
 * Rio Grande do Norte. Só que essa recusa é contada como `stats.sem`, e o passo
 * 6 lia `stats.sem` como "nenhuma candidatura no registro inteiro". Numa disputa
 * ESTADUAL o casador nunca olhou fora do estado: existem QUATRO desfechos, não
 * três, e o quarto é "examinado e recusado pela regra de estado".
 *
 * É o defeito de `lacunas-poder360.mjs` outra vez, um nível acima: o nosso
 * próprio casador se abstendo, publicado como fato sobre o mundo.
 *
 * ⚠ E O CONSERTO NÃO É UM SEGUNDO CASADOR (§5). Sair procurando o nome nos
 * outros estados é exatamente a armadilha — seria uma segunda regra de
 * identidade, divergindo da primeira na primeira correção feita de um lado só.
 * O que este passo faz é BARATO e não decide nada: pergunta se o NOSSO banco já
 * se contradiz sobre a MESMA grafia normalizada (`normNome`, a implementação
 * única). Quando duas linhas de pessoa carregam a mesma grafia e uma delas TEM
 * candidatura, não é uma afirmação que a gente possa publicar.
 *
 * O balde é PRÓPRIO, e não "não determinado", porque a informação é outra e o
 * leitor é o criador: aqui existe uma linha concreta que contradiz, com
 * `person_id` e disputa, e ela é o que ele precisa ver para decidir.
 *
 * ⚠ O BALDE MISTURA DUAS COISAS DE PROPÓSITO, E ISSO NÃO SE RESOLVE AQUI. Das 6
 * linhas que ele pega, três são a MESMA pessoa partida em duas linhas (Michelle,
 * Tebet, Ciro Gomes), duas são HOMÔNIMOS que a curadoria já declarou pessoas
 * diferentes (os dois "Álvaro Dias" do PR contra o do RN — a própria regra de
 * estado existe por causa deles) e uma é indecidível sem documento (Ravenna
 * Castro × Ravenna da Inclusão). Separar as três espécies é ruling de humano,
 * não conta de relatório (§4, §12).
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
  // ⚠ A CONSULTA DE CONTRADIÇÃO É MAIS LARGA QUE A DE EXAME, E DE PROPÓSITO.
  //
  // "O casador examinou esta grafia?" é pergunta sobre uma disputa pesquisada, e
  // por isso usa só as grafias vistas AQUI. "O nosso banco se contradiz sobre
  // esta pessoa?" é pergunta sobre a PESSOA, que é global — então entram também
  // o `display` que o site publica e todas as `polled_names` que a linha dela
  // acumulou em qualquer disputa.
  //
  // ⚠ CORREÇÃO DE 18/08/2026 — a versão anterior deste comentário AFIRMAVA que
  // "foi por `display` que Michelle, Simone Tebet e Ciro Gomes foram
  // alcançados". É FALSO, e a conferência provou apagando `pessoa?.display`
  // daqui: autoteste verde e o arquivo gerado byte a byte igual. Os três são
  // alcançados pela grafia observada NESTA disputa contra as `polled_names` da
  // linha registrada — o `display` daqui não participou de nenhum deles.
  //
  // As três fontes ficam, e cada uma tem agora fixture que a torna necessária
  // (`p_ord_obs` para as grafias, `p_disp_obs` para o `display`, `p_larga_obs`
  // para as `polled_names`). Um comentário que promete proteção que o código não
  // dá é pior que nenhum — é a lição que `lib/candidates.mjs` já carrega no
  // cabeçalho, e eu a repeti aqui.
  const contradiz = [];
  const amplas = [...grafias.map((g) => g.nome), pessoa?.display, ...(pessoa?.polled_names ?? [])].filter(Boolean);
  for (const nome of amplas) {
    for (const o of registradoPorGrafia?.get(normNome(nome)) ?? []) {
      if (o.person_id === pessoa?.person_id) continue;
      // A MESMA LINHA REGISTRADA ALCANÇADA POR DUAS GRAFIAS É UMA LINHA SÓ.
      // `amplas` repete de propósito (a grafia observada costuma reaparecer em
      // `polled_names`), então sem esta deduplicação a mesma pessoa sairia
      // listada duas vezes na coluna. Também só exercitada por fixture.
      if (contradiz.some((x) => x.person_id === o.person_id)) continue;
      // ⚠ A GRAFIA VAI COMO FOI PUBLICADA, NÃO NORMALIZADA. `normNome` serve
      // para CASAR, nunca para exibir: trocar por `normNome(nome)` reescreve as
      // 6 linhas do arquivo (`"Ciro Gomes"` → `"ciro gomes"`) e a bateria não
      // via. O autoteste afirma a grafia publicada, letra a letra.
      contradiz.push({ ...o, grafia: nome });
    }
  }
  if (contradiz.length) {
    // ⚠ ORDEM ESTÁVEL, E EXERCITADA. `person_id` não empata (§8). A ordem de
    // construção é a de `amplas`, que é a ordem das grafias — então a linha que
    // colide primeiro NÃO é necessariamente a de menor id, e sem este `sort` a
    // saída passaria a seguir a ordem das grafias. Toda linha real de hoje tem
    // exatamente UMA candidatura contraditória, então esta guarda protegia
    // código que nenhum dado executa (§2): `p_ord_obs`, no fixture, colide com
    // TRÊS linhas e é ele que a mantém honesta.
    contradiz.sort((a, b) => porNome(a.person_id, b.person_id));
    return { classe: "contradicao", outras: [], contradiz };
  }
  return { classe: "sem-candidatura", outras: [] };
}

/**
 * Índice `normNome(grafia)` → linhas de pessoa que TÊM candidatura e carregam
 * aquela grafia.
 *
 * Lê as grafias que a própria pessoa registra — `polled_names` (as formas sob as
 * quais ela foi vista em pesquisa), o `display` publicado e o `nome_urna` do
 * TSE. Não é casamento: é indexação do que `people.ndjson` já afirma, com o
 * ÚNICO normalizador do repositório. Um segundo casador aqui seria o §5.
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
  // Ordem estável dentro de cada grafia (§8): a lista vai para arquivo
  // versionado. Hoje nenhuma grafia real alcança DUAS pessoas registradas, então
  // sem fixture esta ordenação seria uma guarda sobre código morto (§2) — o
  // trio `p_ord_b`/`p_ord_c` existe para isso.
  for (const lista of m.values()) lista.sort((a, b) => porNome(a.person_id, b.person_id));
  return m;
}

// ---------------------------------------------------------------------------
// O ALCANCE REAL DE UMA NEGATIVA — dito na coluna, não subentendido
// ---------------------------------------------------------------------------
//
// Mesmo depois do passo 5, "sem candidatura" numa disputa ESTADUAL não quer
// dizer "nenhuma candidatura no registro inteiro", e escrever isso foi o que
// tornou três linhas falsas. Pela regra de estado do casador, o que ficou
// provado numa disputa estadual é: nenhuma candidatura compatível NAQUELA UF
// (governo e senado) nem entre as 13 nacionais. Sobre os outros 26 estados, o
// casador não olhou — e este relatório não vai afirmar por ele.
//
// Em `presidente:BR` a regra de estado é isenta nas duas pontas (`ufPesquisa`
// é "BR"), então ali a reserva varreu o registro INTEIRO e a frase forte vale.
//
// Toni Rodrigues (`governador:PI`) e José Guimarães (`governador:CE`) são a
// classe que sobra: o passo 5 não os alcança, porque o nosso banco não tem
// nenhuma outra linha com a grafia deles. É esta coluna que os deixa honestos.
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
export function catalogar({ questions, surveys, candidates, people, crus, ballot, inicioPeriodo = INICIO_PERIODO_ELEITORAL }) {
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
  // 3. O DENOMINADOR. Sem ele "36 confrontos" não quer dizer nada — é a mesma
  //    razão pela qual `lacunas-poder360.mjs` conta as RECUPERADAS que não
  //    precisam de reparo nenhum. Aqui: todos os confrontos de 2º turno da
  //    disputa, inclusive os em que todo mundo se registrou.
  const totais = new Map();
  const total = (d) => {
    let t = totais.get(d);
    if (!t) { t = { confrontos: new Set(), cenarios: 0, confrontosNacionais: new Set(), cenariosNacionais: 0 }; totais.set(d, t); }
    return t;
  };
  // O universo do período eleitoral, como denominador do `0` que este relatório
  // provavelmente vai imprimir: quantos cenários o banco tem depois do corte.
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
      // Uma linha de resultado sem candidato no store não é achado deste
      // relatório — é defeito de integridade, e quem reprova por isso é
      // `validate-store.mjs`. Aqui ela é ignorada em vez de virar pessoa nova.
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
    // CONTRADIÇÃO CONTA COMO RECUSA, NUNCA COMO AFIRMAÇÃO. Um confronto cujo
    // único nome fora da urna é uma linha que o nosso banco contradiz não pode
    // ser publicado como "tem alguém sem candidatura" — é o mesmo erro de
    // direção, um nível acima.
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

  // Desempate final SEMPRE num campo que não empata: `person_id` para candidato,
  // o conjunto de ids para confronto. Sem isso, dois nomes iguais (e existem —
  // ver as duas linhas "Ciro Nogueira" em `presidente:BR`) trocariam de lugar
  // entre rodadas sem nada ter mudado.
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
    periodo: { cenarios: periodo.cenarios, levantamentos: periodo.levantamentos.size },
    placar: {
      total2T: [...totais.values()].reduce((n, t) => n + t.confrontos.size, 0),
      cenarios2T: [...totais.values()].reduce((n, t) => n + t.cenarios, 0),
      disputasComLinha: lista.length,
      candidatos: somar((s) => s.candidatos.length),
      semCandidatura: somar((s) => s.candidatos.filter((c) => c.classe === "sem-candidatura").length),
      // O CORTE QUE A GLOSA DO PLACAR PRECISA. A negativa não tem o mesmo
      // alcance nos dois casos, e a linha de resumo é o que um leitor não
      // técnico lê primeiro — dizer "no registro inteiro" ali desfazia, no
      // resumo, o conserto feito linha a linha.
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

function relatorio(cat, ctx) {
  const L = [];
  const p = cat.placar;
  L.push("# Candidaturas não registradas — quem foi testado e não se registrou");
  L.push("");
  L.push("Gerado por `node scripts/candidaturas-nao-registradas.mjs`. **Enumeração, não reparo.**");
  L.push("");
  L.push("O banco guarda muita pesquisa que testou gente que depois não registrou candidatura para");
  L.push("aquela disputa. **Isso não é erro de dado e não se corrige aqui.** O instituto perguntou");
  L.push("mesmo, e na data em que perguntou ninguém sabia quem ia se registrar — a decisão do criador");
  L.push("já está no repositório: *quem foi testado em pesquisa e não se registrou fica também; é fato");
  L.push("sobre a pesquisa, não erro a corrigir*. Este arquivo existe para **sinalizar e catalogar**, e");
  L.push("só para o dia em que uma dessas linhas parecer estar distorcendo a análise de uma pesquisa do");
  L.push("período eleitoral.");
  L.push("");
  L.push(`**Período eleitoral: a partir de ${dt(cat.inicioPeriodo)}** (início da campanha). É o gatilho declarado`);
  L.push("pelo criador: um confronto cujas pesquisas são todas anteriores a essa data é história; um que");
  L.push("continua sendo perguntado depois dela merece um olhar. A coluna **no período** conta cenários");
  L.push("cujo **fim de campo** é dessa data em diante.");
  L.push("");
  L.push("⚠ **Nenhuma conta de média aqui.** `src/lib/average.ts` é dono de *quais pesquisas entram na");
  L.push("média*, e uma segunda cópia neste relatório seria o defeito do §5. As colunas abaixo são fato");
  L.push("cru — quantos cenários, quais datas, qual candidatura consta do registro — e o julgamento é de");
  L.push("um humano. O que eu achei que merece atenção está em prosa na seção **Leitura**, não em conta.");
  L.push("");

  L.push("## Placar");
  L.push("");
  L.push("| população | o que é | quantas |");
  L.push("|---|---|---|");
  L.push(`| **SEM CANDIDATURA** | a pessoa não tem candidatura nesta disputa, e o casador procurou o nome dela **até onde alcança**: no registro inteiro nas ${p.semCandidaturaNacional} linhas da disputa nacional, e só na UF da disputa mais as 13 candidaturas nacionais nas ${p.semCandidaturaEstadual} estaduais | **${p.semCandidatura}** |`);
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

  L.push("## ⚠ O que esta lista NÃO enxerga");
  L.push("");
  L.push("Numa disputa **estadual** o casador de nomes só procurou o nome na UF daquela disputa e entre");
  L.push("as 13 candidaturas nacionais — **ele não olha os outros 26 estados**. Então quem se registrou");
  L.push("num estado que não foi procurado, e que nunca foi pesquisado sob uma grafia que colidisse com a");
  L.push("de alguém registrado, **continua aparecendo aqui como sem candidatura**. Não é engano de");
  L.push("leitura: é o alcance do que dá para provar com o que temos hoje. Se uma linha desta lista");
  L.push("importar para uma decisão, confira o nome no registro antes de agir.");
  L.push("");
  L.push(`Isso vale para **${p.semCandidaturaEstadual} das ${p.semCandidatura}** linhas afirmadas — as de disputa estadual. Nas ${p.semCandidaturaNacional} da disputa`);
  L.push("nacional a busca varreu o registro inteiro, e ali a negativa é forte.");
  L.push("");
  L.push("Foi exatamente essa a falha da primeira versão deste arquivo: ela afirmou \"nenhuma no registro\"");
  L.push("em três linhas estaduais e as três estavam erradas. O passo 5 e a coluna escopada fecham o que");
  L.push("é demonstrável; **este parágrafo é o que sobra, e sobra de propósito** — dizer o resto exigiria");
  L.push("um segundo casador, que é o que o §5 proíbe.");
  L.push("");
  L.push("## Como cada linha é classificada");
  L.push("");
  L.push("A pergunta \"esta pessoa tem candidatura nesta disputa?\" é respondida por `data/people.ndjson`,");
  L.push("onde `resolvePerson` — via `ballotCandidacy` e `data/ballot-names.json` — **já** gravou com que");
  L.push("candidatura do TSE cada pessoa casou. Não há segundo casador nem segundo normalizador aqui (§5).");
  L.push("");
  L.push("A ordem das checagens, da evidência mais forte para a mais fraca:");
  L.push("");
  L.push("1. tem candidatura **nesta** disputa → registrada, não entra neste arquivo;");
  L.push("2. tem candidatura em **outra** disputa → **OUTRA DISPUTA**, e a disputa vai na coluna;");
  L.push("3. o casador **recusou** alguma grafia por ambiguidade (`ballot-names.json.ambiguos`) → **não determinado**;");
  L.push("4. alguma grafia **nunca foi examinada** pelo casador (não está em `data/nomes-crus.json` da disputa pesquisada) → **não determinado**;");
  L.push("5. **outra linha de pessoa do nosso próprio banco carrega a mesma grafia e TEM candidatura** → *contradição*;");
  L.push("6. todas foram examinadas e nenhuma achou candidatura ao alcance do casador → **SEM CANDIDATURA**.");
  L.push("");
  L.push("### O passo 5 existe porque a versão anterior deste arquivo publicou afirmação falsa");
  L.push("");
  L.push("A conferência independente leu **todas as 326** linhas então afirmadas contra");
  L.push("`data/candidaturas.ndjson` — não por amostra — e três estavam erradas:");
  L.push("");
  L.push("| disputa | a linha dizia | o registro diz |");
  L.push("|---|---|---|");
  L.push("| `governador:GO` | Michelle Bolsonaro — nenhuma no registro | `senador:DF` MICHELLE BOLSONARO |");
  L.push("| `senador:MS` | Simone Tebet — nenhuma no registro | `senador:SP` SIMONE TEBET |");
  L.push("| `governador:GO` | Ciro Gomes — nenhuma no registro | `governador:CE` CIRO GOMES |");
  L.push("");
  L.push("E o arquivo **contradizia a si mesmo**: a seção `presidente:BR` publicava Ciro Gomes em");
  L.push("`governador:CE` e Michelle em `senador:DF`, enquanto a seção `governador:GO` publicava os dois");
  L.push("como não tendo nada no registro.");
  L.push("");
  L.push("A causa está em `scripts/match-ballot-names.mjs`, na reserva de registro inteiro:");
  L.push("");
  L.push("```js");
  L.push("if (ufPesquisa !== \"BR\" && c.uf && c.uf !== ufPesquisa) continue;");
  L.push("```");
  L.push("");
  L.push("Uma candidatura de **outro estado** é recusada **de propósito** — é a regra que impede o");
  L.push("\"Álvaro Dias\" do Paraná de sair carregando o registro do \"ÁLVARO DIAS\" do Rio Grande do");
  L.push("Norte. Só que essa recusa é contada como `stats.sem`, e o passo final lia `stats.sem` como");
  L.push("*nenhuma candidatura no registro inteiro*. Numa disputa **estadual o casador nunca olhou fora");
  L.push("do estado**: existem **quatro** desfechos, não três, e o quarto é \"examinado e recusado pela");
  L.push("regra de estado\". É o defeito de `LACUNAS_PODER360.md` outra vez, um nível acima — o nosso");
  L.push("próprio casador se abstendo, publicado como fato sobre o mundo.");
  L.push("");
  L.push("**O conserto não é um segundo casador** (§5): sair procurando o nome nos outros estados seria");
  L.push("uma segunda regra de identidade. O passo 5 é barato e não decide nada — pergunta se o nosso");
  L.push("banco já se contradiz sobre a **mesma grafia normalizada**. Quando duas linhas de pessoa");
  L.push("carregam a mesma grafia e uma delas tem candidatura, não é afirmação que a gente possa publicar.");
  L.push("");
  L.push("**E o alcance da negativa passou a ser dito na coluna, em vez de subentendido.** Numa disputa");
  L.push("estadual a coluna agora lê `nenhuma em \\`UF\\` nem nacional`, que é exatamente o que ficou");
  L.push("provado: nenhuma candidatura compatível naquela UF (governo e senado) nem entre as 13");
  L.push("nacionais. Só em `presidente:BR` — onde a regra de estado é isenta nas duas pontas — a frase");
  L.push("forte `nenhuma no registro inteiro` continua valendo. É esta coluna que deixa honestos os");
  L.push("casos que o passo 5 **não** alcança, como Toni Rodrigues (`governador:PI`) e José Guimarães");
  L.push("(`governador:CE`), cujas grafias não aparecem em nenhuma outra linha do nosso banco.");
  L.push("");
  L.push("⚠ **O balde de contradição mistura três espécies, e separá-las é ruling de humano, não conta");
  L.push("de relatório** (§4, §12): a mesma pessoa partida em duas linhas (Michelle, Tebet, Ciro Gomes);");
  L.push("homônimos que a curadoria já declarou pessoas **diferentes** (os dois \"Álvaro Dias\" do PR");
  L.push("contra o do RN — a regra de estado existe por causa deles, e continuam corretamente recusados);");
  L.push("e o indecidível sem documento (Ravenna Castro × Ravenna da Inclusão). **Este relatório não");
  L.push("decide nenhuma das três.**");
  L.push("");
  L.push("**O passo 4 é a regra que impede a inferência proibida (§4), e ele não é decorativo.** Sem ele,");
  L.push("quatro pessoas sairiam daqui afirmadas como \"nenhuma candidatura no registro inteiro\", e para");
  L.push("três a afirmação é falsa contra `data/candidaturas.ndjson`:");
  L.push("");
  L.push("| disputa | pessoa | a grafia que o casador examinou | a candidatura que existe |");
  L.push("|---|---|---|---|");
  L.push("| `governador:GO` | Gustavo Mendanha | \"Gustavo Medanha\" (um `n` a menos, como o instituto publicou) | `senador:GO` |");
  L.push("| `governador:SP` | Guilherme Derrite | \"Capitão Derrite\" | `senador:SP` |");
  L.push("| `presidente:BR` | Ciro Nogueira | \"Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro\" | `senador:PI` |");
  L.push("");
  L.push("Em todos, o nome que **alcançaria** a candidatura é o nome canonizado por nós, que o casador");
  L.push("nunca viu. Afirmar a partir da nossa própria falha de casamento é exatamente o que o §4 proíbe.");
  L.push("");
  L.push("**A chave de exame não dobra para a nacional, e isso foi medido dos dois jeitos.** Em quase todo");
  L.push("o resto do repositório `presidente:PR` dobra para `presidente:BR` — a disputa é nacional, só a");
  L.push("amostra é estadual. A pergunta \"tem candidatura nesta disputa?\" usa a dobra. A pergunta \"o");
  L.push("casador examinou esta grafia?\" **não**, e rodando os dois jeitos contra este banco:");
  L.push("");
  L.push("| | sem candidatura | não determinados |");
  L.push("|---|---|---|");
  L.push("| **sem dobra** (o que está publicado aqui) | 326 | 8 |");
  L.push("| com dobra | 328 | 6 |");
  L.push("");
  L.push("A dobra \"resolve\" duas linhas: `Tereza Cristina`, que é ganho real, e `Ciro Nogueira`, que é");
  L.push("**afirmação falsa** — a pessoa sem registro nascida da grafia com cláusula herdaria o exame de");
  L.push("\"Ciro Nogueira\" em `presidente:BR` e sairia como \"nenhuma no registro\", sendo que Ciro Nogueira");
  L.push("está registrado em `senador:PI`. Uma afirmação falsa contra duas recusas a mais: o repositório");
  L.push("já declarou a direção do erro — *erra para o lado de NÃO afirmar*. O preço é `Lula × Tereza");
  L.push("Cristina`, 5 cenários nacionais, em não determinado.");
  L.push("");

  L.push("## Leitura — o que salta aos olhos");
  L.push("");
  for (const linha of ctx.leitura) L.push(linha);
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
      L.push("Não é afirmação de que sejam a mesma pessoa, nem de que não sejam. É o registro de que");
      L.push("`people.ndjson` tem **outra linha** com a mesma grafia normalizada e **com** candidatura —");
      L.push("o que basta para esta linha não poder ser publicada como \"sem candidatura\". Quem decide se");
      L.push("é a mesma pessoa, um homônimo ou um caso a pesquisar é um humano (§4, §12).");
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
  L.push("Nada se corrige a partir desta tabela. Ela existe para que, quando uma pesquisa do período");
  L.push("eleitoral parecer estranha, dê para responder em um olhar se um nome fora da urna está no");
  L.push("meio dela — e a decisão do que fazer continua sendo do criador (§12).");
  return L.join("\n") + "\n";
}

/**
 * A PROSA É ESCRITA A PARTIR DOS NÚMEROS, e cada frase carrega o número que a
 * sustenta. Uma leitura sem número é opinião; com número, é achado conferível.
 */
function leitura(cat) {
  const L = [];
  const pres = cat.disputas.find((s) => s.disputa === "presidente:BR");
  const p = cat.placar;
  if (pres) {
    const nac = pres.confrontos.filter((c) => c.nacionais > 0);
    const cenNac = nac.reduce((n, c) => n + c.nacionais, 0);
    const ndNac = pres.confrontosIndeterminados.filter((c) => c.nacionais > 0);
    const cenNd = ndNac.reduce((n, c) => n + c.nacionais, 0);
    L.push(`- **A presidencial é o grosso.** ${pres.candidatos.length} pessoas testadas para presidente não têm candidatura presidencial, e elas aparecem em ${pres.confrontos.length} confrontos de 2º turno da disputa (de ${pres.total2T}), somando ${pres.confrontos.reduce((n, c) => n + c.cenarios, 0)} de ${pres.cenarios2T} cenários.`);
    L.push(`- **Restringindo à amostra nacional** — que é o recorte em que o criador mediu —, o banco tem **${pres.total2TNacional} confrontos** de 2º turno e **${pres.cenarios2TNacional} cenários**. Destes, **${nac.length} confrontos (${cenNac} cenários)** têm alguém sem candidatura presidencial *afirmado*, e **${ndNac.length} confronto(s) (${cenNd} cenários)** ficam em não determinado. A **soma, ${nac.length + ndNac.length} confrontos e ${cenNac + cenNd} cenários**, é exatamente a medida de 17/08/2026 — a diferença é que aqui a linha que não dá para afirmar está separada, em vez de contada junto.`);
    const tarc = pres.candidatos.filter((c) => c.classe === "outra-disputa");
    if (tarc.length) {
      const top = tarc.slice(0, 5).map((c) => `**${c.display}** (${c.outras.join(", ")}, ${c.cenarios} cenários)`).join("; ");
      L.push(`- **Registrados em outra disputa — o caso mais interessante.** ${tarc.length} das pessoas testadas para presidente se registraram para outro cargo: ${top}${tarc.length > 5 ? "; e outros" : ""}. O instituto perguntou por eles como presidenciáveis e eles foram disputar governo ou senado.`);
    }
  }
  const comPeriodo = cat.disputas.flatMap((s) => s.confrontos).filter((c) => c.noPeriodo > 0);
  if (!comPeriodo.length) {
    L.push(`- **Nenhum confronto afirmado tem cenário no período eleitoral, e nenhuma linha de candidato também.** É o achado que mais importa para a decisão do criador: hoje nenhuma dessas linhas está distorcendo pesquisa de campanha, porque nenhuma delas foi perguntada de ${dt(cat.inicioPeriodo)} em diante. **Mas leia o \`0\` com o denominador ao lado:** o banco tem só **${cat.periodo.cenarios} cenários** com campo encerrado nessa data ou depois, em **${cat.periodo.levantamentos} levantamento(s)** — o corte é de dois dias atrás. O \`0\` mede tanto a idade do corte quanto a ausência do problema, e este arquivo tem de ser relido quando houver campo pós-corte de verdade.`);
  } else {
    const top = comPeriodo.sort((a, b) => b.noPeriodo - a.noPeriodo).slice(0, 8);
    L.push(`- **${comPeriodo.length} confronto(s) afirmado(s) já foram perguntados no período eleitoral** — estes são os que merecem olhar: ${top.map((c) => `${c.rotulo} (${c.noPeriodo})`).join("; ")}.`);
  }
  const vivos = cat.disputas.flatMap((s) => s.confrontos).filter((c) => c.ultimo).sort((a, b) => String(b.ultimo).localeCompare(String(a.ultimo))).slice(0, 5);
  if (vivos.length) {
    L.push(`- **Os que mais recentemente ainda estavam sendo perguntados:** ${vivos.map((c) => `${c.rotulo} — ${dt(c.ultimo)} (${c.disputa})`).join("; ")}.`);
  }
  L.push(`- **${p.indeterminados} linha(s) de candidato e ${p.confrontosIndeterminados} de confronto ficaram sem resposta**, e continuam sem. Elas não são "não registradas" — são casos em que a nossa própria máquina de casamento não conseguiu dizer, e o §4 manda recusar em vez de escolher.`);
  const contr = cat.disputas.flatMap((s) => s.contradicoes.map((l) => ({ ...l, disputa: s.disputa })));
  if (contr.length) {
    L.push(`- **${contr.length} linha(s) foram recusadas porque o nosso próprio banco carrega a mesma grafia registrada** — e este é o achado que mais pede decisão do criador: ${contr.map((l) => `${l.display} em \`${l.disputa}\` ⟂ ${l.contradiz.map((x) => `\`${x.contests.join()}\``).join("/")}`).join("; ")}. São três espécies misturadas — a mesma pessoa partida em duas linhas, homônimos já declarados pessoas diferentes, e o indecidível sem documento — e **nenhuma delas é decidida aqui**.`);
  }
  L.push("- **O mesmo nome em duas linhas de pessoa é um rachado de identidade do banco, não erro deste relatório — e ele não está só na presidencial.** Em `presidente:BR` há duas linhas \"Ciro Nogueira\" e duas \"Ciro Gomes\", uma registrada e uma não. A versão anterior deste arquivo dizia que isso era inofensivo por ser coisa de `presidente:BR`, e estava errado: em disputa ESTADUAL o mesmo rachado produziu afirmação falsa sobre Michelle Bolsonaro, Simone Tebet e Ciro Gomes, porque ali a regra de estado do casador impede o encontro. Está anotado, `person_id` a `person_id`, e **não foi corrigido** — achado fora das classes do censo se anota, não se conserta no meio da rodada (§9).");
  return L;
}

// ---------------------------------------------------------------------------
// PRÉ-CONDIÇÕES — o silêncio que pareceria sucesso
// ---------------------------------------------------------------------------
//
// Sem o registro do TSE, `people.candidacies` está vazio em TODA pessoa e este
// relatório afirmaria que 855 pessoas não registraram candidatura nenhuma. Sem
// `nomes-crus.json`, nada foi "examinado" e tudo cai em não determinado — um
// arquivo bem formado, exit 0, e completamente vazio de conteúdo.
//
// As duas falham ALTO. É a mesma recusa que `match-ballot-names.mjs` tem contra
// entrada vazia, mas ancorada nas ENTRADAS e não na saída anterior: um gerador
// que lê a própria saída para se validar é o defeito do §6, e este não a lê.
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
    // ⚠ CADA PONTE TEM A SUA LINHA, E ISSO FOI CONSERTADO DEPOIS DE UMA
    // CONFERÊNCIA. O índice de contradição lê `polled_names`, `display` e
    // `nome_urna` da pessoa REGISTRADA; a consulta lê as grafias vistas na
    // disputa, o `display` e as `polled_names` da linha SEM registro. São seis
    // fontes, e uma versão anterior deste fixture cobria só três — apagar
    // `nome_urna` do índice, ou `display` da consulta, passava verde enquanto o
    // comentário dizia que estavam cobertos.
    //   · aqui a única ponte é o `display` da linha REGISTRADA;
    { person_id: "p_rachado_reg", display: "Nome Rachado", registered: true, polled_names: ["Grafia Só Do Registro"], candidacies: [{ cargo: "senador", uf: "DF" }] },
    { person_id: "p_rachado_obs", display: "Nome Rachado", registered: false, polled_names: ["Nome Rachado"], candidacies: [] },
    //   · e aqui a única ponte é `polled_names` — que é o caso Ravenna Castro,
    //     onde a pessoa REGISTRADA é publicada sob outro nome de urna e só a
    //     grafia pesquisada liga as duas linhas.
    { person_id: "p_urna_reg", display: "Outro Nome De Urna", registered: true, polled_names: ["Grafia Compartilhada"], candidacies: [{ cargo: "governador", uf: "PI" }] },
    { person_id: "p_urna_obs", display: "Grafia Compartilhada", registered: false, polled_names: ["Grafia Compartilhada"], candidacies: [] },
    //   · e aqui a ponte está do lado DE CÁ: a linha sem registro carrega, das
    //     outras disputas em que foi vista, uma grafia que NÃO aparece nesta —
    //     e é essa que colide com alguém registrado. Sem consultar as
    //     `polled_names` da própria pessoa, a colisão fica invisível.
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
  ];
  // A grafia CRUA é a que o instituto publicou; quando ela difere do canônico, o
  // fixture a declara — é justamente essa diferença que separa as duas metades.
  // ⚠ `c_amb` publica "Ciro" e o site canoniza para "Ciro Gomes". A recusa do
  // casador está gravada contra "Ciro" — a grafia CRUA. Se `name_raw` sumir do
  // conjunto de grafias, sobra só o canônico, que é examinado e não é ambíguo,
  // e a linha vira afirmação. É o que torna visível apagar `name_raw`.
  const CRU = { c_cla: "Xará Registrado, com apoio de alguém", c_amb: "Ciro" };
  const q = (id, survey_id, uf, round, ids) => ({
    question_id: id, survey_id, race: "presidente", round, uf,
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
  ];
  const crus = {
    // "Fulano Da Névoa" NÃO consta: é a grafia que o casador nunca examinou.
    // "Xará Registrado" consta AQUI e não em `presidente:PR` — é o nome curto,
    // que na vida real pertence a uma pessoa registrada noutra disputa.
    "presidente:BR": [{ nome: "Lula" }, { nome: "Tarcísio" }, { nome: "Jair Bolsonaro" }, { nome: "Ciro" }, { nome: "Ciro Gomes" },
      { nome: "Xará Registrado" }, { nome: "Homônimo Empatado" }, { nome: "Nome Rachado" }, { nome: "Grafia Compartilhada" }, { nome: "Nome Largo" },
      { nome: "Grafia Publicada" }, { nome: "Nome De Urna Só" }, { nome: "Zeta Grafia" }, { nome: "Grafia Da Disputa" }],
    "presidente:PR": [{ nome: "Lula" }, { nome: "Xará Registrado, com apoio de alguém" }, { nome: "Beltrano Do Paraná" }],
  };
  const ballot = { mapping: { "presidente:BR": {} }, ambiguos: [{ contest: "presidente:BR", nome: "Ciro", motivo: "compatível com mais de uma pessoa" }] };
  return { questions, surveys, candidates, people, crus, ballot };
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

  // 5b. AS DUAS METADES DA DOBRA DA CHAVE DE EXAME (§2 — o guarda que protege
  //     código que ninguém executa mente; estas duas linhas existem porque a
  //     primeira bateria passava verde com a dobra ligada).
  //     · dobrar OS DOIS lados afirmaria `Xará Registrado` como sem candidatura,
  //       herdando o exame do nome curto que é de outra pessoa;
  //     · dobrar SÓ a grafia observada tornaria a lista de `presidente:PR`
  //       inalcançável e recusaria `Beltrano Do Paraná`, que é afirmável.
  ok(!!achaNd("Xará Registrado"), "a grafia com cláusula não pode herdar o exame do nome curto da disputa nacional");
  ok(!acha("Xará Registrado"), "dobrar os dois lados da chave de exame produziria aqui uma afirmação falsa");
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
    const md = relatorio(cat, { leitura: leitura(cat) });
    ok(md.includes("| Tarcísio |") && md.includes("`governador:SP`"), "a tabela tem de publicar Tarcísio com a outra disputa");
    ok(md.includes("Lula × Tarcísio"), "a tabela de confrontos tem de publicar o par");
    ok(md.includes("Fulano Da Névoa"), "o não determinado tem de aparecer no relatório, não sumir");
    ok(md.includes("23/03/2026"), "as datas saem em DD/MM/AAAA (§11)");
    ok(md.includes("p_rachado_reg"), "a recusa por contradição tem de nomear no relatório a linha que contradiz");
    ok(md.includes("nenhuma no registro inteiro"), "a negativa nacional sai com o alcance escrito");
    // ⚠ A GLOSA DO PLACAR É O QUE UM LEITOR NÃO TÉCNICO LÊ PRIMEIRO, e ela
    // carregou por uma rodada inteira a MESMA afirmação falsa que o passo 5
    // tinha acabado de tirar das linhas. Prosa também se testa.
    ok(!/registro inteiro sem achar nada/.test(md), "a glosa do placar NÃO pode alegar o registro inteiro para todas as linhas");
    ok(md.includes("até onde alcança"), "a glosa do placar diz até onde a busca alcançou");
    ok(md.includes("O que esta lista NÃO enxerga"), "o relatório tem de dizer o que NÃO consegue ver");
    ok(md.includes("não olha os outros 26 estados"), "e dizer, em português claro, qual é o resíduo");
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

  if (falhas.length) {
    console.error("AUTOTESTE FALHOU:");
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("autoteste ok — outra-disputa (Tarcísio), grafia não examinada, recusa do casador (pela grafia CRUA), contradição no próprio banco pelas 6 pontes, grafia publicada sem normalizar, ordem e deduplicação com 3 contradições, alcance da negativa, confrontos, período eleitoral com o DIA do corte, data nula, empate por person_id, determinismo, renderização e placar");
}

// ---------------------------------------------------------------------------

const arg = (n) => process.argv.find((a) => a.startsWith(`--${n}=`))?.split("=").slice(1).join("=");

if (process.argv.includes("--self-test")) {
  autoteste();
} else {
  const store = readStore({ tables: ["surveys", "questions", "candidates", "people"] });
  const crus = lerJson(path.join(DATA_DIR, "nomes-crus.json"), {});
  const ballot = lerJson(path.join(DATA_DIR, "ballot-names.json"), {});
  exigirEntradas({ candidaturas: lerCandidaturas(), crus, ballot });
  const cat = catalogar({
    questions: store.questions, surveys: store.surveys,
    candidates: store.candidates, people: store.people,
    crus, ballot,
  });
  const md = relatorio(cat, { leitura: leitura(cat) });
  const out = path.resolve(ROOT, arg("out") ?? "CANDIDATURAS_NAO_REGISTRADAS.md");
  fs.writeFileSync(out, md);
  const p = cat.placar;
  console.log(`SEM CANDIDATURA ${p.semCandidatura} · OUTRA DISPUTA ${p.outraDisputa} · não determinados ${p.indeterminados}`);
  console.log(`  confrontos de 2º turno afirmados ${p.confrontos} (${p.cenariosDeConfronto} cenários) · não determinados ${p.confrontosIndeterminados}`);
  console.log(`  disputas com linha ${p.disputasComLinha} · cenários no período eleitoral (desde ${cat.inicioPeriodo}): candidatos ${p.noPeriodoCandidatos}, confrontos ${p.noPeriodoConfrontos}`);
  console.log(`→ ${path.relative(ROOT, out)}`);
}
