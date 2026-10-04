// RESULTADOS OFICIAIS DO TSE → data/resultados-oficiais.json
//
// Lê a Divulgação de Resultados do TSE (resultados.tse.jus.br), uma eleição e um
// cargo por arquivo, e grava o percentual de votos válidos de cada candidato em
// cada disputa que o site cobre: presidente (BR) e governador e senador nas 27
// UFs. É a única entrada do ranking de acerto dos institutos (src/lib/acerto.ts);
// nada ali é inferido — se o TSE não serviu a disputa, ela fica fora.
//
// Caminho dos arquivos (descoberto em 04/10/2026, run 37243784249 e 37243905866):
//   https://resultados.tse.jus.br/oficial/comum/config/ele-c.json
//     → pleito "ele2026": eleição 6257 (Federal, cargo 1 Presidente) e
//       6259 (Estadual, cargos 3 Governador e 5 Senador); 2º turno 6258/6260.
//   https://resultados.tse.jus.br/oficial/ele2026/<ele>/dados/<uf>/<uf>-c<cargo:4>-e<ele:6>-u.json
//     (o "-r.json" simplificado de 2022 não existe em 2026; o "-u" traz
//     carg[].agr[].par[].cand[] com nm, nmu, sqcand, vap e o percentual.)
//
// NOMES. O candidato sai do TSE como nome de urna em caixa alta ("FLAVIO
// BOLSONARO"); o banco do site usa o nome de urna como grafado no registro
// (data/candidaturas.ndjson, chave sq_candidato). Casamos por `sqcand` →
// `nome_urna`; sem registro casado, o nome de urna do TSE em caixa normal.
//
// Uso:  node scripts/tse-resultados.mjs [--turno 1|2] [--ufs SP,RJ] [--dry]
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, "..");
const OUT = path.join(ROOT, "data", "resultados-oficiais.json");
const CANDIDATURAS = path.join(ROOT, "data", "candidaturas.ndjson");

const UFS = ["AC", "AL", "AM", "AP", "BA", "CE", "DF", "ES", "GO", "MA", "MG", "MS", "MT", "PA", "PB", "PE", "PI", "PR", "RJ", "RN", "RO", "RR", "RS", "SC", "SE", "SP", "TO"];
const ELEICOES = {
  1: { federal: 6257, estadual: 6259, data: "2026-10-04" },
  2: { federal: 6258, estadual: 6260, data: "2026-10-25" },
};
const CARGOS = { presidente: 1, governador: 3, senador: 5 };
const BASE = "https://resultados.tse.jus.br/oficial/ele2026";
const UA = { "User-Agent": "Mozilla/5.0 (X11; Linux x86_64) PlacarDasPesquisas/1.0", Accept: "application/json,*/*", Referer: "https://resultados.tse.jus.br/" };

const args = process.argv.slice(2);
const opt = (k, d) => { const i = args.indexOf(k); return i >= 0 ? args[i + 1] : d; };
const TURNO = Number(opt("--turno", "1"));
const SO_UFS = opt("--ufs", "") ? opt("--ufs", "").split(",").map((s) => s.trim().toUpperCase()) : null;
const DRY = args.includes("--dry");

const num = (s) => {
  if (s == null) return null;
  const t = String(s).replace(/\./g, "").replace(",", ".").trim();
  const v = Number(t);
  return Number.isFinite(v) ? v : null;
};

function titulo(nmu) {
  return String(nmu ?? "").toLowerCase().replace(/(^|[\s\-/.])(\p{L})/gu, (m, sep, ch) => sep + ch.toUpperCase());
}

function carregarRegistro() {
  const porSq = new Map();
  if (!fs.existsSync(CANDIDATURAS)) return porSq;
  for (const line of fs.readFileSync(CANDIDATURAS, "utf-8").split("\n")) {
    if (!line.trim()) continue;
    try {
      const c = JSON.parse(line);
      if (c.sq_candidato) porSq.set(String(c.sq_candidato), c);
    } catch { /* linha malformada: ignorada */ }
  }
  return porSq;
}

async function buscar(url) {
  const r = await fetch(url, { headers: UA });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json();
}

/** Todos os candidatos do arquivo "-u": percorre carg → (agr → par | fed → par) → cand. */
function candidatos(d) {
  const out = [];
  const visitarPar = (par) => { for (const c of par?.cand ?? []) out.push(c); };
  for (const carg of d?.carg ?? []) {
    for (const agr of carg.agr ?? []) for (const par of agr.par ?? []) visitarPar(par);
    for (const fed of carg.fed ?? []) for (const par of fed.par ?? []) visitarPar(par);
    for (const par of carg.par ?? []) visitarPar(par);
    for (const c of carg.cand ?? []) out.push(c);
  }
  return out;
}

/**
 * % de seções totalizadas. O arquivo "-u" de 2026 NÃO traz esse número (visto no
 * cabeçalho em 04/10: ele, t, f, sup, tpabr, cdabr, dg, hg, idg, dt, ht, dv, tf,
 * and, md); fica null até o TSE servir um campo. Procuramos os nomes de 2022 por
 * precaução.
 */
function apurado(d) {
  for (const k of ["pst", "pstc", "pse"]) if (d[k] != null) return num(d[k]);
  return null;
}

/**
 * Estado da totalização pelo cabeçalho: `tf` = totalização final ("s"/"n") e
 * `and` = andamento ("p" parcial, "f" final). "final" só quando o TSE diz que é.
 */
function totalizacao(d) {
  if (d.tf === "s" || d.and === "f") return "final";
  if (d.tf === "n" || d.and === "p") return "parcial";
  return null;
}

async function lerDisputa(race, uf, ele, registro) {
  const u = uf.toLowerCase();
  const url = `${BASE}/${ele}/dados/${u}/${u}-c${String(CARGOS[race]).padStart(4, "0")}-e${String(ele).padStart(6, "0")}-u.json`;
  const d = await buscar(url);
  const cands = candidatos(d).filter((c) => c.sqcand || c.nmu || c.nm);
  const total = cands.reduce((a, c) => a + (num(c.vap) ?? 0), 0);
  const validos = {};
  for (const c of cands) {
    const reg = registro.get(String(c.sqcand ?? ""));
    const nome = reg?.nome_urna ?? titulo(c.nmu ?? c.nm);
    // O percentual publicado (pvap) quando existe; senão a parte nos votos válidos somados.
    const pct = num(c.pvap) ?? (total > 0 ? ((num(c.vap) ?? 0) / total) * 100 : null);
    if (pct == null) continue;
    validos[nome] = Math.round(pct * 100) / 100;
  }
  return {
    race, uf: race === "presidente" ? null : uf, round: TURNO,
    apurado_pct: apurado(d), totalizacao: totalizacao(d), validos,
    fonte: url, lido_em: new Date().toISOString(),
    _header: Object.fromEntries(Object.entries(d).filter(([k, v]) => typeof v !== "object").slice(0, 24)),
    _n: cands.length,
  };
}

async function main() {
  const ele = ELEICOES[TURNO];
  if (!ele) throw new Error(`turno inválido: ${TURNO}`);
  const registro = carregarRegistro();
  const disputas = [];
  const falhas = [];
  const alvos = [["presidente", "BR", ele.federal]];
  for (const uf of UFS) if (!SO_UFS || SO_UFS.includes(uf)) { alvos.push(["governador", uf, ele.estadual]); alvos.push(["senador", uf, ele.estadual]); }
  for (const [race, uf, e] of alvos) {
    try {
      const r = await lerDisputa(race, uf, e, registro);
      const top = Object.entries(r.validos).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([n, v]) => `${n} ${v}`).join(" · ");
      console.error(`✓ ${race}:${uf} ${r.totalizacao ?? "?"} ${r.apurado_pct == null ? "" : `${r.apurado_pct}% `}· ${r._n} cand · ${top}`);
      if (disputas.length === 0) console.error("  cabeçalho:", JSON.stringify(r._header));
      delete r._header; delete r._n;
      disputas.push(r);
    } catch (e) {
      falhas.push(`${race}:${uf} — ${e.message}`);
      console.error(`✗ ${race}:${uf} — ${e.message}`);
    }
  }
  const out = {
    nota: "Resultados oficiais do TSE (Divulgação de Resultados, https://resultados.tse.jus.br), por disputa. `validos` traz o percentual de votos válidos de cada candidato tal como o TSE publica; `totalizacao` diz se o TSE marcava a totalização como parcial ou final no momento da leitura (cabeçalho `tf`/`and`); `apurado_pct` é o percentual de seções totalizadas quando o arquivo o informa (o `-u` de 2026 não informa). Gerado por scripts/tse-resultados.mjs; nunca inferido.",
    turno: TURNO, eleicao: ele.data, atualizado_em: new Date().toISOString(),
    fonte: "https://resultados.tse.jus.br", falhas, disputas,
  };
  if (DRY) { console.log(JSON.stringify(out, null, 1).slice(0, 4000)); return; }
  fs.writeFileSync(OUT, JSON.stringify(out, null, 1) + "\n");
  console.error(`gravado ${OUT}: ${disputas.length} disputa(s), ${falhas.length} falha(s)`);
  if (!disputas.length) process.exit(1);
}

main().catch((e) => { console.error("ERRO:", e.message); process.exit(1); });
