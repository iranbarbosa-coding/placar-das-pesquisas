import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/brand";

/*
 * PWA / web app manifest — Next serves this at /manifest.webmanifest and
 * auto-links it in <head> (no manual <link> in layout.tsx needed). It gives
 * Android "add to home screen" a proper name, icon and theme colour, and feeds
 * the browser tab / install UI.
 *
 * Colours are the official brand tokens (globals.css): brand blue #2563EB as
 * theme colour, off-white #F8FAFC as the splash background. Icons reuse the
 * existing network-map brand mark shipped in /public/brand.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: SITE_NAME,
    short_name: "Placar",
    description:
      "Agregador de pesquisas eleitorais das eleições brasileiras de 2026: presidente, governadores e senadores. Médias, tendências e todas as pesquisas publicadas.",
    start_url: "/",
    display: "standalone",
    lang: "pt-BR",
    theme_color: "#2563eb",
    background_color: "#f8fafc",
    icons: [
      {
        src: "/brand/placar-icon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/brand/placar-icon.png",
        sizes: "1254x1254",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
