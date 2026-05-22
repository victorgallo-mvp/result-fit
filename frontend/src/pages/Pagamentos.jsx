import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { paymentsApi } from '@/api/payments'
import { studentsApi } from '@/api/students'
import { fmtDate, fmtMoney, STATUS_PAYMENT, METHOD_LABELS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { CreditCard, Check, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'

export default function Pagamentos() {
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [statusFilter, setStatusFilter] = useState('')
  const [addOpen, setAddOpen] = useState(false)
  const [paidOpen, setPaidOpen] = useState(false)
  const [selected, setSelected] = useState(null)
  const [paidForm, setPaidForm] = useState({ paid_at: '', payment_method: 'pix' })

  const { data: payments = [], isLoading } = useQuery({
    queryKey: ['payments', statusFilter],
    queryFn: () => paymentsApi.list(statusFilter ? { status: statusFilter } : {}),
  })

  const markPaidMutation = useMutation({
    mutationFn: ({ id, data }) => paymentsApi.markPaid(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payments-dashboard'] })
      toast.success('Pagamento registrado!')
      setPaidOpen(false)
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro'),
  })

  const openMarkPaid = (p, e) => {
    e.stopPropagation()
    setSelected(p)
    setPaidForm({ paid_at: format(new Date(), 'yyyy-MM-dd'), payment_method: 'pix' })
    setPaidOpen(true)
  }

  const filters = [
    ['', 'Todos'],
    ['pending', 'Pendentes'],
    ['overdue', 'Vencidos'],
    ['paid', 'Pagos'],
  ]

  return (
    <div className="px-4 pt-12 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Pagamentos</h1>
          <p className="text-sm text-muted">{payments.length} registros</p>
        </div>
        <Button size="icon" onClick={() => setAddOpen(true)}>+</Button>
      </div>

      {/* Status filter */}
      <div className="flex gap-2 overflow-x-auto pb-1 mb-4 no-scrollbar">
        {filters.map(([val, label]) => (
          <button
            key={val}
            onClick={() => setStatusFilter(val)}
            className={`flex-shrink-0 px-4 py-2 rounded-full text-xs font-bold border transition-all ${statusFilter === val ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-primary'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* List */}
      {isLoading && (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-20 rounded-2xl bg-white animate-pulse" />)}</div>
      )}

      {!isLoading && payments.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <CreditCard size={40} className="text-muted mb-3" />
          <p className="font-semibold text-primary">Nenhum pagamento encontrado</p>
        </div>
      )}

      <div className="space-y-2 stagger">
        {payments.map(p => {
          const st = STATUS_PAYMENT[p.status]
          return (
            <div
              key={p.id}
              onClick={() => navigate(`/alunos/${p.student_id}`)}
              className="pressable flex items-center gap-4 p-4 bg-white border border-border rounded-2xl cursor-pointer"
            >
              <div className="flex-1 min-w-0">
                <p className="font-bold text-primary truncate">{p.student_name}</p>
                <p className="text-xs text-muted mt-0.5">
                  Venc. {fmtDate(p.due_date)}
                  {p.paid_at ? ` · Pago ${fmtDate(p.paid_at)}` : ''}
                  {p.payment_method ? ` · ${METHOD_LABELS[p.payment_method]}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                <div className="text-right">
                  <p className="text-sm font-bold text-primary">{fmtMoney(p.amount)}</p>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${st.color}`}>{st.label}</span>
                </div>
                {p.status !== 'paid' && (
                  <button
                    onClick={(e) => openMarkPaid(p, e)}
                    className="w-9 h-9 rounded-xl bg-accent/10 text-accent flex items-center justify-center hover:bg-accent/20 transition-colors"
                  >
                    <Check size={16} strokeWidth={3} />
                  </button>
                )}
                {p.status === 'paid' && (
                  <ChevronRight size={16} className="text-muted" />
                )}
              </div>
            </div>
          )
        })}
      </div>

      {/* Mark paid dialog */}
      <Dialog open={paidOpen} onOpenChange={setPaidOpen}>
        <DialogContent title="Registrar pagamento">
          <div className="space-y-4">
            <p className="text-sm text-muted">
              {selected?.student_name} · Venc. {fmtDate(selected?.due_date)} · {fmtMoney(selected?.amount)}
            </p>
            <div>
              <Label>Data do pagamento</Label>
              <Input type="date" value={paidForm.paid_at} onChange={e => setPaidForm(f=>({...f,paid_at:e.target.value}))} />
            </div>
            <div>
              <Label>Forma de pagamento</Label>
              <Select value={paidForm.payment_method} onValueChange={v => setPaidForm(f=>({...f,payment_method:v}))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="pix">Pix</SelectItem>
                  <SelectItem value="dinheiro">Dinheiro</SelectItem>
                  <SelectItem value="cartao">Cartão</SelectItem>
                  <SelectItem value="transferencia">Transferência</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              className="w-full"
              disabled={!paidForm.paid_at || markPaidMutation.isPending}
              onClick={() => markPaidMutation.mutate({ id: selected.id, data: paidForm })}
            >
              {markPaidMutation.isPending ? 'Salvando...' : 'Confirmar pagamento'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <AddPaymentDialog open={addOpen} onClose={() => setAddOpen(false)} />
    </div>
  )
}

function AddPaymentDialog({ open, onClose }) {
  const qc = useQueryClient()
  const { data: students = [] } = useQuery({
    queryKey: ['students', 'active'],
    queryFn: () => studentsApi.list({ status: 'active' }),
  })
  const [form, setForm] = useState({ student_id: '', amount: '', due_date: '', notes: '' })

  const mutation = useMutation({
    mutationFn: (data) => paymentsApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['payments'] })
      qc.invalidateQueries({ queryKey: ['payments-dashboard'] })
      toast.success('Pagamento criado!')
      onClose()
      setForm({ student_id:'', amount:'', due_date:'', notes:'' })
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.student_id || !form.amount || !form.due_date) return toast.error('Preencha todos os campos obrigatórios')
    mutation.mutate({ ...form, amount: Number(form.amount) })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Novo pagamento">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Aluno *</Label>
            <Select value={form.student_id} onValueChange={v => {
              const s = students.find(x => x.id === v)
              setForm(f => ({ ...f, student_id: v, amount: s?.plan?.price ?? f.amount }))
            }}>
              <SelectTrigger><SelectValue placeholder="Selecionar aluno" /></SelectTrigger>
              <SelectContent>
                {students.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} />
          </div>
          <div>
            <Label>Vencimento *</Label>
            <Input type="date" value={form.due_date} onChange={e => setForm(f=>({...f,due_date:e.target.value}))} />
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
