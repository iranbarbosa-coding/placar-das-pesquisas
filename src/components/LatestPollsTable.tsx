"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { shortName } from "@/lib/names";
import type { Poll } from "@/lib/types";
import { UF_NAMES } from "@/lib/types";
import type { LatestTableRow, PollTrend } from "@/lib/home";

/**
 * The dense "Últimas pesquisas" table — the target's full-width, eight-column
 * form: Data · Disputa · Estado · Instituto · Amostra · Resultado · Margem ·
 * Tendência, with a row of filter dropdowns above it and day-group dividers.
 *
 * Client component so the four filters actually work (they are real controls,
 * not decoration): disputa, estado, instituto and period narrow the rows in the
 * browser over the same build-time data. The trend arrow is precomputed server
 * side in `latestForTable` — a comparison of two published polls, not a model.
 *
 * ── ON THE ASTERISK ──────────────────────────────────────────────────────────
 * A poll is marked only when a PARTY paid for it, per its TSE registration —
 * a fact about the poll, never a verdict on the institute. RCP grades pollsters;
 * this site refuses to, because the moment it does its average stops being
 * something a reader can reproduce.
 */

function n1(x: number): string {
  return x.toFixed(1).replace(".", ",");
}

const WEEKDAY = ["DOMINGO", "SEGUNDA-FEIRA", "TERÇA-FEIRA", "QUARTA-FEIRA", "QUINTA-FEIRA", "SEXTA-FEIRA", "SÁBADO"];
const MONTH = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

function dayLabel(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  return `${WEEKDAY[dt.getUTCDay()]}, ${d} DE ${MONTH[m - 1].toUpperCase()}`;
}

function shortDate(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

function raceLabel(p: Poll): string {
  if (p.race === "presidente") return `Presidente · ${p.round}º turno`;
  return p.race === "governador" ? "Governador" : "Senado";
}

function estadoLabel(p: Poll): string {
  return p.state ? p.state : "Brasil";
}

function href(p: Poll): string {
  if (p.race === "presidente" && !p.state) return p.round === 2 ? "/segundo-turno" : "/presidente";
  return p.state ? `/estados/${p.state.toLowerCase()}` : "/presidente";
}

function TrendArrow({ trend }: { trend: PollTrend | null }) {
  if (trend === "up") return <span className="font-bold" style={{ color: "var(--series-3)" }} title="Vantagem do líder cresceu">↑</span>;
  if (trend === "down") return <span className="font-bold" style={{ color: "var(--cand-red)" }} title="Vantagem do líder caiu">↓</span>;
  if (trend === "flat") return <span style={{ color: "var(--text-muted)" }} title="Estável">→</span>;
  return <span style={{ color: "var(--text-muted)" }}>—</span>;
}

/** The "líder X vice" result string — shared by the desktop cell and the mobile
 *  card, so both read the same leader/runner-up numbers off the row. */
function Result({ r }: { r: LatestTableRow }) {
  if (!r.leader) return <span style={{ color: "var(--text-muted)" }}>—</span>;
  return (
    <>
      <strong className="font-semibold" style={{ color: "var(--text-primary)" }}>
        {shortName(r.leader.candidate)} {n1(r.leader.pct)}%
      </strong>
      {r.runnerUp ? (
        <>
          <span style={{ color: "var(--text-muted)" }}> x </span>
          <span style={{ color: "var(--text-secondary)" }}>
            {shortName(r.runnerUp.candidate)} {n1(r.runnerUp.pct)}%
          </span>
        </>
      ) : null}
    </>
  );
}

/** The pollster name plus its optional "encomendada por" asterisk — shared. */
function Pollster({ r }: { r: LatestTableRow }) {
  return (
    <>
      {r.poll.pollster}
      {r.commissionedBy ? (
        <>
          <span aria-hidden="true">*</span>
          <span className="sr-only"> — encomendada por {r.commissionedBy}</span>
        </>
      ) : null}
    </>
  );
}

/** The signed margin (líder sobre o 2º), coloured like the desktop column. */
function Margin({ spread }: { spread: number | null | undefined }) {
  return (
    <span
      className="tabular font-semibold"
      style={{ color: spread == null || spread === 0 ? "var(--text-muted)" : "var(--series-3)" }}
    >
      {spread == null ? "—" : `+${n1(spread)}`}
    </span>
  );
}

const SELECT_CLASS = "rounded-md border px-2.5 py-1.5 text-sm";
const selectStyle = { borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-secondary)" } as const;

type Periodo = "7" | "30" | "tudo";

export default function LatestPollsTable({ rows, limit }: { rows: LatestTableRow[]; limit?: number }) {
  const base = limit ? rows.slice(0, limit) : rows;
  const [disputa, setDisputa] = useState("todas");
  const [estado, setEstado] = useState("todos");
  const [instituto, setInstituto] = useState("todos");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");

  const institutos = useMemo(
    () => [...new Set(base.map((r) => r.poll.pollster).filter(Boolean))].sort() as string[],
    [base],
  );
  const estados = useMemo(
    () => [...new Set(base.map((r) => r.poll.state ?? "BR"))].sort(),
    [base],
  );

  const newest = base[0]?.poll.fieldwork_end ?? base[0]?.poll.published_date ?? null;

  const shown = useMemo(() => {
    return base.filter((r) => {
      if (disputa !== "todas" && r.poll.race !== disputa) return false;
      if (estado !== "todos" && (r.poll.state ?? "BR") !== estado) return false;
      if (instituto !== "todos" && r.poll.pollster !== instituto) return false;
      if (periodo !== "tudo" && newest) {
        const d = r.poll.fieldwork_end ?? r.poll.published_date;
        if (!d) return false;
        const days = (new Date(newest).getTime() - new Date(d).getTime()) / 86400000;
        if (days > Number(periodo)) return false;
      }
      return true;
    });
  }, [base, disputa, estado, instituto, periodo, newest]);

  // Group by day, newest-first order preserved.
  const days: { key: string; rows: LatestTableRow[] }[] = [];
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
        <h2 id="ultimas-pesquisas" className="text-sm font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Últimas pesquisas <span style={{ color: "var(--text-muted)" }}>· votos válidos · Senado em números brutos</span>
        </h2>
      </div>

      {/* Filters — real controls over the build-time data. */}
      <div className="mb-3 flex flex-wrap gap-2">
        <select aria-label="Filtrar por disputa" className={SELECT_CLASS} style={selectStyle} value={disputa} onChange={(e) => setDisputa(e.target.value)}>
          <option value="todas">Todas as disputas</option>
          <option value="presidente">Presidente</option>
          <option value="governador">Governador</option>
          <option value="senador">Senado</option>
        </select>
        <select aria-label="Filtrar por estado" className={SELECT_CLASS} style={selectStyle} value={estado} onChange={(e) => setEstado(e.target.value)}>
          <option value="todos">Todos os estados</option>
          {estados.map((uf) => (
            <option key={uf} value={uf}>{uf === "BR" ? "Brasil" : UF_NAMES[uf as keyof typeof UF_NAMES] ?? uf}</option>
          ))}
        </select>
        <select aria-label="Filtrar por instituto" className={SELECT_CLASS} style={selectStyle} value={instituto} onChange={(e) => setInstituto(e.target.value)}>
          <option value="todos">Todos os institutos</option>
          {institutos.map((i) => (
            <option key={i} value={i}>{i}</option>
          ))}
        </select>
        <select aria-label="Filtrar por período" className={SELECT_CLASS} style={selectStyle} value={periodo} onChange={(e) => setPeriodo(e.target.value as Periodo)}>
          <option value="tudo">Todo o período</option>
          <option value="7">Últimos 7 dias</option>
          <option value="30">Últimos 30 dias</option>
        </select>
      </div>

      {/* Desktop (≥md): the full dense matrix, unchanged. */}
      <div className="card hidden overflow-x-auto md:block">
        <table className="w-full min-w-[560px] text-xs">
          <caption className="sr-only">
            Pesquisas publicadas mais recentes, agrupadas por dia: data, disputa, estado, instituto, amostra, resultado, margem e tendência.
          </caption>
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--ring)" }}>
              <th scope="col" className="px-1.5 py-2 font-semibold">Data</th>
              <th scope="col" className="px-1.5 py-2 font-semibold">Disputa</th>
              <th scope="col" className="px-1.5 py-2 font-semibold">Estado</th>
              <th scope="col" className="px-1.5 py-2 font-semibold">Instituto</th>
              <th scope="col" className="px-1.5 py-2 text-right font-semibold">Amostra</th>
              <th scope="col" className="px-1.5 py-2 font-semibold">Resultado</th>
              <th scope="col" className="px-1.5 py-2 text-right font-semibold">Margem</th>
              <th scope="col" className="px-1.5 py-2 text-center font-semibold">Tendência</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => (
              <Fragmentish key={day.key || "sem-data"}>
                <tr style={{ background: "var(--surface-2)" }}>
                  <th scope="colgroup" colSpan={8} className="px-1.5 py-1.5 text-left text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--accent)", borderTop: "1px solid var(--ring)" }}>
                    {day.key ? dayLabel(day.key) : "SEM DATA DE CAMPO"}
                  </th>
                </tr>
                {day.rows.map((r) => (
                  <tr key={r.poll.id} className="border-b last:border-0" style={{ borderColor: "var(--ring)" }}>
                    <td className="tabular whitespace-nowrap px-1.5 py-2" style={{ color: "var(--text-secondary)" }}>{day.key ? shortDate(day.key) : "—"}</td>
                    <td className="whitespace-nowrap px-1.5 py-2">
                      <Link href={href(r.poll)} className="hover:underline" style={{ color: "var(--accent)" }}>
                        {raceLabel(r.poll)}
                      </Link>
                    </td>
                    <td className="px-1.5 py-2" style={{ color: "var(--text-secondary)" }}>{estadoLabel(r.poll)}</td>
                    <th scope="row" className="whitespace-nowrap px-1.5 py-2 text-left font-medium">
                      <Pollster r={r} />
                    </th>
                    <td className="tabular px-1.5 py-2 text-right" style={{ color: "var(--text-secondary)" }}>
                      {r.poll.sample_size ? r.poll.sample_size.toLocaleString("pt-BR") : "—"}
                    </td>
                    <td className="whitespace-nowrap px-1.5 py-2 text-xs" style={{ color: "var(--text-secondary)" }}>
                      <Result r={r} />
                    </td>
                    <td className="px-1.5 py-2 text-right">
                      <Margin spread={r.spread} />
                    </td>
                    <td className="px-1.5 py-2 text-center"><TrendArrow trend={r.trend} /></td>
                  </tr>
                ))}
              </Fragmentish>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile (<md): one card per poll, led by the RESULT so the poll numbers
          are never scrolled off-screen. Day dividers mirror the table's groups.
          `aria-hidden` on the label chip keeps the divider text out of the
          reading order; each card carries its own date. */}
      <ul className="flex flex-col gap-3 md:hidden">
        {days.map((day) => (
          <li key={day.key || "sem-data"}>
            <p
              className="mb-2 text-[11px] font-bold uppercase tracking-wide"
              style={{ color: "var(--accent)" }}
            >
              {day.key ? dayLabel(day.key) : "SEM DATA DE CAMPO"}
            </p>
            <ul className="flex flex-col gap-2">
              {day.rows.map((r) => (
                <li key={r.poll.id} className="card p-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <Link href={href(r.poll)} className="text-sm font-semibold hover:underline" style={{ color: "var(--accent)" }}>
                      {raceLabel(r.poll)}
                    </Link>
                    <span className="tabular whitespace-nowrap text-xs" style={{ color: "var(--text-muted)" }}>
                      {day.key ? shortDate(day.key) : "—"}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                    {estadoLabel(r.poll)} · <Pollster r={r} />
                  </p>
                  <p className="mt-2 text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>
                    <Result r={r} />
                  </p>
                  <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    <div className="flex items-baseline gap-1">
                      <dt className="uppercase tracking-wide">Amostra</dt>
                      <dd className="tabular" style={{ color: "var(--text-secondary)" }}>
                        {r.poll.sample_size ? r.poll.sample_size.toLocaleString("pt-BR") : "—"}
                      </dd>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <dt className="uppercase tracking-wide">Margem</dt>
                      <dd><Margin spread={r.spread} /></dd>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <dt className="uppercase tracking-wide">Tendência</dt>
                      <dd><TrendArrow trend={r.trend} /></dd>
                    </div>
                  </dl>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <Link href="/institutos" className="text-sm font-semibold" style={{ color: "var(--accent)" }}>
          Ver todas as pesquisas catalogadas →
        </Link>
        {anyCommissioned ? (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            <span aria-hidden="true">*</span> encomendada por um partido (contratante declarado no TSE).
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** A keyed fragment. `<>` cannot take a key, and each day needs one. */
function Fragmentish({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
