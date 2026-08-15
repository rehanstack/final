import axios from 'axios'

const PORTS = [5006, 5001, 5002, 5005, 5000, 5003]

/**
 * Helper to check if a response is a valid API JSON response
 */
function isValidApiResponse(response) {
  if (!response) return false;
  
  // If it's a 4xx or 5xx, but it's HTML, it's likely a proxy/web server error page, not our API
  if (response.status >= 400 && typeof response.data === 'string' && response.data.trim().toLowerCase().startsWith('<html')) {
    return false;
  }
  
  // Accept JSON responses < 500
  return response.status < 500;
}

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
    if (isValidApiResponse(response)) {
      return response
    }
  } catch (err) {
    lastError = err
    if (isValidApiResponse(err.response)) {
      return err.response
    }
  }

  // 2. Fallback for local development if the relative endpoint fails
  for (const port of PORTS) {
    try {
      const response = await axios.post(`http://localhost:${port}${endpoint}`, body, config)
      if (isValidApiResponse(response)) {
        return response
      }
    } catch (err) {
      lastError = err
      if (isValidApiResponse(err.response)) {
        return err.response
      }
    }
  }
  
  throw lastError || new Error('Failed to connect to DBSense backend server.')
}
