import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { RcpTable, RcpSpread } from "@/lib/presidente";

/**
 * Section 2 — the first-round average and its 10 window polls as an RCP-style
 * MATRIX: pollster · date · one column per named candidate · spread. A
 * highlighted "Média" row sits on top; each cell is that candidate's votos-
 * válidos number (or "—" when the poll did not test them). Server component: a
 * static, dense read of build-time data. It scrolls inside its own
 * `overflow-x-auto` (≈10 columns), never the page.
 *
 * Columns reuse `PresidentBars`' roster AND colours, so a reader ties a column
 * to the bar above it by the coloured dot in its header.
 */

const TH = "px-2 py-1.5 font-bold uppercase tracking-wide whitespace-nowrap";
const TD = "px-2 py-1.5 whitespace-nowrap align-middle";

// The soft spread chip: the leader's distance to 50%, coloured by whether that
// clears the margin of error — green above 50 (clinches the 1st round), red
// below, grey when 50% sits inside the interval (no call). Backgrounds are a
// faint tint of the status colour (color-mix over the card), so they read in
// both themes; text/dot use the status colour itself.
const SPREAD_STYLE: Record<RcpSpread["status"], { bg: string; fg: string; dot: string }> = {
  acima: {
    bg: "color-mix(in srgb, var(--series-3) 15%, var(--surface-1))",
    fg: "var(--series-3)",
    dot: "var(--series-3)",
  },
  abaixo: {
    bg: "color-mix(in srgb, var(--cand-red) 15%, var(--surface-1))",
    fg: "var(--cand-red)",
    dot: "var(--cand-red)",
  },
  empate: { bg: "var(--surface-2)", fg: "var(--text-secondary)", dot: "var(--text-muted)" },
};

function SpreadChip({ spread }: { spread: RcpSpread | null }) {
  if (!spread) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  const s = SPREAD_STYLE[spread.status];
  return (
    <span
      className="tabular inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.dot }} />
      {spread.leaderShort} {fmtSigned(spread.distTo50)}
    </span>
  );
}

/** The index of the largest non-null value in a row (its leader), or -1. */
function leaderIndex(values: (number | null)[]): number {
  let idx = -1;
  let best = -Infinity;
  values.forEach((v, i) => {
    if (v != null && v > best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

export default function RcpPollsTable({ data }: { data: RcpTable }) {
  if (!data.candidates.length) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Ainda não há pesquisas suficientes para compor a média do 1º turno.
      </p>
    );
  }

  const avgLeader = leaderIndex(data.average.values);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        10 últimas pesquisas que compõem a média
      </h2>

      <div className="min-w-0 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead style={{ color: "var(--text-muted)" }}>
            <tr style={{ borderBottom: "1px solid var(--ring)" }}>
              <th className={`${TH} text-left`}>Instituto</th>
              <th className={`${TH} text-left`}>Data</th>
              <th className={`${TH} text-left`}>% para 50</th>
              {data.candidates.map((c) => (
                <th key={c.key} className={`${TH} text-right`}>
                  <span className="inline-flex items-center gap-1">
                    <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: c.color }} />
                    {c.short}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Highlighted average row on top. */}
            <tr className="font-bold" style={{ background: "var(--surface-2)", borderBottom: "1px solid var(--ring)" }}>
              <td className={`${TD} text-left`} style={{ color: "var(--text-primary)" }}>
                Média
              </td>
              <td className={`${TD} text-left`} style={{ color: "var(--text-muted)" }}>
                —
              </td>
              <td className={`${TD} text-left`}>
                <SpreadChip spread={data.average.spread} />
              </td>
              {data.average.values.map((v, i) => (
                <td
                  key={data.candidates[i].key}
                  className={`${TD} tabular text-right`}
                  style={{ color: i === avgLeader ? "var(--text-primary)" : "var(--text-secondary)" }}
                >
                  {v == null ? "—" : `${fmtPct(v)}%`}
                </td>
              ))}
            </tr>

            {/* One row per poll. */}
            {data.rows.map((r, ri) => {
              const rowLeader = leaderIndex(r.values);
              return (
                <tr key={`${r.pollster}-${r.date}-${ri}`} style={{ borderBottom: "1px solid var(--grid)" }}>
                  <td className={`${TD} text-left`} style={{ color: "var(--text-primary)" }}>
                    {r.pollster}
                  </td>
                  <td className={`${TD} tabular text-left`} style={{ color: "var(--accent)" }}>
                    {fmtDate(r.date)}
                  </td>
                  <td className={`${TD} text-left`}>
                    <SpreadChip spread={r.spread} />
                  </td>
                  {r.values.map((v, i) => (
                    <td
                      key={data.candidates[i].key}
                      className={`${TD} tabular text-right ${i === rowLeader ? "font-bold" : ""}`}
                      style={{ color: v == null ? "var(--text-muted)" : i === rowLeader ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {v == null ? "—" : `${fmtPct(v)}%`}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <a href="#todas-as-pesquisas" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
        Ver todas as pesquisas utilizadas na média <span aria-hidden="true">→</span>
      </a>
    </div>
  );
}
