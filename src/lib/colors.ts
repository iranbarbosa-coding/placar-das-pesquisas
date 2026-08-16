import { candKey } from "./average";

/**
 * A candidate's colour, decided by their NAME and never by their position.
 *
 * This is a rule the project has paid for elsewhere: output that depends on
 * array order changes when averages move, and a reader tracking a line across
 * the hero, the chart and the runoff cards would see it change colour for no
 * reason they could name. The hash makes the colour a property of the person.
 *
 * IT LIVES HERE BECAUSE IT WAS WRITTEN THREE TIMES. `AverageChart`,
 * `HeroChart` and `RunoffCarousel` each grew their own copy — every one a
 * client component that cannot import from `lib/home` (which reaches `node:fs`
 * through `lib/data`), and none able to add a shared module at the time.
 * `lib/average` is Node-free, so this one can sit beside it and be imported
 * from anywhere.
 *
 * ── THE SUBTLETY THAT MAKES A SHARED COPY NECESSARY ────────────────────────
 * Slots are resolved by FORWARD PROBING: when two names hash to the same slot,
 * the second takes the next free one. That makes an assignment depend on the
 * whole KEY SET, not just the name — so computing over six names can hand a
 * candidate a different colour than computing over eight. Three copies with
 * three different key sets is not a tidiness problem, it is the same candidate
 * rendered in two colours on one page.
 *
 * So callers pass the set to assign over, and WHAT THEY PASS DECIDES WHAT THE
 * COLOUR MEANS:
 *
 *   · Within one race — the hero and the race chart — pass the race's top
 *     `PALETTE_SIZE`, even when fewer are drawn. Both then resolve against one
 *     key set and a candidate keeps one colour across both.
 *   · A self-contained card with its own legend — a runoff donut — assigns over
 *     just its own pair, so its two slices are distinguishable from each other.
 *     Those colours are NOT comparable to the hero's: the same candidate can be
 *     blue in the first-round chart and orange on a runoff card.
 *
 * That second case is a deliberate trade, not an oversight. Making colour a
 * pure hash with no probing would fix it and cost worse: with eight slots and
 * eight lines, two candidates sharing a colour in one chart is near-certain,
 * and an unreadable chart is a bigger failure than a hue that shifts between a
 * chart and a card that carries its own key.
 */
export const PALETTE = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--series-${i})`);

/** The palette size, exported so callers cap their key set to match. */
export const PALETTE_SIZE = PALETTE.length;

/** FNV-1a. Small, stable, and — unlike a sum of char codes — not order-blind.
 *  Exported because callers also use it to mint collision-free DOM ids. */
export function hashName(key: string): number {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) {
    h ^= key.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Map names to palette colours.
 *
 * Assignment iterates in NAME order, not the caller's order, so passing the
 * same set in a different sequence yields the same map.
 *
 * @param names every candidate the colour scheme should cover — pass the race's
 *   top `PALETTE_SIZE`, even if fewer are drawn, so every component on the page
 *   resolves against one key set.
 */
export function colorMap(names: readonly string[]): Map<string, string> {
  const keys = [...new Set(names.map((n) => candKey(n)))].sort();
  const taken = new Array<boolean>(PALETTE.length).fill(false);
  const out = new Map<string, string>();
  for (const k of keys) {
    let slot = hashName(k) % PALETTE.length;
    for (let step = 0; step < PALETTE.length && taken[slot]; step++) {
      slot = (slot + 1) % PALETTE.length;
    }
    taken[slot] = true;
    out.set(k, PALETTE[slot]);
  }
  return out;
}

/** One candidate's colour from a map built by `colorMap`. */
export function colorOf(map: Map<string, string>, name: string): string {
  return map.get(candKey(name)) ?? PALETTE[0];
}
