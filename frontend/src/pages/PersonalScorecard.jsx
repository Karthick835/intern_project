import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  User, TrendingUp, TrendingDown, Minus, Flame, Star, Target, CheckCircle,
  Calendar, Clock, Zap, Award, ChevronRight, BarChart2
} from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const PersonalScorecard = () => {
  const [loading, setLoading] = useState(true)
  const [activities, setActivities] = useState([])
  const [teamData, setTeamData] = useState([])

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')
  const userName = localStorage.getItem('userName') || 'User'
  const userRole = localStorage.getItem('userRole') || ''

  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const roleLabel = userRole.replace('ROLE_', '').replace(/_/g, ' ').toLowerCase()
  const greeting = (() => { const h = new Date().getHours(); return h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening' })()

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain }
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [actRes, teamRes] = await Promise.all([api.get('/dashboard/activity'), api.get('/team')])
        setActivities(actRes.data || [])
        setTeamData(teamRes.data || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Filter activities for current user
  const myActivities = activities.filter(a => a.user?.name === userName)
  const thisWeek = myActivities.filter(a => {
    if (!a.timestamp) return false
    const d = new Date(a.timestamp)
    const now = new Date()
    const diff = (now - d) / (1000 * 60 * 60 * 24)
    return diff <= 7
  })
  const lastWeek = myActivities.filter(a => {
    if (!a.timestamp) return false
    const d = new Date(a.timestamp)
    const now = new Date()
    const diff = (now - d) / (1000 * 60 * 60 * 24)
    return diff > 7 && diff <= 14
  })

  const thisWeekDone = thisWeek.filter(a => ['COMPLETE', 'DONE', 'UPDATE'].includes((a.action || '').toUpperCase())).length
  const lastWeekDone = lastWeek.filter(a => ['COMPLETE', 'DONE', 'UPDATE'].includes((a.action || '').toUpperCase())).length
  const trend = thisWeekDone - lastWeekDone

  // Streak — count consecutive days with activity
  const streakDays = (() => {
    const daySet = new Set(myActivities.map(a => a.timestamp ? new Date(a.timestamp).toDateString() : null).filter(Boolean))
    let streak = 0
    const today = new Date()
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(today.getDate() - i)
      if (daySet.has(d.toDateString())) streak++
      else if (i > 0) break
    }
    return streak
  })()

  // Rank among team
  const teamCounts = {}
  activities.forEach(a => {
    const name = a.user?.name
    if (!name) return
    teamCounts[name] = (teamCounts[name] || 0) + 1
  })
  const sorted = Object.entries(teamCounts).sort((a, b) => b[1] - a[1])
  const myRank = sorted.findIndex(([n]) => n === userName) + 1
  const isTopContributor = myRank === 1 && sorted.length > 1

  // Score: 0–100 based on activity, streak, rank
  const score = Math.min(100, Math.round(
    (thisWeekDone * 10) +
    (streakDays * 5) +
    (myRank === 1 ? 20 : myRank === 2 ? 10 : myRank === 3 ? 5 : 0) +
    (myActivities.length * 2)
  ))

  const scoreLevel = score >= 80 ? { label: 'Elite', color: '#f59e0b', glow: '#f59e0b40' }
    : score >= 60 ? { label: 'Advanced', color: '#8b5cf6', glow: '#8b5cf640' }
    : score >= 40 ? { label: 'Active', color: '#10b981', glow: '#10b98140' }
    : { label: 'Getting Started', color: '#64748b', glow: '#64748b40' }

  // Day-by-day heatmap (last 7 days)
  const dayActivity = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    const label = d.toLocaleDateString('en', { weekday: 'short' })
    const count = myActivities.filter(a => a.timestamp && new Date(a.timestamp).toDateString() === d.toDateString()).length
    return { label, count, date: d.toDateString() }
  })
  const maxDay = Math.max(...dayActivity.map(d => d.count), 1)

  const StatCard = ({ icon, label, value, sub, color }) => (
    <div className="glass-panel p-4 rounded-2xl flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: `${color}15`, border: `1px solid ${color}30` }}>
        <div style={{ color }}>{icon}</div>
      </div>
      <div>
        <p className="text-xl font-black text-slate-900 dark:text-slate-100 leading-tight">{loading ? '—' : value}</p>
        <p className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</p>
        {sub && <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Hero card */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-950 to-slate-950 p-6 border border-slate-800/50 shadow-2xl"
      >
        <div className="absolute top-0 right-0 w-64 h-64 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-48 h-48 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center gap-5">
          {/* Avatar + score ring */}
          <div className="relative flex-shrink-0 self-start">
            <svg width={80} height={80} className="-rotate-90 absolute inset-0">
              <circle cx={40} cy={40} r={34} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6} />
              <motion.circle
                cx={40} cy={40} r={34} fill="none"
                stroke={scoreLevel.color} strokeWidth={6}
                strokeDasharray={2 * Math.PI * 34}
                initial={{ strokeDashoffset: 2 * Math.PI * 34 }}
                animate={{ strokeDashoffset: 2 * Math.PI * 34 * (1 - score / 100) }}
                transition={{ duration: 1.5, ease: 'easeOut' }}
                strokeLinecap="round"
                style={{ filter: `drop-shadow(0 0 8px ${scoreLevel.glow})` }}
              />
            </svg>
            <div className="w-20 h-20 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center text-white font-black text-xl shadow-xl select-none">
              {userInitials}
            </div>
          </div>

          <div className="flex-1 min-w-0 space-y-1">
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">{greeting}</p>
              {isTopContributor && (
                <span className="flex items-center gap-1 px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full text-[10px] font-extrabold uppercase tracking-wider">
                  <Star className="w-3 h-3" /> Top Contributor
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">{userName}</h1>
            <p className="text-slate-400 text-sm capitalize">{roleLabel} · {subdomain} workspace</p>

            <div className="flex items-center gap-4 pt-2">
              <div>
                <span className="text-3xl font-black" style={{ color: scoreLevel.color }}>{loading ? '—' : score}</span>
                <span className="text-slate-500 text-sm ml-1">/100</span>
              </div>
              <div>
                <p className="text-sm font-bold" style={{ color: scoreLevel.color }}>{scoreLevel.label}</p>
                <p className="text-[10px] text-slate-500 font-medium">Productivity score</p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard icon={<CheckCircle className="w-4.5 h-4.5" />} label="Done this week" value={thisWeekDone} color="#10b981"
          sub={trend > 0 ? `↑ ${trend} vs last week` : trend < 0 ? `↓ ${Math.abs(trend)} vs last week` : 'Same as last week'}
        />
        <StatCard icon={<Flame className="w-4.5 h-4.5" />} label="Day streak" value={`${streakDays}🔥`} color="#ef4444" sub="Active days in a row" />
        <StatCard icon={<BarChart2 className="w-4.5 h-4.5" />} label="Team rank" value={loading || !myRank ? '—' : `#${myRank}`} color="#8b5cf6" sub={`of ${sorted.length} members`} />
        <StatCard icon={<Zap className="w-4.5 h-4.5" />} label="Total actions" value={myActivities.length} color="#f59e0b" sub="All time activity" />
      </div>

      {/* Weekly activity heatmap */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-panel p-5 rounded-2xl">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <div className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-indigo-600 rounded-full" />
          Last 7 Days Activity
        </h3>
        <div className="flex items-end gap-2">
          {dayActivity.map((day, i) => {
            const heightPct = day.count > 0 ? Math.max(10, (day.count / maxDay) * 100) : 4
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1.5">
                <motion.div
                  initial={{ height: 0 }} animate={{ height: `${heightPct}px` }}
                  transition={{ delay: i * 0.07, duration: 0.5, ease: 'easeOut' }}
                  className="w-full rounded-t-lg min-h-[4px]"
                  style={{
                    background: day.count > 0
                      ? `linear-gradient(to top, #8b5cf6, #a78bfa)`
                      : '#e2e8f0',
                    opacity: day.count > 0 ? 1 : 0.3
                  }}
                  title={`${day.count} actions on ${day.date}`}
                />
                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase">{day.label}</span>
                {day.count > 0 && <span className="text-[9px] font-black text-violet-500">{day.count}</span>}
              </div>
            )
          })}
        </div>
      </motion.div>

      {/* Trend comparison */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="glass-panel p-5 rounded-2xl">
        <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2 mb-4">
          <div className="w-1.5 h-4 bg-gradient-to-b from-emerald-500 to-teal-400 rounded-full" />
          Weekly Comparison
        </h3>
        <div className="grid grid-cols-2 gap-4">
          {[
            { label: 'This Week', value: thisWeekDone, color: '#8b5cf6' },
            { label: 'Last Week', value: lastWeekDone, color: '#64748b' },
          ].map(item => (
            <div key={item.label} className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{item.label}</span>
                <span className="text-sm font-black text-slate-800 dark:text-slate-200">{loading ? '—' : item.value}</span>
              </div>
              <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, (item.value / Math.max(thisWeekDone, lastWeekDone, 1)) * 100)}%` }}
                  transition={{ duration: 0.8, delay: 0.4 }}
                  style={{ background: item.color }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className={`mt-4 flex items-center gap-2 text-sm font-bold ${
          trend > 0 ? 'text-emerald-600 dark:text-emerald-400' : trend < 0 ? 'text-rose-500' : 'text-slate-400'
        }`}>
          {trend > 0 ? <TrendingUp className="w-4 h-4" /> : trend < 0 ? <TrendingDown className="w-4 h-4" /> : <Minus className="w-4 h-4" />}
          {trend > 0 ? `${trend} more actions than last week` : trend < 0 ? `${Math.abs(trend)} fewer actions` : 'Same pace as last week'}
        </div>
      </motion.div>
    </div>
  )
}

export default PersonalScorecard
