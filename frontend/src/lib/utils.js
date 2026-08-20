import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function fmtDate(iso) {
  if (!iso) return '—'
  const d = typeof iso === 'string' ? iso.slice(0, 10) : iso
  const [y, m, day] = d.split('-')
  return `${day}/${m}/${y}`
}

export function fmtMoney(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v ?? 0)
}

export function fmtMonthLabel(yyyyMM) {
  const [y, m] = yyyyMM.split('-')
  const d = new Date(Number(y), Number(m) - 1, 1)
  return format(d, 'MMMM yyyy', { locale: ptBR })
}

export function currentMonthStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}`
}

export function monthsBack(n) {
  const result = []
  const d = new Date()
  for (let i = 0; i < n; i++) {
    result.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`)
    d.setMonth(d.getMonth() - 1)
  }
  return result
}

export function todayStr() {
  const n = new Date()
  return `${n.getFullYear()}-${String(n.getMonth() + 1).padStart(2, '0')}-${String(n.getDate()).padStart(2, '0')}`
}

/** Quanto este aluno paga por mês: o valor combinado com ele, ou o do plano. */
export function valorMensal(student) {
  if (student?.preco_personalizado != null) return student.preco_personalizado
  return student?.plan?.price ?? 0
}

/* ── Telefone ──────────────────────────────────────────────────────────
   Guardamos só os dígitos. A máscara é de exibição; o link de WhatsApp
   monta o número a partir dos dígitos, nunca do texto formatado. */

export function phoneDigits(value = '') {
  return String(value).replace(/\D/g, '')
}

/** Formata progressivamente enquanto digita: (37) 99141-0188 */
export function maskPhone(value = '') {
  const d = phoneDigits(value).slice(0, 11)
  if (d.length <= 2)  return d
  if (d.length <= 6)  return `(${d.slice(0,2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

/** Celular com DDD tem 11 dígitos; fixo tem 10. Menos que isso não disca. */
export function isValidPhone(value) {
  const len = phoneDigits(value).length
  return len === 10 || len === 11
}

export function getAge(birthdayIso) {
  if (!birthdayIso) return null
  const d = birthdayIso.slice(0, 10)
  const [y, m, day] = d.split('-').map(Number)
  const today = new Date()
  let age = today.getFullYear() - y
  if (today.getMonth() + 1 < m || (today.getMonth() + 1 === m && today.getDate() < day)) age--
  return age
}

const AVATAR_COLORS = [
  '#FF6B6B','#4ECDC4','#45B7D1','#96CEB4',
  '#FECA57','#A29BFE','#FD79A8','#55EFC4',
]
export function avatarColor(name = '') {
  let h = 0
  for (let i = 0; i < name.length; i++) h = name.charCodeAt(i) + ((h << 5) - h)
  return AVATAR_COLORS[Math.abs(h) % AVATAR_COLORS.length]
}

export const DAY_LABELS = { mon:'Seg', tue:'Ter', wed:'Qua', thu:'Qui', fri:'Sex', sat:'Sáb', sun:'Dom' }

export const STATUS_PAYMENT = {
  paid:    { label: 'Pago',      color: 'text-success bg-success/10' },
  pending: { label: 'Pendente',  color: 'text-warning bg-warning/10' },
  overdue: { label: 'Vencido',   color: 'text-danger  bg-danger/10'  },
}

export const METHOD_LABELS = {
  pix:          'Pix',
  dinheiro:     'Dinheiro',
  cartao:       'Cartão',
  transferencia:'Transferência',
}
