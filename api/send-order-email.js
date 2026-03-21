/**
 * Endpoint: POST /api/send-order-email
 * Envia email de novo pedido para o gestor
 *
 * Body:
 * {
 *   managerEmail: string,
 *   managerName: string,
 *   orderData: { productName, quantity, unit, producerName, producerPhone, date, campaignLink }
 * }
 */

import { sendNewOrderEmailToManager } from "../src/lib/email-service.js";

export default async function handler(req, res) {
  try {
    // CORS
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    if (req.method === "OPTIONS") {
      return res.status(200).end();
    }

    if (req.method !== "POST") {
      return res.status(405).json({ error: "Método não permitido" });
    }

    const { managerEmail, managerName, orderData } = req.body || {};

    if (!managerEmail || !managerName || !orderData) {
      return res.status(400).json({
        error: "Campos obrigatórios: managerEmail, managerName, orderData",
      });
    }

    const result = await sendNewOrderEmailToManager(
      managerEmail,
      managerName,
      orderData,
    );

    if (result.success) {
      return res.status(200).json({
        success: true,
        messageId: result.messageId,
        message: "Email de novo pedido enviado com sucesso",
      });
    } else {
      return res.status(500).json({
        success: false,
        error: result.error || "Erro ao enviar email",
      });
    }
  } catch (error) {
    console.error("[send-order-email] erro fatal:", error);
    return res.status(500).json({
      success: false,
      error: error.message || "Erro interno do servidor",
    });
  }
}
