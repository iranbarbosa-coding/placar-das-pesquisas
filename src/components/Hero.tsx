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
import { fmtDate, fmtPct } from "@/lib/format";
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

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

/* "16 AGO 2026" — the abbreviated-month header the mockup uses INSIDE the chart
   marker box. Scoped to that one label; every other date on the site stays on
   `fmtDate`'s dd/mm/yyyy. Input is the same `YYYY-MM-DD` string fmtDate takes. */
const MES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
function fmtMarkerDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  const mes = MES_ABREV[Number(m) - 1];
  return d && mes ? `${Number(d)} ${mes} ${y}` : fmtDate(iso);
}

/** Small round "i" info glyph, matching the target's title affordance. */
function InfoGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block h-4 w-4 align-middle" style={{ color: "var(--text-muted)" }}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

/** Speech-bubble glyph before the editorial sentence, as in the target. */
function ChatGlyph() {
  return (
    <svg viewBox="0 0 20 20" aria-hidden="true" className="mt-0.5 h-4 w-4 shrink-0" style={{ color: "var(--text-muted)" }}>
      <path d="M3 4h14v9H8l-4 3v-3H3z" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
    </svg>
  );
}

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
  const showFifty = fiftyTop != null && fiftyTop >= 0 && fiftyTop <= 100;
  // Party per candidate, so the KPI row can read "Lula (PT)" like the mockup.
  const partyOf = new Map((average?.candidates ?? []).map((c) => [c.candidate, c.party]));

  // KPI row like the target: the top THREE candidates plus an "Outros" bucket.
  // On votos válidos the field sums to ~100, so "Outros" is 100 minus the top
  // three — every remaining candidate, honestly, not a fabricated slice. Off the
  // válidos cut that identity does not hold, so the bucket is dropped there.
  const topKpis = series.slice(0, 3).map((s, i) => ({
    key: s.key,
    pct: s.avg,
    name: s.name,
    party: partyOf.get(s.name) ?? null,
    color: s.color,
  }));
  const outrosPct = round1(100 - topKpis.reduce((sum, k) => sum + k.pct, 0));
  const kpis =
    validos && series.length > 3 && outrosPct > 0
      ? [...topKpis, { key: "__outros", pct: outrosPct, name: "Outros", party: null, color: "var(--series-muted)" }]
      : topKpis;

  // y-axis gridline values on the framed chart's own scale (0/20/40/60…≤ yMax).
  const gridLevels = [0, 20, 40, 60, 80, 100].filter((v) => model != null && v <= model.yMax);

  return (
    <section aria-labelledby="hero-titulo">
      {/* Single full-width column: the "Em resumo" side panel was removed at the
          owner's request, so the title, KPIs and framed chart span the card. */}
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
              className="flex items-center gap-2 text-[40px] font-bold leading-[0.98] tracking-[-0.01em] sm:text-[46px]"
              style={{ ...DISPLAY, color: "var(--text-primary)" }}
            >
              {title}
              <InfoGlyph />
            </h1>
            {average && (
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>
                Média das {average.pollCount} pesquisa{average.pollCount === 1 ? "" : "s"} · 1º turno · {basisLabel}
              </p>
            )}
          </div>

          {controls}

          {/* KPI row — top three plus "Outros" on ONE line, like the target. */}
          {kpis.length > 0 && (
            <ul className="flex flex-nowrap gap-x-4 overflow-hidden sm:gap-x-6">
              {kpis.map((k) => (
                <li key={k.key} className="flex min-w-0 flex-col gap-1">
                  <span
                    className="tabular text-2xl font-bold leading-none sm:text-[30px]"
                    style={{ ...DISPLAY, color: k.color }}
                  >
                    {fmtPct(k.pct)}%
                  </span>
                  <span className="flex items-center gap-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: k.color }} />
                    <span className="truncate">
                      {k.name}
                      {k.party ? <span style={{ color: "var(--text-muted)" }}> ({k.party})</span> : null}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          )}

          {/* The framed chart: a bordered surface with y-gridlines, 50% line,
              month axis, a last-poll marker and a legend row. */}
          {series.length > 0 ? (
            <div className="card p-3 sm:p-4">
              <div className="flex gap-1.5">
                {/* y-axis labels, aligned to the SVG gridlines. */}
                <div className="relative w-7 shrink-0" aria-hidden="true">
                  {gridLevels.map((v) => {
                    const top = heroLevelTopPct(model, v);
                    return top == null ? null : (
                      <span
                        key={`ylab-${v}`}
                        className="tabular absolute right-0 -translate-y-1/2 text-[10px]"
                        style={{ top: `${top}%`, color: "var(--text-muted)" }}
                      >
                        {v}%
                      </span>
                    );
                  })}
                </div>
                <div className="relative h-[220px] flex-1 sm:h-[280px]">
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
                  <div
                    className="pointer-events-none absolute z-[1] -translate-y-1/2 whitespace-nowrap rounded-md border px-2 py-1.5 text-[11px] shadow-sm"
                    style={{
                      left: `${Math.min(58, Math.max(4, marker.leftPct - 26))}%`,
                      top: `${Math.min(70, Math.max(18, marker.topPct))}%`,
                      borderColor: "var(--ring)",
                      background: "var(--surface-1)",
                    }}
                  >
                    <div className="mb-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>
                      {fmtMarkerDate(marker.date)}
                    </div>
                    <ul className="flex flex-col gap-0.5">
                      {kpis.map((k) => (
                        <li key={`mk-${k.key}`} className="flex items-center gap-1.5">
                          <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: k.color }} />
                          <span style={{ color: "var(--text-secondary)" }}>{k.name}</span>
                          <span className="tabular ml-auto pl-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                            {fmtPct(k.pct)}%
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                </div>
              </div>
              {/* Time axis — same w-7 gutter + flex-1 as the chart, so month
                  ticks line up under the plot. */}
              {ticks.length > 0 && (
                <div className="flex gap-1.5">
                  <div className="w-7 shrink-0" aria-hidden="true" />
                  <div className="relative mt-2 h-4 flex-1">
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
                </div>
              )}
              {/* Legend row — the same four the KPIs show, plus the 50% line. */}
              <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
                {kpis.map((k) => (
                  <li key={`leg-${k.key}`} className="flex items-center gap-1.5">
                    <span aria-hidden="true" className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: k.color }} />
                    <span className="truncate">{k.name}</span>
                  </li>
                ))}
                <li className="flex items-center gap-1.5" style={{ color: "var(--text-muted)" }}>
                  <span aria-hidden="true" className="inline-block h-0 w-3.5 border-t border-dashed" style={{ borderColor: "var(--axis)" }} />
                  50% (vitória no 1º turno)
                </li>
              </ul>
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
            <p className="flex max-w-[64ch] items-start gap-2 text-sm" style={{ color: "var(--text-secondary)" }}>
              <ChatGlyph />
              <span>{marginSentence(headline, average?.basis ?? "validos")}</span>
            </p>
          ) : (
            <p className="max-w-[64ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              Ainda não há pesquisas suficientes para uma média da corrida presidencial.
            </p>
          )}

          {/* The hero's CTA. The "Em resumo" panel that used to carry it was
              removed at the owner's request, so this modest inline link keeps the
              hero's single link to the full race. */}
          <Link
            href={href}
            className="inline-flex items-center gap-1.5 text-sm font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Ver análise completa <span aria-hidden="true">→</span>
          </Link>
        </div>
    </section>
  );
}
