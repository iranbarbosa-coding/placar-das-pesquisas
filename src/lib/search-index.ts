import { statesWithPolls, pollsters, loadDataset } from "./data";
import { UF_NAMES, type UF } from "./types";
import type { SearchItem } from "@/components/SiteSearch";

/**
 * The masthead's search index, built at BUILD TIME on the server.
 *
 * It exists as its own module because the search box is a client component and
 * `data.ts` reaches the NDJSON store through `node:fs`. The index has to be
 * assembled where the files are and handed across the boundary as plain data —
 * importing the loader from the client is the mistake that has already broken
 * this build once, and it fails loudly at compile time rather than quietly.
 *
 * Scope is what a reader actually looks for: a state, a candidate, an institute.
 * Not polls — nobody searches for a poll by id — and not scenarios, whose names
 * are generated and would flood the results.
 */
export function buildSearchIndex(): SearchItem[] {
  const items: SearchItem[] = [];
  const ds = loadDataset();

  // ── states ────────────────────────────────────────────────────────────────
  const counts = new Map(statesWithPolls().map((s) => [s.uf, s.count]));
  for (const [uf, nome] of Object.entries(UF_NAMES) as [UF, string][]) {
    const n = counts.get(uf) ?? 0;
    items.push({
      id: `uf-${uf}`,
      kind: "estado",
      label: nome,
      href: `/estados/${uf.toLowerCase()}`,
      hint: n ? `${n.toLocaleString("pt-BR")} pesquisas` : "sem pesquisas ainda",
      // The two-letter code is how half of Brazil refers to a state and it is
      // not in the label — "SP" must find São Paulo.
      keywords: [uf],
    });
  }

  // ── institutes ────────────────────────────────────────────────────────────
  for (const p of pollsters()) {
    items.push({
      id: `inst-${p.name}`,
      kind: "instituto",
      label: p.name,
      href: "/institutos",
      hint: `${p.count.toLocaleString("pt-BR")} pesquisas · ${p.races} disputas`,
    });
  }

  // ── candidates ────────────────────────────────────────────────────────────
  // One entry per person per contest, pointing at the race they run in. Built
  // from the polls rather than the candidacy register on purpose: the register
  // holds people nobody has polled, and a search result that leads to a page
  // where the name does not appear is worse than no result.
  const seen = new Map<string, SearchItem>();
  for (const poll of ds.polls) {
    // A disputa decide o destino ANTES da UF. Uma pesquisa `presidente:<UF>` é a
    // corrida NACIONAL amostrada naquele estado, não uma disputa estadual — a
    // mesma confusão que a regra de nome de urna cometeu ao ler o "AC" de
    // `presidente:AC` como o estado da candidatura (HANDOFF §1b). Ramificando
    // pela UF primeiro, estas linhas ganhavam `href: /estados/pr` — página que só
    // renderiza governador e senador — e caíam no braço `else` do rótulo, que
    // diz "Senado". Ou seja: um resultado de busca rotulado com o cargo errado e
    // levando a uma página onde o nome não aparece, que é exatamente o que o
    // comentário acima declara que este módulo existe para evitar.
    const nacional = poll.race === "presidente";
    const href = nacional ? "/presidente" : `/estados/${poll.state!.toLowerCase()}`;
    const onde = nacional
      ? "Presidente"
      : `${poll.race === "governador" ? "Governador" : "Senado"} · ${poll.state}`;
    for (const r of poll.results) {
      // A subamostra estadual da presidencial colapsa em BR: é a mesma pessoa na
      // mesma disputa apontando para a mesma página, e sem isto o índice publica
      // uma entrada por UF do mesmo candidato.
      const id = `cand-${poll.race}-${nacional ? "BR" : poll.state}-${r.candidate}`;
      if (seen.has(id)) continue;
      seen.set(id, {
        id,
        kind: "candidato",
        label: r.candidate,
        href,
        hint: onde,
        keywords: r.party ? [r.party] : undefined,
      });
    }
  }
  items.push(...seen.values());

  return items;
}
