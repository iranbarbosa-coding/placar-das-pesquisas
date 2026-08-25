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

/** Ícones de linha (estilo Lucide) — monocromáticos, herdam `currentColor`. */
function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  const p = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };
  const svg = (children: React.ReactNode) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <g {...p}>{children}</g>
    </svg>
  );
  switch (name) {
    case "house":
      return svg(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>);
    case "scale":
      return svg(<><path d="m16 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="m2 16 3-8 3 8c-.87.65-1.92 1-3 1s-2.13-.35-3-1Z" /><path d="M7 21h10" /><path d="M12 3v18" /><path d="M3 7h2c2 0 5-1 7-2 2 1 5 2 7 2h2" /></>);
    case "microscope":
      return svg(<><path d="M6 18h8" /><path d="M3 22h18" /><path d="M14 22a7 7 0 1 0 0-14h-1" /><path d="M9 14h2" /><path d="M8 6h6v4a2 2 0 0 1-2 2h-2a2 2 0 0 1-2-2Z" /><path d="M12 6V4a1 1 0 0 0-1-1H9" /></>);
    case "chart":
      return svg(<><path d="M4 4v16h16" /><path d="M8 18v-5" /><path d="M13 18V8" /><path d="M18 18v-8" /></>);
    case "repeat":
      return svg(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>);
    case "users":
      return svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
    case "shield":
      return svg(<><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" /><path d="m9 12 2 2 4-4" /></>);
    case "compass":
      return svg(<><circle cx="12" cy="12" r="10" /><path d="m16.24 7.76-2.12 6.36-6.36 2.12 2.12-6.36 6.36-2.12z" /></>);
  }
}
type IconName = "house" | "scale" | "microscope" | "chart" | "repeat" | "users" | "shield" | "compass";

/** Badge com ícone de linha, no estilo do mockup — círculo por padrão, ou
 *  quadrado de cantos arredondados (`square`). */
function Badge({
  name,
  size = "h-12 w-12",
  icon = "h-6 w-6",
  square = false,
}: {
  name: IconName;
  size?: string;
  icon?: string;
  square?: boolean;
}) {
  return (
    <div
      className={`flex ${size} shrink-0 items-center justify-center ${square ? "rounded-2xl" : "rounded-full"}`}
      style={{ background: "rgba(37,99,235,0.10)", color: "var(--accent)" }}
    >
      <Icon name={name} className={icon} />
    </div>
  );
}

const FATORES = ["metodologia", "amostragem", "modo de coleta", "universo"];
const GUARDS: { icon: IconName; n: string; label: string }[] = [
  { icon: "chart", n: "≥ 3", label: "pesquisas por instituto na disputa" },
  { icon: "repeat", n: "≥ 2", label: "observações por instituto × candidato" },
  { icon: "users", n: "≥ 3", label: "outros institutos testaram o candidato (consenso)" },
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
        <div className="card flex flex-col p-6">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute left-0">
              <Badge name="house" />
            </div>
            <h3 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
              O que é
            </h3>
          </div>
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
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
        <div className="card flex flex-col p-6">
          {/* Cabeçalho: ícone à ESQUERDA, com o título + a pill agrupados ao lado
              (em paralelo) — o ícone nunca sobrepõe o texto. */}
          <div className="mb-4 flex items-center gap-3">
            <Badge name="scale" size="h-11 w-11" icon="h-6 w-6" square />
            <div className="min-w-0 flex-1 text-center">
              <h3 className="text-base font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
                Não é erro nem fraude
              </h3>
              <div className="mt-2 flex justify-center">
                <span
                  className="inline-flex whitespace-nowrap rounded-full px-3 py-1 text-xs font-semibold"
                  style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
                >
                  Efeito casa ≠ fraude
                </span>
              </div>
            </div>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            O efeito casa pode refletir <strong style={{ color: "var(--text-primary)" }}>diferenças legítimas</strong>{" "}
            na metodologia entre os institutos.
          </p>
          <div
            className="mt-3 flex items-start gap-2.5 rounded-lg p-3 text-xs leading-relaxed"
            style={{ background: "rgba(37,99,235,0.08)", color: "var(--text-secondary)" }}
          >
            <Icon name="shield" className="mt-px h-4 w-4 shrink-0" />
            <span>
              Descrevemos um padrão; <strong style={{ color: "var(--text-primary)" }}>não emitimos juízo</strong>{" "}
              sobre o instituto.
            </span>
          </div>
          <p className="mt-4 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
            Pode variar por causa de:
          </p>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {FATORES.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs"
                style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
              >
                <span className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: "var(--accent)" }} aria-hidden="true" />
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* 3 · Como medimos */}
        <div className="card flex flex-col p-6">
          <div className="relative mb-4 flex items-center justify-center">
            <div className="absolute left-0">
              <Badge name="microscope" />
            </div>
            <h3 className="text-[17px] font-bold" style={{ color: "var(--text-primary)" }}>
              Como medimos
            </h3>
          </div>
          <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
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
            className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1.5 rounded-lg border p-3 text-xs"
            style={{ borderColor: "var(--grid)", background: "var(--surface-2)" }}
          >
            <span style={{ color: "var(--text-secondary)" }}>pesquisa do instituto</span>
            <span className="font-bold" style={{ color: "var(--text-muted)" }}>−</span>
            <span style={{ color: "var(--text-secondary)" }}>média dos outros</span>
            <span className="font-bold" style={{ color: "var(--text-muted)" }}>=</span>
            <span className="rounded-md px-2.5 py-1 font-bold" style={{ background: "var(--accent)", color: "#fff" }}>
              viés
            </span>
          </div>
        </div>

        {/* 4 · Cuidados para não medir ruído — três seções iguais, divididas por
            uma linha, com o conteúdo centralizado verticalmente em cada uma. */}
        <div className="card flex flex-col p-6">
          <h3 className="text-center text-[17px] font-bold leading-tight" style={{ color: "var(--text-primary)" }}>
            Cuidados para não medir ruído
          </h3>
          <ul className="mt-2 flex flex-1 flex-col">
            {GUARDS.map((g, i) => (
              <li
                key={g.label}
                className="flex flex-1 items-center gap-4 py-4"
                style={i > 0 ? { borderTop: "1px solid var(--grid)" } : undefined}
              >
                <Badge name={g.icon} size="h-14 w-14" icon="h-7 w-7" square />
                <div className="min-w-0">
                  <div className="tabular text-2xl font-bold leading-none" style={{ color: "var(--text-primary)" }}>
                    {g.n}
                  </div>
                  <div className="mt-1.5 text-sm leading-snug" style={{ color: "var(--text-secondary)" }}>
                    {g.label}
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Como ler — faixa com a legenda de cor (que sai da matriz). */}
      <div className="card mt-4 flex flex-col gap-4 p-5 lg:flex-row lg:items-center lg:justify-between lg:gap-8">
        <div className="flex items-start gap-3">
          <Badge name="compass" size="h-11 w-11" icon="h-5 w-5" />
          <p className="max-w-[80ch] text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <strong style={{ color: "var(--text-primary)" }}>Como ler:</strong> um instituto perto de{" "}
            <strong style={{ color: "var(--text-primary)" }}>zero</strong> está perto do consenso; quanto maior a
            barra (ou o tom da célula), maior o desvio. A ausência de um instituto significa apenas que ele ainda
            não tem pesquisas suficientes no nosso banco — não é um juízo sobre ele.
          </p>
        </div>
        <div
          className="flex shrink-0 flex-wrap gap-x-5 gap-y-2 text-xs lg:flex-col lg:gap-2"
          style={{ color: "var(--text-secondary)" }}
        >
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: "rgba(37,99,235,0.55)" }} aria-hidden="true" /> viés positivo · superestima
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: "rgba(226,98,15,0.55)" }} aria-hidden="true" /> viés negativo · subestima
          </span>
          <span className="inline-flex items-center gap-2">
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
