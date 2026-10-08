import { fmtPct } from "@/lib/format";
import type { PontoEvolucao } from "@/lib/eleicao";

/**
 * O gráfico de área de um confronto de 2º turno: as duas intenções de voto ao
 * longo do tempo, lidas da média móvel do site. É o gráfico que abre a home no
 * modo 2º turno (grande, Lula × Flávio) e, reduzido, o de cada estado em
 * disputa. Server component, SVG puro: o `viewBox` é um espaço de coordenadas
 * esticado à caixa (`preserveAspectRatio="none"`), traços fixos por
 * `vector-effect`. Escala do eixo y ajustada ao dado, sempre com a linha dos
 * 50% à vista — num 2º turno os dois nomes orbitam os 50, e um eixo em 0
 * achataria tudo.
 */

export interface SerieConfronto {
  nome: string;
  cor: string;
  /** Valor atual da média, para a legenda. */
  atual: number;
}

const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const W = 600;

function isoMs(iso: string): number {
  const [y, m, d] = iso.split("-").map(Number);
  const t = Date.UTC(y || 1970, (m || 1) - 1, d || 1);
  return Number.isFinite(t) ? t : 0;
}
const co = (v: number) => (Number.isFinite(v) ? v : 0).toFixed(2);

export default function EvolucaoConfronto({
  points,
  a,
  b,
  compact = false,
  id,
}: {
  points: PontoEvolucao[];
  a: SerieConfronto;
  b: SerieConfronto;
  compact?: boolean;
  /** Prefixo único para os gradientes (vários gráficos na mesma página). */
  id: string;
}) {
  const pts = points.filter((p) => Number.isFinite(p.a) && Number.isFinite(p.b));
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

  // Um rótulo por mês, no primeiro ponto de cada mês.
  const meses: { leftPct: number; label: string }[] = [];
  let ultimo = "";
  pts.forEach((p, i) => {
    const m = p.date.slice(0, 7);
    if (m !== ultimo) {
      ultimo = m;
      meses.push({ leftPct: (xf(xs[i]!) / W) * 100, label: MES[Number(p.date.slice(5, 7)) - 1] ?? "" });
    }
  });
  if (compact && meses.length > 4) {
    const passoM = Math.ceil(meses.length / 4);
    for (let i = meses.length - 1; i >= 0; i--) if (i % passoM) meses.splice(i, 1);
  }

  const alturaCls = compact ? "h-[120px]" : "h-[220px] sm:h-[260px]";
  const fonteTick = compact ? "text-[9px]" : "text-[10px]";
  const ultimoPonto = pts[pts.length - 1]!;

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex gap-1.5">
        <div className={`relative ${compact ? "w-6" : "w-8"} shrink-0`} aria-hidden="true">
          {yTicks.map((v) => (
            <span key={v} className={`tabular absolute right-0 -translate-y-1/2 ${fonteTick}`} style={{ top: `${topPct(v)}%`, color: "var(--text-muted)" }}>
              {v}%
            </span>
          ))}
        </div>
        <div className={`relative flex-1 ${alturaCls}`}>
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
          {/* Rótulos do último ponto, na borda direita, na altura de cada linha. */}
          {[{ s: a, v: ultimoPonto.a }, { s: b, v: ultimoPonto.b }].map(({ s, v }) => (
            <span
              key={s.nome}
              className={`tabular pointer-events-none absolute right-0 -translate-y-1/2 rounded px-1 font-bold ${compact ? "text-[10px]" : "text-xs"}`}
              style={{ top: `${topPct(v)}%`, color: s.cor, background: "var(--surface-1)" }}
            >
              {fmtPct(v)}%
            </span>
          ))}
        </div>
      </div>
      <div className="flex gap-1.5">
        <div className={`${compact ? "w-6" : "w-8"} shrink-0`} aria-hidden="true" />
        <div className="relative h-3 flex-1">
          {meses.map((t, i) => (
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
      <div className={`flex flex-wrap gap-x-4 gap-y-1 ${compact ? "text-[11px]" : "text-sm"}`} style={{ color: "var(--text-secondary)" }}>
        {[a, b].map((s) => (
          <span key={s.nome} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: s.cor }} />
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>{s.nome}</span>
            <span className="tabular font-bold" style={{ color: s.cor }}>{fmtPct(s.atual)}%</span>
          </span>
        ))}
      </div>
    </div>
  );
}
