import Link from "next/link";
import { shortName, type Headline } from "@/lib/home";
import { fmtPct, fmtSigned } from "@/lib/format";
import type { RaceAverage, UF } from "@/lib/types";

/**
 * The right-hand rail: every state's governor race, alphabetical, RCP-style.
 *
 * Server component on purpose. It imports `shortName` from `@/lib/home`, which
 * reaches the NDJSON store through `node:fs` — the same chain `format.ts`
 * warns about. Rendering this inside a client boundary would drag a filesystem
 * read into the browser bundle. If a client component ever needs the rail,
 * lift the data fetch to a server parent and keep this on the server side.
 *
 * The data comes in as a prop (`stateRail()` output). This component loads
 * nothing: the homepage owns the query, the rail owns the presentation.
 */

export interface StateRailItem {
  uf: UF;
  name: string;
  average: RaceAverage | null;
  /** Null exactly when the state has no governor average yet. */
  headline: Headline | null;
}

export default function StateRail({
  items,
  title = "Corridas estaduais",
  className = "",
}: {
  items: StateRailItem[];
  title?: string;
  className?: string;
}) {
  return (
    <aside aria-labelledby="state-rail-title" className={`w-full ${className}`}>
      <h2
        id="state-rail-title"
        className="border-b pb-2 text-xs font-bold uppercase tracking-widest"
        style={{ borderColor: "var(--grid)", color: "var(--text-secondary)" }}
      >
        {title}
      </h2>

      {/* One group per state. Today each group holds a single row (governador);
          the grouping is the shape RCP uses and the shape this rail will need
          when the Senate races join it, so it is built that way from the start. */}
      <ul className="mt-1 grid grid-cols-1 gap-x-6 sm:grid-cols-2 lg:grid-cols-1">
        {items.map((item) => (
          <li key={item.uf} className="border-b py-2" style={{ borderColor: "var(--grid)" }}>
            <h3
              className="text-[0.6875rem] font-bold uppercase tracking-widest"
              style={{ color: "var(--text-muted)" }}
            >
              {item.name}
            </h3>
            <ul className="mt-1">
              <li>
                <Link
                  href={`/estados/${item.uf.toLowerCase()}`}
                  className="flex items-center justify-between gap-2 py-0.5 text-sm transition-opacity hover:opacity-70"
                >
                  <span className="shrink-0">Governador</span>
                  {item.headline ? <LeaderPill headline={item.headline} /> : <NoPollsPill state={item.name} />}
                </Link>
              </li>
            </ul>
          </li>
        ))}
      </ul>
    </aside>
  );
}

/**
 * `{leader} | {margin to 50%}` — the RCP value badge.
 *
 * The number is the distance to the 50% an outright first-round win needs, so
 * a negative reading is the normal case and is not a defeat: it means a runoff
 * on today's numbers. The pipe is decoration; the meaning is spelled out for
 * screen readers, because "Alan Rick | −7,2" read aloud is noise.
 */
function LeaderPill({ headline }: { headline: Headline }) {
  const behind = headline.toFifty < 0;
  const gap = fmtPct(Math.abs(headline.toFifty));
  return (
    <span
      className="inline-flex min-w-0 items-center gap-1.5 rounded border px-1.5 py-0.5 text-xs"
      style={{ borderColor: "var(--ring)", background: "var(--surface-1)" }}
    >
      {/* `min-w-0` so the name elides inside a 300px rail instead of widening
          it; the full name stays available in the tooltip and to screen
          readers via the sentence below. */}
      <span className="min-w-0 truncate font-semibold" title={headline.leader}>
        {shortName(headline.leader)}
      </span>
      <span aria-hidden="true" style={{ color: "var(--axis)" }}>
        |
      </span>
      <span
        className="tabular shrink-0 font-semibold"
        aria-hidden="true"
        style={{ color: behind ? "var(--text-secondary)" : "var(--series-3)" }}
      >
        {fmtSigned(headline.toFifty)}
      </span>
      <span className="sr-only">
        {`— ${headline.leader} lidera com ${fmtPct(headline.leaderPct)}%, `}
        {headline.toFifty === 0
          ? "exatamente nos 50% necessários para vencer no primeiro turno."
          : `${gap} ${gap === "1,0" ? "ponto" : "pontos"} ${behind ? "abaixo" : "acima"} dos 50% necessários para vencer no primeiro turno.`}
      </span>
    </span>
  );
}

/**
 * A state nobody has polled for governor yet.
 *
 * It still gets a row. "Não há pesquisa" is information — a reader learns as
 * much from an unpolled state as from a number — and the one thing this must
 * never do is render a 0,0 that looks like a measurement.
 */
function NoPollsPill({ state }: { state: string }) {
  return (
    <span
      className="inline-flex shrink-0 items-center rounded border border-dashed px-1.5 py-0.5 text-xs italic"
      style={{ borderColor: "var(--axis)", color: "var(--text-muted)" }}
    >
      <span aria-hidden="true">sem pesquisas</span>
      <span className="sr-only">{`— nenhuma pesquisa de governador registrada em ${state}.`}</span>
    </span>
  );
}
