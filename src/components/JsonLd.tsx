/**
 * Renders one <script type="application/ld+json"> with a schema.org object.
 *
 * Server-only, no client cost. JSON.stringify output is escaped for the one
 * character that can break out of a <script> block ("<"), which is enough for
 * ld+json (there is no attribute context and no user-authored HTML here).
 */
export default function JsonLd({ data }: { data: object }) {
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
