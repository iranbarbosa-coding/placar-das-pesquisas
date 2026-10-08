import type { Metadata } from "next";
import Link from "next/link";
import RankingInstitutos from "@/components/RankingInstitutos";
import { rankingAcerto } from "@/lib/acerto";

export const metadata: Metadata = {
  title: "Quem chegou mais perto das urnas",
  description:
    "Ranking dos institutos pelo erro da última pesquisa de cada um contra o resultado oficial do TSE no 1º turno de 2026: presidente, governadores e senadores.",
};

/**
 * Derivada: o acerto dos institutos nas três disputas (presidente, governadores,
 * senadores). A home mostra só o placar presidencial e aponta para cá (decisão
 * de Iran, 08/10); os placares estaduais vivem aqui. Server component; o cálculo
 * é o de `lib/acerto.ts`, sem nada a mais.
 */
export default function AcertoPage() {
  const data = rankingAcerto();
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/derivadas" className="hover:underline">Derivadas</Link>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>Acerto dos institutos</span>
        </nav>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Quem chegou mais perto das urnas
        </h1>
        <p className="max-w-[75ch] text-sm" style={{ color: "var(--text-secondary)" }}>
          A última pesquisa de cada instituto em cada disputa, comparada com o resultado oficial do TSE no 1º turno de 2026. Três
          placares, um por cargo. O método está na <Link href="/metodologia#acerto" className="underline">metodologia</Link>.
        </p>
      </header>
      {data ? (
        <RankingInstitutos data={data} maxRows={30} title="Placares de acerto · 1º turno" />
      ) : (
        <p className="card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          Sem resultado oficial carregado; o ranking aparece quando o TSE publicar a apuração.
        </p>
      )}
    </div>
  );
}
