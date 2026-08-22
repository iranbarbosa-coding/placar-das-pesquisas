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
    for (const cand of grupo) {
      if (cand.survey_id === q.survey_id) continue; // mesma pesquisa: já decidida acima
      const sa = surveysAnt.get(q.survey_id);
      const sn = surveysNov.get(cand.survey_id);
      const da = dataDe(sa), db = dataDe(sn);
      if (da && db && Math.abs(+new Date(da) - +new Date(db)) > JANELA_OPERACAO_MS) continue;
      const amostraA = sa?.sample_size ?? null, amostraB = sn?.sample_size ?? null;
      if (amostraA != null && amostraB != null && amostraA !== amostraB) continue;
      const t = tabelaIdentica(q.results, cand.results);
      if (!t.ok) continue;
      const forte = t.matched >= 3
        || (t.matched === 2 && da && da === db && amostraA != null && amostraA === amostraB);
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
    toleradas: { sucessoras: totSuc, ratificadas: totRat, desativadas: totDes },
    semProva: totPerda,
    trocaramLider: ensaio.trocaramLider,
    contagens: { antes: antes.size, depois: depois.size },
  };
}
