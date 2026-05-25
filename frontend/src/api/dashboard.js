import api from './client'

export const dashboardApi = {
  get: () => api.get('/dashboard').then(r => r.data),
}
