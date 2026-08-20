# Parser do bloco presidencial dos relatórios estaduais → `presidente:UF`

**Escopo + decisões do criador (20/08/2026). Feature APROVADA para build.**

O número presidencial que os institutos medem numa amostra estadual está no
relatório-integra (PDF) mas não chega ao banco: o Poder360 serve o bloco
presidencial estadual como registro nacional e o `v2/cenarios` apaga as linhas.
O parser lê o bloco presidencial do PDF-integra de uma pesquisa estadual e o
insere como `presidente:UF`, automatizando a transcrição que a curadoria fez à
mão. **É ferramenta de bancada, não fonte de rede na coleta diária.**

## Realidade medida (não prometer além disto)

- `presidente:UF` hoje: **379** em 25 estados. Finos: **AM 0**, SE 1, AL 1, AP 1,
  RO 2, MT 3, MA 3; **RR ausente do banco inteiro**.
- Os PDFs **não estão no store** (`integra_url` = 0 de 1.013 preenchidos). A fonte
  real é `data-research/lacunas-sweep.json` (~1.150 URLs, `static.poder360.com.br`);
  ~285 integra distintos de governador.
- Integra por UF (governador 1º turno): MA 11 · AP 9 · AL 7 · MT 7 · AM 5 · SE 4 ·
  RO 3 · **RR 0**.
- ⚠ **Ganho realista:** teto por estado ≈ nº de PDFs; o líquido é MENOR (só ~40%
  dos relatórios amostrados no AM traziam bloco presidencial; parte já vazou pelo
  bundling nacional). **Mede-se relatório a relatório — não se promete "enche o mapa".**
- ~25% do volume (AtlasIntel, Quaest, Datafolha) é **slide em imagem sem camada de
  texto** → exige OCR.

## Decisões do criador — LOCKED (20/08/2026, §12)

1. **v1 = ALTO GANHO RELATIVO** — estados finos primeiro (inclui institutos
   só-imagem → OCR já no v1).
2. **BACKFILL: SIM** — parsear os ~285 PDFs existentes de uma vez.
3. **OCR: Apple Vision** (`scripts/ocr/`, offline, macOS-only) aceito como
   dependência de build.
4. **AUTORIDADE: o parser EMITE `add_poll` para REVISÃO CEGA HUMANA** — não insere
   direto. Mantém §1 (quem produz não certifica).
5. **VEÍCULO: reusar `data/repairs.json` / `add_poll`** — zero código de risco no
   caminho crítico da coleta.
6. **RR / cobertura: BUSCAR MAIS FONTES** (fora do Poder360) — sub-tarefa própria.

## Como (dadas as decisões)

- Lê o integra por **3 caminhos** (texto embutido / OCR Vision / render visual —
  os mesmos da curadoria PE-04519, `repairs.json:315-434`). Identifica o bloco
  presidencial (âncora "Presidente" + tabela **estimulada**), extrai candidato/
  partido/percentual, **baldes SEPARADOS** (branco/nulo × NS/NR — o agregador funde,
  o relatório separa), amostra/margem/datas/registro. Emite `add_poll` com
  `expect_sum` obrigatório e `source`/`evidence`/`verified_at`.
- **Atribuição:** `presidente:UF` — a UF vem do POLL/combo estadual, **não** do
  registro `BR-` do bloco. Casador de nome de urna roda depois (§6).
- **Cenário:** estimulada = "1º turno"; 2º turno por confronto; **espontânea não se
  guarda** (decisão do criador).
- **§1:** o parser produz UMA leitura; a **segunda leitura cega continua humana/
  segundo agente** antes do commit. O parser reduz o custo da transcrição, não
  substitui o portão.
- **§2:** `--self-test` que reprova com PDF-controle e soma adulterada; PDF que não
  parseia → **fila de pendência** (`parseado`/`ilegível`/`sem-bloco`), **nunca
  silêncio**; a conta entrada × emitido × rejeitado tem de fechar (o "mede zero e
  parece são").
- **Ausência ≠ zero** (§4): candidato não citado = campo nulo, não 0.

## Faseamento

- **v1** — estados finos (AM/SE/AL/AP/MT/MA/RO), OCR desde já (decisão 1); ~46 PDFs.
  Prova o fluxo ponta a ponta.
- **v2** — OCR/Vision escalado para o acervo (backfill dos ~285, decisão 2).
- **Paralelo** — sub-tarefa RR / mais-fontes (decisão 6).

## Riscos

Erro de OCR (texto pequeno/girado; siglas — correção desligada, dupla leitura);
má-atribuição BR × UF; variância de formato entre institutos; empate/troca de líder
(desempate em campo estável §8); pesquisa incompleta → gating, não invenção (§4);
fragmentação de amostra (transcrever a amostra do relatório, não a do agregador).

## Arquivos-chave

`scripts/lib/repairs.mjs` (porta `add_poll`: montagem, idempotência, `expect_sum`,
recusa de quase-igual) · `scripts/lacunas-poder360.mjs` (índice de trabalho:
registros ausentes/curtos com seu `integra`) · `scripts/ocr/ocr.swift` + `README.md`
(OCR Vision) · `data/repairs.json:315-434` (modelo curado PE-04519, schema de
referência) · `scripts/scrape.mjs` (`applyRepairs:307`, guardas de soma) ·
`data-research/lacunas-sweep.json` (fonte dos `integra`).
