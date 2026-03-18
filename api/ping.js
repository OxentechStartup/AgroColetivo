/**
 * Health Check / Keep-Alive Endpoint
 * Responde rapidamente para manter o servidor ativo
 * @route GET /api/ping
 * @returns {json} { ok: true, timestamp: Date }
 */
export default function handler(req, res) {
  res.status(200).json({
    ok: true,
    timestamp: new Date().toISOString(),
    message: "Server is awake",
  });
}
