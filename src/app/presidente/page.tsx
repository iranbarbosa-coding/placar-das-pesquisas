import type { Metadata } from "next";
import Link from "next/link";
import RcpPollsTable from "@/components/RcpPollsTable";
import PresidentEvolution from "@/components/PresidentEvolution";
import RejectionChart from "@/components/RejectionChart";
import RunoffSimChart from "@/components/RunoffSimChart";
import PresidentStateMap from "@/components/PresidentStateMap";
import PresidentMomentum from "@/components/PresidentMomentum";
import StatePies from "@/components/StatePies";
import AllPollsTable from "@/components/AllPollsTable";
import JsonLd from "@/components/JsonLd";
import { loadDataset, scenarioGroups } from "@/lib/data";
import { datasetSchema, faqSchema } from "@/lib/jsonld";
import { displayName } from "@/lib/names";
import { fmtPct, fmtDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/brand";
import {
  rcpTable,
  presidentEvolution,
  runoffSim,
  presidentMapData,
  presidentMomentum,
  statePies,
  allPresidentialPolls,
  presidentRejection,
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
  const rcp = rcpTable();
  const evo = presidentEvolution();
  const runoff = runoffSim();
  const mapData = presidentMapData();
  const momentum = presidentMomentum();
  const pies = statePies();
  const allPolls = allPresidentialPolls();
  const rejection = presidentRejection();
  const ds = loadDataset();

  // Answer-first lede: leader, runner-up, spread, N pesquisas and as-of date,
  // all from the SAME `rcpTable()` matrix the page's first card renders. The
  // named columns are already the registered field at ≥ NAMED_MIN_PCT, so the
  // top two here match the table's "Média" row exactly. Poll count and last poll
  // date come from the average this table was computed over.
  const presAvg = scenarioGroups("presidente", null, 1)[0]?.average ?? null;
  const rcpLead = rcp.candidates[0];
  const rcpRunner = rcp.candidates[1];
  const rcpLeadPct = rcp.average.values[0];
  const rcpRunnerPct = rcp.average.values[1];
  const hasLede = !!(rcpLead && rcpRunner && rcpLeadPct != null && rcpRunnerPct != null && presAvg);

  // FAQPage — answer-first Q&A derived from the SAME numbers the page shows, so
  // the extracted answers can never disagree with the rendered figures.
  const faqItems = hasLede
    ? [
        {
          q: "Quem lidera a média das pesquisas para presidente em 2026?",
          a: `Na média do ${SITE_NAME} em votos válidos, ${displayName(rcpLead!.name)} lidera o 1º turno com ${fmtPct(rcpLeadPct)}%, à frente de ${displayName(rcpRunner!.name)} com ${fmtPct(rcpRunnerPct)}% — diferença de ${fmtPct(Math.abs(rcpLeadPct! - rcpRunnerPct!))} pontos. Média de ${presAvg!.pollCount} ${presAvg!.pollCount === 1 ? "pesquisa" : "pesquisas"}, atualizada em ${fmtDate(presAvg!.lastPollDate)}.`,
        },
        {
          q: "O que significa a média em votos válidos?",
          a: "É a intenção de voto recalculada sobre o total de votos em candidatos, excluindo brancos, nulos e indecisos — a base comparável entre pesquisas de institutos diferentes.",
        },
        {
          q: "Com que frequência a média é atualizada?",
          a: `O ${SITE_NAME} atualiza automaticamente duas vezes por dia a partir de fontes públicas (registros do TSE/PesqEle, Wikipédia e divulgações dos institutos). Última atualização: ${longDate(ds.generated_at)}.`,
        },
      ]
    : [];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      <JsonLd
        data={datasetSchema({
          path: "/presidente",
          name: "Média das pesquisas — Presidente da República, Brasil 2026",
          description:
            "Média agregada das pesquisas de intenção de voto para presidente da República nas eleições brasileiras de 2026, em votos válidos, com todas as pesquisas que compõem cada média e a data da última pesquisa. Atualizado automaticamente a partir de fontes públicas (registros do TSE/PesqEle, Wikipédia e divulgações dos institutos).",
          dateModified: ds.generated_at,
          distributionPath: "/api/presidente.json",
          keywords: [
            "pesquisas eleitorais",
            "eleições 2026",
            "intenção de voto",
            "presidente",
            "agregador de pesquisas",
            "média das pesquisas",
          ],
          measures: [
            "intenção de voto (%) por candidato",
            "média agregada em votos válidos",
            "tendência da média",
          ],
        })}
      />
      {faqItems.length > 0 && <JsonLd data={faqSchema(faqItems)} />}
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

      {hasLede && (
        <p className="max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
          No 1º turno da disputa presidencial de 2026, a média do Placar das Pesquisas em votos válidos aponta{" "}
          <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(rcpLead!.name)}</strong>{" "}
          com {fmtPct(rcpLeadPct)}%, à frente de {displayName(rcpRunner!.name)} com {fmtPct(rcpRunnerPct)}% —
          diferença de {fmtPct(Math.abs(rcpLeadPct! - rcpRunnerPct!))} pontos. Média de {presAvg!.pollCount}{" "}
          {presAvg!.pollCount === 1 ? "pesquisa" : "pesquisas"}, atualizada em {fmtDate(presAvg!.lastPollDate)}.
        </p>
      )}

      {/* Row 1 — RCP matrix of the polls in the average, full width */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label="Pesquisas que compõem a média">
        <RcpPollsTable data={rcp} />
      </section>

      {/* Row 2 — evolution */}
      <section className="card min-w-0 p-4 sm:p-6" aria-label="Evolução da média · 1º turno">
        <PresidentEvolution average={evo.average} registeredKeys={evo.registeredKeys} significantKeys={evo.significantKeys} />
      </section>

      {/* Row 3 — tendência (1/3) beside rejection (2/3). Rejection is the real
          chart; it falls back to the empty-state placeholder while national
          rejection data is still absent. Stacks on mobile: tendência then rejeição. */}
      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
        <section className="card min-w-0 p-4 sm:p-6" aria-label="Tendência · 30 dias">
          <PresidentMomentum rows={momentum} />
        </section>
        <section className="card min-w-0 p-4 sm:p-6" aria-label="Rejeição dos candidatos">
          <RejectionChart data={rejection} />
        </section>
      </div>

      {/* Row 4 — runoff simulations (three matchup cards, each its own card) */}
      <section className="min-w-0" aria-label="Simulações de 2º turno">
        <RunoffSimChart data={runoff} />
      </section>

      {/* Row 5 — two columns: map + pies (tendência moved up beside rejeição) */}
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
