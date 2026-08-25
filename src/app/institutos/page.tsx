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

      {/* Request (3): explicação VISUAL do efeito casa — cards + emojis, largura
          total, sem texto travado numa coluna estreita. */}
      <section className="mt-5" aria-label="O que é efeito casa">
        <h2 className="text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
          Entenda o efeito casa
        </h2>

        {/* Conceito — dois cards lado a lado. */}
        <div className="mt-3 grid gap-4 md:grid-cols-2">
          <div className="card p-5">
            <div className="text-3xl" aria-hidden="true">🏠</div>
            <h3 className="mt-2 text-base font-bold" style={{ color: "var(--text-primary)" }}>
              O que é
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              Cada instituto pesquisa de um jeito próprio — como monta a amostra, como faz a pergunta, se coleta
              presencialmente, por telefone ou pela internet. Por isso alguns mostram, de forma consistente, um
              candidato um pouco <strong style={{ color: "var(--text-primary)" }}>acima</strong> ou{" "}
              <strong style={{ color: "var(--text-primary)" }}>abaixo</strong> da média dos demais. Esse desvio
              sistemático é o <strong style={{ color: "var(--text-primary)" }}>efeito casa</strong> (house effect).
            </p>
          </div>
          <div className="card p-5">
            <div className="text-3xl" aria-hidden="true">⚖️</div>
            <h3 className="mt-2 text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Não é erro nem fraude
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
              O efeito casa pode refletir uma metodologia perfeitamente legítima. É uma característica do
              instituto — que <strong style={{ color: "var(--text-primary)" }}>descrevemos</strong>, não um
              veredito sobre ele.
            </p>
          </div>
        </div>

        {/* Como medimos — card largo com a "equação" e a legenda de cor. */}
        <div className="card mt-4 p-5">
          <div className="flex items-start gap-3">
            <div className="text-3xl" aria-hidden="true">🔬</div>
            <div className="min-w-0">
              <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
                Como medimos
              </h3>
              <p className="mt-1.5 max-w-[75ch] text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
                Para cada pesquisa de um instituto, comparamos o número que ele deu a cada candidato com a{" "}
                <strong style={{ color: "var(--text-primary)" }}>média das pesquisas dos outros institutos</strong>{" "}
                na mesma época — deixando o próprio instituto de fora (o método <em>leave-one-out</em>), para que
                ele não seja comparado consigo mesmo. A diferença média é o viés:{" "}
                <strong style={{ color: "var(--text-primary)" }}>positivo</strong> quando o instituto tende a
                superestimar aquele candidato, <strong style={{ color: "var(--text-primary)" }}>negativo</strong>{" "}
                quando subestima. É a mesma regra de janela (últimas pesquisas, com limite por instituto) usada na
                média do site.
              </p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            <span className="rounded-lg border px-3 py-1.5 font-medium" style={{ borderColor: "var(--grid)", background: "var(--surface-1)", color: "var(--text-primary)" }}>
              pesquisa do instituto
            </span>
            <span className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>−</span>
            <span className="rounded-lg border px-3 py-1.5 font-medium" style={{ borderColor: "var(--grid)", background: "var(--surface-1)", color: "var(--text-primary)" }}>
              média dos outros
            </span>
            <span className="text-lg font-bold" style={{ color: "var(--text-muted)" }}>=</span>
            <span className="rounded-lg px-3 py-1.5 font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
              viés
            </span>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold" style={{ background: "rgba(37,99,235,0.14)", color: "var(--text-primary)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "rgb(37,99,235)" }} aria-hidden="true" /> viés positivo · superestima o candidato
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 font-semibold" style={{ background: "rgba(226,98,15,0.14)", color: "var(--text-primary)" }}>
              <span className="h-2 w-2 rounded-full" style={{ background: "rgb(226,98,15)" }} aria-hidden="true" /> viés negativo · subestima
            </span>
          </div>
        </div>

        {/* Cuidados — três mini-cards de limiar. */}
        <p className="mt-5 text-[13px] font-bold uppercase tracking-[0.12em]" style={{ color: "var(--text-muted)" }}>
          Cuidados para não medir ruído
        </p>
        <div className="mt-2 grid gap-4 sm:grid-cols-3">
          {[
            { emoji: "📊", n: "≥ 3", label: "pesquisas por instituto na disputa" },
            { emoji: "🔁", n: "≥ 2", label: "observações por instituto × candidato" },
            { emoji: "👥", n: "≥ 3", label: "outros institutos testaram o candidato (consenso)" },
          ].map((g) => (
            <div key={g.label} className="card flex items-center gap-3 p-4">
              <div className="text-2xl" aria-hidden="true">{g.emoji}</div>
              <div className="min-w-0">
                <div className="tabular text-2xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                  {g.n}
                </div>
                <div className="mt-1 text-xs" style={{ color: "var(--text-secondary)" }}>
                  {g.label}
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Como ler — nota final. */}
        <div className="card mt-4 flex items-start gap-3 p-4">
          <div className="text-2xl" aria-hidden="true">🧭</div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>Como ler:</strong> um instituto perto de{" "}
            <strong style={{ color: "var(--text-primary)" }}>zero</strong> está perto do consenso; quanto maior a
            barra (ou o tom da célula), maior o desvio. A ausência de um instituto significa apenas que ele ainda
            não tem pesquisas suficientes no nosso banco — não é um juízo sobre ele.
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
