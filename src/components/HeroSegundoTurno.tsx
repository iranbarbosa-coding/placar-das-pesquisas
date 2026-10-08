import Link from "next/link";
import { dualColor } from "@/lib/colors";
import { candKey } from "@/lib/average";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { displayName } from "@/lib/names";
import { SEGUNDO_TURNO, type MediaConfronto } from "@/lib/eleicao";

/**
 * O herói da home no 2º turno — um confronto, duas leituras.
 *
 * Em cima, o que já aconteceu: o resultado oficial do 1º turno, como o TSE o
 * publicou (votos válidos). Embaixo, o que as pesquisas dizem desde então: a
 * média das pesquisas de 2º turno com campo APÓS o 1º turno (regra 2 de
 * `lib/eleicao.ts`). Enquanto não há nenhuma, o bloco diz isso e mostra, com
 * esse nome, a última média das simulações feitas antes da votação — contexto,
 * não placar. Server component; nada de estado.
 */

const pct = (v: number): string => (Number.isFinite(v) ? `${fmtPct(v)}%` : "—");

function Barra({ a, b, cores }: { a: number; b: number; cores: [string, string] }) {
  const soma = a + b;
  const esq = soma > 0 ? Math.max(0, Math.min(100, (a / soma) * 100)) : 50;
  return (
    <div className="relative h-3 w-full overflow-hidden rounded-full" role="img" aria-hidden="true" style={{ background: "var(--grid)" }}>
      <div className="absolute inset-y-0 left-0" style={{ width: `${esq}%`, background: cores[0] }} />
      <div className="absolute inset-y-0 right-0" style={{ width: `${100 - esq}%`, background: cores[1] }} />
      <div className="absolute inset-y-0 left-1/2 w-px -translate-x-1/2" style={{ background: "var(--surface-1)", opacity: 0.7 }} />
    </div>
  );
}

export default function HeroSegundoTurno({ data, diasRestantes }: { data: MediaConfronto; diasRestantes: number }) {
  const [p1, p2] = data.confronto.nomes;
  // Cores fixas por NOME ao longo do bloco: o 1º das urnas é sempre a cor "lead".
  const cores: [string, string] = [dualColor(0, "red"), dualColor(1, "red")];
  const corDe = (nome: string) => (candKey(nome) === candKey(p1.nome) ? cores[0] : cores[1]);

  const m = data.media;
  const mA = m?.candidates.find((c) => candKey(c.candidate) === candKey(p1.nome)) ?? null;
  const mB = m?.candidates.find((c) => candKey(c.candidate) === candKey(p2.nome)) ?? null;
  const lider = m?.candidates[0] ?? null;
  const h = data.mediaHipotetica;

  const quando =
    diasRestantes > 1 ? `faltam ${diasRestantes} dias` : diasRestantes === 1 ? "é amanhã" : diasRestantes === 0 ? "é hoje" : "realizado";

  return (
    <section className="card p-4 sm:p-6" aria-label="Presidente · 2º turno">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>
          Presidente · 2º turno
        </h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {fmtDate(SEGUNDO_TURNO)} · {quando}
        </span>
      </div>

      {/* Os dois nomes e o resultado do 1º turno */}
      <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
        <div className="min-w-0">
          <div className="truncate text-base font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(p1.nome)}</div>
          <div className="tabular text-3xl font-bold leading-tight" style={{ color: cores[0] }}>{pct(p1.pct)}</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>no 1º turno</div>
        </div>
        <div className="hidden text-sm font-semibold sm:block" style={{ color: "var(--text-muted)" }}>×</div>
        <div className="min-w-0 sm:text-right">
          <div className="truncate text-base font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(p2.nome)}</div>
          <div className="tabular text-3xl font-bold leading-tight" style={{ color: cores[1] }}>{pct(p2.pct)}</div>
          <div className="text-xs" style={{ color: "var(--text-muted)" }}>no 1º turno</div>
        </div>
      </div>
      <div className="mt-2">
        <Barra a={p1.pct} b={p2.pct} cores={cores} />
      </div>
      <p className="mt-1 text-xs" style={{ color: "var(--text-muted)" }}>
        Resultado oficial do 1º turno (TSE, votos válidos){data.confronto.totalizacao === "parcial" ? ", totalização parcial" : ""}.{" "}
        <Link href="/apuracao" className="underline">Apuração completa</Link>
      </p>

      {/* A média das pesquisas de 2º turno */}
      <div className="mt-5 rounded-lg p-3 sm:p-4" style={{ background: "var(--surface-2)" }}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-sm font-semibold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
            Média das pesquisas de 2º turno <span style={{ color: "var(--text-muted)" }}>· votos válidos</span>
          </h3>
          {m ? (
            <span className="text-xs" style={{ color: "var(--text-muted)" }}>
              {m.pollCount} pesquisa{m.pollCount === 1 ? "" : "s"} · última em {fmtDate(m.lastPollDate)}
            </span>
          ) : null}
        </div>

        {m && mA && mB ? (
          <>
            <div className="mt-3 flex items-end justify-between gap-2">
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(mA.candidate)}</div>
                <div className="tabular text-2xl font-bold leading-tight" style={{ color: corDe(mA.candidate) }}>{pct(mA.avg)}</div>
              </div>
              <div className="min-w-0 text-right">
                <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(mB.candidate)}</div>
                <div className="tabular text-2xl font-bold leading-tight" style={{ color: corDe(mB.candidate) }}>{pct(mB.avg)}</div>
              </div>
            </div>
            <div className="mt-2">
              <Barra a={mA.avg} b={mB.avg} cores={cores} />
            </div>
            {lider ? (
              <p className="tabular mt-2 text-sm">
                <span className="font-bold" style={{ color: "var(--text-primary)" }}>{fmtSigned(m.spread)} p.p.</span>{" "}
                <span style={{ color: "var(--text-secondary)" }}>vantagem de {displayName(lider.candidate)}</span>
              </p>
            ) : null}
          </>
        ) : (
          <p className="mt-2 text-sm" style={{ color: "var(--text-secondary)" }}>
            Nenhuma pesquisa de 2º turno com campo após o 1º turno foi publicada ainda. A média aparece aqui com a primeira.
          </p>
        )}

        {h ? (
          <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
            Para comparar: a última média das simulações feitas <em>antes</em> do 1º turno dava{" "}
            {h.candidates.slice(0, 2).map((c, i) => (
              <span key={c.candidate}>
                {i ? " × " : ""}
                {displayName(c.candidate)} {pct(c.avg)}
              </span>
            ))}{" "}
            ({h.pollCount} pesquisa{h.pollCount === 1 ? "" : "s"}, última em {fmtDate(h.lastPollDate)}). Era uma pergunta hipotética a um
            eleitorado que ainda não tinha votado; não entra na média.
          </p>
        ) : null}
      </div>

      <p className="mt-3 text-xs" style={{ color: "var(--text-muted)" }}>
        A média segue a regra do site (até 10 pesquisas mais recentes, no máximo 2 por instituto), só com pesquisas que testaram exatamente
        estes dois nomes. <Link href="/presidente" className="underline">Página do presidente</Link> ·{" "}
        <Link href="/metodologia#segundo-turno" className="underline">Metodologia</Link>
      </p>
    </section>
  );
}
