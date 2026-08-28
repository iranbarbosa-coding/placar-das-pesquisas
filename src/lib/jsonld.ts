/**
 * Structured data (schema.org JSON-LD) — the machine-readable layer.
 *
 * This is the P2 "citation layer": Organization + WebSite site-wide, and a
 * Dataset per race. It is what makes the aggregate legible to Google Dataset
 * Search and to the LLM crawlers (GPTBot/PerplexityBot/ClaudeBot) as a citable,
 * openly-licensed source — the moat the paywalled incumbents cannot occupy.
 *
 * Every emitter uses `<JsonLd>` (below) which renders one <script
 * type="application/ld+json">. Keep these objects free of anything not derivable
 * from the public data + the fixed brand facts, so nothing here can drift from
 * what the pages actually show.
 */
import { SITE_NAME, SITE_TAGLINE } from "./brand";

export const BASE =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://www.placardaspesquisas.com.br";

/** The data licence — a locked decision. Aggregate figures are facts + our own
 *  computation; we license the compilation CC-BY 4.0 and attribute the sources. */
export const LICENSE_URL = "https://creativecommons.org/licenses/by/4.0/";
export const LICENSE_NAME = "CC BY 4.0";

/** The publisher/creator identity reused across every schema block. */
export function organization() {
  return {
    "@type": "Organization",
    "@id": `${BASE}/#organization`,
    name: SITE_NAME,
    url: BASE,
    slogan: SITE_TAGLINE,
    logo: `${BASE}/brand/placar-icon.png`,
    description:
      "Agregador aberto e independente das pesquisas eleitorais das eleições brasileiras de 2026, com metodologia pública e comprovação matemática.",
  };
}

export function websiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${BASE}/#website`,
    name: SITE_NAME,
    url: BASE,
    inLanguage: "pt-BR",
    publisher: { "@id": `${BASE}/#organization` },
  };
}

export function organizationSchema() {
  return { "@context": "https://schema.org", ...organization() };
}

/** FAQPage — the question→one-line-factual-answer shape LLMs and AI Overviews
 *  extract from. Feed answer-first sentences derived from the live data. */
export function faqSchema(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map(({ q, a }) => ({
      "@type": "Question",
      name: q,
      acceptedAnswer: { "@type": "Answer", text: a },
    })),
  };
}

export interface DatasetOpts {
  /** Absolute-from-root path of the page the dataset describes, e.g. "/presidente". */
  path: string;
  name: string;
  description: string;
  /** ISO datetime of the last scrape — drives dateModified. */
  dateModified: string | null;
  /** Absolute-from-root path of the machine-readable feed, e.g. "/api/presidente.json". */
  distributionPath?: string;
  keywords?: string[];
  /** What the dataset measures, for `variableMeasured`. */
  measures?: string[];
}

export function datasetSchema(o: DatasetOpts) {
  const url = `${BASE}${o.path}`;
  return {
    "@context": "https://schema.org",
    "@type": "Dataset",
    "@id": `${url}#dataset`,
    name: o.name,
    description: o.description,
    url,
    inLanguage: "pt-BR",
    isAccessibleForFree: true,
    license: LICENSE_URL,
    creator: organization(),
    publisher: { "@id": `${BASE}/#organization` },
    temporalCoverage: "2026",
    ...(o.dateModified ? { dateModified: o.dateModified } : {}),
    ...(o.keywords ? { keywords: o.keywords } : {}),
    ...(o.measures ? { variableMeasured: o.measures } : {}),
    ...(o.distributionPath
      ? {
          distribution: [
            {
              "@type": "DataDownload",
              encodingFormat: "application/json",
              contentUrl: `${BASE}${o.distributionPath}`,
              license: LICENSE_URL,
            },
          ],
        }
      : {}),
  };
}
