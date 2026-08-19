import RaceView from "./RaceView";
import type { ScenarioGroup } from "@/lib/data";

/**
 * One full race: each scenario rendered as chart → caption → table.
 *
 * The old layout was a separate "Média atual" board beside a trendline, with
 * the poll table underneath. The board is gone: the average now appears twice,
 * as the end of every line in the chart's right panel and as the first row of
 * the table, which is where a reader looking at the polls actually wants it.
 * One number in two places it belongs beats a third copy in a box of its own.
 *
 * The first group is the most-polled scenario. For round 2 each head-to-head
 * pairing is its own group; for the Senate each is a candidate line-up.
 */
export default function RaceSection({ groups, heading }: { groups: ScenarioGroup[]; heading: string }) {
  if (!groups.length) {
    return (
      <section className="flex flex-col gap-3">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{heading}</h2>
        <p className="card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Ainda não há pesquisas publicadas para esta disputa. Assim que forem registradas e
          divulgadas, aparecerão aqui automaticamente.
        </p>
      </section>
    );
  }

  return (
    <section className="flex flex-col gap-6">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>{heading}</h2>
      {groups.map((g) => (
        <RaceView
          key={g.scenario}
          polls={g.polls}
          average={g.average}
          averageBruto={g.averageBruto}
          title={`${g.scenario} · ${g.polls.length} pesquisa${g.polls.length === 1 ? "" : "s"}`}
        />
      ))}
    </section>
  );
}
