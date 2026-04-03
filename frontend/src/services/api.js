import axios from 'axios'

const apiBaseUrl = import.meta.env.VITE_API_URL || '/api'

const api = axios.create({
  baseURL: apiBaseUrl,
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000,
})

// Attach JWT token to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('dqms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('dqms_token')
      localStorage.removeItem('dqms_user')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  }
)

// Auth
export const authAPI = {
  login: (data) => api.post('/auth/login', data),
  register: (data) => api.post('/auth/register', data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me'),
}

// Queue
export const queueAPI = {
  join: (data) => api.post('/queue/join', data),
  slots: (date, doctorId) => api.get('/queue/slots', { params: { date, doctorId } }),
  status: (studentId) => api.get(`/queue/status/${studentId}`),
  history: (studentId) => api.get(`/queue/history/${studentId}`),
  laterSlots: (appointmentId) => api.get('/queue/slots/later', { params: { appointmentId } }),
  move: (data) => api.put('/queue/move', data),
  cancel: (appointmentId) => api.delete(`/queue/cancel/${appointmentId}`),
}

// Staff
export const staffAPI = {
  queue: (params) => api.get('/staff/queue', { params }),
  emergency: (data) => api.post('/staff/emergency', data),
  noshow: (data) => api.post('/staff/noshow', data),
}

// Doctor
export const doctorAPI = {
  queue: () => api.get('/doctor/queue'),
  next: () => api.post('/doctor/next'),
}

// Timetable
export const timetableAPI = {
  get: (date) => api.get('/timetable', { params: { date } }),
}

export default api
