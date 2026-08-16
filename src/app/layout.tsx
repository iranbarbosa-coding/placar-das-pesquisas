import type { Metadata } from "next";
import Link from "next/link";
import Masthead from "@/components/Masthead";
import { loadDataset, fmtDate } from "@/lib/data";
import { buildSearchIndex } from "@/lib/search-index";
import { SITE_NAME, SITE_YEAR } from "@/lib/brand";
import "./globals.css";

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
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        {/* Full-bleed: it must NOT sit inside the centred container. */}
        <Masthead
          searchIndex={buildSearchIndex()}
          meta={`Atualizado em ${updated} · ${ds.polls.length.toLocaleString("pt-BR")} pesquisas`}
        />
        <main className="mx-auto max-w-6xl px-4 py-6">{children}</main>
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
