import type { Metadata } from "next";
import Link from "next/link";
import { SITE_NAME } from "@/lib/brand";

export const metadata: Metadata = {
  title: "Sobre",
  description:
    "Quem faz o Placar das Pesquisas, com que dados e por quê: um agregador independente das pesquisas eleitorais registradas para as Eleições 2026.",
};

export default function SobrePage() {
  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Sobre o {SITE_NAME}
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Quem faz, com que dados e por quê.
        </p>
      </header>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">O que é</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O {SITE_NAME} é um agregador independente das pesquisas eleitorais registradas
          para as <strong>Eleições 2026</strong>. Reunimos, em um só lugar, as pesquisas de
          intenção de voto para <strong>presidente</strong>, <strong>governadores</strong> e{" "}
          <strong>senadores</strong>, e delas calculamos a <strong>média do {SITE_NAME}</strong>{" "}
          — um número único por disputa que resume o conjunto das pesquisas mais recentes,
          reduzindo o peso de qualquer levantamento isolado.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Não somos um instituto de pesquisa: não vamos a campo nem produzimos dados
          próprios. O que fazemos é organizar, padronizar e dar contexto ao que já foi
          publicado, sempre com link para a fonte original de cada número.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Independência e neutralidade</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O projeto é <strong>independente</strong> e não é ligado a nenhuma candidatura,
          partido, instituto ou veículo de imprensa. Não realizamos pesquisas próprias e não
          favorecemos nenhum candidato: <strong>todos os candidatos</strong> testados em cada
          disputa aparecem, na mesma média e nas mesmas tabelas, sob os mesmos critérios.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          As regras de cálculo são fixas, públicas e aplicadas igualmente a todas as
          disputas — das mais pesquisadas às menos pesquisadas. Nenhum número é estimado ou
          inventado: quando um dado não foi publicado, aparece como &ldquo;—&rdquo;. Como o
          site agrega pesquisas já publicadas segundo essas regras e disponibiliza os dados
          de forma aberta e reproduzível, os resultados não dependem de avaliação pessoal:
          nenhuma pesquisa é incluída ou excluída manualmente, e qualquer pessoa pode refazer
          os cálculos a partir das fontes.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Fontes</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Os números vêm de fontes públicas e verificáveis:
        </p>
        <ul className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>
            • As <strong>pesquisas registradas no TSE</strong> pelo sistema PesqEle, cada uma
            identificada por seu número de registro (formato BR-…/2026).
          </li>
          <li>
            • Os <strong>relatórios e divulgações dos próprios institutos</strong>, com as
            informações metodológicas que acompanham cada levantamento.
          </li>
          <li>
            • A <strong>agregação pública</strong> de tabelas de pesquisas de fontes abertas,
            de onde partem a normalização de nomes e a remoção de duplicatas.
          </li>
        </ul>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Cada pesquisa no banco carrega o link para sua fonte. Os detalhes de coleta,
          padronização e validação estão descritos na{" "}
          <Link href="/metodologia" className="underline">metodologia</Link>.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Como calculamos</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          A média de cada disputa é a média das pesquisas mais recentes daquela disputa, com
          um limite por instituto para que nenhuma casa carregue o resultado sozinha. O
          método completo — janela de pesquisas, limite por instituto, base mínima e linha do
          tempo — está descrito em detalhe na{" "}
          <Link href="/metodologia" className="underline">página de metodologia</Link>.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Política de correções</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Erros acontecem — um valor digitado errado, uma pesquisa atribuída à disputa
          errada, um nome não unificado entre fontes. Quando um erro é identificado,{" "}
          <strong>corrigimos a fonte do dado</strong> e a correção passa a valer na próxima
          atualização automática do site, refletindo em todas as médias e tabelas afetadas.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          A data e a hora da última atualização aparecem no topo de todas as páginas, de modo
          que é sempre possível saber a que versão dos dados um número se refere. Se você
          encontrou uma divergência em relação à fonte original, avise pela{" "}
          <Link href="/contato" className="underline">página de contato</Link>.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Como citar</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O uso dos dados é livre, desde que citada a fonte. Sugestão de atribuição:
        </p>
        <p
          className="rounded border px-3 py-2 text-sm"
          style={{ borderColor: "var(--ring)", background: "var(--grid)", color: "var(--text-secondary)" }}
        >
          Fonte: {SITE_NAME} — placardaspesquisas.com.br
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Ao reproduzir uma média ou uma pesquisa específica, recomendamos indicar também a
          data da atualização, já que os números mudam a cada novo levantamento.
        </p>
      </section>

      {/* ── QUEM CONSTRUIU — depois das seções do produto (produto na frente,
          autor curto). Tom neutro-institucional: a experiência/qualificação
          deram a base para uma ferramenta IMPARCIAL; o objetivo é o leitor se
          informar com menos viés. Trajetória detalhada fica no LinkedIn. ── */}
      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Quem construiu</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O {SITE_NAME} foi idealizado e desenvolvido por <strong>Iran Barbosa</strong>, com
          uso intensivo de inteligência artificial em todas as etapas — da coleta e
          padronização das pesquisas ao cálculo das médias, aos mapas e às análises derivadas.
          O objetivo é reunir em um só lugar, de forma aberta e com método descrito, o que as
          pesquisas de fato mostram — para que cada pessoa possa acompanhar as Eleições 2026
          com menos ruído e menos viés.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          A experiência em mandatos públicos — vereador de Belo Horizonte (2009–2015) e
          deputado estadual de Minas Gerais (2015–2019) — e na gestão de empresas em setores
          regulados, somada à formação em Administração (PUC Minas) e a certificações pela
          Harvard Business School Online, pelo MIT Sloan School of Management e pela IBM
          (Python para Ciência de Dados, IA e Desenvolvimento), deu a base para construir uma
          ferramenta de análise que, esperamos, seja a mais imparcial do processo eleitoral.
          Ele não ocupa cargo eletivo atualmente e não é candidato nas Eleições 2026. A
          trajetória completa está no{" "}
          <a
            href="https://www.linkedin.com/in/iranbarbosamg/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline"
          >
            LinkedIn
          </a>
          .
        </p>
      </section>

      <section className="card space-y-2 p-4" id="contato">
        <h2 className="font-semibold">Contato</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Correções, dúvidas sobre metodologia e pedidos de imprensa são bem-vindos — use a{" "}
          <Link href="/contato" className="underline">página de contato</Link> ou escreva para{" "}
          <a href="mailto:contato@placardaspesquisas.com.br" className="underline">
            contato@placardaspesquisas.com.br
          </a>
          .
        </p>
      </section>
    </article>
  );
}
