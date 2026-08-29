"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { SITE_NAME } from "@/lib/brand";
import { UFS, UF_NAMES } from "@/lib/types";
import SiteSearch, { type SearchItem } from "./SiteSearch";

/**
 * Full-bleed site masthead: wordmark, four disclosure menus, reader search.
 *
 * This file is a client component because the menus need `aria-expanded` state
 * and arrow-key handling. It deliberately imports nothing that touches the
 * data layer — the search index arrives as a serialisable prop, built by the
 * server component that renders this one (see `MastheadProps.searchIndex`).
 * The menu targets are static routes, so no data import is needed for them.
 */

export type { SearchItem } from "./SiteSearch";

export interface MastheadProps {
  /**
   * The reader search index, built at BUILD TIME on the server. Every entry is
   * `{ id, kind: "estado" | "candidato" | "instituto", label, href, hint?, keywords? }`.
   */
  searchIndex: readonly SearchItem[];
  /**
   * Optional right-hand status line ("Atualizado em … · N pesquisas"). Server
   * JSX is fine here. Hidden below the xl breakpoint, where the bar is tight.
   */
  meta?: React.ReactNode;
}

type MenuKey = "sobre" | "presidente" | "estados" | "derivadas" | "metodologia" | "imprensa";

interface MenuLink {
  href: string;
  label: string;
  note?: string;
  /** Right-aligned tag — used for the UF code in the states mega-menu. */
  tag?: string;
}

interface Menu {
  key: MenuKey;
  label: string;
  /** The menu button is also a link target on the mobile stack. */
  href: string;
  links: MenuLink[];
  /** Mega-menus span the whole masthead and lay their links out in columns. */
  mega?: boolean;
}

const STATE_LINKS: MenuLink[] = UFS.map((uf) => ({
  href: `/estados/${uf.toLowerCase()}`,
  label: UF_NAMES[uf],
  tag: uf,
})).sort((a, b) => a.label.localeCompare(b.label, "pt-BR"));

// Current top-level set (owner's call, 21/08): Presidente · Estados · Derivadas
// · Metodologia · Sobre. Governador, Senado and 2º turno moved INTO the state
// "Visão geral" page, so they leave the masthead. "Derivadas" is new — its
// content lands in a later session, so it points at a placeholder page for now.
const MENUS: Menu[] = [
  {
    key: "presidente",
    label: "Presidente",
    href: "/presidente",
    links: [
      { href: "/presidente", label: "Disputa presidencial 2026", note: "Média, tendência, simulações de 2º turno e pesquisas por estado" },
    ],
  },
  {
    key: "estados",
    label: "Estados",
    href: "/estados",
    mega: true,
    links: STATE_LINKS,
  },
  {
    key: "derivadas",
    label: "Derivadas",
    href: "/derivadas",
    links: [
      { href: "/institutos", label: "Viés dos Institutos", note: "Efeito casa: quanto cada instituto desvia da média" },
    ],
  },
  {
    key: "metodologia",
    label: "Metodologia",
    href: "/metodologia",
    links: [
      { href: "/metodologia", label: "Como a média é calculada", note: "Janela, limite por instituto, base mínima" },
    ],
  },
  {
    key: "sobre",
    label: "Sobre",
    href: "/sobre",
    links: [{ href: "/sobre", label: "O projeto", note: "Quem faz, com que dados e por quê" }],
  },
  {
    key: "imprensa",
    label: "Imprensa",
    href: "/imprensa",
    links: [{ href: "/imprensa", label: "Sala de imprensa", note: "Como citar, incorporar e falar com o projeto" }],
  },
];

function itemsIn(panel: HTMLElement | null): HTMLElement[] {
  return panel ? Array.from(panel.querySelectorAll<HTMLElement>("[data-mi]")) : [];
}

function ChevronGlyph({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 12 12"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-3 shrink-0 transition-transform"
      style={{ transform: open ? "rotate(180deg)" : undefined }}
    >
      <path d="M2.5 4.5 6 8l3.5-3.5" />
    </svg>
  );
}

function MenuLinks({
  menu,
  variant,
  onNavigate,
}: {
  menu: Menu;
  variant: "bar" | "stack";
  onNavigate: () => void;
}) {
  const isMega = menu.mega === true;
  // 27 states never fit one vertical list. The masthead band (lg and up only)
  // gets 4–5 columns; the phone stack starts at ONE column so long names like
  // "Mato Grosso do Sul" are readable instead of ellipsised, and adds columns
  // as the tablet gets wider. Items flow row-major, so reading order, DOM
  // order and arrow-key order are the same thing.
  const megaGrid =
    variant === "bar"
      ? "grid grid-cols-3 gap-x-2 gap-y-0.5 lg:grid-cols-4 xl:grid-cols-5"
      : "grid grid-cols-1 gap-x-2 gap-y-0.5 sm:grid-cols-2 md:grid-cols-3";
  return (
    <>
      {isMega && (
        <Link
          href={menu.href}
          data-mi
          onClick={onNavigate}
          className="mb-2 inline-block rounded px-2 py-1 text-sm font-semibold hover:underline focus-visible:ring-2"
          style={{ color: "var(--accent)" }}
        >
          Todos os estados →
        </Link>
      )}
      <ul className={isMega ? megaGrid : "space-y-0.5"}>
        {menu.links.map((link) => (
          <li key={`${link.href}-${link.label}`}>
            <Link
              href={link.href}
              data-mi
              onClick={onNavigate}
              className="flex items-baseline gap-2 rounded px-2 py-1.5 hover:bg-[var(--grid)] focus-visible:ring-2 focus-visible:outline-none"
            >
              <span className="min-w-0 flex-1 truncate text-sm">
                {link.label}
                {link.note && (
                  <span className="mt-0.5 block truncate text-xs font-normal" style={{ color: "var(--text-muted)" }}>
                    {link.note}
                  </span>
                )}
              </span>
              {link.tag && (
                <span className="shrink-0 text-xs tabular" style={{ color: "var(--text-muted)" }}>
                  {link.tag}
                </span>
              )}
            </Link>
          </li>
        ))}
      </ul>
    </>
  );
}

interface DisclosureProps {
  menu: Menu;
  open: boolean;
  setOpen: (key: MenuKey | null) => void;
  /** "bar" = horizontal masthead menu; "stack" = the phone/tablet accordion. */
  variant: "bar" | "stack";
  idPrefix: string;
  onNavigate: () => void;
  onSiblingMenu?: (from: MenuKey, dir: -1 | 1) => void;
}

function DisclosureMenu({ menu, open, setOpen, variant, idPrefix, onNavigate, onSiblingMenu }: DisclosureProps) {
  const panelId = `${idPrefix}-${menu.key}`;
  const wrapRef = useRef<HTMLLIElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const pendingFocus = useRef<"first" | "last" | null>(null);
  const isBar = variant === "bar";

  useEffect(() => {
    if (!open || !pendingFocus.current) return;
    const items = itemsIn(panelRef.current);
    const target = pendingFocus.current === "first" ? items[0] : items[items.length - 1];
    pendingFocus.current = null;
    target?.focus();
  }, [open]);

  function onButtonKeyDown(event: React.KeyboardEvent<HTMLButtonElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      pendingFocus.current = event.key === "ArrowDown" ? "first" : "last";
      if (open) {
        const items = itemsIn(panelRef.current);
        const target = pendingFocus.current === "first" ? items[0] : items[items.length - 1];
        pendingFocus.current = null;
        target?.focus();
      } else {
        setOpen(menu.key);
      }
    } else if (event.key === "Escape") {
      setOpen(null);
    } else if (isBar && (event.key === "ArrowRight" || event.key === "ArrowLeft")) {
      event.preventDefault();
      onSiblingMenu?.(menu.key, event.key === "ArrowRight" ? 1 : -1);
    }
  }

  function onPanelKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    const items = itemsIn(panelRef.current);
    if (items.length === 0) return;
    const at = items.indexOf(document.activeElement as HTMLElement);
    if (event.key === "ArrowDown") {
      event.preventDefault();
      items[(at + 1) % items.length]?.focus();
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      items[(at - 1 + items.length) % items.length]?.focus();
    } else if (event.key === "Home") {
      event.preventDefault();
      items[0]?.focus();
    } else if (event.key === "End") {
      event.preventDefault();
      items[items.length - 1]?.focus();
    } else if (event.key === "Escape") {
      event.preventDefault();
      setOpen(null);
      buttonRef.current?.focus();
    }
  }

  return (
    <li
      ref={wrapRef}
      // A mega panel is a DOM child of this <li> but is positioned against the
      // <header> (this <li> is not a containing block when `mega` is set), so
      // it spans the full bleed while pointer/focus containment still works.
      className={isBar ? (menu.mega ? "flex items-stretch" : "relative flex items-stretch") : "block"}
      onPointerEnter={(e) => {
        if (isBar && e.pointerType === "mouse") setOpen(menu.key);
      }}
      onPointerLeave={(e) => {
        if (!isBar || e.pointerType !== "mouse") return;
        const node = wrapRef.current;
        if (node && node.contains(document.activeElement)) return;
        setOpen(null);
      }}
      onBlur={(e) => {
        const next = e.relatedTarget;
        if (next instanceof Node && e.currentTarget.contains(next)) return;
        setOpen(null);
      }}
    >
      <button
        ref={buttonRef}
        type="button"
        data-menubutton={menu.key}
        aria-expanded={open}
        aria-controls={open ? panelId : undefined}
        onClick={() => setOpen(open ? null : menu.key)}
        onKeyDown={onButtonKeyDown}
        className={
          isBar
            ? "flex items-center gap-1.5 whitespace-nowrap px-3 text-sm font-medium hover:bg-[var(--grid)] focus-visible:ring-2 focus-visible:outline-none"
            : "flex w-full items-center justify-between gap-2 rounded px-2 py-2.5 text-left text-sm font-semibold hover:bg-[var(--grid)] focus-visible:ring-2 focus-visible:outline-none"
        }
        style={{ color: open ? "var(--text-primary)" : "var(--text-secondary)" }}
      >
        {menu.label}
        <ChevronGlyph open={open} />
      </button>

      {open && (
        <div
          ref={panelRef}
          id={panelId}
          onKeyDown={onPanelKeyDown}
          className={
            isBar
              ? menu.mega
                ? "absolute left-0 right-0 top-full z-40 border-b border-t py-4 shadow-lg"
                : "absolute left-0 top-full z-40 w-72 rounded-b-lg border border-t-0 p-2 shadow-lg"
              : "px-1 pb-3"
          }
          style={
            isBar
              ? { borderColor: "var(--ring)", background: "var(--surface-1)" }
              : undefined
          }
        >
          {isBar && menu.mega ? (
            <div className="shell">
              <MenuLinks menu={menu} variant={variant} onNavigate={onNavigate} />
            </div>
          ) : (
            <MenuLinks menu={menu} variant={variant} onNavigate={onNavigate} />
          )}
        </div>
      )}
    </li>
  );
}

function BurgerGlyph({ open }: { open: boolean }) {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      className="size-5"
    >
      {open ? (
        <path d="M5 5l10 10M15 5L5 15" />
      ) : (
        <path d="M3 6h14M3 10h14M3 14h14" />
      )}
    </svg>
  );
}

export default function Masthead({ searchIndex, meta }: MastheadProps) {
  const uid = useId();
  const [openKey, setOpenKey] = useState<MenuKey | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const barNavRef = useRef<HTMLElement>(null);
  const headerRef = useRef<HTMLElement>(null);

  const closeAll = useCallback(() => {
    setOpenKey(null);
    setMobileOpen(false);
  }, []);

  // A press outside the masthead dismisses whatever is open.
  useEffect(() => {
    if (!openKey && !mobileOpen) return;
    function onPointerDown(event: PointerEvent) {
      const node = event.target;
      if (node instanceof Node && headerRef.current?.contains(node)) return;
      closeAll();
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [openKey, mobileOpen, closeAll]);

  const siblingMenu = useCallback((from: MenuKey, dir: -1 | 1) => {
    const at = MENUS.findIndex((m) => m.key === from);
    const next = MENUS[(at + dir + MENUS.length) % MENUS.length];
    if (!next) return;
    setOpenKey(next.key);
    barNavRef.current?.querySelector<HTMLElement>(`[data-menubutton="${next.key}"]`)?.focus();
  }, []);

  return (
    // Full bleed: no container, no max-width, no page margins — the strip runs
    // edge to edge and is the only element on the site that does.
    <header
      ref={headerRef}
      className="relative z-30 w-full border-b"
      style={{ borderColor: "var(--ring)", background: "var(--surface-1)" }}
      onKeyDown={(e) => {
        if (e.key === "Escape") closeAll();
      }}
    >
      <div className="shell flex h-16 items-center gap-2 sm:gap-3">
        <Link
          href="/"
          onClick={closeAll}
          className="flex min-w-0 shrink-0 items-center gap-2"
          aria-label={SITE_NAME}
        >
          {/* Header lockup: the transparent brand ICON (Brazil as a node network)
              + the wordmark as themed text (no tagline — that stays on the full
              lockup in the footer). The icon is a transparent PNG, so it sits
              clean on both themes; the wordmark uses theme tokens so "PLACAR"
              inverts to white on the dark header.
              eslint-disable-next-line @next/next/no-img-element */}
          <img src="/brand/placar-icon.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
          {/* Stacked wordmark from the logo: PLACAR over DAS PESQUISAS, uppercase.
              Theme tokens make PLACAR invert to white on the dark header while
              PESQUISAS stays the brand blue and DAS the slate grey. */}
          <span className="block leading-[0.92]">
            <span className="block text-[17px] font-extrabold uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>
              Placar
            </span>
            <span className="block text-[17px] font-extrabold uppercase tracking-tight">
              <span className="text-[10px] align-top" style={{ color: "var(--text-muted)" }}>das </span>
              <span style={{ color: "var(--accent)" }}>Pesquisas</span>
            </span>
          </span>
        </Link>

        <nav ref={barNavRef} aria-label="Principal" className="hidden h-full xl:block">
          <ul className="flex h-full items-stretch">
            {MENUS.map((menu) => (
              <DisclosureMenu
                key={menu.key}
                menu={menu}
                variant="bar"
                idPrefix={`${uid}-bar`}
                open={openKey === menu.key}
                setOpen={setOpenKey}
                onNavigate={closeAll}
                onSiblingMenu={siblingMenu}
              />
            ))}
          </ul>
        </nav>

        <div className="ml-auto flex min-w-0 shrink-0 items-center gap-2 sm:gap-3">
          {meta && (
            <span className="hidden truncate text-xs 2xl:block" style={{ color: "var(--text-muted)" }}>
              {meta}
            </span>
          )}
          <div className="hidden w-40 min-w-0 sm:block md:w-52 lg:w-64 xl:w-56">
            <SiteSearch index={searchIndex} />
          </div>
          {/* "Entrar" — a filled affordance on the right, matching the mockup.
              No auth yet; it points at the about page until accounts exist. */}
          <Link
            href="/sobre"
            className="hidden shrink-0 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90 sm:inline-block"
            style={{ background: "var(--accent)" }}
          >
            Entrar
          </Link>
          <button
            type="button"
            aria-expanded={mobileOpen}
            aria-controls={mobileOpen ? `${uid}-mobile` : undefined}
            aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
            onClick={() => {
              setOpenKey(null);
              setMobileOpen((v) => !v);
            }}
            className="rounded p-1.5 hover:bg-[var(--grid)] focus-visible:ring-2 focus-visible:outline-none xl:hidden"
            style={{ color: "var(--text-secondary)" }}
          >
            <BurgerGlyph open={mobileOpen} />
          </button>
        </div>
      </div>

      {/* Phones: the bar has no room for the search field, so it gets its own
          row. Kept out of the collapsed menu because search is a primary action. */}
      <div className="border-t px-3 pb-2 pt-2 sm:hidden" style={{ borderColor: "var(--ring)" }}>
        <SiteSearch index={searchIndex} />
      </div>

      {mobileOpen && (
        <nav
          id={`${uid}-mobile`}
          aria-label="Menu principal"
          className="max-h-[70vh] overflow-y-auto border-t px-3 py-2 lg:hidden"
          style={{ borderColor: "var(--ring)" }}
        >
          <ul>
            {MENUS.map((menu) => (
              <DisclosureMenu
                key={menu.key}
                menu={menu}
                variant="stack"
                idPrefix={`${uid}-stack`}
                open={openKey === menu.key}
                setOpen={setOpenKey}
                onNavigate={closeAll}
              />
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
