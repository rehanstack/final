import axios from 'axios'

const PORTS = [5006, 5001, 5002, 5005, 5000, 5003]

/**
 * Robust API POST request helper that probes all candidate backend ports.
 * @param {string} endpoint - API path (e.g. '/api/upload-csv')
 * @param {any} body - Request body or FormData
 * @param {object} config - Optional axios configuration
 * @returns {Promise<object>} Axios response object
 */
export async function apiPost(endpoint, body, config = {}) {
  let lastError = null

  // 1. Try relative endpoint first (works in production with Vercel rewrites or Vite proxy)
  try {
    const response = await axios.post(endpoint, body, config)
    if (response && response.status < 500) {
      return response
    }
  } catch (err) {
    lastError = err
    if (err.response && err.response.status < 500) {
      return err.response
    }
  }

  // 2. Fallback for local development if the relative endpoint fails
  for (const port of PORTS) {
    try {
      const response = await axios.post(`http://localhost:${port}${endpoint}`, body, config)
      if (response && response.status < 500) {
        return response
      }
    } catch (err) {
      lastError = err
      if (err.response && err.response.status < 500) {
        return err.response
      }
    }
  }
  
  throw lastError || new Error('Failed to connect to DBSense backend server.')
}
