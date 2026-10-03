# PREDICOES — o registro do que dissemos antes de o resultado sair

**Regra.** Nenhuma predição vai ao ar (vídeo, post, texto) sem antes virar uma
linha em `data/predicoes.ndjson`. Depois da apuração, cada linha recebe o
`resultado`. É isso que permite dizer, com número, quanto a média do Placar
acertou — e é o que impede a memória seletiva.

Uma predição é uma **afirmação verificável** sobre o pleito, derivada da média
publicada no site naquele momento. A média é a base; a predição é a leitura.
As duas ficam gravadas lado a lado.

## Uma linha por afirmação (NDJSON)

```json
{"id":"pred-2026-10-03-presidente-BR-1",
 "registrada_em":"2026-10-03T16:00:00Z",
 "disputa":"presidente:BR","turno":1,
 "tipo":"segundo_turno",
 "afirmacao":"Lula e Flávio Bolsonaro vão ao 2º turno, Lula à frente no 1º.",
 "confianca":"alta",
 "base":{"generated_at":"2026-10-03T14:17:08Z","basis":"validos","poll_count":10,
         "last_poll_date":"2026-09-28","spread":2.6,
         "media":{"Lula":44.3,"Flávio Bolsonaro":41.7},"em_quarentena":false},
 "publicacao":{"canal":"video","url":null,"publicada_em":null},
 "resultado":null}
```

Campos:

- `id` — `pred-<AAAA-MM-DD>-<cargo>-<UF>-<n>`, único.
- `disputa` — `cargo:UF` como em `data/disputas-declaradas.json` (`presidente:BR`,
  `governador:SP`, `senador:MG`).
- `tipo` — um de: `vence_1o_turno` (≥50% dos válidos), `segundo_turno` (quem vai
  e em que ordem), `ordem_dois_primeiros`, `senado_duas_vagas` (os dois eleitos),
  `faixa` (candidato X entre A% e B% dos válidos).
- `afirmacao` — uma frase, verificável com a apuração do TSE.
- `confianca` — `alta` (diferença maior que a soma das margens), `media`
  (diferença entre uma e duas margens), `baixa` (dentro da margem ou disputa em
  quarentena).
- `base` — copiada do `/api/averages.json` do momento: `generated_at`, `basis`,
  `poll_count`, `last_poll_date`, `spread`, `media` (candidato → média) e
  `em_quarentena` (se o site mostra "Dado em revisão" para a disputa).
- `publicacao` — preenchida quando o vídeo/post sai: canal, URL, data.
- `resultado` — `null` até a apuração; depois `{"apurado":{...},"acertou":true|false,
  "avaliado_em":"...","nota":"..."}`.

## Validador

`node scripts/predicoes-check.mjs` confere o esquema, a unicidade dos ids, as
disputas contra `data/disputas-declaradas.json` e os `resultado` preenchidos.
`--self-test` prova que ele reprova linhas malformadas.

## Avaliação

Depois de 04/10 (e de 25/10 para o 2º turno), preencher `resultado` em cada
linha com a apuração oficial do TSE e rodar o validador. O placar de acertos
por `tipo` e `confianca` é o que publicamos sobre nós mesmos.
