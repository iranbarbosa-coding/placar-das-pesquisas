import Link from "next/link";
import { fmtDate, fmtPct } from "@/lib/format";
import { displayName } from "@/lib/names";
import { confronto, disputaEncerrada, PRIMEIRO_TURNO, SEGUNDO_TURNO } from "@/lib/eleicao";
import type { RaceKind, UF } from "@/lib/types";

/**
 * A faixa de arquivamento no topo de uma disputa de 1º turno: o que as urnas
 * decidiram em 04/10, pelo resultado oficial do TSE. Duas formas:
 *  · encerrada — quem se elegeu (um nome; dois no Senado) e com quanto;
 *  · em 2º turno — os dois que seguem para 25/10, com link para a seção.
 * Sem resultado carregado, não renderiza nada: a página volta a ser um placar
 * de 1º turno em curso. Server component (lê `data/resultados-oficiais.json`).
 */

const ROTULO: Record<RaceKind, string> = { presidente: "Presidente", governador: "Governador", senador: "Senado" };

export default function ResultadoOficial({ race, uf, hrefSegundoTurno }: { race: RaceKind; uf: UF | null; hrefSegundoTurno?: string }) {
  const enc = disputaEncerrada(race, uf);
  const conf = race === "senador" ? null : confronto(race, uf);
  if (!enc && !conf) return null;
  const parcial = (enc?.totalizacao ?? conf?.totalizacao) === "parcial";

  return (
    <aside
      className="card flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3"
      style={{ borderColor: conf ? "var(--accent)" : "var(--grid)" }}
      aria-label={`${ROTULO[race]}: resultado do 1º turno`}
    >
      <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
        <span className="text-[11px] font-bold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
          {ROTULO[race]} · 1º turno encerrado em {fmtDate(PRIMEIRO_TURNO)}
        </span>
        {enc ? (
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>
            {enc.eleitos.length === 2 ? "Eleitos: " : "Eleito no 1º turno: "}
            {enc.eleitos.map((c, i) => (
              <span key={c.nome}>
                {i ? " e " : ""}
                <strong className="font-semibold">{displayName(c.nome)}</strong> <span className="tabular">{fmtPct(c.pct)}%</span>
              </span>
            ))}
            {enc.eleitos.length === 1 && enc.resultado[1] ? (
              <span style={{ color: "var(--text-secondary)" }}>
                {" "}· 2º: {displayName(enc.resultado[1].nome)} <span className="tabular">{fmtPct(enc.resultado[1].pct)}%</span>
              </span>
            ) : null}
          </span>
        ) : conf ? (
          <span className="text-sm" style={{ color: "var(--text-primary)" }}>
            Vai ao 2º turno em {fmtDate(SEGUNDO_TURNO)}:{" "}
            <strong className="font-semibold">{displayName(conf.nomes[0].nome)}</strong> <span className="tabular">{fmtPct(conf.nomes[0].pct)}%</span> ×{" "}
            <strong className="font-semibold">{displayName(conf.nomes[1].nome)}</strong> <span className="tabular">{fmtPct(conf.nomes[1].pct)}%</span>
          </span>
        ) : null}
      </div>
      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
        Votos válidos, TSE{parcial ? ", totalização parcial" : ""}.{" "}
        {conf && hrefSegundoTurno ? (
          <Link href={hrefSegundoTurno} className="font-semibold underline" style={{ color: "var(--accent)" }}>
            Ver 2º turno →
          </Link>
        ) : (
          <>As médias abaixo são o retrato final das pesquisas do 1º turno.</>
        )}
      </span>
    </aside>
  );
}
