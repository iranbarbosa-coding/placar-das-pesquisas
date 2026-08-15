// Canonical party labels.
//
// Sources spell the same party several ways and we render whatever arrives, so
// one page could show "UNIÃO" beside "União Brasil", or "PSOL", "Psol" and
// "psol" in three rows of one table. Worse, party is evidence: the candidate
// review weighs "do both spellings of this name follow the same party
// trajectory?", and three spellings of one party make a single person look like
// two.
//
// THE GOVERNING RULE (creator, 2026-08-15): **a poll keeps the party it was
// taken with.** The database is historical; each record stands at its own date.
// This module may only unify SPELLINGS of one party as it was named at that
// moment — case, accents, abbreviation-versus-name, source encoding bugs.
//
// It must never map a party onto a later one. Renames, mergers, absorptions and
// dissolutions are all changes to the political record, not to spelling: a poll
// that named PMDB named PMDB, and rewriting it as MDB would put a word in the
// respondent's mouth. Every such case belongs in NOT_MERGED at the bottom, with
// its reason, and stays there unless the creator says otherwise.
//
// An unrecognised party passes through unchanged (trimmed). A new party
// appearing mid-campaign is normal, not an error, and must never be dropped.

/** Match key: accent-, case- and punctuation-insensitive. */
const key = (s) =>
  (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");

// canonical label -> every spelling seen in the wild
const ALIASES = {
  // — case / accent only ------------------------------------------------
  PSOL: ["PSOL", "Psol", "psol"],
  Novo: ["Novo", "NOVO"],
  Rede: ["Rede", "REDE"],
  Mobiliza: ["Mobiliza", "MOBILIZA"],
  PP: ["PP", "pp", "Progressistas"],
  "Sem partido": ["Sem partido", "sem partido"],

  // — abbreviation vs name, same party today ----------------------------
  "União Brasil": ["União Brasil", "UNIÃO", "União"],
  Podemos: ["Podemos", "PODE"],
  Republicanos: ["Republicanos", "REP", "Republicans (Brazil)"],

  // — leaks from the ENGLISH Wikipedia pages ----------------------------
  Missão: ["Missão", "MISSÃO", "Mission"],
  PT: ["PT", "Workers' Party (Brazil)"],

  // — wikitext the parser failed to unwrap ------------------------------
  //   "[[Partido Social Democrático (2011)|PSD]]" arrived with its brackets.
  PSD: ["PSD", "[Partido Social Democrático (2011)|PSD]]"],
};

/**
 * Defunct labels this module will NEVER rewrite on its own, whatever the date.
 *
 * A rename has one successor and the fix follows from it, so `canonicalPartyAt`
 * applies it. An INCORPORATION does not: DEM's members could go to União Brasil
 * or anywhere else, and PROS's likewise. Picking one would be inventing a fact
 * about a person. These stay as found, the validator keeps flagging them, and
 * each is fixed one record at a time in `data/repairs.json` against that poll's
 * own document.
 */
export const NOT_MERGED = ["DEM", "Pros"];

/**
 * Party names that had ceased to exist by the time our data starts.
 *
 * A poll keeps the party it was taken with — but a poll cannot have been taken
 * with a party that did not exist on its date. That is not history to preserve,
 * it is the SOURCE being wrong, and the creator's ruling (2026-08-15) is that
 * those are fixed as repairs and normalised.
 *
 * `became` is filled ONLY for a rename — the same legal entity under a new
 * name, where the correct label follows from the rename itself. Where a party
 * was absorbed or merged, `became` is deliberately null: its members scattered,
 * and which party a given candidate joined does not follow from the merger. Do
 * not fill those in from a neighbouring poll; `data/repairs.json` forbids it.
 *
 * Dates RATIFIED against the TSE record (2026-08-15) and taken at the date the
 * change took legal effect — the TSE's approval, never the party's own vote,
 * which can precede it by months. PMDB was the one that mattered: it was
 * recorded as 2017-12-31, the convention's month, when the TSE only approved
 * on 15/05/2018 — five months of polls would have been mislabelled had the
 * data reached back that far.
 *
 * ⚠ `tse.jus.br` answers HTTP 403 to automated fetchers, so these were
 * corroborated through ConJur, Agência Brasil, Poder360 and the parties' own
 * notes. The TSE URLs open normally in a browser; worth eyeballing the PMDB
 * one before leaning harder on this table.
 */
export const DEFUNCT = {
  PMDB: { until: "2018-05-14", kind: "renomeação", became: "MDB",
          note: "Convenção do partido aprovou a volta a MDB em 19/12/2017, mas o TSE só aprovou a mudança de nome e sigla na sessão de 15/05/2018 (rel. min. Admar Gonzaga), rejeitando as impugnações de diretórios municipais. Vale a data do TSE.",
          source: "https://www.tse.jus.br/comunicacao/noticias/2018/Maio/aprovada-mudanca-do-nome-do-partido-do-movimento-democratico-brasileiro-pmdb" },
  PSDC: { until: "2018-05-16", kind: "renomeação", became: "DC",
          note: "Agosto/2017 foi o PEDIDO ao TSE, não a aprovação; o TSE homologou a mudança para Democracia Cristã em 17/05/2018. Vale a data do TSE.",
          source: "https://www.tse.jus.br/imprensa/noticias-tse/2017/Agosto/psdc-pede-ao-tse-mudanca-de-nome-para-democracia-crista" },
  DEM:  { until: "2022-02-08", kind: "incorporação", became: null,
          note: "Fundiu-se ao PSL formando o União Brasil; convenção conjunta em 06/10/2021, registro aprovado pelo plenário do TSE em 08/02/2022 — data ratificada. O filiado pode ter ido para outro partido.",
          source: "https://pt.wikipedia.org/wiki/Democratas_(Brasil)" },
  Pros: { until: "2023-02-14", kind: "incorporação", became: null,
          note: "Incorporado (não fundido) ao Solidariedade; diretórios aprovaram em 17/10/2022 e o TSE homologou por unanimidade em 14/02/2023 — data ratificada. O destino do filiado não decorre da incorporação.",
          source: "https://pt.wikipedia.org/wiki/Partido_Republicano_da_Ordem_Social" },
  PMB:  { until: "2025-12-01", kind: "renomeação", became: "Democrata",
          note: "Plenário do TSE aprovou a mudança de nome do PMB para Democrata em 02/12/2025 (rel. min. André Mendonça), entendendo que não há confusão com o extinto DEM. Último dia como PMB: 01/12/2025. Sem linhas na base hoje.",
          source: "https://pt.wikipedia.org/wiki/Democrata_(Brasil)" },
};

/**
 * Labels matching no registered party — flagged, never guessed. Empty today.
 *
 * "Democrata" sat here and was WRONG: it is a real party (ex-PMB, renamed
 * December 2025), and every row carrying it is a 2026 poll, so the label was
 * correct all along. The lesson is the cheap one — an unfamiliar party name is
 * a prompt to look it up, not evidence that the source erred.
 */
export const UNRECOGNISED = {};

/**
 * Could a poll dated `date` have been taken with party `label`?
 * @returns {{ok: boolean, reason?: string, until?: string, became?: string|null, kind?: string}}
 */
export function partyExistedAt(label, date) {
  const canonical = canonicalParty(label);
  if (canonical === null) return { ok: true };
  if (UNRECOGNISED[canonical]) return { ok: false, reason: "não reconhecido", became: null, kind: "desconhecido" };
  const d = DEFUNCT[canonical];
  if (!d) return { ok: true };
  if (!date) return { ok: true }; // undated poll — nothing to compare against
  if (date <= d.until) return { ok: true };
  return { ok: false, reason: "extinto na data da pesquisa", until: d.until, became: d.became, kind: d.kind };
}

/** Values that mean "no party was recorded". */
const EMPTY = new Set(["", "na", "n/a", "-", "--", "?", "null", "nenhum", "semlegenda"]);

const LOOKUP = new Map();
for (const [canonical, spellings] of Object.entries(ALIASES)) {
  for (const s of spellings) LOOKUP.set(key(s), canonical);
}

/**
 * @param {string|null|undefined} raw
 * @returns {string|null} canonical label, or null when no party was recorded
 */
export function canonicalParty(raw) {
  if (raw === null || raw === undefined) return null;
  const trimmed = String(raw).trim();
  const k = key(trimmed);
  if (!k || EMPTY.has(k) || EMPTY.has(trimmed.toLowerCase())) return null;
  return LOOKUP.get(k) ?? trimmed;
}

/**
 * Canonical label for a party AS NAMED ON A GIVEN DATE.
 *
 * This is where the two rules meet, and the date is what reconciles them:
 *   · a poll keeps the party it was taken with → a 2016 poll saying PMDB keeps
 *     PMDB, because in 2016 that is what the party was called;
 *   · a poll cannot name a party that did not exist on its date → a 2026 poll
 *     saying PMDB is the source being stale, and is normalised to MDB.
 *
 * Applied ONLY to renames, where the successor follows from the rename itself
 * and the legal entity never changed. A party that was absorbed or merged has
 * `became: null` and is left exactly as found for per-record repair: which
 * party that candidate actually joined is not a fact this function knows.
 */
export function canonicalPartyAt(raw, date) {
  const label = canonicalParty(raw);
  if (label === null || !date) return label;
  const d = DEFUNCT[label];
  if (!d || !d.became || date <= d.until) return label;
  return d.became;
}

/** Spellings present in the data that this module does not recognise. */
export function unknownParties(values) {
  const out = new Map();
  for (const v of values) {
    const c = canonicalParty(v);
    if (c === null || LOOKUP.has(key(c))) continue;
    out.set(c, (out.get(c) ?? 0) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}

export const CANONICAL_LABELS = Object.keys(ALIASES);

// ---------------------------------------------------------------- self-test
export function selfTest() {
  const errors = [];
  const eq = (got, want, what) => { if (got !== want) errors.push(`${what}: esperado ${JSON.stringify(want)}, obtido ${JSON.stringify(got)}`); };

  for (const [canonical, spellings] of Object.entries(ALIASES)) {
    for (const s of spellings) eq(canonicalParty(s), canonical, `alias ${JSON.stringify(s)}`);
  }

  // Idempotence: normalising twice must equal normalising once, or repeated
  // pipeline runs would drift.
  for (const c of Object.keys(ALIASES)) eq(canonicalParty(canonicalParty(c)), canonicalParty(c), `idempotência ${c}`);

  // Empties collapse to null.
  for (const e of ["", "  ", "N/A", "n/a", "-", null, undefined]) eq(canonicalParty(e), null, `vazio ${JSON.stringify(e)}`);

  // THE IMPORTANT ONE: an unknown party survives untouched. A new party
  // appearing mid-campaign must never be silently dropped or coerced.
  eq(canonicalParty("Partido Novíssimo"), "Partido Novíssimo", "partido desconhecido preservado");
  eq(canonicalParty("  PXY  "), "PXY", "desconhecido apenas aparado");

  // The political mergers stay untouched.
  for (const p of NOT_MERGED) eq(canonicalParty(p), p, `não fundido ${p}`);

  // Existence window. A live party always passes; a defunct one passes BEFORE
  // its end date and fails after it — testing only the failure would let a
  // guard that rejects everything look correct.
  eq(partyExistedAt("PT", "2026-08-01").ok, true, "partido vivo passa");
  eq(partyExistedAt("PMDB", "2015-06-01").ok, true, "PMDB antes da renomeação passa");
  eq(partyExistedAt("PMDB", "2026-02-03").ok, false, "PMDB depois da renomeação reprova");
  eq(partyExistedAt("PMDB", "2026-02-03").became, "MDB", "renomeação aponta o sucessor");
  eq(partyExistedAt("DEM", "2026-05-18").ok, false, "DEM depois da incorporação reprova");
  eq(partyExistedAt("DEM", "2026-05-18").became, null, "incorporação NÃO aponta sucessor");
  // Democrata é partido real (ex-PMB, renomeado em dez/2025): 2026 é válido,
  // 2025-06 não. Este caso já foi classificado errado uma vez.
  eq(partyExistedAt("Democrata", "2026-03-06").ok, true, "Democrata em 2026 é válido");
  eq(partyExistedAt("PMB", "2026-03-06").ok, false, "PMB depois de dez/2025 reprova");
  eq(canonicalPartyAt("PMB", "2026-03-06"), "Democrata", "PMB em 2026 vira Democrata");
  eq(canonicalPartyAt("PMB", "2024-01-01"), "PMB", "PMB antes da renomeação permanece PMB");
  eq(partyExistedAt("PT", null).ok, true, "pesquisa sem data não é julgada");
  eq(partyExistedAt(null, "2026-01-01").ok, true, "sem partido não é julgado");

  // Date-aware normalisation — the whole point is that it cuts BOTH ways.
  eq(canonicalPartyAt("PMDB", "2016-05-01"), "PMDB", "PMDB em 2016 permanece PMDB");
  eq(canonicalPartyAt("PMDB", "2026-02-03"), "MDB", "PMDB em 2026 vira MDB");
  eq(canonicalPartyAt("PSDC", "2026-04-28"), "DC", "PSDC em 2026 vira DC");
  eq(canonicalPartyAt("PSDC", "2016-01-01"), "PSDC", "PSDC em 2016 permanece PSDC");
  eq(canonicalPartyAt("DEM", "2026-05-18"), "DEM", "incorporação NÃO é normalizada — exige reparo");
  eq(canonicalPartyAt("Pros", "2025-12-05"), "Pros", "incorporação NÃO é normalizada — exige reparo");
  eq(canonicalPartyAt("Democrata", "2026-03-06"), "Democrata", "partido válido não é tocado");
  eq(canonicalPartyAt("PMDB", null), "PMDB", "sem data, não se decide nada");
  eq(canonicalPartyAt("Psol", "2026-01-01"), "PSOL", "grafia continua unificada com data");

  return errors;
}
