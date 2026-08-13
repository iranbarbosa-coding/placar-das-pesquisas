import type { Metadata } from "next";
import Link from "next/link";
import { statesWithPolls, fmtDate } from "@/lib/data";
import { UFS, UF_NAMES } from "@/lib/types";

export const metadata: Metadata = {
  title: "Estados",
  description:
    "Pesquisas para governador e senador em todos os estados brasileiros nas eleições de 2026.",
};

export default function EstadosPage() {
  const withPolls = statesWithPolls();
  const have = new Map(withPolls.map((s) => [s.uf, s]));
  return (
    <div>
      <h1 className="text-2xl font-bold">Disputas estaduais 2026</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
        Governador e Senado em cada unidade da federação. Estados sem pesquisas publicadas ainda
        aparecem cinza — entram automaticamente quando houver dados.
      </p>
      <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
        {[...UFS]
          .sort((a, b) => (have.get(b)?.count ?? 0) - (have.get(a)?.count ?? 0) || a.localeCompare(b))
          .map((uf) => {
            const info = have.get(uf);
            return (
              <li key={uf}>
                <Link
                  href={`/estados/${uf.toLowerCase()}`}
                  className="card block p-3 transition-opacity hover:opacity-80"
                  style={info ? {} : { opacity: 0.55 }}
                >
                  <span className="text-sm font-semibold">{UF_NAMES[uf]}</span>
                  <span className="mt-0.5 block text-xs" style={{ color: "var(--text-muted)" }}>
                    {info
                      ? `${info.count} pesquisa${info.count === 1 ? "" : "s"} · última ${fmtDate(info.latest)}`
                      : "sem pesquisas publicadas"}
                  </span>
                </Link>
              </li>
            );
          })}
      </ul>
    </div>
  );
}
