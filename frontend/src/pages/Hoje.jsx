import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { attendancesApi } from '@/api/attendances'
import { useAuth } from '@/hooks/useAuth'
import { avatarColor, DAY_LABELS, todayStr } from '@/lib/utils'
import { Check, ChevronRight, CheckCheck, Users } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState } from 'react'

const TODAY = todayStr()

export default function Hoje() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [markingAll, setMarkingAll] = useState(false)

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['today'],
    queryFn: attendancesApi.today,
    staleTime: 30_000,
  })

  const toggleMutation = useMutation({
    mutationFn: async ({ id, marked }) => {
      if (marked) await attendancesApi.unmark(id, TODAY)
      else await attendancesApi.mark(id, TODAY)
    },
    onMutate: async ({ id, marked }) => {
      await qc.cancelQueries({ queryKey: ['today'] })
      const prev = qc.getQueryData(['today'])
      qc.setQueryData(['today'], old =>
        old?.map(s => s.id === id ? { ...s, marked: !marked } : s)
      )
      return { prev }
    },
    onError: (_, __, ctx) => {
      qc.setQueryData(['today'], ctx.prev)
      toast.error('Erro ao registrar presença. Tente novamente.')
    },
  })

  const markAll = async () => {
    const unmarked = students.filter(s => !s.marked)
    if (unmarked.length === 0) return toast('Todos já estão marcados!')
    setMarkingAll(true)
    try {
      await Promise.all(unmarked.map(s => attendancesApi.mark(s.id, TODAY)))
      qc.invalidateQueries({ queryKey: ['today'] })
      toast.success(`${unmarked.length} presença${unmarked.length > 1 ? 's' : ''} marcada${unmarked.length > 1 ? 's' : ''}!`)
    } catch {
      toast.error('Erro ao marcar todas as presenças')
    } finally {
      setMarkingAll(false)
    }
  }

  const marked = students.filter(s => s.marked).length
  const total = students.length

  const today = new Date()
  const dayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR })

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-surface border-b border-border sticky top-0 z-10">
        <p className="text-xs font-semibold text-accent uppercase tracking-widest capitalize">{dayLabel}</p>
        <h1 className="text-2xl font-extrabold text-primary mt-0.5">Hoje</h1>
        <p className="text-sm text-muted">{user?.name}</p>
      </div>

      {/* Mark all button */}
      {students.length > 0 && (
        <div className="px-4 pt-4">
          <button
            onClick={markAll}
            disabled={markingAll || marked === total}
            className="w-full flex items-center justify-center gap-2 h-12 rounded-2xl bg-accent/10 border border-accent/20 text-accent font-semibold text-sm hover:bg-accent/15 active:scale-98 transition-all disabled:opacity-40"
          >
            <CheckCheck size={18} />
            {markingAll ? 'Marcando...' : 'Marcar todos presentes'}
          </button>
        </div>
      )}

      {/* Student list */}
      <div className="flex-1 px-4 pt-4 space-y-2">
        {isLoading && (
          <div className="space-y-2">
            {[1,2,3,4,5].map(i => (
              <div key={i} className="h-20 rounded-2xl bg-surface animate-pulse" />
            ))}
          </div>
        )}

        {!isLoading && students.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className="w-16 h-16 rounded-full bg-raised flex items-center justify-center mb-4">
              <Users size={28} className="text-muted" />
            </div>
            <p className="font-semibold text-primary">Nenhum treino hoje</p>
            <p className="text-sm text-muted mt-1">Nenhum aluno tem treino programado para hoje</p>
          </div>
        )}

        <div className="stagger">
          {students.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onToggle={() => toggleMutation.mutate({ id: student.id, marked: student.marked })}
              onNavigate={(e) => { e.stopPropagation(); navigate(`/alunos/${student.id}`) }}
            />
          ))}
        </div>
      </div>

      {/* Counter footer */}
      {students.length > 0 && (
        <div className="sticky bottom-20 mx-4 mb-4">
          <div className="flex items-center justify-between bg-raised border border-border rounded-2xl px-5 py-3">
            <span className="text-sm text-muted font-medium">Marcados hoje</span>
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-28 bg-border rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent rounded-full transition-all duration-500"
                  style={{ width: total > 0 ? `${(marked / total) * 100}%` : '0%' }}
                />
              </div>
              <span className="text-sm font-bold text-primary">{marked}/{total}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function StudentCard({ student, onToggle, onNavigate }) {
  return (
    <div
      onClick={onToggle}
      className="pressable flex items-center gap-4 p-4 rounded-2xl bg-surface border border-border cursor-pointer select-none"
    >
      {/* Avatar */}
      <div
        className="w-14 h-14 rounded-full flex items-center justify-center text-bg font-extrabold text-xl flex-shrink-0"
        style={{ backgroundColor: avatarColor(student.name) }}
      >
        {student.photo_url
          ? <img src={student.photo_url} alt={student.name} className="w-full h-full rounded-full object-cover" />
          : student.name[0]
        }
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="font-bold text-lg text-primary leading-tight truncate">{student.name}</span>
          {student.birthday_today && <span className="text-lg leading-none">🎂</span>}
        </div>
        <span className="text-sm text-muted">
          {student.plan?.name ?? 'Sem plano'} · {student.training_days?.length ?? 0}x/sem
        </span>
      </div>

      {/* Toggle */}
      <div className="flex items-center gap-2 flex-shrink-0">
        <div
          className={`w-9 h-9 rounded-full flex items-center justify-center transition-all duration-200 ${
            student.marked
              ? 'bg-accent shadow-[0_0_12px_rgba(15,217,160,0.4)]'
              : 'border-2 border-border bg-raised'
          }`}
        >
          {student.marked && (
            <Check size={16} className="text-bg animate-check" strokeWidth={3} />
          )}
        </div>

        {/* Navigate arrow */}
        <button
          onClick={onNavigate}
          className="w-7 h-7 flex items-center justify-center rounded-full text-muted hover:text-primary hover:bg-raised transition-colors"
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  )
}
