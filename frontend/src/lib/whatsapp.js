import { phoneDigits, fmtMoney, fmtDate } from './utils.js'

/**
 * Monta o número no formato que o wa.me exige: 55 + DDD + número.
 * Devolve null quando o telefone não dá pra discar — melhor botão desabilitado
 * do que abrir conversa com o número errado.
 */
export function waNumber(phone) {
  const d = phoneDigits(phone)
  if (!d) return null
  // 12 ou 13 dígitos começando em 55 já vêm com código do país
  if (d.startsWith('55') && (d.length === 12 || d.length === 13)) return d
  // 10 (fixo) ou 11 (celular) dígitos = número local, falta o país
  if (d.length === 10 || d.length === 11) return `55${d}`
  return null
}

export function waLink(phone, text) {
  const num = waNumber(phone)
  if (!num) return null
  return `https://wa.me/${num}?text=${encodeURIComponent(text)}`
}

/** Abre o WhatsApp numa aba nova — em PWA standalone isso entrega pro app. */
export function openWhatsApp(phone, text) {
  const url = waLink(phone, text)
  if (!url) return false
  window.open(url, '_blank', 'noopener,noreferrer')
  return true
}

/* ── Mensagens ────────────────────────────────────────────────────────
   Texto sai pronto no WhatsApp; você ainda pode editar antes de enviar. */

const primeiroNome = (nome = '') => nome.trim().split(/\s+/)[0]

export function msgAniversario(student) {
  return `Parabéns, ${primeiroNome(student.name)}! 🎉 Muitas felicidades e um ótimo ano novo de vida. Bons treinos! 💪`
}

export function msgMensalidade({ name, amount, due_date, vencida }) {
  const nome = primeiroNome(name)
  const valor = fmtMoney(amount)
  const data = fmtDate(due_date)
  return vencida
    ? `Oi, ${nome}! Sua mensalidade de ${valor} venceu dia ${data}. Consegue dar uma olhada? Qualquer coisa é só chamar!`
    : `Oi, ${nome}! Passando pra lembrar que sua mensalidade de ${valor} vence dia ${data}. Qualquer dúvida é só chamar!`
}
