import { fmtDate, fmtPct } from "@/lib/format";
import type { PollRow } from "@/lib/presidente";

/**
 * Section 2 — the 10 newest polls that make up the first-round average. Server
 * component: a static, dense read of build-time data. The table scrolls inside
 * its own `overflow-x-auto`, never the page.
 */

const TH = "px-2 py-1.5 text-left font-bold uppercase tracking-wide whitespace-nowrap";
const TD = "px-2 py-1.5 whitespace-nowrap align-top";

export default function PresidentLatestPolls({ rows }: { rows: PollRow[] }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        10 últimas pesquisas que compõem a média
      </h2>

      <div className="min-w-0 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead style={{ color: "var(--text-muted)" }}>
            <tr style={{ borderBottom: "1px solid var(--ring)" }}>
              <th className={TH}>#</th>
              <th className={TH}>Data</th>
              <th className={TH}>Instituto</th>
              <th className={`${TH} text-right`}>Amostra</th>
              <th className={TH}>Resultado</th>
              <th className={`${TH} text-right`}>Margem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--grid)" }}>
                <td className={TD} style={{ color: "var(--text-muted)" }}>
                  {i + 1}
                </td>
                <td className={`${TD} tabular`} style={{ color: "var(--accent)" }}>
                  {fmtDate(r.date)}
                </td>
                <td className={TD} style={{ color: "var(--text-primary)" }}>
                  {r.pollster}
                </td>
                <td className={`${TD} tabular text-right`} style={{ color: "var(--text-secondary)" }}>
                  {r.sample != null ? r.sample.toLocaleString("pt-BR") : "—"}
                </td>
                <td className={`${TD} tabular`} style={{ color: "var(--text-secondary)" }}>
                  {r.resultado || "—"}
                </td>
                <td className={`${TD} tabular text-right`} style={{ color: "var(--text-secondary)" }}>
                  {r.moe != null ? `± ${fmtPct(r.moe)}` : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
