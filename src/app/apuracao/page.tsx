import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import ApuracaoSegundoTurno from "@/components/ApuracaoSegundoTurno";
import { lerApuracao2T, type Leitura2T } from "@/lib/apuracao2t";
import { resumoApuracao } from "@/lib/apuracao-resumo";

// Prévia do link (WhatsApp, X…) com os números do momento — pedido do criador,
// 24/10/2026: o link já "expande" com o principal. O cartão leva ?v=<seções
// apuradas> para que nenhum aplicativo reaproveite uma imagem de placar velho.
export async function generateMetadata(): Promise<Metadata> {
  let leitura: Leitura2T | null = null;
  try {
    leitura = await lerApuracao2T({ fresco: false });
  } catch {
    leitura = null;
  }
  const r = resumoApuracao(leitura);
  const imagem = { url: `/apuracao-cartao?v=${r.versao}`, width: 1200, height: 630, alt: r.titulo };
  return {
    title: r.titulo,
    description: r.descricao,
    openGraph: { type: "website", url: "/apuracao", title: r.titulo, description: r.descricao, images: [imagem] },
    twitter: { card: "summary_large_image", title: r.titulo, description: r.descricao, images: [imagem.url] },
  };
}

// Primeiro desenho servido pela CDN e refeito a cada 30s; depois disso o
// próprio navegador consulta /api/apuracao-2t.json a cada 30s.
export const revalidate = 30;
// A leitura por município pode levar alguns segundos (prazo interno de 7s).
export const maxDuration = 30;

const SVG = fs.readFileSync(path.join(process.cwd(), "src/components/brasil-mapa.svg"), "utf-8");

export default async function ApuracaoSegundoTurnoPage() {
  let inicial: Leitura2T | null = null;
  try {
    inicial = await lerApuracao2T({ fresco: false });
  } catch {
    // TSE fora do ar no momento do build/revalidação: o cliente tenta de novo.
  }
  return <ApuracaoSegundoTurno inicial={inicial} mapaSvg={SVG} />;
}
