import type { RaceAverage } from "@/lib/types";
import { fmtDate } from "@/lib/data";

function pct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

// RCP-style average board: candidates ranked by rolling average, with the
// spread called out. Bars are a comparison of magnitude on a common baseline.
export default function AverageBoard({ avg, title }: { avg: RaceAverage; title?: string }) {
  const max = Math.max(...avg.candidates.map((c) => c.avg), 1);
  const leader = avg.candidates[0];
  const runnerUp = avg.candidates[1];
  return (
    <div className="card p-4">
      {title && <h3 className="mb-1 text-sm font-semibold">{title}</h3>}
      <p className="mb-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Média de {avg.pollCount} pesquisa{avg.pollCount === 1 ? "" : "s"} · última em {fmtDate(avg.lastPollDate)}
        {runnerUp && (
          <>
            {" · "}
            <span style={{ color: "var(--text-secondary)" }}>
              {leader.candidate.split(" ")[0]} +{avg.spread.toFixed(1).replace(".", ",")}
            </span>
          </>
        )}
      </p>
      <ul className="space-y-2">
        {avg.candidates.slice(0, 8).map((c, i) => (
          <li key={c.candidate} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-3 gap-y-0.5">
            <span className="truncate text-sm">
              {c.candidate}
              {c.party && (
                <span className="ml-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  ({c.party})
                </span>
              )}
            </span>
            <span className="text-sm font-semibold tabular">{pct(c.avg)}</span>
            <div className="col-span-2 h-1.5 rounded-full" style={{ background: "var(--grid)" }}>
              <div
                className="h-1.5 rounded-full"
                style={{
                  width: `${(c.avg / max) * 100}%`,
                  background: `var(--series-${Math.min(i + 1, 8)})`,
                }}
              />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
