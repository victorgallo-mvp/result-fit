import api from './client'

export const studentsApi = {
  list:    (params) => api.get('/students', { params }).then(r => r.data),
  get:     (id)     => api.get(`/students/${id}`).then(r => r.data),
  create:  (data)   => api.post('/students', data).then(r => r.data),
  update:  (id, data) => api.put(`/students/${id}`, data).then(r => r.data),
  remove:  (id)     => api.delete(`/students/${id}`),
  birthdays:      ()             => api.get('/students/birthdays').then(r => r.data),
  birthdaysMonth: (month)       => api.get('/students/birthdays/month', { params: { month } }).then(r => r.data),
  payments:       (id)           => api.get(`/students/${id}/payments`).then(r => r.data),
  attendances:    (id, month)    => api.get(`/students/${id}/attendances`, { params: { month } }).then(r => r.data),
  attendanceStats:(id, month)    => api.get(`/students/${id}/attendance-stats`, { params: { month } }).then(r => r.data),
}
