import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import Masthead from "@/components/Masthead";
import { loadDataset } from "@/lib/data";
import { buildSearchIndex } from "@/lib/search-index";
import { SITE_NAME, SITE_YEAR, SITE_TAGLINE } from "@/lib/brand";
import "./globals.css";

/* The UI face named first in the brief (§11). Loaded through next/font, so it is
   self-hosted and adds no external request — the previous "no webfont" note in
   Hero was about not adding a network dependency, which next/font avoids. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

/* The production host. Reads NEXT_PUBLIC_SITE_URL first (set on Vercel), falling
   back to the custom domain so a local build still emits absolute, correct URLs.
   metadataBase lets Next resolve the relative canonical/OG URLs below per-route. */
const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placardaspesquisas.com.br";

const SITE_TITLE = `${SITE_NAME} — Eleições ${SITE_YEAR}`;
const SITE_DESCRIPTION =
  "Agregador de pesquisas eleitorais das eleições brasileiras de 2026: presidente, governadores e senadores. Médias, tendências e todas as pesquisas publicadas, atualizado diariamente.";

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: SITE_TITLE,
    template: `%s · ${SITE_NAME} ${SITE_YEAR}`,
  },
  description: SITE_DESCRIPTION,
  // "./" resolves per-route against metadataBase, so every page gets its own
  // canonical without touching individual page files.
  alternates: { canonical: "./" },
  openGraph: {
    type: "website",
    siteName: SITE_NAME,
    locale: "pt_BR",
    url: "/",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
};

const MES_LONGO = ["janeiro", "fevereiro", "março", "abril", "maio", "junho", "julho", "agosto", "setembro", "outubro", "novembro", "dezembro"];

/** "17 de agosto de 2026, 13:04" — the target's spelled-out date + time. Parsed
 *  as UTC so the label cannot slide by where the build machine sits. */
function longDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [datePart, timePart] = iso.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const hhmm = timePart ? timePart.slice(0, 5) : null;
  const base = `${d} de ${MES_LONGO[(m ?? 1) - 1]} de ${y}`;
  return hhmm ? `${base}, ${hhmm}` : base;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ds = loadDataset();
  const updated = longDateTime(ds.generated_at);
  return (
    <html lang="pt-BR" className={inter.variable}>
      <body className="min-h-screen antialiased">
        {/* Full-bleed: it must NOT sit inside the centred container. */}
        <Masthead searchIndex={buildSearchIndex()} />

        {/* Credibility strip (brief §5). The "atualizado / N pesquisas" line was
            buried in the nav bar; the brief calls it an excellent trust signal,
            so it gets its own full-bleed band under the header. */}
        <div
          className="w-full border-b text-xs"
          style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-secondary)" }}
        >
          <div className="shell flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
            <span className="inline-flex items-center gap-2">
              <span
                aria-hidden="true"
                className="inline-block h-2 w-2 rounded-full"
                style={{ background: "var(--series-3)" }}
              />
              Atualizado em {updated} · {ds.polls.length.toLocaleString("pt-BR")} pesquisas catalogadas
            </span>
            <span className="hidden items-center gap-1.5 sm:inline-flex" style={{ color: "var(--text-muted)" }}>
              Fontes verificadas e metodologia transparente
              <span aria-hidden="true" style={{ color: "var(--series-3)" }}>✓</span>
            </span>
          </div>
        </div>

        <main className="shell py-6">{children}</main>
        <footer className="mt-12 border-t py-8 text-center text-xs" style={{ borderColor: "var(--ring)", color: "var(--text-muted)" }}>
          {/* Full brand lockup: the network-map ICON + the "PLACAR DAS PESQUISAS"
              wordmark + tagline, rendered as themed text so it adapts to both
              themes natively (no white-box raster to card off). */}
          <div className="mb-5 flex flex-col items-center gap-2">
            {/* Mesma proporção/estilo do lockup do cabeçalho (Masthead). */}
            <div className="flex items-center gap-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/brand/placar-icon.png" alt="" aria-hidden="true" className="h-9 w-9 shrink-0 sm:h-10 sm:w-10" />
              <span className="text-left leading-[0.92]">
                <span className="block text-[17px] font-extrabold uppercase tracking-tight" style={{ color: "var(--text-primary)" }}>
                  Placar
                </span>
                <span className="block text-[17px] font-extrabold uppercase tracking-tight">
                  <span className="align-top text-[10px]" style={{ color: "var(--text-muted)" }}>das </span>
                  <span style={{ color: "var(--accent)" }}>Pesquisas</span>
                </span>
              </span>
            </div>
            <p className="mt-1 text-[11px] uppercase tracking-[0.14em]" style={{ color: "var(--text-muted)" }}>{SITE_TAGLINE}</p>
          </div>
          <p className="mx-auto max-w-2xl px-4">
            Dados compilados de fontes públicas (Wikipédia, registros do TSE/PesqEle e divulgações dos
            institutos). Médias calculadas conforme a <Link href="/metodologia" className="underline">metodologia</Link>.
            Este site não realiza pesquisas; números pertencem aos institutos citados.
          </p>
        </footer>
      </body>
    </html>
  );
}
