import { shortName } from "@/lib/names";
import { fmtSigned } from "@/lib/format";
import type { HouseEffectsData, HouseEffectCell } from "@/lib/houseEffects";

/**
 * "Efeito casa" — quanto cada instituto tende a super/subestimar cada candidato
 * ante a média das pesquisas (leave-one-out; ver `lib/houseEffects.ts`). Matriz
 * instituto × candidato, tom divergente por direção (não por "bom/ruim"):
 * azul = superestima, laranja = subestima, intensidade ~ magnitude. Descritivo —
 * a nota deixa claro que desvio sistemático pode ser metodologia, não fraude.
 * Server component: uma foto do dado de build.
 */

function tint(effect: number): { bg: string; fg: string; weight: string } {
  if (Math.abs(effect) < 0.5) return { bg: "transparent", fg: "var(--text-muted)", weight: "400" };
  const mag = Math.min(Math.abs(effect), 4) / 4; // satura em 4 p.p.
  const a = (0.08 + mag * 0.24).toFixed(2);
  const rgb = effect > 0 ? "26,143,76" /* verde */ : "226,98,15" /* laranja */;
  return { bg: `rgba(${rgb},${a})`, fg: "var(--text-primary)", weight: "600" };
}

// ── Gráfico de barras divergentes (por candidato) ───────────────────────────
// O padrão de efeito casa: cada instituto uma barra saindo do zero, azul para a
// direita (superestima) / laranja para a esquerda (subestima), comprimento ~
// magnitude. Escala COMPARTILHADA entre os dois gráficos, para que "quem desvia
// mais" seja comparável entre candidatos, não achatado por candidato.
function DivergingBars({
  candidate,
  rows,
  maxAbs,
}: {
  candidate: string;
  rows: { pollster: string; effect: number }[];
  maxAbs: number;
}) {
  return (
    <div className="min-w-0">
      <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {shortName(candidate)}
      </div>
      <div className="mt-2 flex flex-col gap-1">
        {rows.map((r) => {
          const w = (Math.min(Math.abs(r.effect), maxAbs) / maxAbs) * 50;
          const pos = r.effect >= 0;
          const color = pos ? "var(--cand-green)" : "rgb(226,98,15)";
          return (
            <div key={r.pollster} className="flex items-center gap-2">
              <div className="w-[84px] shrink-0 truncate text-right text-xs" style={{ color: "var(--text-secondary)" }} title={r.pollster}>
                {r.pollster}
              </div>
              <div className="relative h-3.5 flex-1 rounded-sm" style={{ background: "var(--grid)" }}>
                <div
                  className="absolute top-0 bottom-0"
                  style={pos ? { left: "50%", width: `${w}%`, background: color } : { right: "50%", width: `${w}%`, background: color }}
                />
                <div className="absolute inset-y-0 left-1/2 w-px" style={{ background: "var(--text-muted)", opacity: 0.5 }} />
              </div>
              <div className="w-9 shrink-0 text-right text-xs tabular" style={{ color: "var(--text-secondary)" }}>
                {Math.abs(r.effect) < 0.5 ? "≈0" : fmtSigned(r.effect)}
              </div>
            </div>
          );
        })}
      </div>
      <div className="mt-1 flex items-center gap-2 text-[10px]" style={{ color: "var(--text-muted)" }}>
        <span className="w-[84px] shrink-0" />
        <span className="flex flex-1 justify-between">
          <span>−{maxAbs}</span>
          <span>0</span>
          <span>+{maxAbs}</span>
        </span>
        <span className="w-9 shrink-0" />
      </div>
    </div>
  );
}

function Cell({ cell }: { cell: HouseEffectCell | null }) {
  if (!cell) {
    return (
      <td className="px-2 py-1.5 text-center text-xs" style={{ color: "var(--text-muted)" }} aria-label="sem base">
        —
      </td>
    );
  }
  const t = tint(cell.effect);
  return (
    <td
      className="px-2 py-1.5 text-center text-sm tabular"
      style={{ background: t.bg, color: t.fg, fontWeight: t.weight }}
      title={`${cell.n} observação(ões)`}
    >
      {Math.abs(cell.effect) < 0.5 ? "≈0" : fmtSigned(cell.effect)}
    </td>
  );
}

export default function HouseEffects({ data, title = "Efeito casa" }: { data: HouseEffectsData; title?: string }) {
  if (!data.pollsters.length) return null;

  // Gráficos divergentes para os dois primeiros candidatos (os líderes por
  // média), com escala compartilhada para serem comparáveis entre si.
  const chartCols = data.candidates.slice(0, 2);
  const charts = chartCols.map((col, i) => ({
    candidate: col.candidate,
    rows: data.pollsters
      .map((p) => ({ pollster: p.pollster, cell: p.cells[i] }))
      .filter((r): r is { pollster: string; cell: HouseEffectCell } => r.cell !== null)
      .map((r) => ({ pollster: r.pollster, effect: r.cell.effect }))
      .sort((a, b) => b.effect - a.effect),
  })).filter((c) => c.rows.length > 0);
  const chartMax = Math.max(
    2,
    Math.ceil(Math.max(0, ...charts.flatMap((c) => c.rows.map((r) => Math.abs(r.effect))))),
  );

  const CellLegend = () => (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(26,143,76,0.32)" }} /> superestima
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(226,98,15,0.32)" }} /> subestima
      </span>
    </div>
  );

  return (
    <>
      <section className="card mt-6 p-4 sm:p-6" aria-label="Efeito casa dos institutos">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {title}
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Quanto cada instituto tende a <strong style={{ color: "var(--text-primary)" }}>super</strong> ou{" "}
          <strong style={{ color: "var(--text-primary)" }}>subestimar</strong> cada candidato ante a média das
          demais pesquisas, em pontos percentuais. Corrida presidencial, 1º turno.
        </p>

        <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse text-sm">
          <thead>
            <tr style={{ color: "var(--text-muted)" }}>
              <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide">Instituto</th>
              {data.candidates.map((c) => (
                <th key={c.candidate} className="px-2 py-1.5 text-center text-xs font-semibold" title={c.candidate}>
                  {shortName(c.candidate)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.pollsters.map((row) => (
              <tr key={row.pollster} className="border-t" style={{ borderColor: "var(--ring)" }}>
                <td className="px-2 py-1.5 text-left">
                  <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                    {row.pollster}
                  </span>
                  <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                    {row.nPolls} pesq.
                  </span>
                </td>
                {row.cells.map((cell, i) => (
                  <Cell key={i} cell={cell} />
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <CellLegend />
          <span>— = sem base suficiente</span>
        </div>
        <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
          Desvio sistemático pode refletir metodologia legítima (amostragem, modo de coleta), não fraude. Média
          excluindo o próprio instituto (leave-one-out), pela mesma regra de janela do site.
        </p>
      </section>

      {charts.length > 0 && (
        <section className="card mt-6 p-4 sm:p-6" aria-label="Efeito casa por candidato líder">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Efeito casa · por candidato líder
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            O quanto cada instituto desvia da média nos dois primeiros colocados. Barra à direita superestima, à
            esquerda subestima; escala compartilhada entre os dois.
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {charts.map((c) => (
              <DivergingBars key={c.candidate} candidate={c.candidate} rows={c.rows} maxAbs={chartMax} />
            ))}
          </div>
          <div className="mt-3">
            <CellLegend />
          </div>
        </section>
      )}
    </>
  );
}
