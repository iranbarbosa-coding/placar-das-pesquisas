import Link from "next/link";
import HeroBasisSwitch from "@/components/HeroBasisSwitch";
import RunoffBars from "@/components/RunoffBars";
import MatchupRows from "@/components/MatchupRows";
import LatestPollsTable from "@/components/LatestPollsTable";
import HomeSidebar from "@/components/HomeSidebar";
import FreshnessBadge from "@/components/FreshnessBadge";
import {
  heroRace,
  runoffCards,
  matchupRows,
  latestForTable,
  stateHighlights,
  recentMovers,
  stateMapData,
  newestPoll,
  registeredPresidentKeys,
} from "@/lib/home";
import { candKey } from "@/lib/average";
import { loadDataset } from "@/lib/data";
import { upcomingPolls } from "@/lib/calendar";
import { houseEffects } from "@/lib/houseEffects";
import HouseEffects from "@/components/HouseEffects";
import { rankingAcerto } from "@/lib/acerto";
import RankingInstitutos from "@/components/RankingInstitutos";
import { displayName } from "@/lib/names";
import { fmtPct, fmtDate } from "@/lib/format";

/**
 * The front page — a two-column electoral dashboard (2026-08-17 redesign).
 *
 * The shape mirrors the creator's mockup: a wide LEFT column of stacked cards
 * (the presidential race, the runoff bars, the largest colleges, the latest
 * polls) beside a NARROW RIGHT column — the state map, the "Destaques" ranking,
 * "O que mudou" and the glossary. Each section is its own bordered white card on
 * the grey page, the depth the design brief asked for.
 *
 * The page is on votos válidos throughout, with ONE exception the owner asked
 * for: the presidential card carries its own basis toggle, scoped to that card.
 */
export default function Home() {
  const hero = heroRace();
  const cards = runoffCards(4);
  const matchups = matchupRows();
  const latest = latestForTable(40);
  const highlights = stateHighlights();
  const movers = recentMovers(4);
  const map = stateMapData();
  const newPoll = newestPoll();
  const upcoming = upcomingPolls(6);
  const house = houseEffects("presidente", null, 1);
  const acerto = rankingAcerto();
  const registeredKeys = registeredPresidentKeys();

  // Answer-first lede: a single crawlable, quotable sentence stating the current
  // presidential 1st-round standing, derived from the SAME `heroRace()` average
  // the hero card renders (votos válidos). Only registered candidates may be
  // named (owner's rule), so the top two are taken from the registered field —
  // the same set the hero folds everyone else into "Outros" behind.
  const heroReg = new Set(registeredKeys);
  const heroNamed = (hero?.average?.candidates ?? []).filter((c) => heroReg.has(candKey(c.candidate)));
  const [heroLead, heroRunner] = heroNamed;

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
      {/* Noite da eleição: chamada para a apuração ao vivo (dados do TSE). */}
      <Link
        href="/apuracao"
        className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3 lg:col-span-2"
        style={{ borderColor: "var(--accent)" }}
      >
        <span className="flex items-center gap-2.5">
          <span className="relative inline-flex h-2.5 w-2.5">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: "var(--cand-red)" }} />
            <span className="relative inline-flex h-2.5 w-2.5 rounded-full" style={{ background: "var(--cand-red)" }} />
          </span>
          <span className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
            Apuração ao vivo · Presidente 1º turno
          </span>
          <span className="hidden text-xs sm:inline" style={{ color: "var(--text-secondary)" }}>
            Lula × Flávio Bolsonaro e o andamento por região e estado, direto do TSE
          </span>
        </span>
        <span className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          Acompanhar →
        </span>
      </Link>
      {/* LEFT: the main stack. `min-w-0` keeps the wide table from forcing the
          track past the viewport on phones (a documented overflow fix). */}
      <div className="flex min-w-0 flex-col gap-6">
        {heroLead && heroRunner && hero?.average && (
          <p className="max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
            Na média do Placar das Pesquisas para o 1º turno da eleição presidencial de 2026,{" "}
            <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(heroLead.candidate)}</strong>{" "}
            lidera com {fmtPct(heroLead.avg)}%, à frente de {displayName(heroRunner.candidate)} com {fmtPct(heroRunner.avg)}% —
            média em votos válidos, atualizada em {fmtDate(hero.average.lastPollDate)}.
          </p>
        )}
        {hero?.average && (
          <FreshnessBadge race="presidente" uf={null} lastPollDate={hero.average.lastPollDate} generatedAt={loadDataset().generated_at} className="-mt-3" />
        )}
        <section className="card p-4 sm:p-6" aria-label="Corrida presidencial">
          <HeroBasisSwitch
            average={hero?.average ?? null}
            headline={hero?.headline ?? null}
            averageBruto={hero?.averageBruto ?? null}
            headlineBruto={hero?.headlineBruto ?? null}
            scenario={hero?.scenario}
            registeredKeys={registeredKeys}
          />
        </section>

        {acerto ? <RankingInstitutos data={acerto} maxRows={10} /> : null}

        <HouseEffects data={house} compact maxRows={10} title="Viés dos Institutos (Efeito Casa)" href="/institutos" />

        {cards.length ? (
          <section className="card p-4 sm:p-6">
            <RunoffBars cards={cards} title="Confrontos de 2º turno" />
          </section>
        ) : null}

        <section className="card p-4 sm:p-6">
          <MatchupRows rows={matchups} />
        </section>

        <section className="card p-4 sm:p-6">
          <LatestPollsTable rows={latest} />
        </section>
      </div>

      {/* RIGHT: the dashboard sidebar. Stacks under the content on phones. */}
      <HomeSidebar highlights={highlights} movers={movers} map={map} newPoll={newPoll} upcoming={upcoming} />
    </div>
  );
}
