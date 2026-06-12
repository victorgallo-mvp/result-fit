import api from './client'

export const avaliacoesApi = {
  get: () => api.get('/avaliacoes').then(r => r.data),
}
