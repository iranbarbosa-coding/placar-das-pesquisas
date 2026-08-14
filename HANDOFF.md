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

**Phase 2 (next)** — `src/lib/store.ts` + rewrite `loadDataset()` in `src/lib/data.ts` to
project `question ⨝ survey` into today's flat `Poll[]`. The other 8 exports and every page
stay unchanged. **Gate: `next build` before/after must produce byte-identical `out/`.**
`scripts/lib/project.mjs` is the Node twin of that projection — keep them identical.

**Phase 3** — rewrite `scrape.mjs` as sources → normalise → resolve → upsert → repairs →
validate → write, dual-writing `polls.json` for 1–2 weeks so rollback is one revert. Then
add `scripts/sources/eleicaoemdados.mjs` (+72 registry-valid polls;
base `https://api-core-4p7x5p4kza-rj.a.run.app/api/v1`, `/polls?per_page=100&page=N`,
`/polls/{id}/scenarios`). **Ingestion order must stay poder360 → eleicaoemdados →
wikipedia**, because "first writer wins" is what implements source priority.

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
node scripts/validate-data.mjs --self-test    # legacy validator
node scripts/migrate-to-store.mjs             # idempotent: byte-identical on re-run
npm run scrape                                # full re-ingest (~10 min, be patient)
npx next build                                # must produce 38 pages
```

Working practice that has caught every significant defect: **a producer never certifies
its own output.** After any data change, have an independent agent re-check a sample
against the original sources. It has found real bugs every single time — including ones
I was confident about.

---

## 6. Open items

1. Phase 2 of the database plan (site reads the store).
2. Fix the "Ciro Nogueira" candidate merge before Phase 3.
3. Implement the presentation spec in §3A — none of it exists yet.
4. Decide how incomplete polls are handled under válidos.
5. Narrow `tse.mjs` to `BRASIL.csv`.
6. Deploy: `gh repo create placar-das-pesquisas --public --source=. --push`, then import on Vercel.
7. Homepage visual design — parked behind the phrase "Let's go back to design."
8. `data/polls.json` is still the site's source of truth; the store shadows it until Phase 2.
