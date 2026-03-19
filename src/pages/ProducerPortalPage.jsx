import { useState, useEffect, useRef } from "react";
import {
  Loader,
  CheckCircle,
  Phone,
  User,
  Package,
  ArrowRight,
  Users,
  Target,
  ChevronLeft,
  ChevronRight,
  CalendarDays,
  MapPin,
  Sprout,
  Wheat,
  Search,
  Leaf,
  Droplet,
  Zap,
  LayoutGrid,
  ShoppingCart,
  Clock,
  TrendingUp,
  Star,
  Filter,
  X,
} from "lucide-react";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { daysUntilDeadline } from "../utils/data";
import { supabase } from "../lib/supabase";
import styles from "./ProducerPortalPage.module.css";

// Categorias de produtos
const CATEGORIES = [
  { id: "all", name: "Todos", icon: LayoutGrid, color: "#16A34A" },
  { id: "grains", name: "Grãos", icon: Wheat, color: "#DC2626" },
  { id: "seeds", name: "Sementes", icon: Leaf, color: "#7C3AED" },
  { id: "nutrients", name: "Nutrientes", icon: Droplet, color: "#0EA5E9" },
  { id: "tools", name: "Equipamentos", icon: Zap, color: "#F59E0B" },
];

// Função helper para categorizar produto
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
  if (text.includes("nutritente") || text.includes("ração") || text.includes("adubo"))
    return "nutrients";
  if (
    text.includes("equipamento") ||
    text.includes("máquina") ||
    text.includes("bomba") ||
    text.includes("irrigação")
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

function Header() {
  return (
    <div
      style={{
        background: "linear-gradient(135deg, var(--primary) 0%, #15803d 100%)",
        color: "white",
        padding: "20px 24px",
        borderBottom: "1px solid rgba(0,0,0,0.05)",
        position: "sticky",
        top: 0,
        zIndex: 50,
      }}
    >
      <div style={{ maxWidth: 640, margin: "0 auto", width: "100%" }}>
        <h1
          style={{
            fontSize: "1.5rem",
            fontWeight: 700,
            margin: "0 0 4px 0",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <ShoppingCart size={24} />
          AgroColetivo
        </h1>
        <p style={{ fontSize: ".85rem", margin: 0, opacity: 0.9 }}>
          Compras coletivas direto do produtor
        </p>
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
            onMouseEnter={(e) => {
              if (!isActive) {
                e.target.style.borderColor = cat.color;
                e.target.style.background = `${cat.color}08`;
              }
            }}
            onMouseLeave={(e) => {
              if (!isActive) {
                e.target.style.borderColor = "var(--border)";
                e.target.style.background = "var(--surface2)";
              }
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

function SearchBar({ value, onChange, placeholder = "Buscar cotações..." }) {
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
        placeholder={placeholder}
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
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "var(--text3)",
          }}
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function CampaignCard({ campaign, onJoin }) {
  const progress = Math.min(100, Math.round(campaign.approval));
  const daysLeft =
    campaign.deadline && daysUntilDeadline(campaign.deadline);
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  return (
    <div
      onClick={() => onJoin(campaign.id)}
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "12px",
        overflow: "hidden",
        cursor: "pointer",
        transition: "all 0.3s",
        display: "flex",
        flexDirection: "column",
        height: "100%",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--primary)";
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
          height: 180,
          background: "linear-gradient(135deg, var(--surface2) 0%, var(--surface3) 100%)",
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
              background: "linear-gradient(135deg, var(--primary-dim) 0%, var(--surface2) 100%)",
            }}
          >
            <Package size={42} color="var(--primary)" opacity={0.3} />
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
            <Clock size={12} /> {daysLeft}d
          </div>
        )}
      </div>

      {/* Conteúdo */}
      <div style={{ padding: "14px", display: "flex", flexDirection: "column", flex: 1 }}>
        <h3 style={{ fontSize: ".95rem", fontWeight: 700, margin: "0 0 8px 0", lineHeight: 1.2 }}>
          {campaign.product}
        </h3>

        <div style={{ marginBottom: "10px" }}>
          <div
            style={{
              height: "6px",
              background: "var(--surface2)",
              borderRadius: "3px",
              overflow: "hidden",
              marginBottom: "6px",
            }}
          >
            <div
              style={{
                height: "100%",
                background: `linear-gradient(90deg, var(--primary), #15803d)`,
                width: `${progress}%`,
                transition: "width 0.6s ease",
              }}
            />
          </div>
          <div style={{ fontSize: ".75rem", color: "var(--text3)", display: "flex", justifyContent: "space-between" }}>
            <span>{progress}% completo</span>
            <span>{campaign.goalQty} {campaign.unit}</span>
          </div>
        </div>

        {campaign.deadline && (
          <div style={{ fontSize: ".75rem", color: "var(--text3)", marginBottom: "10px", display: "flex", alignItems: "center", gap: "4px" }}>
            <CalendarDays size={12} />
            {daysLeft === 0 ? "Encerra hoje!" : `${fmtDate(campaign.deadline)}`}
          </div>
        )}

        <div style={{ fontSize: ".8rem", color: "var(--text2)", marginTop: "auto", paddingTop: "10px", borderTop: "1px solid var(--border)" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <User size={12} />
            <strong>{campaign.gestorName}</strong>
          </div>
        </div>
      </div>
    </div>
  );
}

function BrowseView({ campaigns, selectedCategory, searchQuery, onJoin, onCategoryChange, onSearchChange }) {
  const filtered = campaigns.filter((c) => {
    const matchCategory = selectedCategory === "all" || c.category === selectedCategory;
    const matchSearch =
      searchQuery === "" ||
      c.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gestorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  return (
    <div style={{ flex: 1, padding: "20px", paddingTop: 0, maxWidth: 640, margin: "0 auto", width: "100%" }}>
      <CategoryFilter categories={CATEGORIES} active={selectedCategory} onChange={onCategoryChange} />
      {filtered.length > 3 && <SearchBar value={searchQuery} onChange={onSearchChange} />}

      {filtered.length === 0 ? (
        <div style={{ textAlign: "center", padding: "60px 20px" }}>
          <Package size={48} style={{ margin: "0 auto 16px", opacity: 0.2 }} />
          <p style={{ color: "var(--text3)", fontSize: ".95rem", margin: 0 }}>
            Nenhuma cotação encontrada
          </p>
          {searchQuery && (
            <button
              onClick={() => onSearchChange("")}
              style={{
                marginTop: "16px",
                background: "var(--primary)",
                color: "white",
                border: "none",
                padding: "8px 16px",
                borderRadius: "6px",
                cursor: "pointer",
                fontSize: ".85rem",
                fontWeight: 600,
              }}
            >
              Limpar busca
            </button>
          )}
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))",
            gap: "12px",
          }}
        >
          {filtered.map((c) => (
            <CampaignCard key={c.id} campaign={c} onJoin={onJoin} />
          ))}
        </div>
      )}
    </div>
  );
}

function FormView({ campaign, onSubmit, onBack, saving }) {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [qty, setQty] = useState("");
  const [error, setError] = useState(null);

  // Carrega dados salvos
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("agro_producer") ?? "null");
      if (saved) {
        setName(saved.name || "");
        setPhone(maskPhone(saved.phone) || "");
      }
    } catch {}
  }, []);

  const qtyNum = +qty;
  const qtyOk = qtyNum >= campaign.minQty && (campaign.maxQty === null || qtyNum <= campaign.maxQty);
  const canSubmit = name.trim().length > 2 && qtyOk && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setError(null);
    try {
      const cleanPhone = unmaskPhone(phone);
      localStorage.setItem(
        "agro_producer",
        JSON.stringify({ name: name.trim(), phone: cleanPhone }),
      );
      await onSubmit({
        campaignId: campaign.id,
        producerName: name.trim(),
        phone: cleanPhone,
        qty: qtyNum,
      });
    } catch (e) {
      setError(e?.message || "Erro ao enviar");
    }
  };

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        padding: "20px",
        maxWidth: 640,
        margin: "0 auto",
        width: "100%",
      }}
    >
      <button
        onClick={onBack}
        style={{
          display: "flex",
          alignItems: "center",
          gap: "6px",
          background: "none",
          border: "none",
          color: "var(--primary)",
          cursor: "pointer",
          fontSize: ".9rem",
          fontWeight: 600,
          marginBottom: "20px",
          padding: "4px 0",
        }}
      >
        <ChevronLeft size={18} /> Voltar
      </button>

      <div
        style={{
          background: "var(--surface)",
          border: "1px solid var(--border)",
          borderRadius: "12px",
          padding: "24px",
          marginBottom: "20px",
        }}
      >
        <h2 style={{ fontSize: "1.2rem", fontWeight: 700, margin: "0 0 8px 0" }}>Cotação</h2>
        <p style={{ fontSize: ".85rem", color: "var(--text2)", margin: 0 }}>
          {campaign.product} · Meta: {campaign.goalQty} {campaign.unit}
        </p>
      </div>

      <div style={{ flex: 1 }}>
        {/* Nome */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text)" }}>
            <User size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Nome completo *
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Seu nome"
            autoFocus
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: ".9rem",
              boxSizing: "border-box",
              background: "var(--surface2)",
            }}
          />
        </div>

        {/* Telefone */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text)" }}>
            <Phone size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Telefone/WhatsApp *
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(maskPhone(e.target.value))}
            placeholder="(00) 0000-0000"
            style={{
              width: "100%",
              padding: "10px 12px",
              border: "1px solid var(--border)",
              borderRadius: "8px",
              fontSize: ".9rem",
              boxSizing: "border-box",
              background: "var(--surface2)",
            }}
          />
        </div>

        {/* Quantidade */}
        <div style={{ marginBottom: "16px" }}>
          <label style={{ display: "block", fontSize: ".85rem", fontWeight: 600, marginBottom: "6px", color: "var(--text)" }}>
            <Target size={14} style={{ marginRight: "4px", verticalAlign: "middle" }} />
            Quantidade ({campaign.unit}) *
          </label>
          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            placeholder="0"
            min={campaign.minQty}
            max={campaign.maxQty || undefined}
            style={{
              width: "100%",
              padding: "10px 12px",
              border: `1px solid ${!qtyOk && qty ? "var(--red)" : "var(--border)"}`,
              borderRadius: "8px",
              fontSize: ".9rem",
              boxSizing: "border-box",
              background: "var(--surface2)",
            }}
          />
          <div style={{ fontSize: ".75rem", color: "var(--text3)", marginTop: "4px" }}>
            Mínimo: {campaign.minQty} {campaign.unit}
            {campaign.maxQty && ` | Máximo: ${campaign.maxQty}`}
          </div>
        </div>

        {error && (
          <div style={{ padding: "10px", background: "#FEE2E2", border: "1px solid #FCA5A5", borderRadius: "6px", color: "#DC2626", fontSize: ".85rem", marginBottom: "16px" }}>
            {error}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={!canSubmit}
        style={{
          width: "100%",
          padding: "12px",
          background: canSubmit ? "var(--primary)" : "var(--surface3)",
          color: canSubmit ? "white" : "var(--text3)",
          border: "none",
          borderRadius: "8px",
          fontSize: ".95rem",
          fontWeight: 600,
          cursor: canSubmit ? "pointer" : "not-allowed",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
          transition: "all 0.2s",
        }}
        onMouseEnter={(e) => {
          if (canSubmit) {
            e.target.style.background = "#15803d";
          }
        }}
        onMouseLeave={(e) => {
          if (canSubmit) {
            e.target.style.background = "var(--primary)";
          }
        }}
      >
        {saving ? (
          <>
            <Loader size={16} style={{ animation: "spin 1s linear infinite" }} />
            Enviando...
          </>
        ) : (
          <>
            <ShoppingCart size={16} />
            Fazer pedido
          </>
        )}
      </button>
    </div>
  );
}

function SuccessView({ campaign, producerName, onReset }) {
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
      <CheckCircle size={64} color="var(--primary)" style={{ marginBottom: "16px" }} />
      <h2 style={{ fontSize: "1.3rem", fontWeight: 700, margin: "0 0 8px 0" }}>Pedido enviado!</h2>
      <p style={{ color: "var(--text2)", marginBottom: "20px" }}>
        {campaign.gestorName} receberá seu pedido via WhatsApp em breve.
      </p>

      <div
        style={{
          background: "var(--primary-dim)",
          border: "1px solid var(--primary-border)",
          borderRadius: "8px",
          padding: "16px",
          textAlign: "left",
          marginBottom: "24px",
          width: "100%",
        }}
      >
        <p style={{ fontSize: ".85rem", margin: "0 0 6px 0" }}>
          <strong>{campaign.product}</strong>
        </p>
        <p style={{ fontSize: ".8rem", color: "var(--text2)", margin: 0 }}>
          Solicitante: <strong>{producerName}</strong>
        </p>
      </div>

      <button
        onClick={onReset}
        style={{
          background: "var(--primary)",
          color: "white",
          border: "none",
          padding: "12px 32px",
          borderRadius: "8px",
          fontSize: ".95rem",
          fontWeight: 600,
          cursor: "pointer",
        }}
      >
        Fazer outro pedido
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
  const [step, setStep] = useState("browse"); // browse | form | success
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCampaign, setSelectedCampaign] = useState(null);
  const [processingSubmit, setProcessingSubmit] = useState(false);
  const [submittedProducerName, setSubmittedProducerName] = useState("");

  useEffect(() => {
    fetchOpenCampaigns()
      .then(setCampaigns)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleJoin = (campaignId) => {
    const campaign = campaigns.find((c) => c.id === campaignId);
    if (campaign) {
      setSelectedCampaign(campaign);
      setStep("form");
    }
  };

  const handleFormSubmit = async (data) => {
    setProcessingSubmit(true);
    try {
      await onSubmit(data.campaignId, {
        producerName: data.producerName,
        phone: data.phone,
        qty: data.qty,
        confirmedAt: new Date().toISOString().slice(0, 10),
      });
      setSubmittedProducerName(data.producerName);
      setStep("success");
    } finally {
      setProcessingSubmit(false);
    }
  };

  const handleReset = () => {
    setSelectedCampaign(null);
    setSelectedCategory("all");
    setSearchQuery("");
    setStep("browse");
    setSubmittedProducerName("");
  };

  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
      }}
    >
      <Header />

      {loading ? (
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <Loader size={32} color="var(--primary)" style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : step === "browse" ? (
        <BrowseView
          campaigns={campaigns}
          selectedCategory={selectedCategory}
          searchQuery={searchQuery}
          onJoin={handleJoin}
          onCategoryChange={setSelectedCategory}
          onSearchChange={setSearchQuery}
        />
      ) : step === "form" && selectedCampaign ? (
        <FormView
          campaign={selectedCampaign}
          onSubmit={handleFormSubmit}
          onBack={handleReset}
          saving={processingSubmit}
        />
      ) : step === "success" ? (
        <SuccessView
          campaign={selectedCampaign}
          producerName={submittedProducerName}
          onReset={handleReset}
        />
      ) : null}

      <style>${`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}