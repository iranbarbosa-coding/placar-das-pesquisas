import { fmtPct } from "@/lib/format";
import type { RunoffSide, RunoffSimRow } from "@/lib/estado";

/**
 * "Todas as simulações de 2º turno" — a compact list, one bipolar bar per polled
 * matchup, ranked 1st-vs-others first (see `stateRunoff`). Each candidate keeps
 * their own identity colour. Server component: a picture of build-time data.
 */

function Bipolar({ a, b }: { a: RunoffSide; b: RunoffSide }) {
  const sum = (Number.isFinite(a.pct) ? a.pct : 0) + (Number.isFinite(b.pct) ? b.pct : 0);
  const left = sum > 0 ? Math.max(0, Math.min(100, (a.pct / sum) * 100)) : 50;
  return (
    <div className="relative h-2 w-full overflow-hidden rounded-full" role="img" aria-hidden="true" style={{ background: "var(--grid)" }}>
      <div className="absolute inset-y-0 left-0" style={{ width: `${left}%`, background: a.color }} />
      <div className="absolute inset-y-0 right-0" style={{ width: `${100 - left}%`, background: b.color }} />
      {/* A clear card-coloured gap AT THE SPLIT keeps the two sides legible even
          when the candidates' own colours are close (e.g. red vs orange). */}
      <div className="absolute inset-y-0 -translate-x-1/2" style={{ left: `${left}%`, width: 3, background: "var(--surface-1)" }} />
    </div>
  );
}

export default function RunoffSims({ rows, title = "Todas as simulações de 2º turno" }: { rows: RunoffSimRow[]; title?: string }) {
  return (
    <section className="card min-w-0 p-4 sm:p-6">
      <h3 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h3>
      {rows.length ? (
        <ul className="mt-3 flex flex-col gap-3">
          {rows.map((r, i) => (
            <li key={i} className="flex flex-col gap-1.5">
              {/* Full names on their own line so neither candidate is ever cut. */}
              <div className="text-sm" style={{ color: "var(--text-primary)" }}>
                <span className="font-semibold">{r.a.name}</span>
                <span style={{ color: "var(--text-muted)" }}> vs </span>
                <span className="font-semibold">{r.b.name}</span>
              </div>
              {/* Shares at the ends of the bar. */}
              <div className="flex items-center gap-2">
                <span className="tabular shrink-0 text-xs font-bold" style={{ color: r.a.color }}>
                  {fmtPct(r.a.pct)}%
                </span>
                <div className="min-w-0 flex-1">
                  <Bipolar a={r.a} b={r.b} />
                </div>
                <span className="tabular shrink-0 text-xs font-bold" style={{ color: r.b.color }}>
                  {fmtPct(r.b.pct)}%
                </span>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Ainda não há simulações de 2º turno com pesquisas suficientes.
        </p>
      )}
      <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
        A barra mostra a distribuição dos votos válidos entre os dois nomes.
      </p>
    </section>
  );
}
