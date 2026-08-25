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
  const rgb = effect > 0 ? "37,99,235" /* azul */ : "226,98,15" /* laranja */;
  return { bg: `rgba(${rgb},${a})`, fg: "var(--text-primary)", weight: "600" };
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
  return (
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

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(37,99,235,0.32)" }} /> superestima
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(226,98,15,0.32)" }} /> subestima
        </span>
        <span>— = sem base suficiente</span>
      </div>
      <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Desvio sistemático pode refletir metodologia legítima (amostragem, modo de coleta), não fraude. Média
        excluindo o próprio instituto (leave-one-out), pela mesma regra de janela do site.
      </p>
    </section>
  );
}
