"use client";

import { useMemo, useState } from "react";
import { fmtDate, fmtPct } from "@/lib/format";
import type { PollRow } from "@/lib/presidente";

/**
 * Section 8 — every presidential poll (national and state, both rounds), as a
 * searchable, filterable, paginated table. Client component: it receives the
 * full `PollRow[]` once and does all filtering and paging in memory, so the
 * static export ships one payload and the browser never refetches.
 */

const PAGE_SIZE = 30;
type Periodo = "tudo" | "30" | "90";

function isoMinusDays(iso: string, days: number): string {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d) - days * 86400000);
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${dt.getUTCFullYear()}-${mm}-${dd}`;
}

const TH = "px-2 py-1.5 text-left font-bold uppercase tracking-wide whitespace-nowrap";
const TD = "px-2 py-1.5 whitespace-nowrap align-top";
const CONTROL =
  "rounded-md border px-2 py-1.5 text-xs";

// Shared value formatters, so the desktop table and the mobile cards read the
// SAME numbers off each row — never a divergence between layouts.
const fmtSample = (sample: number | null) => (sample != null ? sample.toLocaleString("pt-BR") : "—");
const fmtMargem = (moe: number | null) => (moe != null ? `± ${fmtPct(moe)}` : "—");

export default function AllPollsTable({ rows, title = "Todas as pesquisas presidenciais" }: { rows: PollRow[]; title?: string }) {
  const [q, setQ] = useState("");
  const [estado, setEstado] = useState("");
  const [instituto, setInstituto] = useState("");
  const [turno, setTurno] = useState("");
  const [periodo, setPeriodo] = useState<Periodo>("tudo");
  const [page, setPage] = useState(1);

  // Option lists, derived once from the data.
  const estados = useMemo(() => {
    const set = [...new Set(rows.map((r) => r.estado))];
    return set.sort((a, b) => (a === "Brasil" ? -1 : b === "Brasil" ? 1 : a.localeCompare(b, "pt-BR")));
  }, [rows]);
  const institutos = useMemo(() => [...new Set(rows.map((r) => r.pollster))].sort((a, b) => a.localeCompare(b, "pt-BR")), [rows]);
  const maxDate = useMemo(() => rows.reduce((m, r) => (r.date && r.date > m ? r.date : m), "0000-00-00"), [rows]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const cutoff = periodo === "tudo" ? null : isoMinusDays(maxDate, periodo === "30" ? 30 : 90);
    return rows.filter((r) => {
      if (needle && !r.haystack.includes(needle)) return false;
      if (estado && r.estado !== estado) return false;
      if (instituto && r.pollster !== instituto) return false;
      if (turno && String(r.round) !== turno) return false;
      if (cutoff && (!r.date || r.date < cutoff)) return false;
      return true;
    });
  }, [rows, q, estado, instituto, turno, periodo, maxDate]);

  const total = filtered.length;
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const current = Math.min(page, pageCount);
  const startIdx = (current - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);
  const showingFrom = total === 0 ? 0 : startIdx + 1;
  const showingTo = Math.min(startIdx + PAGE_SIZE, total);

  // Any filter change resets to page 1.
  const onFilter = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  const clear = () => {
    setQ("");
    setEstado("");
    setInstituto("");
    setTurno("");
    setPeriodo("tudo");
    setPage(1);
  };

  const selectStyle = { borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" };

  return (
    <div id="todas-as-pesquisas" className="flex min-w-0 scroll-mt-20 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        {title}
      </h2>

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-2">
        <input
          type="search"
          value={q}
          onChange={(e) => onFilter(setQ)(e.target.value)}
          placeholder="Buscar instituto, estado ou candidato…"
          className={`${CONTROL} min-w-0 flex-1 sm:max-w-xs`}
          style={selectStyle}
          aria-label="Buscar"
        />
        <select value={estado} onChange={(e) => onFilter(setEstado)(e.target.value)} className={CONTROL} style={selectStyle} aria-label="Estado">
          <option value="">Estado: todos</option>
          {estados.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={instituto} onChange={(e) => onFilter(setInstituto)(e.target.value)} className={CONTROL} style={selectStyle} aria-label="Instituto">
          <option value="">Instituto: todos</option>
          {institutos.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select value={turno} onChange={(e) => onFilter(setTurno)(e.target.value)} className={CONTROL} style={selectStyle} aria-label="Turno">
          <option value="">Turno: todos</option>
          <option value="1">1º turno</option>
          <option value="2">2º turno</option>
        </select>
        <select value={periodo} onChange={(e) => onFilter(setPeriodo as (v: string) => void)(e.target.value)} className={CONTROL} style={selectStyle} aria-label="Período">
          <option value="tudo">Período: tudo</option>
          <option value="30">Últimos 30 dias</option>
          <option value="90">Últimos 90 dias</option>
        </select>
        <button type="button" onClick={clear} className={CONTROL} style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--accent)" }}>
          Limpar filtros
        </button>
      </div>

      {/* Desktop (≥md): the full eight-column table, unchanged — it scrolls
          inside its own overflow-x-auto, never the page. */}
      <div className="hidden min-w-0 overflow-x-auto md:block">
        <table className="w-full border-collapse text-xs">
          <caption className="sr-only">
            Todas as pesquisas encontradas: data, disputa, estado, instituto, amostra, resultado, margem e registro no TSE.
          </caption>
          <thead style={{ color: "var(--text-muted)" }}>
            <tr style={{ borderBottom: "1px solid var(--ring)" }}>
              <th scope="col" className={TH}>Data</th>
              <th scope="col" className={TH}>Disputa</th>
              <th scope="col" className={TH}>Estado</th>
              <th scope="col" className={TH}>Instituto</th>
              <th scope="col" className={`${TH} text-right`}>Amostra</th>
              <th scope="col" className={TH}>Resultado</th>
              <th scope="col" className={`${TH} text-right`}>Margem</th>
              <th scope="col" className={TH}>Registro</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--grid)" }}>
                <td className={`${TD} tabular`} style={{ color: "var(--accent)" }}>{fmtDate(r.date)}</td>
                <td className={TD} style={{ color: "var(--text-secondary)" }}>{r.disputa}</td>
                <td className={TD} style={{ color: "var(--text-secondary)" }}>{r.estado}</td>
                <td className={TD}>
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
                <td className={`${TD} tabular text-right`} style={{ color: "var(--text-secondary)" }}>{fmtSample(r.sample)}</td>
                <td className={`${TD} tabular`} style={{ color: "var(--text-secondary)" }}>{r.resultado || "—"}</td>
                <td className={`${TD} tabular text-right`} style={{ color: "var(--text-secondary)" }}>{fmtMargem(r.moe)}</td>
                <td className={`${TD} tabular`} style={{ color: "var(--text-muted)" }}>{r.registro}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr>
                <td colSpan={8} className="px-2 py-6 text-center text-sm" style={{ color: "var(--text-muted)" }}>
                  Nenhuma pesquisa encontrada com esses filtros.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile (<md): one card per poll, LED BY THE RESULT so the numbers are
          never sliced off-screen by a horizontal scroll. Pollster and date head
          the card; disputa · estado sit under it; amostra, margem and registro
          are labelled <dt>/<dd> pairs reading the same values as the table. */}
      {pageRows.length === 0 ? (
        <p className="px-2 py-6 text-center text-sm md:hidden" style={{ color: "var(--text-muted)" }}>
          Nenhuma pesquisa encontrada com esses filtros.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 md:hidden">
          {pageRows.map((r) => (
            <li key={r.id} className="card p-3">
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
              <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>
                {r.disputa} · {r.estado}
              </p>
              <p className="tabular mt-2 text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>
                {r.resultado || "—"}
              </p>
              <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
                <div className="flex items-baseline gap-1">
                  <dt className="uppercase tracking-wide">Amostra</dt>
                  <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{fmtSample(r.sample)}</dd>
                </div>
                <div className="flex items-baseline gap-1">
                  <dt className="uppercase tracking-wide">Margem</dt>
                  <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{fmtMargem(r.moe)}</dd>
                </div>
                <div className="flex items-baseline gap-1">
                  <dt className="uppercase tracking-wide">Registro</dt>
                  <dd className="tabular" style={{ color: "var(--text-muted)" }}>{r.registro}</dd>
                </div>
              </dl>
            </li>
          ))}
        </ul>
      )}

      {/* Pagination */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-xs" style={{ color: "var(--text-secondary)" }}>
        <span className="tabular">
          Mostrando {showingFrom.toLocaleString("pt-BR")} a {showingTo.toLocaleString("pt-BR")} de {total.toLocaleString("pt-BR")}
        </span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={current <= 1}
            className="rounded-md border px-2.5 py-1 disabled:opacity-40"
            style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
          >
            Anterior
          </button>
          <span className="tabular px-1">
            {current} / {pageCount}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(pageCount, p + 1))}
            disabled={current >= pageCount}
            className="rounded-md border px-2.5 py-1 disabled:opacity-40"
            style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
          >
            Próxima
          </button>
        </div>
      </div>
    </div>
  );
}
