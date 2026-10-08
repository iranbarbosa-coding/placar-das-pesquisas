"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Apuracao, Andamento, Candidato } from "@/lib/apuracao";
import { UF_NAMES, type UF } from "@/lib/types";

/**
 * Hotsite da apuração — casca cliente. Recebe a primeira leitura do servidor e,
 * a partir daí, consulta /api/apuracao.json a cada 30s (pausa com a aba oculta,
 * relê ao voltar). Só tokens de `globals.css`; cor por pessoa (Lula vermelho,
 * Flávio azul), como no resto do site.
 */

const INTERVALO = 30_000;

const NOME: Record<string, string> = { "13": "Lula", "22": "Flávio Bolsonaro" };
const COR: Record<string, string> = { "13": "var(--cand-red)", "22": "var(--cand-blue)" };

const int = (n: number) => n.toLocaleString("pt-BR");
const pct = (n: number, casas = 2) =>
  n.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas });

/** "FLAVIO BOLSONARO" → "Flavio Bolsonaro" (para os demais candidatos). */
function titulo(s: string) {
  return s
    .toLowerCase()
    .split(" ")
    .map((w) => (["de", "da", "do", "dos", "das", "e"].includes(w) ? w : w.charAt(0).toUpperCase() + w.slice(1)))
    .join(" ");
}

/** Faixas do mapa: mais apurado = azul mais forte. */
const FAIXAS = [
  { min: 100, label: "100%", mix: 100 },
  { min: 95, label: "95–99%", mix: 75 },
  { min: 85, label: "85–95%", mix: 52 },
  { min: 70, label: "70–85%", mix: 32 },
  { min: 0, label: "< 70%", mix: 14 },
];
const faixa = (p: number) => FAIXAS.find((f) => (f.min === 100 ? p >= 99.995 : p >= f.min)) ?? FAIXAS[FAIXAS.length - 1];
const corFaixa = (mix: number) => `color-mix(in srgb, var(--accent) ${mix}%, var(--surface-2))`;

function CardHead({ title, sub, right }: { title: string; sub?: React.ReactNode; right?: React.ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
      <div>
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-secondary)" }}>
          {title}
        </h2>
        {sub && (
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            {sub}
          </p>
        )}
      </div>
      {right}
    </div>
  );
}

function Barra({ valor, cor = "var(--accent)", altura = 8 }: { valor: number; cor?: string; altura?: number }) {
  return (
    <div className="w-full overflow-hidden rounded-full" style={{ height: altura, background: "var(--surface-2)" }}>
      <div
        className="h-full rounded-full"
        style={{ width: `${Math.min(100, Math.max(0, valor))}%`, background: cor, transition: "width .6s ease" }}
      />
    </div>
  );
}

function AoVivo({ status, segundos }: { status: "ok" | "erro" | "carregando"; segundos: number }) {
  const cor = status === "erro" ? "var(--cand-amber)" : "var(--series-3)";
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>
      <span className="relative inline-flex h-2 w-2">
        {status === "ok" && (
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60" style={{ background: cor }} />
        )}
        <span className="relative inline-flex h-2 w-2 rounded-full" style={{ background: cor }} />
      </span>
      {status === "erro" ? "TSE sem resposta — tentando de novo" : `AO VIVO · nova leitura em ${segundos}s`}
    </span>
  );
}

/* ───────────────────────── Placar ───────────────────────── */

function LadoCandidato({ c, alinhar }: { c: Candidato; alinhar: "left" | "right" }) {
  const cor = COR[c.numero] ?? "var(--text-primary)";
  return (
    <div className={alinhar === "right" ? "text-right" : ""}>
      <div className="text-sm font-bold" style={{ color: "var(--text-primary)" }}>
        {NOME[c.numero] ?? titulo(c.nome)}
      </div>
      <div className="text-xs" style={{ color: "var(--text-muted)" }}>
        {c.partido} · {c.numero}
        {c.situacao && (
          <span className="ml-1.5 rounded px-1.5 py-0.5 font-semibold uppercase" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
            {c.situacao}
          </span>
        )}
      </div>
      <div className="tabular mt-1 font-bold leading-none" style={{ color: cor, fontSize: "clamp(2.4rem, 7vw, 3.75rem)" }}>
        {pct(c.pct)}
        <span style={{ fontSize: "0.5em" }}>%</span>
      </div>
      <div className="tabular mt-1 text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
        {int(c.votos)} votos
      </div>
    </div>
  );
}

function Placar({ d }: { d: Apuracao }) {
  const [lula, flavio] = d.principais;
  const [aberto, setAberto] = useState(false);
  if (!lula || !flavio) return null;
  const outrosPct = d.outros.reduce((s, c) => s + c.pct, 0);
  const outrosVotos = d.outros.reduce((s, c) => s + c.votos, 0);
  const lider = lula.votos >= flavio.votos ? lula : flavio;
  const vice = lider === lula ? flavio : lula;
  const dif = lider.votos - vice.votos;

  return (
    <section className="card p-4 sm:p-5">
      <CardHead
        title="Presidente · 1º turno · votos válidos"
        sub={`${pct(d.nacional.pct)}% das seções apuradas · ${int(d.nacional.validos)} votos válidos`}
      />
      <div className="grid grid-cols-2 gap-4">
        <LadoCandidato c={lula} alinhar="left" />
        <LadoCandidato c={flavio} alinhar="right" />
      </div>

      {/* Barra bipolar: Lula da esquerda, Flávio da direita, demais no meio; marca dos 50%. */}
      <div className="relative mt-4">
        <div className="flex h-5 w-full overflow-hidden rounded" style={{ background: "var(--surface-2)" }}>
          <div style={{ width: `${lula.pct}%`, background: COR["13"], transition: "width .6s ease" }} />
          <div style={{ width: `${outrosPct}%`, background: "var(--series-muted)", transition: "width .6s ease" }} />
          <div style={{ width: `${flavio.pct}%`, background: COR["22"], transition: "width .6s ease" }} />
        </div>
        <div className="pointer-events-none absolute -top-1.5 -bottom-1.5 left-1/2 border-l-2 border-dashed" style={{ borderColor: "var(--text-primary)" }} />
      </div>
      <div className="mt-1.5 flex justify-center text-[11px] font-semibold" style={{ color: "var(--text-muted)" }}>
        50% dos válidos
      </div>

      <p className="mt-3 text-sm" style={{ color: "var(--text-secondary)" }}>
        <b style={{ color: "var(--text-primary)" }}>{NOME[lider.numero]}</b> à frente por{" "}
        <b className="tabular" style={{ color: "var(--text-primary)" }}>{int(dif)}</b> votos (
        {pct(lider.pct - vice.pct)} p.p.).{" "}
        {d.nacional.definido
          ? "O TSE indica resultado matematicamente definido."
          : lider.pct < 50
            ? "Ninguém passa de 50% dos válidos até aqui — o caminho é o 2º turno."
            : "Acima de 50% dos válidos até aqui."}
      </p>

      <button
        type="button"
        onClick={() => setAberto((v) => !v)}
        aria-expanded={aberto}
        className="mt-3 flex w-full items-center justify-between rounded px-2 py-1.5 text-xs font-semibold"
        style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}
      >
        <span>
          Demais candidatos: {pct(outrosPct)}% · {int(outrosVotos)} votos
        </span>
        <span aria-hidden>{aberto ? "▲" : "▼"}</span>
      </button>
      {aberto && (
        <table className="tabular mt-1 w-full text-xs">
          <tbody>
            {d.outros.map((c) => (
              <tr key={c.numero} className="border-b" style={{ borderColor: "var(--grid)" }}>
                <td className="py-1" style={{ color: "var(--text-primary)" }}>
                  {titulo(c.nome)} <span style={{ color: "var(--text-muted)" }}>· {c.partido}</span>
                </td>
                <td className="py-1 text-right" style={{ color: "var(--text-secondary)" }}>{int(c.votos)}</td>
                <td className="w-16 py-1 text-right font-semibold" style={{ color: "var(--text-primary)" }}>{pct(c.pct)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

/* ───────────────────────── Nacional ───────────────────────── */

function Nacional({ d }: { d: Apuracao }) {
  const n = d.nacional;
  const comp = n.comparecimento + n.abstencao;
  const linhas: [string, string][] = [
    ["Seções apuradas", `${int(n.secoes)} de ${int(n.secoesTotal)}`],
    ["Eleitorado apurado", `${int(n.eleitoresApurados)} de ${int(n.eleitores)}`],
    ["Comparecimento", `${int(n.comparecimento)} · ${pct(comp ? (100 * n.comparecimento) / comp : 0)}%`],
    ["Abstenção", `${int(n.abstencao)} · ${pct(comp ? (100 * n.abstencao) / comp : 0)}%`],
    ["Votos válidos", int(n.validos)],
    ["Brancos", int(n.brancos)],
    ["Nulos", int(n.nulos)],
  ];
  return (
    <section className="card p-4">
      <CardHead title="Votos apurados · Brasil" sub={n.final ? "Totalização encerrada" : "Percentual de seções totalizadas"} />
      <div className="tabular font-bold leading-none" style={{ color: "var(--accent)", fontSize: "clamp(2.4rem, 6vw, 3.25rem)" }}>
        {pct(n.pct)}
        <span style={{ fontSize: "0.5em" }}>%</span>
      </div>
      <div className="mt-3">
        <Barra valor={n.pct} altura={10} />
      </div>
      <dl className="tabular mt-3 grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
        {linhas.map(([k, v]) => (
          <div key={k} className="contents">
            <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
            <dd className="text-right font-semibold" style={{ color: "var(--text-primary)" }}>{v}</dd>
          </div>
        ))}
      </dl>
    </section>
  );
}

function LinhaAndamento({ rotulo, a, forte }: { rotulo: React.ReactNode; a: Andamento; forte?: boolean }) {
  return (
    <div>
      <div className="mb-1 flex items-baseline justify-between gap-2 text-xs">
        <span className={forte ? "font-bold" : "font-semibold"} style={{ color: "var(--text-primary)" }}>
          {rotulo}
        </span>
        <span className="tabular font-bold" style={{ color: "var(--text-primary)" }}>
          {pct(a.pct)}%
        </span>
      </div>
      <Barra valor={a.pct} cor={corFaixa(faixa(a.pct).mix)} />
      <div className="tabular mt-0.5 text-[11px]" style={{ color: "var(--text-muted)" }}>
        {int(a.secoes)} de {int(a.secoesTotal)} seções
        {a.secoes < a.secoesTotal && <> (≈ {int(a.votosAApurar)} votos a apurar)</>}
      </div>
    </div>
  );
}

function Regioes({ d }: { d: Apuracao }) {
  return (
    <section className="card p-4">
      <CardHead
        title="Apuração por região"
        sub="Seções totalizadas, somando os estados de cada região. Votos a apurar: estimativa (eleitores das seções restantes × comparecimento já apurado)."
      />
      <div className="flex flex-col gap-3">
        {d.regioes.map((r) => (
          <LinhaAndamento key={r.nome} rotulo={r.nome} a={r} forte />
        ))}
        {d.exterior && <LinhaAndamento rotulo="Exterior" a={d.exterior} />}
      </div>
    </section>
  );
}

/* ───────────────────────── Estados ───────────────────────── */

function Mapa({ svg, d }: { svg: string; d: Apuracao }) {
  const html = useMemo(() => {
    const regras = d.estados
      .map((s) => `#apuracao-mapa .uf-${s.uf},#apuracao-mapa .uf-${s.uf} path{fill:${corFaixa(faixa(s.pct).mix)}}`)
      .join("");
    // Tooltip nativo por estado, como no mapa da home.
    const comTitulos = d.estados.reduce((acc, s) => {
      const t = `<title>${UF_NAMES[s.uf as UF] ?? s.uf} — ${pct(s.pct)}% apurado</title>`;
      return acc
        .replace(new RegExp(`(<g\\b[^>]*\\bdata-uf="${s.uf}"[^>]*>)`), (m) => m + t)
        .replace(new RegExp(`(<path\\b[^>]*\\bdata-uf="${s.uf}"[^>]*?)\\s*/>`), (_m, p1) => `${p1}>${t}</path>`);
    }, svg);
    return (
      `<style>#apuracao-mapa svg{width:100%;height:auto;display:block}` +
      `#apuracao-mapa path{stroke:var(--surface-1);stroke-width:1.2;stroke-linejoin:round;transition:fill .4s}` +
      regras +
      `</style>` +
      comTitulos
    );
  }, [svg, d.estados]);
  return (
    <div>
      <div id="apuracao-mapa" role="img" aria-label="Mapa do Brasil colorido pelo percentual de seções apuradas em cada estado." dangerouslySetInnerHTML={{ __html: html }} />
      <ul className="mt-2 flex flex-wrap justify-center gap-x-3 gap-y-1 text-[11px]" style={{ color: "var(--text-secondary)" }}>
        {FAIXAS.map((f) => (
          <li key={f.label} className="inline-flex items-center gap-1">
            <span className="inline-block h-2.5 w-2.5 rounded-sm" style={{ background: corFaixa(f.mix) }} />
            {f.label}
          </li>
        ))}
      </ul>
    </div>
  );
}

type Ordem = "regiao" | "menos" | "nome";

function Estados({ d, svg }: { d: Apuracao; svg: string }) {
  const [ordem, setOrdem] = useState<Ordem>("regiao");
  const lista = useMemo(() => {
    const nome = (uf: string) => UF_NAMES[uf as UF] ?? uf;
    const l = [...d.estados];
    if (ordem === "menos") l.sort((a, b) => a.pct - b.pct);
    else if (ordem === "nome") l.sort((a, b) => nome(a.uf).localeCompare(nome(b.uf), "pt-BR"));
    else l.sort((a, b) => d.regioes.findIndex((r) => r.nome === a.regiao) - d.regioes.findIndex((r) => r.nome === b.regiao) || nome(a.uf).localeCompare(nome(b.uf), "pt-BR"));
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
        sub="Percentual de seções totalizadas em cada UF"
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
        <ul className="grid min-w-0 grid-cols-1 gap-x-5 gap-y-2 sm:grid-cols-2">
          {lista.flatMap((s, i) => {
            const item = (
              <li key={s.uf} className="min-w-0">
                <div className="mb-0.5 flex items-baseline justify-between gap-2 text-xs">
                  <span className="truncate" style={{ color: "var(--text-primary)" }}>
                    <span className="mr-1.5 inline-block w-6 rounded text-center text-[10px] font-bold" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
                      {s.uf}
                    </span>
                    {UF_NAMES[s.uf as UF] ?? s.uf}
                  </span>
                  <span className="tabular font-bold" style={{ color: "var(--text-primary)" }}>
                    {pct(s.pct)}%
                  </span>
                </div>
                <Barra valor={s.pct} cor={corFaixa(faixa(s.pct).mix)} altura={6} />
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

export default function ApuracaoLive({ inicial, mapaSvg }: { inicial: Apuracao | null; mapaSvg: string }) {
  const [dados, setDados] = useState<Apuracao | null>(inicial);
  const [status, setStatus] = useState<"ok" | "erro" | "carregando">(inicial ? "ok" : "carregando");
  const [proxima, setProxima] = useState(Date.now() + INTERVALO);
  const [agora, setAgora] = useState(Date.now());

  const emVoo = useRef(false);
  const buscar = useCallback(async () => {
    if (emVoo.current) return;
    emVoo.current = true;
    try {
      const r = await fetch("/api/apuracao.json", { cache: "no-store" });
      if (!r.ok) throw new Error(String(r.status));
      const novo = (await r.json()) as Apuracao;
      // Nunca volta no tempo: uma resposta de CDN mais velha não substitui a atual.
      setDados((atual) => (atual && novo.nacional.secoes < atual.nacional.secoes ? atual : novo));
      setStatus("ok");
    } catch {
      setStatus("erro");
    } finally {
      emVoo.current = false;
      setProxima(Date.now() + INTERVALO);
    }
  }, []);

  useEffect(() => {
    if (!inicial) buscar();
    const tic = setInterval(() => setAgora(Date.now()), 1000);
    const onVis = () => document.visibilityState === "visible" && buscar();
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(tic);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [buscar, inicial]);

  useEffect(() => {
    if (agora >= proxima && document.visibilityState === "visible") buscar();
  }, [agora, proxima, buscar]);

  const segundos = Math.max(0, Math.ceil((proxima - agora) / 1000));

  return (
    <div className="flex min-w-0 flex-col gap-5">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
            Apuração ao vivo · Eleições 2026
          </h1>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>
            Resultado oficial do TSE, lido direto do site Resultados
            {dados && <> · última totalização em {dados.atualizadoEm} (Brasília)</>}
          </p>
        </div>
        <AoVivo status={status} segundos={segundos} />
      </header>

      {!dados ? (
        <section className="card p-6 text-sm" style={{ color: "var(--text-secondary)" }}>
          {status === "erro" ? "Não foi possível ler o TSE agora. Tentando de novo em instantes…" : "Carregando a apuração…"}
        </section>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_336px]">
            <div className="min-w-0">
              <Placar d={dados} />
            </div>
            <div className="flex min-w-0 flex-col gap-5">
              <Nacional d={dados} />
            </div>
          </div>
          <div className="grid gap-5 lg:grid-cols-[336px_minmax(0,1fr)]">
            <div className="min-w-0">
              <Regioes d={dados} />
            </div>
            <div className="min-w-0">
              <Estados d={dados} svg={mapaSvg} />
            </div>
          </div>
          <p className="text-[11px]" style={{ color: "var(--text-muted)" }}>
            Fonte: Tribunal Superior Eleitoral — resultados.tse.jus.br (eleição 6257, 1º turno). Percentual apurado = seções
            totalizadas ÷ total de seções. Percentuais de candidato sobre os votos válidos (exclui brancos e nulos). Esta
            página relê o TSE a cada 30 segundos.
          </p>
        </>
      )}
    </div>
  );
}
