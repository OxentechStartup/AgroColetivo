import { MessageCircle } from 'lucide-react'
import { Modal, ModalHeader, ModalBody } from './Modal'
import { calcSupplyStats } from '../utils/data'
import { totalOrdered } from '../utils/data'
import { formatCurrency, displayPhone } from '../utils/masks'
import styles from './VendorOrderModal.module.css'

function buildMsg(campaign, lot, vendorName) {
  const unit = campaign.unit ?? 'unidades'
  return (
    `Olá, ${vendorName}!\n` +
    `PEDIDO – ${campaign.product.toUpperCase()}\n\n` +
    `Quantidade: ${lot.used} ${unit}\n` +
    `Preço acordado: ${formatCurrency(lot.pricePerUnit)}/${unit.replace(/s$/, '')}\n` +
    `Total: ${formatCurrency(lot.used * lot.pricePerUnit)}\n\n` +
    `Favor confirmar disponibilidade e prazo de entrega em Tabuleiro do Norte/CE.\n` +
    `Obrigado!`
  )
}

export function VendorOrderModal({ campaign, vendors, onClose }) {
  const lots   = campaign.lots   ?? []
  const orders = campaign.orders ?? []

  const { lotBreakdown } = calcSupplyStats(lots, orders, campaign.freightTotal, campaign.markupTotal)
  const activeLots = lotBreakdown.filter(l => l.used > 0)

  const sendWA = (lot, vendorName) => {
    const vendor = vendors?.find(v => v.id === lot.vendorId)
    const phone  = vendor?.phone?.replace(/\D/g, '')
    const msg    = buildMsg(campaign, lot, vendorName)
    const url    = phone
      ? `https://wa.me/55${phone}?text=${encodeURIComponent(msg)}`
      : `https://wa.me/?text=${encodeURIComponent(msg)}`
    window.open(url, '_blank', 'noopener')
  }

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader title="Fazer Pedido aos Fornecedores" onClose={onClose} />
      <ModalBody>
        {activeLots.length === 0 ? (
          <div className={styles.empty}>
            <p>Nenhum fornecedor com pedido calculado.</p>
            <span>Adicione fornecedores na aba "Fornecedores" desta cotação.</span>
          </div>
        ) : (
          <div className={styles.list}>
            {activeLots.map((lot, i) => {
              const vendor     = vendors?.find(v => v.id === lot.vendorId)
              const vendorName = lot.vendorName || vendor?.name || `Fornecedor ${i + 1}`
              const phone      = vendor?.phone
              const total      = lot.used * lot.pricePerUnit

              return (
                <div key={lot.id ?? i} className={styles.card}>
                  <div className={styles.cardHead}>
                    <span className={styles.vendorName}>{vendorName}</span>
                    {phone && <span className={styles.vendorPhone}>{displayPhone(phone)}</span>}
                  </div>

                  <div className={styles.rows}>
                    <div className={styles.row}>
                      <span>Quantidade</span>
                      <span>{lot.used} {campaign.unit}</span>
                    </div>
                    <div className={styles.row}>
                      <span>Preço / {campaign.unit?.replace(/s$/, '')}</span>
                      <span>{formatCurrency(lot.pricePerUnit)}</span>
                    </div>
                    <div className={`${styles.row} ${styles.totalRow}`}>
                      <span>Total</span>
                      <strong className={styles.totalVal}>{formatCurrency(total)}</strong>
                    </div>
                  </div>

                  <button className={styles.waBtn} onClick={() => sendWA(lot, vendorName)}>
                    <MessageCircle size={15} /> Enviar Pedido via WhatsApp
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </ModalBody>
    </Modal>
  )
}
                  </div>

                  <button className={styles.waBtn} onClick={() => sendWA(lot, vendorName)}>
                    <MessageCircle size={15} /> Enviar Pedido via WhatsApp
                  </button>
                </div>
              )
            })}
