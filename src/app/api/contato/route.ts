import { NextResponse, type NextRequest } from "next/server";

// Formulário de contato → e-mail, via API REST da Resend (sem SDK/dependência).
// Requer a env `RESEND_API_KEY` (e um domínio verificado na Resend para o
// remetente). Destinatário e remetente têm padrão, mas podem ser sobrescritos
// por env. Um form HTML nativo faz POST aqui; respondemos com redirect 303 de
// volta para /contato, sinalizando sucesso/erro pela query.
const TO = process.env.CONTACT_TO ?? "contato@placardaspesquisas.com.br";
const FROM = process.env.CONTACT_FROM ?? "Placar das Pesquisas <contato@placardaspesquisas.com.br>";

function back(req: NextRequest, query: string) {
  return NextResponse.redirect(new URL(`/contato?${query}`, req.nextUrl.origin), 303);
}

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const nome = String(form.get("nome") ?? "").trim();
  const email = String(form.get("email") ?? "").trim();
  const assunto = String(form.get("assunto") ?? "").trim();
  const mensagem = String(form.get("mensagem") ?? "").trim();
  const armadilha = String(form.get("empresa") ?? "").trim(); // honeypot: humano não vê

  // Campo-armadilha preenchido → provável bot: finge sucesso e descarta.
  if (armadilha) return back(req, "enviado=1");

  const emailOk = /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email);
  if (!nome || !emailOk || !mensagem) return back(req, "erro=validacao");

  const key = process.env.RESEND_API_KEY;
  if (!key) {
    console.error("[contato] RESEND_API_KEY ausente — envio não configurado.");
    return back(req, "erro=config");
  }

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: FROM,
        to: [TO],
        reply_to: email,
        subject: assunto ? `[Contato] ${assunto}` : `[Contato] Mensagem de ${nome}`,
        text: `Nome: ${nome}\nE-mail: ${email}\nAssunto: ${assunto || "(sem assunto)"}\n\n${mensagem}\n`,
      }),
    });
    if (!res.ok) {
      console.error("[contato] Resend respondeu", res.status, await res.text().catch(() => ""));
      return back(req, "erro=envio");
    }
  } catch (e) {
    console.error("[contato] falha ao enviar:", e);
    return back(req, "erro=envio");
  }

  return back(req, "enviado=1");
}
