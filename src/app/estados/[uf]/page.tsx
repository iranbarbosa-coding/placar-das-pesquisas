import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import RaceBarsEvolution from "@/components/RaceBarsEvolution";
import RcpPollsTable from "@/components/RcpPollsTable";
import StateNav from "@/components/StateNav";
import StateTrends from "@/components/StateTrends";
import { candKey } from "@/lib/average";
import { scenarioGroups } from "@/lib/data";
import { stateTrends } from "@/lib/estado";
import { raceEvolutionData, rcpTable } from "@/lib/presidente";
import { UFS, UF_NAMES, type UF } from "@/lib/types";

export function generateStaticParams() {
  return UFS.map((uf) => ({ uf: uf.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const UFU = uf.toUpperCase() as UF;
  if (!UFS.includes(UFU)) return {};
  return {
    title: `${UF_NAMES[UFU]} — Eleições 2026`,
    description: `Pesquisas eleitorais 2026 em ${UF_NAMES[UFU]}: governador, senador e presidente, médias e tendências.`,
  };
}

export default async function EstadoPage({ params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const UFU = uf.toUpperCase() as UF;
  if (!UFS.includes(UFU)) notFound();

  // Visão geral — the trends card (leaders + biggest movers of the state's races)
  // and, below it, the governor first-round RCP table exactly as before.
  const trends = stateTrends(UFU);
  const gov1Rcp = rcpTable("governador", UFU, 1);
  const gov1Group = scenarioGroups("governador", UFU, 1)[0] ?? null;
  const gov1Evo = raceEvolutionData("governador", UFU, 1);
  // Colour EVERY named (registered) candidate — not just the ≥5% ones — so each
  // gets its own hue in the bars and a visible line in the evolution chart.
  // Derived from the válidos cut so colours stay fixed across the basis toggle.
  const govColorKeys = (gov1Evo.average?.candidates ?? [])
    .filter((c) => gov1Evo.registeredKeys.length === 0 || gov1Evo.registeredKeys.includes(candKey(c.candidate)))
    .map((c) => candKey(c.candidate));
  const hasGov1 = gov1Rcp.candidates.length > 0;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {/* Page header — breadcrumb + title + Visão geral nav. */}
      <header className="flex flex-col gap-3">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/estados" className="hover:underline">Estados</Link>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>{UF_NAMES[UFU]}</span>
        </nav>

        <div className="flex min-w-0 flex-col gap-1">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            {UF_NAMES[UFU]} · Eleições 2026
          </h1>
          <p className="max-w-[70ch] text-sm" style={{ color: "var(--text-secondary)" }}>
            Acompanhe as médias das pesquisas e todas as disputas no estado.
          </p>
        </div>

        <StateNav active="Visão geral" />
      </header>

      {/* TENDÊNCIAS · ÚLTIMOS 15 DIAS — líderes por cargo + maior alta / maior queda. */}
      <StateTrends data={trends} />

      {/* Governador · 1º turno — a matriz "10 últimas pesquisas", como já existe hoje. */}
      <section id="turno1" className="flex scroll-mt-24 flex-col gap-4">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Governador · 1º turno
        </h2>
        {hasGov1 ? (
          <>
            <div className="card min-w-0 p-4 sm:p-6">
              <RcpPollsTable data={gov1Rcp} allPollsHref={null} />
            </div>
            {/* Below the table: the average as bars (1/3) + the evolution line
                chart (2/3), sharing a bruto/válidos toggle and the chart's hover
                (the bar numbers follow the hovered date). */}
            <RaceBarsEvolution
              validos={gov1Evo.average}
              bruto={gov1Group?.averageBruto ?? null}
              significantKeys={govColorKeys}
              registeredKeys={gov1Evo.registeredKeys}
              pollCount={gov1Evo.average?.pollCount ?? null}
            />
          </>
        ) : (
          <div className="card min-w-0 p-4 sm:p-6">
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
              Ainda não há pesquisas para governador em {UF_NAMES[UFU]}.
            </p>
          </div>
        )}
      </section>

      {/*
        PARTE 2 — OCULTA até validarmos a Parte 1 (decisão do criador, 21/08).
        Restaurar depois: evolução da média (1º turno), Governador 2º turno,
        Senado (evolução + RCP), Presidente no estado e a tabela geral presidencial.
        O motor (raceEvolutionData / runoffSim / rcpTable / pollsFor) já aceita
        (race, uf, round); os componentes RaceEvolution / RunoffSimChart seguem
        no repositório. Ver GUIA_DE_DESIGN §9 e o histórico desta página.
      */}
    </div>
  );
}
