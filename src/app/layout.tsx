import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import Masthead from "@/components/Masthead";
import { loadDataset, fmtDate } from "@/lib/data";
import { buildSearchIndex } from "@/lib/search-index";
import { SITE_NAME, SITE_YEAR } from "@/lib/brand";
import "./globals.css";

/* The UI face named first in the brief (§11). Loaded through next/font, so it is
   self-hosted and adds no external request — the previous "no webfont" note in
   Hero was about not adding a network dependency, which next/font avoids. */
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: `${SITE_NAME} — Eleições ${SITE_YEAR}`,
    template: `%s · ${SITE_NAME} ${SITE_YEAR}`,
  },
  description:
    "Agregador de pesquisas eleitorais das eleições brasileiras de 2026: presidente, governadores e senadores. Médias, tendências e todas as pesquisas publicadas, atualizado diariamente.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ds = loadDataset();
  const updated = ds.generated_at ? fmtDate(ds.generated_at.slice(0, 10)) : "—";
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
        <footer className="mt-12 border-t py-6 text-center text-xs" style={{ borderColor: "var(--ring)", color: "var(--text-muted)" }}>
          <p>
            Dados compilados de fontes públicas (Wikipédia, registros do TSE/PesqEle e divulgações dos
            institutos). Médias calculadas conforme a <Link href="/metodologia" className="underline">metodologia</Link>.
            Este site não realiza pesquisas; números pertencem aos institutos citados.
          </p>
        </footer>
      </body>
    </html>
  );
}
