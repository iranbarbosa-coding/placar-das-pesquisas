/**
 * Pure formatting helpers — no data loading, no Node built-ins.
 *
 * These live apart from `data.ts` on purpose. `data.ts` reaches the NDJSON
 * store through `node:fs`, so anything importing it is server-only; the moment
 * a component that uses `fmtDate` was rendered inside a client boundary the
 * whole chain followed it into the browser bundle and the build died on
 * `UnhandledSchemeError: Reading from "node:fs"`. A one-line date helper should
 * not drag a filesystem read across the client boundary with it.
 */

/** ISO `2026-08-16` → `16/08/2026`. Null-safe: renders an em dash. */
export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return d && m ? `${d}/${m}/${y}` : iso;
}

/** Percentages in pt-BR: decimal comma, one place. */
export function fmtPct(v: number | null | undefined, places = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  return v.toFixed(places).replace(".", ",");
}

/** A signed number, for leads and distances: `+3,3` / `−7,3` (true minus sign). */
export function fmtSigned(v: number | null | undefined, places = 1): string {
  if (v == null || !Number.isFinite(v)) return "—";
  const s = Math.abs(v).toFixed(places).replace(".", ",");
  return v < 0 ? `−${s}` : `+${s}`;
}
