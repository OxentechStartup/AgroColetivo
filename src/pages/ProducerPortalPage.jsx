import { useState, useEffect, useRef } from 'react'
import {
  Loader, CheckCircle, Phone, User, Package,
  ArrowRight, Users, Target, ChevronLeft, ChevronRight,
  CalendarDays, MapPin, Sprout, Wheat,
} from 'lucide-react'
import { ProgressBar } from '../components/ProgressBar'
import { maskPhone, unmaskPhone } from '../utils/masks'
import { daysUntilDeadline } from '../utils/data'
import { supabase } from '../lib/supabase'
import styles from './ProducerPortalPage.module.css'

// Busca TODAS as cotações abertas, sem filtro de gestor (portal é público)
async function fetchOpenCampaigns() {
  const { data, error } = await supabase
    .from('v_campaign_summary')
    .select('*')
    .in('status', ['open', 'negotiating'])
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return (data ?? []).map(row => ({
    id:         row.id,
    product:    row.product,
    unit:       row.unit,
    unitWeight: Number(row.unit_weight_kg ?? 25),
    goalQty:    Number(row.goal_qty),
    minQty:     Number(row.min_qty ?? 1),
    status:     row.status,
    deadline:   row.deadline,
    totalOrdered: Number(row.total_ordered ?? 0),
    orders:     [],   // portal não precisa de lista de produtores
  }))
}

// ── helpers de URL ────────────────────────────────────────────────────────
function getCidFromURL() {
  return new URLSearchParams(window.location.search).get('c') ?? ''
}
function setCidInURL(cid, replace = false) {
  const url = new URL(window.location.href)
  if (cid) url.searchParams.set('c', cid)
  else      url.searchParams.delete('c')
  if (replace) window.history.replaceState({ cid: cid || null }, '', url.toString())
  else         window.history.pushState({ cid: cid || null }, '', url.toString())
}

// ── formata "2025-06-30" → "30/06/2025" ─────────────────────────────────
function fmtDate(iso) {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

// ── Card de cotação ───────────────────────────────────────────────────────
function CampaignCard({ campaign, onJoin }) {
  const ordered = campaign.totalOrdered ?? 0
  const pct = campaign.goalQty > 0
    ? Math.min(100, Math.round((ordered / campaign.goalQty) * 100))
    : 0

  return (
    <div className={styles.campaignCard}>
      <div className={styles.campaignCardInner}>
        <span className={styles.campaignTag}>Cotação Aberta</span>
        <h3 className={styles.campaignCardTitle}>{campaign.product}</h3>

        <div className={styles.campaignStats}>
          <div className={styles.campaignStat}>
            <Target size={12}/><span>Meta: {campaign.goalQty} {campaign.unit}</span>
          </div>
          {campaign.deadline && (() => {
            const days = daysUntilDeadline(campaign.deadline)
            const urgent = days !== null && days <= 3 && days >= 0
            return (
              <div className={styles.campaignStat} style={urgent ? {color:'var(--red)',fontWeight:700} : {}}>
                <CalendarDays size={12}/>
                <span>{
                  days === 0 ? '⚠ Encerra hoje!' :
                  urgent ? `⚠ Encerra em ${days} dia${days > 1 ? 's' : ''}!` :
                  `Prazo: ${fmtDate(campaign.deadline)}`
                }</span>
              </div>
            )
          })()}
        </div>

        <div className={styles.campaignProgress}>
          <div className={styles.progressTrack}>
            <div className={styles.progressFill} style={{ width: `${pct}%` }}/>
          </div>
          <span className={styles.progressPct}>{pct}%</span>
        </div>
        <div className={styles.progressCaption}>
          {ordered} de {campaign.goalQty} {campaign.unit} — faltam {Math.max(0, campaign.goalQty - ordered)}
        </div>

        <button className={styles.joinBtn} onClick={() => onJoin(campaign.id)}>
          Participar desta cotação <ArrowRight size={14}/>
        </button>
      </div>
    </div>
  )
}

// ── Carrossel com autoplay a cada 5s, loop infinito ───────────────────────
function CampaignsCarousel({ campaigns, onJoin }) {
  const [idx, setIdx]       = useState(0)
  const [dir, setDir]       = useState('next') // 'next' | 'prev'
  const [animKey, setAnimKey] = useState(0)
  const timerRef            = useRef(null)
  const total               = campaigns.length

  const startTimer = () => {
    clearInterval(timerRef.current)
    if (total < 2) return
    timerRef.current = setInterval(() => {
      setDir('next')
      setIdx(i => (i + 1) % total)
      setAnimKey(k => k + 1)
    }, 5000)
  }

  useEffect(() => {
    startTimer()
    return () => clearInterval(timerRef.current)
  }, [total])

  const go = (next) => {
    const newIdx = (next + total) % total
    setDir(newIdx > idx || (idx === total - 1 && newIdx === 0) ? 'next' : 'prev')
    setIdx(newIdx)
    setAnimKey(k => k + 1)
    startTimer()
  }

  if (total === 0) return null

  return (
    <div className={styles.carousel}>
      <div className={styles.carouselHeader}>
        <span className={styles.carouselLabel}>Cotações abertas</span>
        {total > 1 && (
          <div className={styles.carouselNav}>
            <button className={styles.navBtn} onClick={() => go(idx - 1)}>
              <ChevronLeft size={14}/>
            </button>
            <div className={styles.dots}>
              {campaigns.map((_, i) => (
                <button
                  key={i}
                  className={`${styles.dot} ${i === idx ? styles.dotActive : ''}`}
                  onClick={() => go(i)}
                />
              ))}
            </div>
            <button className={styles.navBtn} onClick={() => go(idx + 1)}>
              <ChevronRight size={14}/>
            </button>
          </div>
        )}
      </div>

      {/* key={animKey} força remontagem → dispara animação CSS */}
      <div key={animKey} className={`${styles.cardSlide} ${styles[`slide_${dir}`]}`}>
        <CampaignCard campaign={campaigns[idx]} onJoin={onJoin}/>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────
export function ProducerPortalPage({ onSubmit }) {
  const initialCid  = getCidFromURL()

  // Carrega todas as cotações abertas diretamente (independente do usuário logado)
  const [allCampaigns, setAllCampaigns] = useState([])
  const [loadingCampaigns, setLoadingCampaigns] = useState(true)
  useEffect(() => {
    fetchOpenCampaigns()
      .then(setAllCampaigns)
      .catch(() => {})
      .finally(() => setLoadingCampaigns(false))
  }, [])

  // Lembra os dados do fazendeiro entre visitas
  const savedProducer = (() => {
    try { return JSON.parse(localStorage.getItem('agro_producer') ?? 'null') } catch { return null }
  })()

  const [step,   setStep]   = useState(initialCid ? 'form' : 'browse')
  const [cId,    setCId]    = useState(initialCid)
  const [name,   setName]   = useState(savedProducer?.name  ?? '')
  const [phone,  setPhone]  = useState(savedProducer?.phone ? maskPhone(savedProducer.phone) : '')
  const [qty,    setQty]    = useState('')
  const [saving, setSaving] = useState(false)
  const [error,  setError]  = useState(null)
  const [isKnown,setIsKnown]= useState(!!savedProducer)

  const open    = allCampaigns
  const active  = open.find(c => c.id === cId) ?? null
  const orderedInActive = active ? active.totalOrdered : 0
  const tons    = active && qty ? ((+qty * (active.unitWeight ?? 25)) / 1000).toFixed(2) : null
  const minQty  = active?.minQty ?? 1
  const maxQty  = active?.maxQty ?? null
  const qtyNum  = +qty
  const qtyOk   = qtyNum >= minQty && (maxQty === null || qtyNum <= maxQty)
  const canSend = active && name.trim().length > 1 && qtyOk

  // Sincroniza estado com o botão Voltar/Avançar do navegador
  useEffect(() => {
    const onPop = () => {
      const cid = getCidFromURL()
      setCId(cid)
      setStep(cid ? 'form' : 'browse')
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [])

  // Participar de uma cotação → muda URL para /portalforms?c=ID
  const handleJoin = (id) => {
    setCId(id)
    setCidInURL(id)
    setStep('form')
  }

  const handleBack = () => {
    setCidInURL('')
    setStep('browse')
  }

  const handleSubmit = async () => {
    if (!canSend) return
    setSaving(true); setError(null)
    try {
      const cleanPhone = unmaskPhone(phone)
      // Salva dados do produtor para próxima visita
      localStorage.setItem('agro_producer', JSON.stringify({ name: name.trim(), phone: cleanPhone }))
      await onSubmit(cId, {
        producerName: name.trim(),
        phone:        cleanPhone,
        qty:          +qty,
        confirmedAt:  new Date().toISOString().slice(0, 10),
      })
      setCidInURL('')
      setStep('done')
    } catch (e) { setError(e.message) }
    finally     { setSaving(false) }
  }

  const reset = () => {
    setStep('browse'); setCId(''); setName(''); setPhone(''); setQty(''); setError(null)
    setCidInURL('')
  }

  // ── Sucesso ──────────────────────────────────────────────────────────────
  if (step === 'done') return (
    <div className={styles.portal}>
      <Bg/><Header/>
      <div className={styles.centerWrap}>
        <div className={styles.successCard}>
          <CheckCircle size={48} className={styles.successIcon}/>
          <h2>Pedido enviado!</h2>
          <p>Recebido com sucesso. O gestor confirma via WhatsApp em breve.</p>
          <button className={styles.resetBtn} onClick={reset}>Fazer outro pedido</button>
        </div>
      </div>
      <Footer/>
    </div>
  )

  // ── Formulário ───────────────────────────────────────────────────────────
  if (step === 'form') return (
    <div className={styles.portal}>
      <Bg/><Header/>
      <div className={styles.formWrap}>
        <button className={styles.backBtn} onClick={handleBack}>
          <ChevronLeft size={14}/> Voltar
        </button>

        <div className={styles.formCard}>
          {active && (
            <div className={styles.formBadge}>
              <span className={styles.formBadgeName}>{active.product}</span>
              <span className={styles.formBadgeSub}>meta: {active.goalQty} {active.unit}</span>
            </div>
          )}

          <h2 className={styles.formTitle}>Registrar Pedido</h2>
          <p className={styles.formSub}>Preencha os dados. O gestor confirma via WhatsApp.</p>

          {isKnown && (
            <div style={{
              display:'flex', alignItems:'center', gap:8,
              background:'var(--primary-dim)', border:'1px solid var(--primary-border)',
              borderRadius:'var(--r)', padding:'9px 14px',
              fontSize:'.8rem', color:'var(--primary)', marginBottom:4,
            }}>
              <span style={{fontSize:'1rem'}}>👋</span>
              <span>Bem-vindo de volta, <strong>{name}</strong>! Seus dados foram preenchidos automaticamente.</span>
              <button style={{
                marginLeft:'auto', background:'none', border:'none', cursor:'pointer',
                fontSize:'.7rem', color:'var(--text3)', textDecoration:'underline',
              }} onClick={() => { setName(''); setPhone(''); setIsKnown(false) }}>
                Trocar
              </button>
            </div>
          )}

          {/* Select manual só se não veio do carrossel */}
          {!cId && (
            <div className="form-group">
              <label className="form-label">Cotação</label>
              <select className="form-select" value={cId}
                onChange={e => { setCId(e.target.value); setCidInURL(e.target.value) }}>
                <option value="">— Selecione —</option>
                {open.map(c => <option key={c.id} value={c.id}>{c.product}</option>)}
              </select>
            </div>
          )}

          {active && (
            <div className={styles.formProgress}>
              <ProgressBar value={orderedInActive} goal={active.goalQty} unit={active.unit}/>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">
              <User size={11} style={{marginRight:5,verticalAlign:'middle'}}/>
              Nome completo
            </label>
            <input className="form-input" placeholder="João Ferreira"
              value={name} onChange={e => setName(e.target.value)} autoFocus/>
          </div>

          <div className="form-group">
            <label className="form-label">
              <Phone size={11} style={{marginRight:5,verticalAlign:'middle'}}/>
              WhatsApp
            </label>
            <input className="form-input" placeholder="(38) 99123-4567"
              value={phone} onChange={e => setPhone(maskPhone(e.target.value))} inputMode="tel"/>
            <span className="form-hint">Para avisar sobre preço e confirmação.</span>
          </div>

          {active && (
            <div className="form-group">
              <label className="form-label">
                <Package size={11} style={{marginRight:5,verticalAlign:'middle'}}/>
                Quantidade ({active.unit})
                {minQty > 1 && <span style={{color:'var(--text3)',fontWeight:400}}> · mín. {minQty}</span>}
                {maxQty && <span style={{color:'var(--text3)',fontWeight:400}}> · máx. {maxQty}</span>}
              </label>
              <input type="number" className={`form-input ${styles.qtyInput}`}
                placeholder={maxQty ? `${minQty}–${maxQty}` : `Mín. ${minQty}`}
                value={qty} min={minQty} max={maxQty ?? undefined}
                onChange={e => setQty(e.target.value)} inputMode="numeric"/>
              {qty && qtyNum < minQty && (
                <span className="form-hint" style={{color:'var(--red)'}}>Mínimo: {minQty} {active.unit}</span>
              )}
              {qty && maxQty && qtyNum > maxQty && (
                <span className="form-hint" style={{color:'var(--red)'}}>Máximo: {maxQty} {active.unit}</span>
              )}
              {tons && qtyOk && <span className="form-hint" style={{color:'var(--amber)'}}>≈ {tons} toneladas</span>}
            </div>
          )}

          {error && <div className={styles.errBox}>{error}</div>}

          <button className={styles.submitBtn} disabled={!canSend || saving} onClick={handleSubmit}>
            {saving
              ? <Loader size={16} className={styles.spin}/>
              : <>Enviar Pedido <ArrowRight size={15}/></>}
          </button>
        </div>
      </div>
      <Footer/>
    </div>
  )

  // ── Browse (página inicial) ──────────────────────────────────────────────
  return (
    <div className={styles.portal}>
      <Bg/><Header/>

      <div className={styles.hero}>
        <span className={styles.heroTag}><MapPin size={12}/> Tabuleiro do Norte, CE</span>
        <h1 className={styles.heroTitle}>Compras Coletivas</h1>
        <p className={styles.heroSub}>Unidos compramos melhor. Participe do grupo e economize.</p>
      </div>

      <div className={styles.browseWrap}>
        {loadingCampaigns ? (
          <div className={styles.empty}>
            <Loader size={28} className={styles.spin} style={{color:'var(--primary)'}}/>
            <p>Carregando cotações…</p>
          </div>
        ) : open.length > 0 ? (
          <CampaignsCarousel campaigns={open} onJoin={handleJoin}/>
        ) : (
          <div className={styles.empty}>
            <Sprout size={32} style={{color:'var(--text3)'}}/>
            <p>Nenhuma cotação aberta no momento.</p>
            <span className={styles.emptySub}>Volte em breve ou contate o gestor.</span>
          </div>
        )}

        <button className={styles.manualBtn} onClick={() => setStep('form')}>
          Registrar pedido manualmente
        </button>
      </div>

      <Footer/>
    </div>
  )
}

function Bg() {
  return (
    <div className={styles.bg}>
      <div className={styles.glow1}/>
      <div className={styles.glow2}/>
    </div>
  )
}

function Header() {
  return (
    <header className={styles.header}>
      <img src="https://i.imgur.com/clDJyAh.png" alt="AgroColetivo" width="32" height="32" style={{ borderRadius: 8, objectFit: "cover" }}/>
      <span className={styles.logoText}>AgroColetivo</span>
    </header>
  )
}

function Footer() {
  return <p className={styles.footer}>AgroColetivo · Coordenação Tabuleiro do Norte/CE</p>
}
