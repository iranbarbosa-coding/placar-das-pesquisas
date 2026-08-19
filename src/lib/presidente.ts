import { scenarioGroups, pollsFor } from "./data";
import { registeredPresidentKeys } from "./home";
import { candKey } from "./average";
import { colorMap, colorOf, fixedColor, PALETTE_SIZE } from "./colors";
import { toBasis } from "./validos";
import { UFS, UF_NAMES, type UF, type Poll, type RaceAverage } from "./types";
import type { MapStatus } from "./home";

/**
 * Everything the /presidente page needs, assembled once at build time.
 *
 * The page is a server component that renders cards; the reactive pieces (the
 * evolution chart, the runoff simulation, the searchable table) are client
 * components that receive these plain, serializable objects as props. All the
 * `node:fs` reaches (through `lib/data`/`lib/home`) happen HERE, never across the
 * client boundary — the fs-free helpers (`lib/colors`, `lib/format`, …) are the
 * only libs those client components import.
 *
 * THE REGISTERED FILTER IS APPLIED IN EVERY CUT. Only a TSE-registered president
 * candidate may be NAMED or COLOURED (owner's rule, see `registeredPresidentKeys`
 * in `lib/home`). Everyone else folds anonymously into "Outros": in the bar
 * chart, the map (leader is the top REGISTERED candidate), the pies and the
 * evolution line. The runoff simulation ranks challengers among the registered
 * field too. This is the same rule the hero bakes in, applied by hand here.
 */

const round1 = (x: number): number => Math.round(x * 10) / 10;
const tenths = (x: number): number => Math.round(x * 10);

/**
 * The floor a registered candidate's national first-round average must clear to
 * be NAMED — its own bar in §1, its own coloured line in §3. Everyone below it
 * (registered sub-threshold AND every non-registered name) folds into a single
 * grey "Outros". ONE constant so the bar chart and the evolution chart show the
 * exact same roster; the mockup names ~6–7 candidates plus Outros, not all 12
 * registered down to 0,0%.
 */
export const NAMED_MIN_PCT = 1.0;

/** The registered set as a `candKey`-folded `Set`, computed once per build. */
function registeredSet(): Set<string> {
  return new Set(registeredPresidentKeys());
}

/**
 * The named roster of a first-round average: registered candidates whose average
 * is at least `NAMED_MIN_PCT`, in the average's own descending order. Because the
 * candidates are already sorted by average, this is the top prefix of the
 * registered field — so §1 and §3 name the same people. Shared by both.
 */
function namedRoster(avg: RaceAverage, reg: Set<string>) {
  return avg.candidates.filter((c) => reg.has(candKey(c.candidate)) && c.avg >= NAMED_MIN_PCT);
}

/**
 * A candidate's signed change over `windowDays`, read from their own rolling
 * average. Generalises `leaderDelta` (home.ts): walk the trend back to the last
 * sample at or before now−`windowDays`, subtract it from the latest point. Null
 * when the trend has fewer than two points to compare.
 */
export function candDelta(trend: { date: string; avg: number }[], windowDays = 30): number | null {
  if (!trend || trend.length < 2) return null;
  const last = trend[trend.length - 1];
  const cutoff = new Date(last.date).getTime() - windowDays * 86400000;
  let prior = trend[0];
  for (const p of trend) if (new Date(p.date).getTime() <= cutoff) prior = p;
  return round1(last.avg - prior.avg);
}

// ── Section 1: the first-round bar chart ────────────────────────────────────

export interface PresidentBarRow {
  candidate: string;
  party: string | null;
  /** Reconciled share (tenths) so the rows + Outros sum to exactly 100,0. */
  pct: number;
  /** The candidate's fixed per-candidate colour. */
  color: string;
  /** 30-day change in p.p., or null when the trend is too short. */
  delta30: number | null;
}

export interface PresidentBarsData {
  rows: PresidentBarRow[];
  /** Every non-registered candidate's share, plus the rounding remainder. */
  outros: number;
  lastPollDate: string | null;
  pollCount: number;
}

/**
 * The R1 national average as a bar per REGISTERED candidate, sorted desc, plus
 * an "Outros" bucket that absorbs every non-registered candidate's share and the
 * tenths remainder — so the ruler sums to exactly 100,0 (the same reconciliation
 * `HeroInteractive` uses on the válidos cut).
 */
export function presidentBars(): PresidentBarsData {
  const g = scenarioGroups("presidente", null, 1)[0];
  const avg = g?.average ?? null;
  if (!avg) return { rows: [], outros: 0, lastPollDate: null, pollCount: 0 };

  const reg = registeredSet();
  const cmap = colorMap(avg.candidates.slice(0, PALETTE_SIZE).map((c) => c.candidate));

  // Only registered candidates at or above the named floor get a bar; everyone
  // else — registered sub-threshold and every non-registered name — is absorbed
  // by "Outros" (below), which the tenths reconciliation fills to make 100,0.
  const named = namedRoster(avg, reg);
  const rowsT = named.map((c) => ({
    candidate: c.candidate,
    party: c.party,
    t: tenths(c.avg),
    color: colorOf(cmap, c.candidate),
    delta30: candDelta(c.trend, 30),
  }));
  const sumT = rowsT.reduce((a, r) => a + r.t, 0);
  const outrosT = Math.max(0, 1000 - sumT);

  return {
    rows: rowsT.map((r) => ({
      candidate: r.candidate,
      party: r.party,
      pct: r.t / 10,
      color: r.color,
      delta30: r.delta30,
    })),
    outros: outrosT / 10,
    lastPollDate: avg.lastPollDate,
    pollCount: avg.pollCount,
  };
}

// ── A compact poll row, shared by the two tables ────────────────────────────

export interface PollRow {
  id: string;
  date: string | null;
  pollster: string;
  /** Formatted sample size, e.g. "2.000", or null. */
  sample: number | null;
  /** Margin of error in p.p., or null. */
  moe: number | null;
  /** "Presidente · 1º turno" / "Presidente · 2º turno". */
  disputa: string;
  /** "Brasil" or the UF. */
  estado: string;
  uf: UF | null;
  round: 1 | 2;
  /** Top candidates' válidos pct, integer, joined — e.g. "45/38/9/5/3". */
  resultado: string;
  /** The poll's TSE registration id, or "—". */
  registro: string;
  /** Lowercased pollster + state + candidate names, for the text search. */
  haystack: string;
}

/** Top válidos results of a poll as an integer string like "45/38/9/5/3". */
function resultadoOf(poll: Poll, max = 6): string {
  const conv = toBasis(poll, "validos");
  return [...conv.results]
    .sort((a, b) => b.pct - a.pct)
    .slice(0, max)
    .map((r) => Math.round(r.pct))
    .filter((n) => n > 0)
    .join("/");
}

function toPollRow(poll: Poll): PollRow {
  const disputa = `Presidente · ${poll.round === 2 ? "2º" : "1º"} turno`;
  const estado = poll.state ? UF_NAMES[poll.state] : "Brasil";
  const names = poll.results.map((r) => r.candidate).join(" ");
  return {
    id: String(poll.id),
    date: poll.fieldwork_end ?? poll.published_date ?? poll.fieldwork_start ?? null,
    pollster: poll.pollster,
    sample: poll.sample_size ?? null,
    moe: poll.margin_of_error ?? null,
    disputa,
    estado,
    uf: poll.state,
    round: poll.round,
    resultado: resultadoOf(poll),
    registro: poll.tse_registration ?? "—",
    haystack: `${poll.pollster} ${estado} ${names}`.toLowerCase(),
  };
}

// ── Section 2: the 10 newest polls that make up the R1 average ──────────────

export function windowPollRows(limit = 10): PollRow[] {
  const g = scenarioGroups("presidente", null, 1)[0];
  const avg = g?.average ?? null;
  if (!avg) return [];
  const inWindow = new Set(avg.windowPollIds);
  return (g?.polls ?? [])
    .filter((p) => inWindow.has(p.id))
    .slice(0, limit)
    .map(toPollRow);
}

// ── Section 3: the evolution chart (drives HeroInteractive) ─────────────────

export interface PresidentEvolutionData {
  average: RaceAverage | null;
  /** All registered president keys — only these are drawn/named. */
  registeredKeys: string[];
  /** Registered keys present in the average — passed as the "significant" set so
   *  every registered candidate draws with its own colour rather than grey. */
  significantKeys: string[];
}

/**
 * The R1 national average, plus the two key sets `HeroInteractive` needs. It
 * draws exactly the SAME named roster as the bar chart — registered candidates
 * at or above `NAMED_MIN_PCT`, passed as `significantKeys` so each is coloured —
 * and folds everyone else (registered sub-threshold and non-registered) into the
 * single grey "Outros" aggregate, the hero's own treatment of its off-roster
 * field. `registeredKeys` still gates who may be named at all; the page caps the
 * drawn lines to the named count so no sub-threshold grey lines scatter the plot.
 */
export function presidentEvolution(): PresidentEvolutionData {
  const g = scenarioGroups("presidente", null, 1)[0];
  const avg = g?.average ?? null;
  const reg = registeredSet();
  const registeredKeys = [...reg];
  const significantKeys = avg ? namedRoster(avg, reg).map((c) => candKey(c.candidate)) : [];
  return { average: avg, registeredKeys, significantKeys };
}

// ── Section 5: the runoff simulation ────────────────────────────────────────

export interface RunoffSimSeries {
  challenger: string;
  /** The challenger's fixed colour — the series is coloured by the CHALLENGER. */
  color: string;
  /** The LEADER's second-round share over time, in this matchup. */
  points: { date: string; avg: number }[];
  /** The leader's current second-round share against this challenger. */
  current: number;
  polls: number;
}

export interface RunoffSimData {
  leader: string;
  series: RunoffSimSeries[];
}

/**
 * The leader's second-round share against each of the three registered
 * candidates immediately behind him in the first round. For every such
 * challenger, find the head-to-head group (matched by the unordered candidate
 * pair, exactly as `runoffCards` does) and take the LEADER's trend inside it —
 * one line per challenger, coloured by the challenger. A challenger with no
 * polled matchup is skipped.
 */
export function runoffSim(): RunoffSimData {
  const reg = registeredSet();
  const first = scenarioGroups("presidente", null, 1)[0]?.average ?? null;
  if (!first?.candidates.length) return { leader: "", series: [] };

  const registered = first.candidates.filter((c) => reg.has(candKey(c.candidate)));
  const leaderCand = registered[0];
  if (!leaderCand) return { leader: "", series: [] };
  const leaderKey = candKey(leaderCand.candidate);
  const challengers = registered.slice(1, 4); // ranks 2, 3, 4 among registered

  const groups = scenarioGroups("presidente", null, 2).filter(
    (g) => g.average && g.average.candidates.length >= 2,
  );
  const byPair = new Map<string, (typeof groups)[number]>();
  for (const g of groups) {
    const k = [...new Set(g.average!.candidates.map((c) => candKey(c.candidate)))].sort().join("|");
    if (!byPair.has(k)) byPair.set(k, g);
  }

  const series: RunoffSimSeries[] = [];
  for (const ch of challengers) {
    const g = byPair.get([leaderKey, candKey(ch.candidate)].sort().join("|"));
    if (!g?.average) continue; // never polled → skip, never invented
    const leaderInMatchup = g.average.candidates.find((c) => candKey(c.candidate) === leaderKey);
    if (!leaderInMatchup) continue;
    const pts = (leaderInMatchup.trend ?? []).filter(
      (p) => typeof p.date === "string" && Number.isFinite(p.avg),
    );
    if (!pts.length) continue;
    series.push({
      challenger: ch.candidate,
      color: colorOf(colorMap([ch.candidate]), ch.candidate),
      points: pts.map((p) => ({ date: p.date, avg: p.avg })),
      current: round1(leaderInMatchup.avg),
      polls: g.polls.length,
    });
  }
  return { leader: leaderCand.candidate, series };
}

// ── Section 6: the presidential state map ───────────────────────────────────

/** A tint of the leader's colour: strong (≥50) uses the brand token or the raw
 *  hue; light (<50) uses the pale brand token or a generic color-mix tint. */
function pmapFill(leaderColor: string, strong: boolean): string {
  if (leaderColor === "var(--cand-red)") return strong ? "var(--pmap-red-strong)" : "var(--pmap-red-light)";
  if (leaderColor === "var(--cand-blue)") return strong ? "var(--pmap-blue-strong)" : "var(--pmap-blue-light)";
  // Any other registered leader (e.g. Ronaldo Caiado in teal): full hue when
  // strong, a paler mix toward the card surface when below 50 — theme-aware,
  // since both operands are tokens.
  return strong ? leaderColor : `color-mix(in srgb, ${leaderColor} 45%, var(--surface-1))`;
}

/** Below this many averaged polls a state's presidential subsample is treated as
 *  too thin to call a leader (matches the averaging floor MIN_POLLS in
 *  `lib/average`), and the state is greyed. */
const THIN_POLLS = 3;
/** Margin under which the lead is a display "technical tie" (as `stateMapData`). */
const TIE_SPREAD = 2;

export interface PresidentMapDatum {
  uf: UF;
  status: MapStatus; // fallback for BrasilMap; `fill` overrides it
  fill: string;
  name: string;
  leader: string | null;
  leaderPct: number | null;
  spread: number | null;
  /** True when the state is greyed for a tie or thin/absent data. */
  greyed: boolean;
}

/**
 * Every state coloured by its presidential leader's IDENTITY and INTENSITY,
 * from that state's presidential SUBSAMPLE (the national race sampled in the
 * state — `scenarioGroups("presidente", uf, 1)`, the owner's chosen source).
 * Leader = the top REGISTERED candidate; spread = its lead over the next
 * registered candidate. Strong tint at ≥50, light tint below; grey on a
 * technical tie, a thin subsample, or no registered leader.
 */
export function presidentMapData(): PresidentMapDatum[] {
  return [...UFS].sort().map((uf) => {
    const avg = scenarioGroups("presidente", uf, 1)[0]?.average ?? null;
    const base = { uf, name: UF_NAMES[uf] };
    const grey = (leader: string | null, leaderPct: number | null, spread: number | null): PresidentMapDatum => ({
      ...base,
      status: "sem",
      fill: "var(--pmap-tie)",
      leader,
      leaderPct,
      spread,
      greyed: true,
    });

    if (!avg) return grey(null, null, null);
    const registered = avg.candidates.filter((c) => registeredSet().has(candKey(c.candidate)));
    const top = registered[0];
    if (!top) return grey(null, null, null);
    const second = registered[1];
    const spread = second ? round1(top.avg - second.avg) : round1(top.avg);

    if (avg.pollCount < THIN_POLLS) return grey(top.candidate, round1(top.avg), spread);
    if (Math.abs(spread) < TIE_SPREAD) return grey(top.candidate, round1(top.avg), spread);

    const strong = top.avg >= 50;
    const leaderColor = fixedColor(top.candidate) ?? colorOf(colorMap([top.candidate]), top.candidate);
    return {
      ...base,
      status: strong ? "acima" : "abaixo",
      fill: pmapFill(leaderColor, strong),
      leader: top.candidate,
      leaderPct: round1(top.avg),
      spread,
      greyed: false,
    };
  });
}

// ── Section 7: per-state pies ───────────────────────────────────────────────

export interface PieSlice {
  name: string;
  pct: number;
  color: string;
}

export interface StatePie {
  uf: UF;
  name: string;
  slices: PieSlice[];
  lastPoll: string | null;
  pollCount: number;
}

/** Reconcile a set of shares to sum to exactly 100,0 in tenths, letting the
 *  "Outros" slice (assumed last) absorb the remainder. */
function reconcileToHundred(values: number[], outrosIndex: number): number[] {
  const t = values.map((v) => tenths(v));
  const sum = t.reduce((a, b) => a + b, 0);
  if (sum !== 1000 && outrosIndex >= 0 && outrosIndex < t.length) {
    t[outrosIndex] = Math.max(0, t[outrosIndex] + (1000 - sum));
  }
  return t.map((x) => x / 10);
}

/** A registered candidate below this share folds into "Outros" in a pie, so the
 *  small circle stays legible instead of scattering hairline wedges. */
const PIE_NAMED_MIN = 1;

/**
 * The `limit` states with the most presidential polls, each as a pie that IS a
 * valid partition — computed PER POLL, then averaged, the same rule and the same
 * reason as `matchupRows` in `lib/home`. Each candidate's average is taken over
 * the polls that TESTED them, so their averages do not share a denominator and
 * summing them overshoots 100 (in Pernambuco the raw sum is ~176), which would
 * hand a grey "Outros" more of the pie than the leader who carries the state.
 *
 * So instead: convert each window poll to votos válidos (inside one poll the
 * shares are a real partition and sum to ~100), read every candidate's share
 * there (0 where a poll did not offer them), and average those shares across the
 * window. The averaged shares sum to ~100 by construction. Registered candidates
 * at or above `PIE_NAMED_MIN` get their own coloured slice; every smaller
 * registered candidate and every non-registered one folds into the grey "Outros"
 * slice, which then absorbs the tenths remainder so the pie sums to exactly 100.
 */
export function statePies(limit = 6): StatePie[] {
  const reg = registeredSet();
  const withData = UFS.map((uf) => {
    const g = scenarioGroups("presidente", uf, 1)[0] ?? null;
    return { uf, group: g };
  })
    .filter((s) => !!s.group?.average && s.group.average.candidates.length > 0)
    .sort((a, b) => (b.group!.average!.pollCount - a.group!.average!.pollCount))
    .slice(0, limit);

  const norm = (s: string) => candKey(s);

  return withData.map(({ uf, group }) => {
    const avg = group!.average!;
    const inWindow = new Set(avg.windowPollIds);
    const windowPolls = (group!.polls ?? []).filter((p) => inWindow.has(p.id)).map((p) => toBasis(p, "validos"));
    const n = windowPolls.length || 1;

    // Sum each candidate's válidos share across the window (0 where absent), keep
    // a display name and party from their first appearance.
    const sum = new Map<string, { name: string; total: number }>();
    for (const p of windowPolls) {
      for (const r of p.results) {
        const k = norm(r.candidate);
        const cur = sum.get(k) ?? { name: r.candidate, total: 0 };
        cur.total += r.pct;
        sum.set(k, cur);
      }
    }

    const shares = [...sum.entries()]
      .map(([k, v]) => ({ key: k, name: v.name, share: v.total / n }))
      .sort((a, b) => b.share - a.share);

    const named = shares.filter((s) => reg.has(s.key) && s.share >= PIE_NAMED_MIN);
    const outrosRaw = shares
      .filter((s) => !(reg.has(s.key) && s.share >= PIE_NAMED_MIN))
      .reduce((acc, s) => acc + Math.max(0, s.share), 0);

    const cmap = colorMap(named.slice(0, PALETTE_SIZE).map((s) => s.name));
    const rawSlices: { name: string; pct: number; color: string }[] = named.map((s) => ({
      name: s.name,
      pct: s.share,
      color: colorOf(cmap, s.name),
    }));
    const hasOutros = outrosRaw > 0.05;
    if (hasOutros) rawSlices.push({ name: "Outros", pct: outrosRaw, color: "var(--series-muted)" });

    const reconciled = reconcileToHundred(
      rawSlices.map((s) => s.pct),
      hasOutros ? rawSlices.length - 1 : 0, // Outros (last) or the leader (first) absorbs the remainder
    );
    const slices: PieSlice[] = rawSlices
      .map((s, i) => ({ ...s, pct: reconciled[i] }))
      .filter((s) => s.pct > 0);

    return {
      uf,
      name: UF_NAMES[uf],
      slices,
      lastPoll: avg.lastPollDate,
      pollCount: avg.pollCount,
    };
  });
}

// ── Section 8: every presidential poll ──────────────────────────────────────

/**
 * All presidential polls — national and per-state, both rounds — newest first,
 * as flat serializable rows for the searchable/filterable client table.
 */
export function allPresidentialPolls(): PollRow[] {
  const all: Poll[] = [
    ...pollsFor("presidente", null),
    ...UFS.flatMap((uf) => pollsFor("presidente", uf)),
  ];
  const dateOf = (p: Poll) => p.fieldwork_end ?? p.published_date ?? p.fieldwork_start ?? "0000";
  return all
    .sort((a, b) => dateOf(b).localeCompare(dateOf(a)) || String(a.id).localeCompare(String(b.id)))
    .map(toPollRow);
}
