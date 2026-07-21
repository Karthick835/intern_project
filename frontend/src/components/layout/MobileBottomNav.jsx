import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion } from 'framer-motion'
import { LayoutGrid, Trello, Calendar, Trophy, Users } from 'lucide-react'

const NAV_ITEMS = [
  { icon: LayoutGrid, label: 'Home',    path: '/dashboard',   color: '#6366f1' },
  { icon: Trello,     label: 'Tasks',   path: '/tasks',       color: '#8b5cf6' },
  { icon: Calendar,  label: 'Sprints',  path: '/sprints',     color: '#10b981' },
  { icon: Trophy,    label: 'Board',    path: '/leaderboard', color: '#f59e0b' },
  { icon: Users,     label: 'Team',     path: '/team',        color: '#0ea5e9' },
]

const MobileBottomNav = () => {
  const location = useLocation()

  const isActive = (path) => {
    if (path === '/tasks') return location.pathname === '/tasks' || location.pathname === '/kanban'
    return location.pathname === path
  }

  return (
    /* Only visible on mobile (< md) */
    <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      style={{
        background: 'rgba(9, 8, 28, 0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(139, 92, 246, 0.15)',
        paddingBottom: 'env(safe-area-inset-bottom)', /* iPhone notch support */
      }}
    >
      <div className="flex items-center justify-around px-2 pt-2 pb-3">
        {NAV_ITEMS.map((item) => {
          const Icon = item.icon
          const active = isActive(item.path)
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 flex-1 py-1 relative"
            >
              {active && (
                <motion.div
                  layoutId="mobileActiveTab"
                  className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-1 rounded-full"
                  style={{ background: item.color, boxShadow: `0 0 10px ${item.color}80` }}
                  transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                />
              )}
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200"
                style={active ? { background: `${item.color}20`, border: `1px solid ${item.color}35` } : {}}
              >
                <Icon
                  className="w-5 h-5 transition-all duration-200"
                  style={{ color: active ? item.color : '#475569' }}
                />
              </div>
              <span
                className="text-[9px] font-bold uppercase tracking-wider leading-none transition-colors duration-200"
                style={{ color: active ? item.color : '#475569' }}
              >
                {item.label}
              </span>
            </Link>
          )
        })}
      </div>
    </nav>
  )
}

export default MobileBottomNav
