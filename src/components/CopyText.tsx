"use client";

import { useState } from "react";

/** A copy-paste block: the text in a <pre> with a "Copiar" button. Used on the
 *  press page for the boilerplate, the citation line and the embed snippets. */
export default function CopyText({ text, oneline = false }: { text: string; oneline?: boolean }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      // Clipboard API unavailable (older browsers / insecure context) — fall
      // back to a hidden textarea + execCommand.
      try {
        const ta = document.createElement("textarea");
        ta.value = text;
        ta.setAttribute("readonly", "");
        ta.style.position = "absolute";
        ta.style.left = "-9999px";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
      } catch {
        return; // give up silently; the text is still selectable
      }
    }
    setDone(true);
    setTimeout(() => setDone(false), 1600);
  }

  return (
    <div className="relative">
      <pre
        className={`overflow-x-auto rounded-lg border p-4 pr-24 text-xs leading-relaxed ${oneline ? "" : "whitespace-pre-wrap break-words"}`}
        style={{ borderColor: "var(--ring)", background: "var(--surface-1)", color: "var(--text-primary)" }}
      >
        <code>{text}</code>
      </pre>
      <button
        type="button"
        onClick={copy}
        className="absolute right-2 top-2 rounded px-3 py-1.5 text-xs font-semibold"
        style={{ background: done ? "var(--cand-green)" : "var(--accent)", color: "var(--surface-1)" }}
      >
        {done ? "Copiado ✓" : "Copiar"}
      </button>
    </div>
  );
}
