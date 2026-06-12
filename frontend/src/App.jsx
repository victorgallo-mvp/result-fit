import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from '@/hooks/useAuth'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { Layout } from '@/components/Layout'
import Login         from '@/pages/Login'
import Hoje          from '@/pages/Hoje'
import Dashboard     from '@/pages/Dashboard'
import Alunos        from '@/pages/Alunos'
import AlunoDetalhe  from '@/pages/AlunoDetalhe'
import Pagamentos    from '@/pages/Pagamentos'
import Planos        from '@/pages/Planos'
import Financeiro    from '@/pages/Financeiro'
import Configuracoes  from '@/pages/Configuracoes'
import FrequenciaMes  from '@/pages/FrequenciaMes'
import Avaliacoes     from '@/pages/Avaliacoes'

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index              element={<Hoje />} />
            <Route path="dashboard"   element={<Dashboard />} />
            <Route path="alunos"      element={<Alunos />} />
            <Route path="alunos/:id"  element={<AlunoDetalhe />} />
            <Route path="pagamentos"  element={<Pagamentos />} />
            <Route path="planos"      element={<Planos />} />
            <Route path="financeiro"  element={<Financeiro />} />
            <Route path="config"      element={<Configuracoes />} />
            <Route path="frequencia"  element={<FrequenciaMes />} />
            <Route path="avaliacoes"  element={<Avaliacoes />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  )
}
