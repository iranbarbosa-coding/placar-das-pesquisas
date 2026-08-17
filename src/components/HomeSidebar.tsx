import Link from "next/link";
import { fmtSigned } from "@/lib/format";
import BrasilMap from "./BrasilMap";
import type { StateHighlight, Mover, StateMapDatum, MapStatus, NewestPoll } from "@/lib/home";

/**
 * The home page's right-hand dashboard column, per the redesign mockup:
 * a state map, the "Destaques" ranking, "O que mudou nas últimas 24h", and a
 * glossary. Server component — all four are static reads of build-time data.
 *
 * The map card renders the real geographic Brazil SVG (see `BrasilMap`), with
 * the mockup's status legend below it.
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

      {/* The real geographic Brazil SVG (creator-supplied), each state coloured
          by its leader status. See `BrasilMap`. */}
      <div className="mt-3">
        <BrasilMap map={map} />
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

function MudouCard({ movers, newPoll }: { movers: Mover[]; newPoll: NewestPoll | null }) {
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
        {newPoll && (
          <li className="flex items-start gap-2 text-sm">
            <span
              aria-hidden="true"
              className="mt-0.5 shrink-0 rounded px-1 text-[9px] font-bold uppercase tracking-wide text-white"
              style={{ background: "var(--accent)" }}
            >
              New
            </span>
            <span style={{ color: "var(--text-secondary)" }}>{newPoll.label}</span>
          </li>
        )}
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
  newPoll: NewestPoll | null;
}

export default function HomeSidebar({ highlights, movers, map, newPoll }: HomeSidebarProps) {
  return (
    <aside className="flex flex-col gap-5" aria-label="Painel de estados">
      <MapCard map={map} />
      <DestaquesCard highlights={highlights} />
      {(movers.length > 0 || newPoll) && <MudouCard movers={movers} newPoll={newPoll} />}
      <GlossarioCard />
    </aside>
  );
}
