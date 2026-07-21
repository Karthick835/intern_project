import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { Plus, Search, Filter, AlertCircle, Loader, User, Calendar, Trash2, FolderPlus, Lock, Folder, Tag, AlertTriangle } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'
import TaskDetailModal from '../components/TaskDetailModal'

const KanbanBoard = () => {
  const [projects, setProjects] = useState([])
  const [selectedProjectId, setSelectedProjectId] = useState('')
  const [loading, setLoading] = useState(false)
  const [tasks, setTasks] = useState({
    TO_DO: [],
    IN_PROGRESS: [],
    IN_REVIEW: [],
    DONE: []
  })
  
  // Dialogs and Modals
  const [selectedTaskId, setSelectedTaskId] = useState(null)
  const [modalSession, setModalSession] = useState(0)
  const [errorMsg, setErrorMsg] = useState('')
  const [showCreateProject, setShowCreateProject] = useState(false)
  const [newProjectName, setNewProjectName] = useState('')
  const [newProjectDesc, setNewProjectDesc] = useState('')
  const [newProjectPriority, setNewProjectPriority] = useState('MEDIUM')

  // Inline Task Creation per Column
  const [activeCreationColumn, setActiveCreationColumn] = useState(null)
  const [newTaskTitle, setNewTaskTitle] = useState('')

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterAssignee, setFilterAssignee] = useState('')
  const [users, setUsers] = useState([])

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  const loadProjects = async () => {
    try {
      setLoading(true)
      const res = await api.get('/projects')
      setProjects(res.data)
      if (res.data.length > 0) {
        setSelectedProjectId(res.data[0].id)
      }
      
      const usersRes = await api.get('/team')
      setUsers(usersRes.data)
    } catch (err) {
      console.error('Failed to load projects', err)
    } finally {
      setLoading(false)
    }
  }

  const loadTasks = async (showLoader = false) => {
    if (!selectedProjectId) return
    try {
      if (showLoader) setLoading(true)
      const res = await api.get(`/tasks/project/${selectedProjectId}`)
      
      const categorized = {
        TO_DO: [],
        IN_PROGRESS: [],
        IN_REVIEW: [],
        DONE: []
      }

      res.data.forEach((task) => {
        const col = task.status || 'TO_DO'
        if (categorized[col]) {
          categorized[col].push(task)
        } else {
          categorized.TO_DO.push(task)
        }
      })

      setTasks(categorized)
    } catch (err) {
      console.error('Failed to load tasks', err)
    } finally {
      if (showLoader) setLoading(false)
    }
  }

  useEffect(() => {
    loadProjects()
  }, [])

  useEffect(() => {
    loadTasks(true)
  }, [selectedProjectId])

  const openTaskDetails = (taskId) => {
    setSelectedTaskId(null)
    window.setTimeout(() => {
      setSelectedTaskId(taskId)
      setModalSession((prev) => prev + 1)
    }, 0)
  }

  const closeTaskDetails = () => {
    setSelectedTaskId(null)
  }

  const [creatingProject, setCreatingProject] = useState(false)

  const handleCreateProject = async (e) => {
    e.preventDefault()
    if (!newProjectName.trim()) return
    try {
      setCreatingProject(true)
      const res = await api.post('/projects', {
        name: newProjectName.trim(),
        description: newProjectDesc.trim(),
        priority: newProjectPriority
      })
      setProjects((prev) => [...prev, res.data])
      setSelectedProjectId(res.data.id)
      setShowCreateProject(false)
      setNewProjectName('')
      setNewProjectDesc('')
    } catch (err) {
      console.error('Failed to create project', err)
      const d = err.response?.data
      alert(typeof d === 'string' ? d : (d?.message || 'Failed to save project. Please try again.'))
    } finally {
      setCreatingProject(false)
    }
  }

  const handleCreateTask = async (columnId) => {
    if (!newTaskTitle.trim() || !selectedProjectId) return
    try {
      const res = await api.post('/tasks', {
        title: newTaskTitle.trim(),
        status: columnId,
        projectId: selectedProjectId
      })
      setTasks((prev) => [...prev, res.data])
      setNewTaskTitle('')
      setActiveCreationColumn(null)
    } catch (err) {
      console.error('Failed to create task', err)
      const d = err.response?.data
      alert(typeof d === 'string' ? d : (d?.message || 'Failed to create task.'))
    }
  }

  const handleDragEnd = async (result) => {
    const { source, destination, draggableId } = result
    if (!destination) return

    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return
    }

    const sourceCol = source.droppableId
    const destCol = destination.droppableId

    const sourceList = Array.from(tasks[sourceCol])
    const destList = sourceCol === destCol ? sourceList : Array.from(tasks[destCol])
    
    const [movedTask] = sourceList.splice(source.index, 1)
    
    movedTask.status = destCol
    destList.splice(destination.index, 0, movedTask)

    const updatedTasks = {
      ...tasks,
      [sourceCol]: sourceList,
      [destCol]: destList
    }
    
    setTasks(updatedTasks)

    try {
      setErrorMsg('')
      await api.put(`/tasks/${draggableId}/status/${destCol}`)
    } catch (err) {
      console.error('Failed to save task status drag and drop', err)
      if (err.response && err.response.data && err.response.data.message) {
        setErrorMsg(err.response.data.message)
      } else {
        setErrorMsg('Failed to save task status. Reverting changes.')
      }
      loadTasks()
    }
  }

  const getFilteredTasks = (list) => {
    return list.filter((task) => {
      const matchSearch = searchQuery
        ? task.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          (task.description && task.description.toLowerCase().includes(searchQuery.toLowerCase()))
        : true

      const matchPriority = filterPriority ? task.priority === filterPriority : true
      const matchAssignee = filterAssignee ? task.assignee?.id === filterAssignee : true

      return matchSearch && matchPriority && matchAssignee
    })
  }

  const PRIORITY_BADGES = {
    HIGH: 'badge-rose',
    MEDIUM: 'badge-amber',
    LOW: 'badge-emerald',
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 dark:text-slate-100 tracking-tight">Kanban Workspace</h1>
          <p className="text-slate-500 dark:text-slate-400 text-sm mt-1">Manage project task states, priority levels, and filters.</p>
        </div>

        {/* Project Selector & Modal Creator */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="pl-9 pr-8 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 font-semibold text-slate-700 dark:text-slate-350 focus:outline-none focus:border-violet-500 focus:ring-1 focus:ring-violet-500 appearance-none shadow-sm cursor-pointer"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <Folder className="absolute left-3 top-3.5 w-3.5 h-3.5 text-slate-400" />
            <div className="absolute right-3 top-4 w-1.5 h-1.5 border-r border-b border-slate-500 transform rotate-45 pointer-events-none" />
          </div>

          <button
            onClick={() => setShowCreateProject(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs font-bold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 active:scale-98 transition shadow"
          >
            <FolderPlus className="w-4 h-4" /> New Project
          </button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-rose-500/10 border border-rose-500/20 text-rose-350 text-xs rounded-2xl flex items-center justify-between gap-3 shadow">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4.5 h-4.5 text-rose-450 flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button 
            onClick={() => setErrorMsg('')} 
            className="text-rose-400 hover:text-rose-300 font-bold"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Filter panel */}
      <div className="glass-panel p-4 rounded-2xl flex flex-col md:flex-row gap-4 items-center justify-between">
        <div className="relative w-full md:max-w-xs">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-200 dark:border-slate-800 rounded-xl focus:outline-none focus:border-violet-500 text-xs bg-slate-50/50 dark:bg-slate-850 text-slate-800 dark:text-slate-200"
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          {/* Priority filter */}
          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 focus:outline-none focus:border-violet-500"
          >
            <option value="">All Priorities</option>
            <option value="HIGH">High Priority</option>
            <option value="MEDIUM">Medium Priority</option>
            <option value="LOW">Low Priority</option>
          </select>

          {/* Assignee filter */}
          <select
            value={filterAssignee}
            onChange={(e) => setFilterAssignee(e.target.value)}
            className="px-3.5 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-650 dark:text-slate-350 focus:outline-none focus:border-violet-500"
          >
            <option value="">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Create Project Modal dialog */}
      <AnimatePresence>
        {showCreateProject && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-2xl w-full max-w-md"
            >
              <h3 className="font-extrabold text-slate-900 dark:text-slate-100 text-base mb-5">Create Project</h3>
              <form onSubmit={handleCreateProject} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">Name</label>
                  <input
                    type="text"
                    required
                    value={newProjectName}
                    onChange={(e) => setNewProjectName(e.target.value)}
                    placeholder="E.g. Web App Redesign"
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-250 bg-white dark:bg-slate-850 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">Description</label>
                  <textarea
                    value={newProjectDesc}
                    onChange={(e) => setNewProjectDesc(e.target.value)}
                    placeholder="Short summary..."
                    rows={3}
                    className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-250 bg-white dark:bg-slate-850 focus:outline-none focus:border-violet-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-500 dark:text-slate-450 mb-1">Priority</label>
                  <select
                    value={newProjectPriority}
                    onChange={(e) => setNewProjectPriority(e.target.value)}
                    className="w-full p-2.5 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-800 dark:text-slate-250 bg-white dark:bg-slate-850 focus:outline-none focus:border-violet-500"
                  >
                    <option value="LOW" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Low</option>
                    <option value="MEDIUM" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Medium</option>
                    <option value="HIGH" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>High</option>
                  </select>
                </div>
                <div className="flex gap-2 justify-end pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateProject(false)}
                    className="px-4 py-2 text-slate-650 dark:text-slate-350 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition text-sm font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingProject}
                    className="px-4 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl hover:bg-slate-800 dark:hover:bg-slate-200 transition text-sm font-semibold shadow disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {creatingProject && <Loader className="w-3.5 h-3.5 animate-spin" />}
                    {creatingProject ? 'Saving...' : 'Save Project'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Board Columns container */}
      {loading && projects.length === 0 ? (
        <div className="flex justify-center items-center py-24">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : projects.length === 0 ? (
        <div className="text-center py-24 bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-3xl p-8 shadow-sm">
          <AlertCircle className="w-12 h-12 text-slate-400 dark:text-slate-600 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-slate-800 dark:text-slate-200">No Projects Setup</h3>
          <p className="text-slate-500 dark:text-slate-450 text-sm mt-1 mb-6">Create a project workspace to begin tracking your tasks.</p>
          <button
            onClick={() => setShowCreateProject(true)}
            className="px-6 py-2.5 bg-slate-900 dark:bg-slate-800 text-white text-sm font-semibold rounded-xl hover:bg-slate-800 dark:hover:bg-slate-750 transition"
          >
            Create First Project
          </button>
        </div>
      ) : (
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="flex flex-col lg:flex-row gap-6 overflow-x-auto pb-4">
            {['TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'DONE'].map((colId) => {
              const colTasks = getFilteredTasks(tasks[colId] || [])
              const displayName = colId.replace('_', ' ')

              return (
                <div key={colId} className="flex-1 min-w-[280px] bg-slate-100/40 dark:bg-slate-900/10 border border-slate-200/40 dark:border-slate-800/40 rounded-3xl p-4.5 flex flex-col min-h-[500px]">
                  {/* Column Header */}
                  <div className="flex items-center justify-between mb-4 px-1 select-none">
                    <h3 className="font-extrabold text-slate-850 dark:text-slate-200 text-xs capitalize flex items-center gap-2">
                      <span className={`w-2.5 h-2.5 rounded-full ${
                        colId === 'TO_DO' ? 'bg-sky-400 animate-pulse' :
                        colId === 'IN_PROGRESS' ? 'bg-amber-400 animate-pulse' :
                        colId === 'IN_REVIEW' ? 'bg-purple-400 animate-pulse' : 'bg-emerald-400'
                      }`}></span>
                      {displayName.toLowerCase()}
                      <span className="text-[10px] font-bold px-2.5 py-0.5 bg-slate-200/70 dark:bg-slate-800/70 text-slate-700 dark:text-slate-400 rounded-full">
                        {colTasks.length}
                      </span>
                    </h3>
                    <button
                      onClick={() => setActiveCreationColumn(colId)}
                      className="p-1 text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/40 dark:hover:bg-slate-800/40 rounded-lg transition"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Inline Task Creation Dialog */}
                  {activeCreationColumn === colId && (
                    <motion.div
                      initial={{ scale: 0.96, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className="bg-white dark:bg-slate-900 p-3.5 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-md mb-4 space-y-3"
                    >
                      <input
                        type="text"
                        placeholder="Task title..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs focus:outline-none focus:border-violet-500 bg-slate-50/50 dark:bg-slate-850 text-slate-800 dark:text-slate-100"
                        required
                        autoFocus
                      />
                      <div className="flex gap-1.5 justify-end select-none">
                        <button
                          onClick={() => setActiveCreationColumn(null)}
                          className="px-2.5 py-1 text-[10px] font-semibold text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleCreateTask(colId)}
                          className="px-3.5 py-1.5 bg-slate-950 dark:bg-slate-100 text-white dark:text-slate-900 rounded-xl text-[10px] font-extrabold hover:bg-slate-850 dark:hover:bg-slate-200 transition"
                        >
                          Add Task
                        </button>
                      </div>
                    </motion.div>
                  )}

                  {/* Droppable Board context */}
                  <Droppable droppableId={colId}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="flex-1 space-y-3.5 transition-colors duration-150 rounded-2xl"
                        style={{
                          backgroundColor: snapshot.isDraggingOver ? 'rgba(99, 102, 241, 0.03)' : undefined
                        }}
                      >
                        {colTasks.map((task, index) => {
                          const initials = (task.assignee?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                          return (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  onClick={() => openTaskDetails(task.id)}
                                  className={`bg-white dark:bg-slate-900 p-4 border border-slate-200/80 dark:border-slate-800/80 rounded-2xl shadow-sm hover:shadow-md dark:hover:border-slate-700/60 transition duration-200 cursor-pointer select-none group flex flex-col gap-3.5 ${
                                    snapshot.isDragging ? 'shadow-lg border-violet-400 dark:border-violet-750 rotate-1' : ''
                                  }`}
                                >
                                  <h4 className="font-bold text-slate-800 dark:text-slate-200 text-xs leading-relaxed truncate group-hover:text-violet-500 transition duration-200">
                                    {task.title}
                                  </h4>
                                  <div className="flex items-center justify-between">
                                    <div className="flex gap-2">
                                      <span className={`${
                                        PRIORITY_BADGES[task.priority] || 'badge-slate'
                                      }`}>
                                        {task.priority?.toLowerCase()}
                                      </span>
                                      {task.blockedBy !== null && task.status !== 'DONE' && task.blockedBy.status !== 'DONE' && (
                                        <span className="px-2.5 py-0.5 bg-rose-50 dark:bg-rose-950/20 text-rose-650 dark:text-rose-400 border border-rose-200 dark:border-rose-900/30 text-[9px] font-extrabold uppercase rounded-full flex items-center gap-1" title={`Blocked by: ${task.blockedBy.title}`}>
                                          <Lock className="w-2.5 h-2.5" /> Blocked
                                        </span>
                                      )}
                                    </div>
                                    <div className="w-6.5 h-6.5 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-full flex items-center justify-center text-white font-extrabold text-[9px] border border-white dark:border-slate-800 select-none" title={task.assignee?.name || 'Unassigned'}>
                                      {initials}
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          )
                        })}
                        {provided.placeholder}
                        {colTasks.length === 0 && !activeCreationColumn && (
                          <div className="flex-1 flex items-center justify-center border border-dashed border-slate-200/80 dark:border-slate-800/80 rounded-2xl py-12 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-wider">
                            No tasks
                          </div>
                        )}
                      </div>
                    )}
                  </Droppable>
                </div>
              )
            })}
          </div>
        </DragDropContext>
      )}

      {/* Task Slideover Details Modal */}
      <AnimatePresence>
        {selectedTaskId && (
          <TaskDetailModal
            key={`task-${selectedTaskId}-${modalSession}`}
            taskId={selectedTaskId}
            onClose={closeTaskDetails}
            onTaskUpdated={loadTasks}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

export default KanbanBoard
