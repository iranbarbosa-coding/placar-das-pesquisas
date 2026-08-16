import type { RaceAverage } from "@/lib/types";

/**
 * The line under the chart that says what the number rests on.
 *
 * Every clause here exists because the average is a choice, not a fact: how
 * many polls, capped how, over what spread, as of when. A reader who cannot see
 * the base cannot tell a 10-poll average from a 3-poll one, and this site shows
 * both without visual distinction.
 */
function n1(x: number): string {
  return x.toFixed(1).replace(".", ",");
}

function fmtDate(iso: string | null): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m ? `${d}/${m}/${y}` : iso;
}

export function AverageCaption({
  average,
  /**
   * Set-aside figures for a hovered date, when the chart is being scrubbed.
   *
   * The branco/nulo and NS/NR shares are a property of the polls in the window,
   * and the window moves as you move back through time — so the caption tracks
   * the crosshair rather than staying pinned to today. Omitted (undefined) means
   * "not hovering": show the current window's figures.
   */
  atHover,
}: {
  average: RaceAverage;
  atHover?: { date: string; setAside: RaceAverage["setAside"] };
}) {
  const setAside = atHover?.setAside ?? average.setAside;
  const partial = average.candidates.filter((c) => c.nPolls < average.pollCount);

  return (
    <figcaption className="mt-3 space-y-1 text-xs leading-relaxed text-neutral-600 dark:text-neutral-400">
      <p>
        Média de <strong className="font-medium text-neutral-800 dark:text-neutral-200">
          {average.pollCount} {average.pollCount === 1 ? "pesquisa" : "pesquisas"}
        </strong>
        {" · "}
        <span title="Nenhum instituto entra mais de duas vezes, para que uma casa que publica toda semana não carregue a média com o próprio viés.">
          máx. {average.maxPerPollster} por instituto
        </span>
        {" · "}diferença de {n1(average.spread)} pontos
        {" · "}última pesquisa em {fmtDate(average.lastPollDate)}
        {atHover ? <> · <strong className="font-medium">lendo {fmtDate(atHover.date)}</strong></> : null}
      </p>

      {/* The cap yielding is not a footnote: it means this seat is thin enough
          that the anti-house-effect rule had to be given up to reach a base at
          all, and the reader should weigh the number accordingly. */}
      {average.capRelaxed ? (
        <p className="text-amber-700 dark:text-amber-500">
          Base mínima: a disputa tem poucas pesquisas, então o limite de {average.maxPerPollster} por
          instituto cedeu para chegar a uma média.
        </p>
      ) : null}

      {/* A candidate tested by 1 of the 10 polls has an "average" of one number.
          Naming them is the difference between an average and a rumour. */}
      {partial.length ? (
        <p>
          Base parcial:{" "}
          {partial
            .map((c) => `${c.candidate} (${c.nPolls} de ${average.pollCount})`)
            .join(" · ")}
        </p>
      ) : null}

      {average.basis === "validos" ? (
        <p>
          Votos válidos: cada candidato sobre o total de votos em candidatos.
          {setAside.blankNull != null && setAside.undecided != null ? (
            <> {n1(setAside.blankNull)}% dos entrevistados responderam branco ou nulo,{" "}
              {n1(setAside.undecided)}% não responderam.</>
          ) : setAside.combined != null ? (
            /* Combined, because at least one institute in the window publishes a
               single figure. Splitting a mean across polls that report it and
               polls that fold it together would understate it, and the caption
               would read as a measurement when it is an artefact of reporting. */
            <> {n1(setAside.combined)}% responderam branco, nulo ou não souberam
              — os institutos desta média não separam os dois.</>
          ) : null}
        </p>
      ) : (
        <p>
          Números brutos, como o instituto publicou: incluem branco, nulo e quem não respondeu.
        </p>
      )}
    </figcaption>
  );
}
