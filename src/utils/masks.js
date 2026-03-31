/** Formata telefone: (38) 99123-4567 */
export function maskPhone(value) {
  const d = value.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10)
    return d.replace(/(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

/** Remove máscara para salvar: apenas dígitos */
export function unmaskPhone(value) {
  return value.replace(/\D/g, '')
}

/** Exibe telefone já salvo (apenas dígitos) formatado */
export function displayPhone(raw) {
  if (!raw) return '—'
  return maskPhone(raw)
}

/** Formata BRL */
export function formatCurrency(value) {
  if (value == null || isNaN(value)) return '—'
  return Number(value).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

/** Input de moeda: permite digitar valor com centavos */
export function maskCurrency(value) {
  const d = value.replace(/\D/g, '')
  if (!d) return ''
  const num = parseInt(d, 10) / 100
  return num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

/** Converte string mascarada de volta para number */
export function unmaskCurrency(value) {
  if (!value) return null
  return parseFloat(value.replace(/\./g, '').replace(',', '.'))
}
