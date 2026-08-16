import type { Poll } from "./types";

/**
 * Votos válidos — the site's default cut.
 *
 * Brazilian institutes publish intention over the WHOLE sample: candidates,
 * plus branco/nulo, plus não sabe/não respondeu. The valid-vote cut is what the
 * election itself counts — each candidate over the votes that are actually for
 * a candidate — and it is the number that can be compared to the 50% a first
 * round needs.
 *
 * Denominator = every candidate + `outros`. Branco/nulo and NS/NR are excluded,
 * which is the whole point: they are not valid votes.
 *
 * ── TWO RULES THAT ARE NOT INTERCHANGEABLE ────────────────────────────────
 *
 * 1. CONVERT EACH POLL, THEN AVERAGE. Never average first and convert the
 *    result. The two differ whenever the polls disagree about how much of the
 *    sample is undecided — which is most of the time, since that share is a
 *    house effect. Converting first asks each poll its own question ("of your
 *    valid votes, what share is Lula?") and averages the answers; converting
 *    last invents a poll nobody ran.
 *
 * 2. SENATE IS NEVER CONVERTED. Two seats per state means two votes per voter,
 *    so the published figures already sum to ~200 and there is no "share of
 *    valid votes" that means anything. `toBasis` returns senate polls
 *    untouched no matter what basis is asked for, so a caller cannot get this
 *    wrong by forgetting.
 *
 * A poll that is `incomplete` at source must never reach here — dividing by the
 * sum of what is present inflates everyone still in it, which is exactly why
 * those polls are gated out of averages upstream (Iran, 2026-08-15).
 */
export type Basis = "bruto" | "validos";

/** The valid-vote denominator: candidates + outros, in whole points. */
export function validDenominator(p: Poll): number {
  const cands = p.results.reduce((a, r) => a + r.pct, 0);
  return cands + (p.others_pct ?? 0);
}

/**
 * One poll on the requested basis.
 *
 * `blank_null_pct` and `undecided_pct` are carried through UNCHANGED even in
 * the válidos cut, and deliberately: the caption reports them ("X% responderam
 * branco/nulo, Y% não respondeu") and they are the reader's only way to see how
 * much of the sample the conversion set aside. It does mean a válidos poll's
 * fields no longer sum to 100 if you add those two back in — nothing sums them,
 * and losing the figures would cost more than the tidiness is worth.
 */
export function toBasis(p: Poll, basis: Basis): Poll {
  if (basis === "bruto") return p;
  if (p.race === "senador") return p; // rule 2 — not convertible, not a mistake
  const denom = validDenominator(p);
  // A denominator of zero or a poll already on a valid-vote basis (everything
  // present, nothing set aside) converts to itself; returning the original
  // keeps the identity exact rather than pushing it through a rounding.
  if (denom <= 0) return p;
  const scale = 100 / denom;
  if (Math.abs(scale - 1) < 1e-9) return p;
  return {
    ...p,
    results: p.results.map((r) => ({ ...r, pct: r.pct * scale })),
    others_pct: p.others_pct == null ? p.others_pct : p.others_pct * scale,
  };
}

/** Whether a race can be shown on a valid-vote basis at all. */
export function convertible(race: Poll["race"]): boolean {
  return race !== "senador";
}

/**
 * What the conversion set aside, averaged over the polls shown.
 *
 * Reported split when EVERY poll splits it, and combined otherwise. A mean that
 * silently mixes "3,1 branco/nulo" from the polls that report it with zero from
 * the polls that fold it into a single figure would understate it, and the
 * caption would read as a measurement when it is an artefact of who reported
 * what.
 */
export function setAside(polls: Poll[]): {
  blankNull: number | null;
  undecided: number | null;
  combined: number | null;
} {
  if (!polls.length) return { blankNull: null, undecided: null, combined: null };
  const has = (v: number | null | undefined) => v != null;
  const allSplit = polls.every((p) => has(p.blank_null_pct) && has(p.undecided_pct));
  const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);

  if (allSplit) {
    return {
      blankNull: mean(polls.map((p) => p.blank_null_pct!)),
      undecided: mean(polls.map((p) => p.undecided_pct!)),
      combined: null,
    };
  }
  const totals = polls
    .map((p) => (p.blank_null_pct ?? 0) + (p.undecided_pct ?? 0))
    .filter((v) => v > 0);
  return { blankNull: null, undecided: null, combined: totals.length ? mean(totals) : null };
}
