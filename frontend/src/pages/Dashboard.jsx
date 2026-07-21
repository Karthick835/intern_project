import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, Cell, PieChart, Pie, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, AreaChart, Area } from 'recharts'
import { BarChart3, Users, Zap, TrendingUp, Clock, Calendar, ChevronRight, Activity, ArrowUpRight, Target, Flame, Star } from 'lucide-react'
import { Link } from 'react-router-dom'
import axios from 'axios'
import { getApiBase } from '../config'

// Animated counter hook
function useAnimatedCounter(targetValue, duration = 800) {
  const [current, setCurrent] = useState(0)
  const frameRef = useRef(null)
  useEffect(() => {
    if (targetValue === 0) { setCurrent(0); return }
    const startTime = performance.now()
    const startVal = 0
    const animate = (now) => {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      setCurrent(Math.round(startVal + (targetValue - startVal) * eased))
      if (progress < 1) frameRef.current = requestAnimationFrame(animate)
    }
    frameRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(frameRef.current)
  }, [targetValue, duration])
  return current
}

// Circular progress
const CircularProgress = ({ value, size = 64, strokeWidth = 5, color = '#8b5cf6' }) => {
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  const offset = circ - (value / 100) * circ
  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-slate-100 dark:text-slate-800" />
      <motion.circle
        cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={strokeWidth}
        strokeDasharray={circ} strokeLinecap="round"
        initial={{ strokeDashoffset: circ }}
        animate={{ strokeDashoffset: offset }}
        transition={{ duration: 1.2, ease: 'easeOut' }}
      />
    </svg>
  )
}

const Dashboard = () => {
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ totalProjects: 0, activeProjects: 0, totalTasks: 0, completedTasks: 0, totalSprints: 0, activeSprints: 0, totalTeamMembers: 0 })
  const [distribution, setDistribution] = useState({ byStatus: {}, byPriority: {} })
  const [activities, setActivities] = useState([])
  const [error, setError] = useState('')

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')
  const userName = localStorage.getItem('userName') || 'there'
  const greeting = (() => {
    const h = new Date().getHours()
    if (h < 12) return 'Good morning'
    if (h < 18) return 'Good afternoon'
    return 'Good evening'
  })()

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain }
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const [overviewRes, distRes, actRes] = await Promise.all([
        api.get('/dashboard/overview'),
        api.get('/dashboard/task-distribution'),
        api.get('/dashboard/activity')
      ])
      setStats(overviewRes.data)
      setDistribution(distRes.data)
      setActivities(actRes.data)
    } catch (err) {
      console.error('Failed to fetch dashboard data', err)
      setError('Could not load dashboard statistics.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const statusData = Object.keys(distribution.byStatus || {}).map(s => ({ name: s.replace('_', ' '), value: distribution.byStatus[s] }))
  const priorityData = Object.keys(distribution.byPriority || {}).map(p => ({ name: p, count: distribution.byPriority[p] }))
  const completionRate = stats.totalTasks > 0 ? Math.round((stats.completedTasks / stats.totalTasks) * 100) : 0

  const animatedCompleted = useAnimatedCounter(loading ? 0 : stats.completedTasks)
  const animatedTotal = useAnimatedCounter(loading ? 0 : stats.totalTasks)
  const animatedMembers = useAnimatedCounter(loading ? 0 : stats.totalTeamMembers)
  const animatedProjects = useAnimatedCounter(loading ? 0 : stats.activeProjects)

  const STATUS_COLORS = { 'TO DO': '#38bdf8', 'IN PROGRESS': '#f59e0b', 'IN REVIEW': '#8b5cf6', 'DONE': '#10b981', 'TO_DO': '#38bdf8', 'IN_PROGRESS': '#f59e0b', 'IN_REVIEW': '#8b5cf6', default: '#64748b' }
  const PRIORITY_COLORS = { HIGH: '#ef4444', MEDIUM: '#f59e0b', LOW: '#10b981', default: '#64748b' }

  const formatActivityTime = (ts) => {
    if (!ts) return ''
    const date = new Date(ts)
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload?.length) {
      return (
        <div className="bg-slate-900/95 dark:bg-slate-950 backdrop-blur border border-slate-800 px-3 py-2 rounded-xl shadow-xl text-xs font-semibold text-white">
          {`${payload[0].name}: ${payload[0].value}`}
        </div>
      )
    }
    return null
  }

  // Sparkline data (simulated weekly activity)
  const weeklyData = [
    { day: 'Mon', tasks: 4 }, { day: 'Tue', tasks: 7 }, { day: 'Wed', tasks: 5 },
    { day: 'Thu', tasks: 9 }, { day: 'Fri', tasks: 6 }, { day: 'Sat', tasks: 3 }, { day: 'Sun', tasks: 8 }
  ]

  const statCards = [
    {
      label: 'Active Projects',
      value: animatedProjects,
      sub: `of ${loading ? '...' : stats.totalProjects} total`,
      icon: <BarChart3 className="w-5 h-5" />,
      color: 'from-blue-500 to-cyan-500',
      textColor: 'text-blue-500',
      bg: 'bg-blue-50 dark:bg-blue-950/20',
      link: '/tasks'
    },
    {
      label: 'Total Tasks',
      value: animatedTotal,
      sub: `${animatedCompleted} completed`,
      icon: <Zap className="w-5 h-5" />,
      color: 'from-amber-500 to-orange-500',
      textColor: 'text-amber-500',
      bg: 'bg-amber-50 dark:bg-amber-950/20',
      link: '/tasks'
    },
    {
      label: 'Team Members',
      value: animatedMembers,
      sub: 'Registered users',
      icon: <Users className="w-5 h-5" />,
      color: 'from-emerald-500 to-teal-500',
      textColor: 'text-emerald-500',
      bg: 'bg-emerald-50 dark:bg-emerald-950/20',
      link: '/team'
    },
    {
      label: 'Completion Rate',
      value: `${loading ? 0 : completionRate}%`,
      sub: 'Tasks done',
      icon: <Target className="w-5 h-5" />,
      color: 'from-violet-500 to-purple-600',
      textColor: 'text-violet-500',
      bg: 'bg-violet-50 dark:bg-violet-950/20',
      progress: completionRate,
      progressColor: '#8b5cf6',
      link: '/analytics'
    },
  ]

  return (
    <div className="space-y-7 max-w-7xl mx-auto">
      {/* Hero Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-violet-950 to-indigo-950 text-white p-8 md:p-10 border border-slate-800/50 shadow-2xl"
      >
        {/* Decorative elements */}
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-20 w-64 h-64 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-1/2 left-1/2 w-full h-px bg-gradient-to-r from-transparent via-white/5 to-transparent pointer-events-none" />

        {/* Animated grid pattern overlay */}
        <div className="absolute inset-0 opacity-5 pointer-events-none" style={{
          backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)',
          backgroundSize: '40px 40px'
        }} />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 backdrop-blur-sm rounded-full text-xs font-bold text-violet-300 border border-white/10 uppercase tracking-widest select-none">
              <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" />
              Workspace Active
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight">
              {greeting}, <span className="text-transparent bg-clip-text bg-gradient-to-r from-violet-300 to-pink-300">{userName.split(' ')[0]}</span> 👋
            </h1>
            <p className="text-slate-400 text-sm max-w-lg leading-relaxed">
              Here's what's happening in your <span className="text-white font-semibold">{subdomain}</span> workspace today.
            </p>
          </div>

          {/* Sparkline */}
          <div className="flex-shrink-0 hidden md:block">
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 text-right">Weekly Activity</p>
            <ResponsiveContainer width={180} height={60}>
              <AreaChart data={weeklyData}>
                <defs>
                  <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.4} />
                    <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="tasks" stroke="#8b5cf6" strokeWidth={2} fill="url(#sparkGrad)" dot={false} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </motion.div>

      {error && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-400 text-sm rounded-2xl font-medium">{error}</div>
      )}

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map((stat, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.07, duration: 0.4 }}
          >
            <Link to={stat.link} className="block">
              <div className="glass-panel p-5 rounded-2xl hover:shadow-xl dark:hover:shadow-black/30 hover:scale-[1.02] hover:border-slate-300/80 dark:hover:border-slate-700/60 transition-all duration-300 cursor-pointer group relative overflow-hidden">
                {/* Background gradient dot */}
                <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-20 bg-gradient-to-br ${stat.color} blur-xl pointer-events-none`} />

                <div className="flex items-start justify-between mb-4">
                  <div className={`${stat.bg} ${stat.textColor} p-2.5 rounded-xl`}>
                    {stat.icon}
                  </div>
                  {stat.progress !== undefined ? (
                    <CircularProgress value={loading ? 0 : stat.progress} size={42} strokeWidth={4} color={stat.progressColor} />
                  ) : (
                    <ArrowUpRight className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-slate-400 dark:group-hover:text-slate-500 transition" />
                  )}
                </div>

                {loading ? (
                  <div className="space-y-2">
                    <div className="h-8 bg-slate-100 dark:bg-slate-800 rounded-lg skeleton w-3/4" />
                    <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded skeleton w-1/2" />
                  </div>
                ) : (
                  <>
                    <p className="text-2xl font-black text-slate-900 dark:text-slate-100 tracking-tight">{stat.value}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium mt-1">{stat.label}</p>
                    <p className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">{stat.sub}</p>
                  </>
                )}
              </div>
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Charts + Activity Row */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left: Charts 2-col */}
        <div className="lg:col-span-2 grid md:grid-cols-2 gap-6">
          {/* Status Donut */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
            className="glass-panel p-5 rounded-2xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <div className="w-1.5 h-4 bg-gradient-to-b from-violet-500 to-indigo-600 rounded-full" />
                Tasks by Status
              </h3>
              <Link to="/analytics" className="text-[11px] font-bold text-violet-600 dark:text-violet-400 hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            <div className="flex-1 min-h-[200px]">
              {loading ? (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl skeleton" />
              ) : statusData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-2 py-12">
                  <Target className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                  No task data yet
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={statusData} cx="50%" cy="50%" innerRadius={52} outerRadius={72} paddingAngle={4} dataKey="value">
                      {statusData.map((entry, i) => (
                        <Cell key={i} fill={STATUS_COLORS[entry.name.toUpperCase()] || STATUS_COLORS.default} />
                      ))}
                    </Pie>
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={v => <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">{v}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Priority Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }}
            className="glass-panel p-5 rounded-2xl flex flex-col"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
                <div className="w-1.5 h-4 bg-gradient-to-b from-blue-500 to-sky-400 rounded-full" />
                By Priority
              </h3>
              <Flame className="w-4 h-4 text-amber-500" />
            </div>
            <div className="flex-1 min-h-[200px]">
              {loading ? (
                <div className="w-full h-full bg-slate-100 dark:bg-slate-800 rounded-xl skeleton" />
              ) : priorityData.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center text-slate-400 text-xs gap-2 py-12">
                  <BarChart3 className="w-8 h-8 text-slate-300 dark:text-slate-700" />
                  No priority data
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={priorityData} barSize={32} margin={{ top: 5, right: 5, bottom: 5, left: -20 }}>
                    <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b', fontWeight: '700' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: '700' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: 'rgba(148,163,184,0.07)' }} content={<CustomTooltip />} />
                    <Bar dataKey="count" radius={[6, 6, 0, 0]}>
                      {priorityData.map((entry, i) => (
                        <Cell key={i} fill={PRIORITY_COLORS[entry.name.toUpperCase()] || PRIORITY_COLORS.default} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Progress Bars Row */}
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            className="md:col-span-2 glass-panel p-5 rounded-2xl"
          >
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2 mb-4">
              <div className="w-1.5 h-4 bg-gradient-to-b from-emerald-500 to-teal-400 rounded-full" />
              Project Health Overview
            </h3>
            <div className="space-y-4">
              {[
                { label: 'Task Completion', value: completionRate, color: 'from-emerald-500 to-teal-500', icon: <Target className="w-3.5 h-3.5 text-emerald-500" /> },
                { label: 'Sprint Coverage', value: stats.totalSprints > 0 ? Math.min(Math.round((stats.activeSprints / stats.totalSprints) * 100), 100) : 0, color: 'from-violet-500 to-purple-600', icon: <Calendar className="w-3.5 h-3.5 text-violet-500" /> },
                { label: 'Team Utilization', value: stats.totalTeamMembers > 0 ? Math.min(Math.round((stats.totalTeamMembers / 10) * 100), 100) : 0, color: 'from-blue-500 to-sky-500', icon: <Users className="w-3.5 h-3.5 text-blue-500" /> },
              ].map((item, i) => (
                <div key={i} className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                      {item.icon}
                      {item.label}
                    </div>
                    <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{loading ? '—' : `${item.value}%`}</span>
                  </div>
                  <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full bg-gradient-to-r ${item.color}`}
                      initial={{ width: 0 }}
                      animate={{ width: loading ? '0%' : `${item.value}%` }}
                      transition={{ duration: 1, delay: 0.3 + i * 0.15, ease: 'easeOut' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        </div>

        {/* Right: Activity Feed */}
        <motion.div
          initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }}
          className="glass-panel p-5 rounded-2xl flex flex-col max-h-[38rem]"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-slate-800 dark:text-slate-100 text-sm flex items-center gap-2">
              <div className="w-1.5 h-4 bg-gradient-to-b from-rose-500 to-pink-500 rounded-full" />
              Live Activity
            </h3>
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/20 px-2 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              Live
            </div>
          </div>
          <div className="flex-1 overflow-y-auto space-y-2 pr-1">
            {loading ? (
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-900/50">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800 skeleton flex-shrink-0" />
                    <div className="flex-1 space-y-2">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 skeleton rounded w-3/4" />
                      <div className="h-2 bg-slate-200 dark:bg-slate-800 skeleton rounded w-1/3" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full gap-3 py-16">
                <div className="w-12 h-12 rounded-2xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                  <Activity className="w-6 h-6 text-slate-300 dark:text-slate-600" />
                </div>
                <p className="text-slate-400 dark:text-slate-500 text-xs text-center">No activity records yet.<br />Start working on tasks!</p>
              </div>
            ) : activities.map((act, i) => {
              const author = act.user ? act.user.name : 'Unknown'
              const initials = author.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
              const actionColors = { CREATE: 'from-emerald-500 to-teal-500', UPDATE: 'from-blue-500 to-sky-500', DELETE: 'from-rose-500 to-red-500', COMPLETE: 'from-violet-500 to-purple-600' }
              const gradient = actionColors[act.action?.toUpperCase()] || 'from-slate-500 to-slate-600'
              return (
                <motion.div
                  key={act.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="flex items-start gap-3 p-3 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100/60 dark:border-slate-800/40 hover:bg-slate-100/60 dark:hover:bg-slate-800/30 transition group"
                >
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-white font-bold text-[10px] flex-shrink-0 shadow-sm select-none`}>
                    {initials}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                      <span className="font-bold text-slate-900 dark:text-slate-100">{author}</span>
                      {' '}<span className="text-slate-500 dark:text-slate-400">{act.action?.toLowerCase() || 'updated'}</span>{' '}
                      <span className="font-semibold text-slate-700 dark:text-slate-300">{act.entity}</span>
                    </p>
                    <div className="flex items-center gap-1 mt-1 text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                      <Clock className="w-2.5 h-2.5" />
                      {formatActivityTime(act.timestamp)}
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </motion.div>
      </div>

      {/* Quick Actions Row */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
      >
        {[
          { label: 'New Task', icon: <Zap className="w-4.5 h-4.5" />, link: '/tasks', color: 'from-amber-500 to-orange-500', desc: 'Add to backlog' },
          { label: 'Sprint Board', icon: <Calendar className="w-4.5 h-4.5" />, link: '/sprints', color: 'from-emerald-500 to-teal-500', desc: 'View active sprint' },
          { label: 'Analytics', icon: <TrendingUp className="w-4.5 h-4.5" />, link: '/analytics', color: 'from-violet-500 to-purple-600', desc: 'Velocity & insights' },
          { label: 'Invite Team', icon: <Users className="w-4.5 h-4.5" />, link: '/team', color: 'from-blue-500 to-sky-500', desc: 'Grow your team' },
        ].map((action, i) => (
          <Link key={i} to={action.link}>
            <motion.div
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
              className="glass-panel p-4 rounded-2xl flex items-center gap-3 hover:shadow-lg dark:hover:shadow-black/20 transition-all duration-300 cursor-pointer group border hover:border-slate-300/60 dark:hover:border-slate-700/60"
            >
              <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center text-white shadow-md flex-shrink-0`}>
                {action.icon}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{action.label}</p>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{action.desc}</p>
              </div>
            </motion.div>
          </Link>
        ))}
      </motion.div>
    </div>
  )
}

export default Dashboard
