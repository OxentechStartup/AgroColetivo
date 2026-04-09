import { useState, useEffect } from "react";
import {
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
import styles from "./BuyerOrderStatusPage.module.css";

const HUB_LOGO_URL = "https://i.imgur.com/clDJyAh.png";

async function fetchBuyerOrdersWithOffers(phone) {
  const cleanPhone = unmaskPhone(phone);

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

  const ordersWithOffers = await Promise.all(
    (orders ?? []).map(async (order) => {
      const campaignId = order?.campaign?.id;
      if (!campaignId) {
        return {
          ...order,
          offers: [],
          approvedOffer: null,
          totalPrice: null,
        };
      }

      const { data: offers } = await supabase
        .from("vendor_campaign_offers")
        .select("*")
        .eq("campaign_id", campaignId)
        .order("price_per_unit", { ascending: true });

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
        (vendors ?? []).forEach((vendor) => {
          vendorMap[vendor.id] = vendor;
        });

        offersWithVendors = offersWithVendors.map((offer) => ({
          ...offer,
          vendors: vendorMap[offer.vendor_id] || null,
        }));
      }

      const approvedOffer = (offersWithVendors ?? []).find(
        (offer) => offer.status === "approved",
      );
      const totalPrice = approvedOffer
        ? approvedOffer.price_per_unit * order.qty
        : null;

      return {
        ...order,
        offers: offersWithVendors,
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

function formatMoney(value) {
  if (typeof value !== "number" || Number.isNaN(value)) {
    return "0,00";
  }
  return value.toFixed(2).replace(".", ",");
}

function BrandHeader({ title, subtitle, action }) {
  return (
    <header className={styles.header}>
      <div className={styles.headerInner}>
        <div className={styles.brandGroup}>
          <div className={styles.logo}>
            <img src={HUB_LOGO_URL} alt="HubCompras" />
          </div>

          <div className={styles.brandText}>
            <h1 className={styles.brandTitle}>{title}</h1>
            <p className={styles.brandSubtitle}>{subtitle}</p>
          </div>
        </div>

        {action}
      </div>
    </header>
  );
}

function OrderCard({ order, canceling, onSetCancelConfirm }) {
  const [expanded, setExpanded] = useState(false);
  const hasApprovedOffer = order.approvedOffer !== null;
  const product = order?.campaign?.product || "Produto";
  const unit = order?.campaign?.unit || "un";

  const headerClass = hasApprovedOffer
    ? `${styles.orderHeader} ${styles.orderHeaderApproved}`
    : `${styles.orderHeader} ${styles.orderHeaderPending}`;

  const campaignClosed = order?.campaign?.status === "closed";

  return (
    <article className={styles.orderCard}>
      <button
        type="button"
        onClick={() => setExpanded((prev) => !prev)}
        className={headerClass}
      >
        <div className={styles.orderSummary}>
          <h3 className={styles.orderProduct}>{product}</h3>

          <p className={styles.orderMeta}>
            <span>
              {order.qty} {unit}
            </span>

            {hasApprovedOffer && (
              <span className={styles.confirmedChip}>
                <CheckCircle size={12} /> Oferta confirmada
              </span>
            )}
          </p>
        </div>

        <div className={styles.orderHeaderRight}>
          {hasApprovedOffer && (
            <div className={styles.priceWrap}>
              <p className={styles.priceLabel}>Você pagará</p>
              <p className={styles.priceValue}>
                R$ {formatMoney(order.totalPrice)}
              </p>
            </div>
          )}

          <ChevronDown
            size={20}
            className={`${styles.chevron} ${expanded ? styles.chevronExpanded : ""}`}
          />
        </div>
      </button>

      {expanded && (
        <div className={styles.orderBody}>
          <section>
            <p className={styles.blockTitle}>Status da cotação</p>

            <div className={styles.statusRow}>
              {campaignClosed ? (
                <CheckCircle size={16} className={styles.statusApproved} />
              ) : (
                <Clock size={16} className={styles.statusPending} />
              )}
              <span>
                {campaignClosed ? "Cotação encerrada" : "Esperando propostas"}
              </span>
            </div>
          </section>

          {order.offers.length > 0 ? (
            <section>
              <p className={styles.blockTitle}>
                Propostas recebidas ({order.offers.length})
              </p>

              <div className={styles.offers}>
                {order.offers.map((offer, index) => {
                  const approved = offer.status === "approved";

                  return (
                    <div
                      key={`${offer.vendor_id ?? "offer"}-${index}`}
                      className={`${styles.offer} ${approved ? styles.offerApproved : ""}`}
                    >
                      <div className={styles.offerTop}>
                        <span className={styles.offerVendor}>
                          {offer.vendors?.name || "Fornecedor"}
                        </span>

                        {approved && (
                          <span className={styles.selectedChip}>
                            Selecionado
                          </span>
                        )}
                      </div>

                      <div className={styles.offerMeta}>
                        <span>R$ {formatMoney(offer.price_per_unit)}/un</span>
                        <span>{offer.vendors?.city || ""}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </section>
          ) : (
            <div className={styles.emptyOffers}>
              <AlertCircle size={16} />
              <span>Nenhuma proposta recebida ainda</span>
            </div>
          )}

          <button
            type="button"
            onClick={() => {
              onSetCancelConfirm({
                open: true,
                orderId: order.id,
                product,
              });
            }}
            disabled={canceling === order.id}
            className={styles.cancelBtn}
          >
            <Trash2 size={14} />
            {canceling === order.id ? "Desistindo..." : "Desistir do pedido"}
          </button>
        </div>
      )}
    </article>
  );
}

function LoginForm({ onLogin, loading, errorMessage, embedded = false }) {
  const [phone, setPhone] = useState("");

  const cleanPhone = unmaskPhone(phone);
  const canSubmit = cleanPhone.length >= 10 && !loading;

  const handleSubmit = (event) => {
    event.preventDefault();
    if (cleanPhone.length >= 10) {
      onLogin(cleanPhone);
    }
  };

  return (
    <div className={`${styles.page} ${embedded ? styles.pageEmbedded : ""}`}>
      {!embedded && <BrandHeader title="HubCompras" subtitle="Meus Pedidos" />}

      <main
        className={`${styles.loginMain} ${embedded ? styles.loginMainEmbedded : ""}`}
      >
        <section
          className={`${styles.loginCard} ${embedded ? styles.loginCardEmbedded : ""}`}
        >
          <h2 className={styles.loginTitle}>Status dos Pedidos</h2>
          <p className={styles.loginSub}>Acompanhe suas compras</p>

          {errorMessage && (
            <div className={styles.errorBox}>
              <AlertCircle size={16} />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className={`form-group ${styles.inputGroup}`}>
              <label className={`form-label ${styles.label}`}>
                <Phone size={14} />
                Seu telefone/WhatsApp
              </label>

              <input
                autoFocus
                type="tel"
                value={phone}
                onChange={(event) => setPhone(maskPhone(event.target.value))}
                placeholder="(00) 00000-0000"
                disabled={loading}
                className="form-input"
              />
            </div>

            <button
              type="submit"
              disabled={!canSubmit}
              className={styles.submitBtn}
            >
              {loading ? "Carregando..." : "Ver pedidos"}
            </button>
          </form>

          <p className={styles.loginHint}>
            Use o mesmo número usado para fazer o pedido
          </p>
        </section>
      </main>
    </div>
  );
}

export function BuyerOrderStatusPage({ userPhone, embedded = false }) {
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
    let mounted = true;

    const hydrateByPhone = async (phoneToLoad) => {
      setLoading(true);

      try {
        const data = await fetchBuyerOrdersWithOffers(phoneToLoad);
        if (!mounted) return;

        if (data) {
          setBuyerData(data);
          return;
        }

        setPhone(null);
        setBuyerData(null);
        localStorage.removeItem("agro_buyer_phone");
      } catch (err) {
        if (mounted) {
          console.error("Erro ao carregar pedidos:", err);
        }
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    const savedPhone = localStorage.getItem("agro_buyer_phone");

    if (savedPhone) {
      setPhone(savedPhone);
      hydrateByPhone(savedPhone);

      return () => {
        mounted = false;
      };
    }

    if (userPhone) {
      const cleanPhone = unmaskPhone(userPhone);
      setPhone(cleanPhone);
      hydrateByPhone(cleanPhone);
    } else {
      setLoading(false);
    }

    return () => {
      mounted = false;
    };
  }, [userPhone]);

  const loadOrders = async (phoneNum, showError = true) => {
    setLoading(true);
    setErrorMessage(null);

    try {
      const data = await fetchBuyerOrdersWithOffers(phoneNum);
      if (!data) {
        if (showError) {
          setErrorMessage("Nenhum comprador encontrado para este telefone");
          setTimeout(() => setErrorMessage(null), 3000);
        }
        return;
      }

      setPhone(phoneNum);
      localStorage.setItem("agro_buyer_phone", phoneNum);
      setBuyerData(data);
    } catch (err) {
      console.error("Erro ao carregar pedidos:", err);
      if (showError) {
        setErrorMessage(err?.message || "Tente novamente mais tarde");
        setTimeout(() => setErrorMessage(null), 3000);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (phoneNum) => {
    await loadOrders(phoneNum, true);
  };

  const handleCancelOrder = async (orderId) => {
    setCanceling(orderId);

    try {
      const { data: orderData } = await supabase
        .from("orders")
        .select(
          "id, campaign_id, qty, campaign:campaigns(id, product, unit, pivo_id)",
        )
        .eq("id", orderId)
        .single();

      const { error } = await supabase
        .from("orders")
        .update({ status: "rejected" })
        .eq("id", orderId);

      if (error) throw error;

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
        embedded={embedded}
      />
    );
  }

  const orderCount = buyerData?.orders?.length ?? 0;

  return (
    <div className={`${styles.page} ${embedded ? styles.pageEmbedded : ""}`}>
      {embedded ? (
        <section className={styles.embeddedTopCard}>
          <div className={styles.embeddedIdentity}>
            <p className={styles.embeddedLabel}>Meus pedidos</p>
            <h2 className={styles.embeddedName}>
              {buyerData?.buyer?.name || "Comprador"}
            </h2>
            <p className={styles.embeddedPhone}>
              {buyerData?.buyer?.phone || maskPhone(phone || "")}
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className={styles.embeddedLogoutBtn}
          >
            <LogOut size={14} /> Sair
          </button>
        </section>
      ) : (
        <BrandHeader
          title={buyerData?.buyer?.name || "Comprador"}
          subtitle={buyerData?.buyer?.phone || ""}
          action={
            <button
              type="button"
              onClick={handleLogout}
              className={styles.headerAction}
            >
              <LogOut size={14} /> Sair
            </button>
          }
        />
      )}

      <main className={`${styles.main} ${embedded ? styles.mainEmbedded : ""}`}>
        {!buyerData ? (
          <section className={styles.empty}>
            <Package size={42} className={styles.emptyIcon} />
            <p>
              {loading ? "Carregando pedidos..." : "Nenhum dado encontrado"}
            </p>
          </section>
        ) : orderCount === 0 ? (
          <section className={styles.empty}>
            <Package size={46} className={styles.emptyIcon} />
            <p>Você não tem pedidos registrados</p>
            <button
              type="button"
              onClick={handleLogout}
              className={styles.submitBtn}
            >
              Voltar
            </button>
          </section>
        ) : (
          <div className={styles.list}>
            {buyerData.orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                canceling={canceling}
                onSetCancelConfirm={setCancelConfirm}
              />
            ))}
          </div>
        )}
      </main>

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
