import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { Mail, Lock, User, Building2, ArrowRight, Sparkles, CheckCircle2, Eye, EyeOff } from 'lucide-react'
import { useGoogleLogin } from '@react-oauth/google'
import axios from 'axios'
import { getApiBase } from '../../config'

const Register = ({ setAuthToken }) => {
  const navigate = useNavigate()
  const [formData, setFormData] = useState({
    companyName: '', subdomain: '', adminName: '',
    adminEmail: '', adminPassword: '', confirmPassword: '', plan: 'PRO'
  })
  const [showPassword, setShowPassword]   = useState(false)
  const [loading, setLoading]             = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)
  const [error, setError]                 = useState('')

  // Workspace setup modal for new Google users
  const [setupModal, setSetupModal]       = useState(false)
  const [googleUser, setGoogleUser]       = useState(null)
  const [companyName, setCompanyName]     = useState('')
  const [workspaceName, setWorkspaceName] = useState('')
  const [setupLoading, setSetupLoading]   = useState(false)
  const [setupError, setSetupError]       = useState('')

  // ─── Helpers ────────────────────────────────────────────────────────────
  const saveAndRedirect = (data) => {
    try {
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('tenantSubdomain', data.subdomain || '')
      localStorage.setItem('userName', data.name || 'User')
      localStorage.setItem('userEmail', data.email || '')
      localStorage.setItem('userRole', data.role || '')
    } catch {}
    setAuthToken(data.token)
    navigate('/dashboard')
  }

  const handleCompanyChange = (val) => {
    setCompanyName(val)
    setWorkspaceName(val.toLowerCase().replace(/[^a-z0-9]/g, ''))
  }

  const handleChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
    // Auto-suggest subdomain from company name
    if (name === 'companyName') {
      setFormData(prev => ({
        ...prev,
        companyName: value,
        subdomain: value.toLowerCase().replace(/[^a-z0-9]/g, '')
      }))
    }
  }

  // ─── Google sign-up ──────────────────────────────────────────────────────
  const googleLogin = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      setGoogleLoading(true)
      setError('')
      try {
        const userInfo = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
          headers: { Authorization: `Bearer ${tokenResponse.access_token}` }
        })
        const res = await axios.post(`${getApiBase()}/auth/google`, {
          idToken: tokenResponse.access_token,
          email: userInfo.data.email,
          name: userInfo.data.name,
        })
        if (res.status === 202 && res.data.needsWorkspace) {
          setGoogleUser({ email: res.data.email, name: res.data.name })
          setSetupModal(true)
        } else {
          saveAndRedirect(res.data)
        }
      } catch (err) {
        const d = err.response?.data
        setError(typeof d === 'string' ? d : d?.message || 'Google sign-up failed.')
      } finally {
        setGoogleLoading(false)
      }
    },
    onError: () => setError('Google sign-up was cancelled or failed.')
  })

  // ─── Workspace setup (after Google) ─────────────────────────────────────
  const handleSetup = async (e) => {
    e.preventDefault()
    setSetupLoading(true)
    setSetupError('')
    try {
      const res = await axios.post(`${getApiBase()}/auth/google/setup`, {
        email: googleUser.email,
        name: googleUser.name,
        companyName,
        subdomain: workspaceName,
      })
      saveAndRedirect(res.data)
    } catch (err) {
      const d = err.response?.data
      setSetupError(typeof d === 'string' ? d : d?.message || 'Setup failed. Please try again.')
    } finally {
      setSetupLoading(false)
    }
  }

  // ─── Email/Password register ─────────────────────────────────────────────
  const handleRegister = async (e) => {
    e.preventDefault()
    setError('')
    if (formData.adminPassword !== formData.confirmPassword) {
      setError('Passwords do not match')
      return
    }
    setLoading(true)
    try {
      await axios.post(`${getApiBase()}/auth/register`, {
        companyName: formData.companyName,
        subdomain: formData.subdomain,
        plan: formData.plan,
        adminEmail: formData.adminEmail,
        adminPassword: formData.adminPassword,
        adminName: formData.adminName
      })
      const loginRes = await axios.post(
        `${getApiBase()}/auth/login`,
        { email: formData.adminEmail, password: formData.adminPassword },
        { headers: { 'X-Tenant-ID': formData.subdomain.toLowerCase() } }
      )
      saveAndRedirect(loginRes.data)
    } catch (err) {
      const d = err.response?.data
      setError(typeof d === 'string' ? d : d?.message || 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="w-full max-w-lg"
      >
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-violet-100 text-violet-700 px-4 py-1.5 rounded-full text-sm font-semibold mb-4">
            <Sparkles className="w-4 h-4" /> Create your workspace
          </div>
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Get started for free</h1>
          <p className="text-slate-500">Set up your team workspace in seconds</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="mb-5 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
            >{error}</motion.div>
          )}

          {/* Google button — fastest way */}
          <button
            id="google-register-btn"
            onClick={() => googleLogin()}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-4 border-2 border-slate-200 rounded-xl bg-white hover:bg-slate-50 hover:border-slate-300 transition-all duration-200 font-semibold text-slate-700 shadow-sm disabled:opacity-60"
          >
            {googleLoading
              ? <div className="w-5 h-5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin" />
              : <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                </svg>
            }
            {googleLoading ? 'Signing up with Google...' : 'Sign up with Google'}
          </button>

          <div className="flex items-center gap-3 my-5">
            <div className="flex-1 h-px bg-slate-200" />
            <span className="text-slate-400 text-sm">or sign up with email</span>
            <div className="flex-1 h-px bg-slate-200" />
          </div>

          {/* Email / Password form */}
          <form onSubmit={handleRegister} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="text" name="companyName" value={formData.companyName}
                    onChange={handleChange} placeholder="Acme Corp"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400 text-sm"
                    required />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Workspace URL</label>
                <div className="relative">
                  <input type="text" name="subdomain" value={formData.subdomain}
                    onChange={e => setFormData(p => ({ ...p, subdomain: e.target.value.toLowerCase().replace(/[^a-z0-9]/g,'') }))}
                    placeholder="acmecorp"
                    className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400 text-sm"
                    required />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Your Full Name</label>
              <div className="relative">
                <User className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="text" name="adminName" value={formData.adminName}
                  onChange={handleChange} placeholder="Full Name"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400 text-sm"
                  required />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Email Address</label>
              <div className="relative">
                <Mail className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                <input type="email" name="adminEmail" value={formData.adminEmail}
                  onChange={handleChange} placeholder="you@example.com"
                  className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400 text-sm"
                  required />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type={showPassword ? 'text' : 'password'} name="adminPassword"
                    value={formData.adminPassword} onChange={handleChange} placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 text-sm"
                    required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-2.5 text-slate-400">
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-2.5 w-4 h-4 text-slate-400" />
                  <input type="password" name="confirmPassword"
                    value={formData.confirmPassword} onChange={handleChange} placeholder="••••••••"
                    className="w-full pl-9 pr-3 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 text-sm"
                    required />
                </div>
              </div>
            </div>

            {/* Plan */}
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">Plan</label>
              <div className="grid grid-cols-3 gap-2">
                {['FREE', 'PRO', 'ENTERPRISE'].map(plan => (
                  <label key={plan} className={`flex items-center justify-center p-2.5 border-2 rounded-xl cursor-pointer transition text-sm font-semibold ${
                    formData.plan === plan
                      ? 'border-violet-500 bg-violet-50 text-violet-700'
                      : 'border-slate-200 text-slate-600 hover:border-slate-300'
                  }`}>
                    <input type="radio" name="plan" value={plan}
                      checked={formData.plan === plan} onChange={handleChange} className="hidden" />
                    {plan}
                  </label>
                ))}
              </div>
            </div>

            <button type="submit" disabled={loading}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg hover:shadow-violet-200 transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading
                ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating account…</>
                : <><span>Create Account</span><ArrowRight className="w-4 h-4" /></>
              }
            </button>
          </form>

          <p className="mt-5 text-center text-slate-600 text-sm">
            Already have an account?{' '}
            <Link to="/login" className="text-violet-600 font-bold hover:text-violet-700">Sign In</Link>
          </p>
        </div>
      </motion.div>

      {/* ── Workspace Setup Modal (new Google users) ─────────────────────── */}
      <AnimatePresence>
        {setupModal && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ type: 'spring', damping: 24, stiffness: 300 }}
              className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-8"
            >
              <div className="flex items-center gap-3 mb-6">
                <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center">
                  <Building2 className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h2 className="text-xl font-bold text-slate-900">Set up your workspace</h2>
                  <p className="text-slate-500 text-sm">Signed in as <span className="font-medium text-violet-600">{googleUser?.email}</span></p>
                </div>
              </div>

              <div className="bg-violet-50 rounded-xl p-4 mb-6 space-y-2">
                {['Your personal dashboard', 'Invite teammates later', 'Projects, sprints & tasks'].map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm text-violet-800">
                    <CheckCircle2 className="w-4 h-4 text-violet-500 flex-shrink-0" />{item}
                  </div>
                ))}
              </div>

              {setupError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">{setupError}</div>
              )}

              <form onSubmit={handleSetup} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Company / Team Name</label>
                  <input type="text" value={companyName}
                    onChange={e => handleCompanyChange(e.target.value)}
                    placeholder="e.g. Acme Corp, My Startup"
                    className="w-full px-4 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400"
                    required />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Workspace URL</label>
                  <div className="relative">
                    <input type="text" value={workspaceName}
                      onChange={e => setWorkspaceName(e.target.value.toLowerCase().replace(/[^a-z0-9]/g, ''))}
                      placeholder="acmecorp"
                      className="w-full pl-4 pr-32 py-2.5 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-violet-500 text-slate-900 placeholder-slate-400"
                      required />
                    <span className="absolute right-4 top-2.5 text-slate-400 text-sm">.saasgrid.io</span>
                  </div>
                  <p className="text-slate-400 text-xs mt-1">Only lowercase letters and numbers.</p>
                </div>
                <button type="submit" disabled={setupLoading || !companyName || !workspaceName}
                  className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold hover:shadow-lg transition-all duration-200 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {setupLoading
                    ? <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Creating workspace…</>
                    : <><span>Create My Workspace</span><ArrowRight className="w-4 h-4" /></>
                  }
                </button>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default Register
