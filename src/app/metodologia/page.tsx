import type { Metadata } from "next";
import { loadDataset } from "@/lib/data";

export const metadata: Metadata = {
  title: "Metodologia",
  description: "Como as pesquisas são coletadas, normalizadas e transformadas em médias.",
};

export default function MetodologiaPage() {
  const ds = loadDataset();
  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-6">
      <h1 className="text-2xl font-bold">Metodologia</h1>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Fontes</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          O banco reúne pesquisas de fontes públicas: as tabelas de pesquisas da Wikipédia
          (nacional e estaduais), o registro oficial PesqEle/TSE (dados abertos, licença CC-BY) e
          divulgações públicas dos próprios institutos. Cada pesquisa carrega o link da fonte.
          Nenhum número é estimado ou inventado: se um dado não foi publicado, aparece como “—”.
        </p>
        <ul className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {ds.sources.map((s) => (
            <li key={s.name}>
              • <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer">{s.name}</a>
              {s.last_ok ? ` — última coleta ok: ${s.last_ok.slice(0, 10)}` : ""}
            </li>
          ))}
        </ul>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Cálculo da média</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Para cada disputa, a média é a média simples das <strong>10 pesquisas mais recentes</strong>{" "}
          daquela disputa, ordenadas pela data de encerramento do trabalho de campo. É um número
          fixo de pesquisas — não uma janela de dias —, de modo que todas as disputas usam a mesma
          base, das mais pesquisadas às menos pesquisadas. Disputas com menos de 10 pesquisas usam
          todas as que existem, e a quantidade efetivamente usada aparece sempre ao lado dos
          números, junto com a data da pesquisa mais recente.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Consequência a conhecer: como não há limite por instituto, um instituto que publique com
          muita frequência pode ocupar várias das 10 vagas de uma disputa. A tabela completa abaixo
          de cada média mostra exatamente quais pesquisas entraram.
        </p>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          No 1º turno, a média de cada candidato usa, dentre essas 10, as pesquisas que testaram
          aquele candidato. Confrontos de 2º turno nunca são misturados: cada par de candidatos é
          uma disputa própria, com suas 10 pesquisas mais recentes. Nomes são unificados entre
          fontes (&ldquo;Lula&rdquo; e &ldquo;Luiz Inácio Lula da Silva&rdquo; são a mesma série).
          A linha do tempo aplica a mesma regra retroativamente: cada ponto é a média das 10
          pesquisas divulgadas até aquela data — ou seja, o que a média do site mostraria naquele dia.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Atualização automática</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Um robô coleta as fontes diariamente, normaliza os dados, remove duplicatas
          (mesma pesquisa vinda de fontes diferentes) e valida o resultado. Se a coleta ou a
          validação falha, o site continua exibindo o último banco válido — nunca dados
          quebrados. A data da última atualização aparece no topo de todas as páginas.
        </p>
      </section>

      <section className="card space-y-2 p-4">
        <h2 className="font-semibold">Limitações</h2>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          Pesquisa eleitoral é retrato do momento, não previsão. Médias reduzem, mas não eliminam,
          erros sistemáticos dos institutos. Margens de erro individuais constam na tabela de cada
          disputa quando publicadas. Os números pertencem aos institutos citados; este site apenas
          os agrega, com link para a fonte original de cada linha.
        </p>
      </section>
    </article>
  );
}
