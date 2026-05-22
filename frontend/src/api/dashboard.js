import api from './client'

export const dashboardApi = {
  summary: () => api.get('/dashboard/summary').then(r => r.data),
}
