# Guia de design — Placar das Pesquisas

Como manter o padrão da home ao construir o resto do site (`/estados/[uf]`, `/presidente`, `/segundo-turno`, `/institutos`, `/metodologia` e novas páginas). Companheiro do [RELATORIO_REDESIGN.md](RELATORIO_REDESIGN.md).

> **Só a home foi redesenhada.** As páginas acima **ainda usam o estilo antigo** — títulos `text-2xl font-bold` (não cabeçalho de card em caixa alta), espaçamento solto (`space-y-12`/`space-y-10`), borda via `style` inline em vez de `class="card"` (ex.: `src/app/estados/[uf]/page.tsx`, `src/app/presidente/page.tsx`). Trate este guia como um plano de **migração** dessas páginas para o padrão da home, não como manutenção de algo que já está no padrão.

**Regra de ouro:** use **tokens CSS**, nunca hex fixo em componente. Tudo é definido em `src/app/globals.css` e adapta claro/escuro sozinho. O tema é 100% `@media (prefers-color-scheme: dark)` — **não há toggle manual** (`[data-theme]`). Se um valor não existe como token, crie o token: a metade clara vai no `:root`, e **a metade escura tem de ir no bloco `@media (prefers-color-scheme: dark)`** — se esquecer, o token herda silenciosamente a cor clara sobre o navy.

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

**Qual componente para qual página** (não recrie e não use o componente errado):

| Página / seção | Componente | Cor |
|---|---|---|
| Home — herói presidencial | `HeroChart` + `HeroInteractive` (via `Hero`) | por RANK (`dualColor`) |
| Estados/corridas (`/estados/[uf]`, `/presidente`, `/segundo-turno`) | `RaceSection → RaceView → AverageChart` + `RaceTable`, `RaceBadge`, `MatchupCard` | por NOME (`colorMap`/`colorOf`) |
| Confronto 2º turno (barra bipolar) | `RunoffBars` | dual (líder/rival) |
| Comparativo de nomes | `MatchupRows` | dual |
| Tabela de pesquisas | `LatestPollsTable` | — |
| Mapa | `BrasilMap` | tokens `--map-*` |

⚠ **`HeroChart` é exclusivo da home** (comportamento dual-por-rank + KPIs do herói) — **não reuse** em páginas de estado. O motor das corridas é `RaceSection`/`RaceView` (usa `AverageChart` por dentro). Ao migrar uma página de estado, envolva cada `RaceSection` num `class="card"` e troque o `<h1 text-2xl>` pelo cabeçalho de card em caixa alta — veja §7-bis.

- **Cabeçalho de card:** título em caixa alta + (opcional) subtítulo pequeno; controles no canto superior direito (ex.: toggles do herói).
- **Gráfico de séries (`AverageChart`, e `HeroChart` na home):** cor por RANK via `dualColor` na home (líder/rival/cinza) ou por nome (`colorMap`/`colorOf`) nas páginas de estado; grade y rotulada; linha dos 50% com selo; **escala consistente** (não deixe cada base derivar seu próprio topo). Interatividade só no desktop (`(hover: hover) and (pointer: fine)`), mobile mantém o valor atual.
- **Barra bipolar (`RunoffBars`):** líder vermelho / rival azul, margem por extenso, base nomeada.
- **Barra de comparação (`MatchupRows`):** nome + partido ACIMA, barra fina, % à direita, linha tracejada dos 50%. **Não** desenhar nome dentro da barra.
- **Tabela densa (`LatestPollsTable`):** `text-xs`, padding enxuto, dentro de `overflow-x-auto`; cabeçalho em caixa alta; datas de grupo em `--accent`; margem em `--series-3` (verde) para positivo; setas de tendência coloridas. Deve caber sem rolagem lateral no desktop.
- **Mapa (`BrasilMap`):** SVG inline colorido por token via `<style>` escopado (`#brasil-map .uf-XX`). Estados por `data-uf`/classe `uf-XX`. Bordas brancas/claras.
- **Lista linear:** chip da UF (cinza) · cargo · nome · valor (ex.: Destaques). Padrão bom para rankings.
- **Bandeiras:** `public/flags/<uf>.svg` (as 27 já existem). Sirva por `<img>` simples.
- ⚠ **Tinta-sobre-cor está dormente.** `inkOn()` e os tokens `--*-ink` não têm chamador (nomes vão ACIMA das barras, não dentro). Se criar uma barra com nome dentro do preenchimento, **não confie** nos ratios antigos desses tokens — foram medidos contra as cores velhas (branco sobre `#EF4444` ≈ 3,4:1, reprova AA). Remeça antes de reusar.

---

## 5. Regras de cor e de dado (valem em qualquer página presidencial)

1. **Cor é da pessoa, não da posição.** Use `colorMap`/`colorOf`/`dualColor` de `lib/colors.ts`. Nunca colora por índice de array.
2. **Só candidato registrado (TSE) é nomeado** numa disputa presidencial. Use `registeredPresidentKeys()` (`lib/home.ts`) para filtrar; não registrados entram anônimos em "Outros". A mesma ideia vale por cargo/UF quando houver o dado de registro.
3. **Colore quem é registrado E ≥ 5%** (base **válidos**); o resto é cinza + "Outros".
4. **A régua de percentuais soma 100,0** — reconcilie em décimos e deixe o último bucket absorver o arredondamento.
5. **Válidos vs. bruto:** só o bloco presidencial alterna; o resto do site é válidos. Os dois cortes são **pré-computados no servidor** (em `lib/home`/`lib/data`, a partir de `average.ts`) e chegam prontos ao cliente. Nunca reconverta no browser — `lib/validos.ts` (`toBasis`/`setAside`) é utilitário **de servidor**; chamá-lo no cliente refaria a média e é exatamente o que este item proíbe.
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

## 7-bis. Exemplo aplicado — migrar `/estados/[uf]`

Hoje a página é `<div className="space-y-12">` com `<h1 className="text-2xl font-bold">` e `<RaceSection>` soltos. Traduzindo para o padrão da home:

**Cabeçalho — antes → depois**
```tsx
// ANTES
<h1 className="text-2xl font-bold">{UF_NAMES[UFU]} · Eleições 2026</h1>

// DEPOIS — cabeçalho de card em caixa alta, separador "·"
<h2 className="text-[15px] font-bold uppercase tracking-wide"
    style={{ color: "var(--text-secondary)" }}>
  {UF_NAMES[UFU]} · Eleições 2026
</h2>
```

**Cada corrida vira um card** (fundo `--surface-1`, borda, raio 8px) em vez de bloco solto:
```tsx
// ANTES: <RaceSection groups={gov1} heading="Governador — 1º turno" />
// DEPOIS:
<section className="card p-4">
  <RaceSection groups={gov1} heading="Governador — 1º turno" />
</section>
```

**Densidade:** troque `space-y-12` pelo ritmo dos cards (`gap-5`/`gap-6`); o container ganha `min-w-0` se tiver tabela larga (`RaceTable`) dentro.

**Cor por nome** numa corrida de estado (não por rank):
```tsx
import { colorMap, colorOf } from "@/lib/colors";
const colors = colorMap(candidateNames);   // nome → var(--cand-*)
// ...ou pontualmente: style={{ color: colorOf(nome) }}
```

**Grade de duas colunas** (quando a página tiver um trilho lateral, como a home):
```tsx
<div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_336px]">…</div>
```

Regra de bolso da migração: **todo `<h1/h2 text-2xl>` → cabeçalho de card em caixa alta; todo bloco solto → `class="card"`; `space-y-1x` → `gap-*` dos cards; nada de hex fixo.**

---

## 8. Checklist de consistência

- [ ] Só tokens de cor; nenhum hex fixo em componente.
- [ ] Título de card em CAIXA ALTA, separador "·".
- [ ] Cards `class="card"` (fundo `--surface-1`, raio 8px) sobre a página `--page`; superfícies aninhadas em `--surface-2`.
- [ ] Cor por pessoa (`colorMap`/`dualColor`), nunca por posição.
- [ ] Em disputa presidencial: só registrados nomeados; ≥5% coloridos; resto em "Outros"; soma 100,0.
- [ ] Válidos é o padrão; bruto só onde previsto.
- [ ] `min-w-0` nas colunas com conteúdo largo; tabela em `overflow-x-auto`.
- [ ] Sem estouro horizontal em 320/375/390/1440, claro e escuro.
- [ ] Interatividade só desktop; mobile mantém o valor atual.
- [ ] `tsc --noEmit` limpo e `npm run build` passa.
