import { useState, useEffect } from 'react'
import { Sidebar }             from './components/Sidebar'
import { Topbar }              from './components/Topbar'
import { LoadingScreen, ErrorScreen } from './components/LoadingScreen'
import { LoginPage }           from './pages/LoginPage'
import { DashboardPage }       from './pages/DashboardPage'
import { CampaignsPage }       from './pages/CampaignsPage'
import { ProducersPage }       from './pages/ProducersPage'
import { AdminPage }           from './pages/AdminPage'
import { VendorDashboardPage } from './pages/VendorDashboardPage'
import { VendorProductsPage }  from './pages/VendorProductsPage'
import { VendorPivosPage }     from './pages/VendorPivosPage'
import { VendorProfilePage }   from './pages/VendorProfilePage'
import { ProducerPortalPage }  from './pages/ProducerPortalPage'
import { useCampaigns }        from './hooks/useCampaigns'
import { useVendorProducts }   from './hooks/useVendorProducts'
import { usePivos }            from './hooks/usePivos'
import { useAuth }             from './hooks/useAuth'
import styles from './App.module.css'

const isPortalRoute = () =>
  window.location.pathname === '/portalforms' ||
  window.location.hash === '#/portalforms'

function defaultPageForRole(role) {
  if (role === 'vendor') return 'vendor-dashboard'
  if (role === 'admin')  return 'admin'
  return 'dashboard'
}

const ALLOWED = {
  pivo:   ['dashboard', 'campaigns', 'producers'],
  vendor: ['vendor-dashboard', 'vendor-products', 'vendor-pivos', 'vendor-profile'],
  admin:  ['dashboard', 'campaigns', 'producers', 'admin'],
}

const PAGE_TITLES = {
  dashboard:          'Dashboard',
  campaigns:          'Cotações',
  producers:          'Produtores',
  admin:              'Monitoramento Financeiro',
  'vendor-dashboard': 'Cotações Disponíveis',
  'vendor-products':  'Meus Produtos',
  'vendor-pivos':     'Pivôs',
  'vendor-profile':   'Meu Perfil',
}

export default function App() {
  const [isPortal, setIsPortal] = useState(isPortalRoute)
  const { user, loading: authLoading, error: authError, signIn, signUp, signOut } = useAuth()
  const [page, setPage] = useState(() => defaultPageForRole(user?.role))

  // ── Estado global de campanhas / vendors
  const {
    campaigns, vendors,
    loading, error, reload,
    addCampaign, addOrder, removeOrder, saveFinancials,
    closeCampaign, reopenCampaign, deleteCampaign,
    addPendingOrder, approvePending, rejectPending,
    addLot, removeLot, addVendor, removeVendor,
  } = useCampaigns(user)

  // ── Estado global de produtos do fornecedor (só ativo para vendors)
  const vendor     = vendors?.find(v => v.user_id === user?.id) ?? null
  const vendorId   = vendor?.id ?? null
  const {
    products, loading: productsLoading,
    saveProduct, removeProduct, addPromo, removePromo,
  } = useVendorProducts(user?.role === 'vendor' ? vendorId : null)

  // ── Estado global de pivôs (só ativo para vendors)
  const { pivos, loading: pivosLoading } = usePivos()

  // ── Vendor profile: atualiza vendor local no array sem reload
  const handleVendorUpdate = (updated) => {
    // vendors vem do useCampaigns; atualizamos o estado de campaigns indiretamente
    // como vendors é array simples, fazemos reload leve só de vendors
    reload()
  }

  // listeners de rota
  useEffect(() => {
    const check = () => setIsPortal(isPortalRoute())
    window.addEventListener('hashchange', check)
    window.addEventListener('popstate',   check)
    return () => {
      window.removeEventListener('hashchange', check)
      window.removeEventListener('popstate',   check)
    }
  }, [])

  useEffect(() => {
    const open = isPortal || !user
    document.body.style.overflow = open ? 'auto' : ''
    document.body.style.height   = open ? 'auto' : ''
  }, [isPortal, user])

  useEffect(() => {
    if (user) {
      // Novo usuário logado: navega para a página padrão do seu papel
      setPage(defaultPageForRole(user.role))
    } else {
      // Usuário deslogado: garante que a página volta ao estado neutro
      setPage('dashboard')
    }
  }, [user?.id])  // ← depende do ID, não só do role — detecta troca de conta

  const navigate = (target) => {
    if (user?.blocked && target !== 'dashboard') return
    const allowed = ALLOWED[user?.role ?? 'pivo'] ?? ALLOWED.pivo
    if (allowed.includes(target)) setPage(target)
  }

  if (isPortal) return <ProducerPortalPage onSubmit={addPendingOrder}/>
  if (!user)    return <LoginPage onLogin={signIn} onRegister={signUp} loading={authLoading} error={authError}/>

  const role = user.role ?? 'pivo'

  const campaignActions = {
    addCampaign, addOrder, removeOrder, saveFinancials,
    closeCampaign, reopenCampaign, deleteCampaign,
    approvePending, rejectPending,
    addLot, removeLot, addVendor, removeVendor,
  }

  const renderPage = () => {
    if (loading) return <LoadingScreen message="Carregando…"/>
    if (error)   return <ErrorScreen  message={error} onRetry={reload}/>

    const allowed  = ALLOWED[role] ?? ALLOWED.pivo
    const safePage = allowed.includes(page) ? page : defaultPageForRole(role)

    switch (safePage) {
      case 'dashboard':
        return <DashboardPage campaigns={campaigns} setPage={navigate} user={user}/>

      case 'campaigns':
        return <CampaignsPage campaigns={campaigns} vendors={vendors} actions={campaignActions} user={user}/>

      case 'producers':
        return <ProducersPage campaigns={campaigns}/>

      case 'admin':
        return <AdminPage campaigns={campaigns}/>

      case 'vendor-dashboard':
        return <VendorDashboardPage campaigns={campaigns} vendors={vendors} user={user}/>

      case 'vendor-products':
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
        )

      case 'vendor-pivos':
        return <VendorPivosPage pivos={pivos} loading={pivosLoading}/>

      case 'vendor-profile':
        return <VendorProfilePage user={user} vendor={vendor} onSaved={handleVendorUpdate}/>

      default:
        return <DashboardPage campaigns={campaigns} setPage={navigate} user={user}/>
    }
  }

  return (
    <div className={styles.app}>
      <Sidebar page={page} setPage={navigate} open={false} onClose={() => {}} user={user} blocked={user?.blocked}/>
      <SidebarMobile page={page} setPage={navigate} user={user}/>
      <div className={styles.main}>
        <Topbar
          title={PAGE_TITLES[page] ?? ''}
          onMenuClick={() => document.dispatchEvent(new Event('open-sidebar'))}
          onPortalClick={() => window.open('/portalforms', '_blank')}
          user={user}
          onLogout={() => signOut()}
          onProfile={() => navigate('vendor-profile')}
        />
        <div className={styles.content}>{renderPage()}</div>
      </div>
    </div>
  )
}

function SidebarMobile({ page, setPage, user }) {
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const h = () => setOpen(true)
    document.addEventListener('open-sidebar', h)
    return () => document.removeEventListener('open-sidebar', h)
  }, [])
  return <Sidebar page={page} setPage={setPage} open={open} onClose={() => setOpen(false)} user={user} blocked={user?.blocked}/>
}
