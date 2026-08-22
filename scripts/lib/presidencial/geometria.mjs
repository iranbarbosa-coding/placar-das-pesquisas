// PAREAMENTO GEOMÉTRICO rótulo×valor — caixas delimitadoras do Vision (`ocr
// --boxes`) no lugar da ORDEM de emissão do texto.
//
// Por que existe: a classe de defeito que reprovou o AM-08042 e o lote 3 é a
// ordem — corridas separadas (e alternâncias aparentes) somam 100 e enganam
// todo guarda de soma quando o gerador do PDF embaralha. A POSIÇÃO NO PAPEL não
// depende da ordem de emissão: se cada valor tem exatamente um rótulo na sua
// linha visual, o pareamento é estrutural de novo. Este módulo faz SÓ isso, e
// RECUSA tudo o que não for inequívoco (§4):
//   - valor com DOIS rótulos plausíveis na mesma linha visual → recusa;
//   - rótulo de candidato/balde SEM valor pareado → recusa (leitura incompleta
//     — foi exatamente o Datafolha-controle: o Vision perdeu o "57" do Lula);
//   - caixa com vários valores → recusa (crosstab/multi-coluna não é para cá);
//   - dois valores disputando o mesmo rótulo → recusa.
// Valores SOLTOS longe de qualquer rótulo (número de página, ano no cabeçalho)
// são descartados — se pertenciam a um candidato, o rótulo órfão recusa a página.
//
// Puro e determinístico (§8): recebe o texto de `--boxes`, devolve pares ou
// recusa tipada. Quem decide emissão é o orquestrador, comparando estas figuras
// com a outra perna (pernasConcordam) — geometria sozinha não emite nada.
import { classificarRotulo, separarRotuloValores } from "./parse.mjs";

const VALOR_PURO = /^(\*|\d{1,3}(?:[.,]\d{1,2})?)\s*%?$/;
// Sujeira que o Vision cola na borda de caixas destas lâminas (medida no
// Paraná AP: "Ronaldo Caiado |2,6%", "Renan Santos (MISSÃO) | 2").
const SUJEIRA = /[|\[\]•·]/g;

/** Saída de `ocr --boxes` → [{page, w, h, boxes: [{x,y,w,h,text}]}]. */
export function paginarBoxes(raw) {
  const paginas = [];
  let atual = null;
  for (const linha of raw.split("\n")) {
    const cab = linha.match(/^===\s*página\s+(\d+)\s*===\s*(\d+)x(\d+)$/);
    if (cab) { atual = { page: Number(cab[1]), w: Number(cab[2]), h: Number(cab[3]), boxes: [] }; paginas.push(atual); continue; }
    if (!atual || !linha.trim()) continue;
    const m = linha.split("\t");
    if (m.length < 5) continue;
    const [x, y, w, h] = m.slice(0, 4).map(Number);
    if (![x, y, w, h].every(Number.isFinite)) continue;
    atual.boxes.push({ x, y, w, h, text: m.slice(4).join("\t") });
  }
  return paginas;
}

/**
 * Uma página de caixas → {ok:true, pares} ou {ok:false, motivo}. `pares` no
 * mesmo formato do colherTabela ({rotulo, valores:[v]}), ordenados de cima para
 * baixo (desempate: x, depois rótulo — §8).
 */
export function parearPorGeometria(pg) {
  const rotulos = [];
  const valores = [];
  const pares = [];
  for (const b of pg.boxes) {
    const limpo = b.text.replace(SUJEIRA, " ").replace(/\s+/g, " ").trim();
    if (!limpo) continue;
    const cy = b.y + b.h / 2;
    if (VALOR_PURO.test(limpo)) { valores.push({ ...b, cy, limpo }); continue; }
    // Caixa que já traz "rótulo valor" colados (o Vision fundiu as duas ilhas):
    // pareamento interno à caixa — inequívoco por construção.
    const sv = separarRotuloValores(limpo);
    if (sv && classificarRotulo(sv.rotulo)) {
      if (sv.valores.length !== 1) return { ok: false, motivo: `caixa com ${sv.valores.length} valores ("${limpo}") — multi-coluna não é pareável por geometria` };
      // Fora da escala percentual não é par: é cabeçalho com ano ("Julho de
      // 2025") ou contagem — a caixa não participa, em vez de envenenar a página.
      if (sv.valores[0] != null && (sv.valores[0] > 100 || sv.valores[0] < 0)) continue;
      pares.push({ rotulo: sv.rotulo, valores: sv.valores, cy, x: b.x });
      continue;
    }
    if (classificarRotulo(limpo)) rotulos.push({ ...b, cy, limpo, pareado: false });
    // resto (títulos, enunciado, base) não participa
  }

  for (const v of valores) {
    // Mesma linha visual: os centros verticais se sobrepõem dentro da altura da
    // maior caixa (0,75 medido com folga sobre os controles: no Paraná a caixa
    // do valor é ~1,5× a do rótulo e os centros divergem <15% da altura).
    const naLinha = rotulos.filter((r) => Math.abs(r.cy - v.cy) <= 0.75 * Math.max(r.h, v.h));
    if (naLinha.length === 0) continue; // solto (número de página, ano) — descartado
    if (naLinha.length > 1) return { ok: false, motivo: `valor "${v.limpo}" com ${naLinha.length} rótulos na mesma linha visual — ambíguo, recusa (§4)` };
    const r = naLinha[0];
    if (r.pareado) return { ok: false, motivo: `dois valores disputam o rótulo "${r.limpo}" — recusa (§4)` };
    r.pareado = true;
    const vs = v.limpo === "*" ? [null] : [Number(v.limpo.replace("%", "").replace(",", "."))];
    pares.push({ rotulo: r.limpo, valores: vs, cy: r.cy, x: r.x });
  }

  const orfaos = rotulos.filter((r) => !r.pareado);
  if (orfaos.length) return { ok: false, motivo: `rótulo(s) sem valor pareado: ${orfaos.map((o) => `"${o.limpo}"`).join(", ")} — leitura visual incompleta, recusa (§4)` };
  if (pares.length < 3) return { ok: false, motivo: `só ${pares.length} pares geométricos — insuficiente` };

  pares.sort((a, b) => a.cy - b.cy || a.x - b.x || a.rotulo.localeCompare(b.rotulo));
  return { ok: true, pares: pares.map(({ rotulo, valores: vs }) => ({ rotulo, valores: vs })) };
}
