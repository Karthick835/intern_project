import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Building2, ArrowRight, Sparkles, CheckCircle2,
  Globe, Zap, Crown, Lock, Mail, Send, CheckCircle, ArrowLeft
} from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../../config'

const PLANS = [
  {
    id: 'FREE',
    name: 'Free',
    price: '₹0',
    period: 'forever',
    icon: Zap,
    color: 'from-slate-500 to-slate-600',
    border: 'border-slate-700',
    activeBorder: 'border-slate-400',
    badge: null,
    features: [
      { text: 'Up to 3 projects',       locked: false },
      { text: 'Up to 5 team members',   locked: false },
      { text: 'Basic Kanban board',      locked: false },
      { text: 'Sprint planning',         locked: true  },
      { text: 'AI-powered reports',      locked: true  },
      { text: 'Advanced analytics',      locked: true  },
      { text: 'Priority support',        locked: true  },
    ],
  },
  {
    id: 'PRO',
    name: 'Pro',
    price: '₹999',
    period: 'per month',
    icon: Crown,
    color: 'from-violet-500 to-indigo-600',
    border: 'border-violet-700/50',
    activeBorder: 'border-violet-500',
    badge: 'Most Popular',
    features: [
      { text: 'Unlimited projects',      locked: false },
      { text: 'Up to 25 team members',   locked: false },
      { text: 'Kanban + Sprint boards',  locked: false },
      { text: 'Sprint planning',         locked: false },
      { text: 'AI-powered reports',      locked: false },
      { text: 'Advanced analytics',      locked: false },
      { text: 'Priority support',        locked: false },
    ],
  },
]

const SetupWorkspace = ({ setAuthToken }) => {
  const navigate = useNavigate()
  const [googleUser, setGoogleUser]       = useState(null)
  
  // Onboarding Selection State: 'LEADER' | 'MEMBER'
  const [onboardingMode, setOnboardingMode] = useState('LEADER')

  // Leader Form State
  const [companyName, setCompanyName]     = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [selectedPlan, setSelectedPlan]   = useState('PRO')
  const [loading, setLoading]             = useState(false)
  const [error, setError]                 = useState('')

  // Member Form State
  const [leaderEmail, setLeaderEmail] = useState('')
  const [memberLoading, setMemberLoading] = useState(false)
  const [memberSuccess, setMemberSuccess] = useState(false)
  const [memberError, setMemberError] = useState('')

  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('googleUser')
      if (!stored) { navigate('/login'); return }
      setGoogleUser(JSON.parse(stored))
    } catch {
      navigate('/login')
    }
  }, [navigate])

  const handleCompanyChange = (val) => {
    setCompanyName(val)
    setWorkspaceName(val.toLowerCase().replace(/[^a-z0-9]/g, ''))
  }

  const handleLeaderSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    try {
      const res = await axios.post(`${getApiBase()}/auth/google/setup`, {
        email: googleUser.email,
        name: googleUser.name,
        companyName,
        subdomain: workspaceName,
        plan: selectedPlan,
      })
      const data = res.data
      sessionStorage.removeItem('googleUser')
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('tenantSubdomain', data.subdomain || '')
      localStorage.setItem('userName', data.name || 'User')
      localStorage.setItem('userEmail', data.email || '')
      localStorage.setItem('userRole', data.role || '')
      setAuthToken(data.token)
      navigate('/dashboard')
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.message || 'Setup failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleMemberSubmit = async (e) => {
    e.preventDefault()
    if (!leaderEmail.trim()) return
    setMemberLoading(true)
    setMemberError('')
    try {
      const payload = {
        leaderEmail: leaderEmail.trim(),
        requesterEmail: googleUser.email,
        requesterName: googleUser.name
      }
      await axios.post(`${getApiBase()}/collaboration/join-request`, payload)
      setMemberSuccess(true)
    } catch (err) {
      setMemberError(err.response?.data || 'Failed to send request. Verify the leader email is correct.')
    } finally {
      setMemberLoading(false)
    }
  }

  if (!googleUser) return null

  const preview = workspaceName ? `${workspaceName}.saasgrid.io` : 'yourworkspace.saasgrid.io'

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 flex items-center justify-center px-4 py-10 relative overflow-hidden">
      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04]"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 w-full max-w-4xl"
      >
        {/* Logo */}
        <div className="flex items-center justify-center gap-2.5 mb-6">
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-xl font-bold">SaaS Grid</span>
        </div>

        {/* User Account Badge */}
        <div className="flex items-center justify-center mb-8">
          <div className="flex items-center gap-3 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5">
            <div className="w-7 h-7 bg-gradient-to-br from-violet-500 to-indigo-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {googleUser.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p className="text-white text-xs font-semibold leading-tight">{googleUser.name}</p>
              <p className="text-slate-400 text-[10px] leading-tight">{googleUser.email}</p>
            </div>
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* STEP 1: TEAM LEADER FORM (CREATE WORKSPACE) */}
          {onboardingMode === 'LEADER' && (
            <motion.div
              key="leader"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
            >
              <h1 className="text-2xl md:text-3xl font-extrabold text-white mb-2 text-center">Set up your workspace</h1>
              <p className="text-slate-400 text-xs mb-8 text-center">Configure your custom subdomain and company environment.</p>

              <form onSubmit={handleLeaderSubmit}>
                {/* Details card */}
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm mb-6">
                  <h2 className="text-white font-semibold text-sm mb-4">Workspace Info</h2>
                  <div className="grid md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">Company / Team Name</label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={companyName}
                          onChange={e => handleCompanyChange(e.target.value)}
                          placeholder="e.g. Acme Corporation"
                          className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition text-sm font-medium"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-2">Workspace URL</label>
                      <div className="relative">
                        <Globe className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                        <input
                          type="text"
                          required
                          value={workspaceName}
                          onChange={e => setWorkspaceName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                          placeholder="acmecorp"
                          className="w-full pl-11 pr-32 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-slate-600 focus:outline-none focus:border-violet-500 transition text-sm font-medium"
                        />
                        <span className="absolute right-3.5 top-3.5 text-slate-550 text-xs font-semibold">.saasgrid.io</span>
                      </div>
                      <div className="mt-2 px-3 py-1.5 bg-violet-500/10 border border-violet-500/20 rounded-lg flex items-center gap-2">
                        <div className="w-1.5 h-1.5 rounded-full bg-violet-400 flex-shrink-0" />
                        <span className="text-violet-300 text-xs font-mono">{preview}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl font-medium">
                    {error}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || !companyName.trim() || !workspaceName.trim()}
                  className="w-full py-3.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold transition disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg text-sm"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <><span>Create Workspace & Start Coding</span><ArrowRight className="w-4 h-4" /></>
                  )}
                </button>

                <div className="text-center text-xs text-slate-400 mt-5">
                  Want to collaborate instead?{' '}
                  <button
                    type="button"
                    onClick={() => setOnboardingMode('MEMBER')}
                    className="text-violet-450 hover:text-violet-350 font-bold underline transition"
                  >
                    Join an existing team
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* STEP 2B: TEAM MEMBER FORM (JOIN WORKSPACE) */}
          {onboardingMode === 'MEMBER' && (
            <motion.div
              key="member"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="w-full max-w-md mx-auto"
            >
              {/* Back navigation */}
              <button
                onClick={() => setOnboardingMode('LEADER')}
                className="mb-6 flex items-center gap-1.5 text-xs text-slate-405 hover:text-slate-300 transition"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to setup workspace
              </button>

              {memberSuccess ? (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md text-center">
                  <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <CheckCircle className="w-6 h-6" />
                  </div>
                  
                  <h2 className="text-xl font-bold text-white mb-2">Request Sent!</h2>
                  <p className="text-slate-400 text-xs mb-6 leading-relaxed">
                    Your join request to <strong className="text-white font-semibold">{leaderEmail}</strong> has been dispatched.
                  </p>

                  <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-[10px] text-slate-350 leading-relaxed mb-6">
                    A real email was sent to your Team Leader. Once they review and click **Approve** from their Team Management console, you will be added to their workspace.
                  </div>

                  <button
                    onClick={() => navigate('/login')}
                    className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-xs transition"
                  >
                    Return to Login
                  </button>
                </div>
              ) : (
                <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
                  <h2 className="text-xl font-bold text-white mb-1.5 text-center">Join Existing Workspace</h2>
                  <p className="text-slate-450 text-xs mb-6 text-center leading-relaxed">
                    Search and send a request to your Team Leader's account.
                  </p>

                  {memberError && (
                    <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
                      {memberError}
                    </div>
                  )}

                  <form onSubmit={handleMemberSubmit} className="space-y-4">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Team Leader's Email Address
                      </label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-550" />
                        <input
                          type="email"
                          required
                          placeholder="leader@gmail.com"
                          value={leaderEmail}
                          onChange={(e) => setLeaderEmail(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500 text-white"
                        />
                      </div>
                    </div>

                    <button
                      type="submit"
                      disabled={memberLoading || !leaderEmail.trim()}
                      className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-sm transition disabled:opacity-50"
                    >
                      {memberLoading ? (
                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <>
                          <Send className="w-4 h-4" /> Send Join Request
                        </>
                      )}
                    </button>
                  </form>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}

export default SetupWorkspace
