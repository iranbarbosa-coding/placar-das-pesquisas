import Hero from "@/components/Hero";
import RunoffCarousel from "@/components/RunoffCarousel";
import StateRail from "@/components/StateRail";
import MatchupRows from "@/components/MatchupRows";
import LatestPollsTable from "@/components/LatestPollsTable";
import { heroRace, runoffCards, stateRail, matchupRows, latestForTable } from "@/lib/home";

/**
 * The front page, in six bands.
 *
 * The shape is RealClearPolitics': masthead, a hero that takes most of the first
 * screen, a card carousel, then a two-column body with the state rail on the
 * right, matchup bars and the dense latest-polls table.
 *
 * ONE RACE GETS THE FRONT PAGE. That is the deliberate cost of the hero — the
 * presidential first round occupies the fold, and everything else earns its way
 * below it. The alternative, a grid of equal cards, tells a reader nothing about
 * what matters today.
 *
 * Every number here is on votos válidos and there is no basis toggle: the toggle
 * lives on the race pages where there is room to explain what the other cut
 * means. Senate figures pass through unconverted and say so.
 */
export default function Home() {
  const hero = heroRace();
  const cards = runoffCards(5);
  const rail = stateRail();
  const matchups = matchupRows();
  const latest = latestForTable(40);

  return (
    <>
      {/* Full-bleed, so it must sit outside the page container. */}
      <Hero
        average={hero?.average ?? null}
        headline={hero?.headline ?? null}
        scenario={hero?.scenario}
      />

      <div className="space-y-12">
        {cards.length ? (
          <RunoffCarousel cards={cards} title="Confrontos de 2º turno" />
        ) : null}

        {/* Two columns below the hero: the body, then the state rail. On phones
            the rail stacks under the content rather than ahead of it — a reader
            arriving on a phone wants the race before the index. */}
        <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="space-y-12">
            <MatchupRows rows={matchups} />
            <LatestPollsTable rows={latest} />
          </div>
          <StateRail items={rail} />
        </div>
      </div>
    </>
  );
}
