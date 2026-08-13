import Link from "next/link";
import type { RaceAverage } from "@/lib/types";
import { fmtDate } from "@/lib/data";

function pct(v: number): string {
  return `${v.toFixed(1).replace(".", ",")}%`;
}

/**
 * Head-to-head runoff projection card: the two candidates of the pairing with
 * mirrored bars on a common center, leader bolded, spread + poll base below.
 * "Projection" here = the rolling average of the pairing's polls (site
 * methodology) — no model is invented on top of published numbers.
 */
export default function MatchupCard({
  avg,
  title,
  href,
}: {
  avg: RaceAverage;
  title?: string;
  href: string;
}) {
  const [a, b] = avg.candidates;
  if (!a || !b) return null;
  const total = Math.max(a.avg + b.avg, 1);
  const aLeads = a.avg >= b.avg;
  return (
    <Link href={href} className="card block p-4 transition-opacity hover:opacity-85">
      {title && (
        <div className="mb-2 text-xs font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {title}
        </div>
      )}
      <div className="flex items-baseline justify-between gap-2 text-sm">
        <span className="truncate" style={{ fontWeight: aLeads ? 700 : 400 }}>
          {a.candidate}
          {a.party && (
            <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
              ({a.party})
            </span>
          )}
        </span>
        <span className="truncate text-right" style={{ fontWeight: aLeads ? 400 : 700 }}>
          {b.candidate}
          {b.party && (
            <span className="ml-1 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
              ({b.party})
            </span>
          )}
        </span>
      </div>
      <div className="mt-1 flex items-baseline justify-between gap-2">
        <span className="text-lg font-bold tabular" style={{ color: "var(--series-1)" }}>
          {pct(a.avg)}
        </span>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {aLeads ? `${a.candidate.split(" ")[0]} +${avg.spread.toFixed(1).replace(".", ",")}` : "empate"}
        </span>
        <span className="text-lg font-bold tabular" style={{ color: "var(--series-2)" }}>
          {pct(b.avg)}
        </span>
      </div>
      <div className="mt-1.5 flex h-2 overflow-hidden rounded-full" style={{ background: "var(--grid)" }}>
        <div style={{ width: `${(a.avg / total) * 100}%`, background: "var(--series-1)" }} />
        <div className="ml-auto" style={{ width: `${(b.avg / total) * 100}%`, background: "var(--series-2)" }} />
      </div>
      <div className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        {avg.pollCount} pesquisa{avg.pollCount === 1 ? "" : "s"} mais recente{avg.pollCount === 1 ? "" : "s"} · última em{" "}
        {fmtDate(avg.lastPollDate)}
      </div>
    </Link>
  );
}
