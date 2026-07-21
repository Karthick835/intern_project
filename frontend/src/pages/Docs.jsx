import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  FileText, Plus, Search, Save, Trash2, Sparkles, Brain, CheckCircle, 
  ChevronRight, Edit3, Calendar, User, BookOpen, AlertCircle, ArrowRight
} from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const Docs = () => {
  const [docs, setDocs] = useState([])
  const [selectedDoc, setSelectedDoc] = useState(null)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [aiGenerating, setAiGenerating] = useState(false)
  const [aiMessage, setAiMessage] = useState(null)

  const token = localStorage.getItem('authToken')
  const subdomain = localStorage.getItem('tenantSubdomain')
  const userName = localStorage.getItem('userName') || 'Developer'

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  // Load documents
  const fetchDocs = async () => {
    setLoading(true)
    try {
      const res = await api.get('/docs')
      setDocs(res.data)
      if (res.data.length > 0 && !selectedDoc) {
        handleSelectDoc(res.data[0])
      }
    } catch (err) {
      console.error('Failed to load wiki docs', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDocs()
  }, [])

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc)
    setTitle(doc.title)
    setContent(doc.content || '')
    setAiMessage(null)
  }

  // Create new doc
  const handleCreateDoc = () => {
    const newDoc = {
      id: '',
      title: 'New Specification Doc',
      content: '# New Project Specification\n\nWrite your system design spec here...\n\n### Backlog Task List:\n- [ ] Implement user registration flow\n- [ ] Design custom database schema rules\n- [ ] Deploy container to staging server',
      updatedBy: userName
    }
    setSelectedDoc(newDoc)
    setTitle(newDoc.title)
    setContent(newDoc.content)
    setAiMessage(null)
  }

  // Save doc
  const handleSaveDoc = async () => {
    if (!title.trim()) return
    setSaving(true)
    try {
      const res = await api.post('/docs', {
        id: selectedDoc?.id || '',
        title: title.trim(),
        content: content,
        updatedBy: userName
      })
      
      const saved = res.data
      // Update list
      setDocs(prev => {
        const idx = prev.findIndex(d => d.id === saved.id)
        if (idx > -1) {
          const updated = [...prev]
          updated[idx] = saved
          return updated
        } else {
          return [saved, ...prev]
        }
      })
      setSelectedDoc(saved)
    } catch (err) {
      console.error('Failed to save document', err)
    } finally {
      setSaving(false)
    }
  }

  // Delete doc
  const handleDeleteDoc = async (id) => {
    if (!id) {
      setSelectedDoc(null)
      return
    }
    if (!window.confirm('Are you sure you want to delete this document?')) return
    try {
      await api.delete(`/docs/${id}`)
      setDocs(prev => prev.filter(d => d.id !== id))
      setSelectedDoc(null)
    } catch (err) {
      console.error('Failed to delete doc', err)
    }
  }

  // AI Task Generation
  const handleAiTaskGen = async () => {
    if (!selectedDoc?.id) return
    setAiGenerating(true)
    setAiMessage(null)
    try {
      const res = await api.post(`/docs/${selectedDoc.id}/ai-tasks`)
      setAiMessage({
        type: 'success',
        text: res.data.message || 'AI successfully generated tasks in your Backlog!'
      })
    } catch (err) {
      console.error('AI task generation failed', err)
      setAiMessage({
        type: 'error',
        text: 'AI generation failed. Please ensure the document is saved first.'
      })
    } finally {
      setAiGenerating(false)
    }
  }

  // Filter docs
  const filteredDocs = docs.filter(d => 
    d.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (d.content && d.content.toLowerCase().includes(searchQuery.toLowerCase()))
  )

  const insertText = (before, after = '') => {
    const textarea = document.getElementById('doc-editor')
    if (!textarea) return
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const text = textarea.value
    const selected = text.substring(start, end)
    const replacement = before + selected + after
    setContent(text.substring(0, start) + replacement + text.substring(end))
    textarea.focus()
  }

  return (
    <div className="min-h-[calc(100vh-80px)] max-w-7xl mx-auto flex flex-col md:flex-row gap-6 p-1 md:p-4 select-none">
      
      {/* ─── LEFT COLUMN: DOCUMENTS DIRECTORY ─── */}
      <div className="w-full md:w-80 bg-white/5 border border-white/10 rounded-3xl p-5 backdrop-blur-md flex flex-col gap-4.5 min-h-[300px] md:min-h-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-violet-400" />
            <h2 className="font-extrabold text-white text-base tracking-tight">Wiki Docs</h2>
          </div>
          <button
            onClick={handleCreateDoc}
            className="p-1.5 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl shadow-lg transition flex items-center justify-center cursor-pointer"
            title="Create Specification Document"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3.5 top-3 w-4 h-4 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search wiki docs..."
            className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-white/10 bg-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-violet-500 transition"
          />
        </div>

        {/* Doc List */}
        <div className="flex-1 overflow-y-auto space-y-2 max-h-[320px] md:max-h-none pr-1">
          {loading ? (
            <div className="text-center py-8 text-slate-500 text-xs">Loading documents...</div>
          ) : filteredDocs.length === 0 ? (
            <div className="text-center py-12 text-slate-500 text-xs flex flex-col items-center gap-2">
              <FileText className="w-8 h-8 opacity-20" />
              No documents found.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = selectedDoc && selectedDoc.id === doc.id
              return (
                <button
                  key={doc.id}
                  onClick={() => handleSelectDoc(doc)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl transition text-left cursor-pointer border ${
                    isSelected 
                      ? 'bg-violet-600/20 border-violet-500/40 text-white' 
                      : 'bg-white/5 border-transparent text-slate-400 hover:text-slate-200 hover:bg-white/8'
                  }`}
                >
                  <FileText className={`w-4 h-4 flex-shrink-0 ${isSelected ? 'text-violet-400' : 'text-slate-500'}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-bold truncate leading-tight">{doc.title || 'Untitled'}</p>
                    <p className="text-[10px] text-slate-500 truncate mt-1">
                      By {doc.updatedBy} • {new Date(doc.updatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />
                </button>
              )
            })
          )}
        </div>
      </div>

      {/* ─── RIGHT COLUMN: EDITOR & AI ASSISTANT ─── */}
      <div className="flex-1 flex flex-col md:flex-row gap-6">
        
        {/* Editor Board */}
        <div className="flex-1 bg-white/5 border border-white/10 rounded-3xl p-6 backdrop-blur-md flex flex-col gap-4">
          {selectedDoc ? (
            <>
              {/* Doc Title bar */}
              <div className="flex items-center justify-between gap-4 border-b border-white/5 pb-4">
                <div className="flex-1 min-w-0">
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter document title..."
                    className="w-full bg-transparent border-b border-transparent focus:border-violet-500 text-lg font-black text-white focus:outline-none py-1 transition"
                  />
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 mt-1 select-none">
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> Last edited by: {selectedDoc.updatedBy || 'Anonymous'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> Updated: {selectedDoc.updatedAt ? new Date(selectedDoc.updatedAt).toLocaleString() : 'Just now'}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleSaveDoc}
                    disabled={saving}
                    className="px-3.5 py-2 bg-white hover:bg-slate-50 active:bg-slate-100 text-slate-900 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer disabled:opacity-60"
                  >
                    {saving ? (
                      <div className="w-3.5 h-3.5 border-2 border-slate-700 border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <Save className="w-3.5 h-3.5" />
                    )}
                    Save
                  </button>
                  <button
                    onClick={() => handleDeleteDoc(selectedDoc.id)}
                    className="p-2 border border-red-500/20 hover:border-red-500/40 text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded-xl transition flex items-center justify-center cursor-pointer"
                    title="Delete Specification"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Formatting bar */}
              <div className="flex gap-2 bg-white/5 p-1.5 border border-white/5 rounded-xl text-slate-400 select-none">
                <button onClick={() => insertText('# ', '')} className="px-2.5 py-1 text-xs hover:bg-white/10 rounded font-black hover:text-white transition">H1</button>
                <button onClick={() => insertText('## ', '')} className="px-2.5 py-1 text-xs hover:bg-white/10 rounded font-black hover:text-white transition">H2</button>
                <button onClick={() => insertText('**', '**')} className="px-2.5 py-1 text-xs hover:bg-white/10 rounded font-black hover:text-white transition">B</button>
                <button onClick={() => insertText('_', '_')} className="px-2.5 py-1 text-xs hover:bg-white/10 rounded italic hover:text-white transition">I</button>
                <button onClick={() => insertText('```\n', '\n```')} className="px-2.5 py-1 text-xs hover:bg-white/10 rounded font-mono hover:text-white transition">Code</button>
                <button onClick={() => insertText('- [ ] ', '')} className="px-2.5 py-1 text-xs hover:bg-white/10 rounded hover:text-white transition">Todo</button>
              </div>

              {/* Document Editor Area */}
              <div className="flex-1">
                <textarea
                  id="doc-editor"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="Start drafting your product specification..."
                  className="w-full h-full min-h-[300px] md:min-h-[400px] bg-transparent border-0 resize-none text-slate-200 placeholder:text-slate-650 focus:outline-none font-mono text-xs leading-relaxed"
                />
              </div>
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 select-none py-20">
              <div className="w-16 h-16 bg-white/5 border border-white/10 text-slate-500 rounded-3xl flex items-center justify-center mb-5">
                <BookOpen className="w-8 h-8 opacity-45" />
              </div>
              <h3 className="text-white font-extrabold text-lg tracking-tight">No Document Selected</h3>
              <p className="text-slate-500 text-xs max-w-sm mt-2 leading-relaxed">
                Select a document from the folder directory on the left or create a new spec to draft designs and generate backlog cards.
              </p>
              <button
                onClick={handleCreateDoc}
                className="mt-6 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-900 rounded-xl font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Create First Document
              </button>
            </div>
          )}
        </div>

        {/* ─── SIDE AI COMPANION PANEL ─── */}
        {selectedDoc && selectedDoc.id && (
          <div className="w-full md:w-72 bg-gradient-to-b from-indigo-950/40 to-violet-950/40 border border-violet-500/20 rounded-3xl p-5 flex flex-col gap-4 relative overflow-hidden select-none">
            
            {/* Ambient glows inside AI box */}
            <div className="absolute top-0 right-0 w-24 h-24 bg-violet-600/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-indigo-600/10 rounded-full blur-xl pointer-events-none" />

            <div className="relative z-10 flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-violet-600/30 flex items-center justify-center text-violet-400">
                <Brain className="w-4.5 h-4.5" />
              </div>
              <div>
                <h3 className="text-white font-bold text-xs leading-none">AI Backlog Generator</h3>
                <span className="text-[10px] text-slate-500">SaaS Grid Smart Co-Pilot</span>
              </div>
            </div>

            <p className="relative z-10 text-[11px] text-slate-400 leading-relaxed">
              Analyze the active specification text, extract todo list items and core engineering tasks, and automatically build cards in your Kanban backlog.
            </p>

            <button
              onClick={handleAiTaskGen}
              disabled={aiGenerating}
              className="relative z-10 w-full py-3 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-violet-500/25 transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
            >
              {aiGenerating ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <Sparkles className="w-4 h-4" />
              )}
              {aiGenerating ? 'Processing Doc Spec...' : 'Generate Backlog Tasks'}
            </button>

            {/* Notification messages */}
            <AnimatePresence>
              {aiMessage && (
                <motion.div
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  className={`relative z-10 p-3.5 rounded-2xl border text-[11px] leading-relaxed flex items-start gap-2.5 ${
                    aiMessage.type === 'success'
                      ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                      : 'bg-red-500/10 border-red-500/20 text-red-400'
                  }`}
                >
                  {aiMessage.type === 'success' ? (
                    <CheckCircle className="w-4.5 h-4.5 text-emerald-400 flex-shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-4.5 h-4.5 text-red-400 flex-shrink-0 mt-0.5" />
                  )}
                  <div className="flex-1">
                    <p className="font-semibold text-white">
                      {aiMessage.type === 'success' ? 'Task Backlog Updated' : 'Processing Failed'}
                    </p>
                    <p className="mt-0.5 text-slate-400">{aiMessage.text}</p>
                    {aiMessage.type === 'success' && (
                      <button
                        onClick={() => window.location.hash = '#/tasks'}
                        className="mt-2 text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1.5 cursor-pointer text-[10px]"
                      >
                        Go to Kanban board <ArrowRight className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )}

      </div>
    </div>
  )
}

export default Docs
