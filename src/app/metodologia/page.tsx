import type { Metadata } from "next";
import fs from "node:fs";
import path from "node:path";
import Link from "next/link";
import { loadDataset } from "@/lib/data";
import { candKey } from "@/lib/average";

export const metadata: Metadata = {
  title: "Metodologia",
  description:
    "Como o Placar das Pesquisas coleta, valida por IA e agrega 3.181 pesquisas de 140 institutos em médias rastreáveis — sem número inventado.",
};

function countLines(file: string): number {
  const p = path.join(process.cwd(), "data", file);
  if (!fs.existsSync(p)) return 0;
  return fs.readFileSync(p, "utf-8").split("\n").filter((l) => l.trim()).length;
}

/** Cartão de número — para o teste de 6 segundos. */
function Stat({ value, label, accent = false }: { value: string; label: string; accent?: boolean }) {
  return (
    <div className="card flex flex-col justify-center p-4 sm:p-5">
      <div
        className="tabular text-3xl font-extrabold leading-none sm:text-4xl"
        style={{ color: accent ? "var(--accent)" : "var(--text-primary)" }}
      >
        {value}
      </div>
      <div className="mt-1.5 text-xs leading-snug" style={{ color: "var(--text-secondary)" }}>
        {label}
      </div>
    </div>
  );
}

/** Capacidade de engenharia — título forte + uma linha. */
function Cap({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="card p-5">
      <h3 className="text-base font-bold" style={{ color: "var(--text-primary)" }}>
        {title}
      </h3>
      <p className="mt-1.5 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        {children}
      </p>
    </div>
  );
}

const B = ({ children }: { children: React.ReactNode }) => (
  <strong style={{ color: "var(--text-primary)" }}>{children}</strong>
);

/** Amostra REAL das inconsistências que normalizamos (cru → padrão). */
const NORMALIZE: { cru: string; padrao: string }[] = [
  {
    cru: "Bases misturadas: “Porcentual” sobre a amostra inteira vs. “% válida” só sobre os válidos",
    padrao: "A coluna que fecha 100 com os baldes — e a base fica rotulada (válidos ou bruto)",
  },
  {
    cru: "Tabelas em formato SPSS: Frequência · Porcentual · % válida · % acumulada",
    padrao: "Extraímos só a coluna certa, escolhida pela soma — não pelo palpite",
  },
  {
    cru: "Separador nome–partido variando na MESMA tabela (hífen numa linha, travessão na outra)",
    padrao: "Partido isolado, separador descartado — o dado é o partido, não a tipografia",
  },
  {
    cru: "Registro do TSE em formatos diferentes: “BR-04496/2026” aqui, “AC094662026” ali",
    padrao: "Uma chave normalizada que casa a mesma pesquisa vinda de fontes diferentes",
  },
  {
    cru: "Brancos, nulos, indecisos e NS/NR com rótulos e agrupamentos distintos a cada instituto",
    padrao: "Baldes mapeados a um esquema único, estruturalmente separados do voto",
  },
  {
    cru: "Datas soltas: 29/03/2026, 2026-03-29, “divulgada em abril”",
    padrao: "ISO, com o fim do trabalho de campo como referência de ordenação",
  },
  {
    cru: "Arredondamentos que não fecham (frequências somando 1.029 num total de 1.030)",
    padrao: "Conferido em leitura cega dupla; a folga é medida e anotada, não ignorada",
  },
  {
    cru: "Cenários rotulados igual, mas com elencos diferentes de candidatos",
    padrao: "Desambiguados pelo elenco — cada cenário vira a sua própria série",
  },
];

export default function MetodologiaPage() {
  const ds = loadDataset();
  const polls = ds.polls;
  const institutos = new Set(polls.map((p) => p.pollster.toLowerCase().trim())).size;
  const estados = new Set(polls.map((p) => p.state).filter(Boolean)).size;
  const candidatos = new Set(polls.flatMap((p) => p.results.map((r) => candKey(r.candidate)))).size;
  const perguntas = countLines("questions.ndjson");
  const conflitos = countLines("conflicts.ndjson");
  const fmt = (n: number) => n.toLocaleString("pt-BR");

  return (
    <div className="space-y-10">
      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <header className="max-w-4xl">
        <p className="text-[13px] font-bold uppercase tracking-[0.16em]" style={{ color: "var(--accent)" }}>
          Metodologia &amp; Integridade
        </p>
        <h1 className="mt-2 text-3xl font-extrabold leading-tight sm:text-[42px]" style={{ color: "var(--text-primary)" }}>
          A média não opina.<br />Ela revela o padrão.
        </h1>
        <p className="mt-4 max-w-3xl text-base leading-relaxed sm:text-lg" style={{ color: "var(--text-secondary)" }}>
          <B>{fmt(polls.length)} pesquisas</B> de <B>{institutos} institutos</B>, coletadas de fontes
          públicas, normalizadas por inteligência artificial, validadas linha a linha e agregadas por uma
          regra fixa. Sem achismo. Sem número inventado. <B>Todo dado é rastreável até a fonte original.</B>
        </p>
      </header>

      {/* ── STAT CARDS · teste de 6 segundos ─────────────────────────────── */}
      <section aria-label="Números do banco">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <Stat value={fmt(polls.length)} label="pesquisas catalogadas" accent />
          <Stat value={String(institutos)} label="institutos de pesquisa" />
          <Stat value={String(estados)} label="estados + Brasil" />
          <Stat value={fmt(candidatos)} label="candidatos acompanhados" />
          <Stat value={fmt(conflitos)} label="divergências entre fontes reconciliadas" accent />
          <Stat value="2×/dia" label="atualização automática" />
        </div>
        <div
          className="card mt-3 flex flex-wrap items-center justify-center gap-x-8 gap-y-2 p-3 text-center text-sm font-semibold"
          style={{ color: "var(--text-secondary)" }}
        >
          <span><B>0</B> números estimados</span>
          <span><B>100%</B> com link à fonte primária</span>
          <span><B>CC-BY</B> — dado aberto e reproduzível</span>
        </div>
      </section>

      {/* ── POR QUE MÉDIA ────────────────────────────────────────────────── */}
      <section className="max-w-4xl space-y-3">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Por que média?
        </h2>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Uma pesquisa isolada é um <B>retrato tremido</B>: oscila com a metodologia de cada instituto, com a
          margem de erro e com o dia em que foi a campo. Ler uma só é confundir ruído com sinal. O padrão — quem
          lidera, por quanto, para onde a disputa caminha — só aparece quando você <B>empilha muitas</B> e olha
          o conjunto.
        </p>
        <p className="text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          É o que a média faz. E, junto dela, a <B>linha do tempo</B> aplica a mesma regra retroativamente: cada
          ponto é o que a média do site mostraria naquele dia. Você não vê um número — vê a <B>tendência</B>. É a
          diferença entre uma manchete e uma leitura eleitoral.
        </p>
      </section>

      {/* ── O MÉTODO DA MÉDIA ────────────────────────────────────────────── */}
      <section className="max-w-4xl space-y-4">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          O método da média
        </h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Cap title="10 mais recentes, no máximo 2 por instituto">
            A média de cada disputa usa as <B>10 pesquisas mais recentes</B>, com <B>no máximo 2 por
            instituto</B> — para que uma casa que publica toda semana não carregue a média sozinha, com o próprio
            viés. É um número fixo de pesquisas, não uma janela de dias: todas as disputas usam a mesma base.
          </Cap>
          <Cap title="Piso de 3, sempre transparente">
            Em disputas pouco pesquisadas o limite cede até completar <B>3 pesquisas</B>, e a média avisa. A
            quantidade usada aparece sempre ao lado do número, e a tabela abaixo mostra <B>todas</B> as pesquisas
            — inclusive as que ficaram fora da janela.
          </Cap>
          <Cap title="2º turno nunca é misturado">
            Cada confronto (par de candidatos) é uma disputa própria, com suas 10 pesquisas. No 1º turno, a média
            de cada candidato usa as pesquisas que <B>testaram aquele candidato</B> — sem inventar cenário que
            ninguém pesquisou.
          </Cap>
          <Cap title="Nomes unificados entre fontes">
            &ldquo;Lula&rdquo; e &ldquo;Luiz Inácio Lula da Silva&rdquo; são a mesma série. A canonização une as
            grafias antes de qualquer conta — a base de todos os <B>{fmt(candidatos)} candidatos</B> que
            acompanhamos.
          </Cap>
        </div>
      </section>

      {/* ── A ENGENHARIA (artefato de currículo) ─────────────────────────── */}
      <section className="max-w-5xl space-y-4">
        <div className="max-w-3xl">
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            A engenharia por trás
          </h2>
          <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            O trabalho pesado é invisível — e é exatamente o que separa um agregador sério de uma planilha. Da
            coleta ao gráfico, cada etapa é automatizada, testada e <B>determinística</B>: a mesma entrada produz
            o mesmo banco, byte a byte.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Cap title="Coleta multi-fonte + desduplicação">
            Poder360, Wikipédia e o registro oficial <B>PesqEle/TSE</B> entram por uma escada de resolução com
            prioridade de fonte. A mesma operação de campo vinda de dois lugares é unida por <B>chave de registro
            do TSE</B> — uma pesquisa, não duas.
          </Cap>
          <Cap title="Normalização por IA">
            Nomes de urna, apelidos, partidos e grafias divergentes são canonizados em séries únicas — o que
            permite comparar o incomparável entre {institutos} institutos e {fmt(polls.length)} pesquisas.
          </Cap>
          <Cap title="Leitura cega dupla de PDFs">
            As íntegras dos institutos são lidas <B>duas vezes, de forma independente</B> (texto + visual) e
            comparadas máquina a máquina. Divergência entre as leituras vira <B>revisão</B> — nunca um chute.
          </Cap>
          <Cap title="Validação linha a linha">
            Constraints e baterias de teste guardam o banco: um dado que quebra uma regra <B>barra a
            publicação</B> e o site mantém o último banco válido. Nada quebrado vai ao ar.
          </Cap>
          <Cap title={`${fmt(conflitos)} divergências registradas`}>
            Quando duas fontes discordam de uma mesma pesquisa, a divergência é <B>anotada</B>, não escolhida em
            silêncio. Integridade é mostrar onde os dados brigam — não esconder.
          </Cap>
          <Cap title="Cruzamentos matemáticos">
            Sobre a base rodam análises derivadas: <Link href="/institutos" className="underline" style={{ color: "var(--accent)" }}>viés dos institutos</Link>{" "}
            (efeito casa, leave-one-out), rejeição bruta e líquida isolada do voto, tendências retroativas e
            simulações de 2º turno par a par.
          </Cap>
        </div>
      </section>

      {/* ── DO CAOS AO PADRÃO · normalização ─────────────────────────────── */}
      <section className="max-w-4xl space-y-4">
        <div>
          <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
            Do caos ao padrão
          </h2>
          <p className="mt-2 text-base leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Pesquisa não chega em formato. Cada instituto publica do seu jeito — colunas, bases, separadores,
            rótulos e datas diferentes, às vezes <B>inconsistentes dentro da mesma tabela</B>. Padronizar tudo
            isso <B>sem perder o número certo</B> é metade do trabalho. Uma amostra do que domamos:
          </p>
        </div>
        <div className="card p-0">
          <div className="grid grid-cols-1 px-4 py-2 text-[11px] font-bold uppercase tracking-wide sm:grid-cols-[1fr_auto_1fr] sm:gap-4" style={{ color: "var(--text-muted)", borderBottom: "1px solid var(--grid)" }}>
            <span>O que chega (cru)</span>
            <span className="hidden sm:block" aria-hidden="true">&nbsp;</span>
            <span>O que publicamos (padrão)</span>
          </div>
          {NORMALIZE.map((n, i) => (
            <div
              key={i}
              className="grid grid-cols-1 gap-1 px-4 py-3.5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-4"
              style={i > 0 ? { borderTop: "1px solid var(--grid)" } : undefined}
            >
              <div className="text-sm leading-snug" style={{ color: "var(--text-muted)" }}>
                {n.cru}
              </div>
              <div className="hidden text-lg font-bold sm:block" style={{ color: "var(--accent)" }} aria-hidden="true">
                →
              </div>
              <div className="text-sm font-medium leading-snug" style={{ color: "var(--text-primary)" }}>
                {n.padrao}
              </div>
            </div>
          ))}
        </div>
        <p className="text-sm" style={{ color: "var(--text-muted)" }}>
          E quando duas leituras da mesma íntegra discordam, ou duas fontes trazem números diferentes da mesma
          pesquisa, isso não é escondido: entra nas <B>{fmt(conflitos)} divergências</B> registradas.
        </p>
      </section>

      {/* ── INTEGRIDADE ──────────────────────────────────────────────────── */}
      <section className="max-w-4xl space-y-4">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Integridade, sem asterisco
        </h2>
        <div className="grid gap-4 sm:grid-cols-3">
          <Cap title="Buscar e citar, ou nada">
            Nenhum número é estimado. Se o instituto não publicou, aparece <B>&ldquo;—&rdquo;</B>. Preferimos um
            buraco honesto a um chute confortável.
          </Cap>
          <Cap title="Rastreável até a origem">
            Cada linha carrega o <B>link da fonte</B> — íntegra, matéria ou registro do TSE. Nada aqui pede que
            você confie na nossa palavra.
          </Cap>
          <Cap title="Aberto e reproduzível">
            Licença <B>CC-BY 4.0</B>: os dados podem ser citados e reusados. A regra é pública, o código é
            determinístico, os números batem quando recalculados.
          </Cap>
        </div>
      </section>

      {/* ── FONTES ───────────────────────────────────────────────────────── */}
      <section className="max-w-4xl space-y-3">
        <h2 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          Fontes
        </h2>
        <ul className="space-y-1.5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {ds.sources.map((s) => (
            <li key={s.name}>
              ·{" "}
              <a className="underline" href={s.url} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>
                {s.name}
              </a>
              {s.last_ok ? ` — última coleta ok: ${s.last_ok.slice(0, 10)}` : ""}
            </li>
          ))}
        </ul>
      </section>

      {/* ── LIMITAÇÕES ───────────────────────────────────────────────────── */}
      <section className="max-w-4xl space-y-3 border-t pt-6" style={{ borderColor: "var(--grid)" }}>
        <h2 className="text-lg font-bold" style={{ color: "var(--text-primary)" }}>
          Limitações — porque honestidade também é método
        </h2>
        <p className="text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Pesquisa eleitoral é <B>retrato do momento, não previsão</B>. A média reduz, mas não elimina, o erro
          sistemático dos institutos — por isso publicamos também o <Link href="/institutos" className="underline" style={{ color: "var(--accent)" }}>viés de cada casa</Link>. Margens de erro individuais constam na tabela de cada disputa quando publicadas. Os
          números pertencem aos institutos citados; este site apenas os agrega, com link para a fonte original de
          cada linha.
        </p>
      </section>
    </div>
  );
}
