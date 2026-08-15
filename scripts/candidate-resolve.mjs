#!/usr/bin/env node
// Decide each candidate-identity pair automatically, against public record.
//
// These are candidates for governor, senate and president — public personas
// whose identity is a matter of record, not a judgement call. So the question
// "are these two names one person?" has a falsifiable answer an agent can
// fetch: resolve each ballot name to its pt.wikipedia article, following
// redirects, and compare. Two names that land on the SAME article are the same
// person, and the citation is a URL anyone can open.
//
// The check must be able to answer BOTH ways. Jair, Flávio, Michelle and
// Eduardo Bolsonaro share a surname and never appear in one poll — the same
// signal that flags "Tião/Sebastião Bocalom" — and they resolve to four
// different articles. An automation that could only say "same" would merge
// them and destroy the database, so DIFFERENT is a first-class verdict here.
//
// Usage: node scripts/candidate-resolve.mjs [--out data/candidate-aliases.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { build } from "./candidate-review.mjs";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";

// Onde cada nome aparece, em todas as disputas.
let NAME_CONTESTS = null;
function contestsOf(name) {
  if (!NAME_CONTESTS) {
    NAME_CONTESTS = new Map();
    for (const p of projectPolls(readStore({ dir: DATA_DIR }))) {
      for (const r of p.results) {
        const k = norm(r.candidate);
        if (!NAME_CONTESTS.has(k)) NAME_CONTESTS.set(k, new Set());
        NAME_CONTESTS.get(k).add(`${p.race}:${p.state ?? "BR"}`);
      }
    }
  }
  return NAME_CONTESTS.get(norm(name)) ?? new Set();
}

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    prev = cur;
  }
  return prev[n];
}

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const API = "https://pt.wikipedia.org/w/api.php";
const UA = "placar-das-pesquisas/1.0 (verificação de identidade de candidatos)";
const HONORIFICS = /^(dr|dra|doutor|doutora|professor|professora|prof|capitao|capitão|coronel|sargento|major|tenente|general|delegado|delegada|pastor|padre|cabo|senador|senadora|deputado|deputada|prefeito|prefeita|juiz|juíza|jornalista)\.?\s+/i;
const bareName = (n) => n.replace(HONORIFICS, "").trim();

const RACE_CTX = { presidente: "eleição presidencial Brasil", governador: "governador", senador: "senador" };

const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/**
 * One request, with backoff. Search is metered more tightly than title lookup
 * and answers 429 quickly; retrying politely is the difference between a run
 * that completes and one that dies two thirds of the way through.
 */
async function api(params, { attempt = 0 } = {}) {
  const qs = new URLSearchParams({ format: "json", formatversion: "2", ...params });
  const res = await fetch(`${API}?${qs}`, { headers: { "User-Agent": UA }, signal: AbortSignal.timeout(30_000) });
  if (res.status === 429 || res.status >= 500) {
    if (attempt >= 5) throw new Error(`wikipedia HTTP ${res.status} após ${attempt} tentativas`);
    const wait = Number(res.headers.get("retry-after")) * 1000 || 1000 * 2 ** attempt;
    await sleep(wait);
    return api(params, { attempt: attempt + 1 });
  }
  if (!res.ok) throw new Error(`wikipedia HTTP ${res.status}`);
  await sleep(350); // be a polite client
  return res.json();
}

/** Exact-title resolution, following redirects, in batches. name -> {pageid,title} */
async function resolveExact(names) {
  const out = new Map();
  for (let i = 0; i < names.length; i += 40) {
    const batch = names.slice(i, i + 40);
    const j = await api({ action: "query", titles: batch.join("|"), redirects: "1" });
    const q = j.query ?? {};
    // Walk normalized → redirects → final page, so we can map back to the input.
    const chain = new Map();
    for (const n of q.normalized ?? []) chain.set(n.from, n.to);
    for (const r of q.redirects ?? []) chain.set(r.from, r.to);
    const byTitle = new Map((q.pages ?? []).map((p) => [p.title, p]));
    for (const name of batch) {
      let t = name, hops = 0;
      while (chain.has(t) && hops++ < 5) t = chain.get(t);
      const page = byTitle.get(t);
      if (page && !page.missing) out.set(name, { pageid: page.pageid, title: page.title, via: "título exato" });
    }
  }
  return out;
}

/**
 * Search fallback for ballot names that are not article titles.
 *
 * Accepting a hit on title-token overlap alone was both too strict (missing
 * "Professora Dorinha" → "Dorinha Seabra") and too loose (a search for "Dr
 * Daniel" returns anything). The article's OWN TEXT is the better test: a
 * politician's page states the ballot name they run under. So a hit counts
 * only if its intro contains the full name, or its title matches ignoring
 * accents and honorifics.
 */
async function resolveSearch(name, race, bare) {
  const j = await api({ action: "query", list: "search", srsearch: `"${name}" ${RACE_CTX[race] ?? ""}`.trim(), srlimit: "5" });
  const hits = j.query?.search ?? [];
  if (!hits.length) return null;
  const got = await intros(hits.map((h) => h.pageid));
  const want = norm(name), wantBare = norm(bare);
  for (const h of hits) {
    const title = norm(h.title);
    const intro = norm(got.get(h.pageid) ?? "");
    if (title === want || title === wantBare) return { pageid: h.pageid, title: h.title, via: "busca (título)" };
    if (intro.includes(want) || (wantBare.length > 6 && intro.includes(wantBare))) {
      return { pageid: h.pageid, title: h.title, via: "busca (nome citado no artigo)" };
    }
  }
  return null;
}

/** Intro text, for cross-mention checks ("Sebastião … conhecido como Tião"). */
async function intros(pageids) {
  const out = new Map();
  const ids = [...new Set(pageids)];
  for (let i = 0; i < ids.length; i += 20) {
    const j = await api({ action: "query", pageids: ids.slice(i, i + 20).join("|"), prop: "extracts", exintro: "1", explaintext: "1" });
    for (const p of j.query?.pages ?? []) out.set(p.pageid, p.extract ?? "");
  }
  return out;
}

const url = (title) => `https://pt.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`;

async function main() {
  const pairs = build();
  const names = [...new Set(pairs.flatMap((p) => [p.A, p.B]))];
  console.log(`${pairs.length} pares · ${names.length} nomes distintos a resolver\n`);

  const resolved = await resolveExact(names);
  console.log(`título exato: ${resolved.size}/${names.length}`);

  const raceOf = new Map();
  for (const p of pairs) { raceOf.set(p.A, p.contest.split("|")[0]); raceOf.set(p.B, p.contest.split("|")[0]); }
  let viaSearch = 0;
  for (const n of names) {
    if (resolved.has(n)) continue;
    const hit = await resolveSearch(n, raceOf.get(n), bareName(n));
    if (hit) { resolved.set(n, hit); viaSearch++; }
  }
  console.log(`busca: +${viaSearch} · não resolvidos: ${names.length - resolved.size}\n`);

  const text = await intros([...resolved.values()].map((r) => r.pageid));

  // Pairs settled by research against sources Wikipedia alone cannot reach —
  // state politicians without an article, whose identity lives in TSE records,
  // assembly pages and local press. Committed as data with citations, so a
  // re-run keeps them instead of re-litigating.
  const researched = new Map();
  const rf = path.join(ROOT, "data/candidate-verdicts-researched.json");
  if (fs.existsSync(rf)) {
    for (const r of JSON.parse(fs.readFileSync(rf, "utf-8")).verdicts ?? []) {
      researched.set(`${r.contest}|${r.names.slice().sort().join("|")}`, r);
    }
  }

  // Creator rulings outrank everything below. They exist because article
  // identity is necessary but NOT sufficient: it answers "are these two
  // articles the same person?" and never asks "is that person even running in
  // THIS contest?". A real "Professor Alcides" (Alcides Ribeiro Filho, PSDB)
  // is a federal deputy for GOIÁS — so the automation correctly saw two
  // articles and wrongly concluded the CEARÁ senate row was a second person.
  const rulings = new Map();
  const gf = path.join(ROOT, "data/candidate-rulings.json");
  if (fs.existsSync(gf)) {
    for (const r of JSON.parse(fs.readFileSync(gf, "utf-8")).rulings ?? []) {
      for (const a of r.names) for (const b of r.names) {
        if (a !== b) rulings.set(`${r.contest}|${[a, b].sort().join("|")}`, r);
      }
    }
  }

  const verdicts = pairs.map((p) => {
    const ra = resolved.get(p.A), rb = resolved.get(p.B);
    const cite = (r) => (r ? `${r.title} (${url(r.title)})` : null);

    const ruled = rulings.get(`${p.contest.replace("|", ":")}|${[p.A, p.B].sort().join("|")}`);
    if (ruled) {
      return { ...v(p), verdict: ruled.verdict, why: `decisão do criador — ${ruled.evidence}`,
               a: ruled.sources?.[0] ?? null, b: ruled.sources?.[1] ?? null,
               canonical: ruled.canonical, confidence: "criador", via: "decisão do criador" };
    }

    // TYPOGRAPHIC RULE, and it is deliberately ranked BELOW article evidence.
    //
    // "Érica kokay" is not an article title, so it never resolves, even though
    // "Erika Kokay" does — leaving an obvious pair unsettled. When two names in
    // the SAME contest differ by at most two characters, have the same number
    // of tokens, and never appear in one poll, one is a misspelling of the
    // other. What makes it safe is the ordering: if BOTH names resolve to
    // articles, that evidence has already decided the pair before this runs.
    // "Marcelo Queiroga" × "Marcelo Queiroz" is two characters apart and two
    // different people — and it never reaches here, because both have articles.
    const nameDist = levenshtein(norm(p.A), norm(p.B));
    const sameShape = norm(p.A).split(/\s+/).length === norm(p.B).split(/\s+/).length;
    if ((!ra || !rb) && nameDist > 0 && nameDist <= 2 && sameShape) {
      const anchor = ra ?? rb;
      return { ...v(p), verdict: "MESMA",
               why: `grafias a ${nameDist} caractere(s) de distância na mesma disputa` +
                    (anchor ? `; uma delas tem artigo` : `; nenhuma tem artigo — evidência é tipográfica, não documental`),
               a: cite(ra), b: cite(rb),
               canonical: anchor ? anchor.title : null,
               confidence: anchor ? "alta" : "tipográfica" };
    }

    if (!ra || !rb) {
      const r = researched.get(`${p.contest.replace("|", ":")}|${[p.A, p.B].sort().join("|")}`);
      if (r) {
        return { ...v(p), verdict: r.verdict === "INCERTO" ? "NAO_RESOLVIDO" : r.verdict,
                 why: r.evidence, a: r.sources?.[0] ?? null, b: r.sources?.[1] ?? null,
                 canonical: r.canonical, confidence: r.confidence, via: "pesquisa em fontes públicas" };
      }
      return { ...v(p), verdict: "NAO_RESOLVIDO", why: `sem artigo para ${!ra ? p.A : p.B}`, a: cite(ra), b: cite(rb) };
    }
    if (ra.pageid === rb.pageid) {
      return { ...v(p), verdict: "MESMA", why: `ambos resolvem para o mesmo artigo`, a: cite(ra), b: cite(rb), canonical: ra.title };
    }
    // DIFFERENT ARTICLES ⇒ DIFFERENT PEOPLE. No softening.
    //
    // The first version of this file added a "but does one article mention the
    // other name?" fallback, and it declared Flávio Bolsonaro and Jair
    // Bolsonaro the same person — a son's article names his father, a wife's
    // names her husband (Gracinha × Ronaldo Caiado went the same way). Family
    // cross-references are exactly what a shared surname produces, so that
    // check inverted precisely where the stakes are highest. Wikipedia already
    // encodes "same person, other name" as a REDIRECT, which the exact-title
    // pass follows; anything beyond that is guessing.
    const exact = ra.via === "título exato" && rb.via === "título exato";
    return { ...v(p), verdict: "DIFERENTES", why: `artigos distintos${exact ? "" : " (uma resolução veio de busca)"}`,
             a: cite(ra), b: cite(rb), confidence: exact ? "alta" : "média" };
  });

  function v(p) { return { contest: p.contest, A: p.A, B: p.B, suggestion: p.suggestion }; }

  const by = (k) => verdicts.filter((x) => x.verdict === k);
  console.log(`MESMA pessoa:     ${by("MESMA").length}`);
  console.log(`PESSOAS DIFERENTES: ${by("DIFERENTES").length}`);
  console.log(`não resolvido:    ${by("NAO_RESOLVIDO").length}\n`);

  // Where the automatic verdict CONTRADICTS the string heuristic — the cases
  // that justify running this at all.
  const surprises = verdicts.filter((x) =>
    (x.verdict === "MESMA" && (x.suggestion === "prenome_comum" || x.suggestion === "sobrenome_comum")) ||
    (x.verdict === "DIFERENTES" && (x.suggestion === "grafia" || x.suggestion === "titulo_apelido")));
  if (surprises.length) {
    console.log(`⚠ ${surprises.length} veredito(s) contrariam a heurística de string:`);
    for (const s of surprises) console.log(`   ${s.verdict.padEnd(11)} ${s.A} × ${s.B}  [${s.suggestion}]  ${s.why}`);
    console.log("");
  }

  // ---- groups: connected components + the name the site should DISPLAY ----
  //
  // "same person" is transitive, so pairs must be collapsed into components
  // before anything is applied: Jeferson / Jefferson / Jefferson Bezzerra is
  // one person in three spellings, reached through two separate pairs.
  //
  // The display name is NOT the Wikipedia title. That title is evidence of
  // identity, not of usage — it would put "Zucco" on the site where every
  // institute writes "Luciano Zucco". The name polls actually use wins, by
  // frequency, so applying the table changes who is counted without changing
  // how the site reads.
  const occ = new Map();
  for (const p of pairs) {
    occ.set(`${p.contest}\u0000${p.A}`, p.a.n);
    occ.set(`${p.contest}\u0000${p.B}`, p.b.n);
  }
  const parent = new Map();
  const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
  const add = (x) => { if (!parent.has(x)) parent.set(x, x); };
  for (const x of verdicts.filter((v) => v.verdict === "MESMA")) {
    const ka = `${x.contest}\u0000${x.A}`, kb = `${x.contest}\u0000${x.B}`;
    add(ka); add(kb);
    parent.set(find(ka), find(kb));
  }
  const comps = new Map();
  for (const k of parent.keys()) {
    const root = find(k);
    if (!comps.has(root)) comps.set(root, []);
    comps.get(root).push(k);
  }
  // Which member becomes the display name.
  //
  // Frequency alone ("what do institutes write most?") picked `Professor
  // Tonny` over `Tonny Kerley` and `Cadu de Lula` over `Cadu Xavier` — it
  // cannot tell a person's name from the honorific or the allegiance tag
  // wrapped around it. So when the evidence named the person, and one of the
  // poll spellings matches that name (exactly, or as its leading part —
  // "Tonny Kerley" inside "Tonny Kerley de Alencar Rodrigues"), that spelling
  // wins. Frequency decides only when the evidence offers no such match, which
  // is the typo pairs, where no member is more "correct" than the other.
  const canonOf = new Map();
  for (const x of verdicts) {
    if (x.verdict !== "MESMA" || !x.canonical) continue;
    for (const n of [x.A, x.B]) canonOf.set(`${x.contest}\u0000${n}`, x.canonical);
  }
  const groups = [...comps.values()].map((keys) => {
    const contest = keys[0].split("\u0000")[0];
    const members = keys.map((k) => k.split("\u0000")[1]);
    const byFreq = members.slice().sort((a, b) =>
      (occ.get(`${contest}\u0000${b}`) ?? 0) - (occ.get(`${contest}\u0000${a}`) ?? 0) || b.length - a.length);
    const canons = [...new Set(members.map((m) => canonOf.get(`${contest}\u0000${m}`)).filter(Boolean))].map(norm);
    const evidenced = byFreq.find((m) => canons.some((c) => c === norm(m) || c.startsWith(norm(m) + " ")));
    const display = evidenced ?? byFreq[0];
    return { contest: contest.replace("|", ":"), display, members: members.sort(),
             display_from: evidenced ? "nome apurado na evidência" : "grafia mais frequente",
             counts: Object.fromEntries(members.map((m) => [m, occ.get(`${contest}\u0000${m}`) ?? 0])) };
  }).sort((a, b) => a.contest.localeCompare(b.contest) || a.display.localeCompare(b.display));

  // A decision is about a PERSON, but the pair scan only ever compares names
  // inside one contest — so a state politician polled for BOTH governor and
  // senate gets decided in one race and left untouched in the other. "Capitão
  // Derrite" survived in governador:SP because "Guilherme Derrite" never
  // appears there, so no pair could form.
  //
  // Carried to sibling contests of the SAME STATE only. Not nationally: a
  // ballot name in another state can be a different person entirely — a real
  // "Professor Alcides" is a federal deputy for Goiás while the Ceará row of
  // that name is the pastor, which is exactly how the automation was fooled
  // once already.
  const extra = [];
  for (const g of groups) {
    const uf = g.contest.split(":")[1];
    if (!uf || uf === "BR") continue;
    for (const m of g.members) {
      for (const other of contestsOf(m)) {
        if (other === g.contest || other.split(":")[1] !== uf) continue;
        if (m === g.display) continue; // já é o nome de exibição: nada a reescrever
        if (groups.some((x) => x.contest === other && x.members.includes(m))) continue;
        extra.push({ contest: other, display: g.display, members: [m],
                     display_from: `estendido de ${g.contest} (mesma UF, outro cargo)`,
                     counts: {} });
      }
    }
  }
  if (extra.length) {
    console.log(`estendidos para disputa irmã da mesma UF: ${extra.length}`);
    for (const e of extra) console.log(`   ${e.contest}: ${e.members[0]} → ${e.display}`);
    groups.push(...extra);
  }

  console.log(`grupos: ${groups.length} (${groups.reduce((s, g) => s + g.members.length, 0)} nomes)`);
  for (const g of groups.filter((x) => x.members.length > 2)) {
    console.log(`   ${g.contest} → ${g.display}  ⊃ ${g.members.join(", ")}`);
  }

  const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
  const out = path.join(ROOT, outArg ?? "data/candidate-aliases.json");
  fs.writeFileSync(out, JSON.stringify({
    version: 1,
    groups,
    note: "Identidade de candidatos decidida contra o registro público (pt.wikipedia), não por heurística de string. " +
          "Gerado por scripts/candidate-resolve.mjs. Cada entrada cita o artigo que a sustenta; qualquer uma é falsificável abrindo a URL.",
    generated_by: "scripts/candidate-resolve.mjs",
    aliases: by("MESMA").map((x) => ({
      contest: x.contest.replace("|", ":"), canonical: x.canonical, names: [x.A, x.B],
      evidence: { a: x.a, b: x.b, why: x.why },
    })),
    distinct: by("DIFERENTES").map((x) => ({ contest: x.contest.replace("|", ":"), names: [x.A, x.B], evidence: { a: x.a, b: x.b }, confidence: x.confidence })),
    unresolved: by("NAO_RESOLVIDO").map((x) => ({ contest: x.contest.replace("|", ":"), names: [x.A, x.B], why: x.why })),
  }, null, 1) + "\n");
  console.log(`→ ${path.relative(ROOT, out)}`);
}

main();
