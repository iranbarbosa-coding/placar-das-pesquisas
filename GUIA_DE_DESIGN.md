# Guia de design — Voto em Dados

Como manter o padrão da home ao construir o resto do site (`/estados/[uf]`, `/presidente`, `/segundo-turno`, `/institutos`, `/metodologia` e novas páginas). Companheiro do [RELATORIO_REDESIGN.md](RELATORIO_REDESIGN.md).

**Regra de ouro:** use **tokens CSS**, nunca hex fixo em componente. Tudo é definido em `src/app/globals.css` e adapta claro/escuro sozinho. Se um valor não existe como token, crie o token — não espalhe hex.

---

## 1. Tokens de cor (fonte única: `globals.css`)

### Neutros e superfícies
| Token | Claro | Escuro (navy) | Uso |
|---|---|---|---|
| `--page` | `#F8FAFC` | `#0B1020` | fundo da página |
| `--surface-1` | `#FFFFFF` | `#142038` | cards (e o cabeçalho) |
| `--surface-2` | `#F1F5F9` | `#1B2540` | superfície aninhada / zebra |
| `--text-primary` | `#0B1020` | `#F8FAFC` | texto principal / títulos |
| `--text-secondary` | `#64748B` | `#94A3B8` | texto secundário |
| `--text-muted` | `#94A3B8` | `#64748B` | legendas, metadados |
| `--grid` / `--ring` | `#E5E7EB` | `#23304A` / `rgba(255,255,255,.10)` | linhas de grade / bordas |
| `--accent` | `#2563EB` | `#3B82F6` | **azul da marca**: links, botões, toggles ativos, "DADOS", "Entrar" |

### Cores de candidato (marca) e paleta dual
- `--cand-red` = `#EF4444` (Lula / líder), `--cand-blue` = `#2563EB` (Flávio / rival). Demais candidatos têm hue fixo por nome em `src/lib/colors.ts` (`FIXED_COLORS`) — **cor é propriedade da pessoa, nunca da posição**.
- **Paleta dual** (`dualColor(rank, leadHue)`): líder + rival coloridos, resto cinza (`--series-muted`). É o esquema da home. `leadHue` escolhe quem lidera em vermelho vs. azul (herói e confrontos lideram em vermelho; barras de colégio lideram em azul).
- ⚠ `Flávio Bolsonaro → azul` e `Ronaldo Caiado → teal` (o azul saiu do Caiado). Mudança global.

### Mapa (choropleth) — paleta da marca
`--map-acima` (líder ≥50%) = **azul** · `--map-abaixo` (<50%) = **azul claro** · `--map-empate` = **vermelho** · `--map-sem` = **cinza**. As bolinhas da legenda leem os mesmos tokens — nunca defina cor de legenda solta.

---

## 2. Tipografia

- Fonte única: **Inter** (via `next/font`, `--font-sans`). Sem serifa.
- **Título de card:** CAIXA ALTA, ~15/16px, `font-bold`, `tracking-wide`, `--text-secondary` ou `--text-primary`. Ex.: `CORRIDA PRESIDENCIAL 2026`, `CORRIDAS ESTADUAIS · GOVERNADOR`. Use "·" como separador (padrão do site).
- **Números de destaque (KPI):** grandes, `font-bold`, na cor da série; o `%` menor (`~0.55em`). Tabular (`.tabular`) para números que alinham.
- **Corpo/metadados:** `text-xs`/`text-sm`, `--text-secondary`/`--text-muted`.
- **Não** reintroduzir face condensada nem serifa — o mockup usa sans de largura normal.

---

## 3. Superfícies e espaçamento

- Toda seção é um **card**: `class="card"` (fundo `--surface-1`, borda `--ring`, **raio 8px**, sombra hairline). No escuro o card navy se destaca do fundo navy pela borda + step de superfície.
- **Densidade:** o produto é um terminal de dados. Prefira `text-xs`/`text-sm`, padding enxuto (`p-4`), gaps curtos. Evite espaçamento solto.
- **Shell/largura:** conteúdo centralizado em `max-width: 80rem` (`.shell`). Layouts de página em grade; a home usa `lg:grid-cols-[minmax(0,1fr)_336px]`.
- **`min-w-0` é obrigatório** em colunas de grade que contêm tabelas/conteúdo largo, senão a faixa estoura no mobile.

---

## 4. Padrões de componente (reutilize)

- **Cabeçalho de card:** título em caixa alta + (opcional) subtítulo pequeno; controles no canto superior direito (ex.: toggles do herói).
- **Gráfico de séries (`HeroChart`/`AverageChart`):** cor por RANK via `dualColor` na home (líder/rival/cinza) ou por nome (`colorMap`/`colorOf`) nas páginas de estado; grade y rotulada; linha dos 50% com selo; **escala consistente** (não deixe cada base derivar seu próprio topo). Interatividade só no desktop (`(hover: hover) and (pointer: fine)`), mobile mantém o valor atual.
- **Barra bipolar (`RunoffBars`):** líder vermelho / rival azul, margem por extenso, base nomeada.
- **Barra de comparação (`MatchupRows`):** nome + partido ACIMA, barra fina, % à direita, linha tracejada dos 50%. **Não** desenhar nome dentro da barra.
- **Tabela densa (`LatestPollsTable`):** `text-xs`, padding enxuto, dentro de `overflow-x-auto`; cabeçalho em caixa alta; datas de grupo em `--accent`; margem em `--series-3` (verde) para positivo; setas de tendência coloridas. Deve caber sem rolagem lateral no desktop.
- **Mapa (`BrasilMap`):** SVG inline colorido por token via `<style>` escopado (`#brasil-map .uf-XX`). Estados por `data-uf`/classe `uf-XX`. Bordas brancas/claras.
- **Lista linear:** chip da UF (cinza) · cargo · nome · valor (ex.: Destaques). Padrão bom para rankings.
- **Bandeiras:** `public/flags/<uf>.svg` (as 27 já existem). Sirva por `<img>` simples.

---

## 5. Regras de cor e de dado (valem em qualquer página presidencial)

1. **Cor é da pessoa, não da posição.** Use `colorMap`/`colorOf`/`dualColor` de `lib/colors.ts`. Nunca colora por índice de array.
2. **Só candidato registrado (TSE) é nomeado** numa disputa presidencial. Use `registeredPresidentKeys()` (`lib/home.ts`) para filtrar; não registrados entram anônimos em "Outros". A mesma ideia vale por cargo/UF quando houver o dado de registro.
3. **Colore quem é registrado E ≥ 5%** (base **válidos**); o resto é cinza + "Outros".
4. **A régua de percentuais soma 100,0** — reconcilie em décimos e deixe o último bucket absorver o arredondamento.
5. **Válidos vs. bruto:** só o bloco presidencial alterna; o resto do site é válidos. Nunca reconverta no browser (seria uma 2ª implementação de `average.ts`); use os dois cortes já pré-computados.
6. **"Outros" = candidatos restantes**; no bruto, "Brancos/Nulos/NR" é bucket à parte (não existe no válidos).

---

## 6. Acessibilidade e responsividade

- **Sem estouro horizontal** em nenhuma largura (320–1440), claro e escuro. Verifique `scrollWidth === clientWidth`. Tabelas rolam dentro do próprio `overflow-x-auto`, nunca a página.
- Contraste: texto de corpo/secundário passa AA. O vermelho da marca `#EF4444` só é aceitável como **número grande/negrito** ou **linha de gráfico** (3:1) — não use como texto pequeno.
- Interatividade é enriquecimento: o estado padrão (sem hover) já renderiza os valores atuais; toque nunca entra em estado de hover.
- SVGs decorativos com `aria-hidden`; o nome real vem como texto.

---

## 7. Ao construir outra página

1. **Reuse os componentes** da home (`HeroChart`/`AverageChart`, `RunoffBars`, `MatchupRows`, `LatestPollsTable`, `BrasilMap`) em vez de recriar.
2. **Só tokens** — se precisar de uma cor nova, adicione o token em `globals.css` (claro **e** escuro) e documente aqui.
3. **Fronteira cliente/servidor:** `lib/data`/`lib/home` alcançam `node:fs` e não cruzam para o cliente. Componentes cliente importam de `lib/format`, `lib/names`, `lib/colors`, `lib/average` (livres de fs). Erro típico ao errar: `UnhandledSchemeError: Reading from "node:fs"`.
4. **Mantenha a densidade e o cabeçalho de card em caixa alta.** Uma página nova deve parecer parte do mesmo produto.
5. **Rode o checklist abaixo antes de considerar pronto.**

---

## 8. Checklist de consistência

- [ ] Só tokens de cor; nenhum hex fixo em componente.
- [ ] Título de card em CAIXA ALTA, separador "·".
- [ ] Cards `class="card"` (raio 8px), fundo `--page`, superfícies via tokens.
- [ ] Cor por pessoa (`colorMap`/`dualColor`), nunca por posição.
- [ ] Em disputa presidencial: só registrados nomeados; ≥5% coloridos; resto em "Outros"; soma 100,0.
- [ ] Válidos é o padrão; bruto só onde previsto.
- [ ] `min-w-0` nas colunas com conteúdo largo; tabela em `overflow-x-auto`.
- [ ] Sem estouro horizontal em 320/375/390/1440, claro e escuro.
- [ ] Interatividade só desktop; mobile mantém o valor atual.
- [ ] `tsc --noEmit` limpo e `npm run build` passa.
