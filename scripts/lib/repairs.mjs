// Curated repairs, re-applied on every scrape run.
//
// Sources drop data in ways we cannot fix upstream (Poder360's v2 endpoint
// silently omits candidate rows whose name field is empty). Patching the
// generated dataset by hand would survive exactly until the next run, so the
// corrections live here as data and are replayed each time — a rebuild from
// scratch can never lose them.
//
// Every entry must cite the primary source that proves its numbers. Nothing
// in this file may be inferred from neighbouring polls.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { sameCandidate } from "./canonicalize.mjs";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "repairs.json");

function matches(poll, m) {
  if (m.tse_registration) {
    const norm = (s) => (s ?? "").replace(/\s+/g, "").toUpperCase();
    if (norm(poll.tse_registration) !== norm(m.tse_registration)) return false;
  }
  if (m.race && poll.race !== m.race) return false;
  if (m.round && poll.round !== m.round) return false;
  if (m.state !== undefined && poll.state !== m.state) return false;
  if (m.pollster && poll.pollster.toLowerCase() !== m.pollster.toLowerCase()) return false;
  if (m.fieldwork_end && poll.fieldwork_end !== m.fieldwork_end) return false;
  return true;
}

/**
 * Apply data/repairs.json to the merged poll list. Returns a report so the
 * run logs which repairs fired — a repair that silently stops matching (the
 * poll's registration changed, the source restructured) is itself a defect,
 * so unmatched entries are surfaced loudly rather than ignored.
 */
export function applyRepairs(polls) {
  let spec;
  try {
    spec = JSON.parse(fs.readFileSync(FILE, "utf-8"));
  } catch {
    return { applied: 0, unmatched: [], warnings: ["data/repairs.json ausente ou ilegível"] };
  }

  let applied = 0;
  const unmatched = [];
  const warnings = [];

  for (const rep of spec.repairs ?? []) {
    const targets = polls.filter((p) => matches(p, rep.match));
    if (!targets.length) {
      unmatched.push(rep.match.tse_registration ?? JSON.stringify(rep.match));
      continue;
    }
    for (const poll of targets) {
      for (const add of rep.add_results ?? []) {
        if (poll.results.some((r) => sameCandidate(r.candidate, add.candidate))) continue;
        poll.results.push({ candidate: add.candidate, party: add.party ?? null, pct: add.pct });
      }
      for (const sp of rep.set_party ?? []) {
        for (const r of poll.results) {
          if (sameCandidate(r.candidate, sp.candidate)) r.party = sp.party ?? null;
        }
      }
      for (const [k, v] of Object.entries(rep.set ?? {})) poll[k] = v;
      poll.repaired = { source: rep.source, evidence: rep.evidence, verified_at: rep.verified_at };
      applied++;

      if (rep.expect_sum != null) {
        const sum =
          poll.results.reduce((a, r) => a + r.pct, 0) +
          (poll.others_pct ?? 0) + (poll.blank_null_pct ?? 0) + (poll.undecided_pct ?? 0);
        if (Math.abs(sum - rep.expect_sum) > 0.6) {
          warnings.push(
            `reparo ${rep.match.tse_registration}: soma ${sum.toFixed(1)} ≠ esperada ${rep.expect_sum}`,
          );
        }
      }
    }
  }
  return { applied, unmatched, warnings };
}

let cachedSpec;
function spec() {
  if (!cachedSpec) {
    try { cachedSpec = JSON.parse(fs.readFileSync(FILE, "utf-8")); }
    catch { cachedSpec = { repairs: [] }; }
  }
  return cachedSpec;
}

/**
 * The curated party for one result, if a repair covers it.
 *
 * `applyRepairs` mutates the poll list during a scrape, but the store is built
 * from `data/polls.json` — a file written by the LAST scrape, which predates
 * these repairs. Without this accessor the migration and the parity gate would
 * each have to re-implement the lookup, and the three would drift. Same reason
 * `project.mjs` and `store.ts` are held together by a twin check.
 *
 * @returns {{has: boolean, party?: string|null}}
 */
export function partyOverride(poll, candidate) {
  for (const rep of spec().repairs ?? []) {
    if (!(rep.set_party ?? []).length) continue;
    if (!matches(poll, rep.match)) continue;
    for (const sp of rep.set_party) {
      if (sameCandidate(candidate, sp.candidate)) return { has: true, party: sp.party ?? null };
    }
  }
  return { has: false };
}
