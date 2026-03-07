import { useState, useEffect } from 'react'
import { Sidebar }            from './components/Sidebar'
import { Topbar }             from './components/Topbar'
import { LoadingScreen, ErrorScreen } from './components/LoadingScreen'
import { LoginPage }          from './pages/LoginPage'
import { DashboardPage }      from './pages/DashboardPage'
import { CampaignsPage }      from './pages/CampaignsPage'
import { ProducersPage }      from './pages/ProducersPage'
import { VendorsPage }        from './pages/VendorsPage'
import { ProducerPortalPage } from './pages/ProducerPortalPage'
import { useCampaigns }       from './hooks/useCampaigns'
import { useAuth }            from './hooks/useAuth'
import styles from './App.module.css'

const isPortalRoute = () =>
  window.location.pathname === '/portalforms' ||
  window.location.hash === '#/portalforms'

export default function App() {
  const [page,        setPage]        = useState('dashboard')
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [isPortal,    setIsPortal]    = useState(isPortalRoute)

  const { user, loading: authLoading, error: authError, signIn, signOut } = useAuth()

  const {
    campaigns, vendors,
    loading, error, reload,
    addCampaign, addOrder, removeOrder,
    saveFinancials,
    closeCampaign, reopenCampaign,
    addPendingOrder, approvePending, rejectPending,
    addLot, removeLot, deleteCampaign,
    addVendor, removeVendor,
  } = useCampaigns()

  useEffect(() => {
    const check = () => setIsPortal(isPortalRoute())
    window.addEventListener('hashchange', check)
    window.addEventListener('popstate', check)
    return () => {
      window.removeEventListener('hashchange', check)
      window.removeEventListener('popstate', check)
    }
  }, [])

  // ── PORTAL PÚBLICO ──────────────────────────────────────────────────────
  // Portal público: libera scroll do body (admin usa overflow:hidden)
  useEffect(() => {
    if (isPortal) {
      document.body.style.overflow = 'auto'
      document.body.style.height   = 'auto'
    } else {
      document.body.style.overflow = ''
      document.body.style.height   = ''
    }
  }, [isPortal])

  if (isPortal) {
    return <ProducerPortalPage campaigns={campaigns} onSubmit={addPendingOrder} />
  }

  // ── LOGIN ───────────────────────────────────────────────────────────────
  if (!user) {
    return <LoginPage onLogin={signIn} loading={authLoading} error={authError} />
  }

  // ── ADMIN ───────────────────────────────────────────────────────────────
  const campaignActions = {
    addCampaign, addOrder, removeOrder,
    saveFinancials,
    closeCampaign, reopenCampaign,
    approvePending, rejectPending,
    addLot, removeLot, deleteCampaign,
  }

  return (
    <div className={styles.app}>
      <Sidebar
        page={page}
        setPage={setPage}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      <div className={styles.main}>
        <Topbar
          page={page}
          onMenuClick={() => setSidebarOpen(true)}
          onPortalClick={() => window.open('/portalforms', '_blank')}
          user={user}
          onLogout={signOut}
        />

        <div className={styles.content}>
          {loading && <LoadingScreen message="Conectando ao Supabase…" />}
          {!loading && error && <ErrorScreen message={error} onRetry={reload} />}
          {!loading && !error && <>
            {page === 'dashboard' && <DashboardPage campaigns={campaigns} setPage={setPage} />}
            {page === 'campaigns' && <CampaignsPage campaigns={campaigns} vendors={vendors} actions={campaignActions} />}
            {page === 'producers' && <ProducersPage campaigns={campaigns} />}
            {page === 'vendors'   && <VendorsPage   vendors={vendors} campaigns={campaigns} actions={{ addVendor, removeVendor }} />}
          </>}
        </div>
      </div>
    </div>
  )
}
