import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, X, Send, Bot, User, Loader2, Settings } from 'lucide-react'
import axios from 'axios'

import { getApiBase } from '../config'

const AiCoPilot = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [input, setInput] = useState('')
  const [apiKeyInput, setApiKeyInput] = useState(() => {
    try {
      return localStorage.getItem('claude_api_key') || ''
    } catch (e) {
      return ''
    }
  })
  const [messages, setMessages] = useState([
    {
      sender: 'bot',
      text: 'Hello! I am your AI Workspace Co-Pilot. I can answer questions about your tasks, analyze team workload, or help you create new tasks on the fly! What would you like to do?'
    }
  ])
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef(null)

  const token = localStorage.getItem('authToken')
  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    if (isOpen) {
      scrollToBottom()
    }
  }, [messages, isOpen])

  const handleSend = async (e) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput('')
    setMessages((prev) => [...prev, { sender: 'user', text: userMessage }])
    setLoading(true)

    try {
      const activeKey = localStorage.getItem('claude_api_key') || ''
      const res = await axios.post(
        `${getApiBase()}/ai/chat`,
        { message: userMessage },
        {
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': subdomain,
            'X-Claude-API-Key': activeKey
          }
        }
      )
      const reply = res.data?.reply || "I'm having trouble analyzing the workspace right now."
      setMessages((prev) => [...prev, { sender: 'bot', text: reply }])
    } catch (err) {
      console.error('Chat error', err)
      setMessages((prev) => [
        ...prev,
        { sender: 'bot', text: 'Sorry, I failed to reach the server. Please verify the backend is running.' }
      ])
    } finally {
      setLoading(false)
    }
  }

  // Parse basic bold markdown
  const renderText = (text) => {
    const parts = text.split(/(\*\*.*?\*\*)/g)
    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={index} className="font-extrabold text-primary-500 dark:text-primary-400">{part.slice(2, -2)}</strong>
      }
      return part
    })
  }

  const handleApiKeyChange = (val) => {
    setApiKeyInput(val)
    try {
      localStorage.setItem('claude_api_key', val)
    } catch (e) {}
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.85, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.85, y: 50 }}
            transition={{ type: 'spring', damping: 20 }}
            className="bg-white dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 shadow-2xl rounded-2xl w-[380px] h-[520px] flex flex-col overflow-hidden mb-4"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-primary-600 to-secondary-600 text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 animate-pulse text-yellow-300" />
                <div>
                  <h4 className="font-black text-sm tracking-tight">Workspace AI Co-Pilot</h4>
                  <p className="text-[10px] text-primary-100 font-semibold">Active & Context Aware</p>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className={`p-1.5 rounded-lg transition ${showSettings ? 'bg-white/20' : 'hover:bg-white/10'}`}
                  title="AI Settings"
                >
                  <Settings className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 hover:bg-white/10 rounded-lg transition"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Settings Area */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-slate-50 dark:bg-slate-950 p-3.5 border-b border-slate-200/60 dark:border-slate-850 flex flex-col gap-2 overflow-hidden"
                >
                  <label className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Claude API Key (Browser Local)</label>
                  <input
                    type="password"
                    value={apiKeyInput}
                    onChange={(e) => handleApiKeyChange(e.target.value)}
                    placeholder="sk-ant-api03-..."
                    className="w-full px-3 py-1.5 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-[9px] text-slate-400 dark:text-slate-500 leading-normal">
                    Pasting a real key enables direct, fully conversational connections to Anthropic Claude 3. It will see your workspace tasks and sprint details dynamically. Left blank, the co-pilot runs on simulated rules.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Message Area */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-50 dark:bg-slate-950">
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex gap-2.5 ${msg.sender === 'user' ? 'flex-row-reverse' : ''}`}
                >
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white font-bold text-xs ${
                      msg.sender === 'bot'
                        ? 'bg-primary-600 shadow-md shadow-primary-500/20'
                        : 'bg-slate-700 dark:bg-slate-800'
                    }`}
                  >
                    {msg.sender === 'bot' ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                  </div>
                  <div
                    className={`p-3 rounded-2xl max-w-[75%] text-xs leading-relaxed whitespace-pre-wrap ${
                      msg.sender === 'bot'
                        ? 'bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 border border-slate-100 dark:border-slate-800'
                        : 'bg-primary-600 text-white rounded-br-none'
                    }`}
                  >
                    {renderText(msg.text)}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center text-white shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 text-xs flex items-center gap-2">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-primary-500" />
                    Thinking...
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Form */}
            <form onSubmit={handleSend} className="p-3 border-t border-slate-150 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-2">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={apiKeyInput ? "Query Claude about your workspace..." : "Ask about tasks or create task..."}
                className="flex-1 px-3 py-2 border border-slate-200 dark:border-slate-800 rounded-xl text-xs bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-100 focus:outline-none focus:border-primary-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || loading}
                className="p-2 bg-primary-600 hover:bg-primary-700 text-white rounded-xl transition disabled:opacity-50 flex items-center justify-center"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Toggle Button */}
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className="w-14 h-14 bg-gradient-to-r from-primary-600 to-secondary-600 text-white rounded-full shadow-2xl flex items-center justify-center relative hover:shadow-primary-500/20 hover:shadow-lg border-2 border-white dark:border-slate-900"
      >
        <Sparkles className="w-6 h-6 animate-pulse" />
        <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900"></span>
      </motion.button>
    </div>
  )
}

export default AiCoPilot
