import { NextResponse } from "next/server";
import { loadDataset, scenarioGroups } from "@/lib/data";
import { averageToFeed, feedMeta } from "@/lib/feeds";

// Presidential 2nd-round feed: one entry per head-to-head pairing, each with its
// average and the polls that composed it. Parallels /api/presidente.json. Static.
export const dynamic = "force-static";

export function GET() {
  const ds = loadDataset();
  const groups = scenarioGroups("presidente", null, 2).filter((g) => g.average);

  const scenarios = groups.map((g) => {
    const inWindow = new Set(g.average!.windowPollIds);
    return {
      ...averageToFeed("presidente", null, 2, g.average!),
      polls: g.polls
        .filter((p) => inWindow.has(p.id))
        .map((p) => ({
          pollster: p.pollster,
          fieldwork_end: p.fieldwork_end,
          sample_size: p.sample_size,
          margin_of_error: p.margin_of_error,
          tse_registration: p.tse_registration ?? null,
          source_url: p.source_url,
          results: p.results,
        })),
    };
  });

  return NextResponse.json(
    {
      "@context": "https://schema.org",
      "@type": "Dataset",
      name: "Simulações de 2º turno — Presidente, Brasil 2026",
      description:
        "Médias das simulações de segundo turno para presidente da República nas eleições brasileiras de 2026, por confronto, e as pesquisas que compõem cada média.",
      ...feedMeta(ds.generated_at),
      scenarios,
    },
    { headers: { "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" } },
  );
}
