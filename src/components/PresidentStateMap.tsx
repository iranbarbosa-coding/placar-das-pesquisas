import Link from "next/link";
import BrasilMap from "./BrasilMap";
import { shortName } from "@/lib/names";
import type { PresidentMapDatum } from "@/lib/presidente";

/**
 * Section 6 — the presidential state map. Each state is coloured by its leader's
 * identity and intensity (see `presidentMapData`), via the per-datum `fill`
 * `BrasilMap` now accepts. Server component; the map SVG is inlined at build.
 *
 * The two realistic leaders (brand red, brand blue) drive the five-entry legend;
 * their names are read off the data rather than hardcoded, so the key follows
 * whoever actually leads.
 */

export default function PresidentStateMap({ data }: { data: PresidentMapDatum[] }) {
  const redName = data.find((d) => d.fill.includes("pmap-red"))?.leader ?? "Lula";
  const blueName = data.find((d) => d.fill.includes("pmap-blue"))?.leader ?? "Flávio Bolsonaro";
  const red = shortName(redName);
  const blue = shortName(blueName);

  const legend: { label: string; color: string }[] = [
    { label: `${red} acima de 50%`, color: "var(--pmap-red-strong)" },
    { label: `${red} abaixo de 50%`, color: "var(--pmap-red-light)" },
    { label: `${blue} acima de 50%`, color: "var(--pmap-blue-strong)" },
    { label: `${blue} abaixo de 50%`, color: "var(--pmap-blue-light)" },
    { label: "Empate técnico / sem dado", color: "var(--pmap-tie)" },
  ];

  return (
    <div className="flex min-w-0 flex-col gap-3">
      <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
        Disputa por estado · 1º turno
      </h2>

      <div className="mx-auto w-full max-w-[420px]">
        <BrasilMap map={data} />
      </div>

      <ul className="grid grid-cols-1 gap-y-1 text-xs sm:grid-cols-2" style={{ color: "var(--text-secondary)" }}>
        {legend.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.color }} />
            <span className="truncate">{l.label}</span>
          </li>
        ))}
      </ul>

      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Cores mais intensas indicam liderança acima de 50%. Baseado na subamostra presidencial de cada
        estado; estados com poucas pesquisas aparecem em cinza.
      </p>

      <Link href="/estados" className="inline-flex items-center gap-1.5 text-sm font-semibold" style={{ color: "var(--accent)" }}>
        Ver mapa interativo <span aria-hidden="true">→</span>
      </Link>
    </div>
  );
}
