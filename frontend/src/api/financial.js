import api from './client'

export const financialApi = {
  list:   (month)     => api.get('/financial', { params: { month } }).then(r => r.data),
  create: (data)      => api.post('/financial', data).then(r => r.data),
  update: (id, data)  => api.put(`/financial/${id}`, data).then(r => r.data),
  remove: (id)        => api.delete(`/financial/${id}`),
}
