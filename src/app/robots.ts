import type { MetadataRoute } from "next";

const BASE = process.env.NEXT_PUBLIC_SITE_URL ?? "https://placardaspesquisas.com.br";

/* Explicit allow-list. The aggregate is a public good under CC-BY 4.0, so we
   welcome search crawlers, the major AI answer engines, and the training/index
   bots by name (in addition to the "*" default). Nothing is disallowed — every
   route is fair game, and naming each agent makes the intent auditable rather
   than resting on the wildcard alone. */
const AGENTS = [
  "*",
  "Googlebot",
  "Bingbot",
  "Google-Extended",
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-SearchBot",
  "PerplexityBot",
  "CCBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: AGENTS.map((userAgent) => ({ userAgent, allow: "/" })),
    sitemap: `${BASE}/sitemap.xml`,
    host: BASE,
  };
}
