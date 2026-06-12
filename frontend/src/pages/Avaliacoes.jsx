import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { avaliacoesApi } from '@/api/avaliacoes'
import { studentsApi } from '@/api/students'
import { fmtDate, avatarColor } from '@/lib/utils'
import { AlertCircle, Clock, ChevronRight, ClipboardCheck, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

export default function Avaliacoes() {
  const navigate = useNavigate()
  const qc = useQueryClient()

  const { data, isLoading } = useQuery({
    queryKey: ['avaliacoes'],
    queryFn: avaliacoesApi.get,
  })

  const avaliarMutation = useMutation({
    mutationFn: (id) => studentsApi.avaliar(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['avaliacoes'] })
      toast.success('Avaliação registrada!')
    },
    onError: () => toast.error('Erro ao registrar avaliação'),
  })

  return (
    <div className="px-4 pt-12 pb-6">
      <h1 className="text-2xl font-extrabold text-primary mb-5">Avaliações</h1>

      {/* KPI cards */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <KpiCard
          icon={AlertCircle}
          label="Atrasadas"
          value={data?.total_vencidas ?? '—'}
          loading={isLoading}
          danger={data?.total_vencidas > 0}
        />
        <KpiCard
          icon={Clock}
          label="Este mês"
          value={data?.total_do_mes ?? '—'}
          loading={isLoading}
          warn={data?.total_do_mes > 0}
        />
      </div>

      {/* Vencidas */}
      {data?.vencidas?.length > 0 && (
        <Section title="Atrasadas" className="mb-3" titleColor="text-danger">
          {data.vencidas.map(s => (
            <AvaliacaoRow
              key={s.id}
              student={s}
              color="text-danger"
              onClick={() => navigate(`/alunos/${s.id}`)}
              onAvaliar={() => avaliarMutation.mutate(s.id)}
              avaliando={avaliarMutation.isPending && avaliarMutation.variables === s.id}
            />
          ))}
        </Section>
      )}

      {/* Do mês */}
      {data?.do_mes?.length > 0 && (
        <Section title="Este mês" className="mb-3" titleColor="text-warning">
          {data.do_mes.map(s => (
            <AvaliacaoRow
              key={s.id}
              student={s}
              color="text-warning"
              onClick={() => navigate(`/alunos/${s.id}`)}
              onAvaliar={() => avaliarMutation.mutate(s.id)}
              avaliando={avaliarMutation.isPending && avaliarMutation.variables === s.id}
            />
          ))}
        </Section>
      )}

      {!isLoading && !data?.vencidas?.length && !data?.do_mes?.length && (
        <div className="text-center py-16">
          <div className="w-14 h-14 rounded-full bg-raised border border-border flex items-center justify-center mx-auto mb-4">
            <ClipboardCheck size={24} className="text-muted" />
          </div>
          <p className="font-semibold text-primary">Tudo em dia</p>
          <p className="text-sm text-muted mt-1">Nenhuma avaliação pendente este mês</p>
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

function AvaliacaoRow({ student, onClick, color, onAvaliar, avaliando }) {
  return (
    <div className="flex items-center gap-2 py-2.5 border-b border-border last:border-0">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
          style={{ backgroundColor: avatarColor(student.name) }}
        >
          {student.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-primary truncate">{student.name}</p>
          <p className="text-xs text-muted">
            {student.ultima_avaliacao
              ? `Última: ${fmtDate(student.ultima_avaliacao)}`
              : 'Sem avaliação anterior'}
            {' · '}
            <span className={color}>Próxima: {fmtDate(student.proxima_avaliacao)}</span>
          </p>
        </div>
        <ChevronRight size={14} className="text-muted flex-shrink-0" />
      </button>

      <button
        onClick={(e) => { e.stopPropagation(); onAvaliar() }}
        disabled={avaliando}
        className="flex-shrink-0 px-3 h-8 rounded-lg bg-accent text-white text-xs font-bold hover:bg-accent/90 active:scale-95 transition-all disabled:opacity-50 flex items-center gap-1.5"
      >
        {avaliando
          ? <Loader2 size={13} className="animate-spin" />
          : <ClipboardCheck size={13} />
        }
        {avaliando ? 'Salvando' : 'Registrar'}
      </button>
    </div>
  )
}
