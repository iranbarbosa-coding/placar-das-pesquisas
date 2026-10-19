import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate } from "@/lib/format";
import { forecastRaces, latestPublished, latestSnapshot, raceLabel } from "@/lib/forecast";
import { Glossario, Metadados, Motivos, StatusSelos, Trilha } from "@/components/previsao/ForecastBits";
import { Faixas, Favorito, TabelaNumeros } from "@/components/previsao/ForecastTables";

export const metadata: Metadata = {
  title: "Previsão Estatística",
  description:
    "Estimativa atual e projeção para o dia da eleição, por modelo estatístico sobre as pesquisas — separadas da média das pesquisas, com intervalos de incerteza e validação histórica.",
};

function CardDisputa({ raceId }: { raceId: string }) {
  const latest = latestSnapshot(raceId);
  const pub = latestPublished(raceId);
  const s = pub ?? latest;
  if (!s) return null;
  const naoPublicado = latest && latest.status.overall !== "publicado";
  return (
    <section className="card flex min-w-0 flex-col gap-3 p-4">
      <header className="flex flex-wrap items-start justify-between gap-2">
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
          {raceLabel(s)}
        </h2>
        <Link href={`/previsao/${s.race_id}`} className="text-xs font-semibold hover:underline" style={{ color: "var(--accent)" }}>
          Detalhes, gráficos e dados →
        </Link>
      </header>
      {naoPublicado && (
        <p className="rounded p-2 text-xs" style={{ background: "var(--surface-2)", color: "var(--text-secondary)" }}>
          A rodada de {fmtDate(latest!.reference_date)} não publicou estimativas ({latest!.status.reasons[0] ?? latest!.status.overall}).
          {pub ? ` Abaixo, o último snapshot publicado, de ${fmtDate(pub.reference_date)}.` : " Não há snapshot publicado anterior."}
        </p>
      )}
      {s.status.overall === "publicado" ? (
        <>
          <Favorito s={s} />
          <StatusSelos s={s} />
          <Faixas s={s} />
          <TabelaNumeros s={s} />
          <Metadados s={s} />
        </>
      ) : (
        <div className="text-sm" style={{ color: "var(--text-secondary)" }}>
          <p className="font-semibold">Dados insuficientes para uma estimativa defensável.</p>
          <Motivos reasons={s.status.reasons} />
        </div>
      )}
    </section>
  );
}

export default function PrevisaoPage() {
  const races = forecastRaces();
  const algum = races.map((r) => latestPublished(r.race_id) ?? latestSnapshot(r.race_id)).find(Boolean) ?? null;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      <header className="flex flex-col gap-2">
        <Trilha itens={[{ label: "Previsão Estatística" }]} />
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Previsão Estatística</h1>
          <div className="flex gap-4 text-xs font-semibold">
            <Link href="/previsao/metodologia" className="hover:underline" style={{ color: "var(--accent)" }}>Como o modelo funciona →</Link>
            <Link href="/previsao/desempenho" className="hover:underline" style={{ color: "var(--accent)" }}>Desempenho histórico →</Link>
          </div>
        </div>
        <p className="max-w-[80ch] text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
          Uma camada SEPARADA da média das pesquisas. A média mostra o que as pesquisas mediram; o modelo estima o apoio atual
          descontando o viés de cada instituto e projeta o dia da eleição com a incerteza que as pesquisas já mostraram contra as
          urnas. São estimativas, não resultados — e onde a validação histórica não sustenta um número, ele não é publicado.
        </p>
      </header>

      <Glossario />

      {algum && algum.status.probability === "retida" && (
        <section className="card p-4" style={{ borderLeft: "3px solid var(--accent)" }}>
          <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
            Por que não há probabilidade de vitória
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            Uma probabilidade só é publicada quando o modelo foi validado contra resultados reais do MESMO tipo de disputa, em mais
            de uma eleição. O banco tem pesquisas apenas de 2026, e nenhum 2º turno com resultado oficial ainda.
          </p>
        </section>
      )}
      {algum && algum.status.probability === "experimental" && (
        <section className="card p-4" style={{ borderLeft: "3px solid var(--accent)" }}>
          <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>
            Como ler a chance de vitória
          </h2>
          <p className="mt-1 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            É a fração das 100.000 simulações do dia da eleição em que o candidato termina com mais votos válidos. Um candidato com
            70% de chance perde em 3 de cada 10 cenários — não é certeza. A probabilidade é <strong>experimental</strong>: ainda não
            há 2º turno com resultado oficial no banco para conferir se o modelo acerta essas chances, e o erro das pesquisas usado
            aqui foi medido no 1º turno de 2026. Depois de 25/10 o 2º turno entra na validação automaticamente.
          </p>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
            <strong>E a tendência?</strong> Cada quadro mostra a média das 10 últimas pesquisas e se ela vem subindo ou caindo. A
            chance de vitória não estende essa tendência até a eleição de propósito: no teste com o 1º turno de 2026, projetar o
            “embalo” das últimas semanas piorou a previsão em todas as versões testadas — o erro médio subiu de 5,1 para até 6,8
            pontos. Os números estão em <Link href="/previsao/desempenho" className="underline">Desempenho histórico</Link>.
          </p>
        </section>
      )}

      {races.length === 0 ? (
        <section className="card p-4 text-sm" style={{ color: "var(--text-secondary)" }}>
          <p className="font-semibold" style={{ color: "var(--text-primary)" }}>Previsão indisponível no momento.</p>
          <p className="mt-1">Nenhum snapshot validado foi publicado ainda. A média das pesquisas segue disponível nas páginas de cada disputa.</p>
        </section>
      ) : (
        <div className="grid min-w-0 gap-5 xl:grid-cols-2">
          {races.map((r) => (
            <CardDisputa key={r.race_id} raceId={r.race_id} />
          ))}
        </div>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Dados abertos: <Link href="/api/forecast/races.json" className="underline">/api/forecast/races.json</Link> (CC BY 4.0). Cada previsão
        publicada é um snapshot imutável, reprodutível a partir da versão do modelo, da configuração, do banco da data e da semente.
      </p>
    </div>
  );
}
