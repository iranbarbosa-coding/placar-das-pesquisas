import { NextResponse } from "next/server";
import { loadDataset } from "@/lib/data";
import { allFeedAverages, feedMeta } from "@/lib/feeds";

// The master machine-readable feed: every race's average (presidente 1º e 2º
// turno, governador e senador de cada estado) in one flat, licensed file.
// Static — emitted at build time from the same store the pages render.
export const dynamic = "force-static";

export function GET() {
  const ds = loadDataset();
  return NextResponse.json(
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Médias das pesquisas — Eleições Brasil 2026",
      description:
        "Médias agregadas de intenção de voto para presidente, governador e senador nas eleições brasileiras de 2026.",
      ...feedMeta(ds.generated_at),
      averages: allFeedAverages(),
    },
    { headers: { "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
