import type { Poll } from "./types";

/**
 * A poll's SAMPLE must cover the contest's GEOGRAPHY, or its numbers measure a
 * different electorate than the average is about.
 *
 * The bug this closes: institutes register a MUNICIPAL survey — a sample of one
 * city — and it reaches the store filed under the state contest, because the
 * universe is derived from `poll.state` (upsert.mjs) and a mislabeled municipal
 * poll carries the state's UF. Averaged into the state race, 300–500 voters of
 * one town distort the board (Iran, 2026-08-18). Which surveys are municipal is
 * not a guess from sample size — small state polls exist and are legitimate — it
 * is the cited, blind-certified ledger `data/universe-verdicts.json`, read at
 * projection time (see store.ts / scripts/lib/project.mjs), which stamps
 * `poll.municipal` with the municipality.
 *
 * The state's electorate is the union of its municipalities, so a single-city
 * sample is a null statistic for the state contest — the same shape of ruling as
 * the single-vote senate poll: not a weaker measurement of the race, a
 * measurement of a different thing.
 *
 * Excluded polls are NOT deleted: they stay in the database and in the table,
 * below the average and marked, exactly like `incomplete` and single-vote senate
 * polls. The reader sees what was set aside and why.
 */

/**
 * May this poll enter its contest's average?
 *
 * Every contest the site models — presidente, governador, senador — is state or
 * national, so a municipal-sample poll can enter NONE of them: the answer is
 * simply "not if municipal". If a municipal contest (prefeito/vereador) is ever
 * added to `RaceKind`, this must grow a geography comparison (poll's city vs the
 * contest's) so a municipal poll of that city is not wrongly gated from it — the
 * self-test pins the current behaviour so that change cannot pass silently.
 */
export function geographyAverageable(p: Poll): boolean {
  return !p.municipal;
}
