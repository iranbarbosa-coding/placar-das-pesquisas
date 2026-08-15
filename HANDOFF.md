# Handoff — Placar das Pesquisas 2026

Everything a new session needs to continue this project. Read this first, then
`README.md` for how the pieces fit.

**Project**: `~/Projects/pesquisas-2026` — RealClearPolling-style aggregator for the
Brazilian 2026 elections (president, 27 governors, senate), in pt-BR.
**Stack**: Next.js 15 App Router, fully static (SSG, 38 pages), Tailwind 4, Node scrapers
+ one Python wikitext parser.
**Today's date in this project's world**: 2026-08-14. Election is October 2026.

---

## 1. Status

| | |
|---|---|
| Database | 2.585 polls · 27 states · 133 institutes · fieldwork 2023-07 → 2026-08 |
| Site | builds clean, 38 pages, light+dark, pt-BR |
| Deployed | **NO** — never pushed. Needs `gh repo create` + Vercel import (see README) |
| GitHub account on this machine | `iranbarbosa-coding` (gh CLI authenticated, repo+workflow scopes) |
| Auto-update | `.github/workflows/update-polls.yml`, 2×/day cron, commits `data/` → would trigger Vercel |

Recent commits (newest first):

```
c595d7e  Fase 1: store NDJSON consolidado + portão de paridade
5f0fa6e  Reparos curados de fonte primária, reaplicados a cada coleta
56a6438  Reparo do parser da Wikipédia: dados estaduais recuperados
5780b4d  Teto de 2 pesquisas por instituto na média, com base mínima de 3
9e06040  Média passa a usar as 10 pesquisas mais recentes de cada disputa
d79b951  Aba '2º turno': placar de projeções dos confrontos
eba62f9  Correções pós-verificação independente
f8c8e7e  Placar das Pesquisas 2026 — commit inicial
```

---

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
canonicalise candidates → drop cross-brand duplicates → date guards → validate → write.

**Averaging** (`src/lib/average.ts`) — **the rule that is actually implemented**:
per contest, the **10 most recent polls, max 2 per institute, floor of 3**.
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

**Still open**: how to handle polls that are genuinely incomplete at source (not
recoverable) under válidos — gate them out of the average, or keep with a flag.

**Homepage visual design is parked.** The trigger phrase is **"Let's go back to design."**
See the memory file `placar-design-conversation-pending.md`; the RealClearPolling
element breakdown and four open questions are recorded there.

### B. Database restructure — PHASE 1 DONE

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

**Phase 3** — rewrite `scrape.mjs` as sources → normalise → resolve → upsert → repairs →
validate → write, dual-writing `polls.json` for 1–2 weeks so rollback is one revert. Then
add `scripts/sources/eleicaoemdados.mjs` (+72 registry-valid polls;
base `https://api-core-4p7x5p4kza-rj.a.run.app/api/v1`, `/polls?per_page=100&page=N`,
`/polls/{id}/scenarios`). **Ingestion order must stay poder360 → eleicaoemdados →
wikipedia**, because "first writer wins" is what implements source priority.
Note two signatures changed under it: `readStore` takes `{ runDate, prior }`, and
`addSourceRef(store, survey, ref)` now takes the store first (it needs the run's clock).
Pass a single `runDate` for the whole run — a scrape that stamps two dates because it
crossed midnight is the same churn defect in a smaller costume.

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
- **Senate elects 2 per state** → candidate percentages sum to ~200%. Validator cap is
  260 for `senador`, 130 otherwise. Senate is excluded from válidos.
- `average.ts` does **not** implement votos válidos. Any válidos figure you've seen was
  computed ad hoc.
- `scripts/sources/tse.mjs` **reads every CSV in the TSE zip**, but `BRASIL.csv` is the
  complete superset (1.522 registrations) and the 27 per-UF files are duplicates. Known
  bug; fix in Phase 4.
- **Candidate merge bug, still live for the scraper**: `sameCandidate()` in
  `canonicalize.mjs` merges "Ciro Nogueira" into "Ciro" — different politicians. Disabled
  for the migration (`resolveCandidate(..., {fuzzy:false})`); must be fixed before Phase 3
  ingests raw names.
- **137 TSE registrations cover more than one survey** in the store (one fieldwork
  operation, several offices filed separately by Poder360). Recorded in
  `conflicts.ndjson` as a worklist; consolidating them changes averages.

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
- `pypdf` works; **`pdftotext`, `pdftoppm` and OCR are NOT installed** — don't assume them.

---

## 5. Verification — run these

```bash
cd ~/Projects/pesquisas-2026
node scripts/validate-store.mjs --self-test   # 20 guards, each proven to fire
node scripts/validate-store.mjs               # validate the real store
node scripts/parity-check.mjs                 # store must reproduce polls.json
node scripts/projection-twin-check.mjs        # project.mjs ≡ src/lib/store.ts
node scripts/idempotence-check.mjs            # rebuild on 2 dates ⇒ tabelas idênticas
node scripts/idempotence-check.mjs --self-test # …and prove that check can fail
node scripts/validate-data.mjs --self-test    # legacy validator
node scripts/migrate-to-store.mjs             # idempotent; only meta.migrated_at moves
npm run scrape                                # full re-ingest (~10 min, be patient)
npx next build                                # must produce 38 pages
```

**The clock is injected, not read at the point of use.** `readStore({ runDate })` carries
the run's date on the store, and every stamp comes from there — `today()` survives only as
the default. `migrate-to-store.mjs` reads whatever store already exists and carries its
`first_seen` / `created_at` / `updated_at` forward (`priorStamps`), which is safe because
ids are minted once from a recorded seed and never recomputed. `--run-date=` and `--dir=`
exist so the guard can rebuild twice into scratch directories.

This was a live defect: every date was read from the wall clock, so a rebuild on a later
day rewrote all 4.613 records with nothing but the stamps changed. Nothing failed — the
store stayed valid, parity stayed green — you just lost the three-line reviewable diff
NDJSON exists to give you. Re-running the migration on `data/` now produces a **one-line**
diff (`meta.migrated_at`, the single field still allowed a wall-clock reading).

`scripts/idempotence-check.mjs` guards both halves, because either alone passes while
broken: **injection** (a fresh build stamps the date it was given, never today's) and
**preservation** (a rebuild re-dates nothing it already had). Both were proven to fire —
injection by leaking one `today()` back in, preservation via `--self-test`, which wipes the
store between runs to recreate the old behaviour exactly.

The parity check used to compare neither `scenario`, `source_url`, `contractor` nor the
per-result `party`, two of which are rendered. All four are compared now, and each new
guard was proven to fire before being trusted.

Working practice that has caught every significant defect: **a producer never certifies
its own output.** After any data change, have an independent agent re-check a sample
against the original sources. It has found real bugs every single time — including ones
I was confident about.

---

## 6. Open items

1. ~~Phase 2 of the database plan~~ — **done**; the site reads the store. Phase 3 is next.
2. Candidate identity, before Phase 3. `sameCandidate()` merges "Ciro Nogueira" into
   "Ciro" (different politicians); the mirror failure is live in the data — **"Tião
   Bocalom" and "Sebastião Bocalom" are one person**, splitting Acre's average into
   18,4% (base 9/10) plus a phantom 14,0% (base 1/10); unified it is 18,0% at 10/10.
   *Verified internally, not from the web:* Delta's 04–09/08/2026 fieldwork reached us
   twice — Poder360 (`s_572c48c5dc3f`, TSE AC-06787/2026) with a 1º-turno field of
   {Alan Rick, Mailza Assis, **Sebastião** Bocalom}, and Wikipédia (`s_aaf3bc7b7171`,
   same window, same 1.006 sample) with a runoff Alan Rick vs **Tião** Bocalom. A runoff
   is drawn from the round-1 field, so Tião is not in it unless Tião *is* Sebastião. Both
   spellings also carry the same party trajectory (PL until Feb/26, PSDB after) and never
   once co-occur in 28 rows. (pt.wikipedia confirms: "Sebastião Bocalom Rodrigues … mais
   conhecido como Tião Bocalom" — a lead, not the basis.)
   **Do not fix by widening the fuzzy match.** A scan for the general pattern (same
   contest, shared name token, never co-occurring) returns **63 pairs**: many are one
   person (`Zacharias/Zacarias Calil`, `Mateus/Matheus Simões`, `Mendanha/Medanha`,
   `Baldy/Bady`, `van Hattem/Hatten`, `Capitão Derrite/Guilherme Derrite`), but the same
   list contains Jair, Flávio, Michelle and Eduardo Bolsonaro, who must never merge. No
   fuzzy rule separates those. Build a **curated alias table** reviewed by the creator,
   as `data/repairs.json` already does for values — `candidates.ndjson` has `aliases`
   already; give it the `merged_into` that institutes have. Then delete the fuzzy path
   rather than tuning it. Worth adding as a hard validator guard: two aliases of one
   candidate appearing in the same question is proof of a bad merge.
   Also spotted there: those two Delta records are the *same fieldwork* stored as two
   surveys (the Wikipédia one lost the TSE registration) — related to the shared-
   registration worklist, but a distinct duplicate-survey case.
3. Implement the presentation spec in §3A — none of it exists yet.
4. Decide how incomplete polls are handled under válidos.
5. Narrow `tse.mjs` to `BRASIL.csv`.
6. Deploy: `gh repo create placar-das-pesquisas --public --source=. --push`, then import on Vercel.
7. Homepage visual design — parked behind the phrase "Let's go back to design."
8. `data/polls.json` no longer feeds the site — the store does. It is still written by the
   scraper and is still what `parity-check.mjs` compares against, so it stays until Phase 5.
