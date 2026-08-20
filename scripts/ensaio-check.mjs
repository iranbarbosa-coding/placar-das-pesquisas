#!/usr/bin/env node
// O autoteste do ENSAIO — e ele existe porque o que ele testa não pode ser rodado.
//
// A ferramenta que este autoteste guarda (`scrape.mjs --ensaio`) só produz o
// número que interessa contra a fonte REAL, e essa rodada é do criador. Então a
// prova de que ela está certa tem de ser OFFLINE e SINTÉTICA — senão a única
// maneira de confiar nela seria rodá-la, que é exatamente o que se está tentando
// evitar (CONVENTIONS §2: um verde que ninguém testou não é evidência).
//
// Ele NÃO importa `scrape.mjs`. O relatório vive em `lib/ensaio.mjs`, puro, e é
// o que se exercita aqui; a fiação do destino é conferida por leitura do fonte,
// que é o que dá para fazer sem executar o coletor.
//
// Uso: node scripts/ensaio-check.mjs --self-test
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { relatorioDeEnsaio, resolverDestino, prepararEnsaio } from "./lib/ensaio.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");

/** Um store mínimo com o que o relatório lê. */
const store = (questions, candidates = []) => ({ questions, candidates });
const q = (id, race, uf, results) => ({ question_id: id, race, uf, round: 1, results });
const r = (candidate_id, pct) => ({ candidate_id, pct });

function autoteste() {
  const falhas = [];
  const ok = (cond, msg) => { if (!cond) falhas.push(msg); };

  const CANDS = [
    { candidate_id: "c_a", canonical: "Alfa" },
    { candidate_id: "c_b", canonical: "Beta" },
    { candidate_id: "c_c", canonical: "Gama" },
  ];

  // 1. LADOS IGUAIS NÃO ACUSAM NADA. Sem isto, um relatório que acusa sempre
  //    passaria por vigilante.
  {
    const s = store([q("q1", "presidente", null, [r("c_a", 40), r("c_b", 30)])], CANDS);
    const rel = relatorioDeEnsaio(s, structuredClone(s));
    ok(rel.sumiram.length === 0 && rel.encolheram.length === 0 && rel.trocaramLider.length === 0,
      `coleta idêntica não pode acusar nada (veio ${rel.sumiram.length}/${rel.encolheram.length}/${rel.trocaramLider.length})`);
  }

  // 2. ⚠ DESAPARECIMENTO — a condição 2. É o caso que hoje não deixa rastro
  //    nenhum: a retenção é por pergunta e só vê as que CHEGAM.
  {
    const antes = store([
      q("q1", "presidente", null, [r("c_a", 40)]),
      q("q2", "governador", "PI", [r("c_b", 20)]),
      q("q3", "governador", "PI", [r("c_c", 10)]),
    ], CANDS);
    const depois = store([q("q1", "presidente", null, [r("c_a", 40)])], CANDS);
    const rel = relatorioDeEnsaio(antes, depois);
    ok(rel.sumiram.length === 2, `duas perguntas sumiram (veio ${rel.sumiram.length})`);
    ok(rel.porDisputa.get("governador:PI") === 2,
      `e as duas são agrupadas pela disputa delas (veio ${rel.porDisputa.get("governador:PI")})`);
    ok(rel.linhas.some((l) => /sumiriam: 2/.test(l)), "o relatório publica a contagem");
    ok(rel.linhas.some((l) => /governador:PI: 2/.test(l)), "e nomeia a disputa, que é o que se leva ao criador");
  }

  // 3. ⚠ ENCOLHIMENTO DE ELENCO na pergunta que ficou — o defeito de 17/08 em
  //    miniatura: dez linhas viram duas e a soma some nos buckets.
  {
    const antes = store([q("q1", "presidente", null, [r("c_a", 40), r("c_b", 30), r("c_c", 10)])], CANDS);
    const depois = store([q("q1", "presidente", null, [r("c_a", 40)])], CANDS);
    const rel = relatorioDeEnsaio(antes, depois);
    ok(rel.encolheram.length === 1 && rel.encolheram[0].de === 3 && rel.encolheram[0].para === 1,
      `o encolhimento sai com os dois tamanhos (veio ${JSON.stringify(rel.encolheram)})`);
    ok(rel.sumiram.length === 0, "e encolher não é sumir — a pergunta continua lá");
  }

  // 4. ⚠ TROCA DE LÍDER — o dano nomeado no cabeçalho do workflow ("trocaria o
  //    líder e o vice de uma presidencial nacional por nada").
  {
    const antes = store([q("q1", "presidente", null, [r("c_a", 40), r("c_b", 30)])], CANDS);
    const depois = store([q("q1", "presidente", null, [r("c_b", 30), r("c_c", 5)])], CANDS);
    const rel = relatorioDeEnsaio(antes, depois);
    ok(rel.trocaramLider.length === 1, `a troca de líder é acusada (veio ${rel.trocaramLider.length})`);
    ok(rel.trocaramLider[0].era === "Alfa" && rel.trocaramLider[0].viraria === "Beta",
      `com os dois nomes, não os ids (veio ${JSON.stringify(rel.trocaramLider[0])})`);
    ok(rel.linhas.some((l) => /Alfa → Beta/.test(l)), "e a linha publica a troca");
  }

  // 5. EMPATE NÃO TEM LÍDER, e por isso não troca. Devolver o primeiro do array
  //    deixaria a ORDEM decidir a saída (§8) e daria alarme falso numa
  //    presidencial — que é o alarme que menos pode ser dado em falso.
  {
    const antes = store([q("q1", "presidente", null, [r("c_a", 30), r("c_b", 30)])], CANDS);
    const depois = store([q("q1", "presidente", null, [r("c_b", 30), r("c_a", 30)])], CANDS);
    ok(relatorioDeEnsaio(antes, depois).trocaramLider.length === 0,
      "empate invertido de ordem não é troca de líder");
  }

  // 6. ⚠ A FIAÇÃO, PELO COMPORTAMENTO — e não pelo texto do fonte.
  //
  //    A versão anterior deste bloco lia `scrape.mjs` e afirmava que a cópia
  //    EXISTE (`copyFileSync` presente). Texto não é comportamento: a
  //    conferência quebrou o FILTRO da cópia — copiando NADA, com a chamada
  //    ainda lá — e este autoteste ficou VERDE. Um ensaio sem estado ANTERIOR
  //    mede ZERO e parece são, que é o desfecho exato que o ensaio existe para
  //    impedir. O ponto cego era o próprio defeito, escondido no teste dele.
  //
  //    Por isso a fiação mora em `lib/ensaio.mjs` e é EXERCITADA aqui, com
  //    diretórios de mentira.
  {
    const raiz = fs.mkdtempSync(path.join(os.tmpdir(), "ensaio-fiacao-"));
    const banco = path.join(raiz, "data");
    fs.mkdirSync(banco, { recursive: true });
    fs.writeFileSync(path.join(banco, "questions.ndjson"), "{}\n");
    fs.writeFileSync(path.join(banco, "meta.json"), "{}\n");
    fs.writeFileSync(path.join(banco, "polls.json"), "{}\n");
    fs.writeFileSync(path.join(banco, "leia-me.txt"), "não é do banco\n");

    // (a) SEM `--ensaio`, nada muda: a rodada real escreve no banco, como sempre.
    const real = resolverDestino({ argv: ["node", "scrape.mjs"], root: raiz });
    ok(real.emEnsaio === false, "sem --ensaio não é ensaio");
    ok(real.destino === banco, `e o destino é o banco (veio ${real.destino})`);

    // (b) `--ensaio` puro dá um diretório temporário, NUNCA o banco.
    const solto = resolverDestino({ argv: ["--ensaio"], root: raiz });
    ok(solto.emEnsaio === true && solto.destino !== banco,
      `--ensaio puro tem de dar destino fora do banco (veio ${solto.destino})`);
    ok(solto.dataLeitura === path.join(banco, "polls.json"),
      `e a ENTRADA vem sempre do banco real (veio ${solto.dataLeitura})`);
    ok(solto.dataSaida === path.join(solto.destino, "polls.json"),
      "e a SAÍDA vai para o destino");

    // (c) ⚠ E O DESTINO QUE É O BANCO É RECUSADO. Sem isto, `--ensaio=data`
    //     grava no banco real — medido — e a promessa "nada em data/" passaria
    //     a depender de quem digita a linha de comando. Quem vai rodar isto é o
    //     criador, uma vez, para decidir religar: a segurança não pode ser dele.
    for (const alvo of [banco, path.join(banco, "sub")]) {
      let recusou = false;
      try { resolverDestino({ argv: [`--ensaio=${alvo}`], root: raiz }); }
      catch (e) { recusou = /RECUSADO/.test(e.message); }
      ok(recusou, `o destino ${alvo} tinha de ser recusado (é o banco, ou dentro dele)`);
    }
    // E um destino de fora continua aceito, senão a guarda recusaria tudo.
    const fora = path.join(raiz, "ensaio-x");
    ok(resolverDestino({ argv: [`--ensaio=${fora}`], root: raiz }).destino === fora,
      "um destino fora do banco continua aceito");

    // (d) ⚠ A CÓPIA COPIA — comportamento, não presença da chamada.
    const destino = path.join(raiz, "ensaio-y");
    const copiados = prepararEnsaio({ emEnsaio: true, banco, destino });
    ok(copiados.length === 3, `os três arquivos do banco são copiados (veio ${copiados.length}: ${copiados.join(", ")})`);
    for (const f of ["questions.ndjson", "meta.json", "polls.json"]) {
      ok(fs.existsSync(path.join(destino, f)), `${f} tem de chegar ao destino, senão o ensaio roda sem ANTERIOR e mede zero`);
    }
    ok(!fs.existsSync(path.join(destino, "leia-me.txt")), "e o que não é do banco não é copiado");
    // (e) E O BANCO NÃO É TOCADO — a promessa inteira desta ferramenta.
    ok(fs.readdirSync(banco).sort().join(",") === "leia-me.txt,meta.json,polls.json,questions.ndjson",
      "o banco não pode ganhar nem perder arquivo");
    ok(fs.readFileSync(path.join(banco, "polls.json"), "utf-8") === "{}\n", "nem ter conteúdo alterado");
    // (f) E sem ensaio a cópia não acontece.
    const vazio = path.join(raiz, "ensaio-z");
    ok(prepararEnsaio({ emEnsaio: false, banco, destino: vazio }).length === 0 && !fs.existsSync(vazio),
      "fora do ensaio nada é copiado e nenhum diretório é criado");

    fs.rmSync(raiz, { recursive: true, force: true });
  }

  // 7. E o coletor tem de USAR a fiação do módulo — se ele voltar a resolver o
  //    destino por conta própria, tudo acima passa a testar código morto.
  {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "scrape.mjs"), "utf-8");
    ok(/resolverDestino\(\{ argv: process\.argv, root: ROOT \}\)/.test(src),
      "o coletor resolve o destino pelo módulo, não por conta própria");
    ok(/prepararEnsaio\(\{ emEnsaio: EM_ENSAIO, banco: BANCO, destino: DESTINO \}\)/.test(src),
      "e prepara o ensaio pelo módulo");
    const escritas = src.split("\n").map((l, i) => [i + 1, l])
      .filter(([, l]) => /fs\.writeFileSync\(|fs\.renameSync\(|writeStore\(/.test(l) && !/^\s*(\/\/|\*)/.test(l));
    ok(escritas.length > 0, "o coletor tem de ter escritas para esta conferência valer");
    for (const [n, l] of escritas) {
      ok(!/DATA_DIR|ROOT,\s*"data"/.test(l), `a escrita da linha ${n} aponta para o banco em vez de DESTINO: ${l.trim()}`);
    }
  }

  if (falhas.length) {
    console.error("AUTOTESTE FALHOU:");
    for (const f of falhas) console.error(`  ✗ ${f}`);
    process.exit(1);
  }
  console.log("autoteste ok — coleta idêntica não acusa, desaparecimento agrupado por disputa, encolhimento com os dois tamanhos, troca de líder pelos nomes, empate sem líder, e a fiação do destino (BANCO só leitura, DESTINO única escrita, entrada real, cópia do banco antes de construir)");
}

if (process.argv.includes("--self-test")) autoteste();
else {
  console.error("Este arquivo é o autoteste do ensaio. Use --self-test.");
  console.error("Para o ensaio de verdade: node scripts/scrape.mjs --ensaio  (roda a coleta; é do criador)");
  process.exit(1);
}
