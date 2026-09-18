import fs from "node:fs";
import path from "node:path";
import type { RaceKind, UF } from "./types";

/**
 * O FRESCOR DE UMA DISPUTA, dito ao leitor.
 *
 * Duas coisas distintas, cada uma com o seu sinal:
 *   · Há quanto tempo saiu a última pesquisa desta disputa — um fato da fonte,
 *     não do site. Uma corrida sem pesquisa há 40 dias tem uma média que vale
 *     menos, e o leitor precisa ver isso ao lado do número, não numa nota de
 *     rodapé.
 *   · Se a disputa está CONGELADA pelo guarda de delta (a "quarentena" de
 *     `scripts/disputa-delta-check.mjs`): a coleta desta rodada perdeu uma
 *     pergunta sem prova de sucessão e o site publica o dado do commit anterior
 *     até a verificação. Isso é um estado do site, e esconder o estado do site
 *     é o que tira credibilidade de um agregador.
 *
 * Os limiares são editoriais e ficam AQUI, num lugar só, para que o selo, a
 * metodologia e qualquer outro consumidor digam a mesma coisa.
 */
export const FRESCOR_ATENCAO_DIAS = 8;   // a partir daqui: "atenção"
export const FRESCOR_VELHO_DIAS = 21;    // a partir daqui: "sem pesquisa recente"

export type TomFrescor = "fresco" | "atencao" | "velho";

export interface Frescor {
  /** Dias entre a última pesquisa e a geração do banco (0 = mesmo dia). */
  dias: number;
  tom: TomFrescor;
  lastPollDate: string;
}

const DIA_MS = 864e5;

export function frescor(lastPollDate: string | null | undefined, generatedAt: string): Frescor | null {
  if (!lastPollDate) return null;
  const fim = Date.parse(`${lastPollDate}T00:00:00Z`);
  const agora = Date.parse(generatedAt);
  if (!Number.isFinite(fim) || !Number.isFinite(agora)) return null;
  const dias = Math.max(0, Math.floor((agora - fim) / DIA_MS));
  const tom: TomFrescor = dias >= FRESCOR_VELHO_DIAS ? "velho" : dias >= FRESCOR_ATENCAO_DIAS ? "atencao" : "fresco";
  return { dias, tom, lastPollDate };
}

export interface Quarentena {
  /** Data em que o guarda congelou a disputa (o `at` do conflito). */
  desde: string;
  /** Quantas perguntas sumiram sem prova nesta rodada. */
  perdas: number;
}

let cache: Map<string, Quarentena> | null = null;

/**
 * As disputas congeladas AGORA — lidas de `data/conflicts.ndjson`, que o guarda
 * regrava a cada rodada: uma linha `disputa_em_quarentena` por disputa congelada
 * e nenhuma quando a disputa está fresca (medido em 16/09/2026: a rodada 73
 * saiu com zero linhas depois de 14 na rodada anterior). Chave `cargo:UF`
 * ("presidente:BR", "governador:CE").
 */
export function quarentenas(): Map<string, Quarentena> {
  if (cache) return cache;
  const m = new Map<string, Quarentena>();
  const p = path.join(process.cwd(), "data", "conflicts.ndjson");
  if (fs.existsSync(p)) {
    for (const line of fs.readFileSync(p, "utf-8").split("\n")) {
      const t = line.trim();
      if (!t) continue;
      let c: { type?: string; record_id?: string; at?: string; note?: string };
      try { c = JSON.parse(t); } catch { continue; }
      if (c.type !== "disputa_em_quarentena" || !c.record_id) continue;
      const n = /(\d+) pergunta\(s\) sumiram/.exec(c.note ?? "");
      m.set(c.record_id, { desde: c.at ?? "", perdas: n ? Number(n[1]) : 0 });
    }
  }
  cache = m;
  return m;
}

export function quarentenaDe(race: RaceKind, uf: UF | null): Quarentena | null {
  return quarentenas().get(`${race}:${uf ?? "BR"}`) ?? null;
}
