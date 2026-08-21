/**
 * The state page's section switcher: a segmented control matching the redesign
 * mockup — Visão geral · Governador · Senado · Presidente · Todas as pesquisas.
 *
 * Server component, purely presentational. Only "Visão geral" is a live view for
 * now; the other sections are being structured in later passes, so their pills
 * render inert (not links) rather than pointing at nothing. The active pill is
 * filled with the brand accent; the rest read as muted, and `aria-current`
 * marks the current view for assistive tech.
 */

const ITEMS = ["Visão geral", "Governador", "Senado", "Presidente", "Todas as pesquisas"] as const;
export type StateNavItem = (typeof ITEMS)[number];

export default function StateNav({ active }: { active: StateNavItem }) {
  return (
    <nav
      aria-label="Seções do estado"
      className="inline-flex w-fit max-w-full flex-wrap gap-1 rounded-lg p-1 text-sm"
      style={{ border: "1px solid var(--ring)", background: "var(--surface-1)" }}
    >
      {ITEMS.map((label) => {
        const isActive = label === active;
        return (
          <span
            key={label}
            aria-current={isActive ? "page" : undefined}
            className="rounded-md px-3 py-1 font-medium"
            style={
              isActive
                ? { background: "var(--accent)", color: "#ffffff" }
                : { color: "var(--text-secondary)" }
            }
          >
            {label}
          </span>
        );
      })}
    </nav>
  );
}
