import AverageBoard from "./AverageBoard";
import PollTable from "./PollTable";
import TrendChart from "./TrendChart";
import type { ScenarioGroup } from "@/lib/data";

/**
 * One full race view: for each scenario (candidate line-up), the average
 * board, the trendline (when there's enough history), and the complete poll
 * table. The first scenario is the currently most-polled one.
 */
export default function RaceSection({ groups, heading }: { groups: ScenarioGroup[]; heading: string }) {
  if (!groups.length) {
    return (
      <section>
        <h2 className="mb-2 text-xl font-bold">{heading}</h2>
        <p className="card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Ainda não há pesquisas publicadas para esta disputa. Assim que forem registradas e
          divulgadas, aparecerão aqui automaticamente.
        </p>
      </section>
    );
  }
  return (
    <section className="space-y-8">
      <h2 className="text-xl font-bold">{heading}</h2>
      {groups.map((g) => {
        const avg = g.average;
        const trendSeries =
          avg?.candidates
            .filter((c) => c.trend.length >= 2)
            .slice(0, 8)
            .map((c) => ({ name: c.candidate, points: c.trend })) ?? [];
        return (
          <div key={g.scenario} className="space-y-4">
            <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              {g.scenario.toLowerCase() === heading.toLowerCase().slice(0, g.scenario.length).trim() || heading.toLowerCase().startsWith(g.scenario.toLowerCase())
                ? `${g.polls.length} pesquisa${g.polls.length === 1 ? "" : "s"}`
                : `${g.scenario} · ${g.polls.length} pesquisa${g.polls.length === 1 ? "" : "s"}`}
            </h3>
            <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
              {avg && <AverageBoard avg={avg} title="Média atual" />}
              {trendSeries.length >= 1 ? (
                <div className="card p-4">
                  <h4 className="mb-2 text-sm font-semibold">Evolução da média</h4>
                  <TrendChart series={trendSeries} />
                </div>
              ) : (
                <div className="card flex items-center justify-center p-4 text-sm" style={{ color: "var(--text-muted)" }}>
                  Séries insuficientes para a linha do tempo — necessárias pesquisas em mais datas.
                </div>
              )}
            </div>
            <PollTable polls={g.polls} />
          </div>
        );
      })}
    </section>
  );
}
