import type { Metadata } from "next";
import RaceSection from "@/components/RaceSection";
import { scenarioGroups } from "@/lib/data";

export const metadata: Metadata = {
  title: "Presidente",
  description:
    "Todas as pesquisas eleitorais para presidente do Brasil em 2026 — 1º e 2º turno, médias e tendências.",
};

export default function PresidentePage() {
  const r1 = scenarioGroups("presidente", null, 1);
  const r2 = scenarioGroups("presidente", null, 2);
  return (
    <div className="space-y-12">
      <div>
        <h1 className="text-2xl font-bold">Eleição presidencial 2026</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text-secondary)" }}>
          Médias e todas as pesquisas publicadas, por cenário testado pelos institutos.
        </p>
      </div>
      <RaceSection groups={r1} heading="1º turno" />
      <RaceSection groups={r2} heading="2º turno — confrontos diretos" />
    </div>
  );
}
