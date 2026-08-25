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

/** Badge circular com emoji, no estilo do mockup. */
function Badge({ emoji, size = "h-11 w-11 text-xl" }: { emoji: string; size?: string }) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center rounded-full`}
      style={{ background: "rgba(37,99,235,0.09)" }}
      aria-hidden="true"
    >
      {emoji}
    </div>
  );
}

const FATORES = ["metodologia", "amostragem", "modo de coleta", "universo"];
const GUARDS = [
  { emoji: "📊", n: "≥ 3", label: "pesquisas por instituto na disputa" },
  { emoji: "🔁", n: "≥ 2", label: "observações por instituto × candidato" },
  { emoji: "👥", n: "≥ 3", label: "outros institutos testaram o candidato (consenso)" },
];

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
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
        Viés dos Institutos
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        O <strong style={{ color: "var(--text-primary)" }}>efeito casa</strong> de cada instituto — o quanto
        tende a super ou subestimar cada candidato ante a média das demais pesquisas.
      </p>

      {/* Explicação — quatro cards (conforme o design aprovado). */}
      <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* 1 · O que é */}
        <div className="card p-5">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute left-0">
              <Badge emoji="🏠" />
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              O que é
            </h3>
          </div>
          <div className="space-y-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <p>
              Cada instituto pesquisa de um jeito próprio — como monta a amostra, como faz a pergunta, se coleta
              presencialmente, por telefone ou pela internet.
            </p>
            <p>
              Por isso alguns mostram, de forma consistente, um candidato um pouco{" "}
              <strong style={{ color: "var(--text-primary)" }}>acima</strong> ou{" "}
              <strong style={{ color: "var(--text-primary)" }}>abaixo</strong> da média dos demais. Esse desvio
              sistemático é o <strong style={{ color: "var(--text-primary)" }}>efeito casa</strong> (house effect).
            </p>
          </div>
        </div>

        {/* 2 · Não é erro nem fraude */}
        <div className="card p-5">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute left-0">
              <Badge emoji="⚖️" />
            </div>
            <h3 className="text-center text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Não é erro nem fraude
            </h3>
          </div>
          <div className="flex justify-center">
            <span
              className="inline-flex rounded-full px-3 py-1 text-xs font-semibold"
              style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
            >
              Efeito casa ≠ fraude
            </span>
          </div>
          <p className="mt-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            O efeito casa pode refletir <strong style={{ color: "var(--text-primary)" }}>diferenças legítimas</strong>{" "}
            na metodologia entre os institutos.
          </p>
          <div
            className="mt-3 flex items-start gap-2 rounded-lg p-2.5 text-xs leading-relaxed"
            style={{ background: "rgba(37,99,235,0.08)", color: "var(--text-secondary)" }}
          >
            <span aria-hidden="true">🛡️</span>
            <span>
              Descrevemos um padrão; <strong style={{ color: "var(--text-primary)" }}>não emitimos juízo</strong>{" "}
              sobre o instituto.
            </span>
          </div>
          <p className="mt-3 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Pode variar por causa de:
          </p>
          <div className="mt-1.5 grid grid-cols-2 gap-1.5">
            {FATORES.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* 3 · Como medimos */}
        <div className="card p-5">
          <div className="relative mb-3 flex items-center justify-center">
            <div className="absolute left-0">
              <Badge emoji="🔬" />
            </div>
            <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
              Como medimos
            </h3>
          </div>
          <div className="space-y-2.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <p>
              Para cada pesquisa de um instituto, comparamos o número que ele deu a cada candidato com a{" "}
              <strong style={{ color: "var(--text-primary)" }}>média das pesquisas dos outros institutos</strong>{" "}
              na mesma época — deixando o próprio instituto de fora (leave-one-out).
            </p>
            <p>
              A diferença média é o viés <strong style={{ color: "var(--cand-green)" }}>positivo</strong> quando
              superestima, <strong style={{ color: "var(--cand-red)" }}>negativo</strong> quando subestima.
            </p>
            <p>É a mesma regra de janela do site.</p>
          </div>
          <div
            className="mt-3 flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded-lg border p-2.5 text-xs"
            style={{ borderColor: "var(--grid)" }}
          >
            <span style={{ color: "var(--text-secondary)" }}>pesquisa do instituto</span>
            <span className="font-bold" style={{ color: "var(--text-muted)" }}>−</span>
            <span style={{ color: "var(--text-secondary)" }}>média dos outros</span>
            <span className="font-bold" style={{ color: "var(--text-muted)" }}>=</span>
            <span className="rounded-md px-2 py-0.5 font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
              viés
            </span>
          </div>
        </div>

        {/* 4 · Cuidados para não medir ruído */}
        <div className="card p-5">
          <h3 className="text-center text-base font-bold" style={{ color: "var(--text-primary)" }}>
            Cuidados para não medir ruído
          </h3>
          <ul className="mt-3 space-y-3">
            {GUARDS.map((g) => (
              <li key={g.label} className="flex items-center gap-3">
                <Badge emoji={g.emoji} size="h-10 w-10 text-lg" />
                <div className="min-w-0">
                  <div className="tabular text-lg font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                    {g.n}
                  </div>
                  <div className="mt-0.5 text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {g.label}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Como ler — faixa com a legenda de cor (que sai da matriz). */}
      <div className="card mt-4 flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
        <div className="flex items-start gap-3">
          <Badge emoji="🧭" size="h-10 w-10 text-lg" />
          <p className="max-w-[80ch] text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>Como ler:</strong> um instituto perto de{" "}
            <strong style={{ color: "var(--text-primary)" }}>zero</strong> está perto do consenso; quanto maior a
            barra (ou o tom da célula), maior o desvio. A ausência de um instituto significa apenas que ele ainda
            não tem pesquisas suficientes no nosso banco — não é um juízo sobre ele.
          </p>
        </div>
        <div
          className="flex shrink-0 flex-wrap gap-x-4 gap-y-1.5 text-xs lg:flex-col lg:gap-1.5"
          style={{ color: "var(--text-secondary)" }}
        >
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: "rgba(37,99,235,0.55)" }} aria-hidden="true" /> viés positivo · superestima
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: "rgba(226,98,15,0.55)" }} aria-hidden="true" /> viés negativo · subestima
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-3 w-3 rounded-sm" style={{ background: "var(--grid)" }} aria-hidden="true" /> — = sem base suficiente
          </span>
        </div>
      </div>

      <HouseEffects data={house} hideLegendNote />

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
