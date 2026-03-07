import { useState } from 'react'
import { Plus, Trash2, MessageCircle, Phone, MapPin, FileText, Building2 } from 'lucide-react'
import { Card, CardBody } from '../components/Card'
import { Button } from '../components/Button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from '../components/Modal'
import { Toast } from '../components/Toast'
import { useToast } from '../hooks/useToast'
import { buildWhatsAppMsg } from '../utils/data'
import { maskPhone, unmaskPhone, displayPhone } from '../utils/masks'
import styles from './VendorsPage.module.css'

function AddVendorModal({ onClose, onSave }) {
  const [form,   setForm]   = useState({ name:'', phone:'', city:'', notes:'' })
  const [saving, setSaving] = useState(false)
  const set = k => e => setForm(f => ({...f, [k]: e.target.value}))
  const handlePhone = e => setForm(f => ({...f, phone: maskPhone(e.target.value)}))
  const canSave = form.name.trim() && form.phone.length >= 10

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({ ...form, phone: unmaskPhone(form.phone) })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} size="sm">
      <ModalHeader title="Cadastrar Vendedor" onClose={onClose} />
      <ModalBody>
        <div className="form-group">
          <label className="form-label">
            <Building2 size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Nome / Empresa
          </label>
          <input className="form-input" placeholder="Agropecuária Central" value={form.name} onChange={set('name')} autoFocus />
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Phone size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
              WhatsApp
            </label>
            <input className="form-input" placeholder="(38) 99111-0001" value={form.phone} onChange={handlePhone} inputMode="tel" />
          </div>
          <div className="form-group">
            <label className="form-label">
              <MapPin size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
              Cidade
            </label>
            <input className="form-input" placeholder="Tabuleiro" value={form.city} onChange={set('city')} />
          </div>
        </div>
        <div className="form-group">
          <label className="form-label">
            <FileText size={12} style={{marginRight:4,verticalAlign:'middle'}}/>
            Observações
          </label>
          <input className="form-input" placeholder="Ex: Melhor preço em ração" value={form.notes} onChange={set('notes')} />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Cadastrar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

function SendModal({ vendor, campaigns, onClose }) {
  const [cId, setCId] = useState('')
  const open = campaigns.filter(c => c.status==='open' || c.status==='negotiating')
  const sel  = open.find(c => c.id === cId)
  const msg  = sel ? buildWhatsAppMsg(sel, vendor) : ''
  const link = sel ? `https://wa.me/55${unmaskPhone(vendor.phone ?? '')}?text=${encodeURIComponent(msg)}` : '#'

  return (
    <Modal onClose={onClose}>
      <ModalHeader title={`Enviar cotação — ${vendor.name}`} onClose={onClose} />
      <ModalBody>
        <div className="form-group">
          <label className="form-label">Selecione a cotação</label>
          <select className="form-select" value={cId} onChange={e => setCId(e.target.value)}>
            <option value="">— Selecione —</option>
            {open.map(c => <option key={c.id} value={c.id}>{c.product}</option>)}
          </select>
        </div>
        {sel && <pre className={styles.preview}>{msg}</pre>}
        <Button variant="whatsapp" block disabled={!sel}
          href={sel ? link : undefined} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={14} /> Abrir no WhatsApp
        </Button>
      </ModalBody>
    </Modal>
  )
}

export function VendorsPage({ vendors, campaigns, actions }) {
  const { addVendor, removeVendor } = actions
  const { toast, showToast, clearToast } = useToast()
  const [showAdd, setShowAdd] = useState(false)
  const [sendTo,  setSendTo]  = useState(null)

  return (
    <div className={`${styles.page} page-enter`}>
      <div className={styles.header}>
        <div>
          <h1 className={styles.pageTitle}>Vendedores</h1>
          <p className="text-muted">Cadastre fornecedores para enviar cotações via WhatsApp</p>
        </div>
        <Button variant="primary" onClick={() => setShowAdd(true)}>
          <Plus size={15} /> Cadastrar Vendedor
        </Button>
      </div>

      {vendors.length === 0 ? (
        <div className={styles.empty}>Nenhum vendedor cadastrado ainda.</div>
      ) : (
        <div className={styles.grid}>
          {vendors.map(v => (
            <Card key={v.id}>
              <CardBody>
                <div className={styles.vendorTop}>
                  <div>
                    <div className={styles.vendorName}>{v.name}</div>
                    {v.city && (
                      <div className={styles.vendorCity}>
                        <MapPin size={11}/> {v.city}
                      </div>
                    )}
                  </div>
                  <button
                    className={styles.delBtn}
                    onClick={async () => {
                      await removeVendor(v.id)
                      showToast('Vendedor removido')
                    }}
                    title="Remover"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>

                <div className={styles.vendorInfo}>
                  <div style={{display:'flex',alignItems:'center',gap:6}}>
                    <Phone size={13} color="var(--text3)"/>
                    <span>{displayPhone(v.phone)}</span>
                  </div>
                  {v.notes && (
                    <div style={{display:'flex',alignItems:'flex-start',gap:6}}>
                      <FileText size={13} color="var(--text3)" style={{flexShrink:0,marginTop:2}}/>
                      <span>{v.notes}</span>
                    </div>
                  )}
                </div>

                <Button variant="whatsapp" block onClick={() => setSendTo(v)}>
                  <MessageCircle size={14} /> Enviar Cotação
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>
      )}

      {showAdd && (
        <AddVendorModal
          onClose={() => setShowAdd(false)}
          onSave={async v => { await addVendor(v); showToast('Vendedor cadastrado!') }}
        />
      )}
      {sendTo && (
        <SendModal vendor={sendTo} campaigns={campaigns} onClose={() => setSendTo(null)} />
      )}
      {toast && <Toast message={toast.msg} type={toast.type} onDone={clearToast} />}
    </div>
  )
}
