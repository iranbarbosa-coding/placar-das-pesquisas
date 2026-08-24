"use client";

import { useMemo, useState } from "react";
import type { PresidentRejectionData, RejectionTrack } from "@/lib/presidente";
import RejectionPlaceholder from "./RejectionPlaceholder";

/**
 * Section 4 — rejection ("não votaria de jeito nenhum"), as an EVOLUTION line
 * chart (one line per registered candidate, rejection % over time), mirroring
 * the vote "Evolução da média" chart above it so the two are visually consistent
 * and — because a line chart is fixed-height — the rejection card can never grow
 * taller than the evolution card.
 *
 * A toggle switches between the two incompatible metrics, which are NEVER mixed:
 *  · menção múltipla — each candidate rated independently ("name all"), sums past
 *    100%; how most institutes ask (Datafolha, Quaest, AtlasIntel, …).
 *  · menção única — one rejection per elector, sums ~100% (the Veritá seed).
 * A single-poll track (one date) is drawn as end markers rather than lines.
 */

type Mode = "single" | "multi";

function InfoTip() {
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label="Menção única: o eleitor cita só um nome (soma ~100%). Menção múltipla: cita todos que rejeita (soma passa de 100%), o formato da maioria dos institutos.">
      <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block h-3.5 w-3.5 align-middle" style={{ color: "var(--text-muted)" }}>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="5" r="0.9" fill="currentColor" />
        <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-6 z-10 hidden w-64 -translate-x-1/2 rounded-md border p-2 text-[11px] font-normal normal-case tracking-normal shadow-sm group-hover:block group-focus:block" style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-secondary)" }}>
        <b style={{ color: "var(--text-primary)" }}>Menção única:</b> o eleitor cita só um nome (soma ~100%).{" "}
        <b style={{ color: "var(--text-primary)" }}>Menção múltipla:</b> cita todos que rejeita (soma passa de 100%) — o formato da maioria dos institutos.
      </span>
    </span>
  );
}

const fmtPct = (x: number): string => x.toFixed(1).replace(".", ",");
const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];
/** How many candidates get a coloured line + legend chip; the rest are faint. */
const NAMED = 6;

function ModeButton({ label, active, disabled, onClick }: { label: string; active: boolean; disabled: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      title={disabled ? "Sem dados nesta base ainda" : undefined}
      className="px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
      style={{ background: active ? "var(--accent)" : "transparent", color: active ? "#fff" : "var(--text-muted)", fontWeight: active ? 600 : 400 }}
    >
      {label}
    </button>
  );
}

function Chart({ track }: { track: RejectionTrack }) {
  const g = useMemo(() => {
    const rows = track.rows;
    const pts = rows.flatMap((r) => r.points).map((p) => ({ t: +new Date(p.date), v: p.pct })).filter((p) => Number.isFinite(p.t));
    let minT = Math.min(...pts.map((p) => p.t));
    let maxT = Math.max(...pts.map((p) => p.t));
    if (!Number.isFinite(minT)) { minT = 0; maxT = 1; }
    if (minT === maxT) { minT -= 12 * 864e5; maxT += 12 * 864e5; } // one-date track → give the marker room
    const maxV = Math.max(10, ...pts.map((p) => p.v));
    const yMax = Math.ceil(maxV / 10) * 10;
    const W = 720, H = 210, padL = 30, padR = 10, padT = 8, padB = 22;
    const pw = W - padL - padR, ph = H - padT - padB;
    const xForT = (t: number) => padL + (maxT === minT ? pw / 2 : ((t - minT) / (maxT - minT)) * pw);
    const x = (d: string) => xForT(+new Date(d));
    const y = (v: number) => padT + (1 - v / yMax) * ph;
    const step = yMax >= 40 ? 20 : 10;
    const yTicks: number[] = [];
    for (let v = 0; v <= yMax; v += step) yTicks.push(v);
    const months: { t: number; label: string }[] = [];
    const start = new Date(minT); start.setDate(1);
    for (let m = new Date(start.getFullYear(), start.getMonth(), 1); +m <= maxT; m = new Date(m.getFullYear(), m.getMonth() + 1, 1)) {
      if (+m >= minT) months.push({ t: +m, label: MONTHS[m.getMonth()] });
    }
    return { rows, W, H, padL, padR, yMax, yTicks, months, x, y, xForT };
  }, [track]);

  const named = g.rows.slice(0, NAMED);
  const faint = g.rows.slice(NAMED);

  return (
    <svg viewBox={`0 0 ${g.W} ${g.H}`} className="h-[150px] w-full sm:h-[168px]" preserveAspectRatio="none" role="img" aria-label="Evolução da rejeição por candidato ao longo do tempo.">
      {g.yTicks.map((v) => (
        <g key={v}>
          <line x1={g.padL} y1={g.y(v)} x2={g.W - g.padR} y2={g.y(v)} stroke="var(--grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
          <text x={g.padL - 5} y={g.y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>{v}%</text>
        </g>
      ))}
      {g.months.map((m) => (
        <text key={m.t} x={g.xForT(m.t)} y={g.H - 6} textAnchor="middle" fontSize={11} fill="var(--text-muted)">{m.label}</text>
      ))}
      {faint.map((r) => (
        <polyline key={r.candidate} points={r.points.map((p) => `${g.x(p.date)},${g.y(p.pct)}`).join(" ")} fill="none" stroke="var(--text-muted)" strokeWidth={1.25} strokeOpacity={0.28} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
      ))}
      {named.map((r) => (
        <g key={r.candidate}>
          <polyline points={r.points.map((p) => `${g.x(p.date)},${g.y(p.pct)}`).join(" ")} fill="none" stroke={r.color} strokeWidth={2} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
          {r.points.length ? <circle cx={g.x(r.points[r.points.length - 1].date)} cy={g.y(r.points[r.points.length - 1].pct)} r={3} fill={r.color} /> : null}
        </g>
      ))}
    </svg>
  );
}

export default function RejectionChart({ data }: { data: PresidentRejectionData }) {
  const hasMulti = !!data.multi;
  const hasSingle = !!data.single;
  const [mode, setMode] = useState<Mode>(hasMulti ? "multi" : "single");

  if (!hasMulti && !hasSingle) return <RejectionPlaceholder />;

  const track = (mode === "multi" ? data.multi : data.single) ?? data.multi ?? data.single!;
  const isMulti = track === data.multi;
  const named = track.rows.slice(0, NAMED);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Rejeição dos candidatos
          <InfoTip />
        </h2>
        <div role="group" aria-label="Base da rejeição" className="inline-flex w-fit overflow-hidden rounded-md text-xs" style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}>
          <ModeButton label="Menção única" active={mode === "single"} disabled={!hasSingle} onClick={() => setMode("single")} />
          <ModeButton label="Menção múltipla" active={mode === "multi"} disabled={!hasMulti} onClick={() => setMode("multi")} />
        </div>
      </div>

      <Chart track={track} />

      <ul className="flex flex-wrap gap-x-3 gap-y-1.5">
        {named.map((r) => (
          <li key={r.candidate} className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text-secondary)" }} title={r.candidate}>
            <span className="inline-block h-2 w-2 shrink-0 rounded-full" style={{ background: r.color }} />
            <span className="font-medium">{r.short}</span>
            <span className="tabular-nums" style={{ color: "var(--text-primary)", fontWeight: 600 }}>{fmtPct(r.current)}%</span>
          </li>
        ))}
      </ul>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        {isMulti ? "Rejeição múltipla — cada eleitor pode citar vários candidatos" : "Rejeição espontânea — uma rejeição por eleitor"}
        {track.pollCount ? ` · ${track.pollCount} pesquisa${track.pollCount > 1 ? "s" : ""} na média` : ""}
      </p>
    </div>
  );
}
