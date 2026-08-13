import type { Poll } from "@/lib/types";
import { fmtDate } from "@/lib/data";
import { candKey } from "@/lib/average";

function pct(v: number | null | undefined): string {
  return v == null ? "—" : v.toFixed(v % 1 ? 1 : 0).replace(".", ",");
}

/**
 * Full poll table for one scenario group (RCP-style): one row per poll,
 * one column per candidate, leader bolded. Candidate columns come from the
 * most recent polls so the roster matches what is currently being tested.
 */
export default function PollTable({ polls, showRace = false }: { polls: Poll[]; showRace?: boolean }) {
  // Column roster: candidates by frequency across these polls, capped at 8.
  const freq = new Map<string, { name: string; n: number }>();
  for (const p of polls) {
    for (const r of p.results) {
      const k = candKey(r.candidate);
      const e = freq.get(k);
      if (e) e.n += 1;
      else freq.set(k, { name: r.candidate, n: 1 });
    }
  }
  const cols = [...freq.entries()]
    .sort((a, b) => b[1].n - a[1].n)
    .slice(0, 8)
    .map(([k, v]) => ({ key: k, name: v.name }));

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[640px] text-sm">
        <thead>
          <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: "var(--ring)", color: "var(--text-muted)" }}>
            <th className="px-3 py-2 font-medium">Instituto</th>
            <th className="px-3 py-2 font-medium">Campo</th>
            <th className="px-3 py-2 font-medium">Amostra</th>
            {cols.map((c) => (
              <th key={c.key} className="px-3 py-2 text-right font-medium">
                {c.name.split(" ")[0]}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {polls.map((p) => {
            const vals = cols.map((c) => p.results.find((r) => candKey(r.candidate) === c.key)?.pct ?? null);
            const maxV = Math.max(...vals.map((v) => v ?? -1));
            return (
              <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "var(--grid)" }}>
                <td className="px-3 py-2">
                  <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                    {p.pollster}
                  </a>
                  {showRace && p.state && (
                    <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>{p.state}</span>
                  )}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {p.fieldwork_start ? `${fmtDate(p.fieldwork_start)}–` : ""}
                  {fmtDate(p.fieldwork_end ?? p.published_date)}
                </td>
                <td className="px-3 py-2 text-xs tabular" style={{ color: "var(--text-secondary)" }}>
                  {p.sample_size ? p.sample_size.toLocaleString("pt-BR") : "—"}
                </td>
                {vals.map((v, i) => (
                  <td
                    key={cols[i].key}
                    className="px-3 py-2 text-right tabular"
                    style={v !== null && v === maxV ? { fontWeight: 700 } : { color: "var(--text-secondary)" }}
                  >
                    {pct(v)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
