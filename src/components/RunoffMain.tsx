import { fmtDate, fmtPct } from "@/lib/format";
import type { RunoffMainData } from "@/lib/estado";

/**
 * The primary 2º turno matchup (first-round leader vs runner-up): the two names,
 * their current shares as big numbers over a bipolar bar, and a compact evolution
 * chart of both intentions. The chart mirrors the site's standard look — a left
 * y-axis on the fixed 0/20/40/60 scale, the dashed 50% win line and month ticks —
 * kept square rather than the tall full card. Colours are the candidates' own,
 * shared with the first round. Server component (static SVG).
 */

const MES = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];

/** Milliseconds for a YYYY-MM-DD date in UTC (no `new Date()`, so it can't drift). */
function isoMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y || 1970, (m || 1) - 1, d || 1);
  return Number.isFinite(t) ? t : 0;
}

interface Line {
  name: string;
  color: string;
}

function MiniEvo({ points, a, b }: { points: { date: string; a: number; b: number }[]; a: Line; b: Line }) {
  const pts = points.filter((p) => Number.isFinite(p.a) && Number.isFinite(p.b));
  if (pts.length < 2) return null;
  const W = 320;
  const H = 100;
  const pad = 4;
  const xs = pts.map((p) => isoMs(p.date));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  // Fit the scale to the data (both candidates sit around 50 in a runoff, so a
  // 0-based axis would flatten them), while always keeping the 50% win line in
  // view. Ticks are the round levels inside that fitted range.
  const vals = pts.flatMap((p) => [p.a, p.b]);
  const dmin = Math.min(...vals);
  const dmax = Math.max(...vals);
  const padV = Math.max(3, (dmax - dmin) * 0.25);
  const yMin = Math.max(0, Math.min(dmin - padV, 45));
  const yMax = Math.min(100, Math.max(dmax + padV, 55));
  const xf = (t: number) => (x1 > x0 ? ((t - x0) / (x1 - x0)) * (W - 2 * pad) + pad : W / 2);
  const yf = (v: number) => H - pad - ((v - yMin) / (yMax - yMin)) * (H - 2 * pad);
  const path = (sel: (p: { a: number; b: number }) => number) =>
    pts.map((p, i) => `${i ? "L" : "M"}${xf(xs[i]!).toFixed(1)} ${yf(sel(p)).toFixed(1)}`).join(" ");

  const yTicks: number[] = [];
  for (let v = Math.ceil(yMin / 10) * 10; v <= yMax; v += 10) yTicks.push(v);
  const topPct = (v: number) => (yf(v) / H) * 100;

  const monthT: { leftPct: number; label: string }[] = [];
  let lastM = "";
  pts.forEach((p, i) => {
    const m = p.date.slice(0, 7);
    if (m !== lastM) {
      lastM = m;
      monthT.push({ leftPct: (xf(xs[i]!) / W) * 100, label: MES[Number(p.date.slice(5, 7)) - 1] ?? "" });
    }
  });

  return (
    <div className="flex flex-col gap-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
        Evolução da média · 2º turno
      </div>
      <div className="flex gap-1.5">
        <div className="relative w-6 shrink-0" aria-hidden="true">
          {yTicks.map((v) => (
            <span key={v} className="tabular absolute right-0 -translate-y-1/2 text-[9px]" style={{ top: `${topPct(v)}%`, color: "var(--text-muted)" }}>
              {v}%
            </span>
          ))}
        </div>
        <div className="relative h-[100px] flex-1">
          <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" preserveAspectRatio="none" aria-hidden="true">
            <line x1={0} y1={yf(50)} x2={W} y2={yf(50)} stroke="var(--axis)" strokeWidth={1} strokeDasharray="3 3" vectorEffect="non-scaling-stroke" />
            <path d={path((p) => p.a)} fill="none" stroke={a.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
            <path d={path((p) => p.b)} fill="none" stroke={b.color} strokeWidth={2} vectorEffect="non-scaling-stroke" />
          </svg>
          <span className="tabular pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1 text-[9px] font-semibold" style={{ top: `${topPct(50)}%`, color: "var(--text-muted)", background: "var(--surface-1)" }}>
            50%
          </span>
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className="w-6 shrink-0" aria-hidden="true" />
        <div className="relative h-3 flex-1">
          {monthT.map((t, i) => (
            <span key={i} className="absolute -translate-x-1/2 text-[9px] uppercase tracking-wide" style={{ left: `${t.leftPct}%`, color: "var(--text-muted)" }}>
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        {[a, b].map((s, i) => (
          <span key={i} className="flex items-center gap-1">
            <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
            <span className="truncate">{s.name}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

export default function RunoffMain({ data, title = "2º turno" }: { data: RunoffMainData | null; title?: string }) {
  if (!data) {
    return (
      <section className="card min-w-0 p-4 sm:p-6">
        <h3 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {title}
        </h3>
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Ainda não há confronto de 2º turno com pesquisas suficientes.
        </p>
      </section>
    );
  }

  const { a, b } = data;
  const sum = (Number.isFinite(a.pct) ? a.pct : 0) + (Number.isFinite(b.pct) ? b.pct : 0);
  const left = sum > 0 ? Math.max(0, Math.min(100, (a.pct / sum) * 100)) : 50;

  return (
    <section className="card min-w-0 p-4 sm:p-6">
      <h3 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h3>

      {/* Each candidate's name over their own % and colour, truncating within its
          half so a long name never bleeds across the centre into the other side. */}
      <div className="mt-2 flex items-end justify-between gap-3">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" title={a.name} style={{ color: "var(--text-primary)" }}>{a.name}</div>
          <div className="tabular text-3xl font-bold leading-none" style={{ color: a.color }}>
            {fmtPct(a.pct)}
            <span className="align-baseline text-[0.55em] font-bold">%</span>
          </div>
        </div>
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-semibold" title={b.name} style={{ color: "var(--text-primary)" }}>{b.name}</div>
          <div className="tabular text-3xl font-bold leading-none" style={{ color: b.color }}>
            {fmtPct(b.pct)}
            <span className="align-baseline text-[0.55em] font-bold">%</span>
          </div>
        </div>
      </div>
      <div className="mt-2 relative h-2.5 w-full overflow-hidden rounded-full" role="img" aria-hidden="true" style={{ background: "var(--grid)" }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${left}%`, background: a.color }} />
        <div className="absolute inset-y-0 right-0" style={{ width: `${100 - left}%`, background: b.color }} />
        <div className="absolute inset-y-0 -translate-x-1/2" style={{ left: `${left}%`, width: 3, background: "var(--surface-1)" }} />
      </div>

      <div className="mt-4">
        <MiniEvo points={data.points} a={a} b={b} />
      </div>

      <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {data.pollCount} pesquisa{data.pollCount === 1 ? "" : "s"}
        {data.lastDate ? ` · última em ${fmtDate(data.lastDate)}` : ""} · votos válidos.
      </p>
    </section>
  );
}
