#!/usr/bin/env node
// Build the candidate-identity review worklist.
//
// WHAT THIS IS: a triage list for a HUMAN decision, not a merge rule. It finds
// pairs of candidate names in the same contest that share a name token and
// NEVER appear together in one poll, then gathers the evidence needed to judge
// each one — without deciding any of them.
//
// WHY IT IS NOT A MERGE RULE: the same signal that catches "Tião Bocalom" ×
// "Sebastião Bocalom" (one person) also catches Jair × Flávio × Michelle ×
// Eduardo Bolsonaro (four people, alternative candidacies, so they never share
// a poll). No string heuristic separates those two situations, which is exactly
// how `sameCandidate()` came to merge "Ciro Nogueira" into "Ciro". The
// `suggestion` column below is a sorting aid and carries no authority.
//
// Usage: node scripts/candidate-review.mjs [--out REVISAO_CANDIDATOS.md] [--self-test]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { readStore, DATA_DIR, JANELA_OPERACAO_MS } from "./lib/store.mjs";
import { projectPolls } from "./lib/project.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

const norm = (s) => (s ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().trim();
const TITLES = new Set(["dr", "dra", "doutor", "doutora", "professor", "professora", "prof",
  "capitao", "coronel", "sargento", "major", "tenente", "general", "delegado", "delegada",
  "pastor", "padre", "cabo", "soldado", "senador", "senadora", "deputado", "deputada",
  "prefeito", "prefeita", "juiz", "juiza", "promotor", "advogado", "medico", "medica",
  "enfermeira", "irma", "irmao", "tia", "tio", "dona", "dom", "seu", "vereador", "vereadora"]);
const STOP = new Set(["de", "da", "do", "dos", "das", "e", "jr", "junior", "filho", "neto", "neta"]);
const tokens = (s) => norm(s).split(/\s+/).filter(Boolean);
const meaningful = (s) => tokens(s).filter((t) => t.length > 2 && !STOP.has(t) && !TITLES.has(t));

function levenshtein(a, b) {
  const m = a.length, n = b.length;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

const RACE_LABEL = { presidente: "Presidente", governador: "Governador", senador: "Senado" };

// LÊ AS GRAFIAS PUBLICADAS: `results[].name_raw` de data/questions.ndjson.
//
// ATÉ 17/08/2026 ESTE GERADOR LIA `data/polls.json`, e o comentário que ficava
// aqui dizia que ler o store seria "um laço que se come". A defesa era
// verdadeira quando foi escrita e parou de ser sem que ninguém a atualizasse:
// `polls.json` virou PROJEÇÃO do store (`derived_from_store: true`) e
// `project.mjs` publica `candidate: candById.get(...)?.canonical`. Ou seja, o
// gerador passou a ler exatamente a camada canonicalizada de que se defendia —
// CONVENTIONS §6, quarta ocorrência registrada, depois de `candidate-resolve`
// (que escreveu a tabela vazia duas vezes) e `match-ballot-names` (16/08).
//
// O QUE ISSO APAGAVA, medido em 17/08/2026 antes do conserto: 274 dos 1.074
// candidatos já tinham 2+ apelidos fundidos e NENHUMA dessas fusões aparecia na
// revisão. A classe `grafia` inteira tinha ido de 18 pares a zero, e 27 dos 47
// pares que sumiram do dossiê foram fundidos pela automação, sem ruling humana
// nenhuma — `Alexandre Bady × Alexandre Baldy`, `Carlos Caguin × Carlos Gaguim`,
// `Sebastião Bocalom × Tião Bocalom`. Uma varredura que lê o nome já fundido não
// pode, por construção, encontrar fusão para revisar.
//
// O ERRO NÃO ERA "LER O STORE", ERA "LER O CAMPO CANÔNICO". O store guarda as
// duas camadas: `name_raw` é a grafia que o instituto publicou, `canonical` é o
// que decidimos exibir. Desde 16/08 (`46ea8c7`) `name_raw` guarda de fato a
// grafia publicada — até então guardava o canônico, o oposto do que o próprio
// nome do campo prometia, e por isso qualquer intuição anterior sobre ele é
// suspeita.
//
// O QUE ESTA ENTRADA NÃO ENXERGA, dito aqui antes que alguém descubra do jeito
// caro: `name_raw` guarda a grafia do PRIMEIRO escritor de cada
// (pergunta, candidato), então é PISO do que foi publicado, nunca teto — 125
// candidatos carregam 2+ grafias distintas, contra 274 que a tabela de apelidos
// diz terem sido fundidos. E `aliases` só começou a acumular em 16/08, quando
// `resolveCandidate` passou a receber a grafia crua: a história de fusões
// visível aqui é de 16/08 para a frente, não retroativa. `data/nomes-crus.json`
// tem grafias que esta varredura não alcança e entra como conferência de
// cobertura no rodapé — não como entrada, porque ele é um CONJUNTO por disputa,
// sem a ligação "qual pesquisa trouxe qual grafia" que a evidência exige.
//
// A METADATA (instituto, data, fonte, turno) CONTINUA VINDO DA PROJEÇÃO, de
// propósito: `projectPolls()` é a única implementação de "quais perguntas
// contam" e do passo `merged_into` dos institutos (§5), e institutos são outra
// canonicalização, não a que mentia aqui. Ela roda em memória sobre o store
// vivo — não é o arquivo derivado no disco.
const RAW = (r) => r.name_raw;

/** contest → nome → ocorrências, e candidate_id → grafias vistas (para o guarda). */
function collect(store, nameOf) {
  const meta = new Map(projectPolls(store).map((p) => [p.id, p]));
  const contests = new Map();
  const spellings = new Map();
  for (const q of store.questions) {
    const id = q.legacy_id ?? q.question_id;
    const p = meta.get(id);
    if (!p) continue; // não-headline ou retratada: o filtro é o da projeção
    const c = `${p.race}|${p.state ?? "BR"}`;
    if (!contests.has(c)) contests.set(c, new Map());
    const m = contests.get(c);
    for (const r of q.results ?? []) {
      const name = nameOf(r);
      if (!spellings.has(r.candidate_id)) spellings.set(r.candidate_id, new Set());
      spellings.get(r.candidate_id).add(name);
      if (!m.has(name)) m.set(name, []);
      m.get(name).push({
        pollId: id, date: p.fieldwork_end ?? p.published_date ?? null,
        institute: p.pollster, source: p.source, round: p.round,
        party: r.party ?? null, pct: r.pct,
      });
    }
  }
  return { contests, spellings };
}

/**
 * RECUSA RODAR SOBRE ENTRADA CANONICALIZADA. O predicado é derivado, não
 * escolhido (§10): a projeção colapsa cada candidato numa grafia só POR
 * CONSTRUÇÃO, então "algum candidato aparece com duas grafias" vale zero na
 * saída canonicalizada e positivo na crua. Não é limiar, é a diferença
 * estrutural entre as duas camadas — e `--self-test` prova os dois lados.
 *
 * O precedente é `candidate-resolve.mjs`, que se recusa a escrever uma tabela
 * menor do que a que substitui porque já se escreveu vazio duas vezes. Aqui o
 * modo de falha é o mesmo com outra roupa: silêncio que passa por "nada a
 * revisar".
 */
function assertRawInput({ spellings }, store) {
  const candById = new Map(store.candidates.map((c) => [c.candidate_id, c]));
  const aliasMulti = store.candidates.filter((c) => new Set(c.aliases).size > 1).length;
  const multi = [...spellings].filter(([, s]) => s.size > 1);
  if (!multi.length) {
    throw new Error(
      "ENTRADA CANONICALIZADA (CONVENTIONS §6): nenhum candidato aparece com duas grafias.\n" +
      `  A tabela de apelidos do store diz que ${aliasMulti} candidatos foram fundidos a partir de 2+ grafias.\n` +
      "  Uma revisão de identidade que lê o nome já fundido não acha fusão nenhuma para revisar.");
  }
  // A entrada e o store têm de concordar sobre o que foi publicado. Uma grafia
  // que a tabela de apelidos não conhece significa que uma das duas camadas
  // andou sem a outra — e a varredura estaria julgando um nome órfão.
  const unknown = [];
  for (const [cid, ss] of multi) {
    const c = candById.get(cid);
    for (const n of ss) if (!new Set(c?.aliases ?? []).has(n)) unknown.push(`${c?.contest ?? "?"} · ${n}`);
  }
  if (unknown.length) {
    throw new Error(
      `${unknown.length} grafia(s) publicada(s) que a tabela de apelidos não conhece:\n  ` +
      unknown.slice(0, 5).join("\n  "));
  }
  return { multi: multi.length, aliasMulti, candidates: spellings.size };
}

/**
 * O que `nomes-crus.json` viu e esta varredura não. Ele é o dump anterior à
 * canonicalização, sem ligação com a pesquisa de origem — serve para dizer o
 * tamanho do ponto cego, não para preenchê-lo.
 */
function coverageGap(contests) {
  const file = path.join(ROOT, "data", "nomes-crus.json");
  if (!fs.existsSync(file)) return null;
  const crus = JSON.parse(fs.readFileSync(file, "utf-8"));
  let total = 0, missing = 0;
  for (const [contest, list] of Object.entries(crus)) {
    // O arquivo mudou de forma em 17/08 (string → {nome, partidos}); aceita as duas.
    const names = list.map((x) => (typeof x === "string" ? x : x?.nome)).filter(Boolean);
    const seen = contests.get(contest.replace(":", "|")) ?? new Map();
    for (const n of names) { total++; if (!seen.has(n)) missing++; }
  }
  return { total, missing };
}

export function buildDetailed({ store = readStore({ dir: DATA_DIR }), nameOf = RAW, guard = true } = {}) {
  const collected = collect(store, nameOf);
  const stats = guard ? assertRawInput(collected, store) : null;
  const { contests } = collected;

  const pairs = [];
  for (const [c, names] of contests) {
    const list = [...names.keys()].sort();
    for (let i = 0; i < list.length; i++) {
      for (let j = i + 1; j < list.length; j++) {
        const A = list[i], B = list[j];
        const ta = meaningful(A), tb = meaningful(B);
        const shared = ta.filter((t) => tb.includes(t));
        if (!shared.length) continue;

        const occA = names.get(A), occB = names.get(B);
        const idsB = new Set(occB.map((o) => o.pollId));
        if (occA.some((o) => idsB.has(o.pollId))) continue; // co-occur ⇒ different people

        pairs.push(analyse(c, A, B, occA, occB, shared, ta, tb));
      }
    }
  }
  pairs.sort((x, y) =>
    ORDER.indexOf(x.suggestion) - ORDER.indexOf(y.suggestion) ||
    Math.min(y.a.n, y.b.n) - Math.min(x.a.n, x.b.n));
  return { pairs, stats, coverage: coverageGap(contests) };
}

// `candidate-resolve.mjs` consome só os pares — contrato preservado de propósito.
export function build(opts) { return buildDetailed(opts).pairs; }

const ORDER = ["grafia", "titulo_apelido", "indefinido", "prenome_comum", "sobrenome_comum"];
const LABEL = {
  grafia: "Variação de grafia — provável MESMA pessoa",
  titulo_apelido: "Título ou apelido — provável MESMA pessoa",
  indefinido: "Indefinido — precisa de fonte primária",
  prenome_comum: "Só o primeiro nome em comum — provável PESSOAS DIFERENTES",
  sobrenome_comum: "Sobrenome em comum — provável PESSOAS DIFERENTES",
};

function side(occ) {
  const dates = occ.map((o) => o.date).filter(Boolean).sort();
  const insts = new Map(), parties = new Map(), sources = new Set();
  for (const o of occ) {
    insts.set(o.institute, (insts.get(o.institute) ?? 0) + 1);
    if (o.party) {
      if (!parties.has(o.party)) parties.set(o.party, []);
      parties.get(o.party).push(o.date);
    }
    sources.add(o.source);
  }
  return {
    n: occ.length, first: dates[0] ?? null, last: dates[dates.length - 1] ?? null,
    institutes: [...insts.entries()].sort((a, b) => b[1] - a[1]),
    sources: [...sources].sort(),
    parties: [...parties.entries()].map(([p, ds]) => {
      const s = ds.filter(Boolean).sort();
      return { party: p, first: s[0] ?? null, last: s[s.length - 1] ?? null, n: ds.length };
    }).sort((a, b) => (a.first ?? "").localeCompare(b.first ?? "")),
    meanPct: occ.reduce((s, o) => s + o.pct, 0) / occ.length,
  };
}

function analyse(contest, A, B, occA, occB, shared, ta, tb) {
  const a = side(occA), b = side(occB);

  // THE STRONGEST AUTOMATIC SIGNAL, and the one that settled Bocalom: the same
  // institute polling the same contest within ±3 days, naming one but not the
  // other. That is one fieldwork operation reaching us under two spellings.
  const twins = [];
  for (const x of occA) {
    for (const y of occB) {
      if (x.institute !== y.institute || !x.date || !y.date) continue;
      // A MESMA janela de "uma operação de campo" da escada (§5): o sinal aqui é
      // justamente "o mesmo instituto, a mesma disputa, a mesma ida a campo".
      if (Math.abs(+new Date(x.date) - +new Date(y.date)) > JANELA_OPERACAO_MS) continue;
      twins.push({ institute: x.institute, a: x, b: y });
    }
  }
  const sharedInstitutes = a.institutes.map(([i]) => i).filter((i) => b.institutes.some(([j]) => j === i));

  // Do the two names alternate in time, or hold disjoint periods?
  const overlap = a.first && b.first && a.last >= b.first && b.last <= a.last
    ? "contido" : (a.first && b.first && a.first <= b.last && b.first <= a.last ? "sobreposto" : "disjunto");

  const lastA = ta[ta.length - 1], lastB = tb[tb.length - 1];
  const sameSurname = lastA && lastA === lastB;
  const dist = levenshtein(norm(A), norm(B));
  const firstA = ta[0], firstB = tb[0];
  const hypocorism = firstA && firstB && firstA !== firstB && firstA.length >= 3 && firstB.length >= 3 &&
    (firstA.endsWith(firstB) || firstB.endsWith(firstA));
  const titleOnly = (() => {
    const bareA = tokens(A).filter((t) => !TITLES.has(t)).join(" ");
    const bareB = tokens(B).filter((t) => !TITLES.has(t)).join(" ");
    return bareA !== norm(A).replace(/\s+/g, " ") || bareB !== norm(B).replace(/\s+/g, " ")
      ? levenshtein(bareA, bareB) <= 2 || bareA.includes(bareB) || bareB.includes(bareA)
      : false;
  })();
  const subset = ta.every((t) => tb.includes(t)) || tb.every((t) => ta.includes(t));

  // Shared token is a GIVEN name while the surnames differ ("Eduardo Bolsonaro"
  // × "Eduardo Leite"). Usually different people — but not safely so: Brazilian
  // ballot names attach an allegiance ("Gianni do Bolsonaro"), so this bucket
  // is a reading order, not a verdict.
  const onlyGivenShared = !sameSurname && !shared.includes(lastA) && !shared.includes(lastB);

  let suggestion;
  if (ta.length === tb.length && dist > 0 && dist <= 2) suggestion = "grafia";
  else if (titleOnly || hypocorism) suggestion = "titulo_apelido";
  else if (sameSurname && subset) suggestion = "titulo_apelido";
  else if (onlyGivenShared) suggestion = "prenome_comum";
  else if (sameSurname && firstA !== firstB) suggestion = "sobrenome_comum";
  else suggestion = "indefinido";

  // Party agreement, computed so it is not left to the eye. Compared on a
  // loosened key because sources spell the same party several ways
  // ("MISSÃO" / "Missão" / "Mission").
  const pset = (s) => new Set(s.parties.map((p) => norm(p.party)));
  const pa = pset(a), pb = pset(b);
  const sharedParties = [...pa].filter((x) => pb.has(x));
  const partyVerdict = !pa.size || !pb.size ? "sem dados"
    : sharedParties.length ? `coincidem (${sharedParties.join(", ").toUpperCase()})`
    : "CONTRADIZEM";

  return { contest, A, B, a, b, shared, twins, sharedInstitutes, overlap, dist, sameSurname, suggestion, partyVerdict };
}

/** Connected components of the pair graph, per contest. */
function components(pairs) {
  const byContest = new Map();
  for (const p of pairs) {
    if (!byContest.has(p.contest)) byContest.set(p.contest, []);
    byContest.get(p.contest).push(p);
  }
  const out = [];
  for (const [contest, ps] of byContest) {
    const parent = new Map();
    const find = (x) => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x))); x = parent.get(x); } return x; };
    for (const p of ps) for (const n of [p.A, p.B]) if (!parent.has(n)) parent.set(n, n);
    for (const p of ps) parent.set(find(p.A), find(p.B));
    const groups = new Map();
    for (const n of parent.keys()) {
      const root = find(n);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(n);
    }
    for (const names of groups.values()) {
      const inGroup = ps.filter((p) => names.includes(p.A) && names.includes(p.B));
      out.push({ contest, names: names.sort(), pairs: inGroup.length });
    }
  }
  return out.sort((a, b) => b.names.length - a.names.length);
}

// ---------------------------------------------------------------- rendering
const fmtInst = (list) => list.slice(0, 4).map(([i, n]) => `${i} (${n})`).join(", ") + (list.length > 4 ? `, +${list.length - 4}` : "");
const fmtParties = (ps) => ps.length ? ps.map((p) => `${p.party} ${p.first}→${p.last}`).join(" · ") : "—";

function render(pairs) {
  const [race, uf] = ["", ""];
  const L = [];
  L.push("# Revisão de identidade de candidatos");
  L.push("");
  L.push("Gerado por `node scripts/candidate-review.mjs`. **Nada aqui foi aplicado.** Cada par");
  L.push("precisa de uma decisão sua; a coluna de sugestão é só ordenação, não autoridade.");
  L.push("");
  L.push("## Como esta lista foi montada");
  L.push("");
  L.push("Pares de nomes que (a) disputam o **mesmo cargo no mesmo estado**, (b) **compartilham");
  L.push("um token de nome** e (c) **nunca aparecem juntos na mesma pesquisa**. O critério (c) é o");
  L.push("filtro forte: dois nomes na mesma pesquisa são necessariamente pessoas diferentes.");
  L.push("");
  L.push("**O critério não separa mesma-pessoa de mesma-família.** Ele encontra");
  L.push("`Tião Bocalom × Sebastião Bocalom` (uma pessoa) e `Jair × Flávio × Michelle × Eduardo");
  L.push("Bolsonaro` (quatro pessoas, candidaturas alternativas, por isso nunca coincidem) com o");
  L.push("mesmo sinal. Nenhuma regra de string distingue os dois casos — foi assim que");
  L.push("`sameCandidate()` fundiu \"Ciro Nogueira\" em \"Ciro\". Por isso a decisão é humana.");
  L.push("");
  L.push("### A evidência que mais pesa — e por que ela sozinha não basta");
  L.push("");
  L.push("**Campo gêmeo**: o mesmo instituto pesquisando a mesma disputa em ±3 dias, citando um");
  L.push("nome e não o outro. Costuma ser uma operação de campo chegando até nós com duas");
  L.push("grafias — foi o que resolveu o caso Bocalom. Quando aparece, está destacado no par.");
  L.push("");
  L.push("**Mas ela produz falso positivo.** `Ciro × Ciro Nogueira` tem campo gêmeo e são pessoas");
  L.push("diferentes — é exatamente a fusão que `sameCandidate()` já fez uma vez. A diferença");
  L.push("está no resto da evidência: em Bocalom as **trajetórias partidárias coincidem** (PL até");
  L.push("fev/26, PSDB depois, nas duas grafias); em Ciro elas se **contradizem** (PDT/PSDB contra");
  L.push("PP) e as médias ficam a 13 pontos uma da outra. Campo gêmeo é motivo para olhar, nunca");
  L.push("para decidir.");
  L.push("");
  L.push("Leia sempre junto: **trajetória partidária** (a mesma troca de partido nas mesmas datas");
  L.push("é o sinal mais confiável), **média %** (ordens de grandeza distintas desmentem a fusão),");
  L.push("**institutos em comum**, e **período** (`sobreposto` favorece mesma pessoa com grafias");
  L.push("concorrentes; `disjunto` pode ser troca de nome **ou** substituição de candidato).");
  L.push("");
  const counts = {};
  for (const p of pairs) counts[p.suggestion] = (counts[p.suggestion] ?? 0) + 1;
  L.push("## Resumo");
  L.push("");
  L.push("| Sugestão | Pares |");
  L.push("|---|---|");
  for (const k of ORDER) if (counts[k]) L.push(`| ${LABEL[k]} | ${counts[k]} |`);
  L.push(`| **Total** | **${pairs.length}** |`);
  L.push("");
  L.push("Com campo gêmeo (evidência mais forte): " +
    `**${pairs.filter((p) => p.twins.length).length}** par(es).`);
  L.push("");
  L.push("## Como aplicar as decisões");
  L.push("");
  L.push("Não mexa em `sameCandidate()`. As decisões viram uma **tabela de apelidos curada**, no");
  L.push("mesmo espírito de `data/repairs.json`: `candidates.ndjson` já tem `aliases`, falta o");
  L.push("`merged_into` que os institutos têm. Com a tabela no lugar, a resolução passa a ser um");
  L.push("índice determinístico e o caminho fuzzy pode ser **apagado**, não ajustado.");
  L.push("");
  L.push("Vale acrescentar um guarda duro no validador: **dois apelidos do mesmo candidato na");
  L.push("mesma pergunta é prova de fusão errada** — é o teste que teria pego o caso Ciro.");
  L.push("");

  // Pairs are not independent: A×B, B×C and A×C describe one cluster and have
  // to be decided together, or you can merge A into B and C into A and end up
  // asserting B = C without ever having looked at that pair.
  const clusters = components(pairs).filter((c) => c.names.length > 2);
  if (clusters.length) {
    L.push("## Decida em conjunto");
    L.push("");
    L.push("Estes nomes formam grupos ligados — decidir par a par pode fazer você fundir A com B");
    L.push("e C com A, afirmando que B = C sem nunca ter olhado esse par.");
    L.push("");
    for (const c of clusters) {
      const [r, u] = c.contest.split("|");
      L.push(`- \`${RACE_LABEL[r] ?? r}${u === "BR" ? "" : " · " + u}\` — ${c.names.map((n) => `**${n}**`).join(" · ")} (${c.pairs} pares abaixo)`);
    }
    L.push("");
  }

  let current = null;
  for (const p of pairs) {
    if (p.suggestion !== current) {
      current = p.suggestion;
      L.push(`---`);
      L.push("");
      L.push(`## ${LABEL[current]}`);
      L.push("");
      if (current === "sobrenome_comum") {
        L.push("Aqui mora a família Bolsonaro. Leia cada um assumindo **pessoas diferentes** até");
        L.push("prova em contrário.");
        L.push("");
      }
      if (current === "prenome_comum") {
        L.push("Sobrenomes diferentes, só o primeiro nome coincide. Quase sempre pessoas");
        L.push("diferentes — **mas** o nome de urna brasileiro costuma anexar uma filiação");
        L.push("(\"Fulano do Bolsonaro\", \"Fulano da Saúde\"), então um par assim pode ser a mesma");
        L.push("pessoa com nome de urna e nome civil. Confira antes de descartar.");
        L.push("");
      }
      if (current === "grafia") {
        L.push("Diferença de 1–2 caracteres com o mesmo número de tokens — tipicamente erro de");
        L.push("digitação da fonte. Ainda assim, confirme: `Bady`/`Baldy` e `Medanha`/`Mendanha`");
        L.push("são plausíveis como pessoas distintas até você olhar.");
        L.push("");
      }
    }
    const [r, u] = p.contest.split("|");
    L.push(`### ${p.A} × ${p.B}`);
    L.push("");
    L.push(`\`${RACE_LABEL[r] ?? r}${u === "BR" ? "" : " · " + u}\` · token em comum: \`${p.shared.join(", ")}\` · distância de edição: ${p.dist} · período: ${p.overlap}`);
    L.push("");
    L.push("| | " + p.A + " | " + p.B + " |");
    L.push("|---|---|---|");
    L.push(`| pesquisas | ${p.a.n} | ${p.b.n} |`);
    L.push(`| período | ${p.a.first ?? "—"} → ${p.a.last ?? "—"} | ${p.b.first ?? "—"} → ${p.b.last ?? "—"} |`);
    L.push(`| média % | ${p.a.meanPct.toFixed(1)} | ${p.b.meanPct.toFixed(1)} |`);
    L.push(`| partidos | ${fmtParties(p.a.parties)} | ${fmtParties(p.b.parties)} |`);
    L.push(`| institutos | ${fmtInst(p.a.institutes)} | ${fmtInst(p.b.institutes)} |`);
    L.push(`| fontes | ${p.a.sources.join(", ")} | ${p.b.sources.join(", ")} |`);
    L.push("");
    L.push(`Partidos: **${p.partyVerdict}** · diferença entre as médias: ${Math.abs(p.a.meanPct - p.b.meanPct).toFixed(1)} p.p.`);
    L.push("");
    if (p.twins.length) {
      const t = p.twins[0];
      L.push(`**Campo gêmeo — ${p.twins.length} ocorrência(s).** ${t.institute}: \`${t.a.date}\` cita *${p.A}* (${t.a.pct}%, ${t.a.round}º turno) e \`${t.b.date}\` cita *${p.B}* (${t.b.pct}%, ${t.b.round}º turno).`);
      L.push("");
    } else if (p.sharedInstitutes.length) {
      L.push(`Institutos que usam **os dois** nomes (em datas distantes): ${p.sharedInstitutes.slice(0, 5).join(", ")}.`);
      L.push("");
    } else {
      L.push("Nenhum instituto usa os dois nomes — cada grafia vem de casas diferentes.");
      L.push("");
    }
    L.push("- [ ] mesma pessoa → canônico: `________________`");
    L.push("- [ ] pessoas diferentes");
    L.push("- [ ] não sei — verificar em: `________________`");
    L.push("");
  }
  return L.join("\n") + "\n";
}

/**
 * AUTOTESTE (§2). Não basta afirmar "a entrada é crua": o teste TROCA a entrada
 * de volta pela camada canonicalizada — a mesma expressão que `project.mjs:68`
 * publica — e EXIGE que a bateria fique vermelha. Um autoteste que só conferisse
 * uma contagem na entrada boa passaria verde com o guarda apagado, que é
 * exatamente o modo de falha que este arquivo acabou de sofrer por um ano de
 * comentário desatualizado.
 */
function selfTest() {
  const store = readStore({ dir: DATA_DIR });
  const candById = new Map(store.candidates.map((c) => [c.candidate_id, c]));
  const CANONICAL = (r) => candById.get(r.candidate_id)?.canonical ?? r.name_raw;
  const casos = [];
  const afirma = (nome, fn) => {
    try { fn(); casos.push([true, nome]); }
    catch (e) { casos.push([false, `${nome} — ${e.message.split("\n")[0]}`]); }
  };

  // (1) A entrada CRUA passa, e enxerga o que a canonicalizada apagava.
  afirma("a entrada crua passa no guarda e reencontra a classe `grafia`", () => {
    const { pairs, stats } = buildDetailed({ store });
    if (!stats?.multi) throw new Error("nenhum candidato com 2+ grafias");
    const grafia = pairs.filter((p) => p.suggestion === "grafia").length;
    if (!grafia) throw new Error("classe `grafia` vazia — a entrada não é crua");
  });

  // (2) O CONTROLE NEGATIVO: entrada canonicalizada tem de DERRUBAR o guarda.
  afirma("a entrada canonicalizada é RECUSADA com a citação de §6", () => {
    let erro = null;
    try { buildDetailed({ store, nameOf: CANONICAL }); }
    catch (e) { erro = e; }
    if (!erro) throw new Error("o guarda passou sobre entrada canonicalizada");
    if (!/§6/.test(erro.message)) throw new Error(`recusou por outro motivo: ${erro.message}`);
  });

  // (3) E sem o guarda ela roda até o fim, provando que é o GUARDA que barra —
  //     e não um acidente de dados — e medindo o estrago que ele evita.
  afirma("sem o guarda, a entrada canonicalizada produz um dossiê MENOR e sem `grafia`", () => {
    const cru = buildDetailed({ store }).pairs;
    const cano = buildDetailed({ store, nameOf: CANONICAL, guard: false }).pairs;
    if (cano.length >= cru.length) throw new Error(`canonicalizado ${cano.length} ≥ cru ${cru.length}`);
    if (cano.some((p) => p.suggestion === "grafia")) throw new Error("classe `grafia` não vazia");
  });

  for (const [ok, nome] of casos) console.log(`  ${ok ? "ok  " : "FALHA"}  ${nome}`);
  const falhas = casos.filter(([ok]) => !ok).length;
  console.log(falhas ? `\n${falhas} caso(s) do autoteste não se comportaram como esperado` : "\nautoteste: o guarda dispara nos dois sentidos");
  return falhas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  if (process.argv.includes("--self-test")) process.exit(selfTest() ? 1 : 0);
  main();
}

function main() {
const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
const out = path.join(ROOT, outArg ?? "REVISAO_CANDIDATOS.md");
const { pairs, stats, coverage } = buildDetailed();
fs.writeFileSync(out, render(pairs));
console.log(`${pairs.length} pares · ${pairs.filter((p) => p.twins.length).length} com campo gêmeo → ${path.relative(ROOT, out)}`);
for (const k of ORDER) {
  const n = pairs.filter((p) => p.suggestion === k).length;
  if (n) console.log(`  ${String(n).padStart(3)}  ${LABEL[k]}`);
}
console.log(`entrada crua: ${stats.multi} de ${stats.candidates} candidatos com 2+ grafias publicadas` +
  ` · a tabela de apelidos registra ${stats.aliasMulti} fusões`);
if (coverage) {
  console.log(`ponto cego: ${coverage.missing} de ${coverage.total} nomes de data/nomes-crus.json` +
    ` não aparecem em nenhuma pergunta headline`);
}
}
