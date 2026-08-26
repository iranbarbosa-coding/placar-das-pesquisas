import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Contato",
  description:
    "Fale com o Placar das Pesquisas: correções, dúvidas sobre metodologia e pedidos de imprensa.",
};

const ERROS: Record<string, string> = {
  validacao: "Confira os campos: nome, um e-mail válido e a mensagem são obrigatórios.",
  config: "O envio está temporariamente indisponível. Se puder, escreva direto para o e-mail abaixo.",
  envio: "Não foi possível enviar agora. Tente novamente em instantes ou use o e-mail abaixo.",
};

export default async function ContatoPage({
  searchParams,
}: {
  searchParams: Promise<{ enviado?: string; erro?: string }>;
}) {
  const sp = await searchParams;
  const sucesso = sp.enviado === "1";
  const erro = sp.erro ? (ERROS[sp.erro] ?? ERROS.envio) : null;

  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Contato
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Correções, dúvidas sobre metodologia e pedidos de imprensa.
        </p>
      </header>

      {sucesso && (
        <div
          className="rounded border px-4 py-3 text-sm"
          role="status"
          style={{ borderColor: "var(--cand-green)", background: "color-mix(in srgb, var(--cand-green) 12%, transparent)", color: "var(--text-primary)" }}
        >
          Mensagem enviada. Obrigado — responderemos no e-mail informado.
        </div>
      )}
      {erro && (
        <div
          className="rounded border px-4 py-3 text-sm"
          role="alert"
          style={{ borderColor: "rgb(226,98,15)", background: "rgba(226,98,15,0.10)", color: "var(--text-primary)" }}
        >
          {erro}
        </div>
      )}

      <section className="card space-y-3 p-4">
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Encontrou uma divergência em relação à fonte original, tem uma dúvida sobre como o{" "}
          {SITE_NAME} calcula as médias, ou é da imprensa? Use o formulário abaixo ou escreva
          para{" "}
          <a href="mailto:contato@placardaspesquisas.com.br" className="underline">
            contato@placardaspesquisas.com.br
          </a>
          .
        </p>
        <form action="/api/contato" method="post" className="space-y-3">
          {/* Campo-armadilha (honeypot): oculto para humanos; bots costumam preencher. */}
          <input
            type="text"
            name="empresa"
            tabIndex={-1}
            autoComplete="off"
            aria-hidden="true"
            className="hidden"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block text-sm">
              <span className="mb-1 block font-medium" style={{ color: "var(--text-secondary)" }}>Nome</span>
              <input
                type="text"
                name="nome"
                required
                autoComplete="name"
                className="w-full rounded border px-3 py-2 text-sm"
                style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
              />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium" style={{ color: "var(--text-secondary)" }}>E-mail</span>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full rounded border px-3 py-2 text-sm"
                style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
              />
            </label>
          </div>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: "var(--text-secondary)" }}>Assunto</span>
            <input
              type="text"
              name="assunto"
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
            />
          </label>
          <label className="block text-sm">
            <span className="mb-1 block font-medium" style={{ color: "var(--text-secondary)" }}>Mensagem</span>
            <textarea
              name="mensagem"
              required
              rows={6}
              className="w-full rounded border px-3 py-2 text-sm"
              style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
            />
          </label>
          <button
            type="submit"
            className="rounded px-4 py-2 text-sm font-semibold"
            style={{ background: "var(--accent)", color: "var(--surface-1)" }}
          >
            Enviar
          </button>
        </form>
      </section>
    </article>
  );
}
