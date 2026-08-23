import type { Metadata } from "next";
import { pollsters, fmtDate } from "@/lib/data";

export const metadata: Metadata = {
  title: "Institutos",
  description: "Institutos de pesquisa com levantamentos publicados para as eleições de 2026.",
};

export default function InstitutosPage() {
  const list = pollsters();
  return (
    <div>
      <h1 className="text-2xl font-bold">Institutos de pesquisa</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Todos os institutos com pesquisas no banco de dados, ordenados por volume publicado.
      </p>
      {/* Desktop (≥md): the full table, unchanged. */}
      <div className="card mt-6 hidden overflow-x-auto md:block">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="border-b text-left text-xs uppercase tracking-wide" style={{ borderColor: "var(--ring)", color: "var(--text-muted)" }}>
              <th className="px-3 py-2 font-medium">Instituto</th>
              <th className="px-3 py-2 text-right font-medium">Pesquisas</th>
              <th className="px-3 py-2 text-right font-medium">Disputas cobertas</th>
              <th className="px-3 py-2 text-right font-medium">Mais recente</th>
            </tr>
          </thead>
          <tbody>
            {list.map((p) => (
              <tr key={p.name} className="border-b last:border-0" style={{ borderColor: "var(--grid)" }}>
                <td className="px-3 py-2 font-medium">{p.name}</td>
                <td className="px-3 py-2 text-right tabular">{p.count}</td>
                <td className="px-3 py-2 text-right tabular">{p.races}</td>
                <td className="px-3 py-2 text-right text-xs" style={{ color: "var(--text-secondary)" }}>
                  {fmtDate(p.latest)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile (<md): one card per instituto — name on top, the three figures
          as labelled pairs, so nothing clips off the right edge. */}
      <ul className="mt-6 flex flex-col gap-2 md:hidden">
        {list.map((p) => (
          <li key={p.name} className="card p-3">
            <p className="font-semibold" style={{ color: "var(--text-primary)" }}>{p.name}</p>
            <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs" style={{ color: "var(--text-muted)" }}>
              <div className="flex items-baseline gap-1">
                <dt className="uppercase tracking-wide">Pesquisas</dt>
                <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{p.count}</dd>
              </div>
              <div className="flex items-baseline gap-1">
                <dt className="uppercase tracking-wide">Disputas</dt>
                <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{p.races}</dd>
              </div>
              <div className="flex items-baseline gap-1">
                <dt className="uppercase tracking-wide">Mais recente</dt>
                <dd className="tabular" style={{ color: "var(--text-secondary)" }}>{fmtDate(p.latest)}</dd>
              </div>
            </dl>
          </li>
        ))}
      </ul>

      <p className="mt-4 text-xs" style={{ color: "var(--text-muted)" }}>
        Registro oficial de todas as pesquisas eleitorais: sistema PesqEle do TSE. Pesquisas
        divulgadas sem registro violam a legislação eleitoral (Lei 9.504/1997, art. 33).
      </p>
    </div>
  );
}
