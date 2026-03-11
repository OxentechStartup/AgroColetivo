import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, TrendingUp, Truck, AlertCircle, CheckCircle2, Search, Package, X, Activity } from 'lucide-react'
import { Button } from './Button'
import { Modal, ModalHeader, ModalBody, ModalFooter } from './Modal'
import { formatCurrency, maskCurrency, unmaskCurrency } from '../utils/masks'
import { fetchAllVendorProducts } from '../lib/vendorProducts'
import { calcSupplyStats } from '../utils/data'
import styles from './LotsPanel.module.css'

export { calcSupplyStats }

// ── Modal: adicionar fornecedor à cotação ────────────────────────────
// Fluxo: buscar produto → ver fornecedores que têm → confirmar qtd/preço
function AddLotModal({ vendors, unit, onClose, onSave }) {
  // Step: 'search' | 'confirm'
  const [step,        setStep]        = useState('search')
  const [search,      setSearch]      = useState('')
  const [allProducts, setAllProducts] = useState([])
  const [loadingProds,setLoadingProds]= useState(true)
  const [selected,    setSelected]    = useState(null)  // { product, vendor }
  const [qty,         setQty]         = useState('')
  const [price,       setPrice]       = useState('')
  const [notes,       setNotes]       = useState('')
  const [saving,      setSaving]      = useState(false)
  const searchRef = useRef(null)

  // Carrega todos os produtos de todos os fornecedores cadastrados
  useEffect(() => {
    fetchAllVendorProducts()
      .then(setAllProducts)
      .catch(() => setAllProducts([]))
      .finally(() => setLoadingProds(false))
    setTimeout(() => searchRef.current?.focus(), 80)
  }, [])

  // Filtra por nome do produto ou nome do fornecedor
  const term = search.trim().toLowerCase()
  const filtered = term
    ? allProducts.filter(p =>
        p.name.toLowerCase().includes(term) ||
        (p.vendor?.name ?? '').toLowerCase().includes(term) ||
        (p.category ?? '').toLowerCase().includes(term)
      )
    : allProducts

  // Agrupa por produto → lista os fornecedores disponíveis
  const grouped = filtered.reduce((acc, p) => {
    const key = p.name
    if (!acc[key]) acc[key] = { name: p.name, category: p.category, items: [] }
    acc[key].items.push(p)
    return acc
  }, {})

  const handleSelect = (product) => {
    setSelected({ product, vendor: product.vendor })
    setPrice(product.pricePerUnit
      ? product.pricePerUnit.toFixed(2).replace('.', ',')
      : '')
    setQty(product.stockQty ? String(product.stockQty) : '')
    setStep('confirm')
  }

  const priceNum = unmaskCurrency(price) ?? 0
  const canSave  = selected && +qty > 0 && priceNum > 0

  const handleSave = async () => {
    if (!canSave) return
    setSaving(true)
    try {
      await onSave({
        vendorId:     selected.vendor?.id     || null,
        vendorName:   selected.vendor?.name   || selected.product.vendorId || 'Fornecedor',
        qtyAvailable: +qty,
        pricePerUnit: priceNum,
        notes:        notes.trim() || null,
      })
      onClose()
    } finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose} size="md">
      <ModalHeader
        title={step === 'search' ? 'Buscar produto / fornecedor' : 'Confirmar fornecedor'}
        onClose={onClose}
      />

      {step === 'search' && (
        <>
          <ModalBody>
            {/* Barra de busca */}
            <div className={styles.searchBar}>
              <Search size={15} className={styles.searchIcon}/>
              <input
                ref={searchRef}
                className={styles.searchInput}
                placeholder="Buscar por produto, fornecedor ou categoria…"
                value={search}
                onChange={e => setSearch(e.target.value)}
              />
              {search && (
                <button className={styles.searchClear} onClick={() => setSearch('')}>
                  <X size={13}/>
                </button>
              )}
            </div>

            {/* Resultados */}
            {loadingProds ? (
              <div className={styles.searchMsg}>Carregando catálogo…</div>
            ) : Object.keys(grouped).length === 0 ? (
              <div className={styles.searchMsg}>
                {allProducts.length === 0
                  ? 'Nenhum fornecedor cadastrou produtos ainda.'
                  : 'Nenhum produto encontrado para essa busca.'}
              </div>
            ) : (
              <div className={styles.productResults}>
                {Object.values(grouped).map(group => (
                  <div key={group.name} className={styles.productGroup}>
                    {group.category && (
                      <div className={styles.productGroupLabel}>{group.category}</div>
                    )}
                    {group.items.map(p => (
                      <button
                        key={p.id}
                        className={styles.productResultItem}
                        onClick={() => handleSelect(p)}
                      >
                        <div className={styles.productResultLeft}>
                          <Package size={14} style={{color:'var(--primary)', flexShrink:0}}/>
                          <div>
                            <div className={styles.productResultName}>{p.name}</div>
                            <div className={styles.productResultMeta}>
                              <span className={styles.productResultVendor}>
                                {p.vendor?.name ?? 'Fornecedor'}
                                {p.vendor?.city ? ` · ${p.vendor.city}` : ''}
                              </span>
                              <span>·</span>
                              <span>{p.stockQty} {p.unit} disponíveis</span>
                              {p.weightKg > 0 && (
                                <span>· {p.weightKg} kg/{p.unit.replace(/s$/, '')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                        <div className={styles.productResultPrice}>
                          {p.pricePerUnit > 0
                            ? formatCurrency(p.pricePerUnit)
                            : '—'}
                          <span>/{p.unit.replace(/s$/, '')}</span>
                          {p.pricePerKg > 0 && (
                            <span className={styles.productResultKg}>
                              {formatCurrency(p.pricePerKg)}/kg
                            </span>
                          )}
                        </div>
                      </button>
                    ))}
                  </div>
                ))}
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={onClose}>Cancelar</Button>
          </ModalFooter>
        </>
      )}

      {step === 'confirm' && selected && (
        <>
          <ModalBody>
            {/* Resumo do produto selecionado */}
            <div className={styles.selectedCard}>
              <div className={styles.selectedCardTop}>
                <div>
                  <div className={styles.selectedName}>{selected.product.name}</div>
                  <div className={styles.selectedVendor}>
                    {selected.vendor?.name ?? 'Fornecedor'}
                    {selected.vendor?.city ? ` — ${selected.vendor.city}` : ''}
                  </div>
                </div>
                <button className={styles.changeBtn} onClick={() => setStep('search')}>
                  Trocar
                </button>
              </div>
              <div className={styles.selectedMeta}>
                {selected.product.weightKg > 0 && (
                  <span>{selected.product.weightKg} kg/{selected.product.unit.replace(/s$/, '')}</span>
                )}
                <span>{selected.product.stockQty} {selected.product.unit} em estoque</span>
                {selected.product.freightType && selected.product.freightType !== 'A_COMBINAR' && (
                  <span>{selected.product.freightType === 'CIF' ? 'Frete CIF' : 'Frete FOB'}</span>
                )}
                {selected.product.paymentTerms && (
                  <span>{selected.product.paymentTerms}</span>
                )}
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group">
                <label className="form-label">Qtd disponível para esta cotação ({unit})</label>
                <input type="number" min="1" className="form-input"
                  placeholder={`Máx: ${selected.product.stockQty}`}
                  value={qty} onChange={e => setQty(e.target.value)}
                  autoFocus inputMode="numeric"/>
                {+qty > selected.product.stockQty && (
                  <span className="form-hint" style={{color:'var(--amber)'}}>
                    ⚠ Acima do estoque cadastrado ({selected.product.stockQty})
                  </span>
                )}
              </div>
              <div className="form-group">
                <label className="form-label">Preço / {unit?.replace(/s$/, '') ?? 'un'} (R$)</label>
                <input className="form-input" value={price} readOnly
                  style={{background:'var(--surface2)', cursor:'default', color:'var(--text2)'}}/>
                {selected.product.pricePerKg > 0 && priceNum > 0 && selected.product.weightKg > 0 && (
                  <span className="form-hint">
                    = {formatCurrency(priceNum / selected.product.weightKg)}/kg
                  </span>
                )}
                <span className="form-hint">Preço definido pelo fornecedor</span>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Observações (opcional)</label>
              <input className="form-input" placeholder="Ex: Entrega em 5 dias"
                value={notes} onChange={e => setNotes(e.target.value)}/>
            </div>

            {priceNum > 0 && +qty > 0 && (
              <div className={styles.preview}>
                <span>{selected.vendor?.name ?? 'Fornecedor'} · {qty} {unit}</span>
                <strong style={{color:'var(--primary)'}}>{formatCurrency(priceNum * +qty)}</strong>
              </div>
            )}
          </ModalBody>
          <ModalFooter>
            <Button variant="outline" onClick={() => setStep('search')}>Voltar</Button>
            <Button variant="primary" disabled={!canSave || saving} onClick={handleSave}>
              {saving ? 'Salvando…' : 'Adicionar à cotação'}
            </Button>
          </ModalFooter>
        </>
      )}
    </Modal>
  )
}

// ── Modal: frete & markup ────────────────────────────────────────────
function FreightMarkupModal({ campaign, onClose, onSave }) {
  const toMask = v => (v > 0 ? Number(v).toFixed(2).replace('.', ',') : '')
  const [freight, setFreight] = useState(toMask(campaign.freightTotal ?? 0))
  const [markup,  setMarkup]  = useState(toMask(campaign.markupTotal  ?? 0))
  const [saving,  setSaving]  = useState(false)

  const mask = setter => e => setter(maskCurrency(e.target.value))
  const fNum = unmaskCurrency(freight) ?? 0
  const mNum = unmaskCurrency(markup)  ?? 0
  const n    = campaign.orders?.length || 1

  const handleSave = async () => {
    setSaving(true)
    try { await onSave({ freight: fNum, markup: mNum }); onClose() }
    finally { setSaving(false) }
  }

  return (
    <Modal onClose={onClose}>
      <ModalHeader title="Frete & Markup" onClose={onClose}/>
      <ModalBody>
        <div className={styles.freightHint}>
          Valores divididos igualmente entre os <strong>{n} comprador{n!==1?'es':''}</strong>.
        </div>
        <div className="grid-2">
          <div className="form-group">
            <label className="form-label">
              <Truck size={10} style={{marginRight:4,verticalAlign:'middle'}}/>
              Frete total (R$)
            </label>
            <input className="form-input" placeholder="0,00"
              value={freight} onChange={mask(setFreight)} inputMode="numeric"/>
            {fNum > 0 && <span className="form-hint">→ {formatCurrency(fNum/n)} por comprador</span>}
          </div>
          <div className="form-group">
            <label className="form-label">
              <TrendingUp size={10} style={{marginRight:4,verticalAlign:'middle'}}/>
              Markup / Taxa (R$)
            </label>
            <input className="form-input" placeholder="0,00"
              value={markup} onChange={mask(setMarkup)} inputMode="numeric"/>
            {mNum > 0 && <span className="form-hint">→ {formatCurrency(mNum/n)} por comprador</span>}
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="outline" onClick={onClose}>Cancelar</Button>
        <Button variant="primary" disabled={saving} onClick={handleSave}>
          {saving ? 'Salvando…' : 'Salvar'}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

// ── Painel principal ─────────────────────────────────────────────────
export function LotsPanel({ campaign, vendors, onAddLot, onRemoveLot, onSaveFreight }) {
  const [showAdd,     setShowAdd]     = useState(false)
  const [showFreight, setShowFreight] = useState(false)

  const lots   = campaign.lots   ?? []
  const orders = campaign.orders ?? []
  const unit   = campaign.unit   ?? 'unidades'

  const stats = calcSupplyStats(lots, orders, campaign.freightTotal, campaign.markupTotal, campaign.goalQty)

  return (
    <div className={styles.wrap}>

      {/* ── SEÇÃO 1: Fornecedores ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Fornecedores</div>
            <div className={styles.sectionSub}>
              Adicione em ordem de prioridade. O 1º supre o máximo disponível antes de passar ao próximo.
            </div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowAdd(true)}>
            <Plus size={13}/> Adicionar
          </Button>
        </div>

        {/* Status de cobertura */}
        {(lots.length > 0 || orders.length > 0) && (
          <div className={`${styles.statusRow} ${
            stats.isFulfilled ? styles.statusOk
            : lots.length > 0  ? styles.statusWarn
            : styles.statusNeutral
          }`}>
            {stats.isFulfilled
              ? <><CheckCircle2 size={13}/> Oferta cobre toda a demanda ({stats.totalAvailable} {unit})</>
              : lots.length > 0
                ? <><AlertCircle size={13}/> Faltam {Math.max(0, stats.demandTarget - stats.totalAvailable)} {unit}</>
                : <><AlertCircle size={13}/> Adicione fornecedores</>
            }
            {stats.avgPrice > 0 && (
              <span className={styles.avgPrice}>
                Preço médio: <strong>{formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')}</strong>
              </span>
            )}
          </div>
        )}

        {lots.length === 0
          ? (
            <div className={styles.empty}>
              Adicione os fornecedores em ordem de prioridade. O sistema calcula automaticamente o preço médio ponderado da compra.
            </div>
          ) : (
            <div className={styles.lotsList}>
              {stats.lotBreakdown.map((lot, idx) => {
                const usedPct = lot.qtyAvailable > 0 ? Math.round((lot.used / lot.qtyAvailable) * 100) : 0
                return (
                  <div key={lot.id} className={styles.lot}>
                    <div className={styles.lotNum}>{idx + 1}</div>
                    <div className={styles.lotContent}>
                      <div className={styles.lotHeader}>
                        <span className={styles.lotName}>{lot.vendorName}</span>
                        <div className={styles.lotActions}>
                          {lot.notes && <span className={styles.lotNote} title={lot.notes}>{lot.notes}</span>}
                          <button className={styles.delBtn}
                            onClick={() => onRemoveLot(campaign.id, lot.id)}
                            title="Remover fornecedor">
                            <Trash2 size={12}/>
                          </button>
                        </div>
                      </div>

                      <div className={styles.lotMeta}>
                        <span><strong>{lot.qtyAvailable}</strong> {unit} disponíveis</span>
                        <span className={styles.dot}>·</span>
                        <span><strong>{formatCurrency(lot.pricePerUnit)}</strong>/{unit.replace(/s$/,'')}</span>
                        <span className={styles.dot}>·</span>
                        {/* subtotal = apenas o que foi efetivamente usado × preço */}
                        <span style={{color:'var(--primary)'}}>
                          {orders.length > 0 && lot.used > 0
                            ? formatCurrency(lot.used * lot.pricePerUnit)
                            : formatCurrency(lot.qtyAvailable * lot.pricePerUnit)}
                        </span>
                        {orders.length > 0 && (
                          <><span className={styles.dot}>·</span>
                          {/* X/total = quantos deste lote / total pedido */}
                          <span style={{color:'var(--amber)'}}>
                            {lot.used}/{stats.totalOrdered} {unit}
                          </span></>
                        )}
                      </div>

                      {orders.length > 0 && (
                        <div className={styles.lotBar}>
                          <div className={styles.lotBarFill} style={{
                            width: `${usedPct}%`,
                            background: usedPct >= 100 ? 'var(--amber)' : 'var(--primary)',
                          }}/>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}

              {/* Resumo quando mais de 1 fornecedor */}
              {lots.length > 1 && (
                <div className={styles.summary}>
                  <div className={styles.summaryRow}>
                    <span>Total disponível</span>
                    <span>{stats.totalAvailable} {unit}</span>
                  </div>
                  <div className={styles.summaryRow}>
                    <span>Custo total dos lotes</span>
                    <span>{formatCurrency(stats.weightedSum)}</span>
                  </div>
                  <div className={styles.summaryHighlight}>
                    <span>Preço médio ponderado</span>
                    <span>{formatCurrency(stats.avgPrice)}/{unit.replace(/s$/,'')}</span>
                  </div>
                </div>
              )}
            </div>
          )
        }
      </div>

      {/* ── SEÇÃO 2: Frete & Markup ── */}
      <div className={styles.section}>
        <div className={styles.sectionHead}>
          <div>
            <div className={styles.sectionTitle}>Frete & Markup</div>
            <div className={styles.sectionSub}>Divididos igualmente entre todos os compradores</div>
          </div>
          <Button variant="secondary" size="sm" onClick={() => setShowFreight(true)}>
            {(campaign.freightTotal ?? 0) > 0 || (campaign.markupTotal ?? 0) > 0 ? 'Editar' : 'Definir'}
          </Button>
        </div>

        {stats.totalGross > 0 ? (
          <div className={styles.freightRow}>
            {/* Chip 1: Frete */}
            <div className={`${styles.freightChip} ${(campaign.freightTotal ?? 0) === 0 ? styles.freightChipEmpty : ''}`}>
              <Truck size={14} style={{color:(campaign.freightTotal??0)>0?'var(--blue)':'var(--text3)',marginTop:2}}/>
              <div>
                <div className={styles.chipLabel}>Frete</div>
                <div className={styles.chipValue} style={{color:(campaign.freightTotal??0)>0?'var(--blue)':'var(--text3)'}}>
                  {(campaign.freightTotal ?? 0) > 0 ? formatCurrency(campaign.freightTotal) : '—'}
                </div>
                {stats.freightEach > 0 && <div className={styles.chipSub}>{formatCurrency(stats.freightEach)}/comprador</div>}
              </div>
            </div>
            {/* Chip 2: Markup / Taxa do pivô */}
            <div className={`${styles.freightChip} ${(campaign.markupTotal ?? 0) === 0 ? styles.freightChipEmpty : ''}`}>
              <TrendingUp size={14} style={{color:(campaign.markupTotal??0)>0?'var(--primary)':'var(--text3)',marginTop:2}}/>
              <div>
                <div className={styles.chipLabel}>Markup / Taxa do pivô</div>
                <div className={styles.chipValue} style={{color:(campaign.markupTotal??0)>0?'var(--primary)':'var(--text3)'}}>
                  {(campaign.markupTotal ?? 0) > 0 ? formatCurrency(campaign.markupTotal) : '—'}
                </div>
                {stats.markupEach > 0 && <div className={styles.chipSub}>{formatCurrency(stats.markupEach)}/comprador</div>}
              </div>
            </div>
            {/* Chip 3: Taxa 1,5% plataforma */}
            <div className={styles.freightChip} style={{borderColor:'var(--amber-border)',background:'var(--amber-dim)'}}>
              <Activity size={14} style={{color:'var(--amber)',marginTop:2}}/>
              <div>
                <div className={styles.chipLabel}>Taxa plataforma (1,5%)</div>
                <div className={styles.chipValue} style={{color:'var(--amber)'}}>{formatCurrency(stats.feeTotal)}</div>
                <div className={styles.chipSub}>{formatCurrency(stats.feeEach)}/comprador · sobre total</div>
              </div>
            </div>
          </div>
        ) : (
          <div className={styles.empty}>
            Nenhum lote com preço definido. Adicione fornecedores acima.
          </div>
        )}
      </div>

      {/* ── SEÇÃO 3: Custo por produtor ── */}
      {orders.length > 0 && lots.length > 0 && (
        <div className={styles.section}>
          <div className={styles.sectionTitle}>Custo por Produtor</div>

          <div className={styles.calcNote}>
            Produto (preço médio × qtd)
            {(stats.freightEach + stats.markupEach + stats.feeEach) > 0
              ? ` + encargos por produtor: ${formatCurrency(stats.freightEach + stats.markupEach + stats.feeEach)}`
              : ''}
            {' '}→ <strong>Total por produtor inclui frete, markup e taxa 1,5%</strong>
          </div>

          {/* Desktop: tabela */}
          <div className={styles.tableWrap}>
            <table className="tbl">
              <thead><tr>
                <th>Produtor</th>
                <th>Qtd</th>
                <th>Produto</th>
                {(stats.freightEach + stats.markupEach + stats.feeEach) > 0 && <th>Encargos</th>}
                <th>Total</th>
              </tr></thead>
              <tbody>
                {orders.map(o => {
                  const produto = stats.avgPrice * o.qty
                  const extras  = stats.freightEach + stats.markupEach
                  const total   = produto + extras + stats.feeEach
                  return (
                    <tr key={o.orderId}>
                      <td style={{fontWeight:600}}>{o.producerName}</td>
                      <td style={{whiteSpace:'nowrap'}}>{o.qty} {unit}</td>
                      <td>{formatCurrency(produto)}</td>
                      {(extras + stats.feeEach) > 0 && (
                        <td>
                          <div style={{fontSize:'.82rem',color:'var(--text2)'}}>{formatCurrency(extras + stats.feeEach)}</div>
                          <div style={{fontSize:'.68rem',color:'var(--text3)'}}>
                            {extras > 0 && `fr+mk: ${formatCurrency(extras)}`}
                            {extras > 0 && stats.feeEach > 0 && ' · '}
                            {stats.feeEach > 0 && `taxa: ${formatCurrency(stats.feeEach)}`}
                          </div>
                        </td>
                      )}
                      <td><strong style={{color:'var(--primary)'}}>{formatCurrency(total)}</strong></td>
                    </tr>
                  )
                })}
              </tbody>
              {orders.length > 1 && (
                <tfoot>
                  <tr>
                    <td colSpan={2}>Total geral</td>
                    <td>{formatCurrency(stats.avgPrice * stats.totalOrdered)}</td>
                    {(stats.freightEach + stats.markupEach + stats.feeEach) > 0 && (
                      <td>{formatCurrency(((stats.freightEach + stats.markupEach + stats.feeEach) * stats.numBuyers))}</td>
                    )}
                    <td style={{color:'var(--primary)'}}>
                      {formatCurrency(
                        stats.avgPrice * stats.totalOrdered +
                        (campaign.freightTotal ?? 0) +
                        (campaign.markupTotal  ?? 0) +
                        (stats.feeEach * stats.numBuyers)
                      )}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>

          {/* Mobile: cards */}
          <div className={styles.costCards}>
            {orders.map(o => {
              const produto = stats.avgPrice * o.qty
              const extras  = stats.freightEach + stats.markupEach
              const total   = produto + extras + stats.feeEach
              return (
                <div key={o.orderId} className={styles.costCard}>
                  <div className={styles.costCardTop}>
                    <span className={styles.costName}>{o.producerName}</span>
                    <strong className={styles.costTotal}>{formatCurrency(total)}</strong>
                  </div>
                  <div className={styles.costCardRows}>
                    <div className={styles.costRow}>
                      <span>{o.qty} {unit} × {formatCurrency(stats.avgPrice)}</span>
                      <span>{formatCurrency(produto)}</span>
                    </div>
                    {(extras + stats.feeEach) > 0 && (
                      <div className={styles.costRow}>
                        <span>
                          Encargos
                          <span style={{fontSize:'.68rem',color:'var(--text3)',marginLeft:4}}>
                            {extras > 0 ? `fr+mk ${formatCurrency(extras)}` : ''}
                            {extras > 0 && stats.feeEach > 0 ? ' · ' : ''}
                            {stats.feeEach > 0 ? `taxa ${formatCurrency(stats.feeEach)}` : ''}
                          </span>
                        </span>
                        <span style={{color:'var(--amber)',fontWeight:600}}>{formatCurrency(extras + stats.feeEach)}</span>
                      </div>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      {showAdd && (
        <AddLotModal vendors={vendors} unit={unit}
          onClose={() => setShowAdd(false)}
          onSave={lot => onAddLot(campaign.id, lot)}/>
      )}
      {showFreight && (
        <FreightMarkupModal campaign={campaign}
          onClose={() => setShowFreight(false)}
          onSave={vals => onSaveFreight(campaign.id, vals)}/>
      )}
    </div>
  )
}
