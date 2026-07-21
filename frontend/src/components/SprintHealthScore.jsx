import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Activity, AlertTriangle, CheckCircle2, TrendingDown, Clock, X, Info, ChevronDown } from 'lucide-react'

// Circular gauge
const HealthGauge = ({ score, size = 120 }) => {
  const strokeWidth = 10
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  // Gauge is a 270° arc (from 135deg to 405deg)
  const gaugeFraction = 0.75
  const gaugeCirc = circ * gaugeFraction
  const offset = gaugeCirc - (score / 100) * gaugeCirc

  const color = score >= 70 ? '#10b981' : score >= 45 ? '#f59e0b' : '#ef4444'
  const label = score >= 70 ? 'Healthy' : score >= 45 ? 'At Risk' : 'Critical'

  return (
    <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="absolute inset-0" style={{ transform: 'rotate(135deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(0,0,0,0.08)" strokeWidth={strokeWidth}
          strokeDasharray={`${gaugeCirc} ${circ}`} strokeLinecap="round" />
        <motion.circle
          cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={strokeWidth}
          strokeDasharray={`${gaugeCirc} ${circ}`}
          initial={{ strokeDashoffset: gaugeCirc }}
          animate={{ strokeDashoffset: offset }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          strokeLinecap="round"
          style={{ filter: `drop-shadow(0 0 6px ${color}80)` }}
        />
      </svg>
      <div className="text-center z-10">
        <div className="text-2xl font-black" style={{ color }}>{score}</div>
        <div className="text-[9px] font-black uppercase tracking-wider" style={{ color }}>{label}</div>
      </div>
    </div>
  )
}

const SprintHealthScore = ({ sprintTasks = [], sprint = null, className = '' }) => {
  const [expanded, setExpanded] = useState(false)

  if (!sprint && sprintTasks.length === 0) return null

  const total = sprintTasks.length
  const done = sprintTasks.filter(t => t.status === 'DONE').length
  const inProgress = sprintTasks.filter(t => t.status === 'IN_PROGRESS' || t.status === 'IN PROGRESS').length
  const inReview = sprintTasks.filter(t => t.status === 'IN_REVIEW' || t.status === 'IN REVIEW').length
  const toDo = sprintTasks.filter(t => t.status === 'TO_DO' || t.status === 'TO DO').length

  // Calculate overdue tasks (tasks past sprint end date)
  const now = new Date()
  const sprintEnd = sprint?.endDate ? new Date(sprint.endDate) : null
  const isOverdue = sprintEnd && now > sprintEnd && sprint?.status !== 'COMPLETED'
  const daysLeft = sprintEnd ? Math.max(0, Math.ceil((sprintEnd - now) / (1000 * 60 * 60 * 24))) : null
  const totalDays = sprint?.startDate && sprint?.endDate
    ? Math.ceil((new Date(sprint.endDate) - new Date(sprint.startDate)) / (1000 * 60 * 60 * 24))
    : null

  // Health score formula (0-100)
  const completionRate = total > 0 ? done / total : 0
  const burndownScore = (() => {
    if (!totalDays || !daysLeft) return 50
    const elapsed = totalDays - daysLeft
    const expectedDone = total > 0 ? (elapsed / totalDays) * total : 0
    const actualDone = done
    if (expectedDone === 0) return 80
    return Math.min(100, Math.round((actualDone / expectedDone) * 80))
  })()

  const riskPenalty = isOverdue ? 25 : 0
  const blockedPenalty = toDo > 0 && total > 0 ? Math.round((toDo / total) * 20) : 0

  const score = Math.max(0, Math.min(100, Math.round(
    completionRate * 40 + burndownScore * 0.4 + (inProgress + inReview > 0 ? 15 : 0) - riskPenalty - blockedPenalty
  )))

  const factors = [
    {
      label: 'Completion rate',
      value: total > 0 ? `${Math.round(completionRate * 100)}%` : '0%',
      status: completionRate >= 0.5 ? 'good' : completionRate >= 0.25 ? 'warn' : 'bad',
      detail: `${done} of ${total} tasks done`
    },
    {
      label: 'Burndown pace',
      value: burndownScore >= 70 ? 'On Track' : burndownScore >= 40 ? 'Slow' : 'Behind',
      status: burndownScore >= 70 ? 'good' : burndownScore >= 40 ? 'warn' : 'bad',
      detail: daysLeft != null ? `${daysLeft} days left in sprint` : 'No end date set'
    },
    {
      label: 'Active work',
      value: `${inProgress + inReview} tasks`,
      status: inProgress + inReview > 0 ? 'good' : 'warn',
      detail: `${inProgress} in progress, ${inReview} in review`
    },
    {
      label: 'Sprint overdue',
      value: isOverdue ? 'Overdue' : daysLeft != null ? `${daysLeft}d left` : 'OK',
      status: isOverdue ? 'bad' : daysLeft != null && daysLeft <= 2 ? 'warn' : 'good',
      detail: isOverdue ? 'Sprint has passed its end date' : 'Timeline is fine'
    },
  ]

  const STATUS_ICONS = {
    good: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    warn: <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />,
    bad: <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />,
  }

  const scoreColor = score >= 70 ? 'text-emerald-500' : score >= 45 ? 'text-amber-500' : 'text-rose-500'
  const scoreBg = score >= 70 ? 'from-emerald-500/10 to-teal-500/5 border-emerald-500/20' : score >= 45 ? 'from-amber-500/10 to-orange-500/5 border-amber-500/20' : 'from-rose-500/10 to-red-500/5 border-rose-500/20'

  return (
    <div className={`glass-panel rounded-2xl overflow-hidden ${className}`}>
      <button
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition"
      >
        <div className={`flex items-center gap-3 p-2.5 rounded-xl bg-gradient-to-r ${scoreBg} border flex-1`}>
          <Activity className={`w-4 h-4 flex-shrink-0 ${scoreColor}`} />
          <div className="flex-1 text-left">
            <p className="text-xs font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">Sprint Health</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className={`text-2xl font-black ${scoreColor}`}>{score}</span>
              <span className="text-xs text-slate-400 dark:text-slate-500">/100 —
                <span className={`font-bold ml-1 ${scoreColor}`}>
                  {score >= 70 ? 'Healthy 🟢' : score >= 45 ? 'At Risk 🟡' : 'Critical 🔴'}
                </span>
              </span>
            </div>
          </div>
          <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-4 space-y-3">
              {/* Gauge */}
              <div className="flex items-center justify-center py-2">
                <HealthGauge score={score} size={100} />
              </div>

              {/* Factor breakdown */}
              <div className="space-y-2">
                {factors.map((f, i) => (
                  <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50/60 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/60">
                    <div className="flex items-center gap-2">
                      {STATUS_ICONS[f.status]}
                      <div>
                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{f.label}</p>
                        <p className="text-[10px] text-slate-400 dark:text-slate-500">{f.detail}</p>
                      </div>
                    </div>
                    <span className={`text-xs font-black ${
                      f.status === 'good' ? 'text-emerald-500' : f.status === 'warn' ? 'text-amber-500' : 'text-rose-500'
                    }`}>{f.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SprintHealthScore
