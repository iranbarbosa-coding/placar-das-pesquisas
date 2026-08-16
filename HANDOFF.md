# Handoff — Placar das Pesquisas 2026

Everything a new session needs to continue this project. Read this first, then
`README.md` for how the pieces fit.

**Project**: `~/Projects/pesquisas-2026` — RealClearPolling-style aggregator for the
Brazilian 2026 elections (president, 27 governors, senate), in pt-BR.
**Stack**: Next.js 15 App Router, fully static (SSG, 38 pages), Tailwind 4, Node scrapers
+ one Python wikitext parser.
**Today's date in this project's world**: 2026-08-16. Election is October 2026.

---

## 1. Status

| | |
|---|---|
| Database | **2.958 polls** · 1.163 surveys · 27 states · 137 institutes · 1.061 candidates |
| Store | `data/*.ndjson` is THE DATABASE. `data/polls.json` is DERIVED from it |
| Site | builds clean, 38 pages, light+dark, pt-BR. Reads the store |
| Deployed | **repo pushed** → https://github.com/iranbarbosa-coding/placar-das-pesquisas (public). **Vercel import still pending — needs Iran's login** |
| Auto-update | `.github/workflows/update-polls.yml`, 2×/day, runs the FULL store pipeline + 8 gates |

Recent commits (newest first):

```
8ba943e  A Action passa a rodar o pipeline do store
bc18b57  Agrupamento de institutos estável; coleta com presidencial estadual
e78b945  Pesquisas incompletas na fonte: fora da média, e listadas para decisão
56c43cb  Nomes de urna corrigidos; decisões passam a valer no consumo
bb2ee45  Os 63 pares decididos: 34 mesma pessoa · 26 diferentes · 3 em aberto
5d86195  Colisão de semente na cunhagem de levantamento — e o portão que a achou
d15cc91  Um registro = um levantamento; datas de partido ratificadas no TSE
aafeb3c  Harness do caminho de escrita — e três defeitos que ele achou
8d7e0e8  Bloqueador da Fase 3 fechado
35a6758  Fase 2: o site passa a ler o store
```

## 0. If you read nothing else

**The store is the database.** `polls.json` is a projection of it, written by
`scripts/derive-polls.mjs`, and it marks itself `derived_from_store: true`.
`migrate-to-store.mjs` REFUSES to read a file with that marker — migrating from
the projection silently drops non-headline questions and erases `name_raw` /
`party_raw`, eroding a little more each run. The legitimate input to the
migration is always a fresh scrape.

**The pipeline, in order** — this is what the Action runs and what you should
run after any change:

```bash
node scripts/scrape.mjs           # sources → normalise → repairs → hygiene → polls.json
node scripts/migrate-to-store.mjs # polls.json → the store
node scripts/derive-polls.mjs     # store → polls.json (now a projection)
```

**Decisions Iran made on 2026-08-15, all applied and all recorded in code:**
1. **One TSE registration = one survey** — unless the rows contradict each other
   on the fieldwork date (4 such registrations, all digit typos, left unmerged).
2. **State-level presidential polling is collected** — 377 polls, 24 UFs. Kept
   OUT of the national average by `pollsFor` matching `state` exactly.
3. **Ballot names**: official TSE name → press usage (bigger outlets win) →
   Wikipedia → else editorial. Applied via `data/candidate-rulings.json`.
4. **Party rename dates ratified against the TSE.**
5. **Polls incomplete at source are gated out of averages**, and listed with
   their source PDF in `PESQUISAS_INCOMPLETAS.md` for an editorial call.
6. **A poll keeps the party it was taken with** — but a party that did not exist
   on the poll's date is a source defect, fixed and normalised.

## 2. How it works today

**Sources** (`scripts/sources/`):
- `poder360.mjs` — primary. Two endpoints, both require the header `Origin: https://drive.poder360.com.br`
  (403 without it). `POST /pesquisas/v1/api` = metadata + `integra` (institute PDF) +
  `noticias`. `GET /pesquisas/v2/cenarios` = clean per-scenario results.
  `cargosId` 1=Gov 3=Pres 4=Sen; `unidadesFederativasId` AC1…TO28, **BR=6**.
- `wikipedia.mjs` → shells out to `scripts/wiki_parse.py` over the 29 pages listed in
  `scripts/wiki-pages.json` (PT+EN presidential + 27 state pages).
- `tse.mjs` — TSE/TRE registry zip (metadata only, **no results**).

**Pipeline** (`scripts/scrape.mjs`): fetch → canonicalise institutes → merge across
sources → apply `data/repairs.json` → candidate-name hygiene → keep fullest round-1 →
canonicalise parties → canonicalise candidates → drop cross-brand duplicates →
date guards → validate → write `polls.json`. Then `migrate-to-store.mjs` folds that
into the store and `derive-polls.mjs` rewrites `polls.json` from it. `scrape.mjs`
only runs when invoked as a program (importing it used to launch a live scrape).

**Two rules inside the merge, both learned the hard way.** Source priority
(poder360 → eleicaoemdados → wikipedia) decides METADATA only — sample size,
registration, dates. It must never decide the RESULT TABLE: an Acre senate poll
arrived from Wikipedia with 6 candidates and from Poder360 with 3, the higher-
priority fragment overwrote the complete table, and the poll then failed the sum
guard and vanished from the averages. The fuller table wins on results.
And institute clustering seeds are **deterministic, never frequency-ordered** —
seeding by count made an institute's name depend on how much unrelated data was
present, which is how collecting presidential polls renamed an Acre institute
and dropped a senate poll from a race with no presidential polls in it.

**Averaging** (`src/lib/average.ts`) — **the rule that is actually implemented**:
per contest, the **10 most recent polls, max 2 per institute, floor of 3**,
**excluding polls flagged `incomplete`** (published numbers accounting for <90%
of the sample — see `scripts/lib/completeness.mjs`). Ordering breaks date ties on
`poll.id`, and runoff groups break ties on the scenario label: without those the
displayed matchup depended on the order records sat in on disk, and the scraper
rewrites that file twice a day.
Plain arithmetic mean of published percentages. Trendline applies the same rule
backwards through time and always ends on the last poll's date.

**Site** (`src/`): every page reads through `src/lib/data.ts` (9 exported functions).
Pages: `/`, `/presidente`, `/segundo-turno`, `/estados`, `/estados/[uf]`, `/institutos`,
`/metodologia`.

---

## 3. Two workstreams in flight

### A. Design of poll presentation — SPEC LOCKED, NOTHING BUILT

A long design conversation locked the spec below. **None of it is implemented.** An
interactive mock of the chart was built and approved.

**Race page becomes: chart → table.** No separate "Média atual" board.

**Chart**
- One line per candidate (max 8), plotting the average per date; hover (tap on mobile)
  shows a crosshair.
- Range buttons **3m · 6m · 1a · 18m · tudo**, default **6m**. If the range holds no
  polls it auto-expands to the smallest that does, saying so.
- Range is a lens on the chart only — never filters the table, never changes the average.
- Every race gets a chart however thin the data.

**Right panel, integrated inside the chart frame** (replaces the board)
- Rows sit at each line's end height; when they collide they nudge apart with thin
  leader lines back to the line ends. (Bottom-6 candidates under 5% collide badly —
  this was the hard case the mock proved.)
- Row = colour dot · candidate · current average. **No party, no base marker.**
- Hovering makes the panel the readout: rows glide to that date's values, date shown
  above; no floating tooltip.
- Candidates whose average rests on part of the window render **muted**.
- On phones the panel stacks below the chart.

**Caption under the chart**: poll count · *máx. 2 por instituto* · spread · last poll
date · *base mínima* warning · *base parcial: Samara Martins (1 de 10)…*

**Table** — columns vary by race:
- 1º turno president/governor: `Instituto | Data | Margem | Amostra | Lula −7,3 do 1º turno`
- 1º turno Senate: `Instituto | Data | Margem | Amostra | 1º e 2º colocados + distância para o 3º`
- 2º turno: `Instituto | Data | Margem | Amostra | Lula +3,3`
- **First row is `Média do site`** — dashes for margem/amostra, dated by the newest poll.
- Rows = the **ten polls in the average**; the rest continue below via internal scroll,
  marked *fora da média*.

**Votos válidos** — default everywhere:
- Each candidate ÷ (sum of all candidates + outros), excluding brancos/nulos and NS/NR.
- **Convert each poll individually, then average** (never the reverse).
- One **bruto/válidos toggle per race page**, controlling chart + panel + caption + table
  together. `/segundo-turno` cards and the homepage follow válidos with **no toggle** and
  a "votos válidos" label **on every card**. Homepage's *últimas pesquisas* converts too.
- **Senate stays raw everywhere** (two votes per voter; normalising to 100 is meaningless).
- Caption: *"X% dos entrevistados responderam branco/nulo, Y% não respondeu"*; a single
  combined figure when the institute didn't split them; **updates on hover**.

**The badge**
- 1º turno (pres+gov, válidos only): **"Lula | −2,1 do 1º turno"** — distance from 50%.
  Hides when the toggle is on bruto.
- 2º turno: **"Lula | +3,3"** — lead over the other candidate; present in both cuts.
- No badge on Senate. In 1º turno bruto there is deliberately no summary number.

**DECIDED (Iran, 2026-08-15)**: polls genuinely incomplete at source are **gated
out of the average**, not flagged — votos válidos divides by the sum of what is
present, so a poll missing 40 points inflates everyone left in it and a label
would not save the number. Already implemented; the 68 affected polls are listed
with their source PDFs in `PESQUISAS_INCOMPLETAS.md` for a per-poll call.

**Homepage visual design is parked.** The trigger phrase is **"Let's go back to design."**
See the memory file `placar-design-conversation-pending.md`; the RealClearPolling
element breakdown and four open questions are recorded there.

### B. Database restructure — PHASES 1–2 DONE, 3 HALF DONE

Approved plan: `~/.claude/plans/new-direction-i-want-dapper-oasis.md`. Read it — it has
the full schema and rationale.

Goal: the database becomes the asset; the scraper only appends and corrects. Holds voting
intention by institute and by demographic segment.

**Phase 1 (done, commit `c595d7e`)** — NDJSON store under `data/`:
`surveys.ndjson` (1.155) · `questions.ndjson` (2.585) · `crosstabs.ndjson` (empty) ·
`institutes.ndjson` (133) · `candidates.ndjson` (740) · `registry.ndjson` (empty) ·
`searches.ndjson` (empty) · `conflicts.ndjson` · `meta.json`.

Key modules: `scripts/lib/{ndjson,ids,store,project}.mjs`, `scripts/validate-store.mjs`
(20 guards, each with a self-test), `scripts/migrate-to-store.mjs`, `scripts/parity-check.mjs`.

Central decision: **ids are minted once from a recorded seed and never recomputed**;
the resolution ladder uses only raw source data (native ref → TSE registration → natural
key → mint), so improving canonicalisation can never move an id.

**Phase 2 (DONE)** — `src/lib/store.ts` reads the NDJSON tables and projects
`question ⨝ survey` into the flat `Poll[]`; `loadDataset()` in `src/lib/data.ts` is now a
three-line call into it. The other 8 exports and every page are untouched. `next build`
still produces 38 pages. `data/polls.json` is no longer read by the site at all.

*On the gate.* It was written as "byte-identical `out/`". Two things about it:
- There is no `out/` — `next.config.ts` sets `output: undefined`, so pages are prerendered
  into `.next/server/app`. Compare there, and normalise three per-build randoms first: the
  `BUILD_ID`, webpack chunk hashes (16+ hex — poll ids are 12 and survive), and the nonce
  Next emits in the comment after `<!DOCTYPE>`. Miss any one and all 38 pages "differ".
- **Byte-identity was never achievable, by design.** The store's survey layer backfills
  fieldwork dates that `polls.json` lacked — the same 149 fields the parity check already
  declares. Measured effect on the rendered site, with everything else held equal:
  **149 start dates appear** (2 of them corrections, the documented Poder360
  self-contradiction), and **2 Wikipedia links move EN → PT**. Zero changes to any
  percentage, average, poll count, institute, sample size or ordering. Suppressing those
  backfills to win a byte-comparison would mean deleting correct data to satisfy a check.

**Ordering was load-bearing and is now fixed.** The first Phase-2 build changed the runoff
matchup shown on Acre and Amazonas. Not a migration bug: AC's two leading pairings tie at
10 polls *and* on last fieldwork date, so `scenarioGroups`' sort fell through to `Map`
insertion order — i.e. the order records sit in on disk. The scraper rewrites that file
twice a day, so the headline matchup could flip with no data change at all. `sortPollsDesc`
now breaks date ties on `poll.id`, group ordering breaks on the scenario label, and
`pollsters()`/`statesWithPolls()` break count ties on name/UF. Proof: reversing the entire
poll array now produces byte-identical output.

`scripts/lib/project.mjs` is the Node twin of the site's projection and **`scripts/projection-twin-check.mjs`
now enforces that** — it runs both and compares all 2.585 records. Nothing but a comment
held them together before, which meant the parity gate could pass while the site rendered
something else.

**Phase 3 — HALF DONE.** The plan was: rewrite `scrape.mjs` as sources →
normalise → resolve → upsert → repairs → validate → write, dual-writing
`polls.json`. What exists:

- ✅ **`polls.json` is derived from the store** (`scripts/derive-polls.mjs`), and
  the Action runs the whole pipeline with 8 gates.
- ✅ **`scripts/lib/upsert.mjs`** — the single write path, driving the resolution
  ladder. It exists because that ladder (`resolveSurvey`, `resolveQuestion`,
  `fillFields`, `addSourceRef`, `logConflict`) had **no caller anywhere in the
  repo**: ~150 unexecuted lines the whole phase rests on.
- ✅ **`scripts/upsert-harness.mjs`** — 20 cases. Every case asserting a MERGE is
  paired with one asserting a REFUSAL; a ladder that unified everything would
  pass a suite of only the former and destroy the database.
- ❌ **The scraper does NOT yet write through the upsert path.** It still writes
  the flat file, and the migration rebuilds the store from it.

**The gate that decides when to switch over: `scripts/upsert-vs-migration.mjs`.**
It feeds `polls.json` through the upsert path in source-priority order and
compares against the store the migration built. **It does not pass yet.** Last
run: identity and results agree on every poll (0 divergences), but the upsert
path produces **1.471 surveys against the migration's ~1.021**, and 9 polls do
not survive its question-level roster rule. The difference is the survey
GROUPING: the migration groups Wikipedia rows by a natural composite key, the
ladder mints per row unless the ±3-day/60%-roster rule matches. Close that gap,
then switch the scraper over.

⚠️ **Do not "fix" the gate by widening its tolerances.** It already declares one
bounded exception (tie-breaks on hoisted fields where both sources reported a
value, capped at 25). Anything else it reports is a real difference.

**Phase 4** — (a) registry reconciliation + `publication_status`; (b) crosstab extraction.

**Phase 5** — retire `polls.json`, update `metodologia`/README, split the Action.

---

## 4. Hard-won gotchas — do not rediscover these

**Poder360**
- `v2/cenarios` **silently drops candidate rows whose name field is empty**; `v1/api`
  keeps them but nameless. This is how a Vox poll arrived missing Flávio Bolsonaro and
  summing 54,9%. Fixed for that poll via `data/repairs.json` using the institute's own
  PDF (Flávio 31,2%).
- `v1`'s `apuracoes` **flattens all scenarios into one list** — never parse results from it.
- Poder360 sometimes files a poll under the **wrong UF** (a Veritá Paraná poll appeared
  under Pará). The TSE registration prefix is authoritative; the scraper auto-corrects.

**Wikipedia state pages** (all fixed in `scripts/wiki_parse.py`, don't regress):
- Party links were being read as candidate names (state pages use
  `[[Name]]<br><small>([[Party|ABBR]])</small>`, so the first *piped* link is the party).
- Portuguese date forms: `11 a 12 de maio`, `1º a 3 de abril`, `28 e 31 de julho`.
- Missing year when a page puts `=== 2026 ===` and `=== Abril-Julho ===` at the same level.
- Timeline banners (`! colspan=5 |17 de julho` + a second `!` cell) counted as header rows
  and became phantom candidates.
- A multi-line `{{citar web}}` inside `<ref>` splits the row and shifts every column.
- `Vantangem` (Tocantins typo) became a third runoff candidate.
- A bare month (`novembro`) was inflated into a fabricated 01–28 range.

**Data facts**
- **A poll keeps the party it was taken with** (creator, 2026-08-15). The database is
  historical; each record stands at its own date. `scripts/lib/parties.mjs` may unify only
  SPELLINGS of one party as it was named at that moment — never map a party onto a later
  one. Renames, mergers and dissolutions are changes to the political record, not to
  spelling: a poll that named PMDB named PMDB.
  What it does (54 spellings → 36 labels): case/accent (`PSOL`/`Psol`/`psol`, `NOVO`/`Novo`),
  abbreviation vs name (`UNIÃO`/`União`/`União Brasil`, `PODE`/`Podemos`, `REP`/`Republicanos`,
  `Progressistas`/`PP`), English-page leaks (`Mission`, `Workers' Party (Brazil)`,
  `Republicans (Brazil)`), unparsed wikitext (`[Partido Social Democrático (2011)|PSD]]`),
  and `N/A` → null. **`party_raw` on every result keeps exactly what the source said**, so
  none of this is lossy. An unrecognised party passes through untouched — a new party
  appearing mid-campaign must never be dropped, and that is the assertion the self-test
  cares most about. Applied in the scraper (`canonicalizeParties`, before candidate
  clustering, which propagates parties between rows) and in the migration.
- **A party that did not exist on the poll's date is the source being wrong** (creator,
  2026-08-15) — fix it, don't preserve it. The **date** reconciles this with the rule above:
  `canonicalPartyAt(label, date)` leaves a 2016 poll saying `PMDB` alone, and rewrites a
  2026 one to `MDB`. `DEFUNCT` in `parties.mjs` holds the windows, each citing its source.
  **Only renames are auto-applied** — same legal entity, one successor, the fix follows from
  the rename (`PMDB`→`MDB` 2017, `PSDC`→`DC` 2018, `PMB`→`Democrata` dez/2025). An
  **incorporation never is**: DEM's members could go to União Brasil or anywhere else, so
  `became` is null and picking one would invent a fact about a person.
  `validate-store` warns on every offender, splitting "fix determined by the rename" from
  "needs primary source". **The worklist is currently empty** — the three incorporation
  cases were repaired against the institutes' own reports (see below).
  ⚠ **`Democrata` was flagged as bogus and was not.** It is a real party — ex-`PMB`, renamed
  December 2025 — and all 9 rows are 2026 polls, so the label was right the whole time. An
  unfamiliar party name is a prompt to look it up, not evidence the source erred.
- **Senate elects 2 per state** → candidate percentages sum to ~200%. Validator cap is
  260 for `senador`, 130 otherwise. Senate is excluded from válidos.
- `average.ts` does **not** implement votos válidos. Any válidos figure you've seen was
  computed ad hoc.
- `scripts/sources/tse.mjs` **reads every CSV in the TSE zip**, but `BRASIL.csv` is the
  complete superset (1.522 registrations) and the 27 per-UF files are duplicates. Known
  bug; fix in Phase 4.
- **Candidate identity: 63 flagged pairs, ALL DECIDED and APPLIED** — 34 same
  person, 26 different, 3 settled by Iran's ruling. 740 → 703 candidates, 24
  contests' averages changed. `sameCandidate()`'s token matcher still exists (it
  is what makes "Luiz Inácio Lula da Silva" and "Lula" one series) but **no
  longer has the last word**: `scripts/lib/candidates.mjs` folds decided names
  first and forbids clustering any pair recorded as DIFFERENT people. Verified on
  the real contest: `Ciro Nogueira` stays separate, `Lula` still merges.
  · Decisions live in **`data/candidate-rulings.json`** (Iran's, top precedence),
    **`data/candidate-verdicts-researched.json`** (sourced research), and the
    generated **`data/candidate-aliases.json`**. Rulings are applied at CONSUME
    time, not only when the table is regenerated.
  · **The generator can only DISCOVER pairs, never re-derive decisions.** Once a
    merge is applied the variants stop appearing in the data, so a re-run finds
    nothing. It wrote the table EMPTY twice before this was understood — once
    reading the store, once after `polls.json` became derived. It now refuses to
    write a smaller table than exists (`--force-shrink` to override).
  · **Article identity is necessary, not sufficient.** Two names on the same
    pt.wikipedia article are one person — but you must also ask whether that
    person runs in THIS contest. A real "Professor Alcides" is a federal deputy
    for GOIÁS while the Ceará senate row of that name is the pastor. Same trap
    caught `Vanderlan Gomes` (a Tocantins TV host) and `Guilherme Giordano`.
  · **Family cross-references are the opposite trap.** A "does one article
    mention the other name?" tiebreak declared Flávio and Jair Bolsonaro the same
    person — a son's article names his father. Different articles ⇒ different
    people, no softening.
- **137 TSE registrations covered more than one survey — NOW MERGED** (Iran,
  2026-08-15): one registration = one survey, 1.155 → ~1.021 surveys. Except 4
  whose rows contradict each other on the fieldwork date; those stay separate and
  are logged every run.

**Coverage reality** (measured, don't over-claim)
- The 2026 registry holds **1.522 distinct registrations**. We hold hard-matched results
  for **284 = 18,7%**; ~31% counting reliable fuzzy matches. Web-source ceiling is 25–35%.
- Only 2,4% of the gap is pending publication.
- **"UNPUBLISHED" must never be inferred from our own absence** — that claim requires a
  recorded search that failed. Enforced by a validator guard with a self-test.

**Crosstabs (demographics)**
- 98,7% of polls link a PDF; 18/19 have a text layer; but only **~53% actually contain
  crosstabs**.
- **Quaest's linked PDF is a g1 article, Datafolha's is a Folha article, AtlasIntel's
  slides are images** — ~25% of volume, unreachable. No structured source exists anywhere
  (verified across all 77 schemas of the Eleição em Dados API).
- Usable: Nexus (cleanest), Paraná Pesquisas (decimal comma), PoderData (**transposed** —
  rows are candidates), Gerp, Ideia, MDA, Ipespe, Vox; Futura and RTBD are chart-derived
  and hardest.
- **Trap**: "Perfil da Amostra" blocks use identical band labels but are sample
  composition, not voting intention. Reject any block whose columns don't map to ≥2
  candidates in the parent question's roster.
- `pdftotext`, `pdftoppm` and `pypdf` are NOT installed — no interpreter on this
  machine has any of them. Use `scripts/ocr/` instead (below).
- **OCR exists: `scripts/ocr/`.** Apple's Vision framework via a small Swift binary — ships
  with macOS, runs offline, reads pt-BR, nothing leaves the machine.
  `swiftc -O -o scripts/ocr/ocr scripts/ocr/ocr.swift`, then `scripts/ocr/ocr file.pdf [p1 p2]`.
  **This retires the "unreachable ~25%" ceiling above**: the AtlasIntel-style slide images
  *are* readable. It proved itself immediately — the three party repairs below were
  confirmed from PDFs that had defeated every text extractor.
  Caveats in `scripts/ocr/README.md`: renders at 300 dpi (72 loses table type), language
  correction OFF (it mangles party acronyms), and small rotated text still garbles — read
  several occurrences before concluding.
- **Party repairs, all three from the institutes' own reports** (`data/repairs.json`):
  Poder360's aggregator serves **`DEM`** for Ravenna Castro (PI), but AtlasIntel's report
  says `Ravenna Castro (Democrata)` and Real Time Big Data's says `(Democratas)` — the
  aggregator **conflated the new Democrata (ex-PMB, dez/2025) with the extinct Democratas**
  absorbed into União Brasil in 2022. Repaired to `Democrata` ×2.
  For **`Pros`** (Telêmaco Brandão, GO), Paraná Pesquisas' report publishes **no party for
  any candidate** — so there is no primary source for any party, and the label is set to
  **null** rather than asserting a defunct one. That restraint mattered: other institutes
  give the same candidate `Novo` *and* `PL`, so inferring from neighbouring polls — which
  `repairs.json` forbids — would have meant choosing between two contradictory guesses.
  `party_raw` still holds `DEM`/`Pros`, so nothing was destroyed.
  Repairs now support **`set_party`**, and `partyOverride()` is exported so the migration
  and the parity gate consult the same curated answer the scraper does, instead of each
  re-implementing the lookup.

---

## 5. Verification — run these

```bash
cd ~/Projects/pesquisas-2026
node scripts/validate-store.mjs --self-test    # 20+ guards, each proven to fire
node scripts/validate-store.mjs                # validate the real store
node scripts/parity-check.mjs                  # store ⇄ polls.json, three levels
node scripts/projection-twin-check.mjs         # project.mjs ≡ src/lib/store.ts
node scripts/upsert-harness.mjs                # the WRITE path (20 cases)
node scripts/idempotence-check.mjs             # rebuild on 2 dates ⇒ identical
node scripts/idempotence-check.mjs --self-test # …and prove that check can fail
node scripts/pollster-clustering-check.mjs     # institute names ignore unrelated data
node scripts/validate-data.mjs data/polls.json # legacy validator
node scripts/upsert-vs-migration.mjs           # Phase 3 gate — DOES NOT PASS YET
npx tsc --noEmit && npx next build             # 38 pages
```

Regenerators (write files, run when the data changes):

```bash
node scripts/incomplete-polls.mjs   # → PESQUISAS_INCOMPLETAS.md
node scripts/candidate-review.mjs   # → REVISAO_CANDIDATOS.md (evidence dossier)
node scripts/candidate-resolve.mjs  # → data/candidate-aliases.json (network; refuses to shrink)
```

**Comparing two builds.** `next.config.ts` sets `output: undefined`, so there is
no `out/` — pages are prerendered into `.next/server/app`. To diff two builds you
must normalise three per-build randoms first: the `BUILD_ID`, webpack chunk
hashes (16+ hex; poll ids are 12 and survive), and the nonce Next emits in the
comment after `<!DOCTYPE>`. Miss any one and all 38 pages "differ".

Working practice that has caught every significant defect: **a producer never
certifies its own output.** And prove a guard FIRES before believing its zero —
every validator here has a `--self-test` for that reason.

## 6. Open items

**Blocked on you (Iran)**

1. **Vercel import.** The repo is public and pushed; only the Vercel side is
   missing, and it needs your login. Nothing else blocks the site going live.
2. **`PESQUISAS_INCOMPLETAS.md`** — 68 polls gated out of the averages, 55 with
   the institute's own PDF linked. Three tickboxes each: repair (the report
   shows the missing candidates → `data/repairs.json`, poll returns to the
   average), keep out, discard.
3. **4 TSE registrations with contradictory fieldwork dates** — `TO-01056`
   (365 days apart), `SP-08639` (120), `GO-04010` (31), `BR-04215` (11). All
   look like digit typos at source. Left unmerged and logged every run.

**Next work, in the order I would do it**

4. **Close the `upsert-vs-migration` gap** (see Phase 3 above), then point the
   scraper at `upsertPoll` and delete the migration's grouping key.
5. **Implement the presentation spec in §3A** — none of it exists. Blocked on
   nothing now that the completeness question (§3A "still open") is decided:
   incomplete polls are gated, not flagged.
6. **The per-state presidential map** Iran wants. The data is already collected
   (377 polls, 24 UFs, `race: "presidente"` with a `state`). Nothing renders it
   yet; `/estados/[uf]` shows only governor and senate.
7. **Narrow `tse.mjs` to `BRASIL.csv`** — it reads all 28 CSVs in the zip and the
   27 per-UF files are duplicates of the national one.
8. **Crosstabs (Phase 4).** The old "~25% unreachable" ceiling is GONE — see the
   OCR note in §4. Those image-only reports are readable now.
9. **Homepage visual design** — parked behind the phrase "Let's go back to design."

**A pattern worth naming.** Three times in one session, a guard I added *silently
disabled something* instead of failing loudly: the resolver rewrote the alias
table empty (twice, from two different causes), and the derived-file guard
switched off `idempotence-check`. Each was caught by running the thing
afterwards, never by the guard itself. When you add a check here, ask what it
does when its own assumptions break — and prove it fails, not just that it
passes. `--self-test` exists on the validators for exactly this reason.

**The other pattern.** Almost every real defect this session was *output
depending on something that isn't the data*: ordering by array position,
institute names by global frequency, timestamps by wall clock, seed collisions
from a dead `??` branch. When a number moves and the data didn't, look there
first.
