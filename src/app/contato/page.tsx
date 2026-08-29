import { redirect } from "next/navigation";

// Contato foi incorporado à Sala de Imprensa (/imprensa#contato). Mantemos esta
// rota como redirecionamento para não quebrar links e favoritos antigos.
export default function ContatoPage() {
  redirect("/imprensa#contato");
}
