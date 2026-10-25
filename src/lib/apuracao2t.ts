/**
 * Apuração ao vivo do 2º turno presidencial (25/10/2026): Lula × Flávio
 * Bolsonaro, lida dos JSON públicos do site Resultados do TSE (eleição 6258,
 * código documentado em scripts/tse-resultados.mjs). Três tipos de arquivo:
 *
 *  • br/br-c0001-e006258-u.json   — votação nacional por candidato
 *  • br/br-e006258-ab.json        — andamento da apuração por UF
 *  • <uf>/<uf>-c0001-e006258-u.json — votação de cada UF (quem lidera onde)
 *
 * Mesma leitura (andamento, vírgula decimal, cache) do 1º turno em apuracao.ts.
 * Recusa o que não reconhece: se o arquivo nacional não trouxer exatamente os
 * candidatos 13 e 22, a página mostra "aguardando o TSE" em vez de números.
 * Livre de `node:fs` — os tipos podem ser importados pelo componente cliente.
 */
import { andamento, getJson, num, REGIAO_DA_UF, REGIOES, somar, type Andamento, type Regiao } from "./apuracao";
import type { AndamentoMun, ChanceVitoria, ContadosUf, T1Municipios } from "./chance-vitoria";

export const ELEICAO_2T = 6258;
// APURACAO_2T_TSE troca a origem só em teste local (scripts/apuracao2t-e2e.mjs
// serve arquivos no formato do TSE); em produção não é definida.
const TSE = `${process.env.APURACAO_2T_TSE ?? "https://resultados.tse.jus.br"}/oficial/ele2026/${ELEICAO_2T}`;
const arq = (uf: string) => `${TSE}/dados/${uf}/${uf}-c0001-e00${ELEICAO_2T}-u.json`;
const URL_ABR = `${TSE}/dados/br/br-e00${ELEICAO_2T}-ab.json`;
/** Andamento por município de uma UF (zz = exterior). */
const abUf = (uf: string) => `${TSE}/dados/${uf}/${uf}-e00${ELEICAO_2T}-ab.json`;

/** 2º turno estadual (governador, cargo 3). */
export const ELEICAO_2T_UF = 6260;
const TSE_UF = `${process.env.APURACAO_2T_TSE ?? "https://resultados.tse.jus.br"}/oficial/ele2026/${ELEICAO_2T_UF}`;
const arqGov = (uf: string) => `${TSE_UF}/dados/${uf}/${uf}-c0003-e00${ELEICAO_2T_UF}-u.json`;
const abGov = (uf: string) => `${TSE_UF}/dados/${uf}/${uf}-e00${ELEICAO_2T_UF}-ab.json`;

/** Candidato num 2º turno de governador. */
export interface VotoGov {
  numero: string;
  nome: string;
  partido: string;
  sq: string;
  votos: number;
  pct: number;
  eleito: boolean;
}

/** Um bloco de governador: os dois finalistas (ordem fixa, de data/apuracao/t1-governador.json). */
export interface Gov2T {
  uf: string;
  andamento: Andamento;
  candidatos: [VotoGov, VotoGov];
  /** `flavio` = chance do 2º candidato, `lula` = do 1º (mesma conta do presidente). */
  chance: ChanceVitoria | null;
  /** Por que não há chance neste estado (ex.: DF, um só município). */
  semChance?: string;
  aguardando?: boolean;
  final: boolean;
}

export interface Voto2T {
  /** "13" (Lula) ou "22" (Flávio Bolsonaro). */
  numero: "13" | "22";
  nome: string;
  partido: string;
  sq: string;
  votos: number;
  /** % dos votos válidos (0–100). */
  pct: number;
  eleito: boolean;
}

/** Quem lidera numa UF; null antes do primeiro voto ou em empate exato. */
export type Lider = "13" | "22" | null;

export interface Estado2T extends Andamento {
  uf: string;
  regiao: Regiao;
  lula: number;
  flavio: number;
  /** % dos válidos de cada um na UF (0–100). */
  lulaPct: number;
  flavioPct: number;
  lider: Lider;
  /** Falha na leitura do arquivo da UF: mostra só o andamento, sem cor de líder. */
  semVotos?: boolean;
}

export interface Apuracao2T {
  atualizadoEm: string;
  nacional: Andamento & {
    validos: number;
    brancos: number;
    nulos: number;
    abstencao: number;
    definido: boolean;
    final: boolean;
  };
  /** Lula e Flávio, nessa ordem. */
  lula: Voto2T;
  flavio: Voto2T;
  estados: Estado2T[];
  regioes: (Andamento & { nome: Regiao })[];
  exterior: Andamento | null;
  /** 2º turno de governador (AC, AM, DF, ES, RN, TO), um bloco por UF. */
  governadores: Gov2T[];
  /** Chance de vitória ao vivo (src/lib/chance-vitoria.ts); null antes da 1ª
   *  seção, na totalização final ou quando falta algum arquivo do TSE. */
  chance: ChanceVitoria | null;
  lidoEm: string;
}

/** Resposta da rota quando o TSE ainda não publicou (ou publicou algo irreconhecível). */
export interface Aguardando2T {
  aguardando: true;
  motivo: string;
  governadores?: Gov2T[];
  lidoEm: string;
}

export type Leitura2T = Apuracao2T | Aguardando2T;

/* eslint-disable @typescript-eslint/no-explicit-any */
function votosDe(doc: any): Map<string, Voto2T> {
  const m = new Map<string, Voto2T>();
  for (const agr of doc?.carg?.[0]?.agr ?? [])
    for (const par of agr.par ?? [])
      for (const c of par.cand ?? []) {
        const n = String(c.n);
        if (n !== "13" && n !== "22") continue;
        m.set(n, {
          numero: n,
          nome: c.nmu ?? c.nm,
          partido: par.sg ?? agr.com ?? "",
          sq: String(c.sqcand ?? ""),
          votos: num(c.vap),
          pct: num(c.pvapn),
          eleito: c.e === "s" || /eleito/i.test(String(c.st ?? "")),
        });
      }
  return m;
}

/** Os dois do 2º turno, e só eles; qualquer outra coisa é recusada. */
function confere(doc: any): { lula: Voto2T; flavio: Voto2T } | string {
  const total = (doc?.carg?.[0]?.agr ?? []).flatMap((a: any) => (a.par ?? []).flatMap((p: any) => p.cand ?? [])).length;
  const m = votosDe(doc);
  const lula = m.get("13");
  const flavio = m.get("22");
  if (!lula || !flavio) return "o arquivo do TSE não traz os candidatos 13 e 22";
  if (total !== 2) return `o arquivo do TSE traz ${total} candidatos, não os 2 do 2º turno`;
  return { lula, flavio };
}

const lider = (l: number, f: number): Lider => (l > f ? "13" : f > l ? "22" : null);

/** Empilha uma leitura numa lista de chamadas, com no máximo `n` em voo ao mesmo tempo. */
async function emLotes<T, R>(itens: T[], n: number, f: (x: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(itens.length);
  let i = 0;
  await Promise.all(
    Array.from({ length: n }, async () => {
      while (i < itens.length) {
        const k = i++;
        out[k] = await f(itens[k]);
      }
    }),
  );
  return out;
}

export async function lerApuracao2T({ fresco = true } = {}): Promise<Leitura2T> {
  const lidoEm = new Date().toISOString();
  let br: any, ab: any;
  try {
    [br, ab] = await Promise.all([getJson(arq("br"), fresco), getJson(URL_ABR, fresco)]);
  } catch (e) {
    // Antes da abertura o TSE ainda não publica os arquivos do 2º turno.
    return { aguardando: true, motivo: String((e as Error).message ?? e), lidoEm, governadores: await lerGovernadores2T(fresco) };
  }
  const ok = confere(br);
  if (typeof ok === "string") return { aguardando: true, motivo: ok, lidoEm, governadores: await lerGovernadores2T(fresco) };
  const governadores = lerGovernadores2T(fresco);

  const andamentoUf = new Map<string, Andamento>();
  let exterior: Andamento | null = null;
  for (const a of ab.abr ?? []) {
    const uf = String(a.cdabr).toUpperCase();
    if (uf === "ZZ") exterior = andamento(a.s, a.e);
    else if (REGIAO_DA_UF[uf]) andamentoUf.set(uf, andamento(a.s, a.e));
  }

  const ufs = Object.keys(REGIAO_DA_UF).sort();
  // Andamento por município, para a chance de vitória. Se uma UF falhar, a conta
  // não sai (melhor nada que uma chance calculada sem parte do país).
  const municipios = (async () => {
    const m = new Map<string, AndamentoMun>();
    let completo = true;
    await emLotes([...ufs.map((u) => u.toLowerCase()), "zz"], 9, async (uf) => {
      try {
        const d = await getJson(abUf(uf), fresco);
        for (const a of d.abr ?? [])
          if (a.tpabr === "mun") m.set(`${uf}${a.cdabr}`, { te: num(a.e?.te), est: num(a.e?.est), c: num(a.e?.c) });
      } catch {
        completo = false;
      }
    });
    return completo ? m : null;
  })();
  const estados = await emLotes(ufs, 9, async (uf): Promise<Estado2T> => {
    const base = andamentoUf.get(uf);
    try {
      const doc = await getJson(arq(uf.toLowerCase()), fresco);
      const v = confere(doc);
      if (typeof v === "string") throw new Error(v);
      return {
        uf,
        regiao: REGIAO_DA_UF[uf],
        // O arquivo da própria UF é mais novo ou igual ao de andamento; vale ele.
        ...andamento(doc.s, doc.e),
        lula: v.lula.votos,
        flavio: v.flavio.votos,
        lulaPct: v.lula.pct,
        flavioPct: v.flavio.pct,
        lider: lider(v.lula.votos, v.flavio.votos),
      };
    } catch {
      return {
        uf,
        regiao: REGIAO_DA_UF[uf],
        ...(base ?? andamento(null, null)),
        lula: 0,
        flavio: 0,
        lulaPct: 0,
        flavioPct: 0,
        lider: null,
        semVotos: true,
      };
    }
  });

  const regioes = (Object.keys(REGIOES) as Regiao[]).map((nome) => ({
    nome,
    ...somar(estados.filter((s) => s.regiao === nome)),
  }));

  const v = br.v ?? {};
  const e = br.e ?? {};
  let chance: ChanceVitoria | null = null;
  if (num(br.s?.st) > 0 && br.tf !== "s" && estados.every((s) => !s.semVotos)) {
    const { chanceDeVitoria } = await import("./chance-vitoria");
    const { default: t1 } = await import("../../data/apuracao/t1-municipios.json");
    const { kappa } = await import("../../data/apuracao/chance-config.json");
    const mun = await municipios;
    const porUf = new Map<string, ContadosUf>(estados.map((s) => [s.uf.toLowerCase(), { lula: s.lula, flavio: s.flavio, c: s.comparecimento }]));
    if (mun)
      chance = chanceDeVitoria(t1 as unknown as T1Municipios, mun, porUf, { lula: ok.lula.votos, flavio: ok.flavio.votos }, kappa);
  }
  return {
    // Só a hora da TOTALIZAÇÃO (dt/ht); antes da 1ª seção o TSE manda esses campos
    // vazios e a página não mostra hora nenhuma (dg/hg é só a geração do arquivo).
    atualizadoEm: br.dt && br.ht ? `${br.dt} ${br.ht}` : "",
    nacional: {
      ...andamento(br.s, e),
      validos: num(v.vv),
      brancos: num(v.vb),
      nulos: num(v.tvn),
      abstencao: num(e.a),
      definido: br.md === "s",
      final: br.tf === "s",
    },
    lula: ok.lula,
    flavio: ok.flavio,
    estados,
    regioes,
    exterior,
    governadores: await governadores,
    chance,
    lidoEm,
  };
}

/** Candidaturas do 2º turno (data/candidaturas.ndjson): o placar e as fotos
 *  aparecem antes do primeiro arquivo do TSE. */
export const CANDIDATOS_2T = {
  "13": { nome: "Lula", partido: "PT", sq: "280002542548" },
  "22": { nome: "Flávio Bolsonaro", partido: "PL", sq: "280002551544" },
} as const;

/** Apuração "zerada" — o desenho da página antes de o TSE publicar o 2º turno.
 *  Não é dado: todos os números são zero e a página diz que aguarda o TSE. */
export function vazio2T(lidoEm: string): Apuracao2T {
  const zero = andamento(null, null);
  const cand = (n: "13" | "22"): Voto2T => ({ numero: n, ...CANDIDATOS_2T[n], votos: 0, pct: 0, eleito: false });
  const estados = Object.keys(REGIAO_DA_UF)
    .sort()
    .map((uf) => ({ uf, regiao: REGIAO_DA_UF[uf], ...zero, lula: 0, flavio: 0, lulaPct: 0, flavioPct: 0, lider: null }));
  return {
    atualizadoEm: "",
    nacional: { ...zero, validos: 0, brancos: 0, nulos: 0, abstencao: 0, definido: false, final: false },
    lula: cand("13"),
    flavio: cand("22"),
    estados,
    regioes: (Object.keys(REGIOES) as Regiao[]).map((nome) => ({ nome, ...zero })),
    exterior: null,
    governadores: [],
    chance: null,
    lidoEm,
  };
}

/** Governadores: cada UF é lida à parte; uma falha deixa só aquele bloco em espera. */
export async function lerGovernadores2T(fresco: boolean): Promise<Gov2T[]> {
  const { default: base } = await import("../../data/apuracao/t1-governador.json");
  const { kappa_governador } = await import("../../data/apuracao/chance-config.json");
  const ufs = base.ufs as unknown as Record<string, { candidatos: { sq: string; n: string; nome: string; partido: string }[]; mun: T1Municipios["mun"] }>;
  return Promise.all(
    Object.entries(ufs).map(async ([uf, b]): Promise<Gov2T> => {
      const zero = (c: (typeof b.candidatos)[number]): VotoGov => ({ numero: c.n, nome: c.nome, partido: c.partido, sq: c.sq, votos: 0, pct: 0, eleito: false });
      const semChance = Object.keys(b.mun).length < 2 ? "O DF é um só município para o TSE: não há padrão por município para projetar o que falta." : undefined;
      const espera: Gov2T = {
        uf: uf.toUpperCase(),
        andamento: andamento(null, null),
        candidatos: [zero(b.candidatos[0]), zero(b.candidatos[1])],
        chance: null,
        semChance,
        aguardando: true,
        final: false,
      };
      let doc: any;
      try {
        doc = await getJson(arqGov(uf), fresco);
      } catch {
        return espera;
      }
      const lidos = new Map<string, VotoGov>();
      let total = 0;
      for (const agr of doc?.carg?.[0]?.agr ?? [])
        for (const par of agr.par ?? [])
          for (const c of par.cand ?? []) {
            total++;
            lidos.set(String(c.sqcand), {
              numero: String(c.n),
              nome: c.nmu ?? c.nm,
              partido: par.sg ?? agr.com ?? "",
              sq: String(c.sqcand),
              votos: num(c.vap),
              pct: num(c.pvapn),
              eleito: c.e === "s" || /eleito/i.test(String(c.st ?? "")),
            });
          }
      const a = lidos.get(b.candidatos[0].sq);
      const z = lidos.get(b.candidatos[1].sq);
      // Recusa o que não reconhece: exatamente os dois finalistas esperados.
      if (!a || !z || total !== 2) return espera;
      const and = andamento(doc.s, doc.e);
      const final = doc.tf === "s";
      let chance: ChanceVitoria | null = null;
      if (!semChance && and.secoes > 0 && !final) {
        try {
          const ab = await getJson(abGov(uf), fresco);
          const mun = new Map<string, AndamentoMun>();
          for (const x of ab.abr ?? [])
            if (x.tpabr === "mun") mun.set(`${uf}${x.cdabr}`, { te: num(x.e?.te), est: num(x.e?.est), c: num(x.e?.c) });
          const { chanceDeVitoria } = await import("./chance-vitoria");
          chance = chanceDeVitoria(
            { mun: b.mun },
            mun,
            new Map([[uf, { lula: a.votos, flavio: z.votos, c: and.comparecimento }]]),
            { lula: a.votos, flavio: z.votos },
            kappa_governador,
            // Um estado só: a variação do estado é a "nacional", amortecida em escala estadual.
            { kNacional: 30_000 },
          );
        } catch {
          chance = null;
        }
      }
      return { uf: uf.toUpperCase(), andamento: and, candidatos: [a, z], chance, semChance, final };
    }),
  );
}
