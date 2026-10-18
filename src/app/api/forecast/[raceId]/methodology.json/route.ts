import { NextResponse } from "next/server";
import { CACHE_HEADERS, methodologyBody, raceIds } from "@/lib/forecast-api";

// Modelo, diagnósticos, calibração e as pesquisas incluídas e excluídas. Estático: uma
// resposta por disputa, gerada no build; id desconhecido é 404.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return raceIds().map((raceId) => ({ raceId }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params;
  return NextResponse.json(methodologyBody(raceId), { headers: CACHE_HEADERS });
}
