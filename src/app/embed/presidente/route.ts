import { loadDataset, scenarioGroups } from "@/lib/data";
import { displayName } from "@/lib/names";
import { fmtPct, fmtDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/brand";
import { BASE, LICENSE_NAME, LICENSE_URL } from "@/lib/jsonld";

// The embeddable "média" widget — a self-contained HTML document other sites
// drop into an <iframe>. Served from a ROUTE HANDLER (not a page) on purpose:
// a page would inherit the root layout's masthead + footer, which must not
// appear inside someone else's sidebar. Fully static, chrome-free, theme-aware,
// and its only job beyond showing the number is the backlink to /presidente —
// every embed is an attributed link home. CC BY 4.0.
export const dynamic = "force-static";

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function GET() {
  const avg = scenarioGroups("presidente", null, 1)[0]?.average ?? null;
  const ds = loadDataset();
  const top = avg?.candidates.slice(0, 4) ?? [];
  const updated = ds.generated_at ? fmtDate(ds.generated_at.split("T")[0]) : "—";

  const rows =
    avg && top.length
      ? top
          .map(
            (c) => `<li>
        <span class="nm">${esc(displayName(c.candidate))}${c.party ? `<span class="pt"> ${esc(c.party)}</span>` : ""}</span>
        <span class="pc">${fmtPct(c.avg)}%</span>
      </li>`,
          )
          .join("")
      : "";

  const bodyInner =
    avg && top.length
      ? `<ul class="cands">${rows}</ul>
      <p class="meta">Diferença do líder para o 2º: <strong>${fmtPct(avg.spread)} pt</strong></p>
      <p class="sub">Média de ${avg.pollCount} ${avg.pollCount === 1 ? "pesquisa" : "pesquisas"} · atualizado em ${esc(updated)}</p>`
      : `<p class="sub">Dados indisponíveis.</p>`;

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Média — Presidente 2026 · ${esc(SITE_NAME)}</title>
<style>
  :root{
    --bg:#ffffff; --card:#ffffff; --ink:#0f172a; --muted:#64748b; --soft:#94a3b8;
    --line:#e2e8f0; --accent:#1d4ed8;
    color-scheme:light dark;
  }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#0b1220; --card:#0f172a; --ink:#e5edff; --muted:#93a4c3; --soft:#6b7d9c; --line:#1e2a44; --accent:#6ea8ff; }
  }
  *{box-sizing:border-box}
  html,body{margin:0}
  body{background:transparent;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink)}
  .w{max-width:480px;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
  h1{font-size:15px;margin:0 0 12px;font-weight:800;letter-spacing:-.01em}
  ul.cands{list-style:none;margin:0;padding:0;display:flex;flex-direction:column;gap:7px}
  ul.cands li{display:flex;align-items:baseline;justify-content:space-between;gap:12px}
  .nm{min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .pt{color:var(--soft);font-size:12px}
  .pc{flex:none;font-weight:700;color:var(--accent);font-variant-numeric:tabular-nums}
  .meta{margin:12px 0 0;font-size:12px;color:var(--muted)}
  .sub{margin:4px 0 0;font-size:12px;color:var(--soft)}
  .src{margin:14px 0 0;padding-top:12px;border-top:1px solid var(--line);font-size:12px}
  .src a{color:var(--accent);font-weight:700;text-decoration:none}
  .src a:hover{text-decoration:underline}
</style>
</head>
<body>
  <div class="w">
    <h1>Média — Presidente 2026</h1>
    ${bodyInner}
    <p class="src"><a href="${BASE}/presidente" target="_blank" rel="noopener">Fonte: ${esc(SITE_NAME)} ↗</a></p>
  </div>
</body>
</html>`;

  return new Response(html, {
    headers: {
      "content-type": "text/html; charset=utf-8",
      // Explicitly allow any site to frame this widget — that is its purpose.
      "content-security-policy": "frame-ancestors *",
      "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
