// How much of a poll's sample the published numbers actually account for.
//
// A vote-intention table should add up: every candidate, plus "outros", plus
// blank/null, plus the undecided, is the whole sample. When it lands well
// short, rows are missing at the source — an institute published only the top
// three, or a table was truncated. Those polls are not wrong, they are
// INCOMPLETE, and the distinction matters because votos válidos divides by the
// sum of what is present: a poll missing 40 points inflates everyone left in it.
//
// Measured on the real database (2.056 presidential + governor polls):
//   99–101%  1.848  89,9%   complete
//   95–99%      67   3,3%   rounding and the odd omitted minor candidate
//   90–95%      38   1,8%
//   <90%        76   3,7%   ← gated
// The worst carry a single candidate row and sum to 33%.
//
// SENATE IS EXCLUDED. Two seats per voter means the table sums to ~200%, so the
// same arithmetic says nothing, and votos válidos never applies there anyway.

/** The gate. Below this share of the sample accounted for, a poll is incomplete. */
export const LIMIAR = 90;

export function completeness(poll) {
  if (poll.race === "senador") return { applicable: false, sum: null, missing: null, incomplete: false };
  const sum =
    (poll.results ?? []).reduce((a, r) => a + (r.pct ?? 0), 0) +
    (poll.others_pct ?? 0) + (poll.blank_null_pct ?? 0) + (poll.undecided_pct ?? 0);
  const rounded = Math.round(sum * 10) / 10;
  return {
    applicable: true,
    sum: rounded,
    missing: Math.round((100 - rounded) * 10) / 10,
    incomplete: rounded < LIMIAR,
  };
}

/** Polls the average must not use. */
export function isIncomplete(poll) {
  return completeness(poll).incomplete;
}
