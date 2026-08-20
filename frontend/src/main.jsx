import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'sonner'
import App from './App'
import { registerSW } from 'virtual:pwa-register'
import './index.css'

// PWA: instala o service worker e recarrega sozinho quando sai uma versão nova
registerSW({
  immediate: true,
  onNeedRefresh() { window.location.reload() },
})

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <App />
      <Toaster
        position="top-center"
        toastOptions={{
          style: { background: '#1C2235', color: '#E8EEFF', border: '1px solid #232B3E' },
        }}
      />
    </QueryClientProvider>
  </React.StrictMode>
)
