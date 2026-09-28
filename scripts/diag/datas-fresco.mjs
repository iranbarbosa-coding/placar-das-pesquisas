// DIAG (só na branch): datas do store FRESCO contra o commit anterior, por
// legacy_id (o id nativo da linha na fonte). Mede re-datação e datas futuras.
import fs from "node:fs";
import { execSync } from "node:child_process";
const nd = (t) => t.split("\n").filter(Boolean).map(JSON.parse);
const FRESH = process.env.FRESH ?? "data";
const HOJE = process.env.HOJE ?? new Date().toISOString().slice(0, 10);
const prevQ = nd(execSync("git show HEAD:data/questions.ndjson", { maxBuffer: 1 << 28 }).toString());
const prevS = Object.fromEntries(nd(execSync("git show HEAD:data/surveys.ndjson", { maxBuffer: 1 << 28 }).toString()).map((s) => [s.survey_id, s]));
const newQ = nd(fs.readFileSync(`${FRESH}/questions.ndjson`, "utf-8"));
const newS = Object.fromEntries(nd(fs.readFileSync(`${FRESH}/surveys.ndjson`, "utf-8")).map((s) => [s.survey_id, s]));
const inst = Object.fromEntries(nd(fs.readFileSync(`${FRESH}/institutes.ndjson`, "utf-8")).map((i) => [i.institute_id, i.canonical]));
const dateOf = (s) => s?.fieldwork_end ?? s?.published_date ?? null;
const src = (s) => (s?.source_refs ?? [])[0]?.source ?? ((s?.article_url ?? "").includes("wikipedia") ? "wikipedia" : "outro");
// 1. re-datação por legacy_id
const byLeg = new Map();
for (const q of prevQ) if (q.legacy_id) byLeg.set(`${q.legacy_id}|${q.race}|${q.round}`, q);
const shifts = new Map(); const exemplos = [];
for (const q of newQ) {
  const p = q.legacy_id && byLeg.get(`${q.legacy_id}|${q.race}|${q.round}`);
  if (!p) continue;
  const da = dateOf(prevS[p.survey_id]), dn = dateOf(newS[q.survey_id]);
  if (da === dn) continue;
  const k = `${(da ?? "null").slice(0, 4)} → ${(dn ?? "null").slice(0, 4)} · ${src(prevS[p.survey_id])}`;
  shifts.set(k, (shifts.get(k) ?? 0) + 1);
  if (exemplos.length < 25) exemplos.push(`${q.race}:${q.uf ?? "BR"} ${inst[newS[q.survey_id]?.institute_id]} ${da} → ${dn} | ${q.scenario_label_raw} | ${(q.results ?? []).slice(0, 3).map((r) => r.name_raw + " " + r.pct).join(", ")}`);
}
console.log("RE-DATAÇÃO por legacy_id (ano antigo → ano novo · fonte):");
for (const [k, v] of [...shifts].sort((a, b) => b[1] - a[1])) console.log("  ", v, k);
for (const e of exemplos) console.log("   ex:", e);
// 2. datas futuras
console.log("DATAS FUTURAS (> " + HOJE + ") no store fresco:");
for (const s of Object.values(newS)) if ((dateOf(s) ?? "") > HOJE) console.log("  ", s.survey_id, inst[s.institute_id], s.universe?.uf ?? "BR", s.fieldwork_start, s.fieldwork_end, s.published_date, "n=", s.sample_size, src(s), (s.article_url ?? "").slice(-70));
// 3. perguntas NOVAS (legacy_id inédito) por disputa, com data — as adições que o delta não julga
const legAnt = new Set(prevQ.map((q) => q.legacy_id).filter(Boolean));
const novas = newQ.filter((q) => q.legacy_id && !legAnt.has(q.legacy_id));
const porDisputa = new Map();
for (const q of novas) { const k = `${q.race}:${q.uf ?? "BR"}`; porDisputa.set(k, [...(porDisputa.get(k) ?? []), q]); }
console.log("PERGUNTAS NOVAS por disputa (legacy_id inédito):", novas.length);
for (const [k, qs] of [...porDisputa].sort((a, b) => b[1].length - a[1].length).slice(0, 12)) {
  const anos = {}; for (const q of qs) { const y = (dateOf(newS[q.survey_id]) ?? "null").slice(0, 4); anos[y] = (anos[y] ?? 0) + 1; }
  console.log("  ", k, qs.length, JSON.stringify(anos));
}
console.log("NOVAS em presidente:BR com data em 2026-09 (instituto · campo · fonte · elenco):");
for (const q of novas.filter((q) => q.race === "presidente" && !q.uf && (dateOf(newS[q.survey_id]) ?? "").startsWith("2026-09")).slice(0, 40)) {
  const s = newS[q.survey_id];
  console.log("  ", inst[s.institute_id], s.fieldwork_start, s.fieldwork_end, src(s), "t" + q.round, q.scenario_label_raw, (q.results ?? []).slice(0, 4).map((r) => r.name_raw + " " + r.pct).join(", "));
}
