import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { studentsApi } from '@/api/students'
import { plansApi } from '@/api/plans'
import {
  avatarColor, DAY_LABELS, fmtDate, fmtMoney, getAge,
  currentMonthStr, METHOD_LABELS,
} from '@/lib/utils'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { ArrowLeft, Phone, Mail, Calendar, Edit2, Check, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { format, getDaysInMonth, getDay } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DAYS = ['mon','tue','wed','thu','fri','sat','sun']
const WEEKDAY_TO_IDX = { sun:0, mon:1, tue:2, wed:3, thu:4, fri:5, sat:6 }

export default function AlunoDetalhe() {
  const { id } = useParams()
  const navigate = useNavigate()

  const { data: student, isLoading, error } = useQuery({
    queryKey: ['student', id],
    queryFn: () => studentsApi.get(id),
    retry: 2,
    retryDelay: 800,
  })

  if (isLoading) return (
    <div className="flex items-center justify-center h-full pt-24">
      <div className="w-8 h-8 rounded-full border-2 border-accent border-t-transparent animate-spin" />
    </div>
  )

  if (error || !student) {
    const is404 = error?.response?.status === 404
    return (
      <div className="flex flex-col items-center justify-center h-full pt-24 px-8 text-center">
        <p className="font-semibold text-primary">{is404 ? 'Aluno não encontrado' : 'Erro ao carregar aluno'}</p>
        <p className="text-sm text-muted mt-1">{is404 ? '' : 'Verifique sua conexão e tente novamente'}</p>
        <Button variant="ghost" onClick={() => navigate('/alunos')} className="mt-4">Voltar</Button>
      </div>
    )
  }

  const age = getAge(student.birthday)
  const color = avatarColor(student.name)

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-12 pb-5 bg-white border-b border-border">
        <button onClick={() => navigate(-1)} className="flex items-center gap-1 text-muted text-sm mb-4 -ml-1">
          <ArrowLeft size={16} /> Alunos
        </button>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-white font-extrabold text-2xl flex-shrink-0" style={{ backgroundColor: color }}>
            {student.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-extrabold text-primary leading-tight">{student.name}</h1>
            <p className="text-sm text-muted mt-0.5">
              {student.plan?.name ?? 'Sem plano'}
              {age ? ` · ${age} anos` : ''}
              {student.status === 'inactive' && <span className="ml-2 text-xs bg-muted/10 text-muted px-2 py-0.5 rounded-full">Inativo</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex-1 px-4 pt-4">
        <Tabs defaultValue="info">
          <TabsList className="w-full mb-4">
            <TabsTrigger value="info">Info</TabsTrigger>
            <TabsTrigger value="frequencia">Frequência</TabsTrigger>
            <TabsTrigger value="pagamentos">Pagamentos</TabsTrigger>
          </TabsList>

          <TabsContent value="info"><InfoTab student={student} /></TabsContent>
          <TabsContent value="frequencia"><FrequenciaTab student={student} /></TabsContent>
          <TabsContent value="pagamentos"><PagamentosTab student={student} /></TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

/* ── Info Tab (inclui observações) ───────────────────────────────────── */
function InfoTab({ student }) {
  const qc = useQueryClient()
  const [editOpen, setEditOpen] = useState(false)
  const [notes, setNotes] = useState(student.notes ?? '')
  const [notesSaved, setNotesSaved] = useState(true)
  const { data: plans = [] } = useQuery({ queryKey: ['plans'], queryFn: plansApi.list })

  const notesMutation = useMutation({
    mutationFn: () => studentsApi.update(student.id, { notes }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', student.id] })
      setNotesSaved(true)
      toast.success('Observações salvas!')
    },
    onError: () => toast.error('Erro ao salvar'),
  })

  const [form, setForm] = useState({
    name: student.name,
    phone: student.phone,
    email: student.email ?? '',
    birthday: student.birthday?.slice(0, 10) ?? '',
    plan_id: student.plan?.id ?? '',
    due_day: String(student.due_day),
    training_days: student.training_days ?? [],
    status: student.status,
  })

  const mutation = useMutation({
    mutationFn: (data) => studentsApi.update(student.id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', student.id] })
      qc.invalidateQueries({ queryKey: ['students'] })
      toast.success('Dados atualizados!')
      setEditOpen(false)
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro ao salvar'),
  })

  const toggleDay = (d) => setForm(f => ({
    ...f,
    training_days: f.training_days.includes(d)
      ? f.training_days.filter(x => x !== d)
      : [...f.training_days, d],
  }))

  const handleSubmit = (e) => {
    e.preventDefault()
    mutation.mutate({
      ...form,
      due_day: parseInt(form.due_day),
      email: form.email || null,
      birthday: form.birthday || null,
      plan_id: form.plan_id || student.plan?.id,
    })
  }

  return (
    <div className="space-y-3 pb-6">
      <InfoRow icon={Phone} label="Telefone" value={student.phone} />
      <InfoRow icon={Mail}  label="Email"    value={student.email ?? '—'} />
      <InfoRow icon={Calendar} label="Nascimento" value={student.birthday ? `${fmtDate(student.birthday)} (${getAge(student.birthday)} anos)` : '—'} />

      <div className="bg-white border border-border rounded-2xl p-4">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Dias de treino</p>
        <div className="flex gap-1.5 flex-wrap">
          {(student.training_days ?? []).map(d => (
            <span key={d} className="px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-xs font-bold">
              {DAY_LABELS[d]}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white border border-border rounded-2xl p-4">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-1">Vencimento</p>
        <p className="text-primary font-semibold">Todo dia {student.due_day}</p>
      </div>

      <Button variant="outline" className="w-full" onClick={() => setEditOpen(true)}>
        <Edit2 size={16} /> Editar dados
      </Button>

      {/* Observações inline */}
      <div className="bg-white border border-border rounded-2xl p-4">
        <p className="text-xs text-muted font-semibold uppercase tracking-wider mb-2">Observações</p>
        <textarea
          rows={4}
          value={notes}
          onChange={e => { setNotes(e.target.value); setNotesSaved(false) }}
          placeholder="Histórico de lesões, metas, preferências..."
          className="w-full text-sm text-primary bg-transparent resize-none outline-none placeholder:text-muted/50"
        />
        {!notesSaved && (
          <Button
            size="sm"
            className="mt-2 w-full"
            onClick={() => notesMutation.mutate()}
            disabled={notesMutation.isPending}
          >
            {notesMutation.isPending ? 'Salvando...' : 'Salvar observações'}
          </Button>
        )}
      </div>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent title="Editar aluno">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div><Label>Nome</Label><Input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><Label>Telefone</Label><Input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} /></div>
            <div><Label>Email</Label><Input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} /></div>
            <div><Label>Nascimento</Label><Input type="date" value={form.birthday} onChange={e => setForm(f=>({...f,birthday:e.target.value}))} /></div>
            <div>
              <Label>Plano</Label>
              <Select value={form.plan_id} onValueChange={v => setForm(f=>({...f,plan_id:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {plans.map(p => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Dia de vencimento</Label><Input type="number" min={1} max={31} value={form.due_day} onChange={e => setForm(f=>({...f,due_day:e.target.value}))} /></div>
            <div>
              <Label>Dias de treino</Label>
              <div className="flex gap-1.5 flex-wrap">
                {DAYS.map(d => (
                  <button type="button" key={d} onClick={() => toggleDay(d)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${form.training_days.includes(d) ? 'bg-accent text-white border-accent' : 'bg-raised border-border text-muted'}`}>
                    {DAY_LABELS[d]}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={v => setForm(f=>({...f,status:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button type="submit" className="w-full" disabled={mutation.isPending}>
              {mutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function InfoRow({ icon: Icon, label, value }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-raised flex items-center justify-center flex-shrink-0">
        <Icon size={16} className="text-muted" />
      </div>
      <div>
        <p className="text-xs text-muted">{label}</p>
        <p className="text-sm font-semibold text-primary">{value}</p>
      </div>
    </div>
  )
}

/* ── Frequência Tab ───────────────────────────────────────────────────── */
function FrequenciaTab({ student }) {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const monthStr = `${year}-${String(month).padStart(2,'0')}`

  const { data: attendances = [] } = useQuery({
    queryKey: ['student-attendances', student.id, monthStr],
    queryFn: () => studentsApi.attendances(student.id, monthStr),
  })

  const { data: stats } = useQuery({
    queryKey: ['student-stats', student.id, monthStr],
    queryFn: () => studentsApi.attendanceStats(student.id, monthStr),
  })

  const attendedDays = new Set(
    attendances.map(a => a.date?.slice(0, 10))
  )

  const prevMonth = () => {
    if (month === 1) { setYear(y => y-1); setMonth(12) }
    else setMonth(m => m-1)
  }
  const nextMonth = () => {
    if (month === 12) { setYear(y => y+1); setMonth(1) }
    else setMonth(m => m+1)
    // don't go beyond current month
  }
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1

  const daysInMonth = getDaysInMonth(new Date(year, month - 1))
  const firstDow = getDay(new Date(year, month - 1, 1)) // 0=Sun

  const trainingSet = new Set((student.training_days ?? []).map(d => WEEKDAY_TO_IDX[d]))
  const label = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

  return (
    <div className="pb-6 space-y-4">
      {/* Stats */}
      {stats && (
        <div className="bg-white border border-border rounded-2xl p-4">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-xs text-muted uppercase tracking-wider font-semibold mb-1">Taxa de frequência</p>
              <p className="text-3xl font-extrabold text-primary">{stats.rate}%</p>
            </div>
            <div className="text-right">
              <p className="text-sm text-primary font-semibold">{stats.attended}/{stats.expected} treinos</p>
              {stats.faltas > 0 && <p className="text-xs text-danger">{stats.faltas} falta{stats.faltas > 1 ? 's' : ''}</p>}
            </div>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${stats.rate >= 80 ? 'bg-accent' : stats.rate >= 60 ? 'bg-warning' : 'bg-danger'}`}
              style={{ width: `${stats.rate}%` }}
            />
          </div>
        </div>
      )}

      {/* Calendar */}
      <div className="bg-white border border-border rounded-2xl p-4">
        {/* Month nav */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth} className="p-2 rounded-xl hover:bg-raised text-muted">
            <ChevronLeft size={18} />
          </button>
          <p className="font-bold text-primary capitalize">{label}</p>
          <button onClick={nextMonth} disabled={isCurrentMonth} className="p-2 rounded-xl hover:bg-raised text-muted disabled:opacity-30">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 mb-2">
          {['D','S','T','Q','Q','S','S'].map((d, i) => (
            <p key={i} className="text-center text-xs text-muted font-semibold">{d}</p>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {Array.from({ length: firstDow }).map((_, i) => <div key={`e${i}`} />)}
          {Array.from({ length: daysInMonth }).map((_, i) => {
            const day = i + 1
            const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')}`
            const isFuture = new Date(year, month-1, day) > today
            const dowIdx = (firstDow + i) % 7
            const isTraining = trainingSet.has(dowIdx)
            const attended = attendedDays.has(dateStr)
            const isToday = dateStr === format(today, 'yyyy-MM-dd')
            const missed = isTraining && !attended && !isFuture

            return (
              <div
                key={day}
                className={`
                  aspect-square flex items-center justify-center rounded-lg text-xs font-semibold mx-0.5
                  ${attended ? 'bg-accent text-white' : ''}
                  ${missed   ? 'bg-danger/15 text-danger' : ''}
                  ${!isTraining && !attended ? 'text-muted/40' : ''}
                  ${isFuture && isTraining ? 'text-muted border border-border' : ''}
                  ${isToday  ? 'ring-2 ring-accent/60' : ''}
                `}
              >
                {day}
              </div>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex gap-4 mt-3 pt-3 border-t border-border">
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-accent" /><p className="text-xs text-muted">Presente</p></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-danger/20" /><p className="text-xs text-muted">Faltou</p></div>
          <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm border border-border" /><p className="text-xs text-muted">Previsto</p></div>
        </div>
      </div>
    </div>
  )
}

/* ── Pagamentos Tab ───────────────────────────────────────────────────── */
function PagamentosTab({ student }) {
  const qc = useQueryClient()
  const [addOpen, setAddOpen] = useState(false)

  const { data: payments = [] } = useQuery({
    queryKey: ['student-payments', student.id],
    queryFn: () => studentsApi.payments(student.id),
  })

  const totalPaidYear = payments
    .filter(p => p.status === 'paid' && p.paid_at?.startsWith(String(new Date().getFullYear())))
    .reduce((s, p) => s + p.amount, 0)

  const pagarMutation = useMutation({
    mutationFn: () => studentsApi.pagar(student.id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student', student.id] })
      qc.invalidateQueries({ queryKey: ['student-payments', student.id] })
      qc.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Pagamento confirmado!')
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro'),
  })

  const today = new Date(); today.setHours(0,0,0,0)
  const pp = student.proximo_pagamento
  const ppDate = pp ? new Date(pp) : null
  const isOverdue = ppDate && ppDate < today
  const isDueSoon = ppDate && ppDate >= today && ppDate <= new Date(today.getTime() + 3*86400000)
  const showConfirm = isOverdue || isDueSoon

  return (
    <div className="pb-6 space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-2 gap-2">
        <MiniCard label="Pago no ano" value={fmtMoney(totalPaidYear)} color="text-success" />
        <MiniCard
          label="Próx. vencimento"
          value={pp ? fmtDate(pp) : '—'}
          color={isOverdue ? 'text-danger' : isDueSoon ? 'text-warning' : 'text-primary'}
        />
      </div>

      {showConfirm && (
        <Button
          className="w-full"
          disabled={pagarMutation.isPending}
          onClick={() => pagarMutation.mutate()}
        >
          {pagarMutation.isPending ? 'Confirmando...' : `Confirmar mensalidade · ${fmtMoney(student.plan?.price ?? 0)}`}
        </Button>
      )}

      {/* Payment history */}
      <div className="bg-white border border-border rounded-2xl overflow-hidden">
        {payments.length === 0 && (
          <p className="p-4 text-center text-sm text-muted">Nenhum pagamento registrado</p>
        )}
        {payments.filter(p => p.status === 'paid').map((p, i, arr) => (
          <div
            key={p.id}
            className={`flex items-center justify-between p-4 ${i < arr.length - 1 ? 'border-b border-border' : ''}`}
          >
            <div>
              <p className="text-sm font-semibold text-primary">Pago em {fmtDate(p.paid_at)}</p>
              <p className="text-xs text-muted">{p.payment_method ? METHOD_LABELS[p.payment_method] : '—'}</p>
            </div>
            <p className="text-sm font-bold text-success">{fmtMoney(p.amount)}</p>
          </div>
        ))}
      </div>

      <Button onClick={() => setAddOpen(true)} variant="outline" className="w-full text-sm">
        + Lançar pagamento manual
      </Button>

      <AddPaymentDialog
        open={addOpen}
        onClose={() => setAddOpen(false)}
        studentId={student.id}
        planPrice={student.plan?.price}
      />
    </div>
  )
}

function MiniCard({ label, value, color = 'text-primary' }) {
  return (
    <div className="bg-white border border-border rounded-xl p-3 text-center">
      <p className="text-xs text-muted mb-1">{label}</p>
      <p className={`text-sm font-bold ${color}`}>{value}</p>
    </div>
  )
}

function AddPaymentDialog({ open, onClose, studentId, planPrice }) {
  const qc = useQueryClient()
  const [form, setForm] = useState({
    amount: planPrice ?? '',
    due_date: '',
    notes: '',
  })

  const mutation = useMutation({
    mutationFn: (data) => paymentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['student-payments', studentId] })
      toast.success('Pagamento registrado!')
      onClose()
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.due_date) return toast.error('Informe a data de vencimento')
    mutation.mutate({ student_id: studentId, amount: Number(form.amount), due_date: form.due_date, notes: form.notes })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Registrar pagamento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Valor (R$)</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} />
          </div>
          <div>
            <Label>Data de vencimento</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))} required />
          </div>
          <div>
            <Label>Observações</Label>
            <Input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} placeholder="Opcional" />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Registrar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}

