import type { Metadata } from "next";
import { pollsters, fmtDate } from "@/lib/data";
import { houseEffects } from "@/lib/houseEffects";
import InstitutosSearch from "@/components/InstitutosSearch";
import HouseEffects from "@/components/HouseEffects";

export const metadata: Metadata = {
  title: "Viés dos Institutos",
  description:
    "Efeito casa: quanto cada instituto de pesquisa tende a super ou subestimar cada candidato ante a média das demais pesquisas, nas eleições de 2026.",
};

export default function InstitutosPage() {
  // Dates are formatted here, on the server, so the client filter stays a pure
  // presentation component with no dependency on the data layer.
  const list = pollsters().map((p) => ({
    name: p.name,
    count: p.count,
    races: p.races,
    latest: fmtDate(p.latest),
  }));
  const house = houseEffects("presidente", null, 1);

  return (
    <div>
      <h1 className="text-2xl font-bold">Viés dos Institutos</h1>
      <p className="mt-1 max-w-[70ch] text-sm" style={{ color: "var(--text-secondary)" }}>
        O <strong style={{ color: "var(--text-primary)" }}>efeito casa</strong> de cada instituto — o quanto
        tende a super ou subestimar cada candidato ante a média das demais pesquisas.
      </p>

      {/* Request (3): o que é efeito casa e como medimos. */}
      <section className="card mt-4 p-4 sm:p-6" aria-label="O que é efeito casa">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          O que é “efeito casa”
        </h2>
        <div className="mt-2 max-w-[70ch] space-y-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p>
            Cada instituto pesquisa de um jeito próprio — como monta a amostra, como faz a pergunta, se coleta
            presencialmente, por telefone ou pela internet. Por isso alguns mostram, de forma consistente, um
            candidato um pouco <strong style={{ color: "var(--text-primary)" }}>acima</strong> ou{" "}
            <strong style={{ color: "var(--text-primary)" }}>abaixo</strong> da média dos demais. Esse desvio
            sistemático é o <strong style={{ color: "var(--text-primary)" }}>efeito casa</strong> (house effect).
          </p>
          <p>
            Efeito casa <strong style={{ color: "var(--text-primary)" }}>não é erro nem fraude</strong>. Ele pode
            refletir uma metodologia perfeitamente legítima. É uma característica do instituto — que descrevemos,
            não um veredito sobre ele.
          </p>
          <div>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Como medimos
            </p>
            <p className="mt-1">
              Para cada pesquisa de um instituto, comparamos o número que ele deu a cada candidato com a{" "}
              <strong style={{ color: "var(--text-primary)" }}>média das pesquisas dos outros institutos</strong>{" "}
              na mesma época — deixando o próprio instituto de fora (o método <em>leave-one-out</em>), para que
              ele não seja comparado consigo mesmo. A diferença média é o viés: <strong style={{ color: "var(--text-primary)" }}>positivo</strong>{" "}
              quando o instituto tende a superestimar aquele candidato, <strong style={{ color: "var(--text-primary)" }}>negativo</strong>{" "}
              quando subestima. É a mesma regra de janela (últimas pesquisas, com limite por instituto) usada na
              média do site.
            </p>
          </div>
          <div>
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>
              Cuidados para não medir ruído
            </p>
            <ul className="mt-1 list-disc space-y-1 pl-5">
              <li>Só entram institutos com pelo menos 3 pesquisas na disputa.</li>
              <li>Cada número (instituto × candidato) precisa de ao menos 2 observações.</li>
              <li>
                O “consenso” só conta quando pelo menos 3 outros institutos testaram o candidato — para não medir
                contra uma pesquisa isolada.
              </li>
            </ul>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Leitura: um instituto perto de zero está perto do consenso; quanto maior a barra (ou o tom da
            célula), maior o desvio. A ausência de um instituto aqui significa que ele ainda não tem pesquisas
            suficientes no nosso banco — não é um juízo sobre ele.
          </p>
        </div>
      </section>

      <HouseEffects data={house} />

      <h2 className="mt-8 text-lg font-bold" style={{ color: "var(--text-primary)" }}>
        Todos os institutos
      </h2>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Todas as casas com pesquisas no banco de dados, ordenadas por volume publicado.
      </p>
      <InstitutosSearch list={list} />

      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Registro oficial de todas as pesquisas eleitorais: sistema PesqEle do TSE. Pesquisas divulgadas sem
        registro violam a legislação eleitoral (Lei 9.504/1997, art. 33).
      </p>
    </div>
  );
}
