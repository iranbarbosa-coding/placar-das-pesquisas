"use client";

import { useState } from "react";
import Hero from "./Hero";
import type { Headline } from "@/lib/home";
import type { RaceAverage } from "@/lib/types";
import type { Basis } from "@/lib/validos";

/**
 * The front page's hero, with a basis control over IT AND NOTHING ELSE.
 *
 * ── IT SWITCHES BETWEEN TWO PRECOMPUTED AVERAGES ──────────────────────────
 * Exactly the mechanism `RaceView` uses, for exactly the same reason. Both cuts
 * are built server-side by `scenarioGroups` and shipped as props; this
 * component only chooses which object to hand `Hero`. Recomputing the
 * valid-vote conversion in the browser would be a second implementation of
 * `average.ts` free to drift from the first (§5), and this repo has already
 * paid for that class of bug.
 *
 * ── WHY IT GOVERNS ONLY THE HERO, AND HOW THE READER IS TOLD ──────────────
 * The owner's call: the home page stays on votos válidos, and only the hero
 * moves. That is a promise the UI has to keep visibly, because a control that
 * looks global and acts local is worse than no control — a reader would compare
 * a "bruto" hero against a válidos carousel and read the gap as news.
 *
 * Three things say so, and the first two are not decoration:
 *   · the group's accessible name — "Base dos números deste bloco";
 *   · a caption under the buttons naming what does NOT change;
 *   · the toggle lives inside the hero band, above the fold's own caption,
 *     rather than in a page-level toolbar.
 *
 * The control is not offered at all when there is nothing to switch between —
 * Senate has no second cut, and neither does a race with no average.
 */
export interface HeroBasisSwitchProps {
  /** The válidos cut — the site default, and what the rest of the page uses. */
  average: RaceAverage | null;
  headline: Headline | null;
  /** The same race as published, precomputed at build time. */
  averageBruto: RaceAverage | null;
  headlineBruto: Headline | null;
  scenario?: string;
}

export default function HeroBasisSwitch({
  average,
  headline,
  averageBruto,
  headlineBruto,
  scenario,
}: HeroBasisSwitchProps) {
  const [basis, setBasis] = useState<Basis>("validos");

  const convertible = average != null && averageBruto != null && average.basis === "validos";
  const useBruto = convertible && basis === "bruto";
  const shown = !convertible ? (average ?? averageBruto) : useBruto ? averageBruto : average;
  const shownHeadline = !convertible ? (headline ?? headlineBruto) : useBruto ? headlineBruto : headline;

  return (
    <Hero
      average={shown}
      headline={shownHeadline}
      scenario={scenario}
      controls={
        convertible ? (
          // Compact toggle only — the long "muda apenas este bloco" explainer was
          // removed to match the mockup's dense header. The scope note now lives
          // as the toggle's title/aria-label instead of a paragraph.
          <div
            role="group"
            aria-label="Base dos números deste bloco — muda apenas o bloco presidencial; o resto do site segue em votos válidos"
            title="Muda apenas este bloco; o resto do site segue em votos válidos"
            className="inline-flex w-fit overflow-hidden rounded-md text-xs"
            style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}
          >
            {(["validos", "bruto"] as const).map((b) => (
              <button
                key={b}
                type="button"
                onClick={() => setBasis(b)}
                aria-pressed={basis === b}
                className="px-2.5 py-1 transition-colors"
                style={{
                  background: basis === b ? "var(--accent)" : "transparent",
                  color: basis === b ? "#fff" : "var(--text-muted)",
                  fontWeight: basis === b ? 600 : 400,
                }}
              >
                {b === "validos" ? "votos válidos" : "bruto"}
              </button>
            ))}
          </div>
        ) : null
      }
    />
  );
}
