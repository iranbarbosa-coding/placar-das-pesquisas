"use client";

import { useRouter } from "next/navigation";

/**
 * Casca interativa do mapa: recebe o SVG já colorido (string, montado no
 * servidor por `BrasilMap` — que lê o arquivo do disco) e torna cada estado
 * clicável, navegando para a página daquele estado. Delegação de evento: no
 * clique, sobe até o elemento com `data-uf` mais próximo e usa a UF. Teclado e
 * leitores de tela usam a tabela acessível (links) que `BrasilMap` renderiza ao
 * lado — por isso aqui basta o ponteiro do mouse.
 */
export default function MapInteractive({
  html,
  id,
  label,
}: {
  html: string;
  id: string;
  label: string;
}) {
  const router = useRouter();
  const go = (target: EventTarget | null) => {
    const el = target instanceof Element ? target.closest("[data-uf]") : null;
    const uf = el?.getAttribute("data-uf");
    if (uf) router.push(`/estados/${uf.toLowerCase()}`);
  };
  return (
    <div
      id={id}
      role="img"
      aria-label={label}
      onClick={(e) => go(e.target)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
