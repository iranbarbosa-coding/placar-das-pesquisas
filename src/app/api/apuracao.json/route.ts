import { NextResponse } from "next/server";
import { lerApuracao } from "@/lib/apuracao";

// Repasse da apuração do TSE (que não manda CORS). Dinâmico, mas com cache curto
// na CDN: milhares de leitores batendo na página geram ~3 leituras/min ao TSE,
// não uma por leitor. O próprio TSE publica com max-age=50.
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const dados = await lerApuracao();
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
