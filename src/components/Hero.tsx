import type { ReactNode } from "react";
import Link from "next/link";
import HeroChart, {
  heroSeries,
  heroChartModel,
  heroAxisTicks,
  heroLastMarker,
  heroLevelTopPct,
} from "./HeroChart";
/* Type-only: `Headline` is erased at compile time, so this file carries NO
   runtime dependency on lib/home (and therefore none on lib/data's `node:fs`). */
import type { Headline } from "@/lib/home";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { RaceAverage } from "@/lib/types";

/**
 * The front page's opening statement: one race as an electoral dashboard.
 *
 * ── THE 2026-08-17 REDESIGN ───────────────────────────────────────────────
 * This used to be a FULL-BLEED area chart with the headline set over it, and
 * carried a page of machinery for that: a zero-scrollbar full-bleed trick, band
 * heights tuned to the copy, a scrim to keep type legible over live chart. The
 * creator's redesign mockup replaces that with the RealClearPolling/Bloomberg
 * shape — a CONTAINED chart in a card, with a visible time axis, the 50% line
 * and a last-poll marker, beside an "Em resumo" panel of the key numbers. All
 * of that machinery is therefore gone: the chart lives in a normal box now, so
 * there is nothing to keep from overflowing and nothing to scrim.
 *
 * Server component — nothing here reacts. The basis toggle is the one piece of
 * state, and it lives one level up in `HeroBasisSwitch`, which hands this
 * component the chosen cut as props plus the toggle itself as `controls`.
 *
 * WHAT SURVIVED THE REWRITE, and must not regress:
 *  · Colours come from `heroSeries` (name-hashed / pinned), never from position.
 *  · The 50%/distance claim exists ONLY on votos válidos — the "Em resumo" panel
 *    and the sentence both drop the distance-to-50 line on bruto, matching
 *    `RaceBadge`, so switching basis changes the claim rather than lying.
 *  · The full leader name is shown, never `shortName` (which turns "Luiz Inácio
 *    Lula da Silva" into "Luiz").
 */

/* The hero used a CONDENSED display face; the mockup's headline is a normal-width
   bold sans, so numbers and the title now inherit the site face (Inter). Kept as
   an empty style object so the many call sites read the same. */
const DISPLAY = {} as const;

export interface HeroProps {
  /** The presidential first-round average. `null` renders the block without a chart. */
  average: RaceAverage | null;
  /** `headlineOf(average)` — leader, their average, and the distance to 50%. */
  headline: Headline | null;
  /** Scenario label, shown in the caption. */
  scenario?: string;
  eyebrow?: string;
  title?: string;
  /** Where the panel's CTA goes. Default `/presidente`. */
  href?: string;
  ctaLabel?: string;
  /** Hard cap on drawn areas. Default 6, per the hero spec. */
  maxSeries?: number;
  /**
   * The basis toggle, owned by `HeroBasisSwitch`. A slot, not a control: this
   * component stays a renderer with no state.
   */
  controls?: ReactNode;
}

/**
 * The margin, in prose — the version a screen reader or a summary card gets.
 * ── THE 50% CLAIM ONLY EXISTS IN VOTOS VÁLIDOS ────────────────────────────
 * On bruto the denominator includes branco/nulo/não sabe, so "X pontos abaixo
 * dos 50%" is false — the threshold is not on that scale. So the bruto sentence
 * states the number, names the base, and says why the threshold is missing.
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

/** One line of the "Em resumo" panel: a big tabular number over a quiet label. */
function ResumoRow({
  value,
  label,
  color,
  accent,
}: {
  value: string;
  label: string;
  color?: string;
  accent?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-2">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className="tabular shrink-0 text-lg font-bold"
        style={{ ...DISPLAY, color: color ?? (accent ? "var(--accent)" : "var(--text-primary)") }}
      >
        {value}
      </span>
    </div>
  );
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
  const model = heroChartModel(average, maxSeries);
  const ticks = heroAxisTicks(model);
  const marker = heroLastMarker(model);
  const fiftyTop = heroLevelTopPct(model, 50);
  const validos = average?.basis === "validos";
  const basisLabel = validos ? "votos válidos" : "total da amostra";
  const hidden = average ? Math.max(0, average.candidates.length - series.length) : 0;
  const leader = average?.candidates[0] ?? null;
  const second = average?.candidates[1] ?? null;
  const showFifty = fiftyTop != null && fiftyTop >= 0 && fiftyTop <= 100;
  // Party per candidate, so the KPI row can read "Lula (PT)" like the mockup.
  const partyOf = new Map((average?.candidates ?? []).map((c) => [c.candidate, c.party]));

  return (
    <section aria-labelledby="hero-titulo" className="mb-10">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px] lg:items-start">
        {/* ── LEFT: title, KPI numbers, the framed chart ─────────────────── */}
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-col gap-2">
            <p
              className="text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: "var(--accent)" }}
            >
              {eyebrow}
            </p>
            <h1
              id="hero-titulo"
              className="text-[40px] font-bold leading-[0.98] tracking-[-0.01em] sm:text-[46px]"
              style={{ ...DISPLAY, color: "var(--text-primary)" }}
            >
              {title}
            </h1>
            {average && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Média das {average.pollCount} pesquisa{average.pollCount === 1 ? "" : "s"} · 1º turno · {basisLabel}
              </p>
            )}
          </div>

          {controls}

          {/* KPI number row — the chart's series as headline figures. Same
              colours and order as the drawing, one computation shared. */}
          {series.length > 0 && (
            <ul className="flex flex-wrap gap-x-6 gap-y-3">
              {series.map((s) => {
                const party = partyOf.get(s.name);
                return (
                  <li key={s.key} className="flex min-w-0 flex-col gap-0.5">
                    <span
                      className="tabular text-2xl font-bold leading-none"
                      style={{ ...DISPLAY, color: "var(--text-primary)" }}
                    >
                      {fmtPct(s.avg)}%
                    </span>
                    <span className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <span
                        aria-hidden="true"
                        className="h-2 w-2 shrink-0 rounded-full"
                        style={{ background: s.color }}
                      />
                      <span className="truncate">
                        {s.name}
                        {party ? <span style={{ color: "var(--text-muted)" }}> ({party})</span> : null}
                      </span>
                    </span>
                  </li>
                );
              })}
            </ul>
          )}

          {/* The framed chart: a bordered surface with 50% line, axis and marker. */}
          {series.length > 0 ? (
            <div className="card p-3 sm:p-4">
              <div className="relative h-[220px] sm:h-[280px]">
                <HeroChart average={average} maxSeries={maxSeries} framed />
                {showFifty && (
                  <span
                    className="tabular pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1 text-[10px] font-semibold"
                    style={{ top: `${fiftyTop}%`, color: "var(--text-muted)", background: "var(--surface-1)" }}
                  >
                    50%
                  </span>
                )}
                {marker && (
                  <span
                    className="tabular pointer-events-none absolute z-[1] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-md border px-2 py-1 text-[11px] font-semibold shadow-sm"
                    style={{
                      left: `${Math.min(88, Math.max(12, marker.leftPct))}%`,
                      top: `calc(${marker.topPct}% - 8px)`,
                      borderColor: "var(--ring)",
                      background: "var(--surface-1)",
                      color: "var(--text-primary)",
                    }}
                  >
                    {fmtDate(marker.date)} · {fmtPct(marker.value)}%
                  </span>
                )}
              </div>
              {/* Time axis — HTML, so labels never squash under the SVG's
                  preserveAspectRatio="none". */}
              {ticks.length > 0 && (
                <div className="relative mt-2 h-4">
                  {ticks.map((t) => (
                    <span
                      key={`${t.label}-${t.leftPct.toFixed(1)}`}
                      className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wide"
                      style={{ left: `${t.leftPct}%`, color: "var(--text-muted)" }}
                    >
                      {t.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
          ) : null}

          {average && series.length > 0 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Última pesquisa em {fmtDate(average.lastPollDate)}
              {scenario ? ` · ${scenario}` : ""}
              {hidden > 0 ? ` · ${hidden} candidato${hidden === 1 ? "" : "s"} fora do gráfico` : ""}
            </p>
          )}

          {headline ? (
            <p className="max-w-[62ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              {marginSentence(headline, average?.basis ?? "validos")}
            </p>
          ) : (
            <p className="max-w-[62ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              Ainda não há pesquisas suficientes para uma média da corrida presidencial.
            </p>
          )}
        </div>

        {/* ── RIGHT: the "Em resumo" panel ───────────────────────────────── */}
        {average && headline && leader && (
          <aside
            aria-label="Em resumo"
            className="card p-4 lg:sticky lg:top-20"
          >
            <p
              className="mb-1 text-[11px] font-bold uppercase tracking-[0.16em]"
              style={{ color: "var(--text-muted)" }}
            >
              Em resumo
            </p>
            <div className="divide-y" style={{ borderColor: "var(--ring)" }}>
              <ResumoRow value={`${fmtPct(leader.avg)}%`} label={leader.candidate} color={series[0]?.color} />
              {second && (
                <ResumoRow value={`${fmtPct(second.avg)}%`} label={second.candidate} color={series[1]?.color} />
              )}
              <ResumoRow
                value={`${fmtSigned(average.spread)} p.p.`}
                label={`Vantagem de ${headline.leader}`}
              />
              {validos && (
                <ResumoRow
                  value={`${fmtSigned(headline.toFifty)} p.p.`}
                  label="Para vencer no 1º turno"
                />
              )}
              <ResumoRow value={String(average.pollCount)} label="Pesquisas na média" />
            </div>
            <Link
              href={href}
              className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: "var(--accent)" }}
            >
              {ctaLabel} <span aria-hidden="true">→</span>
            </Link>
          </aside>
        )}
      </div>
    </section>
  );
}
