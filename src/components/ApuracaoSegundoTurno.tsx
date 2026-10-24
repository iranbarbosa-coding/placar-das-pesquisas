"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AoVivo, Barra, CardHead, int, pct, useAoVivo } from "@/components/ApuracaoLive";
import { CANDIDATOS_2T, vazio2T, type Apuracao2T, type Estado2T, type Leitura2T, type Voto2T } from "@/lib/apuracao2t";
import { UF_NAMES, type UF } from "@/lib/types";

/**
 * Landing da apuração do 2º turno (Lula × Flávio Bolsonaro). Mesma casca ao
 * vivo da página do 1º turno (relê /api/apuracao-2t.json a cada 30s). Cor por
 * pessoa como no resto do site: Lula vermelho, Flávio azul. No mapa, cada UF
 * parte do branco e ganha a cor de quem lidera ali conforme o % apurado chega
 * a 100 (pedido do criador, 24/10/2026).
 */

const COR: Record<"13" | "22", string> = { "13": "var(--cand-red)", "22": "var(--cand-blue)" };
const NOME: Record<"13" | "22", string> = { "13": "Lula", "22": "Flávio Bolsonaro" };

/** Intensidade da cor da UF: o % apurado, com piso de 15% assim que há voto —
 *  com 2% apurado já dá para ver quem está na frente, sem parecer terminado. */
const intensidade = (s: Estado2T) => (s.secoes > 0 ? 15 + 0.85 * Math.min(100, s.pct) : 0);
const corLider = (s: Estado2T) => (s.lider ? COR[s.lider] : "var(--pmap-tie)");
const corUf = (s: Estado2T) => `color-mix(in srgb, ${corLider(s)} ${intensidade(s).toFixed(1)}%, var(--apur-vazio))`;

/* ───────────────────────── Foto ───────────────────────── */

// Fotos oficiais de candidatura do Portal de Dados Abertos do TSE, gravadas em
// public/candidatos/<sq>.jpg por scripts/fotos-candidatos.mjs. Se faltar, ficam
// as iniciais — nenhuma foto de outra fonte.
const fotos = (sq: string) => [`/candidatos/${sq}.jpg`];

function Foto({ c, lado }: { c: Voto2T; lado: number }) {
  const lista = fotos(c.sq || CANDIDATOS_2T[c.numero].sq);
  const [i, setI] = useState(0);
  const [carregou, setCarregou] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // A imagem do HTML do servidor pode falhar ANTES da hidratação (o onError não
  // dispara): confere o estado dela ao montar.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) el.naturalWidth > 0 ? setCarregou(true) : setI((k) => k + 1);
  }, [i]);
  const cor = COR[c.numero];
  const iniciais = NOME[c.numero]
    .split(" ")
    .map((w) => w[0])
    .slice(0, 2)
    .join("");
  return (
    <div
      className="relative shrink-0 overflow-hidden rounded-full"
      style={{ width: lado, height: lado, boxShadow: `0 0 0 3px ${cor}`, background: "var(--surface-2)" }}
    >
      {/* Iniciais por baixo; a foto cobre quando (e se) carregar. */}
      <span aria-hidden className="absolute inset-0 flex items-center justify-center font-extrabold" style={{ color: cor, fontSize: lado * 0.36 }}>
        {iniciais}
      </span>
      {i < lista.length && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          ref={img}
          key={lista[i]}
          src={lista[i]}
          alt={`Foto de ${NOME[c.numero]}`}
          width={lado}
          height={lado}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ opacity: carregou ? 1 : 0, objectPosition: "50% 35%" }}
          onLoad={() => setCarregou(true)}
          onError={() => setI((k) => k + 1)}
        />
      )}
    </div>
  );
}

/* ───────────────────────── Placar ───────────────────────── */

function Lado({ c, alinhar, lidera }: { c: Voto2T; alinhar: "left" | "right"; lidera: boolean }) {
  const direita = alinhar === "right";
  return (
    <div className={`flex min-w-0 flex-col gap-2 sm:flex-row sm:items-center sm:gap-3 ${direita ? "items-end sm:flex-row-reverse" : "items-start"}`}>
      <Foto c={c} lado={76} />
      <div className={`min-w-0 ${direita ? "text-right" : ""}`}>
        <div className="text-sm font-bold sm:text-base" style={{ color: "var(--text-primary)" }}>
          {NOME[c.numero]}
        </div>
        <div className="text-xs" style={{ color: "var(--text-muted)" }}>
          {c.partido} · {c.numero}
          {c.eleito ? (
            <span className="ml-1.5 rounded px-1.5 py-0.5 font-bold uppercase" style={{ background: COR[c.numero], color: c.numero === "13" ? "var(--cand-red-ink)" : "#fff" }}>
              Eleito
            </span>
          ) : (
            lidera && (
              <span className="ml-1.5 rounded px-1.5 py-0.5 font-semibold uppercase" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                à frente
              </span>
            )
          )}
        </div>
        <div className="tabular mt-1 font-extrabold leading-none" style={{ color: COR[c.numero], fontSize: "clamp(2.2rem, 8vw, 4rem)" }}>
          {pct(c.pct)}
          <span style={{ fontSize: "0.5em" }}>%</span>
        </div>
        <div className="tabular mt-1 text-xs font-semibold sm:text-sm" style={{ color: "var(--text-secondary)" }}>
          {int(c.votos)} votos
        </div>
      </div>
    </div>
  );
}

function Placar({ d, aguardando }: { d: Apuracao2T; aguardando: boolean }) {
  const { lula, flavio } = d;
  const total = lula.votos + flavio.votos;
  const lider = total === 0 || lula.votos === flavio.votos ? null : lula.votos > flavio.votos ? lula : flavio;
  const vice = lider === lula ? flavio : lula;
  return (
    <section className="card p-4 sm:p-5">
      <CardHead
        title="Presidente · 2º turno · votos válidos"
        sub={aguardando ? "Aguardando os primeiros números do TSE" : `${int(d.nacional.validos)} votos válidos apurados`}
      />
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        <Lado c={lula} alinhar="left" lidera={lider === lula} />
        <Lado c={flavio} alinhar="right" lidera={lider === flavio} />
      </div>

      {/* Barra bipolar: Lula da esquerda, Flávio da direita; marca dos 50%. */}
      <div className="relative mt-4">
        <div className="flex h-6 w-full overflow-hidden rounded" style={{ background: "var(--surface-2)" }}>
          <div style={{ width: `${lula.pct}%`, background: COR["13"], transition: "width .6s ease" }} />
          <div className="flex-1" />
          <div style={{ width: `${flavio.pct}%`, background: COR["22"], transition: "width .6s ease" }} />
        </div>
        <div className="pointer-events-none absolute -top-1.5 -bottom-1.5 left-1/2 border-l-2 border-dashed" style={{ borderColor: "var(--text-primary)" }} />
      </div>
      <div className="mt-1.5 flex justify-center text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
        50% dos válidos
      </div>

      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        {aguardando || !lider ? (
          aguardando ? (
            "As urnas fecham às 17h (horário de Brasília); a apuração começa logo depois e esta página se atualiza sozinha."
          ) : (
            "Empate até aqui."
          )
        ) : (
          <>
            <b style={{ color: "var(--text-primary)" }}>{NOME[lider.numero]}</b> à frente por{" "}
            <b className="tabular" style={{ color: "var(--text-primary)" }}>{int(lider.votos - vice.votos)}</b> votos ({pct(lider.pct - vice.pct)} p.p.).{" "}
            {d.nacional.definido ? "O TSE indica resultado matematicamente definido." : d.nacional.final ? "Totalização encerrada." : "Apuração em andamento."}
          </>
        )}
      </p>

      <Andamento2T d={d} />
    </section>
  );
}

/* ─────────────── Andamento (dentro do card do placar) ─────────────── */

function Andamento2T({ d }: { d: Apuracao2T }) {
  const n = d.nacional;
  const aApurar = n.secoes < n.secoesTotal ? n.votosAApurar : 0;
  const votosPct = n.comparecimento + aApurar > 0 ? (100 * n.comparecimento) / (n.comparecimento + aApurar) : 0;
  // Comparecimento = quem votou ÷ eleitorado das seções já totalizadas.
  const comp = n.comparecimento + n.abstencao;
  const caixas: [string, string, string][] = [
    ["Votos apurados", int(n.comparecimento), n.secoes === 0 ? "—" : `≈ ${pct(votosPct, 1)}% dos votos`],
    ["A apurar", n.secoes === 0 ? "—" : `≈ ${int(aApurar)}`, n.secoes === 0 ? "estimado após as primeiras seções" : `≈ ${pct(100 - votosPct, 1)}% dos votos`],
    [
      "Comparecimento",
      n.secoes === 0 ? "—" : `${pct(comp ? (100 * n.comparecimento) / comp : 0)}%`,
      n.secoes === 0 ? "nas seções apuradas" : `abstenção ${pct(comp ? (100 * n.abstencao) / comp : 0)}% · nas seções apuradas`,
    ],
    ["Seções apuradas", int(n.secoes), `de ${int(n.secoesTotal)}`],
    ["Brancos e nulos", int(n.brancos + n.nulos), `${int(n.brancos)} brancos · ${int(n.nulos)} nulos`],
  ];
  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--grid)" }}>
      <div className="mb-1.5 flex items-baseline justify-between gap-2">
        <span className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          Apuração · Brasil{n.final ? " · totalização encerrada" : ""}
        </span>
        <span className="tabular text-2xl font-extrabold leading-none" style={{ color: "var(--accent)" }}>
          {pct(n.pct)}%<span className="ml-1 text-xs font-semibold" style={{ color: "var(--text-muted)" }}>apurado</span>
        </span>
      </div>
      <Barra valor={n.pct} altura={10} />
      <div className="tabular mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
        {caixas.map(([k, v, sub], i) => (
          // 5 caixas em 2 colunas: a última ocupa a linha inteira no celular.
          <div key={k} className={`min-w-0 rounded p-2 ${i === caixas.length - 1 ? "col-span-2 sm:col-span-1" : ""}`} style={{ background: "var(--surface-2)" }}>
            <div className="text-[11px] font-semibold uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>{k}</div>
            <div className="truncate text-lg font-extrabold" style={{ color: "var(--text-primary)" }}>{v}</div>
            <div className="text-[11px]" style={{ color: "var(--text-secondary)" }}>{sub}</div>
          </div>
        ))}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: "var(--text-muted)" }}>
        Percentual apurado = seções totalizadas pelo TSE. Votos apurados = eleitores que votaram nas seções já totalizadas; comparecimento = esses votantes ÷ eleitorado dessas seções. A apurar: estimativa
        (eleitores das seções restantes × comparecimento já apurado em cada UF) — o TSE não publica esse número.
      </p>
    </div>
  );
}

/* ───────────────────────── Mapa ───────────────────────── */

const nomeUf = (uf: string) => UF_NAMES[uf as UF] ?? uf;

function dica(s: Estado2T) {
  const base = `${nomeUf(s.uf)} — ${pct(s.pct)}% apurado`;
  if (s.semVotos) return `${base} · votos da UF indisponíveis agora`;
  if (!s.secoes) return `${base} · apuração não começou`;
  if (!s.lider) return `${base} · empate`;
  const [a, b] = s.lider === "13" ? [s.lulaPct, s.flavioPct] : [s.flavioPct, s.lulaPct];
  return `${base} · ${NOME[s.lider]} à frente com ${pct(a)}% (+${pct(a - b)} p.p.)`;
}

function Mapa({ svg, d }: { svg: string; d: Apuracao2T }) {
  const html = useMemo(() => {
    const regras = d.estados.map((s) => `#apuracao2t-mapa .uf-${s.uf},#apuracao2t-mapa .uf-${s.uf} path{fill:${corUf(s)}}`).join("");
    const comTitulos = d.estados.reduce((acc, s) => {
      const t = `<title>${dica(s)}</title>`;
      return acc
        .replace(new RegExp(`(<g\\b[^>]*\\bdata-uf="${s.uf}"[^>]*>)`), (m) => m + t)
        .replace(new RegExp(`(<path\\b[^>]*\\bdata-uf="${s.uf}"[^>]*?)\\s*/>`), (_m, p1) => `${p1}>${t}</path>`);
    }, svg);
    return (
      `<style>#apuracao2t-mapa svg{width:100%;height:auto;display:block}` +
      `#apuracao2t-mapa path{stroke:var(--apur-borda);stroke-width:1;stroke-linejoin:round;transition:fill .6s}` +
      regras +
      `</style>` +
      comTitulos
    );
  }, [svg, d.estados]);

  const lidera = (n: "13" | "22") => d.estados.filter((s) => s.lider === n).length;
  const degrau = (cor: string, p: number) => `color-mix(in srgb, ${cor} ${p}%, var(--apur-vazio))`;
  return (
    <div>
      <div
        id="apuracao2t-mapa"
        role="img"
        aria-label={`Mapa do Brasil: cada estado fica mais colorido conforme a apuração avança — azul onde Flávio Bolsonaro lidera (${lidera("22")} UFs), vermelho onde Lula lidera (${lidera("13")} UFs).`}
        dangerouslySetInnerHTML={{ __html: html }}
      />
      <div className="mt-2 flex flex-col items-center gap-1.5 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        {(["22", "13"] as const).map((n) => (
          <div key={n} className="flex w-full max-w-xs items-center gap-2">
            <span className="w-[9.5rem] shrink-0 text-right font-semibold">
              {NOME[n]} à frente <span className="tabular">({lidera(n)})</span>
            </span>
            <span
              aria-hidden
              className="inline-block h-2.5 flex-1 rounded-sm"
              style={{ background: `linear-gradient(to right, ${degrau(COR[n], 0)}, ${degrau(COR[n], 15)}, ${degrau(COR[n], 100)})`, border: "1px solid var(--apur-borda)" }}
            />
          </div>
        ))}
        <div className="flex w-full max-w-xs gap-2" style={{ color: "var(--text-muted)" }}>
          <span className="w-[9.5rem] shrink-0" />
          <span className="flex flex-1 justify-between">
            <span>0%</span>
            <span>100% apurado</span>
          </span>
        </div>
      </div>
    </div>
  );
}

/* ───────────────────────── Estados ───────────────────────── */

type Ordem = "regiao" | "menos" | "nome";

function Estados({ d, svg }: { d: Apuracao2T; svg: string }) {
  const [ordem, setOrdem] = useState<Ordem>("regiao");
  const lista = useMemo(() => {
    const l = [...d.estados];
    if (ordem === "menos") l.sort((a, b) => a.pct - b.pct);
    else if (ordem === "nome") l.sort((a, b) => nomeUf(a.uf).localeCompare(nomeUf(b.uf), "pt-BR"));
    else l.sort((a, b) => d.regioes.findIndex((r) => r.nome === a.regiao) - d.regioes.findIndex((r) => r.nome === b.regiao) || nomeUf(a.uf).localeCompare(nomeUf(b.uf), "pt-BR"));
    return l;
  }, [d, ordem]);

  const botoes: [Ordem, string][] = [
    ["regiao", "Por região"],
    ["menos", "Menos apurados"],
    ["nome", "A–Z"],
  ];

  return (
    <section className="card p-4">
      <CardHead
        title="Apuração por estado"
        sub="Percentual de seções totalizadas em cada UF; a cor é de quem está à frente ali"
        right={
          <div className="flex overflow-hidden rounded border text-xs" style={{ borderColor: "var(--ring)" }} role="group" aria-label="Ordenar estados">
            {botoes.map(([k, rot]) => (
              <button
                key={k}
                type="button"
                onClick={() => setOrdem(k)}
                aria-pressed={ordem === k}
                className="px-2 py-1 font-semibold"
                style={ordem === k ? { background: "var(--accent)", color: "#fff" } : { color: "var(--text-secondary)" }}
              >
                {rot}
              </button>
            ))}
          </div>
        }
      />
      <div className="grid gap-5 md:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
        <div className="min-w-0 self-start">
          <Mapa svg={svg} d={d} />
        </div>
        <ul className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2" data-testid="barras-estados">
          {lista.flatMap((s, i) => {
            const item = (
              <li key={s.uf} className="min-w-0" data-uf={s.uf} title={dica(s)}>
                <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate" style={{ color: "var(--text-primary)" }}>
                    <span className="mr-1.5 inline-block w-6 rounded text-center text-[10px] font-bold" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                      {s.uf}
                    </span>
                    {nomeUf(s.uf)}
                  </span>
                  <span className="tabular font-bold" style={{ color: "var(--text-primary)" }}>
                    {pct(s.pct)}%
                  </span>
                </div>
                <Barra valor={s.pct} cor={s.lider ? COR[s.lider] : "var(--series-muted)"} altura={6} />
                {s.lider && (
                  <div className="tabular mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
                    <span style={{ color: COR[s.lider] }}>●</span> {NOME[s.lider]} {pct(s.lider === "13" ? s.lulaPct : s.flavioPct)}% ·{" "}
                    {NOME[s.lider === "13" ? "22" : "13"]} {pct(s.lider === "13" ? s.flavioPct : s.lulaPct)}%
                  </div>
                )}
              </li>
            );
            const novaRegiao = ordem === "regiao" && (i === 0 || lista[i - 1].regiao !== s.regiao);
            if (!novaRegiao) return [item];
            return [
              <li key={`r-${s.regiao}`} className={`col-span-full text-[10px] font-bold uppercase tracking-wide ${i > 0 ? "mt-1.5" : ""}`} style={{ color: "var(--text-muted)" }}>
                {s.regiao}
              </li>,
              item,
            ];
          })}
        </ul>
      </div>
    </section>
  );
}

/* ───────────────────────── Página ───────────────────────── */

const aguardando = (l: Leitura2T | null): l is Extract<Leitura2T, { aguardando: true }> => !!l && "aguardando" in l;

export default function ApuracaoSegundoTurno({ inicial, mapaSvg }: { inicial: Leitura2T | null; mapaSvg: string }) {
  const { dados, status, segundos } = useAoVivo<Leitura2T>(
    "/api/apuracao-2t.json",
    inicial,
    // Nunca volta no tempo; e, uma vez com números, uma falha de leitura não apaga o placar.
    (atual, novo) => (aguardando(atual) ? false : aguardando(novo) || novo.nacional.secoes < atual.nacional.secoes),
    // O primeiro desenho pode ter até 30s de CDN: se ele ainda diz "aguardando", relê já.
    !inicial || aguardando(inicial),
  );
  const espera = !dados || aguardando(dados);
  const d = espera ? vazio2T(dados?.lidoEm ?? "") : dados;

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
            Apuração ao vivo · 2º turno · 25/10/2026
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            Resultado oficial do TSE, lido direto do site Resultados
            {!espera && d.atualizadoEm && <> · última totalização em {d.atualizadoEm} (Brasília)</>}
          </p>
        </div>
        <AoVivo status={status} segundos={segundos} />
      </header>

      {espera && (
        <p className="card p-3 text-sm" role="status" style={{ color: "var(--text-secondary)", borderLeft: "4px solid var(--accent)" }}>
          {status === "erro" ? "Não foi possível ler o TSE agora — tentando de novo em instantes." : "O TSE ainda não publicou números do 2º turno. Os placares abaixo estão zerados até a primeira totalização."}
        </p>
      )}

      <Placar d={d} aguardando={espera} />
      <Estados d={d} svg={mapaSvg} />
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Fonte: Tribunal Superior Eleitoral — resultados.tse.jus.br (eleição 6258, 2º turno presidencial). Percentual apurado = seções totalizadas ÷
        total de seções. Percentuais de candidato sobre os votos válidos (exclui brancos e nulos). Mapa: a intensidade da cor acompanha o % apurado da
        UF (a partir de 15% de intensidade quando a primeira seção chega). Esta página relê o TSE a cada 30 segundos.
      </p>
    </div>
  );
}
