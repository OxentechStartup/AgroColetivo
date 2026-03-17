import { useState, useEffect } from "react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { LoadingScreen, ErrorScreen } from "./components/LoadingScreen";
import { LoginPage } from "./pages/LoginPage";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { ProducersPage } from "./pages/ProducersPage";
import { AdminPage } from "./pages/AdminPage";
import { FinancialPage } from "./pages/FinancialPage";
import { VendorDashboardPage } from "./pages/VendorDashboardPage";
import { VendorProductsPage } from "./pages/VendorProductsPage";
import { VendorProfilePage } from "./pages/VendorProfilePage";
import { VendorPivosPage } from "./pages/VendorPivosPage";
import { ProducerPortalPage } from "./pages/ProducerPortalPage";
import { useCampaigns } from "./hooks/useCampaigns";
import { useVendorProducts } from "./hooks/useVendorProducts";
import { useGestores } from "./hooks/useGestores";
import { useAuth } from "./hooks/useAuth";
import { ROLES } from "./constants/roles";
import styles from "./App.module.css";

const isPortalRoute = () =>
  window.location.pathname === "/portalforms" ||
  window.location.hash === "#/portalforms";

const isConfirmEmailRoute = () =>
  window.location.pathname === "/auth/confirmar-email" ||
  window.location.hash === "#/auth/confirmar-email";

const isForgotPasswordRoute = () =>
  window.location.pathname === "/auth/recuperar-senha" ||
  window.location.hash === "#/auth/recuperar-senha";

const isResetPasswordRoute = () =>
  window.location.pathname === "/auth/resetar-senha" ||
  window.location.hash === "#/auth/resetar-senha";

function defaultPageForRole(role) {
  if (role === ROLES.VENDOR) return "vendor-dashboard";
  if (role === ROLES.ADMIN) return "admin";
  return "dashboard";
}

const ALLOWED = {
  [ROLES.GESTOR]: ["dashboard", "campaigns", "producers", "financial"],
  [ROLES.VENDOR]: [
    "vendor-dashboard",
    "vendor-profile",
    "vendor-products",
    "vendor-pivos",
  ],
  [ROLES.ADMIN]: ["dashboard", "campaigns", "producers", "admin", "financial"],
};

const PAGE_TITLES = {
  dashboard: "Dashboard",
  campaigns: "Cotações",
  producers: "Parceiros",
  admin: "Monitoramento Financeiro",
  financial: "Financeiro",
  "vendor-dashboard": "Propostas",
  "vendor-profile": "Meu Perfil",
  "vendor-products": "Meus Produtos",
  "vendor-pivos": "Gestores",
};

// ── Sidebar Mobile ───────────────────────────────────────────────────────────
function SidebarMobile({ page, setPage, user }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const h = () => setOpen(true);
    document.addEventListener("open-sidebar", h);
    return () => document.removeEventListener("open-sidebar", h);
  }, []);
  return (
    <Sidebar
      page={page}
      setPage={setPage}
      open={open}
      onClose={() => setOpen(false)}
      user={user}
      blocked={user?.blocked}
    />
  );
}

export default function App() {
  const [isPortal, setIsPortal] = useState(isPortalRoute);
  const [isConfirmEmail, setIsConfirmEmail] = useState(isConfirmEmailRoute);
  const [isForgotPassword, setIsForgotPassword] = useState(
    isForgotPasswordRoute,
  );
  const [isResetPassword, setIsResetPassword] = useState(isResetPasswordRoute);
  const {
    user,
    loading: authLoading,
    error: authError,
    signIn,
    signUp,
    signOut,
  } = useAuth();
  const [page, setPage] = useState(() => defaultPageForRole(user?.role));

  // ── Estado global de campanhas / vendors
  const {
    campaigns,
    vendors,
    loading,
    error,
    reload,
    addCampaign,
    addOrder,
    removeOrder,
    saveFinancials,
    closeCampaign,
    finishCampaign,
    reopenCampaign,
    publishToVendors,
    deleteCampaign,
    addPendingOrder,
    approvePending,
    rejectPending,
    addLot,
    removeLot,
    addVendor,
    removeVendor,
    reloadCampaign,
    ownVendor,
  } = useCampaigns(user);

  // ── Estado global de produtos do fornecedor (só ativo para vendors)
  // For vendor role: use ownVendor (their own record fetched directly)
  // For gestor/admin: find in vendors array
  const vendor =
    user?.role === ROLES.VENDOR
      ? (ownVendor ?? null)
      : (vendors?.find((v) => v.user_id === user?.id) ?? null);
  const vendorId = vendor?.id ?? null;
  const {
    products,
    loading: productsLoading,
    saveProduct,
    removeProduct,
    addPromo,
    removePromo,
  } = useVendorProducts(user?.role === ROLES.VENDOR ? vendorId : null);

  // ── Lista de gestores (para a página vendor-pivos)
  const { gestores, loading: gestoresLoading } = useGestores(user);

  // ── Vendor profile: atualiza vendor local no array sem reload
  const handleVendorUpdate = (updated) => {
    reload();
  };

  // listeners de rota
  useEffect(() => {
    const check = () => {
      setIsPortal(isPortalRoute());
      setIsConfirmEmail(isConfirmEmailRoute());
      setIsForgotPassword(isForgotPasswordRoute());
      setIsResetPassword(isResetPasswordRoute());
    };
    window.addEventListener("hashchange", check);
    window.addEventListener("popstate", check);
    return () => {
      window.removeEventListener("hashchange", check);
      window.removeEventListener("popstate", check);
    };
  }, []);

  useEffect(() => {
    const open = isPortal || !user;
    document.body.style.overflow = open ? "auto" : "";
    document.body.style.height = open ? "auto" : "";
  }, [isPortal, user]);

  useEffect(() => {
    if (user) {
      // Novo usuário logado: navega para a página padrão do seu papel
      setPage(defaultPageForRole(user.role));
    } else {
      // Usuário deslogado: garante que a página volta ao estado neutro
      setPage("dashboard");
    }
  }, [user?.id]); // ← depende do ID, não só do role — detecta troca de conta

  const navigate = (target) => {
    if (user?.blocked && target !== "dashboard") return;
    const allowed =
      ALLOWED[user?.role ?? ROLES.GESTOR] ?? ALLOWED[ROLES.GESTOR];
    if (allowed.includes(target)) setPage(target);
  };

  if (isPortal) return <ProducerPortalPage onSubmit={addPendingOrder} />;
  if (isConfirmEmail) return <ConfirmEmailPage />;
  if (isForgotPassword) return <ForgotPasswordPage />;
  if (isResetPassword) return <ResetPasswordPage />;
  if (!user)
    return (
      <LoginPage
        onLogin={signIn}
        onRegister={signUp}
        loading={authLoading}
        error={authError}
      />
    );

  const role = user.role ?? ROLES.GESTOR;

  const campaignActions = {
    addCampaign,
    addOrder,
    removeOrder,
    saveFinancials,
    closeCampaign,
    finishCampaign,
    reopenCampaign,
    publishToVendors,
    deleteCampaign,
    approvePending,
    rejectPending,
    addLot,
    removeLot,
    addVendor,
    removeVendor,
    reload,
    reloadCampaign,
  };

  const renderPage = () => {
    if (loading) return <LoadingScreen message="Carregando…" />;
    if (error) return <ErrorScreen message={error} onRetry={reload} />;

    const allowed = ALLOWED[role] ?? ALLOWED[ROLES.GESTOR];
    const safePage = allowed.includes(page) ? page : defaultPageForRole(role);

    switch (safePage) {
      case "dashboard":
        return (
          <DashboardPage campaigns={campaigns} setPage={navigate} user={user} />
        );

      case "campaigns":
        return (
          <CampaignsPage
            campaigns={campaigns}
            vendors={vendors}
            actions={campaignActions}
            user={user}
            setPage={navigate}
          />
        );

      case "producers":
        return (
          <ProducersPage
            campaigns={campaigns}
            vendors={vendors}
            actions={campaignActions}
            user={user}
          />
        );

      case "admin":
        return (
          <AdminPage
            campaigns={campaigns}
            actions={campaignActions}
            reload={reload}
          />
        );

      case "vendor-dashboard":
        return (
          <VendorDashboardPage
            campaigns={campaigns}
            vendors={vendors}
            vendor={vendor}
            user={user}
          />
        );

      case "vendor-products":
        return (
          <VendorProductsPage
            user={user}
            vendor={vendor}
            products={products}
            loading={productsLoading}
            onSave={saveProduct}
            onDelete={removeProduct}
            onAddPromo={addPromo}
            onDeletePromo={removePromo}
          />
        );

      case "vendor-profile":
        return (
          <VendorProfilePage
            user={user}
            vendor={vendor}
            onSaved={handleVendorUpdate}
          />
        );

      case "financial":
        return (
          <FinancialPage
            campaigns={campaigns}
            actions={campaignActions}
            onBack={() => navigate("campaigns")}
          />
        );

      case "vendor-pivos":
        return <VendorPivosPage pivos={gestores} loading={gestoresLoading} />;

      default:
        return (
          <DashboardPage campaigns={campaigns} setPage={navigate} user={user} />
        );
    }
  };

  return (
    <div className={styles.app}>
      <Sidebar
        page={page}
        setPage={navigate}
        open={false}
        onClose={() => {}}
        user={user}
        blocked={user?.blocked}
      />
      <SidebarMobile page={page} setPage={navigate} user={user} />
      <div className={styles.main}>
        <Topbar
          title={PAGE_TITLES[page] ?? ""}
          onMenuClick={() => document.dispatchEvent(new Event("open-sidebar"))}
          onPortalClick={() => window.open("/portalforms", "_blank")}
          user={user}
          onLogout={signOut}
          onProfile={() => navigate("vendor-profile")}
        />
        <div className={styles.content}>{renderPage()}</div>
      </div>
    </div>
  );
}
