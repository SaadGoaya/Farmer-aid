import axios from 'axios'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE || '/api',
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' }
})

// Response wrapper to normalize errors
const handleResponse = async (promise) => {
  try {
    const res = await promise
    return { data: res.data, error: null }
  } catch (err) {
    const message = err?.response?.data?.error || err?.response?.data || err.message || 'Network error'
    return { data: null, error: message }
  }
}

export const geocode = async (params) => {
  return handleResponse(api.get('/geocode', { params }))
}

export const weather = async (params) => {
  return handleResponse(api.get('/weather', { params }))
}

export const gemini = async (body) => {
  return handleResponse(api.post('/gemini', body))
}

export default {
  geocode,
  weather,
  gemini,
}
