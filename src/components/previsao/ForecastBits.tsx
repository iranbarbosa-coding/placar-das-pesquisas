// Peças pequenas da Previsão Estatística: selos de status, glossário, metadados.
import Link from "next/link";
import { fmtDate } from "@/lib/format";
import type { Snapshot } from "@/lib/forecast";

const TONS = {
  ok: { bg: "var(--surface-2)", fg: "var(--text-primary)", bd: "var(--ring)" },
  aviso: { bg: "var(--surface-2)", fg: "var(--text-secondary)", bd: "var(--axis)" },
};

export function Selo({ children, tom = "ok", title }: { children: React.ReactNode; tom?: keyof typeof TONS; title?: string }) {
  const t = TONS[tom];
  return (
    <span
      title={title}
      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide"
      style={{ background: t.bg, color: t.fg, border: `1px solid ${t.bd}` }}
    >
      {children}
    </span>
  );
}

export function StatusSelos({ s }: { s: Snapshot }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <Selo tom={s.status.nowcast === "publicada" ? "ok" : "aviso"}>
        Estimativa atual: {s.status.nowcast === "publicada" ? "publicada" : s.status.nowcast === "nao_convergiu" ? "não convergiu" : "dados insuficientes"}
      </Selo>
      <Selo tom={s.status.projection === "publicada" ? "ok" : "aviso"} title="A projeção usa um erro sistemático calibrado; ver motivos abaixo.">
        Projeção: {s.status.projection === "publicada" ? "calibrada" : s.status.projection === "experimental" ? "experimental" : "retida"}
      </Selo>
      <Selo tom={s.status.probability === "publicada" ? "ok" : "aviso"}>
        Probabilidade: {s.status.probability === "publicada" ? "publicada" : "não publicada"}
      </Selo>
    </div>
  );
}

/** As quatro grandezas, sempre com o mesmo nome e a mesma marca visual. */
export function Glossario() {
  const itens: { marca: React.ReactNode; termo: string; texto: string }[] = [
    {
      marca: <span aria-hidden="true" className="inline-block h-2.5 w-2.5 rotate-45 border-[1.5px]" style={{ borderColor: "var(--text-primary)", background: "var(--surface-1)" }} />,
      termo: "Média das pesquisas",
      texto: "O que as pesquisas mediram: a média publicada pelo site (10 mais recentes, no máximo 2 por instituto). É um fato, não um modelo.",
    },
    {
      marca: <span aria-hidden="true" className="inline-block h-2.5 w-4 rounded-sm" style={{ background: "var(--text-secondary)" }} />,
      termo: "Estimativa atual",
      texto: "O apoio provável HOJE, estimado pelo modelo a partir de todas as pesquisas recentes, descontando o viés de cada instituto.",
    },
    {
      marca: <span aria-hidden="true" className="inline-block h-3 w-5 rounded-sm border border-dashed" style={{ borderColor: "var(--text-secondary)", background: "var(--surface-2)" }} />,
      termo: "Projeção para o dia da eleição",
      texto: "Para onde o apoio pode ir até a votação, somando a mudança de opinião possível e o erro que as pesquisas já cometeram contra as urnas.",
    },
    {
      marca: <span aria-hidden="true" className="tabular text-[11px] font-bold" style={{ color: "var(--text-secondary)" }}>10–90</span>,
      termo: "Intervalo de incerteza",
      texto: "A faixa em que o valor cai em 80% das simulações (10º a 90º percentil). Um valor fora dela não é impossível: acontece 1 vez em 5.",
    },
  ];
  return (
    <dl className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {itens.map((i) => (
        <div key={i.termo} className="card p-3">
          <dt className="flex items-center gap-2 text-sm font-bold" style={{ color: "var(--text-primary)" }}>
            {i.marca}
            {i.termo}
          </dt>
          <dd className="mt-1 text-xs leading-relaxed" style={{ color: "var(--text-secondary)" }}>{i.texto}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Metadados({ s }: { s: Snapshot }) {
  const ultima = s.input.latest_fieldwork_end ?? null;
  const dias = ultima ? Math.round((Date.parse(`${s.reference_date}T00:00:00Z`) - Date.parse(`${ultima}T00:00:00Z`)) / 864e5) : null;
  const linhas: [string, React.ReactNode][] = [
    ["Data de referência", fmtDate(s.reference_date)],
    ["Última pesquisa incluída (fim de campo)", ultima ? `${fmtDate(ultima)}${dias != null ? ` · há ${dias} dia${dias === 1 ? "" : "s"}` : ""}` : "—"],
    ["Pesquisas · institutos", `${s.input.n_polls ?? 0} · ${s.input.n_institutes ?? 0}`],
    ["Dias até a eleição", String(s.horizon_days)],
    ["Versão do modelo", `${s.model.model_version} (${s.model.config_id})`],
    ["Calibração", s.model.calibration_id ?? "nenhuma"],
  ];
  return (
    <dl className="grid grid-cols-1 gap-x-6 gap-y-1 text-xs sm:grid-cols-2">
      {linhas.map(([k, v]) => (
        <div key={k} className="flex justify-between gap-3 border-b py-1" style={{ borderColor: "var(--grid)" }}>
          <dt style={{ color: "var(--text-muted)" }}>{k}</dt>
          <dd className="tabular text-right" style={{ color: "var(--text-primary)" }}>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Trilha({ itens }: { itens: { href?: string; label: string }[] }) {
  return (
    <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
      <Link href="/" className="hover:underline">Início</Link>
      {itens.map((i) => (
        <span key={i.label}>
          <span aria-hidden="true"> › </span>
          {i.href ? <Link href={i.href} className="hover:underline">{i.label}</Link> : <span style={{ color: "var(--text-secondary)" }}>{i.label}</span>}
        </span>
      ))}
    </nav>
  );
}

export function Motivos({ reasons }: { reasons: string[] }) {
  if (!reasons.length) return null;
  return (
    <ul className="list-disc space-y-0.5 pl-5 text-xs" style={{ color: "var(--text-secondary)" }}>
      {reasons.map((r) => (
        <li key={r}>{r}</li>
      ))}
    </ul>
  );
}
