import api from './client'

export const plansApi = {
  list:   ()         => api.get('/plans').then(r => r.data),
  create: (data)     => api.post('/plans', data).then(r => r.data),
  update: (id, data) => api.put(`/plans/${id}`, data).then(r => r.data),
  remove: (id)       => api.delete(`/plans/${id}`),
}
