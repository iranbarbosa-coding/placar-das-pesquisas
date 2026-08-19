import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RaceEvolution from "@/components/RaceEvolution";
import RcpPollsTable from "@/components/RcpPollsTable";
import RunoffSimChart from "@/components/RunoffSimChart";
import { scenarioGroups } from "@/lib/data";
import { raceEvolutionData, rcpTable, runoffSim } from "@/lib/presidente";
import { UFS, UF_NAMES, type UF } from "@/lib/types";

export function generateStaticParams() {
  return UFS.map((uf) => ({ uf: uf.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const UFU = uf.toUpperCase() as UF;
  if (!UFS.includes(UFU)) return {};
  return {
    title: `${UF_NAMES[UFU]} — Governador e Senado`,
    description: `Pesquisas eleitorais 2026 em ${UF_NAMES[UFU]}: governador e senador, médias e tendências.`,
  };
}

export default async function EstadoPage({ params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const UFU = uf.toUpperCase() as UF;
  if (!UFS.includes(UFU)) notFound();

  const gov2 = scenarioGroups("governador", UFU, 2);

  // Governor 1º turno now uses the presidential page's chart + table components
  // (only the data differs). Assembled server-side; plain data crosses into the
  // client evolution chart.
  const gov1Evo = raceEvolutionData("governador", UFU, 1);
  const gov1Rcp = rcpTable("governador", UFU, 1);

  // Governor 2º turno uses the same area-chart simulations as /presidente §5.
  // Only render (and tab) it when the leader actually has polled matchups.
  const gov2Runoff = runoffSim("governador", UFU);
  const hasGov2 = gov2Runoff.cards.length > 0;

  // Senado uses the same evolution card + RCP table (main scenario [0]). Senate
  // is NOT decided at 50%, so the RCP spread shows the leader's margin over the
  // runner-up and the chart's 50% line is a neutral reference, not a win line.
  const senEvo = raceEvolutionData("senador", UFU, 1);
  const senRcp = rcpTable("senador", UFU, 1, 10, "leaderMargin");

  const tabs = [
    { href: "#turno1", label: "Governador · 1º turno" },
    ...(hasGov2 ? [{ href: "#turno2", label: "2º turno" }] : []),
    { href: "#senado", label: "Senado" },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {/* Page header — breadcrumb + title + jump tabs, per the new pattern. */}
      <header className="flex flex-col gap-3">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/estados" className="hover:underline">Estados</Link>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>{UF_NAMES[UFU]}</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              {UF_NAMES[UFU]} · Eleições 2026
            </h1>
            <p className="max-w-[70ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              Governador e Senado — a média das pesquisas e todas as pesquisas de cada disputa.
            </p>
          </div>
          {gov2.length > 0 && (
            <Link href="/segundo-turno#governadores" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Confrontos de 2º turno <span aria-hidden="true">→</span>
            </Link>
          )}
        </div>

        {/* In-page jump tabs. */}
        <nav
          aria-label="Disputas do estado"
          className="inline-flex w-fit flex-wrap gap-1 rounded-lg p-1 text-sm"
          style={{ border: "1px solid var(--ring)", background: "var(--surface-1)" }}
        >
          {tabs.map((t) => (
            <a
              key={t.href}
              href={t.href}
              className="rounded-md px-3 py-1 font-medium transition-colors hover:bg-[var(--grid)]"
              style={{ color: "var(--text-secondary)" }}
            >
              {t.label}
            </a>
          ))}
        </nav>
      </header>

      {/* Governador · 1º turno — the presidential chart card + RCP matrix (SAMPLE:
          same components as /presidente, governor data). */}
      <section id="turno1" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Governador · 1º turno
        </h2>
        {gov1Evo.average ? (
          <>
            <div className="card min-w-0 p-4 sm:p-6">
              <RaceEvolution
                average={gov1Evo.average}
                significantKeys={gov1Evo.significantKeys}
                registeredKeys={gov1Evo.registeredKeys}
              />
            </div>
            <div className="card min-w-0 p-4 sm:p-6">
              <RcpPollsTable data={gov1Rcp} allPollsHref={null} />
            </div>
          </>
        ) : (
          <div className="card min-w-0 p-4 sm:p-6">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ainda não há pesquisas para governador em {UF_NAMES[UFU]}.
            </p>
          </div>
        )}
      </section>
      {/* Governador · 2º turno — the presidential §5 runoff simulations (area
          cards of the leader vs each challenger), only when the leader has polled
          matchups. */}
      {hasGov2 && (
        <section id="turno2" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Governador · 2º turno
          </h2>
          <RunoffSimChart data={gov2Runoff} />
        </section>
      )}
      {/* Senado — the same evolution card + RCP table as gov1. Senate is not
          decided at 50%: neutral 50% reference line and a leader-margin spread. */}
      <section id="senado" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Senado
        </h2>
        {senEvo.average ? (
          <>
            <div className="card min-w-0 p-4 sm:p-6">
              <RaceEvolution
                average={senEvo.average}
                significantKeys={senEvo.significantKeys}
                registeredKeys={senEvo.registeredKeys}
                title="Evolução da média · Senado"
                fiftyLabel="50%"
              />
            </div>
            <div className="card min-w-0 p-4 sm:p-6">
              <RcpPollsTable data={senRcp} allPollsHref={null} />
            </div>
          </>
        ) : (
          <div className="card min-w-0 p-4 sm:p-6">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ainda não há pesquisas para o Senado em {UF_NAMES[UFU]}.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
