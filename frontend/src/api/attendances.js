import api from './client'

export const attendancesApi = {
  today:  ()                   => api.get('/attendances/today').then(r => r.data),
  mark:   (student_id, date)   => api.post('/attendances/mark', { student_id, date }).then(r => r.data),
  unmark: (student_id, date)   => api.delete('/attendances', { data: { student_id, date } }),
}
