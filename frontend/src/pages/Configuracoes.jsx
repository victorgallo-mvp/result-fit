import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { authApi } from '@/api/auth'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { avatarColor } from '@/lib/utils'
import { User, Lock, Sun, Sunset } from 'lucide-react'
import { toast } from 'sonner'

const SHIFT_LABELS = { morning: 'Manhã', afternoon: 'Tarde', full: 'Integral' }

export default function Configuracoes() {
  const { user, refreshUser } = useAuth()
  const color = avatarColor(user?.name ?? '')

  const [profileForm, setProfileForm] = useState({
    name: user?.name ?? '',
    shift: user?.shift ?? 'morning',
  })

  const [passForm, setPassForm] = useState({ password: '', confirm: '' })

  const profileMutation = useMutation({
    mutationFn: () => authApi.updateMe({ name: profileForm.name, shift: profileForm.shift }),
    onSuccess: async () => {
      await refreshUser()
      toast.success('Perfil atualizado!')
    },
    onError: () => toast.error('Erro ao atualizar perfil'),
  })

  const passMutation = useMutation({
    mutationFn: () => authApi.updateMe({ password: passForm.password }),
    onSuccess: () => {
      toast.success('Senha alterada!')
      setPassForm({ password: '', confirm: '' })
    },
    onError: () => toast.error('Erro ao alterar senha'),
  })

  const handlePassSubmit = (e) => {
    e.preventDefault()
    if (passForm.password.length < 6) return toast.error('Senha mínimo 6 caracteres')
    if (passForm.password !== passForm.confirm) return toast.error('As senhas não conferem')
    passMutation.mutate()
  }

  return (
    <div className="px-4 pt-12 pb-10">
      <h1 className="text-2xl font-extrabold text-primary mb-6">Configurações</h1>

      {/* Avatar */}
      <div className="flex flex-col items-center mb-8">
        <div
          className="w-20 h-20 rounded-3xl flex items-center justify-center text-bg font-extrabold text-3xl mb-3"
          style={{ backgroundColor: color }}
        >
          {user?.name?.[0]}
        </div>
        <p className="font-bold text-primary text-lg">{user?.name}</p>
        <p className="text-sm text-muted">{user?.email}</p>
        <span className="mt-2 text-xs px-3 py-1 rounded-full bg-accent/10 text-accent font-semibold capitalize">
          {SHIFT_LABELS[user?.shift] ?? user?.shift}
        </span>
      </div>

      {/* Profile section */}
      <Section title="Dados do perfil" icon={User}>
        <div className="space-y-4">
          <div>
            <Label>Nome</Label>
            <Input
              value={profileForm.name}
              onChange={e => setProfileForm(f => ({ ...f, name: e.target.value }))}
              placeholder="Seu nome"
            />
          </div>
          <div>
            <Label>Turno</Label>
            <Select value={profileForm.shift} onValueChange={v => setProfileForm(f => ({ ...f, shift: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="morning">Manhã</SelectItem>
                <SelectItem value="afternoon">Tarde</SelectItem>
                <SelectItem value="full">Integral</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button
            className="w-full"
            onClick={() => profileMutation.mutate()}
            disabled={profileMutation.isPending}
          >
            {profileMutation.isPending ? 'Salvando...' : 'Salvar perfil'}
          </Button>
        </div>
      </Section>

      {/* Password section */}
      <Section title="Alterar senha" icon={Lock} className="mt-4">
        <form onSubmit={handlePassSubmit} className="space-y-4">
          <div>
            <Label>Nova senha</Label>
            <Input
              type="password"
              value={passForm.password}
              onChange={e => setPassForm(f => ({ ...f, password: e.target.value }))}
              placeholder="Mínimo 6 caracteres"
            />
          </div>
          <div>
            <Label>Confirmar senha</Label>
            <Input
              type="password"
              value={passForm.confirm}
              onChange={e => setPassForm(f => ({ ...f, confirm: e.target.value }))}
              placeholder="Repita a nova senha"
            />
          </div>
          <Button type="submit" variant="outline" className="w-full" disabled={passMutation.isPending}>
            {passMutation.isPending ? 'Alterando...' : 'Alterar senha'}
          </Button>
        </form>
      </Section>

      {/* App info */}
      <div className="mt-8 text-center">
        <p className="text-xs text-muted">Personal Pro · v0.1.0</p>
        <p className="text-xs text-muted mt-1">{user?.email}</p>
      </div>
    </div>
  )
}

function Section({ title, icon: Icon, children, className }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-5 ${className ?? ''}`}>
      <div className="flex items-center gap-2 mb-4">
        <div className="w-8 h-8 rounded-lg bg-raised flex items-center justify-center">
          <Icon size={15} className="text-muted" />
        </div>
        <p className="font-bold text-primary">{title}</p>
      </div>
      {children}
    </div>
  )
}
