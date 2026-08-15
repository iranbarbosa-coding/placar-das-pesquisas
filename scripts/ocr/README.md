# OCR de relatórios de instituto

Os relatórios que mais importam aqui são exportados como **slides em imagem, sem
camada de texto** — `pypdf` e afins devolvem nada. Isso bloqueou por um bom tempo
tanto a verificação de reparos quanto a extração de recortes (AtlasIntel, Quaest e
Datafolha somam ~25% do volume e são exatamente os que não têm texto).

`ocr.swift` usa o framework **Vision**, que já vem no macOS: roda offline, lê
pt-BR, não precisa de instalação nem de serviço de terceiros. Nada de OCR é
enviado para fora da máquina.

## Compilar

```bash
swiftc -O -o scripts/ocr/ocr scripts/ocr/ocr.swift
```

O binário fica ignorado pelo git (`scripts/ocr/ocr`); recompile quando precisar.

## Usar

```bash
scripts/ocr/ocr caminho/do/relatorio.pdf            # documento inteiro
scripts/ocr/ocr caminho/do/relatorio.pdf 3 7        # páginas 3 a 7 (1-based)
```

Saída: texto puro, uma seção `=== página N ===` por página.

## O que esperar

- Renderiza a 300 dpi antes de reconhecer — a 72 dpi nativos o tipo pequeno das
  tabelas some.
- `usesLanguageCorrection` está **desligado**: sigla de partido não é palavra, e a
  correção automática transformava `PSOL` e `PRTB` em outra coisa.
- O reconhecimento erra em texto pequeno e girado. Num mesmo relatório apareceram
  `Ravenna Castro (Democrata)` legível e `(Den` / `(Dem` truncado, e `Mobiliza`
  virou `Mobılıza`. **Leia várias ocorrências antes de concluir** — foi assim que
  os reparos de partido do PI foram confirmados, com 2 e 3 ocorrências limpas.
- Um reparo citando OCR deve dizer isso na `evidence`, como os de `PI-05475/2026`
  e `PI-06473/2026` dizem.
