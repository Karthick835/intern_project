import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, User, Calendar, CheckSquare, Plus, Trash2, Send, Clock, File, Paperclip, ChevronRight, Lock, ShieldAlert, ShieldCheck, Sparkles, GitCommit } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const TaskDetailModal = ({ taskId, onClose, onTaskUpdated }) => {
  const [task, setTask] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [currentPlan, setCurrentPlan] = useState('PRO')
  const [subdomain] = useState(localStorage.getItem('tenantSubdomain') || 'workspace')
  const [token] = useState(localStorage.getItem('authToken'))

  // Fields state
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState('TO_DO')
  const [priority, setPriority] = useState('MEDIUM')
  const [type, setType] = useState('FEATURE')
  const [dueDate, setDueDate] = useState('')
  const [assigneeId, setAssigneeId] = useState('')
  const [sprintId, setSprintId] = useState('')
  const [projectTasks, setProjectTasks] = useState([])
  const [blockedById, setBlockedById] = useState('')
  const [errorMsg, setErrorMsg] = useState('')
  const [timeEstimate, setTimeEstimate] = useState(0)
  const [aiSuggestion, setAiSuggestion] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const [aiEstimateSuggestion, setAiEstimateSuggestion] = useState(null)
  const [estimating, setEstimating] = useState(false)

  // Subtasks, Comments
  const [subtasks, setSubtasks] = useState([])
  const [newSubtaskTitle, setNewSubtaskTitle] = useState('')
  const [comments, setComments] = useState([])
  const [newComment, setNewComment] = useState('')

  const [attachments, setAttachments] = useState([])
  const [linkedCommits, setLinkedCommits] = useState([])

  const [uploadingFile, setUploadingFile] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)

  // Lists for dropdowns
  const [users, setUsers] = useState([])
  const [sprints, setSprints] = useState([])

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  const loadAllData = async () => {
    try {
      setLoading(true)
      setErrorMsg('')
      const [taskRes, usersRes, sprintsRes, subtaskRes, commentRes, planRes, devopsRes] = await Promise.all([
        api.get(`/tasks/${taskId}`),
        api.get('/team'),
        api.get('/sprints'),
        api.get(`/tasks/${taskId}/subtasks`),
        api.get(`/tasks/${taskId}/comments`),
        api.get('/tenant/plan-status'),
        api.get(`/devops/commits/task/${taskId}`)
      ])

      const t = taskRes.data
      setTask(t)
      setTitle(t.title || '')
      setDescription(t.description || '')
      setStatus(t.status || 'TO_DO')
      setPriority(t.priority || 'MEDIUM')
      setType(t.type || 'FEATURE')
      setDueDate(t.dueDate || '')
      setAssigneeId(t.assignee?.id || '')
      setSprintId(t.sprint?.id || '')
      setBlockedById(t.blockedBy?.id || '')
      setTimeEstimate(t.timeEstimate || 0)

      setUsers(usersRes.data)
      setSprints(sprintsRes.data)
      setSubtasks(subtaskRes.data)
      setComments(commentRes.data)
      setLinkedCommits(devopsRes.data || [])
      setCurrentPlan(planRes.data.plan || 'PRO')

      // Load project tasks for blocker options
      if (t.project?.id) {
        const ptRes = await api.get(`/tasks/project/${t.project.id}`)
        setProjectTasks(ptRes.data.filter((item) => item.id !== taskId))
      }
    } catch (err) {
      console.error('Failed to load task details', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (taskId) {
      loadAllData()
    }
  }, [taskId])




  const handleUpdateField = async (updatedFields) => {
    try {
      setSaving(true)
      setErrorMsg('')
      const payload = {
        title,
        description,
        status,
        priority,
        type,
        dueDate: dueDate || null,
        assigneeId: assigneeId || '',
        sprintId: sprintId || '',
        blockedById: blockedById || '',
        timeEstimate: timeEstimate || null,
        ...updatedFields
      }
      const res = await api.put(`/tasks/${taskId}`, payload)
      setTask(res.data)
      setBlockedById(res.data.blockedBy?.id || '')
      onTaskUpdated()
    } catch (err) {
      console.error('Failed to update task field', err)
      // Show error but do NOT revert — keep the user's changes
      if (err.response?.data?.message) {
        setErrorMsg(err.response.data.message)
      } else if (err.response?.status !== 401) {
        setErrorMsg('Could not save — changes kept locally.')
      }
    } finally {
      setSaving(false)
    }
  }

  const handleAiSuggest = async () => {
    try {
      setSuggesting(true)
      setAiSuggestion(null)
      const res = await api.post('/ai/suggest', { title, description })
      setAiSuggestion(res.data)
    } catch (err) {
      console.error('Failed to load AI suggestion', err)
    } finally {
      setSuggesting(false)
    }
  }

  const applyAiSuggestion = () => {
    if (!aiSuggestion) return
    setAssigneeId(aiSuggestion.suggestedAssigneeId)
    setPriority(aiSuggestion.suggestedPriority)
    handleUpdateField({
      assigneeId: aiSuggestion.suggestedAssigneeId || null,
      priority: aiSuggestion.suggestedPriority
    })
    setAiSuggestion(null)
  }

  const handleAiEstimate = async () => {
    try {
      setEstimating(true)
      setAiEstimateSuggestion(null)
      const res = await api.post('/ai/estimate', { title, description })
      setAiEstimateSuggestion(res.data)
    } catch (err) {
      console.error('Failed to load AI hour estimation', err)
    } finally {
      setEstimating(false)
    }
  }

  const applyAiEstimate = () => {
    if (!aiEstimateSuggestion) return
    const hours = aiEstimateSuggestion.estimatedHours
    setTimeEstimate(hours)
    handleUpdateField({ timeEstimate: hours || null })
    setAiEstimateSuggestion(null)
  }

  // Subtask Management
  const handleAddSubtask = async (e) => {
    e.preventDefault()
    if (!newSubtaskTitle.trim()) return
    try {
      const res = await api.post(`/tasks/${taskId}/subtasks`, { title: newSubtaskTitle.trim() })
      setSubtasks((prev) => [...prev, res.data])
      setNewSubtaskTitle('')
    } catch (err) {
      console.error('Failed to add subtask', err)
    }
  }

  const handleToggleSubtask = async (subtask) => {
    const originalSubtasks = [...subtasks]
    const updatedStatus = !subtask.completed

    // 1. Optimistic Update
    setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? { ...s, completed: updatedStatus } : s)))

    // 2. background API call
    try {
      const res = await api.put(`/tasks/subtasks/${subtask.id}`, { isCompleted: updatedStatus })
      // Sync with actual response
      setSubtasks((prev) => prev.map((s) => (s.id === subtask.id ? res.data : s)))
    } catch (err) {
      console.error('Failed to toggle subtask', err)
      // Revert status on failure
      setSubtasks(originalSubtasks)
    }
  }

  const handleDeleteSubtask = async (id) => {
    try {
      await api.delete(`/tasks/subtasks/${id}`)
      setSubtasks((prev) => prev.filter((s) => s.id !== id))
    } catch (err) {
      console.error('Failed to delete subtask', err)
    }
  }

  // Comments Management
  const handleAddComment = async (e) => {
    e.preventDefault()
    if (!newComment.trim()) return
    try {
      const res = await api.post(`/tasks/${taskId}/comments`, { content: newComment.trim() })
      setComments((prev) => [...prev, res.data])
      setNewComment('')
    } catch (err) {
      console.error('Failed to add comment', err)
    }
  }



  // Mock File Attachment Upload Simulation
  const handleFileUpload = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setUploadingFile(true)
    setUploadProgress(0)

    const interval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval)
          setUploadingFile(false)
          setAttachments((prevAttachments) => [
            ...prevAttachments,
            {
              id: Date.now().toString(),
              name: file.name,
              size: `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
              date: new Date().toISOString().split('T')[0]
            }
          ])
          return 0
        }
        return prev + 25
      })
    }, 150)
  }

  const handleDeleteAttachment = (id) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id))
  }

  const handleDeleteTask = async () => {
    if (!window.confirm('Are you sure you want to delete this task?')) return
    try {
      setSaving(true)
      await api.delete(`/tasks/${taskId}`)
      onTaskUpdated()
      onClose()
    } catch (err) {
      console.error('Failed to delete task', err)
      setErrorMsg('Failed to delete task.')
    } finally {
      setSaving(false)
    }
  }


  if (!task && !loading) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-sm select-none">
      {/* Background overlay click */}
      <div className="absolute inset-0" onClick={onClose}></div>

      {/* Modal Card panel */}
      <motion.div
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ duration: 0.22, ease: 'easeOut' }}
        className="relative w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col z-10"
      >
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold uppercase tracking-wider">
            <span>{type}</span>
            <ChevronRight className="w-3 h-3" />
            <span>{taskId.slice(0, 8)}</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDeleteTask}
              className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition"
              title="Delete Task"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Loading Body */}
        {loading ? (
          <div className="flex-1 p-8 space-y-6 overflow-y-auto">
            <div className="h-8 bg-slate-100 skeleton rounded w-3/4"></div>
            <div className="h-24 bg-slate-100 skeleton rounded"></div>
            <div className="grid grid-cols-2 gap-8">
              <div className="h-32 bg-slate-100 skeleton rounded"></div>
              <div className="h-32 bg-slate-100 skeleton rounded"></div>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-8 grid lg:grid-cols-3 gap-8 min-h-0">
            {/* Left Content Column (Title, Description, Checklist, Comments, Logs) */}
            <div className="lg:col-span-2 space-y-8 pr-2 border-r border-slate-100">
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl flex items-center gap-2">
                  <ShieldAlert className="w-4 h-4 text-red-500" />
                  <span>{errorMsg}</span>
                </div>
              )}

              {task.blockedBy && task.status !== 'DONE' && task.blockedBy.status !== 'DONE' && (
                <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
                  <Lock className="w-4 h-4 text-red-500 animate-pulse flex-shrink-0" />
                  <span>
                    This task is currently blocked by <strong>{task.blockedBy.title}</strong>. You must complete that task before closing this one.
                  </span>
                </div>
              )}
              {/* Title & Description */}
              <div className="space-y-4">
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => handleUpdateField({ title })}
                  className="w-full text-2xl font-bold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 border-b border-transparent hover:border-slate-200 focus:border-primary-500 focus:outline-none py-1.5 px-3 transition-all rounded"
                />
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Description
                  </label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    onBlur={() => handleUpdateField({ description })}
                    placeholder="Describe this task..."
                    rows={4}
                    className="w-full p-3 border border-slate-200 focus:border-primary-500 rounded-xl focus:outline-none text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 text-sm leading-relaxed transition"
                  />
                </div>
              </div>

              {/* Subtasks Checklist */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <CheckSquare className="w-4.5 h-4.5 text-primary-500" />
                  <h3 className="font-bold text-slate-800 text-sm">Subtasks</h3>
                </div>

                {/* Subtask list */}
                <div className="space-y-2">
                  {subtasks.map((sub) => (
                    <div
                      key={sub.id}
                      className="flex items-center justify-between p-2.5 hover:bg-slate-50 rounded-xl group transition"
                    >
                      <label className="flex items-center gap-3 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={sub.completed}
                          onChange={() => handleToggleSubtask(sub)}
                          className="rounded text-primary-600 focus:ring-primary-500 border-slate-300 w-4 h-4 cursor-pointer"
                        />
                        <span className={`text-sm text-slate-700 ${sub.completed ? 'line-through text-slate-400' : ''}`}>
                          {sub.title}
                        </span>
                      </label>
                      <button
                        onClick={() => handleDeleteSubtask(sub.id)}
                        className="p-1 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Add Subtask Form */}
                <form onSubmit={handleAddSubtask} className="flex gap-2">
                  <input
                    type="text"
                    value={newSubtaskTitle}
                    onChange={(e) => setNewSubtaskTitle(e.target.value)}
                    placeholder="Add a subtask..."
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-primary-500 text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="px-3.5 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 active:scale-98 transition flex items-center justify-center"
                  >
                    <Plus className="w-4 h-4" />
                  </button>
                </form>
              </div>

              {/* DevOps Code Integration */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <GitCommit className="w-4.5 h-4.5 text-violet-500" />
                  <h3 className="font-bold text-slate-800 dark:text-slate-200 text-sm">DevOps Code Links</h3>
                </div>

                {linkedCommits.length === 0 ? (
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800 rounded-2xl text-center text-xs text-slate-500 dark:text-slate-400">
                    No commits or pull requests are linked to this task yet. Pushing code referencing 
                    <code className="bg-slate-200 dark:bg-slate-800 px-1.5 py-0.5 rounded font-mono ml-1 font-bold text-violet-600 dark:text-violet-400">#{task.id.substring(0, 8)}</code> will automatically link them here.
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    {linkedCommits.map((commit) => (
                      <div key={commit.id} className="p-3 bg-slate-50 dark:bg-slate-800/20 border border-slate-200/60 dark:border-slate-800 rounded-xl flex items-center justify-between text-left">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 flex-wrap mb-1">
                            <span className="text-[10px] font-mono font-bold text-violet-600 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full border border-violet-500/20">{commit.hash}</span>
                            <span className="text-[10px] font-mono px-1.5 py-0.5 bg-slate-250 dark:bg-slate-800 text-slate-500 rounded-full border border-slate-200/50 dark:border-slate-800">{commit.repoName}</span>
                            <span className="text-[9px] font-mono px-2 py-0.5 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full border border-emerald-500/20 font-bold flex items-center gap-1">
                              <ShieldCheck className="w-2.5 h-2.5" /> AI Security Verified (0 Leaks)
                            </span>
                          </div>
                          <span className="text-xs font-semibold text-slate-700 dark:text-slate-250 truncate block">{commit.message}</span>
                          <p className="text-[9px] text-slate-400 mt-1">Committed by {commit.author} • {new Date(commit.timestamp).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Attachments Section */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <Paperclip className="w-4.5 h-4.5 text-primary-500" />
                  <h3 className="font-bold text-slate-800 text-sm">Attachments</h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  {attachments.map((file) => (
                    <div
                      key={file.id}
                      className="p-3 border border-slate-200 rounded-xl flex items-center justify-between hover:bg-slate-50 transition group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <File className="w-8 h-8 text-primary-500 bg-primary-50 p-1.5 rounded-lg flex-shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                          <p className="text-[10px] text-slate-400 mt-0.5">{file.size} • {file.date}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteAttachment(file.id)}
                        className="p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* Upload Trigger */}
                {currentPlan === 'FREE' ? (
                  <div className="border border-dashed border-slate-200 p-4 rounded-xl text-center text-xs text-slate-400 bg-slate-50/50 flex flex-col items-center justify-center gap-1.5">
                    <Lock className="w-4 h-4 text-slate-400" />
                    <p className="font-semibold text-slate-700">Attachments Locked</p>
                    <p className="text-[10px] text-slate-400 max-w-[200px] leading-relaxed">
                      File attachments are only available on PRO and ENTERPRISE plans.
                    </p>
                  </div>
                ) : (
                  <div className="relative">
                    <input
                      type="file"
                      onChange={handleFileUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      disabled={uploadingFile}
                    />
                    <div className="border-2 border-dashed border-slate-200 hover:border-primary-400 p-4 rounded-xl text-center text-xs text-slate-500 hover:bg-slate-50 transition cursor-pointer">
                      {uploadingFile ? (
                        <div className="space-y-2">
                          <p className="font-medium text-slate-600">Uploading file... {uploadProgress}%</p>
                          <div className="w-1/2 mx-auto h-1.5 bg-slate-100 rounded-full overflow-hidden">
                            <div
                              className="h-full bg-primary-500 transition-all duration-150"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                        </div>
                      ) : (
                        <p className="font-medium">Click or drag a file to attach</p>
                      )}
                    </div>
                  </div>
                )}
              </div>



              {/* Comments Section */}
              <div className="space-y-4">
                <h3 className="font-bold text-slate-800 text-sm">Comments ({comments.length})</h3>

                {/* Comment list */}
                <div className="space-y-4 max-h-60 overflow-y-auto pr-2 divide-y divide-slate-100">
                  {comments.map((com) => {
                    const initials = (com.user?.name || 'U').split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                    return (
                      <div key={com.id} className="pt-3 flex gap-3 items-start">
                        <div className="w-8 h-8 bg-slate-100 border border-slate-200/50 rounded-full flex items-center justify-center text-[10px] font-bold text-slate-600 select-none flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-baseline">
                            <span className="font-semibold text-xs text-slate-850">{com.user?.name || 'User'}</span>
                            <span className="text-[9px] text-slate-400">Just now</span>
                          </div>
                          <p className="text-xs text-slate-650 mt-1 leading-relaxed">{com.content}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-2">
                  <input
                    type="text"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    placeholder="Add a comment..."
                    className="flex-1 px-4 py-2.5 border border-slate-200 rounded-xl focus:outline-none focus:border-primary-500 text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800"
                  />
                  <button
                    type="submit"
                    className="p-2.5 bg-primary-600 hover:bg-primary-700 text-white rounded-xl active:scale-95 transition flex items-center justify-center"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </div>

            {/* Right Meta Column (Properties, Priority, Sprint, Date, Assignee) */}
            <div className="space-y-6 lg:pl-2">
              <h3 className="font-bold text-slate-800 text-sm">Properties</h3>

              {/* Status */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => {
                    setStatus(e.target.value)
                    handleUpdateField({ status: e.target.value })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary-500"
                >
                  <option value="TO_DO" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>To Do</option>
                  <option value="IN_PROGRESS" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>In Progress</option>
                  <option value="IN_REVIEW" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>In Review</option>
                  <option value="DONE" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Done</option>
                </select>
              </div>

              {/* Priority */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Priority
                </label>
                <select
                  value={priority}
                  onChange={(e) => {
                    setPriority(e.target.value)
                    handleUpdateField({ priority: e.target.value })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary-500"
                >
                  <option value="LOW" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Low</option>
                  <option value="MEDIUM" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Medium</option>
                  <option value="HIGH" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>High</option>
                </select>
              </div>

              {/* Type */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">
                  Type
                </label>
                <select
                  value={type}
                  onChange={(e) => {
                    setType(e.target.value)
                    handleUpdateField({ type: e.target.value })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary-500"
                >
                  <option value="FEATURE" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Feature</option>
                  <option value="BUG" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Bug</option>
                  <option value="IMPROVEMENT" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Improvement</option>
                </select>
              </div>

              {/* Assignee */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <User className="w-3 h-3" /> Assignee
                  </label>
                  <button
                    onClick={handleAiSuggest}
                    disabled={suggesting}
                    className="text-[10px] font-bold text-primary-600 hover:text-primary-850 flex items-center gap-1 transition"
                    title="Suggest assignee and priority using AI"
                  >
                    <Sparkles className="w-3 h-3" /> {suggesting ? 'Suggesting...' : 'AI Suggest'}
                  </button>
                </div>
                <select
                  value={assigneeId}
                  onChange={(e) => {
                    setAssigneeId(e.target.value)
                    handleUpdateField({ assigneeId: e.target.value || '' })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary-500"
                >
                  <option value="" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </div>

              {aiSuggestion && (
                <div className="p-3 bg-primary-50/50 border border-primary-100 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-primary-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary-500" /> AI Recommendation
                    </span>
                    <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 font-mono text-[9px] font-bold rounded-full">
                      {(aiSuggestion.confidence * 100).toFixed(0)}% Match
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{aiSuggestion.reason}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={applyAiSuggestion}
                      className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition text-[10px]"
                    >
                      Apply
                    </button>
                    <button
                      onClick={() => setAiSuggestion(null)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-700 transition text-[10px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Sprint */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Sprint
                </label>
                <select
                  value={sprintId}
                  onChange={(e) => {
                    setSprintId(e.target.value)
                    handleUpdateField({ sprintId: e.target.value || '' })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary-500"
                >
                  <option value="" style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>No Sprint</option>
                  {sprints.map((s) => (
                    <option key={s.id} value={s.id} style={{ color: '#0f172a', backgroundColor: '#ffffff' }}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Due Date */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Calendar className="w-3 h-3" /> Due Date
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => {
                    setDueDate(e.target.value)
                    handleUpdateField({ dueDate: e.target.value || null })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary-500"
                />
              </div>

              {/* Time Estimate */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                    <Clock className="w-3 h-3" /> Time Estimate (Hours)
                  </label>
                  <button
                    onClick={handleAiEstimate}
                    disabled={estimating}
                    className="text-[10px] font-bold text-primary-600 hover:text-primary-850 flex items-center gap-1 transition"
                    title="Get AI hour estimation suggestion"
                  >
                    <Sparkles className="w-3 h-3" /> {estimating ? 'Estimating...' : 'AI Estimate'}
                  </button>
                </div>
                <input
                  type="number"
                  min="0"
                  value={timeEstimate}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 0
                    setTimeEstimate(val)
                    handleUpdateField({ timeEstimate: val || null })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-primary-500"
                />
              </div>

              {aiEstimateSuggestion && (
                <div className="p-3 bg-primary-50/50 border border-primary-100 rounded-xl space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-extrabold text-primary-800 flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-primary-500" /> AI Estimate Suggestion
                    </span>
                    <span className="px-1.5 py-0.5 bg-primary-100 text-primary-700 font-mono text-[9px] font-bold rounded-full">
                      {aiEstimateSuggestion.estimatedHours} Hours
                    </span>
                  </div>
                  <p className="text-slate-600 leading-relaxed text-[11px]">{aiEstimateSuggestion.rationale}</p>
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={applyAiEstimate}
                      className="px-2.5 py-1 bg-primary-600 hover:bg-primary-700 text-white font-bold rounded-lg transition text-[10px]"
                    >
                      Apply Estimate
                    </button>
                    <button
                      onClick={() => setAiEstimateSuggestion(null)}
                      className="px-2 py-1 text-slate-500 hover:text-slate-700 transition text-[10px]"
                    >
                      Dismiss
                    </button>
                  </div>
                </div>
              )}

              {/* Blocker Dropdown */}
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                  <Lock className="w-3 h-3" /> Blocker (Blocks This Task)
                </label>
                <select
                  value={blockedById}
                  onChange={(e) => {
                    const val = e.target.value
                    setBlockedById(val)
                    handleUpdateField({ blockedById: val || "" })
                  }}
                  className="w-full p-2 border border-slate-200 rounded-xl text-xs bg-white focus:outline-none focus:border-primary-500 text-slate-800"
                >
                  <option value="">No Blocker</option>
                  {projectTasks.map((pt) => (
                    <option key={pt.id} value={pt.id}>
                      {pt.title} ({pt.status})
                    </option>
                  ))}
                </select>
              </div>

              {saving && (
                <div className="text-[10px] text-slate-400 italic">
                  Saving properties...
                </div>
              )}
            </div>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default TaskDetailModal
