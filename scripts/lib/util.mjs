import crypto from "node:crypto";

export function pollId(p) {
  const key = [
    p.pollster?.toLowerCase().trim(),
    p.race,
    p.state ?? "BR",
    p.round,
    p.fieldwork_end ?? p.published_date ?? "",
    p.scenario?.toLowerCase().trim(),
  ].join("|");
  return crypto.createHash("sha1").update(key).digest("hex").slice(0, 12);
}

export function parsePct(s) {
  if (s == null) return null;
  const m = String(s).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  return m ? Number(m[0]) : null;
}

export function parseIntSafe(s) {
  if (s == null) return null;
  const m = String(s).replace(/[.\s]/g, "").match(/\d+/);
  return m ? Number(m[0]) : null;
}

const MONTHS = {
  jan: 1, janeiro: 1, fev: 2, fevereiro: 2, mar: 3, "março": 3, marco: 3,
  abr: 4, abril: 4, mai: 5, maio: 5, jun: 6, junho: 6, jul: 7, julho: 7,
  ago: 8, agosto: 8, set: 9, setembro: 9, out: 10, outubro: 10,
  nov: 11, novembro: 11, dez: 12, dezembro: 12,
};

function iso(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/**
 * Parse Brazilian/Wikipedia date-range strings into {start, end} ISO dates.
 * Handles: "10–12 de agosto de 2026", "30 de jul – 2 de ago de 2026",
 * "12/08/2026", "5 de maio de 2026", "12–14 ago 2026".
 */
export function parseDateRange(s, defaultYear = 2026) {
  if (!s) return { start: null, end: null };
  const txt = String(s)
    .replace(/\[[^\]]*\]/g, "")
    .replace(/de\s+/gi, " ")
    .replace(/[–—−]/g, "-")
    .toLowerCase()
    .trim();

  // dd/mm/yyyy (possibly a range "a"/"-" separated)
  const slash = [...txt.matchAll(/(\d{1,2})\/(\d{1,2})(?:\/(\d{4}))?/g)];
  if (slash.length) {
    const parts = slash.map((m) => iso(m[3] ?? defaultYear, m[2], m[1]));
    return { start: parts[0], end: parts[parts.length - 1] };
  }

  const year = txt.match(/(20\d{2})/)?.[1] ?? String(defaultYear);
  const monthMatches = [...txt.matchAll(/(jan|fev|mar[çc]?o?|abr|mai|jun|jul|ago|set|out|nov|dez)\w*/g)];
  const dayMatches = [...txt.matchAll(/\b(\d{1,2})\b(?!\d)/g)]
    .map((m) => Number(m[1]))
    .filter((d) => d >= 1 && d <= 31);

  if (!monthMatches.length || !dayMatches.length) return { start: null, end: null };

  const mLast = MONTHS[monthMatches[monthMatches.length - 1][1]] ?? MONTHS[monthMatches[monthMatches.length - 1][0]?.slice(0, 3)];
  const mFirst = MONTHS[monthMatches[0][1]] ?? MONTHS[monthMatches[0][0]?.slice(0, 3)];
  if (!mFirst || !mLast) return { start: null, end: null };

  const dFirst = dayMatches[0];
  const dLast = dayMatches.length > 1 ? dayMatches[dayMatches.length - 1] : dayMatches[0];
  // Days that are actually the year (e.g. matched "20" from "2026") were filtered by <=31.
  const start = iso(year, monthMatches.length > 1 ? mFirst : mLast, dFirst);
  const end = iso(year, mLast, dLast);
  return { start: start <= end ? start : end, end };
}

/** Fetch with timeout + retry; returns Response or throws after attempts. */
export async function fetchRetry(url, { attempts = 3, timeoutMs = 30000, headers = {} } = {}) {
  let lastErr;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url, {
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          "user-agent":
            "PlacarDasPesquisas/1.0 (agregador de pesquisas eleitorais; contato via repositório)",
          ...headers,
        },
      });
      if (res.ok) return res;
      lastErr = new Error(`HTTP ${res.status} for ${url}`);
      if (res.status >= 400 && res.status < 500 && res.status !== 429) throw lastErr;
    } catch (e) {
      lastErr = e;
    }
    await new Promise((r) => setTimeout(r, 2000 * (i + 1)));
  }
  throw lastErr;
}
