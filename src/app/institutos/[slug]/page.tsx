import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import JsonLd from "@/components/JsonLd";
import { loadDataset } from "@/lib/data";
import { pollsterPages, pollsterPageBySlug } from "@/lib/pollster-pages";
import { houseEffects } from "@/lib/houseEffects";
import { candKey } from "@/lib/average";
import { datasetSchema, BASE } from "@/lib/jsonld";
import { SITE_NAME } from "@/lib/brand";
import { displayName } from "@/lib/names";
import { fmtDate, fmtPct } from "@/lib/format";
import { UF_NAMES, type UF } from "@/lib/types";

const RACE: Record<string, string> = {
  presidente: "Presidente",
  governador: "Governador",
  senador: "Senador",
};

const MAX_TABLE = 25;

export function generateStaticParams() {
  return pollsterPages().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const p = pollsterPageBySlug(slug);
  if (!p) return {};
  return {
    title: `${p.name} — pesquisas eleitorais 2026`,
    description: `Todas as ${p.count} pesquisas do instituto ${p.name} nas eleições brasileiras de 2026: presidente, governadores e senadores, com fonte e efeito casa ante a média.`,
    alternates: { canonical: `/institutos/${p.slug}` },
  };
}

/** The institute's presidential bias, in words — only when the house-effects
 *  table includes it (enough comparable polls). Descriptive, not accusatory. */
function biasLine(name: string): string | null {
  const he = houseEffects("presidente", null, 1);
  const row = he.pollsters.find((r) => r.pollster.trim() === name.trim());
  if (!row) return null;
  let found = false;
  let bestCand = "";
  let bestEffect = 0;
  row.cells.forEach((cell, i) => {
    if (!cell) return;
    if (!found || Math.abs(cell.effect) > Math.abs(bestEffect)) {
      found = true;
      bestEffect = cell.effect;
      bestCand = he.candidates[i]?.candidate ?? "";
    }
  });
  if (!found || !bestCand) return null;
  const dir = bestEffect >= 0 ? "superestimar" : "subestimar";
  return `Na corrida presidencial, ${name} tende a ${dir} ${displayName(bestCand)} em cerca de ${fmtPct(Math.abs(bestEffect))} ponto(s) ante a média das demais pesquisas.`;
}

export default async function InstitutoPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const page = pollsterPageBySlug(slug);
  if (!page) notFound();

  const ds = loadDataset();
  const races = new Set(page.polls.map((p) => `${p.race}:${p.state ?? "BR"}`));
  const bias = biasLine(page.name);
  const rows = page.polls.slice(0, MAX_TABLE);

  const breadcrumb = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Início", item: BASE },
      { "@type": "ListItem", position: 2, name: "Viés dos Institutos", item: `${BASE}/institutos` },
      { "@type": "ListItem", position: 3, name: page.name, item: `${BASE}/institutos/${page.slug}` },
    ],
  };

  return (
    <article className="prose-sm mx-auto max-w-3xl space-y-6">
      <JsonLd data={breadcrumb} />
      <JsonLd
        data={datasetSchema({
          path: `/institutos/${page.slug}`,
          name: `Pesquisas de ${page.name} — Eleições Brasil 2026`,
          description: `Catálogo das ${page.count} pesquisas de intenção de voto do instituto ${page.name} para as eleições brasileiras de 2026 (presidente, governadores e senadores), com fonte e registro TSE.`,
          dateModified: ds.generated_at,
          distributionPath: "/api/polls.json",
          keywords: [page.name, "pesquisas eleitorais", "eleições 2026", "intenção de voto"],
          measures: ["intenção de voto (%) por candidato"],
        })}
      />

      <header className="space-y-1">
        <nav aria-label="Trilha" className="text-xs" style={{ color: "var(--text-muted)" }}>
          <Link href="/" className="hover:underline">Início</Link>
          <span aria-hidden="true"> › </span>
          <Link href="/institutos" className="hover:underline">Institutos</Link>
          <span aria-hidden="true"> › </span>
          <span style={{ color: "var(--text-secondary)" }}>{page.name}</span>
        </nav>
        <h1 className="text-2xl font-bold" style={{ color: "var(--text-primary)" }}>
          {page.name} — pesquisas 2026
        </h1>
        <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
          {page.count} {page.count === 1 ? "pesquisa catalogada" : "pesquisas catalogadas"} em{" "}
          {races.size} {races.size === 1 ? "disputa" : "disputas"}
          {page.latest ? <> · mais recente em {fmtDate(page.latest)}</> : null}. Cada número linka à
          fonte original.
        </p>
      </header>

      {bias && (
        <section className="card space-y-2 p-4">
          <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>Efeito casa</h2>
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>{bias}</p>
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Medido em votos válidos, na corrida atual de campo cheio. Veja a matriz completa em{" "}
            <Link href="/institutos" className="underline">Viés dos Institutos</Link>.
          </p>
        </section>
      )}

      <section className="card space-y-3 p-4">
        <h2 className="font-semibold" style={{ color: "var(--text-primary)" }}>
          Pesquisas de {page.name}
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm" style={{ color: "var(--text-secondary)" }}>
            <thead>
              <tr className="text-left text-xs uppercase" style={{ color: "var(--text-muted)" }}>
                <th className="py-2 pr-3 font-medium">Data</th>
                <th className="py-2 pr-3 font-medium">Disputa</th>
                <th className="py-2 pr-3 font-medium">Líder</th>
                <th className="py-2 pr-3 font-medium">Amostra</th>
                <th className="py-2 font-medium">Fonte</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => {
                const top = [...p.results].sort((a, b) => b.pct - a.pct)[0];
                const where = p.state ? ` · ${(p.state as UF)}` : "";
                return (
                  <tr key={p.id ?? i} className="border-t" style={{ borderColor: "var(--ring)" }}>
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{fmtDate(p.fieldwork_end ?? p.published_date ?? null)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap">{RACE[p.race] ?? p.race}{where}</td>
                    <td className="py-2 pr-3 whitespace-nowrap" style={{ color: "var(--text-primary)" }}>
                      {top ? <>{displayName(top.candidate)} {fmtPct(top.pct)}%</> : "—"}
                    </td>
                    <td className="py-2 pr-3 tabular-nums whitespace-nowrap">{p.sample_size ? p.sample_size.toLocaleString("pt-BR") : "—"}</td>
                    <td className="py-2">
                      {p.source_url ? (
                        <a href={p.source_url} target="_blank" rel="noopener noreferrer" className="underline">
                          {p.tse_registration ?? "ver"}
                        </a>
                      ) : (p.tse_registration ?? "—")}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {page.polls.length > MAX_TABLE && (
          <p className="text-xs" style={{ color: "var(--text-muted)" }}>
            Mostrando as {MAX_TABLE} mais recentes de {page.count}. Todas estão no{" "}
            <a href="/api/polls.json" className="underline">catálogo aberto</a>.
          </p>
        )}
      </section>

      <p className="text-xs" style={{ color: "var(--text-muted)" }}>
        Os números pertencem a {page.name}; o {SITE_NAME} apenas os organiza e dá contexto, sob{" "}
        <Link href="/licenca" className="underline">licença aberta</Link>. Veja também a{" "}
        <Link href="/metodologia" className="underline">metodologia</Link> das médias.
      </p>
    </article>
  );
}
