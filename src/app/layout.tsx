import type { Metadata } from "next";
import Link from "next/link";
import { loadDataset, fmtDate } from "@/lib/data";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Placar das Pesquisas — Eleições 2026",
    template: "%s · Placar das Pesquisas 2026",
  },
  description:
    "Agregador de pesquisas eleitorais das eleições brasileiras de 2026: presidente, governadores e senadores. Médias, tendências e todas as pesquisas publicadas, atualizado diariamente.",
};

const NAV = [
  { href: "/presidente", label: "Presidente" },
  { href: "/estados", label: "Estados" },
  { href: "/institutos", label: "Institutos" },
  { href: "/metodologia", label: "Metodologia" },
];

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const ds = loadDataset();
  const updated = ds.generated_at ? fmtDate(ds.generated_at.slice(0, 10)) : "—";
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">
        <header className="border-b" style={{ borderColor: "var(--ring)", background: "var(--surface-1)" }}>
          <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-3">
            <Link href="/" className="text-lg font-bold tracking-tight">
              Placar das Pesquisas <span style={{ color: "var(--accent)" }}>2026</span>
            </Link>
            <nav className="flex flex-wrap gap-4 text-sm font-medium" style={{ color: "var(--text-secondary)" }}>
              {NAV.map((n) => (
                <Link key={n.href} href={n.href} className="hover:underline">
                  {n.label}
                </Link>
              ))}
            </nav>
            <span className="ml-auto text-xs" style={{ color: "var(--text-muted)" }}>
              Atualizado em {updated} · {ds.polls.length.toLocaleString("pt-BR")} pesquisas
            </span>
          </div>
        </header>
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
