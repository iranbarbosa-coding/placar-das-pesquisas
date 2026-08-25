import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import MapInteractive from "./MapInteractive";
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
  /** Distância do líder para o 2º, em p.p. (alimenta o tooltip de hover). */
  margin?: number | null;
  /** Nome do 2º colocado (tooltip de hover). */
  runnerUp?: string | null;
  reason?: "sem-dados" | "empate" | null;
}

const escXml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** Texto do tooltip (hover): nome do líder + distância ao 2º colocado. */
function tooltip(d: MapDatum): string {
  const name = d.name ?? UF_NAMES[d.uf];
  const noData = d.reason === "sem-dados" || (d.reason == null && d.status === "sem") || !d.leader;
  if (noData) return `${name} — sem pesquisa recente`;
  const lead = shortName(d.leader!);
  if (d.reason === "empate" || d.status === "empate") {
    return d.margin != null
      ? `${name} — empate técnico: ${lead} à frente por ${Math.abs(d.margin).toLocaleString("pt-BR")} p.p.`
      : `${name} — empate técnico`;
  }
  if (d.margin != null && d.runnerUp) {
    return `${name} — ${lead} lidera por ${d.margin.toLocaleString("pt-BR")} p.p. sobre ${shortName(d.runnerUp)}`;
  }
  return `${name} — ${lead} lidera`;
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
      // A no-data ("sem-dados") state is drawn near-black; in dark mode that fill
      // is ~invisible against the navy card and its default border matches the
      // card, so outline JUST these states in --map-sem-outline (= the card colour
      // in light, so light mode is unchanged; a visible grey in dark). Detected
      // the same way `situacao()` labels "Sem dados suficientes": the president
      // datum carries `reason`; the governor datum has none and marks no-data with
      // status "sem" (its técnico tie is a distinct "empate" status, not caught).
      const isSemDados = d.reason === "sem-dados" || (d.reason == null && d.status === "sem");
      const stroke = isSemDados
        ? `stroke:var(--map-sem-outline);stroke-width:var(--map-sem-outline-width);`
        : "";
      return `#brasil-map .uf-${d.uf},#brasil-map .uf-${d.uf} path{fill:${fill};${stroke}}`;
    })
    .join("");
  // Injeta um <title> (tooltip nativo no hover) em cada estado — no <g> quando
  // o estado é um grupo, ou convertendo o <path/> auto-fechado em <path>…<title>…
  // </path>. Ambos carregam `data-uf`. O texto é escapado (dado nosso, não do
  // usuário, mas escapamos por higiene).
  const svgWithTitles = map.reduce((svg, d) => {
    const t = `<title>${escXml(tooltip(d))}</title>`;
    return svg
      .replace(new RegExp(`(<g\\b[^>]*\\bdata-uf="${d.uf}"[^>]*>)`), (m) => m + t)
      .replace(new RegExp(`(<path\\b[^>]*\\bdata-uf="${d.uf}"[^>]*?)\\s*/>`), (_m, p1) => `${p1}>${t}</path>`);
  }, SVG);

  const html =
    `<style>` +
    `#brasil-map svg{width:100%;height:auto;display:block}` +
    `#brasil-map path{stroke:var(--surface-1);stroke-width:1.2;stroke-linejoin:round;transition:fill .2s}` +
    `#brasil-map .estado{cursor:pointer}` +
    `#brasil-map .estado:hover path,#brasil-map .estado:hover{opacity:.85}` +
    rules +
    `</style>` +
    svgWithTitles;
  return (
    <>
      {/* Casca client que torna cada estado clicável (navega para /estados/UF).
          role="img" + aria-label dá ao choropleth um nome acessível único e poda
          os paths decorativos da árvore de acessibilidade; o teclado/leitor de
          tela usa a tabela com LINKS abaixo. SVG é asset local confiável. */}
      <MapInteractive html={html} id="brasil-map" label={label} />
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
              <th scope="row">
                <Link href={`/estados/${d.uf.toLowerCase()}`}>{d.name ?? UF_NAMES[d.uf]}</Link>
              </th>
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
