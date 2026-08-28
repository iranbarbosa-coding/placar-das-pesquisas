import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";
import { BASE, LICENSE_NAME, LICENSE_URL } from "@/lib/jsonld";

export const metadata: Metadata = {
  title: "Licença e como citar",
  description:
    "As médias e dados agregados do Placar das Pesquisas são publicados sob licença Creative Commons CC BY 4.0: use, republique e cite livremente, atribuindo a fonte.",
};

export default function LicencaPage() {
  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Licença e como citar
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Somos abertos de verdade: os dados agregados podem ser reusados, inclusive comercialmente,
          bastando atribuir a fonte.
        </p>
      </header>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          A licença
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          As médias, tendências e demais dados agregados calculados pelo {SITE_NAME} são
          disponibilizados sob a licença{" "}
          <a href={LICENSE_URL} rel="license" className="underline">
            Creative Commons Atribuição 4.0 Internacional ({LICENSE_NAME})
          </a>
          . Você pode copiar, redistribuir, adaptar e usar para qualquer fim, inclusive comercial,
          desde que dê o crédito apropriado e indique se houve mudanças.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Os números de cada pesquisa individual pertencem aos institutos que os produziram; o que
          licenciamos é a <strong>compilação e a computação próprias</strong> (a agregação, as
          médias e as séries), que são fatos e trabalho nosso. Atribuímos as fontes públicas de onde
          partimos: registros do TSE/PesqEle, Wikipédia e divulgações dos institutos.
        </p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Como citar
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Para jornalistas, pesquisadores e demais veículos, a atribuição sugerida é:
        </p>
        <blockquote
          className="rounded border-l-4 px-4 py-2 text-sm"
          style={{ borderColor: "var(--accent)", background: "var(--surface-1)", color: "var(--text-primary)" }}
        >
          Fonte: {SITE_NAME} — a média do {SITE_NAME} ({BASE}), sob licença {LICENSE_NAME}.
        </blockquote>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Sempre que possível, agradecemos o link para a página de origem do dado (por exemplo{" "}
          <Link href="/presidente" className="underline">
            {BASE}/presidente
          </Link>
          ) e para a{" "}
          <Link href="/metodologia" className="underline">
            metodologia
          </Link>
          , onde está a comprovação matemática de como cada média é calculada.
        </p>
      </section>

      <section className="card space-y-3 p-4">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Dados para reuso (máquina)
        </h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Além das páginas, publicamos os agregados em formato legível por máquina, com a mesma
          licença e a proveniência de cada número embutida:
        </p>
        <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>
            <a href="/api/averages.json" className="underline">/api/averages.json</a>{" "}
            — todas as médias (presidente 1º e 2º turno, governador e senador de cada estado).
          </li>
          <li>
            <a href="/api/presidente.json" className="underline">/api/presidente.json</a>{" "}
            — média presidencial (1º turno, votos válidos) e as pesquisas que a compõem.
          </li>
          <li>
            <a href="/api/segundo-turno.json" className="underline">/api/segundo-turno.json</a>{" "}
            — simulações de 2º turno para presidente, por confronto.
          </li>
          <li>
            <a href="/api/polls.json" className="underline">/api/polls.json</a>{" "}
            — catálogo completo das pesquisas, com fonte e registro TSE.
          </li>
          <li>
            <a href="/data/averages.csv" className="underline">/data/averages.csv</a> e{" "}
            <a href="/data/polls.csv" className="underline">/data/polls.csv</a>{" "}
            — os mesmos dados em CSV, para planilha.
          </li>
          <li>
            <a href="/feed.xml" className="underline">/feed.xml</a>{" "}
            — RSS das pesquisas mais recentes.
          </li>
        </ul>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Todos os feeds trazem a proveniência e a licença embutidas. Precisa de um recorte
          específico? Escreva para{" "}
          <a href="mailto:contato@placardaspesquisas.com.br" className="underline">
            contato@placardaspesquisas.com.br
          </a>
          .
        </p>
      </section>
    </article>
  );
}
