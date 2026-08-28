import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import AllPollsTable from "@/components/AllPollsTable";
import RaceBarsEvolution from "@/components/RaceBarsEvolution";
import RcpPollsTable from "@/components/RcpPollsTable";
import RunoffMain from "@/components/RunoffMain";
import RunoffSims from "@/components/RunoffSims";
// StateNav (a toggle de navegação do estado) está omitida por ora — volta numa
// etapa futura; o componente segue em `@/components/StateNav`.
import StateTrends from "@/components/StateTrends";
import { candKey } from "@/lib/average";
import { loadDataset, scenarioGroups } from "@/lib/data";
import JsonLd from "@/components/JsonLd";
import { datasetSchema } from "@/lib/jsonld";
import { fmtPct, fmtDate } from "@/lib/format";
import { displayName } from "@/lib/names";
import { stateRunoff, stateTrends } from "@/lib/estado";
import { allStatePolls, raceEvolutionData, rcpTable } from "@/lib/presidente";
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

/** Below this (válidos average), a candidate folds into "Outros" instead of
 *  getting its own bar and line — the owner's threshold for "principais". */
const BAR_MIN_PCT = 2;

/**
 * The `candKey`s of the registered candidates AT OR ABOVE `BAR_MIN_PCT` — the
 * ones drawn individually (their own colour + bar + line); everyone below folds
 * into "Outros". Read from the válidos cut so the set stays fixed across the
 * basis toggle.
 */
function namedColorKeys(evo: { average: { candidates: { candidate: string; avg: number }[] } | null; registeredKeys: string[] }): string[] {
  const reg = new Set(evo.registeredKeys);
  return (evo.average?.candidates ?? [])
    .filter((c) => (reg.size === 0 || reg.has(candKey(c.candidate))) && c.avg >= BAR_MIN_PCT)
    .map((c) => candKey(c.candidate));
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
  const govColorKeys = namedColorKeys(gov1Evo);
  const hasGov1 = gov1Rcp.candidates.length > 0;

  // Senado — 2-vote ballot: no bruto cut, "Outros" is the sum of the rest (not a
  // remainder to 100), and 50% is a neutral reference, not a win line (GUIA §9).
  const sen1Evo = raceEvolutionData("senador", UFU, 1);
  const senColorKeys = namedColorKeys(sen1Evo);
  const hasSenado = (sen1Evo.average?.candidates.length ?? 0) > 0;

  // Presidente no estado — single-vote like governador (bruto toggle, 50% win line).
  const pres1Group = scenarioGroups("presidente", UFU, 1)[0] ?? null;
  const pres1Evo = raceEvolutionData("presidente", UFU, 1);
  const presColorKeys = namedColorKeys(pres1Evo);
  const hasPresidente = (pres1Evo.average?.candidates.length ?? 0) > 0;

  // 2º turno — governor and president, each with the main matchup (+ evolution)
  // and the top polled simulations (1st-vs-others first).
  const govRunoff = stateRunoff("governador", UFU);
  const presRunoff = stateRunoff("presidente", UFU);
  const hasRunoff = !!(govRunoff.main || govRunoff.sims.length || presRunoff.main || presRunoff.sims.length);

  // Every poll of the state — governor, senate and president — for the final
  // searchable/filterable table, in the presidential page's pattern.
  const allPolls = allStatePolls(UFU);

  // Answer-first lede: the leading governor race for this UF — leader, average
  // and as-of date, taken from the SAME `rcpTable("governador", …)` matrix the
  // Governador card renders (its first named column is the top registered
  // candidate). Governor is the marquee state race, so it heads the lede.
  const govLead = gov1Rcp.candidates[0];
  const govLeadPct = gov1Rcp.average.values[0];
  const govDate = gov1Group?.average?.lastPollDate ?? null;
  const hasGovLede = hasGov1 && !!govLead && govLeadPct != null;

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <JsonLd
        data={datasetSchema({
          path: `/estados/${UFU.toLowerCase()}`,
          name: `Pesquisas eleitorais 2026 — ${UF_NAMES[UFU]}`,
          description: `Médias das pesquisas de intenção de voto para governador, senador e presidente em ${UF_NAMES[UFU]} nas eleições brasileiras de 2026, com as pesquisas que compõem cada média.`,
          dateModified: loadDataset().generated_at,
          distributionPath: "/api/averages.json",
          keywords: ["pesquisas eleitorais", "eleições 2026", UF_NAMES[UFU], "governador", "senador", "intenção de voto"],
          measures: ["intenção de voto (%) por candidato", "média agregada por disputa"],
        })}
      />
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

        {/* Toggle de navegação do estado (Visão geral · Governador · Senado ·
            Presidente · Todas as pesquisas) OMITIDA por ora — volta numa etapa
            futura de evolução do produto. Componente pronto em `StateNav.tsx`. */}
      </header>

      {hasGovLede && (
        <p className="max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
          Na corrida para governador de {UF_NAMES[UFU]} em 2026, a média do Placar das Pesquisas em votos válidos tem{" "}
          <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(govLead!.name)}</strong>{" "}
          na liderança com {fmtPct(govLeadPct)}%, atualizada em {fmtDate(govDate)}.
        </p>
      )}

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

      {/* Senado + Presidente (1º turno) — half-width each, same bars + evolution
          pattern as governor. Senate is a 2-vote ballot (no bruto, sum-of-rest
          "Outros", neutral 50%); the presidential-in-state race is single-vote. */}
      <div className="grid gap-6 xl:grid-cols-2">
        <section id="senado" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Senado
          </h2>
          {hasSenado ? (
            <RaceBarsEvolution
              half
              validos={sen1Evo.average}
              bruto={null}
              significantKeys={senColorKeys}
              registeredKeys={sen1Evo.registeredKeys}
              pollCount={sen1Evo.average?.pollCount ?? null}
              barsTitle="Média das pesquisas · Senado"
              reconcileTo100={false}
              fiftyLabel="50%"
            />
          ) : (
            <div className="card min-w-0 p-4 sm:p-6">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Ainda não há pesquisas para o Senado em {UF_NAMES[UFU]}.
              </p>
            </div>
          )}
        </section>

        <section id="presidente" className="flex scroll-mt-24 flex-col gap-4">
          <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Presidente no estado · 1º turno
          </h2>
          {hasPresidente ? (
            <RaceBarsEvolution
              half
              validos={pres1Evo.average}
              bruto={pres1Group?.averageBruto ?? null}
              significantKeys={presColorKeys}
              registeredKeys={pres1Evo.registeredKeys}
              pollCount={pres1Evo.average?.pollCount ?? null}
              barsTitle="Média das pesquisas · Presidente"
            />
          ) : (
            <div className="card min-w-0 p-4 sm:p-6">
              <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
                Ainda não há pesquisas presidenciais em {UF_NAMES[UFU]}.
              </p>
            </div>
          )}
        </section>
      </div>

      {/* 2º turno — Governador e Presidente, metade cada; cada metade com o
          confronto principal (+ mini-evolução) e as principais simulações. */}
      {hasRunoff && (
        <div className="grid gap-6 xl:grid-cols-2">
          <section id="segundo-turno-governador" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Governador · 2º turno
            </h2>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <RunoffMain data={govRunoff.main} title="Confronto principal" />
              <RunoffSims rows={govRunoff.sims} title="Todas as simulações" />
            </div>
          </section>

          <section id="segundo-turno-presidente" className="flex scroll-mt-24 flex-col gap-4">
            <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
              Presidente · 2º turno
            </h2>
            <div className="grid min-w-0 gap-4 md:grid-cols-2">
              <RunoffMain data={presRunoff.main} title="Confronto principal" />
              <RunoffSims rows={presRunoff.sims} title="Todas as simulações" />
            </div>
          </section>
        </div>
      )}

      {/* Todas as pesquisas do estado — busca + filtros + paginação, no padrão
          da página presidencial (AllPollsTable owns the heading + id). */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label={`Todas as pesquisas em ${UF_NAMES[UFU]}`}>
        <AllPollsTable rows={allPolls} title={`Todas as pesquisas · ${UF_NAMES[UFU]}`} />
      </section>
    </div>
  );
}
