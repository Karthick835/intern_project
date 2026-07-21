import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, Mail, Trash2, Loader, AlertCircle, Check, X, Crown, Shield, Code2, UserPlus, Users, Sparkles, ChevronDown, Copy, CheckCheck } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const ROLE_CONFIG = {
  ROLE_ADMIN: { label: 'Team Leader', icon: <Crown className="w-3.5 h-3.5" />, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' },
  COMPANY_ADMIN: { label: 'Team Leader', icon: <Crown className="w-3.5 h-3.5" />, gradient: 'from-amber-500 to-orange-500', bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30' },
  PROJECT_MANAGER: { label: 'Project Manager', icon: <Shield className="w-3.5 h-3.5" />, gradient: 'from-violet-500 to-purple-600', bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900/30' },
  DEVELOPER: { label: 'Developer', icon: <Code2 className="w-3.5 h-3.5" />, gradient: 'from-blue-500 to-sky-500', bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30' },
  default: { label: 'Member', icon: <Users className="w-3.5 h-3.5" />, gradient: 'from-slate-500 to-slate-600', bg: 'bg-slate-50 dark:bg-slate-800/30', text: 'text-slate-600 dark:text-slate-400', border: 'border-slate-200 dark:border-slate-700/40' },
}

const getRoleConfig = (role) => ROLE_CONFIG[role] || ROLE_CONFIG.default

const getInitials = (name) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

const AVATAR_GRADIENTS = [
  'from-violet-500 to-indigo-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-600',
  'from-amber-500 to-orange-500',
  'from-purple-500 to-violet-600',
]

const TeamManagement = () => {
  const [team, setTeam] = useState([])
  const [pendingRequests, setPendingRequests] = useState([])
  const [loading, setLoading] = useState(true)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [showInviteModal, setShowInviteModal] = useState(false)
  const [copiedEmail, setCopiedEmail] = useState(null)

  const currentUserRole = localStorage.getItem('userRole') || ''
  const isTeamLeader = currentUserRole === 'ROLE_ADMIN' || currentUserRole === 'COMPANY_ADMIN'

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState('DEVELOPER')

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain }
  })

  const loadTeam = async () => {
    try {
      setLoading(true)
      const res = await api.get('/team')
      setTeam(res.data)
    } catch (err) {
      console.error('Failed to fetch team', err)
      setError('Could not load team directory.')
    } finally {
      setLoading(false)
    }
  }

  const loadRequests = async () => {
    try {
      const res = await api.get('/collaboration/requests/pending')
      setPendingRequests(res.data)
    } catch (err) {
      console.error('Failed to fetch join requests', err)
    }
  }

  useEffect(() => { loadTeam(); loadRequests() }, [])

  const handleInvite = async (e) => {
    e.preventDefault()
    if (!inviteEmail.trim()) return
    try {
      setInviteLoading(true)
      setError('')
      setSuccessMsg('')
      const res = await api.post('/collaboration/invite', { email: inviteEmail.trim(), role: inviteRole })
      setSuccessMsg(res.data.message || `Invitation sent to ${inviteEmail}`)
      setShowInviteModal(false)
      setInviteEmail('')
    } catch (err) {
      setError(err.response?.data?.message || err.response?.data || 'Failed to send invite.')
    } finally {
      setInviteLoading(false)
    }
  }

  const handleResolveRequest = async (requestId, action) => {
    try {
      setError(''); setSuccessMsg('')
      await api.post(`/collaboration/requests/${requestId}/resolve`, { action })
      setPendingRequests(prev => prev.filter(r => r.id !== requestId))
      setSuccessMsg(`Request ${action === 'APPROVE' ? 'approved' : 'declined'}.`)
      if (action === 'APPROVE') loadTeam()
    } catch (err) {
      setError('Failed to resolve request.')
    }
  }

  const handleDeleteMember = async (id) => {
    if (!window.confirm('Remove this team member?')) return
    try {
      await api.delete(`/team/${id}`)
      setTeam(prev => prev.filter(m => m.id !== id))
    } catch (err) {
      console.error('Failed to delete member', err)
    }
  }

  const handleTransferLeadership = async (targetUserId) => {
    if (!window.confirm("Transfer Team Leader role to this member?")) return
    try {
      setLoading(true)
      const res = await api.post('/team/transfer-leadership', { targetUserId })
      localStorage.setItem('authToken', res.data.token)
      localStorage.setItem('userRole', res.data.role)
      window.location.reload()
    } catch (err) {
      setError(err.response?.data || 'Failed to transfer leadership.')
    } finally {
      setLoading(false)
    }
  }

  const copyEmail = (email) => {
    navigator.clipboard.writeText(email)
    setCopiedEmail(email)
    setTimeout(() => setCopiedEmail(null), 2000)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Users className="w-4.5 h-4.5 text-white" />
            </div>
            Team Directory
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 ml-12">
            {loading ? 'Loading...' : `${team.length} member${team.length !== 1 ? 's' : ''} in ${subdomain} workspace`}
          </p>
        </div>

        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowInviteModal(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-sm font-bold rounded-xl shadow-lg shadow-violet-500/20 transition-all duration-200"
        >
          <UserPlus className="w-4 h-4" />
          Invite Member
        </motion.button>
      </motion.div>

      {/* Status messages */}
      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 text-rose-700 dark:text-rose-400 text-sm rounded-2xl font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            {error}
          </motion.div>
        )}
        {successMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }} className="p-4 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm rounded-2xl font-medium flex items-center gap-2">
            <Check className="w-4 h-4 flex-shrink-0" />
            {successMsg}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Team Cards Grid */}
      {loading && team.length === 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="glass-panel p-5 rounded-2xl space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 skeleton" />
                <div className="flex-1 space-y-2">
                  <div className="h-3.5 bg-slate-100 dark:bg-slate-800 skeleton rounded w-3/4" />
                  <div className="h-2.5 bg-slate-100 dark:bg-slate-800 skeleton rounded w-1/2" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : team.length === 0 ? (
        <div className="glass-panel rounded-2xl p-16 text-center">
          <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Users className="w-8 h-8 text-slate-300 dark:text-slate-600" />
          </div>
          <p className="font-bold text-slate-800 dark:text-slate-200 text-lg mb-1">No team members yet</p>
          <p className="text-slate-400 dark:text-slate-500 text-sm mb-6">Invite your first teammate to get started</p>
          <button onClick={() => setShowInviteModal(true)} className="px-5 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-sm font-bold rounded-xl shadow-lg transition">
            Invite Someone
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {team.map((member, idx) => {
            const roleConf = getRoleConfig(member.role)
            const avatarGrad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
            const initials = getInitials(member.name)
            const isLeader = member.role === 'ROLE_ADMIN' || member.role === 'COMPANY_ADMIN'

            return (
              <motion.div
                key={member.id}
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.06 }}
                className="glass-panel glass-panel-hover p-5 rounded-2xl relative overflow-hidden group"
              >
                {/* Glow accent for leaders */}
                {isLeader && (
                  <div className="absolute top-0 right-0 w-24 h-24 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
                )}

                <div className="flex items-start gap-3.5">
                  {/* Avatar */}
                  <div className={`relative w-12 h-12 rounded-2xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-black text-sm shadow-md flex-shrink-0 select-none`}>
                    {initials}
                    {isLeader && (
                      <div className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-amber-400 rounded-full flex items-center justify-center shadow-md border-2 border-white dark:border-slate-900">
                        <Crown className="w-2.5 h-2.5 text-white" />
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-slate-900 dark:text-slate-100 text-sm truncate">{member.name}</p>
                    <div className={`inline-flex items-center gap-1.5 mt-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleConf.bg} ${roleConf.text} ${roleConf.border}`}>
                      {roleConf.icon}
                      {roleConf.label}
                    </div>
                  </div>
                </div>

                {/* Email row */}
                <div className="mt-4 flex items-center gap-2 p-2.5 bg-slate-50/80 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 group/email">
                  <Mail className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" />
                  <span className="text-xs text-slate-500 dark:text-slate-400 truncate flex-1 font-medium">{member.email}</span>
                  <button
                    onClick={() => copyEmail(member.email)}
                    className="p-1 text-slate-300 dark:text-slate-600 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition opacity-0 group-hover/email:opacity-100"
                    title="Copy email"
                  >
                    {copiedEmail === member.email ? <CheckCheck className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  </button>
                </div>

                {/* Actions */}
                {isTeamLeader && (
                  <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
                    {!isLeader && (
                      <button
                        onClick={() => handleTransferLeadership(member.id)}
                        className="flex-1 flex items-center justify-center gap-1.5 py-1.5 text-amber-600 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl transition text-[11px] font-bold"
                        title="Make Team Leader"
                      >
                        <Crown className="w-3.5 h-3.5" />
                        Make Leader
                      </button>
                    )}
                    {!isLeader && (
                      <button
                        onClick={() => handleDeleteMember(member.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 border border-transparent hover:border-rose-100 dark:hover:border-rose-900/30 rounded-xl transition"
                        title="Remove member"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
              </motion.div>
            )
          })}

          {/* Invite card CTA */}
          <motion.button
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: team.length * 0.06 }}
            onClick={() => setShowInviteModal(true)}
            className="glass-panel rounded-2xl p-5 border-2 border-dashed border-slate-200 dark:border-slate-800 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/30 dark:hover:bg-violet-950/10 transition-all duration-300 flex flex-col items-center justify-center gap-3 min-h-[140px] group"
          >
            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 group-hover:bg-violet-100 dark:group-hover:bg-violet-950/30 flex items-center justify-center transition-colors">
              <Plus className="w-5 h-5 text-slate-400 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors" />
            </div>
            <p className="text-sm font-bold text-slate-400 dark:text-slate-500 group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Invite Teammate</p>
          </motion.button>
        </div>
      )}

      {/* Pending Requests */}
      {pendingRequests.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-3"
        >
          <div className="flex items-center gap-2.5">
            <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 tracking-tight">Pending Join Requests</h2>
            <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-950/30 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-full border border-amber-200 dark:border-amber-900/30">
              {pendingRequests.length}
            </span>
          </div>
          <div className="glass-panel rounded-2xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/60">
            {pendingRequests.map((req, i) => (
              <motion.div
                key={req.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.05 }}
                className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-400 to-slate-500 flex items-center justify-center text-white font-bold text-xs flex-shrink-0 select-none">
                    {req.email?.[0]?.toUpperCase() || '?'}
                  </div>
                  <div className="min-w-0">
                    <p className="font-bold text-slate-800 dark:text-slate-200 text-sm truncate">{req.email}</p>
                    <p className="text-slate-400 dark:text-slate-500 text-xs mt-0.5">Requested access to join workspace</p>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button
                    onClick={() => handleResolveRequest(req.id, 'APPROVE')}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white text-xs font-bold rounded-xl shadow-sm transition"
                  >
                    <Check className="w-3.5 h-3.5" /> Approve
                  </button>
                  <button
                    onClick={() => handleResolveRequest(req.id, 'REJECT')}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 text-xs font-bold rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                  >
                    <X className="w-3.5 h-3.5" /> Decline
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Invite Modal */}
      <AnimatePresence>
        {showInviteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md"
            onClick={() => setShowInviteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 20 }}
              transition={{ type: 'spring', stiffness: 350, damping: 30 }}
              className="relative w-full max-w-md bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
              onClick={e => e.stopPropagation()}
            >
              {/* Modal gradient header */}
              <div className="relative bg-gradient-to-br from-violet-600 via-indigo-600 to-blue-700 p-6 pb-8">
                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-2xl pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-24 h-24 bg-black/10 rounded-full blur-2xl pointer-events-none" />
                <button
                  onClick={() => setShowInviteModal(false)}
                  className="absolute top-4 right-4 p-1.5 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="relative z-10">
                  <div className="w-11 h-11 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mb-3 border border-white/20">
                    <Sparkles className="w-5.5 h-5.5 text-white" />
                  </div>
                  <h2 className="text-xl font-extrabold text-white tracking-tight">Invite a Teammate</h2>
                  <p className="text-violet-200 text-xs mt-1 font-medium">Send an email invite to join your workspace</p>
                </div>
              </div>

              {/* Form */}
              <form onSubmit={handleInvite} className="p-6 space-y-5">
                {/* Email field */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email Address</label>
                  <div className="relative">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                    <input
                      type="email"
                      required
                      value={inviteEmail}
                      onChange={e => setInviteEmail(e.target.value)}
                      placeholder="colleague@company.com"
                      className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition"
                    />
                  </div>
                </div>

                {/* Role select */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: 'DEVELOPER', label: 'Developer', icon: <Code2 className="w-4 h-4" />, color: 'blue' },
                      { value: 'PROJECT_MANAGER', label: 'Manager', icon: <Shield className="w-4 h-4" />, color: 'violet' },
                      { value: 'COMPANY_ADMIN', label: 'Leader', icon: <Crown className="w-4 h-4" />, color: 'amber' },
                    ].map(opt => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setInviteRole(opt.value)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 transition-all duration-200 ${
                          inviteRole === opt.value
                            ? opt.color === 'blue' ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20 text-blue-600 dark:text-blue-400'
                              : opt.color === 'violet' ? 'border-violet-500 bg-violet-50 dark:bg-violet-950/20 text-violet-600 dark:text-violet-400'
                              : 'border-amber-500 bg-amber-50 dark:bg-amber-950/20 text-amber-600 dark:text-amber-400'
                            : 'border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:border-slate-300 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        {opt.icon}
                        <span className="text-[10px] font-bold">{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Submit */}
                <div className="flex gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setShowInviteModal(false)}
                    className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                  >
                    Cancel
                  </button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/25 transition disabled:opacity-60 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {inviteLoading ? (
                      <><Loader className="w-4 h-4 animate-spin" />Sending...</>
                    ) : (
                      <><UserPlus className="w-4 h-4" />Send Invite</>
                    )}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default TeamManagement
