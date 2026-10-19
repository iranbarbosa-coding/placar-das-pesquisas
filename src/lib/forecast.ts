// PREVISÃO ESTATÍSTICA — leitura dos artefatos da camada de previsão.
//
// A previsão NÃO é calculada aqui nem no navegador. O pipeline em `forecast/`
// (Python) roda no cron, depois dos guardas do banco, e grava em
// `data/forecast/`:
//   index.json                       ponteiro mutável: snapshots por disputa
//   snapshots/<disputa>/<data>_<hash>.json   imutáveis, um por rodada com mudança
//   runs.ndjson                      registro de toda rodada (publicada ou falha)
//   backtests/*.json, calibration/*.json     validação histórica e calibração
// Este módulo só LÊ, confere o esquema e o hash de cada snapshot, e entrega às
// páginas e às rotas de API. Um snapshot que não passa na conferência é tratado
// como indisponível — o site nunca mostra número de um arquivo inválido.
//
// Separado de `average.ts`/`data.ts` de propósito: a média publicada do site
// não muda por causa da previsão (e a previsão não a reimplementa — o
// exportador chama `computeAverage` do próprio site).
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const DIR = path.join(process.cwd(), "data", "forecast");

export const SNAPSHOT_SCHEMA = "placar.previsao.snapshot/1";
export const INDEX_SCHEMA = "placar.previsao.indice/1";

export type Status = "publicado" | "insuficiente" | "nao_convergiu";

export interface Quantis {
  [q: string]: number;
}

export interface ResumoCategoria {
  label: string;
  mean: number;
  sd: number;
  quantiles: Quantis;
  histogram: { bin_pp: number; start_pp: number; counts: number[] };
}

export interface Snapshot {
  schema: string;
  race_id: string;
  contest: string;
  race: "presidente" | "governador" | "senador";
  uf: string | null;
  round: 1 | 2;
  election_date: string;
  reference_date: string;
  horizon_days: number;
  model: {
    model_version: string;
    config_id: string;
    config_sha256: string;
    code_sha256: string;
    calibration_id: string | null;
    numpy_version: string;
    seed?: number;
    fit_seconds?: number;
  };
  candidates: { candidate_id: string; person_id: string | null; name: string; first_round_pct: number }[];
  site_average: {
    basis: string;
    windowPollIds: string[];
    pollCount: number;
    capRelaxed: boolean;
    lastPollDate: string | null;
    candidates: { candidate_id: string | null; name: string; avg: number; nPolls: number }[];
  } | null;
  note: string | null;
  limitations: string[];
  input: {
    input_sha256: string;
    dataset_sha256?: string;
    source_polls_sha256?: string;
    source_generated_at?: string | null;
    n_polls?: number;
    n_institutes?: number;
    latest_fieldwork_end?: string;
    polls?: {
      id: string;
      pollster: string;
      fieldwork_start: string | null;
      fieldwork_end: string | null;
      sample_size: number | null;
      n_eff: number;
      n_imputado: boolean;
      tse_registration: string | null;
      source_url: string | null;
      shares: number[];
    }[];
    exclusion_counts?: Record<string, number>;
    exclusions?: { id: string; pollster: string; fieldwork_end: string | null; reason: string }[];
  };
  status: {
    overall: Status;
    nowcast: "publicada" | "insuficiente" | "nao_convergiu";
    projection: "publicada" | "experimental" | "retida";
    /** "experimental" = publicada por decisão editorial sem validação histórica da categoria (config). */
    probability: "publicada" | "experimental" | "retida";
    reasons: string[];
  };
  diagnostics?: {
    chains: number;
    draws_per_chain: number;
    rhat_max: number;
    ess_min: number;
    params: Record<string, { rhat: number; ess_bulk: number }>;
  };
  nowcast?: {
    summary: ResumoCategoria[];
    series: { date: string; values: { q10: number; median: number; q90: number }[] }[];
  };
  projection?: {
    summary: ResumoCategoria[];
    draws: number;
    sys_scale_alr: number;
    nu: number;
    category: string;
    error_borrowed: boolean;
    variance_decomposition: { posterior: number; drift: number; systematic: number };
  } | null;
  probabilities?: { first: number[]; top2?: number[] } | null;
  house_effects?: {
    reference_candidate: string;
    rows: { pollster: string; n_polls: number; effect_pp_first_candidate: Quantis }[];
  };
  hyperparameters?: Record<string, Quantis>;
  /** Modelo de tendência da média do site (forecast/placar_forecast/trend.py). */
  trend_model?: {
    method: string;
    lookback_days: number;
    damping: number;
    series_from: string;
    series_to: string;
    points: number;
    average_now_pct: number[];
    trend_pp_per_week: number[];
    point_election_pct: number[];
    summary: ResumoCategoria[];
    probabilities: { first: number[] } | null;
  } | null;
  /** Qual modelo alimenta o destaque "maior chance de vencer". */
  headline_method?: "tendencia" | "modelo";
  output_sha256: string;
  run?: { executed_at: string };
}

/** As probabilidades do destaque: as do método escolhido em `headline_method`. */
export function headlineProbabilities(s: Snapshot): number[] | null {
  if (s.headline_method === "tendencia" && s.trend_model?.probabilities) return s.trend_model.probabilities.first;
  return s.probabilities?.first ?? null;
}

export interface IndexEntry {
  path: string;
  reference_date: string;
  status: Snapshot["status"];
  n_polls?: number;
  latest_fieldwork_end?: string;
  output_sha256: string;
  executed_at?: string;
  probability_first?: number[];
  nowcast_median?: number[];
  nowcast_q10?: number[];
  nowcast_q90?: number[];
  projection_median?: number[];
  projection_q10?: number[];
  projection_q90?: number[];
}

export interface IndexRace {
  race_id: string;
  contest: string;
  race: Snapshot["race"];
  uf: string | null;
  round: 1 | 2;
  election_date: string;
  candidates: { candidate_id: string; name: string }[];
  latest: string;
  history: IndexEntry[];
}

export interface ForecastIndex {
  schema: string;
  races: IndexRace[];
}

function readJson<T>(file: string): T | null {
  if (!fs.existsSync(file)) return null;
  try {
    return JSON.parse(fs.readFileSync(file, "utf-8")) as T;
  } catch {
    return null;
  }
}

// ── Conferência ────────────────────────────────────────────────────────────
// Gêmea de `validate_snapshot` em forecast/placar_forecast/publish.py: o mesmo
// hash canônico (chaves ordenadas, sem espaços, UTF-8) e as mesmas regras de
// coerência. Se as duas divergirem, o teste `forecast.test.mjs` acusa.

function canonical(v: unknown): string {
  // Números pelo `String(n)` nativo: é a forma que o Python reproduz em `js_number`.
  if (v === null || typeof v !== "object") return typeof v === "number" ? String(v) : JSON.stringify(v);
  if (Array.isArray(v)) return `[${v.map(canonical).join(",")}]`;
  const o = v as Record<string, unknown>;
  return `{${Object.keys(o)
    .sort()
    .map((k) => `${JSON.stringify(k)}:${canonical(o[k])}`)
    .join(",")}}`;
}

/** O hash de saída do snapshot, como o Python o calcula (ver `output_hash`). */
export function outputHash(s: Snapshot): string {
  const { run: _run, output_sha256: _h, ...payload } = s as Snapshot & Record<string, unknown>;
  void _run;
  void _h;
  return crypto.createHash("sha256").update(canonical(payload), "utf-8").digest("hex");
}

export function validateSnapshot(s: Snapshot): string[] {
  const errs: string[] = [];
  for (const k of ["schema", "race_id", "reference_date", "election_date", "model", "input", "status", "output_sha256"] as const) {
    if (!(k in s)) errs.push(`campo ausente: ${k}`);
  }
  if (errs.length) return errs;
  if (s.schema !== SNAPSHOT_SCHEMA) errs.push(`schema inesperado: ${s.schema}`);
  if (outputHash(s) !== s.output_sha256) errs.push("hash de saída não confere");
  for (const block of [s.nowcast, s.projection, s.trend_model]) {
    if (!block) continue;
    const soma = block.summary.reduce((a, r) => a + r.mean, 0);
    if (Math.abs(soma - 100) > 0.05) errs.push(`médias somam ${soma.toFixed(3)}`);
    for (const r of block.summary) {
      const q = Object.keys(r.quantiles)
        .sort((a, b) => Number(a) - Number(b))
        .map((k) => r.quantiles[k]);
      if (q.some((v, i) => i > 0 && v < q[i - 1] - 1e-9)) errs.push(`quantis não monótonos: ${r.label}`);
      if (q.some((v) => v < 0 || v > 100)) errs.push(`quantil fora de [0, 100]: ${r.label}`);
    }
  }
  for (const f of [s.probabilities?.first, s.trend_model?.probabilities?.first]) {
    if (f && (Math.abs(f.reduce((a, b) => a + b, 0) - 1) > 1e-3 || f.some((v) => v < 0 || v > 1))) errs.push("probabilidades inválidas");
  }
  if (s.status.probability === "retida" && s.trend_model?.probabilities) errs.push("probabilidade retida, mas a tendência traz probabilidades");
  if (s.status.probability === "retida" && s.probabilities) errs.push("probabilidade retida, mas presente");
  if (s.status.probability !== "retida" && !s.probabilities) errs.push("status com probabilidade, mas sem probabilidades");
  return errs;
}

// ── Leitura ────────────────────────────────────────────────────────────────

let indexCache: ForecastIndex | null | undefined;
const snapCache = new Map<string, Snapshot | null>();

export function forecastIndex(): ForecastIndex | null {
  if (indexCache !== undefined) return indexCache;
  const idx = readJson<ForecastIndex>(path.join(DIR, "index.json"));
  indexCache = idx && idx.schema === INDEX_SCHEMA && Array.isArray(idx.races) ? idx : null;
  return indexCache;
}

/** Um snapshot conferido, ou null (ausente, ilegível ou reprovado na conferência). */
export function loadSnapshot(rel: string): Snapshot | null {
  if (snapCache.has(rel)) return snapCache.get(rel)!;
  const full = path.join(DIR, rel);
  if (!full.startsWith(DIR + path.sep)) return null;
  const s = readJson<Snapshot>(full);
  const ok = s && validateSnapshot(s).length === 0 ? s : null;
  snapCache.set(rel, ok);
  return ok;
}

export function forecastRaces(): IndexRace[] {
  return forecastIndex()?.races ?? [];
}

export function raceById(raceId: string): IndexRace | null {
  return forecastRaces().find((r) => r.race_id === raceId) ?? null;
}

export function latestSnapshot(raceId: string): Snapshot | null {
  const r = raceById(raceId);
  return r ? loadSnapshot(r.latest) : null;
}

/** O snapshot válido mais recente que PUBLICOU estimativas (o ponteiro pode apontar para um "insuficiente"). */
export function latestPublished(raceId: string): Snapshot | null {
  const r = raceById(raceId);
  if (!r) return null;
  for (const e of [...r.history].reverse()) {
    if (e.status.overall !== "publicado") continue;
    const s = loadSnapshot(e.path);
    if (s) return s;
  }
  return null;
}

export interface RunRow {
  race_id: string;
  reference_date: string;
  executed_at: string;
  status: string;
  snapshot?: string;
  reasons?: string[];
  error?: string;
}

export function forecastRuns(): RunRow[] {
  const f = path.join(DIR, "runs.ndjson");
  if (!fs.existsSync(f)) return [];
  return fs
    .readFileSync(f, "utf-8")
    .split("\n")
    .filter((l) => l.trim())
    .flatMap((l) => {
      try {
        return [JSON.parse(l) as RunRow];
      } catch {
        return [];
      }
    });
}

function latestIn(sub: string): string | null {
  const d = path.join(DIR, sub);
  if (!fs.existsSync(d)) return null;
  const files = fs.readdirSync(d).filter((f) => f.endsWith(".json")).sort();
  return files.length ? path.join(d, files[files.length - 1]) : null;
}

// ── Desempenho histórico ───────────────────────────────────────────────────

export interface Agregado {
  n: number;
  n_contests: number;
  mae_pp: number;
  crps_pp: number;
  coverage: { "50": number; "80": number; "95": number };
  brier_first: number;
  log_first: number;
  leader_correct: number;
  zero_prob_events: number;
  pit_hist: number[];
  loso_mean_logdens: number;
  brier_top2?: number;
  brier_decided?: number;
}

export interface Backtest {
  backtest_id: string;
  model_version: string;
  config_id: string;
  election: { date: string; round: number };
  horizons: number[];
  sources: { horizon: number; ref_date: string; kind: string; commit: string | null; committed_at: string | null }[];
  fit_status: Record<string, number>;
  fit_diagnostics: Record<string, number>;
  n_items: number;
  selection: Record<string, { best: { variant: string; nu: number; loso_mean_logdens: number }; table: { variant: string; nu: number; loso_mean_logdens: number }[] }>;
  summary: Record<
    string,
    {
      overall: Agregado;
      by_horizon: Record<string, Agregado>;
      by_category: Record<string, Agregado>;
      by_category_horizon: Record<string, Record<string, Agregado>>;
      reliability_first: { lo: number; hi: number; n: number; p_mean: number; freq: number }[];
      reliability_top2: { lo: number; hi: number; n: number; p_mean: number; freq: number }[];
    }
  >;
  revision_leakage: { ref_date: string; mean_abs_diff_pp: number; max_abs_diff_pp: number; mae_vintage_pp: number; mae_reconstructed_pp: number; polls_vintage: number; polls_reconstructed: number }[];
  /** Os mesmos pares disputa × data em todos os métodos (comparação justa com a tendência). */
  summary_common?: Record<string, { overall: Agregado; by_horizon: Record<string, Agregado> }>;
  n_common?: number;
  trend_selected?: { method: string; lookback_days: number; damping: number };
  calibration_id: string;
}

let btCache: Backtest | null | undefined;

/** O backtest mais recente, SEM os registros por disputa (o arquivo inteiro é grande). */
export function backtest(): Backtest | null {
  if (btCache !== undefined) return btCache;
  const f = latestIn("backtests");
  const b = f ? readJson<Backtest & { records?: unknown }>(f) : null;
  if (b) delete (b as { records?: unknown }).records;
  btCache = b;
  return btCache;
}

export interface Calibracao {
  calibration_id: string;
  fit: { variant: string; nu: number; alpha0: number; alpha: Record<string, number>; beta: number; gamma: number[] };
  categories: Record<string, { n_contests: number; n_elections: number; borrowed: boolean; scale_alr_by_horizon: Record<string, number> }>;
  elections: { date: string; round: number }[];
}

/** A calibração em uso: a fixada em `forecast/config/model-v1.json` (`calibration_id`), não "a mais recente". */
export function calibration(): Calibracao | null {
  const cfg = readJson<{ calibration_id?: string }>(path.join(process.cwd(), "forecast", "config", "model-v1.json"));
  if (!cfg?.calibration_id || !/^[\w-]+$/.test(cfg.calibration_id)) return null;
  return readJson<Calibracao>(path.join(DIR, "calibration", `${cfg.calibration_id}.json`));
}

// ── Rótulos (pt-BR) ────────────────────────────────────────────────────────

export const METHOD_LABELS: Record<string, string> = {
  modelo: "Modelo completo (A + B + C)",
  modelo_sem_casa: "Modelo sem efeito casa",
  modelo_sem_sistematico: "Modelo sem erro sistemático",
  media_site: "Média do site",
  ultima_pesquisa: "Última pesquisa",
  tendencia_14d_inteira: "Média + tendência de 14 dias (inteira)",
  tendencia_21d_inteira: "Média + tendência de 21 dias (inteira)",
  tendencia_21d_metade: "Média + metade da tendência de 21 dias",
  tendencia_42d_inteira: "Média + tendência de 42 dias (inteira)",
  tendencia_42d_metade: "Média + metade da tendência de 42 dias",
};

export const VARIANT_LABELS: Record<string, string> = {
  sem_sistematico: "sem erro sistemático",
  agrupado: "erro por tipo de disputa",
  horizonte: "erro por tipo + horizonte",
  covariaveis: "tipo + horizonte + nº de institutos e dispersão",
};

export function raceLabel(r: { race: string; uf: string | null; round: number }): string {
  const cargo = r.race === "presidente" ? "Presidente" : r.race === "governador" ? "Governador" : "Senado";
  return `${cargo}${r.uf && r.uf !== "BR" ? ` · ${r.uf.toUpperCase()}` : ""} · ${r.round}º turno`;
}

/**
 * Precisão de exibição sem falsa precisão: inteiro quando o intervalo de 80%
 * tem mais de 4 p.p.; uma casa decimal só quando ele é estreito o bastante para
 * que o décimo signifique alguma coisa.
 */
export function casasPara(q10: number, q90: number): 0 | 1 {
  return q90 - q10 > 4 ? 0 : 1;
}

export function diasDesde(iso: string | null | undefined, ref: string): number | null {
  if (!iso) return null;
  return Math.round((Date.parse(`${ref}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 864e5);
}
