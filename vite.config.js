import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";
import fs from "fs";

function withExpressHelpers(res) {
  if (typeof res.status !== "function") {
    res.status = (code) => {
      res.statusCode = code;
      return res;
    };
  }

  if (typeof res.json !== "function") {
    res.json = (payload) => {
      if (!res.headersSent) {
        res.setHeader("Content-Type", "application/json; charset=utf-8");
      }
      res.end(JSON.stringify(payload));
      return res;
    };
  }

  return res;
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let raw = "";

    req.on("data", (chunk) => {
      raw += chunk;
    });

    req.on("end", () => {
      if (!raw) {
        resolve({});
        return;
      }

      try {
        resolve(JSON.parse(raw));
      } catch {
        reject(new Error("INVALID_JSON"));
      }
    });

    req.on("error", (err) => reject(err));
  });
}

function localApiPlugin() {
  const handlers = new Map();

  return {
    name: "local-api-plugin",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = String(req.url || "").split("?")[0];
        
        if (!url.startsWith("/api/")) {
          next();
          return;
        }

        const endpoint = url.replace("/api/", "");
        const handlerPath = path.resolve(__dirname, `api/${endpoint}.js`);

        if (!fs.existsSync(handlerPath)) {
          console.warn(`[local-api] Endpoint not found: ${url} (tried ${handlerPath})`);
          next();
          return;
        }

        const response = withExpressHelpers(res);

        try {
          if (req.method === "POST" || req.method === "PUT") {
            req.body = await readJsonBody(req);
          }

          // Use timestamp to avoid cache issues in dev if file changes
          // On Windows, absolute paths must be converted to file:// URLs for import()
          const fileUrl = path.sep === "\\" 
            ? `file://${handlerPath.replace(/\\/g, "/")}` 
            : handlerPath;
            
          const handler = await import(`${fileUrl}?t=${Date.now()}`).then(m => m.default);
          
          if (typeof handler !== "function") {
            throw new Error(`Handler for ${url} is not a function`);
          }

          await handler(req, response);
        } catch (error) {
          console.error(`[local-api] Error in ${url}:`, error);
          const status = error?.message === "INVALID_JSON" ? 400 : 500;
          response.status(status).json({
            error: "Erro na API Local",
            message: `Falha ao processar ${url} no dev server: ${error.message}`,
          });
        }
      });
    },
  };
}

export default defineConfig({
  plugins: [react(), localApiPlugin()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: "dist",
    sourcemap: false,
    minify: "terser",
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
