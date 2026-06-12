import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { attendancesApi } from '@/api/attendances'
import { useAuth } from '@/hooks/useAuth'
import { avatarColor, DAY_LABELS, todayStr } from '@/lib/utils'
import { Check, ChevronRight, Users, Cake } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { useState, useRef, useCallback } from 'react'

const TODAY = todayStr()

export default function Hoje() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const qc = useQueryClient()
  const [filterLetter, setFilterLetter] = useState(null)
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
      toast.error('Erro ao registrar presença')
    },
  })

  const today  = new Date()
  const dayLabel = format(today, "EEEE, d 'de' MMMM", { locale: ptBR })

  const letters = [...new Set(students.map(s => s.name[0].toUpperCase()))].sort()
  const filtered = filterLetter
    ? students.filter(s => s.name[0].toUpperCase() === filterLetter)
    : students

  const stripRef = useRef(null)
  const touchState = useRef({ startLetter: null, prevFilter: null, moved: false })

  const letterFromTouch = useCallback((touch) => {
    const el = stripRef.current
    if (!el) return null
    const rect = el.getBoundingClientRect()
    const y = touch.clientY - rect.top
    const idx = Math.floor(y / (rect.height / letters.length))
    return letters[Math.max(0, Math.min(letters.length - 1, idx))] ?? null
  }, [letters])

  const handleTouchStart = useCallback((e) => {
    e.preventDefault()
    const letter = letterFromTouch(e.touches[0])
    touchState.current = { startLetter: letter, prevFilter: filterLetter, moved: false }
    setFilterLetter(letter)
  }, [letterFromTouch, filterLetter])

  const handleTouchMove = useCallback((e) => {
    e.preventDefault()
    const letter = letterFromTouch(e.touches[0])
    if (letter) {
      touchState.current.moved = true
      setFilterLetter(letter)
    }
  }, [letterFromTouch])

  const handleTouchEnd = useCallback(() => {
    const { startLetter, prevFilter, moved } = touchState.current
    // tap (no drag) on already-active letter → deselect
    if (!moved && startLetter === prevFilter) setFilterLetter(null)
  }, [])

  return (
    <div className="flex flex-col min-h-full">
      {/* Header */}
      <div className="px-4 pt-12 pb-4 bg-white border-b border-border sticky top-0 z-10">
        <p className="text-xs font-semibold text-accent uppercase tracking-widest capitalize">{dayLabel}</p>
        <div className="flex items-end justify-between mt-0.5">
          <h1 className="text-2xl font-extrabold text-primary">Hoje</h1>
          <p className="text-sm text-muted pb-0.5">{user?.name}</p>
        </div>
      </div>

      {/* Content + letter index */}
      <div className="flex-1 flex">
        {/* Student list */}
        <div className="flex-1 px-4 pt-3 pb-4 space-y-2 min-w-0">
          {isLoading && (
            <div className="space-y-2">
              {[1,2,3,4,5].map(i => (
                <div key={i} className="h-20 rounded-2xl bg-white border border-border animate-pulse" />
              ))}
            </div>
          )}

          {!isLoading && students.length === 0 && (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="w-14 h-14 rounded-full bg-raised border border-border flex items-center justify-center mb-4">
                <Users size={24} className="text-muted" />
              </div>
              <p className="font-semibold text-primary">Nenhum aluno ativo</p>
              <p className="text-sm text-muted mt-1">Cadastre seu primeiro aluno</p>
            </div>
          )}

          {/* Pending */}
          <div className="space-y-2">
            {filtered.filter(s => !s.marked).map(student => (
              <StudentCard
                key={student.id}
                student={student}
                onToggle={() => toggleMutation.mutate({ id: student.id, marked: student.marked })}
                onNavigate={e => { e.stopPropagation(); navigate(`/alunos/${student.id}`) }}
              />
            ))}
          </div>

          {/* Present */}
          {filtered.some(s => s.marked) && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-muted uppercase tracking-widest px-1 mb-2">
                Presentes · {filtered.filter(s => s.marked).length}
              </p>
              <div className="space-y-2">
                {filtered.filter(s => s.marked).map(student => (
                  <StudentCard
                    key={student.id}
                    student={student}
                    onToggle={() => toggleMutation.mutate({ id: student.id, marked: student.marked })}
                    onNavigate={e => { e.stopPropagation(); navigate(`/alunos/${student.id}`) }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Letter index */}
        {letters.length > 1 && (
          <div
            ref={stripRef}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            className="flex flex-col items-center justify-around py-4 pr-1 w-6 flex-shrink-0 select-none touch-none"
          >
            {letters.map(l => (
              <span
                key={l}
                className={`text-[11px] font-bold w-5 text-center leading-none transition-colors ${
                  filterLetter === l ? 'text-accent scale-125' : 'text-muted'
                }`}
              >
                {l}
              </span>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}

function StudentCard({ student, onToggle, onNavigate }) {
  return (
    <div
      onClick={onToggle}
      className="pressable flex items-center gap-4 p-4 rounded-2xl bg-white border border-border cursor-pointer select-none shadow-sm"
    >
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-white font-extrabold text-lg flex-shrink-0"
        style={{ backgroundColor: avatarColor(student.name) }}
      >
        {student.name[0]}
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-bold text-primary leading-tight truncate">{student.name}</span>
          {student.birthday_today && (
            <Cake size={14} className="text-accent flex-shrink-0" />
          )}
        </div>
        <span className="text-xs text-muted">
          {student.plan?.name ?? 'Sem plano'} · {student.weekly_frequency ?? 3}x/sem
        </span>
      </div>

      <div className="flex items-center gap-2 flex-shrink-0">
        <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all duration-200 border-2 ${
          student.marked ? 'bg-accent border-accent' : 'border-border bg-white'
        }`}>
          {student.marked && (
            <Check size={14} className="text-white animate-check" strokeWidth={3} />
          )}
        </div>
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
