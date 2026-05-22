import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { plansApi } from '@/api/plans'
import { fmtMoney, DAY_LABELS } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dialog, DialogContent } from '@/components/ui/dialog'
import { BookOpen, Edit2, Trash2, Plus } from 'lucide-react'
import { toast } from 'sonner'

export default function Planos() {
  const qc = useQueryClient()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing]   = useState(null)

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ['plans'],
    queryFn: plansApi.list,
  })

  const deleteMutation = useMutation({
    mutationFn: plansApi.remove,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['plans'] }); toast.success('Plano removido') },
    onError: err => toast.error(err.response?.data?.detail || 'Erro ao remover'),
  })

  const openEdit = (plan) => { setEditing(plan); setFormOpen(true) }
  const openCreate = () => { setEditing(null); setFormOpen(true) }

  return (
    <div className="px-4 pt-12 pb-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h1 className="text-2xl font-extrabold text-primary">Planos</h1>
          <p className="text-sm text-muted">{plans.length} planos cadastrados</p>
        </div>
        <Button size="icon" onClick={openCreate}><Plus size={20} /></Button>
      </div>

      {isLoading && (
        <div className="space-y-3">{[1,2,3].map(i => <div key={i} className="h-24 rounded-2xl bg-white animate-pulse" />)}</div>
      )}

      {!isLoading && plans.length === 0 && (
        <div className="flex flex-col items-center py-20 text-center">
          <BookOpen size={40} className="text-muted mb-3" />
          <p className="font-semibold text-primary">Nenhum plano cadastrado</p>
          <Button className="mt-4" onClick={openCreate}><Plus size={16} /> Criar plano</Button>
        </div>
      )}

      <div className="space-y-3 stagger">
        {plans.map(plan => (
          <div key={plan.id} className="bg-white border border-border rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="font-bold text-primary text-lg">{plan.name}</p>
                <p className="text-sm text-muted">{plan.frequency_per_week}x por semana</p>
              </div>
              <p className="text-2xl font-extrabold text-accent">{fmtMoney(plan.price)}<span className="text-sm font-normal text-muted">/mês</span></p>
            </div>

            <div className="flex items-center gap-2">
              <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${plan.active ? 'bg-success/10 text-success' : 'bg-muted/10 text-muted'}`}>
                {plan.active ? 'Ativo' : 'Inativo'}
              </span>
              <div className="flex-1" />
              <button onClick={() => openEdit(plan)} className="w-9 h-9 rounded-xl hover:bg-raised text-muted hover:text-primary flex items-center justify-center transition-colors">
                <Edit2 size={15} />
              </button>
              <button
                onClick={() => {
                  if (confirm(`Remover "${plan.name}"?`)) deleteMutation.mutate(plan.id)
                }}
                className="w-9 h-9 rounded-xl hover:bg-danger/10 text-muted hover:text-danger flex items-center justify-center transition-colors"
              >
                <Trash2 size={15} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <PlanDialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        plan={editing}
      />
    </div>
  )
}

function PlanDialog({ open, onClose, plan }) {
  const qc = useQueryClient()
  const isEdit = !!plan
  const [form, setForm] = useState({
    name: plan?.name ?? '',
    price: plan?.price ?? '',
    frequency_per_week: plan?.frequency_per_week ?? 3,
  })

  useEffect(() => {
    if (plan) setForm({ name: plan.name, price: plan.price, frequency_per_week: plan.frequency_per_week })
    else setForm({ name: '', price: '', frequency_per_week: 3 })
  }, [plan])

  const mutation = useMutation({
    mutationFn: (data) => isEdit ? plansApi.update(plan.id, data) : plansApi.create(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['plans'] })
      toast.success(isEdit ? 'Plano atualizado!' : 'Plano criado!')
      onClose()
    },
    onError: err => toast.error(err.response?.data?.detail || 'Erro'),
  })

  const handleSubmit = (e) => {
    e.preventDefault()
    if (!form.name || !form.price) return toast.error('Preencha nome e valor')
    mutation.mutate({ ...form, price: Number(form.price), frequency_per_week: Number(form.frequency_per_week) })
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent title={isEdit ? 'Editar plano' : 'Novo plano'}>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label>Nome do plano *</Label>
            <Input
              value={form.name}
              onChange={e => setForm(f=>({...f,name:e.target.value}))}
              placeholder="Ex: Mensal 3x"
              required
            />
          </div>
          <div>
            <Label>Valor mensal (R$) *</Label>
            <Input
              type="number"
              step="0.01"
              min="0"
              value={form.price}
              onChange={e => setForm(f=>({...f,price:e.target.value}))}
              placeholder="200.00"
              required
            />
          </div>
          <div>
            <Label>Frequência semanal</Label>
            <div className="flex gap-2">
              {[1,2,3,4,5,6,7].map(n => (
                <button
                  type="button"
                  key={n}
                  onClick={() => setForm(f=>({...f,frequency_per_week:n}))}
                  className={`flex-1 h-10 rounded-xl text-sm font-bold border transition-all ${form.frequency_per_week === n ? 'bg-accent text-white border-accent' : 'border-border text-muted hover:text-primary'}`}
                >
                  {n}x
                </button>
              ))}
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={mutation.isPending}>
            {mutation.isPending ? 'Salvando...' : isEdit ? 'Salvar alterações' : 'Criar plano'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
