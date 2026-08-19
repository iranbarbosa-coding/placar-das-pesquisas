import { fmtDate, fmtPct } from "@/lib/format";
import { shortName } from "@/lib/names";
import type { StatePie, PieSlice } from "@/lib/presidente";

/**
 * Section 7 — one pie per state (the states with the most presidential polls),
 * each candidate's share as a slice: registered candidates in their own colour,
 * everyone non-registered folded into a grey "Outros". The pie is inline SVG (no
 * chart library); the legend beside it carries the real names and numbers, so
 * the SVG is decorative. Server component.
 */

const R = 48;
const C = 50;

/** A point on the pie's rim at `deg` degrees clockwise from 12 o'clock. */
function rim(deg: number): { x: number; y: number } {
  const rad = ((deg - 90) * Math.PI) / 180;
  return { x: C + R * Math.cos(rad), y: C + R * Math.sin(rad) };
}

function Pie({ slices }: { slices: PieSlice[] }) {
  // A single full slice cannot be drawn as an arc (start == end angle), so paint
  // it as a plain circle. Otherwise accumulate wedges around the rim.
  const only = slices.length === 1 ? slices[0] : null;
  let acc = 0;
  return (
    <svg viewBox="0 0 100 100" className="h-24 w-24 shrink-0" role="img" aria-hidden="true">
      {only ? (
        <circle cx={C} cy={C} r={R} fill={only.color} />
      ) : (
        slices.map((s) => {
          const start = (acc / 100) * 360;
          acc += s.pct;
          const end = (acc / 100) * 360;
          const large = end - start > 180 ? 1 : 0;
          const p0 = rim(start);
          const p1 = rim(end);
          return (
            <path
              key={s.name}
              d={`M${C},${C} L${p0.x.toFixed(2)},${p0.y.toFixed(2)} A${R},${R} 0 ${large} 1 ${p1.x.toFixed(2)},${p1.y.toFixed(2)} Z`}
              fill={s.color}
              stroke="var(--surface-1)"
              strokeWidth={0.8}
            />
          );
        })
      )}
    </svg>
  );
}

function StateCard({ pie }: { pie: StatePie }) {
  return (
    <div className="flex flex-col gap-2 rounded-lg p-3" style={{ background: "var(--surface-2)" }}>
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
          {pie.name}
        </h3>
        <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          {pie.pollCount} pesquisas
        </span>
      </div>

      <div className="flex items-center gap-3">
        <Pie slices={pie.slices} />
        <ul className="flex min-w-0 flex-1 flex-col gap-0.5 text-xs">
          {pie.slices.map((s) => (
            <li key={s.name} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: s.color }} />
              <span className="min-w-0 flex-1 truncate" style={{ color: "var(--text-secondary)" }} title={s.name}>
                {s.name === "Outros" ? "Outros" : shortName(s.name)}
              </span>
              <span className="tabular shrink-0 font-semibold" style={{ color: "var(--text-primary)" }}>
                {fmtPct(s.pct)}%
              </span>
            </li>
          ))}
        </ul>
      </div>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Últ. pesquisa: {fmtDate(pie.lastPoll)}
      </p>
    </div>
  );
}

export default function StatePies({ pies }: { pies: StatePie[] }) {
  if (!pies.length) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Ainda não há estados com pesquisas presidenciais suficientes.
      </p>
    );
  }
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Pesquisas por estado · 1º turno
      </h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {pies.map((pie) => (
          <StateCard key={pie.uf} pie={pie} />
        ))}
      </div>
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Fatias normalizadas para somar 100% da subamostra presidencial de cada estado. Candidatos não
        registrados no TSE entram, sem nome, em &ldquo;Outros&rdquo;.
      </p>
    </div>
  );
}
