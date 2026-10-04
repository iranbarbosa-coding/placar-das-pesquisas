import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { RankingAcerto, AcertoInstituto } from "@/lib/acerto";
import { JANELA_DIAS, MIN_DISPUTAS } from "@/lib/acerto";

/**
 * "Quem chegou mais perto" — o ranking dos institutos pelo erro da ÚLTIMA
 * pesquisa de cada um contra o resultado oficial (ver `lib/acerto.ts`).
 * Server component: uma foto do dado de build. Só é renderizado quando há
 * resultado carregado em `data/resultados-oficiais.json`.
 */

const fmt1 = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : v.toFixed(1).replace(".", ",");

function faixa(erro: number): { bg: string; fg: string } {
  // Verde até 2 p.p. (dentro da margem típica), âmbar até 4, laranja acima.
  if (erro <= 2) return { bg: "rgba(22,163,74,0.14)", fg: "var(--text-primary)" };
  if (erro <= 4) return { bg: "rgba(217,119,6,0.14)", fg: "var(--text-primary)" };
  return { bg: "rgba(226,98,15,0.18)", fg: "var(--text-primary)" };
}

function Linha({ pos, r }: { pos: number | null; r: AcertoInstituto }) {
  const f = faixa(r.erroMedio);
  return (
    <tr className="border-t" style={{ borderColor: "var(--grid)" }}>
      <td className="py-2 pr-2 text-right text-sm tabular" style={{ color: "var(--text-muted)" }}>
        {pos === null ? "" : `${pos}º`}
      </td>
      <td className="py-2 pr-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }} title={r.detalhes.map((d) => `${d.race}:${d.uf ?? "BR"} ${fmt1(d.erroMedio)} p.p.`).join(" · ")}>
        {r.pollster}
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular" style={{ color: "var(--text-secondary)" }}>
        {r.disputas}
      </td>
      <td className="py-2 pr-3 text-right">
        <span className="inline-block rounded px-2 py-0.5 text-sm font-semibold tabular" style={{ background: f.bg, color: f.fg }}>
          {fmt1(r.erroMedio)}
        </span>
      </td>
      <td className="py-2 pr-3 text-right text-sm tabular" style={{ color: "var(--text-secondary)" }}>
        {fmt1(r.erroMargem)}
      </td>
      <td className="py-2 text-right text-sm tabular" style={{ color: "var(--text-secondary)" }}>
        {r.lideresCertos}/{r.disputas}
      </td>
    </tr>
  );
}

export default function RankingInstitutos({
  data,
  maxRows = 10,
  title = "Quem chegou mais perto das urnas",
}: {
  data: RankingAcerto;
  maxRows?: number;
  title?: string;
}) {
  if (!data.ranqueados.length && !data.demais.length) return null;
  const parcial = data.parcial;
  const apuracao = data.apuracaoMinima !== null && data.apuracaoMinima < 100 ? ` (≥ ${fmt1(data.apuracaoMinima)}% das seções)` : "";
  return (
    <section className="card p-4 sm:p-6" aria-label="Ranking de acerto dos institutos">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {data.turno}º turno · {data.disputasComResultado} disputa{data.disputasComResultado === 1 ? "" : "s"} com resultado
          {parcial ? ` · apuração parcial${apuracao}` : ""}
        </span>
      </div>
      <p className="mt-1 max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
        Erro médio, em pontos percentuais por candidato, da última pesquisa de cada instituto (campo até {JANELA_DIAS} dias antes
        do pleito) contra o resultado oficial do TSE, em votos válidos. Só entram institutos com {MIN_DISPUTAS} ou mais disputas
        comparadas. Quanto menor, mais perto das urnas.
      </p>
      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              <th className="pb-2 pr-2 text-right font-medium">#</th>
              <th className="pb-2 pr-3 font-medium">Instituto</th>
              <th className="pb-2 pr-3 text-right font-medium">Disputas</th>
              <th className="pb-2 pr-3 text-right font-medium">Erro médio (p.p.)</th>
              <th className="pb-2 pr-3 text-right font-medium">Erro na margem</th>
              <th className="pb-2 text-right font-medium">Acertou o líder</th>
            </tr>
          </thead>
          <tbody>
            {data.ranqueados.slice(0, maxRows).map((r, i) => (
              <Linha key={r.pollster} pos={i + 1} r={r} />
            ))}
          </tbody>
        </table>
      </div>
      {data.demais.length ? (
        <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
          Com menos de {MIN_DISPUTAS} disputas comparadas (sem posição):{" "}
          {data.demais.map((r) => `${r.pollster} (${r.disputas}, ${fmt1(r.erroMedio)} p.p.)`).join(" · ")}.
        </p>
      ) : null}
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Fonte dos resultados: TSE, Divulgação de Resultados{data.atualizado_em ? `, lido em ${fmtDate(data.atualizado_em.slice(0, 10))}` : ""}
        {parcial ? ", com a totalização ainda em andamento — os erros mudam um pouco até o resultado final" : ""}.
        Erro na margem = diferença entre a vantagem do 1º sobre o 2º na pesquisa e nas urnas. Senado: só pesquisas de dois votos, com cada nome como
        parte das menções a candidatos — a mesma conta do percentual de válidos do TSE. Uma pesquisa mede o eleitorado do dia do campo, não do dia da votação.{" "}
        <Link href="/metodologia" className="underline">Metodologia</Link>
      </p>
    </section>
  );
}
