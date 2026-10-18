import type { Metadata } from "next";
import Link from "next/link";
import { fmtDate, fmtPct } from "@/lib/format";
import { backtest, calibration, METHOD_LABELS, VARIANT_LABELS, type Agregado } from "@/lib/forecast";
import { Trilha } from "@/components/previsao/ForecastBits";
import { CoverageChart, PitChart, ReliabilityChart } from "@/components/previsao/ForecastCharts";

export const metadata: Metadata = {
  title: "Previsão · Desempenho histórico",
  description:
    "Validação walk-forward fora da amostra do modelo de previsão no 1º turno de 2026: erro, CRPS, cobertura dos intervalos, Brier e confiabilidade, contra a média do site e a última pesquisa.",
};

const ORDEM = ["modelo", "modelo_sem_casa", "modelo_sem_sistematico", "media_site", "ultima_pesquisa"];
const COR: Record<string, string> = {
  modelo: "var(--series-1)",
  modelo_sem_casa: "var(--series-3)",
  modelo_sem_sistematico: "var(--series-8)",
  media_site: "var(--series-4)",
  ultima_pesquisa: "var(--series-7)",
};
const CAT: Record<string, string> = { presidente_t1: "Presidente · 1º turno", governador_t1: "Governador · 1º turno", senador_t1: "Senado · 1º turno" };

const f2 = (v: number | undefined) => (v == null ? "—" : v.toFixed(2).replace(".", ","));
const pc = (v: number | undefined) => (v == null ? "—" : `${fmtPct(v * 100, 0)}%`);

function Card({ titulo, sub, children }: { titulo: string; sub?: string; children: React.ReactNode }) {
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

function Linha({ m, a }: { m: string; a: Agregado }) {
  return (
    <tr className="border-t" style={{ borderColor: "var(--grid)" }}>
      <td className="py-1 pr-2 font-semibold">
        <span aria-hidden="true" className="mr-1.5 inline-block h-2.5 w-2.5 rounded-full align-middle" style={{ background: COR[m] }} />
        {METHOD_LABELS[m] ?? m}
      </td>
      <td className="tabular py-1 pr-2 text-right">{f2(a.mae_pp)}</td>
      <td className="tabular py-1 pr-2 text-right">{f2(a.crps_pp)}</td>
      <td className="tabular py-1 pr-2 text-right">{pc(a.coverage["50"])}</td>
      <td className="tabular py-1 pr-2 text-right">{pc(a.coverage["80"])}</td>
      <td className="tabular py-1 pr-2 text-right">{pc(a.coverage["95"])}</td>
      <td className="tabular py-1 pr-2 text-right">{f2(a.brier_first)}</td>
      <td className="tabular py-1 pr-2 text-right">{f2(a.log_first)}</td>
      <td className="tabular py-1 text-right">{pc(a.leader_correct)}</td>
    </tr>
  );
}

function Tabela({ rows }: { rows: [string, Agregado][] }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[720px] text-xs">
        <thead>
          <tr className="text-left uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
            <th className="py-1 pr-2 font-semibold">Método</th>
            <th className="py-1 pr-2 text-right font-semibold" title="Erro absoluto médio da mediana, por candidato">EAM (p.p.)</th>
            <th className="py-1 pr-2 text-right font-semibold" title="Escore contínuo ranqueado — menor é melhor">CRPS (p.p.)</th>
            <th className="py-1 pr-2 text-right font-semibold">Cob. 50%</th>
            <th className="py-1 pr-2 text-right font-semibold">Cob. 80%</th>
            <th className="py-1 pr-2 text-right font-semibold">Cob. 95%</th>
            <th className="py-1 pr-2 text-right font-semibold" title="Brier multiclasse de quem termina em 1º — menor é melhor">Brier 1º</th>
            <th className="py-1 pr-2 text-right font-semibold" title="Log-escore de quem termina em 1º — maior é melhor">Log 1º</th>
            <th className="py-1 text-right font-semibold" title="Mera classificação: não mede calibração">Líder certo</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(([m, a]) => (
            <Linha key={m} m={m} a={a} />
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function DesempenhoPage() {
  const b = backtest();
  const cal = calibration();
  const head = (
    <header className="flex flex-col gap-2">
      <Trilha itens={[{ href: "/previsao", label: "Previsão Estatística" }, { label: "Desempenho histórico" }]} />
      <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>Desempenho histórico</h1>
      <p className="max-w-[80ch] text-sm leading-relaxed" style={{ color: "var(--text-secondary)" }}>
        Validação walk-forward fora da amostra: para cada disputa e cada horizonte, o modelo foi ajustado SÓ com o que o banco do site
        tinha naquela data (o commit do dia, no histórico do git) e comparado depois com o resultado oficial do TSE.
      </p>
    </header>
  );
  if (!b) {
    return (
      <div className="flex min-w-0 flex-col gap-6">
        {head}
        <p className="card p-4 text-sm">Nenhum backtest publicado.</p>
      </div>
    );
  }
  const metodos = ORDEM.filter((m) => b.summary[m]);
  const sel = b.selection.modelo?.best as { variant: string; nu: number; structure?: string } | undefined;
  return (
    <div className="flex min-w-0 flex-col gap-6">
      {head}

      <section className="card p-4" style={{ borderLeft: "3px solid var(--accent)" }}>
        <h2 className="text-[13px] font-bold uppercase tracking-wide" style={{ color: "var(--text-primary)" }}>Leia isto antes dos números</h2>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-sm" style={{ color: "var(--text-secondary)" }}>
          <li>
            Uma eleição só: as {b.summary.modelo?.overall.n_contests ?? 0} disputas avaliadas são do 1º turno de {fmtDate(b.election.date)}. O erro comum
            daquela eleição está em todas; a validação deixa um estado de fora por vez, mas não remove esse componente. Os números descrevem 2026 e
            tendem a ser otimistas para outra eleição.
          </li>
          <li>Não há no banco pesquisas de 2010–2022. Por isso nenhuma probabilidade é publicada no site (exigimos ≥ 2 eleições da mesma categoria).</li>
          <li>Acertar o líder não é o mesmo que estar calibrado: a coluna “Líder certo” está aqui só para mostrar a diferença.</li>
        </ul>
      </section>

      <Card titulo="Resumo · todos os horizontes" sub={`${b.n_items} pares disputa × horizonte com resultado mapeável; menor é melhor em EAM, CRPS e Brier`}>
        <Tabela rows={metodos.map((m) => [m, b.summary[m].overall])} />
        {sel && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Padrão de produção escolhido pela densidade preditiva fora da amostra: erro sistemático {VARIANT_LABELS[sel.variant] ?? sel.variant}
            {sel.structure ? `, forma ${sel.structure === "mult" ? "multinomial" : "isotrópica"}` : ""}, caudas t com ν = {sel.nu >= 500 ? "∞ (normal)" : sel.nu}.
          </p>
        )}
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card titulo="Cobertura dos intervalos por horizonte" sub="Modelo completo: com que frequência o resultado caiu dentro do intervalo (tracejado = nominal)">
          <CoverageChart
            horizons={b.horizons}
            series={[
              { label: "80%", color: "var(--series-1)", nominal: 0.8, values: b.horizons.map((h) => b.summary.modelo?.by_horizon[String(h)]?.coverage["80"] ?? null) },
              { label: "50%", color: "var(--series-4)", nominal: 0.5, values: b.horizons.map((h) => b.summary.modelo?.by_horizon[String(h)]?.coverage["50"] ?? null) },
            ]}
          />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>Azul: intervalo de 80%. Amarelo: 50%. Eixo: dias antes da eleição.</p>
        </Card>
        <Card titulo="Confiabilidade" sub="Probabilidade de terminar em 1º, prevista × observada">
          <ReliabilityChart
            series={["modelo", "media_site"].filter((m) => b.summary[m]).map((m) => ({ label: METHOD_LABELS[m], color: COR[m], bins: b.summary[m].reliability_first }))}
          />
        </Card>
      </div>

      <Card titulo="Por horizonte · modelo completo × média do site" sub="EAM e CRPS em pontos percentuais">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-xs">
            <thead>
              <tr className="text-left uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                <th className="py-1 pr-2 font-semibold">Dias antes</th>
                <th className="py-1 pr-2 text-right font-semibold">Disputas</th>
                <th className="py-1 pr-2 text-right font-semibold">EAM modelo</th>
                <th className="py-1 pr-2 text-right font-semibold">EAM média</th>
                <th className="py-1 pr-2 text-right font-semibold">CRPS modelo</th>
                <th className="py-1 pr-2 text-right font-semibold">CRPS média</th>
                <th className="py-1 pr-2 text-right font-semibold">Cob. 80% modelo</th>
                <th className="py-1 text-right font-semibold">Fonte do banco</th>
              </tr>
            </thead>
            <tbody>
              {b.horizons.map((h) => {
                const m = b.summary.modelo?.by_horizon[String(h)];
                const a = b.summary.media_site?.by_horizon[String(h)];
                const src = b.sources.find((x) => x.horizon === h);
                return (
                  <tr key={h} className="border-t" style={{ borderColor: "var(--grid)" }}>
                    <td className="tabular py-1 pr-2">{h}</td>
                    <td className="tabular py-1 pr-2 text-right">{m?.n_contests ?? "—"}</td>
                    <td className="tabular py-1 pr-2 text-right">{f2(m?.mae_pp)}</td>
                    <td className="tabular py-1 pr-2 text-right">{f2(a?.mae_pp)}</td>
                    <td className="tabular py-1 pr-2 text-right">{f2(m?.crps_pp)}</td>
                    <td className="tabular py-1 pr-2 text-right">{f2(a?.crps_pp)}</td>
                    <td className="tabular py-1 pr-2 text-right">{pc(m?.coverage["80"])}</td>
                    <td className="py-1 text-right">{src?.kind === "vintage" ? `commit ${src.commit?.slice(0, 7)}` : "reconstruído"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="grid min-w-0 gap-5 lg:grid-cols-2">
        <Card titulo="Por tipo de disputa · modelo completo">
          <Tabela rows={Object.entries(b.summary.modelo?.by_category ?? {}).map(([c, a]) => [CAT[c] ?? c, a] as [string, Agregado])} />
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>A categoria presidencial tem UMA disputa: os números dela são anedóticos.</p>
        </Card>
        <Card titulo="Histograma PIT · modelo completo" sub="Plano = calibrado; corcunda no meio = intervalos largos demais; U = estreitos demais">
          {b.summary.modelo && <PitChart counts={b.summary.modelo.overall.pit_hist} color="var(--series-1)" />}
        </Card>
      </div>

      {b.revision_leakage.length > 0 && (
        <Card titulo="Por que vintages: o vazamento por revisão" sub="A média do site na data, lida do commit do dia × reconstruída do banco atual filtrado pela data">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-xs">
              <thead>
                <tr className="text-left uppercase tracking-wide" style={{ color: "var(--text-muted)" }}>
                  <th className="py-1 pr-2 font-semibold">Data</th>
                  <th className="py-1 pr-2 text-right font-semibold">Pesquisas (vintage × hoje)</th>
                  <th className="py-1 pr-2 text-right font-semibold">Diferença média</th>
                  <th className="py-1 pr-2 text-right font-semibold">EAM vintage</th>
                  <th className="py-1 text-right font-semibold">EAM reconstruído</th>
                </tr>
              </thead>
              <tbody>
                {b.revision_leakage.map((r) => (
                  <tr key={r.ref_date} className="border-t" style={{ borderColor: "var(--grid)" }}>
                    <td className="tabular py-1 pr-2">{fmtDate(r.ref_date)}</td>
                    <td className="tabular py-1 pr-2 text-right">{r.polls_vintage.toLocaleString("pt-BR")} × {r.polls_reconstructed.toLocaleString("pt-BR")}</td>
                    <td className="tabular py-1 pr-2 text-right">{f2(r.mean_abs_diff_pp)} p.p.</td>
                    <td className="tabular py-1 pr-2 text-right">{f2(r.mae_vintage_pp)}</td>
                    <td className="tabular py-1 text-right">{f2(r.mae_reconstructed_pp)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            O banco de hoje tem pesquisas que chegaram atrasadas e correções feitas depois. Um backtest que só filtrasse por data veria esse banco
            “melhorado” e pareceria mais preciso do que o site realmente poderia ter sido.
          </p>
        </Card>
      )}

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Ajustes: {Object.entries(b.fit_status).map(([k, v]) => `${k} ${v}`).join(" · ")}. R-hat máximo (pior ajuste) {f2(b.fit_diagnostics.rhat_max_worst)}.
        {cal ? ` Calibração ${cal.calibration_id}.` : ""} Dados completos: <Link href="/api/forecast/model-performance.json" className="underline">/api/forecast/model-performance.json</Link>.
      </p>
    </div>
  );
}
