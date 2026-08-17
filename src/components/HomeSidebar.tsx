import Link from "next/link";
import { fmtSigned } from "@/lib/format";
import type { StateHighlight, Mover, StateMapDatum, MapStatus } from "@/lib/home";

/**
 * The home page's right-hand dashboard column, per the redesign mockup:
 * a state map, the "Destaques" ranking, "O que mudou nas últimas 24h", and a
 * glossary. Server component — all four are static reads of build-time data.
 *
 * The geographic SVG map is a follow-up; this iteration ships the same data as a
 * status-coloured state grid inside the same card, with the mockup's legend.
 */

const STATUS_COLOR: Record<MapStatus, string> = {
  acima: "var(--series-3)", // green — leader above 50
  abaixo: "var(--cand-amber)", // amber — leader below 50
  empate: "var(--cand-pink)", // pink — technical tie
  sem: "var(--grid)", // grey — no recent poll
};

const STATUS_LABEL: { key: MapStatus; label: string }[] = [
  { key: "acima", label: "Líder acima de 50%" },
  { key: "abaixo", label: "Líder abaixo de 50%" },
  { key: "empate", label: "Empate técnico" },
  { key: "sem", label: "Sem pesquisa recente" },
];

/**
 * Geographic positions for a self-contained POINT-CARTOGRAM of Brazil — each
 * state placed at its real centroid (as a % of the country's bounding box), so
 * the chips read as Brazil's shape without any third-party map asset. A few
 * north-east states are nudged apart, since their true centroids sit almost on
 * top of each other. `{x, y}` are percentages within the map box.
 */
const UF_POS: Record<string, { x: number; y: number }> = {
  RR: { x: 31, y: 8 }, AP: { x: 52, y: 10 },
  AM: { x: 22, y: 24 }, PA: { x: 50, y: 24 }, MA: { x: 66, y: 26 }, CE: { x: 82, y: 24 }, RN: { x: 94, y: 26 },
  AC: { x: 9, y: 38 }, RO: { x: 26, y: 40 }, TO: { x: 60, y: 38 }, PI: { x: 74, y: 32 }, PB: { x: 95, y: 31 },
  MT: { x: 43, y: 46 }, PE: { x: 88, y: 35 }, AL: { x: 96, y: 39 },
  MS: { x: 46, y: 63 }, GO: { x: 58, y: 53 }, DF: { x: 66, y: 51 }, BA: { x: 76, y: 45 }, SE: { x: 90, y: 41 },
  MG: { x: 70, y: 60 }, ES: { x: 83, y: 62 },
  PR: { x: 55, y: 74 }, SP: { x: 62, y: 68 }, RJ: { x: 77, y: 68 },
  SC: { x: 57, y: 82 },
  RS: { x: 50, y: 90 },
};

function CardTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-secondary)" }}>
      {children}
    </h2>
  );
}

function MapCard({ map }: { map: StateMapDatum[] }) {
  return (
    <section className="card p-4" aria-label="Corridas estaduais">
      <CardTitle>Corridas estaduais</CardTitle>
      <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        Situação dos líderes
      </p>

      {/* Point-cartogram of Brazil: chips at real geographic positions. */}
      <div
        className="relative mt-3 w-full"
        style={{ paddingBottom: "98%" }}
        role="img"
        aria-label="Mapa do Brasil por situação do líder de cada estado"
      >
        {map.map((d) => {
          const pos = UF_POS[d.uf];
          if (!pos) return null;
          return (
            <span
              key={d.uf}
              title={d.leader ? `${d.name}: ${d.leader}` : `${d.name}: sem pesquisa recente`}
              className="tabular absolute flex h-[13%] min-h-[16px] w-[13%] min-w-[20px] -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded text-[9px] font-bold leading-none"
              style={{
                left: `${pos.x}%`,
                top: `${pos.y}%`,
                background: STATUS_COLOR[d.status],
                color: d.status === "sem" ? "var(--text-muted)" : "#fff",
                boxShadow: "0 0 0 1.5px var(--surface-1)",
              }}
            >
              {d.uf}
            </span>
          );
        })}
      </div>

      <ul className="mt-3 grid grid-cols-2 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        {STATUS_LABEL.map((s) => (
          <li key={s.key} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: STATUS_COLOR[s.key] }} />
            {s.label}
          </li>
        ))}
      </ul>

      <Link
        href="/estados"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)" }}
      >
        Ver mapa interativo <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

function DestaquesCard({ highlights }: { highlights: StateHighlight[] }) {
  return (
    <section className="card p-4" aria-label="Destaques">
      <div className="flex items-baseline justify-between">
        <CardTitle>Destaques</CardTitle>
        <span className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Margem
        </span>
      </div>
      <ul className="mt-2 divide-y" style={{ borderColor: "var(--ring)" }}>
        {highlights.map((h) => {
          const winning = h.toFifty >= 0;
          return (
            <li key={h.uf} className="flex items-center gap-3 py-2">
              <span
                className="tabular flex h-7 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
              >
                {h.uf}
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                  {h.leader}
                </div>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  Governador
                </div>
              </div>
              <span
                className="tabular shrink-0 text-sm font-bold"
                style={{ color: winning ? "var(--series-3)" : "var(--cand-amber)" }}
              >
                {fmtSigned(h.margin)}
              </span>
            </li>
          );
        })}
      </ul>
      <Link href="/estados" className="mt-2 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
        Ver todos os estados <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

function MudouCard({ movers }: { movers: Mover[] }) {
  return (
    <section className="card p-4" aria-label="O que mudou recentemente">
      <CardTitle>O que mudou</CardTitle>
      <p className="-mt-0.5 mb-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Maiores variações em 30 dias
      </p>
      <ul className="mt-2 space-y-2">
        {movers.map((m) => {
          const up = m.delta > 0;
          return (
            <li key={m.uf} className="flex items-start gap-2 text-sm">
              <span
                aria-hidden="true"
                className="tabular mt-0.5 shrink-0 font-bold"
                style={{ color: up ? "var(--series-3)" : "var(--cand-red)" }}
              >
                {up ? "▲" : "▼"} {fmtSigned(m.delta)}
              </span>
              <span style={{ color: "var(--text-secondary)" }}>
                {m.leader} {up ? "amplia vantagem" : "perde terreno"} em {m.uf}
              </span>
            </li>
          );
        })}
      </ul>
      <Link href="/estados" className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
        Ver todas as mudanças <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

const GLOSSARY: { term: string; def: string }[] = [
  { term: "Margem de erro (MOE)", def: "Intervalo de confiança de 95%." },
  { term: "Votos válidos", def: "Exclui brancos, nulos e indecisos." },
  { term: "Média móvel", def: "Média ponderada das pesquisas recentes." },
  { term: "Diferença (p.p.)", def: "Diferença em pontos percentuais." },
];

function GlossarioCard() {
  return (
    <section className="card p-4" aria-label="Glossário">
      <CardTitle>Glossário</CardTitle>
      <dl className="mt-2 space-y-2.5">
        {GLOSSARY.map((g) => (
          <div key={g.term}>
            <dt className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {g.term}
            </dt>
            <dd className="text-xs" style={{ color: "var(--text-muted)" }}>
              {g.def}
            </dd>
          </div>
        ))}
      </dl>
      <Link href="/metodologia" className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md border px-4 py-2 text-sm font-semibold transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]" style={{ borderColor: "var(--ring)", color: "var(--text-primary)" }}>
        Metodologia completa <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}

export interface HomeSidebarProps {
  highlights: StateHighlight[];
  movers: Mover[];
  map: StateMapDatum[];
}

export default function HomeSidebar({ highlights, movers, map }: HomeSidebarProps) {
  return (
    <aside className="flex flex-col gap-5" aria-label="Painel de estados">
      <MapCard map={map} />
      <DestaquesCard highlights={highlights} />
      {movers.length > 0 && <MudouCard movers={movers} />}
      <GlossarioCard />
    </aside>
  );
}
