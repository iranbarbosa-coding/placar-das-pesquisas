// Resolução de módulos para importar `src/lib/*.ts` direto do Node.
//
// O exportador da previsão (`export-inputs.mjs`) usa as REGRAS DO SITE — a
// conversão a votos válidos (`toBasis`), o portão de dois votos do Senado
// (`averageable`), o portão municipal (`geographyAverageable`) e a própria média
// (`computeAverage`) — em vez de reimplementá-las em Python (CONVENTIONS §5: uma
// regra, uma implementação). O Node ≥22.6 apaga os tipos sozinho, mas os
// módulos do site importam irmãos SEM extensão (`./validos`), como o bundler do
// Next aceita e o resolvedor ESM do Node não. Este gancho tenta `<spec>.ts`
// quando o especificador relativo não resolve. Nada mais muda.
import { registerHooks } from "node:module";

registerHooks({
  resolve(specifier, context, nextResolve) {
    try {
      return nextResolve(specifier, context);
    } catch (err) {
      if ((specifier.startsWith("./") || specifier.startsWith("../")) && !/\.[cm]?[jt]s$/.test(specifier)) {
        return nextResolve(`${specifier}.ts`, context);
      }
      throw err;
    }
  },
});
