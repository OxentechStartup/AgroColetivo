import { useState, useEffect, useCallback, useContext, useRef } from "react";
import { createClient } from "@supabase/supabase-js";
import {
  ShoppingCart,
  Plus,
  X,
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
  CheckCircle,
  Clock,
  Search,
  AlertCircle,
  Package,
  Briefcase,
} from "lucide-react";
import { maskPhone, unmaskPhone } from "../utils/masks";
import { daysUntilDeadline } from "../utils/data";
import { supabase } from "../lib/supabase";
import {
  isRealtimeAvailable,
  markRealtimeFailure,
  clearRealtimeBackoff,
  cleanupRealtimeChannel,
} from "../lib/realtimeGuard.js";
import AppContext from "../context/AppContext";
import { BuyerOrderStatusPage } from "./BuyerOrderStatusPage";
import { BRAND_NAME, BRAND_LOGO_URL } from "../constants/branding";
import styles from "./ProducerPortalPage.module.css";

const CATEGORIES = [
  { id: "all", name: "Todos", icon: LayoutGrid, color: "#16A34A" },
  { id: "grains", name: "Graos", icon: Wheat, color: "#DC2626" },
  { id: "seeds", name: "Sementes", icon: Leaf, color: "#7C3AED" },
  { id: "nutrients", name: "Nutrientes", icon: Droplet, color: "#0EA5E9" },
  { id: "tools", name: "Equipamentos", icon: Zap, color: "#F59E0B" },
];

const CAMPAIGNS_TIMEOUT_MS = 15000;
const PORTAL_SYNC_INTERVAL_MS = 60000;
const PORTAL_SYNC_DEBOUNCE_MS = 450;

const SUPABASE_URL = import.meta.env?.VITE_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = import.meta.env?.VITE_SUPABASE_ANON_KEY || "";

const portalSupabase =
  SUPABASE_URL && SUPABASE_ANON_KEY
    ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
          detectSessionInUrl: false,
        },
      })
    : null;

function getCategoryId(product) {
  const text = String(product || "").toLowerCase();
  if (text.includes("semente") || text.includes("semilla")) return "seeds";
  if (
    text.includes("milho") ||
    text.includes("soja") ||
    text.includes("arroz") ||
    text.includes("trigo") ||
    text.includes("feijao") ||
    text.includes("cereal") ||
    text.includes("grao")
  ) {
    return "grains";
  }
  if (
    text.includes("nutrient") ||
    text.includes("racao") ||
    text.includes("adubo")
  ) {
    return "nutrients";
  }
  if (
    text.includes("equipament") ||
    text.includes("maquina") ||
    text.includes("bomba")
  ) {
    return "tools";
  }
  return "all";
}

function clampQtyValue(value, minQty = 1, maxQty = 999) {
  const min = Number.isFinite(minQty) ? Number(minQty) : 1;
  const parsed = Number(value);
  const safeMax = Number.isFinite(maxQty)
    ? Math.max(Number(maxQty), min)
    : Number.MAX_SAFE_INTEGER;

  if (!Number.isFinite(parsed)) return min;
  return Math.min(safeMax, Math.max(min, Math.round(parsed)));
}

function mapPortalCampaignRow(row, gestorById = null) {
  const gestorJoin = Array.isArray(row.gestor_name)
    ? row.gestor_name[0]
    : row.gestor_name;
  const gestorFallback = gestorById?.get?.(row.pivo_id);

  const goalQty = Number(row.goal_qty ?? 0);
  const totalOrdered = Number(row.total_ordered ?? 0);
  const approval = Number(
    row.progress_pct ?? (goalQty > 0 ? (totalOrdered / goalQty) * 100 : 0),
  );

  return {
    id: row.id,
    product: row.product,
    unit: row.unit,
    unitWeight: Number(row.unit_weight_kg ?? 25),
    goalQty,
    minQty: Number(row.min_qty ?? 1),
    maxQty: row.max_qty || null,
    status: row.status,
    deadline: row.deadline,
    totalOrdered,
    approval,
    imageUrl: row.image_url,
    pricePerUnit: row.price_per_unit ? Number(row.price_per_unit) : null,
    pivoId: row.pivo_id,
    gestorName: gestorJoin?.name || gestorFallback?.name || "Gestor",
    gestorPhone: gestorJoin?.phone || gestorFallback?.phone || "",
    category: getCategoryId(row.product),
  };
}

async function fetchGestorMap(client, pivoIds) {
  if (!pivoIds.length) return new Map();

  const { data, error } = await client
    .from("users")
    .select("id, name, phone")
    .in("id", pivoIds);

  if (error || !Array.isArray(data)) {
    return new Map();
  }

  return new Map(
    data.map((row) => [
      row.id,
      {
        name: row.name || "Gestor",
        phone: row.phone || "",
      },
    ]),
  );
}

async function fetchOpenCampaigns() {
  const client = portalSupabase ?? supabase;

  const { data, error } = await client
    .from("v_campaign_summary")
    .select(
      "id, pivo_id, product, unit, unit_weight_kg, goal_qty, min_qty, max_qty, status, deadline, total_ordered, progress_pct, image_url, price_per_unit, created_at, gestor_name:users!pivo_id(name, phone)",
    )
    .in("status", ["open", "negotiating"])
    .order("created_at", { ascending: false });

  if (!error && Array.isArray(data)) {
    return data.map((row) => mapPortalCampaignRow(row));
  }

  const { data: rawCampaigns, error: fallbackError } = await client
    .from("campaigns")
    .select(
      "id, pivo_id, product, unit, unit_weight_kg, goal_qty, min_qty, status, deadline, image_url, created_at",
    )
    .in("status", ["open", "negotiating"])
    .order("created_at", { ascending: false });

  if (fallbackError) {
    throw new Error(
      fallbackError?.message || error?.message || "Erro ao buscar campanhas",
    );
  }

  const pivoIds = [
    ...new Set((rawCampaigns ?? []).map((row) => row.pivo_id).filter(Boolean)),
  ];
  const gestorById = await fetchGestorMap(client, pivoIds);

  return (rawCampaigns ?? []).map((row) =>
    mapPortalCampaignRow(row, gestorById),
  );
}

function fmtDate(iso) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// ============================================================================
// COMPONENTES
// ============================================================================

function Header({ cartCount, onCartClick }) {
  const cartLabel = cartCount === 1 ? "1 item" : `${cartCount} itens`;

  return (
    <header className={styles.portalHeader}>
      <div className={styles.portalHeaderInner}>
        <div className={styles.portalBrandGroup}>
          <div className={styles.portalLogo}>
            <img
              src={BRAND_LOGO_URL}
              alt={BRAND_NAME}
              className={styles.portalLogoImg}
            />
          </div>

          <div className={styles.portalBrandText}>
            <h1 className={styles.portalBrandTitle}>HubCompras</h1>
            <p className={styles.portalBrandSubtitle}>Compras coletivas</p>
          </div>
        </div>

        <button
          type="button"
          onClick={onCartClick}
          className={styles.portalCartBtn}
          aria-label={`Abrir carrinho com ${cartLabel}`}
        >
          <ShoppingCart size={16} />
          <span>{cartLabel}</span>
          {cartCount > 0 && (
            <span className={styles.portalCartBadge}>{cartCount}</span>
          )}
        </button>
      </div>
    </header>
  );
}

function CategoryFilter({ categories, active, onChange }) {
  return (
    <div className={styles.filterRail}>
      {categories.map((cat) => {
        const Icon = cat.icon;
        const isActive = cat.id === active;
        const chipToneClass =
          styles[`chipTone_${cat.id}`] || styles.chipTone_all;
        return (
          <button
            key={cat.id}
            type="button"
            onClick={() => onChange(cat.id)}
            className={`${styles.filterChip} ${chipToneClass} ${isActive ? styles.filterChipActive : ""}`}
            aria-pressed={isActive}
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
    <div className={styles.searchBar}>
      <Search size={16} className={styles.searchIcon} />
      <input
        type="text"
        placeholder="Buscar produto ou gestor..."
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={styles.searchInput}
      />
      {value && (
        <button
          type="button"
          onClick={() => onChange("")}
          className={styles.searchClearBtn}
          aria-label="Limpar busca"
        >
          <X size={16} />
        </button>
      )}
    </div>
  );
}

function BrowseSummary({ totalCampaigns, visibleCampaigns, cartCount }) {
  return (
    <section className={styles.summaryStrip} aria-label="Resumo das cotacoes">
      <article className={styles.summaryPill}>
        <span className={styles.summaryPillLabel}>Abertas</span>
        <strong className={styles.summaryPillValue}>{totalCampaigns}</strong>
      </article>

      <article className={styles.summaryPill}>
        <span className={styles.summaryPillLabel}>Visiveis</span>
        <strong className={styles.summaryPillValue}>{visibleCampaigns}</strong>
      </article>

      <article className={styles.summaryPill}>
        <span className={styles.summaryPillLabel}>Carrinho</span>
        <strong className={styles.summaryPillValue}>{cartCount}</strong>
      </article>
    </section>
  );
}

function CampaignCard({ campaign, onAddToCart }) {
  const progress = Math.min(100, Math.round(campaign.approval));
  const daysLeft = campaign.deadline && daysUntilDeadline(campaign.deadline);
  const isUrgent = daysLeft !== null && daysLeft >= 0 && daysLeft <= 3;

  // Mapear a categoria para exibicao
  const categoryInfo =
    CATEGORIES.find((c) => c.id === campaign.category) || CATEGORIES[0];
  const Icon = categoryInfo.icon;
  const categoryToneClass =
    styles[`chipTone_${categoryInfo.id}`] || styles.chipTone_all;

  return (
    <article
      onClick={() => onAddToCart(campaign)}
      className={styles.productCard}
      aria-label={`Adicionar ${campaign.product} ao carrinho`}
    >
      <div className={styles.productMedia}>
        {campaign.imageUrl ? (
          <img
            src={campaign.imageUrl}
            alt={campaign.product}
            className={styles.productImage}
          />
        ) : (
          <div className={styles.productImageFallback}>
            <Package size={36} color="var(--primary)" opacity={0.2} />
          </div>
        )}

        {isUrgent && (
          <div className={styles.productUrgentTag}>
            <Clock size={11} /> {daysLeft}d
          </div>
        )}
      </div>

      <div className={styles.productBody}>
        <div className={`${styles.productCategory} ${categoryToneClass}`}>
          <Icon size={12} />
          {categoryInfo.name}
        </div>

        <h3 className={styles.productTitle}>{campaign.product}</h3>

        <div className={styles.productProgressWrap}>
          <progress
            className={styles.productProgressTrack}
            value={progress}
            max={100}
            aria-label={`Progresso de ${campaign.product}: ${progress}%`}
          />

          <div className={styles.productProgressMeta}>
            <span>{progress}% completo</span>
            <span>
              {campaign.goalQty} {campaign.unit}
            </span>
          </div>
        </div>

        <div className={styles.productManagerRow}>
          <strong>{campaign.gestorName}</strong>
        </div>

        <button type="button" className={styles.productAddBtn} tabIndex={-1}>
          <Plus size={14} /> Adicionar
        </button>
      </div>
    </article>
  );
}

function AddToCartModal({ campaign, onClose, onAdd }) {
  const [qty, setQty] = useState(campaign.minQty.toString());
  const qtyNum = +qty;
  const qtyOk =
    qtyNum >= campaign.minQty &&
    (!campaign.maxQty || qtyNum <= campaign.maxQty);

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()}>
        <div className={styles.modalHeader}>
          <h2 className={styles.modalTitle}>{campaign.product}</h2>
          <button type="button" onClick={onClose} className={styles.iconBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.metaBox}>
          <p className={styles.metaLine}>
            Meta: {campaign.goalQty} {campaign.unit} | Min: {campaign.minQty}
            {campaign.maxQty && ` | Max: ${campaign.maxQty}`}
          </p>
          <p className={`${styles.metaLine} ${styles.metaLineMuted}`}>
            Progresso: {campaign.approval.toFixed(0)}%
          </p>
        </div>

        <div className={styles.qtyGroup}>
          <label className={styles.qtyLabel}>
            <Target size={14} /> Quantidade ({campaign.unit}) *
          </label>

          <input
            type="number"
            value={qty}
            onChange={(e) => setQty(e.target.value)}
            min={campaign.minQty}
            max={campaign.maxQty || undefined}
            step={1}
            inputMode="numeric"
            className={`${styles.qtyInput} ${!qtyOk && qty ? styles.qtyInputInvalid : ""}`}
          />
        </div>

        <div className={styles.modalActions}>
          <button type="button" onClick={onClose} className={styles.ghostBtn}>
            Cancelar
          </button>

          <button
            type="button"
            onClick={() => onAdd(qtyNum)}
            disabled={!qtyOk}
            className={styles.primaryBtn}
          >
            Adicionar ao carrinho
          </button>
        </div>
      </div>
    </div>
  );
}

function CartModal({
  cartItems,
  campaigns,
  onClose,
  onUpdateQty,
  onRemove,
  onSubmit,
  submitting,
}) {
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
      <div className={styles.modalOverlayCenter} onClick={onClose}>
        <div
          className={`${styles.modalSheetCenter} ${styles.emptyCartWrap}`}
          onClick={(e) => e.stopPropagation()}
        >
          <ShoppingCart size={48} className={styles.emptyCartIcon} />
          <p className={styles.emptyCartText}>Seu carrinho esta vazio</p>
          <button
            type="button"
            onClick={onClose}
            className={`${styles.primaryBtn} ${styles.emptyCartAction}`}
          >
            Continuar comprando
          </button>
        </div>
      </div>
    );
  }

  const totalItems = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const cleanedPhone = unmaskPhone(phone);
  const canSubmit = producerName.trim().length > 2 && cleanedPhone.length >= 10;

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div
        className={`${styles.modalSheet} ${styles.modalSheetScrollable}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={`${styles.modalHeader} ${styles.modalHeaderLarge}`}>
          <h2 className={`${styles.modalTitle} ${styles.modalTitleLarge}`}>
            Carrinho ({totalItems} itens)
          </h2>

          <button type="button" onClick={onClose} className={styles.iconBtn}>
            <X size={20} />
          </button>
        </div>

        <div className={styles.cartItems}>
          {cartItems.map((item, idx) => {
            const campaign = campaigns.find((c) => c.id === item.campaignId);
            if (!campaign) return null;
            const itemTotal = (campaign.pricePerUnit || 0) * item.qty;

            return (
              <div key={idx} className={styles.cartItem}>
                <div className={styles.cartItemTop}>
                  <div className={styles.cartThumb}>
                    {campaign.imageUrl ? (
                      <img src={campaign.imageUrl} alt={campaign.product} />
                    ) : (
                      <div className={styles.cartThumbFallback}>
                        <Package size={28} opacity={0.3} />
                      </div>
                    )}
                  </div>

                  <div className={styles.cartInfo}>
                    <p className={styles.cartProduct}>{campaign.product}</p>
                    <p className={styles.cartManager}>{campaign.gestorName}</p>

                    <progress
                      className={styles.cartProgressTrack}
                      value={Math.min(100, campaign.approval)}
                      max={100}
                      aria-label={`Progresso de ${campaign.product}: ${Math.min(100, campaign.approval).toFixed(0)}%`}
                    />

                    <p className={styles.cartProgressLabel}>
                      {campaign.approval.toFixed(0)}% agora
                    </p>
                  </div>

                  <div className={styles.cartQtyActions}>
                    <input
                      type="number"
                      value={item.qty}
                      onChange={(e) => onUpdateQty(idx, e.target.value)}
                      min={campaign.minQty}
                      max={campaign.maxQty || 999}
                      step={1}
                      inputMode="numeric"
                      className={styles.cartQtyInput}
                    />

                    <button
                      type="button"
                      onClick={() => onRemove(idx)}
                      className={styles.cartRemove}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>

                <div className={styles.cartItemBottom}>
                  <span className={styles.cartItemBottomLeft}>
                    {item.qty} x{" "}
                    {campaign.pricePerUnit
                      ? `R$ ${campaign.pricePerUnit.toFixed(2)}`
                      : "C.O."}
                  </span>
                  <span className={styles.cartItemBottomRight}>
                    {campaign.pricePerUnit
                      ? `R$ ${itemTotal.toFixed(2)}`
                      : "Cotacao"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        <div className={styles.summaryBox}>
          <div className={styles.summaryRow}>
            <span className={styles.summaryLabel}>Itens no carrinho</span>
            <span className={styles.summaryValue}>{totalItems}</span>
          </div>

          {(() => {
            const total = cartItems.reduce((sum, item) => {
              const c = campaigns.find((c) => c.id === item.campaignId);
              return sum + (c?.pricePerUnit || 0) * item.qty;
            }, 0);
            const hasMissingPrice = cartItems.some(
              (item) =>
                !campaigns.find((c) => c.id === item.campaignId)?.pricePerUnit,
            );
            return (
              <>
                <div className={styles.summaryTotal}>
                  <span className={styles.summaryTotalLabel}>
                    Total estimado
                  </span>
                  <span className={styles.summaryTotalValue}>
                    {hasMissingPrice ? "-" : `R$ ${total.toFixed(2)}`}
                  </span>
                </div>

                {hasMissingPrice && (
                  <p className={styles.summaryHint}>
                    Alguns precos serao confirmados apos aceitacao
                  </p>
                )}
              </>
            );
          })()}
        </div>

        <div className={styles.contactSection}>
          <h3 className={styles.contactTitle}>Seus dados</h3>

          <div className={styles.fieldGroup}>
            <label className={styles.fieldLabel}>
              <User size={12} /> Nome completo *
            </label>

            <input
              type="text"
              value={producerName}
              onChange={(e) => setProducerName(e.target.value)}
              placeholder="Seu nome"
              className={styles.fieldInput}
            />
          </div>

          <div>
            <label className={styles.fieldLabel}>
              <Phone size={12} /> Telefone/WhatsApp *
            </label>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(maskPhone(e.target.value))}
              placeholder="(00) 00000-0000"
              className={styles.fieldInput}
            />
          </div>
        </div>

        <div className={styles.cartActions}>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className={styles.ghostBtn}
          >
            Continuar
          </button>

          <button
            type="button"
            onClick={() => {
              localStorage.setItem(
                "agro_producer",
                JSON.stringify({
                  name: producerName.trim(),
                  phone: cleanedPhone,
                }),
              );
              localStorage.setItem("agro_producer_phone", cleanedPhone);

              onSubmit({
                items: cartItems,
                producerName: producerName.trim(),
                phone: cleanedPhone,
              });
            }}
            disabled={!canSubmit || submitting}
            className={styles.primaryBtn}
          >
            <Send size={14} />
            {submitting ? "Enviando..." : "Enviar pedidos"}
          </button>
        </div>
      </div>
    </div>
  );
}

function DuplicateItemModal({
  campaign,
  newQty,
  existingQty,
  onClose,
  onReplace,
  onAdd,
}) {
  return (
    <div className={styles.modalOverlayCenter} onClick={onClose}>
      <div
        className={styles.modalSheetCenter}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={styles.duplicateTitleRow}>
          <AlertCircle size={24} className={styles.duplicateIcon} />
          <h2 className={styles.modalTitle}>Produto ja no carrinho</h2>
        </div>

        <p className={styles.duplicateText}>
          <strong>{campaign.product}</strong> ja esta no carrinho com{" "}
          {existingQty} {campaign.unit}. O que deseja fazer?
        </p>

        <div className={styles.metaBox}>
          <p className={styles.metaLine}>
            Quantidade atual:{" "}
            <strong>
              {existingQty} {campaign.unit}
            </strong>
          </p>
          <p className={`${styles.metaLine} ${styles.metaLineMuted}`}>
            Nova quantidade:{" "}
            <strong>
              {newQty} {campaign.unit}
            </strong>
          </p>
        </div>

        <div className={styles.duplicateActions}>
          <button
            type="button"
            onClick={() => onReplace(newQty)}
            className={styles.duplicatePrimary}
          >
            Substituir por {newQty}
          </button>

          <button
            type="button"
            onClick={() => onAdd(newQty)}
            className={styles.duplicateSecondary}
          >
            Adicionar {newQty} (total: {existingQty + newQty})
          </button>

          <button
            type="button"
            onClick={onClose}
            className={styles.duplicateCancel}
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}

function SuccessView({ itemCount, producerName, onReset }) {
  return (
    <div className={styles.successWrap}>
      <CheckCircle size={64} className={styles.successIcon} />
      <h2>Pedidos enviados!</h2>
      <p>
        {itemCount} cotacao{itemCount > 1 ? "es" : ""} adicionada
        {itemCount > 1 ? "s" : ""}. Os gestores receberao via WhatsApp em breve.
      </p>
      <button type="button" onClick={onReset} className={styles.successAction}>
        Fazer novos pedidos
      </button>
    </div>
  );
}

// ============================================================================
// PAGINA PRINCIPAL
// ============================================================================

export function ProducerPortalPage({ onSubmit }) {
  const { user } = useContext(AppContext) ?? {};
  const [currentTab, setCurrentTab] = useState("products"); // products | orders
  const [campaigns, setCampaigns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [reloadTick, setReloadTick] = useState(0);
  const initialLoadDoneRef = useRef(false);
  const reloadTimerRef = useRef(null);
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
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateData, setDuplicateData] = useState(null);

  const triggerReload = useCallback((delay = PORTAL_SYNC_DEBOUNCE_MS) => {
    if (reloadTimerRef.current) {
      clearTimeout(reloadTimerRef.current);
    }

    reloadTimerRef.current = setTimeout(() => {
      setReloadTick((v) => v + 1);
    }, delay);
  }, []);

  useEffect(() => {
    return () => {
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current);
      }
    };
  }, []);

  // Carregar campanhas
  useEffect(() => {
    let isActive = true;

    const loadCampaigns = async () => {
      if (!initialLoadDoneRef.current) setLoading(true);
      setLoadError("");

      try {
        const data = await Promise.race([
          fetchOpenCampaigns(),
          new Promise((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    "As cotacoes demoraram para carregar. Verifique sua conexao e tente novamente.",
                  ),
                ),
              CAMPAIGNS_TIMEOUT_MS,
            ),
          ),
        ]);

        if (!isActive) return;
        setCampaigns(data);
      } catch (err) {
        if (!isActive) return;
        setCampaigns([]);
        setLoadError(
          err?.message || "Nao foi possivel carregar as cotacoes no momento.",
        );
      } finally {
        if (isActive) {
          setLoading(false);
          initialLoadDoneRef.current = true;
        }
      }
    };

    loadCampaigns();

    return () => {
      isActive = false;
    };
  }, [reloadTick]);

  useEffect(() => {
    if (!isRealtimeAvailable()) return;

    // Realtime subscription para atualizar dados do portal automaticamente
    const realtimeClient = portalSupabase ?? supabase;
    const onDbChange = () => triggerReload();

    const subscription = realtimeClient
      .channel("portal_data_sync")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaigns",
        },
        onDbChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
        },
        onDbChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_lots",
        },
        onDbChange,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "users",
          filter: "role=eq.pivo",
        },
        onDbChange,
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          clearRealtimeBackoff();
          return;
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          markRealtimeFailure("ProducerPortalPage", status);
          cleanupRealtimeChannel(realtimeClient, subscription);
        }
      });

    return () => {
      cleanupRealtimeChannel(realtimeClient, subscription);
    };
  }, [triggerReload]);

  useEffect(() => {
    const refreshNow = () => triggerReload(0);
    const onVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        triggerReload(0);
      }
    };

    window.addEventListener("focus", refreshNow);
    window.addEventListener("online", refreshNow);
    window.addEventListener("pageshow", refreshNow);
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      window.removeEventListener("focus", refreshNow);
      window.removeEventListener("online", refreshNow);
      window.removeEventListener("pageshow", refreshNow);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [triggerReload]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      triggerReload(0);
    }, PORTAL_SYNC_INTERVAL_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [triggerReload]);

  // Persistir carrinho
  useEffect(() => {
    localStorage.setItem("agro_cart", JSON.stringify(cartItems));
  }, [cartItems]);

  const filtered = campaigns.filter((c) => {
    const matchCategory =
      selectedCategory === "all" || c.category === selectedCategory;
    const matchSearch =
      searchQuery === "" ||
      c.product.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.gestorName.toLowerCase().includes(searchQuery.toLowerCase());
    return matchCategory && matchSearch;
  });

  const cartQtyTotal = cartItems.reduce((sum, item) => sum + item.qty, 0);

  const handleAddToCart = (campaign) => {
    setAddToCartCampaign(campaign);
  };

  const handleConfirmAddToCart = (qty) => {
    if (addToCartCampaign) {
      const safeQty = clampQtyValue(
        qty,
        addToCartCampaign.minQty,
        addToCartCampaign.maxQty,
      );

      const existingIndex = cartItems.findIndex(
        (item) => item.campaignId === addToCartCampaign.id,
      );

      if (existingIndex !== -1) {
        // Produto ja esta no carrinho - mostrar modal
        setDuplicateData({
          campaignId: addToCartCampaign.id,
          newQty: safeQty,
          existingQty: cartItems[existingIndex].qty,
          existingIndex,
        });
        setShowDuplicateModal(true);
      } else {
        // Produto novo - adicionar normalmente
        setCartItems([
          ...cartItems,
          {
            campaignId: addToCartCampaign.id,
            qty: safeQty,
          },
        ]);
        setAddToCartCampaign(null);
      }
    }
  };

  const handleReplaceItem = (newQty) => {
    if (duplicateData) {
      const newCart = [...cartItems];
      newCart[duplicateData.existingIndex].qty = newQty;
      setCartItems(newCart);
      setShowDuplicateModal(false);
      setDuplicateData(null);
      setAddToCartCampaign(null);
    }
  };

  const handleAddDuplicateItem = (addQty) => {
    if (duplicateData) {
      const newCart = [...cartItems];
      newCart[duplicateData.existingIndex].qty += addQty;
      setCartItems(newCart);
      setShowDuplicateModal(false);
      setDuplicateData(null);
      setAddToCartCampaign(null);
    }
  };

  const handleUpdateQty = (idx, newQty) => {
    const newCart = [...cartItems];
    const item = newCart[idx];
    if (!item) return;

    const campaign = campaigns.find((c) => c.id === item.campaignId);
    const minQty = campaign?.minQty ?? 1;
    const maxQty = campaign?.maxQty ?? 999;

    newCart[idx].qty = clampQtyValue(newQty, minQty, maxQty);
    setCartItems(newCart);
  };

  const handleRemoveItem = (idx) => {
    setCartItems(cartItems.filter((_, i) => i !== idx));
  };

  const handleSubmitCart = async (data) => {
    setSubmitting(true);
    try {
      const submitted = [];
      for (const item of data.items) {
        const campaign = campaigns.find((c) => c.id === item.campaignId);
        if (campaign) {
          try {
            await onSubmit(item.campaignId, {
              producerName: data.producerName,
              phone: data.phone,
              qty: item.qty,
              confirmedAt: new Date().toISOString().slice(0, 10),
            });
            submitted.push(item.campaignId);
          } catch (itemErr) {
            console.error(
              `Erro ao submeter pedido para ${campaign.product}:`,
              itemErr,
            );
            alert(
              `Erro ao enviar pedido para "${campaign.product}": ${itemErr.message}`,
            );
            setSubmitting(false);
            return; // Parar aqui - nao continuar com outros items
          }
        }
      }

      if (submitted.length === 0) {
        alert("Nenhum pedido foi enviado. Tente novamente.");
        setSubmitting(false);
        return;
      }

      setSuccessCount(submitted.length);
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
        className={styles.loadingState}
        role="status"
        aria-live="polite"
        aria-label="Carregando cotacoes"
      >
        <Package size={32} className={styles.loadingSpinner} />
      </div>
    );
  }

  return (
    <div className={styles.portalPage}>
      <Header
        cartCount={cartQtyTotal}
        onCartClick={() => setShowCartModal(true)}
      />

      {currentTab === "products" ? (
        <>
          {step === "success" ? (
            <SuccessView
              itemCount={successCount}
              producerName={successName}
              onReset={handleReset}
            />
          ) : (
            <div className={styles.browseContent}>
              <CategoryFilter
                categories={CATEGORIES}
                active={selectedCategory}
                onChange={setSelectedCategory}
              />

              {/* SearchBar sempre visivel */}
              <SearchBar value={searchQuery} onChange={setSearchQuery} />

              <BrowseSummary
                totalCampaigns={campaigns.length}
                visibleCampaigns={filtered.length}
                cartCount={cartQtyTotal}
              />

              {loadError && (
                <div className={styles.loadErrorBar}>
                  <span className={styles.loadErrorText}>
                    <AlertCircle size={15} />
                    {loadError}
                  </span>

                  <button
                    type="button"
                    onClick={triggerReload}
                    className={styles.retryBtn}
                  >
                    Tentar novamente
                  </button>
                </div>
              )}

              {filtered.length === 0 ? (
                <div className={styles.emptyState}>
                  <Package size={48} className={styles.emptyStateIcon} />
                  <p className={styles.emptyStateText}>
                    {searchQuery
                      ? "Nenhuma cotacao encontrada"
                      : "Nenhuma cotacao nesta categoria"}
                  </p>
                </div>
              ) : (
                <div className={styles.campaignGrid}>
                  {filtered.map((c) => (
                    <CampaignCard
                      key={c.id}
                      campaign={c}
                      onAddToCart={handleAddToCart}
                    />
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

          {showDuplicateModal && duplicateData && (
            <DuplicateItemModal
              campaign={campaigns.find(
                (c) => c.id === duplicateData.campaignId,
              )}
              newQty={duplicateData.newQty}
              existingQty={duplicateData.existingQty}
              onClose={() => {
                setShowDuplicateModal(false);
                setAddToCartCampaign(null);
              }}
              onReplace={handleReplaceItem}
              onAdd={handleAddDuplicateItem}
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
        </>
      ) : (
        <div className={styles.ordersContent}>
          <BuyerOrderStatusPage userPhone={user?.phone} embedded />
        </div>
      )}

      <div className={styles.bottomNav}>
        <button
          type="button"
          onClick={() => setCurrentTab("products")}
          className={`${styles.bottomNavBtn} ${currentTab === "products" ? styles.bottomNavBtnActive : ""}`}
        >
          <ShoppingCart size={24} />
          <span className={styles.bottomNavLabel}>Produtos</span>
        </button>

        <button
          type="button"
          onClick={() => setCurrentTab("orders")}
          className={`${styles.bottomNavBtn} ${currentTab === "orders" ? styles.bottomNavBtnActive : ""}`}
        >
          <Briefcase size={24} />
          <span className={styles.bottomNavLabel}>Meus Pedidos</span>
        </button>
      </div>
    </div>
  );
}
