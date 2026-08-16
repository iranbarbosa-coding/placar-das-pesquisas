"use client";

import { useState } from "react";
import AverageChart from "./AverageChart";
import RaceTable from "./RaceTable";
import RaceBadge from "./RaceBadge";
import { AverageCaption } from "./AverageCaption";
import type { Poll, RaceAverage } from "@/lib/types";
import type { Basis } from "@/lib/validos";

/**
 * One race: chart → caption → table, with a single basis control over all of them.
 *
 * THE TOGGLE SWITCHES BETWEEN TWO PRECOMPUTED AVERAGES, it does not compute.
 * The site is fully static, so the alternative was recomputing the valid-vote
 * conversion and the whole averaging rule in the browser — a second
 * implementation of `average.ts` living in client code, free to drift. Both
 * cuts are built server-side in `scenarioGroups` and shipped; this component
 * only chooses which object to render. A few KB against a class of bug this
 * repo has already been bitten by.
 *
 * Senate is never offered the toggle: `toBasis` refuses to convert a two-vote
 * ballot, so the control would be a no-op that implies a choice exists.
 */
export default function RaceView({
  polls,
  average,
  averageBruto,
  title,
}: {
  polls: Poll[];
  /** The válidos cut — the site default. */
  average: RaceAverage | null;
  /** The same race as published, for the toggle. */
  averageBruto: RaceAverage | null;
  title?: string;
}) {
  const [basis, setBasis] = useState<Basis>("validos");

  const convertible = average != null && averageBruto != null && average.basis === "validos";
  const shown = !convertible ? (average ?? averageBruto) : basis === "validos" ? average : averageBruto;

  if (!shown) {
    return (
      <section className="card p-4">
        {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
        <p className="mt-2 text-sm" style={{ color: "var(--text-muted)" }}>
          Sem pesquisas suficientes para uma média nesta disputa.
        </p>
        <RaceTable polls={polls} average={null} basis="bruto" />
      </section>
    );
  }

  return (
    <section className="space-y-3">
      <header className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          {title ? <h3 className="text-sm font-semibold">{title}</h3> : null}
          <RaceBadge average={shown} />
        </div>

        {convertible ? (
          <div
            role="group"
            aria-label="Base dos percentuais"
            className="inline-flex overflow-hidden rounded-md text-xs"
            style={{ border: "1px solid var(--grid)" }}
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
        ) : null}
      </header>

      <figure className="card m-0 p-3">
        <AverageChart average={shown} />
        <AverageCaption average={shown} />
      </figure>

      {/* `windowPollIds` comes from the average itself, so the table shows the
          same ten polls the number was built from — rather than re-deriving the
          selection rule and drifting from it. */}
      <RaceTable
        polls={polls}
        average={shown}
        basis={shown.basis}
        inAverageIds={shown.windowPollIds}
      />
    </section>
  );
}
