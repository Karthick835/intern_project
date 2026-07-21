import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'

ReactDOM.createRoot(document.getElementById('root')).render(
  <GoogleOAuthProvider clientId="1003207528404-5qlb2a8fv054q3d5db4vfkcsv9f10c3v.apps.googleusercontent.com">
    <App />
  </GoogleOAuthProvider>
)