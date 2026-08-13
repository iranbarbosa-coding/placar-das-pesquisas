// Poder360 "Agregador de Pesquisas" — primary structured source.
// Undocumented-but-public API behind an Origin allowlist (no auth, no paywall;
// the aggregator is Poder360's free public product).
//
// Two endpoints, joined on poll id:
//   POST /pesquisas/v1/api        → poll-level metadata (sample, margin, TSE
//                                   registration, contractor, article/PDF links)
//   GET  /pesquisas/v2/cenarios   → clean per-scenario candidate rows
// The v1 `apuracoes` field FLATTENS multi-scenario polls into one list (with
// some unnamed rows) — never parse results from it; that bug is why v2 exists.
import { pollId } from "../lib/util.mjs";

const HOST = "https://monitor-agregador.poder360.com.br";
const HEADERS = {
  "content-type": "application/json",
  origin: "https://drive.poder360.com.br",
  "user-agent": "Mozilla/5.0 (compatible; PlacarDasPesquisas/1.0)",
};

// unidadesFederativasId dictionary from the SPA bundle (6 = national).
const UF_IDS = {
  AC: 1, AL: 2, AM: 3, AP: 4, BA: 5, CE: 7, DF: 8, ES: 9, GO: 10, MA: 11,
  MG: 12, MS: 13, MT: 14, PA: 15, PB: 16, PE: 17, PI: 18, PR: 19, RJ: 20,
  RN: 21, RO: 22, RR: 23, RS: 24, SC: 25, SE: 26, SP: 27, TO: 28,
};
const CARGO = { governador: 1, presidente: 3, senador: 4 };

// "não sabe", "não respondeu", "não vota", "não iria votar", "não votaria"…
const UNDECIDED_RE = /n[ãa]o sabe|n[ãa]o respond|indecis|ningu[eé]m|n[ãa]o (iria |vai )?vota/i;
const BLANK_RE = /branco|nulo|nenhum/i;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function getJson(url, init = {}) {
  const res = await fetch(url, { headers: HEADERS, signal: AbortSignal.timeout(45_000), ...init });
  if (!res.ok) throw new Error(`poder360 HTTP ${res.status} for ${url.slice(0, 120)}`);
  return res.json();
}

async function fetchCombo({ cargoId, ufId, uf, race, round, cidade }) {
  const meta = await getJson(`${HOST}/pesquisas/v1/api`, {
    method: "POST",
    body: JSON.stringify({ cargosId: cargoId, unidadesFederativasId: ufId, ano: 2026, turno: String(round), cidade }),
  });
  if (!Array.isArray(meta)) throw new Error("poder360 schema drift: v1 response not an array");
  const metaById = new Map(meta.map((m) => [m.id, m]));

  const qs = `cargosId=${cargoId}&unidadesFederativasId=${ufId}&ano=2026&turno=${round}&cidade=${encodeURIComponent(cidade)}`;
  const cen = await getJson(`${HOST}/pesquisas/v2/cenarios?${qs}`);
  const list = cen?.data?.cenarios;
  if (!Array.isArray(list)) throw new Error("poder360 schema drift: v2/cenarios missing data.cenarios");

  // Group scenario entries by poll id to index them stably.
  const byPoll = new Map();
  for (const sc of list) {
    if (!byPoll.has(sc.id)) byPoll.set(sc.id, []);
    byPoll.get(sc.id).push(sc);
  }

  const polls = [];
  for (const [pid, scenarios] of byPoll) {
    const m = metaById.get(pid) ?? {};
    const rawDate = typeof (scenarios[0]?.data ?? m.data) === "string" ? (scenarios[0].data ?? m.data).slice(0, 10) : null;
    // Upstream typo years exist ("0026-02-25", "2005-12-12") — null them.
    const date = rawDate && rawDate >= "2023-01-01" && rawDate <= "2027-01-01" ? rawDate : null;

    // Round 1 with several tested line-ups: keep the fullest field (largest
    // candidate roster) — the per-race average must not double-count a poll.
    let kept = scenarios.map((sc, idx) => ({ sc, idx }));
    if (round === 1 && kept.length > 1) {
      const nCands = ({ sc }) =>
        sc.apuracao?.filter((r) => r?.nome && !UNDECIDED_RE.test(r.nome) && !BLANK_RE.test(r.nome)).length ?? 0;
      kept = [kept.sort((a, b) => nCands(b) - nCands(a))[0]];
    }

    for (const { sc, idx } of kept) {
      if (!Array.isArray(sc.apuracao)) continue;
      const results = [];
      let undecided = null;
      let blank = null;
      for (const row of sc.apuracao) {
        if (typeof row?.percentual !== "number") continue;
        const nome = (row.nome ?? "").trim();
        if (!nome) continue;
        if (UNDECIDED_RE.test(nome)) undecided = (undecided ?? 0) + row.percentual;
        else if (BLANK_RE.test(nome)) blank = (blank ?? 0) + row.percentual;
        else results.push({ candidate: nome, party: row.partido?.trim() || null, pct: row.percentual });
      }
      // A runoff "scenario" with fewer than two candidates is an upstream
      // data gap (missing opponent row) — unusable for a head-to-head.
      if (round === 2 && results.length < 2) continue;
      if (!results.length) continue;

      const scenario =
        round === 2
          ? `2º turno: ${[...results].sort((a, b) => b.pct - a.pct).slice(0, 2).map((r) => r.candidate).join(" vs ")}`
          : "1º turno";

      const poll = {
        id: "",
        source: "poder360",
        source_url: m.noticias || m.integra || "https://www.poder360.com.br/agregador-de-pesquisas/",
        race,
        state: uf,
        round,
        scenario,
        pollster: (sc.instituto ?? m.instituto ?? "").trim(),
        contractor: m.contratante?.trim() || null,
        fieldwork_start: null,
        fieldwork_end: date,
        published_date: date,
        sample_size: m.entrevistas ?? null,
        margin_of_error: m.margem ?? null,
        results,
        others_pct: null,
        undecided_pct: undecided,
        blank_null_pct: blank,
        tse_registration: m.registro ?? null,
      };
      if (!poll.pollster) continue;
      // Poder360 occasionally files a poll under the wrong UF (seen live: a
      // Veritá Paraná poll returned by the Pará query). The TSE registration
      // prefix ("PR-03910/2026") is authoritative — correct the state to it.
      const regUf = poll.tse_registration?.match(/^([A-Z]{2})-/)?.[1];
      if (regUf && regUf !== "BR" && UF_IDS[regUf] && poll.state && regUf !== poll.state) {
        console.warn(`poder360: UF corrigida via registro TSE — ${poll.pollster} ${poll.race} ${poll.state}→${regUf} (${poll.tse_registration})`);
        poll.state = regUf;
      }
      // Poder360 poll id + scenario index guarantee uniqueness within the
      // source; the content hash alone collides when an institute publishes
      // two same-day scenarios with identical labels.
      poll.id = `p360-${pid}-${round}-${idx}-${pollId(poll)}`;
      polls.push(poll);
    }
  }
  return polls;
}

export async function fetchPoder360() {
  const jobs = [
    { cargoId: CARGO.presidente, ufId: 6, uf: null, race: "presidente", round: 1, cidade: "Brasil" },
    { cargoId: CARGO.presidente, ufId: 6, uf: null, race: "presidente", round: 2, cidade: "Brasil" },
  ];
  for (const [uf, ufId] of Object.entries(UF_IDS)) {
    jobs.push({ cargoId: CARGO.governador, ufId, uf, race: "governador", round: 1, cidade: "" });
    jobs.push({ cargoId: CARGO.governador, ufId, uf, race: "governador", round: 2, cidade: "" });
    jobs.push({ cargoId: CARGO.senador, ufId, uf, race: "senador", round: 1, cidade: "" });
  }

  const polls = [];
  let failures = 0;
  let lastErr = null;
  for (const job of jobs) {
    try {
      polls.push(...(await fetchCombo(job)));
    } catch (e) {
      failures++;
      lastErr = e;
      if (failures > jobs.length / 4) {
        throw new Error(`poder360: too many failures (${failures}/${jobs.length}); last: ${lastErr.message}`);
      }
    }
    await sleep(300); // ~85 combos × 2 calls — polite pacing
  }
  if (failures) console.warn(`poder360: ${failures} combo(s) failed, continuing (last: ${lastErr?.message})`);
  return { polls };
}
