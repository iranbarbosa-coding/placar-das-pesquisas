"use client";

import { useState } from "react";
import { fmtPct, fmtSigned } from "@/lib/format";
// TYPE-ONLY import — lib/estado reaches node:fs through the data layer, so a
// value import would drag it into the client bundle. The window list is a local
// const instead (same pattern as PresidentMomentum).
import type { StateLeaderGroup, StateMover, StateTrendsData, TrendWindow } from "@/lib/estado";

/**
 * The "TENDÊNCIAS · ÚLTIMOS N DIAS" card of the state Visão geral: three panels —
 * LÍDERES (who leads each race — a snapshot, window-independent) plus MAIOR ALTA
 * and MAIOR QUEDA (who moved most over the window). A 15/30/60-day toggle switches
 * only the movers; every cut is precomputed by `stateTrends`, so the client just
 * picks one (§5). Colours are tokens: each leader group's left stripe is that
 * leader's own identity colour; a rise is the site's green, a fall the brand red.
 */

const WINDOWS: TrendWindow[] = [15, 30, 60];
const UP = "var(--series-3)";
const DOWN = "var(--cand-red)";

function Party({ party }: { party: string | null }) {
  if (!party) return null;
  return (
    <span style={{ color: "var(--text-muted)" }} className="font-normal">
      {" "}
      ({party})
    </span>
  );
}

function LeaderGroup({ group }: { group: StateLeaderGroup }) {
  return (
    <div className="flex gap-3">
      <span aria-hidden="true" className="mt-0.5 w-1 shrink-0 rounded-full" style={{ background: group.accent }} />
      <div className="min-w-0 flex-1">
        <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {group.cargo}
        </div>
        <div className="mt-1 flex flex-col gap-1.5">
          {group.entries.map((e, i) => (
            <div key={i}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="min-w-0 truncate text-sm" style={{ color: "var(--text-primary)" }}>
                  {e.rank ? (
                    <span style={{ color: "var(--text-muted)" }} className="font-semibold">
                      {e.rank}º{" "}
                    </span>
                  ) : null}
                  <span className="font-semibold">{e.name}</span>
                  <Party party={e.party} />
                </span>
                <span className="tabular shrink-0 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
                  {fmtPct(e.pct)}
                </span>
              </div>
              <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                {fmtSigned(e.margin)} p.p. sobre {e.overLabel}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function MoverRow({ m, dir }: { m: StateMover; dir: "up" | "down" }) {
  const color = dir === "up" ? UP : DOWN;
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="min-w-0">
        <div className="truncate text-sm" style={{ color: "var(--text-primary)" }}>
          <span className="font-semibold">{m.name}</span>
          <Party party={m.party} />
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {m.cargo}
        </div>
      </div>
      <span className="tabular shrink-0 whitespace-nowrap text-sm font-bold" style={{ color }}>
        {fmtSigned(m.delta)} p.p. <span aria-hidden="true">{dir === "up" ? "↑" : "↓"}</span>
      </span>
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3 rounded-lg p-4" style={{ border: "1px solid var(--ring)" }}>
      <h3 className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h3>
      {children}
    </div>
  );
}

function Empty() {
  return (
    <p className="text-xs" style={{ color: "var(--text-muted)" }}>
      Sem movimento na janela.
    </p>
  );
}

export default function StateTrends({ data }: { data: StateTrendsData }) {
  const [win, setWin] = useState<TrendWindow>(15);
  const movers = data.windows.find((w) => w.windowDays === win) ?? data.windows[0];

  return (
    <section className="card min-w-0 p-4 sm:p-6">
      <header className="mb-4 flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Tendências · Últimos {win} dias
        </h2>
        <div
          role="group"
          aria-label="Janela da tendência"
          className="inline-flex w-fit overflow-hidden rounded-md text-xs"
          style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}
        >
          {WINDOWS.map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => setWin(w)}
              aria-pressed={win === w}
              className="px-2.5 py-1 transition-colors"
              style={{
                background: win === w ? "var(--accent)" : "transparent",
                color: win === w ? "#fff" : "var(--text-muted)",
                fontWeight: win === w ? 600 : 400,
              }}
            >
              {w}d
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Líderes">
          {data.leaders.length ? (
            <div className="flex flex-col gap-4">
              {data.leaders.map((g, i) => (
                <LeaderGroup key={i} group={g} />
              ))}
            </div>
          ) : (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Sem dado suficiente na janela.
            </p>
          )}
        </Panel>

        <Panel title="Maior alta">
          {movers && movers.gainers.length ? (
            <div className="flex flex-col gap-3">
              {movers.gainers.map((m, i) => (
                <MoverRow key={i} m={m} dir="up" />
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>

        <Panel title="Maior queda">
          {movers && movers.losers.length ? (
            <div className="flex flex-col gap-3">
              {movers.losers.map((m, i) => (
                <MoverRow key={i} m={m} dir="down" />
              ))}
            </div>
          ) : (
            <Empty />
          )}
        </Panel>
      </div>
    </section>
  );
}
