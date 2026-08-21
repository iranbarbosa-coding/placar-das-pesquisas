import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Derivadas",
  description: "Análises derivadas das médias e pesquisas — em breve.",
};

/**
 * Placeholder for the "Derivadas" section. It exists so the masthead link has a
 * real target; the content lands in a later session (owner's call, 21/08).
 */
export default function DerivadasPage() {
  return (
    <article className="mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Derivadas
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Análises derivadas das médias e das pesquisas.
        </p>
      </header>

      <section className="card p-4 sm:p-6">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Em breve. Esta seção reunirá análises derivadas dos dados — o conteúdo será
          publicado numa próxima etapa.
        </p>
      </section>
    </article>
  );
}
