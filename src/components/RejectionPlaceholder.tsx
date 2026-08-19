"use client";

import { useState } from "react";

/**
 * Section 4 — rejection. No rejection data exists yet, so this renders the
 * section's real chrome (title, the bruta/líquida basis toggle, an info glyph)
 * around an honest empty state. NOTHING here fabricates a number: the toggle is
 * selectable but inert, and the chart area is a placeholder the same height as a
 * real chart card, so the page layout reads as intentional rather than broken.
 */

type Basis = "bruta" | "liquida";

function InfoTip() {
  return (
    <span
      className="group relative inline-flex"
      tabIndex={0}
      aria-label="Rejeição bruta é o total que não votaria no candidato; rejeição líquida desconta quem não o conhece."
    >
      <svg viewBox="0 0 16 16" aria-hidden="true" className="inline-block h-3.5 w-3.5 align-middle" style={{ color: "var(--text-muted)" }}>
        <circle cx="8" cy="8" r="7" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <circle cx="8" cy="5" r="0.9" fill="currentColor" />
        <path d="M8 7.2v4" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
      </svg>
      <span
        role="tooltip"
        className="pointer-events-none absolute left-1/2 top-6 z-10 hidden w-64 -translate-x-1/2 rounded-md border p-2 text-[11px] font-normal normal-case tracking-normal shadow-sm group-hover:block group-focus:block"
        style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
      >
        <b style={{ color: "var(--text-primary)" }}>Bruta:</b> total de quem não votaria no candidato.{" "}
        <b style={{ color: "var(--text-primary)" }}>Líquida:</b> desconta quem ainda não o conhece.
      </span>
    </span>
  );
}

export default function RejectionPlaceholder() {
  const [basis, setBasis] = useState<Basis>("bruta");
  const options: { key: Basis; label: string }[] = [
    { key: "bruta", label: "Rejeição bruta" },
    { key: "liquida", label: "Rejeição líquida" },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h2 className="flex items-center gap-1.5 text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Rejeição dos candidatos
          <InfoTip />
        </h2>
        <div
          role="group"
          aria-label="Base da rejeição"
          className="inline-flex w-fit overflow-hidden rounded-md text-xs"
          style={{ border: "1px solid var(--grid)", background: "var(--surface-1)" }}
        >
          {options.map((o) => (
            <button
              key={o.key}
              type="button"
              onClick={() => setBasis(o.key)}
              aria-pressed={basis === o.key}
              className="px-2.5 py-1 transition-colors"
              style={{
                background: basis === o.key ? "var(--accent)" : "transparent",
                color: basis === o.key ? "#fff" : "var(--text-muted)",
                fontWeight: basis === o.key ? 600 : 400,
              }}
            >
              {o.label}
            </button>
          ))}
        </div>
      </div>

      {/* Empty state at HALF the chart height (owner's call), so the card is
          compact but still reads as an intentional placeholder. */}
      <div
        className="flex h-[100px] flex-col items-center justify-center gap-1.5 rounded-lg px-3 text-center sm:h-[120px]"
        style={{ background: "var(--surface-2)", border: "1px dashed var(--ring)" }}
      >
        <p className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          ⏳ Em breve — dados de rejeição em coleta.
        </p>
        <p className="max-w-[54ch] text-xs" style={{ color: "var(--text-muted)" }}>
          Assim que os institutos divulgarem séries de rejeição, elas aparecerão aqui, com as bases
          bruta e líquida.
        </p>
      </div>
    </div>
  );
}
