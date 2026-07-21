import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Mic, Copy, Check, RefreshCw, Slack, MessageSquare, X, Loader2, Sparkles, Clock, CheckCircle, Zap } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const StandupGenerator = ({ onClose }) => {
  const [loading, setLoading] = useState(false)
  const [standup, setStandup] = useState(null)
  const [copied, setCopied] = useState(false)
  const [format, setFormat] = useState('default') // default | slack | bullet

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')
  const userName = localStorage.getItem('userName') || 'User'
  const claudeKey = localStorage.getItem('claude_api_key') || ''

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain }
  })

  const generate = async () => {
    setLoading(true)
    setStandup(null)
    setCopied(false)
    try {
      // Fetch last 24h of activity for this user
      const actRes = await api.get('/dashboard/activity')
      const allActivity = actRes.data || []
      const yesterday = new Date()
      yesterday.setDate(yesterday.getDate() - 1)

      const myActivity = allActivity.filter(a =>
        a.user?.name === userName &&
        a.timestamp &&
        new Date(a.timestamp) >= yesterday
      )

      const completed = myActivity.filter(a => ['COMPLETE', 'DONE'].includes((a.action||'').toUpperCase()))
      const updated = myActivity.filter(a => ['UPDATE'].includes((a.action||'').toUpperCase()))
      const created = myActivity.filter(a => ['CREATE'].includes((a.action||'').toUpperCase()))

      // Try AI generation if key available
      if (claudeKey || true) {
        try {
          const activitySummary = myActivity.map(a => `${a.action} on ${a.entity}`).join(', ')
          const prompt = `Generate a professional daily standup update for a developer named ${userName}.
Their activity in the last 24 hours: ${activitySummary || 'No recorded activity'}.
Format: 3 short bullet points — Yesterday (what they did), Today (what they plan to do next based on their tasks), Blockers (say None if no clear blockers).
Keep it concise and professional. Don't use markdown headers.`

          const res = await axios.post(
            `${getApiBase()}/ai/chat`,
            { message: prompt },
            { headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain, 'X-Claude-API-Key': claudeKey } }
          )
          const aiText = res.data?.reply || res.data?.message || ''
          if (aiText && aiText.length > 20) {
            setStandup({ type: 'ai', text: aiText, activity: myActivity })
            setLoading(false)
            return
          }
        } catch (e) { /* fallback to manual */ }
      }

      // Manual generation fallback
      const yesterdayText = completed.length > 0
        ? completed.slice(0, 3).map(a => `• ${a.entity}`).join('\n')
        : updated.length > 0
          ? updated.slice(0, 3).map(a => `• Updated ${a.entity}`).join('\n')
          : '• No completed tasks recorded (might have been offline or working locally)'

      const todayText = created.length > 0
        ? created.slice(0, 2).map(a => `• Work on ${a.entity}`).join('\n')
        : '• Continue ongoing tasks and review backlog'

      setStandup({
        type: 'manual',
        yesterday: yesterdayText,
        today: todayText,
        blockers: 'None at the moment.',
        activity: myActivity
      })
    } catch (e) {
      console.error('Standup generation failed', e)
      setStandup({ type: 'error' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { generate() }, [])

  const getFormattedText = () => {
    if (!standup) return ''
    if (standup.type === 'ai') {
      if (format === 'slack') return `:wave: *Daily Standup — ${userName}*\n\n${standup.text}`
      return standup.text
    }

    const lines = {
      default: `Daily Standup — ${userName}\n\n🟢 Yesterday:\n${standup.yesterday}\n\n🔵 Today:\n${standup.today}\n\n🔴 Blockers:\n${standup.blockers}`,
      slack: `:wave: *Daily Standup — ${userName}*\n\n:white_check_mark: *Yesterday:*\n${standup.yesterday}\n\n:rocket: *Today:*\n${standup.today}\n\n:warning: *Blockers:*\n${standup.blockers}`,
      bullet: `${userName} — Standup\n• Yesterday: ${standup.yesterday.replace(/^•\s*/gm, '').split('\n').join(', ')}\n• Today: ${standup.today.replace(/^•\s*/gm, '').split('\n').join(', ')}\n• Blockers: ${standup.blockers}`,
    }
    return lines[format] || lines.default
  }

  const copyToClipboard = () => {
    const text = getFormattedText()
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const FORMATS = [
    { id: 'default', label: 'Default', icon: '📋' },
    { id: 'slack', label: 'Slack', icon: '💬' },
    { id: 'bullet', label: 'One-liner', icon: '⚡' },
  ]

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.96, y: 16, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.96, y: 16, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 380, damping: 30 }}
        className="w-full max-w-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-emerald-600 to-teal-700 p-5">
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full blur-3xl pointer-events-none" />
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center border border-white/20">
              <Mic className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Smart Standup</h2>
              <p className="text-emerald-200 text-xs mt-0.5 font-medium">AI-generated from your last 24h activity</p>
            </div>
          </div>
        </div>

        <div className="p-5 space-y-4">
          {/* Format picker */}
          {standup && standup.type !== 'error' && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mr-1">Format:</span>
              {FORMATS.map(f => (
                <button
                  key={f.id}
                  onClick={() => setFormat(f.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-bold transition ${
                    format === f.id ? 'bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{f.icon}</span> {f.label}
                </button>
              ))}
            </div>
          )}

          {/* Content area */}
          {loading ? (
            <div className="py-10 text-center space-y-3">
              <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: 'linear' }} className="mx-auto w-10 h-10">
                <Sparkles className="w-10 h-10 text-emerald-500" />
              </motion.div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Generating your standup...</p>
              {['Reading activity log...', 'Summarizing your work...', 'Formatting message...'].map((msg, i) => (
                <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.7 }} className="text-xs text-slate-400 dark:text-slate-500">
                  {msg}
                </motion.p>
              ))}
            </div>
          ) : standup?.type === 'error' ? (
            <div className="py-8 text-center space-y-3">
              <p className="text-slate-500 dark:text-slate-400 text-sm">Could not generate standup — no activity data found.</p>
              <button onClick={generate} className="text-emerald-600 dark:text-emerald-400 text-sm font-bold hover:underline flex items-center gap-1 mx-auto">
                <RefreshCw className="w-3.5 h-3.5" /> Try again
              </button>
            </div>
          ) : standup ? (
            <div className="relative">
              <pre className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-wrap font-sans bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 min-h-[160px]">
                {getFormattedText()}
              </pre>
              {standup.activity?.length > 0 && (
                <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-2 font-medium">
                  Based on {standup.activity.length} activity records from the last 24 hours
                </p>
              )}
            </div>
          ) : null}

          {/* Actions */}
          {standup && standup.type !== 'error' && !loading && (
            <div className="flex gap-3">
              <button
                onClick={generate}
                className="flex items-center gap-1.5 px-3 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" /> Regenerate
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={copyToClipboard}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold shadow-lg transition-all ${
                  copied
                    ? 'bg-emerald-500 text-white shadow-emerald-500/20'
                    : 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow-emerald-500/25'
                }`}
              >
                {copied ? <><Check className="w-4 h-4" /> Copied!</> : <><Copy className="w-4 h-4" /> Copy to clipboard</>}
              </motion.button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default StandupGenerator
