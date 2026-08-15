# Placar das Pesquisas — Eleições 2026

Agregador de pesquisas eleitorais brasileiras (estilo RealClearPolling): presidente,
governadores e Senado em todos os 27 estados, com médias móveis, linhas de tendência
e tabela completa de todas as pesquisas publicadas — **atualizado automaticamente**.

## Arquitetura

- **Site:** Next.js 15 (App Router), 100% estático — cada página é gerada no build a
  partir do store em `data/*.ndjson`, via `src/lib/store.ts`. Sem banco de dados, sem
  servidor, carregamento instantâneo.
- **Dados:** o store consolidado (`surveys` ⨝ `questions`, mais institutos e candidatos),
  projetado no formato plano que as páginas consomem. `data/polls.json` continua sendo
  gravado pelo coletor e é a referência do portão de paridade, mas não alimenta mais o
  site. Alimentado por `scripts/scrape.mjs` a partir de três fontes:
  1. **Poder360 Agregador** (resultados estruturados, com nº de registro TSE);
  2. **Wikipédia** (tabelas de pesquisas nacionais e estaduais);
  3. **TSE Dados Abertos / PesqEle** (registro oficial — metadados, licença CC-BY).
- **Autoatualização:** `.github/workflows/update-polls.yml` roda 3× ao dia, re-coleta
  as fontes, valida (`scripts/validate-data.mjs`) e, se houver pesquisa nova, faz commit
  em `data/` — o push dispara rebuild automático no Vercel. Se uma fonte falhar, os
  dados anteriores dela são mantidos; se a validação falhar, **nada** é publicado.

## Como publicar (passos do Iran — ~5 minutos)

1. **GitHub:** crie um repositório (ex.: `placar-das-pesquisas`) e envie o projeto:
   ```
   cd ~/Projects/pesquisas-2026
   git init && git add -A && git commit -m "v1"
   gh repo create placar-das-pesquisas --public --source=. --push
   ```
2. **Vercel:** em vercel.com → *Add New Project* → importe o repositório. Framework
   é detectado (Next.js); nenhuma variável é obrigatória. Opcional: defina
   `NEXT_PUBLIC_SITE_URL` com a URL final (usada no sitemap).
3. **Pronto.** O workflow do GitHub Actions já está no repositório e começa a rodar
   sozinho (também pode ser disparado manualmente na aba Actions → *Atualizar
   pesquisas* → Run workflow).

## Comandos

```
npm run dev            # desenvolvimento local
npm run build          # build de produção
npm run scrape         # coleta + valida + grava data/polls.json
npm run validate-data  # valida o banco atual
node scripts/validate-data.mjs --self-test   # prova que os guardas de validação disparam
```

## Garantias de honestidade dos dados

- Nenhum número é estimado: campo não publicado aparece como "—".
- Cenários (listas de candidatos) nunca são misturados numa mesma média.
- Cada pesquisa carrega o link da fonte original.
- A validação rejeita: percentuais fora de 0–100, somas absurdas, datas não-ISO,
  duplicatas e encolhimento repentino do banco (proteção contra coleta truncada).
- Os guardas da validação têm auto-teste (`--self-test`) que prova que cada um dispara.
