import Link from "next/link";
import { fmtDate, fmtPct } from "@/lib/format";
import type { RaceAverage, UF } from "@/lib/types";

/**
 * The big comparison bars: leader, runner-up and everyone else, for the five
 * largest electorates, largest on top.
 *
 * Server component — nothing here is interactive. Data arrives as a prop
 * (`matchupRows()` output); this file loads nothing and decides nothing about
 * which states appear.
 *
 * ── On the missing photographs ──────────────────────────────────────────────
 * RCP puts a candidate photo inside each bar. We have none, and we are not
 * scraping press images to fake it. The intended source is the TSE's
 * DivulgaCand, which is a scraper that has not been written. So each bar
 * carries a FIXED-SIZE slot at its left edge: a monogram (initials on a colour
 * hashed from the candidate's name, so it is stable across builds) today, and
 * an `<img>` the moment a `photoUrl` is supplied. The slot is absolutely
 * positioned and its size never depends on its contents, so the real photo
 * drops in with no relayout of the bar, the label or the percentage.
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
  /** Set once DivulgaCand exists; until then the slot renders a monogram. */
  photoUrl?: string | null;
}

export interface MatchupRow {
  uf: UF;
  name: string;
  average: RaceAverage | null;
  /** Empty exactly when the state has no governor average yet. */
  bars: MatchupBar[];
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
        className="border-b pb-2 text-xs font-bold uppercase tracking-widest"
        style={{ borderColor: "var(--grid)", color: "var(--text-secondary)" }}
      >
        {title}
      </h2>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        Governador, 1º turno, do maior eleitorado para o menor (ordem conforme o eleitorado de 2022).
      </p>

      <ol className="mt-4 space-y-4">
        {rows.map((row) => (
          <li key={row.uf} className="card p-4 sm:p-5">
            <div className="flex items-baseline justify-between gap-3">
              <h3 className="text-base font-bold">
                <Link href={`/estados/${row.uf.toLowerCase()}`} className="hover:underline">
                  {row.name}
                </Link>
              </h3>
              <span className="tabular text-xs font-semibold" style={{ color: "var(--text-muted)" }}>
                {row.uf}
              </span>
            </div>

            {row.bars.length === 0 || !row.average ? (
              <p className="mt-2 text-sm italic" style={{ color: "var(--text-muted)" }}>
                Sem média: nenhuma pesquisa de governador registrada para este estado.
              </p>
            ) : (
              <>
                <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
                  {row.average.pollCount} pesquisa{row.average.pollCount === 1 ? "" : "s"} · última em{" "}
                  {fmtDate(row.average.lastPollDate)}
                  {row.average.basis === "validos" ? " · votos válidos" : null}
                </p>
                <Bars bars={row.bars} />
              </>
            )}
          </li>
        ))}
      </ol>
    </section>
  );
}

/** Rank order is the order given: leader, runner-up, Outros. Hence `<ol>`. */
function Bars({ bars }: { bars: MatchupBar[] }) {
  const scale = trackScale(bars);
  return (
    <>
      <ol className="mt-3 space-y-3">
        {bars.map((bar, i) => (
          <li key={`${bar.kind}-${bar.label}-${i}`}>
            <Bar bar={bar} scale={scale} />
          </li>
        ))}
      </ol>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        <span aria-hidden="true">┊ </span>A linha tracejada marca 50%, o mínimo para vencer no 1º turno.
      </p>
    </>
  );
}

function Bar({ bar, scale }: { bar: MatchupBar; scale: number }) {
  const width = barWidth(bar.pct, scale);
  const isLeader = bar.kind === "leader";
  const isOthers = bar.kind === "others";
  // `--text-muted` is the one neutral that reads against the track in BOTH
  // themes; `--axis` disappears into `--grid` in the dark palette.
  const fill = isLeader ? "var(--series-1)" : bar.kind === "runner" ? "var(--series-2)" : "var(--text-muted)";
  return (
    <div className="flex items-center gap-3">
      <div className="min-w-0 flex-1">
        {/* The name sits ABOVE the bar rather than on it. Inside the bar it would
            be white-on-fill, which is a contrast gamble in two themes, and it
            would vanish entirely whenever the fill is a couple of points wide
            (Bahia's "Outros" is 3,2). Above the bar it is always legible. */}
        {/* Plain inline flow, not a flex row: the label must wrap as one
            sentence on a 375px screen. `truncate` here would imply
            `white-space: nowrap`, which makes the longest name the card's
            min-content width and pushes the card past the viewport — measured
            at 367px against a 327px column before this was flattened. */}
        <div className="text-sm">
          <span className="break-words" style={{ fontWeight: isLeader ? 700 : 500 }}>
            {bar.label}
          </span>
          {bar.party && (
            <span className="ml-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
              ({bar.party})
            </span>
          )}
          {/* Rank in words: leader and runner-up must be told apart without
              relying on the fill colour. */}
          {!isOthers && (
            <span
              className="ml-1.5 inline-block rounded px-1 text-[0.625rem] font-bold uppercase tracking-wide"
              style={{ background: "var(--grid)", color: "var(--text-secondary)" }}
            >
              {isLeader ? "1º" : "2º"}
            </span>
          )}
        </div>

        <div
          className="relative mt-1 h-12 overflow-hidden rounded-md"
          style={{ background: "var(--grid)" }}
          aria-hidden="true"
        >
          <div
            className="absolute inset-y-0 left-0"
            style={{
              width: `${width}%`,
              background: fill,
              // "Outros" is an aggregate, not a candidate; the hatch says so
              // without depending on anyone reading the colour.
              backgroundImage: isOthers
                ? "repeating-linear-gradient(135deg, transparent 0 6px, var(--grid) 6px 9px)"
                : undefined,
            }}
          />
          {/* 50 points, in track coordinates. */}
          <div
            className="absolute inset-y-0 w-0 border-l border-dashed"
            style={{ left: `${barWidth(50, scale)}%`, borderColor: "var(--text-muted)" }}
          />
          <PhotoSlot bar={bar} />
        </div>
      </div>

      <div
        // Fixed width, not fit-to-content: the three bars of a state are
        // separate flex rows, so a column that resized per row would leave
        // their tracks starting and ending at different x.
        className="tabular w-20 shrink-0 whitespace-nowrap text-right text-3xl leading-none sm:w-24 sm:text-4xl"
        style={{
          fontWeight: isLeader ? 700 : 600,
          color: isOthers ? "var(--text-muted)" : "var(--text-primary)",
        }}
      >
        {/* True minus, matching the rail's badges. Cannot arise from
            `matchupRows()` — averages are non-negative — but the formatting is
            the site's, not this component's, so it holds for any input. */}
        {fmtPct(bar.pct).replace("-", "−")}
        {Number.isFinite(bar.pct) && (
          <span className="text-base font-semibold" style={{ color: "var(--text-muted)" }}>
            %
          </span>
        )}
      </div>
    </div>
  );
}

/**
 * The photo slot. Fixed geometry, three states:
 *   • `photoUrl` present → the real portrait, cropped to the circle;
 *   • a candidate without one → a monogram on a colour hashed from the name;
 *   • "Outros" → empty. It is a sum of people, not a person, and a monogram
 *     there would invent a candidate who does not exist.
 * Decorative in all three cases: the name is already text right above the bar,
 * so the slot is inside the `aria-hidden` track and adds nothing for a reader.
 */
function PhotoSlot({ bar }: { bar: MatchupBar }) {
  const box = "absolute left-1.5 top-1/2 h-9 w-9 -translate-y-1/2 overflow-hidden rounded-full";
  const ring = { boxShadow: "0 0 0 2px var(--surface-1)" };

  // Not an empty ring, not a placeholder: nothing at all. The bar carries no
  // text, so the slot reserves no space it needs, and an empty portrait frame
  // on an aggregate reads as a candidate whose photo failed to load.
  if (bar.kind === "others") return null;

  if (bar.photoUrl) {
    return (
      <span className={box} style={ring}>
        {/* Plain <img>: this is a statically exported site and the portraits
            will be local files under /public once DivulgaCand is scraped. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={bar.photoUrl} alt="" className="h-full w-full object-cover" />
      </span>
    );
  }

  const tint = `var(--series-${seriesIndex(bar.label)})`;
  return (
    <span
      className={`${box} flex items-center justify-center text-xs font-bold`}
      style={{
        ...ring,
        // Mixed against the theme's own surface and text so the monogram stays
        // legible in light and dark without two hardcoded palettes.
        background: `color-mix(in srgb, ${tint} 22%, var(--surface-1))`,
        color: `color-mix(in srgb, ${tint} 65%, var(--text-primary))`,
      }}
    >
      {initials(bar.label)}
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

/** "de", "da", "dos"… are not initials. */
const PARTICLE = /^(d[aeo]s?|e|von|van|del|la)$/i;

function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter((p) => p.length > 0 && !PARTICLE.test(p));
  if (parts.length === 0) return "?";
  const first = [...parts[0]];
  const head = first[0] ?? "";
  const tail = parts.length > 1 ? ([...parts[parts.length - 1]][0] ?? "") : (first[1] ?? "");
  return (head + tail).toLocaleUpperCase("pt-BR");
}

/**
 * Stable 1–8 series index from the candidate's name. Deterministic, so a
 * candidate keeps the same monogram colour across builds and across pages —
 * and carries no party meaning, which is why the party is printed in text.
 */
function seriesIndex(name: string): number {
  let h = 0;
  for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
  return (h % 8) + 1;
}
