import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { BASE, LICENSE_NAME, LICENSE_URL } from "@/lib/jsonld";

/* The exact <iframe> a publisher copies. Inline-styled and self-contained so it
   drops into any page — including plain CMS HTML — with no stylesheet of ours. */
const SNIPPET = `<iframe
  src="${BASE}/embed/presidente"
  title="Média — Presidente 2026 · ${SITE_NAME}"
  width="100%"
  height="320"
  loading="lazy"
  style="max-width:480px;border:0"
></iframe>`;

export const metadata: Metadata = {
  title: "Incorporar",
  description: `Incorpore a média das pesquisas para presidente em 2026 no seu site — grátis, sob ${LICENSE_NAME}, com atribuição a ${SITE_NAME}.`,
};

export default function IncorporarPage() {
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>Incorporar</span>
        </nav>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Incorporar a média no seu site
        </h1>
        <p className="max-w-[70ch] text-sm" style={{ color: "var(--text-secondary)" }}>
          Um widget leve com a média das pesquisas para presidente em 2026. Ele se atualiza sozinho
          quando atualizamos os dados — você cola uma vez e não precisa mexer mais.
        </p>
      </header>

      <section className="card min-w-0 p-4 sm:p-6" aria-label="Código para incorporar">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Código
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Copie e cole este trecho onde quiser que o widget apareça:
        </p>
        <pre
          className="mt-3 overflow-x-auto rounded-lg border p-4 text-xs leading-relaxed"
          style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
        >
          <code>{SNIPPET}</code>
        </pre>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          O widget aponta para{" "}
          <Link href="/embed/presidente" className="underline">/embed/presidente</Link>{" "}
          e traz um link de volta para a página completa em{" "}
          <Link href="/presidente" className="underline">/presidente</Link>.
        </p>
      </section>

      <section className="card min-w-0 p-4 sm:p-6" aria-label="Licença e atribuição">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Grátis, com atribuição
        </h2>
        <p className="mt-1 max-w-[70ch] text-sm" style={{ color: "var(--text-secondary)" }}>
          O uso é livre e gratuito sob a licença{" "}
          <a href={LICENSE_URL} target="_blank" rel="noopener" className="underline" style={{ color: "var(--accent)" }}>
            {LICENSE_NAME}
          </a>
          : você pode citar e reusar os dados, desde que credite {SITE_NAME} com um link para a
          fonte. O widget já traz esse crédito embutido — mantenha-o visível. Veja os detalhes e
          outras formas de reuso em{" "}
          <Link href="/licenca" className="underline" style={{ color: "var(--accent)" }}>
            Licença e como citar
          </Link>
          .
        </p>
      </section>
    </div>
  );
}
