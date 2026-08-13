import type { MetadataRoute } from "next";
import { UFS } from "@/lib/types";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://placar-das-pesquisas.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  return [
    { url: BASE, changeFrequency: "daily", priority: 1 },
    { url: `${BASE}/presidente`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/segundo-turno`, changeFrequency: "daily", priority: 0.9 },
    { url: `${BASE}/estados`, changeFrequency: "daily", priority: 0.8 },
    ...UFS.map((uf) => ({
      url: `${BASE}/estados/${uf.toLowerCase()}`,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    { url: `${BASE}/institutos`, changeFrequency: "weekly", priority: 0.5 },
    { url: `${BASE}/metodologia`, changeFrequency: "monthly", priority: 0.4 },
  ];
}
