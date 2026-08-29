import type { Metadata } from "next";
import Link from "next/link";
import CopyText from "@/components/CopyText";
import { loadDataset, pollsters, statesWithPolls } from "@/lib/data";
import { SITE_NAME } from "@/lib/brand";
import { BASE, LICENSE_NAME, LICENSE_URL } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Imprensa",
  description:
    "Sala de imprensa do Placar das Pesquisas: como citar, dados abertos (CC BY 4.0), widgets para incorporar e contato para jornalistas.",
};

const BOILERPLATE = `O Placar das Pesquisas (placardaspesquisas.com.br) é um agregador independente das pesquisas eleitorais registradas para as Eleições 2026, que calcula a "média do Placar das Pesquisas" para presidente, governadores e senadores a partir das pesquisas mais recentes de cada disputa. Diferente dos agregadores fechados ou pagos, é aberto, reproduzível e licenciado sob Creative Commons (CC BY 4.0): a metodologia é pública, cada média tem comprovação matemática, e os dados podem ser reusados e citados livremente. Atualizado automaticamente duas vezes por dia. O projeto não realiza pesquisas próprias.`;

const CITATION = `Fonte: Placar das Pesquisas — a média do Placar das Pesquisas (placardaspesquisas.com.br), sob licença CC BY 4.0.`;

const EMBED_MEDIA = `<iframe
  src="${BASE}/embed/presidente"
  title="Média — Presidente 2026 · ${SITE_NAME}"
  width="100%" height="510" loading="lazy"
  style="max-width:480px;border:0"></iframe>`;

const EMBED_EVOLUCAO = `<iframe
  src="${BASE}/embed/evolucao"
  title="Evolução — Presidente 2026 · ${SITE_NAME}"
  width="100%" height="510" loading="lazy"
  style="max-width:520px;border:0"></iframe>`;

const nfmt = (n: number) => n.toLocaleString("pt-BR");

export default function ImprensaPage() {
  const ds = loadDataset();
  const nPolls = ds.polls.length;
  const nPollsters = pollsters().length;
  const nStates = statesWithPolls().length;

  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>Imprensa</span>
        </nav>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Sala de imprensa
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Uma fonte aberta, independente e citável das pesquisas de 2026 — com a conta à mostra e os
          dados livres para reusar. Jornalistas e veículos são bem-vindos.
        </p>
      </header>

      {/* Resumo para citar */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Resumo para citar</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Texto pronto para uma matéria, um crédito ou um &ldquo;sobre a fonte&rdquo;:
        </p>
        <CopyText text={BOILERPLATE} />
      </section>

      {/* Números */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>O projeto em números</h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { v: nfmt(nPolls), k: "pesquisas catalogadas" },
            { v: nfmt(nPollsters), k: "institutos distintos" },
            { v: String(nStates), k: "estados cobertos" },
            { v: "2×", k: "atualizações por dia" },
          ].map((s) => (
            <div key={s.k} className="rounded-lg border p-3" style={{ borderColor: "var(--ring)", background: "var(--surface-1)" }}>
              <div className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{s.v}</div>
              <div className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>{s.k}</div>
            </div>
          ))}
        </div>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Presidente, governadores e senadores. Cada pesquisa carrega o link para sua fonte e, quando
          há, o registro no TSE (formato BR-…/2026). Os números crescem a cada atualização.
        </p>
      </section>

      {/* Por que é diferente */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Por que é diferente</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O diferencial não é o tamanho — é ser <strong style={{ color: "var(--text-primary)" }}>aberto e
          verificável</strong>, onde os agregadores fechados ou pagos não são:
        </p>
        <ul className="space-y-2 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li><strong style={{ color: "var(--text-primary)" }}>Mostra a conta.</strong> A média é reproduzível: regras fixas e públicas, com comprovação matemática — qualquer pessoa refaz o cálculo a partir das fontes.</li>
          <li><strong style={{ color: "var(--text-primary)" }}>Aberto para reusar.</strong> Os dados agregados saem sob {LICENSE_NAME}: pode republicar, inclusive comercialmente, bastando creditar.</li>
          <li><strong style={{ color: "var(--text-primary)" }}>Legível por máquina.</strong> Feeds em JSON, CSV e RSS, com a proveniência embutida em cada número.</li>
          <li><strong style={{ color: "var(--text-primary)" }}>Fresco e datado.</strong> Reconstruído duas vezes por dia, com data e hora no topo de cada página.</li>
        </ul>
      </section>

      {/* Como citar */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Como citar</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O uso é livre sob{" "}
          <a href={LICENSE_URL} target="_blank" rel="noopener noreferrer" className="underline">{LICENSE_NAME}</a>,
          desde que citada a fonte. Atribuição sugerida:
        </p>
        <CopyText text={CITATION} oneline />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Ao reproduzir uma média ou uma pesquisa específica, indique também a <strong>data da
          atualização</strong>. Detalhes na página de{" "}
          <Link href="/licenca" className="underline">licença</Link> e na{" "}
          <Link href="/metodologia" className="underline">metodologia</Link>.
        </p>
      </section>

      {/* Dados para reuso */}
      <section className="card space-y-3 p-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Dados para reuso</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Endpoints estáticos, com proveniência e licença embutidas:
        </p>
        <ul className="space-y-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li><a href="/api/averages.json" className="underline">/api/averages.json</a> — todas as médias (presidente 1º/2º, governador e senador por estado).</li>
          <li><a href="/api/presidente.json" className="underline">/api/presidente.json</a> · <a href="/api/segundo-turno.json" className="underline">/api/segundo-turno.json</a> — média + as pesquisas que a compõem.</li>
          <li><a href="/api/polls.json" className="underline">/api/polls.json</a> — catálogo completo, com fonte e registro TSE.</li>
          <li><a href="/data/averages.csv" className="underline">/data/averages.csv</a> · <a href="/data/polls.csv" className="underline">/data/polls.csv</a> — em CSV, para planilha.</li>
          <li><a href="/feed.xml" className="underline">/feed.xml</a> — RSS das pesquisas mais recentes.</li>
        </ul>
      </section>

      {/* Widgets */}
      <section className="card space-y-4 p-4">
        <div className="space-y-1">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Widgets para incorporar</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Blocos leves que se atualizam sozinhos e trazem um link de volta para a fonte. Cole no seu
            site — grátis, sob {LICENSE_NAME}. Veja também a página{" "}
            <Link href="/incorporar" className="underline">incorporar</Link>.
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          <div className="space-y-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>A média atual</h3>
            <iframe
              src="/embed/presidente"
              title={`Média — Presidente 2026 · ${SITE_NAME}`}
              loading="lazy"
              className="w-full"
              style={{ maxWidth: 480, height: 510, border: 0, colorScheme: "auto" }}
            />
            <CopyText text={EMBED_MEDIA} />
          </div>
          <div className="space-y-3">
            <h3 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>A evolução (gráfico)</h3>
            <iframe
              src="/embed/evolucao"
              title={`Evolução — Presidente 2026 · ${SITE_NAME}`}
              loading="lazy"
              className="w-full"
              style={{ maxWidth: 520, height: 510, border: 0, colorScheme: "auto" }}
            />
            <CopyText text={EMBED_EVOLUCAO} />
          </div>
        </div>
      </section>

      {/* Quem faz */}
      <section className="card space-y-2 p-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Quem faz</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O {SITE_NAME} é um projeto independente, sem vínculo com candidatura, partido, instituto ou
          veículo, idealizado e desenvolvido por Iran Barbosa com uso intensivo de inteligência
          artificial. Não realiza pesquisas próprias. A trajetória e a política de correções estão em{" "}
          <Link href="/sobre" className="underline">Sobre o projeto</Link>.
        </p>
      </section>

      {/* Contato / Fale Conosco */}
      <section className="card space-y-4 p-5 text-center" id="contato">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Fale Conosco</h2>
        <p className="mx-auto max-w-2xl text-sm" style={{ color: "var(--text-secondary)" }}>
          Pedidos de imprensa, checagem de método, entrevistas, correções e dados sob demanda —
          escreva para:
        </p>
        <a
          href="mailto:contato@placardaspesquisas.com.br"
          className="mx-auto block w-fit rounded-xl border px-6 py-4 text-lg font-bold tracking-tight hover:underline sm:text-2xl"
          style={{
            borderColor: "var(--accent)",
            background: "color-mix(in srgb, var(--accent) 8%, transparent)",
            color: "var(--accent)",
          }}
        >
          contato@placardaspesquisas.com.br
        </a>
      </section>
    </article>
  );
}
