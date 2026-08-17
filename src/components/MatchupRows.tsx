import Link from "next/link";
import { colorMap, colorOf, inkOn, PALETTE_SIZE } from "@/lib/colors";
import { fmtDate, fmtPct } from "@/lib/format";
import { shortName } from "@/lib/names";
import type { RaceAverage, UF } from "@/lib/types";

/**
 * The big comparison bars: leader, runner-up and everyone else, for the five
 * largest electorates, largest on top.
 *
 * Server component — nothing here is interactive. Data arrives as a prop
 * (`matchupRows()` output); this file loads nothing and decides nothing about
 * which states appear.
 *
 * ── On the missing photographs, and what took their place ───────────────────
 * RCP puts a candidate photo inside each bar. We have none, and we are not
 * scraping press images to fake it. The intended source is the TSE's
 * DivulgaCand, which is a scraper that has not been written.
 *
 * The bar used to carry a MONOGRAM in that slot — initials on a hashed colour.
 * The owner's call (2026-08-17): put the candidate's NAME inside the bar
 * instead, until real portraits exist. Initials named nobody; a `shortName`
 * does. The `photoUrl` slot survives untouched in the props and in the render,
 * so a portrait drops in the moment one is supplied — it simply pushes the name
 * to the right of it rather than replacing a placeholder.
 *
 * ── The fill is the CANDIDATE's colour, not the rank's ──────────────────────
 * Until 2026-08-17 the fills were positional: `--series-1` for whoever placed
 * first, `--series-2` for whoever placed second. That made a bar's colour a
 * property of the STANDINGS, so the same person changed colour from one part of
 * the site to another — Tarcísio was blue in the São Paulo bar and magenta in
 * the São Paulo chart, and a reader comparing the two had no way to know it was
 * one man. The owner's fixed palette closed that everywhere else; the bars were
 * the one place still painting by rank.
 *
 * They now resolve through the SAME machinery as every chart (`lib/colors`), and
 * over the same KEY SET: the race's top `PALETTE_SIZE`, which is exactly what
 * `AverageChart` assigns over on /estados/[uf] (its `maxSeries` default is 8).
 * That matters for the candidates who are NOT pinned: slots are resolved by
 * forward probing, so a different key set can hand the same person a different
 * `--series-*`. Passing the same set means the home page's bar and the state
 * page's line agree for the hashed field too, not only for the pinned twelve.
 *
 * Rank is therefore no longer in the fill. It was never carried by the fill
 * alone — order, bar width and the big number all say it — but the "1º"/"2º"
 * badge is now the only categorical cue, so the leader's badge is filled rather
 * than tinted (see below).
 *
 * ── Why the name inside the bar is DRAWN TWICE ──────────────────────────────
 * Bahia's "Outros" is 3,2 points: its fill is a sliver and the name spills onto
 * the empty track beside it. One colour cannot be legible on both — the fill is
 * a saturated candidate colour, the track is `--grid`. So the name is painted
 * twice in the same place: once in `--text-primary`, which reads on the track,
 * and once in the fill's own ink, clipped by `clip-path` to exactly the fill's
 * width. Each pixel of the name therefore gets the colour that its own
 * background requires, with no measurement, no JS and no threshold to guess
 * wrong. Both layers sit inside the `aria-hidden` track so the duplication never
 * reaches a screen reader; the full name is real text above the bar, as it
 * always was.
 *
 * That inner ink used to be the constant `--on-fill`, which was measured against
 * the only three fills a bar could then have. Twelve pinned hues and eight
 * hashed ones do not share one ink — near-black is 3,1:1 on the light purple,
 * white is 3,6:1 on the light amber — so it is asked for per fill via `inkOn`.
 * The choice lives with the hexes in `globals.css`, not here; see the note there
 * for the measurements, and for why blue is the hue that decides the design.
 *
 * ── On the arithmetic ───────────────────────────────────────────────────────
 * The three bars are NOT parts of a whole and are deliberately never stacked.
 * A first-round average pools polls whose candidate lists differ, so the
 * per-candidate averages of one state can sum past 100 (São Paulo sums to
 * 111,8 today; Rio to 127,7). Each bar is therefore drawn on an absolute
 * percentage-point scale — the track is 100 points wide, widened only if some
 * value exceeds 100 — so no bar can overflow its track and the widths stay
 * comparable between states.
 */

export interface MatchupBar {
  label: string;
  party: string | null;
  pct: number;
  kind: "leader" | "runner" | "others";
  /** Set once DivulgaCand exists; until then the bar leads with the name alone. */
  photoUrl?: string | null;
}

export interface MatchupRow {
  uf: UF;
  name: string;
  average: RaceAverage | null;
  /** Empty exactly when the state has no governor average yet. */
  bars: MatchupBar[];
  /** Electorate in millions (TSE 2022), for the card subtitle. */
  eleitoresMi?: number | null;
  /** The leader's rolling-average change over 30 days. */
  leaderDelta30?: number | null;
}

export default function MatchupRows({
  rows,
  title = "Maiores colégios eleitorais",
  className = "",
}: {
  rows: MatchupRow[];
  title?: string;
  className?: string;
}) {
  return (
    <section aria-labelledby="matchup-rows-title" className={className}>
      <h2
        id="matchup-rows-title"
        className="text-sm font-bold uppercase tracking-wide"
        style={{ color: "var(--text-secondary)" }}
      >
        {title}
      </h2>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Governador · 1º turno · do maior eleitorado para o menor (ordem conforme o eleitorado de 2022).
      </p>

      <ol className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {rows.map((row) => (
          <li key={row.uf} className="rounded-lg p-4" style={{ background: "var(--surface-2)" }}>
            <div className="flex items-baseline justify-between gap-2">
              <h3 className="min-w-0 truncate text-base font-bold">
                <Link href={`/estados/${row.uf.toLowerCase()}`} className="hover:underline">
                  {row.name}
                </Link>
              </h3>
              <span className="tabular shrink-0 rounded px-1.5 text-[10px] font-bold" style={{ background: "var(--grid)", color: "var(--text-secondary)" }}>
                {row.uf}
              </span>
            </div>
            {row.eleitoresMi != null && (
              <p className="tabular mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                {fmtPct(row.eleitoresMi)} milhões de eleitores
              </p>
            )}

            {row.bars.length === 0 || !row.average ? (
              <p className="mt-2 text-sm italic" style={{ color: "var(--text-muted)" }}>
                Sem média de governador registrada.
              </p>
            ) : (
              <>
                <Bars bars={row.bars} average={row.average} />
                <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <span>
                    {row.average.pollCount} pesquisa{row.average.pollCount === 1 ? "" : "s"} · última em {fmtDate(row.average.lastPollDate)}
                  </span>
                  {row.leaderDelta30 != null && Math.abs(row.leaderDelta30) >= 0.1 && (
                    <span
                      className="tabular font-semibold"
                      style={{ color: row.leaderDelta30 > 0 ? "var(--series-3)" : "var(--cand-red)" }}
                    >
                      {row.leaderDelta30 > 0 ? "▲" : "▼"} {fmtPct(Math.abs(row.leaderDelta30))} p.p. em 30 dias
                    </span>
                  )}
                </div>
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Rank order is the order given: leader, runner-up, Outros. Hence `<ol>`. */
function Bars({ bars, average }: { bars: MatchupBar[]; average: RaceAverage }) {
  const scale = trackScale(bars);
  // The key set is the RACE's top `PALETTE_SIZE`, not the two names drawn — see
  // the note at the top of the file. `average.candidates` is sorted desc, but
  // nothing here depends on that: `colorMap` re-sorts by name before assigning
  // (§8), so the two bars keep their colours when the standings move and only
  // the ORDER of the rows changes.
  const colors = colorMap(average.candidates.slice(0, PALETTE_SIZE).map((c) => c.candidate));
  return (
    <>
      <ol className="mt-3 space-y-3">
        {bars.map((bar, i) => (
          <li key={`${bar.kind}-${bar.label}-${i}`}>
            <Bar bar={bar} scale={scale} colors={colors} />
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span aria-hidden="true">┊ </span>A linha tracejada marca 50%, o mínimo para vencer no 1º turno.
      </p>
    </>
  );
}

function Bar({ bar, scale, colors }: { bar: MatchupBar; scale: number; colors: Map<string, string> }) {
  const width = barWidth(bar.pct, scale);
  const isLeader = bar.kind === "leader";
  const isOthers = bar.kind === "others";
  // A candidate's own colour; "Outros" is not a candidate and must not take one,
  // so it stays the neutral it always was. `--text-muted` is the one neutral
  // that reads against the track in BOTH themes; `--axis` disappears into
  // `--grid` in the dark palette.
  const fill = isOthers ? "var(--text-muted)" : colorOf(colors, bar.label);
  // The in-bar name. `shortName` and not the stored one: the track is ~200px
  // wide at 375px, and it is the helper that knows "Cabo Daciolo" must not
  // become "Cabo". "Outros" has no short form and passes through unchanged.
  const short = shortName(bar.label);
  // Left inset for that name — it clears the portrait only when there IS one.
  // Reserving the slot unconditionally would start every name ~3rem in, which
  // on a 3-point bar puts it past the fill entirely for no gain today.
  const nameInset = bar.photoUrl ? "3rem" : "0.625rem";

  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        {/* The FULL name stays here, above the bar, now as the caption to the
            short form inside it. It is not redundancy for its own sake: this
            line is the only place the party and the rank fit, it is the text a
            screen reader gets (the track below is `aria-hidden`), and it is the
            only rendering of the name that `shortName` has not abbreviated. */}
        {/* Plain inline flow, not a flex row: the label must wrap as one
            sentence on a 375px screen. `truncate` here would imply
            `white-space: nowrap`, which makes the longest name the card's
            min-content width and pushes the card past the viewport — measured
            at 367px against a 327px column before this was flattened. */}
        <div className="text-xs">
          <span className="break-words" style={{ color: "var(--text-secondary)", fontWeight: isLeader ? 600 : 400 }}>
            {bar.label}
          </span>
          {bar.party && (
            <span className="ml-1.5" style={{ color: "var(--text-muted)" }}>
              ({bar.party})
            </span>
          )}
          {/* Rank in words — and since 2026-08-17 the ONLY categorical cue for
              it, the fill having become the candidate's colour. The two badges
              are deliberately unequal now: the leader's is SOLID
              (`--text-primary` chip, `--surface-1` glyphs: 19,2:1 light, 17,4:1
              dark) and the runner-up's keeps the tinted `--grid` chip (6,0:1 and
              7,8:1). Both were legible before; what the tint alone did not do is
              make 1º and 2º differ at a glance, which the old blue/orange fills
              did carry as a side effect. Weight and fill, not a new hue: a
              coloured badge would put colour back to work encoding rank, which
              is the defect this change removes. */}
          {!isOthers && (
            <span
              className="ml-1.5 inline-block rounded px-1 text-[0.625rem] font-bold uppercase tracking-wide"
              style={
                isLeader
                  ? { background: "var(--text-primary)", color: "var(--surface-1)" }
                  : { background: "var(--grid)", color: "var(--text-secondary)" }
              }
            >
              {isLeader ? "1º" : "2º"}
            </span>
          )}
        </div>

        <div
          className="relative mt-1 h-8 overflow-hidden rounded"
          style={{ background: "var(--grid)" }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${width}%`,
              background: fill,
              // "Outros" is an aggregate, not a candidate; the hatch says so
              // without depending on anyone reading the colour. `--hatch`
              // LIGHTENS rather than punching the track through — see the note
              // on that token; the name has to stay legible over the stripes.
              backgroundImage: isOthers
                ? "repeating-linear-gradient(135deg, transparent 0 6px, var(--hatch) 6px 9px)"
                : undefined,
            }}
          />
          {/* 50 points, in track coordinates. */}
          <div
            className="absolute inset-y-0 w-0 border-l border-dashed"
            style={{ left: `${barWidth(50, scale)}%`, borderColor: "var(--text-muted)" }}
          />
          <PhotoSlot bar={bar} />

          {/* Layer 1 — the whole name, in the colour that reads on the TRACK. */}
          <NameLayer name={short} inset={nameInset} bold={isLeader} color="var(--text-primary)" />
          {/* Layer 2 — the same glyphs in the same place, clipped to the fill
              and in the ink that reads on THAT fill (`inkOn`, not a constant:
              twenty possible fills do not share one). `inset(0 X% 0 0)` insets
              from the RIGHT, so the visible part is exactly the filled part; a
              0% bar clips to nothing and layer 1 alone shows. */}
          <NameLayer
            name={short}
            inset={nameInset}
            bold={isLeader}
            color={inkOn(fill)}
            clip={`inset(0 ${100 - width}% 0 0)`}
          />
        </div>
      </div>

      <div
        // Fixed width so the three bars of a state end at the same x.
        className="tabular w-16 shrink-0 whitespace-nowrap text-right text-xl leading-none"
        style={{
          fontWeight: isLeader ? 700 : 600,
          color: isOthers ? "var(--text-muted)" : "var(--text-primary)",
        }}
      >
        {fmtPct(bar.pct).replace("-", "−")}
        {Number.isFinite(bar.pct) && (
          <span className="text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
            %
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * One painting of the in-bar name. Two of these are stacked per bar — see the
 * note at the top of the file on why the same glyphs are drawn twice.
 *
 * Absolutely positioned on purpose: an out-of-flow box contributes nothing to
 * its container's intrinsic width, so `truncate` (i.e. `white-space: nowrap`)
 * here CANNOT do what it did to the old in-flow label — force the longest name
 * to become the card's min-content width and push the card past a 375px
 * viewport. The inner span's automatic minimum size is 0 because it is an
 * `overflow: hidden` box, which is what lets the ellipsis actually appear.
 */
function NameLayer({
  name,
  inset,
  bold,
  color,
  clip,
}: {
  name: string;
  inset: string;
  bold: boolean;
  color: string;
  clip?: string;
}) {
  return (
    <span
      className="pointer-events-none absolute inset-0 flex items-center pr-2"
      style={{ paddingLeft: inset, clipPath: clip }}
    >
      <span className="truncate text-sm" style={{ color, fontWeight: bold ? 700 : 600 }}>
        {name}
      </span>
    </span>
  );
}

/**
 * The photo slot. Fixed geometry, two states:
 *   • `photoUrl` present → the real portrait, cropped to the circle;
 *   • no portrait, or "Outros" → nothing at all.
 *
 * The monogram that used to fill the empty case is gone: the bar now carries
 * the candidate's name, and initials beside a name are noise. Nothing is
 * reserved when there is no portrait — an empty ring reads as a photo that
 * failed to load, and on an aggregate it would invent a person.
 *
 * Decorative either way: the name is real text above the bar, so this sits
 * inside the `aria-hidden` track and adds nothing for a reader.
 */
function PhotoSlot({ bar }: { bar: MatchupBar }) {
  if (bar.kind === "others" || !bar.photoUrl) return null;
  return (
    <span
      className="absolute left-1.5 top-1/2 h-9 w-9 -translate-y-1/2 overflow-hidden rounded-full"
      style={{ boxShadow: "0 0 0 2px var(--surface-1)" }}
    >
      {/* Plain <img>: this is a statically exported site and the portraits
          will be local files under /public once DivulgaCand is scraped. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={bar.photoUrl} alt="" className="h-full w-full object-cover" />
    </span>
  );
}

/**
 * Track width in percentage points. 100 unless some value is larger, which
 * keeps every bar inside its track no matter what is passed in.
 */
function trackScale(bars: MatchupBar[]): number {
  const finite = bars.map((b) => b.pct).filter((p) => Number.isFinite(p));
  return Math.max(100, ...finite);
}

/** Clamped to [0, 100] of the track. Never negative, never overflowing. */
function barWidth(pct: number, scale: number): number {
  if (!Number.isFinite(pct) || pct <= 0) return 0;
  const safeScale = Number.isFinite(scale) && scale > 0 ? scale : 100;
  return Math.min(100, (pct / safeScale) * 100);
}

// `initials` and the private `seriesIndex` hash lived here for the monogram and
// went with it. `lib/names.ts` still exports an `initials` if a monogram is ever
// wanted again; this file no longer needs a second copy of one.
