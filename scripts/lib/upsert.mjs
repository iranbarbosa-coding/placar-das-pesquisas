// The single write path into the store: one normalised poll in, store mutated.
//
// This is the seam Phase 3 rewrites `scrape.mjs` around — sources → normalise →
// **upsert** → repairs → validate → write. It exists now, ahead of that rewrite,
// because the resolution ladder it drives (`resolveSurvey`, `resolveQuestion`,
// `fillFields`, `addSourceRef`, `logConflict`) had **no caller anywhere in the
// repo**: ~150 lines of unexecuted code that the whole phase is built on. A
// harness against a driver invented inside the harness would have proved
// nothing about the code that eventually ships, so the driver lives here.
//
// Deliberately thin. It decides nothing the store does not already decide; it
// only feeds the ladder in the right order and records where each value came
// from. Phase 3 should grow this file, not replace it.
//
// ORDER MATTERS. Upsert is first-writer-wins, so callers MUST ingest in source
// priority order — poder360 → eleicaoemdados → wikipedia. Parallelising the
// sources silently changes which one wins.
import {
  resolveInstitute, resolveCandidate, resolveSurvey, resolveQuestion,
  fillFields, addSourceRef, logConflict,
} from "./store.mjs";
import { contestKey } from "./ids.mjs";
import { canonicalPartyAt } from "./parties.mjs";
import { partyOverride } from "./repairs.mjs";
import { canonicalCandidate } from "./candidates.mjs";

const SURVEY_FIELDS = [
  "contractor_raw", "fieldwork_start", "fieldwork_end", "published_date",
  "sample_size", "margin_of_error", "tse_registration", "article_url", "integra_url",
];
const QUESTION_FIELDS = [
  "scenario_label_raw", "results", "others_pct", "undecided_pct", "blank_null_pct",
];

/**
 * @param {object} store    from readStore()
 * @param {object} poll     normalised flat poll (the `Poll` shape sources emit)
 * @param {{source: string, runId?: string, nativeId?: string|number|null, fuzzyCandidates?: boolean}} opts
 * @returns {{survey, question, matched_by: string, question_matched_by: string}}
 */
export function upsertPoll(store, poll, { source, runId = "run", nativeId = null, fuzzyCandidates = false } = {}) {
  const institute = resolveInstitute(store, poll.pollster);
  const date = poll.fieldwork_end ?? poll.published_date ?? null;
  const roster = (poll.results ?? []).map((r) => r.candidate);

  const { survey, matched_by } = resolveSurvey(store, {
    source_refs: nativeId == null ? [] : [{ source, native_id: nativeId }],
    tse_registration: poll.tse_registration ?? null,
    institute_id: institute.institute_id,
    institute_names_raw: [poll.pollster],
    universe: { level: poll.state ? "uf" : "nacional", uf: poll.state ?? null },
    fieldwork_end: poll.fieldwork_end ?? null,
    published_date: poll.published_date ?? null,
    sample_size: poll.sample_size ?? null,
    // race/round scope the roster test: one field operation asks several
    // questions with legitimately different rosters, so only the same race in
    // the same round is comparable. See rosterContradicts in store.mjs.
    race: poll.race, round: poll.round, roster,
    electoral_cycle: 2026,
    pre_electoral: (date ?? "") < "2026-01-01",
  });

  if (nativeId != null) addSourceRef(store, survey, { source, native_id: nativeId, url: poll.source_url ?? null });
  fillFields(store, survey, {
    contractor_raw: poll.contractor ?? null,
    fieldwork_start: poll.fieldwork_start ?? null,
    fieldwork_end: poll.fieldwork_end ?? null,
    published_date: poll.published_date ?? null,
    sample_size: poll.sample_size ?? null,
    margin_of_error: poll.margin_of_error ?? null,
    tse_registration: poll.tse_registration ?? null,
    article_url: poll.source_url ?? null,
  }, { source, runId, table: "surveys", fields: SURVEY_FIELDS });

  // Candidates resolve against the store's alias index. `fuzzyCandidates` is
  // OFF by default and must stay off until the curated alias table exists:
  // the token-subset matcher merges "Ciro Nogueira" into "Ciro" (different
  // politicians) while failing to merge "Tião Bocalom" with "Sebastião
  // Bocalom" (one person). See REVISAO_CANDIDATOS.md.
  const contest = contestKey(poll.race, poll.state);
  const results = (poll.results ?? []).map((r) => {
    // A CURATED REPAIR OUTRANKS NORMALISATION, on every write path.
    //
    // `migrate-to-store.mjs` consulted `partyOverride` here and this path did
    // not, so the moment the scraper switched to the ladder a curated answer
    // stopped reaching the store: Telêmaco Brandão came back as "Novo" where
    // the institute's own report publishes no party at all. The parity gate
    // caught it on the first run — which is the argument for `partyOverride`
    // being exported rather than each path re-implementing the lookup, and the
    // argument for keeping a gate that compares the two.
    const ov = partyOverride(poll, r.candidate);
    const party = ov.has ? ov.party : canonicalPartyAt(r.party, date);
    // A GRAFIA CRUA VIAJA JUNTO, e é ela que decide a identidade.
    //
    // `nome` é pós-canonicalização — é o nome EXIBIDO. Cunhar a identidade dele
    // fazia o id acompanhar o nome: em 16/08/2026 uma mudança na regra de
    // exibição moveu 27 de 1.078 `candidate_id` sem que um dado de origem
    // mudasse, e cada id movido levou junto o `first_seen`, que `priorStamps`
    // carrega POR ID.
    //
    // ⚠ ESTE COMENTÁRIO JÁ FOI FALSO. Ele dizia que `r.candidate` "é o que o
    // instituto publicou e não se muda quando a nossa regra de nome muda" — e
    // não era: `scrape.mjs` reescreve `r.candidate` em `canonicalizeCandidates`
    // ANTES do store rodar, então a identidade estava sendo semeada pela própria
    // regra de que ela deveria se desacoplar. A verificação independente pegou.
    // Hoje a grafia publicada chega em `r.candidate_raw`, presa antes daquela
    // reescrita, e é ela que semeia. O `??` cobre quem chama sem passar pelo
    // coletor (harness, migração).
    const nome = canonicalCandidate(r.candidate, contest);
    const c = resolveCandidate(store, nome, contest, party, {
      fuzzy: fuzzyCandidates,
      raw: r.candidate_raw ?? r.candidate,
    });
    return {
      candidate_id: c.candidate_id,
      name_raw: r.candidate_raw ?? r.candidate,
      party_raw: r.party ?? null, party, pct: r.pct,
    };
  });

  // A SEMENTE DA PERGUNTA CONTINUA SENDO O ELENCO CANÔNICO, e isso é
  // deliberado: consertar `name_raw` não pode custar os ids das perguntas.
  //
  // `resolveQuestion` semeava o id a partir de `name_raw`. Com `name_raw`
  // passando a guardar a grafia publicada, a semente mudaria em toda pergunta
  // que tivesse qualquer variação de grafia — e as 2.964 perguntas seriam
  // recunhadas, levando junto o `created_at` que `priorStamps` casa POR ID.
  // É exatamente a perda de 16/08, que este arquivo registra e que não se
  // repete de graça. O elenco canônico é estável sob mudança de grafia, então
  // é ele que semeia; `name_raw` fica para quem precisa da grafia de origem.
  //
  // Exatamente o que a semente sempre recebeu: `poll.results[].candidate`, que
  // é o que `name_raw` guardava antes desta mudança. NÃO passar por
  // `canonicalCandidate` outra vez — o nome aqui já saiu de
  // `canonicalizeCandidates`, e aplicar a regra duas vezes move a semente onde
  // ela não for idempotente. Custou 36 ids de pergunta na primeira tentativa,
  // que é o mesmo tipo de perda de `created_at` que este conserto existe para
  // evitar. A semente tem de reproduzir a anterior byte a byte, não ser
  // "equivalente".
  const rosterSeed = (poll.results ?? []).map((r) => r.candidate);

  const { question, matched_by: question_matched_by } = resolveQuestion(store, survey, {
    source_refs: nativeId == null ? [] : [{ source, native_id: `${nativeId}:${poll.race}:${poll.round}:${poll.scenario ?? ""}` }],
    race: poll.race, round: poll.round, uf: poll.state ?? null,
    scenario_label_raw: poll.scenario ?? null,
    legacy_id: poll.id ?? null,
    results,
    roster_seed: rosterSeed,
  });

  fillFields(store, question, {
    scenario_label_raw: poll.scenario ?? null,
    results,
    others_pct: poll.others_pct ?? null,
    undecided_pct: poll.undecided_pct ?? null,
    blank_null_pct: poll.blank_null_pct ?? null,
  }, { source, runId, table: "questions", fields: QUESTION_FIELDS });

  // A CURATED REPAIR'S CITATION ALWAYS REACHES THE STORE.
  //
  // Set outright, not through `fillFields`: fill-empty-never-overwrite is
  // first-writer-wins, and the repaired row is not necessarily the first writer
  // — a poll arriving earlier from another source would keep the slot and the
  // citation would be dropped on the floor.
  //
  // It was dropped on the floor. `migrate-to-store.mjs` carried
  // `repaired: p.repaired ?? null` and this path carried nothing, so the
  // switchover took the store from 15 stamped questions to ZERO: every
  // correction survived, and every record of WHY it holds was erased. Nothing
  // caught it — parity could not, because polls.json is projected from this
  // same store, so both sides lost it identically. Second member of the class
  // that `partyOverride` was the first of: things the retired path did on the
  // way in that this one silently did not.
  if (poll.repaired) question.repaired = poll.repaired;

  // The survey's lineage back to the source rows. The migration built this from
  // its grouping key (`legacy_ids: rows.map(r => r.id).sort()`); without it a
  // survey cannot be traced to what produced it. Sorted so the field does not
  // depend on ingestion order.
  if (poll.id != null && !survey.legacy_ids.includes(poll.id)) {
    survey.legacy_ids = [...survey.legacy_ids, poll.id].sort();
  }

  return { survey, question, matched_by, question_matched_by };
}

/** Ingest a whole batch in the caller's order. See the ORDER MATTERS note. */
export function upsertAll(store, polls, opts) {
  const report = { source_ref: 0, registration: 0, natural: 0, minted: 0 };
  for (const p of polls) {
    const { matched_by } = upsertPoll(store, p, { ...opts, nativeId: p.native_id ?? null });
    report[matched_by] = (report[matched_by] ?? 0) + 1;
  }
  return report;
}

export { logConflict };
