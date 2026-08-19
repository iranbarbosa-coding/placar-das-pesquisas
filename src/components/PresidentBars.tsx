import { fmtPct, fmtSigned } from "@/lib/format";
import type { PresidentBarsData } from "@/lib/presidente";

/**
 * Section 1 — the first-round average as one horizontal bar per REGISTERED
 * candidate (sorted desc), each in its own colour, with a 30-day trend arrow and
 * an "Outros" bucket for everyone non-registered. Server component: a picture of
 * build-time data with no interactivity.
 *
 * The bar axis runs 0–60 (not 0–100): the leaders sit in the low-to-mid 40s and
 * a 0–100 axis would crush every bar into the left third. 60 keeps the same
 * ceiling the hero chart floors its y-axis at, so a value reads at one height
 * across the page, and puts the dashed 50% reference — the first-round win line —
 * near the right edge where the footnote can point at it.
 */

const AXIS_MAX = 60;
const FIFTY_LEFT = (50 / AXIS_MAX) * 100; // % position of the 50% marker

function TrendArrow({ delta }: { delta: number | null }) {
  if (delta == null) {
    return (
      <span className="tabular text-xs" style={{ color: "var(--text-muted)" }}>
        —
      </span>
    );
  }
  const up = delta > 0.05;
  const down = delta < -0.05;
  const color = up ? "var(--series-3)" : down ? "var(--cand-red)" : "var(--text-muted)";
  const glyph = up ? "▲" : down ? "▼" : "—";
  return (
    <span className="tabular whitespace-nowrap text-xs" style={{ color }}>
      {glyph} {fmtSigned(delta)} p.p.
    </span>
  );
}

function Bar({
  candidate,
  party,
  pct,
  color,
  delta30,
}: {
  candidate: string;
  party: string | null;
  pct: number;
  color: string;
  delta30: number | null;
}) {
  const width = Math.max(0, Math.min(100, (pct / AXIS_MAX) * 100));
  return (
    <li className="grid grid-cols-[minmax(5rem,9rem)_1fr_auto] items-center gap-x-2 gap-y-1 sm:grid-cols-[minmax(7rem,11rem)_1fr_auto_auto] sm:gap-x-3">
      {/* Name and party on ONE line — party inline and muted — so each row stays
          compact (owner's call: drop the second line under the name). */}
      <div className="flex min-w-0 items-baseline gap-1">
        <span
          className="truncate text-sm font-semibold"
          style={{ color: "var(--text-primary)" }}
          title={party ? `${candidate} (${party})` : candidate}
        >
          {candidate}
        </span>
        {party ? (
          <span className="shrink-0 text-[11px]" style={{ color: "var(--text-muted)" }}>
            ({party})
          </span>
        ) : null}
      </div>

      {/* Bar track with the shared 50% reference marker. */}
      <div className="relative h-5 min-w-0 rounded" style={{ background: "var(--surface-2)" }}>
        <div className="absolute inset-y-0 left-0 rounded" style={{ width: `${width}%`, background: color }} />
        <span
          aria-hidden="true"
          className="absolute inset-y-[-3px] w-0 border-l border-dashed"
          style={{ left: `${FIFTY_LEFT}%`, borderColor: "var(--axis)" }}
        />
      </div>

      <div className="tabular text-right text-base font-bold leading-none sm:text-lg" style={{ color: "var(--text-primary)" }}>
        {fmtPct(pct)}
        <span className="align-baseline text-[0.6em] font-bold">%</span>
      </div>

      {/* Trend drops under the pct on narrow screens (its own row via col-span). */}
      <div className="col-span-2 -mt-1 text-right sm:col-span-1 sm:mt-0 sm:w-24">
        <TrendArrow delta={delta30} />
      </div>
    </li>
  );
}

export default function PresidentBars({ data }: { data: PresidentBarsData }) {
  if (!data.rows.length) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Ainda não há pesquisas suficientes para uma média do 1º turno.
      </p>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex items-baseline justify-between gap-2">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Média das pesquisas · 1º turno
        </h2>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {data.pollCount} pesquisas
        </span>
      </div>

      <ul className="flex flex-col gap-2.5">
        {data.rows.map((r) => (
          <Bar key={r.candidate} {...r} pct={r.pct} delta30={r.delta30} />
        ))}
        {data.outros > 0 ? (
          <Bar candidate="Outros" party={null} pct={data.outros} color="var(--series-muted)" delta30={null} />
        ) : null}
      </ul>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        A linha tracejada marca 50%, o mínimo necessário para vencer no 1º turno. Cada barra é a média
        em votos válidos; a seta indica a variação nos últimos 30 dias.
      </p>
    </div>
  );
}
