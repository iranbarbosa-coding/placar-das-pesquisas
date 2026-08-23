"use client";

import { useState } from "react";
import type { PresidentRejectionData } from "@/lib/presidente";
import RejectionPlaceholder from "./RejectionPlaceholder";

/**
 * Section 4 — rejection ("NÃO votaria de jeito nenhum"). One horizontal bar per
 * registered candidate, sorted by rejeição. The bruta/líquida toggle mirrors the
 * placeholder's chrome; líquida is only offered when a poll printed a "conhece"
 * base, otherwise the toggle is disabled and rows read "sem base".
 *
 * When there is no rejection data (the national seed is still empty), it renders
 * the honest placeholder empty-state — the same card, never a fabricated number.
 */

type Metric = "bruta" | "liquida";

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

const fmtPct = (x: number): string => x.toFixed(1).replace(".", ",");

export default function RejectionChart({ data }: { data: PresidentRejectionData }) {
  const [metric, setMetric] = useState<Metric>("bruta");

  // No data → the honest empty-state, unchanged.
  if (!data.rows.length) return <RejectionPlaceholder />;

  const options: { key: Metric; label: string }[] = [
    { key: "bruta", label: "Rejeição bruta" },
    { key: "liquida", label: "Rejeição líquida" },
  ];

  // Bars are scaled to the largest bruta so the ruler is stable across the
  // toggle (líquida ≥ bruta, but we keep the same visual reference).
  const maxBruta = Math.max(...data.rows.map((r) => r.bruta), 1);
  const active = data.hasLiquida ? metric : "bruta";

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
          {options.map((o) => {
            const disabled = o.key === "liquida" && !data.hasLiquida;
            return (
              <button
                key={o.key}
                type="button"
                disabled={disabled}
                onClick={() => setMetric(o.key)}
                aria-pressed={active === o.key}
                title={disabled ? "Sem base de conhecimento nas pesquisas atuais" : undefined}
                className="px-2.5 py-1 transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                style={{
                  background: active === o.key ? "var(--accent)" : "transparent",
                  color: active === o.key ? "#fff" : "var(--text-muted)",
                  fontWeight: active === o.key ? 600 : 400,
                }}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {data.rows.map((r) => {
          const value = active === "liquida" ? r.liquida : r.bruta;
          const semBase = active === "liquida" && r.liquida == null;
          const width = value == null ? 0 : Math.max(1.5, (r.bruta / maxBruta) * 100);
          return (
            <li key={r.candidate} className="flex items-center gap-2">
              <span className="w-28 shrink-0 truncate text-xs font-medium sm:w-36" style={{ color: "var(--text-secondary)" }} title={r.candidate}>
                {r.short}
                {r.party ? <span style={{ color: "var(--text-muted)" }}> · {r.party}</span> : null}
              </span>
              <span className="relative h-5 min-w-0 flex-1 overflow-hidden rounded" style={{ background: "var(--surface-2)" }}>
                <span
                  className="absolute inset-y-0 left-0 rounded"
                  style={{ width: `${width}%`, background: r.color, opacity: semBase ? 0.35 : 1 }}
                />
              </span>
              <span className="w-16 shrink-0 text-right text-xs tabular-nums" style={{ color: semBase ? "var(--text-muted)" : "var(--text-primary)", fontWeight: 600 }}>
                {semBase ? "sem base" : `${fmtPct(value as number)}%`}
              </span>
            </li>
          );
        })}
      </ul>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Rejeição {active === "liquida" ? "líquida (descontando quem não conhece)" : "bruta (sobre a amostra plena)"}
        {" · "}
        {data.multiMention ? "menção múltipla" : "menção única"}
        {data.pollCount ? ` · ${data.pollCount} pesquisa${data.pollCount > 1 ? "s" : ""} na média` : ""}
      </p>
    </div>
  );
}
