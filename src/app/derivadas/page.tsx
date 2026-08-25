import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Derivadas",
  description: "Análises derivadas das médias e das pesquisas de 2026.",
};

/**
 * Hub da seção "Derivadas": análises construídas sobre as médias e as pesquisas.
 * A primeira é o viés dos institutos (efeito casa).
 */
const ANALISES = [
  {
    href: "/institutos",
    title: "Viés dos Institutos",
    note: "Efeito casa: quanto cada instituto tende a super ou subestimar cada candidato ante a média das demais pesquisas.",
  },
];

export default function DerivadasPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Derivadas
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Análises construídas sobre as médias e as pesquisas.
        </p>
      </header>

      <div className="grid gap-4">
        {ANALISES.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="card block p-4 transition-colors hover:border-[var(--accent)] sm:p-6"
          >
            <h2 className="flex items-center gap-1.5 text-base font-bold" style={{ color: "var(--text-primary)" }}>
              {a.title} <span aria-hidden="true" style={{ color: "var(--accent)" }}>→</span>
            </h2>
            <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
              {a.note}
            </p>
          </Link>
        ))}
      </div>
    </article>
  );
}
