import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Phone,
  LogOut,
  Clock,
  AlertCircle,
  Package,
} from "lucide-react";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { supabase } from "../lib/supabase";

async function fetchProducerOrders(phone) {
  const cleanPhone = unmaskPhone(phone);

  // Passo 1: Buscar o buyer pelo telefone
  const { data: buyers } = await supabase
    .from("buyers")
    .select("id")
    .eq("phone", cleanPhone)
    .single();

  if (!buyers) return [];

  // Passo 2: Buscar os pedidos do buyer
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      id, qty, status, submitted_at, reviewed_at,
      campaign:campaigns(
        id, product, unit, status, price_per_unit, 
        freight_total, markup_total
      )
    `,
    )
    .eq("buyer_id", buyers.id)
    .order("submitted_at", { ascending: false });

  const grouped = {};
  (orders ?? []).forEach((order) => {
    const campaignId = order.campaign?.id;
    if (!grouped[campaignId]) {
      grouped[campaignId] = { ...order.campaign, orders: [] };
    }
    grouped[campaignId].orders.push(order);
  });

  return Object.values(grouped);
}

function OrderStatusBadge({ status }) {
  const variants = {
    pending: { bg: "#FEF3C7", color: "#92400E", label: "Aguardando" },
    approved: { bg: "#DCFCE7", color: "#166534", label: "Aprovado" },
    rejected: { bg: "#FEE2E2", color: "#991B1B", label: "Recusado" },
  };
  const v = variants[status] || variants.pending;
  return (
    <span
      style={{
        display: "inline-block",
        background: v.bg,
        color: v.color,
        fontSize: ".7rem",
        fontWeight: 700,
        padding: "2px 8px",
        borderRadius: "12px",
      }}
    >
      {v.label}
    </span>
  );
}

function LoginForm({ onLogin, loading }) {
  const [phone, setPhone] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    if (unmaskPhone(phone).length >= 10) {
      onLogin(unmaskPhone(phone));
    }
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "linear-gradient(135deg, #16A34A 0%, #15803d 100%)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "white",
          borderRadius: "12px",
          padding: "40px 28px",
          maxWidth: 400,
          width: "100%",
          boxShadow: "0 20px 40px rgba(0,0,0,0.1)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <ShoppingCart
            size={48}
            style={{ margin: "0 auto 16px", color: "#16A34A" }}
          />
          <h1
            style={{ fontSize: "1.4rem", fontWeight: 700, margin: "0 0 8px 0" }}
          >
            Meus Pedidos
          </h1>
          <p style={{ color: "var(--text3)", margin: 0 }}>
            Acompanhe suas cotações
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "20px" }}>
            <label
              style={{
                display: "block",
                fontSize: ".9rem",
                fontWeight: 600,
                marginBottom: "8px",
              }}
            >
              <Phone
                size={14}
                style={{ marginRight: "6px", verticalAlign: "middle" }}
              />
              Seu telefone/WhatsApp
            </label>
            <input
              type="tel"
              value={maskPhone(phone)}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(00) 0000-0000"
              disabled={loading}
              style={{
                width: "100%",
                padding: "12px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: "1rem",
                boxSizing: "border-box",
              }}
              autoFocus
            />
          </div>

          <button
            type="submit"
            disabled={unmaskPhone(phone).length < 10 || loading}
            style={{
              width: "100%",
              padding: "12px",
              background:
                unmaskPhone(phone).length < 10 || loading
                  ? "var(--surface3)"
                  : "#16A34A",
              color:
                unmaskPhone(phone).length < 10 || loading
                  ? "var(--text3)"
                  : "white",
              border: "none",
              borderRadius: "6px",
              cursor:
                unmaskPhone(phone).length < 10 || loading
                  ? "not-allowed"
                  : "pointer",
              fontSize: ".95rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            {loading ? "Carregando..." : "Acessar pedidos"}
          </button>
        </form>

        <p
          style={{
            fontSize: ".8rem",
            color: "var(--text3)",
            textAlign: "center",
            margin: "20px 0 0 0",
          }}
        >
          Use o mesmo telefone usado no cadastro
        </p>
      </div>
    </div>
  );
}

function OrdersList({ orders, phone, onLogout }) {
  if (!orders || orders.length === 0) {
    return (
      <div style={{ padding: "40px 20px", textAlign: "center" }}>
        <Package size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
        <p style={{ color: "var(--text2)", fontSize: ".95rem" }}>
          Nenhum pedido encontrado
        </p>
      </div>
    );
  }

  return (
    <div style={{ padding: "20px", maxWidth: 640, margin: "0 auto" }}>
      <div style={{ display: "grid", gap: "14px" }}>
        {orders.map((campaign) =>
          campaign.orders.map((order) => {
            const price = campaign.price_per_unit || 0;
            const total = price * order.qty;

            return (
              <div
                key={order.id}
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  overflow: "hidden",
                }}
              >
                <div
                  style={{
                    background: "var(--surface2)",
                    padding: "12px 14px",
                    borderBottom: "1px solid var(--border)",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                  }}
                >
                  <h3
                    style={{ fontSize: ".95rem", fontWeight: 700, margin: 0 }}
                  >
                    {campaign.product}
                  </h3>
                  <OrderStatusBadge status={order.status} />
                </div>

                <div style={{ padding: "14px" }}>
                  <div
                    style={{
                      display: "grid",
                      gap: "10px",
                      marginBottom: "14px",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        fontSize: ".9rem",
                      }}
                    >
                      <span style={{ color: "var(--text2)" }}>Quantidade</span>
                      <span style={{ fontWeight: 600 }}>
                        {order.qty} {campaign.unit}
                      </span>
                    </div>

                    {price > 0 && (
                      <>
                        <div
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            fontSize: ".85rem",
                            color: "var(--text3)",
                          }}
                        >
                          <span>Preço unit.</span>
                          <span>R$ {price.toFixed(2)}</span>
                        </div>
                      </>
                    )}

                    <div
                      style={{
                        padding: "8px 10px",
                        background:
                          campaign.status === "closed"
                            ? "#FEE2E215"
                            : "#16A34A15",
                        borderRadius: "6px",
                        display: "flex",
                        alignItems: "center",
                        gap: "8px",
                        fontSize: ".8rem",
                        color:
                          campaign.status === "closed" ? "#DC2626" : "#16A34A",
                      }}
                    >
                      {campaign.status === "closed" ? (
                        <>
                          <AlertCircle size={13} />
                          Cotação encerrada
                        </>
                      ) : (
                        <>
                          <Clock size={13} />
                          {campaign.status === "negotiating"
                            ? "Em negociação"
                            : "Aberta"}
                        </>
                      )}
                    </div>
                  </div>

                  {price > 0 && (
                    <div
                      style={{
                        padding: "10px 0",
                        borderTop: "1px solid var(--border)",
                        paddingTop: "10px",
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                      }}
                    >
                      <span style={{ fontWeight: 600 }}>Total estimado</span>
                      <span
                        style={{
                          fontSize: "1.1rem",
                          fontWeight: 700,
                          color: "var(--primary)",
                        }}
                      >
                        R$ {total.toFixed(2)}
                      </span>
                    </div>
                  )}

                  <div
                    style={{
                      fontSize: ".75rem",
                      color: "var(--text3)",
                      marginTop: "10px",
                      paddingTop: "10px",
                      borderTop: "1px solid var(--border)",
                    }}
                  >
                    {order.reviewed_at
                      ? `Analisado em ${new Date(order.reviewed_at).toLocaleDateString("pt-BR")}`
                      : `Enviado em ${new Date(order.submitted_at).toLocaleDateString("pt-BR")}`}
                  </div>
                </div>
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}

export function ProducerOrdersPage() {
  const [phone, setPhone] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("agro_producer_phone");
    if (saved) {
      setPhone(saved);
      loadOrders(saved);
    }
  }, []);

  const loadOrders = async (phoneNum) => {
    setLoading(true);
    try {
      const data = await fetchProducerOrders(phoneNum);
      setOrders(data);
    } catch (err) {
      console.error(err);
      alert("Erro ao carregar pedidos");
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (phoneNum) => {
    setLoading(true);
    try {
      setPhone(phoneNum);
      localStorage.setItem("agro_producer_phone", phoneNum);
      await loadOrders(phoneNum);
    } catch (err) {
      console.error(err);
      alert("Erro ao acessar pedidos");
      setPhone(null);
      localStorage.removeItem("agro_producer_phone");
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setPhone(null);
    setOrders([]);
    localStorage.removeItem("agro_producer_phone");
  };

  if (!phone) {
    return <LoginForm onLogin={handleLogin} loading={loading} />;
  }

  return (
    <div style={{ minHeight: "100dvh", background: "var(--bg)" }}>
      <div
        style={{
          background: "linear-gradient(135deg, #16A34A 0%, #15803d 100%)",
          color: "white",
          padding: "16px 20px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div>
          <h1
            style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 2px 0" }}
          >
            Meus Pedidos
          </h1>
          <p style={{ fontSize: ".8rem", margin: 0, opacity: 0.9 }}>
            {maskPhone(phone)}
          </p>
        </div>
        <button
          onClick={handleLogout}
          style={{
            background: "rgba(255,255,255,0.2)",
            border: "none",
            borderRadius: "6px",
            color: "white",
            padding: "8px 12px",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: ".85rem",
            fontWeight: 600,
          }}
        >
          <LogOut size={13} /> Sair
        </button>
      </div>

      {loading ? (
        <div
          style={{
            minHeight: "100dvh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Package size={32} color="var(--primary)" />
        </div>
      ) : (
        <OrdersList orders={orders} phone={phone} onLogout={handleLogout} />
      )}
    </div>
  );
}
