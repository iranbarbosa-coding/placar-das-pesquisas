// Candidate entity resolution across sources. "Lula" (Poder360) and
// "Luiz Inácio Lula da Silva" (Wikipedia) must be ONE series in averages and
// trendlines. Rule: two names are the same person iff one name's token set is
// a SUBSET of the other's (ignoring da/de/do stopwords) — safe for short-vs-
// full names, refuses "Flávio Bolsonaro" vs "Michelle Bolsonaro". A name that
// subset-matches MORE THAN ONE cluster is ambiguous and stays unmerged.

import { canonicalPartyAt } from "./parties.mjs";
import { canonicalCandidate, areDistinct } from "./candidates.mjs";

const STOP = new Set(["da", "de", "do", "das", "dos", "e"]);

export function nameTokens(name) {
  return new Set(
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, " ")
      .split(/\s+/)
      .map((t) => (t === "jr" ? "junior" : t))
      .filter((t) => t && !STOP.has(t)),
  );
}

function isSubset(a, b) {
  for (const t of a) if (!b.has(t)) return false;
  return true;
}

export function sameCandidate(nameA, nameB) {
  const a = nameTokens(nameA);
  const b = nameTokens(nameB);
  if (!a.size || !b.size) return false;
  return isSubset(a, b) || isSubset(b, a);
}

/**
 * Institute (pollster) entity resolution. Sources name the same institute
 * differently — "Quaest" vs "Genial/Quaest", "Nexus" vs "Nexus/BTG Pactual",
 * "Ideia" vs "Meio/Ideia" (Wikipedia's combined contractor/pollster column).
 * Cluster by key containment; canonical = the shortest well-attested name.
 */
// Generic words that never identify an institute on their own.
const POLLSTER_STOP = new Set([
  "de", "do", "da", "e", "instituto", "institutos", "pesquisa", "pesquisas",
  "inteligencia", "consultoria", "comunicacao", "estrategia", "opiniao",
  "dados", "data", "big", "time", "grupo", "group", "brasil", "op",
]);

function pollsterTokens(name) {
  return new Set(
    name
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .toLowerCase()
      .split(/[^a-z0-9]+/)
      .filter((t) => t.length >= 3 && !POLLSTER_STOP.has(t)),
  );
}

// Institutes whose brandings share no token — undiscoverable by clustering.
// Found by receipt-check (identical registered polls under both names).
const POLLSTER_ALIASES = new Map([
  ["indexa", "Data Index"],
  ["atlasinstel", "AtlasIntel"], // recurring typos in wiki tables
  ["altasintel", "AtlasIntel"],
  ["cnt", "MDA"], // CNT is MDA's contractor; wiki sometimes credits CNT alone
]);

/** Remove wikitext leakage, regional qualifiers and noise from an institute name. */
export function sanitizePollsterName(name) {
  const clean = name
    .split("{{")[0] // citation-template leakage from wiki cells
    .replace(/\s*\([^)]*\)\s*/g, " ") // "(Belém)", "(Baixo Amazonas)" regional editions
    .replace(/\s+/g, " ")
    .replace(/[\s/|,;–-]+$/g, "")
    .trim()
    .slice(0, 60);
  const aliased = POLLSTER_ALIASES.get(pollsterKeyOf(clean));
  return aliased ?? clean;
}

function pollsterKeyOf(name) {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
}

export function canonicalizePollsters(polls) {
  for (const p of polls) p.pollster = sanitizePollsterName(p.pollster) || p.pollster;

  const freq = new Map();
  for (const p of polls) freq.set(p.pollster, (freq.get(p.pollster) ?? 0) + 1);
  // Most frequent names become cluster SEEDS. A name only joins a cluster by
  // sharing a distinctive token with the SEED (never with later members) —
  // transitive chains ("Doxa (RMB)" → "Destak (RMB)" → …) cannot form.
  const names = [...freq.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
  const clusters = []; // {seed, seedTokens, members: []}
  const canonicalOf = new Map();
  for (const name of names) {
    const tk = pollsterTokens(name);
    // The segment after the last "/" is the institute; a match there beats
    // a match on the partner/contractor prefix ("100%Cidades/Futura" must
    // join "Futura", not a "100% Cidades" cluster).
    const finalTk = pollsterTokens(name.split("/").pop() ?? name);
    let best = null;
    let bestScore = 0;
    for (const c of clusters) {
      let score = 0;
      for (const t of tk) if (c.seedTokens.has(t)) score += finalTk.has(t) ? 3 : 1;
      if (score > bestScore) {
        bestScore = score;
        best = c;
      }
    }
    if (best && bestScore >= 1) best.members.push(name);
    else clusters.push({ seed: name, seedTokens: tk, members: [name] });
  }
  for (const c of clusters) {
    const attested = c.members.filter((n) => (freq.get(n) ?? 0) >= 2);
    const pool = attested.length ? attested : c.members;
    const canonical = pool.sort((a, b) => a.length - b.length)[0];
    for (const n of c.members) canonicalOf.set(n, canonical);
  }
  for (const p of polls) p.pollster = canonicalOf.get(p.pollster) ?? p.pollster;
  return polls;
}

/**
 * Within each (race, state) contest, cluster candidate names and rewrite every
 * poll result to the cluster's canonical display name (the most frequent one).
 * Party is filled from the cluster when a result lacks it.
 */
/**
 * Unify party LABELS across every result row.
 *
 * Runs before the candidate clustering below, which propagates a party from
 * one row to another (`if (!r.party && c.party)`) — propagating a raw spelling
 * would spread it, so it is normalised first.
 */
export function canonicalizeParties(polls) {
  for (const p of polls) {
    const date = p.fieldwork_end ?? p.published_date ?? null;
    for (const r of p.results ?? []) r.party = canonicalPartyAt(r.party, date);
  }
  return polls;
}

export function canonicalizeCandidates(polls) {
  const contests = new Map();
  for (const p of polls) {
    const k = `${p.race}:${p.state ?? "BR"}`;
    if (!contests.has(k)) contests.set(k, []);
    contests.get(k).push(p);
  }

  // THE CURATED TABLE OUTRANKS THE GUESS, in both directions.
  //
  // Left to itself the token-subset matcher merges "Ciro Nogueira" into "Ciro"
  // — two different politicians — while failing to merge "Tião Bocalom" with
  // "Sebastião Bocalom", who are one person. It is the wrong instrument, so it
  // is no longer allowed the final word: names decided in
  // `data/candidate-aliases.json` are folded first, and any pair recorded there
  // as DIFFERENT people can never be clustered together, however similar the
  // strings look.
  for (const [contest, contestPolls] of contests) {
    for (const p of contestPolls) {
      for (const r of p.results ?? []) r.candidate = canonicalCandidate(r.candidate, contest);
    }
  }

  for (const [contest, contestPolls] of contests) {
    const freq = new Map(); // display name -> {n, party}
    for (const p of contestPolls) {
      for (const r of p.results) {
        const e = freq.get(r.candidate) ?? { n: 0, party: null };
        e.n++;
        if (!e.party && r.party) e.party = r.party;
        freq.set(r.candidate, e);
      }
    }
    // Most frequent names become cluster seeds first.
    const names = [...freq.entries()].sort((x, y) => y[1].n - x[1].n);
    const clusters = []; // {canonical, tokens, party}
    const mapping = new Map(); // raw name -> cluster
    for (const [name, meta] of names) {
      const tk = nameTokens(name);
      const matches = clusters.filter(
        (c) => (isSubset(tk, c.tokens) || isSubset(c.tokens, tk)) &&
               !c.names.some((n) => areDistinct(n, name, contest)),
      );
      if (matches.length === 1) {
        const c = matches[0];
        mapping.set(name, c);
        c.names.push(name);
        if (!c.party && meta.party) c.party = meta.party;
        // Grow the cluster token set to the LONGER name so future short
        // aliases still match.
        if (tk.size > c.tokens.size) c.tokens = tk;
      } else {
        // 0 matches → new cluster; >1 matches → ambiguous, own cluster.
        const c = { canonical: name, tokens: tk, party: meta.party, names: [name] };
        clusters.push(c);
        mapping.set(name, c);
      }
    }
    // Canonical display name = the shortest name seen ≥2 times in the
    // cluster (pollsters use ballot names: "Lula", not the full legal name);
    // fall back to the seed (most frequent) name.
    const clusterNames = new Map();
    for (const [name, c] of mapping) {
      if (!clusterNames.has(c)) clusterNames.set(c, []);
      clusterNames.get(c).push(name);
    }
    for (const [c, list] of clusterNames) {
      const frequent = list.filter((n) => (freq.get(n)?.n ?? 0) >= 2);
      const pool = frequent.length ? frequent : list;
      c.canonical = pool.sort((a, b) => a.length - b.length)[0];
    }

    for (const p of contestPolls) {
      for (const r of p.results) {
        const c = mapping.get(r.candidate);
        if (!c) continue;
        r.candidate = c.canonical;
        if (!r.party && c.party) r.party = c.party;
      }
      // Canonicalization can make two rows collapse to one person (e.g. a
      // table listing both "Lula" and full name) — keep the higher number.
      const seen = new Map();
      p.results = p.results.filter((r) => {
        const prev = seen.get(r.candidate);
        if (prev) {
          if (r.pct > prev.pct) prev.pct = r.pct;
          return false;
        }
        seen.set(r.candidate, r);
        return true;
      });
    }
  }
  return polls;
}
