import { loadDataset, scenarioGroups } from "@/lib/data";
import { displayName } from "@/lib/names";
import { fmtPct, fmtDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/brand";
import { EMBED_CSS, ICON_BAR, ICON_CLOCK, candClass, embedFooter, winPill, esc } from "@/lib/embed";

// The embeddable "média" widget — a self-contained HTML document other sites
// drop into an <iframe>. Served from a ROUTE HANDLER (not a page) so it does not
// inherit the site chrome inside someone's sidebar. Static, chrome-free,
// theme-aware, backlink to /presidente. CC BY 4.0.
export const dynamic = "force-static";

export function GET() {
  const avg = scenarioGroups("presidente", null, 1)[0]?.average ?? null;
  const ds = loadDataset();
  const top = avg?.candidates.slice(0, 4) ?? [];
  const updated = ds.generated_at ? fmtDate(ds.generated_at.split("T")[0]) : "—";

  const body =
    avg && top.length
      ? `<div class="rows">${top
          .map(
            (c) =>
              `<div class="row"><span class="nm">${esc(displayName(c.candidate))}${
                c.party ? `<span class="pt">${esc(c.party)}</span>` : ""
              }</span><span class="pc ${candClass(c.candidate)}">${fmtPct(c.avg)}%</span></div>`,
          )
          .join("")}</div>
      ${winPill(avg.candidates[0].avg)}
      <div class="callout meta">${ICON_CLOCK}<span>Média de ${avg.pollCount} ${avg.pollCount === 1 ? "pesquisa" : "pesquisas"} · atualizado em ${esc(updated)}</span></div>`
      : `<p class="na">Dados indisponíveis.</p>`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Média — Presidente 2026 · ${esc(SITE_NAME)}</title>
<style>${EMBED_CSS}
  .rows{margin-top:14px}
  .row{display:flex;align-items:baseline;justify-content:space-between;gap:12px;
    padding:11px 0;border-top:1px solid var(--line)}
  .row:first-child{border-top:none;padding-top:4px}
  .nm{font-size:18px;font-weight:700;color:var(--ink);min-width:0}
  .nm .pt{font-size:14px;font-weight:500;color:var(--soft);margin-left:7px}
  .pc{flex:none;font-size:26px;font-weight:800;letter-spacing:-.02em;font-variant-numeric:tabular-nums}
</style>
</head>
<body>
  <div class="w">
    <div class="hd"><span class="ic">${ICON_BAR}</span><div class="hgroup"><h1>Média — Presidente 2026</h1></div></div>
    ${body}
    ${embedFooter()}
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      "content-security-policy": "frame-ancestors *",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
