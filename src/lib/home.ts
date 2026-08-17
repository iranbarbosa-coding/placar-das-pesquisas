import { scenarioGroups, pollsFor } from "./data";
import { candKey, sortPollsDesc } from "./average";
import { toBasis } from "./validos";
import { UFS, UF_NAMES, type UF, type Poll, type RaceAverage } from "./types";

/**
 * Everything the front page needs, assembled once at build time.
 *
 * The homepage reads six different cuts of the same database. Computing them
 * inside the page component would mean the page owning selection rules —
 * which race leads, which matchups are shown, which states appear — and those
 * are editorial decisions that deserve to be written down somewhere a reader
 * of the code can find them. They live here, each with the reason.
 *
 * Everything is on VOTOS VÁLIDOS, matching the rest of the site, except the
 * Senate, which `toBasis` refuses to convert.
 */

/** Leader plus distance from the 50% an outright first-round win requires. */
export interface Headline {
  leader: string;
  leaderPct: number;
  /** leaderPct − 50. Negative means a runoff on today's numbers. */
  toFifty: number;
}

export function headlineOf(avg: RaceAverage | null): Headline | null {
  const top = avg?.candidates[0];
  if (!avg || !top) return null;
  return { leader: top.candidate, leaderPct: top.avg, toFifty: round1(top.avg - 50) };
}

function round1(x: number): number {
  return Math.round(x * 10) / 10;
}

// `shortName` moved to `lib/names.ts` so client components can import it —
// this module reaches `node:fs` and cannot cross the client boundary. Re-exported
// here so existing server callers keep working unchanged.
export { shortName, initials } from "./names";

/**
 * The hero: the presidential first round, the one race that gets the front page.
 *
 * BOTH CUTS are returned, already computed by `scenarioGroups` at build time.
 * The home page's basis toggle only chooses between these two objects — it
 * never converts or averages anything, which would be a second implementation
 * of `average.ts` living in the browser (§5). Same mechanism as `RaceView`.
 */
export function heroRace() {
  const groups = scenarioGroups("presidente", null, 1);
  const g = groups[0] ?? null;
  if (!g) return null;
  return {
    average: g.average,
    headline: headlineOf(g.average),
    averageBruto: g.averageBruto,
    headlineBruto: headlineOf(g.averageBruto),
    scenario: g.scenario,
  };
}

/**
 * The carousel: the first-round leader against each of the next-best
 * challengers, in ranking order — 1º v 2º, then 1º v 3º, then 1º v 4º.
 *
 * ── WHERE THE ORDER COMES FROM ────────────────────────────────────────────
 * From the FIRST-ROUND presidential average — the same object `heroRace()`
 * renders, taken from the same call so the two cannot disagree. Not from how
 * recently a pairing was polled, which is what this used to sort by: that made
 * the leftmost card whichever institute published last, so the row reordered
 * itself on a Tuesday with no change in the race. Not from the order the groups
 * arrive in either (§8) — every position here is decided by a rank in the
 * average, and the lookup is by pairing key, so `scenarioGroups`' own sort has
 * no say.
 *
 * ── NEVER AN INVENTED MATCHUP ─────────────────────────────────────────────
 * The pairings still come only from second-round scenarios institutes actually
 * tested. Rank decides the ORDER of what exists, never that something should
 * exist: if the leader was never polled against, say, the 3rd-placed candidate,
 * that card is SKIPPED and the next challenger down takes its place. So the
 * three cards are "the leader against the three highest-ranked challengers he
 * was actually polled against", which can be 1º/2º/4º/5º — and can be fewer
 * than three cards, or none at all.
 *
 * A runoff between two candidates who are NOT the first-round leader (the data
 * holds Flávio Bolsonaro v Zema, Haddad v Tarcísio, and others) never appears
 * here. That is the rule this function implements, not an omission: the
 * carousel's claim is "what happens to the front-runner", and /segundo-turno
 * lists the rest.
 */
export function runoffCards(limit = 5) {
  const first = heroRace()?.average ?? null;
  const groups = scenarioGroups("presidente", null, 2).filter(
    (g) => g.average && g.average.candidates.length >= 2,
  );
  if (!first?.candidates.length || !groups.length) return [];

  // Ranking, deduped, in average order — `computeAverage` has already sorted it
  // and broken ties on a stable field, so this carries that total order over.
  const ranking: string[] = [];
  for (const c of first.candidates) {
    const k = candKey(c.candidate);
    if (!ranking.includes(k)) ranking.push(k);
  }
  const leader = ranking[0];

  // Pairings by unordered candidate-key pair, so a group is found by WHO is in
  // it rather than by how its scenario label happens to be worded.
  const byPair = new Map<string, (typeof groups)[number]>();
  for (const g of groups) {
    const key = [...new Set(g.average!.candidates.map((c) => candKey(c.candidate)))].sort().join("|");
    // First wins: `scenarioGroups` already ordered by poll count then date then
    // label, so a duplicate key (two groups over the same two people) resolves
    // to the better-covered one and never to whichever came back first.
    if (!byPair.has(key)) byPair.set(key, g);
  }

  const out: { scenario: string; average: RaceAverage; headline: Headline }[] = [];
  for (const challenger of ranking.slice(1)) {
    if (out.length >= limit) break;
    const g = byPair.get([leader, challenger].sort().join("|"));
    if (!g) continue; // not polled → skip to the next challenger, never invent it
    out.push({ scenario: g.scenario, average: g.average!, headline: headlineOf(g.average)! });
  }
  return out;
}

/** The rail: every state's governor race, alphabetical, with its leader. */
export function stateRail(): {
  uf: UF;
  name: string;
  average: RaceAverage | null;
  headline: Headline | null;
}[] {
  return [...UFS]
    .sort((a, b) => UF_NAMES[a].localeCompare(UF_NAMES[b], "pt-BR"))
    .map((uf) => {
      const avg = scenarioGroups("governador", uf, 1)[0]?.average ?? null;
      return { uf, name: UF_NAMES[uf], average: avg, headline: headlineOf(avg) };
    });
}

/**
 * The five largest electorates, for the matchup bars.
 *
 * HARDCODED, and it has to be: the poll database holds no electorate figures,
 * and deriving "largest" from how much a state is polled would be circular —
 * São Paulo is polled most BECAUSE it is largest, and a thinly polled large
 * state would drop out of its own ranking.
 *
 * Order per the TSE's 2022 electorate. ⚠ NOT verified against the 2026 roll,
 * which is the authority once it is published; the order is stable between
 * cycles but the claim "the five largest" is only as good as this list.
 */
export const MAIOR_ELEITORADO: UF[] = ["SP", "MG", "RJ", "BA", "RS"];

/**
 * Electorate size (millions of voters), TSE 2022 roll — the "N milhões de
 * eleitores" subtitle the mockup shows on each college card. Hardcoded for the
 * same reason `MAIOR_ELEITORADO` is: the poll database carries no electorate
 * figures. Only the five largest are needed here.
 */
export const ELEITORADO_MI: Partial<Record<UF, number>> = {
  SP: 34.6, MG: 16.3, RJ: 13.2, BA: 11.3, RS: 8.7,
};

/** The leader's rolling-average change over `windowDays`, from their trend. */
function leaderDelta(avg: RaceAverage | null, windowDays = 30): number | null {
  const trend = avg?.candidates[0]?.trend ?? [];
  if (trend.length < 2) return null;
  const last = trend[trend.length - 1];
  const cutoff = new Date(last.date).getTime() - windowDays * 86400000;
  let prior = trend[0];
  for (const p of trend) if (new Date(p.date).getTime() <= cutoff) prior = p;
  return round1(last.avg - prior.avg);
}

/**
 * Leader, runner-up, and everyone else — three bars that DO sum to 100.
 *
 * The obvious construction is wrong, and it shipped for an hour before a render
 * check caught it: summing every other candidate's average gives an "Outros"
 * that is not comparable to the two bars beside it. Each candidate's average is
 * taken over the polls that TESTED THEM — a name in 3 of the 10 polls averages
 * over 3 — so the per-candidate averages do not share a denominator and their
 * total runs past 100: São Paulo 111,8, Minas 123,8, Rio 127,7. In Minas that
 * put "Outros" (59,4) above the leader (45,8), which reads as a broken chart
 * because the number underneath it was not a share of anything.
 *
 * So the three bars are built PER POLL and then averaged, the same rule votos
 * válidos follows and for the same reason: inside one poll the three parts have
 * one denominator and do sum to 100. Only polls that tested BOTH of the top two
 * count, because a poll missing one of them cannot say what the gap is.
 */
export function matchupRows() {
  return MAIOR_ELEITORADO.map((uf) => {
    const grupo = scenarioGroups("governador", uf, 1)[0] ?? null;
    const avg = grupo?.average ?? null;
    if (!avg?.candidates.length) {
      return { uf, name: UF_NAMES[uf], average: null, bars: [], eleitoresMi: ELEITORADO_MI[uf] ?? null, leaderDelta30: null };
    }
    const [first, second] = avg.candidates;

    const key = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
    const janela = new Set(avg.windowPollIds);
    const usadas = (grupo?.polls ?? [])
      .filter((p) => janela.has(p.id))
      .map((p) => toBasis(p, avg.basis))
      .map((p) => {
        const a = p.results.find((r) => key(r.candidate) === key(first.candidate))?.pct;
        const b = second ? p.results.find((r) => key(r.candidate) === key(second.candidate))?.pct : 0;
        if (a == null || b == null) return null;
        const resto = Math.max(0, 100 - a - b);
        return { a, b, resto };
      })
      .filter((x): x is { a: number; b: number; resto: number } => x !== null);

    const media = (xs: number[]) => (xs.length ? xs.reduce((m, v) => m + v, 0) / xs.length : 0);
    const pctA = usadas.length ? round1(media(usadas.map((x) => x.a))) : first.avg;
    const pctB = usadas.length && second ? round1(media(usadas.map((x) => x.b))) : (second?.avg ?? 0);
    const outros = usadas.length ? round1(media(usadas.map((x) => x.resto))) : 0;
    return {
      uf,
      name: UF_NAMES[uf],
      average: avg,
      eleitoresMi: ELEITORADO_MI[uf] ?? null,
      leaderDelta30: leaderDelta(avg, 30),
      bars: [
        { label: first.candidate, party: first.party, pct: pctA, kind: "leader" as const },
        ...(second
          ? [{ label: second.candidate, party: second.party, pct: pctB, kind: "runner" as const }]
          : []),
        ...(outros > 0
          ? [{ label: "Outros", party: null, pct: outros, kind: "others" as const }]
          : []),
      ],
    };
  });
}

/**
 * A poll commissioned BY A PARTY carries a footnote marker.
 *
 * RCP asterisks "partisan pollsters" — a standing verdict on the house. This
 * site does not do that, and the distinction is the whole positioning: a rival
 * aggregator weights by "acurácia histórica do instituto", which is an
 * editorial judgement about who to trust wearing the clothes of a method.
 *
 * What is marked here is a FACT about one poll: who paid for it, as recorded in
 * its own TSE registration. 34 polls in the database are party-commissioned, by
 * five parties: Partido Liberal, União Brasil, Republicanos, MDB e Progressistas.
 * Zero false positives against the current register — verified before shipping,
 * because an asterisk that mislabels who paid is worse than no asterisk.
 * Self-commissioned polls and those paid for by media or companies are not
 * marked, because being paid for by someone is normal and only the payer's
 * interest in the result is worth flagging.
 */
// Two tests, and the split matters. An explicit party WORD anywhere is enough
// — "Diretório Estadual do PT", "Comitê de campanha" — because those phrases
// mean nothing else. A bare acronym is only accepted when it is the WHOLE
// contractor: a loose /\bPP\b/ would mark "PP Comunicação", an ad agency, as a
// party. That false positive is worse than a miss, because the asterisk is a
// claim about who paid and this site's whole argument is that its claims hold.
const PALAVRA_PARTIDARIA = /partido|diret[óo]rio|coliga[çc]|comit[êe]|campanha/i;
const SIGLAS = new Set([
  "pt", "pl", "psdb", "mdb", "pp", "psd", "pdt", "psb", "psol", "republicanos",
  "podemos", "avante", "novo", "cidadania", "solidariedade", "uniao brasil",
  "uniao", "pcdob", "pv", "rede", "agir", "dc", "pmb", "prtb", "pstu", "pcb",
  "pco", "up", "mobiliza", "democrata",
]);

// Strip a parenthetical gloss before matching: the register writes both "MDB"
// and "MDB (Movimento Democrático Brasileiro)", and an exact-match test that
// does not normalise them misses the second while catching the first — which
// is how a footnote ends up depending on how verbose a clerk was that day.
const semAcento = (s: string) =>
  s
    .replace(/\s*\([^)]*\)\s*/g, " ")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export function partyCommissioned(p: Poll): string | null {
  if (!p.contractor) return null;
  if (PALAVRA_PARTIDARIA.test(p.contractor)) return p.contractor;
  return SIGLAS.has(semAcento(p.contractor)) ? p.contractor : null;
}

/**
 * The "Destaques" ranking in the sidebar: major-state governor races, each with
 * its leader, party, margin over the runner-up and distance to 50%. Order is a
 * curated importance list (electorate-weighted), matching the redesign mockup;
 * a state with no average is dropped rather than shown blank.
 */
const DESTAQUE_UFS: UF[] = ["SP", "MG", "RJ", "BA", "RS", "PR", "PE", "CE"];

export interface StateHighlight {
  uf: UF;
  name: string;
  leader: string;
  party: string | null;
  /** Leader minus runner-up, the "margin" column. */
  margin: number;
  /** leaderPct − 50: ≥ 0 means a first-round win on today's numbers. */
  toFifty: number;
}

export function stateHighlights(): StateHighlight[] {
  const out: StateHighlight[] = [];
  for (const uf of DESTAQUE_UFS) {
    const avg = scenarioGroups("governador", uf, 1)[0]?.average ?? null;
    const top = avg?.candidates[0];
    if (!avg || !top) continue;
    out.push({
      uf,
      name: UF_NAMES[uf],
      leader: top.candidate,
      party: top.party,
      margin: round1(avg.spread),
      toFifty: round1(top.avg - 50),
    });
  }
  return out;
}

/**
 * Every state's governor leader and status, for the sidebar map. `status`
 * drives the fill: a clear first-round lead, a lead under 50, a technical tie,
 * or no recent poll. "Technical tie" is a margin inside 2 p.p. — a display
 * threshold, not a statistical claim about the margin of error.
 */
export type MapStatus = "acima" | "abaixo" | "empate" | "sem";

export interface StateMapDatum {
  uf: UF;
  name: string;
  leader: string | null;
  status: MapStatus;
}

export function stateMapData(): StateMapDatum[] {
  return [...UFS].sort().map((uf) => {
    const avg = scenarioGroups("governador", uf, 1)[0]?.average ?? null;
    const top = avg?.candidates[0];
    if (!avg || !top) return { uf, name: UF_NAMES[uf], leader: null, status: "sem" as const };
    const status: MapStatus =
      Math.abs(avg.spread) < 2 ? "empate" : top.avg >= 50 ? "acima" : "abaixo";
    return { uf, name: UF_NAMES[uf], leader: top.candidate, status };
  });
}

/**
 * "O que mudou": the biggest recent moves in the state governor races, from each
 * leader's own rolling-average trend. The delta is the leader's average now
 * minus their average at the last trend sample at least `windowDays` earlier —
 * so it is the same moving average the charts draw, read at two dates, never a
 * fresh computation. Sorted by absolute move, largest first.
 */
export interface Mover {
  uf: UF;
  name: string;
  leader: string;
  delta: number;
}

/** The single newest poll in the base, for the "NEW" row of "O que mudou". */
export interface NewestPoll {
  race: string;
  uf: string | null;
  label: string;
}

export function newestPoll(): NewestPoll | null {
  const all = [
    ...pollsFor("presidente", null),
    ...UFS.flatMap((uf) => [...pollsFor("governador", uf), ...pollsFor("senador", uf)]),
    ...UFS.flatMap((uf) => pollsFor("presidente", uf)),
  ];
  const [p] = sortPollsDesc(all);
  if (!p) return null;
  const cargo = p.race === "presidente" ? "presidente" : p.race === "governador" ? "governador" : "senador";
  const onde = p.state ? ` do ${p.state}` : "";
  return { race: p.race, uf: p.state ?? null, label: `Nova pesquisa para ${cargo}${onde}` };
}

export function recentMovers(limit = 4, windowDays = 30): Mover[] {
  const movers: Mover[] = [];
  for (const uf of UFS) {
    const avg = scenarioGroups("governador", uf, 1)[0]?.average ?? null;
    const top = avg?.candidates[0];
    const trend = top?.trend ?? [];
    if (!avg || !top || trend.length < 2) continue;
    const last = trend[trend.length - 1];
    const cutoff = new Date(last.date).getTime() - windowDays * 86400000;
    // Walk back to the newest sample at or before the cutoff.
    let prior = trend[0];
    for (const p of trend) {
      if (new Date(p.date).getTime() <= cutoff) prior = p;
    }
    const delta = round1(last.avg - prior.avg);
    if (Math.abs(delta) < 0.1) continue;
    movers.push({ uf, name: UF_NAMES[uf], leader: top.candidate, delta });
  }
  return movers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta)).slice(0, limit);
}

export type PollTrend = "up" | "down" | "flat";

export interface LatestTableRow {
  poll: Poll;
  commissionedBy: string | null;
  leader: { candidate: string; pct: number } | null;
  runnerUp: { candidate: string; pct: number } | null;
  spread: number | null;
  /** The leader's move vs the previous poll of the same race (Tendência column). */
  trend: PollTrend | null;
}

/**
 * The latest-polls table, newest first. Each row carries a `trend`: whether the
 * leader's margin grew, shrank or held versus the previous poll of the SAME race
 * (same race/state/round). It is a comparison of two published polls, not a
 * fresh model — the first (oldest) poll of a race has no predecessor and is null.
 */
export function latestForTable(limit = 40): LatestTableRow[] {
  const all = [
    ...pollsFor("presidente", null),
    ...UFS.flatMap((uf) => [...pollsFor("governador", uf), ...pollsFor("senador", uf)]),
    ...UFS.flatMap((uf) => pollsFor("presidente", uf)),
  ];
  const sorted = sortPollsDesc(all);
  // Previous spread per race key, walking oldest→newest so "previous" is the
  // poll immediately before this one in that race.
  const raceKey = (p: Poll) => `${p.race}|${p.state ?? "BR"}|${p.round}`;
  const spreadOf = (p: Poll): number | null => {
    const conv = toBasis(p, "validos");
    const r = [...conv.results].sort((a, b) => b.pct - a.pct);
    return r[0] && r[1] ? round1(r[0].pct - r[1].pct) : null;
  };
  const prevSpread = new Map<string, number>();
  const trendById = new Map<string | number, PollTrend | null>();
  for (const p of [...sorted].reverse()) {
    const k = raceKey(p);
    const s = spreadOf(p);
    const prev = prevSpread.get(k);
    let t: PollTrend | null = null;
    if (s != null && prev != null) t = s - prev > 0.3 ? "up" : s - prev < -0.3 ? "down" : "flat";
    trendById.set(p.id, t);
    if (s != null) prevSpread.set(k, s);
  }

  return sorted.slice(0, limit).map((raw) => {
    const poll = toBasis(raw, "validos");
    const ranked = [...poll.results].sort((a, b) => b.pct - a.pct || a.candidate.localeCompare(b.candidate));
    const [leader, runnerUp] = ranked;
    return {
      poll,
      commissionedBy: partyCommissioned(poll),
      leader: leader ? { candidate: leader.candidate, pct: leader.pct } : null,
      runnerUp: runnerUp ? { candidate: runnerUp.candidate, pct: runnerUp.pct } : null,
      spread: leader && runnerUp ? round1(leader.pct - runnerUp.pct) : null,
      trend: trendById.get(raw.id) ?? null,
    };
  });
}
