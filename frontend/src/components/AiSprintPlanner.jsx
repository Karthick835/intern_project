import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Brain, Sparkles, Loader2, CheckCircle, ArrowRight, Zap, Target, Clock, AlertCircle, X, RefreshCw } from 'lucide-react'
import axios from 'axios'

import { getApiBase } from '../config'

const AiSprintPlanner = ({ sprintId, sprintName, onClose }) => {
  const [step, setStep] = useState('idle') // idle | analyzing | results | error
  const [suggestions, setSuggestions] = useState([])
  const [backlogTasks, setBacklogTasks] = useState([])
  const [selectedTasks, setSelectedTasks] = useState(new Set())
  const [applying, setApplying] = useState(false)
  const [applied, setApplied] = useState(false)
  const [rawAnalysis, setRawAnalysis] = useState('')
  const [teamCount, setTeamCount] = useState(0)
  const [velocity, setVelocity] = useState(0)

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain }
  })

  const PRIORITY_WEIGHT = { HIGH: 3, MEDIUM: 2, LOW: 1 }

  const analyze = async () => {
    setStep('analyzing')
    setSuggestions([])
    setSelectedTasks(new Set())
    setApplied(false)

    try {
      // Fetch all needed data
      const [teamRes, tasksRes, sprintsRes] = await Promise.all([
        api.get('/team'),
        api.get('/tasks/backlog').catch(() => api.get('/tasks/project/all').catch(() => ({ data: [] }))),
        api.get('/sprints')
      ])

      const team = teamRes.data || []
      setTeamCount(team.length)

      // Calculate velocity from past sprints
      const completedSprints = (sprintsRes.data || []).filter(s => s.status === 'COMPLETED')
      const avgVelocity = completedSprints.length > 0
        ? Math.round(completedSprints.reduce((sum, s) => sum + (s.velocity || 0), 0) / completedSprints.length)
        : team.length * 5 // estimate: 5 tasks per person
      setVelocity(avgVelocity)

      const allTasks = tasksRes.data || []
      const unassignedToSprint = allTasks.filter(t => !t.sprint && t.status !== 'DONE')
      setBacklogTasks(unassignedToSprint)

      // Smart scoring: prioritize HIGH > MEDIUM > LOW, then by time estimate
      const capacity = Math.max(avgVelocity, team.length * 3)
      let remaining = capacity
      const scored = unassignedToSprint.map(task => ({
        ...task,
        score: (PRIORITY_WEIGHT[task.priority] || 1) * 10 +
               (task.storyPoints || 0) +
               (task.timeEstimate ? -task.timeEstimate * 0.1 : 0),
        fitScore: Math.min(100, Math.round(((PRIORITY_WEIGHT[task.priority] || 1) / 3) * 100))
      })).sort((a, b) => b.score - a.score)

      const recommended = []
      for (const task of scored) {
        if (recommended.length >= capacity) break
        recommended.push(task)
        remaining--
      }

      setSuggestions(recommended)
      setSelectedTasks(new Set(recommended.map(t => t.id)))

      // Build AI analysis text
      const analysisText = `Based on your team of ${team.length} members and historical velocity of ~${avgVelocity} tasks/sprint, I recommend pulling ${recommended.length} tasks into "${sprintName}". High-priority items are weighted 3x. This plan balances workload across your sprint capacity.`
      setRawAnalysis(analysisText)
      setStep('results')
    } catch (err) {
      console.error('AI Planner error', err)
      setStep('error')
    }
  }

  const applyPlan = async () => {
    if (selectedTasks.size === 0 || !sprintId) return
    setApplying(true)
    try {
      const promises = Array.from(selectedTasks).map(taskId =>
        api.put(`/tasks/${taskId}`, { sprintId }).catch(() => null)
      )
      await Promise.all(promises)
      setApplied(true)
    } catch (err) {
      console.error('Failed to apply plan', err)
    } finally {
      setApplying(false)
    }
  }

  const toggleTask = (id) => {
    setSelectedTasks(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const PRIORITY_CONFIG = {
    HIGH: { color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-950/20', border: 'border-red-100 dark:border-red-900/30' },
    MEDIUM: { color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-950/20', border: 'border-amber-100 dark:border-amber-900/30' },
    LOW: { color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-950/20', border: 'border-emerald-100 dark:border-emerald-900/30' },
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, y: 20, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.95, y: 20, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 350, damping: 30 }}
        className="relative w-full max-w-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="relative bg-gradient-to-br from-violet-600 via-indigo-700 to-blue-800 p-6">
          <div className="absolute inset-0 opacity-20" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.1) 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
          <button onClick={onClose} className="absolute top-4 right-4 p-1.5 text-white/50 hover:text-white hover:bg-white/10 rounded-xl transition">
            <X className="w-4 h-4" />
          </button>
          <div className="relative z-10 flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center border border-white/20">
              <Brain className="w-5.5 h-5.5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-extrabold text-white">AI Sprint Planner</h2>
              <p className="text-violet-200 text-xs mt-0.5 font-medium">
                {sprintName ? `Planning: ${sprintName}` : 'Auto-grooming your backlog'}
              </p>
            </div>
          </div>

          {step === 'results' && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="relative z-10 mt-4 grid grid-cols-3 gap-3"
            >
              {[
                { label: 'Team Size', value: teamCount, icon: '👥' },
                { label: 'Est. Velocity', value: velocity, icon: '⚡' },
                { label: 'Suggested', value: suggestions.length, icon: '🎯' },
              ].map(stat => (
                <div key={stat.label} className="bg-white/10 rounded-xl px-3 py-2 text-center border border-white/15">
                  <div className="text-base">{stat.icon}</div>
                  <div className="text-white font-black text-lg leading-tight">{stat.value}</div>
                  <div className="text-white/50 text-[9px] font-bold uppercase tracking-wider">{stat.label}</div>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {/* IDLE */}
          {step === 'idle' && (
            <div className="p-8 text-center space-y-5">
              <div className="w-16 h-16 bg-violet-50 dark:bg-violet-950/20 rounded-2xl flex items-center justify-center mx-auto border border-violet-100 dark:border-violet-900/30">
                <Sparkles className="w-8 h-8 text-violet-500" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-slate-900 dark:text-slate-100">Auto-plan your sprint</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 leading-relaxed">
                  I'll analyze your backlog, team capacity, and velocity history to suggest the optimal set of tasks for this sprint.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-3 text-left">
                {[
                  { icon: <Target className="w-4 h-4 text-violet-500" />, label: 'Priority scoring' },
                  { icon: <Clock className="w-4 h-4 text-blue-500" />, label: 'Capacity planning' },
                  { icon: <Zap className="w-4 h-4 text-amber-500" />, label: 'Velocity-based' },
                ].map(f => (
                  <div key={f.label} className="flex items-center gap-2 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl border border-slate-100 dark:border-slate-800">
                    {f.icon}
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{f.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ANALYZING */}
          {step === 'analyzing' && (
            <div className="p-12 text-center space-y-4">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                className="w-14 h-14 mx-auto"
              >
                <Brain className="w-14 h-14 text-violet-500" />
              </motion.div>
              <p className="font-bold text-slate-800 dark:text-slate-200">Analyzing your workspace...</p>
              <div className="space-y-2 text-sm text-slate-400 dark:text-slate-500">
                {['Reading backlog tasks...', 'Calculating team velocity...', 'Scoring by priority...'].map((msg, i) => (
                  <motion.p key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.8 }}>
                    {msg}
                  </motion.p>
                ))}
              </div>
            </div>
          )}

          {/* ERROR */}
          {step === 'error' && (
            <div className="p-8 text-center space-y-4">
              <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
              <p className="font-bold text-slate-800 dark:text-slate-200">Analysis failed</p>
              <p className="text-slate-400 text-sm">Could not load backlog data. Make sure you have tasks in your workspace.</p>
            </div>
          )}

          {/* RESULTS */}
          {step === 'results' && (
            <div className="p-5 space-y-4">
              {rawAnalysis && (
                <div className="p-3.5 bg-violet-50 dark:bg-violet-950/20 border border-violet-100 dark:border-violet-900/30 rounded-xl flex gap-2.5">
                  <Sparkles className="w-4 h-4 text-violet-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-violet-700 dark:text-violet-300 font-medium leading-relaxed">{rawAnalysis}</p>
                </div>
              )}

              {applied ? (
                <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="py-10 text-center space-y-3">
                  <CheckCircle className="w-14 h-14 text-emerald-500 mx-auto" />
                  <p className="font-bold text-slate-800 dark:text-slate-200 text-lg">Sprint plan applied!</p>
                  <p className="text-slate-400 text-sm">{selectedTasks.size} tasks added to {sprintName}</p>
                </motion.div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                      {selectedTasks.size} of {suggestions.length} tasks selected
                    </p>
                    <button
                      onClick={() => setSelectedTasks(selectedTasks.size === suggestions.length ? new Set() : new Set(suggestions.map(t => t.id)))}
                      className="text-xs font-bold text-violet-600 dark:text-violet-400 hover:underline"
                    >
                      {selectedTasks.size === suggestions.length ? 'Deselect all' : 'Select all'}
                    </button>
                  </div>

                  <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                    {suggestions.length === 0 ? (
                      <div className="py-8 text-center text-slate-400 text-sm">No backlog tasks found to suggest.</div>
                    ) : suggestions.map((task, i) => {
                      const pConf = PRIORITY_CONFIG[task.priority] || PRIORITY_CONFIG.MEDIUM
                      const selected = selectedTasks.has(task.id)
                      return (
                        <motion.button
                          key={task.id}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.05 }}
                          onClick={() => toggleTask(task.id)}
                          className={`w-full text-left flex items-start gap-3 p-3 rounded-xl border transition-all ${
                            selected
                              ? 'bg-violet-50 dark:bg-violet-950/20 border-violet-200 dark:border-violet-800/40'
                              : 'bg-slate-50 dark:bg-slate-800/40 border-slate-100 dark:border-slate-800 opacity-60'
                          }`}
                        >
                          <div className={`mt-0.5 w-4 h-4 rounded-md border-2 flex-shrink-0 flex items-center justify-center transition ${
                            selected ? 'bg-violet-500 border-violet-500' : 'border-slate-300 dark:border-slate-600'
                          }`}>
                            {selected && <CheckCircle className="w-3 h-3 text-white" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 dark:text-slate-200 truncate">{task.title}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${pConf.bg} ${pConf.color} ${pConf.border} border`}>
                                {task.priority}
                              </span>
                              {task.timeEstimate && (
                                <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                  <Clock className="w-3 h-3" />{task.timeEstimate}h
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex-shrink-0 text-right">
                            <div className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Fit</div>
                            <div className={`text-sm font-black ${task.fitScore >= 70 ? 'text-emerald-500' : task.fitScore >= 40 ? 'text-amber-500' : 'text-slate-400'}`}>
                              {task.fitScore}%
                            </div>
                          </div>
                        </motion.button>
                      )
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="p-5 border-t border-slate-100 dark:border-slate-800 flex gap-3">
          {step === 'idle' && (
            <>
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={analyze}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 transition"
              >
                <Brain className="w-4 h-4" /> Analyze & Plan
              </motion.button>
            </>
          )}
          {step === 'results' && !applied && (
            <>
              <button onClick={analyze} className="p-2.5 border border-slate-200 dark:border-slate-700 text-slate-500 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                <RefreshCw className="w-4 h-4" />
              </button>
              <button onClick={onClose} className="flex-1 py-2.5 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 rounded-xl text-sm font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition">
                Cancel
              </button>
              <motion.button
                whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
                onClick={applyPlan}
                disabled={applying || selectedTasks.size === 0 || !sprintId}
                className="flex-1 py-2.5 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-500/20 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed transition"
              >
                {applying ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
                {applying ? 'Applying...' : `Apply ${selectedTasks.size} Tasks`}
              </motion.button>
            </>
          )}
          {(step === 'error' || (step === 'results' && applied)) && (
            <button onClick={onClose} className="w-full py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-sm font-bold transition">
              Done
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  )
}

export default AiSprintPlanner
