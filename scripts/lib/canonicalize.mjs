// Candidate entity resolution across sources. "Lula" (Poder360) and
// "Luiz Inácio Lula da Silva" (Wikipedia) must be ONE series in averages and
// trendlines. Rule: two names are the same person iff one name's token set is
// a SUBSET of the other's (ignoring da/de/do stopwords) — safe for short-vs-
// full names, refuses "Flávio Bolsonaro" vs "Michelle Bolsonaro". A name that
// subset-matches MORE THAN ONE cluster is ambiguous and stays unmerged.

import { canonicalPartyAt } from "./parties.mjs";
import { canonicalCandidate, areDistinct } from "./candidates.mjs";

const STOP = new Set(["da", "de", "do", "das", "dos", "e"]);

/**
 * A CLÁUSULA DE CENÁRIO NÃO É PARTE DO NOME (decisão do criador, 17/08/2026).
 *
 * O Poder360 publica, na própria célula `nome`, a CONDIÇÃO da pergunta junto do
 * candidato: "Ciro Nogueira, com apoio do ex-presidente Jair Bolsonaro". A
 * pergunta que o instituto fez é "você votaria em Ciro Nogueira SE ele fosse
 * apoiado por Jair Bolsonaro?" — o voto é do Ciro Nogueira, e o apoiador jamais
 * deveria influenciar o casamento de identidade. O nome é o que vem antes da
 * vírgula; o resto é qualificador do cenário.
 *
 * O QUE ISSO CUSTOU ANTES DE SER ENTENDIDO. Sem isto, os tokens do apoiador
 * entram no casamento e `isSubset` faz "Jair Bolsonaro" caber dentro da
 * cláusula: o 32,2 da Tereza Cristina foi ao ar como sendo do Jair Bolsonaro
 * (commit `6231cca`), e o 29,1 do Ciro Nogueira (PP) é absorvido pelo Jair
 * (PL) exatamente do mesmo jeito. Pior, o resultado depende do elenco que a
 * disputa por acaso tem: a MESMA string vira Tarcísio em `governador:SP`, onde
 * havia um match, e pessoa nova em `presidente:PR`, onde não havia. Identidade
 * decidida por sorte.
 *
 * A VÍRGULA É O DISCRIMINADOR, e isso foi MEDIDO, não suposto: dos 735 nomes
 * distintos do banco (store + `nomes-crus.json`), exatamente 9 têm vírgula e os
 * 9 são cláusula. Nenhum nome legítimo tem — nem os que enganam um detector por
 * tamanho, como "Adailton de Valmir de Francisquinho". Nenhum outro separador
 * (`;`, `(`, `:`, ` - `) aparece em nome nenhum.
 *
 * A grafia crua NÃO se perde: `scrape.mjs` prende `r.candidate_raw` antes de
 * canonicalizar e o store guarda `name_raw`, então a cláusula continua
 * auditável — some do casamento e da exibição, não do registro.
 */
export function nomeSemClausula(name) {
  const i = name.indexOf(",");
  if (i < 0) return name;
  const cabeca = name.slice(0, i).trim();
  // Cabeça vazia significa que a vírgula abre a string — não é a forma que se
  // mediu, então não se adivinha: devolve como veio (§4).
  return cabeca || name;
}

export function nameTokens(name) {
  return new Set(
    nomeSemClausula(name)
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

/**
 * EXPORTADA porque a TRADUÇÃO DE CARIMBO tem de reencontrar o instituto pela
 * MESMA regra que decidiu que as duas linhas são um instituto só.
 *
 * `translateInstituteStamps` (em `lib/build-store.mjs`) casa a linha antiga com
 * a nova por estes tokens, e não podia ser por outra chave: quando o
 * agrupamento aqui trocou o canônico "Percent Brasil" por "Percent", o
 * `institute_id` (cunhado do nome canônico) se moveu e os conjuntos de ALIASES
 * das duas linhas ficaram DISJUNTOS — `["Percent Brasil"]` contra `["Percent"]`.
 * Uma chave por alias só acharia um órfão; o token compartilhado `percent` é o
 * que reencontra a linha — e é literalmente o motivo pelo qual as duas viraram
 * um instituto só.
 *
 * ⚠ BASTA UM TOKEN EM COMUM; não é igualdade de conjunto. Já esteve escrito
 * aqui que o casamento depende de "brasil" estar em `POLLSTER_STOP`. Não
 * depende: removendo "brasil" da lista, o caso da Percent continua traduzindo
 * (provado por mutação numa verificação independente). A stopword reduz colisão,
 * não é o que faz o reencontro acontecer.
 *
 * Um SEGUNDO normalizador seria o defeito clássico deste repositório — um
 * ajudante que existia duas vezes publicou um homem sob dois nomes (§5).
 */
export function pollsterTokens(name) {
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
  // Acre's institute is Travessia; Poder360 files it as "Instituto Travessia"
  // and Wikipedia as "Travessia Diagnóstico". Pinned because the shared token
  // "diagnóstico" otherwise drags it into "Diagnóstico/Acieg" — a GOIÁS
  // outfit (Acieg is the state's commercial association). That merge was live
  // and wrong before any of this: "Diagnóstico/Acieg" was labelling 2 Acre
  // polls alongside 3 Goiás ones, i.e. one name for two unrelated institutes.
  ["travessiadiagnostico", "Instituto Travessia"],
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
  // SEED ORDER IS DETERMINISTIC, NOT FREQUENCY-BASED.
  //
  // Seeds used to be the most-frequent names, which made an institute's name
  // depend on how much OTHER data happened to be present. Collecting 365
  // state-level presidential polls shifted the counts, one Acre institute
  // split in two ("Instituto Travessia" from Poder360, "Travessia
  // Diagnóstico" from Wikipedia and "Diagnóstico/Acieg" each share a token
  // with the next), the cross-source merge that depended on the shared name
  // stopped happening, and an Acre SENATE poll fell out of the averages — a
  // race with no presidential polls in it at all.
  //
  // Shortest-then-alphabetical instead: it depends only on the SET of names,
  // never on their counts, and it prefers the plain form ("Quaest" seeds the
  // cluster "Genial/Quaest" joins). A name still only joins by sharing a
  // distinctive token with the SEED, so transitive chains cannot form.
  const names = [...freq.keys()].sort((a, b) => a.length - b.length || a.localeCompare(b, "pt-BR"));
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
    // The DISPLAY name keeps using attestation, deliberately.
    //
    // I tried removing frequency here too, for symmetry with the seeding fix
    // above, and it was a bad trade: "shortest member" published "Real Time Big
    // Data" as "Real Time", and "longest non-pairing member" renamed 32
    // institutes into their verbose legal forms — "Futura" became "Futura
    // Inteligência", "Ranking" became "Instituto Ranking Brasil Inteligência",
    // "TN/Consult" became the lowercase "consult pesquisas".
    //
    // Attestation is what actually encodes "the name this institute is known
    // by": the short well-known form is used repeatedly, a truncation or a
    // legal name appears once. And the risk here is bounded in a way the
    // seeding risk was not — cluster MEMBERSHIP is now frequency-free, so a
    // shifting count can only relabel a cluster, never change which polls merge
    // or which get dropped. That was the whole damage in the Acre case.
    const attested = c.members.filter((n) => (freq.get(n) ?? 0) >= 2);
    const pool = attested.length ? attested : c.members;
    const canonical = [...pool].sort((a, b) => a.length - b.length || a.localeCompare(b, "pt-BR"))[0];
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
      // A cláusula sai ANTES da tabela curada e antes do agrupamento: ela é a
      // condição do cenário, não o nome de quem recebeu o voto (ver
      // `nomeSemClausula`). Tirá-la aqui faz o nome PUBLICADO ser o do
      // candidato — sem isto a linha do Ciro Nogueira publicava a pergunta
      // inteira como se fosse o nome dele.
      for (const r of p.results ?? []) r.candidate = canonicalCandidate(nomeSemClausula(r.candidate), contest);
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
