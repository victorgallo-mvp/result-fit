import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { attendancesApi } from '@/api/attendances'
import { avatarColor } from '@/lib/utils'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const DOW = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']

function getScheduledDays(trainingDays, year, month) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const daysInMonth = new Date(year, month, 0).getDate()
  const days = []
  for (let d = 1; d <= daysInMonth; d++) {
    const dt = new Date(year, month - 1, d)
    if (trainingDays.includes(DOW[dt.getDay()])) {
      days.push({
        dateStr: `${year}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`,
        isFuture: dt > today,
      })
    }
  }
  return days
}

export default function FrequenciaMes() {
  const today = new Date()
  const [year, setYear]   = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth() + 1)

  const monthStr = `${year}-${String(month).padStart(2, '0')}`
  const isCurrentMonth = year === today.getFullYear() && month === today.getMonth() + 1
  const label = format(new Date(year, month - 1, 1), 'MMMM yyyy', { locale: ptBR })

  const { data: students = [], isLoading } = useQuery({
    queryKey: ['frequencia-mes', monthStr],
    queryFn: () => attendancesApi.monthList(monthStr),
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
      <h1 className="text-2xl font-extrabold text-primary mb-5">Lista de presença</h1>

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
            <div key={i} className="h-16 rounded-2xl bg-white border border-border animate-pulse" />
          ))}
        </div>
      )}

      {!isLoading && (
        <div className="bg-white border border-border rounded-2xl overflow-hidden shadow-sm">
          {students.length === 0 && (
            <p className="p-6 text-center text-sm text-muted">Nenhum aluno ativo</p>
          )}
          {students.map((s, i) => {
            const days = getScheduledDays(s.training_days, year, month)
            const attendedSet = new Set(s.attended_dates)
            const rate = s.expected > 0 ? Math.round(s.attended / s.expected * 100) : 0

            return (
              <div
                key={s.id}
                className={`flex items-center gap-3 px-4 py-3 ${i < students.length - 1 ? 'border-b border-border' : ''}`}
              >
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0"
                  style={{ backgroundColor: avatarColor(s.name) }}
                >
                  {s.name[0]}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-primary truncate mb-1.5">{s.name}</p>
                  <div className="flex gap-1 flex-wrap">
                    {days.map(({ dateStr, isFuture }) => (
                      <div
                        key={dateStr}
                        className={`w-3 h-3 rounded-sm flex-shrink-0 ${
                          attendedSet.has(dateStr)
                            ? 'bg-accent'
                            : isFuture
                            ? 'border border-border'
                            : 'bg-danger/30'
                        }`}
                      />
                    ))}
                  </div>
                </div>

                <div className="text-right flex-shrink-0 ml-2">
                  <p className="text-sm font-bold text-primary">{s.attended}/{s.expected}</p>
                  <p className={`text-xs font-semibold ${rate >= 80 ? 'text-accent' : rate >= 60 ? 'text-warning' : 'text-danger'}`}>
                    {rate}%
                  </p>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Legend */}
      {!isLoading && students.length > 0 && (
        <div className="flex gap-4 mt-4 px-1">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-accent" />
            <p className="text-xs text-muted">Presente</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-danger/30" />
            <p className="text-xs text-muted">Faltou</p>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm border border-border" />
            <p className="text-xs text-muted">Previsto</p>
          </div>
        </div>
      )}
    </div>
  )
}
