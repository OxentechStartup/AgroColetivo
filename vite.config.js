import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  server: {
    // CORS Configuration
    cors: {
      origin: [
        "http://localhost:5173",
        "http://localhost:3000",
        "https://agrocoletivo.vercel.app",
        "https://www.agrocoletivo.com.br",
      ],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      maxAge: 86400, // 24 horas
    },
    // Security headers
    headers: {
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
      "X-XSS-Protection": "1; mode=block",
      "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
      "Referrer-Policy": "strict-origin-when-cross-origin",
      "Content-Security-Policy":
        "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com; font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:; img-src 'self' data: https:; connect-src 'self' https://iepgeibcwthilohdlfse.supabase.co https://*.supabase.co; frame-ancestors 'none'",
    },
  },
  build: {
    // Production security
    sourcemap: false, // Não expõe source maps em produção
    minify: "terser",
  },
});
