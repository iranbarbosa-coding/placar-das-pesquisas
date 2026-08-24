import type { MetadataRoute } from "next";
import { UFS } from "@/lib/types";
import { loadDataset, statesWithPolls } from "@/lib/data";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placardaspesquisas.com.br";

export default function sitemap(): MetadataRoute.Sitemap {
  const ds = loadDataset();
  // Dataset build time is the honest floor for lastmod on every page. State
  // pages get a tighter signal: the latest fieldwork date we hold for that UF.
  const generated = new Date(ds.generated_at);
  const latestByUf = new Map(statesWithPolls().map((s) => [s.uf, s.latest]));

  const stateLastMod = (uf: string): Date => {
    const latest = latestByUf.get(uf as (typeof UFS)[number]);
    return latest ? new Date(latest) : generated;
  };

  return [
    { url: BASE, lastModified: generated, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/presidente`, lastModified: generated, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/segundo-turno`, lastModified: generated, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/estados`, lastModified: generated, changeFrequency: "daily", priority: 0.8 },
    ...UFS.map((uf) => ({
      url: `${BASE}/estados/${uf.toLowerCase()}`,
      lastModified: stateLastMod(uf),
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    { url: `${BASE}/institutos`, lastModified: generated, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/sobre`, lastModified: generated, changeFrequency: "monthly", priority: 0.4 },
    { url: `${BASE}/metodologia`, lastModified: generated, changeFrequency: "monthly", priority: 0.4 },
  ];
}
