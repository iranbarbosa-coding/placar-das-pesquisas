import Link from "next/link";
import { fmtSigned } from "@/lib/format";
import BrasilMap from "./BrasilMap";
import type { StateHighlight, Mover, StateMapDatum, MapStatus, NewestPoll } from "@/lib/home";
import type { CalendarEntry } from "@/lib/calendar";

/**
 * The home page's right-hand dashboard column, per the redesign mockup:
 * a state map, the "Destaques" ranking, "O que mudou nas últimas 24h", and a
 * glossary. Server component — all four are static reads of build-time data.
 *
 * The map card renders the real geographic Brazil SVG (see `BrasilMap`), with
 * the mockup's status legend below it.
 */

// Legend dots share the map's brand fills (see `BrasilMap`/globals.css) so the
// key matches the choropleth exactly.
const STATUS_COLOR: Record<MapStatus, string> = {
  acima: "var(--map-acima)", // brand blue — leader above 50
  abaixo: "var(--map-abaixo)", // light blue — leader below 50 (runoff)
  empate: "var(--map-empate)", // grey — technical tie (matches president map)
  sem: "var(--map-sem)", // black — no recent poll (matches president map)
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
    <section className="card p-4" aria-label="Corridas estaduais — Governador">
      <CardTitle>Corridas estaduais · Governador</CardTitle>
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
        {highlights.map((h) => (
          // Linear row: state chip · cargo · nome · margem — the chip stays grey.
          <li key={h.uf} className="flex items-center gap-2 py-2">
            <span
              className="tabular flex h-6 w-7 shrink-0 items-center justify-center rounded text-[10px] font-bold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
            >
              {h.uf}
            </span>
            <span className="shrink-0 text-xs" style={{ color: "var(--text-muted)" }}>
              Governador
            </span>
            <span className="min-w-0 flex-1 truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
              {h.leader}
            </span>
            <span
              className="tabular shrink-0 text-sm font-bold"
              style={{ color: h.margin >= 0 ? "var(--series-3)" : "var(--cand-red)" }}
            >
              {fmtSigned(h.margin)}
            </span>
          </li>
        ))}
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

// "Próximas pesquisas" — a agenda do que está registrado no TSE e ainda não
// saiu. Substitui o antigo Glossário (o site já tem /metodologia). Cada pesquisa
// deve ser registrada até 5 dias antes de divulgar, então isto é "o que sai
// nesta semana". Dado aberto, citável — a versão fechada dos concorrentes não é.
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const DIAS = ["dom", "seg", "ter", "qua", "qui", "sex", "sáb"];

/** "2026-08-26" → "qua · 26 ago" (determinístico, sem fuso). */
function fmtDia(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const wd = new Date(Date.UTC(y, m - 1, d)).getUTCDay();
  return `${DIAS[wd]} · ${d} ${MESES[m - 1]}`;
}

function localScope(e: CalendarEntry): string {
  const onde = !e.uf || e.uf === "BR" ? "Nacional" : e.uf;
  return e.cargos.length ? `${onde} · ${e.cargos.join(", ")}` : onde;
}

function ProximasPesquisasCard({ upcoming }: { upcoming: CalendarEntry[] }) {
  // Agrupa por data de divulgação, preservando a ordem já ordenada.
  const byDay: { day: string; items: CalendarEntry[] }[] = [];
  for (const e of upcoming) {
    const day = e.dt_divulgacao ?? "";
    const g = byDay.find((x) => x.day === day);
    if (g) g.items.push(e);
    else byDay.push({ day, items: [e] });
  }

  return (
    <section className="card p-4" aria-label="Próximas pesquisas">
      <CardTitle>Próximas pesquisas</CardTitle>
      {upcoming.length ? (
        <div className="mt-2 flex flex-col gap-3">
          {byDay.map(({ day, items }) => (
            <div key={day}>
              <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>
                {fmtDia(day)}
              </div>
              <ul className="mt-1 flex flex-col gap-1.5">
                {items.map((e) => (
                  <li key={e.protocolo} className="leading-tight">
                    <div className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                      {e.pollster}
                    </div>
                    <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                      {localScope(e)}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          Nenhuma pesquisa registrada aguardando divulgação no momento.
        </p>
      )}
      <p className="mt-3 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Registradas no TSE, ainda não divulgadas. Fonte: TSE — Dados Abertos (PesqEle).
      </p>
    </section>
  );
}

export interface HomeSidebarProps {
  highlights: StateHighlight[];
  movers: Mover[];
  map: StateMapDatum[];
  newPoll: NewestPoll | null;
  upcoming: CalendarEntry[];
}

export default function HomeSidebar({ highlights, movers, map, newPoll, upcoming }: HomeSidebarProps) {
  return (
    <aside className="flex min-w-0 flex-col gap-5" aria-label="Painel de estados">
      <MapCard map={map} />
      <DestaquesCard highlights={highlights} />
      {(movers.length > 0 || newPoll) && <MudouCard movers={movers} newPoll={newPoll} />}
      <ProximasPesquisasCard upcoming={upcoming} />
    </aside>
  );
}
