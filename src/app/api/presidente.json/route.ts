import { NextResponse } from "next/server";
import { loadDataset, scenarioGroups } from "@/lib/data";
import { BASE, LICENSE_NAME, LICENSE_URL } from "@/lib/jsonld";
import { SITE_NAME } from "@/lib/brand";

// A machine-readable feed of the presidential average — the citable, reusable
// artefact the paywalled incumbents do not offer. Fully static: emitted at build
// time from the same NDJSON store the pages render, so it can never drift from
// /presidente, and served straight from the CDN.
export const dynamic = "force-static";

export function GET() {
  const ds = loadDataset();
  const group = scenarioGroups("presidente", null, 1)[0] ?? null;
  const avg = group?.average ?? null;
  const inWindow = new Set(avg?.windowPollIds ?? []);

  // The polls actually inside the average — the provenance behind every number.
  const polls = (group?.polls ?? [])
    .filter((p) => inWindow.has(p.id))
    .map((p) => ({
      pollster: p.pollster,
      fieldwork_start: p.fieldwork_start,
      fieldwork_end: p.fieldwork_end,
      sample_size: p.sample_size,
      margin_of_error: p.margin_of_error,
      tse_registration: p.tse_registration ?? null,
      source: p.source,
      source_url: p.source_url,
      results: p.results,
    }));

  const body = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Média das pesquisas — Presidente da República, Brasil 2026",
    description:
      "Média agregada das pesquisas de intenção de voto para presidente (1º turno, votos válidos) e as pesquisas que a compõem.",
    license: LICENSE_URL,
    license_name: LICENSE_NAME,
    isAccessibleForFree: true,
    attribution: `Fonte: ${SITE_NAME} (${BASE}). Licença ${LICENSE_NAME}. Números pertencem aos institutos citados; agregação e computação próprias.`,
    provider: SITE_NAME,
    url: `${BASE}/presidente`,
    methodology_url: `${BASE}/metodologia`,
    generated_at: ds.generated_at,
    average: avg
      ? {
          scenario: avg.scenario,
          basis: avg.basis,
          poll_count: avg.pollCount,
          last_poll_date: avg.lastPollDate,
          spread: avg.spread,
          candidates: avg.candidates.map((c) => ({
            candidate: c.candidate,
            party: c.party,
            avg: c.avg,
            latest: c.latestPct,
            n_polls: c.nPolls,
          })),
        }
      : null,
    polls,
  };

  return NextResponse.json(body, {
    headers: { "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" },
  });
}
