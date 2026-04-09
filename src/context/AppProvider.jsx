import { useState, useCallback, useMemo } from "react";
import AppContext from "./AppContext";
import { useAuth } from "../hooks/useAuth";
import { useCampaigns } from "../hooks/useCampaigns";

/**
 * AppProvider — Provedor centralizado de dados
 *
 * Gerencia em tempo real:
 * - Autenticação e perfil do usuário
 * - Campanhas e seus dados (offers, lots, orders)
 * - Notificações
 * - Subscrições Supabase em tempo real
 */

export function AppProvider({ children }) {
  const {
    user,
    loading: authLoading,
    initialized: authInitialized,
    error: authError,
    clearError: clearAuthError,
    signIn,
    signUp,
    signOut,
    deleteUserAccount,
    pendingVerificationUser,
    onEmailVerified,
    refreshUser,
  } = useAuth();

  const isAuthenticated = !!user;
  const profile = user ?? null;
  const loadingProfile = false;

  const {
    campaigns,
    vendors,
    ownVendor,
    loading: campaignsLoading,
    error: campaignsError,
    addCampaign,
    deleteCampaign,
    addOrder,
    removeOrder,
    publishToVendors,
    addPendingOrder,
    reloadCampaign,
    addVendor,
    removeVendor,
    reload,
    closeCampaign,
    finishCampaign,
    reopenCampaign,
    publishToBuyers,
    closeToBuyers,
    publishToVendorsOnly,
    approvePending,
    rejectPending,
    addLot,
    removeLot,
    saveFinancials,
  } = useCampaigns(user);

  const [notifications, setNotifications] = useState([]);

  const addNotification = useCallback((notification) => {
    const id = Date.now();
    const newNotif = { ...notification, id };

    setNotifications((prev) => [...prev, newNotif]);

    // Auto-remover após 5 segundos
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);

    return id;
  }, []);

  const contextValue = useMemo(() => {
    return {
      user,
      isAuthenticated,
      profile,
      authLoading,
      authInitialized,
      authError,
      clearAuthError,
      loadingProfile,
      signIn,
      signUp,
      signOut,
      login: signIn,
      register: signUp,
      logout: signOut,
      deleteUserAccount,
      pendingVerificationUser,
      onEmailVerified,
      refreshUser,

      campaigns,
      vendors,
      ownVendor,
      campaignsLoading,
      campaignsError,
      addCampaign,
      deleteCampaign,
      reloadCampaign,
      reload,
      closeCampaign,
      finishCampaign,
      reopenCampaign,
      publishToVendors,
      publishToBuyers,
      closeToBuyers,
      publishToVendorsOnly,
      approvePending,
      rejectPending,
      addVendor,
      removeVendor,
      deleteVendor: removeVendor,
      addLot,
      removeLot,
      saveFinancials,
      addOrder,
      removeOrder,
      deleteOrder: removeOrder,
      addPendingOrder,
      notifications,
      addNotification,
    };
  }, [
    user,
    isAuthenticated,
    profile,
    authLoading,
    authInitialized,
    authError,
    clearAuthError,
    loadingProfile,
    signIn,
    signUp,
    signOut,
    deleteUserAccount,
    pendingVerificationUser,
    onEmailVerified,
    refreshUser,
    campaigns,
    vendors,
    ownVendor,
    campaignsLoading,
    campaignsError,
    addCampaign,
    deleteCampaign,
    reloadCampaign,
    reload,
    closeCampaign,
    finishCampaign,
    reopenCampaign,
    publishToVendors,
    publishToBuyers,
    closeToBuyers,
    publishToVendorsOnly,
    approvePending,
    rejectPending,
    addVendor,
    removeVendor,
    addLot,
    removeLot,
    saveFinancials,
    addOrder,
    removeOrder,
    addPendingOrder,
    notifications,
    addNotification,
  ]);

  return (
    <AppContext.Provider value={contextValue}>{children}</AppContext.Provider>
  );
}
