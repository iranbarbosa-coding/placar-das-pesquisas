import Link from "next/link";
import { colorMap, colorOf, ensureDistinct } from "@/lib/colors";
import { candKey } from "@/lib/average";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { displayName } from "@/lib/names";
import { UF_NAMES } from "@/lib/types";
import EvolucaoConfronto from "@/components/EvolucaoConfronto";
import { evolucaoConfronto, EVOLUCAO_DESDE, type MediaConfronto } from "@/lib/eleicao";

/**
 * Os governos em 2º turno — um gráfico de área REDUZIDO por estado, com a
 * evolução da média do confronto real (o par das urnas), a média atual e, em
 * letra pequena, o resultado oficial do 1º turno. Mesma série e mesma regra do
 * herói presidencial (`lib/eleicao.ts`). Server component.
 */

function Cartao({ d }: { d: MediaConfronto }) {
  const { confronto: c, media: m } = d;
  const uf = c.uf!;
  const [p1, p2] = c.nomes;
  // Cor de IDENTIDADE de cada nome (a mesma das outras páginas; Lula é vermelho),
  // com o segundo afastado do primeiro se as tonalidades colidirem.
  const cmap = colorMap([p1.nome, p2.nome]);
  const corA = colorOf(cmap, p1.nome);
  const cores: [string, string] = [corA, ensureDistinct(corA, colorOf(cmap, p2.nome))];
  const mA = m?.candidates.find((x) => candKey(x.candidate) === candKey(p1.nome)) ?? null;
  const mB = m?.candidates.find((x) => candKey(x.candidate) === candKey(p2.nome)) ?? null;
  const lider = m?.candidates[0] ?? null;
  const href = `/estados/${uf.toLowerCase()}#segundo-turno-governador`;
  return (
    <article className="flex min-w-0 flex-col gap-2 rounded-lg p-3" style={{ background: "var(--surface-2)" }} aria-label={`${UF_NAMES[uf]}: ${p1.nome} contra ${p2.nome}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Link href={href} className="truncate text-sm font-bold hover:underline" style={{ color: "var(--text-primary)" }}>
          {UF_NAMES[uf]}
        </Link>
        {m && lider ? (
          <span className="tabular shrink-0 text-xs" style={{ color: "var(--text-secondary)" }}>
            <span className="font-bold" style={{ color: "var(--text-primary)" }}>{fmtSigned(m.spread)}</span> {displayName(lider.candidate).split(" ")[0]}
          </span>
        ) : null}
      </div>

      {m && mA && mB ? (
        <EvolucaoConfronto
          id={`uf-${uf.toLowerCase()}`}
          compact
          points={evolucaoConfronto(d, EVOLUCAO_DESDE)}
          a={{ nome: displayName(mA.candidate), cor: cores[0], atual: mA.avg }}
          b={{ nome: displayName(mB.candidate), cor: cores[1], atual: mB.avg }}
        />
      ) : (
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>Este confronto ainda não foi pesquisado.</p>
      )}

      <div className="mt-auto border-t pt-2 text-[11px]" style={{ borderColor: "var(--grid)", color: "var(--text-muted)" }}>
        <span className="tabular">
          1º turno: {displayName(p1.nome)} {fmtPct(p1.pct)}% × {displayName(p2.nome)} {fmtPct(p2.pct)}%
        </span>
        {m ? (
          <>
            {" "}· {m.pollCount} pesquisa{m.pollCount === 1 ? "" : "s"}, última em {fmtDate(m.lastPollDate)}
            {d.posPrimeiroTurnoNaMedia ? `, ${d.posPrimeiroTurnoNaMedia} após o 1º turno` : ""}
          </>
        ) : null}
      </div>
    </article>
  );
}

export default function ConfrontosGovernador({
  data,
  title = "Governadores · 2º turno",
  layout = "grid",
}: {
  data: MediaConfronto[];
  title?: string;
  /** `coluna`: a coluna da direita da home — um cartão por estado, empilhados (decisão de Iran, 08/10). */
  layout?: "grid" | "coluna";
}) {
  const govs = data.filter((d) => d.confronto.race === "governador" && d.confronto.uf);
  if (!govs.length) return null;
  const comNovas = govs.filter((d) => d.posPrimeiroTurno > 0).length;
  const coluna = layout === "coluna";
  return (
    <section className={coluna ? "card p-4" : "card p-4 sm:p-6"} aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className={coluna ? "text-[11px] font-bold uppercase tracking-[0.14em]" : "text-lg font-semibold"} style={{ color: coluna ? "var(--text-secondary)" : "var(--text-primary)" }}>
          {title}
          {coluna ? null : <span className="font-normal" style={{ color: "var(--text-muted)" }}> · evolução da média, votos válidos</span>}
        </h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {govs.length} estado{govs.length === 1 ? "" : "s"}{coluna ? "" : ` · ${comNovas} com pesquisa após o 1º turno`}
        </span>
      </div>
      <p className={coluna ? "mt-1 text-xs" : "mt-1 max-w-[75ch] text-sm"} style={{ color: "var(--text-secondary)" }}>
        {coluna
          ? "Evolução da média, votos válidos, nos estados em que ninguém chegou a 50% no 1º turno."
          : "Os estados em que ninguém chegou a 50% dos votos válidos no 1º turno. Cada gráfico é a média do par das urnas, com todas as simulações que o testaram, antes e depois de 04/10."}
      </p>
      <div className={coluna ? "mt-3 flex flex-col gap-3" : "mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3"}>
        {govs.map((d) => (
          <Cartao key={d.confronto.uf} d={d} />
        ))}
      </div>
      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        Vantagem = diferença entre os dois na média atual, em p.p. <Link href="/segundo-turno" className="underline">Todos os confrontos</Link>
      </p>
    </section>
  );
}
