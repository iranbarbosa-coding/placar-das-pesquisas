import { loadDataset } from "@/lib/data";
import { sortPollsDesc } from "@/lib/average";
import { csvFromRows } from "@/lib/feeds";

// Long-format CSV of every poll result (one row per candidate per poll) — the
// shape researchers and journalists open in a spreadsheet. Static.
export const dynamic = "force-static";

const HEADER = [
  "pollster", "contractor", "race", "state", "round", "scenario",
  "fieldwork_start", "fieldwork_end", "published_date", "sample_size",
  "margin_of_error", "tse_registration", "source", "source_url",
  "candidate", "party", "pct",
];

export function GET() {
  const ds = loadDataset();
  const rows: (string | number | null)[][] = [];
  for (const p of sortPollsDesc(ds.polls)) {
    for (const r of p.results) {
      rows.push([
        p.pollster, p.contractor ?? null, p.race, p.state, p.round, p.scenario,
        p.fieldwork_start, p.fieldwork_end, p.published_date ?? null, p.sample_size,
        p.margin_of_error, p.tse_registration ?? null, p.source, p.source_url,
        r.candidate, r.party, r.pct,
      ]);
    }
  }
  return new Response(csvFromRows(HEADER, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'inline; filename="placar-pesquisas-2026.csv"',
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
