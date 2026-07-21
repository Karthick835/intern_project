import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  GitBranch, GitCommit, GitPullRequest, Terminal, Play, CheckCircle, 
  XCircle, Loader, Cpu, Plus, Code, RefreshCw, Layers, ArrowUpRight, Link, X,
  Globe, Copy, Check, Zap, ShieldCheck, Sparkles
} from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const DevOps = () => {
  const [activeTab, setActiveTab] = useState('pipelines') // 'repos' | 'commits' | 'pipelines'
  const [repos, setRepos] = useState([])
  const [commits, setCommits] = useState([])
  const [pipelines, setPipelines] = useState([])
  const [tasks, setTasks] = useState([])
  const [users, setUsers] = useState([])
  const userName = localStorage.getItem('userName') || 'Developer'

  // Repository Creation Modal states
  const [showCreateRepoModal, setShowCreateRepoModal] = useState(false)
  const [newRepoName, setNewRepoName] = useState('')
  const [newRepoLang, setNewRepoLang] = useState('React / Vite')
  const [newRepoDesc, setNewRepoDesc] = useState('')
  const [creatingRepo, setCreatingRepo] = useState(false)
  const [repoError, setRepoError] = useState('')
  
  // Simulation Form states
  const [simRepo, setSimRepo] = useState('auth-service')
  const [simAuthor, setSimAuthor] = useState(userName)
  const [selectedTaskPrefix, setSelectedTaskPrefix] = useState('')
  const [simMessage, setSimMessage] = useState('')
  const [simulating, setSimulating] = useState(false)
  const [simResult, setSimResult] = useState(null)

  // Pipeline Run states
  const [selectedPipeline, setSelectedPipeline] = useState(null)
  const [pipelineRepo, setPipelineRepo] = useState('auth-service')
  const [pipelineBranch, setPipelineBranch] = useState('main')
  const [runningPipelineId, setRunningPipelineId] = useState(null)
  const [pipelineStage, setPipelineStage] = useState(0) // 0 to 5
  const [terminalLogs, setTerminalLogs] = useState([])

  // GitHub Real Webhook Tester states
  const [copiedWebhook, setCopiedWebhook] = useState(false)
  const [testWebhookMessage, setTestWebhookMessage] = useState('fix: resolve database connection timeout issue #')
  const [testingWebhook, setTestingWebhook] = useState(false)
  const [webhookTestResult, setWebhookTestResult] = useState(null)

  // AI Code Review Modal states
  const [selectedCommitReview, setSelectedCommitReview] = useState(null)
  const [loadingReviewHash, setLoadingReviewHash] = useState(null)

  // Repository Code Inspector states
  const [selectedRepoDetails, setSelectedRepoDetails] = useState(null)
  const [loadingRepoDetails, setLoadingRepoDetails] = useState(null)
  const [selectedRepoFile, setSelectedRepoFile] = useState(null)
  const [activeRepoBranch, setActiveRepoBranch] = useState('main')

  const handleInspectRepo = async (repoName) => {
    setLoadingRepoDetails(repoName)
    try {
      const res = await api.get(`/devops/repos/${repoName}/files`)
      setSelectedRepoDetails(res.data)
      if (res.data.files && res.data.files.length > 0) {
        setSelectedRepoFile(res.data.files[0])
      }
      setActiveRepoBranch(res.data.branches?.[0] || 'main')
    } catch (err) {
      console.error('Failed to inspect repo files', err)
    } finally {
      setLoadingRepoDetails(null)
    }
  }

  const handleRunAiCodeReview = async (commit) => {
    setLoadingReviewHash(commit.hash)
    try {
      const res = await api.post('/devops/ai-review', {
        hash: commit.hash,
        message: commit.message,
        repoName: commit.repoName
      })
      setSelectedCommitReview(res.data)
    } catch (err) {
      console.error('Failed to run AI Code Review', err)
    } finally {
      setLoadingReviewHash(null)
    }
  }

  const terminalEndRef = useRef(null)
  const token = localStorage.getItem('authToken')
  const subdomain = localStorage.getItem('tenantSubdomain') || 'acmecompany'

  const webhookEndpointUrl = `${window.location.protocol}//${window.location.hostname}:8080/api/webhooks/github?tenant=${subdomain}`

  const handleCopyWebhookUrl = () => {
    navigator.clipboard.writeText(webhookEndpointUrl)
    setCopiedWebhook(true)
    setTimeout(() => setCopiedWebhook(false), 2000)
  }

  const handleTriggerRealWebhookTest = async () => {
    setTestingWebhook(true)
    setWebhookTestResult(null)
    try {
      const taskPrefix = selectedTaskPrefix || (tasks[0] ? tasks[0].id.substring(0, 8) : 'af80ea80')
      const fullMessage = testWebhookMessage.includes('#')
        ? testWebhookMessage.replace('#', `#${taskPrefix}`)
        : `${testWebhookMessage} #${taskPrefix}`

      const payload = {
        repository: {
          name: simRepo || 'auth-service',
          full_name: `acme-org/${simRepo || 'auth-service'}`
        },
        commits: [
          {
            id: UUID_Generator(),
            message: fullMessage,
            author: { name: simAuthor || 'GitHub Developer', username: (simAuthor || 'developer').toLowerCase().replace(/\s+/g, '') },
            timestamp: new Date().toISOString()
          }
        ]
      }

      const res = await axios.post(
        `${getApiBase()}/webhooks/github?tenant=${subdomain}`,
        payload,
        { headers: { 'X-GitHub-Event': 'push', 'Content-Type': 'application/json' } }
      )

      setWebhookTestResult({ success: true, data: res.data })
      fetchData() // Refresh commits list and tasks
    } catch (err) {
      console.error('Webhook test error', err)
      setWebhookTestResult({ success: false, error: err.response?.data?.message || err.message })
    } finally {
      setTestingWebhook(false)
    }
  }

  const UUID_Generator = () => {
    return 'f' + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10) + Math.random().toString(16).substring(2, 10)
  }

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  // Load DevOps data
  const fetchData = async () => {
    try {
      const [reposRes, commitsRes, pipesRes, tasksRes, usersRes] = await Promise.all([
        api.get('/devops/repos'),
        api.get('/devops/commits'),
        api.get('/devops/pipelines'),
        api.get('/tasks'),
        api.get('/team')
      ])
      
      setRepos(reposRes.data)
      setCommits(commitsRes.data)
      setPipelines(pipesRes.data)
      setTasks(tasksRes.data)
      setUsers(usersRes.data)
      
      if (tasksRes.data.length > 0 && !selectedTaskPrefix) {
        setSelectedTaskPrefix(tasksRes.data[0].id.substring(0, 8))
      }
    } catch (err) {
      console.error('Failed to load DevOps board', err)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Auto-scroll terminal logs
  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' })
    }
  }, [terminalLogs])

  // Pre-fill commit message when selecting task
  useEffect(() => {
    if (selectedTaskPrefix) {
      const task = tasks.find(t => t.id.startsWith(selectedTaskPrefix))
      if (task) {
        setSimMessage(`feat: update modules for ${task.title.toLowerCase()} #${selectedTaskPrefix}`)
      }
    }
  }, [selectedTaskPrefix, tasks])

  // Submit simulated Commit
  const handleSimulateCommit = async (e) => {
    e.preventDefault()
    if (!simMessage.trim()) return
    setSimulating(true)
    setSimResult(null)
    try {
      const res = await api.post('/devops/commit', {
        repoName: simRepo,
        author: simAuthor,
        message: simMessage.trim()
      })
      
      setSimResult({
        type: 'success',
        text: `Commit pushed! ${res.data.linkedTaskId ? 'Linked task was automatically updated!' : 'Commit registered in logs.'}`
      })
      
      // Reload lists
      fetchData()
    } catch (err) {
      console.error(err)
      setSimResult({
        type: 'error',
        text: 'Failed to push simulated commit.'
      })
    } finally {
      setSimulating(false)
    }
  }

  // Visual Pipeline Simulator Steps
  const PIPELINE_STAGES = [
    { name: 'Lint', logStart: 'Running ESLint validation code check...', logSuccess: 'ESLint check: 0 errors, 2 warnings.' },
    { name: 'Compile', logStart: 'Compiling module packages...', logSuccess: 'Build successful. Compiled index-bundle.js (1.2MB).' },
    { name: 'Test Suite', logStart: 'Running unit test checks (JUnit/Jest)...', logSuccess: 'Jest: 42 tests passed, 0 failed. Coverage 94.2%.' },
    { name: 'Security Scan', logStart: 'Running OWASP Dependency scan check...', logSuccess: 'OWASP Scan: 0 high, 2 low vulnerabilities found.' },
    { name: 'Deploy', logStart: 'Syncing assets to staging server...', logSuccess: 'Staging deployment successful: http://staging.workspace.internal/' }
  ]

  const runPipelineSimulation = (runId) => {
    setRunningPipelineId(runId)
    setPipelineStage(0)
    setTerminalLogs(['[SYSTEM] Initializing build environment...', '[SYSTEM] Fetching main repository dependencies...'])
    
    let currentStage = 0
    
    const interval = setInterval(() => {
      if (currentStage < PIPELINE_STAGES.length) {
        const stage = PIPELINE_STAGES[currentStage]
        setTerminalLogs(prev => [
          ...prev,
          `[STAGE: ${stage.name}] ${stage.logStart}`,
          `[PROCESS] Executing node job for ${stage.name.toLowerCase()}...`
        ])

        // Success logs delay
        setTimeout(() => {
          setTerminalLogs(prev => [
            ...prev,
            `[STAGE: ${stage.name}] ${stage.logSuccess} ✔`
          ])
        }, 1000)

        currentStage++
        setPipelineStage(currentStage)
      } else {
        clearInterval(interval)
        // Complete on backend
        api.post(`/devops/pipeline/${runId}/complete`, {
          status: 'SUCCESS',
          duration: '1m 20s'
        }).then(() => {
          fetchData()
          setRunningPipelineId(null)
          setTerminalLogs(prev => [...prev, '[SYSTEM] Pipeline Run finished successfully. Deployment Complete. ✔'])
        })
      }
    }, 2500)
  }

  const handleTriggerPipeline = async () => {
    try {
      const res = await api.post('/devops/pipeline/run', {
        repoName: pipelineRepo,
        branch: pipelineBranch,
        triggeredBy: simAuthor
      })
      // Start the simulation run
      runPipelineSimulation(res.data.id)
      setActiveTab('pipelines')
    } catch (err) {
      console.error(err)
    }
  }

  const handleCreateRepo = async (e) => {
    e.preventDefault()
    if (!newRepoName.trim()) return
    setCreatingRepo(true)
    setRepoError('')
    try {
      await api.post('/devops/repos', {
        name: newRepoName.trim(),
        lang: newRepoLang,
        desc: newRepoDesc.trim()
      })
      // Clear forms
      setNewRepoName('')
      setNewRepoLang('React / Vite')
      setNewRepoDesc('')
      setShowCreateRepoModal(false)
      // Reload repos
      fetchData()
    } catch (err) {
      console.error(err)
      setRepoError(err.response?.data?.error || 'Failed to create repository')
    } finally {
      setCreatingRepo(false)
    }
  }

  return (
    <div className="min-h-[calc(100vh-80px)] max-w-7xl mx-auto flex flex-col lg:flex-row gap-6 p-1 md:p-4 select-none">
      
      {/* ─── LEFT COLUMN: SIMULATORS & REPOS ─── */}
      <div className="w-full lg:w-96 flex flex-col gap-6">
        
        {/* Commit/PR Simulator Widget */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-violet-400" />
            <h2 className="font-extrabold text-white text-base tracking-tight">Git Commit Simulator</h2>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Simulate a developer pushing code changes. Link it to any task by choosing its ID prefix below to trigger automated Kanban board status transitions!
          </p>

          <form onSubmit={handleSimulateCommit} className="space-y-4 text-left">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Repository</label>
              <select
                value={simRepo}
                onChange={(e) => setSimRepo(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
              >
                {repos.map(r => (
                  <option key={r.name} value={r.name} className="bg-slate-900">{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Developer (Author)</label>
              <select
                value={simAuthor}
                onChange={(e) => setSimAuthor(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
              >
                {users.map(u => (
                  <option key={u.id} value={u.name} className="bg-slate-900">{u.name}</option>
                ))}
                {!users.some(u => u.name === userName) && (
                  <option value={userName} className="bg-slate-900">{userName} (You)</option>
                )}
              </select>
            </div>

            {tasks.length > 0 && (
              <div>
                <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Target Kanban Task</label>
                <select
                  value={selectedTaskPrefix}
                  onChange={(e) => setSelectedTaskPrefix(e.target.value)}
                  className="w-full p-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
                >
                  {tasks.map(t => (
                    <option key={t.id} value={t.id.substring(0, 8)} className="bg-slate-900">
                      #{t.id.substring(0, 8)} - {t.title} ({t.status.replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Commit Message</label>
              <input
                type="text"
                value={simMessage}
                onChange={(e) => setSimMessage(e.target.value)}
                placeholder="Message containing task ID..."
                className="w-full px-3 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none placeholder:text-slate-600"
                required
              />
            </div>

            <button
              type="submit"
              disabled={simulating}
              className="w-full py-3 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              {simulating ? <Loader className="w-4 h-4 animate-spin" /> : <GitCommit className="w-4 h-4" />}
              Push Git Commit
            </button>

            {simResult && (
              <div className={`p-3.5 rounded-2xl border text-[11px] leading-relaxed flex items-start gap-2.5 ${
                simResult.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
              }`}>
                {simResult.type === 'success' ? <CheckCircle className="w-4 h-4 flex-shrink-0 mt-0.5" /> : <XCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />}
                <p className="flex-1">{simResult.text}</p>
              </div>
            )}
          </form>
        </div>

        {/* Trigger Pipeline Run Widget */}
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4">
          <div className="flex items-center gap-2">
            <Cpu className="w-5 h-5 text-indigo-400" />
            <h2 className="font-extrabold text-white text-base tracking-tight">CI/CD Run Dispatcher</h2>
          </div>
          
          <div className="space-y-3.5 text-left">
            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Repository</label>
              <select
                value={pipelineRepo}
                onChange={(e) => setPipelineRepo(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
              >
                {repos.map(r => (
                  <option key={r.name} value={r.name} className="bg-slate-900">{r.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Branch</label>
              <select
                value={pipelineBranch}
                onChange={(e) => setPipelineBranch(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
              >
                <option value="main" className="bg-slate-900">main (production)</option>
                <option value="staging" className="bg-slate-900">staging (integration)</option>
                <option value="dev" className="bg-slate-900">dev (feature-auth)</option>
              </select>
            </div>

            <button
              onClick={handleTriggerPipeline}
              disabled={runningPipelineId !== null}
              className="w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-violet-500/20 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              Trigger CI/CD Pipeline
            </button>
          </div>
        </div>

      </div>

      {/* ─── RIGHT COLUMN: PIPELINES, COMMITS, REPOS BOARD ─── */}
      <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-6">
        
        {/* Navigation Tabs */}
        <div className="flex bg-white/5 p-1 rounded-xl border border-white/5 self-start select-none">
          <button
            onClick={() => setActiveTab('pipelines')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'pipelines' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            CI/CD Pipelines
          </button>
          <button
            onClick={() => setActiveTab('commits')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'commits' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Git Commits
          </button>
          <button
            onClick={() => setActiveTab('repos')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'repos' ? 'bg-white text-slate-900 shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Code Repos
          </button>
          <button
            onClick={() => setActiveTab('webhooks')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'webhooks' ? 'bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow' : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Globe className="w-3.5 h-3.5" /> Real GitHub Webhooks
          </button>
        </div>

        <AnimatePresence mode="wait">
          
          {/* TAB 1: CI/CD PIPELINES */}
          {activeTab === 'pipelines' && (
            <motion.div
              key="pipelines"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 flex-1 flex flex-col"
            >
              {/* Visual Pipeline Animator (Active Build) */}
              {runningPipelineId && (
                <div className="p-5 bg-slate-950/40 border border-violet-500/20 rounded-2xl flex flex-col gap-5 relative overflow-hidden select-none">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Loader className="w-4 h-4 text-violet-400 animate-spin" />
                      <span className="text-white text-xs font-bold">Live Build Execution</span>
                    </div>
                    <span className="text-[10px] text-violet-400 font-mono">ID: {runningPipelineId}</span>
                  </div>

                  {/* Flow chart nodes */}
                  <div className="flex items-center justify-between gap-2 max-w-lg mx-auto w-full py-2 relative">
                    {/* Connecting line */}
                    <div className="absolute left-0 right-0 top-1/2 h-[2px] bg-white/5 -translate-y-1/2 z-0" />
                    
                    {PIPELINE_STAGES.map((stage, idx) => {
                      const isActive = pipelineStage === idx
                      const isCompleted = pipelineStage > idx
                      return (
                        <div key={idx} className="relative z-10 flex flex-col items-center gap-2">
                          <div className={`w-8 h-8 rounded-xl border flex items-center justify-center transition-all duration-300 ${
                            isCompleted 
                              ? 'bg-emerald-500/25 border-emerald-500/40 text-emerald-400' 
                              : isActive 
                                ? 'bg-violet-600/30 border-violet-500 animate-pulse text-violet-300' 
                                : 'bg-slate-900 border-white/10 text-slate-500'
                          }`}>
                            {isCompleted ? (
                              <CheckCircle className="w-4.5 h-4.5" />
                            ) : (
                              <span className="text-xs font-black">{idx + 1}</span>
                            )}
                          </div>
                          <span className={`text-[9px] font-bold ${
                            isActive ? 'text-violet-400' : isCompleted ? 'text-emerald-400' : 'text-slate-500'
                          }`}>{stage.name}</span>
                        </div>
                      )
                    })}
                  </div>

                  {/* Scrolling terminal window */}
                  <div className="bg-black/80 border border-white/5 rounded-xl p-4 font-mono text-[10px] text-slate-300 h-40 overflow-y-auto flex flex-col text-left space-y-1 select-text scrollbar-thin">
                    <div className="flex items-center gap-1.5 text-slate-500 border-b border-white/5 pb-2 mb-2 select-none">
                      <Terminal className="w-3.5 h-3.5" />
                      <span>build-pipeline-executor.sh</span>
                    </div>
                    {terminalLogs.map((logLine, i) => (
                      <p key={i} className={
                        logLine.startsWith('[SYSTEM]') ? 'text-indigo-400' :
                        logLine.includes('✔') ? 'text-emerald-400' :
                        logLine.startsWith('[STAGE') ? 'text-white font-bold' : 'text-slate-400'
                      }>{logLine}</p>
                    ))}
                    <div ref={terminalEndRef} />
                  </div>
                </div>
              )}

              {/* Pipelines Run History List */}
              <div className="space-y-3 overflow-y-auto flex-1 max-h-[400px] pr-1">
                <h3 className="font-extrabold text-white text-xs tracking-tight border-b border-white/5 pb-2 mb-3 text-left">Pipeline Run History</h3>
                {pipelines.length === 0 ? (
                  <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 text-slate-400 text-xs">
                    No pipeline runs executed yet. Click <strong>"Run CI/CD Pipeline"</strong> above to launch your first build!
                  </div>
                ) : pipelines.map((pl) => (
                  <div
                    key={pl.id}
                    className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/8 transition text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${
                        pl.status === 'SUCCESS' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/25' :
                        pl.status === 'FAILED' ? 'bg-red-500/10 text-red-400 border border-red-500/25' :
                        'bg-violet-600/10 text-violet-400 border border-violet-500/25'
                      }`}>
                        {pl.status === 'SUCCESS' ? <CheckCircle className="w-4.5 h-4.5" /> :
                         pl.status === 'FAILED' ? <XCircle className="w-4.5 h-4.5" /> :
                         <Loader className="w-4.5 h-4.5 animate-spin" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-white text-xs font-bold">{pl.name}</span>
                          <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-slate-400 rounded-full">{pl.repo}</span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1">
                          Triggered by {pl.triggeredBy} • Branch: <span className="font-mono text-slate-400">{pl.branch}</span>
                        </p>
                      </div>
                    </div>

                    <div className="text-right flex-shrink-0">
                      <span className="text-white font-mono text-[11px] font-bold block">{pl.duration}</span>
                      <span className="text-[9px] text-slate-500 mt-1 block">
                        {new Date(pl.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </motion.div>
          )}

          {/* TAB 2: GIT COMMITS FEED */}
          {activeTab === 'commits' && (
            <motion.div
              key="commits"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-3 flex-1 overflow-y-auto max-h-[500px] pr-1"
            >
              <h3 className="font-extrabold text-white text-xs tracking-tight border-b border-white/5 pb-2 mb-3 text-left">Recent Pushes & Commits</h3>
              {commits.length === 0 ? (
                <div className="p-10 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 space-y-2">
                  <GitCommit className="w-8 h-8 text-slate-500 mx-auto" />
                  <p className="text-white text-xs font-bold">No Commits Pushed Yet</p>
                  <p className="text-slate-400 text-[11px]">Push a Git commit or use the Webhook tester tab to send commit events.</p>
                </div>
              ) : commits.map((commit) => (
                <div
                  key={commit.id}
                  className="p-4 bg-white/5 border border-white/5 rounded-2xl flex flex-col gap-3 hover:bg-white/8 transition text-left"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2 min-w-0">
                      <GitCommit className="w-4 h-4 text-violet-400 flex-shrink-0" />
                      <span className="text-xs font-mono font-bold text-violet-300 flex-shrink-0">{commit.hash}</span>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-white/5 text-slate-500 rounded-full flex-shrink-0">{commit.repoName}</span>
                      <span className="text-slate-300 text-xs font-bold truncate">{commit.message}</span>
                    </div>

                    <div className="flex items-center gap-2 flex-shrink-0">
                      <button
                        onClick={() => handleRunAiCodeReview(commit)}
                        disabled={loadingReviewHash === commit.hash}
                        className="px-2.5 py-1 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 font-mono text-[9px] font-extrabold rounded-full flex items-center gap-1 cursor-pointer flex-shrink-0 hover:bg-emerald-500/25 transition"
                      >
                        {loadingReviewHash === commit.hash ? <Loader className="w-3 h-3 animate-spin" /> : <ShieldCheck className="w-3 h-3" />}
                        AI Code Audit
                      </button>

                      {commit.taskId && (
                        <button
                          onClick={() => window.location.hash = '#/tasks'}
                          className="px-2.5 py-1 bg-violet-600/10 border border-violet-500/20 text-violet-400 font-mono text-[9px] font-extrabold rounded-full flex items-center gap-1 cursor-pointer flex-shrink-0 hover:bg-violet-600/25 transition"
                          title="Linked Task Card"
                        >
                          <Link className="w-2.5 h-2.5" />
                          #{commit.taskId.substring(0, 8)}
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between border-t border-white/5 pt-2.5 text-[10px] text-slate-500 select-none">
                    <span>Committed by <strong className="text-slate-400">{commit.author}</strong></span>
                    <span>{new Date(commit.timestamp).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </motion.div>
          )}

          {/* TAB 3: CODE REPOSITORIES */}
          {activeTab === 'repos' && (
            <motion.div
              key="repos"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-4 flex-1"
            >
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-extrabold text-white text-xs tracking-tight">Active Repositories</h3>
                <button
                  onClick={() => setShowCreateRepoModal(true)}
                  className="px-3.5 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Create Repository
                </button>
              </div>

              {repos.length === 0 ? (
                <div className="p-12 text-center border border-dashed border-white/10 rounded-2xl bg-white/5 space-y-3">
                  <GitBranch className="w-10 h-10 text-violet-400 mx-auto" />
                  <h4 className="font-extrabold text-white text-sm">No Repositories Added Yet</h4>
                  <p className="text-slate-400 text-xs max-w-sm mx-auto leading-relaxed">
                    Create your workspace repository to link commits, inspect code files, and execute CI/CD build pipelines!
                  </p>
                  <button
                    onClick={() => setShowCreateRepoModal(true)}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 text-white rounded-xl font-bold text-xs shadow-md transition inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Your First Repo
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {repos.map((repo) => (
                    <div
                      key={repo.name}
                      className="p-5 bg-white/5 border border-white/5 rounded-2xl hover:border-white/10 hover:bg-white/8 transition flex flex-col justify-between text-left"
                    >
                      <div>
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <GitBranch className="w-5 h-5 text-violet-400" />
                            <h4 className="font-extrabold text-white text-sm">{repo.name}</h4>
                          </div>
                          <span className="text-[10px] font-mono px-2 py-0.5 bg-violet-600/10 border border-violet-500/20 text-violet-400 rounded-full font-bold">
                            {repo.lang}
                          </span>
                        </div>
                        <p className="text-slate-400 text-xs leading-relaxed">{repo.desc}</p>
                      </div>

                      <div className="flex items-center justify-between border-t border-white/5 pt-4 mt-5 select-none gap-2">
                        <button
                          onClick={() => handleInspectRepo(repo.name)}
                          disabled={loadingRepoDetails === repo.name}
                          className="px-3 py-1.5 bg-violet-600/20 hover:bg-violet-600/30 border border-violet-500/30 text-violet-300 rounded-xl text-[10px] font-extrabold flex items-center gap-1.5 cursor-pointer transition"
                        >
                          {loadingRepoDetails === repo.name ? <Loader className="w-3 h-3 animate-spin" /> : <Code className="w-3 h-3" />}
                          Inspect Code & Files
                        </button>

                        <button
                          onClick={() => {
                            setPipelineRepo(repo.name)
                            setActiveTab('pipelines')
                            handleRunPipeline()
                          }}
                          className="px-3 py-1.5 bg-white/5 hover:bg-white/10 text-slate-300 rounded-xl text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition"
                        >
                          <Play className="w-3 h-3 text-emerald-400" /> Run Pipeline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </motion.div>
          )}

          {/* TAB 4: REAL GITHUB WEBHOOKS */}
          {activeTab === 'webhooks' && (
            <motion.div
              key="webhooks"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-6 flex-1 flex flex-col text-left"
            >
              {/* Webhook Header banner */}
              <div className="p-6 bg-gradient-to-r from-violet-900/40 via-indigo-900/30 to-slate-900/60 border border-violet-500/20 rounded-2xl flex flex-col md:flex-row justify-between gap-4 items-start md:items-center">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <Globe className="w-5 h-5 text-violet-400" />
                    <h3 className="font-extrabold text-white text-base">Real GitHub Webhook Integration</h3>
                  </div>
                  <p className="text-slate-300 text-xs leading-relaxed max-w-xl">
                    Connect real GitHub repositories to your SaaS Grid workspace. Whenever developers push code to GitHub, your backend listens to incoming payloads and automatically updates your Kanban task cards in real-time!
                  </p>
                </div>
                <div className="px-3 py-1.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-xl flex items-center gap-1.5 flex-shrink-0">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  Webhook Listener Active
                </div>
              </div>

              {/* Webhook Endpoint URL Box */}
              <div className="p-5 bg-slate-900/60 border border-white/10 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-extrabold text-white uppercase tracking-wider">Your Tenant Payload Webhook URL</label>
                  <span className="text-[10px] text-violet-400 font-mono">Workspace: {subdomain}</span>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={webhookEndpointUrl}
                    className="flex-1 px-3.5 py-2.5 rounded-xl border border-white/10 bg-slate-950 text-emerald-400 font-mono text-xs focus:outline-none"
                  />
                  <button
                    onClick={handleCopyWebhookUrl}
                    className="px-4 py-2.5 bg-white/10 hover:bg-white/15 text-white text-xs font-bold rounded-xl transition flex items-center gap-1.5 cursor-pointer"
                  >
                    {copiedWebhook ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    {copiedWebhook ? 'Copied!' : 'Copy URL'}
                  </button>
                </div>
              </div>

              {/* Setup Guide Steps */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 font-extrabold text-xs flex items-center justify-center">1</span>
                  <h4 className="font-extrabold text-white text-xs">Open GitHub Repo Settings</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Go to your GitHub repository on github.com ➔ Click <strong>Settings</strong> ➔ Select <strong>Webhooks</strong> in the left menu.</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 font-extrabold text-xs flex items-center justify-center">2</span>
                  <h4 className="font-extrabold text-white text-xs">Add Webhook Payload</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Click <strong>Add webhook</strong>, paste the Payload URL above, set Content type to <code>application/json</code>, and select <code>Just the push event</code>.</p>
                </div>
                <div className="p-4 bg-white/5 border border-white/5 rounded-2xl space-y-2">
                  <span className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-400 font-extrabold text-xs flex items-center justify-center">3</span>
                  <h4 className="font-extrabold text-white text-xs">Push Code with Task Tag</h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed">Run <code>git push</code> with a commit message containing <code>#taskID</code> (e.g., <code>feat: login UI #{selectedTaskPrefix || 'af80ea80'}</code>) to move cards automatically!</p>
                </div>
              </div>

              {/* Interactive Real Webhook Payload Tester */}
              <div className="p-5 bg-white/5 border border-white/10 rounded-2xl space-y-4">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-amber-400" />
                  <h4 className="font-extrabold text-white text-sm">Interactive Live GitHub Payload Tester</h4>
                  <span className="text-[10px] text-slate-400">(Test real payload processing right now without ngrok)</span>
                </div>

                <div className="flex flex-col md:flex-row gap-3">
                  <div className="flex-1">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Simulated Commit Message</label>
                    <input
                      type="text"
                      value={testWebhookMessage}
                      onChange={(e) => setTestWebhookMessage(e.target.value)}
                      placeholder="fix: resolve memory leak #"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
                    />
                  </div>
                  <div className="w-full md:w-48">
                    <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1">Target Task Prefix</label>
                    <select
                      value={selectedTaskPrefix}
                      onChange={(e) => setSelectedTaskPrefix(e.target.value)}
                      className="w-full p-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
                    >
                      {tasks.map((t) => (
                        <option key={t.id} value={t.id.substring(0, 8)} className="bg-slate-900">
                          #{t.id.substring(0, 8)} - {t.title.length > 18 ? t.title.substring(0, 18) + '...' : t.title}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="self-end">
                    <button
                      onClick={handleTriggerRealWebhookTest}
                      disabled={testingWebhook}
                      className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs rounded-xl shadow-lg transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                    >
                      {testingWebhook ? <Loader className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4 fill-current" />}
                      Dispatch Webhook POST
                    </button>
                  </div>
                </div>

                {webhookTestResult && (
                  <div className={`p-4 rounded-xl border text-xs font-mono leading-relaxed ${
                    webhookTestResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}>
                    <div className="flex items-center gap-2 font-extrabold mb-1">
                      {webhookTestResult.success ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                      <span>{webhookTestResult.success ? 'GitHub Webhook 200 OK Response' : 'Webhook Execution Error'}</span>
                    </div>
                    <pre className="text-[11px] whitespace-pre-wrap overflow-x-auto">
                      {JSON.stringify(webhookTestResult.data || webhookTestResult.error, null, 2)}
                    </pre>
                  </div>
                )}
              </div>

            </motion.div>
          )}

        </AnimatePresence>

      </div>

      {/* Create Repo Modal overlay */}
      <AnimatePresence>
        {showCreateRepoModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-md bg-slate-900 border border-white/10 rounded-3xl p-6 shadow-2xl text-left"
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-4 mb-4">
                <h3 className="font-extrabold text-white text-base">Create Code Repository</h3>
                <button
                  onClick={() => setShowCreateRepoModal(false)}
                  className="p-1 hover:bg-white/15 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleCreateRepo} className="space-y-4">
                {repoError && (
                  <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 text-xs rounded-xl">
                    {repoError}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Repository Name</label>
                  <input
                    type="text"
                    value={newRepoName}
                    onChange={(e) => setNewRepoName(e.target.value)}
                    placeholder="e.g. mobile-app-service"
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none placeholder:text-slate-650"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Language / Framework</label>
                  <select
                    value={newRepoLang}
                    onChange={(e) => setNewRepoLang(e.target.value)}
                    className="w-full p-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none"
                  >
                    <option value="React / Vite" className="bg-slate-900">React / Vite</option>
                    <option value="Java / Spring" className="bg-slate-900">Java / Spring</option>
                    <option value="Go / Gin" className="bg-slate-900">Go / Gin</option>
                    <option value="Python / Fast" className="bg-slate-900">Python / Fast</option>
                    <option value="Next.js" className="bg-slate-900">Next.js</option>
                    <option value="Node / Express" className="bg-slate-900">Node / Express</option>
                    <option value="Other" className="bg-slate-900">Other</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] uppercase font-bold text-slate-500 mb-1.5">Description</label>
                  <textarea
                    value={newRepoDesc}
                    onChange={(e) => setNewRepoDesc(e.target.value)}
                    placeholder="Write a brief explanation of this service..."
                    rows={3}
                    className="w-full px-3.5 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs focus:outline-none placeholder:text-slate-650 resize-none"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowCreateRepoModal(false)}
                    className="flex-1 py-2.5 border border-white/10 hover:bg-white/5 text-slate-300 rounded-xl font-bold text-xs transition cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creatingRepo}
                    className="flex-1 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold text-xs shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {creatingRepo ? <Loader className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create Repo
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* AI Code Review & Security Audit Modal */}
      <AnimatePresence>
        {selectedCommitReview && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="w-full max-w-lg bg-slate-900 border border-emerald-500/30 rounded-3xl p-6 shadow-2xl text-left space-y-4"
            >
              <div className="flex justify-between items-center border-b border-white/10 pb-4">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-extrabold text-white text-base">AI Code Audit Report</h3>
                </div>
                <button
                  onClick={() => setSelectedCommitReview(null)}
                  className="p-1 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex items-center justify-between p-3.5 bg-slate-950/60 border border-emerald-500/20 rounded-2xl">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Security Status</span>
                  <span className="text-xs font-mono font-extrabold text-emerald-400">{selectedCommitReview.securityRating}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Quality Score</span>
                  <span className="text-sm font-mono font-black text-amber-400">{selectedCommitReview.score} / 10</span>
                </div>
              </div>

              <div className="space-y-2.5">
                <label className="text-xs font-extrabold text-white uppercase tracking-wider block">Audit Findings & Verification</label>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {selectedCommitReview.auditFindings?.map((finding, i) => (
                    <div key={i} className="p-3 bg-white/5 border border-white/5 rounded-xl text-slate-300 text-xs leading-relaxed">
                      {finding}
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setSelectedCommitReview(null)}
                  className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-900 font-extrabold text-xs rounded-xl shadow transition"
                >
                  Close Audit Report
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Repository Code Inspector Modal */}
      <AnimatePresence>
        {selectedRepoDetails && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md">
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: 10 }}
              className="w-full max-w-4xl bg-slate-900 border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col text-left max-h-[85vh]"
            >
              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/10 bg-slate-950/60">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-violet-600/20 text-violet-400 border border-violet-500/30">
                    <GitBranch className="w-5 h-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-extrabold text-white text-base">{selectedRepoDetails.repoName}</h3>
                      <span className="text-[9px] font-mono px-2 py-0.5 bg-white/10 text-slate-400 rounded-full font-bold">
                        Repository Inspector
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">Explore source code tree, branches, and live configurations</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  {/* Branch selector */}
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl text-xs text-white">
                    <GitBranch className="w-3.5 h-3.5 text-violet-400" />
                    <select
                      value={activeRepoBranch}
                      onChange={(e) => setActiveRepoBranch(e.target.value)}
                      className="bg-transparent text-white focus:outline-none cursor-pointer font-mono font-bold"
                    >
                      {selectedRepoDetails.branches?.map(b => (
                        <option key={b} value={b} className="bg-slate-900 text-white">{b}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => setSelectedRepoDetails(null)}
                    className="p-1.5 hover:bg-white/10 text-slate-400 hover:text-white rounded-xl transition"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Modal Main Content: File Tree Sidebar & Code Viewer */}
              <div className="flex flex-1 min-h-[400px] overflow-hidden">
                {/* File Tree Sidebar */}
                <div className="w-64 border-r border-white/10 bg-slate-950/40 p-4 space-y-2 overflow-y-auto">
                  <span className="text-[10px] font-mono font-extrabold uppercase text-slate-500 block mb-2">Files & Explorer</span>
                  {selectedRepoDetails.files?.map((file) => {
                    const isSelected = selectedRepoFile?.path === file.path
                    return (
                      <button
                        key={file.path}
                        onClick={() => setSelectedRepoFile(file)}
                        className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs transition font-mono ${
                          isSelected
                            ? 'bg-violet-600/20 text-white border border-violet-500/30 font-bold'
                            : 'hover:bg-white/5 text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <Code className="w-3.5 h-3.5 text-slate-500" />
                          <span className="truncate">{file.path}</span>
                        </div>
                      </button>
                    )
                  })}
                </div>

                {/* Code Viewer Panel */}
                <div className="flex-1 flex flex-col bg-slate-950 p-4 overflow-hidden">
                  <div className="flex justify-between items-center border-b border-white/10 pb-3 mb-3 text-xs text-slate-400">
                    <span className="font-mono font-bold text-violet-300">{selectedRepoFile?.path || 'README.md'}</span>
                    <span className="text-[10px] font-mono text-slate-500">UTF-8 • Branch: {activeRepoBranch}</span>
                  </div>

                  <div className="flex-1 overflow-y-auto font-mono text-xs text-slate-300 bg-black/60 p-4 rounded-2xl border border-white/5 whitespace-pre-wrap select-text scrollbar-thin">
                    {selectedRepoFile?.content || '// No content available'}
                  </div>
                </div>
              </div>

              {/* Modal Bottom Footer Actions */}
              <div className="px-6 py-3.5 border-t border-white/10 bg-slate-950/80 flex items-center justify-between">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(`git clone https://github.com/workspace/${selectedRepoDetails.repoName}.git`)
                    setCopiedWebhook(true)
                    setTimeout(() => setCopiedWebhook(false), 2000)
                  }}
                  className="px-3.5 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-slate-300 rounded-xl text-xs font-mono font-bold flex items-center gap-1.5 transition"
                >
                  <Copy className="w-3.5 h-3.5" />
                  {copiedWebhook ? 'Copied Clone URL!' : `git clone https://github.com/workspace/${selectedRepoDetails.repoName}.git`}
                </button>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => {
                      setPipelineRepo(selectedRepoDetails.repoName)
                      setSelectedRepoDetails(null)
                      setActiveTab('pipelines')
                      handleRunPipeline()
                    }}
                    className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" /> Run Build Pipeline
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  )
}

export default DevOps
