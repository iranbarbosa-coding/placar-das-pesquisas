import { loadDataset } from "@/lib/data";
import { presidentEvolution } from "@/lib/presidente";
import { candKey } from "@/lib/average";
import { displayName } from "@/lib/names";
import { fmtPct, fmtDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/brand";
import { BASE } from "@/lib/jsonld";

// The embeddable EVOLUTION widget — a self-contained HTML document with an
// inline SVG line chart of how the presidential average moved over time. Served
// from a route handler (not a page) so it does not inherit the site chrome
// inside an iframe. Companion to /embed/presidente; same rules — static,
// chrome-free, theme-aware, backlink to /presidente. CC BY 4.0.
export const dynamic = "force-static";

// The site's series palette (colors.ts), as hex, so the standalone document does
// not depend on the site's CSS variables. Assigned by rank, leader first.
const LINE = ["#2A78D6", "#EB6834", "#1BAF7A", "#EDA100"];

const W = 480, H = 300, PADL = 12, PADR = 96, PADT = 38, PADB = 26;
const PW = W - PADL - PADR, PH = H - PADT - PADB;
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// The trend series spans the WHOLE polling history (years). A tracker of the
// current race must show the recent movement, not a flat line squeezed to the
// right edge — so the chart is limited to the last N days of fieldwork.
const WINDOW_DAYS = 180;

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function ts(d: string): number {
  return new Date(`${d}T12:00:00Z`).getTime();
}
function monthLabel(t: number): string {
  const d = new Date(t);
  return MES[d.getUTCMonth()];
}

export function GET() {
  const ds = loadDataset();
  const evo = presidentEvolution();
  const avg = evo.average;
  const sig = new Set(evo.significantKeys);

  // The lines to draw: the significant candidates (fallback to top-4), each with
  // its rolling-average trend, capped at 4 so a sidebar-sized chart stays legible.
  const raw = (avg?.candidates ?? [])
    .filter((c) => (sig.size === 0 || sig.has(candKey(c.candidate))) && (c.trend?.length ?? 0) >= 2)
    .slice(0, 4)
    .map((c, i) => ({ name: c.candidate, color: LINE[i], trend: c.trend }));

  // Clip to the recent window so the chart reads the CURRENT race, not the full
  // multi-year history. Cutoff is measured from the freshest point we hold.
  const maxTs = Math.max(0, ...raw.flatMap((s) => s.trend.map((p) => ts(p.date))));
  const cutoff = maxTs - WINDOW_DAYS * 86_400_000;
  const series = raw
    .map((s) => ({ ...s, trend: s.trend.filter((p) => ts(p.date) >= cutoff) }))
    .filter((s) => s.trend.length >= 2);

  const allPts = series.flatMap((s) => s.trend);
  const hasChart = series.length > 0 && allPts.length >= 2;

  let svg = `<p class="sub">Dados insuficientes para o gráfico.</p>`;
  let asOf = ds.generated_at ? fmtDate(ds.generated_at.split("T")[0]) : "—";

  if (hasChart) {
    const xs = allPts.map((p) => ts(p.date));
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const xSpan = Math.max(1, xMax - xMin);
    const maxV = Math.max(...allPts.map((p) => p.avg));
    const yMax = Math.min(100, Math.max(50, Math.ceil(maxV / 10) * 10));

    const xOf = (t: number) => PADL + ((t - xMin) / xSpan) * PW;
    const yOf = (v: number) => PADT + (1 - v / yMax) * PH;

    // Gridlines + y labels at 0 / mid / top.
    const yTicks = [0, yMax / 2, yMax];
    const grid = yTicks
      .map((v) => {
        const y = yOf(v).toFixed(1);
        return `<line x1="${PADL}" y1="${y}" x2="${PADL + PW}" y2="${y}" class="grid"/><text x="${PADL}" y="${(yOf(v) - 3).toFixed(1)}" class="ylab">${v}%</text>`;
      })
      .join("");

    // X (month) labels — a few evenly spaced ticks across the range. When the
    // window crosses a year boundary, append the 2-digit year so two different
    // years never both read as e.g. "set".
    const crossYear = new Date(xMin).getUTCFullYear() !== new Date(xMax).getUTCFullYear();
    const nTicks = 4;
    const xlabs = Array.from({ length: nTicks }, (_, i) => {
      const t = xMin + (xSpan * i) / (nTicks - 1);
      const anchor = i === 0 ? "start" : i === nTicks - 1 ? "end" : "middle";
      const d = new Date(t);
      const lab = crossYear ? `${monthLabel(t)}/${String(d.getUTCFullYear()).slice(2)}` : monthLabel(t);
      return `<text x="${xOf(t).toFixed(1)}" y="${H - 8}" class="xlab" text-anchor="${anchor}">${lab}</text>`;
    }).join("");

    // One polyline per candidate.
    const lines = series
      .map((s) => {
        const pts = [...s.trend]
          .sort((a, b) => ts(a.date) - ts(b.date))
          .map((p) => `${xOf(ts(p.date)).toFixed(1)},${yOf(p.avg).toFixed(1)}`)
          .join(" ");
        return `<polyline points="${pts}" fill="none" stroke="${s.color}" stroke-width="2.2" stroke-linejoin="round" stroke-linecap="round"/>`;
      })
      .join("");

    // End labels (name + current %), de-collided vertically so the two small
    // candidates near the bottom don't overprint each other.
    const labs = series
      .map((s) => {
        const last = [...s.trend].sort((a, b) => ts(a.date) - ts(b.date)).at(-1)!;
        return { name: displayName(s.name), color: s.color, y: yOf(last.avg), pct: last.avg };
      })
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) {
      if (labs[i].y - labs[i - 1].y < 15) labs[i].y = labs[i - 1].y + 15;
    }
    const endLabels = labs
      .map(
        (l) =>
          `<text x="${PADL + PW + 8}" y="${(l.y + 4).toFixed(1)}" class="end" fill="${l.color}">${esc(l.name)} <tspan class="endpct">${fmtPct(l.pct)}%</tspan></text>`,
      )
      .join("");

    svg = `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolução da média presidencial">
      ${grid}${xlabs}${lines}${endLabels}
    </svg>`;
  }

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Evolução — Presidente 2026 · ${esc(SITE_NAME)}</title>
<style>
  :root{ --bg:#fff; --card:#fff; --ink:#0f172a; --muted:#64748b; --soft:#94a3b8; --line:#e2e8f0; --grid:#eef2f7; --accent:#1d4ed8; color-scheme:light dark; }
  @media (prefers-color-scheme: dark){
    :root{ --bg:#0b1220; --card:#0f172a; --ink:#e5edff; --muted:#93a4c3; --soft:#6b7d9c; --line:#1e2a44; --grid:#16213a; --accent:#6ea8ff; }
  }
  *{box-sizing:border-box} html,body{margin:0}
  body{background:transparent;font:14px/1.4 system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:var(--ink)}
  .w{max-width:520px;margin:0 auto;background:var(--card);border:1px solid var(--line);border-radius:12px;padding:16px}
  h1{font-size:15px;margin:0 0 2px;font-weight:800;letter-spacing:-.01em}
  .cap{margin:0 0 8px;font-size:11px;color:var(--soft)}
  svg{display:block;overflow:visible}
  .grid{stroke:var(--grid);stroke-width:1}
  .ylab{fill:var(--soft);font-size:9px}
  .xlab{fill:var(--muted);font-size:9.5px}
  .end{font-size:10.5px;font-weight:600}
  .endpct{font-weight:800}
  .sub{margin:16px 0;font-size:12px;color:var(--soft);text-align:center}
  .src{margin:12px 0 0;padding-top:11px;border-top:1px solid var(--line);font-size:11px}
  .src a{color:var(--accent);font-weight:700;text-decoration:none}
  .src a:hover{text-decoration:underline}
</style>
</head>
<body>
  <div class="w">
    <h1>Evolução — Presidente 2026</h1>
    <p class="cap">Média das pesquisas · 1º turno · votos válidos · últimos 6 meses · atual. ${esc(asOf)}</p>
    ${svg}
    <p class="src"><a href="${BASE}/presidente" target="_blank" rel="noopener">Fonte: ${esc(SITE_NAME)} ↗</a></p>
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
