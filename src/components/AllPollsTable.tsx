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

export default function AllPollsTable({ rows }: { rows: PollRow[] }) {
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
        Todas as pesquisas presidenciais
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

      {/* Table */}
      <div className="min-w-0 overflow-x-auto">
        <table className="w-full border-collapse text-xs">
          <thead style={{ color: "var(--text-muted)" }}>
            <tr style={{ borderBottom: "1px solid var(--ring)" }}>
              <th className={TH}>Data</th>
              <th className={TH}>Disputa</th>
              <th className={TH}>Estado</th>
              <th className={TH}>Instituto</th>
              <th className={`${TH} text-right`}>Amostra</th>
              <th className={TH}>Resultado</th>
              <th className={`${TH} text-right`}>Margem</th>
              <th className={TH}>Registro</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.id} style={{ borderBottom: "1px solid var(--grid)" }}>
                <td className={`${TD} tabular`} style={{ color: "var(--accent)" }}>{fmtDate(r.date)}</td>
                <td className={TD} style={{ color: "var(--text-secondary)" }}>{r.disputa}</td>
                <td className={TD} style={{ color: "var(--text-secondary)" }}>{r.estado}</td>
                <td className={TD} style={{ color: "var(--text-primary)" }}>{r.pollster}</td>
                <td className={`${TD} tabular text-right`} style={{ color: "var(--text-secondary)" }}>{r.sample != null ? r.sample.toLocaleString("pt-BR") : "—"}</td>
                <td className={`${TD} tabular`} style={{ color: "var(--text-secondary)" }}>{r.resultado || "—"}</td>
                <td className={`${TD} tabular text-right`} style={{ color: "var(--text-secondary)" }}>{r.moe != null ? `± ${fmtPct(r.moe)}` : "—"}</td>
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
