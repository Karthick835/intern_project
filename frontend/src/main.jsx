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
  <GoogleOAuthProvider clientId="1003207528404-5qlb2a8fv054q3d5db4vfkcsv9f10c3v.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
)