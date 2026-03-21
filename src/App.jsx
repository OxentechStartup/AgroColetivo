import { useState, useEffect, useCallback } from "react";
import { Sidebar } from "./components/Sidebar";
import { Topbar } from "./components/Topbar";
import { DeleteAccountModal } from "./components/DeleteAccountModal";
import { LoadingScreen, ErrorScreen } from "./components/LoadingScreen";
import { LoginPage } from "./pages/LoginPage";
import { ConfirmEmailPage } from "./pages/ConfirmEmailPage";
import { ForgotPasswordPage } from "./pages/ForgotPasswordPage";
import { ResetPasswordPage } from "./pages/ResetPasswordPage";
import { DashboardPage } from "./pages/DashboardPage";
import { CampaignsPage } from "./pages/CampaignsPage";
import { ProducersPage } from "./pages/ProducersPage";
import { AdminPage } from "./pages/AdminPage";
import { VendorDashboardPage } from "./pages/VendorDashboardPage";
import { VendorProfilePage } from "./pages/VendorProfilePage";
import { PivoProfilePage } from "./pages/PivoProfilePage";
import { VendorPivosPage } from "./pages/VendorPivosPage";
import { ProducerPortalPage } from "./pages/ProducerPortalPage";
import { useCampaigns } from "./hooks/useCampaigns";
import { useGestores } from "./hooks/useGestores";
import { useAuth } from "./hooks/useAuth";
import { ROLES } from "./constants/roles";
import styles from "./App.module.css";

// ── Detecção de rotas especiais ───────────────────────────────────────────────
const matchRoute = (paths) =>
  paths.some(
    (p) => window.location.pathname === p || window.location.hash === `#${p}`,
  );

const isPortalRoute = () => matchRoute(["/portalforms"]);
const isConfirmEmailRoute = () => matchRoute(["/auth/confirmar-email"]);
const isForgotPasswordRoute = () => matchRoute(["/auth/recuperar-senha"]);
const isResetPasswordRoute = () => matchRoute(["/auth/resetar-senha"]);

// ── Página padrão por role ────────────────────────────────────────────────────
function defaultPage(role) {
  if (role === ROLES.VENDOR) return "vendor-dashboard";
  if (role === ROLES.ADMIN) return "admin";
  return "dashboard";
}

// ── Páginas permitidas por role ───────────────────────────────────────────────
const ALLOWED = {
  [ROLES.GESTOR]: ["dashboard", "campaigns", "producers", "pivo-profile"],
  [ROLES.VENDOR]: ["vendor-dashboard", "vendor-profile", "vendor-pivos"],
  [ROLES.ADMIN]: ["dashboard", "campaigns", "producers", "admin"],
};

const PAGE_TITLES = {
  dashboard: "Dashboard",
  campaigns: "Cotações",
  producers: "Parceiros",
  admin: "Monitoramento",
  "vendor-dashboard": "Propostas",
  "vendor-profile": "Meu Perfil",
  "vendor-pivos": "Gestores",
  "pivo-profile": "Meu Perfil",
};

// ── Sidebar Mobile com estado interno ────────────────────────────────────────
function SidebarMobile({ page, setPage, user, role, signOut, navigate }) {
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
      onProfile={() => {
        navigate(role === ROLES.VENDOR ? "vendor-profile" : "pivo-profile");
      }}
      onLogout={signOut}
    />
  );
}

// ── App principal ─────────────────────────────────────────────────────────────
export default function App() {
  const [isPortal, setIsPortal] = useState(isPortalRoute);
  const [isConfirmEmail, setIsConfirmEmail] = useState(isConfirmEmailRoute);
  const [isForgotPassword, setIsForgotPassword] = useState(
    isForgotPasswordRoute,
  );
  const [isResetPassword, setIsResetPassword] = useState(isResetPasswordRoute);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const {
    user,
    loading: authLoading,
    error: authError,
    signIn,
    signUp,
    signOut,
    deleteUserAccount,
    pendingVerificationUser,
    onEmailVerified,
    refreshUser,
  } = useAuth();

  const [page, setPageState] = useState(() => defaultPage(user?.role));

  // Campanhas e vendors
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
    publishToBuyers,
    closeToBuyers,
    publishToVendorsOnly,
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

  // Vendor atual
  const vendor =
    user?.role === ROLES.VENDOR
      ? (ownVendor ?? null)
      : (vendors?.find((v) => v.user_id === user?.id) ?? null);
  const vendorId = vendor?.id ?? null;

  // Gestores (para tela vendor-pivos)
  const { gestores, loading: gestoresLoading } = useGestores(user);

  // ── Listeners de rota ──────────────────────────────────────────────────────
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

  // Ajusta overflow no portal/login
  useEffect(() => {
    const open = isPortal || !user;
    document.body.style.overflow = open ? "auto" : "";
    document.body.style.height = open ? "auto" : "";
  }, [isPortal, user]);

  // Navega para página padrão ao trocar de conta
  useEffect(() => {
    if (user) setPageState(defaultPage(user.role));
    else setPageState("dashboard");
  }, [user?.id]);

  // ── Navegação segura ───────────────────────────────────────────────────────
  const navigate = useCallback(
    (target) => {
      if (user?.blocked && target !== "dashboard") return;
      const allowed =
        ALLOWED[user?.role ?? ROLES.GESTOR] ?? ALLOWED[ROLES.GESTOR];
      if (allowed.includes(target)) setPageState(target);
    },
    [user],
  );

  const handleDeleteAccount = useCallback(
    async (password) => {
      try {
        await deleteUserAccount(password);
        setShowDeleteModal(false);
      } catch {
        // erro gerenciado no modal
      }
    },
    [deleteUserAccount],
  );

  // ── Rotas especiais ────────────────────────────────────────────────────────
  if (isPortal) return <ProducerPortalPage onSubmit={addPendingOrder} />;
  if (isConfirmEmail) return <ConfirmEmailPage />;
  if (isForgotPassword) return <ForgotPasswordPage />;
  if (isResetPassword) return <ResetPasswordPage />;

  // Mostrar página de confirmação de email após registro ou login com email não verificado
  if (pendingVerificationUser) {
    return (
      <ConfirmEmailPage
        onVerified={onEmailVerified}
        devCode={pendingVerificationUser.devCode}
        emailSent={pendingVerificationUser.emailSent}
      />
    );
  }

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
    publishToBuyers,
    closeToBuyers,
    publishToVendorsOnly,
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

  // ── Renderiza a página ativa ───────────────────────────────────────────────
  const renderPage = () => {
    if (loading) return <LoadingScreen message="Carregando…" />;
    if (error) return <ErrorScreen message={error} onRetry={reload} />;

    const allowed = ALLOWED[role] ?? ALLOWED[ROLES.GESTOR];
    const safePage = allowed.includes(page) ? page : defaultPage(role);

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

      case "vendor-profile":
        return (
          <VendorProfilePage
            user={user}
            vendor={vendor}
            onSaved={(result) => {
              reload();
            }}
            onDeleteAccount={() => setShowDeleteModal(true)}
          />
        );

      case "pivo-profile":
        return (
          <PivoProfilePage
            user={user}
            onSaved={(result) => {
              refreshUser(result);
            }}
            onDeleteAccount={() => setShowDeleteModal(true)}
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
      {/* Sidebar desktop — sempre visível, não abre */}
      <Sidebar
        page={page}
        setPage={navigate}
        open={false}
        onClose={() => {}}
        user={user}
        blocked={user?.blocked}
        onProfile={() => {
          navigate(role === ROLES.VENDOR ? "vendor-profile" : "pivo-profile");
        }}
        onLogout={signOut}
      />
      {/* Sidebar mobile — controlada por evento */}
      <SidebarMobile
        page={page}
        setPage={navigate}
        user={user}
        role={role}
        signOut={signOut}
        navigate={navigate}
      />

      <div className={styles.main}>
        <Topbar
          title={PAGE_TITLES[page] ?? ""}
          onMenuClick={() => document.dispatchEvent(new Event("open-sidebar"))}
          onPortalClick={() => window.open("/portalforms", "_blank")}
          user={user}
          onLogout={signOut}
          onProfile={() => {
            navigate(role === ROLES.VENDOR ? "vendor-profile" : "pivo-profile");
          }}
        />
        <div className={styles.content}>{renderPage()}</div>
      </div>

      {showDeleteModal && (
        <DeleteAccountModal
          user={user}
          onDelete={handleDeleteAccount}
          onCancel={() => setShowDeleteModal(false)}
          loading={authLoading}
        />
      )}
    </div>
  );
}
