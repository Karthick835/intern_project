import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Timer, X, Play, Pause, RotateCcw, CheckCircle, Coffee, Flame, Zap, Target, Volume2, VolumeX } from 'lucide-react'

const SESSIONS = {
  focus: { label: 'Focus', duration: 25 * 60, color: '#8b5cf6', glow: 'rgba(139,92,246,0.3)' },
  shortBreak: { label: 'Short Break', duration: 5 * 60, color: '#10b981', glow: 'rgba(16,185,129,0.3)' },
  longBreak: { label: 'Long Break', duration: 15 * 60, color: '#0ea5e9', glow: 'rgba(14,165,233,0.3)' },
}

// Circular SVG timer ring
const TimerRing = ({ progress, color, size = 240 }) => {
  const strokeWidth = 8
  const r = (size - strokeWidth * 2) / 2
  const circ = 2 * Math.PI * r
  return (
    <svg width={size} height={size} className="absolute inset-0 -rotate-90">
      {/* Track */}
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth={strokeWidth} />
      {/* Progress */}
      <motion.circle
        cx={size / 2} cy={size / 2} r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - progress)}
        strokeLinecap="round"
        transition={{ duration: 1, ease: 'linear' }}
        style={{ filter: `drop-shadow(0 0 8px ${color})` }}
      />
    </svg>
  )
}

const FocusMode = ({ task: initialTask, onClose, onTimeLogged }) => {
  const [task, setTask] = useState(() => {
    if (initialTask) return initialTask
    try {
      const saved = localStorage.getItem('focusTimerTask')
      return saved ? JSON.parse(saved) : null
    } catch {
      return null
    }
  })

  const [sessionType, setSessionType] = useState(() => {
    try {
      return localStorage.getItem('focusTimerType') || 'focus'
    } catch {
      return 'focus'
    }
  })

  const [timeLeft, setTimeLeft] = useState(() => {
    try {
      const running = localStorage.getItem('focusTimerRunning') === 'true'
      const sessionT = localStorage.getItem('focusTimerType') || 'focus'
      const duration = SESSIONS[sessionT]?.duration || SESSIONS.focus.duration
      
      if (running) {
        const target = parseInt(localStorage.getItem('focusTimerTarget') || '0')
        const diff = Math.max(0, Math.round((target - Date.now()) / 1000))
        return diff
      } else {
        const savedTime = localStorage.getItem('focusTimerTimeLeft')
        return savedTime !== null ? parseInt(savedTime) : duration
      }
    } catch {}
    return SESSIONS.focus.duration
  })

  const [isRunning, setIsRunning] = useState(() => {
    try {
      const running = localStorage.getItem('focusTimerRunning') === 'true'
      if (running) {
        const target = parseInt(localStorage.getItem('focusTimerTarget') || '0')
        const diff = Math.max(0, Math.round((target - Date.now()) / 1000))
        return diff > 0
      }
    } catch {}
    return false
  })

  const [completedPomodoros, setCompletedPomodoros] = useState(() => {
    try { return parseInt(localStorage.getItem('pomodoroStreak') || '0') } catch { return 0 }
  })
  const [totalFocusTime, setTotalFocusTime] = useState(0) // seconds in this session
  const [sessionComplete, setSessionComplete] = useState(false)
  const [muted, setMuted] = useState(false)
  const intervalRef = useRef(null)
  const audioCtxRef = useRef(null)

  const session = SESSIONS[sessionType]
  const progress = timeLeft / session.duration

  const playBeep = useCallback((freq = 880, duration = 0.3) => {
    if (muted) return
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)()
      const ctx = audioCtxRef.current
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = freq
      osc.type = 'sine'
      gain.gain.setValueAtTime(0.3, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
      osc.start()
      osc.stop(ctx.currentTime + duration)
    } catch (e) {}
  }, [muted])

  const playCompleteSound = useCallback(() => {
    [660, 880, 1100].forEach((freq, i) => setTimeout(() => playBeep(freq, 0.4), i * 200))
  }, [playBeep])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0')
    const s = (secs % 60).toString().padStart(2, '0')
    return `${m}:${s}`
  }

  // Load/save timer state to localStorage to persist when navigating away
  useEffect(() => {
    try {
      localStorage.setItem('focusTimerType', sessionType)
      localStorage.setItem('focusTimerRunning', isRunning ? 'true' : 'false')
      if (isRunning) {
        // Only set target if it is not already set, to prevent drift in interval
        if (!localStorage.getItem('focusTimerTarget')) {
          const target = Date.now() + timeLeft * 1000
          localStorage.setItem('focusTimerTarget', target.toString())
        }
      } else {
        localStorage.setItem('focusTimerTimeLeft', timeLeft.toString())
        localStorage.removeItem('focusTimerTarget')
      }
      if (task) {
        localStorage.setItem('focusTimerTask', JSON.stringify(task))
      } else {
        localStorage.removeItem('focusTimerTask')
      }
    } catch {}
  }, [timeLeft, isRunning, sessionType, task])

  // Sync timeLeft dynamically if target is present (re-calculates if tab is focused or backgrounded)
  useEffect(() => {
    if (!isRunning) return
    const interval = setInterval(() => {
      try {
        const target = parseInt(localStorage.getItem('focusTimerTarget') || '0')
        if (target > 0) {
          const diff = Math.max(0, Math.round((target - Date.now()) / 1000))
          setTimeLeft(diff)
          if (diff <= 0) {
            clearInterval(interval)
            setIsRunning(false)
            setSessionComplete(true)
            playCompleteSound()
            if (sessionType === 'focus') {
              const newCount = completedPomodoros + 1
              setCompletedPomodoros(newCount)
              setTotalFocusTime(t => t + SESSIONS.focus.duration)
              try { localStorage.setItem('pomodoroStreak', newCount.toString()) } catch {}
              onTimeLogged && onTimeLogged(Math.round(SESSIONS.focus.duration / 60))
            }
          } else {
            if (sessionType === 'focus') setTotalFocusTime(t => t + 1)
            if (diff === 60) playBeep(440, 0.2) // 1 minute warning
          }
        }
      } catch {}
    }, 1000)
    return () => clearInterval(interval)
  }, [isRunning, sessionType, playBeep, playCompleteSound, completedPomodoros, onTimeLogged])

  // If the timer finished while the user was away, mark it complete on mount
  useEffect(() => {
    try {
      const running = localStorage.getItem('focusTimerRunning') === 'true'
      if (running) {
        const target = parseInt(localStorage.getItem('focusTimerTarget') || '0')
        const diff = Math.max(0, Math.round((target - Date.now()) / 1000))
        if (diff === 0 && !sessionComplete) {
          setIsRunning(false)
          setSessionComplete(true)
          playCompleteSound()
          if (sessionType === 'focus') {
            const newCount = completedPomodoros + 1
            setCompletedPomodoros(newCount)
            try { localStorage.setItem('pomodoroStreak', newCount.toString()) } catch {}
            onTimeLogged && onTimeLogged(Math.round(SESSIONS.focus.duration / 60))
          }
          localStorage.setItem('focusTimerRunning', 'false')
          localStorage.setItem('focusTimerTimeLeft', '0')
          localStorage.removeItem('focusTimerTarget')
        }
      }
    } catch {}
  }, [])

  const switchSession = (type) => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setSessionType(type)
    setTimeLeft(SESSIONS[type].duration)
    setSessionComplete(false)
  }

  const toggle = () => {
    if (sessionComplete) {
      setSessionComplete(false)
      setTimeLeft(session.duration)
      return
    }
    if (!isRunning) playBeep(660, 0.15)
    setIsRunning(r => !r)
  }

  const reset = () => {
    clearInterval(intervalRef.current)
    setIsRunning(false)
    setTimeLeft(session.duration)
    setSessionComplete(false)
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{ background: 'radial-gradient(ellipse at center, #0f0a1e 0%, #060810 100%)' }}
    >
      {/* Animated background glow that pulses with timer */}
      <motion.div
        className="absolute inset-0 pointer-events-none"
        animate={{ opacity: isRunning ? [0.4, 0.7, 0.4] : 0.3 }}
        transition={{ duration: 4, repeat: Infinity, ease: 'easeInOut' }}
        style={{ background: `radial-gradient(ellipse 60% 40% at 50% 50%, ${session.glow}, transparent)` }}
      />

      {/* Close + Mute */}
      <div className="absolute top-6 right-6 flex items-center gap-3">
        <button onClick={() => setMuted(m => !m)} className="p-2.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition">
          {muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
        </button>
        <button onClick={onClose} className="p-2.5 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-xl transition">
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Streak counter top-left */}
      <div className="absolute top-6 left-6 flex items-center gap-2">
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/5 rounded-full border border-white/10">
          <Flame className="w-4 h-4 text-amber-400" />
          <span className="text-white/70 text-sm font-bold">{completedPomodoros} sessions today</span>
        </div>
      </div>

      <div className="flex flex-col items-center gap-10">
        {/* Session type tabs */}
        <div className="flex items-center gap-1 bg-white/5 rounded-2xl p-1 border border-white/10">
          {Object.entries(SESSIONS).map(([key, s]) => (
            <button
              key={key}
              onClick={() => switchSession(key)}
              className={`px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${
                sessionType === key ? 'bg-white/15 text-white shadow-sm' : 'text-white/40 hover:text-white/70'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        {/* Task label */}
        {task && (
          <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10 max-w-xs">
            <Target className="w-4 h-4 flex-shrink-0" style={{ color: session.color }} />
            <span className="text-white/70 text-sm font-medium truncate">{task.title || task}</span>
          </div>
        )}

        {/* Main timer circle */}
        <div className="relative flex items-center justify-center" style={{ width: 240, height: 240 }}>
          <TimerRing progress={progress} color={session.color} size={240} />

          <div className="relative z-10 text-center">
            <AnimatePresence mode="wait">
              {sessionComplete ? (
                <motion.div
                  key="complete"
                  initial={{ scale: 0.5, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  exit={{ scale: 0.5, opacity: 0 }}
                  className="flex flex-col items-center gap-2"
                >
                  <CheckCircle className="w-14 h-14" style={{ color: session.color }} />
                  <span className="text-white font-bold text-lg">
                    {sessionType === 'focus' ? 'Focus done!' : 'Break over!'}
                  </span>
                </motion.div>
              ) : (
                <motion.div key="timer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
                  <div
                    className="text-6xl font-black text-white tracking-tight tabular-nums"
                    style={{ textShadow: `0 0 40px ${session.color}60` }}
                  >
                    {formatTime(timeLeft)}
                  </div>
                  <div className="text-white/40 text-sm font-medium mt-2 uppercase tracking-widest">
                    {session.label}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-4">
          <button onClick={reset} className="p-3 text-white/40 hover:text-white/70 hover:bg-white/5 rounded-2xl transition border border-white/10">
            <RotateCcw className="w-5 h-5" />
          </button>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={toggle}
            className="flex items-center gap-3 px-8 py-4 rounded-2xl font-bold text-white text-lg shadow-2xl transition-all duration-200"
            style={{
              background: `linear-gradient(135deg, ${session.color}, ${session.color}cc)`,
              boxShadow: `0 0 40px ${session.glow}, 0 8px 32px rgba(0,0,0,0.4)`
            }}
          >
            {isRunning ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6" />}
            {isRunning ? 'Pause' : sessionComplete ? 'Restart' : 'Start'}
          </motion.button>

          <div className="p-3 text-white/40 rounded-2xl border border-white/10 flex flex-col items-center">
            <Coffee className="w-5 h-5" />
          </div>
        </div>

        {/* Total focus time this session */}
        {totalFocusTime > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-full border border-white/10"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span className="text-white/60 text-sm font-medium">
              {Math.round(totalFocusTime / 60)}m focused this session
            </span>
          </motion.div>
        )}

        {/* Pomodoro dots */}
        <div className="flex items-center gap-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-full transition-all duration-500"
              style={{
                background: i < (completedPomodoros % 4) ? session.color : 'rgba(255,255,255,0.1)',
                boxShadow: i < (completedPomodoros % 4) ? `0 0 8px ${session.color}` : 'none'
              }}
            />
          ))}
          <span className="text-white/30 text-xs ml-2 font-medium">Every 4 = long break</span>
        </div>
      </div>
    </motion.div>
  )
}

export default FocusMode
