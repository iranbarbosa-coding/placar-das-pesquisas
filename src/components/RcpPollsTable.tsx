import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import type { RcpTable, RcpSpread } from "@/lib/presidente";

/**
 * Section 2 — the first-round average and its 10 window polls as an RCP-style
 * MATRIX: pollster · date · one column per named candidate · spread. A
 * highlighted "Média" row sits on top; each cell is that candidate's votos-
 * válidos number (or "—" when the poll did not test them). Server component: a
 * static, dense read of build-time data. It scrolls inside its own
 * `overflow-x-auto` (≈10 columns), never the page.
 *
 * Columns reuse `PresidentBars`' roster AND colours, so a reader ties a column
 * to the bar above it by the coloured dot in its header.
 */

const TH = "px-2 py-1.5 font-bold uppercase tracking-wide whitespace-nowrap";
const TD = "px-2 py-1.5 whitespace-nowrap align-middle";

// The soft spread chip: the leader's distance to 50%, coloured by whether that
// clears the margin of error — green above 50 (clinches the 1st round), red
// below, grey when 50% sits inside the interval (no call). Backgrounds are a
// faint tint of the status colour (color-mix over the card), so they read in
// both themes; text/dot use the status colour itself.
const SPREAD_STYLE: Record<RcpSpread["status"], { bg: string; fg: string; dot: string }> = {
  acima: {
    bg: "color-mix(in srgb, var(--series-3) 15%, var(--surface-1))",
    fg: "var(--series-3)",
    dot: "var(--series-3)",
  },
  abaixo: {
    bg: "color-mix(in srgb, var(--cand-red) 15%, var(--surface-1))",
    fg: "var(--cand-red)",
    dot: "var(--cand-red)",
  },
  empate: { bg: "var(--surface-2)", fg: "var(--text-secondary)", dot: "var(--dot)" },
  // Senate ("leaderMargin"): a neutral chip — there is no above/below-50 meaning.
  neutral: { bg: "var(--surface-2)", fg: "var(--text-secondary)", dot: "var(--dot)" },
};

// SOLID fills for the "Média" band's pill (fixed hexes, since the band is a
// fixed brand-blue in both themes): red below 50, green above, slate on a tie —
// all dark enough for white text.
const SPREAD_SOLID: Record<RcpSpread["status"], string> = {
  acima: "#16a34a", // solid green — leader clinches the 1st round
  abaixo: "#dc2626", // solid red — leader still below 50
  empate: "#475569", // solid slate — technical tie with 50%
  neutral: "#475569", // solid slate — senate lead over the runner-up
};

function SpreadChip({ spread, onDark = false }: { spread: RcpSpread | null; onDark?: boolean }) {
  if (!spread) return <span style={{ color: onDark ? "rgba(255,255,255,0.6)" : "var(--text-muted)" }}>—</span>;

  // The "Média" band gets a SOLID pill in the status colour with white text —
  // same geometry as the soft chips (dot + gap), so it doesn't read smaller.
  if (onDark) {
    return (
      <span
        className="tabular inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
        style={{ background: SPREAD_SOLID[spread.status], color: "#ffffff" }}
      >
        <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "#ffffff" }} />
        {spread.leaderShort} {fmtSigned(spread.value)}
      </span>
    );
  }

  const s = SPREAD_STYLE[spread.status];
  return (
    <span
      className="tabular inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold"
      style={{ background: s.bg, color: s.fg }}
    >
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: s.dot }} />
      {spread.leaderShort} {fmtSigned(spread.value)}
    </span>
  );
}

/** The index of the largest non-null value in a row (its leader), or -1. */
function leaderIndex(values: (number | null)[]): number {
  let idx = -1;
  let best = -Infinity;
  values.forEach((v, i) => {
    if (v != null && v > best) {
      best = v;
      idx = i;
    }
  });
  return idx;
}

/** A candidate's colour dot — shared by the desktop column header and the
 *  mobile card's <dt>, so a reader ties a number to the same bar by its colour
 *  in both layouts. */
function CandidateDot({ color }: { color: string }) {
  return <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full" style={{ background: color }} />;
}

/** A votos-válidos cell value: the pt-BR percent, or "—" when the poll did not
 *  test that candidate. Shared so the desktop matrix and the mobile cards read
 *  identical numbers off the same row. */
function fmtValue(v: number | null): string {
  return v == null ? "—" : `${fmtPct(v)}%`;
}

export default function RcpPollsTable({
  data,
  allPollsHref = "#todas-as-pesquisas",
}: {
  data: RcpTable;
  /** Anchor for the "ver todas as pesquisas" footer link; null hides it (used on
   *  pages without an all-polls section, e.g. the state pages' sample). */
  allPollsHref?: string | null;
}) {
  if (!data.candidates.length) {
    return (
      <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
        Ainda não há pesquisas suficientes para compor a média do 1º turno.
      </p>
    );
  }

  const avgLeader = leaderIndex(data.average.values);

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        10 últimas pesquisas que compõem a média
      </h2>

      {/* Desktop (≥md): the full dense matrix, unchanged — it scrolls inside its
          own overflow-x-auto, never the page. */}
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">
            Média do 1º turno e as 10 pesquisas que a compõem: instituto, data, resultado e o percentual de votos válidos de cada candidato.
          </caption>
          <thead style={{ color: "var(--text-muted)" }}>
            <tr style={{ borderBottom: "1px solid var(--ring)" }}>
              <th scope="col" className={`${TH} text-left`}>Instituto</th>
              <th scope="col" className={`${TH} text-left`}>Data</th>
              <th scope="col" className={`${TH} text-left`}>Resultado</th>
              {data.candidates.map((c) => (
                <th key={c.key} scope="col" className={`${TH} text-right`}>
                  <span className="inline-flex items-center gap-1">
                    <CandidateDot color={c.color} />
                    {c.short}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {/* Highlighted average row: a deep-navy band on light, a vivid brand
                blue on dark (--rcp-avg-band), with light text so it reads as the
                table's headline in both themes — leader in white, rest softer. */}
            <tr className="font-bold" style={{ background: "var(--rcp-avg-band)" }}>
              <td className={`${TD} text-left`} style={{ color: "#ffffff" }}>
                Média
              </td>
              <td className={`${TD} text-left`} style={{ color: "rgba(255,255,255,0.6)" }}>
                —
              </td>
              <td className={`${TD} text-left`}>
                <SpreadChip spread={data.average.spread} onDark />
              </td>
              {data.average.values.map((v, i) => (
                <td
                  key={data.candidates[i].key}
                  className={`${TD} tabular text-right`}
                  style={{ color: i === avgLeader ? "#ffffff" : "rgba(255,255,255,0.78)" }}
                >
                  {fmtValue(v)}
                </td>
              ))}
            </tr>

            {/* One row per poll. */}
            {data.rows.map((r, ri) => {
              const rowLeader = leaderIndex(r.values);
              return (
                <tr key={`${r.pollster}-${r.date}-${ri}`} style={{ borderBottom: "1px solid var(--grid)" }}>
                  <td className={`${TD} text-left`}>
                    {r.source_url ? (
                      <a
                        href={r.source_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:underline"
                        style={{ color: "var(--accent)" }}
                        title="Abrir a pesquisa na fonte"
                      >
                        {r.pollster}
                      </a>
                    ) : (
                      <span style={{ color: "var(--text-primary)" }}>{r.pollster}</span>
                    )}
                  </td>
                  <td className={`${TD} tabular text-left`} style={{ color: "var(--accent)" }}>
                    {fmtDate(r.date)}
                  </td>
                  <td className={`${TD} text-left`}>
                    <SpreadChip spread={r.spread} />
                  </td>
                  {r.values.map((v, i) => (
                    <td
                      key={data.candidates[i].key}
                      className={`${TD} tabular text-right ${i === rowLeader ? "font-bold" : ""}`}
                      style={{ color: v == null ? "var(--text-muted)" : i === rowLeader ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {fmtValue(v)}
                    </td>
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Mobile (<md): one card per poll, LED BY THE RESULT so the numbers are
          never sliced off-screen by a horizontal scroll. The "Média" headline
          becomes the first card, on the same band as the desktop row; every
          candidate's votos-válidos value is a labelled <dt>/<dd> pair carrying
          the same coloured dot as the desktop column header. */}
      <ul className="flex flex-col gap-2 md:hidden">
        {/* Média card — the table's headline, on the deep band with light text. */}
        <li className="card p-3" style={{ background: "var(--rcp-avg-band)" }}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-bold" style={{ color: "#ffffff" }}>Média</span>
            <SpreadChip spread={data.average.spread} onDark />
          </div>
          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]">
            {data.average.values.map((v, i) => (
              <div key={data.candidates[i].key} className="flex items-baseline gap-1">
                <dt className="inline-flex items-center gap-1 uppercase tracking-wide" style={{ color: "rgba(255,255,255,0.6)" }}>
                  <CandidateDot color={data.candidates[i].color} />
                  {data.candidates[i].short}
                </dt>
                <dd className="tabular font-bold" style={{ color: i === avgLeader ? "#ffffff" : "rgba(255,255,255,0.78)" }}>
                  {fmtValue(v)}
                </dd>
              </div>
            ))}
          </dl>
        </li>

        {/* One card per poll. */}
        {data.rows.map((r, ri) => {
          const rowLeader = leaderIndex(r.values);
          return (
            <li key={`${r.pollster}-${r.date}-${ri}`} className="card p-3">
              <div className="flex items-baseline justify-between gap-2">
                {r.source_url ? (
                  <a
                    href={r.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-semibold hover:underline"
                    style={{ color: "var(--accent)" }}
                    title="Abrir a pesquisa na fonte"
                  >
                    {r.pollster}
                  </a>
                ) : (
                  <span className="text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
                    {r.pollster}
                  </span>
                )}
                <span className="tabular whitespace-nowrap text-xs" style={{ color: "var(--accent)" }}>
                  {fmtDate(r.date)}
                </span>
              </div>
              <div className="mt-2">
                <SpreadChip spread={r.spread} />
              </div>
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                {r.values.map((v, i) => (
                  <div key={data.candidates[i].key} className="flex items-baseline gap-1">
                    <dt className="inline-flex items-center gap-1 uppercase tracking-wide">
                      <CandidateDot color={data.candidates[i].color} />
                      {data.candidates[i].short}
                    </dt>
                    <dd
                      className={`tabular ${i === rowLeader ? "font-bold" : ""}`}
                      style={{ color: v == null ? "var(--text-muted)" : i === rowLeader ? "var(--text-primary)" : "var(--text-secondary)" }}
                    >
                      {fmtValue(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </li>
          );
        })}
      </ul>

      {data.spreadMode === "leaderMargin" ? (
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          A coluna <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Resultado</span> mostra
          quem lidera e a vantagem sobre o 2º colocado, em pontos percentuais.
        </p>
      ) : (
        <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
          A coluna <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>Resultado</span> aponta
          quem lidera e quantos pontos faltam ao líder para vencer no 1º turno (atingir 50% dos votos válidos) — em
          verde quando ele já passou dos 50%, vermelho quando ainda falta, e cinza no empate técnico com os 50%.
        </p>
      )}

      {allPollsHref ? (
        <a href={allPollsHref} className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
          Ver todas as pesquisas utilizadas na média <span aria-hidden="true">→</span>
        </a>
      ) : null}
    </div>
  );
}
