import Link from "next/link";
import AverageBoard from "@/components/AverageBoard";
import TrendChart from "@/components/TrendChart";
import { latestPolls, scenarioGroups, statesWithPolls, fmtDate } from "@/lib/data";
import { UF_NAMES } from "@/lib/types";

export default function Home() {
  const pres = scenarioGroups("presidente", null, 1);
  const main = pres[0];
  const avg = main?.average ?? null;
  const trendSeries =
    avg?.candidates
      .filter((c) => c.trend.length >= 2)
      .slice(0, 8)
      .map((c) => ({ name: c.candidate, points: c.trend })) ?? [];
  const recent = latestPolls(15);
  const states = statesWithPolls().slice(0, 9);

  return (
    <div className="space-y-10">
      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">Corrida presidencial</h1>
          <Link href="/presidente" className="text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Ver todos os cenários e o 2º turno →
          </Link>
        </div>
        {avg ? (
          <div className="grid gap-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
            <AverageBoard avg={avg} title={`Média nacional · ${main.scenario}`} />
            {trendSeries.length >= 1 ? (
              <div className="card p-4">
                <h3 className="mb-2 text-sm font-semibold">Evolução da média</h3>
                <TrendChart series={trendSeries} />
              </div>
            ) : null}
          </div>
        ) : (
          <p className="card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Sem pesquisas presidenciais carregadas ainda.
          </p>
        )}
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Últimas pesquisas publicadas</h2>
        </div>
        <div className="card overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <tbody>
              {recent.map((p) => (
                <tr key={p.id} className="border-b last:border-0" style={{ borderColor: "var(--grid)" }}>
                  <td className="whitespace-nowrap px-3 py-2 text-xs" style={{ color: "var(--text-muted)" }}>
                    {fmtDate(p.fieldwork_end ?? p.published_date)}
                  </td>
                  <td className="px-3 py-2 font-medium">{p.pollster}</td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {p.race === "presidente"
                      ? `Presidente · ${p.round}º turno`
                      : `${p.race === "governador" ? "Governador" : "Senado"} · ${p.state}`}
                  </td>
                  <td className="px-3 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {p.results
                      .slice(0, 3)
                      .map((r) => `${r.candidate.split(" ")[0]} ${r.pct.toFixed(0)}%`)
                      .join(" · ")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section>
        <div className="mb-4 flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-xl font-bold">Estados com mais pesquisas</h2>
          <Link href="/estados" className="text-sm font-medium hover:underline" style={{ color: "var(--accent)" }}>
            Todos os 27 →
          </Link>
        </div>
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {states.map((s) => (
            <li key={s.uf}>
              <Link href={`/estados/${s.uf.toLowerCase()}`} className="card block p-3 transition-opacity hover:opacity-80">
                <span className="text-sm font-semibold">{UF_NAMES[s.uf]}</span>
                <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                  {s.count} pesquisa{s.count === 1 ? "" : "s"} · última {fmtDate(s.latest)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}