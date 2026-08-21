// A PESSOA — identidade global, acima da disputa.
//
// POR QUE ESTA TABELA EXISTE. `candidate_id` era cunhado de
// `candidate|${contest}|${nameKey(nome)}` com o nome JÁ canonicalizado, isto é,
// o id acompanhava o nome exibido. Toda melhoria de exibição cunhava ids novos
// e órfãos: medido em 16/08/2026, uma mudança na regra de nome moveu 27 de
// 1.078 ids sem que os dados de origem mudassem. E a linha de candidato nunca
// carregou `mint_seed` (levantamento e pergunta carregam), então a promessa
// "cunhado uma vez de semente registrada" nem sequer era representável para
// candidato.
//
// AS SEMENTES (decisão do criador, 16/08/2026):
//   pessoa registrada     `person|tse|<menor sq_candidato do grupo colapsado>`
//   pessoa sem registro   `person|obs|<escopo>|<normNome(primeira grafia vista)>`
//   linha de candidato    `candidate|<contest>|<person_id>`
//
// O ESCOPO DE QUEM NÃO SE REGISTROU (opção C, decidida pelo criador em
// 16/08/2026 depois de as três opções serem medidas):
//
//   `presidente`          → a RACE sozinha
//   `governador`/`senador`→ `race|UF`
//
// Por que não o nome global: fundiria gente comprovadamente diferente —
// `Rui Costa` (senador:BA, PT) com `Rui Costa Pimenta` (presidente, PCO),
// `Ciro` com `Ciro Nogueira`, um `Lula` de `governador:GO` com o presidencial.
// Por que não a disputa inteira (`race:UF` em tudo): `presidente:MG` NÃO é uma
// corrida mineira, é a corrida NACIONAL perguntada a mineiros — uma subamostra
// estadual — e cortar por ali estilhaçaria um candidato a presidente em até 26
// pessoas. Ratinho Jr aparece em 21 disputas presidenciais e é UM homem.
// É a mesma armadilha que `match-ballot-names.mjs` documenta: a chave da disputa
// carrega DUAS coisas — a UF da amostra e a UF da candidatura — e confundi-las é
// fácil. Aqui a presidencial é a única race em que a UF é só amostra.
//
// Por que a race sozinha não bastava nas estaduais: dentro de `governador` e
// `senador` a UF é a corrida, então dois homônimos sem registro em estados
// diferentes caíam numa pessoa só. Medidas quatro fusões reais — `Álvaro Dias`
// (senador:PR + senador:RN), `Ratinho Jr` e `Zeca Dirceu` (senador:PR +
// senador:RS), `José Carlos do Pátio` (governador:BA + governador:MT). É a mesma
// FORMA do erro `Álvaro Dias` × `Álvaro Costa Dias` que o casador bloqueia com a
// regra de estado; não movia número publicado nem `candidate_id`, mas fazia a
// linha de `people.ndjson` AFIRMAR que dois homens são um.
//
// ⚠ O ESCOPO VAI GRAVADO NO CAMPO `obs_scope`, não só dentro da semente. Ele
// JÁ esteve só na semente, e dois leitores o recuperavam com
// `/^person\|obs\|([^|]+)\|/` — que sob a opção C captura `senador` de
// `person|obs|senador|PR|...` e chaveia o índice de grafias pela race errada,
// re-fundindo em silêncio exatamente o que este corte separa. Um campo não pode
// ser mal-parseado.
import { normNome, grafiaCompare } from "./nomes.mjs";
import { mintPersonId } from "./ids.mjs";
import { colapsarReRegistros, lerCandidaturas, ordemSq } from "./candidaturas.mjs";

export const raceOf = (contest) => String(contest).split(":")[0];

/** `person|tse|<menor sq do grupo>` — o `sq` é dado do TSE, nada nosso o move. */
export const seedRegistrada = (sqMenor) => `person|tse|${sqMenor}`;

/**
 * O ESCOPO de identidade de quem não se registrou. Opção C — ver o cabeçalho.
 *
 * Uma implementação só, porque ela tem TRÊS leitores que precisam concordar
 * byte a byte: a semente, o índice de grafias desta rodada (`personByPolled`) e
 * o índice da rodada anterior (`priorStamps`). Quando o escopo estava escrito à
 * mão em cada um deles, o segundo e o terceiro usavam a race e o primeiro a
 * disputa — e a pessoa nunca era reencontrada, então TODA pessoa sem registro
 * era recunhada a cada rodada. CONVENTIONS §5.
 */
export const escopoObservado = (race, contest) => {
  const uf = String(contest ?? "").split(":")[1] || "BR";
  return race === "presidente" ? race : `${race}|${uf}`;
};

/**
 * `person|obs|<escopo>|<normNome(primeira grafia)>`.
 *
 * "Primeira grafia" é ordem de chegada, e a ordem de ingestão é determinística
 * (prioridade de fonte → data → id). Mas ela só decide a semente UMA VEZ: a
 * semente vai gravada na linha, e a rodada seguinte reencontra a pessoa pelo
 * `polled_names` e reusa `person_id` e `mint_seed` COMO ESTÃO, sem recomputar.
 * É literalmente o que `lib/ids.mjs` promete no cabeçalho — e o que faltava.
 */
export const seedObservada = (race, grafia, contest) =>
  `person|obs|${escopoObservado(race, contest)}|${normNome(grafia)}`;

/**
 * A precedência de nome exibido, materializada.
 *
 * Ela sempre existiu, como ORDEM DE ESCRITAS dentro de `lib/candidates.mjs`, e
 * era invisível nos dados. Uma ruling decide QUEM É a pessoa e nenhum registro
 * a derruba; o nome de urna decide COMO CHAMAR quem já foi identificada; o
 * grupo curado vem da tabela de apelidos; e o resto é a grafia mais curta
 * observada, que é escolha de `canonicalizeCandidates`, não desta tabela.
 */
const PRECEDENCIA = ["ruling", "nome_urna", "grupo curado", "mais curta observada"];
const rank = (origem) => {
  const i = PRECEDENCIA.indexOf(origem ?? "mais curta observada");
  return i === -1 ? PRECEDENCIA.length : i;
};

/**
 * Aplica a precedência SEM depender de ordem de chegada.
 *
 * É um mínimo sobre uma ordem total (camada, depois a própria grafia), então
 * observar as mesmas grafias em qualquer ordem dá o mesmo nome. Um `if` de
 * "primeiro que chegar" faria a saída depender da ordem dos registros no disco
 * — exatamente o defeito que trocou o confronto de 2º turno do Acre.
 */
export function melhorDisplay(atual, novo) {
  if (!atual?.display) return novo;
  if (!novo?.display) return atual;
  const ra = rank(atual.display_from);
  const rn = rank(novo.display_from);
  if (rn !== ra) return rn < ra ? novo : atual;
  // MESMO NOME, GRAFIAS DIFERENTES: ganha a de `grafiaCompare` (lib/nomes.mjs)
  // — mais acentos, depois mais siglas —, a MESMA ordem de `melhorGrafia`,
  // aplicada aqui pelo mesmo motivo: o TSE grava 29 nomes de urna sem os
  // acentos que o nome tem (e o title-case do fetch esmaga "MLB" em "Mlb"), e
  // sem esta linha pessoas registradas sairiam de `people.ndjson` como "Flavio
  // Bolsonaro" ou "Joaquim do Mlb" enquanto o site publica a grafia certa: a
  // mesma pessoa sob dois nomes, o defeito de `senador:AL` um nível acima.
  if (normNome(novo.display) === normNome(atual.display)) {
    return grafiaCompare(novo.display, atual.display) > 0 ? novo : atual;
  }
  // Empate real entre nomes diferentes: desempata em campo estável, nunca na
  // ordem em que os registros aparecem no disco (CONVENTIONS §8).
  return novo.display < atual.display ? novo : atual;
}

let REGISTRO = null;

/**
 * O registro do TSE virado em pessoas: 521 candidaturas → 519 pessoas.
 *
 * A diferença são os dois re-registros do Piauí (Elizeu Aguiar em
 * `governador:PI` e Antônio Barros em `senador:PI`), cada um com dois
 * `SQ_CANDIDATO` para a MESMA candidatura. O colapso é o de
 * `lib/candidaturas.mjs`, o mesmo que o casador de nomes de urna usa — uma
 * regra, uma implementação (CONVENTIONS §5).
 */
export function registroDePessoas(opts) {
  if (REGISTRO) return REGISTRO;
  const porId = new Map();
  const porSq = new Map();
  for (const { vencedor, membros } of colapsarReRegistros(lerCandidaturas(opts)).values()) {
    const sqs = membros.map((m) => String(m.sq_candidato))
      .sort((a, b) => ordemSq(a).localeCompare(ordemSq(b)));
    const mint_seed = seedRegistrada(sqs[0]);
    const person_id = mintPersonId(mint_seed);
    const modelo = {
      person_id,
      mint_seed,
      registered: true,
      sq_candidato: sqs,
      // VERBATIM do registro. Nada de "melhorar" o nome civil aqui: quem
      // restaura acento é `melhorGrafia`, no casador, e só contra a grafia que
      // o instituto publicou.
      nome_completo: vencedor.nome_completo ?? null,
      nome_urna: vencedor.nome_urna ?? null,
      candidacies: membros.map((m) => ({
        sq_candidato: String(m.sq_candidato),
        cargo: m.cargo, uf: m.uf ?? null, numero: m.numero ?? null,
        partido: m.partido ?? null, ano: m.ano ?? null,
      })),
    };
    porId.set(person_id, modelo);
    for (const sq of sqs) porSq.set(sq, modelo);
  }
  REGISTRO = { porId, porSq };
  return REGISTRO;
}

/** A pessoa registrada dona deste `SQ_CANDIDATO`, ou `null`. */
export function pessoaPorSq(sq, opts) {
  if (sq == null) return null;
  return registroDePessoas(opts).porSq.get(String(sq)) ?? null;
}

/** Todas as pessoas registradas, em ordem estável de `person_id`. */
export function pessoasRegistradas(opts) {
  return [...registroDePessoas(opts).porId.values()]
    .sort((a, b) => (a.person_id < b.person_id ? -1 : a.person_id > b.person_id ? 1 : 0));
}

/**
 * A pessoa SEM registro, como modelo. Os campos do registro ficam NULOS, nunca
 * adivinhados (CONVENTIONS §4): não sabemos o nome civil de quem não se
 * registrou, e escrever o nome da pesquisa ali seria afirmar o que não se apurou.
 */
export function modeloObservada(race, grafia, contest) {
  const mint_seed = seedObservada(race, grafia, contest);
  return {
    person_id: mintPersonId(mint_seed),
    mint_seed,
    // O escopo gravado como CAMPO, não deduzido da semente por regex — ver o
    // cabeçalho deste arquivo e `personPolledIndex` em `store.mjs`.
    obs_scope: escopoObservado(race, contest),
    registered: false,
    sq_candidato: [],
    nome_completo: null,
    nome_urna: null,
    candidacies: [],
  };
}

/** Recarrega o registro (testes que reescrevem `candidaturas.ndjson`). */
export function reload() { REGISTRO = null; }
