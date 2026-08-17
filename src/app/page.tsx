import HeroBasisSwitch from "@/components/HeroBasisSwitch";
import RunoffBars from "@/components/RunoffBars";
import MatchupRows from "@/components/MatchupRows";
import LatestPollsTable from "@/components/LatestPollsTable";
import HomeSidebar from "@/components/HomeSidebar";
import {
  heroRace,
  runoffCards,
  matchupRows,
  latestForTable,
  stateHighlights,
  recentMovers,
  stateMapData,
} from "@/lib/home";

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

  return (
    <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">
      {/* LEFT: the main stack. `min-w-0` keeps the wide table from forcing the
          track past the viewport on phones (a documented overflow fix). */}
      <div className="flex min-w-0 flex-col gap-6">
        <section className="card p-4 sm:p-6" aria-label="Corrida presidencial">
          <HeroBasisSwitch
            average={hero?.average ?? null}
            headline={hero?.headline ?? null}
            averageBruto={hero?.averageBruto ?? null}
            headlineBruto={hero?.headlineBruto ?? null}
            scenario={hero?.scenario}
          />
        </section>

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
      <HomeSidebar highlights={highlights} movers={movers} map={map} />
    </div>
  );
}
