# Notas de evidência para o merge do lote v2.1 (parser presidencial)

Anotações do coordenador (§1 do lote v1.1, 21/08/2026) para acompanharem as
entradas no merge. Ficam NESTE arquivo, não dentro dos JSON gerados: os JSON
saem do parser deterministicamente (md5 conferido em 2 rodadas) e as quatro
entradas aprovadas na §1 precisam permanecer byte-idênticas — editar artefato
gerado à mão quebraria as duas coisas.

## Confirmadas dígito a dígito pela §1 (leituras cegas independentes)

- **AP Paraná cenário 1 e cenário 3** — contra a leitura arquivada de 20/08.
- **AP Veritá P13** — todas as 8 linhas da coluna Porcentual, baldes 47,7/4,9,
  ficha 1030 / 3,5 / 18–24 de março / AP-02183.
- **MA INOP Q05** — valores exatos, total 2502 fecha.

## Reprovada e corrigida

- **MA Veritá — fieldwork.** O PDF imprime "18 a 24 de março de 2026" e
  "Período: 18 a 24/03/2026" (p.2); a emissão v2 dizia 18→19 porque a regra de
  preferência punha a data do sweep (19, errada) no add_poll por cima da
  leitura CORRETA da ficha (24). Regra corrigida: PDF divergente manda no
  add_poll (§4); o match segue o sweep (alinhamento às linhas irmãs) e a
  divergência fica anotada em `_parser.divergencias_sweep`.

## Contexto para a evidência do merge (anotações do coordenador)

- **AP Veritá**: off-by-one interno do relatório — frequências válidas somam
  489 contra total impresso 488; ausentes 543 contra 542. Mesma doença Veritá
  do caso RR.
- **MA INOP**: divulgação (26/01) ANTERIOR ao fim do campo (28/01); nível de
  confiança ausente do relatório.
- **Registro BR-**: NENHUM dos três PDFs (AP Veritá, MA Veritá, MA INOP) traz
  registro BR- apesar das perguntas presidenciais — prática inconsistente do
  Veritá entre estados (em RR há BR-01469; em AP/MA não).
