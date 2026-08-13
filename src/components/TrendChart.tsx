"use client";

import { useMemo, useRef, useState } from "react";

export interface TrendSeries {
  name: string;
  points: { date: string; avg: number }[];
}

// Categorical slots in fixed order (dataviz rule: assigned, never cycled;
// series beyond 8 are folded out before reaching this component).
const SLOT_VARS = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--series-${i})`);

const W = 860;
const H = 330;
const PAD = { top: 16, right: 118, bottom: 28, left: 36 };

function fmtShort(iso: string): string {
  const [y, m] = iso.split("-");
  const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return `${MES[Number(m) - 1]}/${y.slice(2)}`;
}

function fmtFull(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

export default function TrendChart({ series }: { series: TrendSeries[] }) {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  const model = useMemo(() => {
    const shown = series.filter((s) => s.points.length >= 2).slice(0, 8);
    const allDates = [...new Set(shown.flatMap((s) => s.points.map((p) => p.date)))].sort();
    if (!allDates.length) return null;
    const t0 = +new Date(allDates[0]);
    const t1 = +new Date(allDates[allDates.length - 1]);
    const maxY = Math.max(10, ...shown.flatMap((s) => s.points.map((p) => p.avg)));
    const yTop = Math.min(100, Math.ceil((maxY + 5) / 10) * 10);
    const x = (iso: string) =>
      PAD.left + ((+new Date(iso) - t0) / Math.max(1, t1 - t0)) * (W - PAD.left - PAD.right);
    const y = (v: number) => PAD.top + (1 - v / yTop) * (H - PAD.top - PAD.bottom);
    return { shown, allDates, x, y, yTop };
  }, [series]);

  if (!model) return null;
  const { shown, allDates, x, y, yTop } = model;

  const gridVals = Array.from({ length: yTop / 10 + 1 }, (_, i) => i * 10);
  // Thin month ticks to ~8 across the span so labels never collide.
  const months = allDates.filter(
    (d, i) => i === 0 || d.slice(0, 7) !== allDates[i - 1].slice(0, 7),
  );
  const tickStep = Math.max(1, Math.ceil(months.length / 8));
  const monthTicks = months.filter((_, i) => i % tickStep === 0);

  // Stagger right-edge direct labels so close series don't overlap (14px min gap).
  const endLabels = (() => {
    const items = shown.slice(0, 4).map((s, i) => {
      const last = s.points[s.points.length - 1];
      return { name: s.name, color: SLOT_VARS[i], x: x(last.date), yPos: y(last.avg), v: last.avg };
    });
    items.sort((a, b) => a.yPos - b.yPos);
    for (let i = 1; i < items.length; i++) {
      if (items[i].yPos - items[i - 1].yPos < 14) items[i].yPos = items[i - 1].yPos + 14;
    }
    return items;
  })();

  function onMove(e: React.PointerEvent<SVGSVGElement>) {
    const rect = svgRef.current!.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * W;
    let best: string | null = null;
    let bestD = Infinity;
    for (const d of allDates) {
      const dist = Math.abs(x(d) - px);
      if (dist < bestD) {
        bestD = dist;
        best = d;
      }
    }
    setHoverDate(best);
  }

  const hover =
    hoverDate === null
      ? null
      : shown
          .map((s, i) => {
            const pt =
              s.points.find((p) => p.date === hoverDate) ??
              [...s.points].reverse().find((p) => p.date <= hoverDate);
            return pt ? { name: s.name, color: SLOT_VARS[i], v: pt.avg } : null;
          })
          .filter((v): v is { name: string; color: string; v: number } => v !== null)
          .sort((a, b) => b.v - a.v);

  return (
    <div className="relative">
      <svg
        ref={svgRef}
        viewBox={`0 0 ${W} ${H}`}
        className="w-full"
        role="img"
        aria-label="Evolução das médias das pesquisas ao longo do tempo"
        onPointerMove={onMove}
        onPointerLeave={() => setHoverDate(null)}
      >
        {gridVals.map((v) => (
          <g key={v}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(v)}
              y2={y(v)}
              stroke={v === 0 ? "var(--axis)" : "var(--grid)"}
              strokeWidth={1}
            />
            <text x={PAD.left - 6} y={y(v) + 3.5} textAnchor="end" fontSize={11} fill="var(--text-muted)" className="tabular">
              {v}
            </text>
          </g>
        ))}
        {monthTicks.map((d) => (
          <text key={d} x={x(d)} y={H - 8} textAnchor="middle" fontSize={11} fill="var(--text-muted)">
            {fmtShort(d)}
          </text>
        ))}
        {shown.map((s, i) => (
          <path
            key={s.name}
            d={s.points.map((p, j) => `${j ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.avg).toFixed(1)}`).join("")}
            fill="none"
            stroke={SLOT_VARS[i]}
            strokeWidth={2}
            strokeLinejoin="round"
          />
        ))}
        {/* Direct labels at line ends (≤4 per dataviz rule), collision-staggered */}
        {endLabels.map((l) => (
          <text key={l.name} x={l.x + 6} y={l.yPos + 4} fontSize={12} fontWeight={600} fill="var(--text-primary)">
            <tspan fill={l.color}>●</tspan> {l.name.split(" ")[0]} {l.v.toFixed(1).replace(".", ",")}
          </text>
        ))}
        {hoverDate !== null && (
          <line x1={x(hoverDate)} x2={x(hoverDate)} y1={PAD.top} y2={H - PAD.bottom} stroke="var(--axis)" strokeWidth={1} strokeDasharray="3 3" />
        )}
        {hover?.map((h) => (
          <circle key={h.name} cx={x(hoverDate!)} cy={y(h.v)} r={4} fill={h.color} stroke="var(--surface-1)" strokeWidth={2} />
        ))}
      </svg>

      {hover && hoverDate && (
        <div
          className="pointer-events-none absolute top-2 rounded-lg border px-3 py-2 text-xs shadow-sm"
          style={{
            background: "var(--surface-1)",
            borderColor: "var(--ring)",
            left: `${Math.min(78, (x(hoverDate) / W) * 100)}%`,
          }}
        >
          <div className="mb-1 font-semibold">{fmtFull(hoverDate)}</div>
          {hover.map((h) => (
            <div key={h.name} className="flex items-center gap-2">
              <span aria-hidden style={{ color: h.color }}>●</span>
              <span style={{ color: "var(--text-secondary)" }}>{h.name}</span>
              <span className="ml-auto pl-3 font-semibold tabular">{h.v.toFixed(1).replace(".", ",")}%</span>
            </div>
          ))}
        </div>
      )}

      <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        {shown.map((s, i) => (
          <span key={s.name} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="inline-block h-2 w-2 rounded-full" style={{ background: SLOT_VARS[i] }} />
            {s.name}
          </span>
        ))}
      </div>
    </div>
  );
}
