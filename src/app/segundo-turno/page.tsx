import type { Metadata } from "next";
import MatchupCard from "@/components/MatchupCard";
import { scenarioGroups, fmtDate } from "@/lib/data";
import { UFS, UF_NAMES } from "@/lib/types";
import type { ScenarioGroup } from "@/lib/data";

export const metadata: Metadata = {
  title: "2º turno — projeções dos confrontos",
  description:
    "Todos os confrontos de 2º turno testados pelas pesquisas em 2026: presidente e governadores, com a média atual de cada pareamento.",
};

const RECENT_DAYS = 60;

function splitRecent(groups: ScenarioGroup[]) {
  const dated = groups.filter((g) => g.average);
  const newest = dated.reduce<string | null>(
    (acc, g) => (g.average!.lastPollDate && (!acc || g.average!.lastPollDate > acc) ? g.average!.lastPollDate : acc),
    null,
  );
  if (!newest) return { current: dated, older: [] as ScenarioGroup[] };
  const cutoff = new Date(+new Date(newest) - RECENT_DAYS * 86_400_000).toISOString().slice(0, 10);
  // Current matchups lead with the freshest polling, then the deepest base.
  const byRecency = (a: ScenarioGroup, b: ScenarioGroup) => {
    const d = (b.average!.lastPollDate ?? "").localeCompare(a.average!.lastPollDate ?? "");
    return d !== 0 ? d : b.average!.pollCount - a.average!.pollCount;
  };
  return {
    current: dated.filter((g) => (g.average!.lastPollDate ?? "") >= cutoff).sort(byRecency),
    older: dated.filter((g) => (g.average!.lastPollDate ?? "") < cutoff).sort(byRecency),
  };
}

export default function SegundoTurnoPage() {
  const pres = scenarioGroups("presidente", null, 2);
  const { current: presCurrent, older: presOlder } = splitRecent(pres);

  const states = UFS.map((uf) => ({
    uf,
    groups: splitRecent(scenarioGroups("governador", uf, 2)).current,
  }))
    .filter((s) => s.groups.length > 0)
    .sort((a, b) => b.groups.reduce((n, g) => n + g.polls.length, 0) - a.groups.reduce((n, g) => n + g.polls.length, 0));

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold">2º turno — projeções dos confrontos</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Cada card é um pareamento testado pelos institutos, com a média móvel atual do confronto
          (mesma <a className="underline" href="/metodologia">metodologia</a> das demais médias — nenhum
          modelo além dos números publicados). Clique para ver todas as pesquisas do confronto.
        </p>
      </div>

      <section>
        <h2 className="mb-4 text-xl font-bold">Presidente</h2>
        {presCurrent.length ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {presCurrent.map((g) => (
              <MatchupCard key={g.scenario} avg={g.average!} href="/presidente" />
            ))}
          </div>
        ) : (
          <p className="card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
            Sem confrontos de 2º turno testados recentemente.
          </p>
        )}
        {presOlder.length > 0 && (
          <details className="mt-4">
            <summary className="cursor-pointer text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Confrontos antigos (sem pesquisas nos últimos {RECENT_DAYS} dias) — {presOlder.length}
            </summary>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {presOlder.map((g) => {
                const [a, b] = g.average!.candidates;
                return (
                  <li key={g.scenario} className="tabular">
                    {a?.candidate} {a?.avg.toFixed(1).replace(".", ",")}% × {b?.avg.toFixed(1).replace(".", ",")}%{" "}
                    {b?.candidate}
                    <span style={{ color: "var(--text-muted)" }}> · última {fmtDate(g.average!.lastPollDate)}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </section>

      <section>
        <h2 className="mb-1 text-xl font-bold">Governadores</h2>
        <p className="mb-4 text-sm" style={{ color: "var(--text-muted)" }}>
          Estados com confrontos de 2º turno testados nas pesquisas. Estados ausentes ainda não têm
          pesquisas de 2º turno publicadas.
        </p>
        <div className="space-y-8">
          {states.map(({ uf, groups }) => (
            <div key={uf}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
                {UF_NAMES[uf]}
              </h3>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {groups.map((g) => (
                  <MatchupCard key={g.scenario} avg={g.average!} href={`/estados/${uf.toLowerCase()}`} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
