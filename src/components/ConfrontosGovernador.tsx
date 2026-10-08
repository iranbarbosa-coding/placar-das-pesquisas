import Link from "next/link";
import { dualColor } from "@/lib/colors";
import { candKey } from "@/lib/average";
import { fmtDate, fmtPct } from "@/lib/format";
import { displayName } from "@/lib/names";
import { UF_NAMES } from "@/lib/types";
import type { MediaConfronto } from "@/lib/eleicao";

/**
 * Os governos em 2º turno — um cartão por estado.
 *
 * Cada cartão traz o resultado oficial do 1º turno (TSE, válidos) e a média das
 * simulações deste par — a série contínua, antes e depois do 1º turno (regra 2
 * de `lib/eleicao.ts`) — com a contagem das que têm campo após a votação.
 * Server component.
 */

const pct = (v: number): string => (Number.isFinite(v) ? `${fmtPct(v)}%` : "—");

function Cartao({ d }: { d: MediaConfronto }) {
  const { confronto: c, media: m } = d;
  const uf = c.uf!;
  const [p1, p2] = c.nomes;
  const cores: [string, string] = [dualColor(0, "red"), dualColor(1, "red")];
  const mA = m?.candidates.find((x) => candKey(x.candidate) === candKey(p1.nome)) ?? null;
  const mB = m?.candidates.find((x) => candKey(x.candidate) === candKey(p2.nome)) ?? null;
  const soma = p1.pct + p2.pct;
  const esq = soma > 0 ? (p1.pct / soma) * 100 : 50;
  return (
    <article className="flex flex-col gap-2 rounded-lg p-3" style={{ background: "var(--surface-2)" }} aria-label={`${UF_NAMES[uf]}: ${p1.nome} contra ${p2.nome}`}>
      <div className="flex items-baseline justify-between gap-2">
        <Link href={`/estados/${uf.toLowerCase()}#segundo-turno-governador`} className="text-sm font-bold hover:underline" style={{ color: "var(--text-primary)" }}>
          {UF_NAMES[uf]}
        </Link>
        <span className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{uf}</span>
      </div>

      <div className="flex items-end justify-between gap-2">
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(p1.nome)}</div>
          <div className="tabular text-xl font-bold leading-tight" style={{ color: cores[0] }}>{pct(p1.pct)}</div>
        </div>
        <div className="min-w-0 text-right">
          <div className="truncate text-sm font-semibold" style={{ color: "var(--text-primary)" }}>{displayName(p2.nome)}</div>
          <div className="tabular text-xl font-bold leading-tight" style={{ color: cores[1] }}>{pct(p2.pct)}</div>
        </div>
      </div>
      <div className="relative h-2 w-full overflow-hidden rounded-full" role="img" aria-hidden="true" style={{ background: "var(--grid)" }}>
        <div className="absolute inset-y-0 left-0" style={{ width: `${esq}%`, background: cores[0] }} />
        <div className="absolute inset-y-0 right-0" style={{ width: `${100 - esq}%`, background: cores[1] }} />
      </div>
      <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>1º turno · TSE, válidos</div>

      <div className="mt-1 border-t pt-2 text-xs" style={{ borderColor: "var(--grid)", color: "var(--text-secondary)" }}>
        {m && mA && mB ? (
          <>
            <span className="font-semibold" style={{ color: "var(--text-primary)" }}>Média 2º turno:</span>{" "}
            <span className="tabular">
              {displayName(mA.candidate)} {pct(mA.avg)} × {displayName(mB.candidate)} {pct(mB.avg)}
            </span>
            <span style={{ color: "var(--text-muted)" }}>
              {" "}· {m.pollCount} pesquisa{m.pollCount === 1 ? "" : "s"}, última em {fmtDate(m.lastPollDate)}
              {d.posPrimeiroTurnoNaMedia ? `, ${d.posPrimeiroTurnoNaMedia} após o 1º turno` : ", nenhuma após o 1º turno"}
            </span>
          </>
        ) : (
          <span style={{ color: "var(--text-muted)" }}>Este confronto ainda não foi pesquisado.</span>
        )}
      </div>
    </article>
  );
}

export default function ConfrontosGovernador({ data, title = "Governadores · 2º turno" }: { data: MediaConfronto[]; title?: string }) {
  const govs = data.filter((d) => d.confronto.race === "governador" && d.confronto.uf);
  if (!govs.length) return null;
  const comNovas = govs.filter((d) => d.posPrimeiroTurno > 0).length;
  return (
    <section className="card p-4 sm:p-6" aria-label={title}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="text-lg font-semibold" style={{ color: "var(--text-primary)" }}>{title}</h2>
        <span className="text-xs" style={{ color: "var(--text-muted)" }}>
          {govs.length} estado{govs.length === 1 ? "" : "s"} · {comNovas} com pesquisa após o 1º turno
        </span>
      </div>
      <p className="mt-1 max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
        Os estados em que ninguém chegou a 50% dos votos válidos no 1º turno. O resultado é o oficial do TSE; a média reúne todas as
        simulações do par, antes e depois do 1º turno.
      </p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {govs.map((d) => (
          <Cartao key={d.confronto.uf} d={d} />
        ))}
      </div>
    </section>
  );
}
