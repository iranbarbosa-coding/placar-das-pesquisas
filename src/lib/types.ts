// Normalized poll schema — every source (Wikipedia, TSE, aggregators, pollsters)
// is converted into this shape by scripts/scrape.mjs before reaching the site.

export type RaceKind = "presidente" | "governador" | "senador";

export const UFS = [
  "AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS",
  "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC",
  "SE", "SP", "TO",
] as const;
export type UF = (typeof UFS)[number];

export const UF_NAMES: Record<UF, string> = {
  AC: "Acre", AL: "Alagoas", AM: "Amazonas", AP: "Amapá", BA: "Bahia",
  CE: "Ceará", DF: "Distrito Federal", ES: "Espírito Santo", GO: "Goiás",
  MA: "Maranhão", MG: "Minas Gerais", MS: "Mato Grosso do Sul",
  MT: "Mato Grosso", PA: "Pará", PB: "Paraíba", PE: "Pernambuco",
  PI: "Piauí", PR: "Paraná", RJ: "Rio de Janeiro", RN: "Rio Grande do Norte",
  RO: "Rondônia", RR: "Roraima", RS: "Rio Grande do Sul",
  SC: "Santa Catarina", SE: "Sergipe", SP: "São Paulo", TO: "Tocantins",
};

export interface PollResult {
  candidate: string;
  party: string | null;
  pct: number;
}

export interface Poll {
  /** Stable dedupe id: hash of pollster+race+state+round+fieldwork_end+scenario */
  id: string;
  source: string; // "wikipedia" | "tse" | "poder360" | pollster domain…
  source_url: string;
  /** The institute's own report (PDF), when the aggregator links one. */
  integra_url?: string | null;
  race: RaceKind;
  state: UF | null; // null for presidente
  round: 1 | 2;
  /** Scenario label as published (e.g. "2º turno: A vs B", "1º turno — cenário 2", "estimulada") */
  scenario: string;
  pollster: string;
  contractor?: string | null;
  fieldwork_start: string | null; // ISO date
  fieldwork_end: string | null; // ISO date
  published_date?: string | null;
  sample_size: number | null;
  margin_of_error: number | null;
  results: PollResult[];
  others_pct?: number | null;
  undecided_pct?: number | null; // indecisos / não sabe
  blank_null_pct?: number | null; // branco/nulo
  tse_registration?: string | null; // e.g. BR-01234/2026
  parse_warnings?: string;
  /** Published numbers account for <90% of the sample — kept out of averages. */
  incomplete?: boolean;
}

export interface PollDataset {
  generated_at: string; // ISO datetime of last scrape
  sources: { name: string; url: string; last_ok: string | null }[];
  polls: Poll[];
}

export interface RaceKey {
  race: RaceKind;
  state: UF | null;
  round: 1 | 2;
}

export interface CandidateAverage {
  candidate: string;
  party: string | null;
  avg: number;
  nPolls: number;
  latestPct: number;
  trend: { date: string; avg: number }[]; // daily rolling-average series
}

export interface RaceAverage {
  key: RaceKey;
  scenario: string; // scenario group this average was computed over
  candidates: CandidateAverage[]; // sorted desc by avg
  spread: number; // leader minus runner-up
  /** Max polls the average may include (the "latest N" rule). */
  windowSize: number;
  /** Max polls one institute may contribute. */
  maxPerPollster: number;
  /** True when a thin seat forced the per-institute cap to yield to the floor. */
  capRelaxed: boolean;
  /** Polls actually averaged — ≤ windowSize when the seat has fewer. */
  pollCount: number;
  lastPollDate: string | null;
}
