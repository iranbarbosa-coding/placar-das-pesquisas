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
