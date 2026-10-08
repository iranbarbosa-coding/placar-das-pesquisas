/**
 * Apuração ao vivo do 1º turno presidencial, lida direto do site Resultados do
 * TSE (resultados.tse.jus.br) — os mesmos JSON públicos que alimentam o app
 * oficial. Dois arquivos bastam:
 *
 *  • br-c0001-e006257-u.json — votação nacional por candidato (cargo 1)
 *  • br-e006257-ab.json      — andamento da apuração por UF (+ ZZ exterior, BR)
 *
 * O TSE não manda cabeçalho CORS, então o navegador não lê esses arquivos
 * direto: a rota /api/apuracao.json busca aqui no servidor, normaliza e devolve.
 * Livre de `node:fs` — os tipos podem ser importados pelo componente cliente.
 */

const TSE = "https://resultados.tse.jus.br/oficial/ele2026/6257/dados/br";
const URL_PRES = `${TSE}/br-c0001-e006257-u.json`;
const URL_ABR = `${TSE}/br-e006257-ab.json`;

const UA = "Mozilla/5.0 (placardaspesquisas.com.br)";

/** Número do TSE vem como string, e os percentuais com VÍRGULA decimal
 *  ("47,862451432") — inclusive os campos "n", de precisão cheia. */
const num = (s: unknown) => {
  if (s == null || s === "") return 0;
  const n = Number(String(s).replace(",", "."));
  return Number.isFinite(n) ? n : 0;
};

export type Regiao = "Norte" | "Nordeste" | "Centro-Oeste" | "Sudeste" | "Sul";

export const REGIOES: Record<Regiao, string[]> = {
  Norte: ["AC", "AM", "AP", "PA", "RO", "RR", "TO"],
  Nordeste: ["AL", "BA", "CE", "MA", "PB", "PE", "PI", "RN", "SE"],
  "Centro-Oeste": ["DF", "GO", "MS", "MT"],
  Sudeste: ["ES", "MG", "RJ", "SP"],
  Sul: ["PR", "RS", "SC"],
};

export interface Andamento {
  /** Seções totalizadas / total de seções. */
  secoes: number;
  secoesTotal: number;
  /** % das seções totalizadas (0–100), a medida que o TSE chama de "apurado". */
  pct: number;
  /** Eleitorado total e eleitorado das seções já totalizadas. */
  eleitores: number;
  eleitoresApurados: number;
  /** Eleitores que compareceram nas seções já totalizadas. */
  comparecimento: number;
  /** Estimativa de votos ainda por apurar: eleitorado das seções não totalizadas
   *  × taxa de comparecimento observada nas já totalizadas. O TSE não publica
   *  esse número; é uma projeção, por isso aparece com "≈" na página. */
  votosAApurar: number;
}

const estimarRestante = (eleitores: number, apurados: number, comparec: number) =>
  apurados > 0 ? Math.round(((eleitores - apurados) * comparec) / apurados) : 0;

export interface Candidato {
  numero: string;
  nome: string;
  partido: string;
  votos: number;
  /** % dos votos válidos (0–100). */
  pct: number;
  /** Situação oficial ("Eleito", "2º turno"…) quando o TSE a declara. */
  situacao: string | null;
}

export interface Apuracao {
  /** Data e hora da última totalização ("04/10/2026 20:38:57", horário de Brasília). */
  atualizadoEm: string;
  nacional: Andamento & {
    validos: number;
    brancos: number;
    nulos: number;
    comparecimento: number;
    abstencao: number;
    /** O TSE marca quando o resultado já está matematicamente definido. */
    definido: boolean;
    /** Totalização encerrada. */
    final: boolean;
  };
  /** Lula e Flávio, nessa ordem — os dois do placar. */
  principais: Candidato[];
  /** Demais candidatos, por votos. */
  outros: Candidato[];
  regioes: (Andamento & { nome: Regiao })[];
  estados: (Andamento & { uf: string; regiao: Regiao })[];
  exterior: Andamento | null;
  /** Momento em que ESTE servidor leu o TSE (ISO). */
  lidoEm: string;
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function andamento(s: any, e: any): Andamento {
  const secoes = num(s?.st);
  const secoesTotal = num(s?.ts);
  const eleitores = num(e?.te);
  const eleitoresApurados = num(e?.est);
  const comparecimento = num(e?.c);
  return {
    secoes,
    secoesTotal,
    pct: s?.pstn != null ? num(s.pstn) : secoesTotal ? (100 * secoes) / secoesTotal : 0,
    eleitores,
    eleitoresApurados,
    comparecimento,
    votosAApurar: estimarRestante(eleitores, eleitoresApurados, comparecimento),
  };
}

function somar(lista: Andamento[]): Andamento {
  const t = lista.reduce(
    (a, x) => ({
      secoes: a.secoes + x.secoes,
      secoesTotal: a.secoesTotal + x.secoesTotal,
      eleitores: a.eleitores + x.eleitores,
      eleitoresApurados: a.eleitoresApurados + x.eleitoresApurados,
      comparecimento: a.comparecimento + x.comparecimento,
      // Soma das estimativas por UF: cada estado usa o próprio comparecimento.
      votosAApurar: a.votosAApurar + x.votosAApurar,
    }),
    { secoes: 0, secoesTotal: 0, eleitores: 0, eleitoresApurados: 0, comparecimento: 0, votosAApurar: 0 },
  );
  return { ...t, pct: t.secoesTotal ? (100 * t.secoes) / t.secoesTotal : 0 };
}

/** `fresco`: fura o cache (rota da API, lida a cada 20s pela CDN). Sem ele, a
 *  leitura entra no cache de dados do Next por 30s — é o que a página usa para
 *  o primeiro desenho, sem virar uma ida ao TSE por visitante. */
async function getJson(url: string, fresco: boolean): Promise<any> {
  const r = await fetch(
    fresco ? `${url}?t=${Date.now()}` : url,
    fresco
      ? { headers: { "User-Agent": UA, "Cache-Control": "no-cache" }, cache: "no-store" }
      : { headers: { "User-Agent": UA }, next: { revalidate: 30 } },
  );
  if (!r.ok) throw new Error(`TSE respondeu ${r.status} em ${url}`);
  return r.json();
}

const REGIAO_DA_UF: Record<string, Regiao> = Object.fromEntries(
  (Object.entries(REGIOES) as [Regiao, string[]][]).flatMap(([r, ufs]) => ufs.map((uf) => [uf, r])),
);

export async function lerApuracao({ fresco = true } = {}): Promise<Apuracao> {
  const [pres, ab] = await Promise.all([getJson(URL_PRES, fresco), getJson(URL_ABR, fresco)]);

  const cargo = pres.carg?.[0];
  const cands: Candidato[] = [];
  for (const agr of cargo?.agr ?? [])
    for (const par of agr.par ?? [])
      for (const c of par.cand ?? [])
        cands.push({
          numero: String(c.n),
          nome: c.nmu ?? c.nm,
          partido: par.sg ?? agr.com ?? "",
          votos: num(c.vap),
          pct: num(c.pvapn),
          situacao: c.st ? String(c.st) : c.e === "s" ? "Eleito" : null,
        });
  cands.sort((a, b) => b.votos - a.votos);

  const lula = cands.find((c) => c.numero === "13");
  const flavio = cands.find((c) => c.numero === "22");
  const principais = [lula, flavio].filter(Boolean) as Candidato[];
  const outros = cands.filter((c) => c !== lula && c !== flavio);

  const v = pres.v ?? {};
  const e = pres.e ?? {};
  const nacional = {
    ...andamento(pres.s, e),
    validos: num(v.vv),
    brancos: num(v.vb),
    nulos: num(v.tvn),
    abstencao: num(e.a),
    definido: pres.md === "s",
    final: pres.tf === "s",
  };

  const estados: Apuracao["estados"] = [];
  let exterior: Andamento | null = null;
  for (const a of ab.abr ?? []) {
    const uf = String(a.cdabr).toUpperCase();
    if (uf === "ZZ") exterior = andamento(a.s, a.e);
    else if (REGIAO_DA_UF[uf]) estados.push({ uf, regiao: REGIAO_DA_UF[uf], ...andamento(a.s, a.e) });
  }
  estados.sort((x, y) => x.uf.localeCompare(y.uf));

  const regioes = (Object.keys(REGIOES) as Regiao[]).map((nome) => ({
    nome,
    ...somar(estados.filter((s) => s.regiao === nome)),
  }));

  return {
    atualizadoEm: `${pres.dt ?? pres.dg} ${pres.ht ?? pres.hg}`,
    nacional,
    principais,
    outros,
    regioes,
    estados,
    exterior,
    lidoEm: new Date().toISOString(),
  };
}
