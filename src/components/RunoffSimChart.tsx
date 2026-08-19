"use client";

import { fmtPct } from "@/lib/format";
import { shortName } from "@/lib/names";
import type { RunoffSimData, RunoffSimCard } from "@/lib/presidente";

/**
 * Section 5 — the runoff simulations, as THREE cards side by side (one per
 * matchup of the first-round leader against each of the three registered
 * candidates behind him). Each card is a small area chart plotting BOTH
 * candidates' second-round intention over time — the leader in his own colour
 * (Lula = red), the challenger in theirs. Client component (self-contained SVGs;
 * no chart library).
 *
 * The SVG is stretched to its box (`preserveAspectRatio="none"`), so the viewBox
 * is a coordinate space; strokes are pinned with `vector-effect`.
 */

const W = 600;
const H = 220;
const PAD_TOP = 8;
const PAD_BOTTOM = 6;
const PLOT = H - PAD_TOP - PAD_BOTTOM;

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isoTime(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y || 1970, (m || 1) - 1, d || 1);
  return Number.isFinite(t) ? t : 0;
}
const co = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(2);
const tickLabel = (iso: string) => {
  const [y, m] = iso.split("-").map(Number);
  return `${MES[(m || 1) - 1]}/${String(y || 0).slice(2)}`;
};

function MatchupCard({ card, leader, leaderColor }: { card: RunoffSimCard; leader: string; leaderColor: string }) {
  const t0 = isoTime(card.points[0].date);
  const t1 = isoTime(card.points[card.points.length - 1].date);
  const span = t1 - t0;
  const flat = !(span > 0);

  const vals = card.points.flatMap((p) => [p.leader, p.challenger]);
  const yMin = Math.max(0, Math.floor((Math.min(...vals) - 2) / 5) * 5);
  const yMax = Math.min(100, Math.ceil((Math.max(...vals) + 2) / 5) * 5);
  const yRange = Math.max(1, yMax - yMin);

  const x = (iso: string) => (flat ? W : ((isoTime(iso) - t0) / span) * W);
  const y = (v: number) => PAD_TOP + (1 - (v - yMin) / yRange) * PLOT;
  const topPct = (v: number) => (y(v) / H) * 100;
  const showFifty = 50 >= yMin && 50 <= yMax;

  const build = (pick: (p: { leader: number; challenger: number }) => number) => {
    const pts = card.points.map((p) => ({ px: x(p.date), py: y(pick(p)) }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${co(p.px)},${co(p.py)}`).join(" ");
    const area = pts.length
      ? `${line} L${co(pts[pts.length - 1].px)},${co(y(yMin))} L${co(pts[0].px)},${co(y(yMin))} Z`
      : "";
    return { line, area };
  };
  const leaderP = build((p) => p.leader);
  const chP = build((p) => p.challenger);
  const id = card.challenger.replace(/[^a-z0-9]+/gi, "-");

  // Three sparse x ticks (start · middle · end of the polled span).
  const ticks = flat
    ? []
    : [0, 0.5, 1].map((f) => {
        const iso = card.points[Math.round(f * (card.points.length - 1))]?.date;
        return { label: iso ? tickLabel(iso) : "", leftPct: f * 100 };
      });

  return (
    <div className="card flex min-w-0 flex-col gap-2 p-3">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {shortName(leader)} <span style={{ color: "var(--text-muted)" }}>vs</span> {shortName(card.challenger)}
        </h3>
      </div>
      <div className="flex items-baseline gap-3 text-sm font-bold tabular">
        <span style={{ color: leaderColor }}>
          {fmtPct(card.leaderCurrent)}<span className="text-[0.6em]">%</span>
        </span>
        <span style={{ color: card.challengerColor }}>
          {fmtPct(card.challengerCurrent)}<span className="text-[0.6em]">%</span>
        </span>
      </div>

      <div className="flex gap-1">
        <div className="relative w-6 shrink-0" aria-hidden="true">
          {[yMin, showFifty ? 50 : (yMin + yMax) / 2, yMax].map((v) => (
            <span key={`yl-${v}`} className="tabular absolute right-0 -translate-y-1/2 text-[9px]" style={{ top: `${topPct(v)}%`, color: "var(--text-muted)" }}>
              {Math.round(v)}
            </span>
          ))}
        </div>
        <div className="relative h-[110px] flex-1 sm:h-[130px]">
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="block h-full w-full"
            role="img"
            aria-label={`${shortName(leader)} vs ${shortName(card.challenger)}: intenção de voto de 2º turno ao longo do tempo.`}
          >
            <defs>
              <linearGradient id={`ro-l-${id}`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={co(y(yMax))} y2={co(y(yMin))}>
                <stop offset="0%" stopColor={leaderColor} stopOpacity={0.18} />
                <stop offset="100%" stopColor={leaderColor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`ro-c-${id}`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={co(y(yMax))} y2={co(y(yMin))}>
                <stop offset="0%" stopColor={card.challengerColor} stopOpacity={0.14} />
                <stop offset="100%" stopColor={card.challengerColor} stopOpacity={0.02} />
              </linearGradient>
            </defs>

            {showFifty && (
              <line x1={0} x2={W} y1={co(y(50))} y2={co(y(50))} stroke="var(--axis)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            )}

            {chP.area ? <path d={chP.area} fill={`url(#ro-c-${id})`} stroke="none" /> : null}
            {leaderP.area ? <path d={leaderP.area} fill={`url(#ro-l-${id})`} stroke="none" /> : null}
            <path d={chP.line} fill="none" stroke={card.challengerColor} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={leaderP.line} fill="none" stroke={leaderColor} strokeWidth={1.8} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
        </div>
      </div>

      {ticks.length > 0 && (
        <div className="flex gap-1">
          <div className="w-6 shrink-0" aria-hidden="true" />
          <div className="relative h-3 flex-1">
            {ticks.map((t, i) => (
              <span
                key={`${t.label}-${i}`}
                className="absolute text-[9px] uppercase tracking-wide"
                style={{ left: `${t.leftPct}%`, transform: i === 0 ? "none" : i === ticks.length - 1 ? "translateX(-100%)" : "translateX(-50%)", color: "var(--text-muted)" }}
              >
                {t.label}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

export default function RunoffSimChart({ data }: { data: RunoffSimData }) {
  if (!data.cards.length) {
    return (
      <div className="flex min-w-0 flex-col gap-3">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Simulações de 2º turno
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Ainda não há confrontos de 2º turno pesquisados para os principais desafiantes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Simulações de 2º turno
      </h2>

      {/* Three matchup cards side by side; each stacks on very narrow screens. */}
      <div className="grid min-w-0 gap-4 sm:grid-cols-3">
        {data.cards.map((c) => (
          <MatchupCard key={c.challenger} card={c} leader={data.leader} leaderColor={data.leaderColor} />
        ))}
      </div>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Simulações baseadas nas médias de intenção de voto. Não incluem brancos, nulos e indecisos.
      </p>
    </div>
  );
}
