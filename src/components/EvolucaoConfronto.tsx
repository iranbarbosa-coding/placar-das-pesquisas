"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { PontoEvolucao } from "@/lib/eleicao";

/**
 * O gráfico de área de um confronto de 2º turno: as duas intenções de voto ao
 * longo do tempo, lidas da média móvel do site. É o gráfico que abre a home no
 * modo 2º turno (grande, Lula × Flávio) e, reduzido, o de cada estado em
 * disputa. SVG puro: o `viewBox` é um espaço de coordenadas esticado à caixa
 * (`preserveAspectRatio="none"`), traços fixos por `vector-effect`. Escala do
 * eixo y ajustada ao dado, sempre com a linha dos 50% à vista — num 2º turno os
 * dois nomes orbitam os 50, e um eixo em 0 achataria tudo (por isso não usa o
 * motor do herói de 1º turno, `HeroChart`, ancorado em zero).
 *
 * INTERATIVO (pedido de Iran, 08/10): com `ranges`, um seletor Tudo / 2026 /
 * 90 dias recorta a série desenhada (a média em si não muda — só o trecho
 * visto). Com `interactive`, mover o mouse sobre o gráfico mostra uma guia
 * vertical, um ponto em cada linha e um tooltip com a data e os dois valores;
 * os números grandes (`kpi`) passam a mostrar os valores daquela data e voltam
 * ao atual ao sair. Hover só em ponteiro fino (mouse), como no herói do 1º
 * turno; no toque nada muda. Client component, sem acesso a fs.
 */

export interface SerieConfronto {
  nome: string;
  cor: string;
  /** Valor atual da média, para a legenda e os KPIs. */
  atual: number;
}

export type RecorteEvolucao = "tudo" | "2026" | "90d";

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MES_ABREV = ["JAN", "FEV", "MAR", "ABR", "MAI", "JUN", "JUL", "AGO", "SET", "OUT", "NOV", "DEZ"];
const W = 600;
const RECORTES: { key: RecorteEvolucao; label: string }[] = [
  { key: "tudo", label: "Tudo" },
  { key: "2026", label: "2026" },
  { key: "90d", label: "90 dias" },
];

function isoMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y || 1970, (m || 1) - 1, d || 1);
  return Number.isFinite(t) ? t : 0;
}
function isoMenosDias(iso: string, dias: number): string {
  return new Date(isoMs(iso) - dias * 864e5).toISOString().slice(0, 10);
}
const co = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(2);
const fmtAbrev = (iso: string) => {
  const [y, m, d] = iso.split("-");
  return `${Number(d)} ${MES_ABREV[Number(m) - 1] ?? ""} ${y}`;
};

export default function EvolucaoConfronto({
  points,
  a,
  b,
  compact = false,
  id,
  ranges = false,
  recorteInicial = "2026",
  interactive = false,
  kpi = false,
  spread,
  nota,
}: {
  /** A série COMPLETA; o recorte é feito aqui. */
  points: PontoEvolucao[];
  a: SerieConfronto;
  b: SerieConfronto;
  compact?: boolean;
  /** Prefixo único para os gradientes (vários gráficos na mesma página). */
  id: string;
  /** Mostra o seletor Tudo / 2026 / 90 dias. */
  ranges?: boolean;
  recorteInicial?: RecorteEvolucao;
  /** Hover com guia, pontos e tooltip (só ponteiro fino). */
  interactive?: boolean;
  /** Linha de números grandes acima do gráfico, que seguem o hover. */
  kpi?: boolean;
  /** Vantagem atual de `a` sobre `b` em p.p. (para o KPI; se omitido, calcula). */
  spread?: number;
  /** Nota curta à direita do KPI (ex.: "10 pesquisas · última em …"). */
  nota?: string;
}) {
  const [recorte, setRecorte] = useState<RecorteEvolucao>(ranges ? recorteInicial : "tudo");
  const [hovered, setHovered] = useState<number | null>(null);
  const [hoverable, setHoverable] = useState(false);
  const plotRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!interactive || typeof window === "undefined" || !window.matchMedia) return;
    setHoverable(window.matchMedia("(hover: hover) and (pointer: fine)").matches);
  }, [interactive]);

  const todos = useMemo(() => points.filter((p) => Number.isFinite(p.a) && Number.isFinite(p.b)), [points]);
  const ultimo = todos[todos.length - 1];
  const desde = !ultimo ? null : recorte === "tudo" ? null : recorte === "2026" ? "2026-01-01" : isoMenosDias(ultimo.date, 90);
  const pts = desde ? todos.filter((p) => p.date >= desde) : todos;

  if (pts.length < 2) {
    return (
      <p className="text-sm" style={{ color: "var(--text-muted)" }}>
        Ainda não há pesquisas suficientes deste confronto para traçar a evolução.
      </p>
    );
  }

  const H = compact ? 160 : 260;
  const PAD = 6;
  const xs = pts.map((p) => isoMs(p.date));
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const vals = pts.flatMap((p) => [p.a, p.b]);
  const dmin = Math.min(...vals);
  const dmax = Math.max(...vals);
  const padV = Math.max(3, (dmax - dmin) * 0.25);
  const yMin = Math.max(0, Math.floor(Math.min(dmin - padV, 45)));
  const yMax = Math.min(100, Math.ceil(Math.max(dmax + padV, 55)));
  const xf = (t: number) => (x1 > x0 ? ((t - x0) / (x1 - x0)) * W : W / 2);
  const yf = (v: number) => PAD + (1 - (v - yMin) / (yMax - yMin)) * (H - 2 * PAD);
  const topPct = (v: number) => (yf(v) / H) * 100;
  const leftPct = (i: number) => (xf(xs[i]!) / W) * 100;

  const build = (sel: (p: PontoEvolucao) => number) => {
    const xy = pts.map((p, i) => ({ px: xf(xs[i]!), py: yf(sel(p)) }));
    const line = xy.map((p, i) => `${i ? "L" : "M"}${co(p.px)},${co(p.py)}`).join(" ");
    const area = `${line} L${co(xy[xy.length - 1]!.px)},${co(yf(yMin))} L${co(xy[0]!.px)},${co(yf(yMin))} Z`;
    return { line, area };
  };
  const pa = build((p) => p.a);
  const pb = build((p) => p.b);

  const yTicks: number[] = [];
  const passo = yMax - yMin > 30 ? 10 : 5;
  for (let v = Math.ceil(yMin / passo) * passo; v <= yMax; v += passo) yTicks.push(v);

  // Um rótulo por mês (ou por ano, no recorte "Tudo" longo), no primeiro ponto.
  const porAno = recorte === "tudo" && x1 - x0 > 400 * 864e5;
  const marcas: { leftPct: number; label: string }[] = [];
  let ultimaChave = "";
  pts.forEach((p, i) => {
    const chave = porAno ? p.date.slice(0, 4) : p.date.slice(0, 7);
    if (chave !== ultimaChave) {
      ultimaChave = chave;
      marcas.push({ leftPct: leftPct(i), label: porAno ? p.date.slice(0, 4) : MES[Number(p.date.slice(5, 7)) - 1] ?? "" });
    }
  });
  const maxMarcas = compact ? 4 : 8;
  if (marcas.length > maxMarcas) {
    const passoM = Math.ceil(marcas.length / maxMarcas);
    for (let i = marcas.length - 1; i >= 0; i--) if (i % passoM) marcas.splice(i, 1);
  }

  // Hover: o ponto mais próximo do mouse, em % da largura do plot.
  const ativo = interactive && hoverable && x1 > x0;
  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ativo || !plotRef.current) return;
    const rect = plotRef.current.getBoundingClientRect();
    if (rect.width <= 0) return;
    const pct = ((e.clientX - rect.left) / rect.width) * 100;
    let best = 0;
    let bestD = Infinity;
    for (let i = 0; i < pts.length; i++) {
      const d = Math.abs(leftPct(i) - pct);
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    setHovered(best);
  };
  const hov = ativo && hovered != null && hovered < pts.length ? pts[hovered]! : null;
  const hovX = hov && hovered != null ? leftPct(hovered) : 0;

  // Valores mostrados nos KPIs e na legenda: os do hover, ou os atuais.
  const vA = hov ? hov.a : a.atual;
  const vB = hov ? hov.b : b.atual;
  const vSpread = hov ? hov.a - hov.b : (spread ?? a.atual - b.atual);
  const lider = vSpread >= 0 ? a : b;

  const alturaCls = compact ? "h-[120px]" : "h-[220px] sm:h-[260px]";
  const fonteTick = compact ? "text-[9px]" : "text-[10px]";
  const ultimoPonto = pts[pts.length - 1]!;

  return (
    <div className="flex flex-col gap-2">
      {(kpi || ranges) && (
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
          {kpi ? (
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              {[{ s: a, v: vA }, { s: b, v: vB }].map(({ s, v }) => (
                <div key={s.nome} className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{s.nome}</div>
                  <div className="tabular text-3xl font-bold leading-tight sm:text-4xl" style={{ color: s.cor }}>{fmtPct(v)}%</div>
                </div>
              ))}
              <div className="tabular pb-1 text-sm">
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{fmtSigned(Math.abs(vSpread))} p.p.</span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>para {lider.nome}</span>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {hov ? `média em ${fmtDate(hov.date)}` : nota ?? "média atual"}
                </div>
              </div>
            </div>
          ) : (
            <span />
          )}
          {ranges ? (
            <div role="group" aria-label="Intervalo de tempo do gráfico" className="inline-flex w-fit overflow-hidden rounded-md text-xs" style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}>
              {RECORTES.map((r) => (
                <button
                  key={r.key}
                  type="button"
                  onClick={() => {
                    setRecorte(r.key);
                    setHovered(null);
                  }}
                  aria-pressed={recorte === r.key}
                  className="px-2.5 py-1 transition-colors"
                  style={{ background: recorte === r.key ? "var(--accent)" : "transparent", color: recorte === r.key ? "#fff" : "var(--text-muted)", fontWeight: recorte === r.key ? 600 : 400 }}
                >
                  {r.label}
                </button>
              ))}
            </div>
          ) : null}
        </div>
      )}

      <div className="flex gap-1.5">
        <div className={`relative ${compact ? "w-6" : "w-8"} shrink-0`} aria-hidden="true">
          {yTicks.map((v) => (
            <span key={v} className={`tabular absolute right-0 -translate-y-1/2 ${fonteTick}`} style={{ top: `${topPct(v)}%`, color: "var(--text-muted)" }}>
              {v}%
            </span>
          ))}
        </div>
        <div ref={plotRef} onMouseMove={ativo ? onMove : undefined} onMouseLeave={ativo ? () => setHovered(null) : undefined} className={`relative flex-1 ${alturaCls}`}>
          <svg
            viewBox={`0 0 ${W} ${H}`}
            preserveAspectRatio="none"
            className="absolute inset-0 h-full w-full"
            role="img"
            aria-label={`${a.nome} ${fmtPct(a.atual)}% contra ${b.nome} ${fmtPct(b.atual)}%: evolução da média de 2º turno de ${pts[0]!.date} a ${ultimoPonto.date}.`}
          >
            <defs>
              <linearGradient id={`${id}-a`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={co(yf(yMax))} y2={co(yf(yMin))}>
                <stop offset="0%" stopColor={a.cor} stopOpacity={0.22} />
                <stop offset="100%" stopColor={a.cor} stopOpacity={0.02} />
              </linearGradient>
              <linearGradient id={`${id}-b`} gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={co(yf(yMax))} y2={co(yf(yMin))}>
                <stop offset="0%" stopColor={b.cor} stopOpacity={0.18} />
                <stop offset="100%" stopColor={b.cor} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            {yTicks.map((v) => (
              <line key={v} x1={0} x2={W} y1={co(yf(v))} y2={co(yf(v))} stroke="var(--grid)" strokeWidth={1} vectorEffect="non-scaling-stroke" />
            ))}
            <line x1={0} x2={W} y1={co(yf(50))} y2={co(yf(50))} stroke="var(--axis)" strokeWidth={1} strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
            <path d={pb.area} fill={`url(#${id}-b)`} stroke="none" />
            <path d={pa.area} fill={`url(#${id}-a)`} stroke="none" />
            <path d={pb.line} fill="none" stroke={b.cor} strokeWidth={compact ? 1.8 : 2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
            <path d={pa.line} fill="none" stroke={a.cor} strokeWidth={compact ? 1.8 : 2.2} strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>

          {/* Rótulos do último ponto, na borda direita (somem durante o hover). */}
          {!hov &&
            [{ s: a, v: ultimoPonto.a }, { s: b, v: ultimoPonto.b }].map(({ s, v }) => (
              <span
                key={s.nome}
                className={`tabular pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1 font-bold ${compact ? "text-[10px]" : "text-xs"}`}
                style={{ top: `${topPct(v)}%`, color: s.cor, background: "var(--surface-1)" }}
              >
                {fmtPct(v)}%
              </span>
            ))}

          {hov && (
            <>
              <div aria-hidden="true" className="pointer-events-none absolute inset-y-0 w-0 border-l" style={{ left: `${hovX}%`, borderColor: "var(--axis)" }} />
              {[{ s: a, v: hov.a }, { s: b, v: hov.b }].map(({ s, v }) => (
                <span
                  key={`dot-${s.nome}`}
                  aria-hidden="true"
                  className="pointer-events-none absolute h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full"
                  style={{ left: `${hovX}%`, top: `${topPct(v)}%`, background: s.cor, boxShadow: "0 0 0 1.5px var(--surface-1)" }}
                />
              ))}
              <div
                className="pointer-events-none absolute z-[1] top-1/2 flex -translate-y-1/2 flex-col rounded-md border px-2 py-1.5 text-[11px] shadow-sm"
                style={{ ...(hovX > 55 ? { right: `${Math.min(30, 100 - hovX)}%` } : { left: `${Math.min(30, hovX)}%` }), borderColor: "var(--ring)", background: "var(--surface-1)" }}
              >
                <div className="mb-0.5 font-semibold" style={{ color: "var(--text-muted)" }}>{fmtAbrev(hov.date)}</div>
                <ul className="flex flex-col gap-0.5">
                  {[{ s: a, v: hov.a }, { s: b, v: hov.b }]
                    .sort((x, y) => y.v - x.v)
                    .map(({ s, v }) => (
                      <li key={`tt-${s.nome}`} className="flex items-center gap-1.5">
                        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.cor }} />
                        <span style={{ color: "var(--text-secondary)" }}>{s.nome}</span>
                        <span className="tabular ml-auto pl-3 font-semibold" style={{ color: "var(--text-primary)" }}>{fmtPct(v)}%</span>
                      </li>
                    ))}
                  <li className="mt-0.5 flex items-center gap-1.5 border-t pt-0.5" style={{ borderColor: "var(--grid)", color: "var(--text-muted)" }}>
                    <span>vantagem</span>
                    <span className="tabular ml-auto pl-3 font-semibold" style={{ color: "var(--text-primary)" }}>{fmtSigned(Math.abs(hov.a - hov.b))}</span>
                  </li>
                </ul>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className={`${compact ? "w-6" : "w-8"} shrink-0`} aria-hidden="true" />
        <div className="relative h-3 flex-1">
          {marcas.map((t, i) => (
            <span
              key={`${t.label}-${i}`}
              className={`absolute ${fonteTick} uppercase tracking-wide`}
              style={{ left: `${t.leftPct}%`, transform: t.leftPct > 90 ? "translateX(-100%)" : t.leftPct < 5 ? "none" : "translateX(-50%)", color: "var(--text-muted)" }}
            >
              {t.label}
            </span>
          ))}
        </div>
      </div>
      <div className={`flex flex-wrap items-center justify-between gap-x-4 gap-y-1 ${compact ? "text-[11px]" : "text-sm"}`} style={{ color: "var(--text-secondary)" }}>
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {[{ s: a, v: vA }, { s: b, v: vB }].map(({ s, v }) => (
            <span key={s.nome} className="flex items-center gap-1.5">
              <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.cor }} />
              <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{s.nome}</span>
              <span className="tabular font-bold" style={{ color: s.cor }}>{fmtPct(v)}%</span>
            </span>
          ))}
        </div>
        {!compact ? (
          <span className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {desde ? `Série desde ${fmtDate(pts[0]!.date)}` : `Toda a série, desde ${fmtDate(pts[0]!.date)}`}
            {interactive ? " · passe o mouse para ver a média em cada data" : ""}
          </span>
        ) : null}
      </div>
    </div>
  );
}
