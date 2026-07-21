import React, { useState, useEffect } from 'react'
import Sidebar from './Sidebar'
import Navbar from './Navbar'
import MobileBottomNav from './MobileBottomNav'
import AiCoPilot from '../AiCoPilot'
import ChatSidebar from './ChatSidebar'
import FocusMode from '../FocusMode'
import { motion, AnimatePresence } from 'framer-motion'
import { Crown, Users, Loader, Sparkles, AlertTriangle, X, Timer } from 'lucide-react'
import axios from 'axios'

import { getApiBase } from '../../config'

const AppShell = ({ children }) => {
  const userRole = localStorage.getItem('userRole') || ''
  const token = localStorage.getItem('authToken')
  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'

  const [showClaimModal, setShowClaimModal] = useState(userRole === 'ROLE_NONE')
  const [checkingLeader, setCheckingLeader] = useState(true)
  const [leaderExists, setLeaderExists] = useState(false)
  const [loadingClaim, setLoadingClaim] = useState(false)
  const [error, setError] = useState('')

  // Mobile sidebar drawer state
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false)

  // Global background focus timer state
  const [showFocus, setShowFocus] = useState(false)
  const [focusTask, setFocusTask] = useState(null)
  const [activeTimerTime, setActiveTimerTime] = useState('')
  const [activeTimerType, setActiveTimerType] = useState('focus')
  const [isTimerRunning, setIsTimerRunning] = useState(false)

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  useEffect(() => {
    if (userRole !== 'ROLE_NONE') {
      setCheckingLeader(false)
      return
    }
    const checkLeaderStatus = async () => {
      try {
        const res = await api.get('/team')
        const hasLeader = res.data.some(
          m => m.role === 'ROLE_ADMIN' || m.role === 'COMPANY_ADMIN'
        )
        setLeaderExists(hasLeader)
      } catch (err) {
        console.error('Failed to check leader status', err)
      } finally {
        setCheckingLeader(false)
      }
    }
    checkLeaderStatus()
  }, [userRole])

  // Periodically check focus timer status from localStorage to sync the floating pill and tab title
  useEffect(() => {
    const checkTimer = () => {
      try {
        const running = localStorage.getItem('focusTimerRunning') === 'true'
        setIsTimerRunning(running)
        
        const sessionT = localStorage.getItem('focusTimerType') || 'focus'
        setActiveTimerType(sessionT)

        if (running) {
          const target = parseInt(localStorage.getItem('focusTimerTarget') || '0')
          const diff = Math.max(0, Math.round((target - Date.now()) / 1000))
          
          let timeStr = '00:00'
          if (diff > 0) {
            const m = Math.floor(diff / 60).toString().padStart(2, '0')
            const s = (diff % 60).toString().padStart(2, '0')
            timeStr = `${m}:${s}`
          }
          setActiveTimerTime(timeStr)

          // Update browser tab title
          const label = sessionT === 'focus' ? 'Focus' : 'Break'
          document.title = `(${timeStr}) ${label} | SaaS Grid`
        } else {
          const savedTime = localStorage.getItem('focusTimerTimeLeft')
          if (savedTime !== null) {
            const secs = parseInt(savedTime)
            const m = Math.floor(secs / 60).toString().padStart(2, '0')
            const s = (secs % 60).toString().padStart(2, '0')
            setActiveTimerTime(`${m}:${s}`)
          } else {
            setActiveTimerTime('')
          }

          // Reset browser tab title
          document.title = 'SaaS Grid'
        }
      } catch {}
    }

    checkTimer()
    const interval = setInterval(checkTimer, 1000)
    return () => {
      clearInterval(interval)
      try { document.title = 'SaaS Grid' } catch {}
    }
  }, [])

  // Listen to the custom global event start-focus to load task and open FocusMode overlay
  useEffect(() => {
    const handleStartFocus = () => {
      try {
        const taskStr = localStorage.getItem('focusTimerTask')
        if (taskStr) {
          setFocusTask(JSON.parse(taskStr))
        } else {
          setFocusTask(null)
        }
      } catch {
        setFocusTask(null)
      }
      setShowFocus(true)
    }
    window.addEventListener('start-focus', handleStartFocus)
    return () => window.removeEventListener('start-focus', handleStartFocus)
  }, [])

  // Close drawer on route change / resize to desktop
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) setMobileSidebarOpen(false)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const handleClaimRole = async (targetRole) => {
    setLoadingClaim(true)
    setError('')
    try {
      const res = await api.post('/team/claim-role', { role: targetRole })
      const data = res.data
      localStorage.setItem('authToken', data.token)
      localStorage.setItem('userRole', data.role)
      setShowClaimModal(false)
      window.location.reload()
    } catch (err) {
      setError(err.response?.data || 'Failed to claim role. Please try again.')
    } finally {
      setLoadingClaim(false)
    }
  }

  return (
    <div className="flex h-screen bg-slate-50 dark:bg-slate-950 overflow-hidden">

      {/* ─── DESKTOP SIDEBAR (md+) ─── shown on md and above, exactly as before */}
      <div className="hidden md:flex">
        <Sidebar />
      </div>

      {/* ─── MOBILE SIDEBAR DRAWER (< md only) ─── */}
      <AnimatePresence>
        {mobileSidebarOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              key="mobile-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
              onClick={() => setMobileSidebarOpen(false)}
            />
            {/* Drawer */}
            <motion.div
              key="mobile-drawer"
              initial={{ x: -260 }}
              animate={{ x: 0 }}
              exit={{ x: -260 }}
              transition={{ type: 'spring', stiffness: 340, damping: 30 }}
              className="fixed left-0 top-0 bottom-0 z-50 md:hidden"
            >
              <Sidebar onNavClick={() => setMobileSidebarOpen(false)} />
            </motion.div>
          </>
        )}
      </AnimatePresence>

      {/* ─── MAIN CONTENT AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Navbar — pass handler so hamburger can open drawer */}
        <Navbar onOpenMobileSidebar={() => setMobileSidebarOpen(true)} />

        {/* Scrollable page content */}
        <main className="flex-1 overflow-y-auto bg-slate-50 dark:bg-slate-950 focus:outline-none">
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -15 }}
            transition={{ duration: 0.25, ease: 'easeOut' }}
            className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto
                        pb-20 md:pb-6"   /* bottom padding on mobile for bottom nav */
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* ─── MOBILE BOTTOM NAV (< md only) ─── */}
      <MobileBottomNav />

      {/* Floating AI Co-Pilot Chatbot */}
      <AiCoPilot />

      {/* Real-Time War Room Sidebar */}
      <ChatSidebar />

      {/* Fullscreen Role Selection Overlay */}
      <AnimatePresence>
        {showClaimModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-md p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 max-w-2xl w-full text-center relative overflow-hidden shadow-2xl"
            >
              {checkingLeader ? (
                <div className="py-12 flex flex-col items-center justify-center">
                  <Loader className="w-8 h-8 text-violet-500 animate-spin mb-4" />
                  <p className="text-slate-400 text-sm">Verifying team role availability...</p>
                </div>
              ) : (
                <>
                  <div className="absolute top-0 right-0 w-32 h-32 bg-violet-600/10 rounded-full blur-3xl pointer-events-none" />
                  <div className="absolute bottom-0 left-0 w-32 h-32 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

                  <div className="inline-flex items-center gap-2 mb-6">
                    <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-white text-lg font-bold tracking-tight">SaaS Grid Onboarding</span>
                  </div>

                  <h2 className="text-2xl md:text-3xl font-extrabold text-white mb-2 tracking-tight">
                    Choose Your Role
                  </h2>
                  <p className="text-slate-400 text-xs mb-8">
                    To start collaborating, please select your profile role in this workspace.
                  </p>

                  {error && (
                    <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 text-red-300 text-xs rounded-xl font-medium flex items-center justify-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                      {error}
                    </div>
                  )}

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-6 text-left">
                    <button
                      onClick={() => handleClaimRole('ROLE_ADMIN')}
                      disabled={leaderExists || loadingClaim}
                      className={`flex flex-col rounded-2xl p-5 md:p-6 border-2 text-left relative overflow-hidden transition-all active:scale-99 ${
                        leaderExists
                          ? 'bg-slate-900/40 border-slate-800/50 opacity-40 cursor-not-allowed'
                          : 'bg-gradient-to-br from-violet-950/30 via-violet-900/10 to-transparent border-violet-500/20 hover:border-violet-500/50 hover:bg-violet-950/20 cursor-pointer group'
                      }`}
                    >
                      <div className="w-10 h-10 bg-violet-500/10 border border-violet-500/25 text-violet-400 rounded-xl flex items-center justify-center mb-4">
                        <Crown className="w-5 h-5" />
                      </div>
                      <h4 className="text-white font-bold text-base mb-1">Team Leader</h4>
                      <p className="text-slate-400 text-[10px] leading-relaxed mb-4">
                        Configure milestones, assign tasks, review reports, and manage team members. (Maximum 1 per workspace).
                      </p>
                      {leaderExists && (
                        <span className="text-[9px] font-bold text-amber-500 uppercase tracking-wider block mt-auto">
                          Position Occupied
                        </span>
                      )}
                    </button>

                    <button
                      onClick={() => handleClaimRole('DEVELOPER')}
                      disabled={loadingClaim}
                      className="flex flex-col bg-gradient-to-br from-slate-800/40 via-slate-900/20 to-transparent border-2 border-slate-700/50 hover:border-slate-500/40 rounded-2xl p-5 md:p-6 hover:bg-slate-800/40 cursor-pointer active:scale-99 transition-all text-left group"
                    >
                      <div className="w-10 h-10 bg-slate-800/60 border border-slate-700 text-slate-350 rounded-xl flex items-center justify-center mb-4">
                        <Users className="w-5 h-5" />
                      </div>
                      <h4 className="text-white font-bold text-base mb-1">Team Member</h4>
                      <p className="text-slate-400 text-[10px] leading-relaxed">
                        Log hours, update task boards, track backlogs, and collaborate with your teammates.
                      </p>
                    </button>
                  </div>
                </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Global Floating Timer Pill */}
      {activeTimerTime && !showFocus && (
        <motion.button
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{
            opacity: 1,
            scale: isTimerRunning ? [1, 1.03, 1] : 1,
            y: 0
          }}
          transition={{
            scale: {
              duration: 2,
              repeat: Infinity,
              ease: "easeInOut"
            }
          }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => {
            window.dispatchEvent(new Event('start-focus'))
          }}
          className={`fixed bottom-24 right-6 z-40 flex items-center gap-2.5 px-4.5 py-3 rounded-full border shadow-2xl backdrop-blur-md transition-all duration-300 font-bold text-xs tracking-wide ${
            isTimerRunning
              ? 'bg-violet-600/15 border-violet-500/30 text-violet-400 shadow-violet-500/10'
              : 'bg-slate-900/90 border-slate-800 text-slate-400 shadow-black/40'
          }`}
        >
          <Timer className={`w-4 h-4 ${isTimerRunning ? 'animate-spin' : ''}`} style={{ animationDuration: '4s' }} />
          <span className="tabular-nums font-extrabold text-sm">{activeTimerTime}</span>
          <span className={`text-[9px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md ${
            isTimerRunning ? 'bg-violet-500/10 text-violet-300' : 'bg-slate-800 text-slate-400'
          }`}>
            {activeTimerType === 'focus' ? 'Focus' : 'Break'}
          </span>
        </motion.button>
      )}

      {/* Global Focus Mode Overlay */}
      <AnimatePresence>
        {showFocus && (
          <FocusMode
            task={focusTask}
            onClose={() => setShowFocus(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default AppShell
