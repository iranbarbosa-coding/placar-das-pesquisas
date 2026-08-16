"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useId, useMemo, useRef, useState } from "react";

/**
 * Site-wide reader search — states, candidates, institutes.
 *
 * The site is fully static, so there is no search endpoint: the whole index is
 * built at build time by the SERVER component that renders the masthead and
 * handed down as a plain prop. This file must therefore never import
 * `@/lib/data` (or anything else that reaches the NDJSON store through
 * `node:fs`) — doing so drags a filesystem read into the browser bundle and
 * breaks the build. Keep this module's imports to react/next only.
 */

export type SearchKind = "estado" | "candidato" | "instituto";

export interface SearchItem {
  /** Stable unique key — also used for the option's DOM id. */
  id: string;
  kind: SearchKind;
  /** What the reader sees and types: "São Paulo", "AtlasIntel", "Lula". */
  label: string;
  /** Where Enter goes. Any app route, hash included. */
  href: string;
  /** Small grey line under the label — "Governador e Senado", "312 pesquisas". */
  hint?: string;
  /** Extra match tokens that are not in the label: UF code, party, aliases. */
  keywords?: string[];
}

export interface SiteSearchProps {
  /** Built at build time by the server component that renders <Masthead>. */
  index: readonly SearchItem[];
  className?: string;
  placeholder?: string;
  /** Visually hidden label for the combobox. */
  label?: string;
  maxResults?: number;
}

const KIND_LABEL: Record<SearchKind, string> = {
  estado: "estado",
  candidato: "candidato",
  instituto: "instituto",
};

// Readers looking for a place outnumber readers looking for a pollster, and a
// two-letter query like "sp" should not surface a candidate before the state.
const KIND_ORDER: Record<SearchKind, number> = { estado: 0, candidato: 1, instituto: 2 };

const NO_MATCH = Number.POSITIVE_INFINITY;

/**
 * Accent- and case-insensitive folding: "São Paulo" -> "sao paulo",
 * "Ceará" -> "ceara", "AtlasIntel" -> "atlasintel". NFD splits the accented
 * letter into base + combining mark, and the mark is then dropped.
 */
function fold(value: string): string {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

/** 0 = exact, 1 = prefix, 2 = starts a word, 3 = somewhere inside. */
function bestScore(haystack: string, needle: string): number {
  const at = haystack.indexOf(needle);
  if (at < 0) return NO_MATCH;
  if (at === 0) return haystack.length === needle.length ? 0 : 1;
  const before = haystack[at - 1];
  return before === " " || before === "-" || before === "/" || before === "(" ? 2 : 3;
}

interface Indexed {
  item: SearchItem;
  label: string;
  keywords: string;
}

function rank(entry: Indexed, terms: string[]): number | null {
  let total = 0;
  for (const term of terms) {
    // A keyword hit is worth slightly less than the same hit on the label, so
    // "sp" ranks São Paulo (keyword) below a label that literally starts "sp".
    const score = Math.min(bestScore(entry.label, term), bestScore(entry.keywords, term) + 0.5);
    if (score === NO_MATCH) return null;
    total += score;
  }
  return total;
}

function SearchGlyph() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2"
      style={{ color: "var(--text-muted)" }}
    >
      <circle cx="9" cy="9" r="5.5" />
      <path d="M13.2 13.2 17 17" />
    </svg>
  );
}

export default function SiteSearch({
  index,
  className,
  placeholder = "Buscar estado, candidato ou instituto",
  label = "Buscar no site",
  maxResults = 8,
}: SiteSearchProps) {
  const router = useRouter();
  const uid = useId();
  const inputId = `${uid}-input`;
  const listboxId = `${uid}-listbox`;
  const optionId = (i: number) => `${uid}-opt-${i}`;

  const [query, setQuery] = useState("");
  const [focused, setFocused] = useState(false);
  const [active, setActive] = useState(0);

  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const entries = useMemo<Indexed[]>(
    () =>
      index.map((item) => ({
        item,
        label: fold(item.label),
        keywords: fold([item.kind, item.hint ?? "", ...(item.keywords ?? [])].join(" ")),
      })),
    [index],
  );

  const results = useMemo<SearchItem[]>(() => {
    const terms = fold(query).split(/\s+/).filter(Boolean);
    if (terms.length === 0) return [];
    const hits: { entry: Indexed; score: number }[] = [];
    for (const entry of entries) {
      const score = rank(entry, terms);
      if (score !== null) hits.push({ entry, score });
    }
    hits.sort(
      (a, b) =>
        a.score - b.score ||
        KIND_ORDER[a.entry.item.kind] - KIND_ORDER[b.entry.item.kind] ||
        a.entry.label.length - b.entry.label.length ||
        a.entry.item.label.localeCompare(b.entry.item.label, "pt-BR"),
    );
    return hits.slice(0, maxResults).map((h) => h.entry.item);
  }, [entries, query, maxResults]);

  const trimmed = query.trim();
  const showPopup = focused && trimmed.length > 0;
  const expanded = showPopup && results.length > 0;

  useEffect(() => {
    setActive(0);
  }, [query]);

  // Keep the highlighted option visible when arrowing through a long list.
  useEffect(() => {
    if (!expanded) return;
    listRef.current?.querySelector<HTMLElement>('[data-active="true"]')?.scrollIntoView({ block: "nearest" });
  }, [active, expanded]);

  // "/" focuses the search. Two instances of this component are mounted (the
  // bar one and the phone one); the offsetParent test makes the hidden one a
  // no-op instead of stealing the hotkey from the visible one.
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key !== "/" || event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target;
      if (target instanceof HTMLElement) {
        const tag = target.tagName;
        if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || target.isContentEditable) return;
      }
      const input = inputRef.current;
      if (!input || input.offsetParent === null) return;
      event.preventDefault();
      input.focus();
      input.select();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  // A pointer press anywhere else dismisses the results.
  useEffect(() => {
    if (!showPopup) return;
    function onPointerDown(event: PointerEvent) {
      const node = event.target;
      if (node instanceof Node && boxRef.current?.contains(node)) return;
      setFocused(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [showPopup]);

  const go = useCallback(
    (item: SearchItem) => {
      setQuery("");
      setFocused(false);
      inputRef.current?.blur();
      router.push(item.href);
    },
    [router],
  );

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      if (showPopup) setFocused(false);
      else setQuery("");
      return;
    }
    if (event.key === "Enter") {
      const item = results[expanded ? active : 0];
      if (item) {
        event.preventDefault();
        go(item);
      }
      return;
    }
    if (!results.length) return;
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setFocused(true);
      setActive((i) => (i + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setFocused(true);
      setActive((i) => (i - 1 + results.length) % results.length);
    } else if (event.key === "Home" && expanded) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && expanded) {
      event.preventDefault();
      setActive(results.length - 1);
    }
  }

  return (
    <div ref={boxRef} className={className ? `relative ${className}` : "relative"}>
      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <div className="relative">
        <SearchGlyph />
        <input
          ref={inputRef}
          id={inputId}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          aria-autocomplete="list"
          aria-expanded={expanded}
          aria-controls={expanded ? listboxId : undefined}
          aria-activedescendant={expanded ? optionId(active) : undefined}
          placeholder={placeholder}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setFocused(true);
          }}
          onFocus={() => setFocused(true)}
          onKeyDown={onKeyDown}
          className="w-full min-w-0 rounded-md border py-1.5 pl-8 pr-8 text-sm outline-none focus-visible:ring-2"
          style={{
            borderColor: "var(--ring)",
            background: "var(--page)",
            color: "var(--text-primary)",
          }}
        />
        <kbd
          aria-hidden="true"
          className="pointer-events-none absolute right-2 top-1/2 hidden -translate-y-1/2 rounded border px-1 text-[10px] leading-4 lg:block"
          style={{ borderColor: "var(--ring)", color: "var(--text-muted)" }}
        >
          /
        </kbd>
      </div>

      <span aria-live="polite" className="sr-only">
        {trimmed
          ? results.length === 0
            ? "Nenhum resultado"
            : `${results.length} resultado${results.length === 1 ? "" : "s"}`
          : ""}
      </span>

      {expanded && (
        <ul
          ref={listRef}
          id={listboxId}
          role="listbox"
          aria-label="Resultados da busca"
          className="absolute left-0 right-0 top-full z-50 mt-1 max-h-80 overflow-y-auto rounded-lg border py-1 shadow-lg"
          style={{ borderColor: "var(--ring)", background: "var(--surface-1)" }}
        >
          {results.map((item, i) => (
            <li
              key={item.id}
              id={optionId(i)}
              role="option"
              aria-selected={i === active}
              data-active={i === active}
              // Keep focus in the input so aria-activedescendant stays truthful,
              // and so the blur does not unmount the list before the click lands.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => go(item)}
              onMouseEnter={() => setActive(i)}
              className="flex cursor-pointer items-baseline gap-2 px-3 py-1.5"
              style={i === active ? { background: "var(--grid)" } : undefined}
            >
              <span className="min-w-0 flex-1 truncate text-sm">{item.label}</span>
              {item.hint && (
                <span className="hidden truncate text-xs sm:block" style={{ color: "var(--text-muted)" }}>
                  {item.hint}
                </span>
              )}
              <span
                className="shrink-0 rounded px-1 text-[10px] uppercase tracking-wide"
                style={{ background: "var(--page)", color: "var(--text-secondary)" }}
              >
                {KIND_LABEL[item.kind]}
              </span>
            </li>
          ))}
        </ul>
      )}

      {showPopup && results.length === 0 && (
        <div
          className="absolute left-0 right-0 top-full z-50 mt-1 rounded-lg border px-3 py-2 text-sm shadow-lg"
          style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-muted)" }}
        >
          Nenhum resultado para “{trimmed}”.
        </div>
      )}
    </div>
  );
}
