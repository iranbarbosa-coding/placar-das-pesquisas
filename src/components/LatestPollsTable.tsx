import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { shortName } from "@/lib/home";
import type { Poll } from "@/lib/types";
import { UF_NAMES } from "@/lib/types";

export interface LatestRow {
  poll: Poll;
  /** The party that paid for it, when a party did. Null otherwise. */
  commissionedBy: string | null;
  leader: { candidate: string; pct: number } | null;
  runnerUp: { candidate: string; pct: number } | null;
  spread: number | null;
}

function n1(x: number): string {
  return x.toFixed(1).replace(".", ",");
}

const WEEKDAY = ["domingo", "segunda-feira", "terça-feira", "quarta-feira", "quinta-feira", "sexta-feira", "sábado"];
const MONTH = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "segunda-feira, 10 de agosto" — the day divider. Parsed as UTC so the label
 *  cannot slide a day depending on where the build machine sits. */
function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAY[dt.getUTCDay()]}, ${d} de ${MONTH[m - 1]}`;
}

function raceLabel(p: Poll): string {
  if (p.race === "presidente") {
    return p.state ? `Presidente · ${p.state}` : `Presidente · ${p.round}º turno`;
  }
  return `${p.race === "governador" ? "Governador" : "Senado"} · ${UF_NAMES[p.state!] ?? p.state}`;
}

function href(p: Poll): string {
  if (p.race === "presidente" && !p.state) return p.round === 2 ? "/segundo-turno" : "/presidente";
  return p.state ? `/estados/${p.state.toLowerCase()}` : "/presidente";
}

/**
 * The dense latest-polls table: RACE | POLL | RESULTS | SPREAD, broken into
 * days by divider rows.
 *
 * ── ON THE ASTERISK ──────────────────────────────────────────────────────────
 * RealClearPolitics marks "partisan pollsters" — a standing verdict on the
 * house. This site does not, and refusing to is the positioning: a rival
 * aggregator weights polls by "acurácia histórica do instituto", which is an
 * editorial judgement about who deserves trust wearing the clothes of a method.
 * The moment this site starts grading institutes, its own average stops being
 * something a reader can reproduce.
 *
 * What is marked instead is a FACT about one poll: a party paid for it, as
 * recorded in that poll's own TSE registration. 34 polls in the database carry
 * a party as contractor. Self-commissioned polls, and those paid for by media
 * or by companies, are NOT marked — being paid for is normal, and only the
 * payer having a stake in the answer is worth a footnote.
 *
 * The consequence to be honest about: an institute with a quiet partisan lean
 * and no party invoice gets no asterisk here. This mark is narrower than RCP's,
 * and narrower on purpose — it says only what the record can support.
 */
export default function LatestPollsTable({ rows, limit }: { rows: LatestRow[]; limit?: number }) {
  const shown = limit ? rows.slice(0, limit) : rows;
  if (!shown.length) return null;

  // Group by day, preserving the newest-first order the data arrives in.
  const days: { key: string; rows: LatestRow[] }[] = [];
  for (const r of shown) {
    const key = r.poll.fieldwork_end ?? r.poll.published_date ?? "";
    const last = days[days.length - 1];
    if (last && last.key === key) last.rows.push(r);
    else days.push({ key, rows: [r] });
  }

  const anyCommissioned = shown.some((r) => r.commissionedBy);

  return (
    <section aria-labelledby="ultimas-pesquisas">
      <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="ultimas-pesquisas" className="text-xl font-bold">Últimas pesquisas</h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          em votos válidos · Senado em números brutos
        </span>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <caption className="sr-only">
            Pesquisas publicadas mais recentes, agrupadas por dia, com a disputa, o instituto, os
            dois primeiros colocados e a diferença entre eles.
          </caption>
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              <th scope="col" className="px-3 py-2 font-medium">Disputa</th>
              <th scope="col" className="px-3 py-2 font-medium">Pesquisa</th>
              <th scope="col" className="px-3 py-2 font-medium">Resultado</th>
              <th scope="col" className="px-3 py-2 text-right font-medium">Diferença</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <Fragmentish key={day.key || "sem-data"}>
                <tr style={{ background: "var(--page)" }}>
                  {/* A date divider is a heading for the rows under it, not a
                      data row — hence role=presentation on the cell's emptiness
                      and a real scope=colgroup label. */}
                  <th
                    scope="colgroup"
                    colSpan={4}
                    className="px-3 py-1.5 text-left text-xs font-semibold uppercase tracking-wide"
                    style={{ color: "var(--text-secondary)", borderTop: "1px solid var(--grid)" }}
                  >
                    {day.key ? dayLabel(day.key) : "sem data de campo"}
                  </th>
                </tr>
                {day.rows.map((r) => (
                  <tr key={r.poll.id} className="border-b last:border-0" style={{ borderColor: "var(--grid)" }}>
                    <td className="px-3 py-2">
                      <Link href={href(r.poll)} className="hover:underline" style={{ color: "var(--accent)" }}>
                        {raceLabel(r.poll)}
                      </Link>
                    </td>
                    <th scope="row" className="px-3 py-2 text-left font-medium">
                      {r.poll.pollster}
                      {r.commissionedBy ? (
                        <>
                          <span aria-hidden="true">*</span>
                          <span className="sr-only"> — encomendada por {r.commissionedBy}</span>
                        </>
                      ) : null}
                      {r.poll.sample_size ? (
                        <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                          n={r.poll.sample_size.toLocaleString("pt-BR")}
                        </span>
                      ) : null}
                    </th>
                    <td className="px-3 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      {r.leader ? (
                        <>
                          <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
                            {shortName(r.leader.candidate)} {n1(r.leader.pct)}
                          </strong>
                          {r.runnerUp ? ` · ${shortName(r.runnerUp.candidate)} ${n1(r.runnerUp.pct)}` : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-right tabular">
                      {r.spread == null ? "—" : `+${n1(r.spread)}`}
                    </td>
                  </tr>
                ))}
              </Fragmentish>
            ))}
          </tbody>
        </table>
      </div>

      {anyCommissioned ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span aria-hidden="true">*</span> pesquisa <strong className="font-medium">encomendada por um partido</strong>,
          conforme o contratante declarado no registro do TSE. Não é um juízo sobre o instituto —
          só quem pagou pela pesquisa.
        </p>
      ) : null}
    </section>
  );
}

/** A keyed fragment. `<>` cannot take a key, and each day needs one. */
function Fragmentish({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
