import type { Poll } from "./types";

/**
 * The Senate asks two questions, and only one of them measures the election.
 *
 * Each state elects TWO senators in this cycle and every voter casts TWO votes.
 * Institutes split on how they ask it: some publish "quem seria seu voto"
 * (figures summing to ~100), others "quem seriam seus dois votos" (~200). No
 * scenario label distinguishes them — the same label appears with both — so the
 * only signal is the arithmetic.
 *
 * Measured across all 532 first-round senate polls in the database: 276 sum to
 * ~100, 247 to ~200, 9 land in between. The distribution is cleanly bimodal
 * with a near-empty valley at 120–140, which is where the threshold sits.
 *
 * RULING (Iran, 2026-08-16): only two-vote polling counts. A one-vote question
 * is a null statistic for a two-seat contest — not a weaker measurement of the
 * race, but a measurement of a different thing. Averaging the two together is
 * what the site did until now, and it was meaningless in 24 of 27 states.
 *
 * Excluded polls are NOT deleted: they stay in the database and in the table,
 * below the average and marked, exactly as polls incomplete at source are. The
 * reader can see what was set aside and why.
 *
 * Impact of the rule, measured: 247 of 532 polls remain, no state loses its
 * average entirely, 12 states still fill the full 10-poll window, and only
 * Roraima falls below the 3-poll floor.
 */
export type SenateVoteMode = "dois" | "um" | "indeterminado";

/** Everything the poll published, candidates and buckets alike. */
function publishedTotal(p: Poll): number {
  return (
    p.results.reduce((a, r) => a + r.pct, 0) +
    (p.others_pct ?? 0) +
    (p.blank_null_pct ?? 0) +
    (p.undecided_pct ?? 0)
  );
}

/**
 * Which question this senate poll asked.
 *
 * The buckets are included in the total on purpose: a two-vote poll that did
 * not publish its branco/NS figures still lands near 160–180 on candidates
 * alone, well clear of the one-vote peak, whereas judging on candidates alone
 * would push those toward the wrong side. `indeterminado` is the 120–140 valley
 * — 9 polls — where the arithmetic genuinely does not say, and an unprovable
 * guess is worse than an exclusion.
 */
export function senateVoteMode(p: Poll): SenateVoteMode {
  if (p.race !== "senador") return "indeterminado";
  const t = publishedTotal(p);
  if (t >= 140) return "dois";
  if (t <= 120) return "um";
  return "indeterminado";
}

/**
 * May this poll enter its race's average?
 *
 * Non-senate races are unaffected. For the Senate, only a two-vote poll
 * qualifies — including the indeterminate ones would smuggle back in exactly
 * the mixing the ruling removes.
 */
export function averageable(p: Poll): boolean {
  if (p.race !== "senador") return true;
  return senateVoteMode(p) === "dois";
}

/** Why a senate poll sits outside the average, for the table to show. */
export function exclusionReason(p: Poll): string | null {
  if (p.race !== "senador") return null;
  const mode = senateVoteMode(p);
  if (mode === "dois") return null;
  return mode === "um"
    ? "pergunta de voto único — o Senado elege dois por estado"
    : "não dá para determinar se a pergunta foi de um ou dois votos";
}
