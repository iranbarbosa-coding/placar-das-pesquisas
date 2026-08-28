import { loadDataset } from "@/lib/data";
import { allFeedAverages, csvFromRows } from "@/lib/feeds";

// Long-format CSV of every average (one row per candidate per race average).
// Static.
export const dynamic = "force-static";

const HEADER = [
  "race", "state", "round", "scenario", "basis", "poll_count", "last_poll_date",
  "candidate", "party", "avg", "latest", "n_polls",
];

export function GET() {
  loadDataset();
  const rows: (string | number | null)[][] = [];
  for (const a of allFeedAverages()) {
    for (const c of a.candidates) {
      rows.push([
        a.race, a.state, a.round, a.scenario, a.basis, a.poll_count, a.last_poll_date,
        c.candidate, c.party, c.avg, c.latest, c.n_polls,
      ]);
    }
  }
  return new Response(csvFromRows(HEADER, rows), {
    headers: {
      "content-type": "text/csv; charset=utf-8",
      "content-disposition": 'inline; filename="placar-medias-2026.csv"',
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
