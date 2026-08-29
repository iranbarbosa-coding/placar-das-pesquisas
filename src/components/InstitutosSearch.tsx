"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

/**
 * Reader-side filter for the ~150-row institutes list.
 *
 * The full list has no search, so finding one pollster meant scanning the whole
 * table. This component owns both renderings — the desktop table and the mobile
 * cards — and narrows them by a typed name query.
 *
 * Client on purpose, and progressive-enhancement safe: the initial state has an
 * empty query, so the SSR HTML already contains every row. With JavaScript off
 * the box simply does nothing and the complete list stays on the page. This
 * file imports react only; the data arrives as a plain prop, so nothing
 * filesystem-bound leaks into the browser bundle.
 */

export interface InstitutoRow {
  name: string;
  count: number;
  races: number;
  /** Preformatted date string ("—" when null), computed on the server. */
  latest: string;
  /** Slug of this institute's own page, when it has one (enough polls). */
  slug?: string;
}

/** The institute name, linked to its page when it has one. */
function NameCell({ row }: { row: InstitutoRow }) {
  if (!row.slug) return <>{row.name}</>;
  return (
    <Link href={`/institutos/${row.slug}`} className="hover:underline" style={{ color: "var(--accent)" }}>
      {row.name}
    </Link>
  );
}

/** Accent- and case-insensitive folding, matching the SiteSearch idiom. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function InstitutosSearch({ list }: { list: readonly InstitutoRow[] }) {
  const [query, setQuery] = useState("");

  const indexed = useMemo(() => list.map((row) => ({ row, hay: fold(row.name) })), [list]);
  const needle = fold(query).trim();
  const visible = needle ? indexed.filter((e) => e.hay.includes(needle)).map((e) => e.row) : list;

  return (
    <div>
      <div className="mt-6 flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between">
        <label className="relative w-full sm:max-w-[20rem]">
          <span className="sr-only">Buscar instituto pelo nome</span>
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Buscar instituto pelo nome…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-w-0 rounded-md border px-3 py-1.5 text-sm outline-none focus-visible:ring-2"
            style={{ borderColor: "var(--ring)", background: "var(--page)", color: "var(--text-primary)" }}
          />
        </label>
        <span aria-live="polite" className="text-xs tabular" style={{ color: "var(--text-muted)" }}>
          {needle
            ? `${visible.length} de ${list.length} institutos`
            : `${list.length} institutos`}
        </span>
      </div>

      {visible.length === 0 ? (
        <p className="card mt-4 p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Nenhum instituto corresponde a “{query.trim()}”.
        </p>
      ) : (
        <>
          {/* Desktop (≥md): the full table. */}
          <div className="card mt-4 hidden overflow-x-auto md:block">
            <table className="w-full min-w-[480px] text-sm">
              <thead>
                <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: "var(--ring)", color: "var(--text-muted)" }}>
                  <th className="px-3 py-2 font-medium">Instituto</th>
                  <th className="px-3 py-2 text-right font-medium">Pesquisas</th>
                  <th className="px-3 py-2 text-right font-medium">Disputas cobertas</th>
                  <th className="px-3 py-2 text-right font-medium">Mais recente</th>
                </tr>
              </thead>
              <tbody>
                {visible.map((p) => (
                  <tr key={p.name} className="border-b last:border-0" style={{ borderColor: "var(--grid)" }}>
                    <td className="px-3 py-2 font-medium"><NameCell row={p} /></td>
                    <td className="px-3 py-2 text-right tabular">{p.count}</td>
                    <td className="px-3 py-2 text-right tabular">{p.races}</td>
                    <td className="px-3 py-2 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                      {p.latest}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile (<md): one card per instituto — name on top, the three figures
              as labelled pairs, so nothing clips off the right edge. */}
          <ul className="mt-4 flex flex-col gap-2 md:hidden">
            {visible.map((p) => (
              <li key={p.name} className="card p-3">
                <p className="font-semibold" style={{ color: "var(--text-primary)" }}><NameCell row={p} /></p>
                <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
                  <div className="flex items-baseline gap-1">
                    <dt className="uppercase tracking-wide">Pesquisas</dt>
                    <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{p.count}</dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt className="uppercase tracking-wide">Disputas</dt>
                    <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{p.races}</dd>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <dt className="uppercase tracking-wide">Mais recente</dt>
                    <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{p.latest}</dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
