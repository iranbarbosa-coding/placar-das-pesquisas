import type { RaceAverage } from "@/lib/types";

/**
 * The one-line summary of a race average.
 *
 *  · 1º turno (presidente/governador), votos válidos → `Lula | −2,1 do 1º turno`
 *    — the leader's distance from the 50% an outright first-round win needs.
 *  · 2º turno → `Lula | +3,3` — the lead over the other candidate, on both cuts.
 *  · Senado → nothing, ever. Two seats per state means the published figures sum
 *    to ~200: there is no 50% to be short of and no "the other candidate".
 *
 * In 1º turno on the bruto cut there is deliberately NO summary number — the
 * distance to 50% only means something in valid votes, and the badge disappears
 * rather than inventing something that would survive the switch.
 */

function fmt1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

/** `+3,3` / `−2,1` (U+2212) / `0,0` — never `−0,0`. */
function signed(v: number): string {
  const r = Math.round(v * 10) / 10;
  if (r > 0) return `+${fmt1(r)}`;
  if (r < 0) return `−${fmt1(Math.abs(r))}`;
  return "0,0";
}

function shortName(name: string): string {
  return name.split(" ")[0];
}

export interface RaceBadgeProps {
  /** The average whose leader is being summarised. */
  average: RaceAverage;
  className?: string;
}

export default function RaceBadge({ average, className }: RaceBadgeProps) {
  const leader = average.candidates[0];
  const runnerUp = average.candidates[1];

  if (!leader) return null;
  if (average.key.race === "senador") return null;

  let value: string;
  let suffix: string | null = null;

  if (average.key.round === 2) {
    // No runner-up in the group means there is no lead over anybody. (Note that
    // `average.spread` degrades to the leader's own number here, which is why it
    // is not used.) Nothing honest to show, so nothing is shown.
    if (!runnerUp) return null;
    value = signed(leader.avg - runnerUp.avg);
  } else {
    if (average.basis !== "validos") return null;
    value = signed(leader.avg - 50);
    suffix = "do 1º turno";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm ${className ?? ""}`}
      style={{ border: "1px solid var(--ring)", background: "var(--surface-1)" }}
    >
      <span className="font-semibold">{shortName(leader.candidate)}</span>
      <span aria-hidden="true" style={{ color: "var(--grid)" }}>
        |
      </span>
      <span className="tabular font-semibold" style={{ color: "var(--text-primary)" }}>
        {value}
      </span>
      {suffix && (
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {suffix}
        </span>
      )}
    </span>
  );
}
