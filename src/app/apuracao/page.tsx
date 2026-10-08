import fs from "node:fs";
import path from "node:path";
import type { Metadata } from "next";
import ApuracaoLive from "@/components/ApuracaoLive";
import { lerApuracao, type Apuracao } from "@/lib/apuracao";

export const metadata: Metadata = {
  title: "Apuração ao vivo · Presidente 1º turno",
  description:
    "Apuração em tempo real da eleição presidencial de 2026: votos de Lula e Flávio Bolsonaro (percentual dos válidos e número de votos) e andamento da apuração no Brasil, por região e por estado. Dados oficiais do TSE.",
};

// Primeiro desenho servido pela CDN e refeito a cada 30s; depois disso o
// próprio navegador consulta /api/apuracao.json a cada 30s.
export const revalidate = 30;

const SVG = fs.readFileSync(path.join(process.cwd(), "src/components/brasil-mapa.svg"), "utf-8");

export default async function ApuracaoPage() {
  let inicial: Apuracao | null = null;
  try {
    inicial = await lerApuracao({ fresco: false });
  } catch {
    // TSE fora do ar no momento do build/revalidação: o cliente tenta de novo.
  }
  return <ApuracaoLive inicial={inicial} mapaSvg={SVG} />;
}
