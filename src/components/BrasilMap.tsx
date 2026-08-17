import fs from "node:fs";
import path from "node:path";
import type { StateMapDatum, MapStatus } from "@/lib/home";

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
 * imported by a client component (fs would break the bundle); `HomeSidebar`,
 * its only caller, is a server component.
 */

const SVG = fs.readFileSync(path.join(process.cwd(), "src/components/brasil-mapa.svg"), "utf-8");

const STATUS_FILL: Record<MapStatus, string> = {
  acima: "var(--series-3)", // green — leader above 50
  abaixo: "var(--cand-amber)", // amber — leader below 50
  empate: "var(--cand-pink)", // pink — technical tie
  sem: "var(--grid)", // grey — no recent poll
};

export default function BrasilMap({ map }: { map: StateMapDatum[] }) {
  const rules = map
    .map((d) => `#brasil-map .uf-${d.uf},#brasil-map .uf-${d.uf} path{fill:${STATUS_FILL[d.status]};}`)
    .join("");
  const html =
    `<style>` +
    `#brasil-map svg{width:100%;height:auto;display:block}` +
    `#brasil-map path{stroke:var(--surface-1);stroke-width:1.2;stroke-linejoin:round;transition:fill .2s}` +
    rules +
    `</style>` +
    SVG;
  // The SVG is a trusted local asset committed to the repo, not user input.
  return <div id="brasil-map" dangerouslySetInnerHTML={{ __html: html }} />;
}
