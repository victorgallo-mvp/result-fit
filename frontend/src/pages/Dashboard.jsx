import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '@/api/dashboard'
import { studentsApi } from '@/api/students'
import { fmtMoney, fmtDate, avatarColor } from '@/lib/utils'
import { Clock, AlertCircle, ChevronRight, CheckCircle, Loader2 } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

import { toast } from 'sonner'

export default function Dashboard() {
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: dashboardApi.get,
  })

  const confirmMutation = useMutation({
    mutationFn: (studentId) => studentsApi.pagar(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] })
      toast.success('Pagamento confirmado!')
    },
    onError: () => toast.error('Erro ao confirmar pagamento'),
  })

  const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="px-4 pt-12 pb-6">
      <p className="text-xs font-semibold text-accent uppercase tracking-widest capitalize">{monthLabel}</p>
      <h1 className="text-2xl font-extrabold text-primary mt-0.5 mb-5">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <KpiCard
          icon={AlertCircle}
          label="Mensalidades vencidas"
          value={data?.mensalidades_vencidas ?? '—'}
          loading={isLoading}
          danger={data?.mensalidades_vencidas > 0}
        />
        <KpiCard
          icon={Clock}
          label="Vencendo em 3 dias"
          value={data?.mensalidades_vencendo ?? '—'}
          loading={isLoading}
          warn={data?.mensalidades_vencendo > 0}
        />
      </div>

      {/* Vencidas — com confirmar pagamento */}
      {data?.vencidas?.length > 0 && (
        <Section title="Mensalidades vencidas" className="mb-3" titleColor="text-danger">
          {data.vencidas.map(p => (
            <PaymentRow
              key={p.id}
              payment={p}
              onClick={() => navigate(`/alunos/${p.id}`)}
              color="text-danger"
              onConfirm={() => confirmMutation.mutate(p.id)}
              confirming={confirmMutation.isPending && confirmMutation.variables === p.id}
            />
          ))}
        </Section>
      )}

      {/* Vencendo em 3 dias */}
      {data?.vencendo_3_dias?.length > 0 && (
        <Section title="Vencendo nos próximos 3 dias" className="mb-3" titleColor="text-warning">
          {data.vencendo_3_dias.map(p => (
            <PaymentRow
              key={p.id}
              payment={p}
              onClick={() => navigate(`/alunos/${p.id}`)}
              color="text-warning"
              onConfirm={() => confirmMutation.mutate(p.id)}
              confirming={confirmMutation.isPending && confirmMutation.variables === p.id}
            />
          ))}
        </Section>
      )}

      {/* Aniversariantes do mês */}
      {data?.aniversariantes?.length > 0 && (
        <Section title="Aniversariantes do mês" className="mb-3">
          {data.aniversariantes.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/alunos/${s.id}`)}
              className="flex items-center gap-3 w-full py-2.5 border-b border-border last:border-0"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                style={{ backgroundColor: avatarColor(s.name) }}
              >
                {s.name[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-primary">{s.name}</p>
                <p className="text-xs text-muted">Dia {s.birthday?.slice(8, 10)} · {s.age_completing} anos</p>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </button>
          ))}
        </Section>
      )}

      {!isLoading && !data?.vencidas?.length && !data?.vencendo_3_dias?.length && (
        <div className="text-center py-16">
          <p className="font-semibold text-primary">Tudo em dia</p>
          <p className="text-sm text-muted mt-1">Nenhum pagamento vencido ou próximo do vencimento</p>
        </div>
      )}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, loading, warn, danger }) {
  const textColor = danger ? 'text-danger' : warn ? 'text-warning' : 'text-primary'
  const bgColor   = danger ? 'bg-danger/10' : warn ? 'bg-warning/10' : 'bg-raised'
  return (
    <div className="bg-white border border-border rounded-2xl p-4 shadow-sm">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${bgColor}`}>
        <Icon size={16} className={textColor} />
      </div>
      <p className="text-xs text-muted font-medium mb-1">{label}</p>
      {loading
        ? <div className="h-7 w-16 bg-raised rounded-lg animate-pulse" />
        : <p className={`text-xl font-extrabold ${textColor}`}>{value}</p>
      }
    </div>
  )
}

function Section({ title, children, className, titleColor = 'text-muted' }) {
  return (
    <div className={`bg-white border border-border rounded-2xl p-4 shadow-sm ${className ?? ''}`}>
      <p className={`text-xs font-bold uppercase tracking-wider mb-3 ${titleColor}`}>{title}</p>
      {children}
    </div>
  )
}

function PaymentRow({ payment, onClick, color, onConfirm, confirming }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border last:border-0">
      <button onClick={onClick} className="flex items-center justify-between flex-1 min-w-0 text-left">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{payment.student_name}</p>
          <p className="text-xs text-muted">Vence {fmtDate(payment.due_date)}</p>
        </div>
        <div className="flex items-center gap-2 ml-2">
          <span className={`text-sm font-bold ${color}`}>{fmtMoney(payment.amount)}</span>
          {!onConfirm && <ChevronRight size={14} className="text-muted" />}
        </div>
      </button>

      {onConfirm && (
        <button
          onClick={(e) => { e.stopPropagation(); onConfirm() }}
          disabled={confirming}
          title="Confirmar pagamento"
          className="flex-shrink-0 w-8 h-8 rounded-full bg-success/10 text-success flex items-center justify-center hover:bg-success/20 active:bg-success active:text-white transition-colors"
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
