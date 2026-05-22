import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { Home, Users, CreditCard, BarChart2, MoreHorizontal, Dumbbell, X, DollarSign, Settings, BookOpen, LogOut } from 'lucide-react'
import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { BirthdayModal } from './BirthdayModal'
import { cn } from '@/lib/utils'

const mainNav = [
  { to: '/',          icon: Home,       label: 'Hoje'       },
  { to: '/alunos',    icon: Users,      label: 'Alunos'     },
  { to: '/pagamentos',icon: CreditCard, label: 'Pagamentos' },
  { to: '/dashboard', icon: BarChart2,  label: 'Dashboard'  },
]

const moreNav = [
  { to: '/planos',    icon: BookOpen,   label: 'Planos'      },
  { to: '/financeiro',icon: DollarSign, label: 'Financeiro'  },
  { to: '/config',    icon: Settings,   label: 'Configurações'},
]

export function Layout() {
  const [moreOpen, setMoreOpen] = useState(false)
  const { logout, user } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  return (
    <div className="flex flex-col h-full max-w-lg mx-auto relative">
      {/* Birthday modal */}
      <BirthdayModal />

      {/* Page content */}
      <main className="flex-1 overflow-y-auto pb-20">
        <Outlet />
      </main>

      {/* Bottom navigation */}
      <nav className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto bg-surface border-t border-border safe-bottom z-40">
        <div className="flex items-center justify-around h-16 px-2">
          {mainNav.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) => cn(
                'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px]',
                isActive ? 'text-accent' : 'text-muted'
              )}
            >
              {({ isActive }) => (
                <>
                  <Icon size={22} strokeWidth={isActive ? 2.5 : 1.8} />
                  <span className="text-[10px] font-semibold">{label}</span>
                </>
              )}
            </NavLink>
          ))}

          {/* More button */}
          <button
            onClick={() => setMoreOpen(true)}
            className={cn(
              'flex flex-col items-center gap-0.5 px-3 py-2 rounded-xl transition-colors min-w-[56px]',
              moreOpen ? 'text-accent' : 'text-muted'
            )}
          >
            <MoreHorizontal size={22} strokeWidth={1.8} />
            <span className="text-[10px] font-semibold">Mais</span>
          </button>
        </div>
      </nav>

      {/* More drawer */}
      {moreOpen && (
        <>
          <div
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-fade-in"
            onClick={() => setMoreOpen(false)}
          />
          <div className="fixed bottom-0 left-0 right-0 max-w-lg mx-auto z-50 bg-surface border border-border rounded-t-3xl p-5 safe-bottom animate-slide-up">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="font-bold text-primary">{user?.name}</p>
                <p className="text-xs text-muted">{user?.email}</p>
              </div>
              <button onClick={() => setMoreOpen(false)} className="p-2 rounded-xl hover:bg-raised text-muted">
                <X size={20} />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-4">
              {moreNav.map(({ to, icon: Icon, label }) => (
                <NavLink
                  key={to}
                  to={to}
                  onClick={() => setMoreOpen(false)}
                  className={({ isActive }) => cn(
                    'flex flex-col items-center gap-2 p-4 rounded-2xl border border-border transition-colors',
                    isActive ? 'bg-accent/10 border-accent/30 text-accent' : 'bg-raised text-muted hover:text-primary'
                  )}
                >
                  <Icon size={22} />
                  <span className="text-xs font-semibold">{label}</span>
                </NavLink>
              ))}
            </div>

            <button
              onClick={handleLogout}
              className="flex items-center gap-3 w-full p-4 rounded-2xl border border-danger/20 bg-danger/5 text-danger hover:bg-danger/10 transition-colors"
            >
              <LogOut size={18} />
              <span className="font-semibold text-sm">Sair</span>
            </button>
          </div>
        </>
      )}
    </div>
  )
}
