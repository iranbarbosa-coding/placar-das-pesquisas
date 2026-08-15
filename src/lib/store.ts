// The read side of the consolidated store.
//
// The site never touches the store's shape: this module loads the NDJSON
// tables and projects `question ⨝ survey` back into the flat `Poll[]` that
// every page has always consumed. Swapping the storage layer therefore costs
// exactly one file — this one — and no page changes at all.
//
// ── KEEP IN LOCKSTEP WITH `scripts/lib/project.mjs` ────────────────────────
// That module is the Node-side twin of `projectPolls` below and is what
// `scripts/parity-check.mjs` runs. If the two ever drift, the parity gate is
// certifying a projection the site does not actually use, which is precisely
// the kind of green-with-nothing-behind-it this project keeps getting bitten
// by. Any edit here is an edit there, in the same commit.
import fs from "node:fs";
import path from "node:path";
import type { Poll, PollDataset, RaceKind, UF } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");

// ── Store record shapes ────────────────────────────────────────────────────
// Only the fields the projection reads are typed. The store carries many more
// (provenance, crosstab status, mint seeds); leaving them out here keeps this
// module honest about what the site actually depends on.

interface SourceRef {
  source: string;
  native_id: string | number | null;
}

export interface StoreSurvey {
  survey_id: string;
  institute_id: string;
  source_refs?: SourceRef[] | null;
  article_url?: string | null;
  integra_url?: string | null;
  contractor_raw?: string | null;
  fieldwork_start?: string | null;
  fieldwork_end?: string | null;
  published_date?: string | null;
  sample_size?: number | null;
  margin_of_error?: number | null;
  tse_registration?: string | null;
  retracted?: unknown;
}

export interface StoreResult {
  candidate_id: string;
  name_raw?: string | null;
  party?: string | null;
  pct: number;
}

export interface StoreQuestion {
  question_id: string;
  survey_id: string;
  legacy_id?: string | null;
  race: RaceKind;
  round: 1 | 2;
  uf?: UF | null;
  scenario_label_raw?: string | null;
  is_headline?: boolean;
  results?: StoreResult[] | null;
  others_pct?: number | null;
  undecided_pct?: number | null;
  blank_null_pct?: number | null;
  parse_warnings?: string[] | null;
  repaired?: unknown;
  retracted?: unknown;
}

export interface StoreInstitute {
  institute_id: string;
  canonical: string;
  merged_into?: string | null;
}

export interface StoreCandidate {
  candidate_id: string;
  canonical: string;
}

export interface StoreMeta {
  generated_at?: string;
  sources?: PollDataset["sources"];
}

export interface Store {
  surveys: StoreSurvey[];
  questions: StoreQuestion[];
  institutes: StoreInstitute[];
  candidates: StoreCandidate[];
  meta: StoreMeta;
}

function readNdjson<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf-8");
  const rows: T[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t) as T);
    } catch (e) {
      throw new Error(`${path.basename(file)}:${i + 1} — JSON inválido: ${(e as Error).message}`);
    }
  }
  return rows;
}

export function readStore(dir: string = DATA_DIR): Store {
  const metaFile = path.join(dir, "meta.json");
  return {
    surveys: readNdjson<StoreSurvey>(path.join(dir, "surveys.ndjson")),
    questions: readNdjson<StoreQuestion>(path.join(dir, "questions.ndjson")),
    institutes: readNdjson<StoreInstitute>(path.join(dir, "institutes.ndjson")),
    candidates: readNdjson<StoreCandidate>(path.join(dir, "candidates.ndjson")),
    meta: fs.existsSync(metaFile) ? (JSON.parse(fs.readFileSync(metaFile, "utf-8")) as StoreMeta) : {},
  };
}

/** Identity key normalisation — twin of `normalizeRegistration` in scripts/lib/ids.mjs. */
export function normalizeRegistration(reg: string | null | undefined): string | null {
  if (!reg) return null;
  const t = String(reg).replace(/\s+/g, "").toUpperCase();
  return /^[A-Z]{2}-?\d+\/\d{4}$/.test(t) ? t.replace(/^([A-Z]{2})-?/, "$1-") : t || null;
}

/**
 * store → the flat `Poll[]` the site consumes.
 *
 * Only HEADLINE, non-retracted questions are projected — the store's
 * non-destructive replacement for the old keepFullestRound1, which deleted the
 * alternate line-ups outright. They still exist in `questions.ndjson`; they are
 * simply not promoted.
 */

/**
 * Share of the sample the published numbers account for, and whether that
 * falls short enough to keep the poll out of the averages.
 *
 * Votos válidos divide by the sum of what is present, so a poll missing 40
 * points inflates everyone left in it — a flag on the row would not save the
 * number. Senate is exempt: two votes per voter make the table sum to ~200%,
 * where this arithmetic means nothing. Threshold and the measured distribution
 * live in scripts/lib/completeness.mjs.
 */
function incompleteFlag(q: StoreQuestion): boolean {
  if (q.race === "senador") return false;
  const sum = (q.results ?? []).reduce((a, r) => a + (r.pct ?? 0), 0) +
    (q.others_pct ?? 0) + (q.blank_null_pct ?? 0) + (q.undecided_pct ?? 0);
  return Math.round(sum * 10) / 10 < 90;
}

export function projectPolls(store: Store): Poll[] {
  const surveyById = new Map(store.surveys.map((s) => [s.survey_id, s]));
  const instById = new Map(store.institutes.map((i) => [i.institute_id, i]));
  const candById = new Map(store.candidates.map((c) => [c.candidate_id, c]));

  const canonicalInstitute = (id: string): string | null => {
    let inst = instById.get(id);
    const seen = new Set<string>();
    while (inst?.merged_into && !seen.has(inst.institute_id)) {
      seen.add(inst.institute_id);
      inst = instById.get(inst.merged_into);
    }
    return inst?.canonical ?? null;
  };

  const polls: Poll[] = [];
  for (const q of store.questions) {
    if (!q.is_headline || q.retracted) continue;
    const s = surveyById.get(q.survey_id);
    if (!s || s.retracted) continue;
    polls.push({
      id: q.legacy_id ?? q.question_id,
      source: s.source_refs?.[0]?.source ?? "",
      source_url: s.article_url ?? s.integra_url ?? "",
      integra_url: s.integra_url ?? null,
      race: q.race,
      state: q.uf ?? null,
      round: q.round,
      scenario: q.scenario_label_raw ?? "",
      pollster: canonicalInstitute(s.institute_id) ?? "",
      contractor: s.contractor_raw ?? null,
      fieldwork_start: s.fieldwork_start ?? null,
      fieldwork_end: s.fieldwork_end ?? null,
      published_date: s.published_date ?? null,
      sample_size: s.sample_size ?? null,
      margin_of_error: s.margin_of_error ?? null,
      results: (q.results ?? []).map((r) => ({
        candidate: candById.get(r.candidate_id)?.canonical ?? r.name_raw ?? "",
        party: r.party ?? null,
        pct: r.pct,
      })),
      others_pct: q.others_pct ?? null,
      undecided_pct: q.undecided_pct ?? null,
      blank_null_pct: q.blank_null_pct ?? null,
      tse_registration: normalizeRegistration(s.tse_registration),
      ...(incompleteFlag(q) ? { incomplete: true } : {}),
      ...(q.parse_warnings?.length ? { parse_warnings: q.parse_warnings.join("; ") } : {}),
      ...(q.repaired ? { repaired: q.repaired } : {}),
    });
  }
  return polls;
}

/** The full dataset envelope, assembled from the store's own meta.json. */
export function loadStoreDataset(dir: string = DATA_DIR): PollDataset {
  const store = readStore(dir);
  return {
    generated_at: store.meta.generated_at ?? "",
    sources: store.meta.sources ?? [],
    polls: projectPolls(store),
  };
}
