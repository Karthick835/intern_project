import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Search, Bell, Settings, LogOut, CheckCircle, Trash2, Sun, Moon, Sparkles, Command, X, LayoutGrid, Trello, Calendar, BarChart3, Users, Map, Zap, ChevronRight, Menu } from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'

import { getApiBase } from '../../config'
import CommandPalette from '../CommandPalette'

const Navbar = ({ onOpenMobileSidebar }) => {
  const [showNotifications, setShowNotifications] = useState(false)
  const [showCommandPalette, setShowCommandPalette] = useState(false)
  const [showProfile, setShowProfile] = useState(false)
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchRef = useRef(null)
  const navigate = useNavigate()

  const getSafeLocalStorage = (key, fallback) => {
    try { return localStorage.getItem(key) || fallback } catch (e) { return fallback }
  }

  const [theme, setTheme] = useState(() => getSafeLocalStorage('theme', 'dark'))

  useEffect(() => {
    if (theme === 'dark') {
      document.documentElement.classList.add('dark')
      document.body.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
      document.body.classList.remove('dark')
    }
    try { localStorage.setItem('theme', theme) } catch (e) {}
  }, [theme])

  const toggleTheme = () => setTheme(theme === 'light' ? 'dark' : 'light')

  const userName = getSafeLocalStorage('userName', 'User')
  const userRole = getSafeLocalStorage('userRole', 'Member')
  const subdomain = getSafeLocalStorage('tenantSubdomain', 'workspace')
  const token = getSafeLocalStorage('authToken', '')

  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const roleLabel = userRole.replace('ROLE_', '').replace(/_/g, ' ').toLowerCase()

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': subdomain }
  })

  const fetchUnreadNotifications = async () => {
    if (!token) return
    try {
      setLoading(true)
      const res = await api.get('/notifications/unread')
      setNotifications(res.data)
    } catch (err) {
      console.error('Failed to fetch unread notifications', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUnreadNotifications()
    const interval = setInterval(fetchUnreadNotifications, 30000)
    return () => clearInterval(interval)
  }, [])

  // Keyboard shortcut: Ctrl+K or Cmd+K
  useEffect(() => {
    const handler = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setShowCommandPalette(true)
        setTimeout(() => searchRef.current?.focus(), 100)
      }
      if (e.key === 'Escape') {
        setShowCommandPalette(false)
        setShowNotifications(false)
        setShowProfile(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const navCommands = [
    { icon: LayoutGrid, label: 'Dashboard', desc: 'Workspace overview & metrics', path: '/dashboard', color: 'text-blue-400' },
    { icon: Trello, label: 'Tasks & Boards', desc: 'Kanban board & backlog', path: '/tasks', color: 'text-violet-400' },
    { icon: Calendar, label: 'Sprint Planning', desc: 'Active sprint & burndown', path: '/sprints', color: 'text-emerald-400' },
    { icon: Map, label: 'Roadmap', desc: 'Project milestones & timeline', path: '/roadmap', color: 'text-amber-400' },
    { icon: BarChart3, label: 'Analytics', desc: 'Velocity, insights & reports', path: '/analytics', color: 'text-rose-400' },
    { icon: Users, label: 'Team Members', desc: 'Manage team & invite', path: '/team', color: 'text-sky-400' },
    { icon: Settings, label: 'Settings', desc: 'Workspace configuration', path: '/settings', color: 'text-slate-400' },
  ]

  const filteredCommands = navCommands.filter(c =>
    c.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.desc.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleMarkAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) { console.error(err) }
  }

  const handleDeleteNotification = async (id) => {
    try {
      await api.delete(`/notifications/${id}`)
      setNotifications(prev => prev.filter(n => n.id !== id))
    } catch (err) { console.error(err) }
  }

  const handleLogout = () => {
    try {
      ['authToken', 'tenantSubdomain', 'userName', 'userEmail', 'userRole'].forEach(k => localStorage.removeItem(k))
    } catch (e) {}
    window.location.href = '/login'
  }

  return (
    <>
      <motion.header
        initial={{ y: -15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.35, ease: 'easeOut' }}
        className="bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/60 dark:border-slate-800/60 px-6 py-3.5 flex items-center justify-between z-40 sticky top-0 gap-4"
      >
        {/* Left: Hamburger (mobile only) + Workspace badge */}
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          {/* Hamburger — only on mobile */}
          <button
            onClick={onOpenMobileSidebar}
            className="md:hidden p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-200"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <span className="hidden sm:flex px-3 py-1.5 bg-gradient-to-r from-violet-500/10 to-indigo-500/10 text-violet-600 dark:text-violet-400 font-extrabold text-[11px] rounded-full uppercase tracking-wider border border-violet-100 dark:border-violet-900/30 items-center gap-1.5 shadow-sm select-none whitespace-nowrap">
            <Sparkles className="w-3 h-3 text-violet-500" />
            {subdomain}.saasgrid.io
          </span>
        </div>

        {/* Center: Command Palette Trigger */}
        <button
          onClick={() => { setShowCommandPalette(true); setTimeout(() => searchRef.current?.focus(), 80) }}
          className="flex-1 max-w-xs flex items-center gap-2.5 px-3.5 py-2 bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl text-slate-500 dark:text-slate-500 text-xs font-medium hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-200 group"
        >
          <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-500 dark:group-hover:text-slate-400" />
          <span className="flex-1 text-left">Search or jump to...</span>
          <kbd className="hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded text-[9px] font-bold text-slate-400 dark:text-slate-500 shadow-sm">
            <span>⌘</span><span>K</span>
          </kbd>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-1.5">
          {/* Notifications */}
          <div className="relative">
            <button
              onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false) }}
              className={`relative p-2 rounded-xl border transition-all duration-200 ${
                showNotifications
                  ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-100'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 border-transparent'
              }`}
            >
              <Bell className="w-4.5 h-4.5" />
              {notifications.length > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute top-1 right-1 w-2 h-2 bg-gradient-to-br from-rose-500 to-red-600 rounded-full ring-2 ring-white dark:ring-slate-950"
                />
              )}
            </button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-2.5 w-80 bg-white/95 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden z-50"
                >
                  <div className="px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/80 dark:bg-slate-950/30">
                    <div className="flex items-center gap-2">
                      <Bell className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                      <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">Notifications</h3>
                    </div>
                    {notifications.length > 0 && (
                      <span className="text-[10px] font-extrabold px-2 py-0.5 bg-rose-100 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 rounded-full">
                        {notifications.length} new
                      </span>
                    )}
                  </div>
                  <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800/60">
                    {loading && notifications.length === 0 ? (
                      <div className="p-4 space-y-3">
                        {[1,2].map(i => <div key={i} className="h-4 bg-slate-100 dark:bg-slate-800 rounded skeleton" />)}
                      </div>
                    ) : notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <CheckCircle className="w-8 h-8 text-emerald-300 dark:text-emerald-700 mx-auto mb-2" />
                        <p className="text-slate-500 dark:text-slate-400 text-xs font-medium">All caught up!</p>
                      </div>
                    ) : notifications.map(notif => (
                      <div key={notif.id} className="p-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition flex gap-3 group items-start">
                        <div className="w-7 h-7 rounded-lg bg-violet-100 dark:bg-violet-950/30 text-violet-600 dark:text-violet-400 flex items-center justify-center flex-shrink-0 mt-0.5">
                          <Zap className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">{notif.content}</p>
                          <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 mt-1 block">Just now</span>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
                          <button onClick={() => handleMarkAsRead(notif.id)} className="p-1 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/20 rounded-lg transition" title="Mark as read">
                            <CheckCircle className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteNotification(notif.id)} className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-lg transition" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={theme === 'light' ? 'Switch to Dark' : 'Switch to Light'}
            className="p-2 text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-100 hover:bg-slate-100 dark:hover:bg-slate-900 rounded-xl transition border border-transparent hover:border-slate-200 dark:hover:border-slate-800"
          >
            <motion.div animate={{ rotate: theme === 'light' ? 0 : 180 }} transition={{ type: 'spring', stiffness: 200, damping: 15 }}>
              {theme === 'light' ? <Moon className="w-4.5 h-4.5" /> : <Sun className="w-4.5 h-4.5" />}
            </motion.div>
          </button>

          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => { setShowProfile(!showProfile); setShowNotifications(false) }}
              className="flex items-center gap-2.5 pl-1.5 pr-3 py-1.5 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-900 border border-transparent hover:border-slate-200 dark:hover:border-slate-800 transition-all duration-200"
            >
              <div className="w-7.5 h-7.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-black text-xs shadow-md select-none">
                {userInitials || 'U'}
              </div>
              <div className="text-left hidden sm:block">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 leading-tight">{userName}</p>
                <p className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 uppercase tracking-wider capitalize">{roleLabel}</p>
              </div>
            </button>

            <AnimatePresence>
              {showProfile && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.96 }}
                  transition={{ duration: 0.18 }}
                  className="absolute right-0 mt-2.5 w-64 bg-white/95 dark:bg-slate-900/98 backdrop-blur-xl border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-900/10 dark:shadow-black/40 overflow-hidden z-50"
                >
                  {/* Profile Header */}
                  <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-gradient-to-br from-violet-50/50 to-indigo-50/30 dark:from-violet-950/20 dark:to-indigo-950/10">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-md select-none">
                        {userInitials || 'U'}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{userName}</p>
                        <p className="text-[10px] font-semibold text-violet-600 dark:text-violet-400 uppercase tracking-wider capitalize">{roleLabel}</p>
                      </div>
                    </div>
                  </div>
                  {/* Actions */}
                  <div className="p-1.5">
                    <Link to="/settings" onClick={() => setShowProfile(false)} className="flex items-center gap-3 px-3.5 py-2.5 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition text-sm font-medium group">
                      <Settings className="w-4 h-4 text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300 transition" />
                      Settings
                    </Link>
                    <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3.5 py-2.5 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-xl transition text-sm font-medium group mt-1">
                      <LogOut className="w-4 h-4 transition" />
                      Sign Out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.header>

      {/* Global Spotlight Command Palette */}
      <CommandPalette isOpen={showCommandPalette} onClose={() => setShowCommandPalette(false)} />
    </>
  )
}

export default Navbar
