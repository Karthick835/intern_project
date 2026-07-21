import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import axios from 'axios'
import { GoogleOAuthProvider } from '@react-oauth/google'

// Wrap axios.create to automatically attach a global 401/403 session clearing interceptor
const originalCreate = axios.create
axios.create = function (...args) {
  const instance = originalCreate.apply(this, args)
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      if (error.response && (error.response.status === 401 || error.response.status === 403)) {
        localStorage.clear()
        window.location.href = '/login'
      }
      return Promise.reject(error)
    }
  )
  return instance
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="1001259680391-43pour5dkaepq3sgmk7hdjn2mvsvduqs.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
)