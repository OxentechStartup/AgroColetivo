import { useState } from 'react'
import { MessageCircle, MapPin, Phone, User, Search } from 'lucide-react'
import { displayPhone } from '../utils/masks'
import styles from './VendorPivosPage.module.css'

export function VendorPivosPage({ pivos = [], loading = false }) {
  const [search, setSearch] = useState('')

  const filtered = pivos.filter(p => {
    const q = search.toLowerCase()
    return !q ||
      (p.name  ?? '').toLowerCase().includes(q) ||
      (p.phone ?? '').toLowerCase().includes(q) ||
      (p.city  ?? '').toLowerCase().includes(q)
  })

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.heading}>
        <div>
          <h1>Gestores Disponíveis</h1>
          <p className="text-muted">Gestores de compras coletivas</p>
        </div>
        <div className={styles.searchBox}>
          <Search size={14} className={styles.searchIcon}/>
          <input className={styles.searchInput} placeholder="Buscar gestor…"
            value={search} onChange={e => setSearch(e.target.value)}/>
        </div>
      </div>

      {loading ? (
        <div className={styles.loading}>Carregando…</div>
      ) : filtered.length === 0 ? (
        <div className={styles.empty}>
          <User size={32} style={{opacity:.3}}/>
          <p>Nenhum gestor encontrado.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map(p => (
            <div key={p.id} className={styles.card}>
              <div className={styles.avatar}>{(p.name ?? 'P')[0].toUpperCase()}</div>
              <div className={styles.info}>
                <div className={styles.name}>{p.name}</div>
                <div className={styles.role}>
                  {p.role === 'admin' ? '⭐ Administrador' : '🌱 Gestor'}
                </div>
                {p.phone && (
                  <div className={styles.metaRow}>
                    <Phone size={11}/> {displayPhone(p.phone)}
                  </div>
                )}
                {p.city && (
                  <div className={styles.metaRow}>
                    <MapPin size={11}/> {p.city}
                  </div>
                )}
              </div>
              {p.phone && (
                <a
                  href={`https://wa.me/55${p.phone.replace(/\D/g,'')}?text=${encodeURIComponent(
                    'Olá! Sou um fornecedor cadastrado no HubCompras e gostaria de conversar sobre oportunidades de fornecimento.'
                  )}`}
                  target="_blank" rel="noreferrer"
                  className={styles.waBtn}
                >
                  <MessageCircle size={14}/> WhatsApp
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
