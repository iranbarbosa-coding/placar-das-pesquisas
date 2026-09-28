// DIAG (só na branch): para cada pergunta em quarentena, mostra o que o commit
// anterior tinha e o que a FONTE serve hoje (v2/cenarios do Poder360 por
// combo; página da Wikipédia por instituto). Nada aqui grava no repositório.
import fs from "node:fs";
import { execSync } from "node:child_process";
const nd = (t) => t.split("\n").filter(Boolean).map(JSON.parse);
const prevQ = nd(execSync("git show HEAD:data/questions.ndjson", { maxBuffer: 1 << 28 }).toString());
const prevS = Object.fromEntries(nd(execSync("git show HEAD:data/surveys.ndjson", { maxBuffer: 1 << 28 }).toString()).map((s) => [s.survey_id, s]));
const inst = Object.fromEntries(nd(fs.readFileSync("data/institutes.ndjson", "utf-8")).map((i) => [i.institute_id, i.canonical]));
const newQ = nd(fs.readFileSync("data/questions.ndjson", "utf-8"));
const newS = Object.fromEntries(nd(fs.readFileSync("data/surveys.ndjson", "utf-8")).map((s) => [s.survey_id, s]));
const conflicts = nd(fs.readFileSync("data/conflicts.ndjson", "utf-8")).filter((c) => c.type === "disputa_em_quarentena");
const lost = [];
for (const c of conflicts) {
  const ids = c.incoming?.perdidas ?? c.incoming?.ids ?? c.incoming ?? [];
  for (const id of (Array.isArray(ids) ? ids : [])) lost.push({ disputa: c.record_id ?? c.field, id });
}
console.log("quarentenas:", conflicts.length, "perguntas sumidas:", lost.length);
if (!lost.length) { console.log(JSON.stringify(conflicts[0], null, 1).slice(0, 1500)); }
const UF_IDS = { AC: 1, AL: 2, AM: 3, AP: 4, BA: 5, CE: 7, DF: 8, ES: 9, GO: 10, MA: 11, MG: 12, MS: 13, MT: 14, PA: 15, PB: 16, PE: 17, PI: 18, PR: 19, RJ: 20, RN: 21, RO: 22, RR: 23, RS: 24, SC: 25, SE: 26, SP: 27, TO: 28 };
const CARGO = { governador: 1, presidente: 3, senador: 4 };
const HOST = "https://monitor-agregador.poder360.com.br";
const HEADERS = { "content-type": "application/json", origin: "https://drive.poder360.com.br", "user-agent": "Mozilla/5.0 (compatible; PlacarDasPesquisas/1.0)" };
const cache = new Map();
async function cenarios(race, uf, round) {
  const k = `${race}|${uf ?? "BR"}|${round}`;
  if (cache.has(k)) return cache.get(k);
  const ufId = uf ? UF_IDS[uf] : 6;
  const url = `${HOST}/pesquisas/v2/cenarios?cargosId=${CARGO[race]}&unidadesFederativasId=${ufId}&ano=2026&turno=${round}&cidade=`;
  let list = [];
  try { const r = await fetch(url, { headers: HEADERS }); const j = await r.json(); list = j?.data?.cenarios ?? []; } catch (e) { console.log("  (falha ao buscar", k, e.message, ")"); }
  cache.set(k, list);
  return list;
}
const byPrev = Object.fromEntries(prevQ.map((q) => [q.question_id, q]));
for (const { disputa, id } of lost) {
  const q = byPrev[id];
  if (!q) { console.log("=====", disputa, id, "NÃO EXISTE no commit anterior"); continue; }
  const s = prevS[q.survey_id] ?? {};
  const ref = (s.source_refs ?? []).find((r) => r.source === "poder360")?.native_id ?? null;
  console.log("=====", disputa, id, "|", inst[s.institute_id] ?? s.institute_id, s.fieldwork_end, "n=", s.sample_size, "reg", s.tse_registration, "ref", ref, "|", q.scenario_label_raw, "leg", q.legacy_id);
  console.log("   antes:", JSON.stringify((q.results ?? []).map((r) => [r.name_raw, r.pct])), "u", q.undecided_pct, "bn", q.blank_null_pct);
  // o que o store NOVO tem no mesmo levantamento (por ref ou por instituto+data)
  const same = newQ.filter((x) => { const ns = newS[x.survey_id]; if (!ns) return false;
    const nref = (ns.source_refs ?? []).find((r) => r.source === "poder360")?.native_id ?? null;
    return x.race === q.race && x.round === q.round && (x.uf ?? null) === (q.uf ?? null) && ((ref != null && String(nref) === String(ref)) || (ns.institute_id === s.institute_id && ns.fieldwork_end === s.fieldwork_end)); });
  console.log("   store novo, mesmo levantamento:", same.length, "pergunta(s)");
  for (const x of same.slice(0, 12)) console.log("      ", x.question_id, x.scenario_label_raw, JSON.stringify((x.results ?? []).map((r) => [r.name_raw, r.pct])), "leg", x.legacy_id, "ids", JSON.stringify(x.legacy_ids ?? []));
  if (ref != null) {
    const list = await cenarios(q.race, q.uf ?? null, q.round);
    const mine = list.filter((sc) => String(sc.id) === String(ref));
    console.log("   FONTE Poder360 hoje, id", ref + ":", mine.length, "cenário(s)");
    for (const sc of mine) console.log("      ", JSON.stringify(sc.nomeCenario), sc.data?.slice?.(0, 10), JSON.stringify((sc.apuracao ?? []).map((r) => [r.nome, r.percentual])));
  }
}
