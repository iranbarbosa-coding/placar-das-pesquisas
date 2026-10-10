import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { RankingAcerto, AcertoInstituto, PlacarAcerto } from "@/lib/acerto";
import type { RaceKind } from "@/lib/types";
import { JANELA_DIAS } from "@/lib/acerto";

/**
 * "Quem chegou mais perto das urnas" — três placares, um por cargo (presidente,
 * governadores, senadores), com o erro da ÚLTIMA pesquisa de cada instituto
 * contra o resultado oficial (ver `lib/acerto.ts`). Server component: uma foto
 * do dado de build. Só é renderizado quando há resultado carregado em
 * `data/resultados-oficiais.json`.
 */

const fmt1 = (v: number | null | undefined): string =>
  v === null || v === undefined ? "—" : v.toFixed(1).replace(".", ",");

function faixa(erro: number | null): { bg: string; fg: string } {
  // Verde até 2 p.p. (dentro da margem típica), âmbar até 4, laranja acima.
  if (erro === null) return { bg: "transparent", fg: "var(--text-muted)" };
  if (erro <= 2) return { bg: "rgba(22,163,74,0.14)", fg: "var(--text-primary)" };
  if (erro <= 4) return { bg: "rgba(217,119,6,0.14)", fg: "var(--text-primary)" };
  return { bg: "rgba(226,98,15,0.18)", fg: "var(--text-primary)" };
}

const tdNum = "py-2 pr-3 text-right text-sm tabular";

function Linha({ pos, r, federal }: { pos: number; r: AcertoInstituto; federal: boolean }) {
  const f = faixa(r.erroMargem);
  const unica = federal ? r.detalhes[0] : null;
  return (
    <tr className="border-t" style={{ borderColor: "var(--grid)" }}>
      <td className="py-2 pr-2 text-right text-sm tabular" style={{ color: "var(--text-muted)" }}>{pos}º</td>
      <td
        className="py-2 pr-3 text-sm font-semibold"
        style={{ color: "var(--text-primary)" }}
        title={federal ? undefined : r.detalhes.map((d) => `${d.uf ?? "BR"} ${fmt1(d.erroMedio)} p.p.`).join(" · ")}
      >
        {r.pollster}
      </td>
      {federal ? (
        <td className={tdNum} style={{ color: "var(--text-secondary)" }}>{unica?.fieldwork_end ? fmtDate(unica.fieldwork_end) : "—"}</td>
      ) : (
        <td className={tdNum} style={{ color: "var(--text-secondary)" }}>{r.disputas}</td>
      )}
      <td className="py-2 pr-3 text-right">
        <span className="inline-block rounded px-2 py-0.5 text-sm font-semibold tabular" style={{ background: f.bg, color: f.fg }}>
          {fmt1(r.erroMargem)}
        </span>
      </td>
      <td className={tdNum} style={{ color: "var(--text-secondary)" }}>{fmt1(r.erroMedio)}</td>
      <td className="py-2 text-right text-sm tabular" style={{ color: "var(--text-secondary)" }}>
        {federal ? (r.lideresCertos ? "sim" : "não") : `${r.lideresCertos}/${r.disputas}`}
      </td>
    </tr>
  );
}

/** A média do Placar como linha de referência, sem posição, destacada por tom e borda. */
function LinhaReferencia({ ref_, federal }: { ref_: NonNullable<PlacarAcerto["referencia"]>; federal: boolean }) {
  const f = faixa(ref_.erroMargem);
  return (
    <tr className="border-t border-b" style={{ borderColor: "var(--accent)", background: "color-mix(in srgb, var(--accent) 7%, transparent)" }}>
      <td className="py-2 pr-2 text-right text-[10px] font-semibold uppercase tracking-wide" style={{ color: "var(--accent)" }}>ref.</td>
      <td className="py-2 pr-3 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {ref_.nome}
        <span className="ml-1.5 text-xs font-normal" style={{ color: "var(--text-muted)" }}>
          {ref_.acima} acima · {ref_.abaixo} abaixo
        </span>
      </td>
      <td className={tdNum} style={{ color: "var(--text-secondary)" }}>{federal ? (ref_.lastPollDate ? fmtDate(ref_.lastPollDate) : "—") : "—"}</td>
      <td className="py-2 pr-3 text-right">
        <span className="inline-block rounded px-2 py-0.5 text-sm font-semibold tabular" style={{ background: f.bg, color: f.fg }}>
          {fmt1(ref_.erroMargem)}
        </span>
      </td>
      <td className={tdNum} style={{ color: "var(--text-secondary)" }}>{fmt1(ref_.erroMedio)}</td>
      <td className="py-2 text-right text-sm tabular" style={{ color: "var(--text-secondary)" }}>{ref_.acertouLider ? "sim" : "não"}</td>
    </tr>
  );
}

function Placar({ p, maxRows }: { p: PlacarAcerto; maxRows: number }) {
  if (!p.ranqueados.length && !p.demais.length) return null;
  const federal = p.race === "presidente";
  const th = "pb-2 pr-3 text-right font-medium";
  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-base font-semibold" style={{ color: "var(--text-primary)" }}>{p.titulo}</h3>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {federal
            ? `${p.ranqueados.length} instituto${p.ranqueados.length === 1 ? "" : "s"} com pesquisa na janela`
            : `${p.disputasComResultado} disputa${p.disputasComResultado === 1 ? "" : "s"} com resultado · posição com ${p.minDisputas} ou mais comparadas`}
        </span>
      </div>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full min-w-[520px] border-collapse">
          <thead>
            <tr className="text-left text-xs uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
              <th className="pb-2 pr-2 text-right font-medium">#</th>
              <th className="pb-2 pr-3 font-medium">Instituto</th>
              <th className={th}>{federal ? "Campo até" : "Disputas"}</th>
              <th className={th}>Erro na margem (p.p.)</th>
              <th className={th}>Erro médio</th>
              <th className="pb-2 text-right font-medium">Acertou o líder</th>
            </tr>
          </thead>
          <tbody>
            {p.ranqueados.slice(0, maxRows).flatMap((r, i) => {
              const linhas = [<Linha key={r.pollster} pos={i + 1} r={r} federal={federal} />];
              // A média do Placar entra como referência logo após o último
              // instituto que ficou à frente dela (ou no topo, se nenhum ficou).
              if (p.referencia && i + 1 === p.referencia.acima) linhas.push(<LinhaReferencia key="__media" ref_={p.referencia} federal={federal} />);
              return linhas;
            })}
          </tbody>
        </table>
      </div>
      {p.referencia ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          <span className="font-semibold" style={{ color: "var(--accent)" }}>ref.</span> = a média final do Placar para o 1º turno, medida com as
          mesmas regras e posta onde cairia na ordem: {p.referencia.acima} instituto{p.referencia.acima === 1 ? "" : "s"} ficaram à frente dela e{" "}
          {p.referencia.abaixo} atrás. Não tem posição porque é derivada das pesquisas que ranqueia.
        </p>
      ) : null}
      {p.ranqueados.length > maxRows ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          E mais {p.ranqueados.length - maxRows}:{" "}
          {p.ranqueados.slice(maxRows).map((r) => `${r.pollster} (${fmt1(r.erroMargem)} p.p.)`).join(" · ")}.
        </p>
      ) : null}
      {p.demais.length ? (
        <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
          Com menos de {p.minDisputas} disputas comparadas (sem posição):{" "}
          {p.demais.map((r) => `${r.pollster} (${r.disputas}, ${fmt1(r.erroMargem)} p.p.)`).join(" · ")}.
        </p>
      ) : null}
    </div>
  );
}

export default function RankingInstitutos({
  data,
  maxRows = 10,
  title = "Quem chegou mais perto das urnas",
  cargos,
  hrefDemais,
}: {
  data: RankingAcerto;
  maxRows?: number;
  title?: string;
  /** Só estes cargos (ex.: ["presidente"] na home); omitido = todos. */
  cargos?: RaceKind[];
  /** Link para a página com os demais placares, mostrado quando `cargos` filtra. */
  hrefDemais?: string;
}) {
  const placares = data.placares.filter((p) => p.ranqueados.length || p.demais.length).filter((p) => !cargos || cargos.includes(p.race));
  const omitidos = data.placares.filter((p) => cargos && !cargos.includes(p.race) && (p.ranqueados.length || p.demais.length));
  if (!placares.length) return null;
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
        Erro na margem entre os dois primeiros, em pontos percentuais, da última pesquisa de cada instituto (campo até {JANELA_DIAS} dias
        antes do pleito) contra o resultado oficial do TSE, em votos válidos.{" "}
        {omitidos.length
          ? "Aqui, só a corrida presidencial."
          : "Um placar por cargo: a corrida presidencial não se soma às estaduais."}{" "}
        Quanto menor, mais perto das urnas; o erro médio por candidato desempata.
        {omitidos.length && hrefDemais ? (
          <>
            {" "}
            <Link href={hrefDemais} className="font-semibold underline" style={{ color: "var(--accent)" }}>
              {omitidos.map((p) => p.titulo).join(" e ")} →
            </Link>
          </>
        ) : null}
      </p>
      <div className="mt-4 flex flex-col gap-6">
        {placares.map((p) => (
          <Placar key={p.race} p={p} maxRows={maxRows} />
        ))}
      </div>
      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Fonte dos resultados: TSE, Divulgação de Resultados{data.atualizado_em ? `, lido em ${fmtDate(data.atualizado_em.slice(0, 10))}` : ""}
        {parcial ? ", com a totalização ainda em andamento — os erros mudam um pouco até o resultado final" : ""}.
        Erro na margem = diferença entre a vantagem do 1º sobre o 2º na pesquisa e nas urnas. Erro médio = diferença absoluta média por
        candidato comparado. Senado: só pesquisas de dois votos, com cada nome como
        parte das menções a candidatos — a mesma conta do percentual de válidos do TSE. Uma pesquisa mede o eleitorado do dia do campo, não do dia da votação.{" "}
        <Link href="/metodologia#acerto" className="underline">Metodologia</Link>
      </p>
    </section>
  );
}
