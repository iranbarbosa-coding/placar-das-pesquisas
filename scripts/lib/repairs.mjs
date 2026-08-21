// Curated repairs, re-applied on every scrape run.
//
// Sources drop data in ways we cannot fix upstream (Poder360's v2 endpoint
// silently omits candidate rows whose name field is empty). Patching the
// generated dataset by hand would survive exactly until the next run, so the
// corrections live here as data and are replayed each time — a rebuild from
// scratch can never lose them.
//
// Every entry must cite the primary source that proves its numbers. Nothing
// in this file may be inferred from neighbouring polls.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sameCandidate } from "./canonicalize.mjs";
import { pollId } from "./util.mjs";
import { folgaDerivada, sobreviveAoGuardaDeSoma } from "./soma.mjs";
// A janela de "mesma operação de campo" mora em `store.mjs`, ao lado da escada
// que a usa. Sem ciclo: o fecho de imports de `store.mjs` (candidates,
// canonicalize, candidaturas, ids, ndjson, nomes, parties, people) não alcança
// este arquivo, e `canonicalize.mjs` acima já vem de dentro desse fecho.
import { JANELA_OPERACAO_MS, questionRostersMatch } from "./store.mjs";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "repairs.json");

function matches(poll, m) {
  if (m.tse_registration) {
    const norm = (s) => (s ?? "").replace(/\s+/g, "").toUpperCase();
    if (norm(poll.tse_registration) !== norm(m.tse_registration)) return false;
  }
  if (m.race && poll.race !== m.race) return false;
  if (m.round && poll.round !== m.round) return false;
  if (m.state !== undefined && poll.state !== m.state) return false;
  // `?? ""` porque `matches` passou a receber também a pesquisa que `add_poll`
  // MONTA, e uma entrada mal escrita (sem `pollster`) tem de ser RECUSADA com um
  // aviso legível — não derrubar a coleta inteira com um TypeError.
  if (m.pollster && (poll.pollster ?? "").toLowerCase() !== m.pollster.toLowerCase()) return false;
  if (m.fieldwork_end && poll.fieldwork_end !== m.fieldwork_end) return false;
  // ---- O DISCRIMINADOR DE CENÁRIO -----------------------------------------
  //
  // Sem ele NÃO HÁ COMO MIRAR UM SEGUNDO TURNO. Uma pesquisa nacional traz
  // quatro confrontos sob o MESMO registro, a MESMA disputa e o MESMO turno —
  // Lula×Flávio, Lula×Caiado, Lula×Zema, Lula×Renan —, e as chaves acima não os
  // distinguem. Medido em 17/08/2026: PoderData e Quaest com 4 cenários de 2º
  // turno cada, Nexus com 2, todos indistinguíveis. Um `set` de balde escrito
  // para um deles acertaria os quatro, com o valor errado em três.
  //
  // `has_candidate` exige que os nomes citados estejam no elenco da pesquisa. É
  // dado, não rótulo: `scenario_label_raw` é gerado e este repositório já achou
  // rótulo que não corresponde às linhas que carrega.
  //
  // ⚠ COMPARA COM `sameCandidate`, e a razão é a ORDEM DO PIPELINE: os reparos
  // são aplicados ANTES de `canonicalizeCandidates` (scrape.mjs, applyRepairs na
  // 282, canonicalização na 397). O nome no elenco é o que a FONTE publicou, não
  // o que o site exibe — escrever "Zema" e comparar por igualdade falharia numa
  // rodada em que a fonte publicou "Romeu Zema". `sameCandidate` é a regra que o
  // resto do repositório usa para "é a mesma pessoa" (§5).
  if (m.has_candidate != null) {
    const querem = Array.isArray(m.has_candidate) ? m.has_candidate : [m.has_candidate];
    const elenco = (poll.results ?? []).map((r) => r.candidate).filter(Boolean);
    for (const nome of querem) {
      if (!elenco.some((c) => sameCandidate(c, nome))) return false;
    }
  }
  return true;
}

// ===========================================================================
// `add_poll` — A PESQUISA QUE NUNCA CHEGA A EXISTIR PARA UM REPARO CORRIGIR
// ===========================================================================
//
// O `v2/cenarios` do Poder360 apaga linhas de candidato cujo campo `nome` chega
// vazio. Quando apaga TODAS as linhas de um bloco, `sources/poder360.mjs` (o
// `if (!results.length) continue;`) descarta a pesquisa inteira — e aí nenhum
// reparo a alcança, porque `applyRepairs` só sabe MUTAR pesquisa que já está na
// lista. Escala medida em 17/08/2026: **41 blocos de disputa ausentes do banco
// por este motivo** (423 ids do Poder360 perdem ao menos uma linha hoje).
//
// ⚠ E A SAÍDA NÃO É AFROUXAR O FILTRO DA FONTE. Emitir a pesquisa vazia
// inundaria o pipeline com 423 registros sem elenco, e os guardas de soma
// (`sum < 30` no coletor, `incompleteFlag` na projeção) passariam a reprovar
// pesquisa boa. O filtro está certo; o que falta é uma porta CURADA.
//
// Então esta é a terceira família de ação do arquivo, ao lado de `add_results`,
// `set_party` e `set`: uma pesquisa inteira, transcrita à mão do relatório do
// próprio instituto, com a MESMA barra probatória de todo reparo —
// `source`/`evidence`/`verified_at` obrigatórios, e RECUSA sem eles. Nada aqui
// é inferido de pesquisa vizinha (CONVENTIONS §4).
//
// ---------------------------------------------------------------------------
// A CHAVE DE IDENTIDADE É A PRÓPRIA CLÁUSULA `match` (§5, §8)
// ---------------------------------------------------------------------------
//
// A fonte pode voltar a servir a pesquisa a qualquer rodada, e nesse dia a
// inserção tem de virar NADA em vez de um duplicado. A pergunta "esta pesquisa
// já existe?" é exatamente a pergunta que `matches()` responde para todo reparo
// deste arquivo — então ela é respondida pelo MESMO predicado, e não por uma
// segunda regra escrita só para cá que divergiria na primeira correção feita de
// um lado só. Três estados, todos em voz alta:
//
//   sem alvo, sem vizinho  → INSERE (e o coletor imprime `PESQUISA INSERIDA`)
//   com alvo VIVO          → NO-OP  (`noop`, que o coletor já imprime)
//   vizinho VIVO fora do match → RECUSA (`warnings`)
//
// "VIVO" = sobreviveria ao guarda de soma do coletor (`veredictoDeSoma`,
// lib/soma.mjs). Alvo ou vizinho que reprovaria na soma NÃO conta para
// dispensar nem para recusar: ele morre no guarda logo depois, e contá-lo era
// perder a pesquisa pelos dois caminhos ao mesmo tempo — o caso medido de
// presidente:RO 1º turno no ensaio de 20/08/2026 ("a fonte já serve esta
// pesquisa — p360-13645-…", que somava 16 e o guarda do coletor descartou).
//
// Duas travas que valem a leitura:
//
// 1. A pesquisa montada tem de satisfazer a PRÓPRIA cláusula. Sem isso "nenhum
//    alvo casou" não significa nada: um `match` que descreva outra pesquisa
//    inseriria de novo em toda rodada, e a idempotência do §8 seria uma
//    coincidência em vez de uma propriedade.
//
// 2. Um QUASE-igual recusa, nunca insere. `matches()` compara `fieldwork_end`
//    por igualdade exata; se a fonte passar a servir a mesma operação de campo
//    datada um dia adiante, o alvo não casa e o duplicado entraria. A janela é a
//    mesma "uma operação de campo = um levantamento" que o banco já usa em
//    `resolveSurvey` (degraus 2 e 3) e em `datesClose` do coletor, e é a MESMA
//    constante, importada: `JANELA_OPERACAO_MS` de `store.mjs` — DERIVADA da
//    doutrina que já está no código, não escolhida para este guarda (§10).
//    Doador ambíguo recusa e loga, como faz a retenção de elenco.
//
// ---------------------------------------------------------------------------
// COMO SE SABE, DEPOIS, QUE A PESQUISA É CURADA E NÃO COLETADA
// ---------------------------------------------------------------------------
//
// Três marcas, todas mecanismos que já existiam (§5), nenhuma inventada aqui:
//
//   * `id` com prefixo `curado-` em vez de `p360-`. O id da fonte é
//     `p360-<nativo>-<turno>-<idx>-<pollId(poll)>`; o nosso é
//     `curado-<pollId(poll)>`, então os dois espaços NÃO PODEM COLIDIR — e o id
//     é cunhado da mesma `pollId()`, portanto determinístico e estável entre
//     rodadas. Como `nativeOf()` em `build-store.mjs` só reconhece `p360-`, a
//     pesquisa inserida entra sem `source_ref` nativo: ela não reivindica um id
//     nativo que não é dela, e o degrau 1 da escada segue livre para a pesquisa
//     REAL quando a fonte voltar a servi-la.
//   * o carimbo `repaired`, com `inserted: true` para separar "este registro foi
//     corrigido" de "este registro só existe porque foi curado". É o carimbo que
//     `upsertPoll` já leva para `question.repaired` e que `project.mjs` já
//     projeta em `polls.json`.
//   * `provenance.field_sources` da pergunta com o prefixo `repair:`, que é o
//     que `fillFields` já lê para tratar o campo como FIXADO POR REPARO e
//     registrar `locked_field` quando uma fonte discordar depois.
//
// E NENHUMA SEMENTE DE ID CONTÉM O ID DA PESQUISA, que é o que faz a inserção
// JUNTAR em vez de DESLOCAR. O levantamento é alcançado pelo degrau 2 de
// `resolveSurvey` (o registro do TSE), então a pergunta inserida entra no
// levantamento que já existe, com o `mint_seed` que ele já tinha — medido no
// caso real: `s_4bc31f83b328`, semente `survey|ref|poder360:13722`, INALTERADA.
// E a semente da pergunta é `question|<survey_id>|<race>|<round>|<ordinal>|
// <elenco canônico>`: quando a fonte voltar a servir a pesquisa com o mesmo
// elenco, ela cai na MESMA pergunta e herda `question_id` e `created_at`.
const FONTE_CURADA = "repair:curadoria";
const PREFIXO_ID_CURADO = "curado-";
// Exportada: `lib/delta.mjs` exige a MESMA tríade nos reparos
// `allow_question_drop`. Uma cópia lá passaria a exigir MENOS em silêncio no
// dia em que esta barra ganhasse um quarto campo (§5, uma implementação).
export const CITACAO = ["source", "evidence", "verified_at"];
// Uma entrada insere OU corrige. Misturar as duas deixaria ambíguo se a correção
// se aplica à pesquisa inserida ou às que a cláusula casou — e ambiguidade se
// recusa (§4), não se resolve por convenção tácita.
const ACOES_DE_CORRECAO = ["add_results", "set_party", "set", "allow_roster_shrink"];

// A mesma normalização de instituto do `bucketKey` do coletor: acento e
// pontuação fora. Mais severa que o `toLowerCase()` de `matches()` de propósito
// — aqui ela decide uma RECUSA, e errar para o lado de recusar não perde dado
// nenhum (a fonte está servindo a pesquisa), enquanto errar para o outro lado
// duplica uma operação de campo.
const chaveInstituto = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

/** Duas linhas descrevem a MESMA operação de campo? Ver a janela acima. */
function mesmaOperacao(a, b) {
  if (chaveInstituto(a.pollster) !== chaveInstituto(b.pollster)) return false;
  if (a.race !== b.race) return false;
  if ((a.state ?? null) !== (b.state ?? null)) return false;
  if (a.round !== b.round) return false;
  const da = a.fieldwork_end ?? a.published_date;
  const db = b.fieldwork_end ?? b.published_date;
  if (!da || !db) return true; // sem data não há como separar ⇒ ambíguo ⇒ recusa
  return Math.abs(+new Date(da) - +new Date(db)) <= JANELA_OPERACAO_MS;
}

/**
 * A pesquisa curada, montada do `add_poll` e SÓ dele.
 *
 * Campo a campo, nunca `{...rep.add_poll}`: um espalhamento carregaria para
 * dentro da pesquisa qualquer chave que um curador escrevesse por engano — um
 * `repaired` forjado, um `id` à mão, um `roster_shrink_allowed` — e o pipeline
 * trataria como dado o que é ruído de edição. A lista abaixo é o contrato.
 *
 * Exportada para que a mutação `sempre` do `--self-test` de
 * `curated-insert-check.mjs` mutile só a DECISÃO de inserir, usando a construção
 * de verdade. Uma mutação que também montasse a pesquisa à mão testaria uma
 * pesquisa que o coletor nunca produz.
 */
export function montarPesquisaCurada(rep) {
  const a = rep.add_poll ?? {};
  const p = {
    id: "",
    source: FONTE_CURADA,
    // O documento citado É a fonte desta pesquisa. `source_url` não pode ficar
    // nulo (o validador legado reprova) e apontar para a página do agregador
    // seria creditar a ele um número que ele não serve.
    source_url: a.source_url ?? rep.source,
    integra_url: a.integra_url ?? rep.source,
    race: a.race ?? null,
    state: a.state ?? null,
    round: a.round ?? null,
    scenario: a.scenario ?? null,
    pollster: a.pollster ?? null,
    contractor: a.contractor ?? null,
    fieldwork_start: a.fieldwork_start ?? null,
    fieldwork_end: a.fieldwork_end ?? null,
    published_date: a.published_date ?? null,
    sample_size: a.sample_size ?? null,
    margin_of_error: a.margin_of_error ?? null,
    results: (a.results ?? []).map((r) => ({
      candidate: r.candidate, party: r.party ?? null, pct: r.pct,
    })),
    others_pct: a.others_pct ?? null,
    undecided_pct: a.undecided_pct ?? null,
    blank_null_pct: a.blank_null_pct ?? null,
    tse_registration: a.tse_registration ?? null,
  };
  p.id = `${PREFIXO_ID_CURADO}${pollId(p)}`;
  p.repaired = {
    source: rep.source, evidence: rep.evidence, verified_at: rep.verified_at,
    // O QUE SEPARA "CORRIGIDO" DE "SÓ EXISTE PORQUE FOI CURADO". Sem esta
    // marca, um registro inserido é indistinguível de um coletado que ganhou um
    // reparo — e a diferença importa: um deles a fonte nunca serviu.
    inserted: true,
  };
  return p;
}

/**
 * Decide e executa a inserção. Devolve `{warnings, poll?, noop?}`.
 *
 * Exportada por UM motivo: `curated-insert-check.mjs` precisa provar que a
 * decisão REPROVA quando mutilada, e a única maneira honesta é rodar
 * `applyRepairs` de verdade com esta função substituída — um autoteste que
 * imitasse a decisão provaria uma propriedade de código que o coletor não
 * executa (CONVENTIONS §2). Mesmo argumento do parâmetro `file` abaixo. O
 * coletor nunca passa o parâmetro.
 */
export function inserirPesquisaCurada(polls, rep, targets, label,
  { sobrevive = sobreviveAoGuardaDeSoma } = {}) {
  // `sobrevive` é parâmetro pelo mesmo motivo do `file` e do `inserir` de
  // `applyRepairs`: a mutação honesta do autoteste de
  // `existencia-pos-guarda-check.mjs` é `() => true`, que reproduz exatamente
  // a decisão antiga sobre a função de verdade. O coletor nunca o passa.
  const recusa = (motivo) => ({ warnings: [`add_poll ${label} RECUSADO — ${motivo}`] });

  // A BARRA PROBATÓRIA PRIMEIRO. Uma pesquisa inserida sem fonte primária
  // citada não é um reparo, é uma invenção com carimbo de reparo — e ela entra
  // na média de uma disputa. É a única checagem que roda antes de a pesquisa ser
  // montada, porque nada do resto importa se esta falha.
  const semCitacao = CITACAO.filter((f) => !String(rep[f] ?? "").trim());
  if (semCitacao.length) {
    return recusa(`falta ${semCitacao.join(", ")} — nenhuma pesquisa entra no banco sem fonte primária citada`);
  }
  const misturadas = ACOES_DE_CORRECAO.filter((k) => rep[k] != null);
  if (misturadas.length) {
    return recusa(`combina add_poll com ${misturadas.join(", ")} — uma entrada insere OU corrige, nunca as duas`);
  }

  const nova = montarPesquisaCurada(rep);
  if (!matches(nova, rep.match ?? {})) {
    return recusa("a pesquisa montada não satisfaz a própria cláusula match — a chave de identidade não descreve o que seria inserido, e \"nenhum alvo casou\" deixaria de significar \"ainda não existe\"");
  }
  // SÓ ALVO QUE SOBREVIVE AO GUARDA DE SOMA DISPENSA A INSERÇÃO. "A fonte já
  // serve esta pesquisa" era decidido pela mera existência do alvo, e um alvo
  // pode existir AGORA e morrer no guarda do coletor logo depois — foi o que
  // perdeu presidente:RO 1º turno no ensaio de 20/08/2026: a dispensa apontou
  // para um registro somando 16, o guarda o descartou (16 < 30), e a pesquisa
  // fechou a rodada sem existir por nenhum dos dois caminhos. Um alvo que vai
  // morrer não serve a pesquisa; ele só a esconde.
  const vivos = targets.filter((p) => sobrevive(p));
  const mortos = targets.filter((p) => !sobrevive(p));
  if (vivos.length) {
    // A fonte sarou (ou a rodada anterior já projetou a pesquisa de volta em
    // polls.json). Não é defeito e não é sucesso: é a inserção dispensada, e o
    // coletor diz isso na linha `reparo sem efeito`.
    return { warnings: [], noop: `${label} (a fonte já serve esta pesquisa — ${vivos.map((p) => p.id).join(", ")}; inserção dispensada)` };
  }
  // Em voz alta, como toda decisão deste arquivo: a fonte serve um registro
  // QUEBRADO da pesquisa, e a inserção segue de pé por causa disso. O dia em
  // que esta linha sumir é o dia em que a fonte sarou — e as duas coisas
  // precisam ser vistas.
  const avisos = mortos.length
    ? [`add_poll ${label}: alvo(s) ${mortos.map((p) => p.id).join(", ")} reprovaria(m) no guarda de soma — inserção MANTIDA`]
    : [];
  // A RECUSA DE QUASE-IGUAL SÃO DOIS TESTES, E ELES PERGUNTAM COISAS DIFERENTES.
  //
  // `mesmaOperacao` responde "é a mesma operação de campo?" — pergunta de
  // LEVANTAMENTO. Mas `polls` é a lista PLANA, onde cada linha é um par
  // (levantamento, cenário): uma operação publica legitimamente várias linhas,
  // e num 2º turno cada confronto é uma delas. Sozinho, o teste de operação
  // recusava o segundo confronto de uma pesquisa que já tinha o primeiro — foi
  // o que deixou de fora os três confrontos da AtlasIntel.
  //
  // O segundo teste pergunta "é a mesma PERGUNTA?", e quem responde é
  // `questionRostersMatch`, a MESMA função que `resolveQuestion` usa no coletor
  // (§5: uma regra, uma implementação). Recusa-se só quando as duas respostas
  // são sim.
  //
  // ⚠ ISTO NÃO ALARGA TOLERÂNCIA (§10). A janela de ±3 dias fica intacta, e o
  // padrão de recusar continua: `questionRostersMatch` exige 0,8 de sobreposição
  // para chamar de IGUAL, então o caso ambíguo segue contando como igual, isto é,
  // segue recusado. Medido em 19/08/2026 no caminho de NOMES, que é o único que
  // a pesquisa curada tem (ela não carrega `candidate_id`):
  //     Lula × Tarcísio vs Lula × Zema ....................... DIFERENTE → insere
  //     Lula × Tarcísio vs Lula × Tarcísio de Freitas ........ IGUAL     → recusa
  //     Lula × Tarcísio vs Luiz Inácio Lula da Silva × Tarcísio IGUAL     → recusa
  // Ou seja, a variante de grafia — que é como uma duplicata real se disfarça —
  // continua sendo pega pelo casador.
  //
  // E NÃO se usa o elenco para decidir LEVANTAMENTO, que é outra coisa e é
  // proibida: ver `rosterContradicts` em `store.mjs`, que isenta o 2º turno de
  // propósito porque julgar levantamento por elenco cunhou 485 que não existem.
  const vizinho = polls.find((p) => {
    // Um vizinho que reprovaria no guarda de soma não torna nada ambíguo: ele
    // vai morrer antes de a média existir. Recusar por causa dele perde a
    // pesquisa do mesmo jeito que a dispensa cega perdia — no caso real de
    // presidente:RO, o próprio alvo quebrado é também o vizinho que casa por
    // elenco, e sem este filtro o conserto da dispensa só trocaria a dispensa
    // por uma recusa.
    if (!sobrevive(p)) return false;
    if (!mesmaOperacao(p, nova)) return false;
    const nomes = (nova.results ?? []).map((r) => r.name_raw ?? r.candidate);
    return questionRostersMatch(p.results, nova.results, nomes);
  });
  if (vizinho) {
    const r = recusa(
      `${vizinho.id} (${vizinho.pollster} ${vizinho.race}/${vizinho.state ?? "BR"} turno ${vizinho.round}, ` +
      `campo ${vizinho.fieldwork_end ?? vizinho.published_date ?? "?"}) está na janela de 3 dias mas fora da cláusula ` +
      "match — a mesma operação de campo, com o MESMO confronto, em outra data é ambígua, e nada foi inserido",
    );
    return { warnings: [...avisos, ...r.warnings] };
  }
  polls.push(nova);
  return { warnings: avisos, poll: nova };
}

/**
 * Apply data/repairs.json to the merged poll list. Returns a report so the
 * run logs which repairs fired — a repair that silently stops matching (the
 * poll's registration changed, the source restructured) is itself a defect,
 * so unmatched entries are surfaced loudly rather than ignored.
 */
/**
 * `file` existe para UM caso: `roster-retention-check.mjs` precisa provar que a
 * cláusula `allow_roster_shrink` atravessa de verdade daqui até a retenção de
 * elenco, e a única maneira honesta é rodar ESTA função com um reparo de teste
 * — não uma imitação dela escrita dentro do teste, que provaria uma propriedade
 * de código que o coletor não executa (CONVENTIONS §2). `data/repairs.json` é
 * dado curado e não recebe entradas de teste. O coletor nunca passa o parâmetro.
 *
 * `inserir` existe pelo mesmo motivo, para a decisão de `add_poll`.
 */
export function applyRepairs(polls, { file = FILE, inserir = inserirPesquisaCurada } = {}) {
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(file, "utf-8"));
  } catch {
    // Same shape on every path, `noop` and `inserted` included: a caller that
    // has to guard one branch's missing field is a caller that will forget to.
    return { applied: 0, inserted: [], unmatched: [], noop: [], warnings: ["data/repairs.json ausente ou ilegível"] };
  }

  let applied = 0;
  const unmatched = [];
  // MATCHED, BUT WITH NOTHING LEFT TO CORRECT — a third state, and the one that
  // hides. `unmatched` only fires when the match clause finds no poll at all, so
  // a repair whose target still exists but whose correction is now a no-op used
  // to be invisible: it incremented `applied` and wrote a stamp, and looked like
  // work. Once the stamp became conditional on real change it emitted NOTHING —
  // no count, no warning — which is worse, and flatly contradicts this module's
  // own promise that a repair which silently stops applying is itself surfaced.
  //
  // It is not hypothetical. The PI-06473 senate repair corrects a candidate who
  // is not in that poll's roster and never was, so it has corrected nothing for
  // its whole life; nobody noticed because the stamp it wrote looked like proof
  // that it had. A repair that has become a no-op is either stale or the source
  // has healed, and both are things a run should say out loud.
  const noop = [];
  // PESQUISAS QUE SÓ EXISTEM PORQUE FORAM CURADAS. Contadas à parte de `applied`
  // na saída (elas também somam em `applied`, porque inserir É aplicar) porque o
  // coletor tem de IMPRIMIR quais foram — pelo mesmo motivo que imprime a
  // re-cunhagem de id e o elenco retido: numa rodada em que a fonte está sã isto
  // é a lista das disputas que o `v2/cenarios` apagou por inteiro, e essa lista
  // não pode viver só dentro de um número.
  const inserted = [];
  const warnings = [];

  for (const rep of spec.repairs ?? []) {
    const targets = polls.filter((p) => matches(p, rep.match));
    const label = rep.match.tse_registration ?? JSON.stringify(rep.match);

    // ---- UM REPARO QUE ACERTA VÁRIAS PESQUISAS TEM DE DIZER ISSO ----------
    //
    // `targets` sempre foi uma LISTA e o laço abaixo escreve em todas, calado.
    // Enquanto todo reparo do arquivo mirava uma pesquisa só, isso não mordia.
    // Passou a morder no dia em que se quis corrigir um cenário de 2º turno: os
    // quatro confrontos de uma nacional dividem registro, disputa e turno, então
    // um `set` de balde escrito para um acertava os quatro — com o valor certo
    // em um e errado em três, sem uma linha de aviso.
    //
    // O aviso não RECUSA porque casar várias é legítimo em parte dos casos: um
    // `set_party` corrige a mesma grafia em toda pesquisa do levantamento. O que
    // não pode é ser SILENCIOSO. Quem quer mirar um cenário usa `has_candidate`
    // (ver `matches`); quem quer mesmo escrever em várias, vê o número e confirma
    // que era isso.
    //
    // `add_poll` fica de fora: para ele "nenhuma casou" é o estado normal e
    // "várias casaram" já é tratado pela recusa de quase-igual dentro de
    // `inserir()`.
    // ⚠ SÓ PARA CAMPO DE PERGUNTA, e a primeira versão deste aviso não fazia essa
    // distinção — gritava num reparo LEGÍTIMO. Um registro é UM levantamento, e
    // as pesquisas dele dividem a linha de survey: corrigir `sample_size`,
    // margem ou data DEVE alcançar todas (o reparo da Quaest de 09/11/2025 casa
    // com 11 pesquisas e está certo; o HANDOFF registra que campo de survey se
    // repara SEM cláusula de race, justamente por isso). O que não pode alcançar
    // várias é campo POR CENÁRIO — elenco e os três baldes —, porque aí cada
    // confronto tem o seu valor e escrever o mesmo nos quatro erra em três.
    const CAMPOS_DE_PERGUNTA = ["others_pct", "undecided_pct", "blank_null_pct", "results", "scenario"];
    const mexeEmPergunta = !!rep.add_results
      || Object.keys(rep.set ?? {}).some((k) => CAMPOS_DE_PERGUNTA.includes(k));
    if (!rep.add_poll && mexeEmPergunta && targets.length > 1) {
      warnings.push(`ATENÇÃO ${label}: a cláusula match casou com ${targets.length} pesquisas e o reparo ` +
        `será aplicado a TODAS — ${targets.map((p) => `${p.race}/${p.state ?? "BR"} t${p.round} ` +
        `[${(p.results ?? []).map((r) => r.candidate).join(", ")}]`).join(" · ")}. ` +
        `Se a intenção era UMA, acrescente "has_candidate" ao match.`);
    }

    // ---- A INSERÇÃO CURADA (`add_poll`) ---------------------------------
    //
    // Antes do teste de `unmatched`, e é a diferença que define a ação: para
    // todo outro reparo "nenhuma pesquisa casou" é um DEFEITO (o reparo ficou
    // órfão); para `add_poll` é o estado NORMAL — a pesquisa não existe, e é
    // exatamente por isso que ela vai ser inserida.
    if (rep.add_poll) {
      // `expect_sum` É OBRIGATÓRIO AQUI, e só aqui.
      //
      // Em todo outro reparo ele é opcional porque a pesquisa já veio da fonte e
      // o resto do pipeline a conferiu. Numa pesquisa TRANSCRITA À MÃO de um PDF
      // não existe essa segunda conferência: o único controle aritmético é o
      // total que o instituto imprimiu. Deixá-lo opcional tornava o controle
      // OPT-OUT justamente na classe de registro em que um dígito trocado é mais
      // provável — e a verificação independente mostrou que uma inserção somando
      // 15 entrava sem um aviso sequer. Um `expect_sum` ignorado é o que deixou
      // a Vox presidencial ir ao ar com 101,2% por toda a vida do reparo.
      if (rep.expect_sum == null) {
        warnings.push(`RECUSADO ${label}: add_poll exige "expect_sum" — o total impresso pelo instituto. ` +
          `Sem ele a pesquisa transcrita entra sem nenhuma conferência aritmética.`);
        continue;
      }
      const r = inserir(polls, rep, targets, label);
      for (const w of r.warnings ?? []) warnings.push(w);
      if (r.noop) noop.push(r.noop);
      if (!r.poll) continue;
      inserted.push(`${r.poll.pollster} ${r.poll.race}/${r.poll.state ?? "BR"} turno ${r.poll.round} ` +
        `campo ${r.poll.fieldwork_end ?? "?"} — ${r.poll.results.length} candidato(s), id ${r.poll.id} · ${r.poll.repaired.source}`);
      applied++;
      // A SOMA ESPERADA CONFERE A PESQUISA INSERIDA TAMBÉM. Foi um `expect_sum`
      // ignorado que deixou a Vox presidencial ir ao ar com 101,2% durante toda
      // a vida do reparo; uma pesquisa transcrita à mão é o lugar onde um dígito
      // trocado é MAIS provável, não menos.
      conferirSoma(r.poll, rep, label, warnings);
      continue;
    }

    if (!targets.length) {
      unmatched.push(label);
      continue;
    }
    let touched = 0;
    for (const poll of targets) {
      // `changed` exists because the stamp is a CLAIM about this record: that it
      // carried a defect and that the cited page proves the correction. Stamping
      // unconditionally made that claim about records the repair did not touch —
      // a Wikipedia row of the Quaest round already held the right sample size,
      // matched the repair, changed nothing, and still came out carrying an
      // evidence paragraph describing a defect it never had. The provenance has
      // to mean something narrower than "a repair's match clause covered you".
      let changed = false;
      for (const add of rep.add_results ?? []) {
        if (poll.results.some((r) => sameCandidate(r.candidate, add.candidate))) continue;
        poll.results.push({ candidate: add.candidate, party: add.party ?? null, pct: add.pct });
        changed = true;
      }
      for (const sp of rep.set_party ?? []) {
        for (const r of poll.results) {
          if (!sameCandidate(r.candidate, sp.candidate)) continue;
          const party = sp.party ?? null;
          if (r.party !== party) changed = true;
          r.party = party;
        }
      }
      for (const [k, v] of Object.entries(rep.set ?? {})) {
        if (poll[k] !== v) changed = true;
        poll[k] = v;
      }
      // ---- O DESLIGAMENTO EXPLÍCITO DA RETENÇÃO DE ELENCO ------------------
      //
      // `scripts/lib/roster.mjs` mantém o elenco da rodada anterior quando o
      // que chega é um subconjunto estrito dele, porque o `v2/cenarios` do
      // Poder360 apaga linhas de candidato. Mas um encolhimento pode ser
      // CORRETO — o instituto publicou uma errata retirando um nome — e nesse
      // caso a defesa vira uma trava que ressuscita um candidato para sempre.
      //
      // A saída é curada e citada, nunca um limiar: `"allow_roster_shrink":
      // true` na entrada do reparo, com `source`/`evidence`/`verified_at` como
      // qualquer outro. Fica marcado NA PESQUISA; `upsertPoll` amarra a marca à
      // pergunta e a retenção cede gravando `roster_shrink_ratificado` em
      // conflicts.ndjson. Ceder em silêncio seria o padrão que o HANDOFF nomeia
      // — um guarda que desliga algo sem dizer.
      //
      // Conta como `changed`: permitir o encolhimento É o efeito deste reparo, e
      // sem isso ele se auto-denunciaria como "reparo sem efeito" em toda rodada.
      if (rep.allow_roster_shrink) {
        poll.roster_shrink_allowed = {
          source: rep.source, evidence: rep.evidence, verified_at: rep.verified_at,
        };
        changed = true;
      }
      if (changed) {
        poll.repaired = { source: rep.source, evidence: rep.evidence, verified_at: rep.verified_at };
        applied++;
        touched++;
      }

      // The sum check runs even on a no-op match, deliberately: a repair whose
      // corrections are already present is exactly when you want to know its
      // expected total still holds. Gating this on `changed` would switch off a
      // check precisely as the repair goes stale.
      conferirSoma(poll, rep, label, warnings);
    }
    if (!touched) noop.push(`${label} (${targets.length} pesquisa(s) casada(s), nada a corrigir)`);
  }
  return { applied, inserted, unmatched, noop, warnings };
}

/**
 * `expect_sum` — o total que o instituto imprimiu, conferido contra o que
 * guardamos. UMA implementação para os dois caminhos (correção e inserção): o
 * corpo estava embutido no laço de correção, e duplicá-lo para `add_poll` era
 * garantir que os dois divergissem na primeira folga ajustada de um lado só
 * (CONVENTIONS §5).
 */
function conferirSoma(poll, rep, label, warnings) {
  if (rep.expect_sum == null) return;
  // A folga é DERIVADA das mesmas parcelas que entram na soma (§10), nunca um
  // teto escolhido. O 0,6 fixo que morava aqui era a jogada proibida nas duas
  // direções: numa tabela em décimos a folga merecida é 0,05 por figura, e o
  // 0,6 engolia um dígito trocado de meio ponto — exatamente o erro mais
  // provável numa transcrição à mão; numa tabela em inteiros (a PE de
  // 58+33+8+2 = 101 merece 2,0) ele gritava contra arredondamento legítimo da
  // fonte. E era a quarta cópia da regra — as outras três já derivavam.
  const parcelas = [
    ...poll.results.map((r) => r.pct),
    poll.others_pct, poll.blank_null_pct, poll.undecided_pct,
  ].filter((v) => typeof v === "number");
  const sum = parcelas.reduce((a, v) => a + v, 0);
  const folga = folgaDerivada(parcelas);
  if (Math.abs(sum - rep.expect_sum) > folga) {
    warnings.push(
      // O rótulo cai para a cláusula inteira quando o reparo não casa por
      // registro. Nem toda pesquisa TEM registro — a do Paraná arquivada
      // como RS não tem, e o agregador serve `"registro": ""` — e um aviso
      // dizendo "reparo undefined" não diz de qual reparo se trata.
      `reparo ${label}: soma ${sum.toFixed(1)} ≠ esperada ${rep.expect_sum} (folga derivada ${folga.toFixed(2)})`,
    );
  }
}

let cachedSpec;
function spec() {
  if (!cachedSpec) {
    try { cachedSpec = JSON.parse(fs.readFileSync(FILE, "utf-8")); }
    catch { cachedSpec = { repairs: [] }; }
  }
  return cachedSpec;
}

/**
 * The curated party for one result, if a repair covers it.
 *
 * `applyRepairs` mutates the poll list during a scrape, but the store is built
 * from `data/polls.json` — a file written by the LAST scrape, which predates
 * these repairs. Without this accessor the migration and the parity gate would
 * each have to re-implement the lookup, and the three would drift. Same reason
 * `project.mjs` and `store.ts` are held together by a twin check.
 *
 * @returns {{has: boolean, party?: string|null}}
 */
export function partyOverride(poll, candidate) {
  for (const rep of spec().repairs ?? []) {
    if (!(rep.set_party ?? []).length) continue;
    if (!matches(poll, rep.match)) continue;
    for (const sp of rep.set_party) {
      if (sameCandidate(candidate, sp.candidate)) return { has: true, party: sp.party ?? null };
    }
  }
  return { has: false };
}
