import { candKey } from "./average";

/**
 * A candidate's colour, decided by their NAME and never by their position.
 *
 * This is a rule the project has paid for elsewhere: output that depends on
 * array order changes when averages move, and a reader tracking a line across
 * the hero, the chart and the runoff cards would see it change colour for no
 * reason they could name. The hash makes the colour a property of the person.
 *
 * ── WHY THE HASH IS NO LONGER ENOUGH FOR THE KNOWN FIELD ───────────────────
 * The hash makes colour a property of the person only WITHIN one key set. The
 * probing described below means the same person resolves differently when the
 * set changes, and that shipped as a real defect: on ONE row of the runoff
 * carousel Lula was orange on four cards and green on the third — and the green
 * on the card beside it was Zema. A reader scanning the row read a colour swap
 * as a candidate swap.
 *
 * So the candidates who actually carry the race are pinned to a FIXED colour
 * (`FIXED_COLORS` below) and no longer take part in the hash at all. Everyone
 * else keeps the old deterministic hash over the remaining slots.
 *
 * IT LIVES HERE BECAUSE IT WAS WRITTEN THREE TIMES. `AverageChart`,
 * `HeroChart` and the old runoff carousel each grew their own copy — every one a
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
 * That second case WAS accepted as a trade and is what broke: see the carousel
 * defect above. It is now closed for the pinned field — a fixed candidate is
 * outside the probing entirely, so their colour no longer depends on the key
 * set at all. It remains open, and still deliberate, for everyone else: making
 * colour a pure hash with no probing would fix it and cost worse, since with
 * eight slots and eight lines two candidates sharing a colour in one chart is
 * near-certain, and an unreadable chart is a bigger failure than a hue that
 * shifts between a chart and a card that carries its own key.
 *
 * ⚠ ONE COLLISION THE FIXED MAP CANNOT PREVENT: a pinned hue and a hashed
 * `--series-*` can land close to each other in the same chart (e.g. pinned blue
 * beside `--series-1`). The twelve pinned candidates are mutually distinct, and
 * every chart on the site prints a text legend beside the colour, so this
 * degrades legibility rather than meaning. Not fixed here.
 */
export const PALETTE = [1, 2, 3, 4, 5, 6, 7, 8].map((i) => `var(--series-${i})`);

/** The palette size, exported so callers cap their key set to match. */
export const PALETTE_SIZE = PALETTE.length;

/**
 * The candidates whose colour is a decision, not a hash.
 *
 * Owner's mapping (2026-08-17), extended below the line he drew. The values are
 * CSS custom properties, remapped per theme in `app/globals.css` exactly like
 * `--series-*`; nothing here is a hex, so a component cannot pin one theme's
 * colour into the other. Two of them — amber and lime — deliberately render
 * as a deep gold/olive in the light theme and as a true yellow/lime in the
 * dark one. The WHY is written where the values are.
 *
 * ── SCOPE: EVERY RACE, NOT JUST THE NATIONAL PRESIDENTIAL ONE ─────────────
 * The mapping was chosen for the presidential field, and the obvious reading of
 * the brief is to scope it there. It is applied globally instead, and the data
 * is the reason: these same canonical names appear outside `presidente/BR` and
 * they are the SAME PEOPLE — Ciro Gomes in governador/CE (44 questions),
 * Tarcísio in governador/SP (53), Ratinho Jr in senador/PR, Zema in senador/MG,
 * Ronaldo Caiado in governador/GO, Flávio Bolsonaro in governador/SP, and all
 * twelve across the presidential STATE subsamples. Scoping the map to one race
 * would hand a reader Tarcísio in magenta on the home page and in whatever
 * `--series-*` the hash picked on /estados/sp, which is the defect this change
 * exists to remove, one page over.
 *
 * That is safe here because a canonical name IS a person in this database: the
 * ballot-name matcher refuses ambiguity rather than guessing (it is what keeps
 * "Ciro Gomes" and "Ciro Nogueira" apart), so two people cannot share one key.
 * If that ever stops holding, this map must take a race parameter.
 *
 * Keys are `candKey`-folded, so accents and case vary freely at the call site
 * ("Tarcísio"/"TARCISIO") while "Ciro Gomes" and "Ciro Nogueira" stay distinct
 * — the fold never splits on tokens.
 */
const FIXED_COLORS: ReadonlyMap<string, string> = new Map(
  (
    [
      // The owner's twelve, in his order.
      ["Lula", "red"],
      ["Ronaldo Caiado", "blue"],
      ["Zema", "orange"],
      ["Renan Santos", "amber"],
      ["Flávio Bolsonaro", "green"],
      ["Escritor Augusto Cury", "purple"],
      ["Ratinho Jr", "teal"],
      ["Ciro Gomes", "pink"],
      ["Aldo Rebelo", "brown"],
      ["Cabo Daciolo", "slate"],
      ["Tarcísio", "magenta"],
      ["Samara", "lime"],
    ] as const
  ).map(([name, hue]) => [candKey(name), `var(--cand-${hue})`] as const),
);

/** A candidate's pinned colour, or `null` when they are left to the hash. */
export function fixedColor(name: string): string | null {
  return FIXED_COLORS.get(candKey(name)) ?? null;
}

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
  const out = new Map<string, string>();

  // Pinned first, and they consume NO palette slot: a fixed candidate must not
  // shift what the hash hands the rest, or the key-set dependence would simply
  // move rather than shrink.
  const floating: string[] = [];
  for (const k of keys) {
    const fixed = FIXED_COLORS.get(k);
    if (fixed) out.set(k, fixed);
    else floating.push(k);
  }

  const taken = new Array<boolean>(PALETTE.length).fill(false);
  for (const k of floating) {
    let slot = hashName(k) % PALETTE.length;
    for (let step = 0; step < PALETTE.length && taken[slot]; step++) {
      slot = (slot + 1) % PALETTE.length;
    }
    taken[slot] = true;
    out.set(k, PALETTE[slot]);
  }
  return out;
}

/**
 * One candidate's colour from a map built by `colorMap`.
 *
 * The `fixedColor` fallback is load-bearing, not belt-and-braces: callers cap
 * the key set they assign over (`HeroChart` passes the top `PALETTE_SIZE`), so
 * a pinned candidate ranked 9th is absent from the map — and the old
 * `?? PALETTE[0]` would have painted them blue, i.e. Ronaldo Caiado's colour.
 */
export function colorOf(map: Map<string, string>, name: string): string {
  return map.get(candKey(name)) ?? fixedColor(name) ?? PALETTE[0];
}

/**
 * THE DUAL PALETTE (2026-08-17). The home page composition colours every race
 * with two hues plus grey — leader, rival, and a muted rest — per the creator's
 * redesign mockup. `leadHue` flips which of red/blue leads: the presidential
 * chart and the runoff bars lead RED (Lula), while the state college bars lead
 * BLUE, both matching the picture. `rank` is 0-based over the race's candidates
 * as already sorted by average.
 */
export function dualColor(rank: number, leadHue: "red" | "blue" = "red"): string {
  if (rank <= 0) return leadHue === "red" ? "var(--dual-lead)" : "var(--dual-rival)";
  if (rank === 1) return leadHue === "red" ? "var(--dual-rival)" : "var(--dual-lead)";
  return "var(--series-muted)";
}

/**
 * The ink for text painted ON one of these fills.
 *
 * Exists because the matchup bars stopped colouring by RANK and started
 * colouring by CANDIDATE (2026-08-17). While a bar had only two possible fills
 * a single `--on-fill` covered both, measured. Twenty possible fills do not
 * share one ink: near-black reads at 3,10:1 on the light-theme purple and white
 * reads at 3,63:1 on the light-theme amber, so choosing either globally makes
 * some bar's name illegible.
 *
 * The choice is per fill AND per theme (the dark palette lifts every hue, which
 * flips purple's answer from white to black), so it cannot be computed here —
 * a component must not know one theme's hex, or it pins it into the other. It
 * is therefore taken where the hexes live, `app/globals.css`, as a companion
 * token named `<fill>-ink`; this function only names it. The `var(…, …)`
 * fallback is what keeps that table SHORT: only fills whose ink differs from
 * `--on-fill` need a token, and a fill with no companion — `--text-muted` under
 * the "Outros" hatch — silently keeps the default that was measured for it.
 *
 * Every value this module returns is a `var(--token)`, so the pattern always
 * matches for our own palette; anything else gets the default rather than a
 * malformed colour.
 */
export function inkOn(fill: string): string {
  const token = /^var\(\s*(--[a-z0-9-]+)\s*\)$/i.exec(fill.trim());
  return token ? `var(${token[1]}-ink, var(--on-fill))` : "var(--on-fill)";
}
