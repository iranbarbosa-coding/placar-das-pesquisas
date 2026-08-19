import type { Metadata } from "next";
import Link from "next/link";
import PresidentBars from "@/components/PresidentBars";
import RcpPollsTable from "@/components/RcpPollsTable";
import PresidentEvolution from "@/components/PresidentEvolution";
import RejectionPlaceholder from "@/components/RejectionPlaceholder";
import RunoffSimChart from "@/components/RunoffSimChart";
import PresidentStateMap from "@/components/PresidentStateMap";
import StatePies from "@/components/StatePies";
import AllPollsTable from "@/components/AllPollsTable";
import { loadDataset } from "@/lib/data";
import {
  presidentBars,
  rcpTable,
  presidentEvolution,
  runoffSim,
  presidentMapData,
  statePies,
  allPresidentialPolls,
} from "@/lib/presidente";

export const metadata: Metadata = {
  title: "Presidente",
  description:
    "Disputa presidencial 2026: média das pesquisas, tendência, simulações de 2º turno e todas as pesquisas por estado — em votos válidos.",
};

const MES = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "17 de agosto de 2026" from an ISO datetime (parsed as UTC). */
function longDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("T")[0].split("-").map(Number);
  return `${d} de ${MES[(m ?? 1) - 1]} de ${y}`;
}

/** The small round "(i)" affordance beside the page title. */
function InfoGlyph() {
  return (
    <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block h-4 w-4 align-middle" style={{ color: "var(--text-muted)" }}>
      <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
      <circle cx="8" cy="5" r="0.9" fill="currentColor" />
      <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
    </svg>
  );
}

export default function PresidentePage() {
  const bars = presidentBars();
  const rcp = rcpTable(10);
  const evo = presidentEvolution();
  const runoff = runoffSim();
  const mapData = presidentMapData();
  const pies = statePies();
  const allPolls = allPresidentialPolls();
  const ds = loadDataset();

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {/* Page header */}
      <header className="flex flex-col gap-2">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <span>Presidente</span>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>Disputa Presidencial 2026</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="flex items-center gap-2 text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              Disputa Presidencial 2026
              <InfoGlyph />
            </h1>
            <p className="max-w-[70ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              Acompanhe média, tendência, rejeição, simulações de 2º turno e pesquisas por estado.
            </p>
          </div>

          <div className="flex shrink-0 flex-col items-start gap-1 sm:items-end">
            <span className="inline-flex items-center gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
              <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full" style={{ background: "var(--series-3)" }} />
              Atualizado em {longDate(ds.generated_at)}
            </span>
            <Link href="/metodologia" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
              Metodologia completa <span aria-hidden="true">→</span>
            </Link>
          </div>
        </div>
      </header>

      {/* Row 1a — bars, full width */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label="Média das pesquisas · 1º turno">
        <PresidentBars data={bars} />
      </section>

      {/* Row 1b — RCP matrix of the polls in the average, full width */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label="Pesquisas que compõem a média">
        <RcpPollsTable data={rcp} />
      </section>

      {/* Row 2 — evolution */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label="Evolução da média · 1º turno">
        <PresidentEvolution average={evo.average} registeredKeys={evo.registeredKeys} significantKeys={evo.significantKeys} />
      </section>

      {/* Row 3 — rejection (placeholder) */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label="Rejeição dos candidatos">
        <RejectionPlaceholder />
      </section>

      {/* Row 4 — runoff simulations (three matchup cards, each its own card) */}
      <section className="min-w-0" aria-label="Simulações de 2º turno">
        <RunoffSimChart data={runoff} />
      </section>

      {/* Row 5 — two columns: map + pies */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <section className="card min-w-0 p-4 sm:p-6" aria-label="Disputa por estado · 1º turno">
          <PresidentStateMap data={mapData} />
        </section>
        <section className="card min-w-0 p-4 sm:p-6" aria-label="Pesquisas por estado · 1º turno">
          <StatePies pies={pies} />
        </section>
      </div>

      {/* Row 6 — all polls */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label="Todas as pesquisas presidenciais">
        <AllPollsTable rows={allPolls} />
      </section>
    </div>
  );
}
