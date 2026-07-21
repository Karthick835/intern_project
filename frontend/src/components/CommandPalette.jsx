import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Search, Command, CheckSquare, FileText, GitBranch, Play, 
  Timer, Sparkles, Moon, Sun, ArrowRight, X, Cpu, Mic, ShieldAlert
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import { getApiBase } from '../config'

const CommandPalette = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('')
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [tasks, setTasks] = useState([])
  const [docs, setDocs] = useState([])
  const [repos, setRepos] = useState([])
  const inputRef = useRef(null)
  const navigate = useNavigate()

  const token = localStorage.getItem('authToken')
  const subdomain = localStorage.getItem('tenantSubdomain') || 'acmecompany'

  // Fetch index data for search
  useEffect(() => {
    if (!isOpen) return

    const fetchData = async () => {
      try {
        const api = axios.create({
          baseURL: getApiBase(),
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': subdomain
          }
        })
        const [tasksRes, docsRes, reposRes] = await Promise.all([
          api.get('/tasks').catch(() => ({ data: [] })),
          api.get('/docs').catch(() => ({ data: [] })),
          api.get('/devops/repos').catch(() => ({ data: [] }))
        ])
        setTasks(tasksRes.data || [])
        setDocs(docsRes.data || [])
        setRepos(reposRes.data || [])
      } catch (err) {
        console.error('Failed to load command palette index data', err)
      }
    }

    fetchData()
    setQuery('')
    setSelectedIndex(0)

    // Focus input on open
    setTimeout(() => {
      if (inputRef.current) inputRef.current.focus()
    }, 50)
  }, [isOpen, token, subdomain])

  // Quick Action Commands
  const staticActions = [
    {
      id: 'action-focus',
      category: 'Actions',
      icon: Timer,
      title: 'Start Focus Timer (Pomodoro)',
      desc: 'Launch 25-minute focus session with background tracking',
      action: () => {
        window.dispatchEvent(new Event('start-focus'))
        onClose()
      }
    },
    {
      id: 'action-docs',
      category: 'Navigation',
      icon: FileText,
      title: 'Open Collaborative Wiki Docs',
      desc: 'Create or edit team documentation & generate AI backlog tasks',
      action: () => {
        navigate('/docs')
        onClose()
      }
    },
    {
      id: 'action-devops',
      category: 'Navigation',
      icon: GitBranch,
      title: 'Open DevOps Command Center',
      desc: 'View Git commits, repos, webhooks, & CI/CD pipelines',
      action: () => {
        navigate('/devops')
        onClose()
      }
    },
    {
      id: 'action-board',
      category: 'Navigation',
      icon: CheckSquare,
      title: 'Go to Kanban Board & Sprints',
      desc: 'View task columns, drag cards, and track sprint velocity',
      action: () => {
        navigate('/sprint')
        onClose()
      }
    }
  ]

  // Filtered Task items
  const filteredTasks = tasks
    .filter(t => t.title.toLowerCase().includes(query.toLowerCase()) || (t.description && t.description.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 5)
    .map(t => ({
      id: `task-${t.id}`,
      category: 'Tasks',
      icon: CheckSquare,
      title: t.title,
      desc: `Status: ${t.status} • Priority: ${t.priority}`,
      action: () => {
        navigate('/sprint')
        onClose()
      }
    }))

  // Filtered Wiki Doc items
  const filteredDocs = docs
    .filter(d => d.title.toLowerCase().includes(query.toLowerCase()) || (d.content && d.content.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 4)
    .map(d => ({
      id: `doc-${d.id}`,
      category: 'Wiki Docs',
      icon: FileText,
      title: d.title,
      desc: `Updated by ${d.updatedBy || 'Developer'}`,
      action: () => {
        navigate('/docs')
        onClose()
      }
    }))

  // Filtered Repo items
  const filteredRepos = repos
    .filter(r => r.name.toLowerCase().includes(query.toLowerCase()) || (r.desc && r.desc.toLowerCase().includes(query.toLowerCase())))
    .slice(0, 3)
    .map(r => ({
      id: `repo-${r.name}`,
      category: 'Repositories',
      icon: GitBranch,
      title: r.name,
      desc: `${r.lang} • ${r.desc || 'Code repository'}`,
      action: () => {
        navigate('/devops')
        onClose()
      }
    }))

  const filteredActions = staticActions.filter(a => 
    a.title.toLowerCase().includes(query.toLowerCase()) || a.desc.toLowerCase().includes(query.toLowerCase())
  )

  const allItems = [...filteredActions, ...filteredTasks, ...filteredDocs, ...filteredRepos]

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return

      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSelectedIndex(prev => (prev + 1) % Math.max(1, allItems.length))
      } else if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSelectedIndex(prev => (prev - 1 + allItems.length) % Math.max(1, allItems.length))
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (allItems[selectedIndex]) {
          allItems[selectedIndex].action()
        }
      } else if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, selectedIndex, allItems, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-slate-950/70 backdrop-blur-md">
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -10 }}
          transition={{ duration: 0.15 }}
          className="w-full max-w-2xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left"
        >
          {/* Top Search Input Bar */}
          <div className="flex items-center gap-3 px-5 py-4 border-b border-white/10 bg-slate-900/90">
            <Search className="w-5 h-5 text-violet-400 flex-shrink-0" />
            <input
              ref={inputRef}
              type="text"
              value={query}
              onChange={(e) => {
                setQuery(e.target.value)
                setSelectedIndex(0)
              }}
              placeholder="Type a command or search tasks, docs, repos... (e.g. Focus, Auth, #af80ea80)"
              className="flex-1 bg-transparent text-white text-sm focus:outline-none placeholder:text-slate-500 font-medium"
            />
            <button
              onClick={onClose}
              className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Results List */}
          <div className="max-h-96 overflow-y-auto p-2 space-y-1">
            {allItems.length === 0 ? (
              <div className="py-12 text-center text-slate-500 text-xs">
                No matching commands, tasks, or documents found for "{query}"
              </div>
            ) : (
              allItems.map((item, index) => {
                const IconComponent = item.icon
                const isSelected = index === selectedIndex

                return (
                  <div
                    key={item.id}
                    onClick={item.action}
                    onMouseEnter={() => setSelectedIndex(index)}
                    className={`flex items-center justify-between p-3 rounded-2xl transition cursor-pointer ${
                      isSelected 
                        ? 'bg-gradient-to-r from-violet-600/30 to-indigo-600/30 border border-violet-500/40 text-white' 
                        : 'hover:bg-white/5 border border-transparent text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${isSelected ? 'bg-violet-500 text-white' : 'bg-white/5 text-slate-400'}`}>
                        <IconComponent className="w-4 h-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-extrabold text-xs tracking-tight truncate">{item.title}</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-white/10 text-slate-400 font-bold uppercase flex-shrink-0">
                            {item.category}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400 truncate mt-0.5">{item.desc}</p>
                      </div>
                    </div>

                    <ArrowRight className={`w-4 h-4 flex-shrink-0 ml-2 transition ${isSelected ? 'opacity-100 text-violet-400 translate-x-1' : 'opacity-0'}`} />
                  </div>
                )
              })
            )}
          </div>

          {/* Footer Shortcuts hint */}
          <div className="px-5 py-3 border-t border-white/5 bg-slate-950/60 flex items-center justify-between text-[11px] text-slate-500 select-none">
            <div className="flex items-center gap-3">
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px] text-slate-300">↑↓</kbd> to navigate</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px] text-slate-300">↵</kbd> to select</span>
              <span><kbd className="px-1.5 py-0.5 bg-white/10 rounded font-mono text-[10px] text-slate-300">ESC</kbd> to close</span>
            </div>
            <div className="flex items-center gap-1 text-violet-400 font-bold">
              <Command className="w-3 h-3" /> Spotlight Search
            </div>
          </div>

        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default CommandPalette
