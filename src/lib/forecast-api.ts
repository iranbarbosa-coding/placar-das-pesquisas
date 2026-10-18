// Corpos das rotas /api/forecast/* — montados aqui para que rotas e testes usem
// a mesma função. Todas as rotas são ESTÁTICAS (geradas no build, como os demais
// feeds do site): nenhuma requisição pública recalcula modelo, e não existe rota
// de escrita ou administração.
import {
  backtest,
  calibration,
  forecastIndex,
  forecastRaces,
  forecastRuns,
  latestPublished,
  latestSnapshot,
  loadSnapshot,
  raceById,
  raceLabel,
  headlineProbabilities,
  type Snapshot,
} from "./forecast";

export const API_VERSION = "1";
export const CACHE_HEADERS = { "cache-control": "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400" };

const AVISO =
  "Estimativas de modelo estatístico, não resultados observados. 'site_average' é a média das pesquisas publicada pelo site " +
  "(fato: o que as pesquisas mediram). 'nowcast' é a estimativa do apoio atual; 'projection' é a projeção para o dia da " +
  "eleição. Probabilidades só são publicadas quando a calibração histórica da categoria é adequada (ver 'status').";

function meta() {
  const idx = forecastIndex();
  return {
    api_version: API_VERSION,
    license: "CC BY 4.0",
    disclaimer: AVISO,
    available: !!idx,
    methodology_url: "/previsao/metodologia",
  };
}

function snapshotSummary(s: Snapshot) {
  return {
    race_id: s.race_id,
    label: raceLabel(s),
    contest: s.contest,
    election_date: s.election_date,
    reference_date: s.reference_date,
    horizon_days: s.horizon_days,
    status: s.status,
    model: { model_version: s.model.model_version, config_id: s.model.config_id, calibration_id: s.model.calibration_id },
    data: {
      n_polls: s.input.n_polls ?? 0,
      n_institutes: s.input.n_institutes ?? 0,
      latest_fieldwork_end: s.input.latest_fieldwork_end ?? null,
      dataset_sha256: s.input.dataset_sha256 ?? null,
    },
    candidates: s.candidates.map((c, k) => ({
      candidate_id: c.candidate_id,
      person_id: c.person_id,
      name: c.name,
      first_round_pct: c.first_round_pct,
      site_average_pct: s.site_average?.candidates.find((x) => x.candidate_id === c.candidate_id)?.avg ?? null,
      nowcast: s.nowcast?.summary[k] ? { mean: s.nowcast.summary[k].mean, quantiles: s.nowcast.summary[k].quantiles } : null,
      projection: s.projection?.summary[k] ? { mean: s.projection.summary[k].mean, quantiles: s.projection.summary[k].quantiles } : null,
      // Probabilidade do destaque (método em `headline_method`) e as dos dois métodos.
      probability_first: headlineProbabilities(s)?.[k] ?? null,
      probability_first_state_space: s.probabilities?.first?.[k] ?? null,
      probability_first_trend: s.trend_model?.probabilities?.first?.[k] ?? null,
      trend: s.trend_model
        ? {
            average_now_pct: s.trend_model.average_now_pct[k],
            pp_per_week: s.trend_model.trend_pp_per_week[k],
            point_election_pct: s.trend_model.point_election_pct[k],
            projection: s.trend_model.summary[k]?.quantiles ?? null,
          }
        : null,
    })),
    headline_method: s.headline_method ?? "modelo",
    trend_model: s.trend_model
      ? { method: s.trend_model.method, lookback_days: s.trend_model.lookback_days, damping: s.trend_model.damping, series_from: s.trend_model.series_from, series_to: s.trend_model.series_to }
      : null,
    output_sha256: s.output_sha256,
  };
}

export function racesBody() {
  return {
    ...meta(),
    races: forecastRaces().map((r) => {
      const s = latestSnapshot(r.race_id);
      return {
        race_id: r.race_id,
        label: raceLabel(r),
        contest: r.contest,
        race: r.race,
        uf: r.uf,
        round: r.round,
        election_date: r.election_date,
        candidates: r.candidates,
        latest_reference_date: r.history[r.history.length - 1]?.reference_date ?? null,
        status: s?.status ?? null,
        links: {
          latest: `/api/forecast/${r.race_id}/latest.json`,
          history: `/api/forecast/${r.race_id}/history.json`,
          distribution: `/api/forecast/${r.race_id}/distribution.json`,
          methodology: `/api/forecast/${r.race_id}/methodology.json`,
          page: `/previsao/${r.race_id}`,
        },
      };
    }),
  };
}

export function latestBody(raceId: string) {
  const s = latestSnapshot(raceId);
  if (!s) return { ...meta(), race_id: raceId, available: false, reason: "sem snapshot válido para esta disputa" };
  const pub = s.status.overall === "publicado" ? s : latestPublished(raceId);
  return {
    ...meta(),
    latest: snapshotSummary(s),
    // Quando a rodada mais recente não publicou (dados insuficientes), o último
    // snapshot publicado continua disponível — e marcado como tal.
    last_published: pub && pub.output_sha256 !== s.output_sha256 ? snapshotSummary(pub) : null,
    site_average: s.site_average,
    limitations: s.limitations,
    note: s.note,
  };
}

export function historyBody(raceId: string) {
  const r = raceById(raceId);
  if (!r) return { ...meta(), race_id: raceId, available: false, history: [] };
  return {
    ...meta(),
    race_id: raceId,
    label: raceLabel(r),
    candidates: r.candidates,
    // Cada entrada é um snapshot imutável: o que o modelo disse NAQUELA data,
    // com o banco daquela data. Não é reescrito quando chegam pesquisas novas.
    history: r.history.map((e) => ({
      reference_date: e.reference_date,
      status: e.status.overall,
      projection_status: e.status.projection,
      probability_status: e.status.probability,
      probability_first: e.probability_first ?? null,
      n_polls: e.n_polls ?? null,
      latest_fieldwork_end: e.latest_fieldwork_end ?? null,
      nowcast_median: e.nowcast_median ?? null,
      nowcast_q10: e.nowcast_q10 ?? null,
      nowcast_q90: e.nowcast_q90 ?? null,
      projection_median: e.projection_median ?? null,
      projection_q10: e.projection_q10 ?? null,
      projection_q90: e.projection_q90 ?? null,
      output_sha256: e.output_sha256,
    })),
  };
}

export function distributionBody(raceId: string) {
  const s = latestPublished(raceId);
  if (!s) return { ...meta(), race_id: raceId, available: false };
  return {
    ...meta(),
    race_id: raceId,
    reference_date: s.reference_date,
    status: s.status,
    nowcast: s.nowcast ? { summary: s.nowcast.summary, series: s.nowcast.series } : null,
    projection: s.projection
      ? {
          status: s.status.projection,
          error_borrowed: s.projection.error_borrowed,
          draws: s.projection.draws,
          summary: s.projection.summary,
          variance_decomposition: s.projection.variance_decomposition,
        }
      : null,
    probabilities: s.probabilities ?? null,
    house_effects: s.house_effects ?? null,
  };
}

export function methodologyBody(raceId: string) {
  const s = latestPublished(raceId) ?? latestSnapshot(raceId);
  if (!s) return { ...meta(), race_id: raceId, available: false };
  const cal = calibration();
  return {
    ...meta(),
    race_id: raceId,
    model: s.model,
    diagnostics: s.diagnostics ?? null,
    hyperparameters: s.hyperparameters ?? null,
    calibration: cal
      ? { calibration_id: cal.calibration_id, variant: cal.fit.variant, nu: cal.fit.nu, elections: cal.elections, categories: cal.categories }
      : null,
    inputs: {
      polls: s.input.polls ?? [],
      exclusion_counts: s.input.exclusion_counts ?? {},
      exclusions: s.input.exclusions ?? [],
    },
    limitations: s.limitations,
    documents: {
      methodology: "https://github.com/iranbarbosa-coding/placar-das-pesquisas/blob/main/FORECASTING_METHODOLOGY.md",
      validation: "https://github.com/iranbarbosa-coding/placar-das-pesquisas/blob/main/FORECASTING_VALIDATION.md",
    },
  };
}

export function performanceBody() {
  const b = backtest();
  if (!b) return { ...meta(), available: false };
  return {
    ...meta(),
    backtest_id: b.backtest_id,
    election: b.election,
    horizons: b.horizons,
    sources: b.sources,
    n_items: b.n_items,
    fit_status: b.fit_status,
    fit_diagnostics: b.fit_diagnostics,
    selection: Object.fromEntries(Object.entries(b.selection).map(([k, v]) => [k, v.best])),
    summary: b.summary,
    revision_leakage: b.revision_leakage,
    caveats: [
      "Todas as disputas avaliadas são do 1º turno de 2026: o erro comum daquela eleição está em todas, e a validação cruzada por estado não o remove.",
      "Não há no banco pesquisas de 2010–2022; a amostra histórica é pequena para calibrar probabilidades com segurança.",
    ],
  };
}

export function healthBody() {
  const races = forecastRaces();
  const runs = forecastRuns();
  const lastRun = runs[runs.length - 1] ?? null;
  const problems: string[] = [];
  const perRace = races.map((r) => {
    const s = latestSnapshot(r.race_id);
    if (!s) problems.push(`${r.race_id}: snapshot mais recente ausente ou reprovado na conferência`);
    const lastFail = [...runs].reverse().find((x) => x.race_id === r.race_id && (x.status === "falhou" || x.status === "nao_convergiu"));
    const lastOk = [...runs].reverse().find((x) => x.race_id === r.race_id && x.snapshot);
    const failingNow = lastFail && (!lastOk || lastFail.executed_at > lastOk.executed_at);
    if (failingNow) problems.push(`${r.race_id}: última rodada ${lastFail!.status} (${lastFail!.executed_at}); o snapshot anterior segue publicado`);
    return {
      race_id: r.race_id,
      latest_reference_date: s?.reference_date ?? null,
      status: s?.status.overall ?? null,
      snapshot_valid: !!s,
      latest_fieldwork_end: s?.input.latest_fieldwork_end ?? null,
      last_failure: lastFail ?? null,
    };
  });
  const allValid = races.every((r) => r.history.every((e) => loadSnapshot(e.path)));
  if (!allValid) problems.push("há snapshot no histórico reprovado na conferência de hash/esquema");
  return {
    ...meta(),
    ok: !!forecastIndex() && problems.length === 0,
    races: perRace,
    last_run: lastRun,
    runs_logged: runs.length,
    backtest_id: backtest()?.backtest_id ?? null,
    calibration_id: calibration()?.calibration_id ?? null,
    problems,
  };
}

export function raceIds(): string[] {
  return forecastRaces().map((r) => r.race_id);
}
