import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { studentsApi } from '@/api/students'
import { plansApi } from '@/api/plans'
import { avatarColor, fmtDate, fmtMoney } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Search, Plus, ChevronRight, Users, CheckCircle, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const FREQUENCIES = [2, 3, 4, 5, 6]

export default function Alunos() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', statusFilter, search],
    queryFn: () => studentsApi.list({ status: statusFilter || undefined, search: search || undefined }),
  })

  const confirmMutation = useMutation({
    mutationFn: (studentId) => studentsApi.pagar(studentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Pagamento confirmado!')
    },
    onError: () => toast.error('Erro ao confirmar pagamento'),
  })

  return (
    <div className="px-4 pt-12 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Alunos</h1>
          <p className="text-sm text-muted">{students.length} {statusFilter === 'active' ? 'ativos' : 'registrados'}</p>
        </div>
        <Button size="icon" onClick={() => setCreateOpen(true)}>
          <Plus size={20} />
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Buscar aluno..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex bg-raised rounded-xl border border-border overflow-hidden">
          {[['active','Ativos'],['inactive','Inativos'],['','Todos']].map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatusFilter(val)}
              className={`px-3 py-2 text-xs font-semibold transition-colors ${statusFilter === val ? 'bg-accent text-white' : 'text-muted hover:text-primary'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-2">
          {[1,2,3,4].map(i => <div key={i} className="h-20 rounded-2xl bg-white animate-pulse" />)}
        </div>
      )}

      {!isLoading && students.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <Users size={40} className="text-muted mb-3" />
          <p className="font-semibold text-primary">Nenhum aluno encontrado</p>
          <p className="text-sm text-muted mt-1">
            {search ? 'Tente outro nome' : 'Cadastre seu primeiro aluno'}
          </p>
        </div>
      )}

      <div className="space-y-2 stagger">
        {students.map(s => (
          <StudentCard
            key={s.id}
            student={s}
            onClick={() => navigate(`/alunos/${s.id}`)}
            onConfirm={s.next_payment ? () => confirmMutation.mutate(s.id) : null}
            confirming={confirmMutation.isPending && confirmMutation.variables === s.id}
          />
        ))}
      </div>

      <CreateStudentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function StudentCard({ student: s, onClick, onConfirm, confirming }) {
  const np = s.next_payment
  const isOverdue = np?.status === 'overdue'
  const isPending = np?.status === 'pending'

  return (
    <div className="pressable flex items-center gap-3 w-full p-4 bg-white border border-border rounded-2xl text-left">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0">
        <div
          className="w-11 h-11 rounded-full flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0"
          style={{ backgroundColor: avatarColor(s.name) }}
        >
          {s.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-primary truncate">{s.name}</p>
          <p className="text-xs text-muted mt-0.5 truncate">
            {s.plan?.name ?? 'Sem plano'} · {s.weekly_frequency ?? 3}x/sem
          </p>
          {np && (
            <p className={`text-xs font-semibold mt-0.5 ${isOverdue ? 'text-danger' : isPending ? 'text-warning' : 'text-muted'}`}>
              {isOverdue ? 'Venceu' : 'Vence'} {fmtDate(np.due_date)} · {fmtMoney(np.amount)}
            </p>
          )}
        </div>
        <ChevronRight size={16} className="text-muted flex-shrink-0" />
      </button>

      {onConfirm && (
        <button
          onClick={(e) => { e.stopPropagation(); onConfirm() }}
          disabled={confirming}
          title="Confirmar pagamento"
          className={`flex-shrink-0 w-9 h-9 rounded-full flex items-center justify-center transition-colors ${
            isOverdue
              ? 'bg-danger/10 text-danger hover:bg-danger/20'
              : 'bg-warning/10 text-warning hover:bg-warning/20'
          }`}
        >
          {confirming
            ? <Loader2 size={15} className="animate-spin" />
            : <CheckCircle size={15} />
          }
        </button>
      )}
    </div>
  )
}

function CreateStudentDialog({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '', phone: '', email: '', birthday: '',
    weekly_frequency: 3, plan_id: '', notes: '', ultimo_pagamento: '',
    ultima_avaliacao: '', avaliacao_frequencia: 3,
  })

  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: plansApi.list })

  const mutation = useMutation({
    mutationFn: (data) => studentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Aluno cadastrado!')
      onClose()
      setForm({ name:'',phone:'',email:'',birthday:'',weekly_frequency:3,plan_id:'',notes:'',ultimo_pagamento:'',ultima_avaliacao:'',avaliacao_frequencia:3 })
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro ao cadastrar'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.plan_id) {
      return toast.error('Preencha nome, telefone e plano')
    }
    mutation.mutate({
      ...form,
      email: form.email || null,
      birthday: form.birthday || null,
      ultimo_pagamento: form.ultimo_pagamento || null,
      ultima_avaliacao: form.ultima_avaliacao || null,
      avaliacao_frequencia: form.avaliacao_frequencia,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Novo Aluno">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome *</Label>
            <Input value={form.name} onChange={e => setForm(f => ({...f, name: e.target.value}))} placeholder="Nome completo" required />
          </div>
          <div>
            <Label>Telefone *</Label>
            <Input value={form.phone} onChange={e => setForm(f => ({...f, phone: e.target.value}))} placeholder="11999999999" required />
          </div>
          <div>
            <Label>Email</Label>
            <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} />
          </div>
          <div>
            <Label>Nascimento</Label>
            <Input type="date" value={form.birthday} onChange={e => setForm(f => ({...f, birthday: e.target.value}))} />
          </div>
          <div>
            <Label>Plano *</Label>
            <Select value={form.plan_id} onValueChange={v => setForm(f => ({...f, plan_id: v}))}>
              <SelectTrigger><SelectValue placeholder="Selecione o plano" /></SelectTrigger>
              <SelectContent>
                {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name} — R$ {p.price}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequência semanal *</Label>
            <div className="flex gap-1.5 flex-wrap">
              {FREQUENCIES.map(f => (
                <button
                  type="button"
                  key={f}
                  onClick={() => setForm(fm => ({...fm, weekly_frequency: f}))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.weekly_frequency === f ? 'bg-accent text-white border-accent' : 'bg-raised border-border text-muted hover:text-primary'}`}
                >
                  {f}x
                </button>
              ))}
            </div>
          </div>
          <div>
            <Label>Último pagamento</Label>
            <Input type="date" value={form.ultimo_pagamento} onChange={e => setForm(f => ({...f, ultimo_pagamento: e.target.value}))} />
          </div>
          <div>
            <Label>Última avaliação</Label>
            <Input type="date" value={form.ultima_avaliacao} onChange={e => setForm(f => ({...f, ultima_avaliacao: e.target.value}))} />
          </div>
          <div>
            <Label>Frequência de avaliação (meses)</Label>
            <div className="flex gap-1.5 flex-wrap">
              {[1,2,3,4,6].map(n => (
                <button type="button" key={n} onClick={() => setForm(fm => ({...fm, avaliacao_frequencia: n}))}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.avaliacao_frequencia === n ? 'bg-accent text-white border-accent' : 'bg-raised border-border text-muted hover:text-primary'}`}>
                  {n}m
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Cadastrar aluno'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
