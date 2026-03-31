import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Phone,
  LogOut,
  Clock,
  AlertCircle,
  Package,
  CheckCircle,
  Trash2,
  ChevronDown,
} from "lucide-react";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { supabase } from "../lib/supabase";
import { ConfirmationModal } from "../components/ConfirmationModal";

async function fetchBuyerOrdersWithOffers(phone) {
  const cleanPhone = unmaskPhone(phone);

  // Passo 1: Buscar o buyer pelo telefone
  const { data: buyer, error: buyerError } = await supabase
    .from("buyers")
    .select("id, name, phone")
    .eq("phone", cleanPhone)
    .maybeSingle();

  if (buyerError) {
    console.error("Erro ao buscar buyer:", buyerError);
    throw buyerError;
  }

  if (!buyer) {
    return null;
  }

  // Passo 2: Buscar os pedidos do buyer com detalhes da campanha
  const { data: orders, error: ordersError } = await supabase
    .from("orders")
    .select(
      `
      id, qty, status, submitted_at,
      campaign:campaigns(
        id, product, unit, status, deadline,
        price_per_unit, freight_total, markup_total
      )
    `,
    )
    .eq("buyer_id", buyer.id)
    .neq("status", "rejected")
    .order("submitted_at", { ascending: false });

  if (ordersError) {
    console.error("Erro ao buscar pedidos:", ordersError);
    throw ordersError;
  }

  // Passo 3: Para cada order, buscar as ofertas da campanha
  const ordersWithOffers = await Promise.all(
    (orders ?? []).map(async (order) => {
      const { data: offers } = await supabase
        .from("vendor_campaign_offers")
        .select("*")
        .eq("campaign_id", order.campaign.id)
        .order("price_per_unit", { ascending: true });

      // Buscar dados dos vendors correspondentes
      let offersWithVendors = offers ?? [];
      if (offersWithVendors.length > 0) {
        const vendorIds = [
          ...new Set(offersWithVendors.map((o) => o.vendor_id)),
        ];
        const { data: vendors } = await supabase
          .from("vendors")
          .select("id, name, city")
          .in("id", vendorIds);

        const vendorMap = {};
        (vendors ?? []).forEach((v) => {
          vendorMap[v.id] = v;
        });

        offersWithVendors = offersWithVendors.map((o) => ({
          ...o,
          vendors: vendorMap[o.vendor_id] || null,
        }));
      }

      const approvedOffer = (offersWithVendors ?? []).find(
        (o) => o.status === "approved",
      );
      const totalPrice = approvedOffer
        ? approvedOffer.price_per_unit * order.qty
        : null;

      return {
        ...order,
        offers: offersWithVendors ?? [],
        approvedOffer,
        totalPrice,
      };
    }),
  );

  return {
    buyer,
    orders: ordersWithOffers,
  };
}

function OrderCard({ order, onCancel, canceling, onSetCancelConfirm }) {
  const [expanded, setExpanded] = useState(false);
  const hasApprovedOffer = order.approvedOffer !== null;

  return (
    <div
      style={{
        background: "white",
        border: "1px solid #E5E7EB",
        borderRadius: "10px",
        marginBottom: "16px",
        overflow: "hidden",
      }}
    >
      {/* Header - clickable */}
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "16px",
          background: hasApprovedOffer ? "#F0FFF4" : "#FFFBEB",
          border: "none",
          cursor: "pointer",
          borderBottom: expanded ? "1px solid #E5E7EB" : "none",
          transition: "all 0.2s",
        }}
      >
        <div style={{ flex: 1, textAlign: "left" }}>
          <h3
            style={{
              fontSize: ".95rem",
              fontWeight: 700,
              margin: "0 0 4px 0",
              color: "#1F2937",
            }}
          >
            {order.campaign.product}
          </h3>
          <p
            style={{
              fontSize: ".8rem",
              color: "#6B7280",
              margin: "0",
            }}
          >
            {order.qty} {order.campaign.unit}
            {hasApprovedOffer && (
              <span
                style={{
                  marginLeft: "12px",
                  color: "#16A34A",
                  fontWeight: 600,
                }}
              >
                ✓ Oferta confirmada
              </span>
            )}
          </p>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
          }}
        >
          {hasApprovedOffer && (
            <div
              style={{
                textAlign: "right",
              }}
            >
              <p
                style={{
                  fontSize: ".75rem",
                  color: "#6B7280",
                  margin: "0 0 2px 0",
                }}
              >
                Você pagará
              </p>
              <p
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  color: "#16A34A",
                  margin: 0,
                }}
              >
                R$ {order.totalPrice?.toFixed(2)}
              </p>
            </div>
          )}
          <ChevronDown
            size={20}
            style={{
              transition: "transform 0.2s",
              transform: expanded ? "rotate(180deg)" : "rotate(0deg)",
            }}
          />
        </div>
      </button>

      {/* Expandable content */}
      {expanded && (
        <div
          style={{
            padding: "16px",
            borderTop: "1px solid #E5E7EB",
            background: "#FAFAFA",
          }}
        >
          {/* Status */}
          <div style={{ marginBottom: "16px" }}>
            <p
              style={{
                fontSize: ".75rem",
                fontWeight: 600,
                color: "#6B7280",
                margin: "0 0 8px 0",
                textTransform: "uppercase",
              }}
            >
              Status da Cotação
            </p>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              {order.campaign.status === "closed" ? (
                <CheckCircle size={16} color="#16A34A" />
              ) : (
                <Clock size={16} color="#F59E0B" />
              )}
              <span styles={{ fontSize: ".9rem" }}>
                {order.campaign.status === "closed"
                  ? "Cotação encerrada"
                  : "Esperando propostas"}
              </span>
            </div>
          </div>

          {/* Ofertas */}
          {order.offers.length > 0 ? (
            <div style={{ marginBottom: "16px" }}>
              <p
                style={{
                  fontSize: ".75rem",
                  fontWeight: 600,
                  color: "#6B7280",
                  margin: "0 0 8px 0",
                  textTransform: "uppercase",
                }}
              >
                Propostas Recebidas ({order.offers.length})
              </p>
              {order.offers.map((offer, idx) => (
                <div
                  key={idx}
                  style={{
                    background: "white",
                    border: "1px solid #E5E7EB",
                    borderRadius: "6px",
                    padding: "10px",
                    marginBottom: "8px",
                    borderLeft: `3px solid ${
                      offer.status === "approved" ? "#16A34A" : "#D1D5DB"
                    }`,
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      marginBottom: "4px",
                    }}
                  >
                    <span
                      style={{
                        fontWeight: 600,
                        color: "#1F2937",
                        fontSize: ".9rem",
                      }}
                    >
                      {offer.vendors?.name || "Fornecedor"}
                    </span>
                    {offer.status === "approved" && (
                      <span
                        style={{
                          background: "#DCFCE7",
                          color: "#166534",
                          fontSize: ".7rem",
                          fontWeight: 700,
                          padding: "2px 8px",
                          borderRadius: "4px",
                        }}
                      >
                        Selecionado
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      fontSize: ".85rem",
                      color: "#6B7280",
                    }}
                  >
                    <span>R$ {offer.price_per_unit?.toFixed(2)}/un</span>
                    <span>{offer.city || ""}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div
              style={{
                background: "white",
                border: "1px solid #FEE2E2",
                borderRadius: "6px",
                padding: "12px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} color="#DC2626" />
              <span style={{ fontSize: ".85rem", color: "#991B1B" }}>
                Nenhuma proposta recebida ainda
              </span>
            </div>
          )}

          {/* Botão cancelar */}
          <button
            onClick={() => {
              onSetCancelConfirm({
                open: true,
                orderId: order.id,
                product: order.campaign.product,
              });
            }}
            disabled={canceling === order.id}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              padding: "10px",
              background: "#FEE2E2",
              color: "#991B1B",
              border: "1px solid #FECACA",
              borderRadius: "6px",
              cursor: canceling === order.id ? "not-allowed" : "pointer",
              fontWeight: 600,
              fontSize: ".9rem",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              if (canceling !== order.id) {
                e.target.style.background = "#FECACA";
              }
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "#FEE2E2";
            }}
          >
            <Trash2 size={14} />
            {canceling === order.id ? "Desistindo..." : "Desistir do pedido"}
          </button>
        </div>
      )}
    </div>
  );
}

function LoginForm({ onLogin, loading, errorMessage }) {
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
      }}
    >
      {/* Header com Logo */}
      <div
        style={{
          background: "linear-gradient(135deg, #16A34A 0%, #15803d 100%)",
          color: "white",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                background: "white",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src="https://i.imgur.com/clDJyAh.png"
                alt="AgroColetivo"
                style={{ height: 40, width: "auto", objectFit: "contain" }}
              />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.4rem",
                  fontWeight: 700,
                  margin: "0 0 2px 0",
                  color: "white",
                }}
              >
                AgroColetivo
              </h1>
              <p
                style={{
                  fontSize: ".8rem",
                  margin: 0,
                  opacity: 0.95,
                  color: "white",
                }}
              >
                Meus Pedidos
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Login Form */}
      <div
        style={{
          flex: 1,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "20px",
        }}
      >
        <div
          style={{
            background: "white",
            borderRadius: "12px",
            padding: "32px 24px",
            maxWidth: 400,
            width: "100%",
            boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
          }}
        >
          <h1
            style={{
              fontSize: "1.3rem",
              fontWeight: 700,
              margin: "0 0 8px 0",
              textAlign: "center",
              color: "#1F2937",
            }}
          >
            Status dos Pedidos
          </h1>
          <p
            style={{
              fontSize: ".9rem",
              margin: "0 0 24px 0",
              textAlign: "center",
              color: "#6B7280",
            }}
          >
            Acompanhe suas compras
          </p>

          {/* Mensagem de erro */}
          {errorMessage && (
            <div
              style={{
                background: "#FEE2E2",
                border: "1px solid #FECACA",
                borderRadius: "6px",
                padding: "12px",
                marginBottom: "16px",
                display: "flex",
                alignItems: "center",
                gap: "8px",
              }}
            >
              <AlertCircle size={16} color="#DC2626" />
              <span style={{ fontSize: ".85rem", color: "#991B1B" }}>
                {errorMessage}
              </span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div style={{ marginBottom: "20px" }}>
              <label
                style={{
                  display: "block",
                  fontSize: ".9rem",
                  fontWeight: 600,
                  marginBottom: "8px",
                  color: "#374151",
                }}
              >
                <Phone
                  size={14}
                  style={{ marginRight: "6px", verticalAlign: "middle" }}
                />
                Seu telefone/WhatsApp
              </label>
              <input
                autoFocus
                type="tel"
                value={maskPhone(phone)}
                onChange={(e) => setPhone(maskPhone(e.target.value))}
                placeholder="(00) 0000-0000"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "10px 12px",
                  border: "1px solid #D1D5DB",
                  borderRadius: "6px",
                  fontSize: ".95rem",
                  boxSizing: "border-box",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) => {
                  e.target.style.borderColor = "#16A34A";
                  e.target.style.outline = "none";
                  e.target.style.boxShadow = "0 0 0 3px rgba(22, 163, 74, 0.1)";
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = "#D1D5DB";
                  e.target.style.boxShadow = "none";
                }}
              />
            </div>

            <button
              type="submit"
              disabled={unmaskPhone(phone).length < 10 || loading}
              style={{
                width: "100%",
                padding: "10px",
                background:
                  unmaskPhone(phone).length < 10 || loading
                    ? "#E5E7EB"
                    : "#16A34A",
                color:
                  unmaskPhone(phone).length < 10 || loading
                    ? "#9CA3AF"
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
              onMouseEnter={(e) => {
                if (unmaskPhone(phone).length >= 10 && !loading) {
                  e.target.style.background = "#15803d";
                }
              }}
              onMouseLeave={(e) => {
                if (unmaskPhone(phone).length >= 10 && !loading) {
                  e.target.style.background = "#16A34A";
                }
              }}
            >
              {loading ? "Carregando..." : "Ver pedidos"}
            </button>
          </form>

          <p
            style={{
              fontSize: ".8rem",
              color: "#9CA3AF",
              textAlign: "center",
              margin: "16px 0 0 0",
            }}
          >
            Use o mesmo número usado para fazer o pedido
          </p>
        </div>
      </div>
    </div>
  );
}

export function BuyerOrderStatusPage({ userPhone }) {
  const [phone, setPhone] = useState(null);
  const [buyerData, setBuyerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [canceling, setCanceling] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);
  const [cancelConfirm, setCancelConfirm] = useState({
    open: false,
    orderId: null,
    product: "",
  });
  const [alertModal, setAlertModal] = useState({
    open: false,
    title: "",
    message: "",
  });

  useEffect(() => {
    const saved = localStorage.getItem("agro_buyer_phone");
    if (saved) {
      setPhone(saved);
      // Carregar dados do localStorage
      fetchBuyerOrdersWithOffers(saved)
        .then((data) => {
          if (data) {
            setBuyerData(data);
          }
        })
        .catch((err) => console.error("Erro ao carregar pedidos:", err));
    } else if (userPhone) {
      // Se tem userPhone (dentro do portal), usar automaticamente
      const cleanPhone = unmaskPhone(userPhone);
      setPhone(cleanPhone);
      fetchBuyerOrdersWithOffers(cleanPhone)
        .then((data) => {
          if (data) {
            setBuyerData(data);
          }
        })
        .catch((err) => console.error("Erro ao carregar pedidos:", err));
    }
  }, [userPhone]);

  const handleCloseAlertModal = () => {
    setErrorMessage(null);
    setPhone(null);
  };

  const loadOrders = async (phoneNum, showErrorMessage = true) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      const data = await fetchBuyerOrdersWithOffers(phoneNum);
      if (!data) {
        if (showErrorMessage) {
          setErrorMessage("Nenhum comprador encontrado para este telefone");
          // Desaparecer após 3 segundos
          setTimeout(() => setErrorMessage(null), 3000);
        }
        return;
      }
      // Só salva depois que confirma que o comprador existe
      setPhone(phoneNum);
      localStorage.setItem("agro_buyer_phone", phoneNum);
      setBuyerData(data);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
      if (showErrorMessage) {
        setErrorMessage(err?.message || "Tente novamente mais tarde");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (phoneNum) => {
    setLoading(true);
    setErrorMessage(null);
    try {
      // Não salva no estado/localStorage até confirmar que existe
      await loadOrders(phoneNum, true);
    } catch (err) {
      console.error("Erro no login:", err);
      setErrorMessage(err?.message || "Tente novamente mais tarde");
      setTimeout(() => setErrorMessage(null), 3000);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    setCanceling(orderId);
    try {
      // Buscar dados do order para notificação
      const { data: orderData } = await supabase
        .from("orders")
        .select(
          "id, campaign_id, qty, campaign:campaigns(id, product, unit, pivo_id)",
        )
        .eq("id", orderId)
        .single();

      // Cancelar o pedido
      const { error } = await supabase
        .from("orders")
        .update({ status: "rejected" })
        .eq("id", orderId);

      if (error) throw error;

      // Criar notificação para o gestor
      if (orderData?.campaign?.pivo_id) {
        const pivoId = orderData.campaign.pivo_id;
        const isUuid =
          typeof pivoId === "string" &&
          /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
            pivoId,
          );

        if (isUuid) {
          const unit = orderData.campaign.unit || "un";
          const notificationMsg = `Comprador cancelou pedido de ${orderData.campaign.product} (${orderData.qty} ${unit})`;
          const { error: notificationError } = await supabase
            .from("notifications")
            .insert({
              pivo_id: pivoId,
              type: "order_canceled",
              title: "Pedido Cancelado",
              message: notificationMsg,
              related_order_id: orderId,
              related_campaign_id: orderData.campaign_id,
            });

          if (notificationError) {
            console.error("Erro ao criar notificação de cancelamento:", {
              notificationError,
              payload: {
                pivo_id: pivoId,
                type: "order_canceled",
                related_order_id: orderId,
                related_campaign_id: orderData.campaign_id,
              },
            });
          }
        } else {
          console.warn("Notificação ignorada: pivo_id inválido", pivoId);
        }
      }

      // Recarregar pedidos
      const updatedData = await fetchBuyerOrdersWithOffers(phone);
      if (updatedData) {
        setBuyerData(updatedData);
      }
      setAlertModal({
        open: true,
        title: "Sucesso",
        message: "Pedido cancelado com sucesso",
      });
      setCancelConfirm({ open: false, orderId: null, product: "" });
    } catch (err) {
      console.error("Erro ao cancelar pedido:", err);
      setAlertModal({
        open: true,
        title: "Erro ao cancelar pedido",
        message: err?.message || "Tente novamente",
      });
    } finally {
      setCanceling(null);
    }
  };

  const handleLogout = () => {
    setPhone(null);
    setBuyerData(null);
    localStorage.removeItem("agro_buyer_phone");
  };

  if (!phone) {
    return (
      <LoginForm
        onLogin={handleLogin}
        loading={loading}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        background: "#FAFAFA",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <div
        style={{
          background: "linear-gradient(135deg, #16A34A 0%, #15803d 100%)",
          color: "white",
          padding: "16px 24px",
          borderBottom: "1px solid rgba(0,0,0,0.1)",
          position: "sticky",
          top: 0,
          zIndex: 50,
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            width: "100%",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
            <div
              style={{
                background: "white",
                borderRadius: "50%",
                width: 48,
                height: 48,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <img
                src="https://i.imgur.com/clDJyAh.png"
                alt="AgroColetivo"
                style={{ height: 40, width: "auto", objectFit: "contain" }}
              />
            </div>
            <div>
              <h1
                style={{
                  fontSize: "1.1rem",
                  fontWeight: 700,
                  margin: "0 0 4px 0",
                }}
              >
                {buyerData?.buyer.name}
              </h1>
              <p
                style={{
                  fontSize: ".8rem",
                  color: "rgba(255,255,255,0.8)",
                  margin: 0,
                }}
              >
                {buyerData?.buyer.phone}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 16px",
              background: "rgba(255, 255, 255, 0.2)",
              border: "1px solid rgba(255, 255, 255, 0.3)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: ".9rem",
              color: "white",
              transition: "all 0.2s",
            }}
            onMouseEnter={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.3)";
              e.target.style.borderColor = "rgba(255, 255, 255, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background = "rgba(255, 255, 255, 0.2)";
              e.target.style.borderColor = "rgba(255, 255, 255, 0.3)";
            }}
          >
            <LogOut size={14} />
            Sair
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={{ flex: 1, padding: "20px" }}>
        <div style={{ maxWidth: 600, margin: "0 auto" }}>
          {buyerData?.orders.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                padding: "60px 20px",
              }}
            >
              <Package
                size={48}
                style={{
                  margin: "0 auto 16px",
                  opacity: 0.3,
                }}
              />
              <p style={{ color: "#6B7280", marginBottom: "12px" }}>
                Você não tem pedidos registrados
              </p>
              <button
                onClick={handleLogout}
                style={{
                  padding: "10px 20px",
                  background: "#16A34A",
                  color: "white",
                  border: "none",
                  borderRadius: "6px",
                  cursor: "pointer",
                  fontWeight: 600,
                }}
              >
                Voltar
              </button>
            </div>
          ) : (
            <div>
              {buyerData?.orders.map((order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onCancel={handleCancelOrder}
                  canceling={canceling}
                  onSetCancelConfirm={setCancelConfirm}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal de confirmação */}
      <ConfirmationModal
        open={cancelConfirm.open}
        title="Cancelar Pedido"
        message={`Tem certeza que deseja desistir do pedido de ${cancelConfirm.product}?`}
        confirmText="Cancelar Pedido"
        cancelText="Manter Pedido"
        isDestructive={true}
        loading={canceling === cancelConfirm.orderId}
        onConfirm={() => handleCancelOrder(cancelConfirm.orderId)}
        onCancel={() =>
          setCancelConfirm({ open: false, orderId: null, product: "" })
        }
      />

      {/* Modal de alerta (sucesso/erro) */}
      <ConfirmationModal
        open={alertModal.open}
        title={alertModal.title}
        message={alertModal.message}
        confirmText="OK"
        onConfirm={() => setAlertModal({ open: false, title: "", message: "" })}
        onCancel={() => setAlertModal({ open: false, title: "", message: "" })}
      />
    </div>
  );
}
