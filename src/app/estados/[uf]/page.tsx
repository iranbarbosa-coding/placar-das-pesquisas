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
      <h1 className="text-2xl font-bold">{UF_NAMES[UFU]} · Eleições 2026</h1>
      <RaceSection groups={gov1} heading="Governador — 1º turno" />
      {gov2.length > 0 && <RaceSection groups={gov2} heading="Governador — 2º turno" />}
      <RaceSection groups={sen} heading="Senado" />
    </div>
  );
}
