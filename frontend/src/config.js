export const getApiBase = () => {
  if (import.meta.env.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL
  }
  // Local development on port 8888 or 5173
  if (typeof window !== 'undefined' && (window.location.port === '8888' || window.location.port === '5173')) {
    return 'http://localhost:8080/api'
  }
  return '/api'
}

export const getWsBase = () => {
  if (import.meta.env.VITE_WS_BASE_URL) {
    return import.meta.env.VITE_WS_BASE_URL
  }
  if (typeof window !== 'undefined') {
    const isDev = window.location.port === '8888' || window.location.port === '5173'
    const host = isDev ? 'localhost:8080' : window.location.host
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${host}/ws-native`
  }
  return 'ws://localhost:8080/ws-native'
}
