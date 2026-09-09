import api from './client'

export const financialApi = {
  list:   (month)        => api.get('/financial', { params: { month } }).then(r => r.data),
  create: (data)         => api.post('/financial', data).then(r => r.data),
  update: (id, data)     => api.put(`/financial/${id}`, data).then(r => r.data),
  // scope: 'one' (só este) | 'group' (parcelamento inteiro / encerra a recorrência)
  remove: (id, scope = 'one') => api.delete(`/financial/${id}`, { params: { scope } }),

  listRecurring:   ()         => api.get('/financial/recurring').then(r => r.data),
  createRecurring: (data)     => api.post('/financial/recurring', data).then(r => r.data),
  updateRecurring: (id, data) => api.put(`/financial/recurring/${id}`, data).then(r => r.data),
  removeRecurring: (id, apagarLancamentos = false) =>
    api.delete(`/financial/recurring/${id}`, { params: { apagar_lancamentos: apagarLancamentos } }),
}
