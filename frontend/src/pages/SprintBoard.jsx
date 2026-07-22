import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { Calendar, Play, CheckCircle2, Plus, Info, AlertCircle, Loader, FilePlus, Sparkles, X, Brain, Mic, Timer, Activity, Trash2 } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'
import SprintHealthScore from '../components/SprintHealthScore'
import AiSprintPlanner from '../components/AiSprintPlanner'
import StandupGenerator from '../components/StandupGenerator'

const SprintBoard = () => {
  const [sprints, setSprints] = useState([])
  const [selectedSprintId, setSelectedSprintId] = useState('')
  const [sprintTasks, setSprintTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [showCreateSprint, setShowCreateSprint] = useState(false)

  // New Sprint Form
  const [sprintName, setSprintName] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  // AI Retrospective states
  const [aiReport, setAiReport] = useState('')
  const [loadingReport, setLoadingReport] = useState(false)
  const [showReportModal, setShowReportModal] = useState(false)

  // New feature states
  const [showAiPlanner, setShowAiPlanner] = useState(false)
  const [showStandup, setShowStandup] = useState(false)

  const [focusTime, setFocusTime] = useState('')
  const [isFocusRunning, setIsFocusRunning] = useState(false)

  useEffect(() => {
    const checkFocus = () => {
      try {
        const running = localStorage.getItem('focusTimerRunning') === 'true'
        setIsFocusRunning(running)
        if (running) {
          const target = parseInt(localStorage.getItem('focusTimerTarget') || '0')
          const diff = Math.max(0, Math.round((target - Date.now()) / 1000))
          if (diff > 0) {
            const m = Math.floor(diff / 60).toString().padStart(2, '0')
            const s = (diff % 60).toString().padStart(2, '0')
            setFocusTime(`${m}:${s}`)
          } else {
            setFocusTime('00:00')
          }
        } else {
          setFocusTime('')
        }
      } catch {}
    }
    checkFocus()
    const interval = setInterval(checkFocus, 1000)
    return () => clearInterval(interval)
  }, [])

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  const loadSprints = async () => {
    try {
      setLoading(true)
      const res = await api.get('/sprints')
      setSprints(res.data)
      if (res.data.length > 0) {
        setSelectedSprintId(res.data[0].id)
      }
    } catch (err) {
      console.error('Failed to fetch sprints', err)
    } finally {
      setLoading(false)
    }
  }

  const loadSprintTasks = async () => {
    if (!selectedSprintId) return
    try {
      setLoading(true)
      const res = await api.get(`/tasks/sprint/${selectedSprintId}`)
      setSprintTasks(res.data)
    } catch (err) {
      console.error('Failed to fetch sprint tasks', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadSprints()
  }, [])

  useEffect(() => {
    loadSprintTasks()
  }, [selectedSprintId])

  const handleCreateSprint = async (e) => {
    e.preventDefault()
    if (!sprintName.trim()) return
    try {
      const res = await api.post('/sprints', {
        name: sprintName.trim(),
        startDate,
        endDate,
        status: 'BACKLOG'
      })
      setSprints((prev) => [...prev, res.data])
      setSelectedSprintId(res.data.id)
      setShowCreateSprint(false)
      setSprintName('')
      setStartDate('')
      setEndDate('')
    } catch (err) {
      console.error('Failed to create sprint', err)
    }
  }

  const handleDeleteSprint = async () => {
    if (!selectedSprintId) return
    const sprint = sprints.find(s => s.id === selectedSprintId)
    if (!sprint) return
    if (!window.confirm(`Are you sure you want to delete the sprint "${sprint.name}"? Tasks associated with this sprint will be moved back to the backlog.`)) return

    try {
      await api.delete(`/sprints/${selectedSprintId}`)
      const remaining = sprints.filter(s => s.id !== selectedSprintId)
      setSprints(remaining)
      if (remaining.length > 0) {
        setSelectedSprintId(remaining[0].id)
      } else {
        setSelectedSprintId('')
        setSprintTasks([])
      }
    } catch (err) {
      console.error('Failed to delete sprint', err)
      alert('Failed to delete sprint. Please try again.')
    }
  }

  const handleStartSprint = async () => {
    if (!selectedSprintId) return
    try {
      const res = await api.post(`/sprints/${selectedSprintId}/start`)
      setSprints((prev) => prev.map((s) => (s.id === selectedSprintId ? res.data : s)))
    } catch (err) {
      console.error('Failed to start sprint', err)
    }
  }

  const handleCompleteSprint = async () => {
    if (!selectedSprintId) return
    try {
      const res = await api.post(`/sprints/${selectedSprintId}/complete`)
      setSprints((prev) => prev.map((s) => (s.id === selectedSprintId ? res.data : s)))
    } catch (err) {
      console.error('Failed to complete sprint', err)
    }
  }

  const handleLoadAiRetro = async () => {
    if (!selectedSprintId) return
    try {
      setLoadingReport(true)
      setAiReport('')
      setShowReportModal(true)
      const res = await api.get(`/ai/sprint-summary/${selectedSprintId}`)
      setAiReport(res.data.summary || '')
    } catch (err) {
      console.error('Failed to load AI retrospective summary', err)
      setAiReport('Failed to generate summary. Please check your AI model configuration or api logs.')
    } finally {
      setLoadingReport(false)
    }
  }

  const activeSprint = sprints.find((s) => s.id === selectedSprintId)

  // Calculations
  const totalTasksCount = sprintTasks.length
  const completedTasksCount = sprintTasks.filter((t) => t.status === 'DONE').length
  const completionPercentage = totalTasksCount > 0 
    ? Math.round((completedTasksCount / totalTasksCount) * 100) 
    : 0

  const totalPoints = sprintTasks.reduce((acc, t) => acc + (t.timeEstimate || 0), 0)
  const completedPoints = sprintTasks.filter((t) => t.status === 'DONE').reduce((acc, t) => acc + (t.timeEstimate || 0), 0)
  const remainingPoints = totalPoints - completedPoints

  // Real burndown chart — Ideal burns down linearly, Actual shows real remaining work
  const getBurndownData = () => {
    if (!activeSprint) return []

    const start = new Date(activeSprint.startDate)
    const end = new Date(activeSprint.endDate)
    const today = new Date()

    // Clamp dates
    start.setHours(0, 0, 0, 0)
    end.setHours(0, 0, 0, 0)
    today.setHours(0, 0, 0, 0)

    const msPerDay = 1000 * 60 * 60 * 24
    const diffDays = Math.max(1, Math.ceil((end - start) / msPerDay))
    const daysPassed = Math.min(diffDays, Math.max(0, Math.ceil((today - start) / msPerDay)))

    const dailyIdealBurn = totalPoints / diffDays

    const data = []
    for (let i = 0; i <= diffDays; i++) {
      const ideal = Math.max(0, Math.round(totalPoints - i * dailyIdealBurn))

      const entry = {
        day: `Day ${i}`,
        Ideal: ideal,
      }

      if (i === 0) {
        entry.Actual = totalPoints
      } else if (i <= daysPassed) {
        entry.Actual = Math.max(0, remainingPoints)
      }

      data.push(entry)
    }
    return data
  }

  const burndownData = getBurndownData()

  // Custom Recharts Tooltip
  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900/90 dark:bg-slate-950/95 backdrop-blur-md border border-slate-800 p-3 rounded-xl shadow-xl text-xs font-semibold text-white">
          <p className="mb-1 text-slate-350">{payload[0].payload.day}</p>
          {payload.map((item, idx) => (
            <p key={idx} style={{ color: item.color }} className="capitalize">
              {`${item.name}: ${item.value} hrs`}
            </p>
          ))}
        </div>
      )
    }
    return null
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Sprint Console</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Plan milestones, manage backlogs, and track release velocity.</p>
        </div>

        {/* Selector and Actions */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <select
              value={selectedSprintId}
              onChange={(e) => setSelectedSprintId(e.target.value)}
              className="pl-4 pr-8 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:border-violet-500 appearance-none shadow-sm cursor-pointer"
            >
              {sprints.map((s) => (
                <option key={s.id} value={s.id}>
                  🏃 {s.name} ({s.status.toLowerCase()})
                </option>
              ))}
            </select>
            <div className="absolute right-3 top-4 w-1.5 h-1.5 border-r border-b border-slate-500 transform rotate-45 pointer-events-none" />
          </div>

          {selectedSprintId && (
            <button
              onClick={handleDeleteSprint}
              className="p-2.5 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 border border-slate-200 dark:border-slate-800 rounded-xl transition shadow-sm"
              title="Delete current sprint"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}

          {/* AI Planner */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowAiPlanner(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white text-xs font-bold rounded-xl shadow-md shadow-violet-500/20 hover:from-violet-500 hover:to-indigo-500 transition"
          >
            <Brain className="w-3.5 h-3.5" /> AI Plan
          </motion.button>

          {/* Standup */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => setShowStandup(true)}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-xl shadow-md shadow-emerald-500/20 hover:from-emerald-400 hover:to-teal-400 transition"
          >
            <Mic className="w-3.5 h-3.5" /> Standup
          </motion.button>

          {/* Focus Mode */}
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={() => {
              const focusTask = activeSprint ? { title: `Sprint: ${activeSprint.name}` } : null
              localStorage.setItem('focusTimerTask', focusTask ? JSON.stringify(focusTask) : '')
              window.dispatchEvent(new Event('start-focus'))
            }}
            className="flex items-center gap-1.5 px-3 py-2.5 bg-gradient-to-r from-rose-500 to-pink-600 text-white text-xs font-bold rounded-xl shadow-md shadow-rose-500/20 hover:from-rose-400 hover:to-pink-500 transition"
          >
            <Timer className={`w-3.5 h-3.5 ${isFocusRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
            {focusTime ? `Focusing (${focusTime})` : 'Focus'}
          </motion.button>

          <button
            onClick={() => setShowCreateSprint(true)}
            className="flex items-center gap-2 px-3 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 active:scale-98 transition shadow"
          >
            <Plus className="w-4 h-4" /> New Sprint
          </button>
        </div>
      </div>

      {/* Sprint Health Score */}
      {activeSprint && <SprintHealthScore sprint={activeSprint} sprintTasks={sprintTasks} />}

      {/* Feature Modals */}
      <AnimatePresence>
        {showAiPlanner && (
          <AiSprintPlanner
            sprintId={selectedSprintId}
            sprintName={activeSprint?.name}
            onClose={() => setShowAiPlanner(false)}
          />
        )}
      </AnimatePresence>
      <AnimatePresence>
        {showStandup && <StandupGenerator onClose={() => setShowStandup(false)} />}
      </AnimatePresence>

      {/* Create Sprint Dialog */}
      <AnimatePresence>
        {showCreateSprint && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md"
            >
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base mb-5">Create Sprint</h3>
              <form onSubmit={handleCreateSprint} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">Sprint Name</label>
                  <input
                    type="text"
                    required
                    value={sprintName}
                    onChange={(e) => setSprintName(e.target.value)}
                    placeholder="E.g. Sprint 13"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-250 bg-white dark:bg-slate-850 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">Start Date</label>
                    <input
                      type="date"
                      required
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-850 dark:text-slate-250 bg-white dark:bg-slate-850 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">End Date</label>
                    <input
                      type="date"
                      required
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="w-full px-3 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-850 dark:text-slate-250 bg-white dark:bg-slate-850 focus:outline-none focus:border-violet-500"
                    />
                  </div>
                </div>
                <div className="flex gap-2 justify-end pt-2 select-none">
                  <button
                    type="button"
                    onClick={() => setShowCreateSprint(false)}
                    className="px-4 py-2 text-slate-650 dark:text-slate-350 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition text-sm font-semibold shadow"
                  >
                    Save Sprint
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {loading && sprints.length === 0 ? (
        <div className="flex justify-center items-center py-24">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : sprints.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Sprints Setup</h3>
          <p className="text-slate-500 dark:text-slate-450 text-sm mt-1 mb-6">Create a backlog sprint to begin sizing your workload.</p>
          <button
            onClick={() => setShowCreateSprint(true)}
            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-850 dark:hover:bg-slate-750 transition"
          >
            Create First Sprint
          </button>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Active Sprint Info Banner */}
          {activeSprint && (
            <div className="relative overflow-hidden bg-gradient-to-r from-violet-600 to-indigo-600 text-white p-6 rounded-3xl shadow-lg border border-violet-550/40">
              <div className="absolute top-0 right-0 w-60 h-60 bg-white/5 rounded-full blur-2xl pointer-events-none" />
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
                <div>
                  <h2 className="text-2xl font-black tracking-tight">{activeSprint.name}</h2>
                  <p className="text-violet-100 text-xs font-bold mt-1 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    {activeSprint.startDate} to {activeSprint.endDate} • <span className="uppercase tracking-widest">{activeSprint.status}</span>
                  </p>
                </div>

                {/* Status Change Buttons */}
                <div className="flex gap-2.5 items-center select-none">
                  {activeSprint.status === 'BACKLOG' && (
                    <button
                      onClick={handleStartSprint}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 text-xs font-black rounded-xl hover:bg-slate-50 active:scale-98 transition shadow"
                    >
                      <Play className="w-3.5 h-3.5 fill-slate-950" /> Start Sprint
                    </button>
                  )}
                  {activeSprint.status === 'ACTIVE' && (
                    <button
                      onClick={handleCompleteSprint}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white text-slate-950 text-xs font-black rounded-xl hover:bg-slate-50 active:scale-98 transition shadow"
                    >
                      <CheckCircle2 className="w-4 h-4 text-slate-950" /> Complete Sprint
                    </button>
                  )}
                  {activeSprint.status !== 'BACKLOG' && (
                    <button
                      onClick={handleLoadAiRetro}
                      className="flex items-center gap-2 px-5 py-2.5 bg-white/15 hover:bg-white/25 text-white text-xs font-black rounded-xl active:scale-98 transition shadow border border-white/20 backdrop-blur-sm"
                    >
                      <Sparkles className="w-3.5 h-3.5" /> AI Retro Report
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* BurnDown Chart Card */}
          <div className="glass-panel p-6 rounded-3xl shadow-sm premium-glow-blue relative overflow-hidden">
            <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm mb-6 tracking-wide flex items-center gap-2">
              <div className="w-1.5 h-3 bg-blue-500 rounded-full" /> Sprint Burndown Trend
            </h3>
            <div className="h-80 w-full">
              {sprintTasks.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 dark:text-slate-500 text-xs">
                  Add tasks with estimated hours to plot the burndown.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={burndownData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(226, 232, 240, 0.08)" />
                    <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 10, fill: '#64748b', fontWeight: 'bold' }} axisLine={false} tickLine={false} label={{ value: 'Hours Remaining', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#64748b', fontWeight: 'bold' } }} />
                    <Tooltip content={<CustomTooltip />} />
                    <Legend formatter={(value) => <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase tracking-wider">{value}</span>} />
                    <Line type="monotone" dataKey="Ideal" stroke="#38bdf8" strokeWidth={2.5} activeDot={{ r: 5 }} />
                    <Line type="monotone" dataKey="Actual" stroke="#8b5cf6" strokeWidth={3} connectNulls={false} dot={false} activeDot={{ r: 5 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Grid: Tasks and Stats */}
          <div className="grid lg:grid-cols-3 gap-8">
            {/* Task Backlog */}
            <div className="lg:col-span-2 glass-panel p-6 rounded-3xl shadow-sm flex flex-col h-[26rem] relative overflow-hidden premium-glow-violet">
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm mb-6 tracking-wide flex items-center gap-2">
                <div className="w-1.5 h-3 bg-violet-500 rounded-full" /> Sprint Backlog ({sprintTasks.length} tasks)
              </h3>
              <div className="flex-1 overflow-y-auto space-y-3.5 pr-1">
                {sprintTasks.length === 0 ? (
                  <div className="text-center text-slate-400 dark:text-slate-500 text-xs py-20">
                    No tasks assigned to this sprint.
                  </div>
                ) : (
                  sprintTasks.map((t) => (
                    <div
                      key={t.id}
                      className="p-3.5 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-850/40 rounded-2xl hover:bg-slate-100/50 dark:hover:bg-slate-850/30 transition duration-200 flex justify-between items-center"
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate">{t.title}</p>
                        <p className="text-[9px] font-bold text-slate-450 dark:text-slate-500 mt-1 uppercase tracking-wider">{t.type} &bull; {t.status.replace('_', ' ').toLowerCase()}</p>
                      </div>
                      <span className="px-2.5 py-1 bg-slate-200/50 dark:bg-slate-800/70 text-slate-700 dark:text-slate-350 font-mono text-[10px] font-bold rounded-lg border border-slate-300/20">
                        {t.timeEstimate || 0} pts
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Sprint Summary */}
            <div className="glass-panel p-6 rounded-3xl shadow-sm flex flex-col h-[26rem] relative overflow-hidden premium-glow-emerald">
              <h3 className="font-bold text-slate-850 dark:text-slate-100 text-sm mb-6 tracking-wide flex items-center gap-2">
                <Info className="w-4.5 h-4.5 text-emerald-500" /> Sprint Summary
              </h3>

              <div className="flex-1 space-y-6">
                {/* Stats */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-850/40 rounded-2xl">
                    <p className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Remaining Hours</p>
                    <p className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-1">{remainingPoints}h</p>
                  </div>
                  <div className="p-4 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100/50 dark:border-slate-850/40 rounded-2xl">
                    <p className="text-[10px] font-extrabold text-slate-450 dark:text-slate-500 uppercase tracking-widest">Done Tasks</p>
                    <p className="text-2xl font-black text-slate-850 dark:text-slate-100 mt-1">{completedTasksCount}</p>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>Sprint Completion</span>
                    <span>{completionPercentage}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/20">
                    <div
                      className="bg-gradient-to-r from-emerald-400 to-teal-500 h-full transition-all duration-300"
                      style={{ width: `${completionPercentage}%` }}
                    ></div>
                  </div>
                </div>

                {/* Sizing */}
                <div className="space-y-2">
                  <div className="flex justify-between items-baseline text-xs font-bold text-slate-700 dark:text-slate-350">
                    <span>Estimated Sizing</span>
                    <span>{totalPoints > 0 ? Math.round((completedPoints / totalPoints) * 100) : 0}%</span>
                  </div>
                  <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden border border-slate-200/20">
                    <div
                      className="bg-gradient-to-r from-violet-400 to-indigo-500 h-full transition-all duration-300"
                      style={{ width: `${totalPoints > 0 ? (completedPoints / totalPoints) * 100 : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
                    Completed: <span className="text-slate-650 dark:text-slate-350">{completedPoints}h</span> out of{' '}
                    <span className="text-slate-650 dark:text-slate-350">{totalPoints}h</span> total points.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Retrospective Report Modal */}
      <AnimatePresence>
        {showReportModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-slate-950/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col"
            >
              <div className="flex justify-between items-center pb-4 border-b border-slate-200 dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-violet-500 animate-pulse" />
                  <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-lg">AI Sprint Retrospective Report</h3>
                </div>
                <button
                  onClick={() => setShowReportModal(false)}
                  className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-250 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-6 space-y-4 text-slate-700 dark:text-slate-300 text-sm leading-relaxed">
                {loadingReport ? (
                  <div className="flex flex-col justify-center items-center py-20 gap-3 select-none">
                    <Loader className="w-8 h-8 text-violet-500 animate-spin" />
                    <p className="text-slate-450 font-bold text-xs">Analyzing sprint data & generating report...</p>
                  </div>
                ) : (
                  <div className="prose prose-slate dark:prose-invert max-w-none">
                    {aiReport.split('\n').map((line, idx) => {
                      if (line.startsWith('###')) {
                        return <h4 key={idx} className="font-black text-slate-800 dark:text-slate-150 text-base mt-4 mb-2">{line.replace('###', '').trim()}</h4>
                      } else if (line.startsWith('**') && line.endsWith('**')) {
                        return <p key={idx} className="font-bold text-slate-800 dark:text-slate-200 mt-3">{line.replace(/\*\*/g, '').trim()}</p>
                      } else if (line.startsWith('*') || line.startsWith('-')) {
                        return <li key={idx} className="ml-4 list-disc text-slate-600 dark:text-slate-350 my-1">{line.substring(1).trim()}</li>
                      } else if (line.match(/^\d+\./)) {
                        return <li key={idx} className="ml-4 list-decimal text-slate-650 dark:text-slate-350 my-1">{line.replace(/^\d+\./, '').trim()}</li>
                      } else if (line.trim() === '') {
                        return <div key={idx} className="h-2" />
                      } else {
                        const parts = line.split('**');
                        if (parts.length > 1) {
                          return (
                            <p key={idx} className="text-slate-650 dark:text-slate-350 my-2">
                              {parts.map((part, pIdx) => pIdx % 2 === 1 ? <strong key={pIdx} className="font-bold text-slate-800 dark:text-slate-200">{part}</strong> : part)}
                            </p>
                          )
                        }
                        return <p key={idx} className="text-slate-650 dark:text-slate-350 my-2">{line}</p>
                      }
                    })}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-4 border-t border-slate-200 dark:border-slate-800 select-none">
                <button
                  onClick={() => setShowReportModal(false)}
                  className="px-5 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 active:scale-98 transition text-sm font-semibold shadow-md"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SprintBoard
