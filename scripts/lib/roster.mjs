// RETENÇÃO DE ELENCO: o que a fonte apaga entre duas rodadas, o banco não perde.
//
// O DEFEITO, medido em 17/08/2026. O `v2/cenarios` do Poder360 descarta as
// linhas de candidato cujo campo `nome` chega vazio, e O QUE ELE DESCARTA MUDA
// COM O TEMPO. A pesquisa `p360-13816` (Futura, BR-08109/2026, presidencial
// NACIONAL, campo 03–07/08) está no banco com os dez candidatos, e a API hoje
// devolve, para os dois cenários dela, apenas `Rui Costa Pimenta 0,8` e
// `Lula 36,3` — estável em três buscas seguidas. Uma coleta hoje trocaria o
// líder e o vice de uma presidencial nacional por nada. Escala varrida pelo
// `v1/api`, que RETÉM o que o `v2` apaga (mesmo `percentual`, muitas vezes
// mesmo `partido`, só sem `nome`): 423 ids em que o `v2` hoje descarta ao menos
// uma linha, 68 registros nossos comprovadamente curtos, 41 disputas ausentes.
//
// NENHUM VALIDADOR ALCANÇA ISSO, e é por isso que a defesa mora aqui e não lá.
// Uma lista curta de candidatos é uma lista BEM FORMADA: não soma acima do
// teto, não órfã referência nenhuma, não repete candidato. E o agregador segue
// servindo os buckets, que absorvem exatamente a massa que sumiu — em PI-06473
// o `others_pct: 6` cobria, ponto a ponto, as cinco linhas descartadas. O sinal
// não está DENTRO do registro que chega; está na comparação com o que já
// tínhamos. Por isso a regra é de RODADA CONTRA RODADA.
//
// A DECISÃO (criador, 17/08/2026) — opção B: manter o elenco mais rico da
// rodada anterior e registrar o conflito. Nem reprovar a rodada, nem aceitar a
// perda.
//
// O ARGUMENTO DELE, que vale mais que a regra: a invariante "o store é função
// pura da coleta" JÁ está abrandada. `first_seen` (via `priorStamps`),
// `provenance.updated_at` (via `settleProvenance`) e `legacy_ids` os três
// atravessam rodadas, e o store é reconstruído do zero justamente para que só
// atravesse o que não se re-deriva da entrada. Reter um elenco é da mesma
// categoria, não de uma nova. A alternativa é descartar candidatos de que
// temos evidência — pior que uma invariante abrandada.
//
// O QUE ESTA REGRA NÃO FAZ, de propósito:
//   · não une elencos. Um `results` costurado de duas rodadas é uma tabela que
//     nenhum instituto publicou, e somar linhas de uma medição com buckets de
//     outra é a metade do defeito ★ do HANDOFF §4 (contar a mesma massa duas
//     vezes) com outro nome.
//   · não decide o caso MISTO. Se o elenco que chega tem alguém que a rodada
//     anterior não tinha, isto não é o defeito da fonte: é a fonte republicando
//     uma tabela diferente (correção do instituto, cenário refeito, nome que
//     passou a casar com outra pessoa). Aí o que chega é aceito como está —
//     preferir a nossa cópia velha congelaria o banco contra correções reais.
//     A retenção só dispara no ENCOLHIMENTO PURO, que é a assinatura exata do
//     defeito medido: um subconjunto estrito, ninguém entrando.
//     É o mesmo princípio do filtro de linhas-lixo em `scrape.mjs` — quem
//     remove ou substitui dado tem de ser provavelmente mais estreito do que
//     aquilo que ataca.
import { logConflict } from "./store.mjs";
import { nameKey } from "./ids.mjs";

/**
 * Qual das duas tabelas de resultado é a mais rica.
 *
 * ⚠ UMA REGRA, UMA IMPLEMENTAÇÃO (CONVENTIONS §5). Esta função nasceu dentro do
 * `mergePolls` de `scrape.mjs`, onde resolve exatamente a mesma pergunta entre
 * FONTES: a Wikipédia trouxe 6 candidatos do Senado do Acre somando 200 e o
 * Poder360 trouxe 3 somando 21, e como o Poder360 tem prioridade o fragmento de
 * 3 linhas sobrescrevia a tabela completa — a pesquisa então reprovava no
 * guarda de soma e sumia das médias. A pergunta entre RODADAS é a mesma, com o
 * mesmo desfecho se for respondida errado, então é a mesma função. Duas cópias
 * divergiriam na primeira correção feita de um lado só.
 *
 * Funciona nas duas formas de registro sem tradução: a pesquisa achatada e a
 * pergunta do store usam os mesmos nomes de campo (`results[].pct`,
 * `others_pct`, `blank_null_pct`, `undecided_pct`).
 */
export function richerRoster(a, b) {
  const na = (a.results ?? []).length, nb = (b.results ?? []).length;
  if (na !== nb) return na > nb;
  const sum = (x) => (x.results ?? []).reduce((t, r) => t + r.pct, 0) +
    (x.others_pct ?? 0) + (x.blank_null_pct ?? 0) + (x.undecided_pct ?? 0);
  return sum(a) > sum(b);
}

/**
 * O grupo em que uma pergunta da rodada anterior pode ser a MESMA pergunta.
 *
 * `survey_id` já carrega instituto, UF e janela de campo (é o que a escada
 * decidiu), então o que falta é o cargo, o turno e o escopo. `scenario_ordinal`
 * fica FORA: ele é sempre 0 no caminho de escrita, e pô-lo na chave daria a
 * impressão de uma desambiguação que não existe.
 */
const grupoDe = (q) => `${q.survey_id}|${q.race}|${q.round}|${q.uf ?? "BR"}`;

/**
 * O elenco de uma pergunta, pela IDENTIDADE DECIDIDA quando ela existe.
 *
 * `candidate_id` é a identidade que a tabela curada resolveu lá em cima
 * (`canonicalCandidate` → `resolveCandidate`); comparar por nome aqui deixaria
 * o casador de tokens revogar aquela decisão, que é precisamente o último poder
 * que o trabalho de candidatos tirou dele — foi assim que "Jair Bolsonaro"
 * entrou como subconjunto de "Michelle Bolsonaro, com apoio do ex-presidente
 * Jair Bolsonaro". O caminho por nome sobra para um store lido de um disco
 * anterior aos ids, e as duas pontas TÊM de usar o mesmo tipo de chave: um lado
 * por id e outro por nome comparariam conjuntos de universos diferentes e
 * "encolhimento" viraria o normal.
 */
function chavesElenco(q) {
  const rs = q.results ?? [];
  if (rs.length && rs.every((r) => r.candidate_id)) {
    return { tipo: "id", chaves: new Set(rs.map((r) => r.candidate_id)) };
  }
  return { tipo: "nome", chaves: new Set(rs.map((r) => nameKey(r.name_raw ?? r.candidate ?? ""))) };
}

const subconjuntoEstrito = (a, b) =>
  a.tipo === b.tipo && a.chaves.size < b.chaves.size && [...a.chaves].every((k) => b.chaves.has(k));

const nomesDe = (q) => (q.results ?? []).map((r) => r.name_raw ?? r.candidate ?? "?").sort();

/**
 * Devolve a pessoa e a linha de candidato de volta ao store quando um resultado
 * retido aponta para um id que esta rodada não cunhou.
 *
 * ISTO NÃO É ZELO: sem ele a retenção grava um `candidate_id` inexistente e
 * `validate-store.mjs` reprova a rodada inteira — a pesquisa em que a fonte
 * apagou o líder é justamente aquela em que a linha do líder pode não ter sido
 * cunhada por nenhuma outra pesquisa. A ordem é pessoa → candidato, que é a
 * ordem da identidade, a mesma de `translatePersonStamps` → `translateCandidateStamps`.
 *
 * @returns {string|null} o motivo da recusa, ou null se está tudo no lugar
 */
function restaurarReferencias(store, previous, results) {
  const idx = store._indexes;
  const candAnteriores = new Map((previous.candidates ?? []).map((c) => [c.candidate_id, c]));
  const pessoasAnteriores = new Map((previous.people ?? []).map((p) => [p.person_id, p]));
  for (const r of results) {
    if (idx.candidateById.has(r.candidate_id)) {
      // A GRAFIA DOADA PELA RETENÇÃO É UMA GRAFIA PUBLICADA LEGÍTIMA. Quando a
      // fonte troca o nome de um candidato (ex.: "Antônio Galvan" → "Galvan",
      // adotando o nome de urna) E encolhe o elenco na mesma rodada, a retenção
      // devolve a pergunta anterior — com o `name_raw` antigo — para uma linha
      // de candidato recunhada nesta rodada só com a grafia nova. Sem esta
      // linha, `candidate-review.mjs assertRawInput` acusa a grafia antiga como
      // "desconhecida" e reprova o cron (upsert-harness (c)), por uma grafia que
      // a própria rodada anterior publicou. A linha JÁ existe, então só falta o
      // alias — a identidade não muda.
      const cand = idx.candidateById.get(r.candidate_id);
      const nm = String(r.name_raw ?? "").trim();
      if (nm && !(cand.aliases ?? []).includes(nm)) {
        cand.aliases = [...new Set([...(cand.aliases ?? []), nm])].sort();
        idx.candidateByAlias.set(`${cand.contest}|${nameKey(nm)}`, cand);
      }
      continue;
    }
    const velho = candAnteriores.get(r.candidate_id);
    if (!velho) return `candidato ${r.candidate_id} não existe nem nesta rodada nem na anterior`;
    if (velho.person_id != null && !idx.personById.has(velho.person_id)) {
      const pessoa = pessoasAnteriores.get(velho.person_id);
      if (!pessoa) return `pessoa ${velho.person_id} de ${r.candidate_id} não existe nem nesta rodada nem na anterior`;
      const copia = structuredClone(pessoa);
      store.people.push(copia);
      idx.personById.set(copia.person_id, copia);
    }
    const copia = structuredClone(velho);
    store.candidates.push(copia);
    // ÍNDICE MANTIDO É ÍNDICE ATUALIZADO NO WRITE (CONVENTIONS §7). `byRef` e
    // `byReg` já custaram esse defeito uma vez cada; uma linha empurrada no
    // array sem entrar nos índices é a mesma armadilha com outro nome.
    idx.candidateById.set(copia.candidate_id, copia);
    for (const n of new Set([copia.canonical, ...(copia.aliases ?? [])])) {
      if (n) idx.candidateByAlias.set(`${copia.contest}|${nameKey(n)}`, copia);
    }
  }
  return null;
}

/**
 * Mantém o elenco mais rico da rodada anterior quando o que chega é um
 * subconjunto estrito dele. Roda DEPOIS de todos os upserts e ANTES de
 * `markHeadlines` — a manchete é a pergunta de elenco mais cheio, e decidi-la
 * sobre a tabela truncada promoveria o cenário errado.
 *
 * ⚠ O `question_id` VOLTA JUNTO COM O ELENCO, e isso é deliberado. A semente da
 * pergunta inclui o elenco, então um elenco truncado CUNHA OUTRO ID: reter só
 * os números deixaria a pergunta antiga órfã a cada rodada, perdendo
 * `created_at` em silêncio — exatamente a perda de 16/08/2026 que
 * `translatePersonStamps` e `translateCandidateStamps` existem para acabar, uma
 * tabela ao lado. Retendo id e semente junto, a pergunta CONTINUA sendo a mesma
 * pergunta: `settleProvenance` a reencontra e as datas não se mexem.
 *
 * ⚠ ELE ATRAVESSA A COLETA DUPLA. O pipeline roda `scrape → match-ballot-names
 * → scrape`, e o "anterior" da coleta 2 é a saída da coleta 1, não o store
 * commitado (HANDOFF, "a segunda coleta tem a primeira como anterior"). A
 * retenção ENCADEIA por construção: a coleta 1 retém do store commitado e grava
 * o elenco cheio; a coleta 2 lê esse elenco cheio como anterior, vê o mesmo
 * subconjunto chegando e retém de novo. E como `logConflict` semeia o
 * `conflict_id` do CONTEÚDO do conflito, a coleta 2 registra a mesma linha com
 * o mesmo id — a evidência não é apagada pela reescrita de `conflicts.ndjson`,
 * que é como os conflitos de órfão da coleta 1 sumiram naquele dia.
 *
 * COMO UM EDITOR DESLIGA A RETENÇÃO, quando o encolhimento é a decisão certa
 * (o instituto publicou uma errata retirando um nome, e o elenco menor é o
 * correto): `data/repairs.json` aceita `"allow_roster_shrink": true` na entrada
 * do reparo, com `source`/`evidence` como qualquer outro. `applyRepairs` marca
 * as pesquisas casadas, `upsertPoll` amarra a marca à pergunta e a retenção
 * cede — em VOZ ALTA, gravando `roster_shrink_ratificado` em `conflicts.ndjson`
 * com a evidência citada. Explícito, curado e com fonte primária, como manda
 * CONVENTIONS §4; nunca implícito num limiar.
 */
export function retainRicherRosters(store, previous, runDate) {
  const rel = store._report.retained;
  const idx = store._indexes;
  const permitido = store._rosterShrinkAllowed ?? new Map();

  const anterioresPorGrupo = new Map();
  for (const q of previous.questions ?? []) {
    const k = grupoDe(q);
    if (!anterioresPorGrupo.has(k)) anterioresPorGrupo.set(k, []);
    anterioresPorGrupo.get(k).push(q);
  }
  if (!anterioresPorGrupo.size) return;

  // Ordem estável: a retenção escreve no disco, e ordem de array decidindo
  // saída é o defeito mais reincidente deste repositório (CONVENTIONS §8).
  const novas = [...(store.questions ?? [])].sort((a, b) =>
    a.question_id < b.question_id ? -1 : a.question_id > b.question_id ? 1 : 0);

  // 1ª passada: quem doa para quem. Um doador disputado por duas perguntas
  // novas não decide nada — escolher uma seria inventar procedência.
  const candidatas = [];
  const pretendentes = new Map();
  for (const nova of novas) {
    const grupo = anterioresPorGrupo.get(grupoDe(nova)) ?? [];
    if (!grupo.length) continue;
    // Mesmo id ⇒ mesma semente ⇒ mesmo elenco: não houve encolhimento nenhum.
    if (grupo.some((p) => p.question_id === nova.question_id)) continue;
    const chavesNova = chavesElenco(nova);
    const doadores = grupo.filter((p) =>
      !idx.questionById.has(p.question_id) &&
      subconjuntoEstrito(chavesNova, chavesElenco(p)) &&
      richerRoster(p, nova));
    if (!doadores.length) continue;
    candidatas.push({ nova, doadores });
    for (const d of doadores) pretendentes.set(d.question_id, (pretendentes.get(d.question_id) ?? 0) + 1);
  }

  // 2ª passada: reter, recusar ou ceder ao reparo.
  for (const { nova, doadores } of candidatas) {
    const disputados = doadores.filter((d) => pretendentes.get(d.question_id) > 1);
    if (doadores.length > 1 || disputados.length) {
      rel.refused++;
      logConflict(store, {
        run_id: runDate, type: "roster_shrink_ambiguo", table: "questions",
        record_id: nova.question_id, field: "results",
        stored: doadores.map((d) => d.question_id).sort(), incoming: nomesDe(nova),
        source: "roster-retention", severity: "review",
        note: `elenco que chegou é subconjunto estrito de ${doadores.length} pergunta(s) da rodada anterior` +
          `${disputados.length ? " e o doador é disputado por outra pergunta desta rodada" : ""}` +
          " — ambíguo, elenco NÃO retido (rever a fonte)",
      });
      continue;
    }
    const doador = doadores[0];
    const ratificado = permitido.get(nova.question_id);
    if (ratificado) {
      rel.ratified++;
      logConflict(store, {
        run_id: runDate, type: "roster_shrink_ratificado", table: "questions",
        record_id: nova.question_id, field: "results",
        stored: nomesDe(doador), incoming: nomesDe(nova),
        source: "roster-retention", severity: "normal",
        note: `encolhimento RATIFICADO por reparo curado (${ratificado.source ?? "sem fonte"}) — ` +
          `elenco menor aceito de propósito, retenção desligada para esta pergunta`,
      });
      continue;
    }

    const recusa = restaurarReferencias(store, previous, doador.results ?? []);
    if (recusa) {
      rel.refused++;
      logConflict(store, {
        run_id: runDate, type: "roster_shrink_irrecuperavel", table: "questions",
        record_id: nova.question_id, field: "results",
        stored: nomesDe(doador), incoming: nomesDe(nova),
        source: "roster-retention", severity: "review",
        note: `elenco anterior não pôde ser restaurado — ${recusa}`,
      });
      continue;
    }

    // OS NOMES QUE CHEGARAM, LIDOS ANTES DA SUBSTITUIÇÃO. Lidos depois, o
    // conflito registrava o elenco retido nos DOIS lados e a linha dizia
    // "5 → 5": a evidência do encolhimento apagada pelo próprio conserto.
    const chegaram = nomesDe(nova);
    const perdidas = (doador.results ?? []).length - (nova.results ?? []).length;
    const retidos = nomesDe(doador).filter((n) => !chegaram.includes(n));

    // ★ OS BUCKETS VOLTAM COM AS LINHAS, SEMPRE (HANDOFF §4). Restaurar
    // candidatos sem restaurar `others_pct`/`undecided_pct`/`blank_null_pct`
    // conta a mesma massa duas vezes: em PI-06473 o `others_pct: 6` cobria
    // exatamente as cinco linhas apagadas, e em BR-01084 (Vox) a pesquisa foi
    // ao ar somando 101,2% por causa disso. Aqui os dois lados vêm do MESMO
    // registro anterior, que era internamente consistente — o que torna a
    // regra ★ automática em vez de mais uma coisa para lembrar.
    nova.results = structuredClone(doador.results ?? []);
    nova.others_pct = doador.others_pct ?? null;
    nova.undecided_pct = doador.undecided_pct ?? null;
    nova.blank_null_pct = doador.blank_null_pct ?? null;

    idx.questionById.delete(nova.question_id);
    nova.question_id = doador.question_id;
    nova.mint_seed = doador.mint_seed ?? nova.mint_seed;
    idx.questionById.set(nova.question_id, nova);

    // ⚠ `created_at` VOLTA COM O ID, e sem isto a retenção reintroduzia
    // exatamente a perda que ela existe para evitar, um campo ao lado.
    // `provenanceFor` consulta `priorStamps` POR ID, e a pergunta foi cunhada
    // com o id do elenco TRUNCADO — que a rodada anterior não tem. Resultado
    // medido antes da correção: a pergunta saía com o elenco cheio, o id certo e
    // `created_at` = data da rodada, sem erro, sem conflito, sem nada no diff.
    // É a perda de 16/08/2026 de novo (1.164 levantamentos e 2.961 perguntas),
    // e ela não se repete de graça. `updated_at` fica para `settleProvenance`:
    // o conteúdo MUDOU (a pesquisa de origem é outra), e dizer o contrário seria
    // a mentira simétrica.
    if (doador.provenance?.created_at) nova.provenance.created_at = doador.provenance.created_at;
    // A PROCEDÊNCIA DOS QUATRO CAMPOS PASSA A DIZER A VERDADE: eles não vieram
    // da fonte desta rodada, vieram da retenção. `field_sources` é uma afirmação
    // sobre de onde saiu cada valor, e deixá-lo dizendo "poder360" apontaria a
    // fonte que ACABOU de apagar essas linhas como quem as forneceu.
    for (const f of ["results", "others_pct", "undecided_pct", "blank_null_pct"]) {
      nova.provenance.field_sources[f] = "roster-retention";
    }

    rel.questions++;
    rel.results += perdidas;
    logConflict(store, {
      run_id: runDate, type: "roster_encolhido_na_fonte", table: "questions",
      record_id: nova.question_id, field: "results",
      stored: nomesDe(doador), incoming: chegaram,
      source: "roster-retention", severity: "review",
      note: `a fonte descartou ${perdidas} linha(s) de candidato desta pergunta — ` +
        `elenco anterior RETIDO (${retidos.join(", ")}). ` +
        `Ver o defeito do v2/cenarios em scripts/lib/roster.mjs`,
    });
  }
}
