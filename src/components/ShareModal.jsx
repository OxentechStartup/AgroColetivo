import { useState } from 'react'
import { Copy, Check, Users } from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './ui/Modal'
import { Button } from './ui/Button'
import { totalOrdered, generateShareLink } from '../utils/data'

export function ShareModal({ campaign, onClose }) {
  const [copied, setCopied] = useState(false)

  const link  = generateShareLink(campaign.slug)
  const total = totalOrdered(campaign)
  const tons  = ((total * (campaign.unitWeight ?? 25)) / 1000).toFixed(2)
  const orders = campaign.orders ?? []

  const copy = () => {
    navigator.clipboard?.writeText(link).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2500)
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Compartilhar com Compradores" onClose={onClose}/>
      <ModalBody>
        <p style={{fontSize:'.84rem',color:'var(--text2)',marginBottom:14,lineHeight:1.5}}>
          Envie este link para os compradores fazerem seus pedidos de{' '}
          <strong style={{color:'var(--text)'}}>{campaign.product}</strong>.
        </p>

        {/* Link */}
        <div style={{display:'flex',gap:8,marginBottom:16}}>
          <code style={{
            flex:1, background:'var(--surface2)', border:'1px solid var(--border)',
            borderRadius:'var(--r)', padding:'9px 13px',
            fontSize:'.78rem', color:'var(--text2)', wordBreak:'break-all',
          }}>
            {link}
          </code>
          <Button variant="outline" size="sm" onClick={copy} title={copied ? 'Copiado!' : 'Copiar link'}>
            {copied ? <Check size={14} color="var(--primary)"/> : <Copy size={14}/>}
          </Button>
        </div>

        {/* Resumo */}
        <div style={{
          background:'var(--surface2)', border:'1px solid var(--border)',
          borderRadius:'var(--r-lg)', padding:'12px 16px',
          display:'flex', gap:24,
        }}>
          {[
            ['Total pedido', `${total} ${campaign.unit}`],
            ['Toneladas',    `${tons} t`],
            ['Compradores',  orders.length],
          ].map(([l, v]) => (
            <div key={l}>
              <div style={{fontSize:'.68rem',color:'var(--text3)',textTransform:'uppercase',letterSpacing:'.06em',fontWeight:700}}>{l}</div>
              <div style={{fontWeight:700,color:'var(--text)',fontSize:'1rem'}}>{v}</div>
            </div>
          ))}
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Fechar</Button>
        <Button variant="primary" onClick={copy}>
          {copied ? <><Check size={13}/> Copiado!</> : <><Copy size={13}/> Copiar link</>}
        </Button>
      </ModalFooter>
    </Modal>
  )
}
