import { loadDataset } from "@/lib/data";
import { presidentEvolution } from "@/lib/presidente";
import { candKey } from "@/lib/average";
import { displayName } from "@/lib/names";
import { fmtPct, fmtDate } from "@/lib/format";
import { SITE_NAME } from "@/lib/brand";
import { EMBED_CSS, ICON_CLOCK, candClass, embedFooter, winPill, esc } from "@/lib/embed";

// The embeddable EVOLUTION widget — a self-contained HTML document with an
// inline SVG line chart of how the presidential average moved over time. Served
// from a route handler (not a page) so it does not inherit the site chrome
// inside an iframe. Companion to /embed/presidente; same design family. CC BY 4.0.
export const dynamic = "force-static";

const W = 480, H = 300, PADL = 12, PADR = 100, PADT = 14, PADB = 26;
const PW = W - PADL - PADR, PH = H - PADT - PADB;
const MES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
// The trend series spans the whole polling history (years); a tracker of the
// current race must show the recent movement, so the chart is clipped to a window.
const WINDOW_DAYS = 180;

function ts(d: string): number {
  return new Date(`${d}T12:00:00Z`).getTime();
}
function monthLabel(t: number): string {
  return MES[new Date(t).getUTCMonth()];
}

export function GET() {
  const ds = loadDataset();
  const evo = presidentEvolution();
  const avg = evo.average;
  const sig = new Set(evo.significantKeys);

  const rawSeries = (avg?.candidates ?? [])
    .filter((c) => (sig.size === 0 || sig.has(candKey(c.candidate))) && (c.trend?.length ?? 0) >= 2)
    .slice(0, 4)
    .map((c) => ({ name: c.candidate, cls: candClass(c.candidate), trend: c.trend }));

  // Clip to the recent window so the chart reads the CURRENT race, not the full
  // multi-year history. Cutoff is measured from the freshest point we hold.
  const maxTs = Math.max(0, ...rawSeries.flatMap((s) => s.trend.map((p) => ts(p.date))));
  const cutoff = maxTs - WINDOW_DAYS * 86_400_000;
  const series = rawSeries
    .map((s) => ({ ...s, trend: s.trend.filter((p) => ts(p.date) >= cutoff) }))
    .filter((s) => s.trend.length >= 2);

  const allPts = series.flatMap((s) => s.trend);
  const hasChart = series.length > 0 && allPts.length >= 2;

  let chart = `<p class="na">Dados insuficientes para o gráfico.</p>`;

  if (hasChart) {
    const xs = allPts.map((p) => ts(p.date));
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const xSpan = Math.max(1, xMax - xMin);
    const maxV = Math.max(...allPts.map((p) => p.avg));
    const yMax = Math.min(100, Math.max(50, Math.ceil(maxV / 10) * 10));

    const xOf = (t: number) => PADL + ((t - xMin) / xSpan) * PW;
    const yOf = (v: number) => PADT + (1 - v / yMax) * PH;

    const grid = [0, yMax / 2, yMax]
      .map((v) => {
        const y = yOf(v).toFixed(1);
        return `<line x1="${PADL}" y1="${y}" x2="${PADL + PW}" y2="${y}" class="grid"/><text x="${PADL}" y="${(yOf(v) - 4).toFixed(1)}" class="ylab">${v}%</text>`;
      })
      .join("");

    const crossYear = new Date(xMin).getUTCFullYear() !== new Date(xMax).getUTCFullYear();
    const nTicks = 4;
    const xlabs = Array.from({ length: nTicks }, (_, i) => {
      const t = xMin + (xSpan * i) / (nTicks - 1);
      const anchor = i === 0 ? "start" : i === nTicks - 1 ? "end" : "middle";
      const d = new Date(t);
      const lab = crossYear ? `${monthLabel(t)}/${String(d.getUTCFullYear()).slice(2)}` : monthLabel(t);
      return `<text x="${xOf(t).toFixed(1)}" y="${H - 8}" class="xlab" text-anchor="${anchor}">${lab}</text>`;
    }).join("");

    const lines = series
      .map((s) => {
        const pts = [...s.trend]
          .sort((a, b) => ts(a.date) - ts(b.date))
          .map((p) => `${xOf(ts(p.date)).toFixed(1)},${yOf(p.avg).toFixed(1)}`)
          .join(" ");
        return `<polyline class="${s.cls}" points="${pts}"/>`;
      })
      .join("");

    const labs = series
      .map((s) => {
        const last = [...s.trend].sort((a, b) => ts(a.date) - ts(b.date)).at(-1)!;
        return { name: displayName(s.name), cls: s.cls, y: yOf(last.avg), pct: last.avg };
      })
      .sort((a, b) => a.y - b.y);
    for (let i = 1; i < labs.length; i++) {
      if (labs[i].y - labs[i - 1].y < 15) labs[i].y = labs[i - 1].y + 15;
    }
    const endLabels = labs
      .map(
        (l) =>
          `<text x="${PADL + PW + 8}" y="${(l.y + 4).toFixed(1)}" class="end ${l.cls}">${esc(l.name)} <tspan class="endpct">${fmtPct(l.pct)}%</tspan></text>`,
      )
      .join("");

    chart = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Evolução da média presidencial">${grid}${xlabs}${lines}${endLabels}</svg></div>`;
  }

  const html = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>Evolução — Presidente 2026 · ${esc(SITE_NAME)}</title>
<style>${EMBED_CSS}
  .w{max-width:520px}
  .etitle{font-size:21px;font-weight:800;letter-spacing:-.02em;margin:0;line-height:1.12}
  .esub{margin:5px 0 0;font-size:13px;color:var(--muted)}
  .chart{margin:14px 0 2px;flex:1 1 0;min-height:120px;display:flex}
  .chart svg{display:block;width:100%;height:100%;overflow:visible}
  .chart .grid{stroke:var(--line);stroke-width:1}
  .chart .ylab{fill:var(--soft);font-size:10px}
  .chart .xlab{fill:var(--muted);font-size:10.5px}
  .chart polyline{fill:none;stroke-width:2.6;stroke-linejoin:round;stroke-linecap:round}
  .chart .end{font-size:11px;font-weight:700}
  .chart .endpct{font-weight:800}
</style>
</head>
<body>
  <div class="w">
    <h1 class="etitle">Evolução — Presidente 2026</h1>
    <p class="esub">1º turno · votos válidos · últimos 6 meses</p>
    ${chart}
    ${avg && avg.candidates.length ? winPill(avg.candidates[0].avg) : ""}
    ${
      avg
        ? `<div class="callout meta">${ICON_CLOCK}<span>Evolução da média de ${avg.pollCount} ${avg.pollCount === 1 ? "pesquisa" : "pesquisas"} · atualizado em ${esc(ds.generated_at ? fmtDate(ds.generated_at.split("T")[0]) : "—")}</span></div>`
        : ""
    }
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
