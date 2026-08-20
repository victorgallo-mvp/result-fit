import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { Dumbbell, Eye, EyeOff } from 'lucide-react'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const { user, login } = useAuth()
  const navigate = useNavigate()

  // sessão é de 1 ano: quem já entrou uma vez cai direto no Hoje, sem ver esta tela
  if (user) return <Navigate to="/" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!email || !password) return
    setLoading(true)
    try {
      await login(email, password)
      navigate('/', { replace: true })
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Email ou senha inválidos')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6">
      <div className="mb-10 flex flex-col items-center animate-slide-up">
        <div className="w-14 h-14 rounded-2xl bg-accent flex items-center justify-center mb-5 shadow-sm">
          <Dumbbell size={28} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-primary tracking-tight">ResultFit</h1>
        <p className="text-muted text-sm mt-1">Gestão para personal trainers</p>
      </div>

      <form onSubmit={handleSubmit} className="w-full max-w-sm space-y-4 animate-slide-up" style={{ animationDelay: '0.08s' }}>
        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Email</label>
          <Input
            type="email"
            placeholder="seu@email.com"
            value={email}
            onChange={e => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-primary mb-1.5">Senha</label>
          <div className="relative">
            <Input
              type={showPass ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
              autoComplete="current-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowPass(!showPass)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-primary"
            >
              {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
            </button>
          </div>
        </div>

        <Button type="submit" size="lg" className="w-full mt-2" disabled={loading}>
          {loading ? 'Entrando...' : 'Entrar'}
        </Button>
      </form>

      <p className="mt-10 text-xs text-muted">ResultFit &copy; {new Date().getFullYear()}</p>
    </div>
  )
}
