"use client";

import { useState } from "react";
import Link from "next/link";
import { shortName } from "@/lib/names";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { HouseEffectsData, HouseEffectCell, PollsterEffect } from "@/lib/houseEffects";

/**
 * "Efeito casa" — quanto cada instituto tende a super/subestimar cada candidato.
 * DUAS BASES, alternadas por um toggle (pedido de Iran, 08/10/2026):
 *  · contra a MÉDIA das demais pesquisas (leave-one-out; `houseEffects`), a
 *    versão de sempre, disponível durante toda a campanha;
 *  · contra o RESULTADO oficial do 1º turno (`houseEffectsVsResultado`): o
 *    desvio das pesquisas do último mês de campo para o que a urna deu.
 * Matriz instituto × candidato, tom divergente por direção (não por "bom/ruim"):
 * azul = superestima, laranja = subestima, intensidade ~ magnitude. Descritivo —
 * a nota deixa claro que desvio sistemático pode ser metodologia, não fraude.
 * Client component só pelo toggle; todo o dado chega pronto do servidor.
 */

type Base = "media" | "resultado";

function tint(effect: number): { bg: string; fg: string; weight: string } {
  if (Math.abs(effect) < 0.5) return { bg: "transparent", fg: "var(--text-muted)", weight: "400" };
  const mag = Math.min(Math.abs(effect), 4) / 4; // satura em 4 p.p.
  const a = (0.08 + mag * 0.24).toFixed(2);
  const rgb = effect > 0 ? "37,99,235" /* azul */ : "226,98,15" /* laranja */;
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

// Legenda de cor. `posRgb` define a cor da direção "superestima" — azul na
// matriz (original), verde no card do gráfico.
function CellLegend({ posRgb = "37,99,235" }: { posRgb?: string }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: `rgba(${posRgb},0.32)` }} /> superestima
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="inline-block h-3 w-3 rounded-sm" style={{ background: "rgba(226,98,15,0.32)" }} /> subestima
      </span>
    </div>
  );
}

function MatrixTable({
  candidates,
  pollsters,
  resultado,
}: {
  candidates: { candidate: string; party: string | null }[];
  pollsters: PollsterEffect[];
  /** No modo resultado: a linha de referência (o que a urna deu), por coluna. */
  resultado?: { candidate: string; pct: number }[];
}) {
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full min-w-[520px] border-collapse text-sm">
        <thead>
          <tr style={{ color: "var(--text-muted)" }}>
            <th className="px-2 py-1.5 text-left text-xs font-semibold uppercase tracking-wide">Instituto</th>
            {candidates.map((c) => (
              <th key={c.candidate} className="px-2 py-1.5 text-center text-xs font-semibold" title={c.candidate}>
                {shortName(c.candidate)}
              </th>
            ))}
          </tr>
          {resultado ? (
            <tr className="border-t" style={{ borderColor: "var(--ring)", color: "var(--text-secondary)" }}>
              <th className="px-2 py-1.5 text-left text-xs font-semibold">Resultado (TSE, válidos)</th>
              {candidates.map((c) => (
                <th key={c.candidate} className="px-2 py-1.5 text-center text-xs font-semibold tabular">
                  {fmtPct(resultado.find((r) => r.candidate === c.candidate)?.pct ?? 0)}%
                </th>
              ))}
            </tr>
          ) : null}
        </thead>
        <tbody>
          {pollsters.map((row) => (
            <tr key={row.pollster} className="border-t" style={{ borderColor: "var(--ring)" }}>
              <td className="px-2 py-1.5 text-left">
                <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                  {row.pollster}
                </span>
                <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {row.nPolls} pesq.
                </span>
              </td>
              {row.cells.slice(0, candidates.length).map((cell, i) => (
                <Cell key={i} cell={cell} />
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/** O toggle de base: média × resultado do 1º turno. Só aparece quando há dado de resultado. */
function BaseToggle({ base, onChange }: { base: Base; onChange: (b: Base) => void }) {
  const opts: { key: Base; label: string }[] = [
    { key: "media", label: "vs média" },
    { key: "resultado", label: "vs resultado 1º turno" },
  ];
  return (
    <div role="group" aria-label="Base de comparação do viés" className="inline-flex w-fit overflow-hidden rounded-md text-xs" style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}>
      {opts.map((o) => (
        <button
          key={o.key}
          type="button"
          onClick={() => onChange(o.key)}
          aria-pressed={base === o.key}
          className="px-2.5 py-1 transition-colors"
          style={{ background: base === o.key ? "var(--accent)" : "transparent", color: base === o.key ? "#fff" : "var(--text-muted)", fontWeight: base === o.key ? 600 : 400 }}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

function Descricao({ base, data, compact }: { base: Base; data: HouseEffectsData; compact: boolean }) {
  if (base === "resultado") {
    return (
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Quanto cada instituto <strong style={{ color: "var(--text-primary)" }}>super</strong> ou{" "}
        <strong style={{ color: "var(--text-primary)" }}>subestimou</strong> cada candidato ante o{" "}
        <strong style={{ color: "var(--text-primary)" }}>resultado oficial do 1º turno</strong> (TSE, votos válidos), em p.p.,
        nas pesquisas com campo {data.janela ? `de ${fmtDate(data.janela.desde)} a ${fmtDate(data.janela.ate)}` : "do último mês"}
        {compact ? "." : " — média dos desvios de cada pesquisa do instituto. Uma pesquisa de semanas antes mede um eleitorado que ainda se moveu; isso aparece aqui como desvio."}
      </p>
    );
  }
  return (
    <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
      Quanto cada instituto tende a <strong style={{ color: "var(--text-primary)" }}>super</strong> ou{" "}
      <strong style={{ color: "var(--text-primary)" }}>subestimar</strong> cada candidato ante a média das demais pesquisas
      {compact ? " (p.p.). 1º turno presidencial." : ", em pontos percentuais. Corrida presidencial, 1º turno."}
    </p>
  );
}

export default function HouseEffects({
  data,
  dataResultado = null,
  title = "Efeito casa",
  compact = false,
  maxRows,
  href = "/institutos",
  hideLegendNote = false,
  baseInicial = "media",
}: {
  /** Viés contra a média das demais pesquisas. */
  data: HouseEffectsData;
  /** Viés contra o resultado oficial do 1º turno; null/omitido = sem toggle. */
  dataResultado?: HouseEffectsData | null;
  title?: string;
  /** Versão enxuta (só a matriz, sem gráfico) para a home. */
  compact?: boolean;
  /** Limita as linhas às `maxRows` de maior magnitude (já vêm ordenadas). */
  maxRows?: number;
  /** Destino do "análise completa" no modo compacto. */
  href?: string;
  /** Oculta a legenda de cor + a nota de método na matriz — quando a página já
   *  as mostra em outro lugar (ex.: a faixa "Como ler"). */
  hideLegendNote?: boolean;
  baseInicial?: Base;
}) {
  const temResultado = !!dataResultado && dataResultado.pollsters.length > 0;
  const [base, setBase] = useState<Base>(temResultado ? baseInicial : "media");
  const ativo = base === "resultado" && temResultado ? dataResultado! : data;
  if (!data.pollsters.length && !temResultado) return null;

  const toggle = temResultado ? <BaseToggle base={base} onChange={setBase} /> : null;

  if (compact) {
    // Home: os institutos MAIS ATIVOS (maior nº de pesquisas), não os de maior
    // desvio — a ordem da análise completa fica em /institutos.
    const rows = [...ativo.pollsters]
      .sort((a, b) => b.nPolls - a.nPolls || b.magnitude - a.magnitude)
      .slice(0, maxRows ?? 10);
    return (
      <section className="card p-4 sm:p-6" aria-label="Efeito casa dos institutos">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {title}
          </h2>
          {toggle}
        </div>
        <Descricao base={base} data={ativo} compact />
        <MatrixTable candidates={ativo.candidates} pollsters={rows} resultado={base === "resultado" ? ativo.resultado : undefined} />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
          <CellLegend />
          <Link href={href} className="font-semibold" style={{ color: "var(--accent)" }}>
            Análise completa <span aria-hidden="true">→</span>
          </Link>
        </div>
      </section>
    );
  }

  // Gráficos divergentes para os dois primeiros candidatos (os líderes por
  // média), com escala compartilhada para serem comparáveis entre si.
  const chartCols = ativo.candidates.slice(0, 2);
  const charts = chartCols
    .map((col, i) => ({
      candidate: col.candidate,
      rows: ativo.pollsters
        .map((p) => ({ pollster: p.pollster, cell: p.cells[i] }))
        .filter((r): r is { pollster: string; cell: HouseEffectCell } => r.cell !== null)
        .map((r) => ({ pollster: r.pollster, effect: r.cell.effect }))
        .sort((a, b) => b.effect - a.effect),
    }))
    .filter((c) => c.rows.length > 0);
  const chartMax = Math.max(
    2,
    Math.ceil(Math.max(0, ...charts.flatMap((c) => c.rows.map((r) => Math.abs(r.effect))))),
  );

  return (
    <>
      <section className="card mt-6 p-4 sm:p-6" aria-label="Efeito casa dos institutos">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            {title}
          </h2>
          {toggle}
        </div>
        <Descricao base={base} data={ativo} compact={false} />

        <MatrixTable candidates={ativo.candidates} pollsters={ativo.pollsters} resultado={base === "resultado" ? ativo.resultado : undefined} />

        {!hideLegendNote && (
          <>
            <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
              <CellLegend />
              <span>— = sem base suficiente</span>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
              Desvio sistemático pode refletir metodologia legítima (amostragem, modo de coleta), não fraude.{" "}
              {base === "resultado"
                ? "Referência: o percentual de votos válidos de cada candidato no 1º turno (TSE), nas pesquisas do último mês de campo."
                : "Média excluindo o próprio instituto (leave-one-out), pela mesma regra de janela do site."}
            </p>
          </>
        )}
        {hideLegendNote && base === "resultado" ? (
          <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
            Referência: o percentual de votos válidos de cada candidato no 1º turno (TSE), nas pesquisas do último mês de campo. — = sem base
            suficiente.
          </p>
        ) : null}
        <p className="mt-4 border-t pt-3 text-sm" style={{ borderColor: "var(--grid)" }}>
          <a
            href="/comprovacao-efeito-casa.pdf"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold"
            style={{ color: "var(--accent)" }}
          >
            Comprovação matemática e reprodução independente (PDF) <span aria-hidden="true">→</span>
          </a>
        </p>
      </section>

      {charts.length > 0 && (
        <section className="card mt-6 p-4 sm:p-6" aria-label="Efeito casa por candidato líder">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Efeito casa · por candidato líder
          </h2>
          <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
            O quanto cada instituto desvia {base === "resultado" ? "do resultado oficial" : "da média"} nos dois primeiros colocados.
            Barra à direita superestima, à esquerda subestima; escala compartilhada entre os dois.
          </p>
          <div className="mt-4 grid gap-6 sm:grid-cols-2">
            {charts.map((c) => (
              <DivergingBars key={c.candidate} candidate={c.candidate} rows={c.rows} maxAbs={chartMax} />
            ))}
          </div>
          <div className="mt-3">
            <CellLegend posRgb="26,143,76" />
          </div>
        </section>
      )}
    </>
  );
}
