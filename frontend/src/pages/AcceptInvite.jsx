import React, { useEffect, useState } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getApiBase } from '../config'

const AcceptInvite = () => {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const [status, setStatus] = useState('Processing your invitation...')
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const token = searchParams.get('token')
    const authToken = localStorage.getItem('authToken')

    if (!token) {
      setStatus('No invitation token found.')
      setIsLoading(false)
      return
    }

    if (!authToken) {
      setStatus('Please sign in first. Redirecting to login...')
      // Redirect to login with a return path
      setTimeout(() => navigate(`/login?redirect=/accept-invite?token=${token}`), 2000)
      return
    }

    axios.post(`${getApiBase()}/team/invitations/accept`, { token }, {
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    }).then(res => {
      setStatus('✓ Invitation accepted! Redirecting to dashboard...')
      setTimeout(() => navigate('/dashboard'), 2000)
    }).catch(err => {
      setStatus(`Error: ${err.response?.data?.error || err.message}`)
      setIsLoading(false)
    })
  }, [searchParams, navigate])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="p-8 bg-white/5 border border-white/10 rounded-2xl text-center max-w-md">
        {isLoading && <div className="animate-spin mb-4 text-center">⏳</div>}
        <p className="text-sm font-bold">{status}</p>
      </div>
    </div>
  )
}

export default AcceptInvite
