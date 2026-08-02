export const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('onrender.com')) {
      return 'https://saas-grid-backend.onrender.com/api'
    }
    if (window.location.port === '8888' || window.location.port === '5173' || window.location.hostname === 'localhost') {
      return 'http://localhost:8080/api'
    }
  }
  return '/api'
}

export const getWsBase = () => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL
  }
  if (typeof window !== 'undefined') {
    if (window.location.hostname.includes('onrender.com')) {
      return 'wss://saas-grid-backend.onrender.com/ws-native'
    }
    const isDev = window.location.port === '8888' || window.location.port === '5173' || window.location.hostname === 'localhost'
    const host = isDev ? 'localhost:8080' : window.location.host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${host}/ws-native`
  }
  return 'ws://localhost:8080/ws-native'
}
