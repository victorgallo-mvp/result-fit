import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendancesApi } from '@/api/attendances'
import { avatarColor } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export default function FrequenciaMes() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const label = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

  const { data: raw = [], isLoading } = useQuery({
    queryKey: ['frequencia-mes', monthStr],
    queryFn: () => attendancesApi.monthList(monthStr),
  })

  const students = [...raw].sort((a, b) => {
    const ra = a.expected > 0 ? a.attended / a.expected : 0
    const rb = b.expected > 0 ? b.attended / b.expected : 0
    return rb - ra
  })

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12) }
    else setMonth(m => m - 1)
  }
  const nextMonth = () => {
    if (isCurrentMonth) return
    if (month === 12) { setYear(y => y + 1); setMonth(1) }
    else setMonth(m => m + 1)
  }

  return (
    <div className="px-4 pt-12 pb-6">
      <h1 className="text-2xl font-extrabold text-primary mb-5">Presença</h1>

      {/* Month nav */}
      <div className="flex items-center justify-between bg-white border border-border rounded-2xl px-4 py-3 mb-4 shadow-sm">
        <button onClick={prevMonth} className="p-1.5 rounded-xl hover:bg-raised text-muted">
          <ChevronLeft size={18} />
        </button>
        <p className="font-bold text-primary capitalize">{label}</p>
        <button onClick={nextMonth} disabled={isCurrentMonth} className="p-1.5 rounded-xl hover:bg-raised text-muted disabled:opacity-30">
          <ChevronRight size={18} />
        </button>
      </div>

      {isLoading && (
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="h-14 rounded-2xl bg-white border border-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          {students.length === 0 && (
            <p className="p-6 text-center text-sm text-muted">Nenhum aluno ativo</p>
          )}
          {students.map((s, i) => {
            const rate = s.expected > 0 ? Math.round(s.attended / s.expected * 100) : 0
            const rateColor = rate >= 80 ? 'text-accent' : rate >= 60 ? 'text-warning' : 'text-danger'

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-4 py-3.5 ${i < students.length - 1 ? 'border-b border-border' : ''}`}
              >
                {/* Rank */}
                <span className="text-xs font-bold text-muted w-4 text-center flex-shrink-0">{i + 1}</span>

                {/* Avatar */}
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: avatarColor(s.name) }}
                >
                  {s.name[0]}
                </div>

                {/* Name */}
                <p className="flex-1 text-sm font-semibold text-primary truncate">{s.name}</p>

                {/* Stats */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <span className="text-sm text-muted">{s.attended}/{s.expected}</span>
                  <span className={`text-sm font-bold w-10 text-right ${rateColor}`}>{rate}%</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
