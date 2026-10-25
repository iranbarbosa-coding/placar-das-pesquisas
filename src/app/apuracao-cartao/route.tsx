import fs from "node:fs";
import path from "node:path";
import { ImageResponse } from "next/og";
import { lerApuracao2T } from "@/lib/apuracao2t";
import { fmtChance, fmtPctBr, resumoApuracao } from "@/lib/apuracao-resumo";

/*
 * Cartão de PRÉVIA do link /apuracao (WhatsApp, X, Telegram), com os números do
 * momento: antes das 17h anuncia a apuração; durante, placar + % apurado + chance
 * de vitória; no fim, o resultado. A página aponta para cá com ?v=<seções
 * apuradas>, então cada nova totalização é uma URL nova e nenhum cache de
 * aplicativo segura um placar velho. Fundo branco com a paleta clara do
 * site; Satori exige display:flex em todo <div> com
 * mais de um filho.
 */
export const dynamic = "force-dynamic";
// A leitura por município pode levar alguns segundos (prazo interno de 7s).
export const maxDuration = 30;

// Fundo BRANCO (pedido do criador, 24/10): paleta clara do site (globals.css :root).
const FUNDO = "#ffffff";
const TINTA = "#0f172a";
const BLUE = "#2563eb";
const SLATE = "#475569";
const RED = "#ef4444";

const foto = (sq: string) => {
  try {
    return `data:image/jpeg;base64,${fs.readFileSync(path.join(process.cwd(), "public/candidatos", `${sq}.jpg`)).toString("base64")}`;
  } catch {
    return null;
  }
};

function Rosto({ src, cor }: { src: string | null; cor: string }) {
  return src ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={src} width={132} height={132} style={{ borderRadius: 999, border: `6px solid ${cor}`, objectFit: "cover", objectPosition: "50% 30%" }} />
  ) : (
    <div style={{ width: 132, height: 132, borderRadius: 999, border: `6px solid ${cor}`, display: "flex" }} />
  );
}

export async function GET() {
  let leitura = null;
  try {
    // Sempre o dado novo: o cache de 60s fica na própria imagem (CDN), não nos dados.
    leitura = await lerApuracao2T({ fresco: true });
  } catch {
    leitura = null;
  }
  const r = resumoApuracao(leitura);
  const lula = foto("280002542548");
  const flavio = foto("280002551544");

  const topo = r.fase === "final" ? "RESULTADO · 2º TURNO" : "APURAÇÃO AO VIVO · 2º TURNO";

  const imagem = new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: FUNDO,
          borderBottom: `14px solid ${BLUE}`,
          padding: "56px 72px",
          fontFamily: "sans-serif",
          color: TINTA,
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
            {/* Ponto desenhado: a fonte do Satori não tem o glifo "●". */}
            <div style={{ display: "flex", width: 18, height: 18, borderRadius: 999, background: r.fase === "aoVivo" ? "#dc2626" : BLUE }} />
            <div style={{ display: "flex", fontSize: 28, letterSpacing: 4, color: r.fase === "aoVivo" ? "#dc2626" : SLATE, fontWeight: 700 }}>{topo}</div>
          </div>
          <div style={{ display: "flex", alignItems: "baseline", fontSize: 30, fontWeight: 800 }}>
            <span style={{ color: TINTA }}>Placar</span>
            <span style={{ color: SLATE, fontSize: 20, marginLeft: 8, marginRight: 8 }}>das</span>
            <span style={{ color: BLUE }}>Pesquisas</span>
          </div>
        </div>

        {r.placar ? (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <Rosto src={lula} cor={RED} />
                <div style={{ display: "flex", flexDirection: "column" }}>
                  <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>Lula</div>
                  <div style={{ display: "flex", fontSize: 104, fontWeight: 800, color: RED, lineHeight: 1 }}>{`${fmtPctBr(r.placar.lula, 2)}%`}</div>
                </div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", fontSize: 34, fontWeight: 700 }}>Flávio Bolsonaro</div>
                  <div style={{ display: "flex", fontSize: 104, fontWeight: 800, color: BLUE, lineHeight: 1 }}>{`${fmtPctBr(r.placar.flavio, 2)}%`}</div>
                </div>
                <Rosto src={flavio} cor={BLUE} />
              </div>
            </div>
            <div style={{ display: "flex", height: 26, borderRadius: 8, overflow: "hidden", marginTop: 28, background: "#e2e8f0" }}>
              <div style={{ display: "flex", width: `${r.placar.lula}%`, background: RED }} />
              <div style={{ display: "flex", flex: 1 }} />
              <div style={{ display: "flex", width: `${r.placar.flavio}%`, background: BLUE }} />
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Rosto src={lula} cor={RED} />
              <div style={{ display: "flex", fontSize: 56, fontWeight: 800, color: SLATE }}>×</div>
              <Rosto src={flavio} cor={BLUE} />
            </div>
            <div style={{ display: "flex", fontSize: 84, fontWeight: 800, marginTop: 28, lineHeight: 1.05 }}>Domingo, 25/10, às 17h</div>
            <div style={{ display: "flex", fontSize: 32, color: SLATE, marginTop: 14 }}>Presidente e governadores, direto do TSE, a cada 30 segundos</div>
          </div>
        )}

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 32 }}>
          {r.placar ? (
            <div style={{ display: "flex", fontWeight: 700 }}>
              {r.fase === "final" ? (r.eleito ? `${r.eleito} eleito` : "Totalização encerrada") : `${fmtPctBr(r.placar.apurado)}% apurado`}
            </div>
          ) : (
            <div style={{ display: "flex", fontWeight: 700 }}>Chance de vitória em tempo real</div>
          )}
          {r.chance ? (
            <div style={{ display: "flex", color: SLATE }}>
              {`Chance de vitória: Lula ${fmtChance(r.chance.lula)} · Flávio ${fmtChance(r.chance.flavio)}`}
            </div>
          ) : (
            <div style={{ display: "flex", color: SLATE }}>placardaspesquisas.com.br</div>
          )}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
  // Cache curto de CDN: o cartão acompanha a apuração sem virar uma ida ao TSE por pedido.
  imagem.headers.set("Cache-Control", "public, s-maxage=60, stale-while-revalidate=120");
  return imagem;
}
