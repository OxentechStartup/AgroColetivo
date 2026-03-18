import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase.js";

export function HealthCheckPage() {
  const [status, setStatus] = useState({
    database: "testing",
    environment: "testing",
    auth: "testing",
    tables: "testing",
  });

  useEffect(() => {
    runHealthCheck();
  }, []);

  const runHealthCheck = async () => {
    const newStatus = { ...status };

    // 1. Verificar variáveis de ambiente
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      newStatus.environment = url && key ? "ok" : "error";
    } catch {
      newStatus.environment = "error";
    }

    // 2. Testar conexão com banco
    try {
      const { error } = await supabase.from("users").select("count").limit(1);
      newStatus.database = error ? "error" : "ok";
    } catch {
      newStatus.database = "error";
    }

    // 3. Testar autenticação
    try {
      const { data } = await supabase.auth.getSession();
      newStatus.auth = data?.session ? "authenticated" : "unauthenticated";
    } catch {
      newStatus.auth = "error";
    }

    // 4. Verificar tabelas críticas
    try {
      const tables = [
        "users",
        "vendors",
        "campaigns",
        "products",
        "offers",
        "events",
      ];
      let tableErrors = 0;

      for (const table of tables) {
        const { error } = await supabase.from(table).select("count").limit(1);
        if (error && !error.message.includes("does not exist")) {
          tableErrors++;
        }
      }

      newStatus.tables = tableErrors === 0 ? "ok" : "error";
    } catch {
      newStatus.tables = "error";
    }

    setStatus(newStatus);
  };

  const getStatusColor = (status) => {
    if (status === "ok") return "#16A34A";
    if (status === "testing") return "#F59E0B";
    if (status === "unauthenticated") return "#0EA5E9";
    return "#EF4444";
  };

  const getStatusText = (status) => {
    if (status === "ok") return "✅ OK";
    if (status === "testing") return "⏳ Testando...";
    if (status === "unauthenticated") return "🔐 Não autenticado";
    return "❌ Erro";
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>🏥 Health Check - AgroColetivo</h1>

      <div style={styles.grid}>
        {Object.entries(status).map(([key, value]) => (
          <div
            key={key}
            style={{
              ...styles.card,
              borderLeft: `4px solid ${getStatusColor(value)}`,
            }}
          >
            <h2 style={styles.cardTitle}>{key.toUpperCase()}</h2>
            <p style={styles.status}>{getStatusText(value)}</p>
          </div>
        ))}
      </div>

      <button
        onClick={runHealthCheck}
        style={styles.button}
        onMouseEnter={(e) => (e.target.style.opacity = "0.9")}
        onMouseLeave={(e) => (e.target.style.opacity = "1")}
      >
        🔄 Verificar Novamente
      </button>

      <div style={styles.info}>
        <h3>📋 Informações</h3>
        <p>
          <strong>Ambiente:</strong> {import.meta.env.MODE}
        </p>
        <p>
          <strong>URL:</strong> {import.meta.env.VITE_APP_URL}
        </p>
        <p>
          <strong>Supabase:</strong>{" "}
          {import.meta.env.VITE_SUPABASE_URL?.substring(0, 30)}...
        </p>
      </div>
    </div>
  );
}

const styles = {
  container: {
    maxWidth: "800px",
    margin: "0 auto",
    padding: "2rem",
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  title: {
    fontSize: "2rem",
    marginBottom: "2rem",
    color: "#1F2937",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
    gap: "1rem",
    marginBottom: "2rem",
  },
  card: {
    padding: "1.5rem",
    backgroundColor: "#F9FAFB",
    borderRadius: "8px",
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.1)",
  },
  cardTitle: {
    fontSize: "0.875rem",
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: "0.5rem",
  },
  status: {
    fontSize: "1rem",
    margin: "0",
    color: "#1F2937",
  },
  button: {
    padding: "0.75rem 1.5rem",
    backgroundColor: "#3B82F6",
    color: "white",
    border: "none",
    borderRadius: "6px",
    fontSize: "1rem",
    cursor: "pointer",
    transition: "opacity 0.2s",
  },
  info: {
    marginTop: "2rem",
    padding: "1rem",
    backgroundColor: "#EFF6FF",
    borderRadius: "8px",
    color: "#1E40AF",
  },
};
