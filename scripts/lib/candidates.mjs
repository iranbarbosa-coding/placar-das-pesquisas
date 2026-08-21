// Candidate identity: the curated table, applied.
//
// Replaces the guessing that `sameCandidate()` does with a decided answer.
// `data/candidate-aliases.json` records, per contest, which ballot names are
// one person and which are not — each decided against public record (article
// identity, sourced research, or a creator ruling) rather than by string
// similarity. See REVISAO_CANDIDATOS.md for the evidence dossier.
//
// TWO DIRECTIONS, and the second matters as much as the first:
//   · `canonicalCandidate` folds a group's spellings onto one display name.
//   · `areDistinct` answers "these two were CHECKED and are different people",
//     which is what stops the fuzzy matcher from merging "Ciro Nogueira" into
//     "Ciro".
//
// ⚠ O QUE ESTA LINHA DIZIA E NÃO ERA VERDADE: "…ou um Bolsonaro em qualquer
// outro Bolsonaro". Medido em 17/08/2026 — `areDistinct` é consultada atrás de
// um `&&` que curto-circuita:
//
//     (isSubset(tk, c.tokens) || isSubset(c.tokens, tk)) && !…areDistinct(…)
//
// Das 25 decisões gravadas em `.distinct`, UMA é par de subconjunto de tokens
// (`Ciro` ⊂ `Ciro Nogueira`). As outras 24 — inclusive TODOS os cinco pares da
// família Bolsonaro — nunca chegam ao guarda, porque `isSubset` já as recusou:
// {flavio, bolsonaro} não é subconjunto de {jair, bolsonaro} nem o contrário.
// O guarda não separa esses irmãos; quem os separa é o próprio `isSubset`, e o
// guarda é a rede que sobra para o caso em que as formas de token coincidem.
//
// Isso está escrito aqui porque um comentário que promete uma proteção que o
// código não dá é pior que nenhum: ele faz a próxima pessoa medir a decisão
// errada. Foi o que aconteceu com a primeira versão deste reparo.
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normNome, chaveDeDisputa, grafiaCompare } from "./nomes.mjs";

const FILE = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "candidate-aliases.json");
const RULINGS = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "candidate-rulings.json");
const BALLOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "data", "ballot-names.json");

// O ARQUIVO DE NOMES DE URNA É SUBSTITUÍVEL POR UM MOTIVO SÓ, e é o mesmo do
// `reterElencos` injetável de `build-store.mjs`: provar entre RODADAS uma coisa
// que só existe entre rodadas.
//
// O casador roda ANTES da coleta (desde 21/08, sobre os crus da rodada anterior — era DEPOIS da coleta e o mapa que ele gera vale para a rodada
// SEGUINTE (CONVENTIONS §6). Então a defasagem de uma rodada — um nome que
// estreia numa disputa não é renomeado na rodada em que estreia, e é na seguinte
// — só se observa com DOIS estados deste arquivo. Sem esta porta, o único jeito
// de exercitá-la seria reescrever `data/ballot-names.json`, o artefato real, no
// meio de uma verificação (CONVENTIONS §3), e um teste que suja o banco para se
// provar não é um teste que se pode rodar.
//
// Em produção nunca é chamada: o coletor, a projeção e o site leem o arquivo
// real. Quem chama devolve ao padrão (`usarRegistroDeUrna()`) no `finally`.
let ARQUIVO_URNA = BALLOT;
export function usarRegistroDeUrna(arquivo = null) {
  ARQUIVO_URNA = arquivo ?? BALLOT;
  TABLE = null;
}

// A TABELA DE APELIDOS É SUBSTITUÍVEL PELO MESMO MOTIVO, e para provar UMA
// propriedade que o arquivo real não consegue exercitar.
//
// A consulta tenta a chave EXATA e só então a nacional (`chaveDeDisputa`). A
// diferença entre "tenta as duas" e "troca por uma" só aparece quando existe
// decisão gravada numa chave `presidente:<UF>` — e hoje `.distinct` não tem
// nenhuma: as 25 estão em `presidente:BR` ou em disputas estaduais. Ou seja, a
// versão SUBSTITUIÇÃO passa em qualquer bateria escrita contra o arquivo real,
// e foi assim que ela sobreviveu à primeira rodada de mutação deste reparo.
//
// A alternativa seria reescrever `data/candidate-aliases.json` no meio de uma
// verificação, que é o que CONVENTIONS §3 proíbe. Em produção nunca é chamada;
// quem chama devolve ao padrão (`usarTabelaDeApelidos()`) no `finally`.
let ARQUIVO_APELIDOS = FILE;
export function usarTabelaDeApelidos(arquivo = null) {
  ARQUIVO_APELIDOS = arquivo ?? FILE;
  TABLE = null;
}

// Shared with `match-ballot-names.mjs`, which WRITES the keys this file READS.
// When the two had a copy each they disagreed on punctuation and every ballot
// name containing a dot resolved to nothing. See `lib/nomes.mjs`.
const norm = normNome;

let TABLE = null;
function table() {
  if (TABLE) return TABLE;
  let spec = { groups: [], distinct: [] };
  try { spec = JSON.parse(fs.readFileSync(ARQUIVO_APELIDOS, "utf-8")); } catch { /* table is optional */ }
  const display = new Map();   // `${contest}|${norm(name)}` -> display name
  const distinct = new Set();  // `${contest}|${norm(a)}|${norm(b)}` (sorted)
  // POR QUE O NOME EXIBIDO É O QUE É — gravado, não deduzido depois.
  //
  // A precedência abaixo (grupo curado → ruling → nome de urna → ruling) é
  // real e é decidida aqui, mas até `people.ndjson` existir ela ficava
  // implícita numa ordem de escritas: o mapa guardava só a resposta, e quem
  // lesse `candidates.ndjson` não tinha como saber se "Zema" veio do registro
  // do TSE, de uma decisão do criador ou da grafia mais curta observada. Como o
  // `candidate_id` acompanhava esse nome, a origem do nome era também a origem
  // do id — e ninguém conseguia auditar isso. Agora cada escrita registra a sua
  // camada, e `people.display_from` publica a resposta.
  const origem = new Map();    // `${contest}|${norm(name)}` -> qual camada decidiu
  const ballot = new Map();    // `${contest}|${norm(name)}` -> candidatura do TSE
  const decide = (chave, nome, camada) => { display.set(chave, nome); origem.set(chave, camada); };
  for (const g of spec.groups ?? []) {
    for (const m of g.members ?? []) decide(`${g.contest}|${norm(m)}`, g.display, "grupo curado");
  }
  // Rulings are applied HERE, at consume time, not only when the table is
  // regenerated. The generator discovers pairs by scanning the data — and once
  // a merge is applied the variants stop appearing in it, so the scan can no
  // longer rediscover a decision already made. The decision is the durable
  // artifact; the generated table is a materialisation of it.
  try {
    const ruled = JSON.parse(fs.readFileSync(RULINGS, "utf-8"));
    for (const r of ruled.rulings ?? []) {
      if (r.verdict !== "MESMA" || !r.canonical) continue;
      for (const n of r.names ?? []) decide(`${r.contest}|${norm(n)}`, r.canonical, "ruling");
    }
  } catch { /* rulings are optional */ }
  // THE OFFICIAL BALLOT NAME, applied under the creator's own rulings.
  //
  // (Iran, 2026-08-16) The nome de urna is what the site normalises on: it is
  // the string on the voting machine, not a judgement about what to call
  // someone. `data/ballot-names.json` holds only the unambiguous matches —
  // exact, or containment onto exactly one candidacy — and everything else
  // keeps whatever name it has today.
  //
  // ORDER MATTERS, and this sits BELOW the rulings written after it. A ruling
  // is a decision about WHO SOMEONE IS ("these two names are one person",
  // "these two are not"), which no register can overrule; the ballot name only
  // decides WHAT TO CALL a person already identified. Putting the register on
  // top would let a name match quietly undo a hand-decided identity.
  const porUrna = new Map();   // `${contest}|${norm(nome_urna)}` -> Set<sq>
  const urnaInfo = new Map();  // `${chaveUrna}|${sq}` -> candidatura
  // ⚠ O REGISTRO NÃO DECIDE AQUI; ELE SÓ É COLETADO. Quem aplica é o bloco
  // "o grupo curado dobra, o nome de urna nomeia", depois deste laço — decidir
  // dentro do laço é o defeito que este arquivo carregava. Ver lá embaixo.
  const urnaPorChave = new Map(); // `${contest}|${key}` -> nome_urna do registro
  try {
    const registro = JSON.parse(fs.readFileSync(ARQUIVO_URNA, "utf-8"));
    for (const [contest, nomes] of Object.entries(registro.mapping ?? {})) {
      for (const [key, info] of Object.entries(nomes)) {
        // A CANDIDATURA É GRAVADA MESMO QUANDO O NOME NÃO MUDA.
        //
        // `sq_candidato` é a semente do `person_id` de quem se registrou, e ele
        // não pode depender de a linha ter ou não mudado de nome: um nome que já
        // estava escrito como o nome de urna não produz renomeação nenhuma e
        // ainda assim identifica a pessoa. Guardar só o rename deixaria essas
        // pessoas sem `sq` e as cunharia como não-registradas.
        ballot.set(`${contest}|${key}`, info);
        // ⚠ O REGISTRO TEM DE SER ALCANÇÁVEL PELO NOME QUE ELE PRÓPRIO IMPÕE.
        //
        // As chaves deste mapa são as grafias PUBLICADAS de UMA rodada (saem de
        // `data/nomes-crus.json`), e ele é consultado também com o nome já
        // canonicalizado. Quando a canonicalização adota o nome de urna, o nome
        // resultante muitas vezes NÃO está entre as grafias publicadas e a
        // consulta erra: em `governador:AL` o instituto publicou
        // "João Henrique Caldas", o registro renomeia para "Jhc", e
        // `ballotCandidacy("Jhc", "governador:AL")` devolvia `null` — o registro
        // ficava inalcançável pelo único nome que o site exibe, e a linha caía
        // numa pessoa SEM registro ao lado de uma pessoa registrada idêntica.
        //
        // Indexar o próprio `nome_urna` fecha a classe inteira, e sem inventar
        // nada: a chave nova aponta para a MESMA candidatura que a entrada já
        // afirma. Nunca sobrescreve uma chave existente — uma grafia publicada
        // que case diretamente continua mandando, e assim esta linha não pode
        // roubar um nome de outra pessoa da mesma disputa.
        if (info?.nome_urna) {
          urnaPorChave.set(`${contest}|${key}`, info.nome_urna);
          const chaveUrna = `${contest}|${norm(info.nome_urna)}`;
          if (!porUrna.has(chaveUrna)) porUrna.set(chaveUrna, new Set());
          porUrna.get(chaveUrna).add(info.sq_candidato);
          urnaInfo.set(`${chaveUrna}|${info.sq_candidato}`, info);
        }
      }
    }
    // Fora do laço DE PROPÓSITO: dentro dele, "só se ainda não existe" faria a
    // resposta depender da ORDEM em que as entradas aparecem no JSON, que é o
    // defeito-família deste repositório (CONVENTIONS §8). Aqui a grafia
    // publicada sempre vence a chave derivada, seja qual for a ordem — e um
    // nome de urna que aponte para DUAS candidaturas na mesma disputa é
    // ambíguo e não decide nada, em vez de sortear (CONVENTIONS §4).
    for (const [chaveUrna, sqs] of porUrna) {
      if (ballot.has(chaveUrna) || sqs.size !== 1) continue;
      ballot.set(chaveUrna, urnaInfo.get(`${chaveUrna}|${[...sqs][0]}`));
    }
  } catch { /* the register is optional; the site predates it */ }

  // ⚠ O GRUPO CURADO DOBRA A ENTIDADE; O NOME DE URNA NOMEIA A ENTIDADE DOBRADA.
  //
  // (Iran, 17/08/2026) O comentário acima já dizia por que uma RULING não pode
  // ser derrubada pelo registro: ela decide QUEM É a pessoa, e o nome de urna só
  // decide COMO CHAMAR quem já foi identificada. Essa proteção estava dada só às
  // rulings — e um grupo curado é a MESMA espécie de decisão. Ele afirma que
  // várias grafias são UMA pessoa; foi conferido contra registro público, não
  // adivinhado por semelhança de string.
  //
  // Com a decisão escrita chave a chave, o registro REVERTIA a fusão em silêncio,
  // porque só o membro que casava com uma candidatura era renomeado e os outros
  // ficavam com o nome do grupo. Em `governador:TO` o grupo "Dorinha Rezende"
  // ⟨Dorinha Rezende, Professora Dorinha⟩ saía partido: "Professora Dorinha" pelo
  // nome de urna (sq 270002544599) e "Dorinha Rezende" pelo grupo — dois nomes,
  // duas linhas de candidato, duas pessoas (uma delas SEM registro), e o site
  // publicando as duas. A curadoria tinha decidido que é uma mulher só.
  //
  // A ordem certa é dobrar primeiro e nomear depois: o grupo permanece dobrado e
  // o nome de urna passa a nomear o GRUPO INTEIRO. A camada gravada continua
  // sendo `nome_urna` porque é o registro que escolhe o nome — o que mudou é
  // sobre O QUÊ ele escolhe: uma entidade, não uma grafia.
  const conflitos = [];
  const doGrupo = new Map();   // `${contest}|${norm(membro)}` -> grupo curado
  for (const g of spec.groups ?? []) {
    for (const m of g.members ?? []) doGrupo.set(`${g.contest}|${norm(m)}`, g);
  }
  const achadosDoGrupo = new Map(); // grupo -> Array<{ chave, nome_urna }>
  for (const [chave, nome_urna] of urnaPorChave) {
    const g = doGrupo.get(chave);
    if (!g) continue;
    if (!achadosDoGrupo.has(g)) achadosDoGrupo.set(g, []);
    achadosDoGrupo.get(g).push({ chave, nome_urna });
  }
  // O GRUPO CONTRADITADO PELO REGISTRO NÃO É RESOLVIDO AQUI (CONVENTIONS §4).
  //
  // Se os membros de um grupo curado carregam MAIS DE UM nome de urna distinto,
  // o registro está dizendo que são pessoas DIFERENTES e a curadoria que são a
  // MESMA. Escolher um dos dois lados seria inventar a resposta — e é o mesmo
  // erro de forma que juntou "Ciro" a "Ciro Nogueira". Então o grupo mantém o
  // comportamento de hoje (cada chave com o seu nome, chave a chave), e a
  // contradição vira linha em `conflicts.ndjson` para um humano ver. É uma
  // decisão curada contra o registro oficial: ninguém além do criador a desfaz.
  const dobrado = new Map();   // grupo -> o nome que passa a nomear o grupo todo
  for (const [g, achados] of achadosDoGrupo) {
    const distintos = new Set(achados.map((a) => norm(a.nome_urna)));
    if (distintos.size !== 1) {
      conflitos.push({
        contest: g.contest,
        display: g.display,
        members: [...(g.members ?? [])].sort(),
        nomes_urna: [...new Set(achados.map((a) => a.nome_urna))].sort(),
      });
      continue;
    }
    // Mesmo nome sob grafias diferentes (o TSE grava 29 nomes de urna sem os
    // acentos que o nome tem, e o title-case do fetch esmaga sigla): ganha a
    // ordem de `grafiaCompare` — acentos, depois siglas —, e o desempate é
    // lexicográfico, nunca a ordem do arquivo (CONVENTIONS §8). É a regra de
    // `melhorGrafia`/`melhorDisplay`, e não uma quarta cópia dela.
    dobrado.set(g, [...new Set(achados.map((a) => a.nome_urna))]
      .sort((a, b) => grafiaCompare(b, a) || (a < b ? -1 : a > b ? 1 : 0))[0]);
  }
  // Fora de grupo (ou grupo recusado): o registro nomeia a grafia, como sempre.
  for (const [chave, nome_urna] of urnaPorChave) {
    const g = doGrupo.get(chave);
    if (g && dobrado.has(g)) continue;
    decide(chave, nome_urna, "nome_urna");
  }
  // Em grupo: o registro nomeia a ENTIDADE — todos os membros, inclusive os que
  // não casaram com candidatura nenhuma. É esta linha que impede a reversão.
  for (const [g, nome] of dobrado) {
    for (const m of g.members ?? []) decide(`${g.contest}|${norm(m)}`, nome, "nome_urna");
  }

  // Rulings again, LAST, so a creator decision outranks the register.
  try {
    const ruled = JSON.parse(fs.readFileSync(RULINGS, "utf-8"));
    for (const r of ruled.rulings ?? []) {
      if (r.verdict !== "MESMA" || !r.canonical) continue;
      for (const n of r.names ?? []) decide(`${r.contest}|${norm(n)}`, r.canonical, "ruling");
    }
  } catch { /* rulings are optional */ }

  // ⚠ SEGUNDA PASSADA, DEPOIS QUE A ESCADA DE EXIBIÇÃO ESTÁ COMPLETA — e é por
  // isso que ela não pode estar junto com as outras leituras acima.
  //
  // Um "conferidos e DIFERENTES" é gravado contra a grafia PESQUISADA, que é a
  // que o par de revisão viu. Só que a escada logo abaixo troca essa grafia pelo
  // nome que o site exibe, e é o nome exibido que chega a `areDistinct` — o
  // agrupador por tokens compara nomes de cluster, já canonicalizados. Quando as
  // duas divergem, a decisão fica indexada numa string que ninguém mais emite:
  //
  //   · `governador:GO` "Gustavo Medanha" → exibido "Gustavo Mendanha" (grupo curado)
  //   · `senador:PB`    "Marcelo Queiroga" → exibido "Dr. Marcelo Queiroga" (nome_urna)
  //
  // O segundo é o perigoso: "Marcelo Queiroga" e "Marcelo Queiroz" são DOIS
  // homens do mesmo partido (PL) a dois caracteres de distância, e são
  // exatamente o par que `candidate-resolve.mjs` cita como o que a regra
  // tipográfica fundiria se a evidência documental não o tivesse decidido antes.
  // Com a decisão morta, nada segurava a fusão.
  //
  // As chaves CRUAS continuam indexadas: as duas grafias têm de resolver, porque
  // a grafia pesquisada ainda chega aqui por outros caminhos (o próprio
  // `candidate-review.mjs` lê `polls.json`).
  const grafias = (contest, nome) => {
    const cru = norm(nome);
    const exibido = norm(display.get(`${contest}|${cru}`) ?? "");
    return exibido && exibido !== cru ? [cru, exibido] : [cru];
  };
  for (const d of spec.distinct ?? []) {
    const [na, nb] = d.names ?? [];
    if (!na || !nb) continue;
    for (const a of grafias(d.contest, na)) {
      for (const b of grafias(d.contest, nb)) {
        const [x, y] = [a, b].sort();
        if (x && y && x !== y) distinct.add(`${d.contest}|${x}|${y}`);
      }
    }
  }
  TABLE = { display, origem, ballot, distinct, groups: spec.groups ?? [], conflitos };
  return TABLE;
}

/**
 * A CHAVE QUE DECIDIU o nome exibido, ou `null` se nenhuma decidiu.
 *
 * ⚠ UMA IMPLEMENTAÇÃO PORQUE DUAS JÁ DIVERGIRAM (CONVENTIONS §5). A primeira
 * versão deste reparo dobrou a chave dentro de `canonicalCandidate` e deixou
 * `displayOrigin` lendo só a exata. As duas liam a mesma chave desde sempre e
 * por isso NÃO PODIAM discordar; a partir dali podiam, e discordavam em 22
 * disputas:
 *
 *     presidente:BR  "Ciro" → "Ciro Gomes"  · origem "ruling"
 *     presidente:AC  "Ciro" → "Ciro Gomes"  · origem null      ⇐ mentira
 *
 * `lib/store.mjs` grava essa origem na pessoa (`observePerson`, e de novo no
 * caminho rápido), e quem consome lê `null` como "grafia mais curta observada".
 * O site publicaria um nome vindo de uma decisão do criador afirmando que
 * ninguém o decidiu — exatamente o acoplamento não auditável entre origem do
 * nome e origem do id que o cabeçalho de `table()` diz existir para acabar.
 *
 * Devolver a CHAVE, e não o valor, é o que torna a divergência impossível de
 * reintroduzir: as duas funções abaixo respondem sobre a MESMA entrada da
 * tabela, ou sobre nenhuma.
 *
 * A chave exata manda e a nacional é a segunda tentativa — inverter apagaria a
 * ruling de `presidente:PR`, que é estadual de propósito (ver `areDistinct`).
 */
function chaveDecidida(t, name, contest) {
  const n = norm(name);
  const exata = `${contest}|${n}`;
  if (t.display.has(exata)) return exata;
  const nacional = `${chaveDeDisputa(contest)}|${n}`;
  return t.display.has(nacional) ? nacional : null;
}

/**
 * The name this candidate should be recorded under in `contest`.
 * Unknown names pass through untouched — the table covers the pairs that were
 * flagged and checked, not the whole roster.
 */
export function canonicalCandidate(name, contest) {
  if (!name) return name;
  const t = table();
  const k = chaveDecidida(t, name, contest);
  return k ? t.display.get(k) : name;
}

/**
 * QUAL CAMADA decidiu o nome exibido de `name` em `contest`.
 *
 * `null` quando nenhuma decidiu — aí o nome que sai de `canonicalCandidate` é o
 * próprio nome de entrada, e quem escolheu a grafia foi `canonicalizeCandidates`
 * (a mais curta vista ao menos duas vezes no cluster). Quem consome traduz esse
 * `null` para "mais curta observada"; aqui ele é honesto: esta tabela não opinou.
 */
export function displayOrigin(name, contest) {
  if (!name) return null;
  const t = table();
  const k = chaveDecidida(t, name, contest);
  return k ? t.origem.get(k) ?? null : null;
}

/**
 * A candidatura do TSE que `data/ballot-names.json` casou com este nome, ou
 * `null`. É por aqui que uma linha de pesquisa alcança um `SQ_CANDIDATO` — a
 * semente do `person_id` de quem se registrou.
 *
 * ⚠ NÃO DOBRA A CHAVE DA DISPUTA, ao contrário das duas consultas acima, e o
 * motivo é medido, não estético (medido em 17/08/2026):
 *
 *   · o registro NÃO PRECISA da dobra. `match-ballot-names.mjs` já grava uma
 *     chave por disputa pesquisada usando o elenco nacional como reserva, então
 *     as 27 chaves `presidente:<UF>` existem no arquivo. Pelas grafias
 *     PUBLICADAS: 0 de 1.438 linhas de presidencial estadual em que a chave
 *     estadual erra e a nacional resolveria.
 *   · e a dobra NÃO SERIA INÓCUA. Pelo nome EXIBIDO — que `lib/store.mjs`
 *     consulta em segundo lugar — existe 1 linha: `presidente:RO` "Ciro Gomes",
 *     que a chave nacional casaria com a candidatura dele a `governador:CE`
 *     (`origem: "outra-disputa"`). Essa linha passaria de pessoa não registrada
 *     a registrada, e `person_id` é cunhado da semente do registro: um id se
 *     moveria. CONVENTIONS §8 — ids são cunhados uma vez e nunca recomputados,
 *     e muito menos como efeito colateral de um reparo de consulta.
 *
 * Se um dia essa linha tiver de casar, que seja uma decisão explícita sobre
 * ELA, com o id migrado de propósito — não um efeito de borda desta função.
 */
export function ballotCandidacy(name, contest) {
  if (!name) return null;
  return table().ballot.get(`${contest}|${norm(name)}`) ?? null;
}

/**
 * Were these two names CHECKED and found to be different people?
 *
 * ⚠ CONSULTA TAMBÉM A CHAVE NACIONAL. A subamostra estadual da presidencial é
 * a disputa NACIONAL perguntada num estado (HANDOFF §1b): as decisões são
 * gravadas em `presidente:BR` e a varredura emite `presidente:<UF>`, então em
 * 18 disputas presidenciais estaduais este guarda estava simplesmente
 * DESLIGADO — Flávio × Jair, Flávio × Michelle, Eduardo × Flávio,
 * Renan Filho × Renan Santos e Eduardo Bolsonaro × Eduardo Leite, 28
 * ocorrências (disputa, par), todas respondendo `false` para pares que a
 * curadoria já tinha declarado pessoas diferentes. É a cláusula que impede o
 * agrupador por subconjunto de tokens de fundir um Bolsonaro noutro.
 *
 * O ou lógico é o certo aqui, e não a substituição: "conferidos e diferentes"
 * é uma afirmação sobre PESSOAS, então valer na disputa nacional é valer em
 * qualquer amostra dela, e uma decisão gravada só para uma UF continua valendo
 * onde foi gravada.
 */
export function areDistinct(a, b, contest) {
  const [x, y] = [norm(a), norm(b)].sort();
  const d = table().distinct;
  return d.has(`${contest}|${x}|${y}`) || d.has(`${chaveDeDisputa(contest)}|${x}|${y}`);
}

export function groups() { return table().groups; }

/**
 * Os grupos curados que o REGISTRO CONTRADIZ — mais de um `nome_urna` distinto
 * entre os membros de um grupo que a curadoria declarou uma pessoa só.
 *
 * Sai daqui como DADO, e não como escrita: este módulo é lido por `store.mjs`,
 * então gravar em `conflicts.ndjson` a partir daqui seria uma dependência
 * circular — e um módulo de leitura de tabela que escreve no banco é a forma do
 * defeito "gerador lê a própria saída" (CONVENTIONS §6). Quem registra é
 * `buildStoreFromPolls`, uma vez por rodada.
 *
 * Ordem estável (disputa, depois nome exibido): a lista vai para um arquivo
 * versionado e não pode depender da ordem do JSON de entrada (CONVENTIONS §8).
 */
export function identityConflicts() {
  return [...table().conflitos].sort((a, b) =>
    a.contest.localeCompare(b.contest) || a.display.localeCompare(b.display));
}

/** Reset for tests that rewrite the table on disk. */
export function reload() { TABLE = null; }
