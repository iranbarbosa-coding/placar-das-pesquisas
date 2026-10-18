import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { colorMap, colorOf } from "@/lib/colors";
import { fmtDate, fmtPct, fmtSigned } from "@/lib/format";
import { forecastRaces, latestPublished, latestSnapshot, raceById, raceLabel } from "@/lib/forecast";
import { Metadados, Motivos, StatusSelos, Trilha } from "@/components/previsao/ForecastBits";
import { DistributionChart, NowcastChart, VarianceBar } from "@/components/previsao/ForecastCharts";
import { Faixas, TabelaNumeros } from "@/components/previsao/ForecastTables";

export const dynamicParams = false;

export function generateStaticParams() {
  return forecastRaces().map((r) => ({ raceId: r.race_id }));
}

export async function generateMetadata({ params }: { params: Promise<{ raceId: string }> }): Promise<Metadata> {
  const { raceId } = await params;
  const r = raceById(raceId);
  return {
    title: r ? `Previsão · ${raceLabel(r)}` : "Previsão",
    description: "Estimativa atual, projeção para o dia da eleição e incerteza, por modelo estatístico sobre as pesquisas.",
  };
}

const MOTIVO_EXCLUSAO: Record<string, string> = {
  par_diferente: "outro confronto (não o par das urnas)",
  fora_da_janela: "campo fora da janela do modelo",
  mesma_amostra: "outra pergunta da mesma operação de campo",
  provavel_republicacao: "provável republicação",
  percentual_invalido: "percentual inválido",
  candidato_nao_resolvido: "candidato sem identificador",
  indisponivel_na_data: "ainda não divulgada na data",
  campo_posterior_a_data: "campo depois da data",
  incompleta_na_fonte: "incompleta na fonte",
  amostra_municipal: "amostra municipal",
  sem_data: "sem data",
  elenco_incompleto: "falta candidato acompanhado",
};

function Card({ titulo, children, sub }: { titulo: string; children: React.ReactNode; sub?: string }) {
  return (
    <section className="card flex min-w-0 flex-col gap-3 p-4">
      <header>
        <h2 className="text-[15px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>{titulo}</h2>
        {sub && <p className="mt-0.5 text-xs" style={{ color: "var(--text-muted)" }}>{sub}</p>}
      </header>
      {children}
    </section>
  );
}

export default async function PrevisaoDisputa({ params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params;
  const r = raceById(raceId);
  if (!r) notFound();
  const latest = latestSnapshot(raceId);
  const s = latestPublished(raceId) ?? latest;
  const label = raceLabel(r);
  const head = (
    <header className="flex flex-col gap-2">
      <Trilha itens={[{ href: "/previsao", label: "Previsão Estatística" }, { label }]} />
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>{label}</h1>
    </header>
  );
  if (!s || s.status.overall !== "publicado") {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {head}
        <Card titulo="Dados insuficientes">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            O modelo não tem base defensável para esta disputa agora; nenhuma estimativa é publicada.
          </p>
          {s && <Motivos reasons={s.status.reasons} />}
        </Card>
      </div>
    );
  }
  const names = s.candidates.map((c) => c.name);
  const colors = colorMap(names);
  const cols = names.map((n) => colorOf(colors, n));
  const polls = s.input.polls ?? [];
  const desc = s.projection?.variance_decomposition;
  const he = s.house_effects?.rows ?? [];

  return (
    <div className="flex min-w-0 flex-col gap-6">
      {head}
      {latest && latest.output_sha256 !== s.output_sha256 && (
        <p className="card p-3 text-xs" style={{ color: "var(--text-secondary)" }}>
          A rodada mais recente ({fmtDate(latest.reference_date)}) não publicou: {latest.status.reasons.join("; ")}. Esta página mostra o último snapshot publicado.
        </p>
      )}
      <Card titulo="Resumo" sub={`Referência ${fmtDate(s.reference_date)} · ${s.horizon_days} dias até a eleição`}>
        <StatusSelos s={s} />
        <Faixas s={s} />
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Losango vazado = média das pesquisas (fato). Barra cheia = estimativa atual, intervalo de 80%, com a mediana marcada.
          Caixa {s.status.projection === "publicada" ? "" : "tracejada "}= projeção para o dia da eleição, 80%; linha fina = 95%.
        </p>
        <TabelaNumeros s={s} />
        {s.status.reasons.length > 0 && (
          <div>
            <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>O que está retido e por quê</p>
            <Motivos reasons={s.status.reasons} />
          </div>
        )}
        {s.note && <p className="text-xs" style={{ color: "var(--text-muted)" }}>{s.note}</p>}
      </Card>

      <Card titulo="Evolução da estimativa atual" sub="Como o modelo lê o apoio de cada candidato ao longo do tempo, com as pesquisas que o alimentam">
        {s.nowcast && <NowcastChart series={s.nowcast.series} polls={polls} labels={names} colors={cols} title={`Evolução da estimativa atual — ${label}`} />}
      </Card>

      {s.projection && (
        <Card
          titulo={`Distribuição da projeção${s.status.projection === "experimental" ? " · experimental" : ""}`}
          sub={`${s.projection.draws.toLocaleString("pt-BR")} simulações do resultado em votos válidos`}
        >
          {s.projection.summary.slice(0, s.round === 2 ? 1 : names.length).map((row, k) => (
            <div key={row.label}>
              <p className="text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>{row.label}</p>
              <DistributionChart
                histogram={row.histogram}
                color={cols[k]}
                label={row.label}
                experimental={s.status.projection !== "publicada"}
                marks={[
                  ...(s.round === 2 ? [{ at: 50, text: "50%", kind: "ref" as const }] : []),
                  ...((() => {
                    const avg = s.site_average?.candidates.find((x) => x.candidate_id === s.candidates[k].candidate_id)?.avg;
                    return avg != null ? [{ at: avg, text: `média ${fmtPct(avg)}%`, kind: "fato" as const }] : [];
                  })()),
                ]}
              />
            </div>
          ))}
          {s.round === 2 && (
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Com dois candidatos, a distribuição de {names[1]} é o espelho desta (100 − x).
              {s.status.probability === "retida" &&
                " A área de cada lado dos 50% NÃO deve ser lida como probabilidade de vitória: o erro sistemático desta projeção não foi validado para 2º turno."}
            </p>
          )}
          {desc && (
            <div>
              <p className="mb-1.5 text-xs font-semibold" style={{ color: "var(--text-secondary)" }}>De onde vem a incerteza da projeção</p>
              <VarianceBar parts={desc} />
            </div>
          )}
        </Card>
      )}

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card titulo="Efeito casa estimado" sub={`Desvio de cada instituto em relação ao instituto médio, em p.p. sobre ${s.house_effects?.reference_candidate ?? names[0]}`}>
          {he.length ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                    <th className="py-1 pr-2 font-semibold">Instituto</th>
                    <th className="py-1 pr-2 text-right font-semibold">Pesquisas</th>
                    <th className="py-1 text-right font-semibold">Efeito (80%)</th>
                  </tr>
                </thead>
                <tbody>
                  {he.map((h) => (
                    <tr key={h.pollster} className="border-t" style={{ borderColor: "var(--grid)" }}>
                      <td className="py-1 pr-2">{h.pollster}</td>
                      <td className="tabular py-1 pr-2 text-right">{h.n_polls}</td>
                      <td className="tabular py-1 text-right">
                        {fmtSigned(h.effect_pp_first_candidate["0.5"])}{" "}
                        <span style={{ color: "var(--text-muted)" }}>
                          ({fmtSigned(h.effect_pp_first_candidate["0.1"])} a {fmtSigned(h.effect_pp_first_candidate["0.9"])})
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-1.5 text-xs" style={{ color: "var(--text-muted)" }}>
                Estimado com agrupamento parcial: institutos com poucas pesquisas são puxados para zero. Descritivo, não acusatório. Distinto do
                efeito casa da página <Link href="/institutos" className="underline">Viés dos Institutos</Link>, que usa outra base.
              </p>
            </div>
          ) : (
            <p className="text-sm" style={{ color: "var(--text-secondary)" }}>Um instituto só: efeito casa não identificável.</p>
          )}
        </Card>

        <Card titulo="Dados e reprodutibilidade">
          <Metadados s={s} />
          <div className="text-xs" style={{ color: "var(--text-secondary)" }}>
            <p className="font-semibold">Pesquisas fora do modelo</p>
            <ul className="mt-1 space-y-0.5">
              {Object.entries(s.input.exclusion_counts ?? {}).map(([k, n]) => (
                <li key={k} className="flex justify-between gap-2">
                  <span>{MOTIVO_EXCLUSAO[k] ?? k}</span>
                  <span className="tabular">{n}</span>
                </li>
              ))}
            </ul>
          </div>
          <p className="break-all text-[11px]" style={{ color: "var(--text-muted)" }}>
            Entrada {s.input.dataset_sha256?.slice(0, 16)}… · saída {s.output_sha256.slice(0, 16)}… · semente {s.model.seed} ·
            numpy {s.model.numpy_version} ·{" "}
            <Link href={`/api/forecast/${s.race_id}/methodology.json`} className="underline">pesquisas incluídas e excluídas</Link>
          </p>
        </Card>
      </div>

      {s.diagnostics && (
        <Card titulo="Diagnósticos de convergência" sub={`${s.diagnostics.chains} cadeias × ${s.diagnostics.draws_per_chain.toLocaleString("pt-BR")} sorteios guardados`}>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  <th className="py-1 pr-2 font-semibold">Quantidade</th>
                  <th className="py-1 pr-2 text-right font-semibold">R-hat</th>
                  <th className="py-1 text-right font-semibold">ESS</th>
                </tr>
              </thead>
              <tbody>
                {Object.entries(s.diagnostics.params).map(([k, v]) => (
                  <tr key={k} className="border-t" style={{ borderColor: "var(--grid)" }}>
                    <td className="py-1 pr-2">{k}</td>
                    <td className="tabular py-1 pr-2 text-right">{v.rhat.toFixed(3).replace(".", ",")}</td>
                    <td className="tabular py-1 text-right">{Math.round(v.ess_bulk).toLocaleString("pt-BR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Publicação exige R-hat ≤ 1,01 e ESS ≥ 400 em todas as quantidades. Um ajuste que não passa não é publicado; o snapshot anterior continua no ar.
          </p>
        </Card>
      )}

      <Card titulo="Histórico de previsões" sub="Cada linha é um snapshot imutável: o que o modelo disse naquela data, com o banco daquela data">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[480px] text-xs">
            <thead>
              <tr className="text-left uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                <th className="py-1 pr-2 font-semibold">Data</th>
                <th className="py-1 pr-2 font-semibold">Pesquisas</th>
                {names.map((n) => (
                  <th key={n} className="py-1 pr-2 font-semibold">{n} · atual</th>
                ))}
                <th className="py-1 font-semibold">Situação</th>
              </tr>
            </thead>
            <tbody>
              {[...r.history].reverse().map((e) => (
                <tr key={e.path} className="border-t" style={{ borderColor: "var(--grid)" }}>
                  <td className="tabular py-1 pr-2">{fmtDate(e.reference_date)}</td>
                  <td className="tabular py-1 pr-2">{e.n_polls ?? "—"}</td>
                  {names.map((n, k) => (
                    <td key={n} className="tabular py-1 pr-2">
                      {e.nowcast_median ? `${fmtPct(e.nowcast_median[k])}% (${fmtPct(e.nowcast_q10![k], 0)}–${fmtPct(e.nowcast_q90![k], 0)})` : "—"}
                    </td>
                  ))}
                  <td className="py-1">{e.status.overall}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card titulo="Limitações">
        <ul className="list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
          {s.limitations.map((l) => (
            <li key={l}>{l}</li>
          ))}
        </ul>
        <p className="text-xs" style={{ color: "var(--text-muted)" }}>
          Método completo em <Link href="/previsao/metodologia" className="underline">Como o modelo funciona</Link>; resultados da validação em{" "}
          <Link href="/previsao/desempenho" className="underline">Desempenho histórico</Link>.
        </p>
      </Card>
    </div>
  );
}
