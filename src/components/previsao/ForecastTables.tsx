// Tabela e faixas de uma disputa — usadas na /previsao e na página da disputa.
import { colorMap, colorOf } from "@/lib/colors";
import { fmtPct } from "@/lib/format";
import { casasPara, type Snapshot } from "@/lib/forecast";
import { IntervalStrip } from "./ForecastCharts";

/** Um número do modelo com a precisão que o intervalo permite (sem falsa precisão). */
export function Faixa({ q }: { q: Record<string, number> }) {
  const c = casasPara(q["0.1"], q["0.9"]);
  return (
    <span className="tabular whitespace-nowrap">
      <strong>{fmtPct(q["0.5"], c)}%</strong>{" "}
      <span style={{ color: "var(--text-muted)" }}>
        ({fmtPct(q["0.1"], c)}–{fmtPct(q["0.9"], c)})
      </span>
    </span>
  );
}

export function TabelaNumeros({ s }: { s: Snapshot }) {
  const colors = colorMap(s.candidates.map((c) => c.name));
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            <th className="py-1 pr-2 font-semibold">Candidato</th>
            <th className="py-1 pr-2 font-semibold">1º turno (TSE)</th>
            <th className="py-1 pr-2 font-semibold">Média das pesquisas</th>
            <th className="py-1 pr-2 font-semibold">Estimativa atual</th>
            <th className="py-1 font-semibold">Projeção para 25/10{s.status.projection === "experimental" ? " *" : ""}</th>
          </tr>
        </thead>
        <tbody>
          {s.candidates.map((c, k) => {
            const avg = s.site_average?.candidates.find((x) => x.candidate_id === c.candidate_id)?.avg ?? null;
            const now = s.nowcast?.summary[k];
            const proj = s.projection?.summary[k];
            return (
              <tr key={c.candidate_id} className="border-t" style={{ borderColor: "var(--grid)" }}>
                <td className="py-1.5 pr-2 font-semibold" style={{ color: "var(--text-primary)" }}>
                  <span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: colorOf(colors, c.name) }} />
                  {c.name}
                </td>
                <td className="tabular py-1.5 pr-2" style={{ color: "var(--text-secondary)" }}>{fmtPct(c.first_round_pct)}%</td>
                <td className="tabular py-1.5 pr-2">{avg != null ? `${fmtPct(avg)}%` : "—"}</td>
                <td className="py-1.5 pr-2">{now ? <Faixa q={now.quantiles} /> : "—"}</td>
                <td className="py-1.5">{proj ? <Faixa q={proj.quantiles} /> : <span style={{ color: "var(--text-muted)" }}>retida</span>}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
        Votos válidos. Entre parênteses, o intervalo de 80%. A média das pesquisas é o número publicado pelo site; as duas colunas à direita são do modelo.
        {s.status.projection === "experimental" ? " * Projeção experimental: o erro sistemático do 2º turno é emprestado do 1º turno, sem validação própria." : ""}
      </p>
    </div>
  );
}

export function Faixas({ s }: { s: Snapshot }) {
  const colors = colorMap(s.candidates.map((c) => c.name));
  const vals = s.candidates.flatMap((_, k) => [
    s.projection?.summary[k]?.quantiles["0.025"] ?? s.nowcast?.summary[k]?.quantiles["0.1"] ?? 50,
    s.projection?.summary[k]?.quantiles["0.975"] ?? s.nowcast?.summary[k]?.quantiles["0.9"] ?? 50,
  ]);
  const lo = Math.max(0, Math.floor((Math.min(...vals) - 2) / 5) * 5);
  const hi = Math.min(100, Math.ceil((Math.max(...vals) + 2) / 5) * 5);
  return (
    <IntervalStrip
      lo={lo}
      hi={hi}
      fifty={s.round === 2}
      rows={s.candidates.map((c, k) => {
        const n = s.nowcast?.summary[k]?.quantiles;
        const p = s.projection?.summary[k]?.quantiles;
        return {
          label: c.name,
          color: colorOf(colors, c.name),
          avg: s.site_average?.candidates.find((x) => x.candidate_id === c.candidate_id)?.avg ?? null,
          now: n ? [n["0.1"], n["0.5"], n["0.9"]] : null,
          proj: p ? [p["0.025"], p["0.1"], p["0.5"], p["0.9"], p["0.975"]] : null,
          experimental: s.status.projection !== "publicada",
        };
      })}
    />
  );
}

