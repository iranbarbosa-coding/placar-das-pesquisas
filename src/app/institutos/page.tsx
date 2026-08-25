import type { Metadata } from "next";
import { pollsters, fmtDate } from "@/lib/data";
import { houseEffects } from "@/lib/houseEffects";
import InstitutosSearch from "@/components/InstitutosSearch";
import HouseEffects from "@/components/HouseEffects";

export const metadata: Metadata = {
  title: "Institutos",
  description: "Institutos de pesquisa com levantamentos publicados para as eleições de 2026.",
};

export default function InstitutosPage() {
  // Dates are formatted here, on the server, so the client filter stays a pure
  // presentation component with no dependency on the data layer.
  const list = pollsters().map((p) => ({
    name: p.name,
    count: p.count,
    races: p.races,
    latest: fmtDate(p.latest),
  }));
  const house = houseEffects("presidente", null, 1);
  return (
    <div>
      <h1 className="text-2xl font-bold">Institutos de pesquisa</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Todos os institutos com pesquisas no banco de dados, ordenados por volume publicado.
      </p>

      <HouseEffects data={house} />

      <InstitutosSearch list={list} />

      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Registro oficial de todas as pesquisas eleitorais: sistema PesqEle do TSE. Pesquisas
        divulgadas sem registro violam a legislação eleitoral (Lei 9.504/1997, art. 33).
      </p>
    </div>
  );
}
