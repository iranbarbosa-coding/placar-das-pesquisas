// O lado de leitura do CALENDÁRIO — o gêmeo de `rejection.ts`, também uma tabela
// separada: lê `data/calendar.ndjson` (a projeção do feed aberto do TSE/PesqEle
// escrita pela coleta) e NUNCA toca no store de voto. Cada registro é uma
// pesquisa registrada no TSE; a lei exige registro até 5 dias antes de divulgar,
// então um registro `scheduled_future` é uma pesquisa que ESTÁ PARA SAIR.
//
// DISCIPLINA (constraint 6): a projeção só traz dois estados verificáveis —
// `scheduled_future` (agendada) e `results_held` (já casa com pesquisa nossa).
// Um registro passado que não achamos publicado fica fora da projeção; ausência
// no nosso banco não é afirmação sobre o instituto.
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = path.join(process.cwd(), "data");

export type Cargo = "Presidente" | "Governador" | "Senador";
export type CalendarStatus = "scheduled_future" | "results_held";

export interface CalendarEntry {
  /** Protocolo do TSE como veio do feed (ex.: "BR078062026"). */
  protocolo: string | null;
  /** Chave normalizada (`UF<num>_<ano>`) usada para casar com nossas pesquisas. */
  registration_key: string | null;
  /** Nome do instituto em forma legível. */
  pollster: string;
  /** UF do registro ("BR" para presidencial nacional). */
  uf: string | null;
  /** Cargos do nosso escopo cobertos por este registro. */
  cargos: Cargo[];
  /** Data do registro no TSE (ISO). */
  dt_registro: string | null;
  /** Data prevista de divulgação (ISO) — a data do calendário. */
  dt_divulgacao: string | null;
  sample: number | null;
  status: CalendarStatus;
  /** id da pesquisa nossa, quando `results_held`. */
  poll_id: string | null;
}

function readNdjson<T>(file: string): T[] {
  if (!fs.existsSync(file)) return [];
  const text = fs.readFileSync(file, "utf-8");
  const rows: T[] = [];
  for (const [i, line] of text.split("\n").entries()) {
    const t = line.trim();
    if (!t) continue;
    try {
      rows.push(JSON.parse(t) as T);
    } catch (e) {
      throw new Error(`calendar.ndjson:${i + 1} — JSON inválido: ${(e as Error).message}`);
    }
  }
  return rows;
}

let cache: CalendarEntry[] | null = null;

/** Todos os registros do calendário, carregados uma vez. */
export function loadCalendar(dir: string = DATA_DIR): CalendarEntry[] {
  if (cache) return cache;
  cache = readNdjson<CalendarEntry>(path.join(dir, "calendar.ndjson"));
  return cache;
}

/**
 * As "Próximas pesquisas" — registros agendados (`scheduled_future`), ordenados
 * pela data prevista de divulgação (empate desfeito por instituto). `limit`
 * corta a lista; omitido, devolve todas.
 */
export function upcomingPolls(limit?: number): CalendarEntry[] {
  const up = loadCalendar()
    .filter((e) => e.status === "scheduled_future" && e.dt_divulgacao)
    .sort(
      (a, b) =>
        (a.dt_divulgacao ?? "").localeCompare(b.dt_divulgacao ?? "") ||
        a.pollster.localeCompare(b.pollster, "pt-BR"),
    );
  return typeof limit === "number" ? up.slice(0, limit) : up;
}

/** Quantas pesquisas estão agendadas (para rótulos/contadores). */
export function upcomingCount(): number {
  return loadCalendar().filter((e) => e.status === "scheduled_future").length;
}

/** A data de divulgação mais recente já observada — usada para legendar a fonte. */
export function calendarLastUpdated(): string | null {
  const dates = loadCalendar()
    .map((e) => e.dt_registro)
    .filter((d): d is string => Boolean(d))
    .sort();
  return dates.length ? dates[dates.length - 1] : null;
}
