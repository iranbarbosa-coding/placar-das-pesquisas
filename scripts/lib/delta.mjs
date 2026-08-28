// O DELTA POR DISPUTA: a perda entre rodadas, julgada caso a caso — sem número.
//
// O defeito que motiva, medido no ensaio de 20/08/2026: o total SUBIU
// (2.996 → 3.029 perguntas) e ainda assim 56 perguntas sumiriam em 13 disputas
// (senador:PR sozinho perderia 25). Nenhum portão do workflow reprovava:
//   · a única defesa contra encolhimento era o piso absoluto de
//     `validate-store.mjs` (500 levantamentos / 2.000 perguntas), que o banco
//     ultrapassou em ~996 perguntas — a folga inteira virou orçamento de perda
//     silenciosa. A fraqueza do piso foi observada DUAS vezes por sessões
//     independentes: o comentário de `PERTENCE_A_FONTE` em `scrape.mjs` ("o
//     piso ainda barra — por 58 perguntas") e o cabeçalho de `lib/ensaio.mjs`
//     ("996 perguntas de FOLGA SILENCIOSA — medido");
//   · um delta de TOTAIS também não veria nada: a perda veio junto com
//     crescimento, e total líquido subindo é cego por construção a perda
//     compensada por ganho alheio;
//   · e presidente:AM terminou a rodada com ZERO pesquisas partindo de zero
//     (o reparo curado morreu no dedupe, o vencedor do dedupe morreu no guarda
//     de soma) — um caso que NEM UM DELTA vê, porque 0 → 0 não é delta. Quem o
//     alcança é a LISTA DECLARADA, com a disputa marcada `exigida`.
//
// A TOLERÂNCIA É DERIVADA, NUNCA ESCOLHIDA (§10): não há K. Uma pergunta sumida
// é tolerada se, e somente se, ela PROVAR sucessão no nível da pergunta, ou
// carregar reparo ratificador com fonte primária citada. Zero prova, zero
// tolerância — não existe número para alargar quando o portão incomodar.
//
// A REDE DE SEGURANÇA (QUARENTENA) age DEPOIS da prova, nunca no lugar dela
// (28/08/2026). O que a sucessão/ratificação não provou continua sendo PERDA no
// veredito (`ok`, `semProva`, `linhas` NÃO mudam). Mas em vez de travar a rodada
// inteira por causa de UMA disputa churny, o núcleo particiona as disputas
// reprovadas em QUARENTENÁVEIS (têm dado no commit anterior a restaurar) e
// RESIDUAIS (0→0 exigida — nada a restaurar), e expõe `podeQuarentenar` +
// `restaurarDisputas` para a fiação congelar a churny no dado do commit anterior
// e comitar o resto. A barra probatória fica intocada: a quarentena só alcança o
// resíduo que a prova já não cobriu, e um resíduo insalvável reprova a rodada.
//
// Este módulo é PURO de propósito, no molde de `lib/ensaio.mjs`: recebe os dois
// estados (ANTERIOR e NOVO), a lista declarada e os reparos, e devolve o
// veredito por disputa + as linhas do relatório + os rastros de conflito. Assim
// o autoteste o exercita sem git, sem rede e sem tocar em `data/` — a fiação
// (git show, arquivos, exit code) mora toda em `disputa-delta-check.mjs`.
import { questionRostersMatch, JANELA_OPERACAO_MS } from "./store.mjs";
import { sameCandidate } from "./canonicalize.mjs";
import { mintConflictId, normalizeRegistration } from "./ids.mjs";
import { relatorioDeEnsaio, chaveDeLinhagem, disputaDe } from "./ensaio.mjs";
import { RACES, UFS } from "../validate-store.mjs";
// A barra probatória de todo reparo é a MESMA tríade de `repairs.mjs`,
// importada (§5): uma cópia aqui passaria a exigir MENOS em silêncio no dia em
// que a barra de lá ganhasse um quarto campo — a conferência independente
// pegou exatamente essa dupla escrita na primeira versão.
import { CITACAO } from "./repairs.mjs";

const ESTADOS = new Set(["exigida", "pendente", "desativada"]);

/**
 * A lista declarada é DADO comitado, e dado malformado se reprova em vez de se
 * interpretar (§4). As chaves são validadas contra os domínios do PRÓPRIO
 * `validate-store.mjs` (importados, nunca copiados — §5): uma disputa que este
 * guarda aceitasse e o validador reprova seria uma porta lateral.
 */
export function validarLista(lista) {
  const erros = [];
  if (!lista || typeof lista !== "object" || !lista.disputas || typeof lista.disputas !== "object") {
    return ['lista declarada malformada: esperado { "version": 1, "disputas": { "race:UF": { "estado": … } } }'];
  }
  for (const [chave, ent] of Object.entries(lista.disputas)) {
    const partes = chave.split(":");
    const [race, uf] = partes;
    if (partes.length !== 2 || !RACES.has(race) || !(uf === "BR" || UFS.has(uf))) {
      erros.push(`disputa com chave inválida: "${chave}" (race/UF fora dos domínios de validate-store.mjs)`);
    }
    if (!ESTADOS.has(ent?.estado)) {
      erros.push(`"${chave}": estado "${ent?.estado ?? ""}" fora do domínio (exigida | pendente | desativada)`);
    }
    if (ent?.estado === "desativada" && !String(ent?.motivo ?? "").trim()) {
      erros.push(`"${chave}": desativada sem motivo — decisão editorial sem registro não é decisão (§4)`);
    }
  }
  return erros;
}

/**
 * As ratificações de perda: `allow_question_drop` em `data/repairs.json`.
 *
 * Vivem num array PRÓPRIO no topo do arquivo (irmão de `repairs`), e não como
 * entradas de `repairs[]`, por um motivo de fronteira que vale registrar: o
 * `matches()` de `applyRepairs` não conhece `question_id`, então uma entrada
 * dentro de `repairs[]` casaria com TODAS as pesquisas e sairia como ruído de
 * "nada a corrigir" em toda rodada. A pergunta sumida não está mais na lista de
 * pesquisas — nenhum `applyRepairs` a alcança —, então quem honra esta ação é o
 * guarda de delta, e o alvo é nomeado pelo id ESTÁVEL da pergunta (§8: cunhado
 * uma vez, nunca recomputado), que é a única identidade que sobrevive à
 * ausência.
 *
 * A barra probatória é a mesma de todo reparo: source/evidence/verified_at, e
 * RECUSA em voz alta sem eles — o análogo exato do `allow_roster_shrink` que a
 * retenção de elenco já honra.
 */
export function lerRatificacoes(reparos) {
  const entradas = Array.isArray(reparos?.allow_question_drop) ? reparos.allow_question_drop : [];
  const validas = [];
  const recusadas = [];
  for (const e of entradas) {
    if (!String(e?.question_id ?? "").trim()) {
      recusadas.push("allow_question_drop RECUSADO — sem question_id não há o que ratificar (§4)");
      continue;
    }
    const falta = CITACAO.filter((f) => !String(e?.[f] ?? "").trim());
    if (falta.length) {
      recusadas.push(`allow_question_drop ${e.question_id} RECUSADO — falta ${falta.join(", ")}: nenhuma perda é ratificada sem fonte primária citada (§4)`);
      continue;
    }
    validas.push(e);
  }
  return { validas, recusadas };
}

/**
 * A que espaço de fonte uma pergunta pertence — o espelho, no nível do STORE,
 * da partição `PERTENCE_A_FONTE` de `scrape.mjs` (p360- / curado- / o resto é
 * Wikipédia). A partição da projeção é sobre `poll.id`, que o store não guarda;
 * aqui a mesma doutrina é lida dos campos que o store tem: o `source_ref`
 * nativo do Poder360, o carimbo `repaired.inserted` da inserção curada, e a
 * Wikipédia como o resto.
 */
export function fonteDaPergunta(q, surveysById) {
  const s = surveysById.get(q.survey_id);
  if ((s?.source_refs ?? []).some((r) => r?.source === "poder360")) return "poder360";
  if (q?.repaired?.inserted || s?.repaired?.inserted) return "curadoria";
  return "wikipedia";
}

/**
 * O JUIZ de uma acusação — o único lugar onde "sumiu" vira "perda" ou
 * "tolerada". Concentrado numa função de propósito: o `--self-test` do guarda o
 * mutila de dois jeitos opostos (cego tolera tudo; paranoico condena tudo) e
 * exige que cada metade da bateria caia com a sua mutação. Um juiz espalhado
 * pelo código não teria como ser mutilado sem imitar o guarda (§2).
 *
 * A ordem é a da especificação (§3.2 do desenho D): SUCESSÃO, depois
 * RATIFICADA, depois PERDA — com duas cláusulas que vêm antes:
 *   · disputa `desativada` tolera em voz alta (decisão editorial registrada);
 *   · fonte FALHADA na rodada recusa a sucessão por elenco: degradação de
 *     fonte não é prova de legitimidade, é o cenário em que a perda é MAIS
 *     provável — a recuperação de fonte caída promete MANTER as perguntas
 *     dela, e este juiz confere a promessa por fora. O reparo ratificador
 *     continua valendo: ele é decisão curada com fonte primária, não
 *     coincidência de elenco.
 */
export function julgarPadrao(acusacao, ctx) {
  if (acusacao.tipo === "exigida_vazia") return { classe: "perda" };
  const q = acusacao.q;
  if (ctx.estadoDe(disputaDe(q)) === "desativada") return { classe: "desativada" };
  const falhada = ctx.fonteFalhadaDe(q);
  if (!falhada) {
    const s = ctx.acharSucessora(q);
    if (s) return { classe: "sucessora", ...s };
  }
  const r = ctx.acharRatificacao(q);
  if (r) return { classe: "ratificada", reparo: r };
  return {
    classe: "perda",
    motivo: falhada
      ? `a fonte ${falhada} falhou nesta rodada — a promessa da recuperação era MANTER as perguntas dela`
      : null,
  };
}

/**
 * O delta por disputa entre dois estados do banco.
 *
 * @param anterior  o banco COMITADO ({questions, surveys, candidates}) — nunca
 *                  a working tree: quando os portões rodam, `data/` no disco JÁ
 *                  é a coleta nova.
 * @param novo      a coleta desta rodada, mesmas tabelas.
 * @param lista     `data/disputas-declaradas.json` interpretado.
 * @param reparos   `data/repairs.json` interpretado (só `allow_question_drop`
 *                  interessa aqui).
 * @param fontesFalhadas  Set de chaves de fonte ("poder360" | "wikipedia") que
 *                  o sumário da rodada declara falhadas.
 * @param runDate   injetado (§8) — carimba conflitos NOVOS.
 * @param carimbos  Map conflict_id → at do estado anterior, para a rodada
 *                  seguinte regravar idêntico (o desenho da retenção de elenco).
 * @param julgar    o juiz — só o autoteste injeta outro (as mutações).
 */
export function deltaPorDisputa({
  anterior, novo, lista, reparos,
  fontesFalhadas = new Set(), runDate = "1970-01-01",
  carimbos = new Map(), julgar = julgarPadrao,
} = {}) {
  const errosLista = validarLista(lista);
  const { validas: ratificacoes, recusadas } = lerRatificacoes(reparos ?? {});

  // R2 da conferência: `pendente` é circular se a promoção for observação
  // posterior — um defeito da classe do FATO 1 numa disputa pendente fica mudo
  // (0→0 tolerado) e a promoção dependeria do mesmo pipeline cuja quebra se
  // quer detectar. A mitigação da §3.3: toda inserção curada (`add_poll`) exige
  // a promoção da disputa a `exigida` NO MESMO commit — a promoção é parte do
  // reparo, não vigília. Um `add_poll` cuja disputa segue `pendente` reprova.
  const errosPromocao = [];
  for (const rep of reparos?.repairs ?? []) {
    if (!rep?.add_poll) continue;
    const d = `${rep.add_poll.race}:${rep.add_poll.state ?? "BR"}`;
    if (lista?.disputas?.[d]?.estado === "pendente") {
      errosPromocao.push(`add_poll para ${d} com a disputa ainda "pendente" na lista declarada — a promoção a "exigida" é parte do reparo, no MESMO commit (§3.3/R2)`);
    }
  }

  // Pergunta `retracted` conta como PRESENTE dos dois lados: retirada editorial
  // não é perda de coleta, e filtrá-la faria uma retratação parecer um buraco.
  const antes = new Map((anterior?.questions ?? []).map((q) => [q.question_id, q]));
  const depois = new Map((novo?.questions ?? []).map((q) => [q.question_id, q]));
  const surveysAnt = new Map((anterior?.surveys ?? []).map((s) => [s.survey_id, s]));
  const chave = chaveDeLinhagem(anterior ?? {}, novo ?? {});

  const contar = (qs) => {
    const m = new Map();
    for (const q of qs ?? []) { const d = disputaDe(q); m.set(d, (m.get(d) ?? 0) + 1); }
    return m;
  };
  const nAntes = contar(anterior?.questions);
  const nDepois = contar(novo?.questions);

  // Candidatas a sucessora, por disputa|turno. As perguntas NOVAS (que não
  // existiam no ANTERIOR) vêm primeiro: é onde uma re-cunhagem legítima mora, e
  // pôr uma pergunta de longa data na frente nomearia como "sucessora" um
  // cenário-subconjunto que sempre coexistiu. Ordem estável dentro de cada
  // metade (§8).
  const porGrupo = new Map();
  const candidatas = [...(novo?.questions ?? [])].sort((a, b) =>
    (antes.has(a.question_id) ? 1 : 0) - (antes.has(b.question_id) ? 1 : 0) ||
    String(a.question_id).localeCompare(String(b.question_id)));
  for (const q of candidatas) {
    const k = `${disputaDe(q)}|${q.round}`;
    if (!porGrupo.has(k)) porGrupo.set(k, []);
    porGrupo.get(k).push(q);
  }

  // O elenco comparado por LINHAGEM DE PESSOA: os ids dos dois lados passam por
  // `chaveDeLinhagem` antes de `questionRostersMatch` — a MESMA função que
  // `resolveQuestion` usa para decidir "é a mesma pergunta" (§5, importada,
  // nunca copiada). Sem a tradução, toda re-cunhagem de candidato viraria
  // "elenco diferente" e o guarda daria vermelho falso na primeira rodada — o
  // FATO 3, herdado.
  const traduzir = (rs) => (rs ?? []).map((r) =>
    (r?.candidate_id ? { ...r, candidate_id: chave(r.candidate_id) } : r));

  // ⚠ O CASAMENTO DE ELENCO SÓ VALE DENTRO DO MESMO LEVANTAMENTO — e este
  // recorte é parte do predicado de `resolveQuestion`, não um acréscimo: lá o
  // elenco só é comparado entre as perguntas do MESMO survey
  // (`questionsBySurvey`). A primeira versão deste juiz omitiu o recorte e o
  // teste de fogo contra o ensaio de 20/08 mediu o estrago na hora: em
  // senador:MT, UMA pergunta sobrevivente "provou" a sucessão de 5 sumidas de
  // PESQUISAS DIFERENTES (pcts distintos, institutos distintos), porque numa
  // disputa estadual todos os levantamentos partilham o mesmo elenco — as 56
  // sumidas saíam todas "com sucessora" e o guarda dormia sobre exatamente a
  // perda que existe para pegar.
  //
  // "Mesmo levantamento" é decidido por CHAVES EXATAS que o store já grava —
  // nada escolhido, nenhuma janela (§10):
  //   · o próprio `survey_id`;
  //   · `legacy_ids` em comum (a re-cunhagem de levantamento preserva a lista —
  //     medido no ensaio: s_59ea56a4ad3f → s_bf142e7c42c2, mesma tríade);
  //   · `source_ref` nativo em comum (degrau 1 da escada de resolução);
  //   · o registro do TSE (degrau 2), normalizado por `normalizeRegistration`.
  const surveysNov = new Map((novo?.surveys ?? []).map((s) => [s.survey_id, s]));
  const mesmoLevantamento = (qa, qn) => {
    if (qa.survey_id === qn.survey_id) return true;
    const sa = surveysAnt.get(qa.survey_id);
    const sn = surveysNov.get(qn.survey_id);
    if (!sa || !sn) return false;
    const la = new Set(sa.legacy_ids ?? []);
    if ((sn.legacy_ids ?? []).some((id) => la.has(id))) return true;
    if ((sn.legacy_ids ?? []).includes(sa.survey_id) || la.has(sn.survey_id)) return true;
    const refs = new Set((sa.source_refs ?? []).map((r) => `${r.source}:${r.native_id}`));
    if ((sn.source_refs ?? []).some((r) => refs.has(`${r.source}:${r.native_id}`))) return true;
    if (sa.tse_registration && sn.tse_registration
      && normalizeRegistration(sa.tse_registration) === normalizeRegistration(sn.tse_registration)) return true;
    return false;
  };

  // Duas tabelas são a MESMA medição publicada por duas marcas? Elenco por
  // LINHAGEM (o `traduzir` acima, para o candidato re-cunhado casar) e pcts
  // dígito a dígito (o mesmo 0,05 de `dropExactDuplicates`). Cobertura TOTAL do
  // menor elenco: uma marca com um nome a menos não é a mesma tabela. Devolve
  // `matched` para o chamador exigir a chave forte nos toplines de 2 nomes.
  const tabelaIdentica = (ra, rb) => {
    const A = traduzir(ra ?? []), B = traduzir(rb ?? []);
    const [menor, maior] = A.length <= B.length ? [A, B] : [B, A];
    if (menor.length < 2) return { ok: false, matched: 0 };
    const casa = (r, x) =>
      (r.candidate_id && x.candidate_id && r.candidate_id === x.candidate_id) ||
      (r.name_raw && x.name_raw && sameCandidate(r.name_raw, x.name_raw));
    let matched = 0, identicos = 0;
    for (const r of menor) {
      const x = maior.find((y) => casa(r, y));
      if (!x) continue;
      matched++;
      if (r.pct != null && x.pct != null && Math.abs(r.pct - x.pct) <= 0.05) identicos++;
    }
    return { ok: matched === menor.length && identicos === matched, matched };
  };

  const acharSucessora = (q) => {
    // NO NÍVEL DA PERGUNTA, NUNCA DO LEVANTAMENTO SOZINHO. Identidade de
    // levantamento é NECESSÁRIA (o recorte acima) mas nunca SUFICIENTE: um
    // levantamento nacional de 2º turno carrega até 4 confrontos
    // indistinguíveis por registro+disputa+turno (repairs.mjs documenta;
    // medido em 17/08: PoderData e Quaest com 4 cenários cada). Se a fonte
    // apaga 3 dos 4, o sobrevivente "provaria" a sucessão dos três mortos — e o
    // guarda dormiria sobre exatamente a classe `v2/cenarios` que o motivou.
    // O caso 5 do autoteste trava o lado "suficiente"; o 5b trava o "necessária".
    const grupo = porGrupo.get(`${disputaDe(q)}|${q.round}`) ?? [];
    for (const cand of grupo) {
      // Linhagem EXPLÍCITA no nível da pergunta: gravada, não inferida — vale
      // sozinha.
      if ((cand.legacy_ids ?? []).includes(q.question_id) || cand.legacy_id === q.question_id) {
        return { sucessora: cand.question_id, via: "legacy_ids" };
      }
    }
    for (const cand of grupo) {
      if (!mesmoLevantamento(q, cand)) continue;
      const nomes = (cand.results ?? []).map((r) => r.name_raw ?? r.candidate).filter(Boolean);
      if (questionRostersMatch(traduzir(q.results), traduzir(cand.results), nomes)) {
        return { sucessora: cand.question_id, via: "elenco" };
      }
    }
    // ADIÇÃO PURA NO MESMO LEVANTAMENTO — a linhagem sob RE-CUNHAGEM POR ELENCO.
    //
    // O `question_id` semeia em elenco (survey|disputa|turno|ordinal|elenco), então
    // ACRESCENTAR um candidato ao MESMO levantamento re-cunha a pergunta sem que
    // nada tenha saído: `[Renan Filho]` → `[JHC, Renan Filho]` quando o coletor
    // parou de apagar candidatos cujo nome de urna parece sigla de partido (JHC =
    // João Henrique Caldas, governador AL; CIRO) — o conserto do commit cb100ae.
    // A pergunta velha some do banco com um id que o novo elenco não reproduz, e
    // `questionRostersMatch` a lê como PERDA: 1-de-2 adicionado pontua 0,5, abaixo
    // da barra de 0,8.
    //
    // ⚠ NÃO ENFRAQUECE O GUARDA, e é NO-OP em dado limpo. A ponte só vale quando o
    // elenco velho é SUBCONJUNTO ESTRITO do novo dentro do MESMO levantamento
    // (`mesmoLevantamento`, o mesmo recorte da regra de elenco acima): TODO nome
    // velho segue presente e ao menos um foi acrescentado — ZERO partidas. Se
    // QUALQUER candidato de fato SAIU, não é subconjunto e a perda reprova como
    // antes. Um superset não tem candidato ausente para esconder; não há número
    // para afrouxar (§10). Comparação por LINHAGEM DE PESSOA (o `traduzir`), com o
    // mesmo recorte de id de `questionRostersMatch`: só decide por id quando os
    // DOIS lados têm id em todas as linhas — um elenco sem id não prova adição pura.
    const elencoSubconjuntoEstrito = (qVelha, qNova) => {
      const rv = traduzir(qVelha.results ?? []), rn = traduzir(qNova.results ?? []);
      const idsV = rv.map((r) => r?.candidate_id).filter(Boolean);
      const idsN = rn.map((r) => r?.candidate_id).filter(Boolean);
      if (!(idsV.length === rv.length && idsN.length === rn.length && idsV.length && idsN.length)) return false;
      const setV = new Set(idsV), setN = new Set(idsN);
      if (setV.size >= setN.size) return false;        // nada foi acrescentado
      for (const id of setV) if (!setN.has(id)) return false; // alguém SAIU → não é subconjunto
      return true;
    };
    for (const cand of grupo) {
      if (cand.question_id === q.question_id) continue;
      if (!mesmoLevantamento(q, cand)) continue;
      if (elencoSubconjuntoEstrito(q, cand)) {
        return { sucessora: cand.question_id, via: "adicao" };
      }
    }
    // TERCEIRO DEGRAU — A DUPLICATA ENTRE MARCAS, DURÁVEL SOB DERIVA DE ID.
    //
    // `dropExactDuplicates` (scrape.mjs) descarta a cópia de menor prioridade de
    // uma pesquisa que chega por DUAS marcas (o backstop de "Data Index ≡
    // Indexa", e o caso medido governador:DF 30/07–01/08: Correio/Opinião pela
    // Wikipédia ≡ Opinião Consultoria pelo Poder360). A descartada é uma pergunta
    // do banco que SOME, e precisa provar sucessão aqui — do contrário toda
    // fusão de duplicata exigiria um `allow_question_drop` por rodada.
    //
    // Por que ELENCO+levantamento não basta, e por que ISTO é durável: o delta
    // compara o COMMIT (git HEAD, congelado) com a coleta desta rodada. Toda
    // identidade cunhada da fonte carrega o RÓTULO do cenário — `pollId`
    // (util.mjs) resume `scenario`, e o id da pergunta semeia em
    // scenario_ordinal+elenco. Quando um conserto de rótulo muda esses ids (foi
    // o PR #43 no 2º turno), a marca sobrevivente desta rodada guarda o id NOVO
    // e o levantamento perdedor do commit guarda o VELHO — nenhum degrau de id
    // (legacy_ids, source_ref, registro) casa através dessa fronteira, e a ponte
    // por id-cunhado quebra por UMA rodada. Foi exatamente o que reprovou a
    // tentativa anterior. O CONTEÚDO não muda com o rótulo: a perdedora é a mesma
    // pesquisa, com os mesmos números; só o endereço se moveu. Então a ponte
    // durável é por conteúdo — o espelho, no nível do store, do predicado de
    // `dropExactDuplicates`.
    //
    // ⚠ POR QUE NÃO É O DESASTRE DE senador:MT (caso 5b): ali UMA sobrevivente
    // "provava" 5 sumidas de pesquisas DIFERENTES porque numa disputa estadual
    // todos partilham o elenco — mas os PCTS diferem. Este degrau exige a TABELA
    // IDÊNTICA (elenco por linhagem E pcts dígito a dígito), que é o que faz de
    // duas marcas a MESMA pesquisa, não uma coincidência de elenco. Toplines de
    // 2º turno (2 nomes) coincidem por acaso entre institutos, então aí a chave
    // FORTE — mesma data E mesma amostra — é exigida, o mesmo recorte de
    // `dropExactDuplicates`. Cobertura total do menor elenco, não 0,8: o delta
    // erra para o lado seguro (uma perda que ele não prova pede reparo visível,
    // nunca some calada).
    const dataDe = (s) => s?.fieldwork_end ?? s?.published_date ?? null;

    // MESMO INSTANTE DE CAMPO — a janela de operação (±3 dias, `JANELA_OPERACAO_MS`,
    // o mesmo recorte de `dropExactDuplicates`) OU o BUG DE ANO DA WIKIPÉDIA.
    //
    // Uma pesquisa listada na Wikipédia às vezes chega com o ANO errado: o parse
    // lê a data da LINHA mas herda o ano do cabeçalho da seção, e uma pesquisa de
    // 2º turno de 2026 aparece datada de 2025. Medido em governador:MT 28/08/2026 —
    // 9 toplines de 2º turno (Wellington Fagundes × Jayme Campos / Natasha) que o
    // Poder360 nativo trouxe com o ano CERTO: o `survey|nat` da Wikipédia (2025)
    // e o `survey|ref` do Poder360 (2026) são a MESMA medição — MESMO
    // `institute_id`, MESMA amostra, MESMOS pcts dígito a dígito — mas a diferença
    // de um ano inteiro cai fora da janela e a ponte de duplicata dormia sobre a
    // re-cunhagem, acusando 9 perdas que não existem.
    //
    // ⚠ NÃO AFROUXA O GUARDA. O salto de ano só conta com PROVA COMPENSATÓRIA que
    // a duplicata entre marcas do MESMO dia NÃO exige: o MESMO `institute_id`. A
    // duplicata normal (mesmo dia) une DUAS MARCAS distintas medindo a mesma
    // pesquisa; o salto de ano é a MESMA casa re-datada, então exigir o mesmo
    // instituto é natural e fecha a colisão (dois institutos diferentes com
    // toplines de 2 nomes coincidentes em anos diferentes não passam). Espelha a
    // doutrina de `resolveSurvey` em store.mjs (institute_id + data na janela).
    const mmdd = (d) => (d ? String(d).slice(5) : null);
    const anoTrocadoMesmoInstituto = (da, db, sa, sn) =>
      !!da && !!db && da !== db && mmdd(da) === mmdd(db)
      && !!sa?.institute_id && sa.institute_id === sn?.institute_id;
    const mesmoInstante = (da, db, sa, sn) =>
      Math.abs(+new Date(da) - +new Date(db)) <= JANELA_OPERACAO_MS
      || anoTrocadoMesmoInstituto(da, db, sa, sn);

    for (const cand of grupo) {
      if (cand.survey_id === q.survey_id) continue; // mesma pesquisa: já decidida acima
      const sa = surveysAnt.get(q.survey_id);
      const sn = surveysNov.get(cand.survey_id);
      const da = dataDe(sa), db = dataDe(sn);
      if (da && db && !mesmoInstante(da, db, sa, sn)) continue;
      const amostraA = sa?.sample_size ?? null, amostraB = sn?.sample_size ?? null;
      if (amostraA != null && amostraB != null && amostraA !== amostraB) continue;
      const t = tabelaIdentica(q.results, cand.results);
      if (!t.ok) continue;
      // Topline de 2 nomes coincide por acaso entre institutos: exige a chave
      // FORTE (mesma amostra E mesma data, ou o salto de ano do MESMO instituto).
      const forte = t.matched >= 3
        || (t.matched === 2 && amostraA != null && amostraA === amostraB
            && (da === db || anoTrocadoMesmoInstituto(da, db, sa, sn)));
      if (!forte) continue;
      return { sucessora: cand.question_id, via: "duplicata" };
    }
    return null;
  };

  const ratPorId = new Map(ratificacoes.map((e) => [e.question_id, e]));
  const acharRatificacao = (q) => {
    const e = ratPorId.get(q.question_id);
    if (!e) return null;
    // Chaves de sanidade opcionais: quando presentes, têm de concordar — um
    // reparo que descreve OUTRA disputa não ratifica esta pergunta.
    if (e.race && e.race !== q.race) return null;
    if (e.uf !== undefined && (e.uf ?? "BR") !== (q.uf ?? "BR")) return null;
    return e;
  };

  const estadoDe = (d) => lista?.disputas?.[d]?.estado ?? null;
  const fonteFalhadaDe = (q) => {
    const f = fonteDaPergunta(q, surveysAnt);
    return fontesFalhadas.has(f) ? f : null;
  };
  const ctx = { estadoDe, acharSucessora, acharRatificacao, fonteFalhadaDe };

  // ---- as acusações, em ordem estável (§8) --------------------------------
  const acusacoes = [];
  for (const q of [...antes.values()].sort((a, b) => String(a.question_id).localeCompare(String(b.question_id)))) {
    if (!depois.has(q.question_id)) acusacoes.push({ tipo: "sumida", q });
  }
  for (const [d, ent] of Object.entries(lista?.disputas ?? {}).sort((a, b) => a[0].localeCompare(b[0]))) {
    // `exigida` reprova vazia MESMO partindo de zero: o delta compara com
    // ontem; a lista compara com a intenção (é o que pega presidente:AM 0→0).
    if (ent?.estado === "exigida" && !(nDepois.get(d) > 0)) {
      acusacoes.push({ tipo: "exigida_vazia", disputa: d, entrada: ent });
    }
  }

  // ---- o julgamento -------------------------------------------------------
  const porDisputa = new Map();
  const reg = (d) => {
    if (!porDisputa.has(d)) {
      porDisputa.set(d, { sucessoras: [], ratificadas: [], perdas: [], desativadas: [], exigidaVazia: null });
    }
    return porDisputa.get(d);
  };
  for (const a of acusacoes) {
    const v = julgar(a, ctx) ?? { classe: "perda" };
    if (a.tipo === "exigida_vazia") {
      if (v.classe === "perda") reg(a.disputa).exigidaVazia = a.entrada;
      continue;
    }
    const r = reg(disputaDe(a.q));
    if (v.classe === "sucessora") r.sucessoras.push({ q: a.q, sucessora: v.sucessora, via: v.via });
    else if (v.classe === "ratificada") r.ratificadas.push({ q: a.q, reparo: v.reparo });
    else if (v.classe === "desativada") r.desativadas.push(a.q);
    else r.perdas.push({ q: a.q, motivo: v.motivo ?? null });
  }

  // ---- os rastros permanentes ---------------------------------------------
  // Toda tolerância vira linha em conflicts.ndjson, com id semeado do CONTEÚDO
  // (a mesma semente de `logConflict`, cunhada por `mintConflictId` — §5/§8):
  // a rodada seguinte regrava a mesma linha com o mesmo id, e a evidência não
  // evapora com o commit. É o desenho que a retenção de elenco já provou.
  const conflitos = [];
  const rastro = (c) => {
    const seed = [c.type, c.table, c.record_id, c.field,
      JSON.stringify(c.stored ?? null), JSON.stringify(c.incoming ?? null), c.source].join("|");
    const conflict_id = mintConflictId(seed);
    conflitos.push({ conflict_id, at: carimbos.get(conflict_id) ?? runDate, run_id: runDate, ...c });
  };
  for (const [d, r] of [...porDisputa.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (const s of r.sucessoras) {
      rastro({
        type: "question_sumida_com_sucessora", table: "questions",
        record_id: s.q.question_id, field: "question_id",
        stored: s.q.question_id, incoming: s.sucessora,
        source: "disputa-delta", severity: "normal",
        note: `${d}: a pergunta mudou de endereço, não de existência — sucessora ${s.sucessora} (via ${s.via})`,
      });
    }
    for (const t of r.ratificadas) {
      rastro({
        type: "question_drop_ratificado", table: "questions",
        record_id: t.q.question_id, field: "question_id",
        stored: t.q.question_id, incoming: null,
        source: "disputa-delta", severity: "normal",
        note: `${d}: perda RATIFICADA por reparo curado (${t.reparo.source}) — ${t.reparo.evidence}`,
      });
    }
  }

  // A comparação de líder é HERDADA do relatório de ensaio (§5) — já resolvida
  // por linhagem lá; aqui ela sai como aviso, nunca reprova.
  const ensaio = relatorioDeEnsaio(anterior ?? { questions: [] }, novo ?? { questions: [] });

  // ---- o relatório ---------------------------------------------------------
  const falhas = [...porDisputa.entries()]
    .filter(([, r]) => r.perdas.length || r.exigidaVazia)
    .sort((a, b) => b[1].perdas.length - a[1].perdas.length || a[0].localeCompare(b[0]));
  const soma = (f) => [...porDisputa.values()].reduce((n, r) => n + r[f].length, 0);
  const totSuc = soma("sucessoras");
  const totRat = soma("ratificadas");
  const totDes = soma("desativadas");
  const totPerda = soma("perdas");

  const avisos = [];
  for (const r of recusadas) avisos.push(r);
  for (const [d, ent] of Object.entries(lista?.disputas ?? {}).sort((a, b) => a[0].localeCompare(b[0]))) {
    if (ent?.estado === "desativada") {
      avisos.push(`${d}: disputa DESATIVADA — ignorada, em voz alta (${ent.motivo})`);
    }
  }
  for (const t of ensaio.trocaramLider) {
    avisos.push(`troca de líder em ${t.disputa} ${t.question_id}: ${t.era} → ${t.viraria} (aviso, não reprova)`);
  }

  const ok = !errosLista.length && !errosPromocao.length && !falhas.length;

  // ---- a partição da QUARENTENA (rede de segurança, decidida no núcleo) -----
  //
  // O veredito acima (`ok`, `semProva`, `linhas`) NÃO muda — ele continua
  // dizendo a verdade sobre a coleta: houve perda sem prova. O que a partição
  // decide é OUTRA pergunta, que a fiação usa para não travar a rodada inteira
  // por causa de UMA disputa churny: das disputas que reprovaram, quais dá para
  // CONGELAR no dado do commit anterior (restaurável) e quais não (residual).
  //
  // RESTAURÁVEL = a disputa tinha perguntas no COMMIT anterior (`nAntes > 0`).
  // Restaurar o commit devolve o dado da rodada passada e resolve tanto a perda
  // sem prova quanto uma `exigida` que ficou vazia por perda. RESIDUAL = a
  // disputa reprova por algo que restaurar o commit NÃO conserta: `exigida`
  // vazia dos DOIS lados (o FATO 1, presidente:AM 0→0 — não há dado anterior a
  // repor). Lista malformada e promoção pendente são erros de CONFIGURAÇÃO, não
  // de disputa: nunca entram na quarentena, sempre reprovam (a rede de segurança
  // é para perda, jamais para afrouxar a prova — §10/contrato 6).
  //
  // A quarentena NÃO altera a barra probatória: só age sobre o RESÍDUO que a
  // sucessão/ratificação já não cobriu (as toleradas nem chegam a `perdas`).
  const quarentena = [];
  const residuais = [];
  for (const [d, r] of falhas) {
    const nA = nAntes.get(d) ?? 0;
    const nD = nDepois.get(d) ?? 0;
    if (nA > 0) {
      quarentena.push({
        disputa: d, nAntes: nA, nDepois: nD,
        sumidas: r.perdas.map((p) => p.q.question_id),
        exigidaVazia: !!r.exigidaVazia,
      });
    } else {
      residuais.push({
        disputa: d,
        motivo: r.exigidaVazia ? "exigida e vazia dos dois lados (0 → 0); nada a restaurar" : "sem dado no commit anterior",
      });
    }
  }

  const L = [];
  const larg = Math.max(12, ...falhas.map(([d]) => d.length));
  if (errosLista.length) {
    L.push("LISTA DECLARADA MALFORMADA — data/disputas-declaradas.json:");
    for (const e of errosLista) L.push(`  ${e}`);
  }
  for (const e of errosPromocao) L.push(`REPROVA: ${e}`);
  if (falhas.length) {
    L.push(`DELTA POR DISPUTA REPROVOU a rodada — perda sem prova em ${falhas.length} disputa(s):`);
    L.push("");
    for (const [d, r] of falhas) {
      const a = nAntes.get(d) ?? 0;
      const b = nDepois.get(d) ?? 0;
      if (r.perdas.length) {
        const sumidas = r.sucessoras.length + r.ratificadas.length + r.perdas.length + r.desativadas.length;
        L.push(`  ${d.padEnd(larg)} ${String(a).padStart(3)} → ${String(b).padEnd(3)} ${sumidas} sumida(s): ` +
          `${r.sucessoras.length} com sucessora · ${r.ratificadas.length} ratificada(s) · ${r.perdas.length} SEM PROVA`);
        for (const p of r.perdas.slice(0, 5)) {
          L.push(`  ${"".padEnd(larg)}   ${p.q.question_id}${p.motivo ? ` — ${p.motivo}` : ""}`);
        }
        if (r.perdas.length > 5) L.push(`  ${"".padEnd(larg)}   … e mais ${r.perdas.length - 5}`);
      }
      if (r.exigidaVazia) {
        L.push(`  ${d.padEnd(larg)} ${String(a).padStart(3)} → ${String(b).padEnd(3)} disputa EXIGIDA em data/disputas-declaradas.json e vazia`);
        if (r.exigidaVazia.motivo) {
          L.push(`  ${"".padEnd(larg)}   (declarada${r.exigidaVazia.declarado_em ? ` em ${r.exigidaVazia.declarado_em}` : ""}: ${r.exigidaVazia.motivo})`);
        }
      }
    }
    L.push("");
    L.push(`  toleradas nesta rodada: ${totSuc} sumida(s) com sucessora · ${totRat} ratificada(s) por reparo` +
      (totDes ? ` · ${totDes} em disputa desativada` : ""));
    L.push("");
    L.push("Nada foi comitado; data/ do repositório permanece o da rodada anterior.");
    L.push("Caminhos: (a) consertar a coleta; (b) ratificar cada perda real com");
    L.push("allow_question_drop em data/repairs.json, com fonte primária (§4).");
  } else if (!errosLista.length && !errosPromocao.length) {
    L.push(`DELTA POR DISPUTA OK — ${antes.size} → ${depois.size} pergunta(s); ` +
      `${totSuc + totRat + totDes + totPerda} sumida(s), todas com prova: ` +
      `${totSuc} com sucessora · ${totRat} ratificada(s)` +
      (totDes ? ` · ${totDes} em disputa desativada` : ""));
    for (const [d, r] of [...porDisputa.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
      for (const t of r.ratificadas) {
        L.push(`  RATIFICADA em voz alta: ${t.q.question_id} (${d}) — ${t.reparo.source}`);
      }
    }
  }
  for (const a of avisos) L.push(`  aviso: ${a}`);

  return {
    ok, linhas: L, porDisputa, falhas, conflitos, avisos,
    errosLista, errosPromocao,
    quarentena, residuais,
    toleradas: { sucessoras: totSuc, ratificadas: totRat, desativadas: totDes },
    semProva: totPerda,
    trocaramLider: ensaio.trocaramLider,
    contagens: { antes: antes.size, depois: depois.size },
  };
}

/**
 * A rede de segurança PODE agir? — a decisão pura que a fiação consulta.
 *
 * Sim quando há disputa restaurável E não há resíduo que a restauração não
 * cobre: nenhuma disputa residual (0→0 exigida), nenhuma lista malformada,
 * nenhuma promoção pendente. Se qualquer um desses existe, a rodada REPROVA
 * inteira como antes — a quarentena não papelona erro de configuração nem
 * inventa dado para uma disputa que nunca teve nenhum (o FATO 1 segue duro).
 */
export function podeQuarentenar(v) {
  return (v?.quarentena?.length ?? 0) > 0
    && (v?.residuais?.length ?? 0) === 0
    && (v?.errosLista?.length ?? 0) === 0
    && (v?.errosPromocao?.length ?? 0) === 0;
}

/**
 * A MUTAÇÃO DA QUARENTENA, pura: dado o commit anterior, a coleta desta rodada e
 * as disputas a congelar, devolve um store NOVO em que essas disputas voltam ao
 * dado do commit anterior e TODO o resto fica fresco — mais os conflitos a
 * gravar. Não toca em `data/`, não chama git: a fiação faz o `writeStore` e o
 * `git show`. Assim o autoteste a exercita sobre fixtures (contrato §2).
 *
 * A RESTAURAÇÃO É TRANSITIVA para manter a integridade referencial que
 * `validate-store` exige: uma pergunta restaurada do commit anterior cita
 * `survey_id`, `candidate_id` (e, por ele, `person_id`) e um `institute_id` que
 * a coleta fresca pode ter re-cunhado ou deixado cair. Cada entidade que a
 * pergunta reposta referencia e que sumiu do store fresco é trazida de volta do
 * commit anterior — e as perguntas frescas da disputa (e seus recortes) saem,
 * para não deixar órfão nem elenco cruzado. O que não puder ser fechado com o
 * commit anterior vira `faltando`, e a fiação trata como fallback seguro
 * (reprova) depois de `validate-store` confirmar.
 *
 * `disputas` são as entradas de `v.quarentena`. `anterior`/`novo` são stores com
 * as tabelas como arrays (o formato de `readStore`); só as tabelas de dado são
 * lidas — índices e `_report` são ignorados.
 */
export function restaurarDisputas({ anterior, novo, disputas, runDate = "1970-01-01", carimbos = new Map() } = {}) {
  const entradas = (disputas ?? []).map((d) => (typeof d === "string" ? { disputa: d, sumidas: [] } : d));
  const alvo = new Set(entradas.map((e) => e.disputa));
  const sumidasDe = new Map(entradas.map((e) => [e.disputa, e.sumidas ?? []]));

  const TABELAS = ["questions", "surveys", "candidates", "people", "crosstabs", "institutes", "registry", "searches", "conflicts"];
  const store = { dir: novo.dir, meta: novo.meta };
  for (const t of TABELAS) store[t] = [...(novo[t] ?? [])];

  const antQ = anterior?.questions ?? [];
  const novQ = novo?.questions ?? [];

  // 1. as perguntas FRESCAS das disputas congeladas saem; seus recortes também.
  const removidasIds = new Set(novQ.filter((q) => alvo.has(disputaDe(q))).map((q) => q.question_id));
  store.questions = store.questions.filter((q) => !alvo.has(disputaDe(q)));
  store.crosstabs = store.crosstabs.filter((x) => !removidasIds.has(x.question_id));

  // 2. as perguntas do COMMIT anterior voltam.
  const restaurar = antQ.filter((q) => alvo.has(disputaDe(q)));
  const jaTem = new Set(store.questions.map((q) => q.question_id));
  const restauradasIds = new Set();
  for (const q of restaurar) {
    if (jaTem.has(q.question_id)) continue;
    store.questions.push(q);
    restauradasIds.add(q.question_id);
  }

  // 3. o fecho referencial, trazido do commit anterior quando o fresco não tem.
  const idxDe = (arr, k) => new Map((arr ?? []).map((r) => [r[k], r]));
  const antSurveys = idxDe(anterior?.surveys, "survey_id");
  const antCandidates = idxDe(anterior?.candidates, "candidate_id");
  const antPeople = idxDe(anterior?.people, "person_id");
  const antInstitutes = idxDe(anterior?.institutes, "institute_id");

  const temSurvey = new Set(store.surveys.map((s) => s.survey_id));
  const temCand = new Set(store.candidates.map((c) => c.candidate_id));
  const temPessoa = new Set(store.people.map((p) => p.person_id));
  const temInst = new Set(store.institutes.map((i) => i.institute_id));
  const faltando = [];

  const ensurePessoa = (pid) => {
    if (pid == null || temPessoa.has(pid)) return;
    const p = antPeople.get(pid);
    if (!p) { faltando.push(`person ${pid}`); return; }
    store.people.push(p); temPessoa.add(pid);
  };
  const ensureCand = (cid) => {
    if (temCand.has(cid)) return;
    const c = antCandidates.get(cid);
    if (!c) { faltando.push(`candidate ${cid}`); return; }
    store.candidates.push(c); temCand.add(cid);
    ensurePessoa(c.person_id);
  };
  const ensureInst = (iid) => {
    if (iid == null || temInst.has(iid)) return;
    const i = antInstitutes.get(iid);
    if (!i) { faltando.push(`institute ${iid}`); return; }
    store.institutes.push(i); temInst.add(iid);
  };
  const ensureSurvey = (sid) => {
    if (temSurvey.has(sid)) return;
    const s = antSurveys.get(sid);
    if (!s) { faltando.push(`survey ${sid}`); return; }
    store.surveys.push(s); temSurvey.add(sid);
    ensureInst(s.institute_id);
  };

  for (const q of restaurar) {
    ensureSurvey(q.survey_id);
    for (const r of q.results ?? []) if (r?.candidate_id) ensureCand(r.candidate_id);
  }
  // os recortes do commit anterior das perguntas repostas voltam junto.
  for (const x of anterior?.crosstabs ?? []) {
    if (restauradasIds.has(x.question_id)) store.crosstabs.push(x);
  }

  // 4. o rastro ALTO E VISÍVEL — uma linha por disputa congelada em
  // conflicts.ndjson (o mecanismo que o site já conta). A semente do id é
  // ESTÁVEL por disputa (§8): re-quarentenar a mesma disputa numa rodada
  // seguinte regrava a MESMA linha, sem churn, e o `at` é preservado pelos
  // carimbos do commit anterior.
  const conflitos = [];
  for (const d of [...alvo].sort()) {
    const nA = antQ.filter((q) => disputaDe(q) === d).length;
    const nN = novQ.filter((q) => disputaDe(q) === d).length;
    const sumidas = sumidasDe.get(d) ?? [];
    const c = {
      type: "disputa_em_quarentena", table: "questions",
      record_id: d, field: "quarentena",
      stored: nA, incoming: nN,
      source: "disputa-delta", severity: "review",
      note: `${d}: CONGELADA no dado do commit anterior — ${sumidas.length} pergunta(s) sumiram sem prova` +
        (sumidas.length ? ` (${sumidas.slice(0, 20).join(", ")}${sumidas.length > 20 ? " …" : ""})` : "") +
        `; ${nA} pergunta(s) restauradas do commit anterior, ${nN} da coleta desta rodada descartada(s)`,
    };
    const seed = [c.type, c.table, c.record_id, c.field, c.source].join("|");
    const conflict_id = mintConflictId(seed);
    conflitos.push({ conflict_id, at: carimbos.get(conflict_id) ?? runDate, run_id: runDate, ...c });
  }

  return {
    store, conflitos, faltando,
    restauradasIds: [...restauradasIds], removidasIds: [...removidasIds],
    disputas: [...alvo].sort(),
  };
}

/** As linhas do relatório de quarentena — puras, para a fiação imprimir. */
export function linhasDeQuarentena(v) {
  const qs = v?.quarentena ?? [];
  const L = [];
  const larg = Math.max(12, ...qs.map((q) => q.disputa.length));
  L.push(`DELTA POR DISPUTA — QUARENTENA: ${qs.length} disputa(s) com perda sem prova CONGELADA(s) no dado do commit anterior; todo o resto comita fresco.`);
  L.push("");
  for (const q of qs) {
    L.push(`  ${q.disputa.padEnd(larg)} ${String(q.nAntes).padStart(3)} → ${String(q.nDepois).padEnd(3)} ` +
      `${q.sumidas.length} sem prova — restaurada(s) ao commit anterior`);
    for (const id of q.sumidas.slice(0, 5)) L.push(`  ${"".padEnd(larg)}   ${id}`);
    if (q.sumidas.length > 5) L.push(`  ${"".padEnd(larg)}   … e mais ${q.sumidas.length - 5}`);
  }
  L.push("");
  L.push("A rodada SUCEDE: comita o resto fresco + a(s) disputa(s) acima no estado do commit anterior.");
  L.push("Cada disputa congelada deixa uma linha em data/conflicts.ndjson (type=disputa_em_quarentena) e conta no painel de conflitos do site.");
  return L;
}
