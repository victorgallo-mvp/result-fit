import api from './client'

export const authApi = {
  login: async (email, password) => {
    const form = new URLSearchParams({ username: email, password })
    const res = await api.post('/auth/login', form, {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    })
    return res.data
  },
  me: async () => (await api.get('/auth/me')).data,
  updateMe: async (data) => (await api.put('/auth/me', data)).data,
  register: async (data) => (await api.post('/auth/register', data)).data,
}
