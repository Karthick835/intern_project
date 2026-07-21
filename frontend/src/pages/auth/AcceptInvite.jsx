import React, { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, CheckCircle, AlertTriangle, ArrowRight, Lock, User } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../../config'

const AcceptInvite = ({ setAuthToken }) => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [validating, setValidating] = useState(true)
  const [inviteData, setInviteData] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [fullName, setFullName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isInApp, setIsInApp] = useState(false)

  useEffect(() => {
    const ua = navigator.userAgent || navigator.vendor || ''
    const inApp = (
      /FBAN|FBAV|Instagram|Twitter|WebView|wv/i.test(ua) ||
      (/iPhone|iPad|iPod/i.test(ua) && !/Safari/i.test(ua))
    )
    setIsInApp(inApp)
  }, [])

  useEffect(() => {
    if (!token) {
      setError('Invitation token is missing.')
      setValidating(false)
      return
    }

    const validateToken = async () => {
      try {
        const res = await axios.get(`${getApiBase()}/collaboration/invite/validate?token=${token}`)
        setInviteData(res.data)
      } catch (err) {
        const errorData = err.response?.data
        const errorMessage = typeof errorData === 'string'
          ? errorData
          : errorData?.message || 'Invalid or expired invitation token.'
        setError(errorMessage)
      } finally {
        setValidating(false)
      }
    }

    validateToken()
  }, [token])

  const handleAcceptInvite = async (e) => {
    e.preventDefault()
    if (!inviteData) return

    if (!fullName.trim()) {
      setError('Please enter your name.')
      return
    }

    if (password.length < 4) {
      setError('Please choose a password with at least 4 characters.')
      return
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    setError('')

    try {
      await axios.post(`${getApiBase()}/collaboration/invite/accept`, {
        token,
        name: fullName.trim(),
        password
      })

      const loginRes = await axios.post(`${getApiBase()}/auth/login`, {
        email: inviteData.email,
        password
      }, {
        headers: {
          'X-Tenant-ID': inviteData.subdomain || inviteData.tenantId || ''
        }
      })

      const data = loginRes.data
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('tenantSubdomain', data.subdomain || '')
      localStorage.setItem('userName', data.name || fullName.trim())
      localStorage.setItem('userEmail', data.email || inviteData.email)
      localStorage.setItem('userRole', data.role || '')

      setAuthToken(data.token)
      navigate('/dashboard')
    } catch (err) {
      console.error('Accept invite error', err)
      const errorData = err.response?.data
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to join workspace. Please try again.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        {/* Logo */}
        <div className="inline-flex items-center gap-2.5 mb-6">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">SaaS Grid</span>
        </div>

        {isInApp && (
          <div className="mb-4 p-4 bg-amber-500/10 border border-amber-500/25 text-amber-300 rounded-2xl text-[11px] font-medium leading-relaxed flex items-start gap-2.5 shadow-lg shadow-black/20">
            <AlertTriangle className="w-4.5 h-4.5 text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-left">
              <strong className="block text-amber-250 mb-0.5 font-bold uppercase tracking-wider text-[10px]">Open in System Browser</strong>
              Google blocks account login inside mail apps. Tap the <span className="text-white font-bold">three dots</span> (top right) or <span className="text-white font-bold">share icon</span> (bottom) and select <span className="text-white font-bold">"Open in Browser"</span>.
            </div>
          </div>
        )}

        {validating ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md flex flex-col items-center">
            <div className="w-10 h-10 border-3 border-violet-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p className="text-slate-350 text-sm">Validating invitation token...</p>
          </div>
        ) : error ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <div className="w-12 h-12 bg-red-500/10 border border-red-500/25 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Invitation Error</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{error}</p>
            <button
              onClick={() => navigate('/login')}
              className="px-6 py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-semibold text-sm transition"
            >
              Go to Login
            </button>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">You're Invited!</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              You have been invited to join <strong className="text-white font-semibold">{inviteData.companyName}</strong> ({inviteData.subdomain}) as a <span className="text-violet-400 font-bold">{inviteData.role}</span>.
            </p>

            <div className="p-3 bg-white/5 border border-white/5 rounded-2xl text-left mb-6">
              <span className="text-[10px] text-slate-500 uppercase font-extrabold block">Invited Email</span>
              <span className="text-xs text-slate-300 font-semibold">{inviteData.email}</span>
            </div>

            <form onSubmit={handleAcceptInvite} className="space-y-3 text-left">
              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-2">Your name</label>
                <div className="relative">
                  <User className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="text"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Your Full Name"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-2">Choose a password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Create a password"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] uppercase tracking-[0.2em] font-bold text-slate-500 mb-2">Confirm password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Repeat the password"
                    className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-400"
                    required
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-800 transition shadow-lg text-sm disabled:opacity-60"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                ) : (
                  <CheckCircle className="w-5 h-5" />
                )}
                {loading ? 'Joining workspace…' : 'Accept invitation'}
              </button>
            </form>

            <button
              onClick={() => navigate('/login')}
              className="mt-4 text-xs text-slate-500 hover:text-slate-350 transition flex items-center gap-1.5 mx-auto"
            >
              Cancel and login to other workspace <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default AcceptInvite
