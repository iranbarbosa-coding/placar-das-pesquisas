import fs from "node:fs";
import path from "node:path";
import { shortName } from "@/lib/names";
import type { MapStatus } from "@/lib/home";
import { UF_NAMES } from "@/lib/types";
import type { UF } from "@/lib/types";

/**
 * The geographic Brazil map in the sidebar — the creator supplied a real
 * states SVG (`brasil-mapa.svg`, viewBox 0 0 800 800). It is inlined and each
 * state is coloured by its leader status via a scoped `<style>` block, whose
 * `#brasil-map` id prefix outranks the SVG's own `.estado{fill:#DDDDDD}` rule,
 * so no markup edit is needed. The asset is inconsistent about where the
 * `uf-XX` class sits — most states are a `<g class="estado uf-XX">` wrapping
 * paths, but a few (DF, ES, GO, RN, RO) put the class directly on a single
 * `<path>` — so the rule targets BOTH the element itself and its descendant
 * paths, colouring either shape.
 *
 * Server component — the file is read once at build time. It must not be
 * imported by a client component (fs would break the bundle); its callers
 * (`HomeSidebar`, `PresidentStateMap`) are server components.
 *
 * TWO COLOURING MODES. The governor sidebar map passes a `status` per state and
 * lets the STATUS_FILL table below choose the fill (the original behaviour). The
 * presidential map colours by leader IDENTITY + intensity, a space of fills the
 * four-value status enum cannot express, so it passes an explicit `fill` per
 * datum. `fill` wins when present; `status` is the fallback, so the governor map
 * keeps working untouched. Both fills are CSS token expressions (a `var(--…)` or
 * a `color-mix(… var(--…) …)`), never a raw hex — theme-awareness is preserved.
 */

const SVG = fs.readFileSync(path.join(process.cwd(), "src/components/brasil-mapa.svg"), "utf-8");

const STATUS_FILL: Record<MapStatus, string> = {
  acima: "var(--map-acima)", // brand blue — leader above 50
  abaixo: "var(--map-abaixo)", // light blue — leader below 50 (runoff)
  empate: "var(--map-empate)", // red — technical tie
  sem: "var(--map-sem)", // grey — no recent poll
};

/** A paintable state: a `status` (governor map) and/or an explicit token `fill`
 *  (presidential map). `fill` overrides `status` when both are present.
 *
 *  The remaining fields are OPTIONAL and feed only the screen-reader table
 *  (below) — they never affect the drawn SVG. Both callers already carry them at
 *  runtime (`StateMapDatum` has `name`/`leader`; `PresidentMapDatum` adds
 *  `leaderPct`/`reason`), so the accessible table is built from the very same
 *  data that colours the map, and cannot drift out of sync. */
export interface MapDatum {
  uf: UF;
  status: MapStatus;
  fill?: string;
  name?: string;
  leader?: string | null;
  leaderPct?: number | null;
  reason?: "sem-dados" | "empate" | null;
}

/** One state's situation as a short pt-BR phrase, from whichever descriptive
 *  fields the datum carries. Mirrors the colour logic: technical tie, missing/
 *  thin data, leader above 50, or leader below 50 (runoff). */
function situacao(d: MapDatum): string {
  if (d.reason === "sem-dados") return "Sem dados suficientes";
  if (d.reason === "empate" || d.status === "empate") return "Empate técnico";
  if (!d.leader) return "Sem dados suficientes";
  if (d.status === "acima") return "Líder acima de 50%";
  if (d.status === "abaixo") return "Líder abaixo de 50% (2º turno)";
  return "—";
}

export default function BrasilMap({
  map,
  label = "Mapa do Brasil: situação do líder por estado.",
}: {
  map: MapDatum[];
  /** Accessible name (role="img" label) describing what the choropleth shows.
   *  Defaults to the governor-map summary; the presidential caller overrides it. */
  label?: string;
}) {
  const rules = map
    .map((d) => {
      const fill = d.fill ?? STATUS_FILL[d.status];
      return `#brasil-map .uf-${d.uf},#brasil-map .uf-${d.uf} path{fill:${fill};}`;
    })
    .join("");
  const html =
    `<style>` +
    `#brasil-map svg{width:100%;height:auto;display:block}` +
    `#brasil-map path{stroke:var(--surface-1);stroke-width:1.2;stroke-linejoin:round;transition:fill .2s}` +
    rules +
    `</style>` +
    SVG;
  return (
    <>
      {/* role="img" + aria-label gives the choropleth a single accessible name
          and prunes the decorative raw SVG paths from the accessibility tree, so
          a screen reader announces the summary, not hundreds of <path> nodes.
          The SVG is a trusted local asset committed to the repo, not user input. */}
      <div
        id="brasil-map"
        role="img"
        aria-label={label}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      {/* Visually hidden, screen-reader-available equivalent of the map, built
          from the same `map` data that colours it. `sr-only` is Tailwind's
          built-in utility (used elsewhere in the app). */}
      <table className="sr-only">
        <caption>{label}</caption>
        <thead>
          <tr>
            <th scope="col">Estado</th>
            <th scope="col">Líder</th>
            <th scope="col">Situação</th>
          </tr>
        </thead>
        <tbody>
          {map.map((d) => (
            <tr key={d.uf}>
              <th scope="row">{d.name ?? UF_NAMES[d.uf]}</th>
              <td>
                {d.leader
                  ? shortName(d.leader) + (d.leaderPct != null ? ` — ${d.leaderPct}%` : "")
                  : "—"}
              </td>
              <td>{situacao(d)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
