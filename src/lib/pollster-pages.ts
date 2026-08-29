// Per-institute long-tail pages (/institutos/[slug]). One page per pollster with
// a real track record, so each is a search door + a citable block — and none is
// thin. The slug/lookup lives here so the page and the sitemap agree.
import { loadDataset } from "./data";
import { sortPollsDesc } from "./average";
import type { Poll } from "./types";

/** Minimum polls for a pollster to get its own page — below this the institute
 *  stays on the /institutos index only, so we never ship a one-poll thin page. */
export const MIN_POLLS_FOR_PAGE = 3;

/** URL-safe slug from an institute name: strip accents, lowercase, non-alnum → -. */
export function pollsterSlug(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface PollsterPage {
  name: string;
  slug: string;
  polls: Poll[]; // newest first
  count: number;
  latest: string | null;
}

/** All pollsters that qualify for a page, keyed and de-duplicated by slug. When
 *  two names collapse to the same slug (rare), the one with more polls wins. */
function pagesBySlug(): Map<string, PollsterPage> {
  const byName = new Map<string, Poll[]>();
  for (const p of loadDataset().polls) {
    const k = p.pollster.trim();
    if (!k) continue;
    if (!byName.has(k)) byName.set(k, []);
    byName.get(k)!.push(p);
  }

  const out = new Map<string, PollsterPage>();
  for (const [name, ps] of byName) {
    if (ps.length < MIN_POLLS_FOR_PAGE) continue;
    const slug = pollsterSlug(name);
    if (!slug) continue;
    const sorted = sortPollsDesc(ps);
    const page: PollsterPage = {
      name,
      slug,
      polls: sorted,
      count: ps.length,
      latest: sorted[0]?.fieldwork_end ?? sorted[0]?.published_date ?? null,
    };
    const existing = out.get(slug);
    if (!existing || page.count > existing.count) out.set(slug, page);
  }
  return out;
}

export function pollsterPages(): PollsterPage[] {
  return [...pagesBySlug().values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name, "pt-BR"));
}

export function pollsterPageBySlug(slug: string): PollsterPage | null {
  return pagesBySlug().get(slug) ?? null;
}
