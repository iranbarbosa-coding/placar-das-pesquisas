import Link from "next/link";
import BrasilMap from "./BrasilMap";
import type { StateMapDatum } from "@/lib/home";

/**
 * O mapa interativo das corridas estaduais no 2º turno (coluna da direita da
 * home). Azul escuro: a corrida para governador segue para 25/10. Cinza:
 * decidida no 1º turno. O hover (title nativo) diz quem ganhou, ou quem lidera a
 * média do confronto, com a margem; o clique leva à página do estado. Server
 * component — o SVG é lido do disco por `BrasilMap`.
 */
const LEGENDA = [
  { cor: "var(--map-2t-ativa)", label: "Em 2º turno" },
  { cor: "var(--map-2t-encerrada)", label: "Decidida no 1º turno" },
];

export default function MapaSegundoTurno({ map }: { map: StateMapDatum[] }) {
  const ativas = map.filter((d) => d.fill === "var(--map-2t-ativa)").length;
  return (
    <section className="card p-4" aria-label="Corridas estaduais — Governador">
      <h2 className="text-[11px] font-bold uppercase tracking-[0.14em]" style={{ color: "var(--text-secondary)" }}>
        Corridas estaduais · Governador
      </h2>
      <p className="mt-0.5 text-sm font-semibold" style={{ color: "var(--text-primary)" }}>
        {ativas} em 2º turno · {map.length - ativas} decididas no 1º
      </p>
      <div className="mt-3">
        <BrasilMap map={map} label="Mapa do Brasil: corridas para governador em 2º turno (azul escuro) e decididas no 1º turno (cinza). Passe o mouse para ver quem venceu ou quem lidera, com a margem." />
      </div>
      <ul className="mt-3 grid grid-cols-2 gap-y-1 text-xs" style={{ color: "var(--text-secondary)" }}>
        {LEGENDA.map((l) => (
          <li key={l.label} className="flex items-center gap-1.5">
            <span aria-hidden="true" className="h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: l.cor }} />
            {l.label}
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Passe o mouse sobre um estado para ver quem venceu ou quem lidera a média, com a margem. Clique para abrir o estado.
      </p>
      <Link
        href="/estados"
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-md px-4 py-2 text-sm font-semibold text-white transition-opacity hover:opacity-90"
        style={{ background: "var(--accent)" }}
      >
        Ver todos os estados <span aria-hidden="true">→</span>
      </Link>
    </section>
  );
}
