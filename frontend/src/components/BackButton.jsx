import { useNavigate } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'

/**
 * Em standalone (app instalado) não existe barra do navegador, então toda
 * página que não está na barra de baixo precisa da própria saída.
 * `to` é o destino de segurança pra quando não há histórico — abrir o app
 * direto num link fundo deixaria o voltar sem pra onde ir.
 */
export function BackButton({ label = 'Voltar', to = '/' }) {
  const navigate = useNavigate()

  const handleClick = () => {
    if (window.history.length > 1) navigate(-1)
    else navigate(to, { replace: true })
  }

  return (
    <button
      onClick={handleClick}
      className="flex items-center gap-1 text-muted text-sm mb-4 -ml-1 active:opacity-60 transition-opacity"
    >
      <ArrowLeft size={16} /> {label}
    </button>
  )
}
