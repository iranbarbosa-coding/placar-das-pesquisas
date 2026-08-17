import type { ReactNode } from "react";
import Link from "next/link";
import HeroChart, { heroSeries } from "./HeroChart";
/* Type-only: `Headline` is erased at compile time, so this file carries NO
   runtime dependency on lib/home (and therefore none on lib/data's `node:fs`).
   `shortName` was imported here at first and dropped — see the badge below. */
import type { Headline } from "@/lib/home";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { RaceAverage } from "@/lib/types";

/**
 * The front page's opening statement: one race, most of the first screen.
 *
 * Server component — nothing here reacts to anything. The interactive chart is
 * `AverageChart`, on the race page this hero links to; the backdrop here is
 * `HeroChart`, which is static by design.
 *
 * It renders what it is handed and loads nothing. The page calls `heroRace()`
 * and passes the result down, so the selection rule ("which race gets the front
 * page") stays in `lib/home.ts` where it is written down with its reason.
 *
 * FULL BLEED WITHOUT A HORIZONTAL SCROLLBAR
 * -----------------------------------------
 * The usual `width: 100vw; margin-inline: calc(50% - 50vw)` overflows by half a
 * scrollbar: viewport units are defined as if scrollbars did not exist, so
 * `100vw` is wider than the document whenever the scrollbar is a classic one,
 * and the page grows a horizontal scrollbar it never asked for.
 *
 * This uses no viewport units at all. The chart layer is `position: absolute`
 * with `left: 0; right: 0` and NO positioned ancestor, so its containing block
 * is the initial containing block — which is the viewport MINUS the scrollbar,
 * the exact width of the document. It cannot overflow, at 375px or anywhere
 * else, because it is sized to the thing it must not exceed. `top` is left auto
 * so the layer lands at its static position: the top of this section.
 *
 * Two consequences worth knowing before editing:
 *  1. Nothing between this layer and <html> may be positioned or create a
 *     containing block (`transform`, `filter`, `contain`, `backdrop-filter`).
 *     `<section>` below is therefore deliberately NOT `relative`. If a future
 *     wrapper breaks that, the chart quietly falls back to container width —
 *     it degrades, it does not overflow.
 *  2. Out of flow means it reserves no height, so the text block carries a
 *     matching `min-height`. If the copy ever grows past the band the text wins
 *     and the chart simply covers less of it; nothing collides.
 *
 * LEGIBILITY OVER THE CHART
 * -------------------------
 * Measured at 375, 768 and 1280, not assumed — the first version put the type
 * straight onto live chart at 375px because the copy wraps to nearly twice its
 * desktop height there while the band did not grow to match. Three measures,
 * each doing a different job:
 *
 *  1. The band is taller on phones than on desktop (the copy is), so the type
 *     block ends inside the chart's scrim rather than past it.
 *  2. The chart occupies the bottom of the band only — 27% on phones, 50% from
 *     `sm` up — so the 48px headline is never over a drawn area at any width.
 *  3. A `var(--page)` scrim covers the top 30% of the CHART BOX (not of the
 *     band): it is anchored to the thing it has to hide, so changing either
 *     height cannot slide it off target. The tail of the copy — legend and
 *     caption — lands inside it, measured, with margin to spare.
 *
 * The fills are gradients that fade out toward the baseline, so the bottom of
 * the band, where the areas overlap most, is the quietest part of the picture.
 */

/**
 * Band height, and the copy's matching floor. Each pair MUST stay in step —
 * see note 2 above. Phones get MORE height than desktop on purpose: the
 * headline wraps to two lines and the legend to six, so the copy is taller.
 *
 * TWO PAIRS, because the band is sized to the copy and the copy has two
 * shapes. The scrim's lower edge sits at 65% of the band (50% chart box, then
 * 30% of that box), and the caption has to end above it. Adding the basis
 * toggle put 76px of control and explanation into the copy and pushed the
 * caption's baseline to 431px below the band top against a 403px scrim — the
 * caption landed on live chart, measured at 1280 before this constant existed.
 * The taller band restores the margin instead of shrinking the copy.
 */
const BAND = "h-[700px] sm:h-[620px]";
const BAND_MIN = "min-h-[700px] sm:min-h-[620px]";
const BAND_CONTROLS = "h-[800px] sm:h-[740px]";
const BAND_CONTROLS_MIN = "min-h-[800px] sm:min-h-[740px]";
/** Chart box, as a share of the band. Bottom-anchored. */
const CHART_BOX = "h-[27%] sm:h-[50%]";

/** Condensed display face, with real fallbacks; no webfont, no new dependency. */
const DISPLAY = {
  fontFamily:
    '"Arial Narrow", "Helvetica Neue Condensed", "Roboto Condensed", "Liberation Sans Narrow", ui-sans-serif, system-ui, sans-serif',
  fontStretch: "condensed",
} as const;

export interface HeroProps {
  /** The presidential first-round average. `null` renders the block without a chart. */
  average: RaceAverage | null;
  /** `headlineOf(average)` — leader, their average, and the distance to 50%. */
  headline: Headline | null;
  /** Scenario label, shown in the caption. */
  scenario?: string;
  eyebrow?: string;
  title?: string;
  /** Where the ghost button goes. Default `/presidente`. */
  href?: string;
  ctaLabel?: string;
  /** Hard cap on drawn areas. Default 6, per the hero spec. */
  maxSeries?: number;
  /**
   * Optional control strip under the badge row — the home page's basis toggle.
   * A slot, not a control: this component stays a renderer with no state, and
   * whoever owns the state owns the buttons.
   */
  controls?: ReactNode;
}

/**
 * The margin, in prose. The badge is a glance; this is the statement — and it
 * is the version a screen reader, a summary card or a reader who does not parse
 * "−7,3" as a distance actually gets.
 *
 * ── THE 50% CLAIM ONLY EXISTS IN VOTOS VÁLIDOS ────────────────────────────
 * On the bruto cut the denominator includes branco/nulo and não sabe, so "X
 * pontos abaixo dos 50% necessários" is simply false — the threshold is not on
 * that scale. `RaceBadge` already refuses to print a distance-to-50 on bruto
 * for exactly this reason; the hero must not contradict it two components away.
 * So the bruto sentence states the leader's number, names its base, and says
 * why the threshold is missing rather than quietly dropping it.
 */
function marginSentence(h: Headline, basis: RaceAverage["basis"]): string {
  if (basis !== "validos") {
    return `${h.leader} lidera com ${fmtPct(h.leaderPct)}% do total da amostra. Nesta base não há distância dos 50%: o total da amostra inclui branco, nulo e quem não sabe, e o primeiro turno se decide entre os votos válidos.`;
  }
  const d = fmtPct(Math.abs(h.toFifty));
  const lead = `${h.leader} lidera com ${fmtPct(h.leaderPct)}% das intenções de voto`;
  if (h.toFifty < 0) {
    return `${lead} — ${d} ponto${Math.abs(h.toFifty) === 1 ? "" : "s"} percentua${Math.abs(h.toFifty) === 1 ? "l" : "is"} abaixo dos 50% necessários para vencer ainda no primeiro turno. Na média de hoje, a eleição iria a segundo turno.`;
  }
  if (h.toFifty === 0) {
    return `${lead} — exatamente os 50% necessários para vencer no primeiro turno.`;
  }
  return `${lead} — ${d} ponto${h.toFifty === 1 ? "" : "s"} percentua${h.toFifty === 1 ? "l" : "is"} acima dos 50% necessários para vencer ainda no primeiro turno.`;
}

export default function Hero({
  average,
  headline,
  scenario,
  eyebrow = "Principais Pesquisas",
  title = "Corrida Presidencial 2026",
  href = "/presidente",
  ctaLabel = "Veja as pesquisas",
  maxSeries = 6,
  controls,
}: HeroProps) {
  const series = heroSeries(average, maxSeries);
  const validos = average?.basis === "validos";
  const basisLabel = validos ? "votos válidos" : "total da amostra";
  const hidden = average ? Math.max(0, average.candidates.length - series.length) : 0;
  // The control strip is part of the copy, so it is part of what the band has
  // to be tall enough for. Picked here, applied to BOTH constants together.
  const band = controls ? BAND_CONTROLS : BAND;
  const bandMin = controls ? BAND_CONTROLS_MIN : BAND_MIN;

  return (
    /* NOT `relative` — see the full-bleed note above. */
    <section aria-labelledby="hero-titulo" className="mb-8">
      {/* The backdrop. First in flow because `top: auto` puts an absolutely
          positioned box at its static position, and its static position has to
          be the top of the band. */}
      {series.length > 0 && (
        <div className={`pointer-events-none absolute left-0 right-0 overflow-hidden ${band}`}>
          <div className={`absolute inset-x-0 bottom-0 ${CHART_BOX}`}>
            <HeroChart average={average} maxSeries={maxSeries} />
            {/* Scrim over the top of the CHART BOX — see note 3 above. */}
            <div
              className="absolute inset-0"
              aria-hidden="true"
              style={{
                background: "linear-gradient(to bottom, var(--page) 0%, rgba(0,0,0,0) 30%)",
              }}
            />
          </div>
        </div>
      )}

      {/* `relative` here is safe: this box is a SIBLING of the layer above, not
          an ancestor of it. It only lifts the type above the backdrop. */}
      {/* The band's height is reserved only when there IS a chart to reserve it
          for. With no average there is nothing behind the copy, and a 700px
          column of empty page under four lines of text is not a hero, it is a
          hole. */}
      <div className={`relative z-[1] flex flex-col gap-4 pt-1 ${series.length > 0 ? bandMin : ""}`}>
        <p
          className="text-[11px] font-bold uppercase tracking-[0.16em]"
          style={{ color: "var(--accent)" }}
        >
          {eyebrow}
        </p>

        <h1
          id="hero-titulo"
          className="max-w-[15ch] text-[48px] font-bold leading-[0.98] tracking-[-0.01em]"
          style={{ ...DISPLAY, color: "var(--text-primary)" }}
        >
          {title}
        </h1>

        <div className="flex flex-wrap items-center gap-3">
          {headline && (
            <span
              className="tabular inline-flex items-center gap-2 rounded-full border px-3.5 py-1.5 text-sm font-semibold"
              style={{
                borderColor: "var(--accent)",
                background: "var(--surface-1)",
                color: "var(--text-primary)",
              }}
            >
              {/* FULL NAME, not `shortName`. That helper takes the first token
                  unless it is an honorific, which turns "Luiz Inácio Lula da
                  Silva" into "Luiz" — a name nobody uses for him. It measures
                  under the pill's width at 375px; `truncate` is the backstop
                  for a longer one, and the sentence below always spells the
                  leader out in full regardless. */}
              <span className="truncate">{headline.leader}</span>
              <span
                aria-hidden="true"
                className="inline-block h-3.5 w-px shrink-0"
                style={{ background: "var(--axis)" }}
              />
              {/* Same rule as `RaceBadge`: no distance-to-50 outside votos
                  válidos. The badge does not disappear — it reports the number
                  it does have, with its base named, so switching basis changes
                  the claim rather than removing the summary. */}
              <span className="whitespace-nowrap">
                {validos
                  ? `${fmtSigned(headline.toFifty)} p.p. dos 50%`
                  : `${fmtPct(headline.leaderPct)}% da amostra`}
              </span>
            </span>
          )}

          <Link
            href={href}
            className="inline-flex items-center gap-2 rounded-md border px-4 py-1.5 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
            style={{ borderColor: "var(--axis)", background: "transparent", color: "var(--text-primary)" }}
          >
            {ctaLabel} <span aria-hidden="true">→</span>
          </Link>
        </div>

        {controls}

        {headline ? (
          <p className="max-w-[52ch] text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
            {marginSentence(headline, average?.basis ?? "validos")}
          </p>
        ) : (
          <p className="max-w-[52ch] text-sm sm:text-base" style={{ color: "var(--text-secondary)" }}>
            Ainda não há pesquisas suficientes para uma média da corrida presidencial.
          </p>
        )}

        {series.length > 0 && (
          <>
            {/* The chart's numbers, in text. Doubles as the legend: same colours,
                same order, one computation shared with the drawing. */}
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
              {series.map((s) => (
                <li key={s.key} className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ background: s.color }}
                  />
                  <span className="truncate" style={{ color: "var(--text-secondary)" }}>
                    {s.name}
                  </span>
                  <span className="tabular font-semibold">{fmtPct(s.avg)}%</span>
                </li>
              ))}
            </ul>

            {average && (
              <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                Média das {average.pollCount} pesquisa{average.pollCount === 1 ? "" : "s"} mais
                recentes · {basisLabel}
                {scenario ? ` · ${scenario}` : ""} · última pesquisa em{" "}
                {fmtDate(average.lastPollDate)}
                {hidden > 0 ? ` · ${hidden} candidato${hidden === 1 ? "" : "s"} fora do gráfico` : ""}
              </p>
            )}
          </>
        )}
      </div>
    </section>
  );
}
