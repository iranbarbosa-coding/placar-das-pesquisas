import { fmtSigned } from "@/lib/format";
import type { MomentumRow } from "@/lib/presidente";

/**
 * "Tendência · 30 dias" — a small momentum panel that sits under the state map.
 * One diverging bar per named candidate, centred on zero: a rise grows to the
 * RIGHT in green, a fall to the LEFT in red, its length scaled to the largest
 * absolute move in the set. Rows are pre-sorted biggest-riser-first. Server
 * component: a static read of the 30-day deltas.
 */

const UP = "var(--series-3)"; // green — gaining
const DOWN = "var(--cand-red)"; // red — falling
const FLAT_EPS = 0.05;

function Row({ row, maxAbs }: { row: MomentumRow; maxAbs: number }) {
  const up = row.delta > FLAT_EPS;
  const down = row.delta < -FLAT_EPS;
  const moveColor = up ? UP : down ? DOWN : "var(--text-muted)";
  const width = maxAbs > 0 ? (Math.abs(row.delta) / maxAbs) * 50 : 0;

  return (
    <li className="grid grid-cols-[minmax(5.5rem,7rem)_1fr_auto] items-center gap-2">
      <span className="flex min-w-0 items-center gap-1.5">
        <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: row.color }} />
        <span className="truncate text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
          {row.short}
        </span>
      </span>

      {/* Diverging track: centre line at 0, fill grows right (up) or left (down). */}
      <span className="relative block h-2.5 rounded" style={{ background: "var(--surface-2)" }}>
        <span aria-hidden="true" className="absolute inset-y-[-1px]" style={{ left: "50%", width: 1, background: "var(--axis)" }} />
        {(up || down) && (
          <span
            className="absolute inset-y-0.5 rounded-sm"
            style={{
              background: moveColor,
              width: `${width}%`,
              ...(up ? { left: "50%" } : { right: "50%" }),
            }}
          />
        )}
      </span>

      <span className="tabular whitespace-nowrap text-right text-xs font-bold" style={{ color: moveColor }}>
        {up ? "▲" : down ? "▼" : "—"} {fmtSigned(row.delta)}
      </span>
    </li>
  );
}

export default function PresidentMomentum({ rows }: { rows: MomentumRow[] }) {
  if (!rows.length) return null;
  const maxAbs = Math.max(0.1, ...rows.map((r) => Math.abs(r.delta)));

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-col gap-0.5">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Tendência · 30 dias
        </h2>
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          Variação da média de cada candidato nos últimos 30 dias.
        </p>
      </div>
      <ul className="flex flex-col gap-2.5">
        {rows.map((r) => (
          <Row key={r.candidate} row={r} maxAbs={maxAbs} />
        ))}
      </ul>
    </div>
  );
}
