#!/usr/bin/env node
// Write data/polls.json FROM the store — the dual-write the plan calls for.
//
// Phase 3 inverts the relationship: the store is the database and polls.json
// becomes a derived artifact, kept for 1–2 weeks so a rollback is one revert.
// The site already reads the store (Phase 2), so this file now serves the
// legacy validator, the diff history, and anything outside the repo.
//
// WHAT THIS DOES TO THE PARITY GATE, said plainly: once polls.json is derived,
// most of `parity-check.mjs` compares the store against its own output. This
// file writes `projectPolls(store)` record for record, without transforming any
// of them (it only sorts the array, and the gate indexes by id), so the
// bijection, every field in FIELDS and the per-contest sets are tautological
// from here.
//
// ⚠ O QUE ESTA LINHA DIZIA E NÃO ERA VERDADE: "…and can no longer fail. Its
// job is done." Ele PODE falhar, e estava falhando quando isto foi escrito —
// a linha de senador:PI da Ravenna acusava. (O placar daquele dia está na
// mensagem do commit, que é datada por natureza; aqui ele envelheceria.)
//
// A comparação de RESULTADOS não é tautológica, porque `parity-check`
// reconstrói o lado legado com `canonicalCandidate` e o partido com
// `partyOverride` + `canonicalPartyAt`. Esses leem `candidate-rulings.json`,
// `candidate-aliases.json`, `ballot-names.json` e `repairs.json` — NENHUM deles
// sai do store, e o store guarda o nome já canonicalizado da rodada em que foi
// gravado. O que o portão acusa, então, é DEFASAGEM: uma camada de identidade
// mudou depois da última coleta e o nome gravado ainda é o de antes.
//
// ⚠ E A CAUSA NÃO É A QUE PARECE. A primeira versão desta correção culpou a
// tabela de urna, por ver "ravenna castro" em `ballot-names.json`. Medido: essa
// entrada está sob `governador:PI` e NÃO existe em `senador:PI`, e injetando um
// registro de urna vazio por `usarRegistroDeUrna()` a renomeação SOBREVIVE —
// `displayOrigin` responde "ruling". Quem renomeia é uma ruling do criador em
// `data/candidate-rulings.json` (senador:PI, "MESMA", 18/08/2026), que vale no
// instante em que é commitada enquanto o store só a absorve na coleta seguinte.
//
// As duas origens de defasagem coexistem e convém não confundi-las: a
// estrutural, do casador que roda depois da coleta e cujo mapa vale para a
// rodada seguinte (§6); e a editorial, de uma ruling escrita à mão. Esta foi a
// segunda. Nomear a causa errada custa o mesmo que a promessa falsa que este
// bloco corrige: faz a próxima pessoa consertar o casador por uma ruling.
//
// A superfície viva do portão é pequena e não é vazia: umas poucas linhas em
// que a camada de identidade discorda do nome gravado, mais as que passam por
// reparo curado de partido. Quem for reconferir, MEÇA — o número do dia não
// cabe aqui, porque envelhece com a próxima coleta.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "data", "polls.json");

const store = readStore({ dir: DATA_DIR });
const polls = projectPolls(store);

// Same ordering the scraper used: newest first, id as the deterministic tie-break.
polls.sort((a, b) =>
  (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? "") ||
  String(a.id).localeCompare(String(b.id)));

const dataset = {
  generated_at: store.meta.generated_at ?? new Date().toISOString(),
  // Marca o arquivo como projeção. `migrate-to-store.mjs` recusa lê-lo: ele
  // só traz as perguntas headline e não traz os campos crus, então remigrar a
  // partir daqui apagaria dados a cada rodada.
  derived_from_store: true,
  sources: store.meta.sources ?? [],
  polls,
};

const previous = fs.existsSync(OUT) ? JSON.parse(fs.readFileSync(OUT, "utf-8")) : { polls: [] };
const tmp = OUT + ".tmp";
fs.writeFileSync(tmp, JSON.stringify(dataset, null, 1));
fs.renameSync(tmp, OUT);

console.log(`data/polls.json derivado do store: ${previous.polls.length} → ${polls.length} pesquisas`);
