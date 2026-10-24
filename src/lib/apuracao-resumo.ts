/**
 * Resumo da apuração do 2º turno para PRÉVIAS de link (WhatsApp, X, Telegram):
 * título, descrição e os números do cartão-imagem. Uma regra só, usada pelos
 * metadados de /apuracao e pela rota do cartão (/apuracao-cartao). Pedido do
 * criador, 24/10/2026: "o link já expande com o principal".
 */
import type { Leitura2T } from "./apuracao2t";

const pct = (n: number, casas = 1) => n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });
const chance = (p: number) => (p >= 0.995 ? ">99%" : p <= 0.005 ? "<1%" : `${Math.round(p * 100)}%`);
/** "PROFESSORA DORINHA" → "Professora Dorinha". */
const titulo = (s: string) =>
  s
    .toLowerCase()
    .split(" ")
    .map((w) => (["de", "da", "do", "dos", "das", "e"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");

/** Nome curto para a prévia: primeiro nome sem o título ("Professora Dorinha" → "Dorinha",
 *  "Cadu de Lula" → "Cadu"), para não confundir com o sobrenome de outro candidato. */
const TITULOS = new Set(["professora", "professor", "delegado", "delegada", "coronel", "pastor", "pastora", "doutor", "doutora", "dr.", "dra.", "capitão", "general", "sargento", "cabo"]);
const curto = (s: string) => {
  const p = titulo(s).split(" ");
  const i = p.findIndex((w) => !TITULOS.has(w.toLowerCase()));
  return p[Math.max(0, i)];
};

export type Fase = "antes" | "aoVivo" | "final";

export interface Resumo {
  fase: Fase;
  titulo: string;
  descricao: string;
  /** Marca que muda a cada nova totalização — vai na URL do cartão para furar caches. */
  versao: string;
  placar: { lula: number; flavio: number; apurado: number } | null;
  chance: { lula: number; flavio: number; projecaoLula: number; projecaoFlavio: number } | null;
  eleito: "Lula" | "Flávio Bolsonaro" | null;
}

export function resumoApuracao(d: Leitura2T | null): Resumo {
  if (!d || "aguardando" in d || d.nacional.secoes === 0) {
    return {
      fase: "antes",
      titulo: "Apuração ao vivo do 2º turno · domingo, 25/10, a partir das 17h",
      descricao:
        "Lula × Flávio Bolsonaro e os governadores de AC, AM, DF, ES, RN e TO, direto do TSE a cada 30 segundos — com a chance de vitória em tempo real, que considera as urnas que ainda faltam apurar.",
      versao: "antes",
      placar: null,
      chance: null,
      eleito: null,
    };
  }
  const n = d.nacional;
  const placar = { lula: d.lula.pct, flavio: d.flavio.pct, apurado: n.pct };
  const eleito = d.lula.eleito ? "Lula" : d.flavio.eleito ? "Flávio Bolsonaro" : null;
  const final = n.final || eleito != null;
  const lider = d.flavio.votos >= d.lula.votos ? ["Flávio", d.flavio.pct, "Lula", d.lula.pct] : ["Lula", d.lula.pct, "Flávio", d.flavio.pct];
  const placarTxt = `${lider[0]} ${pct(lider[1] as number, 2)}% × ${lider[2]} ${pct(lider[3] as number, 2)}%`;
  const govs = d.governadores
    .filter((g) => !g.aguardando && g.andamento.secoes > 0)
    .map((g) => {
      const [a, b] = g.candidatos;
      const l = a.votos >= b.votos ? a : b;
      return `${g.uf} ${curto(l.nome)} ${Math.round(l.pct)}%`;
    });
  const c = d.chance;
  if (final) {
    return {
      fase: "final",
      titulo: eleito ? `${eleito} eleito presidente · ${placarTxt}` : `Resultado do 2º turno · ${placarTxt}`,
      descricao: `${pct(n.pct, 2)}% das seções apuradas (TSE).${govs.length ? ` Governadores: ${govs.join(" · ")}.` : ""}`,
      versao: `f${n.secoes}`,
      placar,
      chance: null,
      eleito,
    };
  }
  return {
    fase: "aoVivo",
    titulo: `Apuração ao vivo: ${placarTxt} · ${pct(n.pct)}% apurado`,
    descricao: [
      c
        ? `Chance de vitória (experimental): Lula ${chance(c.lula)} · Flávio ${chance(c.flavio)}; final projetado ${pct(c.projecaoLula)}% × ${pct(c.projecaoFlavio)}%.`
        : null,
      govs.length ? `Governadores: ${govs.join(" · ")}.` : null,
      "Dados do TSE a cada 30 segundos.",
    ]
      .filter(Boolean)
      .join(" "),
    versao: `v${n.secoes}`,
    placar,
    chance: c ? { lula: c.lula, flavio: c.flavio, projecaoLula: c.projecaoLula, projecaoFlavio: c.projecaoFlavio } : null,
    eleito,
  };
}

export { chance as fmtChance, pct as fmtPctBr };
