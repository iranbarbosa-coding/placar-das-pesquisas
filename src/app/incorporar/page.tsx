import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { BASE, LICENSE_NAME, LICENSE_URL } from "@/lib/jsonld";

/* The exact <iframe>s a publisher copies. Inline-styled and self-contained so
   they drop into any page — including plain CMS HTML — with no stylesheet of ours. */
const SNIPPET_MEDIA = `<iframe
  src="${BASE}/embed/presidente"
  title="Média — Presidente 2026 · ${SITE_NAME}"
  width="100%"
  height="510"
  loading="lazy"
  style="max-width:480px;border:0"
></iframe>`;

const SNIPPET_EVOLUCAO = `<iframe
  src="${BASE}/embed/evolucao"
  title="Evolução — Presidente 2026 · ${SITE_NAME}"
  width="100%"
  height="510"
  loading="lazy"
  style="max-width:520px;border:0"
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
          Widgets leves com as pesquisas para presidente em 2026. Eles se atualizam sozinhos quando
          atualizamos os dados — você cola uma vez e não precisa mexer mais.
        </p>
      </header>

      <section className="card min-w-0 p-4 sm:p-6" aria-label="Widget da média">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Média atual
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          A média por candidato (1º turno). Copie e cole este trecho onde quiser que apareça:
        </p>
        <pre
          className="mt-3 overflow-x-auto rounded-lg border p-4 text-xs leading-relaxed"
          style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
        >
          <code>{SNIPPET_MEDIA}</code>
        </pre>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Aponta para <Link href="/embed/presidente" className="underline">/embed/presidente</Link>.
        </p>
      </section>

      <section className="card min-w-0 p-4 sm:p-6" aria-label="Widget da evolução">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Evolução (gráfico)
        </h2>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          A tendência da média ao longo do tempo, como um gráfico de linhas:
        </p>
        <pre
          className="mt-3 overflow-x-auto rounded-lg border p-4 text-xs leading-relaxed"
          style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
        >
          <code>{SNIPPET_EVOLUCAO}</code>
        </pre>
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Aponta para <Link href="/embed/evolucao" className="underline">/embed/evolucao</Link>. Ambos
          trazem um link de volta para <Link href="/presidente" className="underline">/presidente</Link>.
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
