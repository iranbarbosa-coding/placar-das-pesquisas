// Gráficos da Previsão Estatística — SVG renderizado no servidor, só com tokens.
//
// Convenção visual (a mesma em toda a seção, e dita na legenda de cada gráfico):
//   · FATO (o que as pesquisas mediram): pontos/quadrados vazados, cinza ou na
//     cor do candidato com opacidade baixa;
//   · MODELO (estimativa): faixas sólidas preenchidas e linha da mediana;
//   · PROJEÇÃO experimental: faixa hachurada, nunca sólida.
// Nenhum gráfico aqui é interativo: o valor padrão já está todo na tela.
import { fmtDate, fmtPct } from "@/lib/format";

const W = 640;

function ticks(lo: number, hi: number, step: number): number[] {
  const out: number[] = [];
  for (let v = Math.ceil(lo / step) * step; v <= hi + 1e-9; v += step) out.push(Math.round(v * 10) / 10);
  return out;
}

const day = (iso: string) => Date.parse(`${iso}T00:00:00Z`) / 864e5;

export interface SeriesPoint {
  date: string;
  values: { q10: number; median: number; q90: number }[];
}

/**
 * Evolução da ESTIMATIVA ATUAL (faixa de 80% + mediana) com as pesquisas por cima.
 * Mostra as frações de todos os candidatos acompanhados; com dois, as linhas são
 * espelhadas em torno de 50%.
 */
export function NowcastChart({
  series,
  polls,
  labels,
  colors,
  title,
}: {
  series: SeriesPoint[];
  polls: { fieldwork_end: string | null; shares: number[]; pollster: string }[];
  labels: string[];
  colors: string[];
  title: string;
}) {
  if (series.length < 2) return null;
  const H = 260, L = 40, R = 12, T = 12, B = 28;
  const d0 = day(series[0].date), d1 = day(series[series.length - 1].date);
  const all = series.flatMap((p) => p.values.flatMap((v) => [v.q10, v.q90]))
    .concat(polls.flatMap((p) => p.shares));
  const lo = Math.max(0, Math.floor((Math.min(...all) - 2) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...all) + 2) / 5) * 5);
  const x = (iso: string) => L + ((day(iso) - d0) / Math.max(1, d1 - d0)) * (W - L - R);
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
  const yt = ticks(lo, hi, hi - lo > 30 ? 10 : 5);
  const months = (() => {
    const out: string[] = [];
    const s = new Date(series[0].date + "T00:00:00Z");
    for (let m = new Date(Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, 1)); +m / 864e5 <= d1; m = new Date(Date.UTC(m.getUTCFullYear(), m.getUTCMonth() + 1, 1))) {
      out.push(m.toISOString().slice(0, 10));
    }
    return out;
  })();
  const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={title}>
        {yt.map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--grid)" strokeWidth={v === 50 ? 1.5 : 1} strokeDasharray={v === 50 ? "4 3" : undefined} />
            <text x={L - 6} y={y(v) + 4} fontSize="11" textAnchor="end" fill="var(--text-muted)">{v}%</text>
          </g>
        ))}
        {months.map((m) => (
          <text key={m} x={x(m)} y={H - 8} fontSize="11" textAnchor="middle" fill="var(--text-muted)">
            {MES[Number(m.slice(5, 7)) - 1]}
          </text>
        ))}
        {labels.map((_, k) => {
          const band =
            series.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.values[k].q90).toFixed(1)}`).join("") +
            [...series].reverse().map((p) => `L${x(p.date).toFixed(1)},${y(p.values[k].q10).toFixed(1)}`).join("") + "Z";
          const line = series.map((p, i) => `${i ? "L" : "M"}${x(p.date).toFixed(1)},${y(p.values[k].median).toFixed(1)}`).join("");
          return (
            <g key={k}>
              <path d={band} fill={colors[k]} fillOpacity={0.18} stroke="none" />
              <path d={line} fill="none" stroke={colors[k]} strokeWidth={2.2} />
            </g>
          );
        })}
        {polls.map((p, i) =>
          p.fieldwork_end && day(p.fieldwork_end) >= d0
            ? p.shares.slice(0, labels.length).map((v, k) => (
                <circle key={`${i}-${k}`} cx={x(p.fieldwork_end!)} cy={y(v)} r={2.6} fill="var(--surface-1)" stroke={colors[k]} strokeOpacity={0.75} strokeWidth={1.2}>
                  <title>{`${p.pollster} · ${fmtDate(p.fieldwork_end)} · ${labels[k]} ${fmtPct(v)}% (pesquisa)`}</title>
                </circle>
              ))
            : null,
        )}
      </svg>
      <figcaption className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Linha = mediana da estimativa do modelo; faixa = intervalo de 80%. Círculos vazados = pesquisas publicadas (votos válidos), o dado observado.
      </figcaption>
    </figure>
  );
}

/** Histograma da distribuição de uma fração (p.p.), com marcas de referência. */
export function DistributionChart({
  histogram,
  color,
  label,
  marks,
  experimental,
}: {
  histogram: { bin_pp: number; start_pp: number; counts: number[] };
  color: string;
  label: string;
  marks: { at: number; text: string; kind: "fato" | "ref" }[];
  experimental: boolean;
}) {
  const H = 150, L = 12, R = 12, T = 10, B = 26;
  // As caudas t(ν = 3) chegam perto de 0% e 100% com contagens ínfimas; o eixo
  // mostra o 99% central para que a forma da distribuição seja legível.
  const total = histogram.counts.reduce((a, b) => a + b, 0);
  let acc = 0, i0 = 0, i1 = histogram.counts.length - 1;
  for (let i = 0; i < histogram.counts.length; i++) {
    acc += histogram.counts[i];
    if (acc < total * 0.005) i0 = i + 1;
    if (acc <= total * 0.995) i1 = i + 1;
  }
  histogram = { ...histogram, start_pp: histogram.start_pp + i0 * histogram.bin_pp, counts: histogram.counts.slice(i0, Math.min(histogram.counts.length, i1 + 1)) };
  const n = histogram.counts.length;
  if (!n) return null;
  const lo = Math.floor((histogram.start_pp - 2) / 5) * 5;
  const hi = Math.ceil((histogram.start_pp + n * histogram.bin_pp + 2) / 5) * 5;
  const x = (v: number) => L + ((v - lo) / (hi - lo)) * (W - L - R);
  const max = Math.max(...histogram.counts);
  const pid = `hatch-${label.replace(/[^a-z0-9]/gi, "")}`;
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label={`Distribuição simulada de ${label}`}>
        <defs>
          <pattern id={pid} width="5" height="5" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <rect width="5" height="5" fill={color} fillOpacity={0.25} />
            <line x1="0" y1="0" x2="0" y2="5" stroke={color} strokeWidth="2" strokeOpacity={0.7} />
          </pattern>
        </defs>
        {ticks(lo, hi, hi - lo > 30 ? 10 : 5).map((v) => (
          <g key={v}>
            <line x1={x(v)} x2={x(v)} y1={T} y2={H - B} stroke="var(--grid)" />
            <text x={x(v)} y={H - 8} fontSize="11" textAnchor="middle" fill="var(--text-muted)">{v}%</text>
          </g>
        ))}
        {histogram.counts.map((c, i) => {
          const v0 = histogram.start_pp + i * histogram.bin_pp;
          const h = (c / max) * (H - T - B);
          return (
            <rect key={i} x={x(v0)} width={Math.max(0.5, x(v0 + histogram.bin_pp) - x(v0) - 0.4)} y={H - B - h} height={h}
              fill={experimental ? `url(#${pid})` : color} fillOpacity={experimental ? 1 : 0.55} />
          );
        })}
        {marks.map((m, i) => (
          <g key={m.text}>
            <line x1={x(m.at)} x2={x(m.at)} y1={T} y2={H - B} stroke={m.kind === "fato" ? "var(--text-primary)" : "var(--text-muted)"} strokeWidth={1.5} strokeDasharray={m.kind === "ref" ? "4 3" : undefined} />
            <text x={x(m.at) + 4} y={T + 10 + i * 14} fontSize="11" fill="var(--text-secondary)" paintOrder="stroke" stroke="var(--surface-1)" strokeWidth={3}>{m.text}</text>
          </g>
        ))}
      </svg>
    </figure>
  );
}

/** Faixa horizontal: média (fato), estimativa atual e projeção na mesma escala. */
export function IntervalStrip({
  rows,
  lo,
  hi,
  fifty,
}: {
  rows: { label: string; color: string; avg: number | null; now: [number, number, number] | null; proj: [number, number, number, number, number] | null; experimental: boolean }[];
  lo: number;
  hi: number;
  fifty: boolean;
}) {
  const RW = 520, L = 14, R = 14;
  const x = (v: number) => L + ((Math.min(hi, Math.max(lo, v)) - lo) / (hi - lo)) * (RW - L - R);
  const rowH = 30;
  const H = rows.length * rowH + 22;
  return (
    <svg viewBox={`0 0 ${RW} ${H}`} className="h-auto w-full max-w-[640px]" role="img" aria-label="Média das pesquisas, estimativa atual e projeção, por candidato">
      {ticks(lo, hi, hi - lo > 40 ? 10 : 5).map((v) => (
        <g key={v}>
          <line x1={x(v)} x2={x(v)} y1={0} y2={H - 18} stroke="var(--grid)" strokeDasharray={fifty && v === 50 ? "4 3" : undefined} strokeWidth={fifty && v === 50 ? 1.5 : 1} />
          <text x={x(v)} y={H - 4} fontSize="10" textAnchor="middle" fill="var(--text-muted)">{v}%</text>
        </g>
      ))}
      {rows.map((r, i) => {
        const cy = i * rowH + 14;
        return (
          <g key={r.label}>
            {r.proj && (
              <>
                <line x1={x(r.proj[0])} x2={x(r.proj[4])} y1={cy} y2={cy} stroke={r.color} strokeOpacity={0.45} strokeWidth={1.5} />
                <rect x={x(r.proj[1])} width={Math.max(1, x(r.proj[3]) - x(r.proj[1]))} y={cy - 9} height={18} fill={r.color} fillOpacity={0.16} stroke={r.color} strokeOpacity={0.5} strokeDasharray={r.experimental ? "3 2" : undefined} rx={3} />
              </>
            )}
            {r.now && (
              <>
                <rect x={x(r.now[0])} width={Math.max(2, x(r.now[2]) - x(r.now[0]))} y={cy - 5} height={10} fill={r.color} fillOpacity={0.85} rx={2} />
                <line x1={x(r.now[1])} x2={x(r.now[1])} y1={cy - 7} y2={cy + 7} stroke="var(--surface-1)" strokeWidth={2} />
              </>
            )}
            {r.avg != null && (
              <rect x={x(r.avg) - 4} y={cy - 4} width={8} height={8} fill="var(--surface-1)" stroke="var(--text-primary)" strokeWidth={1.5} transform={`rotate(45 ${x(r.avg)} ${cy})`}>
                <title>{`${r.label}: média das pesquisas ${fmtPct(r.avg)}%`}</title>
              </rect>
            )}
          </g>
        );
      })}
    </svg>
  );
}

/** Barra empilhada da decomposição da variância da projeção. */
export function VarianceBar({ parts }: { parts: { posterior: number; drift: number; systematic: number } }) {
  const items = [
    { k: "posterior", label: "Incerteza sobre o apoio atual", v: parts.posterior, color: "var(--series-1)" },
    { k: "drift", label: "Mudança de opinião até a eleição", v: parts.drift, color: "var(--series-4)" },
    { k: "systematic", label: "Erro sistemático das pesquisas", v: parts.systematic, color: "var(--series-7)" },
  ];
  return (
    <div>
      <div className="flex h-3 w-full overflow-hidden rounded" role="img" aria-label="Decomposição da variância da projeção">
        {items.map((it) => (
          <div key={it.k} style={{ width: `${it.v * 100}%`, background: it.color }} />
        ))}
      </div>
      <ul className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        {items.map((it) => (
          <li key={it.k} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: it.color }} />
            {it.label}: <span className="tabular font-semibold">{fmtPct(it.v * 100, 0)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** Diagrama de confiabilidade: probabilidade prevista × frequência observada. */
export function ReliabilityChart({
  series,
}: {
  series: { label: string; color: string; bins: { p_mean: number; freq: number; n: number }[] }[];
}) {
  const S = 300, P = 34;
  const x = (v: number) => P + v * (S - P - 10);
  const y = (v: number) => 10 + (1 - v) * (S - P - 10);
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${S} ${S}`} className="h-auto w-full max-w-[360px]" role="img" aria-label="Diagrama de confiabilidade">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={x(0)} x2={x(1)} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <line x1={x(v)} x2={x(v)} y1={y(0)} y2={y(1)} stroke="var(--grid)" />
            <text x={x(v)} y={S - 12} fontSize="10" textAnchor="middle" fill="var(--text-muted)">{v * 100}%</text>
            <text x={P - 4} y={y(v) + 3} fontSize="10" textAnchor="end" fill="var(--text-muted)">{v * 100}%</text>
          </g>
        ))}
        <line x1={x(0)} y1={y(0)} x2={x(1)} y2={y(1)} stroke="var(--text-muted)" strokeDasharray="4 3" />
        {series.map((s) => (
          <g key={s.label}>
            <path d={s.bins.map((b, i) => `${i ? "L" : "M"}${x(b.p_mean)},${y(b.freq)}`).join("")} fill="none" stroke={s.color} strokeWidth={1.8} />
            {s.bins.map((b, i) => (
              <circle key={i} cx={x(b.p_mean)} cy={y(b.freq)} r={2 + Math.sqrt(b.n) * 0.5} fill={s.color} fillOpacity={0.7}>
                <title>{`${s.label}: previsto ${fmtPct(b.p_mean * 100, 0)}%, observado ${fmtPct(b.freq * 100, 0)}% (n = ${b.n})`}</title>
              </circle>
            ))}
          </g>
        ))}
      </svg>
      <figcaption className="text-xs" style={{ color: "var(--text-muted)" }}>
        Eixo horizontal: probabilidade prevista de o candidato terminar em 1º. Vertical: com que frequência terminou. Na diagonal tracejada, a previsão é calibrada. Tamanho do ponto ∝ nº de casos.
      </figcaption>
    </figure>
  );
}

/** Cobertura observada × nominal por horizonte. */
export function CoverageChart({
  horizons,
  series,
}: {
  horizons: number[];
  series: { label: string; color: string; values: (number | null)[]; nominal: number }[];
}) {
  const H = 200, L = 36, R = 10, T = 10, B = 26;
  const x = (i: number) => L + (i / Math.max(1, horizons.length - 1)) * (W - L - R);
  const y = (v: number) => T + (1 - v) * (H - T - B);
  return (
    <figure className="min-w-0">
      <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Cobertura dos intervalos por horizonte">
        {[0, 0.25, 0.5, 0.75, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke="var(--grid)" />
            <text x={L - 4} y={y(v) + 3} fontSize="10" textAnchor="end" fill="var(--text-muted)">{v * 100}%</text>
          </g>
        ))}
        {horizons.map((h, i) => (
          <text key={h} x={x(i)} y={H - 8} fontSize="11" textAnchor="middle" fill="var(--text-muted)">{h} d</text>
        ))}
        {series.map((s) => (
          <g key={s.label}>
            <line x1={L} x2={W - R} y1={y(s.nominal)} y2={y(s.nominal)} stroke={s.color} strokeDasharray="4 3" strokeOpacity={0.6} />
            <path d={s.values.map((v, i) => (v == null ? "" : `${i && s.values[i - 1] != null ? "L" : "M"}${x(i)},${y(v)}`)).join("")} fill="none" stroke={s.color} strokeWidth={2} />
            {s.values.map((v, i) => (v == null ? null : <circle key={i} cx={x(i)} cy={y(v)} r={3} fill={s.color} />))}
          </g>
        ))}
      </svg>
    </figure>
  );
}

/** Histograma PIT (deveria ser plano se a previsão é calibrada). */
export function PitChart({ counts, color }: { counts: number[]; color: string }) {
  const H = 120, L = 8, R = 8, T = 8, B = 20;
  const total = counts.reduce((a, b) => a + b, 0) || 1;
  const max = Math.max(...counts.map((c) => c / total), 1.6 / counts.length);
  const bw = (W - L - R) / counts.length;
  const y = (v: number) => T + (1 - v / max) * (H - T - B);
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full" role="img" aria-label="Histograma PIT">
      {counts.map((c, i) => (
        <rect key={i} x={L + i * bw + 1} width={bw - 2} y={y(c / total)} height={H - B - y(c / total)} fill={color} fillOpacity={0.6} />
      ))}
      <line x1={L} x2={W - R} y1={y(1 / counts.length)} y2={y(1 / counts.length)} stroke="var(--text-muted)" strokeDasharray="4 3" />
      <text x={L} y={H - 4} fontSize="10" fill="var(--text-muted)">0</text>
      <text x={W - R} y={H - 4} fontSize="10" textAnchor="end" fill="var(--text-muted)">1</text>
    </svg>
  );
}
