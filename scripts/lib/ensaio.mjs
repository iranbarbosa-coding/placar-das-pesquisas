// O RELATÓRIO DO ENSAIO: o que uma coleta FARIA com o banco, dito antes de fazer.
//
// A rodada real imprime `ELENCO RETIDO` e grava conflitos — mas os dois só
// falam do que a retenção ALCANÇA, que é o encolhimento de elenco dentro de uma
// pergunta que CHEGOU. O que ela não alcança não aparece em lugar nenhum: uma
// pergunta que a fonte para de servir simplesmente não é recriada, e o número
// que a denunciaria é o silêncio.
//
// ⚠ E O GUARDA QUE DEVERIA PEGAR ISSO É PISO ABSOLUTO, NÃO DELTA. `validate-store`
// reprova abaixo de 500 levantamentos / 2000 perguntas; o banco de 19/08/2026 tem
// 1013 / 2996. São 513 levantamentos e 996 perguntas de FOLGA SILENCIOSA — medido.
// É a condição 2 do cabeçalho de `update-polls.yml` ("as 41 disputas que o v2 não
// devolve inteiras"), e a classe é bem maior que as 41.
//
// Este módulo é PURO de propósito: recebe os dois estados e devolve linhas.
// Assim o autoteste o exercita sem coleta, sem rede e sem tocar em `data/` — e
// sem importar o coletor, que é justamente o que não se pode rodar para testar.

/** A chave de disputa de uma pergunta, como o resto do repositório a escreve. */
const disputaDe = (q) => `${q.race}:${q.uf ?? "BR"}`;

/** O nome exibível de um candidato, pela tabela do store em que ele vive. */
const nomeDe = (store, id) =>
  (store.candidates ?? []).find((c) => c.candidate_id === id)?.canonical ?? id;

/**
 * Quem lidera uma pergunta. Empate NÃO tem líder: devolver o primeiro seria
 * deixar a ordem do array decidir a saída (§8), e um "líder trocou" espúrio
 * numa presidencial é exatamente o alarme que ninguém pode dar em falso.
 */
function lider(q) {
  const rs = [...(q.results ?? [])].sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0));
  if (rs.length < 1) return null;
  if (rs.length > 1 && (rs[0].pct ?? 0) === (rs[1].pct ?? 0)) return null;
  return rs[0].candidate_id ?? null;
}

/**
 * O que a coleta ensaiada faria com o banco.
 *
 * Compara por `question_id`, que é cunhado de semente registrada e nunca
 * recomputado (§8) — então a diferença de conjuntos é sobre a MESMA pergunta,
 * não sobre uma que mudou de nome.
 */
export function relatorioDeEnsaio(anterior, ensaio) {
  const antes = new Map((anterior.questions ?? []).map((q) => [q.question_id, q]));
  const depois = new Map((ensaio.questions ?? []).map((q) => [q.question_id, q]));

  // 1. PERGUNTAS QUE SUMIRIAM. É a condição 2, nominal.
  const sumiram = [...antes.values()].filter((q) => !depois.has(q.question_id));
  const porDisputa = new Map();
  for (const q of sumiram) {
    const d = disputaDe(q);
    porDisputa.set(d, (porDisputa.get(d) ?? 0) + 1);
  }

  // 2. ELENCOS QUE ENCOLHERAM entre as perguntas que ficaram. A retenção pode
  //    ter absorvido parte disto — o que sobra aqui é o que ela NÃO absorveu.
  const encolheram = [];
  for (const [id, q] of depois) {
    const a = antes.get(id);
    if (!a) continue;
    const na = (a.results ?? []).length, nd = (q.results ?? []).length;
    if (nd < na) encolheram.push({ question_id: id, disputa: disputaDe(q), de: na, para: nd });
  }

  // 3. TROCA DE LÍDER. É o dano concreto que suspendeu o agendamento em 17/08:
  //    o `v2` devolvendo dois nomes de uma presidencial de dez trocaria o líder
  //    e o vice "por nada". Vale para toda disputa, não só a presidencial.
  const trocaramLider = [];
  for (const [id, q] of depois) {
    const a = antes.get(id);
    if (!a) continue;
    const la = lider(a), ld = lider(q);
    if (la && ld && la !== ld) {
      trocaramLider.push({
        question_id: id, disputa: disputaDe(q),
        era: nomeDe(anterior, la), viraria: nomeDe(ensaio, ld),
      });
    }
  }

  const L = [];
  L.push(`ENSAIO · perguntas: ${antes.size} no banco → ${depois.size} na coleta ensaiada`);
  L.push(`  sumiriam: ${sumiram.length}${sumiram.length ? ` — em ${porDisputa.size} disputa(s)` : ""}`);
  for (const [d, n] of [...porDisputa.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))) {
    L.push(`      ${d}: ${n}`);
  }
  L.push(`  elenco encolhido e NÃO absorvido pela retenção: ${encolheram.length}`);
  for (const e of encolheram.slice(0, 10)) L.push(`      ${e.disputa} ${e.question_id}: ${e.de} → ${e.para}`);
  L.push(`  ⚠ trocariam de líder: ${trocaramLider.length}`);
  for (const t of trocaramLider) L.push(`      ${t.disputa} ${t.question_id}: ${t.era} → ${t.viraria}`);
  return { linhas: L, sumiram, encolheram, trocaramLider, porDisputa };
}
