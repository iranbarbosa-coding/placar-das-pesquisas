import { loadDataset } from "@/lib/data";
import { sortPollsDesc } from "@/lib/average";
import { BASE } from "@/lib/jsonld";
import { SITE_NAME, SITE_TAGLINE } from "@/lib/brand";
import type { Poll, UF } from "@/lib/types";

// RSS 2.0 of the most recent polls — the "pesquisa saiu hoje" freshness signal
// that news readers and aggregators subscribe to. Static; rebuilt each scrape.
export const dynamic = "force-static";

const RACE_LABEL: Record<string, string> = {
  presidente: "Presidente",
  governador: "Governador",
  senador: "Senador",
};

function xmlEscape(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** The on-site page a poll belongs to. */
function pollLink(p: Poll): string {
  if (p.race === "presidente") return `${BASE}/presidente`;
  if (p.state) return `${BASE}/estados/${(p.state as UF).toLowerCase()}`;
  return `${BASE}/`;
}

/** RFC-1123 date (accepted by RSS). Built from a date arg, never `new Date()`. */
function rfc822(iso: string | null | undefined, fallback: string): string {
  const src = iso ?? fallback;
  const d = new Date(src.length <= 10 ? `${src}T12:00:00Z` : src);
  return d.toUTCString();
}

export function GET() {
  const ds = loadDataset();
  const built = rfc822(ds.generated_at, ds.generated_at);
  const items = sortPollsDesc(ds.polls)
    .slice(0, 50)
    .map((p) => {
      const where = p.state ? ` (${p.state})` : "";
      const lead = [...p.results].sort((a, b) => b.pct - a.pct)[0];
      const leadTxt = lead ? ` — ${lead.candidate} ${lead.pct}%` : "";
      const title = `${RACE_LABEL[p.race] ?? p.race}${where}: ${p.pollster}${leadTxt}`;
      const desc = `Pesquisa ${p.pollster}${where} para ${RACE_LABEL[p.race] ?? p.race}${
        p.tse_registration ? `, registro TSE ${p.tse_registration}` : ""
      }. Fonte agregada: ${SITE_NAME}.`;
      const link = pollLink(p);
      const date = rfc822(p.published_date ?? p.fieldwork_end, ds.generated_at);
      return `    <item>
      <title>${xmlEscape(title)}</title>
      <link>${xmlEscape(link)}</link>
      <guid isPermaLink="false">${xmlEscape(p.id)}</guid>
      <pubDate>${date}</pubDate>
      <description>${xmlEscape(desc)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${xmlEscape(`${SITE_NAME} — Pesquisas recentes`)}</title>
    <link>${BASE}</link>
    <atom:link href="${BASE}/feed.xml" rel="self" type="application/rss+xml"/>
    <description>${xmlEscape(SITE_TAGLINE)}. Últimas pesquisas eleitorais das eleições brasileiras de 2026.</description>
    <language>pt-BR</language>
    <lastBuildDate>${built}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
