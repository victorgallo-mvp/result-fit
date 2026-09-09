import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { financialApi } from '@/api/financial'
import { fmtMoney, fmtDate, currentMonthStr, fmtMonthLabel, monthsBack } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select'
import { TrendingUp, TrendingDown, Minus, Trash2, ChevronLeft, ChevronRight, Repeat, Pause, Play } from 'lucide-react'
import { toast } from 'sonner'
import { BackButton } from '@/components/BackButton'

const INCOME_CATEGORIES  = ['Mensalidade','Avaliação','Consultoria','Outros']
const EXPENSE_CATEGORIES = ['Aluguel','Material','Uniforme','Curso','Transporte','Outros']

const MODES = [
  { value: 'unico',     label: 'Único' },
  { value: 'fixo',      label: 'Fixo mensal' },
  { value: 'parcelado', label: 'Parcelado' },
]

export default function Financeiro() {
  const qc = useQueryClient()
  const months = monthsBack(6)
  const [month, setMonth] = useState(currentMonthStr())
  const [addOpen, setAddOpen] = useState(false)
  const [addType, setAddType] = useState('income')
  const [fixasOpen, setFixasOpen] = useState(false)
  const [deleting, setDeleting] = useState(null) // tx com vínculo (fixa/parcela) aguardando escolha

  const { data, isLoading } = useQuery({
    queryKey: ['financial', month],
    queryFn: () => financialApi.list(month),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ id, scope }) => financialApi.remove(id, scope),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['financial'] })
      qc.invalidateQueries({ queryKey: ['recurring'] })
      setDeleting(null)
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

  const askDelete = (tx) => {
    if (tx.recurring_id || tx.installment_group_id) return setDeleting(tx)
    if (confirm('Remover transação?')) deleteMutation.mutate({ id: tx.id, scope: 'one' })
  }

  return (
    <div className="px-4 pt-12 pb-6">
      <BackButton />
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
        <Button variant="outline" size="icon" title="Lançamentos fixos" onClick={() => setFixasOpen(true)}>
          <Repeat size={16} />
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
              <p className="text-xs text-muted flex items-center gap-1.5 flex-wrap">
                <span>{tx.category} · {fmtDate(tx.date)}</span>
                {tx.recurring_id && <Badge variant="accent" className="px-1.5 py-0 text-[10px]"><Repeat size={9} className="mr-0.5" /> Fixa</Badge>}
                {tx.installment_group_id && <Badge className="px-1.5 py-0 text-[10px]">{tx.parcela_num}/{tx.parcela_total}</Badge>}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <p className={`text-sm font-bold ${tx.type === 'income' ? 'text-success' : 'text-danger'}`}>
                {tx.type === 'income' ? '+' : '-'}{fmtMoney(tx.amount)}
              </p>
              <button
                onClick={() => askDelete(tx)}
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

      <RecurringSheet open={fixasOpen} onClose={() => setFixasOpen(false)} />

      <DeleteScopeDialog
        tx={deleting}
        onClose={() => setDeleting(null)}
        pending={deleteMutation.isPending}
        onChoose={(scope) => deleteMutation.mutate({ id: deleting.id, scope })}
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

/* ── Excluir lançamento vinculado (fixa ou parcela) ─────────────────── */
function DeleteScopeDialog({ tx, onClose, onChoose, pending }) {
  if (!tx) return null
  const isFixa = !!tx.recurring_id
  return (
    <Dialog open={!!tx} onOpenChange={onClose}>
      <DialogContent title={isFixa ? 'Lançamento fixo' : 'Lançamento parcelado'}>
        <p className="text-sm text-muted mb-4">
          {isFixa
            ? `"${tx.description}" é gerado todo mês. O que você quer remover?`
            : `"${tx.description}" faz parte de um parcelamento em ${tx.parcela_total}x. O que você quer remover?`}
        </p>
        <div className="space-y-2">
          <Button variant="outline" className="w-full" disabled={pending} onClick={() => onChoose('one')}>
            {isFixa ? 'Só este mês' : 'Só esta parcela'}
          </Button>
          <Button variant="danger" className="w-full" disabled={pending} onClick={() => onChoose('group')}>
            {isFixa ? 'Este mês e parar de repetir' : 'Todas as parcelas'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Lista de fixas ─────────────────────────────────────────────────── */
function RecurringSheet({ open, onClose }) {
  const qc = useQueryClient()
  const { data: recs = [], isLoading } = useQuery({
    queryKey: ['recurring'],
    queryFn: financialApi.listRecurring,
    enabled: open,
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['recurring'] })
    qc.invalidateQueries({ queryKey: ['financial'] })
  }

  const toggleMutation = useMutation({
    mutationFn: ({ id, active }) => financialApi.updateRecurring(id, { active }),
    onSuccess: () => { invalidate(); toast.success('Atualizado') },
    onError: () => toast.error('Erro ao atualizar'),
  })

  const removeMutation = useMutation({
    mutationFn: (id) => financialApi.removeRecurring(id, false),
    onSuccess: () => { invalidate(); toast.success('Recorrência removida') },
    onError: () => toast.error('Erro ao remover'),
  })

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title="Lançamentos fixos">
        <p className="text-xs text-muted mb-4">
          Entram sozinhos todo mês no dia marcado. Para criar um novo, use + Entrada ou + Saída e escolha "Fixo mensal".
        </p>

        {isLoading && <div className="h-16 rounded-2xl bg-raised animate-pulse" />}

        {!isLoading && recs.length === 0 && (
          <p className="text-sm text-muted text-center py-8">Nenhum lançamento fixo ainda</p>
        )}

        <div className="space-y-2">
          {recs.map(r => (
            <div key={r.id} className={`flex items-center gap-3 p-3 border border-border rounded-2xl ${r.active ? 'bg-white' : 'bg-raised opacity-60'}`}>
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${r.type === 'income' ? 'bg-success/10' : 'bg-danger/10'}`}>
                {r.type === 'income'
                  ? <TrendingUp  size={15} className="text-success" />
                  : <TrendingDown size={15} className="text-danger"  />}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-primary truncate">{r.description}</p>
                <p className="text-xs text-muted">
                  {r.category} · todo dia {r.day_of_month}
                  {r.end_date ? ` · até ${fmtDate(r.end_date)}` : ''}
                  {!r.active ? ' · pausado' : ''}
                </p>
              </div>
              <p className={`text-sm font-bold flex-shrink-0 ${r.type === 'income' ? 'text-success' : 'text-danger'}`}>
                {fmtMoney(r.amount)}
              </p>
              <button
                onClick={() => toggleMutation.mutate({ id: r.id, active: !r.active })}
                title={r.active ? 'Pausar' : 'Retomar'}
                className="w-8 h-8 rounded-lg hover:bg-raised text-muted hover:text-primary flex items-center justify-center"
              >
                {r.active ? <Pause size={14} /> : <Play size={14} />}
              </button>
              <button
                onClick={() => { if (confirm('Remover esta recorrência? Os meses já lançados continuam no histórico.')) removeMutation.mutate(r.id) }}
                className="w-8 h-8 rounded-lg hover:bg-danger/10 text-muted hover:text-danger flex items-center justify-center"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ── Novo lançamento ────────────────────────────────────────────────── */
function AddTransactionDialog({ open, onClose, type, month }) {
  const qc = useQueryClient()
  const categories = type === 'income' ? INCOME_CATEGORIES : EXPENSE_CATEGORIES
  const [mode, setMode] = useState('unico')
  const [form, setForm] = useState({
    type,
    category: categories[0],
    amount: '',
    date: month ? `${month}-01` : '',
    description: '',
    parcelas: 2,
    end_date: '',
  })

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ['financial'] })
    qc.invalidateQueries({ queryKey: ['recurring'] })
  }

  const mutation = useMutation({
    mutationFn: (payload) => mode === 'fixo'
      ? financialApi.createRecurring(payload)
      : financialApi.create(payload),
    onSuccess: () => {
      invalidate()
      toast.success(
        mode === 'fixo' ? 'Lançamento fixo criado!'
        : mode === 'parcelado' ? `${form.parcelas} parcelas lançadas!`
        : form.type === 'income' ? 'Entrada registrada!' : 'Saída registrada!'
      )
      onClose()
    },
    onError: (err) => toast.error(err.response?.data?.detail || 'Erro ao salvar'),
  })

  const amount = Number(form.amount) || 0
  const parcelas = Math.max(2, Number(form.parcelas) || 2)
  const dayOfMonth = form.date ? Number(form.date.slice(8, 10)) : null

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.amount || !form.date || !form.description) return toast.error('Preencha todos os campos')
    if (amount <= 0) return toast.error('Informe um valor maior que zero')

    if (mode === 'fixo') {
      return mutation.mutate({
        type: form.type,
        category: form.category,
        amount,
        description: form.description,
        day_of_month: dayOfMonth,
        start_date: form.date,
        end_date: form.end_date || null,
      })
    }
    mutation.mutate({
      type: form.type,
      category: form.category,
      amount,
      date: form.date,
      description: form.description,
      parcelas: mode === 'parcelado' ? parcelas : 1,
    })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title={type === 'income' ? '+ Registrar entrada' : '+ Registrar saída'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Tipo de lançamento</Label>
            <div className="flex gap-1.5 flex-wrap">
              {MODES.map(m => (
                <button
                  type="button"
                  key={m.value}
                  onClick={() => setMode(m.value)}
                  className={`px-4 py-1.5 rounded-lg text-xs font-bold border transition-all ${mode === m.value ? 'bg-accent text-white border-accent' : 'bg-raised border-border text-muted hover:text-primary'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          </div>
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
            <Input value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} placeholder={mode === 'fixo' ? 'Ex: Aluguel do estúdio' : 'Ex: Mensalidade João'} required />
          </div>
          <div>
            <Label>{mode === 'parcelado' ? 'Valor total (R$) *' : 'Valor (R$) *'}</Label>
            <Input type="number" step="0.01" min="0" inputMode="decimal" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} required />
          </div>

          {mode === 'parcelado' && (
            <div>
              <Label>Parcelas *</Label>
              <Input type="number" min="2" max="60" inputMode="numeric" value={form.parcelas} onChange={e => setForm(f=>({...f,parcelas:e.target.value}))} required />
              {amount > 0 && (
                <p className="text-xs text-muted mt-1">
                  {parcelas}x de {fmtMoney(amount / parcelas)} · uma por mês a partir da data abaixo
                </p>
              )}
            </div>
          )}

          <div>
            <Label>{mode === 'fixo' ? 'Primeiro lançamento *' : mode === 'parcelado' ? 'Primeira parcela *' : 'Data *'}</Label>
            <Input type="date" value={form.date} onChange={e => setForm(f=>({...f,date:e.target.value}))} required />
            {mode === 'fixo' && dayOfMonth && (
              <p className="text-xs text-muted mt-1">
                Vai entrar todo dia {dayOfMonth} de cada mês, começando neste.
              </p>
            )}
          </div>

          {mode === 'fixo' && (
            <div>
              <Label>Até (opcional)</Label>
              <Input type="date" value={form.end_date} onChange={e => setForm(f=>({...f,end_date:e.target.value}))} />
              <p className="text-xs text-muted mt-1">Vazio = repete até você pausar ou remover.</p>
            </div>
          )}

          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : mode === 'fixo' ? 'Criar lançamento fixo' : mode === 'parcelado' ? `Lançar ${parcelas} parcelas` : 'Salvar'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
