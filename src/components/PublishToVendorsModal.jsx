/**
 * PublishToVendorsModal
 * Permite o gestor escolher quais fornecedores receberão a cotação,
 * muda o status para 'negotiating' e abre o WhatsApp para cada um.
 */
import { useState } from 'react'
import { MessageCircle, Check, Store, Phone, MapPin, AlertCircle, Send } from 'lucide-react'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { Button } from './Button'
import { buildWhatsAppMsg } from '../utils/data'
import { displayPhone, unmaskPhone } from '../utils/masks'
import { notifyVendorNewProposal } from '../lib/notifications'

export function PublishToVendorsModal({ campaign, vendors, onPublish, onClose }) {
  // Começa com todos selecionados
  const [selected, setSelected] = useState(() => new Set(vendors.map(v => v.id)))
  const [published, setPublished] = useState(false)
  const [publishing, setPublishing] = useState(false)
  const [sentIds, setSentIds]   = useState(new Set())

  const toggle = (id) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const selectAll   = () => setSelected(new Set(vendors.map(v => v.id)))
  const deselectAll = () => setSelected(new Set())

  const handlePublish = async () => {
    if (selected.size === 0) return
    setPublishing(true)
    try {
      await onPublish(campaign.id)
      
      // Enviar emails para os fornecedores selecionados
      const campaignLink = `${window.location.origin}/#campaigns`
      const selectedVendorsList = vendors.filter(v => selected.has(v.id))
      
      for (const vendor of selectedVendorsList) {
        // Enviar email se o vendor tiver um email configurado
        if (vendor.email) {
          notifyVendorNewProposal(
            vendor.email,
            vendor.name,
            {
              productName: campaign.product,
              quantity: campaign.goalQty || '?',
              unit: campaign.unit || 'unidades',
              deadline: campaign.deadline || 'A combinar',
              campaignName: campaign.product,
              campaignLink,
            }
          ).catch(err => console.warn(`⚠️ Não foi possível enviar email para ${vendor.name}:`, err))
        } else {
          console.warn(`⚠️ Vendor ${vendor.name} não tem email configurado`)
        }
      }
      
      setPublished(true)
    } catch (e) {
      alert('Erro ao publicar: ' + e.message)
    } finally {
      setPublishing(false)
    }
  }

  const sendWa = (vendor) => {
    const msg   = buildWhatsAppMsg(campaign, vendor)
    const phone = unmaskPhone(vendor.phone ?? '')
    window.open(`https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`, '_blank')
    setSentIds(prev => new Set([...prev, vendor.id]))
  }

  const selectedVendors = vendors.filter(v => selected.has(v.id))
  const allSent = published && selectedVendors.every(v => sentIds.has(v.id))

  return (
    <Modal onClose={onClose}>
      <ModalHeader
        title={published ? 'Enviar para Fornecedores' : 'Escolher Fornecedores'}
        onClose={onClose}
      />
      <ModalBody>

        {!published ? (
          <>
            {/* Etapa 1: Selecionar fornecedores */}
            <p style={{fontSize:'.82rem',color:'var(--text2)',marginBottom:12,lineHeight:1.5}}>
              Selecione quais fornecedores receberão a demanda de{' '}
              <strong style={{color:'var(--text)'}}>{campaign.product}</strong>.
              Após publicar, você enviará a mensagem individualmente por WhatsApp.
            </p>

            {vendors.length === 0 ? (
              <div style={{
                display:'flex',alignItems:'flex-start',gap:10,padding:'12px 14px',
                background:'var(--amber-dim,#fffbeb)',border:'1px solid var(--amber-border,#fbbf24)',
                borderRadius:'var(--r)',fontSize:'.82rem',color:'var(--amber,#92400e)',
              }}>
                <AlertCircle size={15} style={{flexShrink:0,marginTop:1}}/>
                <span>Você não tem nenhum fornecedor cadastrado. Vá em <strong>Fornecedores</strong> para adicionar antes de publicar.</span>
              </div>
            ) : (
              <>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:8}}>
                  <span style={{fontSize:'.78rem',fontWeight:600,color:'var(--text3)'}}>
                    {selected.size} de {vendors.length} selecionado{vendors.length !== 1 ? 's' : ''}
                  </span>
                  <div style={{display:'flex',gap:8}}>
                    <button onClick={selectAll} style={{fontSize:'.76rem',color:'var(--primary)',fontWeight:600,background:'none',border:'none',cursor:'pointer',padding:0}}>
                      Todos
                    </button>
                    <span style={{color:'var(--border)'}}>·</span>
                    <button onClick={deselectAll} style={{fontSize:'.76rem',color:'var(--text3)',background:'none',border:'none',cursor:'pointer',padding:0}}>
                      Nenhum
                    </button>
                  </div>
                </div>

                <div style={{display:'flex',flexDirection:'column',gap:6,maxHeight:280,overflowY:'auto'}}>
                  {vendors.map(v => {
                    const isOn = selected.has(v.id)
                    return (
                      <button
                        key={v.id}
                        onClick={() => toggle(v.id)}
                        style={{
                          display:'flex',alignItems:'center',gap:12,padding:'11px 14px',
                          border: `1.5px solid ${isOn ? 'var(--primary)' : 'var(--border)'}`,
                          borderRadius:'var(--r-lg)',background: isOn ? 'var(--primary-dim)' : 'var(--surface3)',
                          cursor:'pointer',textAlign:'left',transition:'all .1s',
                        }}
                      >
                        {/* Checkbox */}
                        <div style={{
                          width:18,height:18,borderRadius:4,flexShrink:0,
                          border: `2px solid ${isOn ? 'var(--primary)' : 'var(--border)'}`,
                          background: isOn ? 'var(--primary)' : 'transparent',
                          display:'flex',alignItems:'center',justifyContent:'center',
                        }}>
                          {isOn && <Check size={11} color="#fff" strokeWidth={3}/>}
                        </div>

                        {/* Info */}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{fontWeight:700,fontSize:'.88rem',color:'var(--text)'}}>{v.name}</div>
                          <div style={{display:'flex',gap:10,marginTop:2,fontSize:'.73rem',color:'var(--text3)',flexWrap:'wrap'}}>
                            {v.phone && <span style={{display:'flex',alignItems:'center',gap:3}}><Phone size={10}/>{displayPhone(v.phone)}</span>}
                            {v.city  && <span style={{display:'flex',alignItems:'center',gap:3}}><MapPin size={10}/>{v.city}</span>}
                          </div>
                        </div>
                      </button>
                    )
                  })}
                </div>
              </>
            )}
          </>
        ) : (
          <>
            {/* Etapa 2: Enviar individualmente */}
            <div style={{
              display:'flex',alignItems:'center',gap:8,padding:'10px 14px',
              background:'var(--primary-dim)',border:'1px solid var(--primary-border)',
              borderRadius:'var(--r)',marginBottom:14,fontSize:'.84rem',color:'var(--primary)',fontWeight:600,
            }}>
              <Check size={15}/> Cotação publicada! Agora envie para cada fornecedor selecionado.
            </div>
            <p style={{fontSize:'.82rem',color:'var(--text2)',marginBottom:12,lineHeight:1.5}}>
              Clique em <strong>Enviar</strong> para abrir o WhatsApp com a mensagem já preenchida para cada fornecedor.
            </p>

            <div style={{display:'flex',flexDirection:'column',gap:8}}>
              {selectedVendors.map(v => {
                const sent = sentIds.has(v.id)
                return (
                  <div key={v.id} style={{
                    display:'flex',alignItems:'center',gap:12,padding:'11px 14px',
                    border:'1.5px solid var(--border)',borderRadius:'var(--r-lg)',
                    background: sent ? 'var(--primary-dim)' : 'var(--surface)',
                    opacity: sent ? .8 : 1,
                  }}>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:700,fontSize:'.88rem',display:'flex',alignItems:'center',gap:7}}>
                        {v.name}
                        {sent && <span style={{fontSize:'.65rem',background:'var(--primary)',color:'#fff',padding:'1px 7px',borderRadius:99}}>✓ Enviado</span>}
                      </div>
                      {v.phone && (
                        <div style={{fontSize:'.73rem',color:'var(--text3)',marginTop:2,display:'flex',alignItems:'center',gap:4}}>
                          <Phone size={10}/>{displayPhone(v.phone)}
                        </div>
                      )}
                    </div>
                    <button
                      onClick={() => sendWa(v)}
                      style={{
                        display:'flex',alignItems:'center',gap:6,padding:'7px 13px',
                        background: sent ? 'var(--surface3)' : '#25d366',
                        color: sent ? 'var(--text2)' : '#fff',
                        border: sent ? '1px solid var(--border)' : 'none',
                        borderRadius:'var(--r)',cursor:'pointer',fontWeight:600,fontSize:'.8rem',
                        whiteSpace:'nowrap',flexShrink:0,
                      }}
                    >
                      <MessageCircle size={13}/>
                      {sent ? 'Reenviar' : 'Enviar'}
                    </button>
                  </div>
                )
              })}
            </div>
          </>
        )}
      </ModalBody>

      <ModalFooter>
        {!published ? (
          <>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={selected.size === 0 || publishing || vendors.length === 0}
              onClick={handlePublish}
            >
              {publishing
                ? 'Publicando…'
                : <><Send size={14}/> Publicar para {selected.size} fornecedor{selected.size !== 1 ? 'es' : ''}</>}
            </Button>
          </>
        ) : (
          <Button variant={allSent ? 'primary' : 'outline'} onClick={onClose}>
            {allSent ? '✓ Concluído' : 'Fechar'}
          </Button>
        )}
      </ModalFooter>
    </Modal>
  )
}
