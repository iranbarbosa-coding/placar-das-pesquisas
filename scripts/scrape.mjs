#!/usr/bin/env node
// Daily scrape: fetch every source, normalize, merge, dedupe, validate,
// atomically replace data/polls.json. Any single source failing must not
// take the site down — we keep the previous dataset's polls for that source.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate } from "./validate-data.mjs";
import { canonicalizeCandidates, canonicalizeParties, canonicalizePollsters, sameCandidate } from "./lib/canonicalize.mjs";
import { applyRepairs } from "./lib/repairs.mjs";
import { today, writeStore, DATA_DIR } from "./lib/store.mjs";
import { buildStoreFromPolls } from "./lib/build-store.mjs";
import { validateStore } from "./validate-store.mjs";
import { fetchPoder360 } from "./sources/poder360.mjs";
import { fetchWikipedia } from "./sources/wikipedia.mjs";
import { fetchTseRegistry } from "./sources/tse.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const DATA = path.join(ROOT, "data", "polls.json");

function loadPrevious() {
  try {
    return JSON.parse(fs.readFileSync(DATA, "utf-8"));
  } catch {
    return { generated_at: null, sources: [], polls: [] };
  }
}

/**
 * Cross-source dedupe. Candidate names differ between sources ("Lula" vs
 * "Luiz Inácio Lula da Silva"), so exact roster keys don't work. Two polls
 * are the same when they share (pollster, race, state, round, end date) and
 * their rosters match person-by-person via token-subset name matching.
 * Source priority: poder360 (structured, has TSE registro) > wikipedia.
 */
const SOURCE_PRIORITY = { poder360: 3, wikipedia: 2 };

function bucketKey(p) {
  const pollster = p.pollster
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `${pollster}:${p.race}:${p.state ?? "BR"}:${p.round}`;
}

function pollDate(p) {
  return p.fieldwork_end ?? p.published_date ?? null;
}

// Sources disagree by a day or two on fieldwork end ("22–24/07" vs "22–23/07").
function datesClose(a, b) {
  const da = pollDate(a);
  const db = pollDate(b);
  if (!da || !db) return true; // undated: let the roster check decide
  return Math.abs(+new Date(da) - +new Date(db)) <= 3 * 86_400_000;
}

function rostersMatch(a, b) {
  const small = a.results.length <= b.results.length ? a : b;
  const large = small === a ? b : a;
  let hits = 0;
  for (const r of small.results) {
    if (large.results.some((s) => sameCandidate(r.candidate, s.candidate))) hits++;
  }
  return hits / small.results.length >= 0.6;
}

function mergePolls(pollLists) {
  const buckets = new Map();
  const out = [];
  for (const polls of pollLists) {
    for (const p of polls) {
      const k = bucketKey(p);
      if (!buckets.has(k)) buckets.set(k, []);
      const bucket = buckets.get(k);
      const existing = bucket.find((e) => datesClose(e, p) && rostersMatch(e, p));
      if (existing) {
        const oldPri = SOURCE_PRIORITY[existing.source] ?? 1;
        const newPri = SOURCE_PRIORITY[p.source] ?? 1;
        const META = ["sample_size", "margin_of_error", "tse_registration", "contractor", "fieldwork_start"];
        // SOURCE PRIORITY DECIDES METADATA — NEVER THE RESULT TABLE.
        //
        // The winning source used to replace the record wholesale, results
        // included. An Acre senate poll reached us twice: Wikipedia with all 6
        // candidates (sum 200) and Poder360 with 3 (sum 21). Poder360 outranks
        // Wikipedia, so the 3-row fragment overwrote the complete table and the
        // poll then failed the sum guard and vanished from the averages
        // entirely. Priority settles who is authoritative about the sample size
        // or the registration; it says nothing about who published more rows.
        const richer = (a, b) => {
          const na = (a.results ?? []).length, nb = (b.results ?? []).length;
          if (na !== nb) return na > nb;
          const sum = (x) => (x.results ?? []).reduce((t, r) => t + r.pct, 0) +
            (x.others_pct ?? 0) + (x.blank_null_pct ?? 0) + (x.undecided_pct ?? 0);
          return sum(a) > sum(b);
        };
        const RESULTS = ["results", "others_pct", "blank_null_pct", "undecided_pct"];
        if (newPri > oldPri) {
          const keep = { ...p };
          for (const f of META) if (keep[f] == null && existing[f] != null) keep[f] = existing[f];
          if (richer(existing, p)) for (const f of RESULTS) keep[f] = existing[f];
          Object.assign(existing, keep);
        } else {
          for (const f of META) if (existing[f] == null && p[f] != null) existing[f] = p[f];
          if (richer(p, existing)) for (const f of RESULTS) existing[f] = p[f];
        }
      } else {
        const copy = { ...p };
        bucket.push(copy);
        out.push(copy);
      }
    }
  }
  return out;
}

/**
 * Round-1 polls where an institute tested several line-ups arrive as several
 * rows (Wikipedia cenários). The per-race average must count each poll once:
 * keep the fullest roster per (pollster, race, state, date).
 */
function keepFullestRound1(polls) {
  const best = new Map();
  const rest = [];
  for (const p of polls) {
    if (p.round !== 1) {
      rest.push(p);
      continue;
    }
    const k = `${bucketKey(p)}:${pollDate(p) ?? "?"}`;
    const cur = best.get(k);
    if (!cur || p.results.length > cur.results.length) best.set(k, p);
  }
  return [...rest, ...best.values()];
}

/**
 * Backstop against institute aliases no clustering can discover ("Data Index"
 * ≡ "Indexa"): two polls in the same contest, ≤3 days apart, whose rosters
 * match with IDENTICAL percentages (and compatible sample sizes) are the same
 * poll published under two brandings. Keep the higher-priority source's copy.
 */
function dropExactDuplicates(polls) {
  const groups = new Map();
  for (const p of polls) {
    const k = `${p.race}:${p.state ?? "BR"}:${p.round}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const dropped = new Set();
  for (const group of groups.values()) {
    group.sort((a, b) => (pollDate(a) ?? "").localeCompare(pollDate(b) ?? ""));
    for (let i = 0; i < group.length; i++) {
      if (dropped.has(group[i])) continue;
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (dropped.has(b)) continue;
        const da = pollDate(a);
        const db = pollDate(b);
        if (da && db && +new Date(db) - +new Date(da) > 3 * 86_400_000) break;
        if (a.pollster === b.pollster) continue; // same institute handled upstream
        if (a.sample_size && b.sample_size && a.sample_size !== b.sample_size) continue;
        const small = a.results.length <= b.results.length ? a : b;
        const large = small === a ? b : a;
        let matched = 0;
        let identical = 0;
        for (const r of small.results) {
          const s = large.results.find((x) => sameCandidate(r.candidate, x.candidate));
          if (s) {
            matched++;
            if (Math.abs(s.pct - r.pct) <= 0.05) identical++;
          }
        }
        // With only 2 matched candidates (runoff toplines) two institutes can
        // coincide legitimately — demand exact same date AND same sample size.
        const strongEnough =
          matched >= 3 ||
          (matched === 2 && da && da === db && a.sample_size && a.sample_size === b.sample_size);
        if (matched / small.results.length >= 0.9 && identical === matched && strongEnough) {
          const loser = (SOURCE_PRIORITY[a.source] ?? 1) >= (SOURCE_PRIORITY[b.source] ?? 1) ? b : a;
          dropped.add(loser);
          console.warn(`duplicata entre marcas: ${a.pollster} ≡ ${b.pollster} (${a.race}/${a.state ?? "BR"} ${da ?? "?"}) — mantida a de maior prioridade`);
        }
      }
    }
  }
  return polls.filter((p) => !dropped.has(p));
}

async function runSource(name, fn, previous) {
  try {
    const r = await fn();
    console.log(`✓ ${name}: ${r.polls?.length ?? r.count ?? 0} registro(s)`);
    return { ok: true, ...r };
  } catch (e) {
    console.error(`✗ ${name} FALHOU: ${e.message} — mantendo dados anteriores desta fonte`);
    const kept = previous.polls.filter((p) => p.source === name);
    return { ok: false, polls: kept, url: null, error: String(e.message) };
  }
}

async function main() {
  const previous = loadPrevious();
  const now = new Date().toISOString();

  const [poder, wiki, tse] = await Promise.all([
    runSource("poder360", fetchPoder360, previous),
    runSource("wikipedia", fetchWikipedia, previous),
    (async () => {
      try {
        const r = await fetchTseRegistry();
        console.log(`✓ tse: ${r.count} pesquisas registradas`);
        return { ok: true, ...r };
      } catch (e) {
        console.error(`✗ tse FALHOU: ${e.message} — enriquecimento pulado`);
        return { ok: false, records: [] };
      }
    })(),
  ]);

  // Unify institute names BEFORE merging so "Quaest" and "Genial/Quaest"
  // land in the same dedupe bucket.
  const allRaw = [...(poder.polls ?? []), ...(wiki.polls ?? [])];
  canonicalizePollsters(allRaw);
  let polls = mergePolls([
    allRaw.filter((p) => p.source === "poder360"),
    allRaw.filter((p) => p.source !== "poder360"),
  ]);

  // Curated repairs from primary sources, replayed every run (data/repairs.json).
  const rep = applyRepairs(polls);
  console.log(`✓ reparos curados aplicados: ${rep.applied}`);
  for (const u of rep.unmatched) console.warn(`AVISO: reparo sem pesquisa correspondente — ${u}`);
  // A repair that matches a poll and then corrects nothing is either stale or
  // its source has healed. Both are worth a line: without one, the only trace
  // of a dead repair is the absence of a number nobody counts.
  for (const n of rep.noop ?? []) console.warn(`AVISO: reparo sem efeito — ${n}`);
  for (const w of rep.warnings) console.warn(`AVISO: ${w}`);

  // Candidate-name hygiene (before entity resolution):
  //  - strip Wikipedia disambiguators: "Vera Lúcia (política)" → "Vera Lúcia"
  //  - drop rows that are parties, not people ("Partido Comunista Brasileiro",
  //    "Unidade Popular"), and table artifacts ("Cen.")
  // No real candidate's name starts with "não" — those are abstention rows.
  const JUNK = /^(partido\b|unidade popular\b|federa[çc][ãa]o\b|cen\.?$|outros?\b|nenhum\b|n[ãa]o\b)/i;
  // ANCHORED PATTERNS ONLY CATCH RESPONSE OPTIONS THAT LEAD WITH THE GIVEAWAY
  // WORD. "Poderia votar em todos" leads with none of the above, so it entered
  // the database as a candidate in the Ceará governor race, at 13,3%, pushing
  // that poll's roster to 110,4%. Hence a second, unanchored pattern — the tell
  // can sit anywhere in the phrase.
  //
  // IT MATCHES ONLY ON WORDS A PERSON'S NAME CANNOT CONTAIN: a conjugated form
  // of "votar", or an indecision word. It deliberately does NOT match `branco`
  // or `nulo`. The first draft did, unanchored, and would have silently deleted
  // **Castelo Branco** — a real surname, and a Piauí political family, in a
  // state this dataset covers heavily. That failure mode is worse than the bug
  // it fixes: no error fires, the candidate simply never appears, and the only
  // symptom is a roster that quietly sums low. A filter that removes rows must
  // be provably narrower than the thing it targets, so the bucket words that
  // double as surnames are left to the anchored `JUNK` rule above.
  const JUNK_PHRASE = /\b(votar|votaria|votariam|votarem|voto|votos)\b|indecis|indiferen|absten[çc]|abstenc/i;
  // Party-preference tables on state pages leak rows where the "candidate" is
  // a party. Full party names + bare acronyms are not people.
  const PARTY_NAMES = new Set([
    "movimento democratico brasileiro", "uniao brasil", "republicanos",
    "progressistas", "partido liberal", "partido dos trabalhadores",
    "partido verde", "rede sustentabilidade", "cidadania", "podemos",
    "avante", "solidariedade", "novo", "missao", "mobiliza", "agir",
    "democracia crista", "partido social democratico",
  ]);
  const normName = (s) =>
    s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
  const isPartyRow = (r) =>
    PARTY_NAMES.has(normName(r.candidate)) ||
    /^[A-Z]{2,6}(?: ?d[oa][BC])?$/.test(r.candidate.trim()); // PT, PL, PSOL, PCdoB…
  for (const p of polls) {
    p.results = p.results
      .map((r) => ({ ...r, candidate: r.candidate.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim() }))
      .filter((r) => r.candidate && !JUNK.test(r.candidate) && !JUNK_PHRASE.test(r.candidate) && !isPartyRow(r));
  }
  polls = polls.filter((p) => p.results.length > 0);

  polls = keepFullestRound1(polls);
  polls = canonicalizeParties(polls);

  // THE RAW NAMES, SAVED BEFORE WE TOUCH THEM.
  //
  // `match-ballot-names.mjs` has to compare what the institute published against
  // the TSE register, and after this next line that string no longer exists
  // anywhere: `polls.json` holds the canonical name and even the store's
  // `name_raw` is written post-canonicalisation. Re-running the matcher without
  // this therefore SHRINKS its own table — "Romeu Zema" stops being in the input
  // the moment it has been renamed to "Zema" — and any accent restored on the
  // first pass is lost on the second. Same defect `candidate-resolve.mjs`
  // records hitting twice: a generator that reads its own output.
  // THE PARTY TRAVELS WITH THE NAME (criador, 2026-08-16).
  //
  // The name alone could not separate two real people. `Álvaro Dias` polled for
  // the SENATE IN PARANÁ as MDB was folded into `Álvaro Costa Dias`, the PL
  // candidate for GOVERNOR OF RIO GRANDE DO NORTE — identical ballot names, so
  // no token rule can reach it, and 24 poll rows took the wrong registration.
  // The party says MDB × PL and settles it in one comparison.
  //
  // The state comes free from the contest key (`race:UF`) and is the other half:
  // it is what tells `senador:PR` from `governador:RN`, and equally what
  // CONFIRMS `Carlos Brandão` — polled for the senate in Maranhão, registered
  // for governor of Maranhão, the incumbent moving between offices in his own
  // state.
  //
  // Stored as an object per name rather than a bare string. `match-ballot-names`
  // still accepts the old string form, because this file is build output that a
  // clone will not have until the first scrape.
  const crus = {};
  for (const p of polls) {
    const k = `${p.race}:${p.state ?? "BR"}`;
    const porNome = (crus[k] ??= new Map());
    for (const r of p.results) {
      if (!porNome.has(r.candidate)) porNome.set(r.candidate, new Set());
      // `party_raw` is what the source said; the canonical label is derived and
      // would hide a genuine disagreement between two institutes.
      if (r.party_raw ?? r.party) porNome.get(r.candidate).add(r.party_raw ?? r.party);
    }
  }
  fs.writeFileSync(
    path.join(ROOT, "data", "nomes-crus.json"),
    JSON.stringify(
      Object.fromEntries(Object.entries(crus).map(([k, m]) => [
        k,
        [...m.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
          .map(([nome, partidos]) => ({ nome, partidos: [...partidos].sort() })),
      ])),
      null, 1) + "\n",
  );

  // A GRAFIA PUBLICADA, PRESA À LINHA ANTES DE QUALQUER REGRA NOSSA TOCAR NELA.
  //
  // `canonicalizeCandidates` reescreve `r.candidate` no lugar. Depois desta
  // linha, a grafia que o instituto publicou não existe em lugar nenhum da
  // memória — e o store, que roda 90 linhas abaixo, gravava `name_raw:
  // r.candidate` achando que era o nome cru. Não era: era a saída da regra da
  // grafia mais curta. Medido: 11.536 linhas de resultado, e exatamente UM
  // `name_raw` distinto por `candidate_id`. Um campo chamado "raw" que só
  // guarda o nome já normalizado não é um campo inútil, é um campo que MENTE —
  // e a camada de pessoas foi construída em cima dele, semeando identidade com
  // a própria regra de que a identidade deveria se desacoplar.
  //
  // `nomes-crus.json`, gravado logo acima, guarda o mesmo conjunto de grafias
  // por disputa — mas como CONJUNTO, sem dizer qual linha de qual pesquisa
  // trouxe cada uma. Para semear identidade é preciso a grafia DAQUELA linha.
  for (const p of polls) {
    for (const r of p.results ?? []) r.candidate_raw = r.candidate;
  }

  polls = canonicalizeCandidates(polls);
  polls = dropExactDuplicates(polls);

  // Null future dates (upstream typos like "2026-08-29" published on Aug 12):
  // a future anchor would corrupt every rolling-average window.
  const maxDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  for (const p of polls) {
    for (const f of ["fieldwork_start", "fieldwork_end", "published_date"]) {
      if (p[f] && p[f] > maxDate) {
        console.warn(`data futura anulada: ${p.pollster} ${p.race}/${p.state ?? "BR"} ${f}=${p[f]}`);
        p[f] = null;
      }
    }
  }

  // A start after the end is either a source typo ("22 a 18 de julho") or a
  // bad merge of one source's start with another's end. The end date is what
  // every average uses, so keep it and drop the start.
  for (const p of polls) {
    if (p.fieldwork_start && p.fieldwork_end && p.fieldwork_start > p.fieldwork_end) {
      console.warn(`início posterior ao fim: ${p.pollster} ${p.race}/${p.state ?? "BR"} ${p.fieldwork_start}>${p.fieldwork_end} — início descartado`);
      p.fieldwork_start = null;
    }
  }

  // Drop individually broken polls (over-cap sums, malformed results) with a
  // log line instead of failing the whole run; the strict validator remains
  // the final gate on what's left.
  const before = polls.length;
  polls = polls.filter((p) => {
    let sum = p.results.reduce((a, r) => a + r.pct, 0);
    sum += (p.undecided_pct ?? 0) + (p.blank_null_pct ?? 0) + (p.others_pct ?? 0);
    const cap = p.race === "senador" ? 260 : 130;
    if (sum > cap) {
      console.warn(`descartada: ${p.pollster} ${p.race}/${p.state ?? "BR"} ${p.fieldwork_end ?? "?"} — soma ${sum.toFixed(1)} > ${cap}`);
      return false;
    }
    // Sums far below 100 are mis-parsed fragments (rejection questions,
    // segment cuts), not vote-intention tables — they'd poison averages.
    if (sum < 30) {
      console.warn(`descartada: ${p.pollster} ${p.race}/${p.state ?? "BR"} ${p.fieldwork_end ?? "?"} — soma ${sum.toFixed(1)} < 30`);
      return false;
    }
    return true;
  });
  if (before !== polls.length) console.warn(`descartadas ${before - polls.length} pesquisa(s) inválida(s) de ${before}`);

  // Enrich with TSE registry: fill registration/sample where we can match on
  // (pollster-ish name, uf) and the poll lacks it. Conservative: only when
  // the poll already has a registration string do we trust joins beyond that.
  const tseByProto = new Map((tse.records ?? []).map((r) => [r.protocolo, r]));
  for (const p of polls) {
    if (p.tse_registration && tseByProto.has(p.tse_registration)) {
      const reg = tseByProto.get(p.tse_registration);
      if (!p.sample_size && reg.sample) p.sample_size = reg.sample;
      if (!p.contractor && reg.pollster) p.contractor = p.contractor ?? null;
    }
  }

  polls.sort((a, b) =>
    (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? ""),
  );

  const prevSources = new Map((previous.sources ?? []).map((s) => [s.name, s]));
  const dataset = {
    generated_at: now,
    sources: [
      { name: "Poder360 — Agregador de Pesquisas", url: "https://www.poder360.com.br/agregador-de-pesquisas/", last_ok: poder.ok ? now : (prevSources.get("Poder360 — Agregador de Pesquisas")?.last_ok ?? null) },
      { name: "Wikipédia — páginas de pesquisas 2026", url: "https://pt.wikipedia.org", last_ok: wiki.ok ? now : (prevSources.get("Wikipédia — páginas de pesquisas 2026")?.last_ok ?? null) },
      { name: "TSE — Dados Abertos (PesqEle)", url: "https://dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026", last_ok: tse.ok ? now : (prevSources.get("TSE — Dados Abertos (PesqEle)")?.last_ok ?? null) },
    ],
    polls,
  };

  const { errors, warn } = validate(dataset, { minPolls: Math.min(50, Math.floor(previous.polls.length * 0.5) || 1) });
  for (const w of warn) console.warn(`WARN: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERRO: ${e}`);
    console.error("Validação falhou — data/polls.json NÃO foi alterado.");
    process.exit(1);
  }

  const tmp = DATA + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(dataset, null, 1));
  fs.renameSync(tmp, DATA);
  console.log(`OK: ${polls.length} pesquisas gravadas em data/polls.json`);

  persistStore(polls, dataset);
}

/**
 * FASE 3: o coletor passa a escrever o store pela ESCADA DE RESOLUÇÃO.
 *
 * Antes, `migrate-to-store.mjs` reconstruía o store a partir de polls.json
 * agrupando por uma chave (`reg:` → `p360:` → composto natural). Aquela chave
 * não conseguia unir o que a fonte separa: o Poder360 arquiva cada cargo de uma
 * mesma operação de campo como um registro nativo diferente, e a mesma pesquisa
 * chegando pela Wikipédia virava um segundo levantamento. `upsertPoll` decide
 * isso pelo que os dados dizem — id nativo, registro TSE, e então instituto +
 * UF + janela de ±3 dias — que é a decisão "uma operação de campo = um
 * levantamento" aplicada de fato.
 *
 * O STORE É RECONSTRUÍDO DO ZERO A CADA EXECUÇÃO, não acumulado. É o que
 * mantém a saída uma função pura da coleta: um registro que sumiu da fonte
 * some daqui, e reexecutar sobre a mesma entrada dá o mesmo arquivo byte a
 * byte. `priorStamps` preserva as datas de "primeira vez que vimos isto", que
 * são a única coisa que não pode ser rederivada da entrada.
 *
 * ORDEM IMPORTA: upsert é primeiro-escritor-vence, então a ingestão segue a
 * prioridade de fontes (poder360 → eleicaoemdados → wikipedia). Paralelizar
 * isso troca silenciosamente qual fonte ganha. Foi exatamente isso que manteve
 * corretos os números do 2º turno do RN: as linhas da AtlasIntel chegam
 * cruzadas pela Wikipédia e certas pelo Poder360, e é a ordem que descarta as
 * cruzadas — registrando a divergência em conflicts.ndjson em vez de escolher
 * em silêncio.
 */
function persistStore(polls, dataset) {
  const runDate = today();
  const { store, report } = buildStoreFromPolls(polls, {
    runDate,
    dir: DATA_DIR,
    meta: {
      generated_at: dataset.generated_at,
      sources: dataset.sources,
      written_by: "scrape.mjs/upsert",
      written_at: new Date().toISOString(),
    },
  });

  // O store só é gravado se passar no validador. Um coletor que grava primeiro
  // e valida depois deixa o banco quebrado no disco esperando alguém reparar.
  const { errors, warn } = validateStore(store, { minSurveys: 500, minQuestions: 2000 });
  for (const w of warn.slice(0, 10)) console.warn(`AVISO: ${w}`);
  if (errors.length) {
    for (const e of errors.slice(0, 20)) console.error(`ERRO: ${e}`);
    console.error(`\nstore NÃO gravado: ${errors.length} erro(s) de validação. data/polls.json já foi atualizado;`);
    console.error("rode o coletor de novo depois de corrigir, ou reconstrua o store a partir dele.");
    process.exit(1);
  }

  const counts = writeStore(store, { dir: DATA_DIR });
  console.log(`store gravado pela escada: ${counts.surveys} levantamentos · ${counts.questions} perguntas · ` +
    `${counts.institutes} institutos · ${counts.candidates} candidatos · ${counts.conflicts} conflitos`);
  console.log(`  resolução: ${JSON.stringify(report)}`);
}

// Só executa quando chamado como programa. Importar este módulo NÃO pode
// disparar uma coleta: um teste que faça `import` dele começava a buscar a
// Wikipédia na hora, e a Fase 3 vai querer importar partes daqui.
if (import.meta.url === `file://${process.argv[1]}`) main();
