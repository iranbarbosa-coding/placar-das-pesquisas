import type { Metadata } from "next";
import Link from "next/link";
import MatchupCard from "@/components/MatchupCard";
import StateJumpNav, { type JumpTarget } from "@/components/StateJumpNav";
import { scenarioGroups, fmtDate } from "@/lib/data";
import { fmtPct } from "@/lib/format";
import { UFS, UF_NAMES } from "@/lib/types";
import { displayName } from "@/lib/names";
import { registeredPresidentKeys } from "@/lib/home";
import { candKey } from "@/lib/average";
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

/** Uppercase section header, per the redesign card system. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
      {children}
    </h2>
  );
}

export default function SegundoTurnoPage() {
  // Only projections BETWEEN registered president candidates. A presidential
  // 2nd-round matchup that includes anyone not registered for president
  // (Tarcísio, Jair Bolsonaro, Ciro, Haddad…) is not a valid runoff, so it is
  // dropped — both candidates of the pairing must be registered.
  const registered = new Set(registeredPresidentKeys());
  const bothRegistered = (g: ScenarioGroup) =>
    !!g.average && g.average.candidates.slice(0, 2).every((c) => registered.has(candKey(c.candidate)));

  const pres = scenarioGroups("presidente", null, 2).filter(bothRegistered);
  const { current: presCurrent, older: presOlder } = splitRecent(pres);

  const states = UFS.map((uf) => ({
    uf,
    groups: splitRecent(scenarioGroups("governador", uf, 2)).current,
  }))
    .filter((s) => s.groups.length > 0)
    .sort((a, b) => UF_NAMES[a.uf].localeCompare(UF_NAMES[b.uf], "pt-BR"));

  // Jump index: the presidential block first, then one chip per state that has
  // a runoff. Each entry points at an id already rendered on its section below.
  const jumpTargets: JumpTarget[] = [
    ...(presCurrent.length ? [{ id: "presidente", label: "Presidente", short: "Pres." }] : []),
    ...states.map(({ uf }) => ({ id: `uf-${uf.toLowerCase()}`, label: UF_NAMES[uf], short: uf })),
  ];

  // Answer-first lede: the marquee presidential runoff is the freshest current
  // matchup (`presCurrent` is already sorted newest-first), summarised straight
  // from its own moving average — the same numbers its MatchupCard renders.
  const marquee = presCurrent[0]?.average ?? null;
  const [marqueeA, marqueeB] = marquee?.candidates ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-8">
      {/* Page header — breadcrumb + title, per the new pattern. */}
      <header className="flex flex-col gap-2">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>2º turno</span>
        </nav>

        <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
          <div className="flex min-w-0 flex-col gap-1">
            <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
              2º turno — projeções dos confrontos
            </h1>
            <p className="max-w-[70ch] text-sm" style={{ color: "var(--text-secondary)" }}>
              Cada card é um pareamento testado pelos institutos, com a média móvel atual do confronto —
              nenhum modelo além dos números publicados. Clique para ver todas as pesquisas do confronto.
            </p>
          </div>
          <Link href="/metodologia" className="inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
            Metodologia completa <span aria-hidden="true">→</span>
          </Link>
        </div>
      </header>

      {marquee && marqueeA && marqueeB && (
        <p className="max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
          No confronto de 2º turno mais recente entre presidenciáveis registrados, a média do Placar das Pesquisas mostra{" "}
          <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(marqueeA.candidate)}</strong>{" "}
          com {fmtPct(marqueeA.avg)}% contra {displayName(marqueeB.candidate)} com {fmtPct(marqueeB.avg)}% — vantagem de{" "}
          {fmtPct(Math.abs(marqueeA.avg - marqueeB.avg))} pontos, atualizada em {fmtDate(marquee.lastPollDate)}.
        </p>
      )}

      {/* In-page jump index — reach any state without scrolling the whole wall. */}
      {jumpTargets.length > 1 && <StateJumpNav targets={jumpTargets} />}

      {/* Presidente */}
      <section id="presidente" className="flex min-w-0 scroll-mt-28 flex-col gap-4" aria-label="Presidente · 2º turno">
        <SectionTitle>Presidente · 2º turno</SectionTitle>
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
          <details>
            <summary className="cursor-pointer text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              Confrontos antigos (sem pesquisas nos últimos {RECENT_DAYS} dias) — {presOlder.length}
            </summary>
            <ul className="mt-2 space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {presOlder.map((g) => {
                const [a, b] = g.average!.candidates;
                return (
                  <li key={g.scenario} className="tabular">
                    {a ? displayName(a.candidate) : ""} {a?.avg.toFixed(1).replace(".", ",")}% × {b?.avg.toFixed(1).replace(".", ",")}%{" "}
                    {b ? displayName(b.candidate) : ""}
                    <span style={{ color: "var(--text-muted)" }}> · última {fmtDate(g.average!.lastPollDate)}</span>
                  </li>
                );
              })}
            </ul>
          </details>
        )}
      </section>

      {/* Governadores */}
      <section id="governadores" className="flex min-w-0 scroll-mt-28 flex-col gap-4" aria-label="Governadores · 2º turno">
        <div className="flex flex-col gap-1">
          <SectionTitle>Governadores · 2º turno</SectionTitle>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Estados com confrontos de 2º turno testados nas pesquisas. Estados ausentes ainda não têm
            pesquisas de 2º turno publicadas.
          </p>
        </div>
        <div className="flex flex-col gap-6">
          {states.map(({ uf, groups }) => (
            <div key={uf} id={`uf-${uf.toLowerCase()}`} className="flex min-w-0 scroll-mt-28 flex-col gap-3">
              <h3 className="text-xs font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-secondary)" }}>
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
