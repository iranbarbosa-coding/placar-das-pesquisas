// O CALENDÁRIO DE PESQUISAS — projeção determinística de `data/calendar.ndjson`.
//
// Espelha `writeRejectionProjection`: a coleta escreve este arquivo, o site o lê
// direto (lib/calendar.ts), e ele NÃO é tabela do store de voto — mantém o store
// uma função pura de `polls`. A fonte é o feed aberto do TSE (PesqEle), que lista
// TODA pesquisa registrada em 2026 com a data prevista de divulgação. Como a lei
// exige registro até 5 dias antes de divulgar, um registro cuja divulgação ainda
// não chegou é uma pesquisa que ESTÁ PARA SAIR — o "Próximas pesquisas".
//
// DISCIPLINA (constraint 6): a AUSÊNCIA de uma pesquisa no nosso banco NÃO é
// prova sobre o instituto. Por isso só projetamos dois estados verificáveis:
//   · scheduled_future  — divulgação prevista no futuro (a agenda)
//   · results_held      — o registro já casa com uma pesquisa nossa (podemos linkar)
// Registros passados que não achamos ficam DE FORA da projeção (não são "o
// instituto escondeu"; são majoritariamente cargos/UFs que nem cobrimos).
import fs from "node:fs";
import path from "node:path";

/** Só estes cargos entram — o mesmo escopo do resto do site. */
const CARGOS_NOSSOS = ["Presidente", "Governador", "Senador"];

/** Normaliza qualquer registro TSE a uma chave `UF<num>_<ano>`, sem separadores
 *  nem zeros à esquerda, para casar `AC094662026` (feed) com `BR-00976/2026`
 *  (nosso). */
export function normalizeReg(s) {
  if (!s) return null;
  const t = String(s).toUpperCase().replace(/[^A-Z0-9]/g, "");
  const m = /^([A-Z]{2})0*(\d+?)(\d{4})$/.exec(t);
  if (!m) return t || null;
  return `${m[1]}${String(Number(m[2]))}_${m[3]}`;
}

/** `2026-08-27 00:00:00` ou `27/08/2026` → `2026-08-27`. */
function toISODate(s) {
  if (!s) return null;
  const iso = /^(\d{4})-(\d{2})-(\d{2})/.exec(s);
  if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
  const br = /^(\d{2})\/(\d{2})\/(\d{4})/.exec(s);
  return br ? `${br[3]}-${br[2]}-${br[1]}` : null;
}

/** Nome legal do TSE → forma legível ("QUAEST ... LTDA." → "Quaest ... "). Uma
 *  limpeza leve; o mapeamento fino para o nome canônico do instituto fica para
 *  depois. */
function cleanPollster(raw) {
  if (!raw) return "";
  let s = raw
    .replace(/[.,;]+$/g, "")
    .replace(/\b(LTDA|S\.?\/?A|ME|EPP|EIRELI|EI)\.?\s*$/gi, "")
    .replace(/[.,;]+$/g, "")
    .trim();
  s = s.toLocaleLowerCase("pt-BR").replace(/\b([a-zà-ú])/g, (c) => c.toLocaleUpperCase("pt-BR"));
  return s.replace(/\s{2,}/g, " ").trim();
}

/** Os cargos do nosso escopo presentes na string `DS_CARGO` do TSE (que pode
 *  listar vários: "Governador, Senador, Deputado Federal"). */
function cargosRelevantes(dsCargo) {
  if (!dsCargo) return [];
  const norm = dsCargo.toLocaleLowerCase("pt-BR");
  return CARGOS_NOSSOS.filter((c) => norm.includes(c.toLocaleLowerCase("pt-BR")));
}

/**
 * Constrói os registros do calendário a partir do feed do TSE + das pesquisas
 * que já temos. `todayStr` é injetado (determinismo/testes).
 */
export function buildCalendar(tseRecords, polls, todayStr) {
  const nossos = new Map();
  for (const p of polls) {
    const k = normalizeReg(p.tse_registration);
    if (k && !nossos.has(k)) nossos.set(k, p);
  }

  // O feed lista o MESMO registro em várias linhas (uma por cargo/arquivo de UF),
  // então colapsamos por chave de registro, unindo os cargos do nosso escopo.
  const byKey = new Map();
  for (const r of tseRecords ?? []) {
    const cargos = cargosRelevantes(r.cargo);
    if (!cargos.length) continue; // fora do nosso escopo (dep. estadual/federal etc.)
    const key = normalizeReg(r.protocolo);
    if (!key) continue;
    const divulgacao = toISODate(r.dt_divulgacao);
    const matched = nossos.get(key);

    let status;
    if (matched) status = "results_held";
    else if (divulgacao && divulgacao > todayStr) status = "scheduled_future";
    else continue; // passado sem match: NÃO projetamos (constraint 6)

    const prev = byKey.get(key);
    if (prev) {
      for (const c of cargos) if (!prev.cargos.includes(c)) prev.cargos.push(c);
      continue;
    }
    byKey.set(key, {
      protocolo: r.protocolo ?? null,
      registration_key: key,
      pollster: cleanPollster(r.pollster),
      pollster_raw: r.pollster ?? null,
      uf: r.uf || null,
      cargos: [...cargos],
      dt_registro: toISODate(r.dt_registro),
      dt_divulgacao: divulgacao,
      sample: r.sample ?? null,
      status,
      poll_id: matched?.id ?? null,
    });
  }
  // Cargos numa ordem estável (a do nosso escopo), não a de chegada.
  for (const rec of byKey.values()) {
    rec.cargos = CARGOS_NOSSOS.filter((c) => rec.cargos.includes(c));
  }
  return [...byKey.values()];
}

/** Serializa um registro com chaves em ordem estável. */
function serializar(r) {
  return JSON.stringify({
    protocolo: r.protocolo,
    registration_key: r.registration_key,
    pollster: r.pollster,
    pollster_raw: r.pollster_raw,
    uf: r.uf,
    cargos: r.cargos,
    dt_registro: r.dt_registro,
    dt_divulgacao: r.dt_divulgacao,
    sample: r.sample,
    status: r.status,
    poll_id: r.poll_id,
  });
}

/**
 * Grava `<dir>/calendar.ndjson`, ordenado por (data de divulgação, protocolo)
 * para uma saída byte-a-byte estável. Retorna contagens para o log da coleta.
 */
export function writeCalendarProjection(dir, tseRecords, polls, todayStr) {
  const registros = buildCalendar(tseRecords, polls, todayStr);
  registros.sort(
    (a, b) =>
      (a.dt_divulgacao ?? "").localeCompare(b.dt_divulgacao ?? "") ||
      (a.protocolo ?? "").localeCompare(b.protocolo ?? ""),
  );
  const texto = registros.map(serializar).join("\n") + (registros.length ? "\n" : "");
  fs.writeFileSync(path.join(dir, "calendar.ndjson"), texto);
  return {
    count: registros.length,
    upcoming: registros.filter((r) => r.status === "scheduled_future").length,
    released: registros.filter((r) => r.status === "results_held").length,
  };
}
