import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Modal, ModalHeader, ModalBody } from './Modal'
import { Button } from './Button'
import { totalOrdered, generateShareLink, buildWhatsAppMsg } from '../utils/data'

export function ShareModal({ campaign, onClose }) {
  const [copied, setCopied] = useState(false)

  const link   = generateShareLink(campaign.slug)
  const msg    = buildWhatsAppMsg(campaign)
  const waLink = `https://wa.me/?text=${encodeURIComponent(msg)}`
  const total  = totalOrdered(campaign)
  const tons   = ((total * campaign.unitWeight) / 1000).toFixed(2)

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Compartilhar Cotação" onClose={onClose} />
      <ModalBody>
        <p style={{ fontSize: '.82rem', color: 'var(--text2)', marginBottom: 8, fontWeight: 600 }}>
          Link para os produtores
        </p>
        <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
          <code style={{ flex: 1, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r)', padding: '8px 12px', fontSize: '.78rem', color: 'var(--text2)', wordBreak: 'break-all' }}>
            {link}
          </code>
          <Button variant="outline" size="sm" onClick={copy}>
            {copied ? <Check size={14} /> : <Copy size={14} />}
          </Button>
        </div>

        <div style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 24 }}>
          {[['Total pedido', `${total} ${campaign.unit}`], ['Toneladas', `${tons} t`], ['Produtores', campaign.orders.length]].map(([l,v]) => (
            <div key={l}>
              <div style={{ fontSize: '.68rem', color: 'var(--text3)', textTransform: 'uppercase', letterSpacing: '.06em', fontWeight: 700 }}>{l}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontWeight: 700, color: 'var(--text)', fontSize: '1rem' }}>{v}</div>
            </div>
          ))}
        </div>

        <Button variant="whatsapp" block href={waLink} target="_blank" rel="noopener noreferrer">
          💬 Enviar ao Fornecedor via WhatsApp
        </Button>
      </ModalBody>
    </Modal>
  )
}
