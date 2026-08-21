#!/usr/bin/env node
// Map the names institutes publish onto the OFFICIAL BALLOT NAME (nome de urna).
//
// RULING (Iran, 2026-08-16): the ballot name is what the site normalises on. It
// is not an opinion about what to call someone — it is the string that appears
// on the voting machine, the only name every voter sees. Registration closed on
// 15/08/2026, so for the first time there is an authoritative list to normalise
// against instead of a precedence ladder applied by hand.
//
// WHAT IS AND IS NOT MAPPED (Iran, 2026-08-16):
//   · matched EXACTLY, or by containment onto exactly ONE candidacy in the same
//     contest → renamed
//   · no candidacy in that contest, but the polled name sits inside exactly ONE
//     person's registration ANYWHERE in the register → renamed to that person's
//     ballot name (Iran, 2026-08-16: the ballot name belongs to the PERSON, not
//     to one race)
//   · everything else → LEFT AS IT IS TODAY. Not guessed, not dropped.
//
// AMBIGUITY IS REFUSED, NEVER RESOLVED. If a polled name is compatible with two
// candidacies in the same contest, it is skipped and reported. This is the rule
// that keeps "Ciro" from being folded into Ciro Gomes or Ciro Nogueira by a
// coin-toss — the exact failure that cost this project 63 hand-decided pairs and
// a session of repair after the token matcher merged Flávio into Jair Bolsonaro.
//
// A polled name with NO candidacy is also left alone. Polls from 2023–2025
// legitimately tested people who never registered; that is a fact about the
// poll, not an error to correct.
//
// Usage: node scripts/match-ballot-names.mjs [--out data/ballot-names.json]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normNome, grafiaCompare, melhorGrafia, ufDaCandidatura, chaveDeDisputa } from "./lib/nomes.mjs";
// O agrupamento do registro mora em `lib/candidaturas.mjs` desde que
// `lib/people.mjs` passou a precisar do MESMO colapso de re-registros para
// contar pessoas. Uma regra, uma implementação (CONVENTIONS §5).
import { agruparPorDisputa, lerCandidaturas } from "./lib/candidaturas.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CRUS = path.join(ROOT, "data", "nomes-crus.json");

// Shared with `lib/candidates.mjs`, which READS the keys this file WRITES.
// They used to hold a copy each and disagreed on punctuation. See `lib/nomes.mjs`.
const norm = normNome;

/**
 * Tokens worth matching on. Short words are dropped because "de", "da" and "do"
 * are in half of Brazilian names and would make everything look compatible.
 */
const tokens = (s) => norm(s).split(" ").filter((w) => w.length > 2);

/**
 * Is one name a token-subset of the other?
 *
 * "Ricardo Salles" ⊃ "Salles" and "Romeu Zema" ⊃ "Zema" — the institute writes
 * the fuller name, the ballot carries the short one, and every token of the
 * shorter appears in the longer. Deliberately NOT a similarity score: a
 * threshold invites tuning until the answer looks right, and this decides who
 * a number belongs to.
 */
function subset(a, b) {
  const A = new Set(tokens(a));
  const B = new Set(tokens(b));
  if (!A.size || !B.size) return false;
  const [small, large] = A.size <= B.size ? [A, B] : [B, A];
  for (const t of small) if (!large.has(t)) return false;
  return true;
}

/**
 * Is every token of `pequeno` present in `grande`? DIRECTIONAL, unlike
 * `subset` above, which accepts containment either way.
 *
 * The cross-contest pass needs the one-way test. Within a contest the roster is
 * a handful of people and either direction is safe; against the whole register
 * it is 519 candidacies, and two-way containment would let any single shared
 * token match — a polled "Romeu Zema" would find every registered "Romeu" as
 * well as Zema himself, and the name would be refused as ambiguous when it is
 * not. Requiring the POLLED name to sit inside the REGISTERED one keeps the
 * fragment from doing the matching.
 */
function contido(pequeno, grande) {
  const G = new Set(grande);
  for (const t of pequeno) if (!G.has(t)) return false;
  return true;
}

function main() {
  const byContest = agruparPorDisputa(lerCandidaturas());
  // The same collapsed candidacies, flat — the cross-contest fallback searches
  // the whole register, so it must see the SAME rows the per-contest pass sees
  // (re-registrations already merged), not the raw file.
  const todos = [...byContest.values()].flat();
  // The names exactly as the institutes published them, dumped by `scrape.mjs`
  // before it canonicalises anything. Reading the canonicalised output instead
  // makes this script eat its own tail — see the note at that dump site.
  // `nomes-crus.json` carries `{nome, partidos}` per name since 16/08. The bare
  // string form is still accepted: the file is build output, so a clone has the
  // old shape until its first scrape, and a matcher that threw on it would fail
  // for a reason that has nothing to do with names.
  const polled = new Map();
  for (const [contest, nomes] of Object.entries(JSON.parse(fs.readFileSync(CRUS, "utf-8")))) {
    polled.set(contest, nomes.map((n) => (typeof n === "string" ? { nome: n, partidos: [] } : n)));
  }

  const mapping = {};
  const stats = { exato: 0, contencao: 0, outra_disputa: 0, ambiguo: 0, sem: 0 };
  const ambiguos = [];
  const conflitosPartido = [];

  for (const [contest, nomes] of polled) {
    // A PRESIDENTIAL CANDIDACY IS NATIONAL, SO EVERY PRESIDENTIAL CONTEST SHARES
    // ONE ROSTER.
    //
    // The register files all 13 presidential candidacies with `uf` null, i.e.
    // `presidente:BR`. But we also collect presidential polling as STATE
    // SUBSAMPLES — `presidente:MG` is the presidential race asked of Minas
    // voters, deliberately kept out of the national average because it polls a
    // different population. Those 25 contests had no roster at all, so every
    // name in them missed the per-contest pass and fell through to the
    // whole-register fallback, which then weighed it against all 519
    // candidacies.
    //
    // The damage was not a wrong answer but a flood of false ones: "Lula" in a
    // state presidential row collided with CADU DE LULA (governador:RN) and
    // SAMANDA DE LULA (senador:RN) and was refused as ambiguous — 354 result
    // rows, 26 of the 30 reported ambiguities, all phantom. Every one of them is
    // answered by the office alone: a presidential vote-intention row cannot be
    // an RN governor candidate.
    //
    // Pointing these contests at the presidential roster fixes it in the RIGHT
    // direction — it moves the work back into the tight per-contest pass, where
    // the comparison is against 13 candidacies instead of 519, so it is also the
    // safer of the two paths. The contest key itself is untouched: the poll
    // stays `presidente:MG` and stays out of the national average.
    // A reserva é `chaveDeDisputa`, e não uma terceira cópia de
    // `startsWith("presidente:")`: é a mesma pergunta ("sob que chave vive a
    // candidatura desta disputa?") que a linha de `ufPesquisa` abaixo e as
    // consultas de `lib/candidates.mjs` fazem. Três cópias da mesma regra foi
    // como o guarda de identidade ficou desligado em 17 disputas (§5).
    const nacional = chaveDeDisputa(contest);
    const lista = byContest.get(contest) ?? (nacional === contest ? [] : byContest.get(nacional) ?? []);
    // UMA SUBAMOSTRA ESTADUAL DA PRESIDENCIAL É NACIONAL, e a regra de estado
    // tem de saber disso.
    //
    // `presidente:AC` é a corrida presidencial perguntada ao eleitor do Acre —
    // a disputa é nacional, só a amostra é estadual. Tratar o "AC" da chave como
    // o estado da CANDIDATURA fez a regra de estado recusar Tarcísio nessas 25
    // disputas: ele é registrado em `governador:SP`, "SP" ≠ "AC", e 23 linhas
    // continuaram publicando "Tarcísio de Freitas" enquanto `presidente:SP` —
    // por coincidência do estado — virava "Tarcísio". O mesmo homem com dois
    // nomes conforme a subamostra, que é exatamente o defeito que o nome de urna
    // por pessoa existe para acabar.
    //
    // A regra saiu daqui para `lib/nomes.mjs` quando o lado do CONSUMO precisou
    // dela: as decisões de identidade são gravadas em `presidente:BR` e
    // consultadas em `presidente:<UF>`, e a cópia que faltava lá deixou o guarda
    // de `areDistinct` desligado em 18 disputas (CONVENTIONS §5).
    const ufPesquisa = ufDaCandidatura(...contest.split(":"));
    for (const { nome, partidos } of nomes) {
      const exato = lista.filter((c) => norm(c.nome_urna_raw) === norm(nome));
      if (exato.length === 1) {
        add(mapping, contest, nome, exato[0], "exato");
        stats.exato++;
        continue;
      }
      // More than one candidacy registered under the identical ballot name is
      // possible (namesakes) and is NOT resolvable here.
      if (exato.length > 1) {
        stats.ambiguo++;
        ambiguos.push({ contest, nome, candidatos: exato.map((c) => c.nome_urna_raw), motivo: "nome de urna repetido" });
        continue;
      }
      const compat = lista.filter((c) => subset(c.nome_urna_raw, nome) || subset(c.nome_completo, nome));
      if (compat.length === 1) {
        add(mapping, contest, nome, compat[0], "contencao");
        stats.contencao++;
      } else if (compat.length > 1) {
        stats.ambiguo++;
        ambiguos.push({ contest, nome, candidatos: compat.map((c) => c.nome_urna_raw), motivo: "compatível com mais de uma candidatura" });
      } else {
        // NOBODY REGISTERED UNDER THIS NAME IN THIS CONTEST — SO LOOK AT THE
        // WHOLE REGISTER (Iran, 2026-08-16).
        //
        // A person's ballot name is a fact about the PERSON, not about one
        // race. Scoping the match to the contest meant the site published the
        // same man under two names depending on which race the poll was for:
        // Zema is registered for president, so presidential rows said "Zema"
        // while Minas governor rows said "Romeu Zema"; Tarcísio is registered
        // for governor of SP, so those rows said "Tarcísio" while presidential
        // rows said "Tarcísio de Freitas". 153 and 165 rows respectively, one
        // person, two names, and no rule anywhere said which was right.
        //
        // THE MATCH IS DIRECTIONAL, and that is the whole safety of it. Every
        // token of the POLLED name must appear in the registered person's ballot
        // name or civil name — never the reverse. Containment the other way
        // would let a short registration swallow a longer polled name belonging
        // to someone else entirely ("Zema" capturing a "Romeu" of no relation),
        // which is the homonym trap that already cost this project the
        // Professor Alcides and Vanderlan Gomes cases.
        //
        // And ambiguity is still REFUSED, never resolved: if the name fits more
        // than one PERSON anywhere in the register it is left alone. That is why
        // a bare "Ciro" does not resolve here — it fits Ciro Ferreira Gomes and
        // Ciro Nogueira Lima Filho — and why naming him took a ruling instead.
        const ptArr = tokens(nome);
        const pt = new Set(ptArr);
        const pessoas = new Map();
        if (pt.size) {
          for (const c of todos) {
            const bt = new Set(tokens(c.nome_urna_raw));
            const cabe = contido(pt, bt) || contido(pt, tokens(c.nome_completo));
            if (!cabe) continue;

            // THE CIVIL NAME MAY SAY WHICH PERSON; THE BALLOT NAME MUST AGREE
            // ABOUT WHICH NAME.
            //
            // Containment into the CIVIL name alone is far too weak against 519
            // candidacies. Brazilian civil names run to four tokens and more, so
            // almost any two-token polled name finds some home in one of them,
            // and refusing only on multiplicity is then a coin toss rather than
            // a guard. It landed wrong on "Toni Rodrigues": a Piauí governor
            // pre-candidate, absorbed into CAROL DE TONI — civil name Caroline
            // Rodrigues de Toni, running for the SENATE IN SANTA CATARINA —
            // because {toni,rodrigues} ⊆ {caroline,rodrigues,toni}. Same party,
            // so no party check would have saved it. 15 poll rows.
            //
            // The tell was already in the data: the SAME contest also publishes
            // "Jornalista Toni Rodrigues", the longer spelling of the same man,
            // and that one matched nothing and was correctly left alone. The
            // short name is absorbed while the long one is safe — the guard was
            // inverted.
            //
            // So the registrant's BALLOT name has to corroborate: the polled
            // name and the ballot name must CONTAIN ONE ANOTHER. "Toni
            // Rodrigues" against ballot {carol,toni} fails; "Romeu Zema" against
            // {zema} passes; "Tarcísio de Freitas" against {tarcisio} passes.
            //
            // A SURNAME ALONE IS NOT ENOUGH, AND THAT IS NOT A JUDGEMENT CALL —
            // IT IS UNDECIDABLE FROM THE TOKENS. The first version of this guard
            // also accepted a shared last token, and it made things worse rather
            // than better: it filtered ONE of the two registrants that had been
            // making "José Guimarães" ambiguous, so a Ceará PT deputy stopped
            // being refused and started being published as "Alexandre
            // Guimarães", an MDB senator in Tocantins. A lucky refusal became a
            // confident wrong answer — the guard converted a near miss into a
            // hit, which is the worst thing a guard can do.
            //
            // Compare the two, which are token-identical and opposite in truth:
            //   Carlos Brandão → Orleans Brandão  — SAME man (the incumbent)
            //   José Guimarães → Alexandre Guimarães — DIFFERENT men
            // Both share only the surname. Nothing in the strings separates
            // them, so the surname clause cannot be tuned into correctness; it
            // can only be removed. Cases like Brandão are real and are worth
            // having — they belong in `data/candidate-rulings.json`, where a
            // human states the identity and cites why, which is exactly what
            // CONVENTIONS §4 means by refusing ambiguity instead of resolving it.
            // A SHARED SURNAME COUNTS ONLY INSIDE ONE STATE.
            //
            // On tokens alone the surname clause was undecidable, and removing
            // it was right at the time: `Carlos Brandão → Orleans Brandão` (the
            // same man) and `José Guimarães → Alexandre Guimarães` (two men) are
            // token-identical and opposite in truth. Nothing in the strings
            // separates them.
            //
            // The state does. Brandão is MA → MA: the incumbent governor polled
            // for the senate in his own state. Guimarães is CE → TO: a Ceará PT
            // deputy against an MDB senator in Tocantins. So the clause comes
            // back, admitted ONLY when both sides are state-level and agree —
            // which is the evidence the tokens never had, not a threshold tuned
            // until the answer looked right.
            const mesmoEstado = ufPesquisa !== "BR" && c.uf === ufPesquisa;
            const confirmaUrna = contido(pt, bt) || contido(bt, pt)
              || (mesmoEstado && bt.has(ptArr[ptArr.length - 1]));
            if (!confirmaUrna) continue;

            // A STATE CANDIDACY CANNOT BE A DIFFERENT STATE'S (criador, 16/08).
            //
            // This is what the tokens could never reach: `Álvaro Dias` polled
            // for the SENATE IN PARANÁ and `ÁLVARO DIAS` registered for GOVERNOR
            // OF RIO GRANDE DO NORTE have IDENTICAL ballot names, so mutual
            // containment passes and both misfire guards above wave it through.
            // The states differ and that ends it — 24 poll rows that were
            // carrying the wrong `sq_candidato`, `partido` and `numero`.
            //
            // It also CONFIRMS rather than merely blocks: `Carlos Brandão`,
            // polled for the senate in Maranhão and registered for governor of
            // Maranhão, is the incumbent moving between offices in his own
            // state. He was lost when the surname clause came out; the state
            // agreement is the positive evidence that brings him back.
            //
            // National candidacies are exempt at BOTH ends, and must be: the
            // register files presidential rows with `uf` null, and presidential
            // polling also exists as `presidente:BR`. Requiring a state match
            // there would refuse Tarcísio (`presidente:BR` → `governador:SP`),
            // which is the case this whole fallback was built for.
            if (ufPesquisa !== "BR" && c.uf && c.uf !== ufPesquisa) continue;

            const pessoa = norm(c.nome_completo) || `sq:${c.sq_candidato}`;
            if (!pessoas.has(pessoa)) pessoas.set(pessoa, c);
          }
        }
        if (pessoas.size === 1) {
          const alvo = [...pessoas.values()][0];
          add(mapping, contest, nome, alvo, "outra-disputa");
          stats.outra_disputa++;
          // PARTY IS REPORTED, NOT ENFORCED — and that is a measured choice.
          //
          // Refusing on a party mismatch would block `Álvaro Dias`, but the
          // state rule above already does, and party would ALSO kill six real
          // party SWITCHES: Simone Tebet (MDB→PSB), Sergio Moro (União→PL),
          // Fernando Máximo, Vicentinho Júnior, Cristina Graeml, and it misreads
          // "Sem partido" as a conflict. A poll keeps the party it was taken
          // with, and people change parties between a poll and a registration —
          // so a mismatch is evidence, not a verdict. It is surfaced for a
          // ruling instead of silently deciding.
          const pp = (partidos ?? []).map(norm).filter(Boolean);
          const rp = norm(alvo.partido ?? "");
          if (pp.length && rp && !pp.includes(rp)) {
            conflitosPartido.push({ contest, nome, urna: alvo.nome_urna, pesquisa: partidos, registro: alvo.partido });
          }
        } else if (pessoas.size > 1) {
          stats.ambiguo++;
          ambiguos.push({
            contest, nome,
            candidatos: [...pessoas.values()].map((c) => `${c.nome_urna_raw} (${c.cargo}:${c.uf ?? "BR"})`),
            motivo: "compatível com mais de uma pessoa no registro inteiro",
          });
        } else {
          stats.sem++;
        }
      }
    }
  }

  const outArg = process.argv.find((a) => a.startsWith("--out="))?.split("=")[1];
  const out = path.join(ROOT, outArg ?? "data/ballot-names.json");

  // A GENERATOR THAT QUIETLY WRITES LESS THAN IT FOUND LAST TIME IS THE DEFECT
  // THIS REPOSITORY KEEPS REDISCOVERING.
  //
  // `candidate-resolve.mjs` wrote its table EMPTY twice before it grew the same
  // refusal. The hole here is wider, because it needs no bug at all: an empty
  // `nomes-crus.json` makes the loop body never run, and every branch below
  // still succeeds — a well-formed file, `stats` all zero, exit 0, and on the
  // next consume every candidate on the site silently reverts to its
  // pre-register name. Nothing downstream would notice: `candidates.mjs` loads
  // this file inside a `catch {}` that treats the register as optional.
  //
  // So the floor is compared against the file being replaced, not against a
  // constant — a constant would need editing every time the register grows and
  // would be tuned down the first time it was inconvenient.
  // COUNT WHAT IS WRITTEN, NOT WHAT WAS MATCHED. `stats.exato + stats.contencao`
  // counts DECISIONS (385); the file holds KEYS (370), because raw spellings that
  // fold together share one. A guard reading the larger number would sit still
  // while the artifact lost entries to collisions — measuring the intent instead
  // of the output is how a guard ends up protecting nothing.
  const contar = (m) => Object.values(m ?? {}).reduce((n, c) => n + Object.keys(c).length, 0);
  const mapeados = contar(mapping);
  const anterior = fs.existsSync(out) ? JSON.parse(fs.readFileSync(out, "utf-8")) : null;
  const antes = contar(anterior?.mapping);
  if (antes && mapeados < antes * 0.8 && !process.argv.includes("--force-shrink")) {
    console.error(
      `RECUSADO: o mapa encolheu de ${antes} para ${mapeados} nomes (${Math.round((1 - mapeados / antes) * 100)}% a menos).\n` +
      `Isto costuma significar que a entrada veio vazia ou canonicalizada, não que o registro mudou.\n` +
      `Se a queda for real e esperada, repita com --force-shrink.`,
    );
    process.exit(1);
  }

  const payload = {
    note:
      "Nome de urna oficial do TSE por disputa, aplicado ao nome que o instituto publicou. " +
      "Gerado por scripts/match-ballot-names.mjs a partir de data/candidaturas.ndjson — não editar à mão. " +
      "Só entram aqui os casos EXATOS e os de contenção com uma única candidatura compatível; " +
      "ambíguos e sem candidatura ficam de fora e mantêm o nome atual.",
    gerado_de: "consulta_cand_2026 (TSE Dados Abertos)",
    stats,
    ambiguos,
    conflitos_partido: conflitosPartido,
    mapping,
  };
  fs.writeFileSync(out, JSON.stringify(payload, null, 1) + "\n");

  console.log(`nomes de urna mapeados → ${path.relative(ROOT, out)}`);
  console.log(`  exatos: ${stats.exato} · por contenção: ${stats.contencao} · ` +
    `AMBÍGUOS (não mapeados): ${stats.ambiguo} · sem candidatura (mantidos): ${stats.sem}`);
  if (conflitosPartido.length) {
    console.log(`  AVISO: ${conflitosPartido.length} resolução(ões) entre disputas com partido divergente ` +
      `(reportadas, não recusadas — pode ser troca de partido ou pessoa errada):`);
    for (const c of conflitosPartido.slice(0, 12)) {
      console.log(`   partido — ${c.contest} "${c.nome}" pesquisa=${c.pesquisa.join("/")} × registro=${c.registro} → ${c.urna}`);
    }
  }
  for (const a of ambiguos.slice(0, 10)) {
    console.log(`   ambíguo — ${a.contest} "${a.nome}" ~ ${a.candidatos.join(" / ")} (${a.motivo})`);
  }
}

function add(mapping, contest, nome, cand, how) {
  mapping[contest] ??= {};
  const chave = norm(nome);
  const novo = {
    nome_urna: melhorGrafia(nome, cand.nome_urna),
    sq_candidato: cand.sq_candidato,
    partido: cand.partido,
    numero: cand.numero,
    origem: how,
  };

  // TWO RAW NAMES CAN FOLD TO ONE KEY, AND THEY MUST NOT BE SETTLED BY ORDER.
  //
  // The institutes publish "Alvaro Dias" and "Álvaro Dias", "Dr Daniel" and
  // "Dr. Daniel" — distinct strings in `nomes-crus.json` that normalise to the
  // same lookup key. Both reach the same candidacy, but `melhorGrafia` is fed a
  // DIFFERENT polled spelling each time, so the two calls can disagree on how
  // many accents the answer carries. A plain assignment lets whichever name the
  // array happened to list last decide the published spelling.
  //
  // It happened to be safe — the arrays are code-unit sorted and unaccented
  // ASCII sorts before accented, so the better spelling was written second — but
  // that is a dependency on sort order nobody stated, and CONVENTIONS §8 exists
  // because exactly this kind of accident is how output starts tracking
  // something that is not the data. Resolve it on CONTENT — a ordem de
  // qualidade é a de `grafiaCompare` (acentos, depois siglas), a MESMA que
  // `melhorGrafia` usa, e não uma cópia dela (CONVENTIONS §5) — and a tie
  // keeps what is already there.
  const atual = mapping[contest][chave];
  if (atual && grafiaCompare(novo.nome_urna, atual.nome_urna) <= 0) return;
  mapping[contest][chave] = novo;
}

/**
 * §2: prova que a regra de grafia decide o que promete — cada caso é um defeito
 * real, medido, e a mutação que reverte a proteção de caixa derruba SÓ o caso
 * novo (os de acento e o de controle continuam verdes, provando que ela não
 * regrediu nem alargou).
 */
function autoteste() {
  const casos = [
    // A PROTEÇÃO NOVA (caixa): o title-case do fetch esmagou a sigla do
    // registro; a grafia publicada, mesmo nome sob normNome, vence.
    ["sigla protegida", () => melhorGrafia("Joaquim do MLB", "Joaquim do Mlb") === "Joaquim do MLB"],
    // A PROTEÇÃO VELHA (acento) não regrediu, nos dois sentidos.
    ["acento protegido (pesquisa melhor)", () => melhorGrafia("Flávio Bolsonaro", "Flavio Bolsonaro") === "Flávio Bolsonaro"],
    ["acento protegido (urna melhor)", () => melhorGrafia("Flavio Bolsonaro", "Flávio Bolsonaro") === "Flávio Bolsonaro"],
    // ACENTO MANDA ANTES DA CAIXA: a ordem é lexicográfica, não uma soma.
    ["acento antes de caixa", () => melhorGrafia("Pablo MARCAL", "Pablo Marçal") === "Pablo Marçal"],
    // CONTROLE (§4): grafias realmente DIFERENTES seguem com o registro —
    // isto decide exibição entre grafias da mesma pessoa, nunca identidade.
    ["nomes diferentes: urna vence", () => melhorGrafia("Ricardo Salles", "Salles") === "Salles"],
    // O INSTITUTO QUE GRITA NÃO VENCE: presidente:SE publica "RENAN SANTOS";
    // caixa alta pura não é sigla, não carrega informação de caixa.
    ["caixa alta pura não vence", () => melhorGrafia("RENAN SANTOS", "Renan Santos") === "Renan Santos"],
    // A COLISÃO DE CHAVE NO add() É DECIDIDA POR CONTEÚDO, NAS DUAS ORDENS
    // (CONVENTIONS §8): duas grafias cruas que dobram na mesma chave.
    ["add() indiferente à ordem", () => {
      const cand = { nome_urna: "Joaquim do Mlb", sq_candidato: "x", partido: "UP", numero: "800" };
      const ab = {}, ba = {};
      add(ab, "senador:PR", "Joaquim do MLB", cand, "exato");
      add(ab, "senador:PR", "joaquim do mlb", cand, "exato");
      add(ba, "senador:PR", "joaquim do mlb", cand, "exato");
      add(ba, "senador:PR", "Joaquim do MLB", cand, "exato");
      const na = ab["senador:PR"]["joaquim do mlb"].nome_urna;
      const nb = ba["senador:PR"]["joaquim do mlb"].nome_urna;
      return na === "Joaquim do MLB" && na === nb;
    }],
  ];
  let falhas = 0;
  for (const [nome, fn] of casos) {
    const ok = fn();
    if (!ok) falhas++;
    console.log(`${ok ? "ok" : "FALHOU"} — ${nome}`);
  }
  if (falhas) { console.error(`autoteste: ${falhas} caso(s) falharam`); process.exit(1); }
  console.log("autoteste: todos os casos passaram");
}

if (process.argv.includes("--self-test")) autoteste();
else if (import.meta.url === `file://${process.argv[1]}`) main();
