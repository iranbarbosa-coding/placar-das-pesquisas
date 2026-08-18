/**
 * The site's name, in one place.
 *
 * A rename is live: "Placar das Pesquisas" frames the product as a scoreboard —
 * the horse-race framing the method exists to argue against — and a replacement
 * is being chosen. Every user-visible occurrence reads from here so that
 * decision costs one edit instead of a search across pages, metadata, the
 * masthead and the OG tags.
 *
 * NOT covered, deliberately, because they are not user-visible branding and
 * changing them would churn the data for no reader benefit: the scraper
 * user-agents, the bot's git identity in the Action, and the temp-directory
 * prefixes in the check scripts.
 *
 * ⚠ `NEXT_PUBLIC_SITE_URL` is NOT derived from this. sitemap.ts and robots.ts
 * fall back to a hardcoded vercel.app host, and that host must match the Vercel
 * project name. Renaming here without setting that variable publishes a sitemap
 * pointing at a domain that is not the site — an error no build step catches
 * and search engines act on.
 */
export const SITE_NAME = "Voto em Dados";
export const SITE_YEAR = "2026";
export const SITE_TAGLINE = "Eleições transparentes, decisões informadas";
