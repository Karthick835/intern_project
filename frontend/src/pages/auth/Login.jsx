import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Shield, Zap, Users, Lock, Mail, Globe, User, PlusCircle, AlertTriangle } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import { getApiBase } from '../../config'

const Login = ({ setAuthToken }) => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('google') // 'google' | 'password' | 'register'

  // Mock Google Login selector modal state
  const [showMockGoogleSelector, setShowMockGoogleSelector] = useState(false)
  const [customMockEmail, setCustomMockEmail] = useState('')
  const [customMockName, setCustomMockName] = useState('')
  const [showCustomMockInput, setShowCustomMockInput] = useState(false)

  // Password Login fields
  const [loginSubdomain, setLoginSubdomain] = useState('')
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register fields
  const [regSubdomain, setRegSubdomain] = useState('')
  const [regCompany, setRegCompany] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')

  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'

  // Trigger Google Login
  const handleGoogleClick = () => {
    googleLogin()
  }

  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setLoading(true)
      setError('')
      try {
        let email = ''
        let name = ''
        try {
          const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
            headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
          })
          email = userInfo.data?.email
          name = userInfo.data?.name
        } catch (uErr) {
          console.warn('Direct Google userinfo fetch warning:', uErr)
        }

        const res = await axios.post(`${getApiBase()}/auth/google`, {
          idToken: tokenResponse.access_token,
          email: email,
          name: name,
        })

        handleGoogleLoginSuccess(res)
      } catch (err) {
        console.error('Google login error:', err)
        const d = err.response?.data
        const detail = typeof d === 'string' ? d : (d?.message || err.message || 'Sign-in failed. Please try again.')
        setError(detail)
      } finally {
        setLoading(false)
      }
    },
    onError: () => setError('Google sign-in was cancelled.')
  })

  // Submit simulated Google account choice to backend
  const handleMockGoogleLogin = async (email, name) => {
    setLoading(true)
    setError('')
    setShowMockGoogleSelector(false)
    try {
      const res = await axios.post(`${getApiBase()}/auth/google`, {
        idToken: 'mock-google-token',
        email: email.trim().toLowerCase(),
        name: name.trim(),
      })
      handleGoogleLoginSuccess(res)
    } catch (err) {
      console.error(err)
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.message || 'Sign-in failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleLoginSuccess = (res) => {
    if (res.status === 202 && res.data.needsWorkspace) {
      sessionStorage.setItem('googleUser', JSON.stringify({
        email: res.data.email,
        name: res.data.name
      }))
      navigate('/setup')
    } else {
      const data = res.data
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('tenantSubdomain', data.subdomain || '')
      localStorage.setItem('userName', data.name || 'User')
      localStorage.setItem('userEmail', data.email || '')
      localStorage.setItem('userRole', data.role || '')
      setAuthToken(data.token)
      navigate('/dashboard')
    }
  }

  // Email/Password Login
  const handlePasswordLogin = async (e) => {
    e.preventDefault()
    if (!loginSubdomain.trim() || !loginEmail.trim() || !loginPassword.trim()) return

    setLoading(true)
    setError('')
    try {
      const res = await axios.post(
        `${getApiBase()}/auth/login`,
        {
          email: loginEmail.trim(),
          password: loginPassword.trim()
        },
        {
          headers: {
            'X-Tenant-ID': loginSubdomain.trim().toLowerCase()
          }
        }
      )

      const data = res.data
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('tenantSubdomain', data.subdomain || '')
      localStorage.setItem('userName', data.name || 'User')
      localStorage.setItem('userEmail', data.email || '')
      localStorage.setItem('userRole', data.role || '')
      setAuthToken(data.token)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      const errorData = err.response?.data
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Invalid workspace credentials.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  // Create Workspace (Register)
  const handleRegister = async (e) => {
    e.preventDefault()
    if (!regSubdomain.trim() || !regCompany.trim() || !regName.trim() || !regEmail.trim() || !regPassword.trim()) return

    setLoading(true)
    setError('')
    try {
      await axios.post(`${getApiBase()}/auth/register`, {
        subdomain: regSubdomain.trim().toLowerCase(),
        companyName: regCompany.trim(),
        adminName: regName.trim(),
        adminEmail: regEmail.trim().toLowerCase(),
        adminPassword: regPassword.trim(),
        plan: 'FREE'
      })

      // Auto login after registration
      const loginRes = await axios.post(
        `${getApiBase()}/auth/login`,
        {
          email: regEmail.trim().toLowerCase(),
          password: regPassword.trim()
        },
        {
          headers: {
            'X-Tenant-ID': regSubdomain.trim().toLowerCase()
          }
        }
      )

      const data = loginRes.data
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('tenantSubdomain', data.subdomain || '')
      localStorage.setItem('userName', data.name || 'User')
      localStorage.setItem('userEmail', data.email || '')
      localStorage.setItem('userRole', data.role || '')
      setAuthToken(data.token)
      navigate('/dashboard')
    } catch (err) {
      console.error(err)
      const errorData = err.response?.data
      const errorMessage = typeof errorData === 'string'
        ? errorData
        : errorData?.message || 'Failed to create workspace. Try a different subdomain.'
      setError(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const features = [
    { icon: Zap,    label: 'AI-powered insights',       desc: 'Smart sprint reports & task analysis' },
    { icon: Users,  label: 'Real-time collaboration',    desc: 'Live chat, activity feed & updates' },
    { icon: Shield, label: 'Multi-tenant & secure',      desc: 'Isolated workspaces for every team' },
  ]

  const mockGoogleAccounts = [
    { name: 'Workspace Leader', email: 'leader@saasgrid.io' },
    { name: 'Project Lead', email: 'lead@saasgrid.io' },
    { name: 'Admin User', email: 'admin@saasgrid.io' },
  ]

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-violet-950 to-indigo-950 flex flex-col items-center justify-center px-4 py-8 relative overflow-y-auto">

      {/* Background grid */}
      <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '48px 48px' }} />

      {/* Glow blobs */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-violet-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 w-full max-w-md text-center flex flex-col items-center">
        {/* Logo */}
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="inline-flex items-center gap-2.5 mb-6"
        >
          <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-500/30">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">SaaS Grid</span>
        </motion.div>

        {/* Headline */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2 leading-tight">
            Your team's <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">command centre</span>
          </h1>
          <p className="text-slate-400 text-sm">
            Plan sprints, track tasks, ship faster.
          </p>
        </motion.div>

        {/* Auth Box */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="w-full bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md mb-6 text-left"
        >
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs">
              {error}
            </div>
          )}

          {/* Switch tabs */}
          <div className="flex bg-white/5 p-1 rounded-xl mb-6 border border-white/5">
            <button
              onClick={() => { setActiveTab('google'); setError('') }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'google' ? 'bg-white text-slate-800 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Google Auth
            </button>
            <button
              onClick={() => { setActiveTab('password'); setError('') }}
              className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                activeTab === 'password' ? 'bg-white text-slate-800 shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Workspace Login
            </button>
          </div>

          <AnimatePresence mode="wait">
            {/* GOOGLE OAUTH TAB */}
            {activeTab === 'google' && (
              <motion.div
                key="google"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                className="space-y-4"
              >
                {!isLocalhost && (
                  <div className="p-3.5 bg-violet-500/10 border border-violet-500/20 text-violet-300 rounded-2xl text-[11px] font-medium leading-relaxed flex items-start gap-2.5 mb-2 select-none">
                    <Sparkles className="w-4 h-4 text-violet-400 flex-shrink-0 mt-0.5" />
                    <p>
                      <strong>Mobile Google Auth Emulation:</strong> Since Google blocks redirect URLs from local IP addresses, clicking the button on your phone will open a simulated account chooser.
                    </p>
                  </div>
                )}

                <button
                  id="google-signin-btn"
                  onClick={handleGoogleClick}
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-3 py-3.5 px-6 bg-white hover:bg-slate-50 active:bg-slate-100 rounded-xl font-bold text-slate-800 transition-all duration-200 shadow-lg disabled:opacity-60 text-sm"
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <svg className="w-4 h-4 flex-shrink-0" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                  )}
                  Continue with Google
                </button>

                <div className="pt-2 border-t border-white/5 text-center">
                  <button
                    onClick={() => setActiveTab('register')}
                    className="text-xs text-violet-400 hover:text-violet-300 font-semibold flex items-center gap-1.5 mx-auto"
                  >
                    <PlusCircle className="w-3.5 h-3.5" /> Need to create a new workspace?
                  </button>
                </div>
              </motion.div>
            )}

            {/* PASSWORD LOGIN TAB */}
            {activeTab === 'password' && (
              <motion.form
                key="password"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handlePasswordLogin}
                className="space-y-4"
              >
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Workspace Subdomain</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="text"
                      value={loginSubdomain}
                      onChange={(e) => setLoginSubdomain(e.target.value)}
                      placeholder="e.g. acme"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="email"
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      placeholder="you@domain.com"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                    <input
                      type="password"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-xs shadow transition disabled:opacity-60 flex items-center justify-center gap-2"
                >
                  {loading && <div className="w-4 h-4 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />}
                  Sign In to Workspace
                </button>
              </motion.form>
            )}

            {/* REGISTER TAB */}
            {activeTab === 'register' && (
              <motion.form
                key="register"
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 10 }}
                onSubmit={handleRegister}
                className="space-y-3"
              >
                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Company Name</label>
                  <div className="relative">
                    <Users className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={regCompany}
                      onChange={(e) => setRegCompany(e.target.value)}
                      placeholder="Acme Corporation"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Desired Subdomain</label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={regSubdomain}
                      onChange={(e) => setRegSubdomain(e.target.value)}
                      placeholder="acme"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Your Name</label>
                  <div className="relative">
                    <User className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="text"
                      value={regName}
                      onChange={(e) => setRegName(e.target.value)}
                      placeholder="Your Full Name"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="user@workspace.com"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-2.5 w-3.5 h-3.5 text-slate-500" />
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-9 pr-3 py-2 rounded-xl border border-white/10 bg-white/10 text-white placeholder:text-slate-600 focus:outline-none focus:border-violet-400 text-xs"
                      required
                    />
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveTab('google')}
                    className="flex-1 py-2 bg-white/5 border border-white/10 text-white rounded-xl font-bold text-xs hover:bg-white/10 transition"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 py-2 bg-white hover:bg-slate-50 text-slate-800 rounded-xl font-bold text-xs shadow transition disabled:opacity-60 flex items-center justify-center gap-1.5"
                  >
                    {loading && <div className="w-3.5 h-3.5 border-2 border-slate-600 border-t-transparent rounded-full animate-spin" />}
                    Create Workspace
                  </button>
                </div>
              </motion.form>
            )}
          </AnimatePresence>
        </motion.div>

        {/* Feature highlights */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
          className="grid grid-cols-3 gap-3 w-full"
        >
          {features.map(({ icon: Icon, label, desc }, i) => (
            <div key={i} className="bg-white/5 border border-white/8 rounded-xl p-3 text-left">
              <Icon className="w-4 h-4 text-violet-400 mb-2" />
              <p className="text-white text-xs font-semibold leading-tight mb-1">{label}</p>
              <p className="text-slate-500 text-[10px] leading-tight">{desc}</p>
            </div>
          ))}
        </motion.div>
      </div>

      {/* ─── SIMULATED GOOGLE ACCOUNT SELECTOR DIALOG (MOBILE ONLY) ─── */}
      <AnimatePresence>
        {showMockGoogleSelector && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 max-w-sm w-full text-center relative overflow-hidden shadow-2xl space-y-5"
            >
              {/* Google Branding Header */}
              <div className="space-y-1.5">
                <div className="flex justify-center mb-2">
                  <svg className="w-8 h-8" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                </div>
                <h3 className="text-white font-bold text-base">Sign in with Google</h3>
                <p className="text-slate-400 text-xs">to continue to SaaS Grid (Dev Simulation)</p>
              </div>

              {/* Account List */}
              <div className="space-y-2 text-left">
                {!showCustomMockInput ? (
                  <>
                    {mockGoogleAccounts.map((account) => (
                      <button
                        key={account.email}
                        onClick={() => handleMockGoogleLogin(account.email, account.name)}
                        className="w-full flex items-center gap-3 p-3 bg-white/5 border border-white/5 hover:bg-white/10 rounded-xl transition text-left cursor-pointer"
                      >
                        <div className="w-8 h-8 rounded-full bg-violet-600/30 flex items-center justify-center text-xs font-black text-violet-300">
                          {account.name[0]}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-white text-xs font-bold truncate">{account.name}</p>
                          <p className="text-slate-500 text-[10px] truncate">{account.email}</p>
                        </div>
                      </button>
                    ))}

                    <button
                      onClick={() => setShowCustomMockInput(true)}
                      className="w-full text-center py-2.5 text-xs font-bold text-violet-400 hover:text-violet-300 transition-colors"
                    >
                      Use another account
                    </button>
                  </>
                ) : (
                  <form
                    onSubmit={(e) => {
                      e.preventDefault()
                      if (customMockEmail.trim()) {
                        handleMockGoogleLogin(customMockEmail, customMockName || customMockEmail.split('@')[0])
                      }
                    }}
                    className="space-y-3"
                  >
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Google Email</label>
                      <input
                        type="email"
                        required
                        value={customMockEmail}
                        onChange={(e) => setCustomMockEmail(e.target.value)}
                        placeholder="user@gmail.com"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Full Name</label>
                      <input
                        type="text"
                        value={customMockName}
                        onChange={(e) => setCustomMockName(e.target.value)}
                        placeholder="Full Name"
                        className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none"
                      />
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setShowCustomMockInput(false)}
                        className="flex-1 py-2 bg-white/5 border border-white/10 text-white rounded-xl text-xs"
                      >
                        Back
                      </button>
                      <button
                        type="submit"
                        className="flex-1 py-2 bg-white text-slate-800 font-bold rounded-xl text-xs"
                      >
                        Sign In
                      </button>
                    </div>
                  </form>
                )}
              </div>

              {/* Close Button */}
              <div className="pt-2 border-t border-white/5">
                <button
                  onClick={() => setShowMockGoogleSelector(false)}
                  className="text-xs text-slate-500 hover:text-slate-300 font-semibold"
                >
                  Cancel
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Login
