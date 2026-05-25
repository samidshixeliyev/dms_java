import axios from 'axios'
import toast from 'react-hot-toast'

const client = axios.create({
  baseURL: '/api',
  headers: { 'Content-Type': 'application/json' },
})

client.interceptors.request.use((config) => {
  const token = localStorage.getItem('dms_token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

client.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status
    const message = error.response?.data?.message

    if (status === 401) {
      localStorage.removeItem('dms_token')
      localStorage.removeItem('dms_user')
      window.location.href = '/login'
    } else if (status === 403) {
      toast.error('İcazə yoxdur')
    } else if (message) {
      toast.error(message)
    } else {
      toast.error('Xəta baş verdi')
    }

    return Promise.reject(error)
  }
)

export default client
