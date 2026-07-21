import React, { useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import {
  LayoutGrid, Trello, Calendar, BarChart3, Users, Settings, LogOut,
  Sparkles, Map, ChevronRight, Zap, Trophy, User, BookOpen, Terminal
} from 'lucide-react'

const menuGroups = [
  {
    label: 'Workspace',
    items: [
      { icon: LayoutGrid, label: 'Dashboard', path: '/dashboard', color: 'text-blue-400', activeBg: 'bg-blue-500/10', activeBorder: 'border-blue-500/20' },
      { icon: Trello, label: 'Tasks & Boards', path: '/tasks', color: 'text-violet-400', activeBg: 'bg-violet-500/10', activeBorder: 'border-violet-500/20' },
      { icon: Calendar, label: 'Sprint Planning', path: '/sprints', color: 'text-emerald-400', activeBg: 'bg-emerald-500/10', activeBorder: 'border-emerald-500/20' },
      { icon: Map, label: 'Roadmap', path: '/roadmap', color: 'text-amber-400', activeBg: 'bg-amber-500/10', activeBorder: 'border-amber-500/20' },
      { icon: BookOpen, label: 'Wiki Docs', path: '/docs', color: 'text-sky-400', activeBg: 'bg-sky-500/10', activeBorder: 'border-sky-500/20' },
      { icon: Terminal, label: 'DevOps Engine', path: '/devops', color: 'text-indigo-400', activeBg: 'bg-indigo-500/10', activeBorder: 'border-indigo-500/20' },
    ]
  },
  {
    label: 'Insights',
    items: [
      { icon: BarChart3, label: 'Analytics', path: '/analytics', color: 'text-rose-400', activeBg: 'bg-rose-500/10', activeBorder: 'border-rose-500/20' },
    ]
  },
  {
    label: 'People',
    items: [
      { icon: Users, label: 'Team Members', path: '/team', color: 'text-sky-400', activeBg: 'bg-sky-500/10', activeBorder: 'border-sky-500/20' },
      { icon: Trophy, label: 'Leaderboard', path: '/leaderboard', color: 'text-amber-400', activeBg: 'bg-amber-500/10', activeBorder: 'border-amber-500/20' },
      { icon: User, label: 'My Scorecard', path: '/scorecard', color: 'text-pink-400', activeBg: 'bg-pink-500/10', activeBorder: 'border-pink-500/20' },
      { icon: Settings, label: 'Settings', path: '/settings', color: 'text-slate-400', activeBg: 'bg-slate-500/10', activeBorder: 'border-slate-500/20' },
    ]
  },
]

const Sidebar = ({ onNavClick }) => {
  const location = useLocation()
  const [hoveredPath, setHoveredPath] = useState(null)

  const getSafe = (key, fb) => { try { return localStorage.getItem(key) || fb } catch (e) { return fb } }
  const userName = getSafe('userName', 'User')
  const userRole = getSafe('userRole', 'Member')
  const userInitials = userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const roleLabel = userRole.replace('ROLE_', '').replace(/_/g, ' ')

  const handleLogout = () => {
    try {
      ['authToken', 'tenantSubdomain', 'userName', 'userEmail', 'userRole'].forEach(k => localStorage.removeItem(k))
    } catch (e) {}
    onNavClick?.()  // close mobile drawer
    window.location.href = '/login'
  }

  const isActive = (path) => {
    if (path === '/tasks') return location.pathname === '/tasks' || location.pathname === '/kanban' || location.pathname.startsWith('/task/')
    return location.pathname === path
  }

  return (
    <motion.aside
      initial={{ x: -56, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="w-[240px] flex-shrink-0 flex flex-col h-full sidebar-glass border-r border-white/5 select-none relative overflow-hidden z-30"
    >
      {/* Background decorative elements */}
      <div className="absolute top-0 left-0 w-48 h-48 bg-violet-600/6 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-20 right-0 w-32 h-32 bg-blue-600/5 rounded-full blur-2xl pointer-events-none" />

      {/* Brand Header */}
      <div className="relative p-5 flex items-center gap-3 border-b border-white/5">
        <div className="relative w-9 h-9 flex-shrink-0">
          <div className="w-9 h-9 bg-gradient-to-br from-violet-500 via-indigo-500 to-sky-400 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/25">
            <Sparkles className="w-4.5 h-4.5 text-white" />
          </div>
          <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-slate-950 shadow-sm" title="Online" />
        </div>
        <div className="min-w-0">
          <span className="block text-[15px] font-black tracking-tight text-white leading-tight">
            SaaS Grid
          </span>
          <span className="block text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Enterprise Hub
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        {menuGroups.map((group) => (
          <div key={group.label}>
            <p className="px-3 mb-2 text-[9px] font-black text-slate-600 uppercase tracking-[0.15em]">
              {group.label}
            </p>
            <div className="space-y-0.5">
              {group.items.map((item) => {
                const Icon = item.icon
                const active = isActive(item.path)
                const hovered = hoveredPath === item.path

                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onMouseEnter={() => setHoveredPath(item.path)}
                    onMouseLeave={() => setHoveredPath(null)}
                    onClick={onNavClick}
                    className="group relative block"
                  >
                    {/* Active indicator pill */}
                    {active && (
                      <motion.div
                        layoutId="activeNavIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-5 bg-gradient-to-b from-violet-400 to-indigo-500 rounded-r-full shadow-sm shadow-violet-500/30"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}

                    <div className={`relative flex items-center gap-3 ml-1.5 px-3 py-2.5 rounded-xl transition-all duration-200 ${
                      active
                        ? `${item.activeBg} border ${item.activeBorder} text-white`
                        : 'text-slate-500 hover:text-slate-200 hover:bg-white/5 border border-transparent'
                    }`}>
                      <Icon className={`w-4.5 h-4.5 flex-shrink-0 transition-all duration-300 ${
                        active ? item.color : 'text-slate-600 group-hover:text-slate-400'
                      } ${hovered && !active ? 'scale-110' : ''}`} />
                      <span className={`text-[13px] font-semibold leading-none transition-colors ${
                        active ? 'text-slate-100' : 'text-slate-500 group-hover:text-slate-200'
                      }`}>
                        {item.label}
                      </span>
                      {active && (
                        <ChevronRight className={`w-3 h-3 ml-auto flex-shrink-0 ${item.color} opacity-60`} />
                      )}
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        ))}
      </nav>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-white/5 space-y-2">
        {/* Upgrade hint */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-xl bg-gradient-to-r from-violet-500/10 to-indigo-500/10 border border-violet-500/10">
          <div className="w-6 h-6 rounded-lg bg-violet-500/20 flex items-center justify-center flex-shrink-0">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] font-bold text-violet-300 leading-tight">Pro Plan Active</p>
            <p className="text-[9px] text-violet-500/70 font-medium mt-0.5">All features enabled</p>
          </div>
        </div>

        {/* User row */}
        <div className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition cursor-default group">
          <div className="w-8 h-8 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-lg flex items-center justify-center text-white font-extrabold text-[11px] shadow-md flex-shrink-0 select-none">
            {userInitials || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-bold text-slate-200 truncate leading-tight">{userName}</p>
            <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider capitalize truncate mt-0.5">
              {roleLabel.replace('ROLE_', '').toLowerCase()}
            </p>
          </div>
          <button
            onClick={handleLogout}
            title="Sign out"
            className="p-1.5 text-slate-600 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition opacity-0 group-hover:opacity-100 flex-shrink-0"
          >
            <LogOut className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </motion.aside>
  )
}

export default Sidebar
