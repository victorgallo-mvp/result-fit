import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/api/financial'
import { fmtMoney, fmtDate, currentMonthStr, fmtMonthLabel, monthsBack } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Minus, Plus, Trash2, ChevronLeft, ChevronRight } from 'lucide-react'
import { toast } from 'sonner'

const INCOME_CATEGORIES  = ['Mensalidade','Avaliação','Consultoria','Outros']
const EXPENSE_CATEGORIES = ['Aluguel','Material','Uniforme','Curso','Transporte','Outros']

export default function Financeiro() {
  const qc = useQueryClient()
  const months = monthsBack(6)
  const [month, setMonth] = useState(currentMonthStr())
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState('income')

  const { data, isLoading } = useQuery({
    queryKey: ['financial', month],
    queryFn: () => financialApi.list(month),
  })

  const deleteMutation = useMutation({
    mutationFn: financialApi.remove,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial', month] })
      toast.success('Removido')
    },
    onError: () => toast.error('Erro ao remover'),
  })

  const txs = data?.transactions ?? []
  const income  = data?.income  ?? 0
  const expense = data?.expense ?? 0
  const balance = data?.balance ?? 0

  const monthIdx = months.indexOf(month)

  const openAdd = (type) => { setAddType(type); setAddOpen(true) }

  return (
    <div className="px-4 pt-12 pb-6">
      {/* Header + month nav */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-2xl font-extrabold text-primary">Financeiro</h1>
        <div className="flex items-center gap-1">
          <button
            onClick={() => monthIdx < months.length - 1 && setMonth(months[monthIdx + 1])}
            disabled={monthIdx >= months.length - 1}
            className="p-2 rounded-xl hover:bg-raised text-muted disabled:opacity-30"
          >
            <ChevronLeft size={18} />
          </button>
          <span className="text-sm font-semibold text-primary capitalize px-1">{fmtMonthLabel(month)}</span>
          <button
            onClick={() => monthIdx > 0 && setMonth(months[monthIdx - 1])}
            disabled={monthIdx <= 0}
            className="p-2 rounded-xl hover:bg-raised text-muted disabled:opacity-30"
          >
            <ChevronRight size={18} />
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-2 mb-5">
        <SummaryCard label="Entradas" value={fmtMoney(income)} icon={TrendingUp} color="text-success" bg="bg-success/10" />
        <SummaryCard label="Saídas"   value={fmtMoney(expense)} icon={TrendingDown} color="text-danger"  bg="bg-danger/10"  />
        <SummaryCard
          label="Saldo"
          value={fmtMoney(balance)}
          icon={Minus}
          color={balance >= 0 ? 'text-accent' : 'text-danger'}
          bg={balance >= 0 ? 'bg-accent/10' : 'bg-danger/10'}
        />
      </div>

      {/* Add buttons */}
      <div className="flex gap-2 mb-5">
        <Button variant="success" className="flex-1" onClick={() => openAdd('income')}>
          <TrendingUp size={16} /> + Entrada
        </Button>
        <Button variant="danger" className="flex-1" onClick={() => openAdd('expense')}>
          <TrendingDown size={16} /> + Saída
        </Button>
      </div>

      {/* Transaction list */}
      {isLoading && (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-16 rounded-2xl bg-white animate-pulse" />)}</div>
      )}

      {!isLoading && txs.length === 0 && (
        <div className="text-center py-16">
          <p className="font-semibold text-primary">Nenhuma transação</p>
          <p className="text-sm text-muted mt-1">Adicione entradas e saídas do mês</p>
        </div>
      )}

      <div className="space-y-2 stagger">
        {txs.map(tx => (
          <div key={tx.id} className="flex items-center gap-3 p-4 bg-white border border-border rounded-2xl">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${tx.type === 'income' ? 'bg-success/10' : 'bg-danger/10'}`}>
              {tx.type === 'income'
                ? <TrendingUp  size={16} className="text-success" />
                : <TrendingDown size={16} className="text-danger"  />
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-primary truncate">{tx.description}</p>
              <p className="text-xs text-muted">{tx.category} · {fmtDate(tx.date)}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmtMoney(tx.amount)}
              </p>
              <button
                onClick={() => { if (confirm('Remover transação?')) deleteMutation.mutate(tx.id) }}
                className="w-8 h-8 rounded-lg hover:bg-danger/10 text-muted hover:text-danger flex items-center justify-center transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <AddTransactionDialog
        key={`${addType}-${String(addOpen)}`}
        open={addOpen}
        onClose={() => setAddOpen(false)}
        type={addType}
        month={month}
      />
    </div>
  )
}

function SummaryCard({ label, value, icon: Icon, color, bg }) {
  return (
    <div className="bg-white border border-border rounded-2xl p-3">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-2 ${bg}`}>
        <Icon size={15} className={color} />
      </div>
      <p className="text-xs text-muted">{label}</p>
      <p className={`text-sm font-extrabold ${color} mt-0.5`}>{value}</p>
    </div>
  )
}

function AddTransactionDialog({ open, onClose, type, month }) {
  const qc = useQueryClient()
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const [form, setForm] = useState({
    type,
    category: categories[0],
    amount: '',
    date: month ? `${month}-01` : '',
    description: '',
  })

  const mutation = useMutation({
    mutationFn: financialApi.create,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      toast.success(form.type === 'income' ? 'Entrada registrada!' : 'Saída registrada!')
      onClose()
    },
    onError: () => toast.error('Erro ao salvar'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.amount || !form.date || !form.description) return toast.error('Preencha todos os campos')
    mutation.mutate({ ...form, amount: Number(form.amount) })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title={type === 'income' ? '+ Registrar entrada' : '+ Registrar saída'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={v => setForm(f=>({...f,category:v}))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {categories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Descrição *</Label>
            <Input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder="Ex: Mensalidade João" required />
          </div>
          <div>
            <Label>Valor (R$) *</Label>
            <Input type="number" step="0.01" min="0" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} required />
          </div>
          <div>
            <Label>Data *</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} required />
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
