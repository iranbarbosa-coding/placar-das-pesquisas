"use client";

import { fmtPct } from "@/lib/format";
import { shortName } from "@/lib/names";
import type { RunoffSimData } from "@/lib/presidente";

/**
 * Section 5 — the runoff simulation. ONE area-line chart plotting the
 * first-round LEADER's second-round vote share over time against each of the
 * three registered challengers immediately behind him. Each line is the leader's
 * share inside that specific head-to-head, coloured by the CHALLENGER, with a
 * faint area under it. Client component (a self-contained SVG; no chart library).
 *
 * The SVG is stretched to its box (`preserveAspectRatio="none"`), so the viewBox
 * is a coordinate space, not an aspect ratio; strokes are pinned with
 * `vector-effect="non-scaling-stroke"` and the axis labels live in HTML, where a
 * non-uniform scale cannot squash them.
 */

const W = 1200;
const H = 320;
const PAD_TOP = 10;
const PAD_BOTTOM = 8;
const PLOT = H - PAD_TOP - PAD_BOTTOM;

const MES_ABREV = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

function isoTime(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y || 1970, (m || 1) - 1, d || 1);
  return Number.isFinite(t) ? t : 0;
}
const co = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(2);

export default function RunoffSimChart({ data }: { data: RunoffSimData }) {
  const series = data.series;
  if (!series.length) {
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

  // Shared domains across every series.
  const allDates = [...new Set(series.flatMap((s) => s.points.map((p) => p.date)))].sort();
  const t0 = isoTime(allDates[0]);
  const t1 = isoTime(allDates[allDates.length - 1]);
  const span = t1 - t0;
  const flat = !(span > 0);

  const vals = series.flatMap((s) => s.points.map((p) => p.avg));
  const vMin = Math.min(...vals);
  const vMax = Math.max(...vals);
  const yMin = Math.max(0, Math.floor((vMin - 2) / 5) * 5);
  const yMax = Math.min(100, Math.ceil((vMax + 2) / 5) * 5);
  const yRange = Math.max(1, yMax - yMin);

  const x = (iso: string) => (flat ? W : ((isoTime(iso) - t0) / span) * W);
  const y = (v: number) => PAD_TOP + (1 - (v - yMin) / yRange) * PLOT;
  const topPct = (v: number) => (y(v) / H) * 100;

  const gridLevels: number[] = [];
  for (let v = yMin; v <= yMax; v += 5) gridLevels.push(v);
  const showFifty = 50 >= yMin && 50 <= yMax;

  // Month-first ticks, thinned to ~6 so a long span does not print a ribbon.
  const ticks: { label: string; leftPct: number }[] = [];
  if (!flat) {
    const months: { y: number; m: number; t: number }[] = [];
    const start = new Date(t0);
    let yy = start.getUTCFullYear();
    let mm = start.getUTCMonth();
    if (start.getUTCDate() !== 1) {
      mm += 1;
      if (mm > 11) { mm = 0; yy += 1; }
    }
    for (;;) {
      const t = Date.UTC(yy, mm, 1);
      if (t > t1) break;
      months.push({ y: yy, m: mm, t });
      mm += 1;
      if (mm > 11) { mm = 0; yy += 1; }
    }
    const step = [1, 2, 3, 4, 6, 12].find((s) => s >= Math.max(1, Math.ceil(months.length / 6))) ?? 12;
    for (const mo of months) {
      if (mo.m % step !== 0) continue;
      ticks.push({ label: mo.m === 0 ? String(mo.y) : MES_ABREV[mo.m], leftPct: ((mo.t - t0) / span) * 100 });
    }
  }

  const paths = series.map((s) => {
    const pts = s.points.map((p) => ({ px: x(p.date), py: y(p.avg) }));
    const line = pts.map((p, i) => `${i ? "L" : "M"}${co(p.px)},${co(p.py)}`).join(" ");
    const area = pts.length
      ? `${line} L${co(pts[pts.length - 1].px)},${co(y(yMin))} L${co(pts[0].px)},${co(y(yMin))} Z`
      : "";
    return { s, line, area };
  });

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Simulações de 2º turno
      </h2>

      <div className="card p-3 sm:p-4">
        <div className="flex gap-1.5">
          <div className="relative w-8 shrink-0" aria-hidden="true">
            {gridLevels.map((v) => (
              <span
                key={`yl-${v}`}
                className="tabular absolute right-0 -translate-y-1/2 text-[10px]"
                style={{ top: `${topPct(v)}%`, color: "var(--text-muted)" }}
              >
                {v}%
              </span>
            ))}
          </div>

          <div className="relative h-[220px] flex-1 sm:h-[260px]">
            <svg
              viewBox={`0 0 ${W} ${H}`}
              preserveAspectRatio="none"
              className="block h-full w-full"
              role="img"
              aria-label={`Simulações de 2º turno: participação de ${shortName(data.leader)} contra ${series.map((s) => shortName(s.challenger)).join(", ")} ao longo do tempo.`}
            >
              <defs>
                {paths.map((p) => (
                  <linearGradient key={`g-${p.s.challenger}`} id={`runoff-fill-${p.s.challenger.replace(/[^a-z0-9]+/gi, "-")}`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={co(y(yMax))} y2={co(y(yMin))}>
                    <stop offset="0%" stopColor={p.s.color} stopOpacity={0.16} />
                    <stop offset="100%" stopColor={p.s.color} stopOpacity={0.02} />
                  </linearGradient>
                ))}
              </defs>

              {gridLevels.map((v) => (
                <line key={`grid-${v}`} x1={0} x2={W} y1={co(y(v))} y2={co(y(v))} stroke="var(--grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
              ))}

              {paths.map((p) =>
                p.area ? <path key={`a-${p.s.challenger}`} d={p.area} fill={`url(#runoff-fill-${p.s.challenger.replace(/[^a-z0-9]+/gi, "-")})`} stroke="none" /> : null,
              )}
              {paths.map((p) => (
                <path key={`l-${p.s.challenger}`} d={p.line} fill="none" stroke={p.s.color} strokeWidth={1.9} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
              ))}

              {showFifty && (
                <line x1={0} x2={W} y1={co(y(50))} y2={co(y(50))} stroke="var(--axis)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
              )}
            </svg>

            {showFifty && (
              <span
                className="tabular pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1 text-[10px] font-semibold"
                style={{ top: `${topPct(50)}%`, color: "var(--text-muted)", background: "var(--surface-1)" }}
              >
                50%
              </span>
            )}
          </div>
        </div>

        {ticks.length > 0 && (
          <div className="flex gap-1.5">
            <div className="w-8 shrink-0" aria-hidden="true" />
            <div className="relative mt-2 h-4 flex-1">
              {ticks.map((t) => (
                <span key={`${t.label}-${t.leftPct.toFixed(1)}`} className="absolute -translate-x-1/2 text-[10px] uppercase tracking-wide" style={{ left: `${t.leftPct}%`, color: "var(--text-muted)" }}>
                  {t.label}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Legend — one entry per challenger, coloured by the challenger, with
            the leader's current share against them. */}
        <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
          {series.map((s) => (
            <li key={`leg-${s.challenger}`} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="inline-block h-0.5 w-3.5 rounded-full" style={{ background: s.color }} />
              <span className="truncate">
                {shortName(data.leader)} vs {shortName(s.challenger)}
              </span>
              <span className="tabular font-semibold" style={{ color: "var(--text-primary)" }}>
                {fmtPct(s.current)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Simulações baseadas nas médias de intenção de voto. Não incluem brancos, nulos e indecisos.
      </p>
    </div>
  );
}
