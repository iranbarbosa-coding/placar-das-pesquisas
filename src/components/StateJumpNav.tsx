"use client";

import { useMemo, useState } from "react";

/**
 * In-page jump index for the long 2º-turno wall.
 *
 * The page renders the presidential matchups followed by every state that has
 * a runoff projection — ~7.300px on desktop, roughly twice that on mobile.
 * With only section headers there was no way to reach one state without
 * scrolling past all the others. This nav gives each section a chip that jumps
 * straight to it.
 *
 * Client on purpose, and only for the filter: the chips are real anchor links
 * (`<a href="#uf-xx">`), so the whole index still works — and still renders in
 * the SSR HTML — with JavaScript off. The typed filter is the single
 * progressive enhancement layered on top. This file imports react only; it
 * never reaches the NDJSON store, so nothing filesystem-bound leaks into the
 * browser bundle.
 */

export interface JumpTarget {
  /** Anchor id already present on the target section, without the "#". */
  id: string;
  /** Full, searchable name: "São Paulo", "Presidente". */
  label: string;
  /** Compact chip text: the UF code, or "Pres." for the president block. */
  short: string;
}

/** Accent- and case-insensitive folding, matching the SiteSearch idiom. */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

export default function StateJumpNav({
  targets,
  label = "Ir para uma seção",
}: {
  targets: readonly JumpTarget[];
  label?: string;
}) {
  const [query, setQuery] = useState("");

  const indexed = useMemo(
    () => targets.map((t) => ({ target: t, hay: `${fold(t.label)} ${fold(t.short)}` })),
    [targets],
  );

  const needle = fold(query).trim();
  const visible = needle ? indexed.filter((e) => e.hay.includes(needle)) : indexed;

  return (
    <nav
      aria-label={label}
      className="sticky top-0 z-20 -mt-2 flex flex-col gap-2 border-b py-3"
      style={{ background: "var(--page)", borderColor: "var(--grid)" }}
    >
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <span className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          Ir para
        </span>
        <label className="relative min-w-0 flex-1 sm:max-w-[16rem]">
          <span className="sr-only">Filtrar seções por estado</span>
          <input
            type="text"
            inputMode="search"
            autoComplete="off"
            spellCheck={false}
            placeholder="Filtrar por estado…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full min-w-0 rounded-md border px-2.5 py-1 text-sm outline-none focus-visible:ring-2"
            style={{ borderColor: "var(--ring)", background: "var(--page)", color: "var(--text-primary)" }}
          />
        </label>
      </div>

      {visible.length > 0 ? (
        <ul className="flex flex-wrap gap-1.5">
          {visible.map(({ target }) => (
            <li key={target.id}>
              <a
                href={`#${target.id}`}
                aria-label={target.label}
                title={target.label}
                className="inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-semibold uppercase tracking-wide transition-colors hover:opacity-80 focus-visible:ring-2"
                style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
              >
                {target.short}
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Nenhum estado corresponde a “{query.trim()}”.
        </p>
      )}
    </nav>
  );
}
