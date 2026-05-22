import api from './client'

export const paymentsApi = {
  list:      (params)       => api.get('/payments', { params }).then(r => r.data),
  create:    (data)         => api.post('/payments', data).then(r => r.data),
  markPaid:  (id, data)     => api.put(`/payments/${id}/mark-paid`, data).then(r => r.data),
  update:    (id, data)     => api.put(`/payments/${id}`, data).then(r => r.data),
  remove:    (id)           => api.delete(`/payments/${id}`),
  dashboard: ()             => api.get('/payments/dashboard').then(r => r.data),
}
