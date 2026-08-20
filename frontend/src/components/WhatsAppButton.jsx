import { openWhatsApp, waNumber } from '@/lib/whatsapp'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

function WhatsAppGlyph({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M17.47 14.38c-.3-.15-1.75-.86-2.02-.96-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.25-.46-2.38-1.47-.88-.78-1.47-1.75-1.65-2.05-.17-.3-.02-.46.13-.6.13-.14.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.6-.92-2.2-.24-.58-.49-.5-.67-.51h-.57c-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.47s1.06 2.87 1.21 3.07c.15.2 2.1 3.2 5.07 4.49.71.3 1.26.49 1.69.63.71.22 1.36.19 1.87.12.57-.09 1.75-.72 2-1.41.25-.69.25-1.28.17-1.4-.07-.13-.27-.2-.57-.35z"/>
      <path d="M12.04 2C6.58 2 2.13 6.45 2.13 11.91c0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38a9.87 9.87 0 0 0 4.79 1.22h.01c5.46 0 9.91-4.45 9.91-9.91 0-2.65-1.03-5.14-2.9-7.01A9.82 9.82 0 0 0 12.04 2zm0 18.15h-.01a8.2 8.2 0 0 1-4.18-1.15l-.3-.18-3.11.82.83-3.04-.2-.31a8.17 8.17 0 0 1-1.26-4.38c0-4.54 3.7-8.24 8.24-8.24 2.2 0 4.27.86 5.82 2.42a8.18 8.18 0 0 1 2.41 5.83c0 4.54-3.7 8.23-8.24 8.23z"/>
    </svg>
  )
}

/**
 * Botão que abre o WhatsApp com a mensagem pronta.
 * Telefone impossível de discar → botão apagado e um toast explicando,
 * em vez de abrir conversa com número errado.
 */
export function WhatsAppButton({ phone, message, label, size = 16, className, title = 'Enviar no WhatsApp' }) {
  const ok = Boolean(waNumber(phone))

  const handleClick = (e) => {
    e.stopPropagation()
    if (!ok) {
      toast.error(phone ? 'Telefone inválido — corrija no cadastro' : 'Aluno sem telefone cadastrado')
      return
    }
    openWhatsApp(phone, message)
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      title={title}
      aria-label={title}
      className={cn(
        'flex-shrink-0 flex items-center justify-center gap-1.5 rounded-xl font-bold transition-colors',
        label ? 'px-3 h-9 text-xs' : 'w-9 h-9',
        ok
          ? 'bg-[#25D366]/12 text-[#128C4A] hover:bg-[#25D366]/25 active:scale-95'
          : 'bg-raised text-muted/50',
        className,
      )}
    >
      <WhatsAppGlyph size={size} />
      {label}
    </button>
  )
}
