import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sparkles, Send, CheckCircle, ArrowLeft, Mail } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../../config'

const JoinRequest = () => {
  const navigate = useNavigate()
  
  // Retrieve signed-in Google user information if available
  const googleUser = JSON.parse(sessionStorage.getItem('googleUser') || '{}')
  const requesterEmail = googleUser.email || ''
  const requesterName = googleUser.name || ''

  const [leaderEmail, setLeaderEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!leaderEmail.trim()) return

    setLoading(true)
    setError('')
    
    try {
      const payload = {
        leaderEmail: leaderEmail.trim(),
        requesterEmail: requesterEmail || 'anonymous@gmail.com',
        requesterName: requesterName || 'Guest User'
      }

      await axios.post(`${getApiBase()}/collaboration/join-request`, payload)
      setSuccess(true)
    } catch (err) {
      setError(err.response?.data || 'Failed to submit join request. Please verify the leader email.')
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
        <div className="inline-flex items-center gap-2.5 mb-8">
          <div className="w-11 h-11 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <span className="text-white text-2xl font-bold tracking-tight">SaaS Grid</span>
        </div>

        {success ? (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md">
            <div className="w-12 h-12 bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-6 h-6" />
            </div>
            
            <h2 className="text-2xl font-bold text-white mb-2">Request Sent!</h2>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Your request to join the workspace owned by <strong className="text-white font-semibold">{leaderEmail}</strong> has been sent.
            </p>

            <div className="p-4 bg-white/5 border border-white/5 rounded-2xl text-xs text-slate-350 leading-relaxed mb-6">
              We have sent a real email notification to the Team Leader. Once they approve your request, you will receive an email confirmation and can log in.
            </div>

            <button
              onClick={() => navigate('/login')}
              className="w-full py-2.5 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-bold text-sm transition"
            >
              Back to Login
            </button>
          </div>
        ) : (
          <div className="bg-white/5 border border-white/10 rounded-3xl p-8 backdrop-blur-md text-left">
            <h2 className="text-2xl font-bold text-white mb-2 text-center">Join Existing Team</h2>
            <p className="text-slate-450 text-xs mb-6 text-center leading-relaxed">
              Enter your Team Leader's email address to request access to their workspace.
            </p>

            {error && (
              <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-medium">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Your Account Details
                </label>
                <div className="px-4 py-2.5 bg-white/5 border border-white/5 rounded-xl text-xs text-slate-300 font-medium">
                  {requesterName} ({requesterEmail || 'Not Signed In'})
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Team Leader's Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 w-4.5 h-4.5 text-slate-500" />
                  <input
                    type="email"
                    required
                    placeholder="leader@company.com"
                    value={leaderEmail}
                    onChange={(e) => setLeaderEmail(e.target.value)}
                    className="w-full pl-11 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-violet-500 text-white"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !leaderEmail}
                className="w-full flex items-center justify-center gap-2 py-3 px-6 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 active:scale-98 text-white rounded-xl font-bold text-sm transition shadow-lg shadow-violet-500/20 disabled:opacity-50"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-4 h-4" /> Send Request
                  </>
                )}
              </button>
            </form>

            <button
              onClick={() => navigate('/setup')}
              className="mt-6 text-xs text-slate-500 hover:text-slate-350 transition flex items-center gap-1.5 mx-auto"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to Setup Workspace
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default JoinRequest
