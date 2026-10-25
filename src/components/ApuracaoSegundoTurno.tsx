"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { AoVivo, Barra, CardHead, int, pct, titulo, useAoVivo } from "@/components/ApuracaoLive";
import { colorMap, colorOf } from "@/lib/colors";
import { CANDIDATOS_2T, CHANCE_NO_AR, vazio2T, type Apuracao2T, type Gov2T, type Estado2T, type Leitura2T, type Voto2T } from "@/lib/apuracao2t";
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
  return <FotoDe sq={c.sq || CANDIDATOS_2T[c.numero].sq} nome={NOME[c.numero]} cor={COR[c.numero]} lado={lado} />;
}

function FotoDe({ sq, nome, cor, lado }: { sq: string; nome: string; cor: string; lado: number }) {
  const lista = fotos(sq);
  const [i, setI] = useState(0);
  const [carregou, setCarregou] = useState(false);
  const img = useRef<HTMLImageElement>(null);
  // A imagem do HTML do servidor pode falhar ANTES da hidratação (o onError não
  // dispara): confere o estado dela ao montar.
  useEffect(() => {
    const el = img.current;
    if (el?.complete) el.naturalWidth > 0 ? setCarregou(true) : setI((k) => k + 1);
  }, [i]);
  const iniciais = nome
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
          alt={`Foto de ${nome}`}
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

      {d.chance ? (
        <Chance d={d} />
      ) : (
        !aguardando &&
        !d.nacional.final &&
        d.nacional.secoes > 0 &&
        (!CHANCE_NO_AR ? (
          <p
            className="mt-4 border-t pt-4 text-[13px]"
            style={{ color: "var(--text-muted)", borderColor: "var(--grid)" }}
            data-testid="chance-fora-do-ar"
          >
            <b style={{ color: "var(--text-primary)" }}>Medidor de chance de vitória fora do ar.</b> A projeção dependia de consultar, a
            cada atualização, o resultado de cada município já apurado. Esse volume de consultas passou a ser barrado pelos servidores
            do TSE, e isso chegou a travar também o placar. Para manter o resultado oficial atualizado, o medidor foi retirado durante
            esta apuração.
          </p>
        ) : (
          <p className="mt-4 border-t pt-4 text-[13px]" style={{ color: "var(--text-muted)", borderColor: "var(--grid)" }}>
            A chance de vitória aparece quando cerca de 5% dos votos estiverem apurados — antes disso, as primeiras urnas são poucas e
            concentradas demais para indicar o resultado.
          </p>
        ))
      )}

      <Andamento2T d={d} />
    </section>
  );
}

/* ─────────────── Chance de vitória (ao vivo, experimental) ─────────────── */

/** Probabilidade em inteiro, sem falsa precisão nas pontas (como na Previsão). */
const fmtChance = (p: number) => (p >= 0.995 ? ">99%" : p <= 0.005 ? "<1%" : `${Math.round(p * 100)}%`);

/** Medidor da chance (escolha do criador, 24/10: opção B). Arco vermelho = chance
 *  de Lula a partir da esquerda, azul = de Flávio; o ponteiro marca a divisão e o
 *  tracejado no topo, 50%. Forma diferente da barra dos votos de propósito. */
function Medidor({ lula, cores = [COR["13"], COR["22"]], largura = 200 }: { lula: number; cores?: [string, string]; largura?: number }) {
  const r = 80, cx = 100, cy = 95;
  const pt = (a: number) => [cx + r * Math.cos(a), cy - r * Math.sin(a)];
  const corte = Math.PI * (1 - Math.min(0.999, Math.max(0.001, lula)));
  const [x1, y1] = pt(Math.PI);
  const [xs, ys] = pt(corte);
  const [x2, y2] = pt(0);
  const [nx, ny] = [cx + (r - 6) * Math.cos(corte), cy - (r - 6) * Math.sin(corte)];
  return (
    <svg width={largura} height={(largura * 110) / 200} viewBox="0 0 200 110" aria-hidden className="block">
      <path d={`M${x1},${y1} A${r},${r} 0 0 1 ${xs},${ys}`} fill="none" strokeWidth={18} style={{ stroke: cores[0] }} />
      <path d={`M${xs},${ys} A${r},${r} 0 0 1 ${x2},${y2}`} fill="none" strokeWidth={18} style={{ stroke: cores[1] }} />
      <line x1={cx} y1={5} x2={cx} y2={22} strokeDasharray="3 2" style={{ stroke: "var(--text-primary)" }} />
      <line x1={cx} y1={cy} x2={nx} y2={ny} strokeWidth={3} strokeLinecap="round" style={{ stroke: "var(--text-primary)" }} />
      <circle cx={cx} cy={cy} r={5} style={{ fill: "var(--text-primary)" }} />
    </svg>
  );
}

function Chance({ d }: { d: Apuracao2T }) {
  const c = d.chance!;
  return (
    <div className="mt-4 border-t pt-4" style={{ borderColor: "var(--grid)" }} data-testid="chance-vitoria">
      <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
        <div className="shrink-0 text-center">
          <Medidor lula={c.lula} />
          <div className="-mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            ponteiro = chance de vitória
          </div>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[12px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
              Chance de vitória
            </p>
            <span
              className="rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide"
              style={{ border: "1px dashed var(--axis)", color: "var(--text-secondary)" }}
              title="Calibrada numa única apuração (1º turno de 2026 contra 2022); não há 2º turno anterior para validar."
            >
              Experimental
            </span>
          </div>
          <p className="tabular mt-1.5 text-lg" style={{ color: "var(--text-primary)" }}>
            Lula <b>{fmtChance(c.lula)}</b> <span style={{ color: "var(--text-muted)" }}>·</span> Flávio <b>{fmtChance(c.flavio)}</b>
          </p>
          <p className="mt-1.5 text-[13px]" style={{ color: "var(--text-secondary)" }}>
            Se o que falta seguir o padrão do 1º turno, o resultado final fica perto de{" "}
            <b className="tabular" style={{ color: "var(--text-primary)" }}>
              Lula {pct(c.projecaoLula, 1)}% × Flávio {pct(c.projecaoFlavio, 1)}%
            </b>{" "}
            <span className="tabular" style={{ color: "var(--text-muted)" }}>(± {pct(1.645 * c.desvio, 1)} p.p.)</span>.
          </p>
          <p className="mt-1.5 text-[12px]" style={{ color: "var(--text-muted)" }} data-testid="chance-so-estado">
            <b style={{ color: "var(--text-secondary)" }}>Conta só por estado.</b> Os servidores do TSE passaram a barrar as consultas
            município a município, por isso a variação entre os turnos agora é medida no estado inteiro, e não cidade a cidade.
          </p>
          <details className="mt-1 text-[11px]" style={{ color: "var(--text-muted)" }}>
            <summary className="cursor-pointer select-none">Como é calculada</summary>
            <p className="mt-1">
              Os votos que faltam em cada município são projetados pelo resultado do 1º turno ali, corrigido pela variação entre os turnos já
              observada no estado. A incerteza foi medida refazendo a apuração do 1º turno de 2026 na ordem real em que os municípios foram
              totalizados, com o 2º turno de 2022 como base: quanto mais votos faltam, maior o erro possível. A margem é o intervalo de 90%.
              Não é previsão das pesquisas; é o que o resultado parcial e o padrão do 1º turno indicam agora.
            </p>
          </details>
        </div>
      </div>
    </div>
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

/* ───────────────────────── Governadores ───────────────────────── */

/** Nome de urna do TSE ("PROFESSORA DORINHA") em caixa de título. */
const nomeGov = (s: string) => titulo(s);

function BlocoGov({ g }: { g: Gov2T }) {
  const [a, b] = g.candidatos;
  const nomes = [nomeGov(a.nome), nomeGov(b.nome)];
  const mapa = colorMap(nomes);
  const cores: [string, string] = [colorOf(mapa, nomes[0]), colorOf(mapa, nomes[1])];
  const total = a.votos + b.votos;
  const lider = total === 0 || a.votos === b.votos ? null : a.votos > b.votos ? 0 : 1;
  const c = g.chance;
  return (
    <section className="card flex min-w-0 flex-col p-4" data-testid={`gov-${g.uf}`}>
      <div className="mb-3 flex items-baseline justify-between gap-2">
        <h3 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {nomeUf(g.uf)}
        </h3>
        <span className="tabular text-xs font-bold" style={{ color: "var(--text-primary)" }}>
          {g.aguardando ? "aguardando o TSE" : `${pct(g.andamento.pct)}% apurado`}
        </span>
      </div>
      <div className="grid grid-cols-2 gap-3">
        {[a, b].map((x, k) => (
          <div key={x.sq} className={`flex min-w-0 flex-col gap-1 ${k === 1 ? "items-end text-right" : ""}`}>
            <FotoDe sq={x.sq} nome={nomes[k]} cor={cores[k]} lado={52} />
            <div className="min-w-0">
              <div className="truncate text-sm font-bold" style={{ color: "var(--text-primary)" }} title={nomes[k]}>
                {nomes[k]}
              </div>
              <div className="text-[11px]" style={{ color: "var(--text-muted)" }}>
                {x.partido} · {x.numero}
                {x.eleito ? " · ELEITO" : lider === k ? " · à frente" : ""}
              </div>
              <div className="tabular text-3xl font-extrabold leading-none" style={{ color: cores[k] }}>
                {pct(x.pct)}
                <span style={{ fontSize: "0.5em" }}>%</span>
              </div>
              <div className="tabular text-[11px] font-semibold" style={{ color: "var(--text-secondary)" }}>
                {int(x.votos)} votos
              </div>
            </div>
          </div>
        ))}
      </div>
      <div className="relative mt-3">
        <div className="flex h-3 w-full overflow-hidden rounded" style={{ background: "var(--surface-2)" }}>
          <div style={{ width: `${a.pct}%`, background: cores[0], transition: "width .6s ease" }} />
          <div className="flex-1" />
          <div style={{ width: `${b.pct}%`, background: cores[1], transition: "width .6s ease" }} />
        </div>
        <div className="pointer-events-none absolute -top-1 -bottom-1 left-1/2 border-l-2 border-dashed" style={{ borderColor: "var(--text-primary)" }} />
      </div>
      {/* Andamento em cinza: azul aqui se confundiria com a cor de um candidato. */}
      <div className="mt-2" title={`${pct(g.andamento.pct)}% das seções apuradas`}>
        <Barra valor={g.andamento.pct} cor="var(--axis)" altura={4} />
      </div>
      <div className="mt-3 flex-1 border-t pt-3" style={{ borderColor: "var(--grid)" }}>
        {c ? (
          <div className="flex items-center gap-3">
            <div className="shrink-0">
              <Medidor lula={c.lula} cores={cores} largura={110} />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center justify-between gap-1">
                <span className="text-[11px] font-extrabold uppercase tracking-[0.08em]" style={{ color: "var(--text-muted)" }}>
                  Chance de vitória
                </span>
                <span
                  className="rounded px-1 py-0.5 text-[9px] font-bold uppercase tracking-wide"
                  style={{ border: "1px dashed var(--axis)", color: "var(--text-secondary)" }}
                  title="Calibrada na apuração do 1º turno (presidente, por estado); não há 2º turno de governador anterior para validar."
                >
                  Experimental
                </span>
              </div>
              <p className="tabular text-sm" style={{ color: "var(--text-primary)" }}>
                {nomes[0]} <b>{fmtChance(c.lula)}</b> <span style={{ color: "var(--text-muted)" }}>·</span> {nomes[1]} <b>{fmtChance(c.flavio)}</b>
              </p>
              <p className="tabular text-[11px]" style={{ color: "var(--text-muted)" }}>
                Final projetado: {pct(c.projecaoLula, 1)}% × {pct(c.projecaoFlavio, 1)}% (± {pct(1.645 * c.desvio, 1)} p.p.)
              </p>
            </div>
          </div>
        ) : (
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            {g.semChance ??
              (!CHANCE_NO_AR && !g.final
                ? "Medidor de chance fora do ar: as consultas da projeção passaram a ser barradas pelos servidores do TSE (veja a nota no placar do presidente)."
                : g.final
                ? "Totalização encerrada."
                : g.aguardando || g.andamento.secoes === 0
                  ? "A chance de vitória aparece com as primeiras seções apuradas."
                  : "A chance de vitória aparece quando cerca de 5% dos votos do estado estiverem apurados.")}
          </p>
        )}
      </div>
    </section>
  );
}

function Governadores({ lista }: { lista: Gov2T[] }) {
  if (!lista.length) return null;
  return (
    <div className="flex flex-col gap-3">
      <CardHead
        title="Governadores · 2º turno"
        sub={
          CHANCE_NO_AR
            ? "Os seis estados com 2º turno. Mesma conta de chance do presidente, só por estado (o TSE passou a barrar as consultas por município)."
            : "Os seis estados com 2º turno, direto do TSE."
        }
      />
      <div className="-mt-1 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {lista.map((g) => (
          <BlocoGov key={g.uf} g={g} />
        ))}
      </div>
    </div>
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
      <Governadores lista={espera ? (dados && aguardando(dados) ? (dados.governadores ?? []) : []) : d.governadores} />
      <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
        Fonte: Tribunal Superior Eleitoral — resultados.tse.jus.br (eleições 6258, 2º turno presidencial, e 6260, governadores). Percentual apurado = seções totalizadas ÷
        total de seções. Percentuais de candidato sobre os votos válidos (exclui brancos e nulos). Mapa: a intensidade da cor acompanha o % apurado da
        UF (a partir de 15% de intensidade quando a primeira seção chega). Esta página relê o TSE a cada 30 segundos. A apuração do 1º turno está em{" "}
        <Link href="/apuracao/primeiro-turno" className="underline">/apuracao/primeiro-turno</Link>.
      </p>
    </div>
  );
}
