import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { studentsApi } from '@/api/students'
import { plansApi } from '@/api/plans'
import { avatarColor, DAY_LABELS, fmtDate } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { Search, Plus, ChevronRight, Users } from 'lucide-react'
import { toast } from 'sonner'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']

export default function Alunos() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('active')
  const [createOpen, setCreateOpen] = useState(false)

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['students', statusFilter, search],
    queryFn: () => studentsApi.list({ status: statusFilter || undefined, search: search || undefined }),
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
          <button
            key={s.id}
            onClick={() => navigate(`/alunos/${s.id}`)}
            className="pressable flex items-center gap-4 w-full p-4 bg-white border border-border rounded-2xl text-left"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0"
              style={{ backgroundColor: avatarColor(s.name) }}
            >
              {s.name[0]}
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-bold text-primary truncate">{s.name}</p>
              <p className="text-xs text-muted mt-0.5">
                {s.plan?.name ?? 'Sem plano'} · {s.training_days?.map(d => DAY_LABELS[d]).join(', ')}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${s.status === 'active' ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'}`}>
                {s.status === 'active' ? 'Ativo' : 'Inativo'}
              </span>
              <ChevronRight size={16} className="text-muted" />
            </div>
          </button>
        ))}
      </div>

      <CreateStudentDialog open={createOpen} onClose={() => setCreateOpen(false)} />
    </div>
  )
}

function CreateStudentDialog({ open, onClose }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    name: '', phone: '', email: '', birthday: '',
    training_days: [], plan_id: '', due_day: '10', notes: '',
  })

  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: plansApi.list })

  const mutation = useMutation({
    mutationFn: (data) => studentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Aluno cadastrado!')
      onClose()
      setForm({ name:'',phone:'',email:'',birthday:'',training_days:[],plan_id:'',due_day:'10',notes:'' })
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro ao cadastrar'),
  })

  const toggleDay = (d) => setForm(f => ({
    ...f,
    training_days: f.training_days.includes(d)
      ? f.training_days.filter(x => x !== d)
      : [...f.training_days, d],
  }))

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.phone || !form.plan_id || form.training_days.length === 0) {
      return toast.error('Preencha nome, telefone, plano e dias de treino')
    }
    mutation.mutate({
      ...form,
      due_day: parseInt(form.due_day),
      email: form.email || null,
      birthday: form.birthday || null,
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
            <Input type="email" value={form.email} onChange={e => setForm(f => ({...f, email: e.target.value}))} placeholder="email@exemplo.com" />
          </div>
          <div>
            <Label>Data de nascimento</Label>
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
            <Label>Dia de vencimento</Label>
            <Input type="number" min={1} max={31} value={form.due_day} onChange={e => setForm(f => ({...f, due_day: e.target.value}))} />
          </div>
          <div>
            <Label>Dias de treino *</Label>
            <div className="flex gap-1.5 flex-wrap">
              {DAYS.map(d => (
                <button
                  type="button"
                  key={d}
                  onClick={() => toggleDay(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.training_days.includes(d) ? 'bg-accent text-white border-accent' : 'bg-raised border-border text-muted hover:text-primary'}`}
                >
                  {DAY_LABELS[d]}
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
