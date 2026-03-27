/**
 * Email Service - Gmail (Grátis + Real) e Ethereal (Teste)
 *
 * Este módulo encapsula a lógica de envio de emails com suporte para:
 * - Gmail: SMTP grátis, entrega real via oxentech.startup@gmail.com
 * - Ethereal: Teste local, não entrega real
 */

export async function sendVerificationEmail(
  userEmail,
  userName,
  verificationCode,
) {
  try {
    // Usar Gmail se tiver as credenciais, senão Ethereal
    const useGmail =
      process.env.GMAIL_USER &&
      process.env.GMAIL_APP_PASSWORD &&
      process.env.GMAIL_USER.trim().length > 0 &&
      process.env.GMAIL_APP_PASSWORD.trim().length > 0;

    if (useGmail) {
      return await sendViaGmail(userEmail, userName, verificationCode);
    } else {
      return await sendViaEthereal(userEmail, userName, verificationCode);
    }
  } catch (error) {
    throw error;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GMAIL (PRODUÇÃO - 100% GRÁTIS VIA APP PASSWORD)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaGmail(userEmail, userName, verificationCode) {
  try {
    // Importar Nodemailer
    const nodemailer = await import("nodemailer");
    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ""), // Remove espaços
      },
    });

    const htmlEmail = getVerificationEmailTemplate(userName, verificationCode);

    const result = await transporter.sendMail({
      from: `AgroColetivo <${process.env.GMAIL_USER}>`,
      to: userEmail,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: htmlEmail,
    });

    if (!result.messageId) {
      throw new Error("Falha ao enviar email via Gmail");
    }

    return {
      success: true,
      service: "gmail",
      messageId: result.messageId,
      message: "Email enviado com sucesso",
    };
  } catch (error) {
    console.error("Erro ao enviar via Gmail:", error.message);
    // Fallback para Ethereal se Gmail falhar
    return await sendViaEthereal(userEmail, userName, verificationCode);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// ETHEREAL (TESTE LOCAL - PREVIEW SEM ENTREGA REAL)
// ─────────────────────────────────────────────────────────────────────────────
async function sendViaEthereal(userEmail, userName, verificationCode) {
  try {
    const nodemailer = await import("nodemailer");

    // Criar conta Ethereal de teste
    const testAccount = await nodemailer.default.createTestAccount();

    const transporter = nodemailer.default.createTransport({
      host: "smtp.ethereal.email",
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    const htmlEmail = getVerificationEmailTemplate(userName, verificationCode);

    const info = await transporter.sendMail({
      from: `"AgroColetivo" <${testAccount.user}>`,
      to: userEmail,
      subject: "✉️ Confirme seu email - AgroColetivo",
      html: htmlEmail,
    });

    const previewUrl = nodemailer.default.getTestMessageUrl(info);

    return {
      success: true,
      service: "ethereal",
      messageId: info.messageId,
      previewUrl: previewUrl,
      message: "Email de teste enviado",
    };
  } catch (error) {
    console.error("Erro ao enviar via Ethereal:", error.message);
    throw error;
  }
}

export function getVerificationEmailTemplate(userName, verificationCode) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; }
    .header { text-align: center; color: #2c5f2d; margin-bottom: 30px; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; }
    .header h1 { font-size: 32px; margin: 10px 0; }
    .content { color: #333; line-height: 1.6; }
    .content p { margin: 15px 0; }
    .code-box { background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 30px; border-radius: 8px; text-align: center; margin: 30px 0; border-left: 4px solid #2c5f2d; }
    .code { font-size: 44px; font-weight: bold; letter-spacing: 8px; color: #2c5f2d; font-family: 'Courier New', monospace; }
    .code-label { color: #666; font-size: 12px; margin-top: 10px; }
    .warning { background: #fff3e0; padding: 15px; border-radius: 5px; border-left: 4px solid #ff9800; margin: 20px 0; color: #333; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
    .footer p { margin: 5px 0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🌾 AgroColetivo</h1>
      <p>Bem-vindo ao nosso sistema!</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${userName}</strong>,</p>
      
      <p>Obrigado por se cadastrar no <strong>AgroColetivo</strong>! 🙌</p>
      
      <p>Para completar seu registro e confirmar seu endereço de email, use o código abaixo:</p>
      
      <div class="code-box">
        <div class="code">${verificationCode}</div>
        <p class="code-label">Este código expira em 24 horas</p>
      </div>
      
      <p>Cole este código na página de confirmação do AgroColetivo para completar seu cadastro.</p>
      
      <div class="warning">
        <strong>⚠️ Segurança:</strong> Nunca compartilhe este código com ninguém. O AgroColetivo nunca pedirá este código por mensagem de texto, telefone ou email adicional.
      </div>
      
      <p>Se você não se cadastrou no AgroColetivo, ignore este email.</p>
    </div>
    
    <div class="footer">
      <p>© 2026 AgroColetivo. Todos os direitos reservados.</p>
      <p><strong>Oxentech Software</strong> | Soluções Agrícolas Inteligentes</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL: NOVO PEDIDO RECEBIDO (para o gestor)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendNewOrderEmailToManager(managerEmail, managerName, orderData) {
  try {
    const useGmail = process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD;
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ""),
      },
    });

    const htmlEmail = getNewOrderEmailTemplate(managerName, orderData);

    const result = await transporter.sendMail({
      from: `AgroColetivo <${process.env.GMAIL_USER}>`,
      to: managerEmail,
      subject: `📦 Novo Pedido Recebido: ${orderData.productName}`,
      html: htmlEmail,
    });

    console.log(`✅ Email de novo pedido enviado para ${managerEmail}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Erro ao enviar email de novo pedido:", error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL: NOVA PROPOSTA DISPONÍVEL (para o fornecedor)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendNewProposalEmailToVendor(vendorEmail, vendorName, proposalData) {
  try {
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ""),
      },
    });

    const htmlEmail = getNewProposalEmailTemplate(vendorName, proposalData);

    const result = await transporter.sendMail({
      from: `AgroColetivo <${process.env.GMAIL_USER}>`,
      to: vendorEmail,
      subject: `🎯 Oportunidade de Venda: ${proposalData.productName}`,
      html: htmlEmail,
    });

    console.log(`✅ Email de nova proposta enviado para ${vendorEmail}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Erro ao enviar email de nova proposta:", error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// EMAIL: PROPOSTA RECEBIDA (para o gestor)
// ─────────────────────────────────────────────────────────────────────────────

export async function sendProposalReceivedEmailToManager(managerEmail, managerName, proposalData) {
  try {
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.default.createTransport({
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ""),
      },
    });

    const htmlEmail = getProposalReceivedEmailTemplate(managerName, proposalData);

    const result = await transporter.sendMail({
      from: `AgroColetivo <${process.env.GMAIL_USER}>`,
      to: managerEmail,
      subject: `✅ Proposta Recebida: ${proposalData.vendorName} - ${proposalData.productName}`,
      html: htmlEmail,
    });

    console.log(`✅ Email de proposta recebida enviado para ${managerEmail}`);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error("Erro ao enviar email de proposta recebida:", error.message);
    return { success: false, error: error.message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// TEMPLATES DE EMAIL
// ─────────────────────────────────────────────────────────────────────────────

function getNewOrderEmailTemplate(managerName, orderData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; }
    .header { text-align: center; color: #2c5f2d; margin-bottom: 30px; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; }
    .header h1 { font-size: 28px; margin: 10px 0; }
    .content { color: #333; line-height: 1.6; }
    .info-box { background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #2c5f2d; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #2c5f2d; }
    .value { color: #666; }
    .action-btn { background: #2c5f2d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📦 Novo Pedido Recebido!</h1>
      <p>Uma demanda foi registrada no AgroColetivo</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${managerName}</strong>,</p>
      
      <p>Você recebeu um novo pedido na cotação <strong>${orderData.productName}</strong>! 🎉</p>
      
      <div class="info-box">
        <div class="info-row">
          <span class="label">Produto:</span>
          <span class="value">${orderData.productName}</span>
        </div>
        <div class="info-row">
          <span class="label">Quantidade:</span>
          <span class="value">${orderData.quantity} ${orderData.unit}</span>
        </div>
        <div class="info-row">
          <span class="label">Produtor:</span>
          <span class="value">${orderData.producerName}</span>
        </div>
        <div class="info-row">
          <span class="label">Contato:</span>
          <span class="value">${orderData.producerPhone}</span>
        </div>
        <div class="info-row">
          <span class="label">Data:</span>
          <span class="value">${orderData.date}</span>
        </div>
      </div>
      
      <p>Acesse o AgroColetivo para revisar e aprovar este pedido:</p>
      
      <a href="${orderData.campaignLink}" class="action-btn">Ver Pedido</a>
      
      <p style="margin-top: 20px; color: #666; font-size: 13px;">Este é um email automático do AgroColetivo. Por favor, não responda este email.</p>
    </div>
    
    <div class="footer">
      <p>© 2026 AgroColetivo. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getNewProposalEmailTemplate(vendorName, proposalData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; }
    .header { text-align: center; color: #2c5f2d; margin-bottom: 30px; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; }
    .header h1 { font-size: 28px; margin: 10px 0; }
    .content { color: #333; line-height: 1.6; }
    .opportunity-box { background: linear-gradient(135deg, #e8f5e9 0%, #f1f8e9 100%); padding: 20px; border-radius: 8px; border-left: 4px solid #2c5f2d; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; }
    .label { font-weight: 600; color: #2c5f2d; }
    .value { color: #333; }
    .action-btn { background: #2c5f2d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>🎯 Oportunidade de Venda!</h1>
      <p>Você foi selecionado para fornecer um produto</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${vendorName}</strong>,</p>
      
      <p>Excelente notícia! Você foi selecionado para enviar uma proposta de fornecimento! 📊</p>
      
      <div class="opportunity-box">
        <div class="info-row">
          <span class="label">Produto:</span>
          <span class="value">${proposalData.productName}</span>
        </div>
        <div class="info-row">
          <span class="label">Quantidade Demandada:</span>
          <span class="value">${proposalData.quantity} ${proposalData.unit}</span>
        </div>
        <div class="info-row">
          <span class="label">Prazo:</span>
          <span class="value">${proposalData.deadline || 'A combinar'}</span>
        </div>
        <div class="info-row">
          <span class="label">Edital:</span>
          <span class="value">${proposalData.campaignName}</span>
        </div>
      </div>
      
      <p><strong>Próximos passos:</strong></p>
      <ol style="margin: 15px 0; padding-left: 20px;">
        <li>Acesse o AgroColetivo (nas abas de "Cotações Abertas")</li>
        <li>Revise os detalhes da demanda</li>
        <li>Cadastre sua proposta com preço, quantidade e prazo de entrega</li>
        <li>Aguarde a confirmação do gestor!</li>
      </ol>
      
      <p style="background: #fff3e0; padding: 15px; border-radius: 6px; border-left: 4px solid #ff9800; margin: 20px 0;">
        <strong>⏰ Importante:</strong> Quanto mais rápido você enviar sua proposta, maiores são as chances de ser selecionado!
      </p>
      
      <a href="${proposalData.campaignLink}" class="action-btn">Enviar Proposta</a>
      
      <p style="margin-top: 20px; color: #666; font-size: 13px;">Este é um email automático do AgroColetivo. Por favor, não responda este email.</p>
    </div>
    
    <div class="footer">
      <p>© 2026 AgroColetivo. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

function getProposalReceivedEmailTemplate(managerName, proposalData) {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    * { margin: 0; padding: 0; }
    body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; background: white; border-radius: 8px; }
    .header { text-align: center; color: #2c5f2d; margin-bottom: 30px; border-bottom: 2px solid #e8f5e9; padding-bottom: 20px; }
    .header h1 { font-size: 28px; margin: 10px 0; }
    .content { color: #333; line-height: 1.6; }
    .proposal-box { background: #f9f9f9; padding: 20px; border-radius: 8px; border-left: 4px solid #2c5f2d; margin: 20px 0; }
    .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #e0e0e0; }
    .info-row:last-child { border-bottom: none; }
    .label { font-weight: 600; color: #2c5f2d; }
    .value { color: #333; }
    .price { color: #2c5f2d; font-weight: 700; font-size: 16px; }
    .action-btn { background: #2c5f2d; color: white; padding: 12px 24px; border-radius: 6px; text-decoration: none; display: inline-block; margin-top: 20px; font-weight: 600; }
    .footer { text-align: center; color: #999; font-size: 11px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #e0e0e0; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✅ Proposta Recebida!</h1>
      <p>Um fornecedor enviou sua proposta</p>
    </div>
    
    <div class="content">
      <p>Olá <strong>${managerName}</strong>,</p>
      
      <p>Você recebeu uma nova proposta de fornecimento! ✨</p>
      
      <div class="proposal-box">
        <div class="info-row">
          <span class="label">Fornecedor:</span>
          <span class="value">${proposalData.vendorName}</span>
        </div>
        <div class="info-row">
          <span class="label">Produto:</span>
          <span class="value">${proposalData.productName}</span>
        </div>
        <div class="info-row">
          <span class="label">Quantidade Oferecida:</span>
          <span class="value">${proposalData.quantity} ${proposalData.unit}</span>
        </div>
        <div class="info-row">
          <span class="label">Preço Unitário:</span>
          <span class="value price">R\$ ${parseFloat(proposalData.pricePerUnit).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="info-row">
          <span class="label">Total:</span>
          <span class="value price">R\$ ${(parseFloat(proposalData.pricePerUnit) * parseFloat(proposalData.quantity)).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</span>
        </div>
        <div class="info-row">
          <span class="label">Prazo de Entrega:</span>
          <span class="value">${proposalData.deliveryDate || 'A confirmar'}</span>
        </div>
      </div>
      
      <p>Acesse o AgroColetivo para revisar, aceitar ou rejeitar esta proposta:</p>
      
      <a href="${proposalData.campaignLink}" class="action-btn">Revisar Proposta</a>
      
      <p style="margin-top: 20px; color: #666; font-size: 13px;">Este é um email automático do AgroColetivo. Por favor, não responda este email.</p>
    </div>
    
    <div class="footer">
      <p>© 2026 AgroColetivo. Todos os direitos reservados.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}


export default {
  sendVerificationEmail,
  getVerificationEmailTemplate,
  sendNewOrderEmailToManager,
  sendNewProposalEmailToVendor,
  sendProposalReceivedEmailToManager,
};
