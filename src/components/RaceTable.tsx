import type { Poll, RaceAverage, RaceKind } from "@/lib/types";
import { fmtDate } from "@/lib/format";
import { sortPollsDesc } from "@/lib/average";
import { type Basis, toBasis } from "@/lib/validos";

/**
 * The poll table for one scenario group.
 *
 * Row 1 is the site's own average — a row of the table, not a separate board.
 * Then the polls that make up that average, then EVERY remaining poll of the
 * group, marked `fora da média`, reachable by scrolling inside the table.
 *
 * The table always shows every poll it is handed. Nothing here filters by date:
 * the chart's range buttons change the chart, never this.
 */

const DASH = "—"; // em dash — the only thing a missing number may ever render as

/** One decimal, decimal comma. */
function fmt1(v: number): string {
  return v.toFixed(1).replace(".", ",");
}

/** Raw percentage, house style: a decimal only when there is one. */
function pct(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  const r = Math.round(v * 10) / 10;
  return r.toFixed(r % 1 ? 1 : 0).replace(".", ",");
}

/**
 * A signed distance: `+3,3`, `−7,3` (U+2212, not a hyphen), `0,0`.
 * A value that rounds to zero from below prints `0,0`, never `−0,0`.
 */
function signed(v: number | null | undefined): string {
  if (v == null || !Number.isFinite(v)) return DASH;
  const r = Math.round(v * 10) / 10;
  if (r > 0) return `+${fmt1(r)}`;
  if (r < 0) return `−${fmt1(Math.abs(r))}`;
  return "0,0";
}

/** House style short name: the first token, as the runoff cards also do. */
function shortName(name: string): string {
  return name.split(" ")[0];
}

function fieldwork(p: Poll): string {
  const end = p.fieldwork_end ?? p.published_date;
  if (p.fieldwork_start && end) return `${fmtDate(p.fieldwork_start)}–${fmtDate(end)}`;
  return fmtDate(end ?? p.fieldwork_start);
}

function margin(p: Poll): string {
  const v = p.margin_of_error;
  if (v == null || !Number.isFinite(v)) return DASH;
  return `±${pct(v)}`;
}

function sample(p: Poll): string {
  const v = p.sample_size;
  if (v == null || !Number.isFinite(v) || v <= 0) return DASH;
  return v.toLocaleString("pt-BR");
}

/** Results of one poll, strongest first; ties broken on the name so the order
 *  depends on the data and not on the order records sit in on disk. */
function ranked(p: Poll): { candidate: string; pct: number }[] {
  return [...p.results]
    .filter((r) => Number.isFinite(r.pct))
    .sort((a, b) => b.pct - a.pct || a.candidate.localeCompare(b.candidate, "pt-BR"));
}

function pollsterKey(p: Poll): string {
  return p.pollster.toLowerCase().trim();
}

/**
 * Which polls the average was computed over.
 *
 * ⚠ This MIRRORS `selectWindow` in lib/average.ts, which is not exported. It is
 * driven entirely by figures the average itself carries (`windowSize`,
 * `maxPerPollster`, `pollCount`), so it reproduces the same set rather than
 * guessing at it — but it is a second copy of a rule that lives elsewhere, and
 * it should be deleted the moment lib exposes the window (see the report). Pass
 * `inAverageIds` and this is not used at all.
 */
function deriveInAverage(sortedUsable: Poll[], average: RaceAverage): Set<string> {
  const picked: Poll[] = [];
  const skipped: Poll[] = [];
  const held = new Map<string, number>();

  for (const p of sortedUsable) {
    if (picked.length >= average.windowSize) break;
    const k = pollsterKey(p);
    const n = held.get(k) ?? 0;
    if (n >= average.maxPerPollster) {
      skipped.push(p);
      continue;
    }
    held.set(k, n + 1);
    picked.push(p);
  }
  // The per-institute cap yields to the minimum base; `pollCount` is what the
  // average actually used, so backfilling to it reproduces the relaxed case too.
  for (const p of skipped) {
    if (picked.length >= average.pollCount) break;
    picked.push(p);
  }
  return new Set(picked.map((p) => p.id));
}

type SummaryKind = "distancia50" | "vantagem" | "senado";

function summaryKind(race: RaceKind, round: 1 | 2): SummaryKind {
  // Senate elects two per state: the published numbers sum to ~200, are never
  // converted, and have no meaningful distance to 50%. It never takes the other
  // two forms, whatever round it is filed under.
  if (race === "senador") return "senado";
  return round === 2 ? "vantagem" : "distancia50";
}

const SUMMARY_HEADER: Record<SummaryKind, string> = {
  distancia50: "Distância do 1º turno",
  vantagem: "Vantagem",
  senado: "1º e 2º colocados · distância para o 3º",
};

/**
 * The last cell for one poll, on the cut being displayed.
 *
 * `converted` is false for a poll that is `incomplete` at source while válidos
 * is being shown: lib/validos.ts forbids converting it (the denominator is the
 * sum of what is present, which inflates everyone still in the poll), and both
 * a distance to 50% and a lead change under that conversion. There is no honest
 * number to print, so none is printed.
 */
function pollSummary(p: Poll, kind: SummaryKind, converted: boolean): React.ReactNode {
  if (!converted) {
    return (
      <span style={{ color: "var(--text-muted)" }}>
        {DASH} <span className="text-xs">sem cálculo em válidos</span>
      </span>
    );
  }
  const rows = ranked(p);
  if (!rows.length) return DASH;

  if (kind === "senado") {
    // No conversion, no normalisation: two votes per voter, ~200% by design.
    const [first, second, third] = rows;
    return (
      <>
        <span className="font-semibold">{shortName(first.candidate)}</span>{" "}
        <span className="tabular">{pct(first.pct)}</span>
        {second && (
          <>
            {" · "}
            <span className="font-semibold">{shortName(second.candidate)}</span>{" "}
            <span className="tabular">{pct(second.pct)}</span>
          </>
        )}
        {second && third ? (
          <span style={{ color: "var(--text-secondary)" }}>
            {" · "}
            <span className="tabular">{signed(second.pct - third.pct)}</span> sobre o 3º
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>
            {" · "}
            {second ? "sem 3º colocado" : "só um nome testado"}
          </span>
        )}
      </>
    );
  }

  if (kind === "vantagem") {
    const [first, second] = rows;
    if (!second) {
      return (
        <span style={{ color: "var(--text-muted)" }}>
          {shortName(first.candidate)} · sem adversário nesta pesquisa
        </span>
      );
    }
    return (
      <>
        <span className="font-semibold">{shortName(first.candidate)}</span>{" "}
        <span className="tabular">{signed(first.pct - second.pct)}</span>
      </>
    );
  }

  // Distance from the 50% an outright first-round win needs, on the valid-vote
  // cut. Negative = short of it.
  const leader = rows[0];
  return (
    <>
      <span className="font-semibold">{shortName(leader.candidate)}</span>{" "}
      <span className="tabular">{signed(leader.pct - 50)}</span>
    </>
  );
}

/** The same cell for the average row, built from the average's own candidates. */
function averageSummary(average: RaceAverage, kind: SummaryKind): React.ReactNode {
  const [first, second, third] = average.candidates;
  if (!first) return DASH;

  if (kind === "senado") {
    return (
      <>
        <span className="font-semibold">{shortName(first.candidate)}</span>{" "}
        <span className="tabular">{pct(first.avg)}</span>
        {second && (
          <>
            {" · "}
            <span className="font-semibold">{shortName(second.candidate)}</span>{" "}
            <span className="tabular">{pct(second.avg)}</span>
          </>
        )}
        {second && third ? (
          <span style={{ color: "var(--text-secondary)" }}>
            {" · "}
            <span className="tabular">{signed(second.avg - third.avg)}</span> sobre o 3º
          </span>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>
            {" · "}
            {second ? "sem 3º colocado" : "só um nome testado"}
          </span>
        )}
      </>
    );
  }

  if (kind === "vantagem") {
    // `average.spread` is the leader's own number when there is no runner-up —
    // which is not a lead over anybody, so it is not printed as one.
    if (!second) {
      return (
        <span style={{ color: "var(--text-muted)" }}>
          {shortName(first.candidate)} · sem adversário
        </span>
      );
    }
    return (
      <>
        <span className="font-semibold">{shortName(first.candidate)}</span>{" "}
        <span className="tabular">{signed(first.avg - second.avg)}</span>
      </>
    );
  }

  return (
    <>
      <span className="font-semibold">{shortName(first.candidate)}</span>{" "}
      <span className="tabular">{signed(first.avg - 50)}</span>
    </>
  );
}

function Tag({ children, tone = "muted" }: { children: React.ReactNode; tone?: "muted" | "warn" }) {
  return (
    <span
      className="ml-1 whitespace-nowrap rounded px-1 py-px text-[10px] uppercase tracking-wide align-middle"
      style={{
        border: "1px solid var(--ring)",
        color: tone === "warn" ? "var(--series-2)" : "var(--text-muted)",
      }}
    >
      {children}
    </span>
  );
}

export interface RaceTableProps {
  /** Every poll of the scenario group — including the ones out of the average
   *  and the ones flagged `incomplete`. Any order; sorted newest-first here. */
  polls: Poll[];
  /** The site's average for this group; `null` when it could not be computed. */
  average: RaceAverage | null;
  /** The cut being displayed. Ignored in favour of `average.basis` when an
   *  average is present, so table and average can never be on different cuts. */
  basis: Basis;
  /** Ids of the polls inside the average. Optional only because lib does not
   *  expose the window yet — pass it whenever you can. */
  inAverageIds?: readonly string[];
  /** Overrides the generated `<caption>`. */
  caption?: string;
  /** Height of the scroll region. Default fits the average row + its polls. */
  maxHeight?: string;
}

export default function RaceTable({
  polls,
  average,
  basis,
  inAverageIds,
  caption,
  maxHeight = "34rem",
}: RaceTableProps) {
  if (!polls.length) return null;

  const cut: Basis = average?.basis ?? basis;
  const race: RaceKind = average?.key.race ?? polls[0].race;
  const round: 1 | 2 = average?.key.round ?? polls[0].round;
  const kind = summaryKind(race, round);

  // Every poll shown, on the displayed cut. `toBasis` returns senate polls and
  // bruto untouched, so this is the only conversion anywhere in this file — and
  // polls that are `incomplete` at source are deliberately never passed to it.
  const all = sortPollsDesc(polls).map((p) => (p.incomplete ? p : toBasis(p, cut)));
  const isConverted = (p: Poll): boolean =>
    !p.incomplete || cut === "bruto" || p.race === "senador";

  const inAverage: Set<string> = inAverageIds
    ? new Set(inAverageIds)
    : average
      ? deriveInAverage(
          all.filter((p) => !p.incomplete),
          average,
        )
      : new Set<string>();

  const within = all.filter((p) => inAverage.has(p.id));
  const outside = all.filter((p) => !inAverage.has(p.id));

  const label =
    caption ??
    `${average?.scenario ?? "Pesquisas"} — média do site e as ${polls.length} pesquisa${
      polls.length === 1 ? "" : "s"
    } registradas${cut === "validos" ? ", em votos válidos" : ", sobre o total da amostra"}.`;

  const cols = 5;
  const cellBorder = { borderColor: "var(--grid)" };
  const headBg = { background: "var(--surface-1)" };

  return (
    <div className="card overflow-hidden">
      <div
        role="region"
        aria-label="Todas as pesquisas — role para ver as que estão fora da média"
        tabIndex={0}
        className="overflow-auto"
        style={{ maxHeight }}
      >
        <table className="w-full min-w-[720px] border-collapse text-sm">
          <caption
            className="px-3 pt-3 pb-2 text-left text-xs"
            style={{ color: "var(--text-muted)" }}
          >
            {label}
          </caption>
          <thead>
            <tr
              className="text-left text-xs uppercase tracking-wide"
              style={{ color: "var(--text-muted)" }}
            >
              <th
                scope="col"
                className="sticky top-0 z-10 border-b px-3 py-2 font-medium"
                style={{ ...headBg, borderColor: "var(--ring)" }}
              >
                Instituto
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 border-b px-3 py-2 font-medium"
                style={{ ...headBg, borderColor: "var(--ring)" }}
              >
                Data
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 border-b px-3 py-2 text-right font-medium"
                style={{ ...headBg, borderColor: "var(--ring)" }}
              >
                Margem
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 border-b px-3 py-2 text-right font-medium"
                style={{ ...headBg, borderColor: "var(--ring)" }}
              >
                Amostra
              </th>
              <th
                scope="col"
                className="sticky top-0 z-10 border-b px-3 py-2 text-right font-medium"
                style={{ ...headBg, borderColor: "var(--ring)" }}
              >
                {SUMMARY_HEADER[kind]}
              </th>
            </tr>
          </thead>

          <tbody>
            {average && (
              <tr className="border-b" style={cellBorder}>
                <th scope="row" className="px-3 py-2 text-left font-semibold">
                  Média do site
                </th>
                <td
                  className="whitespace-nowrap px-3 py-2 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {fmtDate(average.lastPollDate)}
                </td>
                <td className="px-3 py-2 text-right" style={{ color: "var(--text-muted)" }}>
                  {DASH}
                </td>
                <td className="px-3 py-2 text-right" style={{ color: "var(--text-muted)" }}>
                  {DASH}
                </td>
                <td className="px-3 py-2 text-right">{averageSummary(average, kind)}</td>
              </tr>
            )}

            {within.map((p) => (
              <tr key={p.id} className="border-b" style={cellBorder}>
                <th scope="row" className="px-3 py-2 text-left font-normal">
                  <a
                    href={p.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:underline"
                  >
                    {p.pollster}
                  </a>
                </th>
                <td
                  className="whitespace-nowrap px-3 py-2 text-xs"
                  style={{ color: "var(--text-secondary)" }}
                >
                  {fieldwork(p)}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular" style={{ color: "var(--text-secondary)" }}>
                  {margin(p)}
                </td>
                <td className="px-3 py-2 text-right text-xs tabular" style={{ color: "var(--text-secondary)" }}>
                  {sample(p)}
                </td>
                <td className="whitespace-nowrap px-3 py-2 text-right">
                  {pollSummary(p, kind, isConverted(p))}
                </td>
              </tr>
            ))}
          </tbody>

          {outside.length > 0 && (
            <tbody>
              <tr>
                <th
                  scope="rowgroup"
                  colSpan={cols}
                  className="border-b border-t px-3 py-2 text-left text-xs font-medium uppercase tracking-wide"
                  style={{ borderColor: "var(--ring)", color: "var(--text-muted)" }}
                >
                  Fora da média · {outside.length} pesquisa{outside.length === 1 ? "" : "s"}
                </th>
              </tr>
              {outside.map((p) => (
                <tr key={p.id} className="border-b last:border-0" style={cellBorder}>
                  <th scope="row" className="px-3 py-2 text-left font-normal">
                    <a
                      href={p.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="hover:underline"
                    >
                      {p.pollster}
                    </a>
                    <Tag>fora da média</Tag>
                    {p.incomplete && <Tag tone="warn">incompleta na fonte</Tag>}
                  </th>
                  <td
                    className="whitespace-nowrap px-3 py-2 text-xs"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {fieldwork(p)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular" style={{ color: "var(--text-secondary)" }}>
                    {margin(p)}
                  </td>
                  <td className="px-3 py-2 text-right text-xs tabular" style={{ color: "var(--text-secondary)" }}>
                    {sample(p)}
                  </td>
                  <td
                    className="whitespace-nowrap px-3 py-2 text-right"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    {pollSummary(p, kind, isConverted(p))}
                  </td>
                </tr>
              ))}
            </tbody>
          )}
        </table>
      </div>
    </div>
  );
}
