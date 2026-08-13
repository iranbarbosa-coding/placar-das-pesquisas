import type { Metadata } from "next";
import { notFound } from "next/navigation";
import RaceSection from "@/components/RaceSection";
import { scenarioGroups } from "@/lib/data";
import { UFS, UF_NAMES, type UF } from "@/lib/types";

export function generateStaticParams() {
  return UFS.map((uf) => ({ uf: uf.toLowerCase() }));
}

export async function generateMetadata({ params }: { params: Promise<{ uf: string }> }): Promise<Metadata> {
  const { uf } = await params;
  const UFU = uf.toUpperCase() as UF;
  if (!UFS.includes(UFU)) return {};
  return {
    title: `${UF_NAMES[UFU]} — Governador e Senado`,
    description: `Pesquisas eleitorais 2026 em ${UF_NAMES[UFU]}: governador e senador, médias e tendências.`,
  };
}

export default async function EstadoPage({ params }: { params: Promise<{ uf: string }> }) {
  const { uf } = await params;
  const UFU = uf.toUpperCase() as UF;
  if (!UFS.includes(UFU)) notFound();

  const gov1 = scenarioGroups("governador", UFU, 1);
  const gov2 = scenarioGroups("governador", UFU, 2);
  const sen = scenarioGroups("senador", UFU, 1);

  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold">{UF_NAMES[UFU]} · Eleições 2026</h1>
        <nav className="mt-4 inline-flex flex-wrap gap-1 rounded-lg border p-1 text-sm font-medium" style={{ borderColor: "var(--ring)", background: "var(--surface-1)" }}>
          <a href="#turno1" className="rounded-md px-3 py-1 hover:underline">Governador · 1º turno</a>
          {gov2.length > 0 && <a href="#turno2" className="rounded-md px-3 py-1 hover:underline">2º turno</a>}
          <a href="#senado" className="rounded-md px-3 py-1 hover:underline">Senado</a>
          {gov2.length > 0 && (
            <a href="/segundo-turno" className="rounded-md px-3 py-1 hover:underline" style={{ color: "var(--accent)" }}>
              Todos os confrontos →
            </a>
          )}
        </nav>
      </div>
      <div id="turno1" className="scroll-mt-20">
        <RaceSection groups={gov1} heading="Governador — 1º turno" />
      </div>
      {gov2.length > 0 && (
        <div id="turno2" className="scroll-mt-20">
          <RaceSection groups={gov2} heading="Governador — 2º turno" />
        </div>
      )}
      <div id="senado" className="scroll-mt-20">
        <RaceSection groups={sen} heading="Senado" />
      </div>
    </div>
  );
}
