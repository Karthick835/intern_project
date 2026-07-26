import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getApiBase } from '../config'

const GitHubCallback = () => {
  const [status, setStatus] = useState('Connecting to GitHub...')
  const navigate = useNavigate()

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const token = localStorage.getItem('authToken')
    const subdomain = localStorage.getItem('tenantSubdomain') || 'acmecompany'

    if (!code) {
      setStatus('Missing authorization code from GitHub.')
      return
    }

    axios.post(`${getApiBase()}/github-auth/exchange`, { code }, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'X-Tenant-ID': subdomain
      }
    }).then(() => {
      setStatus('GitHub connected successfully! Redirecting...')
      setTimeout(() => navigate('/devops'), 1500)
    }).catch((err) => {
      setStatus('Failed to connect GitHub: ' + (err.response?.data?.error || err.message))
    })
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center max-w-md">
        <p className="text-sm font-bold">{status}</p>
      </div>
    </div>
  )
}

export default GitHubCallback
