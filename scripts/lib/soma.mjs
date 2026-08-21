// A folga de arredondamento que uma soma GANHOU da própria fonte — a regra do
// CONVENTIONS §10, numa implementação só.
//
// Por que este arquivo existe: a redução vivia em QUATRO lugares
// (`census.mjs`, `validate-store.mjs`, `presidencial/parse.mjs`, e o
// `conferirSoma` de `repairs.mjs` nem a usava — cravava 0,6 fixo). Quatro
// cópias é a receita do §5: divergem na primeira folga ajustada de um lado só,
// e o 0,6 fixo já era a divergência viva — largo demais para tabela em décimos
// (0,05 × n de folga merecida, e ele deixava passar 0,6) e estreito demais
// para tabela em inteiros (a PE de 58+33+8+2 merece 2,0 e ele barrava em 0,6).
//
// Módulo sem import nenhum de propósito: `repairs.mjs`, `census.mjs`,
// `validate-store.mjs` e `presidencial/parse.mjs` consomem daqui sem risco de
// ciclo. Só código de Node (scripts/) importa este arquivo — a fronteira de
// cliente do §5 fica em `lib/*.ts`, não aqui.

/**
 * 0,5 por figura inteira, 0,05 por décimo. Nulos e não-números não somam
 * folga — um balde ausente também não entra na soma que se confere.
 *
 * O `toFixed(2)` não é cosmético: acumular 0,05 em binário produz caudas
 * (0,30000000000000004) que vazariam para mensagem de aviso e para comparação
 * de igualdade entre duas pernas de leitura.
 */
export function folgaDerivada(vals) {
  let folga = 0;
  for (const v of vals ?? []) {
    if (typeof v !== "number" || !Number.isFinite(v)) continue;
    folga += Number.isInteger(v) ? 0.5 : 0.05;
  }
  return Number(folga.toFixed(2));
}

/**
 * O guarda de soma do coletor — a pesquisa sobrevive ou morre, numa
 * implementação só (§5).
 *
 * Por que a decisão saiu de `scrape.mjs`: as decisões de EXISTÊNCIA rodavam
 * ANTES do guarda e sem consultá-lo, e cada uma podia preferir um registro que
 * morria logo depois — a pesquisa inteira sumia junto. Dois casos medidos no
 * ensaio de 20/08/2026:
 *
 *   · presidente:AM — a curada do Direto ao Ponto foi inserida, a dedupe entre
 *     marcas manteve "a de maior prioridade" (o registro nativo "Direito ao
 *     Ponto", soma 21), o nativo morreu no guarda (21 < 30) → a disputa fechou
 *     a coleta ZERADA;
 *   · presidente:RO 1º turno — o `add_poll` foi dispensado ("a fonte já serve
 *     esta pesquisa"), mas o alvo somava 16 e morreu no guarda → pesquisa
 *     perdida.
 *
 * A regra: decisão de existência só conta registro que SOBREVIVERIA a este
 * guarda. Quem consome: o próprio guarda do coletor, o desempate de
 * `dropExactDuplicates`, a doação de tabela em `mergePolls`, o "mais cheio" de
 * `keepFullestRound1` e a dispensa/recusa de `inserirPesquisaCurada` — todos
 * pelo MESMO veredicto, porque uma segunda cópia da regra divergiria na
 * primeira folga ajustada de um lado só.
 *
 * Os limiares são os que o guarda sempre teve, não escolhidos aqui: teto 130
 * (260 no Senado, onde cada eleitor tem dois votos) contra tabela costurada de
 * dois cenários; piso 30 contra fragmento mal parseado (pergunta de rejeição,
 * corte de segmento) que envenenaria a média.
 *
 * `motivo` sai pronto para a linha `descartada:` do coletor — o texto da
 * mensagem é contrato (o ensaio e as conferências grepam por ele), então ele é
 * cunhado aqui, ao lado da decisão, e não remontado em cada consumidor.
 */
export function veredictoDeSoma(poll) {
  let soma = (poll.results ?? []).reduce((a, r) => a + r.pct, 0);
  soma += (poll.undecided_pct ?? 0) + (poll.blank_null_pct ?? 0) + (poll.others_pct ?? 0);
  const teto = poll.race === "senador" ? 260 : 130;
  if (soma > teto) return { ok: false, soma, motivo: `soma ${soma.toFixed(1)} > ${teto}` };
  if (soma < 30) return { ok: false, soma, motivo: `soma ${soma.toFixed(1)} < 30` };
  return { ok: true, soma, motivo: null };
}

/** O predicado que as decisões de existência consultam. */
export const sobreviveAoGuardaDeSoma = (poll) => veredictoDeSoma(poll).ok;
