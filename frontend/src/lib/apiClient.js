import axios from 'axios'

// Helper to get custom AI gateway URL from local storage
const getCustomAiGatewayUrl = () => {
  try {
    return localStorage.getItem('aiGatewayUrl') || null;
  } catch (e) {
    return null;
  }
};

const PORTS = [5006, 5001, 5002, 5005, 5000, 5003]

// Use Vercel/Vite environment variable if provided
const API_BASE_URL = import.meta.env.VITE_API_URL || ''

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

  // Inject custom AI gateway URL if configured
  const customAiUrl = getCustomAiGatewayUrl();
  if (customAiUrl) {
    config.headers = {
      ...config.headers,
      'x-ai-gateway-url': customAiUrl
    };
  }

  // Debugging log to help users know if Vercel env var was injected properly
  if (!API_BASE_URL) {
    console.warn("⚠️ VITE_API_URL is missing. API calls will try relative paths and fallback to localhost. If you are on Vercel, make sure VITE_API_URL is set in Settings -> Environment Variables and you REDEPLOYED.");
  }

  // 1. Try configured endpoint or relative endpoint first
  const urlToTry = API_BASE_URL ? `${API_BASE_URL.replace(/\/$/, '')}${endpoint}` : endpoint;
  
  try {
    const response = await axios.post(urlToTry, body, config)
    if (isValidApiResponse(response)) {
      return response
    }
  } catch (err) {
    lastError = err
    if (isValidApiResponse(err.response)) {
      return err.response
    }
  }

  // 2. Fallback for local development if the relative endpoint fails (only try if no strict VITE_API_URL is set)
  if (!API_BASE_URL) {
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
  }
  
  throw lastError || new Error('Failed to connect to DBSense backend server. Check browser console for missing VITE_API_URL warnings.')
}

/**
 * Robust API GET request helper
 */
export async function apiGet(endpoint, config = {}) {
  let lastError = null

  // Inject custom AI gateway URL if configured
  const customAiUrl = getCustomAiGatewayUrl();
  if (customAiUrl) {
    config.headers = {
      ...config.headers,
      'x-ai-gateway-url': customAiUrl
    };
  }

  if (!API_BASE_URL) {
    console.warn("⚠️ VITE_API_URL is missing.");
  }

  const urlToTry = API_BASE_URL ? `${API_BASE_URL.replace(/\/$/, '')}${endpoint}` : endpoint;
  
  try {
    const response = await axios.get(urlToTry, config)
    if (isValidApiResponse(response)) {
      return response
    }
  } catch (err) {
    lastError = err
    if (isValidApiResponse(err.response)) {
      return err.response
    }
  }

  if (!API_BASE_URL) {
    for (const port of PORTS) {
      try {
        const response = await axios.get(`http://localhost:${port}${endpoint}`, config)
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
  }
  
  throw lastError || new Error('Failed to connect to DBSense backend server.')
}
