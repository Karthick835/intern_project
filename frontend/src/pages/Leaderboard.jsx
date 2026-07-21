import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Trophy, Medal, Star, Flame, Zap, Target, Crown, TrendingUp, Award, X, ChevronUp, ChevronDown, Minus } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

// Badge definitions
const BADGE_DEFS = [
  { id: 'speed_demon', icon: '⚡', label: 'Speed Demon', desc: '5 tasks in one day', color: '#f59e0b', rarity: 'rare' },
  { id: 'closer', icon: '🎯', label: 'The Closer', desc: '10 tasks completed total', color: '#8b5cf6', rarity: 'epic' },
  { id: 'on_fire', icon: '🔥', label: 'On Fire', desc: '3-day completion streak', color: '#ef4444', rarity: 'rare' },
  { id: 'team_player', icon: '🤝', label: 'Team Player', desc: 'Assigned tasks to 3+ members', color: '#0ea5e9', rarity: 'common' },
  { id: 'sprint_hero', icon: '🏃', label: 'Sprint Hero', desc: 'Completed a full sprint', color: '#10b981', rarity: 'epic' },
  { id: 'perfectionist', icon: '✨', label: 'Perfectionist', desc: 'All tasks reviewed before done', color: '#ec4899', rarity: 'legendary' },
]

const RARITY_COLORS = {
  common: { bg: 'bg-slate-100 dark:bg-slate-800', text: 'text-slate-500', border: 'border-slate-200 dark:border-slate-700', label: 'Common' },
  rare: { bg: 'bg-blue-50 dark:bg-blue-950/20', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-900/30', label: 'Rare' },
  epic: { bg: 'bg-violet-50 dark:bg-violet-950/20', text: 'text-violet-600 dark:text-violet-400', border: 'border-violet-100 dark:border-violet-900/30', label: 'Epic' },
  legendary: { bg: 'bg-amber-50 dark:bg-amber-950/20', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-900/30', label: 'Legendary' },
}

const RankIcon = ({ rank }) => {
  if (rank === 1) return <Trophy className="w-5 h-5 text-amber-400" />
  if (rank === 2) return <Medal className="w-5 h-5 text-slate-400" />
  if (rank === 3) return <Medal className="w-5 h-5 text-amber-700" />
  return <span className="w-5 h-5 flex items-center justify-center text-xs font-black text-slate-500">#{rank}</span>
}

const AVATAR_GRADIENTS = [
  'from-violet-500 to-indigo-600', 'from-blue-500 to-cyan-500', 'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-600', 'from-amber-500 to-orange-500', 'from-purple-500 to-violet-600',
]

const Leaderboard = () => {
  const [tab, setTab] = useState('sprint') // sprint | allTime
  const [team, setTeam] = useState([])
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)
  const [newBadge, setNewBadge] = useState(null)
  const [earnedBadges, setEarnedBadges] = useState(() => {
    try { return JSON.parse(localStorage.getItem('earnedBadges') || '[]') } catch { return [] }
  })

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')
  const currentUserName = localStorage.getItem('userName') || ''

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain }
  })

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true)
        const [teamRes, tasksRes] = await Promise.all([api.get('/team'), api.get('/dashboard/activity')])
        setTeam(teamRes.data)
        setTasks(tasksRes.data || [])
      } catch (e) { console.error(e) }
      finally { setLoading(false) }
    }
    load()
  }, [])

  // Compute leaderboard from activity data
  const leaderboardData = React.useMemo(() => {
    const counts = {}
    ;(tasks || []).forEach(act => {
      if (!act.user) return
      const name = act.user.name
      if (!counts[name]) counts[name] = { name, completed: 0, reviewed: 0, created: 0 }
      const action = (act.action || '').toUpperCase()
      if (action === 'COMPLETE' || action === 'DONE') counts[name].completed++
      if (action === 'REVIEW') counts[name].reviewed++
      if (action === 'CREATE') counts[name].created++
    })

    // Merge with team list so everyone appears
    team.forEach(m => {
      if (!counts[m.name]) counts[m.name] = { name: m.name, completed: 0, reviewed: 0, created: 0 }
    })

    return Object.values(counts)
      .sort((a, b) => b.completed - a.completed)
      .map((entry, i) => ({ ...entry, rank: i + 1 }))
  }, [tasks, team])

  // Check badge unlocks
  useEffect(() => {
    if (!leaderboardData.length) return
    const me = leaderboardData.find(e => e.name === currentUserName)
    if (!me) return

    const newlyEarned = []
    if (me.completed >= 10 && !earnedBadges.includes('closer')) newlyEarned.push('closer')
    if (me.rank === 1 && !earnedBadges.includes('speed_demon') && me.completed > 0) newlyEarned.push('speed_demon')

    if (newlyEarned.length > 0) {
      const updated = [...earnedBadges, ...newlyEarned]
      setEarnedBadges(updated)
      try { localStorage.setItem('earnedBadges', JSON.stringify(updated)) } catch {}
      const badge = BADGE_DEFS.find(b => b.id === newlyEarned[0])
      if (badge) {
        setNewBadge(badge)
        setTimeout(() => setNewBadge(null), 5000)
      }
    }
  }, [leaderboardData])

  const myEntry = leaderboardData.find(e => e.name === currentUserName)

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Badge unlock notification */}
      <AnimatePresence>
        {newBadge && (
          <motion.div
            initial={{ opacity: 0, y: -60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -60, scale: 0.9 }}
            className="fixed top-6 left-1/2 -translate-x-1/2 z-[80] flex items-center gap-3 px-6 py-4 bg-slate-900 border border-amber-500/30 rounded-2xl shadow-2xl shadow-amber-500/10"
          >
            <div className="text-3xl">{newBadge.icon}</div>
            <div>
              <p className="text-xs font-bold text-amber-400 uppercase tracking-wider">Badge Unlocked!</p>
              <p className="text-white font-black text-base">{newBadge.label}</p>
              <p className="text-slate-400 text-xs">{newBadge.desc}</p>
            </div>
            <button onClick={() => setNewBadge(null)} className="ml-4 text-slate-500 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight flex items-center gap-3">
            <div className="w-9 h-9 bg-gradient-to-br from-amber-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
              <Trophy className="w-4.5 h-4.5 text-white" />
            </div>
            Team Leaderboard
          </h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1.5 ml-12">Who's crushing it this sprint?</p>
        </div>

        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
          {[{ id: 'sprint', label: 'This Sprint' }, { id: 'allTime', label: 'All Time' }].map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-3.5 py-1.5 rounded-lg text-sm font-bold transition-all ${
                tab === t.id ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-300'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Personal stat if we have data */}
      {myEntry && (
        <motion.div
          initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-4 flex items-center gap-4"
        >
          <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-xs select-none">
            {myEntry.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
          </div>
          <div className="flex-1">
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Your Rank</p>
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-xl font-black text-slate-900 dark:text-slate-100">#{myEntry.rank}</span>
              <span className="text-sm text-slate-500 dark:text-slate-400">{myEntry.completed} tasks completed</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-4">
            <div className="text-center">
              <p className="text-lg font-black text-emerald-500">{myEntry.completed}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Done</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-violet-500">{myEntry.reviewed}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Reviewed</p>
            </div>
            <div className="text-center">
              <p className="text-lg font-black text-blue-500">{myEntry.created}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Created</p>
            </div>
          </div>
        </motion.div>
      )}

      {/* Leaderboard List */}
      <div className="glass-panel rounded-2xl overflow-hidden">
        {/* Top 3 podium */}
        {!loading && leaderboardData.length >= 3 && (
          <div className="p-6 bg-gradient-to-br from-slate-900/5 to-violet-500/5 dark:from-slate-900/50 dark:to-violet-900/20 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-end justify-center gap-4">
              {/* 2nd */}
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.1 }} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-slate-400 to-slate-500 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg select-none">
                  {leaderboardData[1]?.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{leaderboardData[1]?.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400">{leaderboardData[1]?.completed} tasks</p>
                </div>
                <div className="w-14 h-10 bg-slate-300 dark:bg-slate-700 rounded-t-xl flex items-center justify-center">
                  <Medal className="w-5 h-5 text-slate-500" />
                </div>
              </motion.div>
              {/* 1st */}
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} className="flex flex-col items-center gap-2">
                <div className="relative">
                  <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-500 rounded-2xl flex items-center justify-center text-white font-black text-base shadow-xl shadow-amber-500/30 select-none">
                    {leaderboardData[0]?.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                  </div>
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 text-xl">👑</div>
                </div>
                <div className="text-center">
                  <p className="text-sm font-black text-slate-900 dark:text-slate-100 truncate max-w-[90px]">{leaderboardData[0]?.name.split(' ')[0]}</p>
                  <p className="text-xs text-amber-500 font-bold">{leaderboardData[0]?.completed} tasks</p>
                </div>
                <div className="w-14 h-16 bg-gradient-to-b from-amber-400 to-amber-500 rounded-t-xl flex items-center justify-center shadow-lg">
                  <Trophy className="w-5 h-5 text-white" />
                </div>
              </motion.div>
              {/* 3rd */}
              <motion.div initial={{ opacity:0, y:20 }} animate={{ opacity:1, y:0 }} transition={{ delay:0.2 }} className="flex flex-col items-center gap-2">
                <div className="w-12 h-12 bg-gradient-to-br from-amber-700 to-amber-800 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-lg select-none">
                  {leaderboardData[2]?.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate max-w-[80px]">{leaderboardData[2]?.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-400">{leaderboardData[2]?.completed} tasks</p>
                </div>
                <div className="w-14 h-7 bg-amber-700/30 dark:bg-amber-900/30 rounded-t-xl flex items-center justify-center">
                  <Medal className="w-4 h-4 text-amber-700" />
                </div>
              </motion.div>
            </div>
          </div>
        )}

        {/* Full list */}
        <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
          {loading ? (
            Array.from({length:4}).map((_,i) => (
              <div key={i} className="p-4 flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl skeleton bg-slate-100 dark:bg-slate-800" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-slate-100 dark:bg-slate-800 skeleton rounded w-1/3" />
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 skeleton rounded w-1/4" />
                </div>
              </div>
            ))
          ) : leaderboardData.length === 0 ? (
            <div className="py-16 text-center text-slate-400 dark:text-slate-500 text-sm">
              <Trophy className="w-10 h-10 mx-auto mb-3 text-slate-200 dark:text-slate-700" />
              No data yet — complete some tasks!
            </div>
          ) : leaderboardData.map((entry, idx) => {
            const isMe = entry.name === currentUserName
            const avatarGrad = AVATAR_GRADIENTS[idx % AVATAR_GRADIENTS.length]
            const maxTasks = leaderboardData[0]?.completed || 1

            return (
              <motion.div
                key={entry.name}
                initial={{ opacity:0, x:-10 }}
                animate={{ opacity:1, x:0 }}
                transition={{ delay: idx * 0.05 }}
                className={`flex items-center gap-4 p-4 transition ${isMe ? 'bg-violet-50/50 dark:bg-violet-950/10' : 'hover:bg-slate-50/50 dark:hover:bg-slate-900/30'}`}
              >
                <div className="w-8 flex-shrink-0 flex items-center justify-center">
                  <RankIcon rank={entry.rank} />
                </div>

                <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${avatarGrad} flex items-center justify-center text-white font-black text-xs shadow-sm flex-shrink-0 select-none`}>
                  {entry.name.split(' ').map(n=>n[0]).join('').slice(0,2).toUpperCase()}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className={`text-sm font-bold truncate ${isMe ? 'text-violet-700 dark:text-violet-300' : 'text-slate-800 dark:text-slate-200'}`}>
                      {entry.name} {isMe && <span className="text-[10px] text-violet-500 font-extrabold">(you)</span>}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 mt-1.5">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden max-w-[120px]">
                      <motion.div
                        className="h-full rounded-full bg-gradient-to-r from-violet-500 to-indigo-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${(entry.completed / maxTasks) * 100}%` }}
                        transition={{ duration: 0.8, delay: idx * 0.05 }}
                      />
                    </div>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium whitespace-nowrap">{entry.completed} done</span>
                  </div>
                </div>

                <div className="flex items-center gap-3 flex-shrink-0 hidden sm:flex">
                  <div className="text-center min-w-[36px]">
                    <p className="text-sm font-black text-emerald-500">{entry.completed}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Done</p>
                  </div>
                  <div className="text-center min-w-[36px]">
                    <p className="text-sm font-black text-violet-500">{entry.reviewed}</p>
                    <p className="text-[9px] text-slate-400 uppercase font-bold">Reviewed</p>
                  </div>
                </div>
              </motion.div>
            )
          })}
        </div>
      </div>

      {/* Badges Section */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          <Award className="w-5 h-5 text-amber-500" />
          Achievement Badges
        </h2>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {BADGE_DEFS.map(badge => {
            const earned = earnedBadges.includes(badge.id)
            const rarity = RARITY_COLORS[badge.rarity]
            return (
              <motion.div
                key={badge.id}
                whileHover={{ scale: earned ? 1.03 : 1 }}
                className={`glass-panel p-4 rounded-2xl flex items-center gap-3 border transition-all ${
                  earned ? `${rarity.border} shadow-sm` : 'opacity-40 grayscale'
                }`}
              >
                <div className="text-2xl flex-shrink-0">{badge.icon}</div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-bold truncate ${earned ? 'text-slate-800 dark:text-slate-200' : 'text-slate-500'}`}>{badge.label}</p>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-0.5 line-clamp-1">{badge.desc}</p>
                  <span className={`mt-1 inline-block text-[9px] font-extrabold px-1.5 py-0.5 rounded-full uppercase tracking-wider ${rarity.bg} ${rarity.text}`}>
                    {rarity.label}
                  </span>
                </div>
                {earned && <Star className="w-4 h-4 text-amber-400 flex-shrink-0" />}
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default Leaderboard
