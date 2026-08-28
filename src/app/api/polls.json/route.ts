import { NextResponse } from "next/server";
import { loadDataset } from "@/lib/data";
import { sortPollsDesc } from "@/lib/average";
import { feedMeta, pollToFeed } from "@/lib/feeds";

// The full poll catalogue — every normalized poll we hold, newest first, with
// its provenance (pollster, TSE registration, source URL). Static.
export const dynamic = "force-static";

export function GET() {
  const ds = loadDataset();
  const polls = sortPollsDesc(ds.polls).map(pollToFeed);
  return NextResponse.json(
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Pesquisas eleitorais catalogadas — Brasil 2026",
      description:
        "Catálogo completo das pesquisas de intenção de voto das eleições brasileiras de 2026 compiladas pelo Placar das Pesquisas, com fonte e registro TSE de cada uma.",
      ...feedMeta(ds.generated_at),
      count: polls.length,
      polls,
    },
    { headers: { "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
