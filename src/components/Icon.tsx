/**
 * Ícones de linha (estilo Lucide) — monocromáticos, herdam `currentColor`.
 * Set compartilhado para as páginas editoriais (metodologia etc.).
 */
export type IconName =
  | "file-text"
  | "landmark"
  | "globe"
  | "users"
  | "filter"
  | "refresh"
  | "ban"
  | "link"
  | "badge-check"
  | "trending-up"
  | "shield"
  | "split"
  | "merge"
  | "share"
  | "code"
  | "scan"
  | "shield-check"
  | "arrow-up-down"
  | "sigma";

export default function Icon({ name, className = "h-6 w-6" }: { name: IconName; className?: string }) {
  const p = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const svg = (children: React.ReactNode) => (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <g {...p}>{children}</g>
    </svg>
  );
  switch (name) {
    case "file-text":
      return svg(<><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6" /><path d="M8 13h8" /><path d="M8 17h8" /><path d="M8 9h2" /></>);
    case "landmark":
      return svg(<><path d="M3 22h18" /><path d="M6 18v-7" /><path d="M10 18v-7" /><path d="M14 18v-7" /><path d="M18 18v-7" /><path d="m12 2 9 6H3z" /></>);
    case "globe":
      return svg(<><circle cx="12" cy="12" r="10" /><path d="M2 12h20" /><path d="M12 2a15 15 0 0 1 0 20 15 15 0 0 1 0-20Z" /></>);
    case "users":
      return svg(<><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></>);
    case "filter":
      return svg(<path d="M22 3H2l8 9.46V19l4 2v-8.54z" />);
    case "refresh":
      return svg(<><path d="M3 12a9 9 0 0 1 15-6.7L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-15 6.7L3 16" /><path d="M3 21v-5h5" /></>);
    case "ban":
      return svg(<><circle cx="12" cy="12" r="10" /><path d="m4.9 4.9 14.2 14.2" /></>);
    case "link":
      return svg(<><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" /></>);
    case "badge-check":
      return svg(<><path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" /><path d="m9 12 2 2 4-4" /></>);
    case "trending-up":
      return svg(<><path d="M22 7 13.5 15.5 8.5 10.5 2 17" /><path d="M16 7h6v6" /></>);
    case "shield":
      return svg(<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z" />);
    case "split":
      return svg(<><path d="M16 3h5v5" /><path d="M8 3H3v5" /><path d="M12 22v-8.3a4 4 0 0 0-1.17-2.83L3 3" /><path d="m21 3-7.83 7.87A4 4 0 0 0 12 13.7" /></>);
    case "merge":
      return svg(<><path d="m8 6 4-4 4 4" /><path d="M12 2v10.3a4 4 0 0 1-1.17 2.83L4 22" /><path d="m20 22-5-5" /></>);
    case "share":
      return svg(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.6 13.5 6.8 4" /><path d="m15.4 6.5-6.8 4" /></>);
    case "code":
      return svg(<><path d="m16 18 6-6-6-6" /><path d="m8 6-6 6 6 6" /></>);
    case "scan":
      return svg(<><path d="M3 7V5a2 2 0 0 1 2-2h2" /><path d="M17 3h2a2 2 0 0 1 2 2v2" /><path d="M21 17v2a2 2 0 0 1-2 2h-2" /><path d="M7 21H5a2 2 0 0 1-2-2v-2" /><circle cx="12" cy="12" r="3" /></>);
    case "shield-check":
      return svg(<><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></>);
    case "arrow-up-down":
      return svg(<><path d="m21 16-4 4-4-4" /><path d="M17 20V4" /><path d="m3 8 4-4 4 4" /><path d="M7 4v16" /></>);
    case "sigma":
      return svg(<path d="M18 7V4H6l6 8-6 8h12v-3" />);
  }
}
