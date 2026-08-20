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
import { relatorioDeEnsaio } from "./lib/ensaio.mjs";

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

  // 6. ⚠ A FIAÇÃO DO DESTINO, conferida por LEITURA do fonte — é o que dá para
  //    fazer sem executar o coletor, e é o que garante "zero escrita em data/".
  {
    const src = fs.readFileSync(path.join(ROOT, "scripts", "scrape.mjs"), "utf-8");
    const escritas = src.split("\n")
      .map((l, i) => [i + 1, l])
      .filter(([, l]) => /fs\.writeFileSync\(|fs\.renameSync\(|writeStore\(/.test(l) && !/^\s*(\/\/|\*)/.test(l));
    ok(escritas.length > 0, "o coletor tem de ter escritas para esta conferência valer");
    // Nenhuma escrita pode citar o banco direto: todas passam por DESTINO.
    for (const [n, l] of escritas) {
      ok(!/DATA_DIR|ROOT,\s*"data"/.test(l),
        `a escrita da linha ${n} do coletor aponta para o banco em vez de DESTINO: ${l.trim()}`);
    }
    ok(/const DESTINO =/.test(src) && /const BANCO = path\.join\(ROOT, "data"\)/.test(src),
      "o coletor tem de separar BANCO (leitura) de DESTINO (escrita)");
    ok(/const DATA_LEITURA = path\.join\(BANCO, "polls\.json"\)/.test(src),
      "e a ENTRADA tem de vir do banco real, senão o ensaio mede zero e parece são");
    ok(/function prepararEnsaio\(\)/.test(src) && /copyFileSync/.test(src),
      "e o ensaio tem de copiar o banco para o destino, senão a retenção não tem ANTERIOR e nunca dispara");
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
