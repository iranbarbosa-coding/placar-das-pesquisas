/**
 * The site's name, in one place.
 *
 * The product is "Placar das Pesquisas". Every user-visible occurrence reads
 * from here so a rename costs one edit instead of a search across pages,
 * metadata, the masthead and the OG tags. (A brief "Voto em Dados" rebrand was
 * tried and reverted — the brand and the network-map logo returned to Placar.)
 *
 * NOT covered, deliberately, because they are not user-visible branding and
 * changing them would churn the data for no reader benefit: the scraper
 * user-agents, the bot's git identity in the Action, and the temp-directory
 * prefixes in the check scripts.
 *
 * ⚠ `NEXT_PUBLIC_SITE_URL` is NOT derived from this. layout.tsx, sitemap.ts and
 * robots.ts fall back to a hardcoded host (`https://placardaspesquisas.com.br`),
 * and that host must match the production domain. Changing the brand here without
 * setting that variable (or updating the fallback) publishes a sitemap pointing
 * at the wrong domain — an error no build step catches and search engines act on.
 */
export const SITE_NAME = "Placar das Pesquisas";
export const SITE_YEAR = "2026";
export const SITE_TAGLINE = "A média que você pode refazer";
