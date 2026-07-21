import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Calendar, Plus, Map, ShieldAlert, ChevronLeft, ChevronRight, Lock, Loader, ListTodo } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'
import TaskDetailModal from '../components/TaskDetailModal'

const Roadmap = () => {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  
  // Timeline dates range (Defaults to current month)
  const [currentDate, setCurrentDate] = useState(new Date())
  
  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  // Load projects
  const loadProjects = async () => {
    try {
      setLoading(true)
      const res = await api.get('/projects')
      setProjects(res.data)
      if (res.data.length > 0) {
        setSelectedProjectId(res.data[0].id)
      }
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setLoading(false)
    }
  }

  // Load tasks for selected project
  const loadProjectTasks = async () => {
    if (!selectedProjectId) return
    try {
      setLoading(true)
      const res = await api.get(`/tasks/project/${selectedProjectId}`)
      setTasks(res.data)
    } catch (err) {
      console.error('Failed to load tasks', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    loadProjectTasks()
  }, [selectedProjectId])

  // Month navigation helpers
  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1))
  }

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1))
  }

  // Get days in the current date month
  const getDaysInMonth = (date) => {
    const year = date.getFullYear()
    const month = date.getMonth()
    const daysCount = new Date(year, month + 1, 0).getDate()
    const days = []
    for (let i = 1; i <= daysCount; i++) {
      days.push(new Date(year, month, i))
    }
    return days
  }

  const daysList = getDaysInMonth(currentDate)
  const monthName = currentDate.toLocaleString('default', { month: 'long' })
  const currentYear = currentDate.getFullYear()

  // Calculate task positions relative to current month days list
  const getTaskTimelineSpan = (task) => {
    const taskStart = task.createdAt ? new Date(task.createdAt) : new Date()
    const taskEnd = task.dueDate ? new Date(task.dueDate) : new Date(taskStart.getTime() + 3 * 24 * 60 * 60 * 1000)

    // Boundaries of the current visible month
    const monthStart = daysList[0]
    const monthEnd = daysList[daysList.length - 1]

    // Check if task dates overlap with the visible month
    if (taskEnd < monthStart || taskStart > monthEnd) {
      return null // Outside visible range
    }

    // Determine grid start and end index (1-based relative to the days grid columns)
    const startOffset = Math.max(0, Math.ceil((taskStart - monthStart) / (1000 * 60 * 60 * 24)))
    const endOffset = Math.min(daysList.length, Math.ceil((taskEnd - monthStart) / (1000 * 60 * 60 * 24)))

    // Column start and span size (ensure positive size)
    const gridStartColumn = startOffset + 1
    const gridSpanColumns = Math.max(1, endOffset - startOffset)

    return {
      gridStartColumn,
      gridSpanColumns
    }
  }

  // Priority color helpers
  const getPriorityStyle = (priority) => {
    switch (priority) {
      case 'HIGH':
        return 'bg-red-500/10 text-red-600 border-red-200'
      case 'MEDIUM':
        return 'bg-amber-500/10 text-amber-600 border-amber-200'
      default:
        return 'bg-emerald-500/10 text-emerald-600 border-emerald-200'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight flex items-center gap-3">
            <Map className="w-8 h-8 text-primary-500" />
            Project Roadmap
          </h1>
          <p className="text-slate-500 text-sm mt-1">Visualize project schedules and trace blocking task paths on an interactive Gantt chart.</p>
        </div>

        {/* Project and Month Selectors */}
        <div className="flex items-center gap-3">
          <select
            value={selectedProjectId}
            onChange={(e) => setSelectedProjectId(e.target.value)}
            className="px-4 py-2.5 border border-slate-200 rounded-xl text-sm bg-white font-medium text-slate-700 focus:outline-none focus:border-primary-500"
          >
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                📁 {p.name}
              </option>
            ))}
          </select>

          {/* Month Navigator */}
          <div className="flex items-center bg-white border border-slate-200 rounded-xl p-1 shadow-sm">
            <button
              onClick={handlePrevMonth}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <span className="text-xs font-bold text-slate-700 px-3 select-none min-w-[120px] text-center">
              {monthName} {currentYear}
            </span>
            <button
              onClick={handleNextMonth}
              className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-900 transition"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {loading && projects.length === 0 ? (
        <div className="flex justify-center items-center py-24">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 bg-white border border-slate-200/60 rounded-2xl shadow-sm">
          <ListTodo className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-sm font-bold text-slate-700">No Projects Found</h2>
          <p className="text-slate-500 text-xs mt-1">Create a project on the Kanban Board first to plan its roadmap.</p>
        </div>
      ) : (
        <div className="bg-white border border-slate-200/60 rounded-2xl shadow-sm overflow-hidden flex flex-col">
          {/* Days Grid Header */}
          <div className="overflow-x-auto">
            <div className="min-w-[800px]">
              {/* Calendar Grid Header Dates */}
              <div 
                className="grid border-b border-slate-100 bg-slate-50/50"
                style={{ gridTemplateColumns: `180px repeat(${daysList.length}, 1fr)` }}
              >
                {/* Column header task title block */}
                <div className="px-4 py-3 text-xs font-bold text-slate-500 border-r border-slate-100 uppercase tracking-wider select-none">
                  Tasks
                </div>
                {/* Calendar Days */}
                {daysList.map((day) => {
                  const isToday = new Date().toDateString() === day.toDateString()
                  const isWeekend = day.getDay() === 0 || day.getDay() === 6
                  return (
                    <div 
                      key={day.getTime()} 
                      className={`text-center py-3 text-[10px] font-bold border-r border-slate-100/60 last:border-r-0 select-none flex flex-col items-center justify-center ${
                        isToday ? 'bg-primary-50 text-primary-600' : isWeekend ? 'text-slate-400 bg-slate-50/30' : 'text-slate-600'
                      }`}
                    >
                      <span>{day.getDate()}</span>
                      <span className="text-[8px] font-medium opacity-70">
                        {day.toLocaleString('default', { weekday: 'short' }).slice(0, 1)}
                      </span>
                    </div>
                  )
                })}
              </div>

              {/* Tasks Gantt Schedule Body */}
              <div className="divide-y divide-slate-100">
                {tasks.length === 0 ? (
                  <div className="text-center py-20 text-slate-400 text-xs">
                    No tasks registered in this project for the current timeframe.
                  </div>
                ) : (
                  tasks.map((task) => {
                    const span = getTaskTimelineSpan(task)
                    const isBlocked = task.blockedBy !== null && task.status !== 'DONE' && task.blockedBy.status !== 'DONE'
                    return (
                      <div
                        key={task.id}
                        className="grid hover:bg-slate-50/30 group"
                        style={{ gridTemplateColumns: `180px repeat(${daysList.length}, 1fr)` }}
                      >
                        {/* Task Title Meta Column */}
                        <div 
                          onClick={() => setSelectedTaskId(task.id)}
                          className="px-4 py-3.5 border-r border-slate-100 truncate text-xs font-semibold text-slate-700 hover:text-primary-600 cursor-pointer flex items-center gap-2 group-hover:bg-slate-50/50 transition-colors"
                        >
                          <span className={`w-2 h-2 rounded-full ${
                            task.status === 'DONE' ? 'bg-green-500' :
                            task.status === 'IN_REVIEW' ? 'bg-purple-500' :
                            task.status === 'IN_PROGRESS' ? 'bg-amber-500' : 'bg-slate-400'
                          }`}></span>
                          <span className="truncate flex-1">{task.title}</span>
                          {isBlocked && (
                            <Lock className="w-3.5 h-3.5 text-red-500 animate-pulse flex-shrink-0" />
                          )}
                        </div>

                        {/* Calendar Grid Cells / Timeline Track */}
                        <div className="relative col-span-full h-11 flex items-center" style={{ gridColumnStart: 2 }}>
                          {/* Background Grid Lines for Alignment */}
                          <div className="absolute inset-0 grid" style={{ gridTemplateColumns: `repeat(${daysList.length}, 1fr)` }}>
                            {daysList.map((_, i) => (
                              <div key={i} className="border-r border-slate-100/60 h-full last:border-r-0"></div>
                            ))}
                          </div>

                          {/* Task Colored Schedule Block */}
                          {span && (
                            <motion.div
                              onClick={() => setSelectedTaskId(task.id)}
                              initial={{ opacity: 0, scaleY: 0.8 }}
                              animate={{ opacity: 1, scaleY: 1 }}
                              className={`absolute h-7 rounded-lg border flex items-center px-3.5 shadow-sm text-[10px] font-bold cursor-pointer select-none truncate hover:shadow active:scale-98 transition ${
                                task.status === 'DONE' 
                                  ? 'bg-green-500/10 text-green-700 border-green-200' 
                                  : isBlocked 
                                  ? 'bg-red-500/15 text-red-700 border-red-200 hover:border-red-300'
                                  : 'bg-primary-500/10 text-primary-700 border-primary-200 hover:border-primary-300'
                              }`}
                              style={{
                                gridColumnStart: span.gridStartColumn,
                                gridColumnEnd: span.gridStartColumn + span.gridSpanColumns,
                                left: `${((span.gridStartColumn - 1) / daysList.length) * 100}%`,
                                width: `${(span.gridSpanColumns / daysList.length) * 100}%`,
                              }}
                            >
                              <span className="truncate flex-1 flex items-center gap-1.5">
                                {isBlocked && <Lock className="w-3 h-3 text-red-500 flex-shrink-0" />}
                                {task.title}
                              </span>
                              <span className="opacity-60 text-[9px] font-medium ml-2 flex-shrink-0">
                                {task.dueDate ? new Date(task.dueDate).getDate() : ''}
                              </span>
                            </motion.div>
                          )}
                        </div>
                      </div>
                    )
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Details Editor Modal */}
      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetailModal
            taskId={selectedTaskId}
            onClose={() => setSelectedTaskId(null)}
            onTaskUpdated={() => {
              loadProjectTasks()
            }}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default Roadmap
