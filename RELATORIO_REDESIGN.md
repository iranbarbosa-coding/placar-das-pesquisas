# Relatório do redesign e rebranding — Voto em Dados

Este documento registra **o que foi feito** na reformulação da home e no rebranding, e **por quê**. Serve de memória do projeto (por que cada decisão foi tomada) e de contexto para quem for continuar. Companheiro do [GUIA_DE_DESIGN.md](GUIA_DE_DESIGN.md), que traduz tudo isto em padrões acionáveis para as outras páginas.

Escopo do trabalho: **apenas `src/` e assets em `public/`**. Nenhum dado (`data/`) foi alterado. Build de produção verificado (38 páginas estáticas), `tsc`/lint limpos, sem estouro horizontal de 320 a 1440 px, nos temas claro e escuro.

---

## 1. Ponto de partida e método

A home antiga era um layout de "site com gráficos" sobre fundo branco, que passava sensação de página pobre e subutilizava o desktop. O criador forneceu um **mockup-alvo** (dashboard estilo terminal de dados) e um brief. A regra de trabalho firmada no meio do processo foi clara e vale registrar: **priorizar a fidelidade visual ao mockup** — não travar em purismo de dado quando o pedido é estético (ver §7).

**Processo iterativo com juiz.** Cada leva de mudanças foi seguida de um agente-juiz que comparava o site rodando com o mockup e devolvia um veredito com pontos priorizados. A fidelidade subiu assim:

> 60 → 76 → 85 → 93 → 96 → 98 → 99 / 100

O ponto que sobra (1) é diferença intencional de dado real vs. mockup ilustrativo (o gráfico mostra histórico real, não a janela curta ilustrativa), não um defeito.

---

## 2. Estrutura da home

A home virou um **painel de duas colunas**:

- **Coluna esquerda (larga):** corrida presidencial (o herói), confrontos de 2º turno, maiores colégios eleitorais, últimas pesquisas.
- **Coluna direita (estreita, 336 px):** mapa do Brasil, Destaques, "O que mudou", Glossário.

Cada seção é um **card branco com borda** sobre um fundo cinza-claro — a profundidade que o brief pedia (o par fundo/superfície tinha luminância quase igual, então "card" não lia como card). `min-w-0` na coluna esquerda impede a tabela larga de empurrar a página no mobile (bug de estouro documentado).

---

## 3. O herói (corrida presidencial)

O maior foco de iteração. Estado final:

- **Cabeçalho de card** compacto em CAIXA ALTA ("CORRIDA PRESIDENCIAL 2026 (i)"), sem eyebrow — os KPIs é que são o elemento grande, não o título. Isso corrigiu a maior queixa: o herói estava desproporcional (título gigante, espaçamento solto).
- **KPIs**: os candidatos, o percentual em destaque com o "%" menor, partido ao lado. A régua é **elástica** — reduz tamanho/espaçamento conforme aparecem mais candidatos, sem reformatar a página, no desktop e no mobile.
- **Gráfico de linhas** (não área): grade y 0/20/40/60, linha tracejada dos 50% com selo, eixo de meses, legenda. Escala do eixo Y **fixa em piso 60** para que válidos e bruto usem a mesma altura (antes, cada base derivava seu próprio topo e a mesma linha ficava em alturas diferentes ao alternar).
- **Alternador de base** "votos válidos | bruto" no canto superior direito.
- **Seletor de intervalo** do gráfico: `2026 · Tudo · 12m · 6m · 3m`, padrão **"2026"** (desde 1º/01/2026). Controla só a janela desenhada; os KPIs (sem hover) e a escala não mudam com o intervalo.
- **Interatividade (desktop):** hover mostra linha-guia, pontos por série e um tooltip com **todos os candidatos** e seus percentuais **naquela data**; os KPIs grandes acompanham o cursor e voltam ao atual ao sair. No **mobile** mantém o valor atual (sem hover).
- Removidos, a pedido do criador: o painel lateral "Em resumo", a barra de comentário editorial e a caixa fixa do marcador.

---

## 4. Regras de dado do herói (importantes)

Estas regras carregam decisões de significado, não só de estilo:

- **Só candidatos a presidente com registro no TSE recebem cor e nome.** Nas pesquisas de 1º turno há ~41 nomes testados, mas só **13 têm registro presidencial** (`data/candidaturas.ndjson`, `cargo = "presidente"`). Nomes hipotéticos (Ratinho Jr, Tarcísio, Ciro Gomes, Jair Bolsonaro, Haddad, Moro…) **não são nomeados** em lugar nenhum — o percentual deles é absorvido anônimo em "Outros".
- **Recebe cor quem é registrado E está ≥ 5% em votos válidos.** Abaixo de 5% (mas registrado) vira linha cinza fina individual, entra no número "Outros" e na lista expansível/tooltip. O limiar é sempre sobre a base **válidos**, então alternar para bruto não recolore ninguém.
- **"Outros" soma só os candidatos restantes** (registrados abaixo de 5%). No **bruto**, há um bucket separado **"Brancos/Nulos/NR"** (o não-candidato do total da amostra); no válidos ele não existe (a base exclui esses).
- **A régua de KPIs soma exatamente 100,0.** A reconciliação é feita em décimos e o último bucket absorve o arredondamento — o que é honesto, pois ele é, por definição, "tudo que não está acima".
- **"Outros" NÃO é desenhado como uma linha única.** Cada sub-5% é uma linha cinza individual (decisão do criador, com meu insight): somar candidatos com denominadores diferentes afirmaria uma precisão que o número não tem, e uma linha só esconderia quem sobe e quem cai.

---

## 5. Demais seções

- **Confrontos de 2º turno:** barras bipolares (líder vermelho, rival azul), margem por extenso, "fora dessa base" preservado.
- **Maiores colégios:** 5 cards com barras finas (nome acima, % à direita), eleitorado, variação de 30 dias e **bandeiras estaduais reais** (Wikimedia, símbolos de domínio público — as 27 estão em `public/flags/`).
- **Últimas pesquisas:** tabela full-width de 8 colunas (Data · Disputa · Estado · Instituto · Amostra · Resultado · Margem · Tendência), com filtros funcionais e setas de tendência. Texto `text-xs` e padding enxuto para caber sem rolagem lateral.
- **Sidebar:** mapa **geográfico real do Brasil** (SVG fornecido pelo criador) colorido por situação do líder de governador; Destaques em linha única (UF · cargo · nome · margem); "O que mudou"; Glossário. O título do mapa é "CORRIDAS ESTADUAIS · GOVERNADOR" para explicitar a disputa.

---

## 6. Rebranding — Voto em Dados

O produto passou a se chamar **Voto em Dados** (votoemdados.com.br), com base no guia de marca "Conceito 3 — Mapa & Dados".

- **Marca no cabeçalho:** ícone (rede do Brasil, transparente) + wordmark empilhado "VOTO / EM DADOS" em caixa alta, com cores por token de tema (no claro VOTO é escuro; no escuro vira branco; "em" cinza e "DADOS" azul). O lockup completo com slogan foi para o **rodapé**.
- **Paleta oficial** (tokens em `globals.css`): azul `#2563EB`, vermelho `#EF4444`, navy `#0B1020`, slate `#64748B`, cinza `#E5E7EB`, off-white `#F8FAFC`, branco. Lula = vermelho da marca; Flávio = azul da marca.
- **Tema escuro em navy** `#0B1020` (era cinza neutro), com cards navy que se destacam — como no header mobile e no ícone do app do guia.
- **Mapa na paleta da marca:** acima de 50% **azul**, abaixo de 50% **azul claro**, empate técnico **vermelho**, sem pesquisa **cinza**.
- `SITE_NAME` → "Voto em Dados"; fallback de domínio do sitemap/robots → `https://www.votoemdados.com.br`.
- **Fora do escopo desta leva:** a estrutura de navegação (masthead, mega-menu, busca) não foi reformulada — só o wordmark/ícone do cabeçalho trocou. Migrar o interior das outras páginas (`/estados`, `/presidente` etc.) para o padrão da home é trabalho seguinte, guiado pelo [GUIA_DE_DESIGN.md](GUIA_DE_DESIGN.md).

---

## 7. Decisões-chave e o porquê

- **Fidelidade visual em primeiro lugar.** Em tarefas de design, o alvo é parecer com o mockup — janelas de exibição do gráfico, marcadores "de enfeite" e afins são escolhas de apresentação legítimas; caveats de dado ficam como nota de rodapé, não travam o visual.
- **Filtro por registro.** Nomear como candidato a presidente quem não tem registro (Ratinho Jr etc.) seria incorreto; o filtro é uma garantia (hoje a média já só contém registrados, mas nomes hipotéticos não vazam).
- **Vermelho da marca com tradeoff consciente.** `#EF4444` tem ~3,6:1 como texto (o antigo tinha ~4,8). Ele só é usado no **número grande/negrito** do KPI e nas **linhas do gráfico** — os dois passam no critério (3:1 para texto grande/negrito e para linha gráfica). A cor foi pedida pela marca.
- **Tinta-sobre-cor dormiu.** Com os colégios levando o nome ACIMA da barra e o herói sem nome dentro de linha, `inkOn()`/`--*-ink` ficaram sem chamador. Os tokens seguem como API latente, com as razões antigas explicitamente marcadas como históricas (não valem mais para as cores novas).

---

## 8. Verificação

- `npm run build`: 38 páginas estáticas, sem erros; `tsc --noEmit` limpo.
- Sem estouro horizontal em 320/375/390/1440, temas claro e escuro.
- Fidelidade ao mockup validada por agente-juiz ao longo das iterações (60 → 99).
- Contraste registrado nos comentários dos tokens.

---

## 9. Pendências de deploy/admin (fora do código)

1. Definir **`NEXT_PUBLIC_SITE_URL=https://www.votoemdados.com.br`** no Vercel (o sitemap/robots usam isso; o fallback já aponta para lá).
2. Opcional: renomear o repositório de `placar-das-pesquisas` para `voto-em-dados` (admin do GitHub, não afeta o código).
3. Variantes de marca para o tema escuro: o header usa tokens de tema (ok), mas o lockup do rodapé é PNG de fundo branco — uma versão em claro/transparente melhoraria o rodapé no escuro.
