import Link from "next/link";
import { colorMap, colorOf, ensureDistinct } from "@/lib/colors";
import { candKey } from "@/lib/average";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { displayName } from "@/lib/names";
import EvolucaoConfronto from "@/components/EvolucaoConfronto";
import { evolucaoConfronto, EVOLUCAO_DESDE, PRIMEIRO_TURNO, SEGUNDO_TURNO, type MediaConfronto } from "@/lib/eleicao";

/**
 * O herói da home no 2º turno: o GRÁFICO DE ÁREA da evolução das intenções de
 * voto no confronto presidencial (Lula × Flávio), lido da média móvel do site
 * desde `EVOLUCAO_DESDE`. Em cima, os dois nomes com a média atual e a
 * vantagem; embaixo do gráfico, em letra pequena, o resultado oficial do 1º
 * turno e quantas pesquisas da média têm campo após a votação. Decisão de Iran
 * em 08/10/2026: o gráfico é o topo da página. Server component.
 */

export default function HeroSegundoTurno({ data, diasRestantes }: { data: MediaConfronto; diasRestantes: number }) {
  const [p1, p2] = data.confronto.nomes;
  const m = data.media;
  // Cor de IDENTIDADE de cada nome (a mesma das outras páginas; Lula é vermelho),
  // com o segundo afastado do primeiro se as tonalidades colidirem.
  const cmap = colorMap([p1.nome, p2.nome]);
  const corA = colorOf(cmap, p1.nome);
  const cores: [string, string] = [corA, ensureDistinct(corA, colorOf(cmap, p2.nome))];
  const mA = m?.candidates.find((c) => candKey(c.candidate) === candKey(p1.nome)) ?? null;
  const mB = m?.candidates.find((c) => candKey(c.candidate) === candKey(p2.nome)) ?? null;
  const lider = m?.candidates[0] ?? null;
  const pontos = evolucaoConfronto(data);
  const quando =
    diasRestantes > 1 ? `faltam ${diasRestantes} dias` : diasRestantes === 1 ? "é amanhã" : diasRestantes === 0 ? "é hoje" : "realizado";

  return (
    <section className="card p-4 sm:p-6" aria-label="Presidente · 2º turno">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Presidente · 2º turno <span className="font-normal" style={{ color: "var(--text-muted)" }}>· média das pesquisas, votos válidos</span>
        </h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {fmtDate(SEGUNDO_TURNO)} · {quando}
        </span>
      </div>

      {m && mA && mB ? (
        <>
          {/* Os dois nomes e a média atual, líder da média à esquerda. */}
          <div className="mt-3 flex flex-wrap items-end justify-between gap-x-6 gap-y-2">
            <div className="flex flex-wrap items-end gap-x-6 gap-y-2">
              {[mA, mB].map((c, i) => (
                <div key={c.candidate} className="min-w-0">
                  <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(c.candidate)}</div>
                  <div className="tabular text-3xl font-bold leading-tight sm:text-4xl" style={{ color: cores[i] }}>{fmtPct(c.avg)}%</div>
                </div>
              ))}
            </div>
            {lider ? (
              <div className="tabular text-sm sm:text-right">
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{fmtSigned(m.spread)} p.p.</span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>para {displayName(lider.candidate)}</span>
                <div className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {m.pollCount} pesquisa{m.pollCount === 1 ? "" : "s"} · última em {fmtDate(m.lastPollDate)}
                </div>
              </div>
            ) : null}
          </div>

          <div className="mt-4">
            <EvolucaoConfronto
              id="hero-2t"
              points={pontos}
              a={{ nome: displayName(mA.candidate), cor: cores[0], atual: mA.avg }}
              b={{ nome: displayName(mB.candidate), cor: cores[1], atual: mB.avg }}
            />
          </div>
        </>
      ) : (
        <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
          Este confronto ainda não foi pesquisado. O gráfico aparece aqui com a primeira pesquisa.
        </p>
      )}

      <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 border-t pt-3 text-xs" style={{ borderColor: "var(--grid)", color: "var(--text-muted)" }}>
        <span>
          <span className="font-semibold" style={{ color: "var(--text-secondary)" }}>1º turno ({fmtDate(PRIMEIRO_TURNO)}, TSE, válidos):</span>{" "}
          <span className="tabular">
            {displayName(p1.nome)} {fmtPct(p1.pct)}% × {displayName(p2.nome)} {fmtPct(p2.pct)}%
          </span>
          {data.confronto.totalizacao === "parcial" ? " · totalização parcial" : ""} · <Link href="/apuracao" className="underline">apuração</Link>
        </span>
        {m ? (
          <span>
            {data.posPrimeiroTurnoNaMedia === 0
              ? `Todas as ${m.pollCount} pesquisas da média são anteriores ao 1º turno.`
              : `${data.posPrimeiroTurnoNaMedia} das ${m.pollCount} pesquisas da média ${data.posPrimeiroTurnoNaMedia === 1 ? "tem" : "têm"} campo após o 1º turno.`}
          </span>
        ) : null}
      </div>
      <p className="mt-2 text-xs" style={{ color: "var(--text-muted)" }}>
        Série desde {fmtDate(EVOLUCAO_DESDE)}: a média móvel do site (até 10 pesquisas mais recentes, 2 por instituto) com todas as
        simulações que testaram exatamente estes dois nomes, antes e depois do 1º turno.{" "}
        <Link href="/presidente#segundo-turno" className="underline">Todas as pesquisas</Link> ·{" "}
        <Link href="/metodologia#segundo-turno" className="underline">Metodologia</Link>
      </p>
    </section>
  );
}
