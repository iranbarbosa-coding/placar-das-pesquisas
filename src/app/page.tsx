import HeroBasisSwitch from "@/components/HeroBasisSwitch";
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
 * The page is on votos válidos throughout, with ONE exception the owner asked
 * for: the hero carries its own basis toggle. It governs the hero and nothing
 * else — see `HeroBasisSwitch` for why that scope is stated three times in the
 * UI rather than left for a reader to discover. Everything below the hero is
 * válidos, always. Senate figures pass through unconverted and say so.
 */
export default function Home() {
  const hero = heroRace();
  // Three cards, ordered 1º v 2º / 1º v 3º / 1º v 4º by the first-round average
  // — the same average the hero renders. See `runoffCards`.
  const cards = runoffCards(3);
  const rail = stateRail();
  const matchups = matchupRows();
  const latest = latestForTable(40);

  return (
    <>
      {/* Full-bleed, so it must sit outside the page container. The switch is a
          thin client wrapper; the hero itself is unchanged and still renders
          whatever average it is handed. */}
      <HeroBasisSwitch
        average={hero?.average ?? null}
        headline={hero?.headline ?? null}
        averageBruto={hero?.averageBruto ?? null}
        headlineBruto={hero?.headlineBruto ?? null}
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
          {/* `min-w-0` is load-bearing on phones, and its absence was invisible
              on desktop. Above `lg` the `minmax(0,…)` above already floors the
              track at 0. BELOW `lg` there is no `grid-cols-*` at all, so these
              land in a single IMPLICIT track sized `auto` — i.e. min-content —
              and a grid item defaults to `min-width: auto`. That let the latest-
              polls table's `min-w-[640px]` propagate out of its own
              `overflow-x-auto` card and force the track to 642px: the card was
              handed the full 640 it asked for, so it had nothing left to scroll
              and the PAGE took the overflow instead. At 375px that put 283px of
              content — the whole DIFERENÇA column and every rail badge — off an
              edge the browser will not scroll to. */}
          <div className="min-w-0 space-y-12">
            <MatchupRows rows={matchups} />
            <LatestPollsTable rows={latest} />
          </div>
          <StateRail items={rail} />
        </div>
      </div>
    </>
  );
}
