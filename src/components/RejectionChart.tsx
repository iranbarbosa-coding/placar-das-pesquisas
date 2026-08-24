"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { PresidentRejectionData, RejectionTrack } from "@/lib/presidente";
import RejectionPlaceholder from "./RejectionPlaceholder";

/**
 * Section 4 — rejection ("não votaria de jeito nenhum"), as an EVOLUTION line
 * chart (one line per registered candidate, rejection % over time), mirroring
 * the vote "Evolução da média" chart above it so the two read as a pair and —
 * because a line chart is fixed-height — the rejection card can never grow taller
 * than the evolution card.
 *
 * We show the MENÇÃO MÚLTIPLA average (each candidate rated independently, sums
 * past 100% — how most institutes ask: Datafolha, Quaest, AtlasIntel, CNT/MDA,
 * Futura, Ideia, RTBD, Nexus). The single-choice ("menção única") seed exists in
 * the data (Veritá) but has only one source today, so it is not surfaced; the
 * two are modelled as separate tracks and NEVER averaged together.
 *
 * The SVG uses a pixel-space viewBox sized to the measured container width, so it
 * fills the column at true 1:1 — round endpoint dots and honest line slopes, no
 * stretch (which `preserveAspectRatio="none"` would cause at 2/3 width).
 */

const H = 168; // fixed plot height, comfortably under the evolution card
const NAMED = 6; // candidates with a coloured line + legend chip; the rest are faint
const fmtPct = (x: number): string => x.toFixed(1).replace(".", ",");
const MONTHS = ["jan.", "fev.", "mar.", "abr.", "mai.", "jun.", "jul.", "ago.", "set.", "out.", "nov.", "dez."];

function InfoTip() {
  return (
    <span className="group relative inline-flex" tabIndex={0} aria-label="Rejeição: quem o eleitor não votaria de jeito nenhum. A maioria dos institutos pergunta por candidato (menção múltipla), então a soma passa de 100%.">
      <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block h-3.5 w-3.5 align-middle" style={{ color: "var(--text-muted)" }}>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="5" r="0.9" fill="currentColor" />
        <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span role="tooltip" className="pointer-events-none absolute left-1/2 top-6 z-10 hidden w-64 -translate-x-1/2 rounded-md border p-2 text-[11px] font-normal normal-case tracking-normal shadow-sm group-hover:block group-focus:block" style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-secondary)" }}>
        <b style={{ color: "var(--text-primary)" }}>Rejeição:</b> quem o eleitor não votaria de jeito nenhum. A maioria dos institutos pergunta por candidato (menção múltipla), então a soma passa de 100%.
      </span>
    </span>
  );
}

function Chart({ track }: { track: RejectionTrack }) {
  const ref = useRef<HTMLDivElement>(null);
  const [W, setW] = useState(700);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setW(Math.max(320, Math.round(el.clientWidth)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const g = useMemo(() => {
    const padL = 32, padR = 10, padT = 10, padB = 22;
    const pw = W - padL - padR, ph = H - padT - padB;
    const pts = track.rows.flatMap((r) => r.points).map((p) => ({ t: +new Date(p.date), v: p.pct })).filter((p) => Number.isFinite(p.t));
    let minT = Math.min(...pts.map((p) => p.t));
    let maxT = Math.max(...pts.map((p) => p.t));
    if (!Number.isFinite(minT)) { minT = 0; maxT = 1; }
    if (minT === maxT) { minT -= 12 * 864e5; maxT += 12 * 864e5; } // one-date track → give the marker room
    const yMax = Math.ceil(Math.max(10, ...pts.map((p) => p.v)) / 10) * 10;
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
    return { padL, padR, yTicks, months, x, y, xForT };
  }, [track, W]);

  const named = track.rows.slice(0, NAMED);
  const faint = track.rows.slice(NAMED);

  return (
    <div ref={ref} className="w-full">
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height={H} role="img" aria-label="Evolução da rejeição por candidato ao longo do tempo.">
        {g.yTicks.map((v) => (
          <g key={v}>
            <line x1={g.padL} y1={g.y(v)} x2={W - g.padR} y2={g.y(v)} stroke="var(--grid)" strokeWidth={1} />
            <text x={g.padL - 5} y={g.y(v)} dy="0.32em" textAnchor="end" fontSize={11} fill="var(--text-muted)" style={{ fontVariantNumeric: "tabular-nums" }}>{v}%</text>
          </g>
        ))}
        {g.months.map((m) => (
          <text key={m.t} x={g.xForT(m.t)} y={H - 6} textAnchor="middle" fontSize={11} fill="var(--text-muted)">{m.label}</text>
        ))}
        {faint.map((r) => (
          <polyline key={r.candidate} points={r.points.map((p) => `${g.x(p.date)},${g.y(p.pct)}`).join(" ")} fill="none" stroke="var(--text-muted)" strokeWidth={1.25} strokeOpacity={0.28} strokeLinecap="round" strokeLinejoin="round" />
        ))}
        {named.map((r) => (
          <g key={r.candidate}>
            <polyline points={r.points.map((p) => `${g.x(p.date)},${g.y(p.pct)}`).join(" ")} fill="none" stroke={r.color} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
            {r.points.length ? <circle cx={g.x(r.points[r.points.length - 1].date)} cy={g.y(r.points[r.points.length - 1].pct)} r={3.2} fill={r.color} /> : null}
          </g>
        ))}
      </svg>
    </div>
  );
}

export default function RejectionChart({ data }: { data: PresidentRejectionData }) {
  const track = data.multi ?? data.single;
  if (!track) return <RejectionPlaceholder />;
  const named = track.rows.slice(0, NAMED);
  const isMulti = track === data.multi;

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="flex items-center gap-1.5 text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Rejeição dos candidatos
        <InfoTip />
      </h2>

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
        {isMulti ? "Menção múltipla — cada eleitor pode citar vários candidatos" : "Menção única — uma rejeição por eleitor"}
        {track.pollCount ? ` · ${track.pollCount} pesquisa${track.pollCount > 1 ? "s" : ""} na média` : ""}
      </p>
    </div>
  );
}
