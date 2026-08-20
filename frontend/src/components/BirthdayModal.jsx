import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { studentsApi } from '@/api/students'
import { avatarColor, getAge, todayStr } from '@/lib/utils'
import { WhatsAppButton } from '@/components/WhatsAppButton'
import { msgAniversario } from '@/lib/whatsapp'
import { X, ChevronRight, Cake } from 'lucide-react'

const STORAGE_KEY = `birthday_alert_shown_${todayStr()}`

export function BirthdayModal() {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()

  const { data } = useQuery({
    queryKey: ['birthdays'],
    queryFn: studentsApi.birthdays,
    staleTime: 60_000 * 60,
  })

  useEffect(() => {
    if (!data) return
    const hasAny = (data.today?.length > 0) || (data.tomorrow?.length > 0)
    if (!hasAny) return
    if (localStorage.getItem(STORAGE_KEY)) return
    setOpen(true)
  }, [data])

  const close = () => {
    localStorage.setItem(STORAGE_KEY, '1')
    setOpen(false)
  }

  if (!open || !data) return null

  // só quem faz aniversário hoje ganha o botão — parabenizar um dia antes é pior que não parabenizar
  const StudentRow = ({ student, onClick, canGreet }) => (
    <div className="flex items-center gap-2 w-full p-3 rounded-xl hover:bg-raised transition-colors">
      <button onClick={onClick} className="flex items-center gap-3 flex-1 min-w-0 text-left">
        <div
          className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm flex-shrink-0"
          style={{ backgroundColor: avatarColor(student.name) }}
        >
          {student.name[0]}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-primary text-sm truncate">{student.name}</p>
          {student.birthday && (
            <p className="text-xs text-muted">{getAge(student.birthday)} anos</p>
          )}
        </div>
      </button>
      {canGreet && (
        <WhatsAppButton
          phone={student.phone}
          label="Parabenizar"
          size={15}
          title="Parabenizar no WhatsApp"
          message={msgAniversario(student)}
        />
      )}
      <ChevronRight size={16} className="text-muted flex-shrink-0" />
    </div>
  )

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 animate-fade-in" onClick={close} />
      <div className="fixed inset-x-0 bottom-0 z-50 max-w-lg mx-auto bg-white border border-border rounded-t-3xl p-6 pb-8 safe-bottom animate-slide-up shadow-xl">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-accent/10 flex items-center justify-center">
              <Cake size={18} className="text-accent" />
            </div>
            <div>
              <h2 className="text-base font-bold text-primary">Aniversários</h2>
              <p className="text-xs text-muted">Seus alunos de hoje e amanhã</p>
            </div>
          </div>
          <button onClick={close} className="p-2 rounded-xl hover:bg-raised text-muted">
            <X size={18} />
          </button>
        </div>

        {data.today?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-accent uppercase tracking-wider mb-2 px-1">Hoje</p>
            <div className="space-y-1">
              {data.today.map(s => (
                <StudentRow
                  key={s.id}
                  student={s}
                  canGreet
                  onClick={() => { close(); navigate(`/alunos/${s.id}`) }}
                />
              ))}
            </div>
          </div>
        )}

        {data.tomorrow?.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-bold text-muted uppercase tracking-wider mb-2 px-1">Amanhã</p>
            <div className="space-y-1 opacity-60">
              {data.tomorrow.map(s => (
                <StudentRow
                  key={s.id}
                  student={s}
                  onClick={() => { close(); navigate(`/alunos/${s.id}`) }}
                />
              ))}
            </div>
          </div>
        )}

        <button
          onClick={close}
          className="w-full h-11 rounded-xl bg-raised border border-border text-primary font-semibold text-sm hover:bg-border transition-colors"
        >
          Fechar
        </button>
      </div>
    </>
  )
}
