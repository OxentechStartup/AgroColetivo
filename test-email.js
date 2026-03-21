#!/usr/bin/env node
/**
 * Script de teste de email
 * Envia email de teste para validar configuração
 */

import nodemailer from "nodemailer";

(async () => {
  try {
    console.log("📧 Iniciando teste de email...\n");

    const transporter = nodemailer.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: "oxentech.startup@gmail.com",
        pass: "dlskwqszofvtdfsz",
      },
    });

    console.log("🔐 Conectando ao Gmail SMTP...");

    const result = await transporter.sendMail({
      from: '"AgroColetivo" <oxentech.startup@gmail.com>',
      to: "daniel.fer.nor8734@gmail.com",
      subject: "✅ Teste de Email - Sistema AgroColetivo",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <style>
            body { font-family: 'Segoe UI', Arial, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }
            .container { max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
            .header { text-align: center; color: #2c5f2d; margin-bottom: 30px; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; }
            .header h1 { margin: 0; font-size: 32px; }
            .content { color: #333; line-height: 1.6; }
            .success-box { background: #e8f5e9; padding: 20px; border-radius: 5px; border-left: 4px solid #2c5f2d; margin: 20px 0; }
            .success-box h3 { margin: 0 0 10px 0; color: #2c5f2d; }
            .info { background: #f0f7ff; padding: 15px; border-radius: 5px; border-left: 4px solid #1976d2; margin: 15px 0; font-size: 14px; }
            .divider { margin: 30px 0; border: none; border-top: 1px solid #e0e0e0; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🌾 AgroColetivo</h1>
              <p style="margin: 8px 0 0 0; color: #666;">Sistema de Compras Coletivas</p>
            </div>
            
            <div class="content">
              <p>Olá Daniel,</p>
              
              <div class="success-box">
                <h3>✅ Email funcionando!</h3>
                <p>Este é um email de teste para confirmar que o sistema de notificações está ativo e pronto para produção.</p>
              </div>
              
              <div class="info">
                <strong>Informações do teste:</strong><br>
                Data: ${new Date().toLocaleString("pt-BR")}<br>
                Servidor: Gmail SMTP (oxentech.startup@gmail.com)<br>
                Ambiente: Produção (Render)
              </div>
              
              <p>Se você recebeu este email, significa que:</p>
              <ul>
                <li>✅ As credenciais do Gmail estão corretamente configuradas</li>
                <li>✅ O servidor SMTP está respondendo</li>
                <li>✅ Os endpoints de email funcionarão para:</li>
                <ul>
                  <li>Verificação de conta</li>
                  <li>Notificação de novos pedidos</li>
                  <li>Notificação de novas propostas</li>
                  <li>Notificação de propostas recebidas</li>
                </ul>
              </ul>
              
              <hr class="divider">
              
              <p><strong>Próximos passos:</strong></p>
              <ol>
                <li>Fazer git push para Render</li>
                <li>Deployar alterações em produção</li>
                <li>Sistema de emails estará totalmente funcional</li>
              </ol>
              
              <div class="footer">
                <p>© 2026 AgroColetivo · Oxentech Software</p>
                <p>Este email foi enviado como teste automático do sistema</p>
              </div>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    console.log("\n✅ Email enviado com sucesso!");
    console.log("📬 Message ID:", result.messageId);
    console.log("\n✨ Sistema está pronto para produção!");
  } catch (error) {
    console.error("\n❌ Erro ao enviar email:");
    console.error("   Mensagem:", error.message);
    if (error.response) {
      console.error("   Resposta SMTP:", error.response);
    }
    process.exit(1);
  }
})();
