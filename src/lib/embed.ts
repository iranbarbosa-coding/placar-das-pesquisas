// Shared building blocks for the embeddable widgets (/embed/*). Kept in one
// place so the média and evolução cards read as one design family: the same
// card, the same identity colours, the same "Fonte" footer.
import { SITE_NAME } from "./brand";
import { BASE } from "./jsonld";
import { fmtPct } from "./format";

export function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// Identity colours by candidate (owner's spec): Lula red, Flávio blue, Renan
// yellow, Caiado green; anyone else falls back to a neutral tone. The class sets
// color (HTML text), stroke (chart line) and fill (SVG label) at once.
export function candClass(name: string): string {
  const n = name.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  if (n.includes("lula")) return "c-red";
  if (n.includes("flavio")) return "c-blue";
  if (n.includes("renan")) return "c-yellow";
  if (n.includes("caiado")) return "c-green";
  return "c-alt";
}

export const ICON_BAR = `<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="12" width="4" height="8" rx="1.3"/><rect x="10" y="6.5" width="4" height="13.5" rx="1.3"/><rect x="16.5" y="9.5" width="4" height="10.5" rx="1.3"/></svg>`;
export const ICON_LINE = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3.5 15.5l5-5 4 3 7.5-8" stroke="currentColor" stroke-width="2.1" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.5 20h17" stroke="currentColor" stroke-width="2.1" stroke-linecap="round"/></svg>`;
export const ICON_INFO = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.9"/><circle cx="12" cy="8" r="1.15" fill="currentColor"/><path d="M12 11.2v5.2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/></svg>`;
export const ICON_CLOCK = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" stroke-width="1.9"/><path d="M12 7.3v5l3.2 2" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
export const ICON_EXT = `<svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M14 4.5h5.5V10" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 5l-8.6 8.6" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M18 13.5V18A1.8 1.8 0 0 1 16.2 19.8H6A1.8 1.8 0 0 1 4.2 18V7.8A1.8 1.8 0 0 1 6 6h4.5" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/></svg>`;

// Design tokens + shared component styles for both widgets.
export const EMBED_CSS = `
  :root{
    --card:#FFFFFF; --ink:#0F172A; --muted:#64748B; --soft:#94A3B8;
    --line:#E9ECF1; --accent:#2563EB; --accent-soft:#EEF2FF; --pill:#F3F4F6;
    --red:#DC2626; --blue:#2563EB; --yellow:#B7860B; --green:#16A34A; --alt:#6D5AE6;
    color-scheme:light dark;
  }
  @media (prefers-color-scheme: dark){
    :root{
      --card:#111A2E; --ink:#EAF0FF; --muted:#9AA6BF; --soft:#6B7794;
      --line:#22304C; --accent:#7DA0FF; --accent-soft:#1B2542; --pill:#151F33;
      --red:#F87171; --blue:#7DA0FF; --yellow:#F5C518; --green:#4ADE80; --alt:#A99BFF;
    }
  }
  *{box-sizing:border-box} html,body{margin:0}
  body{background:transparent;color:var(--ink);-webkit-font-smoothing:antialiased;
    font:15px/1.45 system-ui,-apple-system,"Segoe UI",Roboto,Helvetica,Arial,sans-serif}
  .w{max-width:460px;margin:0 auto;background:var(--card);border:1px solid var(--line);
    border-radius:18px;padding:22px 22px 18px;
    box-shadow:0 1px 2px rgba(15,23,42,.04),0 6px 20px rgba(15,23,42,.05);
    display:flex;flex-direction:column;min-height:540px}
  .hd{display:flex;align-items:center;gap:12px}
  .hd .ic{width:42px;height:42px;border-radius:12px;background:var(--accent-soft);
    display:grid;place-items:center;flex:none}
  .hd .ic svg{width:22px;height:22px;fill:var(--accent);stroke:var(--accent)}
  .hd .hgroup{min-width:0}
  .hd h1{font-size:21px;font-weight:800;letter-spacing:-.02em;margin:0;line-height:1.12}
  .hd .subt{margin:3px 0 0;font-size:13px;color:var(--muted)}
  .c-red{color:var(--red);stroke:var(--red);fill:var(--red)}
  .c-blue{color:var(--blue);stroke:var(--blue);fill:var(--blue)}
  .c-yellow{color:var(--yellow);stroke:var(--yellow);fill:var(--yellow)}
  .c-green{color:var(--green);stroke:var(--green);fill:var(--green)}
  .c-alt{color:var(--alt);stroke:var(--alt);fill:var(--alt)}
  .callout{display:flex;align-items:center;gap:11px;padding:12px 14px;border-radius:12px;
    font-size:14px;line-height:1.35}
  .callout svg{width:18px;height:18px;flex:none}
  .callout.info{background:var(--accent-soft);color:var(--ink);margin-top:16px}
  .callout.info svg{color:var(--accent)}
  .callout.info b{font-weight:700}
  .callout.meta{background:var(--pill);color:var(--muted);margin-top:9px}
  .callout.meta svg{color:var(--soft)}
  .ft{margin-top:auto;padding-top:15px;border-top:1px solid var(--line)}
  .ft a{display:inline-flex;align-items:center;gap:9px;color:var(--accent);
    font-weight:700;font-size:14.5px;text-decoration:none}
  .ft a:hover{text-decoration:underline}
  .ft a svg{width:16px;height:16px;flex:none}
  .na{margin:16px 0;color:var(--soft);font-size:13.5px;text-align:center}
`;

export function embedFooter(): string {
  return `<div class="ft"><a href="${BASE}/presidente" target="_blank" rel="noopener">${ICON_EXT}Fonte: ${esc(SITE_NAME)} <span aria-hidden="true">↗</span></a></div>`;
}

// The "distance to a 1st-round win" callout. In valid votes a candidate wins in
// the first round with more than 50%, so the gap the leader still needs is
// 50 − leader. Shared by both widgets.
export function winPill(leaderPct: number): string {
  const gap = 50 - leaderPct;
  const inner =
    gap <= 0
      ? `Líder já passa de <b>50%</b> dos votos válidos`
      : `Líder a <b>${fmtPct(gap)} pt</b> de vencer no 1º turno`;
  return `<div class="callout info">${ICON_INFO}<span>${inner}</span></div>`;
}
