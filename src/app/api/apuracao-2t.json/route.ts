import { NextResponse } from "next/server";
import { lerApuracao2T } from "@/lib/apuracao2t";

// Repasse da apuração do 2º turno (o TSE não manda CORS). Mesmo cache curto de
// CDN da rota do 1º turno: ~3 leituras/min ao TSE, não uma por leitor.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dados = await lerApuracao2T();
    return NextResponse.json(dados, {
      headers: {
        "Cache-Control": "public, s-maxage=20, stale-while-revalidate=60",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (e) {
    return NextResponse.json(
      { erro: String((e as Error).message ?? e) },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
