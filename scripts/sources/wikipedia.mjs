// Wikipedia source: shells out to scripts/wiki_parse.py (stdlib-only Python),
// which downloads and parses all pages in scripts/wiki-pages.json — the PT+EN
// presidential polling pages plus the 27 state pages (governor + senate).
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { pollId } from "../lib/util.mjs";

const HERE = path.dirname(fileURLToPath(import.meta.url));

export async function fetchWikipedia() {
  const out = execFileSync(
    "python3",
    [path.join(HERE, "..", "wiki_parse.py"), path.join(HERE, "..", "wiki-pages.json")],
    { maxBuffer: 128 * 1024 * 1024, timeout: 10 * 60_000, encoding: "utf-8" },
  );
  const raw = JSON.parse(out);

  const polls = [];
  const seen = new Set();
  for (const p of raw) {
    // PT and EN presidential pages overlap heavily (EN is mostly a translation
    // of PT) — prefer PT by processing order in wiki-pages.json and skipping
    // near-duplicates on (pollster, race, round, end-date, roster).
    if (!p.pollster || !Array.isArray(p.results) || !p.results.length) continue;
    const roster = p.results.map((r) => r.candidate.toLowerCase().trim()).sort().join("~");
    const dupKey = [p.pollster.toLowerCase().trim(), p.race, p.state ?? "BR", p.round, p.fieldwork_end ?? "?", roster].join("|");
    if (seen.has(dupKey)) continue;
    seen.add(dupKey);

    // Null out mis-parsed dates ("0026-02-25", "2005-12-12") instead of
    // failing the whole dataset — the poll survives, clearly undated.
    const dateOk = (d) => (d && d >= "2023-01-01" && d <= "2027-01-01" ? d : null);
    p.fieldwork_start = dateOk(p.fieldwork_start);
    p.fieldwork_end = dateOk(p.fieldwork_end);

    const norm = {
      id: "",
      source: "wikipedia",
      source_url: p.source_url,
      race: p.race,
      state: p.state ?? null,
      round: p.round === 2 ? 2 : 1,
      scenario: p.scenario ?? (p.round === 2 ? "2º turno" : "1º turno — cenário único"),
      // O estímulo declarado pela página ("Todos os cenários se referem a
      // pesquisas estimuladas" — ver wiki_parse.py); sem declaração, nulo (§4).
      stimulus: p.stimulus ?? null,
      pollster: p.pollster.trim(),
      contractor: p.contractor ?? null,
      fieldwork_start: p.fieldwork_start ?? null,
      fieldwork_end: p.fieldwork_end ?? null,
      published_date: null,
      sample_size: p.sample_size ?? null,
      margin_of_error: p.margin_of_error ?? null,
      results: p.results
        .filter((r) => typeof r.pct === "number" && r.pct >= 0 && r.pct <= 100)
        .map((r) => ({ candidate: r.candidate, party: r.party ?? null, pct: r.pct })),
      others_pct: p.others_pct ?? null,
      undecided_pct: p.undecided_pct ?? null,
      blank_null_pct: null,
      tse_registration: null,
    };
    if (p.parse_warnings?.length) norm.parse_warnings = p.parse_warnings.join("; ");
    if (!norm.results.length) continue;
    norm.id = pollId(norm);
    polls.push(norm);
  }
  return { polls };
}
