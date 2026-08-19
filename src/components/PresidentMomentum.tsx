"use client";

import { useState } from "react";
import { fmtSigned } from "@/lib/format";
// TYPE-ONLY import — lib/presidente reaches node:fs, so a value import here would
// drag it into the client bundle. The window list is a local const instead.
import type { MomentumRow, MomentumWindow } from "@/lib/presidente";

const MOMENTUM_WINDOWS: MomentumWindow[] = [60, 30, 15];

/**
 * "Tendência" — a small momentum panel under the state map. One diverging bar
 * per named candidate, centred on zero: a rise grows to the RIGHT in green, a
 * fall to the LEFT in red, its length scaled to the largest absolute move in the
 * set. A 60/30/15-day toggle re-reads each candidate's change and re-sorts.
 * Client component (owns only the window state; the deltas are precomputed).
 */

const UP = "var(--series-3)"; // green — gaining
const DOWN = "var(--cand-red)"; // red — falling
const FLAT_EPS = 0.05;

function Row({ row, delta, maxAbs }: { row: MomentumRow; delta: number; maxAbs: number }) {
  const up = delta > FLAT_EPS;
  const down = delta < -FLAT_EPS;
  const moveColor = up ? UP : down ? DOWN : "var(--text-muted)";
  const width = maxAbs > 0 ? (Math.abs(delta) / maxAbs) * 50 : 0;

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
        {up ? "▲" : down ? "▼" : "—"} {fmtSigned(delta)}
      </span>
    </li>
  );
}

export default function PresidentMomentum({ rows }: { rows: MomentumRow[] }) {
  const [win, setWin] = useState<MomentumWindow>(30);
  if (!rows.length) return null;

  const sorted = [...rows].sort((a, b) => b.deltas[win] - a.deltas[win]);
  const maxAbs = Math.max(0.1, ...sorted.map((r) => Math.abs(r.deltas[win])));

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <div className="flex min-w-0 flex-col gap-0.5">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Tendência
          </h2>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Variação da média nos últimos {win} dias.
          </p>
        </div>
        <div
          role="group"
          aria-label="Janela da tendência"
          className="inline-flex w-fit overflow-hidden rounded-md text-xs"
          style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}
        >
          {MOMENTUM_WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWin(w)}
              aria-pressed={win === w}
              className="px-2.5 py-1 transition-colors"
              style={{
                background: win === w ? "var(--accent)" : "transparent",
                color: win === w ? "#fff" : "var(--text-muted)",
                fontWeight: win === w ? 600 : 400,
              }}
            >
              {w}d
            </button>
          ))}
        </div>
      </div>

      <ul className="flex flex-col gap-2.5">
        {sorted.map((r) => (
          <Row key={r.candidate} row={r} delta={r.deltas[win]} maxAbs={maxAbs} />
        ))}
      </ul>
    </div>
  );
}
