/**
 * Vercel Serverless Function — /api/send-verification-email
 * Envia email via SendGrid HTTP API (funciona no Vercel, sem SMTP)
 *
 * Variáveis de ambiente no Vercel (Settings → Environment Variables):
 *   SENDGRID_API_KEY   = (configure no painel do Vercel)
 *   SENDGRID_FROM_EMAIL = seu.email@gmail.com
 */

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(200).end();
  if (req.method !== "POST")
    return res.status(405).json({ error: "Method not allowed" });

  const { email, name, code } = req.body || {};

  if (!email || !name || !code) {
    return res
      .status(400)
      .json({ error: "email, name e code são obrigatórios" });
  }

  const apiKey = process.env.SENDGRID_API_KEY;
  const fromEmail =
    process.env.SENDGRID_FROM_EMAIL || "oxentech.software@gmail.com";

  if (!apiKey) {
    console.error("SENDGRID_API_KEY não configurada");
    return res.status(500).json({ error: "Serviço de email não configurado" });
  }

  const htmlBody = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
    .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; padding: 40px; }
    .header { text-align: center; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; margin-bottom: 30px; }
    .header h1 { color: #2c5f2d; font-size: 28px; margin: 0; }
    .code-box { background: linear-gradient(135deg, #e8f5e9, #f1f8e9); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #2c5f2d; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #2c5f2d; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fff3e0; padding: 15px; border-radius: 5px; border-left: 4px solid #ff9800; margin: 20px 0; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌾 AgroColetivo</h1>
      <p style="color:#666;margin:8px 0 0">Bem-vindo ao nosso sistema!</p>
    </div>
    <p>Olá <strong>${name}</strong>,</p>
    <p>Para confirmar seu email e acessar o AgroColetivo, use o código abaixo:</p>
    <div class="code-box">
      <div class="code">${code}</div>
      <p class="code-label">Este código expira em 24 horas</p>
    </div>
    <div class="warning">
      <strong>⚠️ Segurança:</strong> Nunca compartilhe este código com ninguém.
    </div>
    <p>Se você não se cadastrou no AgroColetivo, ignore este email.</p>
    <div class="footer">
      <p>© 2026 AgroColetivo · Oxentech Software</p>
    </div>
  </div>
</body>
</html>`;

  try {
    const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: fromEmail, name: "AgroColetivo" },
        subject: "✉️ Confirme seu email - AgroColetivo",
        content: [{ type: "text/html", value: htmlBody }],
      }),
    });

    if (response.status === 202) {
      console.log(`✅ Email enviado para ${email} via SendGrid`);
      return res
        .status(200)
        .json({ success: true, message: "Email enviado com sucesso" });
    }

    const errText = await response.text();
    console.error("SendGrid erro:", response.status, errText);
    return res
      .status(500)
      .json({ success: false, error: `SendGrid: ${response.status}` });
  } catch (error) {
    console.error("Erro ao chamar SendGrid:", error.message);
    return res.status(500).json({ success: false, error: error.message });
  }
};
