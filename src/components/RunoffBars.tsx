import { colorMap, colorOf } from "@/lib/colors";
import { candKey } from "@/lib/average";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { Headline } from "@/lib/home";
import type { RaceAverage } from "@/lib/types";

/**
 * The homepage runoff block — one BIPOLAR BAR per second-round pairing.
 *
 * This replaced the donut carousel in the 2026-08-17 redesign (brief §5): four
 * near-identical donuts spent a lot of area to say "two numbers that sum to
 * 100", and the mockup asks for the RCP/Bloomberg bipolar bar, which says the
 * same thing in a fraction of the height and reads the head-to-head at a glance.
 *
 * Server component — no hover, no scroll state, nothing for a client bundle to
 * do; the old carousel's client machinery is gone with the donuts.
 *
 * WHAT CARRIED OVER FROM THE DONUT, and must not regress:
 *  · Colour by NAME, never by position (`colorMap`/`colorOf`, the site rule).
 *  · The válidos base is NAMED and what it set aside (branco/nulo/NS) is still
 *    disclosed in text — the donut made a point of never hiding it, and a bar
 *    that dropped it would quietly assert the two candidates are the whole vote.
 *  · The leader's full name, never `shortName`.
 */

export interface RunoffCardData {
  /** Scenario label as grouped, e.g. `2º turno: Lula vs Ronaldo Caiado`. */
  scenario: string;
  average: RaceAverage;
  headline: Headline;
}

export interface RunoffBarsProps {
  cards: RunoffCardData[];
  title?: string;
  className?: string;
}

function pct(v: number): string {
  return Number.isFinite(v) ? `${fmtPct(v)}%` : "—";
}

/** `2º turno: Lula vs Zema` → `Lula vs Zema`; anything else passes through. */
function matchupTitle(scenario: string): string {
  const m = scenario.match(/^\s*2\s*[ºo°]?\s*turno\s*[:—-]\s*(.+)$/i);
  return (m ? m[1] : scenario).trim() || scenario;
}

function baseOf(basis: RaceAverage["basis"]): string {
  return basis === "validos" ? "dos votos válidos" : "do total da amostra";
}

/** "Fora dessa base: 14,4% entre branco, nulo e não sabe." — válidos only. */
function setAsideLine(avg: RaceAverage): string | null {
  if (avg.basis !== "validos") return null;
  const { blankNull, undecided, combined } = avg.setAside;
  if (blankNull != null && undecided != null) {
    return `Fora dessa base: ${pct(blankNull)} branco/nulo e ${pct(undecided)} não sabe.`;
  }
  if (combined != null) return `Fora dessa base: ${pct(combined)} entre branco, nulo e não sabe.`;
  return null;
}

function RunoffBar({ card }: { card: RunoffCardData }) {
  const { average, headline } = card;
  // The two contenders, deduped and in average order (leader first).
  const seen = new Set<string>();
  const pair = average.candidates.filter((c) => {
    const k = candKey(c.candidate);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  const a = pair[0];
  const b = pair[1];
  if (!a || !b) return null;

  const colors = colorMap([a, b].map((c) => candKey(c.candidate)));
  const colorA = colorOf(colors, a.candidate);
  const colorB = colorOf(colors, b.candidate);

  // Split point of the bar: the two share the head-to-head base, so normalise
  // over their sum rather than assuming they land on exactly 100.
  const sum = (Number.isFinite(a.avg) ? a.avg : 0) + (Number.isFinite(b.avg) ? b.avg : 0);
  const leftFrac = sum > 0 ? Math.max(0, Math.min(100, (a.avg / sum) * 100)) : 50;
  const aside = setAsideLine(average);

  return (
    <article
      className="card flex flex-col gap-3 p-4"
      aria-label={`Cenário de segundo turno: ${a.candidate} ${pct(a.avg)} contra ${b.candidate} ${pct(b.avg)}. Vantagem de ${headline.leader}: ${fmtSigned(average.spread)} pontos.`}
    >
      <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        2º turno
      </span>

      {/* The two contenders and their numbers, leader on the left. */}
      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {a.candidate}
          </div>
          <div className="tabular text-2xl font-bold leading-tight" style={{ color: colorA }}>
            {pct(a.avg)}
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
            {b.candidate}
          </div>
          <div className="tabular text-2xl font-bold leading-tight" style={{ color: colorB }}>
            {pct(b.avg)}
          </div>
        </div>
      </div>

      {/* Bipolar bar: leader fills from the left, rival from the right, meeting
          at the split. A faint centre tick marks the 50/50 line. */}
      <div
        className="relative h-2.5 w-full overflow-hidden rounded-full"
        role="img"
        aria-hidden="true"
        style={{ background: "var(--grid)" }}
      >
        <div className="absolute inset-y-0 left-0" style={{ width: `${leftFrac}%`, background: colorA }} />
        <div className="absolute inset-y-0 right-0" style={{ width: `${100 - leftFrac}%`, background: colorB }} />
        <div
          className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2"
          style={{ background: "var(--surface-1)", opacity: 0.7 }}
        />
      </div>

      {/* The margin, spelled out. */}
      <div className="tabular text-sm">
        <span className="font-bold" style={{ color: "var(--text-primary)" }}>
          {fmtSigned(average.spread)} p.p.
        </span>{" "}
        <span style={{ color: "var(--text-secondary)" }}>vantagem de {headline.leader}</span>
      </div>

      <div className="mt-auto flex flex-col gap-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
        {aside && <span>{aside}</span>}
        <span>
          {average.pollCount} pesquisa{average.pollCount === 1 ? "" : "s"} · última em {fmtDate(average.lastPollDate)}
        </span>
      </div>
    </article>
  );
}

export default function RunoffBars({ cards, title, className }: RunoffBarsProps) {
  if (cards.length === 0) {
    return (
      <section className={className}>
        {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
        <p className="card p-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Nenhum cenário de segundo turno com pesquisas suficientes para uma média.
        </p>
      </section>
    );
  }

  return (
    <section className={className} aria-label={title ?? "Confrontos de segundo turno"}>
      {title && <h2 className="mb-3 text-lg font-bold">{title}</h2>}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {cards.map((c) => (
          <RunoffBar key={c.scenario} card={c} />
        ))}
      </div>
    </section>
  );
}
