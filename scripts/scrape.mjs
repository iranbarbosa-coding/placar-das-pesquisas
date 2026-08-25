#!/usr/bin/env node
// Daily scrape: fetch every source, normalize, merge, dedupe, validate,
// atomically replace data/polls.json. Any single source failing must not
// take the site down — we keep the previous dataset's polls for that source.
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { validate, dedupeById } from "./validate-data.mjs";
import { canonicalizeCandidates, canonicalizeParties, canonicalizePollsters, sameCandidate } from "./lib/canonicalize.mjs";
import { applyRepairs } from "./lib/repairs.mjs";
import { loadRejection, writeRejectionProjection } from "./lib/rejection.mjs";
import { writeCalendarProjection } from "./lib/calendar.mjs";
import { today, writeStore, readStore, JANELA_OPERACAO_MS } from "./lib/store.mjs";
import { relatorioDeEnsaio, resolverDestino, prepararEnsaio } from "./lib/ensaio.mjs";
import { richerRoster } from "./lib/roster.mjs";
import { sobreviveAoGuardaDeSoma, veredictoDeSoma } from "./lib/soma.mjs";
import { buildStoreFromPolls } from "./lib/build-store.mjs";
import { validateStore, contagem } from "./validate-store.mjs";
import { lerCandidaturas, agruparPorDisputa, contestOf } from "./lib/candidaturas.mjs";
import { CANONICAL_LABELS, NOT_MERGED, DEFUNCT } from "./lib/parties.mjs";
import { normNome } from "./lib/nomes.mjs";
import { fetchPoder360 } from "./sources/poder360.mjs";
import { fetchWikipedia } from "./sources/wikipedia.mjs";
import { fetchTseRegistry } from "./sources/tse.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
/**
 * O DESTINO DA RODADA — `data/` na coleta de verdade, um diretório descartável
 * no ENSAIO.
 *
 * `node scripts/scrape.mjs --ensaio[=<dir>]` coleta de verdade (fonte real,
 * encolhimento real) e escreve num diretório que não é o banco. É o que permite
 * fechar a condição 1 do cabeçalho deste workflow — "a retenção nunca foi
 * exercitada contra uma coleta de verdade" — sem apostar o banco: observar e
 * escrever estavam SOLDADOS aqui, e é só essa solda que o ensaio desfaz.
 *
 * ⚠ O ENSAIO COPIA O BANCO PARA O DESTINO ANTES DE CONSTRUIR, e sem isso ele
 * não provaria nada: `buildStoreFromPolls` lê o estado ANTERIOR do mesmo
 * diretório em que escreve, então um destino vazio daria `previous` vazio — e a
 * retenção, que é regra de RODADA CONTRA RODADA, nunca dispararia. O ensaio
 * mediria zero e pareceria são.
 *
 * `data/` nunca é aberto para escrita no ensaio: as três escritas deste arquivo
 * (nomes-crus, polls.json, store) passam todas por `DESTINO`.
 */
const { emEnsaio: EM_ENSAIO_, banco: BANCO, destino: DESTINO, dataSaida: DATA, dataLeitura: DATA_LEITURA } =
  resolverDestino({ argv: process.argv, root: ROOT });
export const EM_ENSAIO = EM_ENSAIO_;

function loadPrevious() {
  try {
    return JSON.parse(fs.readFileSync(DATA_LEITURA, "utf-8"));
  } catch {
    return { generated_at: null, sources: [], polls: [] };
  }
}

/**
 * Cross-source dedupe. Candidate names differ between sources ("Lula" vs
 * "Luiz Inácio Lula da Silva"), so exact roster keys don't work. Two polls
 * are the same when they share (pollster, race, state, round, end date) and
 * their rosters match person-by-person via token-subset name matching.
 * Source priority: poder360 (structured, has TSE registro) > wikipedia.
 */
const SOURCE_PRIORITY = { poder360: 3, wikipedia: 2 };

function bucketKey(p) {
  const pollster = p.pollster
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return `${pollster}:${p.race}:${p.state ?? "BR"}:${p.round}`;
}

function pollDate(p) {
  return p.fieldwork_end ?? p.published_date ?? null;
}

// Sources disagree by a day or two on fieldwork end ("22–24/07" vs "22–23/07").
// A janela é a de `resolveSurvey` — uma implementação só (§5): se este lado e a
// escada discordarem sobre o que é uma operação de campo, o coletor funde o que
// o store separa (ou o contrário) e ninguém vê a divergência.
//
// DATA NULA NÃO É CURINGA. Isto era `if (!da || !db) return true`, e um
// fragmento sem data casava com QUALQUER data do bucket: a senador:AC de
// dez/2025 (p360-13111, ano-typo "2005" anulado pela sanitização) foi absorvida
// pela de 25/07/2026 (p360-13593) porque os elencos batiam — duas medições com
// sete meses entre elas viraram um registro. A regra do §4 é recusar a
// ambiguidade em vez de escolher: sem data dos dois lados, o que decide é uma
// chave FORTE — os fragmentos provarem que saíram do MESMO registro nativo da
// fonte. Contra o snapshot cru de 21/08/2026, nenhuma fusão legítima dependia
// do passe-nulo (todas as que dependiam eram cenários distintos ou
// indecidíveis), então o que esta recusa desfaz é só o defeito.
//
// `dataNulaCasa` é parâmetro pelo mesmo motivo do `sobrevive` de `mergePolls`:
// a mutação honesta do autoteste (`() => true` reproduz o passe-nulo antigo).
function datesClose(a, b, dataNulaCasa = mesmoRegistroNativo) {
  const da = pollDate(a);
  const db = pollDate(b);
  if (!da || !db) return dataNulaCasa(a, b);
  return Math.abs(+new Date(da) - +new Date(db)) <= JANELA_OPERACAO_MS;
}

/**
 * A chave forte que autoriza fundir fragmentos sem data: os dois carregarem o
 * id do MESMO registro nativo do Poder360 (`p360-<id da fonte>-…`, cunhado em
 * `poder360.mjs`). É a única ligação que os dados provam sem data — a
 * Wikipédia não tem id nativo, então fragmento dela sem data nunca liga por
 * aqui, e é assim que deve ser: a alternativa era o elenco decidir sozinho, e
 * foi o elenco sozinho que somou dez/2025 a jul/2026 no caso do Acre.
 */
export function mesmoRegistroNativo(a, b) {
  const ra = /^p360-(\d+)-/.exec(typeof a?.id === "string" ? a.id : "")?.[1];
  const rb = /^p360-(\d+)-/.exec(typeof b?.id === "string" ? b.id : "")?.[1];
  return ra != null && ra === rb;
}

function rostersMatch(a, b) {
  const small = a.results.length <= b.results.length ? a : b;
  const large = small === a ? b : a;
  let hits = 0;
  for (const r of small.results) {
    if (large.results.some((s) => sameCandidate(r.candidate, s.candidate))) hits++;
  }
  return hits / small.results.length >= 0.6;
}

/**
 * O ordinal que a fonte DECLAROU no rótulo do cenário ("1º turno — cenário
 * 2/5" → {n:2, de:5}). Rótulo sem ordinal ("1º turno", "cenário único",
 * "2º turno: A vs B") devolve null — cenário não declarado.
 *
 * A comparação é pelo ordinal PARSEADO, não pelo rótulo inteiro, porque o
 * prefixo varia entre páginas da Wikipédia sem mudar o que foi perguntado.
 */
export function ordinalDeCenario(p) {
  const m = /cen[aá]rio\s*(\d+)\s*\/\s*(\d+)/i.exec(p?.scenario ?? "");
  return m ? { n: +m[1], de: +m[2] } : null;
}

/**
 * CENÁRIOS DECLARADOS DOS DOIS LADOS SÓ SÃO A MESMA PERGUNTA SE OS ORDINAIS
 * FOREM IGUAIS — numerador E denominador. "cenário 1/3" e "cenário 2/3" são
 * elencos diferentes postos à mesma amostra: fundi-los apaga uma pergunta e
 * costura a tabela da outra na identidade da primeira (o registro final saía
 * com id de um fragmento e resultados de outro — a classe inteira de fusões
 * com identidade×tabela cruzadas da varredura de 21/08/2026).
 *
 * Igualdade estrita, e não "denominadores diferentes são comparáveis pelo
 * elenco", pela doutrina do §4: "cenário 1/3" e "cenário 1/7" em páginas
 * distintas PODEM ser o mesmo cenário — ou não —, e a alternativa branda,
 * medida contra o snapshot cru, deixava fragmentos de cenários distintos se
 * reagruparem por essa fresta (o registro só poderia vetar o que consegue
 * comparar). Quando a recusa separa o que era o mesmo cenário, o custo é um
 * registro a mais que `keepFullestRound1` colapsa adiante — a tabela publicada
 * não muda; quando a fusão junta o que era distinto, o custo é uma pergunta
 * que deixa de existir. Fragmento sem ordinal declarado (null de qualquer
 * lado) segue a regra de sempre: data + elenco decidem.
 */
export function cenariosCompativeis(oa, ob) {
  return !oa || !ob || (oa.n === ob.n && oa.de === ob.de);
}

/**
 * O ESTÍMULO DECLARADO (espontânea × estimulada) ENTRA NA COMPATIBILIDADE DE
 * FUSÃO: perguntas de estímulos declarados DIFERENTES nunca são a mesma
 * pergunta. O caso provado (investigação de 21/08/2026, senador:PR IRG
 * 08–12/08): a espontânea do Poder360 (p360-13833-1-1 — Deltan 7,6 · Gleisi
 * 5,7 · Curi 3,8 · indecisos 71, intacta na fonte) caiu no mesmo slot que a
 * linha estimulada da Wikipédia (9 candidatos, soma ~180, que SOBREVIVE ao
 * teto de 260 do Senado) e, sendo a tabela mais cheia, a estimulada doou: a
 * espontânea foi destruída na construção e o legacy dela (q_2d349d71bb58)
 * foi colado na pergunta estimulada resultante.
 *
 * Fragmento sem estímulo declarado segue a regra de sempre (§4: não inferir —
 * 71% de indecisos é ASSINATURA de espontânea, não declaração, e assinatura
 * não decide). Onde a marca vive, medido em 21/08/2026: o Poder360 só a
 * publica dentro do rótulo `nomeCenario` (59 de 540 rótulos vivos dizem
 * "estimulada"; NENHUM diz "espontânea" — o do caso IRG diz apenas "Senador -
 * Cenário 2"), e a Wikipédia só declara na abertura das páginas estaduais
 * ("Todos os cenários se referem a pesquisas estimuladas"). Este conserto
 * portanto NÃO desfaz o caso IRG sozinho: a declaração de espontânea daquele
 * registro existe só no PDF do instituto ("ESPONTÂNEA", pergunta 6), fora do
 * alcance deste coletor — a regra fica pronta para a marca, e a marca do IRG
 * é decisão de curadoria (§12).
 */
export function estimulosCompativeis(ea, eb) {
  return !ea || !eb || ea === eb;
}

/**
 * `sobrevive` é parâmetro por UM motivo, o mesmo do `inserir` de
 * `applyRepairs`: o autoteste de `existencia-pos-guarda-check.mjs` precisa
 * provar que a bateria REPROVA quando a decisão volta a ignorar o guarda de
 * soma, e a única mutação honesta é `() => true` — que reproduz exatamente o
 * comportamento antigo — sobre a função de verdade. O coletor nunca passa o
 * parâmetro.
 */
export function mergePolls(pollLists, {
  sobrevive = sobreviveAoGuardaDeSoma,
  // Os três abaixo são parâmetros pelo mesmo motivo do `sobrevive`: a mutação
  // honesta do autoteste de `fusao-cenarios-check.mjs` é `() => true`, que
  // reproduz exatamente o comportamento antigo (passe-nulo de data; fusão cega
  // a cenário; fusão cega a estímulo) sobre as funções de verdade. O coletor
  // nunca os passa.
  dataNulaCasa = mesmoRegistroNativo,
  cenarioCompativel = cenariosCompativeis,
  estimuloCompativel = estimulosCompativeis,
} = {}) {
  // QUEM DOA A TABELA DE RESULTADOS TEM DE SOBREVIVER AO GUARDA DE SOMA.
  //
  // `richerRoster` sozinho decidia a doação, e "mais linhas" não é "tabela que
  // vive": uma tabela pode ser a mais cheia e ainda assim reprovar na soma — e
  // aí a decisão de existência preferia um registro que o guarda de soma, mais
  // adiante no coletor, matava — levando a pesquisa inteira junto (o defeito de
  // composição medido no ensaio de 20/08/2026; ver `veredictoDeSoma`). Quando
  // exatamente um dos lados sobreviveria, ele doa; a riqueza segue desempatando
  // o resto.
  const doaTabela = (a, b) => {
    const va = sobrevive(a);
    if (va !== sobrevive(b)) return va;
    return richerRoster(a, b);
  };
  const buckets = new Map();
  const out = [];
  // O CENÁRIO QUE O REGISTRO JÁ ABSORVEU, fora do objeto de propósito: o
  // registro fundido herda o RÓTULO da fonte vencedora ("1º turno", sem
  // ordinal), então guardar a restrição no próprio `scenario` a apagaria na
  // primeira doação de identidade — e o segundo cenário da Wikipédia entraria
  // no registro que o primeiro acabou de ocupar (era exatamente a mecânica da
  // fusão em cadeia). Um Map à parte também não vaza para polls.json.
  // Sob igualdade estrita todos os ordinais absorvidos são iguais, então um
  // valor único basta — não é preciso guardar o conjunto.
  const ordinalAbsorvido = new Map();
  for (const polls of pollLists) {
    for (const p of polls) {
      const k = bucketKey(p);
      if (!buckets.has(k)) buckets.set(k, []);
      const bucket = buckets.get(k);
      const existing = bucket.find((e) =>
        datesClose(e, p, dataNulaCasa) &&
        rostersMatch(e, p) &&
        cenarioCompativel(ordinalAbsorvido.get(e) ?? null, ordinalDeCenario(p)) &&
        // Diferente do ordinal, o estímulo não precisa de Map à parte: ele vive
        // num campo próprio que a doação de identidade não sobrescreve com
        // rótulo sem a informação — e `META` abaixo o preserva na absorção.
        estimuloCompativel(e.stimulus ?? null, p.stimulus ?? null));
      if (existing) {
        if (!ordinalAbsorvido.has(existing)) {
          const o = ordinalDeCenario(p);
          if (o) ordinalAbsorvido.set(existing, o);
        }
        const oldPri = SOURCE_PRIORITY[existing.source] ?? 1;
        const newPri = SOURCE_PRIORITY[p.source] ?? 1;
        // `stimulus` viaja como metadado: só iguais ou nulos chegam aqui (o
        // portão acima recusa declarados diferentes), então preencher o nulo
        // com a marca do outro lado nunca inventa — só propaga o declarado.
        const META = ["sample_size", "margin_of_error", "tse_registration", "contractor", "fieldwork_start", "stimulus"];
        // SOURCE PRIORITY DECIDES METADATA — NEVER THE RESULT TABLE.
        //
        // The winning source used to replace the record wholesale, results
        // included. An Acre senate poll reached us twice: Wikipedia with all 6
        // candidates (sum 200) and Poder360 with 3 (sum 21). Poder360 outranks
        // Wikipedia, so the 3-row fragment overwrote the complete table and the
        // poll then failed the sum guard and vanished from the averages
        // entirely. Priority settles who is authoritative about the sample size
        // or the registration; it says nothing about who published more rows.
        //
        // A REGRA MUDOU DE CASA, NÃO DE COMPORTAMENTO. `richerRoster` vive em
        // `lib/roster.mjs` porque a retenção de elenco entre RODADAS responde à
        // mesmíssima pergunta que este trecho responde entre FONTES, e com o
        // mesmo desfecho se for respondida errado — a tabela completa
        // sobrescrita por um fragmento. Duas cópias divergiriam na primeira
        // correção feita de um lado só (CONVENTIONS §5).
        const RESULTS = ["results", "others_pct", "blank_null_pct", "undecided_pct"];
        if (newPri > oldPri) {
          const keep = { ...p };
          for (const f of META) if (keep[f] == null && existing[f] != null) keep[f] = existing[f];
          if (doaTabela(existing, p)) for (const f of RESULTS) keep[f] = existing[f];
          Object.assign(existing, keep);
        } else {
          for (const f of META) if (existing[f] == null && p[f] != null) existing[f] = p[f];
          if (doaTabela(p, existing)) for (const f of RESULTS) existing[f] = p[f];
        }
      } else {
        const copy = { ...p };
        const o = ordinalDeCenario(copy);
        if (o) ordinalAbsorvido.set(copy, o);
        bucket.push(copy);
        out.push(copy);
      }
    }
  }
  return out;
}

/**
 * Round-1 polls where an institute tested several line-ups arrive as several
 * rows (Wikipedia cenários). The per-race average must count each poll once:
 * keep the fullest roster per (pollster, race, state, date).
 *
 * ⚠ QUARTA DECISÃO DE EXISTÊNCIA DA MESMA FAMÍLIA (ver `veredictoDeSoma`):
 * "mais cheio" podia eleger um fragmento que reprova na soma — e no empate de
 * tamanho ficava o PRIMEIRO da lista, que é o nativo, nunca a curada que
 * `applyRepairs` acabou de acrescentar no fim. Uma curada de elenco igual ao
 * do fragmento morto perderia aqui e a pesquisa fechava a rodada ZERADA, o
 * mesmo desfecho do caso presidente:RO do ensaio de 20/08/2026, uma decisão
 * adiante. Quem sobrevive ao guarda vence quem não sobrevive; o tamanho segue
 * decidindo entre iguais. `sobrevive` e `estimuloCompativel` são parâmetros
 * pelo mesmo motivo dos de `mergePolls`: a mutação honesta do autoteste. O
 * coletor nunca os passa.
 *
 * ⚠ ESPONTÂNEA E ESTIMULADA DECLARADAS NÃO COMPETEM AQUI. "Mais cheio" é
 * desempate entre ELENCOS ALTERNATIVOS da mesma pergunta; espontânea ×
 * estimulada são perguntas diferentes postas à mesma amostra, e sem esta
 * cláusula a recusa de fusão de `mergePolls` seria desfeita uma decisão
 * adiante — a estimulada (via de regra a tabela mais cheia) engoliria a
 * espontânea aqui, o mesmo desfecho do caso IRG por outra porta. Fragmento
 * sem marca declarada segue competindo com tudo (§4), que é o comportamento
 * de sempre.
 */
export function keepFullestRound1(polls, {
  sobrevive = sobreviveAoGuardaDeSoma,
  estimuloCompativel = estimulosCompativeis,
} = {}) {
  const best = new Map(); // chave → sobreviventes (no máximo um por estímulo declarado)
  const rest = [];
  // O ORDINAL QUE CADA SLOT JÁ ABSORVEU, fora do objeto — mesma mecânica e
  // mesmo motivo do `ordinalAbsorvido` de `mergePolls` (ver ali). Um SLOT de
  // rótulo SEM ordinal ("1º turno") tem `ordinalDeCenario` null, e sem esta
  // trava o `cenariosCompativeis(null, …)` o deixava compatível com TODO
  // cenário declarado: um único registro sem ordinal — quando é a tabela mais
  // cheia — reabsorvia cenário 1/2 E 2/2 no funil, e o candidato exclusivo do
  // cenário engolido sumia da disputa inteira. Medido: governador:AL 08/12,
  // topline sem ordinal do Poder360 [Renan, JHC] × Wikipédia cenário 1/2 e 2/2
  // — quando `JHC` volta a ser coletado (o outro conserto desta leva), o
  // topline vira o mais cheio, imanta os dois cenários e **Alfredo Gaspar**
  // (só no cenário 2/2) desaparece. Travado no PRIMEIRO ordinal declarado que o
  // slot absorve, o slot deixa de ser ímã do cenário seguinte — exatamente o
  // conserto da fusão em cadeia de `mergePolls`, uma decisão atrás, que o funil
  // desfazia. Ordinal null dos DOIS lados segue competindo (comportamento de
  // sempre: sem nenhum ordinal declarado, o tamanho decide).
  const ordinalTravado = new Map();
  const efetivo = (obj) => ordinalTravado.get(obj) ?? ordinalDeCenario(obj);
  const travar = (obj, o) => { if (o) ordinalTravado.set(obj, o); };
  for (const p of polls) {
    if (p.round !== 1) {
      rest.push(p);
      continue;
    }
    const k = `${bucketKey(p)}:${pollDate(p) ?? "?"}`;
    if (!best.has(k)) {
      best.set(k, [p]);
      travar(p, ordinalDeCenario(p));
      continue;
    }
    const grupo = best.get(k);
    // Cenários com ORDINAL DECLARADO distinto ("cenário 1/3" × "2/3") NÃO
    // competem aqui, pelo mesmo motivo de `mergePolls` (cenariosCompativeis):
    // são elencos alternativos postos à mesma amostra, perguntas distintas —
    // sem esta cláusula, keepFullestRound1 colapsava-os no mais cheio uma
    // decisão adiante (medido: presidente:PA da Onda 2, cen1/2/3 → 1). O ordinal
    // EFETIVO do slot é o que ele já travou, não só o do próprio rótulo: é isso
    // que impede o slot sem ordinal de imantar o segundo cenário declarado.
    const i = grupo.findIndex((cur) =>
      estimuloCompativel(cur.stimulus ?? null, p.stimulus ?? null) &&
      cenariosCompativeis(efetivo(cur), ordinalDeCenario(p)));
    if (i === -1) {
      grupo.push(p);
      travar(p, ordinalDeCenario(p));
      continue;
    }
    const cur = grupo[i];
    // O ordinal a que este slot fica preso na absorção: o que ele já tinha
    // travado, ou — primeira absorção de um lado declarado — o primeiro ordinal
    // declarado entre os dois. Calculado ANTES do swap, porque o vencedor herda
    // a trava (o objeto no slot muda, a restrição não).
    const oTravado = efetivo(cur) ?? ordinalDeCenario(p);
    const vp = sobrevive(p);
    let vencedor = cur;
    if (vp !== sobrevive(cur)) {
      if (vp) vencedor = p;
    } else if (p.results.length > cur.results.length) {
      vencedor = p;
    }
    grupo[i] = vencedor;
    ordinalTravado.delete(cur);
    travar(vencedor, oTravado);
  }
  return [...rest, ...[...best.values()].flat()];
}

/**
 * Backstop against institute aliases no clustering can discover ("Data Index"
 * ≡ "Indexa"): two polls in the same contest, ≤3 days apart, whose rosters
 * match with IDENTICAL percentages (and compatible sample sizes) are the same
 * poll published under two brandings. Keep the higher-priority source's copy.
 */
export function dropExactDuplicates(polls, { sobrevive = sobreviveAoGuardaDeSoma } = {}) {
  // `sobrevive` é parâmetro pelo mesmo motivo do de `mergePolls`: a mutação
  // honesta do autoteste. O coletor nunca o passa.
  const groups = new Map();
  for (const p of polls) {
    const k = `${p.race}:${p.state ?? "BR"}:${p.round}`;
    if (!groups.has(k)) groups.set(k, []);
    groups.get(k).push(p);
  }
  const dropped = new Set();
  for (const group of groups.values()) {
    group.sort((a, b) => (pollDate(a) ?? "").localeCompare(pollDate(b) ?? ""));
    for (let i = 0; i < group.length; i++) {
      if (dropped.has(group[i])) continue;
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        if (dropped.has(b)) continue;
        const da = pollDate(a);
        const db = pollDate(b);
        if (da && db && +new Date(db) - +new Date(da) > JANELA_OPERACAO_MS) break;
        if (a.pollster === b.pollster) continue; // same institute handled upstream
        if (a.sample_size && b.sample_size && a.sample_size !== b.sample_size) continue;
        const small = a.results.length <= b.results.length ? a : b;
        const large = small === a ? b : a;
        let matched = 0;
        let identical = 0;
        for (const r of small.results) {
          const s = large.results.find((x) => sameCandidate(r.candidate, x.candidate));
          if (s) {
            matched++;
            if (Math.abs(s.pct - r.pct) <= 0.05) identical++;
          }
        }
        // With only 2 matched candidates (runoff toplines) two institutes can
        // coincide legitimately — demand exact same date AND same sample size.
        const strongEnough =
          matched >= 3 ||
          (matched === 2 && da && da === db && a.sample_size && a.sample_size === b.sample_size);
        if (matched / small.results.length >= 0.9 && identical === matched && strongEnough) {
          // A PRIORIDADE SÓ DESEMPATA ENTRE REGISTROS QUE SOBREVIVEM AO GUARDA
          // DE SOMA. Escolher por prioridade cega manteve, no ensaio de
          // 20/08/2026, o nativo "Direito ao Ponto" (soma 21) contra a curada
          // "Direto ao Ponto Pesquisas" da MESMA pesquisa — o vencedor morreu
          // no guarda logo depois e presidente:AM fechou a coleta ZERADA.
          // Quando exatamente um dos dois sobrevive, ele fica, qualquer que
          // seja a fonte; prioridade decide o resto, como sempre.
          const va = sobrevive(a);
          const soUmVive = va !== sobrevive(b);
          const loser = soUmVive
            ? (va ? b : a)
            : (SOURCE_PRIORITY[a.source] ?? 1) >= (SOURCE_PRIORITY[b.source] ?? 1) ? b : a;
          dropped.add(loser);
          console.warn(`duplicata entre marcas: ${a.pollster} ≡ ${b.pollster} (${a.race}/${a.state ?? "BR"} ${da ?? "?"}) — ` +
            (soUmVive ? "mantida a que sobrevive ao guarda de soma" : "mantida a de maior prioridade"));
        }
      }
    }
  }
  return polls.filter((p) => !dropped.has(p));
}

/** Assinatura do ELENCO — os nomes (já canônicos neste ponto do pipeline)
 * normalizados e ordenados. Dois elencos genuinamente diferentes dão
 * assinaturas diferentes; o mesmo elenco com grafias que a canonicalização já
 * uniu dá a mesma. É o que separa uma COLISÃO DE RÓTULO de uma duplicata real. */
function rosterSig(p) {
  return (p.results ?? [])
    .map((r) => normNome(r.candidate))
    .sort()
    .join("~");
}

/**
 * DESAMBIGUAÇÃO DE `id` NA COLISÃO — e SÓ na colisão (§1: o id fica ESTÁVEL para
 * toda pesquisa que não colide).
 *
 * `pollId` chaveia por (instituto, disputa, UF, turno, data, CENÁRIO) e IGNORA
 * o elenco. Quando a fonte emite dois cenários do mesmo dia com o MESMO rótulo
 * mas ELENCOS diferentes — um 2º turno rotulado errado, medido uma vez em
 * governador:MG 29/07/2026, ambos "2º turno: Cleitinho e Alexandre Kalil" mas um
 * com [Cleitinho, Patrus Ananias] — os dois recebem o MESMO id. Eles não fundem
 * (`rostersMatch` 0.5 < 0.6), não são duplicata exata (elencos distintos), e
 * chegam ao `validate`, que ABORTA o dataset inteiro num id repetido — CONGELANDO
 * toda a ingestão até alguém corrigir o rótulo lá na fonte.
 *
 * Aqui, quando dois ids colidem e os ELENCOS diferem, um discriminador do elenco
 * (4 hex do `rosterSig`) é anexado ao id de cada um do grupo, tornando-os
 * distintos de forma determinística e independente da ordem. Como não há traço
 * em nenhum `pollId` legítimo, o sufixo vive num espaço de nome limpo e não
 * colide com id de p360/curada. Pesquisas com id ÚNICO nunca são tocadas — logo,
 * numa rodada sem colisão, o store sai byte a byte idêntico. Dois ids colididos
 * com o MESMO elenco (duplicata de fato) recebem o mesmo sufixo e continuam
 * iguais — é o `dedupeById` (backstop) que os resolve com drop-and-warn.
 */
export function disambiguateCollidingIds(polls) {
  const byId = new Map();
  for (const p of polls) {
    if (!p.id) continue;
    if (!byId.has(p.id)) byId.set(p.id, []);
    byId.get(p.id).push(p);
  }
  for (const group of byId.values()) {
    if (group.length < 2) continue;
    if (new Set(group.map(rosterSig)).size < 2) continue; // mesmo elenco → não é colisão de rótulo
    for (const p of group) {
      const disc = crypto.createHash("sha1").update(rosterSig(p)).digest("hex").slice(0, 4);
      const novo = `${p.id}-${disc}`;
      console.warn(
        `id em colisão desambiguado por elenco: ${p.pollster} ${p.race}/${p.state ?? "BR"} ` +
        `${pollDate(p) ?? "?"} "${p.scenario ?? ""}" (${p.results.length} nome(s)) — ${p.id} → ${novo}`,
      );
      p.id = novo;
    }
  }
  return polls;
}

/**
 * Quais pesquisas JÁ GRAVADAS pertencem a uma fonte, quando essa fonte falha.
 *
 * ⚠ ISTO ERA `p.source === name` E, PARA A WIKIPÉDIA, NÃO CASAVA COM NADA.
 *
 * `polls.json` é PROJEÇÃO do store, e `project.mjs` tira o `source` do primeiro
 * `source_ref` do LEVANTAMENTO. Uma pesquisa da Wikipédia não tem id nativo,
 * então `upsertPoll` não cria `source_ref` nenhum para ela: o levantamento só
 * dela projeta `source: null`, e a pergunta dela pendurada num levantamento que
 * também tem registro do Poder360 projeta `source: "poder360"`. Medido no banco:
 * a projeção emite `null` (1.039) e `poder360` (1.933) e **nunca** `wikipedia`.
 *
 * Ou seja: o ramo de recuperação da Wikipédia ERA CÓDIGO MORTO. Numa falha de
 * coleta ele guardava ZERO linhas e a mensagem dizia "mantendo dados anteriores
 * desta fonte" enquanto apagava tudo o que era dela.
 *
 * O piso de `minQuestions` do validador chegou a ser a rede que segurava isso,
 * mas nunca foi proteção: a margem dele é a diferença entre o tamanho do banco
 * e o piso, e as duas pontas se movem a cada coleta — quando a soma cruzar, ele
 * para de pegar e a exclusão fica silenciosa, sem nada mudar de lugar. Não se
 * escreve o número dele aqui de propósito: número de banco envelhece dentro do
 * comentário e a próxima pessoa mede a folga errada. Quem quiser a folga de um
 * dia, MEÇA — o valor do dia em que isto foi escrito está no corpo do commit.
 *
 * A proteção que vale é a de baixo, e é por isso que ela existe:
 *
 * Então a pertinência passa a ser pelo ESPAÇO DE ID, que a projeção preserva:
 * o Poder360 cunha `p360-…` em `poder360.mjs`, a inserção curada cunha
 * `curado-…`, e o que sobra é da Wikipédia. Curadas ficam de fora porque
 * `applyRepairs` as reinsere toda rodada — mantê-las aqui as duplicaria.
 */
export const PERTENCE_A_FONTE = {
  poder360: (p) => typeof p.id === "string" && p.id.startsWith("p360-"),
  wikipedia: (p) => typeof p.id === "string" && !p.id.startsWith("p360-") && !p.id.startsWith("curado-"),
};

/**
 * O REGISTRO DE SIGLAS QUE O BANCO RECONHECE COMO PARTIDO.
 *
 * Repo-native e dirigido a dado, as duas fontes de verdade que o repositório já
 * mantém: as siglas com CANDIDATURA no registro do TSE
 * (`data/candidaturas.ndjson`) e os rótulos que `lib/parties.mjs` canoniza —
 * vivos (`CANONICAL_LABELS`), extintos (`DEFUNCT`) e não-fundidos
 * (`NOT_MERGED`), porque uma sigla extinta ainda aparece numa tabela de
 * preferência. É a metade "isto É um partido" do teste de artefato; a outra
 * metade (não ser candidatura) é `nomesDeUrnaPorDisputa`. Fora deste conjunto
 * nenhum token é apagado por ser "sigla-forma" — o custo seguro do §4.
 */
export function siglasDePartidoConhecidas({ cands = lerCandidaturas() } = {}) {
  const set = new Set();
  for (const c of cands) if (c.partido) set.add(normNome(c.partido));
  for (const s of [...CANONICAL_LABELS, ...NOT_MERGED, ...Object.keys(DEFUNCT)]) set.add(normNome(s));
  return set;
}

/**
 * NOME DE URNA → DISPUTA: o domínio que PROVA que um token é candidato, não
 * sigla. Lê o mesmo registro colapsado de `agruparPorDisputa` (uma linha por
 * candidatura real) e devolve, por `race:UF`, o conjunto de nomes de urna
 * normalizados. É o portão que isenta "JHC" em governador:AL — sigla-forma, mas
 * candidatura registrada — sem citar nenhum nome no código.
 */
export function nomesDeUrnaPorDisputa({ cands = lerCandidaturas() } = {}) {
  const porDisputa = new Map();
  for (const [contest, lista] of agruparPorDisputa(cands)) {
    porDisputa.set(contest, new Set(lista.map((c) => normNome(c.nome_urna_raw))));
  }
  return porDisputa;
}

async function runSource(name, fn, previous) {
  try {
    const r = await fn();
    console.log(`✓ ${name}: ${r.polls?.length ?? r.count ?? 0} registro(s)`);
    return { ok: true, ...r };
  } catch (e) {
    const pertence = PERTENCE_A_FONTE[name] ?? ((p) => p.source === name);
    const kept = (previous.polls ?? []).filter(pertence);

    // UMA RECUPERAÇÃO QUE NÃO RECUPERA NADA TEM DE GRITAR, NÃO SEGUIR.
    //
    // O defeito acima passou despercebido porque a mensagem de sucesso era
    // impressa mesmo guardando zero. Se havia banco anterior e a recuperação
    // volta vazia, o predicado desta fonte está errado — e seguir publica um
    // conjunto truncado. Abortar deixa `data/` intacto, que é o lado seguro.
    if ((previous.polls ?? []).length && !kept.length) {
      throw new Error(
        `${name} falhou (${e.message}) E a recuperação do banco anterior voltou VAZIA ` +
        `de ${previous.polls.length} pesquisas — o predicado de pertinência desta fonte não casa mais. ` +
        `Abortando em vez de publicar sem os dados dela.`,
      );
    }

    console.error(`✗ ${name} FALHOU: ${e.message} — mantendo ${kept.length} pesquisa(s) anterior(es) desta fonte`);
    return { ok: false, polls: kept, url: null, error: String(e.message) };
  }
}

async function main() {
  const copiados = prepararEnsaio({ emEnsaio: EM_ENSAIO, banco: BANCO, destino: DESTINO });
  if (EM_ENSAIO) console.log(`ENSAIO: nada será escrito em data/. Destino: ${DESTINO} (${copiados.length} arquivo(s) do banco copiados como ANTERIOR)`);
  const previous = loadPrevious();
  const now = new Date().toISOString();

  const [poder, wiki, tse] = await Promise.all([
    runSource("poder360", fetchPoder360, previous),
    runSource("wikipedia", fetchWikipedia, previous),
    (async () => {
      try {
        const r = await fetchTseRegistry();
        console.log(`✓ tse: ${r.count} pesquisas registradas`);
        return { ok: true, ...r };
      } catch (e) {
        console.error(`✗ tse FALHOU: ${e.message} — enriquecimento pulado`);
        return { ok: false, records: [] };
      }
    })(),
  ]);

  // Unify institute names BEFORE merging so "Quaest" and "Genial/Quaest"
  // land in the same dedupe bucket.
  const allRaw = [...(poder.polls ?? []), ...(wiki.polls ?? [])];
  canonicalizePollsters(allRaw);
  let polls = mergePolls([
    allRaw.filter((p) => p.source === "poder360"),
    allRaw.filter((p) => p.source !== "poder360"),
  ]);

  // Curated repairs from primary sources, replayed every run (data/repairs.json).
  const rep = applyRepairs(polls);
  console.log(`✓ reparos curados aplicados: ${rep.applied}`);
  // A PESQUISA INSERIDA TEM DE APARECER NA SAÍDA DA RODADA, nomeada, pelo mesmo
  // motivo da `RE-CUNHAGEM` e do `ELENCO RETIDO` mais abaixo: cada linha aqui é
  // uma disputa que o `v2/cenarios` do Poder360 apagou POR INTEIRO (41 medidas
  // em 17/08/2026), de modo que nenhum reparo de correção a alcançava — a
  // pesquisa nem chegava à lista. O dia em que uma delas parar de ser impressa é
  // o dia em que a fonte sarou OU em que a inserção quebrou, e as duas coisas
  // precisam ser vistas. Ver `add_poll` em `scripts/lib/repairs.mjs`.
  for (const i of rep.inserted ?? []) console.log(`  PESQUISA INSERIDA (curada): ${i}`);
  // O ESPELHO DA LINHA ACIMA: cada registro que um `drop_poll` removeu é um que
  // a fonte SERVE e a rodada decidiu não publicar (o caso que motivou a ação: a
  // governador:SP costurada de três cenários — ver `gatearPesquisaCurada` em
  // `scripts/lib/repairs.mjs`). Remoção silenciosa seria indistinguível de
  // perda de coleta, e é exatamente a classe de sumiço que o guarda de delta
  // existe para acusar.
  for (const d of rep.dropped ?? []) console.log(`  PESQUISA GATEADA (curada): ${d}`);
  for (const u of rep.unmatched) console.warn(`AVISO: reparo sem pesquisa correspondente — ${u}`);
  // A repair that matches a poll and then corrects nothing is either stale or
  // its source has healed. Both are worth a line: without one, the only trace
  // of a dead repair is the absence of a number nobody counts.
  for (const n of rep.noop ?? []) console.warn(`AVISO: reparo sem efeito — ${n}`);
  for (const w of rep.warnings) console.warn(`AVISO: ${w}`);

  // Candidate-name hygiene (before entity resolution):
  //  - strip Wikipedia disambiguators: "Vera Lúcia (política)" → "Vera Lúcia"
  //  - drop rows that are parties, not people ("Partido Comunista Brasileiro",
  //    "Unidade Popular"), and table artifacts ("Cen.")
  // No real candidate's name starts with "não" — those are abstention rows.
  const JUNK = /^(partido\b|unidade popular\b|federa[çc][ãa]o\b|cen\.?$|outros?\b|nenhum\b|n[ãa]o\b)/i;
  // ANCHORED PATTERNS ONLY CATCH RESPONSE OPTIONS THAT LEAD WITH THE GIVEAWAY
  // WORD. "Poderia votar em todos" leads with none of the above, so it entered
  // the database as a candidate in the Ceará governor race, at 13,3%, pushing
  // that poll's roster to 110,4%. Hence a second, unanchored pattern — the tell
  // can sit anywhere in the phrase.
  //
  // IT MATCHES ONLY ON WORDS A PERSON'S NAME CANNOT CONTAIN: a conjugated form
  // of "votar", or an indecision word. It deliberately does NOT match `branco`
  // or `nulo`. The first draft did, unanchored, and would have silently deleted
  // **Castelo Branco** — a real surname, and a Piauí political family, in a
  // state this dataset covers heavily. That failure mode is worse than the bug
  // it fixes: no error fires, the candidate simply never appears, and the only
  // symptom is a roster that quietly sums low. A filter that removes rows must
  // be provably narrower than the thing it targets, so the bucket words that
  // double as surnames are left to the anchored `JUNK` rule above.
  const JUNK_PHRASE = /\b(votar|votaria|votariam|votarem|voto|votos)\b|indecis|indiferen|absten[çc]|abstenc/i;
  // Party-preference tables on state pages leak rows where the "candidate" is
  // a party. Full party names + bare acronyms are not people.
  const PARTY_NAMES = new Set([
    "movimento democratico brasileiro", "uniao brasil", "republicanos",
    "progressistas", "partido liberal", "partido dos trabalhadores",
    "partido verde", "rede sustentabilidade", "cidadania", "podemos",
    "avante", "solidariedade", "novo", "missao", "mobiliza", "agir",
    "democracia crista", "partido social democratico",
  ]);
  const normName = (s) => normNome(s);
  // A SIGLA SÓ É ARTEFATO SE FOR PARTIDO CONHECIDO **E** NÃO FOR CANDIDATURA.
  //
  // O teto de antes — `/^[A-Z]{2,6}…$/`, "qualquer token de 2 a 6 maiúsculas é
  // sigla" — não distinguia partido de NOME DE URNA em caixa alta: apagava de
  // fonte crua "JHC" (João Henrique Caldas, nome de urna oficial do candidato a
  // governador de AL no registro do TSE) e "CIRO" junto com um "PT" de linha de
  // preferência. O candidato sumia da média daquela disputa (o defeito irmão do
  // caso curado da LULA que o PR #53 isentou — mas para a LINHA COLETADA, que o
  // #53 não alcançou). O conserto do #53 (isenção de `add_poll`) fica intacto
  // abaixo; este fecha a CLASSE para a linha de fonte.
  //
  // O teste agora tem as duas metades, e nenhuma sozinha:
  //   · PARTIDO CONHECIDO — a sigla existe no registro (siglas com candidatura
  //     no TSE) ou entre os rótulos que `lib/parties.mjs` canoniza (vivos,
  //     extintos, não-fundidos). Não "toda sigla curta": só as que o banco
  //     reconhece como partido. Uma sigla de partido sem candidatura e
  //     desconhecida de `parties.mjs` PASSA — o custo seguro é deixar uma linha
  //     de sigla rara, nunca apagar uma pessoa.
  //   · NÃO É CANDIDATURA — o nome de urna não está no registro do TSE desta
  //     disputa (`race:UF`). É o portão que salva "JHC": ele é sigla-forma, mas
  //     é candidatura registrada em governador:AL, então é pessoa. Bare "PT"
  //     numa disputa onde ninguém tem nome de urna "PT" segue caindo.
  const SIGLAS_CONHECIDAS = siglasDePartidoConhecidas();
  const URNAS_POR_DISPUTA = nomesDeUrnaPorDisputa();
  const isPartyRow = (r, contest) => {
    const nome = normName(r.candidate);
    if (!nome) return false;
    if (URNAS_POR_DISPUTA.get(contest)?.has(nome)) return false; // candidatura registrada = pessoa
    return PARTY_NAMES.has(nome) || SIGLAS_CONHECIDAS.has(nome);
  };
  // ⚠ A LIMPEZA DE ARTEFATO DE FONTE NÃO TOCA PESQUISA CURADA (`add_poll`).
  //
  // Este filtro existe para o LIXO QUE AS FONTES DERRAMAM — linha de partido nas
  // tabelas de preferência da Wikipédia, "Poderia votar em todos" do Ceará,
  // opção de abstenção. Uma pesquisa curada não vem de fonte: é transcrita à mão
  // do PDF do instituto por leitura cega dupla e conferida por `expect_sum`
  // (repairs.mjs), então não há artefato de fonte nela para limpar — e passá-la
  // por aqui só DESTRÓI dado verificado. Era o que acontecia: as íntegras que
  // imprimem o elenco em CAIXA ALTA (Instituto França/SE, Vetor3/PI, Instituto
  // Perfil/RN) traziam "LULA", e o teste de sigla de partido — qualquer token de
  // 2 a 6 maiúsculas — o confundia com um partido e apagava a linha do LÍDER. A
  // pesquisa caía a 9 linhas (soma ~47,5), a completude a marcava INCOMPLETA
  // (< 90) e ela ficava fora da média de 1º turno: presidente:SE fechava com 2
  // pesquisas averageáveis e ia ao cinza. `inserted` (o carimbo de add_poll,
  // repairs.mjs) é exatamente "esta pesquisa não veio de fonte", então é ele que
  // isenta. O elenco cru da fonte segue passando pelo filtro como antes — este
  // conserto não mexe em nenhuma linha coletada.
  for (const p of polls) {
    const curada = p.repaired?.inserted === true;
    const contest = contestOf(p.race, p.state);
    p.results = p.results
      .map((r) => ({ ...r, candidate: r.candidate.replace(/\s*\([^)]*\)\s*/g, " ").replace(/\s+/g, " ").trim() }))
      .filter((r) => r.candidate &&
        (curada || (!JUNK.test(r.candidate) && !JUNK_PHRASE.test(r.candidate) && !isPartyRow(r, contest))));
  }
  polls = polls.filter((p) => p.results.length > 0);

  polls = keepFullestRound1(polls);
  polls = canonicalizeParties(polls);

  // THE RAW NAMES, SAVED BEFORE WE TOUCH THEM.
  //
  // `match-ballot-names.mjs` has to compare what the institute published against
  // the TSE register, and after this next line that string no longer exists
  // anywhere: `polls.json` holds the canonical name and even the store's
  // `name_raw` is written post-canonicalisation. Re-running the matcher without
  // this therefore SHRINKS its own table — "Romeu Zema" stops being in the input
  // the moment it has been renamed to "Zema" — and any accent restored on the
  // first pass is lost on the second. Same defect `candidate-resolve.mjs`
  // records hitting twice: a generator that reads its own output.
  // THE PARTY TRAVELS WITH THE NAME (criador, 2026-08-16).
  //
  // The name alone could not separate two real people. `Álvaro Dias` polled for
  // the SENATE IN PARANÁ as MDB was folded into `Álvaro Costa Dias`, the PL
  // candidate for GOVERNOR OF RIO GRANDE DO NORTE — identical ballot names, so
  // no token rule can reach it, and 24 poll rows took the wrong registration.
  // The party says MDB × PL and settles it in one comparison.
  //
  // The state comes free from the contest key (`race:UF`) and is the other half:
  // it is what tells `senador:PR` from `governador:RN`, and equally what
  // CONFIRMS `Carlos Brandão` — polled for the senate in Maranhão, registered
  // for governor of Maranhão, the incumbent moving between offices in his own
  // state.
  //
  // Stored as an object per name rather than a bare string. `match-ballot-names`
  // still accepts the old string form, because this file is build output that a
  // clone will not have until the first scrape.
  const crus = {};
  for (const p of polls) {
    const k = `${p.race}:${p.state ?? "BR"}`;
    const porNome = (crus[k] ??= new Map());
    for (const r of p.results) {
      if (!porNome.has(r.candidate)) porNome.set(r.candidate, new Set());
      // `party_raw` is what the source said; the canonical label is derived and
      // would hide a genuine disagreement between two institutes.
      if (r.party_raw ?? r.party) porNome.get(r.candidate).add(r.party_raw ?? r.party);
    }
  }
  fs.writeFileSync(
    path.join(DESTINO, "nomes-crus.json"),
    JSON.stringify(
      Object.fromEntries(Object.entries(crus).map(([k, m]) => [
        k,
        [...m.entries()]
          .sort((a, b) => a[0].localeCompare(b[0], "pt-BR"))
          .map(([nome, partidos]) => ({ nome, partidos: [...partidos].sort() })),
      ])),
      null, 1) + "\n",
  );

  // A GRAFIA PUBLICADA, PRESA À LINHA ANTES DE QUALQUER REGRA NOSSA TOCAR NELA.
  //
  // `canonicalizeCandidates` reescreve `r.candidate` no lugar. Depois desta
  // linha, a grafia que o instituto publicou não existe em lugar nenhum da
  // memória — e o store, que roda 90 linhas abaixo, gravava `name_raw:
  // r.candidate` achando que era o nome cru. Não era: era a saída da regra da
  // grafia mais curta. Medido: 11.536 linhas de resultado, e exatamente UM
  // `name_raw` distinto por `candidate_id`. Um campo chamado "raw" que só
  // guarda o nome já normalizado não é um campo inútil, é um campo que MENTE —
  // e a camada de pessoas foi construída em cima dele, semeando identidade com
  // a própria regra de que a identidade deveria se desacoplar.
  //
  // `nomes-crus.json`, gravado logo acima, guarda o mesmo conjunto de grafias
  // por disputa — mas como CONJUNTO, sem dizer qual linha de qual pesquisa
  // trouxe cada uma. Para semear identidade é preciso a grafia DAQUELA linha.
  for (const p of polls) {
    for (const r of p.results ?? []) r.candidate_raw = r.candidate;
  }

  polls = canonicalizeCandidates(polls);
  polls = dropExactDuplicates(polls);

  // Null future dates (upstream typos like "2026-08-29" published on Aug 12):
  // a future anchor would corrupt every rolling-average window.
  const maxDate = new Date(Date.now() + 2 * 86_400_000).toISOString().slice(0, 10);
  for (const p of polls) {
    for (const f of ["fieldwork_start", "fieldwork_end", "published_date"]) {
      if (p[f] && p[f] > maxDate) {
        console.warn(`data futura anulada: ${p.pollster} ${p.race}/${p.state ?? "BR"} ${f}=${p[f]}`);
        p[f] = null;
      }
    }
  }

  // A start after the end is either a source typo ("22 a 18 de julho") or a
  // bad merge of one source's start with another's end. The end date is what
  // every average uses, so keep it and drop the start.
  for (const p of polls) {
    if (p.fieldwork_start && p.fieldwork_end && p.fieldwork_start > p.fieldwork_end) {
      console.warn(`início posterior ao fim: ${p.pollster} ${p.race}/${p.state ?? "BR"} ${p.fieldwork_start}>${p.fieldwork_end} — início descartado`);
      p.fieldwork_start = null;
    }
  }

  // Drop individually broken polls (over-cap sums, malformed results) with a
  // log line instead of failing the whole run; the strict validator remains
  // the final gate on what's left. O veredicto mora em `lib/soma.mjs` (§5)
  // porque as decisões de existência acima — dedupe, doação de tabela,
  // dispensa de add_poll — passaram a consultá-lo ANTES de este filtro rodar:
  // preferir aqui um registro que morre ali era perder a pesquisa inteira
  // (ensaio de 20/08/2026, presidente:AM e presidente:RO).
  const before = polls.length;
  polls = polls.filter((p) => {
    const v = veredictoDeSoma(p);
    if (!v.ok) {
      console.warn(`descartada: ${p.pollster} ${p.race}/${p.state ?? "BR"} ${p.fieldwork_end ?? "?"} — ${v.motivo}`);
      return false;
    }
    return true;
  });
  if (before !== polls.length) console.warn(`descartadas ${before - polls.length} pesquisa(s) inválida(s) de ${before}`);

  // Enrich with TSE registry: fill registration/sample where we can match on
  // (pollster-ish name, uf) and the poll lacks it. Conservative: only when
  // the poll already has a registration string do we trust joins beyond that.
  const tseByProto = new Map((tse.records ?? []).map((r) => [r.protocolo, r]));
  for (const p of polls) {
    if (p.tse_registration && tseByProto.has(p.tse_registration)) {
      const reg = tseByProto.get(p.tse_registration);
      if (!p.sample_size && reg.sample) p.sample_size = reg.sample;
      if (!p.contractor && reg.pollster) p.contractor = p.contractor ?? null;
    }
  }

  // RESILIÊNCIA A `id` COLIDIDO (§1 + §4): duas defesas em série para que um
  // único cenário mal-rotulado NUNCA congele a rodada. Primeiro a desambiguação
  // por elenco separa cenários do mesmo dia rotulados igual com elencos
  // diferentes (o id passa a distingui-los, e a distinção viaja ao store via
  // `legacy_id`, que a projeção usa como id do polls.json derivado). Depois o
  // drop-and-warn colhe qualquer duplicata de fato que reste, mantendo a mais
  // completa/antiga — de modo que o `validate` abaixo julga um conjunto sem id
  // repetido em vez de abortar nele. Sem colisão, ambos são no-op e o store sai
  // byte a byte idêntico.
  polls = disambiguateCollidingIds(polls);
  {
    const { polls: unicos, dropped } = dedupeById(polls);
    for (const d of dropped) {
      console.warn(
        `descartada por id duplicado (mantida a mais completa/antiga): ${d.pollster} ` +
        `${d.race}/${d.state ?? "BR"} ${pollDate(d) ?? "?"} "${d.scenario ?? ""}" — id ${d.id}`,
      );
    }
    polls = unicos;
  }

  polls.sort((a, b) =>
    (b.fieldwork_end ?? b.published_date ?? "").localeCompare(a.fieldwork_end ?? a.published_date ?? ""),
  );

  const prevSources = new Map((previous.sources ?? []).map((s) => [s.name, s]));
  const dataset = {
    generated_at: now,
    sources: [
      { name: "Poder360 — Agregador de Pesquisas", url: "https://www.poder360.com.br/agregador-de-pesquisas/", last_ok: poder.ok ? now : (prevSources.get("Poder360 — Agregador de Pesquisas")?.last_ok ?? null) },
      { name: "Wikipédia — páginas de pesquisas 2026", url: "https://pt.wikipedia.org", last_ok: wiki.ok ? now : (prevSources.get("Wikipédia — páginas de pesquisas 2026")?.last_ok ?? null) },
      { name: "TSE — Dados Abertos (PesqEle)", url: "https://dadosabertos.tse.jus.br/dataset/pesquisas-eleitorais-2026", last_ok: tse.ok ? now : (prevSources.get("TSE — Dados Abertos (PesqEle)")?.last_ok ?? null) },
    ],
    polls,
  };

  const { errors, warn } = validate(dataset, { minPolls: Math.min(50, Math.floor(previous.polls.length * 0.5) || 1) });
  for (const w of warn) console.warn(`WARN: ${w}`);
  if (errors.length) {
    for (const e of errors) console.error(`ERRO: ${e}`);
    console.error("Validação falhou — data/polls.json NÃO foi alterado.");
    process.exit(1);
  }

  const tmp = DATA + ".tmp";
  fs.writeFileSync(tmp, JSON.stringify(dataset, null, 1));
  fs.renameSync(tmp, DATA);
  console.log(`OK: ${polls.length} pesquisas gravadas em ${path.relative(ROOT, DATA)}`);

  persistStore(polls, dataset);
}

/**
 * FASE 3: o coletor passa a escrever o store pela ESCADA DE RESOLUÇÃO.
 *
 * Antes, `migrate-to-store.mjs` reconstruía o store a partir de polls.json
 * agrupando por uma chave (`reg:` → `p360:` → composto natural). Aquela chave
 * não conseguia unir o que a fonte separa: o Poder360 arquiva cada cargo de uma
 * mesma operação de campo como um registro nativo diferente, e a mesma pesquisa
 * chegando pela Wikipédia virava um segundo levantamento. `upsertPoll` decide
 * isso pelo que os dados dizem — id nativo, registro TSE, e então instituto +
 * UF + janela de ±3 dias — que é a decisão "uma operação de campo = um
 * levantamento" aplicada de fato.
 *
 * O STORE É RECONSTRUÍDO DO ZERO A CADA EXECUÇÃO, não acumulado. É o que
 * mantém a saída uma função pura da coleta: um registro que sumiu da fonte
 * some daqui, e reexecutar sobre a mesma entrada dá o mesmo arquivo byte a
 * byte. `priorStamps` preserva as datas de "primeira vez que vimos isto", que
 * são a única coisa que não pode ser rederivada da entrada.
 *
 * ORDEM IMPORTA: upsert é primeiro-escritor-vence, então a ingestão segue a
 * prioridade de fontes (poder360 → eleicaoemdados → wikipedia). Paralelizar
 * isso troca silenciosamente qual fonte ganha. Foi exatamente isso que manteve
 * corretos os números do 2º turno do RN: as linhas da AtlasIntel chegam
 * cruzadas pela Wikipédia e certas pelo Poder360, e é a ordem que descarta as
 * cruzadas — registrando a divergência em conflicts.ndjson em vez de escolher
 * em silêncio.
 */
function persistStore(polls, dataset) {
  const runDate = today();
  const { store, report } = buildStoreFromPolls(polls, {
    runDate,
    dir: DESTINO,
    meta: {
      generated_at: dataset.generated_at,
      sources: dataset.sources,
      written_by: "scrape.mjs/upsert",
      written_at: new Date().toISOString(),
    },
  });

  // O store só é gravado se passar no validador. Um coletor que grava primeiro
  // e valida depois deixa o banco quebrado no disco esperando alguém reparar.
  const { errors, warn, errorsTotal } = validateStore(store, { minSurveys: 500, minQuestions: 2000 });
  for (const w of warn.slice(0, 10)) console.warn(`AVISO: ${w}`);
  if (errorsTotal) {
    for (const e of errors.slice(0, 20)) console.error(`ERRO: ${e}`);
    // O TOTAL, não `errors.length`, que satura no teto de 60 do validador.
    console.error(`\nstore NÃO gravado: ${contagem(errorsTotal, Math.min(errors.length, 20))} de validação. data/polls.json já foi atualizado;`);
    console.error("rode o coletor de novo depois de corrigir, ou reconstrua o store a partir dele.");
    process.exit(1);
  }

  const counts = writeStore(store, { dir: DESTINO });
  console.log(`store gravado pela escada: ${counts.surveys} levantamentos · ${counts.questions} perguntas · ` +
    `${counts.institutes} institutos · ${counts.people} pessoas · ${counts.candidates} candidatos · ` +
    `${counts.conflicts} conflitos`);
  // A RE-CUNHAGEM DE ID TEM DE APARECER NA SAÍDA DA RODADA.
  //
  // Numa rodada normal isto é zero. Diferente de zero significa que ids de
  // candidato mudaram de valor e o `first_seen` foi resgatado do id antigo —
  // que é o passo que NÃO foi dado em 16/08/2026, quando 1.164 levantamentos e
  // 2.961 perguntas perderam `created_at` sem uma linha de log dizendo nada.
  //
  // A PESSOA APARECE JUNTO. Ela podia se mover e não era contada nem traduzida:
  // uma pesquisa nova da fonte de topo escrevendo de outro jeito o nome de quem
  // não se registrou recunhava a pessoa, e o `first_seen` dela virava a data da
  // rodada sem uma linha de log — a mesma perda de 16/08, uma tabela acima.
  //
  // O INSTITUTO APARECE JUNTO, e era a última das três tabelas que se movia em
  // silêncio: `canonicalizePollsters` escolhe o nome atestado mais curto, o
  // `institute_id` sai do nome canônico, então uma coleta nova que mude a
  // atestação move o id. Foi o que apagou três dias de `first_seen` do
  // "Percent Brasil" → "Percent" em 17/08/2026 sem uma linha de log.
  const t = store._report.translated;
  if (t.candidates || t.orphanedCandidates || t.people || t.orphanedPeople ||
      t.institutes || t.orphanedInstitutes) {
    console.log(`  RE-CUNHAGEM: ${t.people} pessoa(s), ${t.candidates} candidato(s) e ` +
      `${t.institutes} instituto(s) com first_seen traduzido do id antigo (gravado em legacy_ids) · ` +
      `${t.orphanedPeople + t.orphanedCandidates + t.orphanedInstitutes} ` +
      `sem tradução, registrados em conflicts.ndjson`);
  }
  // O ELENCO RETIDO TEM DE APARECER NA SAÍDA DA RODADA, pelo mesmo motivo da
  // re-cunhagem acima: numa rodada em que a fonte está sã isto é zero, e
  // diferente de zero é o `v2/cenarios` apagando candidatos — o defeito que
  // suspendeu o agendamento em 17/08/2026. Sem esta linha, a única pista de que
  // o líder de uma presidencial nacional quase sumiu seria uma linha a mais em
  // `conflicts.ndjson`, num arquivo de 491. Ver `scripts/lib/roster.mjs`.
  const rel = store._report.retained;
  if (rel.questions || rel.refused || rel.ratified) {
    console.log(`  ELENCO RETIDO: ${rel.questions} pergunta(s) mantiveram o elenco da rodada anterior ` +
      `(${rel.results} linha(s) de candidato que a fonte descartou) · ${rel.refused} recusada(s) por ` +
      `ambiguidade · ${rel.ratified} encolhimento(s) ratificado(s) por reparo — tudo em conflicts.ndjson`);
  }
  console.log(`  resolução: ${JSON.stringify(report)}`);

  // A REJEIÇÃO — TABELA SEPARADA, projetada pelo MESMO DESTINO do store de voto.
  //
  // Estruturalmente isolada de `polls`: `loadRejection` lê a fonte curada
  // `data/rejection.json`, aplica a barra probatória de `add_rejection` e NUNCA
  // toca na lista de voto. A projeção vai para `<DESTINO>/rejection.ndjson` —
  // então sob `--ensaio` ela cai no diretório descartável, e `data/` fica
  // intocado, exatamente como o store de voto. Cada inserção é impressa nomeada,
  // espelhando `PESQUISA INSERIDA (curada)`: numa rodada sã é a lista das
  // rejeições curadas que compõem a tabela; o dia em que uma parar de aparecer é
  // o dia em que a fonte curada quebrou.
  const rej = loadRejection();
  for (const w of rej.warnings) console.warn(`AVISO (rejeição): ${w}`);
  const nRej = writeRejectionProjection(DESTINO, rej.rejections);
  console.log(`✓ rejeição projetada: ${nRej} pesquisa(s) em rejection.ndjson`);
  for (const p of rej.rejections) {
    console.log(`  REJEIÇÃO INSERIDA (curada): ${p.pollster} ${p.race}/${p.state ?? "BR"} ` +
      `campo ${p.fieldwork_end ?? "?"} — ${p.results.length} candidato(s), id ${p.id}`);
  }

  // O CALENDÁRIO — projeção do feed do TSE (PesqEle), tabela separada como a
  // rejeição. `tse.records` é o snapshot diário de TODA pesquisa registrada;
  // `writeCalendarProjection` deriva o status (agendada / já publicada) por diff
  // com `polls` e escreve `<DESTINO>/calendar.ndjson`. Se o feed do TSE falhou
  // nesta rodada, `tse.records` é vazio e a projeção sai vazia — sem inventar.
  const cal = writeCalendarProjection(DESTINO, tse.records ?? [], polls, today());
  console.log(`✓ calendário projetado: ${cal.count} registro(s) em calendar.ndjson ` +
    `(${cal.upcoming} agendada(s) · ${cal.released} já publicada(s))`);

  // O RELATÓRIO DO ENSAIO — o que esta coleta FARIA com o banco, e que a rodada
  // real não diz. `ELENCO RETIDO` acima só fala do que a retenção ALCANÇA;
  // pergunta que some inteira não aparece em lugar nenhum, e o piso do
  // validador tem 996 perguntas de folga (ver `lib/ensaio.mjs`).
  if (EM_ENSAIO) {
    const { linhas } = relatorioDeEnsaio(readStore({ dir: BANCO }), readStore({ dir: DESTINO }));
    console.log("");
    for (const l of linhas) console.log(l);
    console.log("");
    console.log(`ENSAIO CONCLUÍDO — data/ intocado. O que foi construído está em ${DESTINO}`);
    console.log("Nada foi decidido: religar o agendamento é decisão do criador (CONVENTIONS §12).");
  }
}

// Só executa quando chamado como programa. Importar este módulo NÃO pode
// disparar uma coleta: um teste que faça `import` dele começava a buscar a
// Wikipédia na hora, e a Fase 3 vai querer importar partes daqui.
if (import.meta.url === `file://${process.argv[1]}`) main();
