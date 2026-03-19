import { useState, useEffect } from "react";
import {
  ShoppingCart,
  Plus,
  X,
  Edit2,
  Trash2,
  Send,
  Phone,
  User,
  Target,
  Leaf,
  Droplet,
  Zap,
  Wheat,
  LayoutGrid,
  ChevronRight,
  ChevronDown,
  CheckCircle,
  CalendarDays,
  Clock,
  Search,
  AlertCircle,
  ChevronLeft,
  Package,
  MapPin,
} from "lucide-react";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { daysUntilDeadline } from "../utils/data";
import { supabase } from "../lib/supabase";
import styles from "./ProducerPortalPage.module.css";

// Categorias
const CATEGORIES = [
  { id: "all", name: "Todos", icon: LayoutGrid, color: "#16A34A" },
  { id: "grains", name: "Grãos", icon: Wheat, color: "#DC2626" },
  { id: "seeds", name: "Sementes", icon: Leaf, color: "#7C3AED" },
  { id: "nutrients", name: "Nutrientes", icon: Droplet, color: "#0EA5E9" },
  { id: "tools", name: "Equipamentos", icon: Zap, color: "#F59E0B" },
];

// Categorizar produto automaticamente
function getCategoryId(product) {
  const text = product.toLowerCase();
  if (text.includes("semente") || text.includes("semilla")) return "seeds";
  if (
    text.includes("milho") ||
    text.includes("soja") ||
    text.includes("arroz") ||
    text.includes("trigo") ||
    text.includes("feijão") ||
    text.includes("cereal") ||
    text.includes("grão")
  )
    return "grains";
  if (text.includes("nutrient") || text.includes("ração") || text.includes("adubo"))
    return "nutrients";
  if (
    text.includes("equipament") ||
    text.includes("máquina") ||
    text.includes("bomba")
  )
    return "tools";
  return "all";
}

async function fetchOpenCampaigns() {
  const { data, error } = await supabase
    .from("v_campaign_summary")
    .select("*, gestor_name:users!pivo_id(name, phone)")
    .in("status", ["open", "negotiating"])
    .order("created_at", { ascending: false });
  if (error) throw new Error(error?.message || "Erro ao buscar campanhas");
  return (data ?? []).map((row) => ({
    id: row.id,
    product: row.product,
    unit: row.unit,
    unitWeight: Number(row.unit_weight_kg ?? 25),
    goalQty: Number(row.goal_qty),
    minQty: Number(row.min_qty ?? 1),
    maxQty: row.max_qty || null,
    status: row.status,
    deadline: row.deadline,
    totalOrdered: Number(row.total_ordered ?? 0),
    approval: Number(row.progress_pct ?? 0),
    imageUrl: row.image_url,
    pivoId: row.pivo_id,
    gestorName: row.gestor_name?.[0]?.name || "Gestor",
    gestorPhone: row.gestor_name?.[0]?.phone || "",
    category: getCategoryId(row.product),
  }));
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ══════════════════════════════════════════════════════════════════════════════
// COMPONENTES
// ══════════════════════════════════════════════════════════════════════════════

function Header({ cartCount, onCartClick }) {
  return (
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
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img
            src="https://i.imgur.com/clDJyAh.png"
            alt="AgroColetivo"
            style={{ height: 40, width: "auto", objectFit: "contain" }}
          />
          <div>
            <h1 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 2px 0" }}>
              AgroColetivo
            </h1>
            <p style={{ fontSize: ".75rem", margin: 0, opacity: 0.9 }}>
              Compras coletivas
            </p>
          </div>
        </div>
        <button
          onClick={onCartClick}
          style={{
            position: "relative",
            background: "rgba(255,255,255,0.2)",
            border: "2px solid rgba(255,255,255,0.4)",
            borderRadius: "8px",
            padding: "8px 12px",
            cursor: "pointer",
            color: "white",
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: ".9rem",
            fontWeight: 600,
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => {
            e.target.style.background = "rgba(255,255,255,0.3)";
            e.target.style.borderColor = "rgba(255,255,255,0.6)";
          }}
          onMouseLeave={(e) => {
            e.target.style.background = "rgba(255,255,255,0.2)";
            e.target.style.borderColor = "rgba(255,255,255,0.4)";
          }}
        >
          <ShoppingCart size={16} />
          {cartCount}
          {cartCount > 0 && (
            <span
              style={{
                position: "absolute",
                top: "-6px",
                right: "-6px",
                background: "#DC2626",
                color: "white",
                borderRadius: "50%",
                width: 20,
                height: 20,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: ".7rem",
                fontWeight: 700,
              }}
            >
              {cartCount}
            </span>
          )}
        </button>
      </div>
    </div>
  );
}

function CategoryFilter({ categories, active, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        padding: "12px 0",
        marginBottom: "16px",
        scrollBehavior: "smooth",
        WebkitOverflowScrolling: "touch",
      }}
    >
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = cat.id === active;
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              padding: "8px 14px",
              borderRadius: "20px",
              border: `2px solid ${isActive ? cat.color : "var(--border)"}`,
              background: isActive ? `${cat.color}15` : "var(--surface2)",
              color: isActive ? cat.color : "var(--text2)",
              fontSize: ".85rem",
              fontWeight: isActive ? 600 : 500,
              cursor: "pointer",
              transition: "all 0.2s",
              whiteSpace: "nowrap",
              flexShrink: 0,
            }}
          >
            <Icon size={14} />
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}

function SearchBar({ value, onChange }) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "8px",
        background: "var(--surface2)",
        border: "1px solid var(--border)",
        borderRadius: "8px",
        padding: "10px 14px",
        marginBottom: "20px",
      }}
    >
      <Search size={16} color="var(--text3)" />
      <input
        type="text"
        placeholder="Buscar produto ou gestor..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          flex: 1,
          border: "none",
          background: "none",
          outline: "none",
          fontSize: ".9rem",
          color: "var(--text1)",
        }}
      />
      {value && (
        <button
          onClick={() => onChange("")}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            padding: "4px",
            color: "var(--text3)",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function CampaignCard({ campaign, onAddToCart }) {
  const progress = Math.min(100, Math.round(campaign.approval));
  const daysLeft = campaign.deadline && daysUntilDeadline(campaign.deadline);
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  return (
    <div
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "10px",
        overflow: "hidden",
        transition: "all 0.3s",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "#16A34A";
        e.currentTarget.style.transform = "translateY(-4px)";
        e.currentTarget.style.boxShadow = "0 8px 16px rgba(22,163,74,0.12)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
        e.currentTarget.style.boxShadow = "none";
      }}
    >
      {/* Imagem */}
      <div
        style={{
          width: "100%",
          height: 140,
          background: "linear-gradient(135deg, #16A34A15 0%, #16A34A08 100%)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {campaign.imageUrl ? (
          <img
            src={campaign.imageUrl}
            alt={campaign.product}
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
            }}
          />
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Package size={36} color="var(--primary)" opacity={0.2} />
          </div>
        )}
        {isUrgent && (
          <div
            style={{
              position: "absolute",
              top: "8px",
              right: "8px",
              background: "#DC2626",
              color: "white",
              padding: "4px 10px",
              borderRadius: "6px",
              fontSize: ".7rem",
              fontWeight: 700,
              display: "flex",
              alignItems: "center",
              gap: "4px",
            }}
          >
            <Clock size={11} /> {daysLeft}d
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: "12px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3
          style={{
            fontSize: ".95rem",
            fontWeight: 700,
            margin: "0 0 8px 0",
            lineHeight: 1.2,
            color: "var(--text1)",
          }}
        >
          {campaign.product}
        </h3>

        {/* Progress */}
        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              height: "5px",
              background: "var(--surface2)",
              borderRadius: "3px",
              overflow: "hidden",
              marginBottom: "4px",
            }}
          >
            <div
              style={{
                height: "100%",
                background: "linear-gradient(90deg, #16A34A, #15803d)",
                width: `${progress}%`,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div
            style={{
              fontSize: ".7rem",
              color: "var(--text3)",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <span>{progress}% completo</span>
            <span>{campaign.goalQty} {campaign.unit}</span>
          </div>
        </div>

        {/* Gestor */}
        <div
          style={{
            fontSize: ".75rem",
            color: "var(--text3)",
            marginTop: "auto",
            paddingTop: "10px",
            borderTop: "1px solid var(--border)",
            marginBottom: "10px",
          }}
        >
          <strong>{campaign.gestorName}</strong>
        </div>

        {/* Button */}
        <button
          onClick={() => onAddToCart(campaign)}
          style={{
            width: "100%",
            padding: "8px",
            background: "#16A34A",
            color: "white",
            border: "none",
            borderRadius: "6px",
            fontSize: ".85rem",
            fontWeight: 600,
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "4px",
            transition: "all 0.2s",
          }}
          onMouseEnter={(e) => (e.target.style.background = "#15803d")}
          onMouseLeave={(e) => (e.target.style.background = "#16A34A")}
        >
          <Plus size={14} /> Adicionar
        </button>
      </div>
    </div>
  );
}

function AddToCartModal({ campaign, onClose, onAdd }) {
  const [qty, setQty] = useState(campaign.minQty.toString());
  const qtyNum = +qty;
  const qtyOk = qtyNum >= campaign.minQty && (!campaign.maxQty || qtyNum <= campaign.maxQty);

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "12px 12px 0 0",
          padding: "24px",
          width: "100%",
          maxWidth: 600,
          margin: "0 auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
          <h2 style={{ fontSize: "1.1rem", fontWeight: 700, margin: 0, color: "var(--text1)" }}>
            {campaign.product}
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
              padding: "4px",
            }}
          >
            <X size={20} />
          </button>
        </div>

        <div
          style={{
            background: "var(--surface2)",
            border: "1px solid var(--border)",
            borderRadius: "8px",
            padding: "12px",
            marginBottom: "20px",
            fontSize: ".85rem",
            color: "var(--text2)",
          }}
        >
          <p style={{ margin: 0 }}>
            Meta: {campaign.goalQty} {campaign.unit} | Mín: {campaign.minQty}
            {campaign.maxQty && ` | Máx: ${campaign.maxQty}`}
          </p>
          <p style={{ margin: "6px 0 0 0", color: "var(--text3)" }}>
            Progresso: {campaign.approval.toFixed(0)}%
          </p>
        </div>

        <div style={{ marginBottom: "20px" }}>
          <label style={{ display: "block", fontSize: ".9rem", fontWeight: 600, marginBottom: "8px" }}>
            <Target size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Quantidade ({campaign.unit}) *
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min={campaign.minQty}
            max={campaign.maxQty || undefined}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${!qtyOk && qty ? "var(--red)" : "var(--border)"}`,
              borderRadius: "6px",
              fontSize: "1rem",
              background: "var(--surface2)",
              boxSizing: "border-box",
            }}
          />
        </div>

        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              padding: "10px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: ".9rem",
              fontWeight: 600,
              color: "var(--text2)",
            }}
          >
            Cancelar
          </button>
          <button
            onClick={() => onAdd(qtyNum)}
            disabled={!qtyOk}
            style={{
              flex: 1,
              padding: "10px",
              background: qtyOk ? "#16A34A" : "var(--surface3)",
              color: qtyOk ? "white" : "var(--text3)",
              border: "none",
              borderRadius: "6px",
              cursor: qtyOk ? "pointer" : "not-allowed",
              fontSize: ".9rem",
              fontWeight: 600,
              transition: "all 0.2s",
            }}
          >
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    </div>
  );
}

function CartModal({ cartItems, campaigns, onClose, onUpdateQty, onRemove, onSubmit, submitting }) {
  const [producerName, setProducerName] = useState("");
  const [phone, setPhone] = useState("");

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("agro_producer") ?? "null");
      if (saved) {
        setProducerName(saved.name || "");
        setPhone(maskPhone(saved.phone) || "");
      }
    } catch {}
  }, []);

  if (cartItems.length === 0) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0,0,0,0.5)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          zIndex: 100,
        }}
        onClick={onClose}
      >
        <div
          style={{
            background: "var(--surface)",
            borderRadius: "12px",
            padding: "40px 24px",
            maxWidth: 400,
            textAlign: "center",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <ShoppingCart size={48} style={{ margin: "0 auto 16px", opacity: 0.3 }} />
          <p style={{ color: "var(--text2)", fontSize: ".95rem", fontWeight: 500 }}>
            Seu carrinho está vazio
          </p>
          <button
            onClick={onClose}
            style={{
              marginTop: "20px",
              padding: "10px 20px",
              background: "#16A34A",
              color: "white",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
              fontWeight: 600,
              fontSize: ".9rem",
            }}
          >
            Continuar comprando
          </button>
        </div>
      </div>
    );
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const canSubmit = producerName.trim().length > 2 && phone.trim().length > 10;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "flex-end",
        zIndex: 100,
      }}
      onClick={onClose}
    >
      <div
        style={{
          background: "var(--surface)",
          borderRadius: "12px 12px 0 0",
          padding: "24px",
          width: "100%",
          maxWidth: 600,
          maxHeight: "90dvh",
          overflowY: "auto",
          margin: "0 auto",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: "20px",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "16px",
          }}
        >
          <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: 0 }}>
            Carrinho ({totalItems} itens)
          </h2>
          <button
            onClick={onClose}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--text3)",
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div style={{ marginBottom: "20px" }}>
          {cartItems.map((item, idx) => {
            const campaign = campaigns.find((c) => c.id === item.campaignId);
            if (!campaign) return null;
            return (
              <div
                key={idx}
                style={{
                  background: "var(--surface2)",
                  border: "1px solid var(--border)",
                  borderRadius: "8px",
                  padding: "12px",
                  marginBottom: "12px",
                  display: "flex",
                  alignItems: "center",
                  gap: "12px",
                }}
              >
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: ".95rem", fontWeight: 600, margin: "0 0 4px 0", color: "var(--text1)" }}>
                    {campaign.product}
                  </p>
                  <p style={{ fontSize: ".8rem", color: "var(--text3)", margin: 0 }}>
                    {item.qty} {campaign.unit} • Gestor: {campaign.gestorName}
                  </p>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  <input
                    type="number"
                    value={item.qty}
                    onChange={(e) => onUpdateQty(idx, +e.target.value)}
                    min={campaign.minQty}
                    max={campaign.maxQty || 999}
                    style={{
                      width: "50px",
                      padding: "6px",
                      border: "1px solid var(--border)",
                      borderRadius: "4px",
                      fontSize: ".85rem",
                      textAlign: "center",
                    }}
                  />
                  <button
                    onClick={() => onRemove(idx)}
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      color: "var(--red)",
                      padding: "4px",
                    }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Dados */}
        <div
          style={{
            borderTop: "1px solid var(--border)",
            paddingTop: "20px",
            marginBottom: "20px",
          }}
        >
          <h3 style={{ fontSize: ".95rem", fontWeight: 700, marginBottom: "12px", color: "var(--text1)" }}>
            Seus dados
          </h3>

          <div style={{ marginBottom: "12px" }}>
            <label style={{ display: "block", fontSize: ".8rem", fontWeight: 600, marginBottom: "6px" }}>
              <User size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
              Nome completo *
            </label>
            <input
              type="text"
              value={producerName}
              onChange={(e) => setProducerName(e.target.value)}
              placeholder="Seu nome"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: ".9rem",
                background: "var(--surface2)",
                boxSizing: "border-box",
              }}
            />
          </div>

          <div>
            <label style={{ display: "block", fontSize: ".8rem", fontWeight: 600, marginBottom: "6px" }}>
              <Phone size={12} style={{ marginRight: "4px", verticalAlign: "middle" }} />
              Telefone/WhatsApp *
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(00) 0000-0000"
              style={{
                width: "100%",
                padding: "8px 10px",
                border: "1px solid var(--border)",
                borderRadius: "6px",
                fontSize: ".9rem",
                background: "var(--surface2)",
                boxSizing: "border-box",
              }}
            />
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: "flex", gap: "12px" }}>
          <button
            onClick={onClose}
            disabled={submitting}
            style={{
              flex: 1,
              padding: "12px",
              background: "var(--surface2)",
              border: "1px solid var(--border)",
              borderRadius: "6px",
              cursor: "pointer",
              fontSize: ".9rem",
              fontWeight: 600,
              color: "var(--text2)",
              transition: "all 0.2s",
            }}
          >
            Continuar
          </button>
          <button
            onClick={() =>
              onSubmit({
                items: cartItems,
                producerName: producerName.trim(),
                phone: unmaskPhone(phone),
              })
            }
            disabled={!canSubmit || submitting}
            style={{
              flex: 1,
              padding: "12px",
              background: canSubmit && !submitting ? "#16A34A" : "var(--surface3)",
              color: canSubmit && !submitting ? "white" : "var(--text3)",
              border: "none",
              borderRadius: "6px",
              cursor: canSubmit && !submitting ? "pointer" : "not-allowed",
              fontSize: ".9rem",
              fontWeight: 600,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: "6px",
              transition: "all 0.2s",
            }}
          >
            <Send size={14} />
            {submitting ? "Enviando..." : "Enviar pedidos"}
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessView({ itemCount, producerName, onReset }) {
  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "40px 20px",
        textAlign: "center",
      }}
    >
      <CheckCircle size={64} color="#16A34A" style={{ marginBottom: "16px" }} />
      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 8px 0" }}>
        Pedidos enviados!
      </h2>
      <p style={{ color: "var(--text2)", marginBottom: "20px" }}>
        {itemCount} cotação{itemCount > 1 ? "s" : ""} adicionada{itemCount > 1 ? "s" : ""}. Os gestores receberão via WhatsApp em breve.
      </p>

      <button
        onClick={onReset}
        style={{
          background: "#16A34A",
          color: "white",
          border: "none",
          padding: "12px 32px",
          borderRadius: "6px",
          cursor: "pointer",
          fontSize: ".95rem",
          fontWeight: 600,
        }}
      >
        Fazer novos pedidos
      </button>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════════════════════
// PÁGINA PRINCIPAL
// ══════════════════════════════════════════════════════════════════════════════

export function ProducerPortalPage({ onSubmit }) {
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [cartItems, setCartItems] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("agro_cart") ?? "[]");
    } catch {
      return [];
    }
  });
  const [showCartModal, setShowCartModal] = useState(false);
  const [addToCartCampaign, setAddToCartCampaign] = useState(null);
  const [step, setStep] = useState("browse"); // browse | success
  const [submitting, setSubmitting] = useState(false);
  const [successCount, setSuccessCount] = useState(0);
  const [successName, setSuccessName] = useState("");

  // Carregar campanhas
  useEffect(() => {
    fetchOpenCampaigns()
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  // Persistir carrinho
  useEffect(() => {
    localStorage.setItem("agro_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const filtered = campaigns.filter((c) => {
    const matchCategory = selectedCategory === "all" || c.category === selectedCategory;
    const matchSearch =
      searchQuery === "" ||
      c.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gestorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const handleAddToCart = (campaign) => {
    setAddToCartCampaign(campaign);
  };

  const handleConfirmAddToCart = (qty) => {
    if (addToCartCampaign) {
      setCartItems([
        ...cartItems,
        {
          campaignId: addToCartCampaign.id,
          qty,
        },
      ]);
      setAddToCartCampaign(null);
    }
  };

  const handleUpdateQty = (idx, newQty) => {
    const newCart = [...cartItems];
    newCart[idx].qty = newQty;
    setCartItems(newCart);
  };

  const handleRemoveItem = (idx) => {
    setCartItems(cartItems.filter((_, i) => i !== idx));
  };

  const handleSubmitCart = async (data) => {
    setSubmitting(true);
    try {
      for (const item of data.items) {
        const campaign = campaigns.find((c) => c.id === item.campaignId);
        if (campaign) {
          await onSubmit(item.campaignId, {
            producerName: data.producerName,
            phone: data.phone,
            qty: item.qty,
            confirmedAt: new Date().toISOString().slice(0, 10),
          });
        }
      }
      setSuccessCount(data.items.length);
      setSuccessName(data.producerName);
      setCartItems([]);
      setShowCartModal(false);
      setStep("success");
    } finally {
      setSubmitting(false);
    }
  };

  const handleReset = () => {
    setStep("browse");
    setSelectedCategory("all");
    setSearchQuery("");
    setSuccessCount(0);
    setSuccessName("");
  };

  if (loading) {
    return (
      <div
        style={{
          minHeight: "100dvh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "var(--bg)",
        }}
      >
        <Package size={32} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <Header cartCount={cartItems.length} onCartClick={() => setShowCartModal(true)} />

      {step === "success" ? (
        <SuccessView itemCount={successCount} producerName={successName} onReset={handleReset} />
      ) : (
        <div style={{ flex: 1, padding: "20px", maxWidth: 640, margin: "0 auto", width: "100%" }}>
          <CategoryFilter categories={CATEGORIES} active={selectedCategory} onChange={setSelectedCategory} />
          {filtered.length > 3 && <SearchBar value={searchQuery} onChange={setSearchQuery} />}

          {filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: "60px 20px" }}>
              <Package size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
              <p style={{ color: "var(--text3)" }}>Nenhuma cotação encontrada</p>
            </div>
          ) : (
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fill, minmax(150px, 1fr))",
                gap: "12px",
              }}
            >
              {filtered.map((c) => (
                <CampaignCard key={c.id} campaign={c} onAddToCart={handleAddToCart} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      {addToCartCampaign && (
        <AddToCartModal
          campaign={addToCartCampaign}
          onClose={() => setAddToCartCampaign(null)}
          onAdd={handleConfirmAddToCart}
        />
      )}

      {showCartModal && (
        <CartModal
          cartItems={cartItems}
          campaigns={campaigns}
          onClose={() => setShowCartModal(false)}
          onUpdateQty={handleUpdateQty}
          onRemove={handleRemoveItem}
          onSubmit={handleSubmitCart}
          submitting={submitting}
        />
      )}

      <style>${`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
