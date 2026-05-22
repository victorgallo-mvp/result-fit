import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { dashboardApi } from '@/api/dashboard'
import { paymentsApi } from '@/api/payments'
import { studentsApi } from '@/api/students'
import { fmtMoney, fmtDate, currentMonthStr, avatarColor, getAge } from '@/lib/utils'
import { Users, TrendingUp, AlertCircle, Clock, ChevronRight, Cake } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function Dashboard() {
  const navigate = useNavigate()
  const month = currentMonthStr()

  const { data: summary, isLoading: loadSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: dashboardApi.summary,
  })

  const { data: payments } = useQuery({
    queryKey: ['payments-dashboard'],
    queryFn: paymentsApi.dashboard,
  })

  const { data: birthdays } = useQuery({
    queryKey: ['birthdays-month', month],
    queryFn: () => studentsApi.birthdaysMonth(month),
  })

  const monthLabel = format(new Date(), "MMMM 'de' yyyy", { locale: ptBR })

  return (
    <div className="px-4 pt-12 pb-6">
      <p className="text-xs font-semibold text-accent uppercase tracking-widest capitalize">{monthLabel}</p>
      <h1 className="text-2xl font-extrabold text-primary mt-0.5 mb-5">Dashboard</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 mb-6 stagger">
        <KpiCard
          icon={Users}
          label="Alunos ativos"
          value={summary?.total_alunos_ativos ?? '—'}
          loading={loadSummary}
          accent
        />
        <KpiCard
          icon={TrendingUp}
          label="Faturamento mês"
          value={summary ? fmtMoney(summary.faturamento_mes) : '—'}
          loading={loadSummary}
        />
        <KpiCard
          icon={Clock}
          label="Vencendo em 7 dias"
          value={summary?.mensalidades_vencendo ?? '—'}
          loading={loadSummary}
          warn={summary?.mensalidades_vencendo > 0}
        />
        <KpiCard
          icon={AlertCircle}
          label="Mensalidades vencidas"
          value={summary?.mensalidades_vencidas ?? '—'}
          loading={loadSummary}
          danger={summary?.mensalidades_vencidas > 0}
        />
      </div>

      {/* Frequência */}
      {summary && (
        <div className="bg-surface border border-border rounded-2xl p-4 mb-6">
          <p className="text-xs font-semibold text-muted uppercase tracking-wider mb-3">Frequência média — mês atual</p>
          <div className="flex items-end justify-between mb-2">
            <span className="text-3xl font-extrabold text-primary">{summary.taxa_frequencia_media}%</span>
          </div>
          <div className="h-2 bg-border rounded-full overflow-hidden">
            <div
              className="h-full bg-accent rounded-full transition-all duration-700"
              style={{ width: `${summary.taxa_frequencia_media}%` }}
            />
          </div>
        </div>
      )}

      {/* Vencendo em 7 dias */}
      {payments?.vencendo_7_dias?.length > 0 && (
        <Section title="⏰ Vencendo nos próximos 7 dias" className="mb-4">
          {payments.vencendo_7_dias.map(p => (
            <PaymentRow
              key={p.id}
              payment={p}
              onClick={() => navigate(`/alunos/${p.student_id}`)}
              color="text-warning"
            />
          ))}
        </Section>
      )}

      {/* Vencidas */}
      {payments?.vencidas?.length > 0 && (
        <Section title="🚨 Mensalidades vencidas" className="mb-4">
          {payments.vencidas.map(p => (
            <PaymentRow
              key={p.id}
              payment={p}
              onClick={() => navigate(`/alunos/${p.student_id}`)}
              color="text-danger"
            />
          ))}
        </Section>
      )}

      {/* Pagas no mês */}
      {payments?.pagas_mes?.length > 0 && (
        <Section title={`✅ Pagas em ${format(new Date(), 'MMMM', { locale: ptBR })}`} className="mb-4">
          {payments.pagas_mes.map(p => (
            <PaymentRow
              key={p.id}
              payment={p}
              onClick={() => navigate(`/alunos/${p.student_id}`)}
              color="text-success"
            />
          ))}
        </Section>
      )}

      {/* Aniversariantes do mês */}
      {birthdays?.length > 0 && (
        <Section title="🎂 Aniversariantes do mês">
          {birthdays.map(s => (
            <button
              key={s.id}
              onClick={() => navigate(`/alunos/${s.id}`)}
              className="flex items-center gap-3 w-full py-2.5 border-b border-border last:border-0"
            >
              <div
                className="w-9 h-9 rounded-full flex items-center justify-center text-bg font-bold text-sm flex-shrink-0"
                style={{ backgroundColor: avatarColor(s.name) }}
              >
                {s.name[0]}
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-primary">{s.name}</p>
                <p className="text-xs text-muted">
                  Dia {s.birthday?.slice(8, 10)} · {s.age_completing} anos
                </p>
              </div>
              <ChevronRight size={14} className="text-muted" />
            </button>
          ))}
        </Section>
      )}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, loading, accent, warn, danger }) {
  const textColor = danger ? 'text-danger' : warn ? 'text-warning' : accent ? 'text-accent' : 'text-primary'
  return (
    <div className="bg-surface border border-border rounded-2xl p-4">
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center mb-3 ${accent ? 'bg-accent/10' : warn ? 'bg-warning/10' : danger ? 'bg-danger/10' : 'bg-raised'}`}>
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

function Section({ title, children, className }) {
  return (
    <div className={`bg-surface border border-border rounded-2xl p-4 ${className ?? ''}`}>
      <p className="text-xs font-bold text-muted uppercase tracking-wider mb-3">{title}</p>
      {children}
    </div>
  )
}

function PaymentRow({ payment, onClick, color }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-between w-full py-2.5 border-b border-border last:border-0"
    >
      <div className="text-left">
        <p className="text-sm font-semibold text-primary">{payment.student_name}</p>
        <p className="text-xs text-muted">Vence {fmtDate(payment.due_date)}</p>
      </div>
      <div className="flex items-center gap-2">
        <span className={`text-sm font-bold ${color}`}>{fmtMoney(payment.amount)}</span>
        <ChevronRight size={14} className="text-muted" />
      </div>
    </button>
  )
}
