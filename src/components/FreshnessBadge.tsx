import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { frescor, quarentenaDe, FRESCOR_VELHO_DIAS } from "@/lib/frescor";
import type { RaceKind, UF } from "@/lib/types";

/**
 * O selo de frescor de uma disputa: "última pesquisa há N dias" com o tom
 * certo, e — quando o guarda congelou a disputa — o aviso de dado em revisão.
 *
 * Componente de servidor: lê `data/conflicts.ndjson` na build (SSG), como a
 * página de metodologia já faz. Sem última pesquisa não há selo (a página já
 * diz "ainda não há pesquisas").
 */
export default function FreshnessBadge({
  race,
  uf,
  lastPollDate,
  generatedAt,
  className,
}: {
  race: RaceKind;
  uf: UF | null;
  lastPollDate: string | null | undefined;
  generatedAt: string;
  className?: string;
}) {
  const f = frescor(lastPollDate, generatedAt);
  const q = quarentenaDe(race, uf);
  if (!f && !q) return null;

  const tomCls =
    f?.tom === "velho"
      ? "text-red-700 dark:text-red-400"
      : f?.tom === "atencao"
        ? "text-amber-700 dark:text-amber-500"
        : "text-neutral-600 dark:text-neutral-400";
  const dot =
    f?.tom === "velho" ? "bg-red-600" : f?.tom === "atencao" ? "bg-amber-500" : "bg-emerald-500";

  const quando =
    !f ? null
    : f.dias === 0 ? "hoje"
    : f.dias === 1 ? "há 1 dia"
    : `há ${f.dias} dias`;

  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 text-xs ${className ?? ""}`}>
      {f && (
        <span className={`inline-flex items-center gap-1.5 ${tomCls}`} title={`Campo encerrado em ${fmtDate(f.lastPollDate)}`}>
          <span aria-hidden="true" className={`inline-block h-2 w-2 rounded-full ${dot}`} />
          {f.tom === "velho" ? "Sem pesquisa recente" : "Última pesquisa"} {quando}
          <span style={{ color: "var(--text-muted)" }}>· {fmtDate(f.lastPollDate)}</span>
        </span>
      )}
      {q && (
        <Link
          href="/metodologia#frescor"
          className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 font-medium text-amber-800 hover:underline dark:text-amber-300"
          style={{ border: "1px solid var(--ring)", background: "var(--surface-1)" }}
          title={`${q.perdas} pergunta(s) da coleta sem prova de sucessão; o site mantém o dado anterior até a verificação.`}
        >
          <span aria-hidden="true" className="inline-block h-2 w-2 rounded-full bg-amber-500" />
          Dado em revisão desde {fmtDate(q.desde)}
        </Link>
      )}
      {f && f.tom === "velho" && !q ? (
        <span className="sr-only">Esta disputa está há mais de {FRESCOR_VELHO_DIAS} dias sem pesquisa nova.</span>
      ) : null}
    </div>
  );
}
