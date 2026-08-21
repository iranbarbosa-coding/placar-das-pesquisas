// The ONE way a candidate name is reduced to a lookup key.
//
// This module exists because the rule had two implementations and they
// disagreed on punctuation. `match-ballot-names.mjs` folded "Dr. Wanderley" to
// `dr wanderley`; `lib/candidates.mjs` folded the same string to
// `dr. wanderley`. The matcher WRITES the keys of `data/ballot-names.json` and
// candidates.mjs READS them, so every ballot name carrying a dot, a comma or an
// apostrophe was written to a key nothing would ever look up — 9 of 370
// entries, silently dead, with no error anywhere because the consume side loads
// the file inside a `catch {}` that treats the register as optional.
//
// The damage was not merely a missed rename. In `senador:AL` the two spellings
// of ONE person resolved to two different candidate ids and CROSSED: the rows
// published as "Dr. Wanderley" were attached to the entity canonicalised as
// "José Wanderley Neto" and vice versa, so the site showed one man under two
// names in a single contest — 10 rows as one, 1 row as the other — and
// contradicted the TSE ballot name on both.
//
// CONVENTIONS §5: one rule, one implementation. Two copies of a normaliser do
// not drift loudly, they drift into a key that never matches.

/**
 * Accent-folded, punctuation-folded, lowercase, single-spaced.
 *
 * Punctuation becomes a SPACE rather than being deleted, so "Manuela D'Ávila"
 * folds to `manuela d avila` and keeps its token boundary. Deleting it instead
 * would glue tokens together (`davila`) and quietly change which names look
 * like subsets of which — the token matcher above this decides who a number
 * belongs to, so that is not a cosmetic difference.
 */
export const normNome = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ").replace(/\s+/g, " ").trim();

/** How many diacritics a string carries — the tiebreak for the case below. */
export const acentos = (s) => (String(s ?? "").normalize("NFD").match(/[̀-ͯ]/g) ?? []).length;

/**
 * Quantas SIGLAS uma grafia carrega — o segundo desempate, pelo mesmo motivo
 * do primeiro.
 *
 * O registro do TSE vem em CAIXA ALTA e `fetch-candidaturas.mjs` o rebaixa por
 * title-case, que não sabe o que é sigla: "JOAQUIM DO MLB" vira "Joaquim do
 * Mlb". Medido na 1ª rodada religada (senador:PR): sem esta contagem, a rodada
 * seguinte adotaria "Joaquim do Mlb" como nome exibido — publicar isso não é
 * adotar o nome oficial, é grafá-lo errado, exatamente como "Flavio Bolsonaro".
 *
 * Sigla = corrida de 2+ maiúsculas (MLB, ACM, JHC) numa grafia que TEM
 * minúsculas. A guarda das minúsculas não é enfeite: presidente:SE publica
 * nomes inteiros em caixa alta ("RENAN SANTOS"), e uma contagem crua de
 * maiúsculas faria o instituto que grita vencer o registro — o site não grita.
 * Uma grafia toda em caixa alta não carrega informação de caixa nenhuma.
 */
export const siglas = (s) => {
  const str = String(s ?? "");
  if (!/\p{Ll}/u.test(str)) return 0;
  return (str.match(/\p{Lu}{2,}/gu) ?? []).length;
};

/**
 * A ordem de qualidade entre DUAS GRAFIAS DO MESMO NOME (> 0 ⟺ `a` é melhor):
 * mais acentos primeiro, mais siglas depois. É UMA ordem com quatro leitores —
 * `melhorGrafia` aqui, a colisão de chave do casador, `melhorDisplay` em
 * `lib/people.mjs` e o dobrado de grupo em `lib/candidates.mjs`. Antes desta
 * função cada um carregava sua comparação de `acentos`; estender a regra num
 * deles e não nos outros republicaria a mesma pessoa sob dois nomes, o defeito
 * de `senador:AL` (CONVENTIONS §5).
 *
 * Só EXIBIÇÃO entre grafias já identificadas como a mesma pessoa (§4): quem
 * chama compara strings iguais sob `normNome`, e nada aqui toca identidade.
 */
export const grafiaCompare = (a, b) =>
  (acentos(a) - acentos(b)) || (siglas(a) - siglas(b));

/**
 * The register's diacritics are not reliable, and dropping ours would look like
 * a typo on every page.
 *
 * TSE writes "PABLO MARÇAL" and "VETERINÁRIO WILSON GRASSI" with their accents
 * and "FLAVIO BOLSONARO" and "CLARIANA BARAO" without — 29 of 521 candidacies
 * carry a ballot name stripped of accents the name actually has. Publishing
 * "Flavio Bolsonaro" is not adopting the official name, it is misspelling it.
 *
 * So when the polled name and the ballot name are THE SAME NAME apart from
 * diacritics, the better-accented spelling wins. This is not overriding the
 * register — the string is identical under accent folding, which is exactly why
 * it is safe. When the two differ as names ("Allyson Bezerra" vs "Allyson"),
 * the ballot name wins outright, accents or not.
 *
 * A CAIXA tem a mesma proteção pela mesma mecânica (ver `siglas`): o title-case
 * do fetch esmaga sigla ("JOAQUIM DO MLB" → "Joaquim do Mlb"), e quando as duas
 * grafias são o mesmo nome sob `normNome`, a grafia publicada com a sigla
 * inteira vence a forma title-case do registro. A decisão mora AQUI e não no
 * `titleCase` do fetch: ele serve à leitura do registro, esta função é a única
 * regra de exibição (CONVENTIONS §5).
 *
 * Mora aqui, e não em `match-ballot-names.mjs`, desde que `people.ndjson`
 * passou a precisar da MESMA decisão para escolher o `display` de uma pessoa
 * vista sob várias grafias. Uma cópia teria feito o site publicar "Flávio
 * Bolsonaro" e a tabela de pessoas dizer "Flavio Bolsonaro" — a mesma pessoa,
 * dois nomes, que é o defeito de `senador:AL` outra vez (CONVENTIONS §5).
 */
export function melhorGrafia(nomePesquisa, nomeUrna) {
  if (normNome(nomePesquisa) !== normNome(nomeUrna)) return nomeUrna;
  return grafiaCompare(nomePesquisa, nomeUrna) > 0 ? nomePesquisa : nomeUrna;
}

/**
 * A UF DA CANDIDATURA, que não é a UF da chave da disputa.
 *
 * A chave carrega DUAS coisas diferentes (HANDOFF §1b): a UF da AMOSTRA e a UF
 * da CANDIDATURA. Em `governador:AC` elas coincidem. Em `presidente:AC` não:
 * é a corrida presidencial perguntada ao eleitor do Acre — a disputa é
 * nacional, só a amostra é estadual, e nenhum candidato ali é "candidato pelo
 * AC".
 *
 * Esta função existia inline em `match-ballot-names.mjs`, onde a confusão já
 * tinha custado 23 linhas publicando "Tarcísio de Freitas" enquanto
 * `presidente:SP` — por coincidência do estado — publicava "Tarcísio". A
 * segunda cópia teria custado o mesmo de novo do lado do consumo, onde as
 * decisões de identidade são gravadas em `presidente:BR` e consultadas em
 * `presidente:<UF>` (CONVENTIONS §5).
 */
export const ufDaCandidatura = (race, uf) => (race === "presidente" ? "BR" : (uf ?? "BR"));

/**
 * A chave sob a qual uma DECISÃO sobre esta disputa foi gravada.
 *
 * `presidente:PR` → `presidente:BR`; qualquer outra volta igual. Usada só na
 * CONSULTA, e sempre como segunda tentativa: a chave exata manda primeiro,
 * porque existem decisões deliberadamente estaduais numa disputa nacional (a
 * ruling de `presidente:PR` que separou os 32,2 de Tereza Cristina dos de Jair
 * Bolsonaro é uma delas, e dobrar a chave antes de tentar a exata a apagaria).
 */
export function chaveDeDisputa(contest) {
  const i = String(contest ?? "").indexOf(":");
  if (i < 0) return contest;
  const race = contest.slice(0, i);
  return `${race}:${ufDaCandidatura(race, contest.slice(i + 1))}`;
}
