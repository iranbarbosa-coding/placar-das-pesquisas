import { NextResponse } from "next/server";
import { CACHE_HEADERS, latestBody, raceIds } from "@/lib/forecast-api";

// Snapshot mais recente da disputa (e o último publicado, se o mais recente não publicou). Estático: uma
// resposta por disputa, gerada no build; id desconhecido é 404.
export const dynamic = "force-static";
export const dynamicParams = false;

export function generateStaticParams() {
  return raceIds().map((raceId) => ({ raceId }));
}

export async function GET(_req: Request, { params }: { params: Promise<{ raceId: string }> }) {
  const { raceId } = await params;
  return NextResponse.json(latestBody(raceId), { headers: CACHE_HEADERS });
}
