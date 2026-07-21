import React, { useState, useEffect, useRef, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Client } from '@stomp/stompjs'
import {
  MessageSquare, X, Send, Users, Zap, Circle,
  ChevronRight, Hash, Activity, AtSign, Smile,
  Wifi, WifiOff, Bell, Clock, CheckCheck, Plus,
  MoreHorizontal, Star, Pin, Paperclip, Mic, Laugh
} from 'lucide-react'
import axios from 'axios'

const EMOJI_REACTIONS = ['👍', '❤️', '🔥', '😂', '🎉', '✅']

const TABS = [
  { id: 'chat', label: 'Chat', icon: MessageSquare },
  { id: 'activity', label: 'Activity', icon: Activity },
  { id: 'members', label: 'Members', icon: Users },
]

const AVATAR_GRADIENTS = [
  'from-violet-500 to-purple-600',
  'from-blue-500 to-cyan-500',
  'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500',
  'from-amber-500 to-orange-500',
  'from-sky-500 to-blue-600',
  'from-fuchsia-500 to-pink-600',
]

const getColor = (name) => {
  if (!name) return AVATAR_GRADIENTS[0]
  let hash = 0
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i)
  return AVATAR_GRADIENTS[hash % AVATAR_GRADIENTS.length]
}

const getInitials = (name) =>
  name?.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || '?'

const formatTime = (ts) => {
  try {
    const d = new Date(ts)
    const now = new Date()
    const diffMs = now - d
    const diffMins = Math.floor(diffMs / 60000)
    if (diffMins < 1) return 'just now'
    if (diffMins < 60) return `${diffMins}m ago`
    return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true })
  } catch { return '' }
}

const ACTIVITY_ICONS = {
  CREATE: { icon: '✨', label: 'created', color: 'text-emerald-400' },
  UPDATE: { icon: '✏️', label: 'updated', color: 'text-blue-400' },
  DELETE: { icon: '🗑️', label: 'deleted', color: 'text-rose-400' },
  COMPLETE: { icon: '✅', label: 'completed', color: 'text-emerald-400' },
  DONE: { icon: '✅', label: 'completed', color: 'text-emerald-400' },
  START: { icon: '▶️', label: 'started', color: 'text-blue-400' },
  COMMENT: { icon: '💬', label: 'commented on', color: 'text-violet-400' },
  ASSIGN: { icon: '👤', label: 'assigned', color: 'text-amber-400' },
}

import { getApiBase, getWsBase } from '../../config'

const ChatSidebar = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('chat')
  const [messages, setMessages] = useState([])
  const [activities, setActivities] = useState([])
  const [teamMembers, setTeamMembers] = useState([])
  const [onlineUsers, setOnlineUsers] = useState(new Set())
  const [input, setInput] = useState('')
  const [connected, setConnected] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [reactingToMsg, setReactingToMsg] = useState(null)
  const [reactions, setReactions] = useState({}) // msgId -> { emoji: [users] }
  const [mentioning, setMentioning] = useState(false)
  const [mentionQuery, setMentionQuery] = useState('')
  const [loadingActivity, setLoadingActivity] = useState(false)
  const stompClientRef = useRef(null)
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const tenantId = localStorage.getItem('tenantSubdomain') || 'workspace'
  const userName = localStorage.getItem('userName') || 'You'
  const token = localStorage.getItem('authToken') || ''
  const userInitials = getInitials(userName)

  const api = axios.create({
    baseURL: getApiBase(),
    headers: { 'Authorization': `Bearer ${token}`, 'X-Tenant-ID': tenantId }
  })

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [])

  useEffect(() => { if (messages.length > 0) scrollToBottom() }, [messages, scrollToBottom])

  // Load team members
  useEffect(() => {
    const loadTeam = async () => {
      try {
        const res = await api.get('/team')
        setTeamMembers(res.data || [])
        // Mark current user online
        setOnlineUsers(new Set([userName]))
      } catch (e) { console.error(e) }
    }
    loadTeam()
  }, [])

  // Load real activity from backend
  useEffect(() => {
    if (activeTab === 'activity' && activities.length === 0) {
      const loadActivity = async () => {
        setLoadingActivity(true)
        try {
          const res = await api.get('/dashboard/activity')
          const logs = (res.data || []).map((log, i) => ({
            id: log.id || `log-${i}`,
            sender: log.user?.name || 'System',
            action: log.action || 'UPDATE',
            entity: log.entity || 'Task',
            entityId: log.entityId,
            content: buildActivityText(log),
            timestamp: log.timestamp || new Date().toISOString(),
            type: 'ACTIVITY'
          }))
          setActivities(logs)
        } catch (e) { console.error(e) }
        finally { setLoadingActivity(false) }
      }
      loadActivity()
    }
  }, [activeTab])

  const buildActivityText = (log) => {
    const who = log.user?.name || 'Someone'
    const action = (log.action || '').toLowerCase()
    const what = log.entity || 'item'
    const actionLabels = {
      create: 'created a new', update: 'updated a', delete: 'deleted a',
      complete: 'completed a', done: 'completed a', start: 'started a'
    }
    return `${who} ${actionLabels[action] || action} ${what.toLowerCase()}`
  }

  // STOMP WebSocket
  useEffect(() => {
    const client = new Client({
      brokerURL: getWsBase(),
      connectHeaders: { Authorization: `Bearer ${token}` },
      reconnectDelay: 5000,
      onConnect: () => {
        setConnected(true)
        // Mark self as online via presence message
        client.publish({
          destination: `/app/chat/${tenantId}`,
          body: JSON.stringify({ sender: userName, content: '', type: 'PRESENCE', action: 'JOIN' })
        })

        client.subscribe(`/topic/messages/${tenantId}`, (frame) => {
          try {
            const msg = JSON.parse(frame.body)
            if (msg.type === 'PRESENCE') {
              if (msg.action === 'JOIN') setOnlineUsers(prev => new Set([...prev, msg.sender]))
              if (msg.action === 'LEAVE') setOnlineUsers(prev => { const n = new Set(prev); n.delete(msg.sender); return n })
              return
            }
            if (msg.type === 'REACTION') {
              setReactions(prev => {
                const msgReactions = { ...(prev[msg.targetId] || {}) }
                if (!msgReactions[msg.emoji]) msgReactions[msg.emoji] = []
                if (!msgReactions[msg.emoji].includes(msg.sender)) msgReactions[msg.emoji] = [...msgReactions[msg.emoji], msg.sender]
                return { ...prev, [msg.targetId]: msgReactions }
              })
              return
            }
            if (msg.type === 'ACTIVITY') {
              setActivities(prev => [...prev.slice(-99), { ...msg, id: Date.now() + Math.random() }])
            } else {
              setMessages(prev => [...prev.slice(-199), { ...msg, id: msg.id || Date.now() + Math.random() }])
              if (!isOpen || activeTab !== 'chat') setUnreadCount(prev => prev + 1)
            }
          } catch (e) { console.error('WS parse error', e) }
        })
      },
      onDisconnect: () => setConnected(false),
      onStompError: () => setConnected(false),
    })
    client.activate()
    stompClientRef.current = client
    return () => {
      if (stompClientRef.current?.connected) {
        stompClientRef.current.publish({
          destination: `/app/chat/${tenantId}`,
          body: JSON.stringify({ sender: userName, content: '', type: 'PRESENCE', action: 'LEAVE' })
        })
      }
      client.deactivate()
    }
  }, [tenantId, token])

  const sendMessage = () => {
    const text = input.trim()
    if (!text) return

    // If not connected, show message locally (offline mode)
    const msgId = `local-${Date.now()}`
    const localMsg = {
      id: msgId,
      sender: userName,
      content: text,
      type: 'CHAT',
      timestamp: new Date().toISOString(),
      isLocal: true
    }

    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/chat/${tenantId}`,
        body: JSON.stringify({ id: msgId, sender: userName, content: text, type: 'CHAT' })
      })
    } else {
      // Show in local state anyway
      setMessages(prev => [...prev, localMsg])
    }
    setInput('')
    inputRef.current?.focus()
  }

  const sendReaction = (targetId, emoji) => {
    if (stompClientRef.current?.connected) {
      stompClientRef.current.publish({
        destination: `/app/chat/${tenantId}`,
        body: JSON.stringify({ type: 'REACTION', targetId, emoji, sender: userName })
      })
    }
    // Optimistic local update
    setReactions(prev => {
      const msgReactions = { ...(prev[targetId] || {}) }
      if (!msgReactions[emoji]) msgReactions[emoji] = []
      if (!msgReactions[emoji].includes(userName)) msgReactions[emoji] = [...msgReactions[emoji], userName]
      return { ...prev, [targetId]: msgReactions }
    })
    setReactingToMsg(null)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() }
    if (e.key === '@') { setMentioning(true); setMentionQuery('') }
    if (e.key === 'Escape') { setMentioning(false); setReactingToMsg(null) }
  }

  const insertMention = (name) => {
    const beforeAt = input.slice(0, input.lastIndexOf('@'))
    setInput(`${beforeAt}@${name} `)
    setMentioning(false)
    inputRef.current?.focus()
  }

  const handleOpen = () => { setIsOpen(true); setUnreadCount(0) }
  const isMine = (sender) => sender === userName

  const filteredMentions = teamMembers.filter(m =>
    m.name?.toLowerCase().includes(mentionQuery.toLowerCase()) && m.name !== userName
  )

  return (
    <>
      {/* Floating Toggle Button */}
      <motion.button
        id="war-room-toggle-btn"
        onClick={handleOpen}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        className={`fixed bottom-24 right-6 z-50 rounded-2xl shadow-xl flex items-center justify-center transition-all duration-300 ${
          isOpen ? 'opacity-0 pointer-events-none' : 'opacity-100'
        } bg-gradient-to-br from-violet-600 to-indigo-700 text-white`}
        style={{ width: 52, height: 52, boxShadow: '0 8px 32px rgba(139,92,246,0.35)' }}
        title="War Room – Team Chat"
      >
        <MessageSquare className="w-5 h-5" />
        {/* Online dot */}
        <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-400 rounded-full border-2 border-white" />
        {unreadCount > 0 && (
          <motion.span
            initial={{ scale: 0 }} animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 ring-2 ring-white"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.span>
        )}
      </motion.button>

      {/* Sidebar Panel */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            id="war-room-panel"
            initial={{ x: 380, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 380, opacity: 0 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            className="fixed right-0 top-0 bottom-0 w-[340px] z-50 flex flex-col"
            style={{
              background: 'rgba(9, 8, 28, 0.97)',
              backdropFilter: 'blur(24px)',
              borderLeft: '1px solid rgba(139, 92, 246, 0.18)',
              boxShadow: '-12px 0 60px rgba(0,0,0,0.5)',
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3.5 border-b" style={{ borderColor: 'rgba(139, 92, 246, 0.15)' }}>
              <div className="flex items-center gap-2.5">
                <div className="relative">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-600 to-indigo-700 flex items-center justify-center">
                    <Hash className="w-3.5 h-3.5 text-white" />
                  </div>
                  {connected
                    ? <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full ring-2 ring-[#09081c]" />
                    : <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-amber-400 rounded-full ring-2 ring-[#09081c] animate-pulse" />
                  }
                </div>
                <div>
                  <h3 className="text-white text-sm font-bold leading-tight flex items-center gap-1.5">
                    War Room
                    <span className="text-[9px] px-1.5 py-0.5 bg-violet-500/20 text-violet-300 rounded-full font-bold uppercase tracking-wider border border-violet-500/20">
                      {tenantId}
                    </span>
                  </h3>
                  <p className="text-slate-500 text-[10px] flex items-center gap-1 mt-0.5">
                    {connected
                      ? <><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" /> Live · {onlineUsers.size} online</>
                      : <><span className="w-1.5 h-1.5 rounded-full bg-amber-400 inline-block animate-pulse" /> Connecting…</>
                    }
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1.5 text-slate-500 hover:text-white hover:bg-white/10 rounded-lg transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tabs */}
            <div className="flex border-b" style={{ borderColor: 'rgba(139, 92, 246, 0.12)' }}>
              {TABS.map(tab => {
                const Icon = tab.icon
                return (
                  <button
                    key={tab.id}
                    onClick={() => { setActiveTab(tab.id); setUnreadCount(0) }}
                    className={`flex-1 py-2.5 text-[10px] font-bold uppercase tracking-widest flex items-center justify-center gap-1.5 transition-all ${
                      activeTab === tab.id
                        ? 'text-violet-300 border-b-2 border-violet-500 bg-violet-500/5'
                        : 'text-slate-600 hover:text-slate-400 hover:bg-white/3'
                    }`}
                  >
                    <Icon className="w-3 h-3" />
                    {tab.label}
                    {tab.id === 'members' && teamMembers.length > 0 && (
                      <span className="bg-white/10 text-slate-400 px-1 rounded-full text-[8px] font-black">{teamMembers.length}</span>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2.5">
              <AnimatePresence mode="wait">
                {/* CHAT TAB */}
                {activeTab === 'chat' && (
                  <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2.5">
                    {messages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-52 text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <MessageSquare className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm font-bold">No messages yet</p>
                          <p className="text-slate-600 text-xs mt-1">Start the team conversation 👋</p>
                        </div>
                      </div>
                    ) : messages.map((msg, i) => {
                      const mine = isMine(msg.sender)
                      const showAvatar = i === 0 || messages[i - 1]?.sender !== msg.sender
                      const msgReactions = reactions[msg.id] || {}
                      const hasReactions = Object.keys(msgReactions).length > 0

                      return (
                        <motion.div
                          key={msg.id || i}
                          initial={{ opacity: 0, y: 6 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.18 }}
                          className={`group flex gap-2 items-end ${mine ? 'flex-row-reverse' : 'flex-row'}`}
                        >
                          {!mine && showAvatar ? (
                            <div className={`w-6 h-6 rounded-full flex-shrink-0 bg-gradient-to-br ${getColor(msg.sender)} flex items-center justify-center text-[9px] font-bold text-white mb-1`}>
                              {getInitials(msg.sender)}
                            </div>
                          ) : !mine ? <div className="w-6 flex-shrink-0" /> : null}

                          <div className={`max-w-[80%] flex flex-col gap-1 ${mine ? 'items-end' : 'items-start'}`}>
                            {!mine && showAvatar && (
                              <span className="text-[10px] font-semibold text-violet-300/70 ml-1">
                                {msg.sender}
                                {onlineUsers.has(msg.sender) && <span className="ml-1 text-emerald-400">·</span>}
                              </span>
                            )}
                            <div className="relative">
                              <div
                                className={`px-3 py-2 rounded-2xl text-xs leading-relaxed break-words cursor-pointer select-text ${
                                  mine
                                    ? 'bg-gradient-to-br from-violet-600 to-indigo-700 text-white rounded-br-sm'
                                    : 'text-slate-200 rounded-bl-sm border border-white/8'
                                }`}
                                style={mine ? {} : { background: 'rgba(255,255,255,0.07)' }}
                                onMouseEnter={() => setReactingToMsg(msg.id)}
                              >
                                {/* Highlight @mentions */}
                                {(msg.content || '').split(/(@\w[\w\s]*)/g).map((part, pi) =>
                                  part.startsWith('@')
                                    ? <span key={pi} className="font-bold text-amber-300">{part}</span>
                                    : part
                                )}
                              </div>

                              {/* Reaction picker on hover */}
                              <AnimatePresence>
                                {reactingToMsg === msg.id && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.8, y: 4 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.8, y: 4 }}
                                    className={`absolute bottom-full mb-1 ${mine ? 'right-0' : 'left-0'} flex items-center gap-1 bg-slate-800 border border-slate-700 rounded-xl px-2 py-1.5 shadow-xl z-10`}
                                    onMouseLeave={() => setReactingToMsg(null)}
                                  >
                                    {EMOJI_REACTIONS.map(emoji => (
                                      <button key={emoji} onClick={() => sendReaction(msg.id, emoji)}
                                        className="text-sm hover:scale-125 transition-transform p-0.5 rounded-lg hover:bg-white/10"
                                      >{emoji}</button>
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>

                            {/* Reactions */}
                            {hasReactions && (
                              <div className={`flex flex-wrap gap-1 ${mine ? 'justify-end' : 'justify-start'}`}>
                                {Object.entries(msgReactions).map(([emoji, users]) => (
                                  <button
                                    key={emoji}
                                    onClick={() => sendReaction(msg.id, emoji)}
                                    className={`flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] border transition ${
                                      users.includes(userName)
                                        ? 'bg-violet-500/20 border-violet-500/40 text-violet-300'
                                        : 'bg-white/5 border-white/10 text-slate-400 hover:bg-white/10'
                                    }`}
                                  >
                                    {emoji} <span className="font-bold">{users.length}</span>
                                  </button>
                                ))}
                              </div>
                            )}

                            <span className="text-[9px] text-slate-600 mx-1">{formatTime(msg.timestamp)}</span>
                          </div>
                        </motion.div>
                      )
                    })}
                    <div ref={messagesEndRef} />
                  </motion.div>
                )}

                {/* ACTIVITY TAB */}
                {activeTab === 'activity' && (
                  <motion.div key="activity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                    <div className="flex items-center justify-between px-1 mb-2">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Latest Team Activity</p>
                      <button
                        onClick={async () => {
                          setLoadingActivity(true)
                          try {
                            const res = await api.get('/dashboard/activity')
                            const logs = (res.data || []).map((log, i) => ({
                              id: log.id || `log-${i}`,
                              sender: log.user?.name || 'System',
                              action: log.action || 'UPDATE',
                              entity: log.entity || 'Task',
                              content: buildActivityText(log),
                              timestamp: log.timestamp,
                              type: 'ACTIVITY'
                            }))
                            setActivities(logs)
                          } catch (e) { }
                          finally { setLoadingActivity(false) }
                        }}
                        className="text-[9px] text-violet-400 hover:text-violet-300 font-bold flex items-center gap-1"
                      >
                        ↻ Refresh
                      </button>
                    </div>

                    {loadingActivity ? (
                      Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex gap-2.5 items-start">
                          <div className="w-6 h-6 rounded-full bg-white/5 skeleton flex-shrink-0" />
                          <div className="flex-1 space-y-1">
                            <div className="h-2.5 bg-white/5 skeleton rounded w-3/4" />
                            <div className="h-2 bg-white/5 skeleton rounded w-1/3" />
                          </div>
                        </div>
                      ))
                    ) : activities.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-52 text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <Zap className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm font-bold">No activity yet</p>
                          <p className="text-slate-600 text-xs mt-1">Team actions appear here in real-time</p>
                          <p className="text-slate-700 text-[10px] mt-1">Create tasks, update sprints, or move cards to see activity</p>
                        </div>
                      </div>
                    ) : activities.map((act, i) => {
                      const actMeta = ACTIVITY_ICONS[act.action?.toUpperCase()] || ACTIVITY_ICONS.UPDATE
                      return (
                        <motion.div
                          key={act.id || i}
                          initial={{ opacity: 0, x: 12 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.03 }}
                          className="flex gap-2.5 items-start group rounded-xl p-2 hover:bg-white/4 transition"
                        >
                          <div className={`w-6 h-6 mt-0.5 flex-shrink-0 rounded-full bg-gradient-to-br ${getColor(act.sender)} flex items-center justify-center text-[9px] font-bold text-white`}>
                            {getInitials(act.sender)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-slate-300 text-xs leading-relaxed break-words">
                              <span className="font-bold text-white">{act.sender}</span>
                              {' '}
                              <span className={actMeta.color}>{act.action?.toLowerCase() || 'updated'}</span>
                              {' '}
                              <span className="text-slate-400">{act.entity?.toLowerCase() || 'item'}</span>
                              {' '}
                              <span className="text-[11px]">{actMeta.icon}</span>
                            </p>
                            <span className="text-[9px] text-slate-600 mt-0.5 block flex items-center gap-1">
                              <Clock className="w-2.5 h-2.5 inline" /> {formatTime(act.timestamp)}
                            </span>
                          </div>
                        </motion.div>
                      )
                    })}
                  </motion.div>
                )}

                {/* MEMBERS TAB */}
                {activeTab === 'members' && (
                  <motion.div key="members" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-2">
                    {/* Online section */}
                    <div>
                      <p className="text-[9px] font-black text-emerald-500/70 uppercase tracking-widest px-1 mb-2">
                        🟢 Online — {onlineUsers.size}
                      </p>
                      {[...onlineUsers].map(name => {
                        const member = teamMembers.find(m => m.name === name)
                        return (
                          <motion.div
                            key={name}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition group cursor-pointer"
                            onClick={() => { setInput(i => i + `@${name} `); setActiveTab('chat'); inputRef.current?.focus() }}
                          >
                            <div className="relative">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${getColor(name)} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0`}>
                                {getInitials(name)}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border-2 border-[#09081c]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-200 text-xs font-bold truncate">{name} {name === userName && <span className="text-slate-500">(you)</span>}</p>
                              <p className="text-[9px] text-slate-600 capitalize font-medium">{member?.role?.replace('ROLE_', '').toLowerCase() || 'member'}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition">
                              <AtSign className="w-3 h-3 text-violet-400" title="Mention in chat" />
                            </div>
                          </motion.div>
                        )
                      })}
                    </div>

                    {/* All members section */}
                    {teamMembers.filter(m => !onlineUsers.has(m.name)).length > 0 && (
                      <div className="mt-3">
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest px-1 mb-2">
                          ⚫ Offline — {teamMembers.filter(m => !onlineUsers.has(m.name)).length}
                        </p>
                        {teamMembers.filter(m => !onlineUsers.has(m.name)).map((member, i) => (
                          <motion.div
                            key={member.id || i}
                            initial={{ opacity: 0, x: 8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.04 }}
                            className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5 transition group cursor-pointer opacity-50 hover:opacity-80"
                            onClick={() => { setInput(inp => inp + `@${member.name} `); setActiveTab('chat'); inputRef.current?.focus() }}
                          >
                            <div className="relative">
                              <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${getColor(member.name)} flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 grayscale`}>
                                {getInitials(member.name)}
                              </div>
                              <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-slate-600 rounded-full border-2 border-[#09081c]" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-slate-400 text-xs font-bold truncate">{member.name}</p>
                              <p className="text-[9px] text-slate-600 capitalize font-medium">{member.role?.replace('ROLE_', '').toLowerCase() || 'member'}</p>
                            </div>
                            <div className="opacity-0 group-hover:opacity-100 transition">
                              <AtSign className="w-3 h-3 text-violet-400" title="Mention in chat" />
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}

                    {teamMembers.length === 0 && (
                      <div className="flex flex-col items-center justify-center h-48 text-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
                          <Users className="w-6 h-6 text-violet-400" />
                        </div>
                        <div>
                          <p className="text-slate-400 text-sm font-bold">No team members yet</p>
                          <p className="text-slate-600 text-xs mt-1">Invite teammates from Team Management</p>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Connecting banner */}
            {!connected && (
              <div className="px-4 py-2 flex items-center gap-2" style={{ background: 'rgba(245,158,11,0.08)', borderTop: '1px solid rgba(245,158,11,0.12)' }}>
                <WifiOff className="w-3 h-3 text-amber-400" />
                <span className="text-amber-400/80 text-[10px] font-medium">Offline — messages saved locally</span>
              </div>
            )}

            {/* Mention autocomplete */}
            <AnimatePresence>
              {mentioning && filteredMentions.length > 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 8 }}
                  className="mx-3 mb-1 bg-slate-800 border border-slate-700 rounded-xl overflow-hidden shadow-xl"
                >
                  <p className="text-[9px] text-slate-500 font-bold uppercase px-3 pt-2 pb-1 tracking-wider">Mention someone</p>
                  {filteredMentions.slice(0, 5).map(m => (
                    <button
                      key={m.id}
                      onClick={() => insertMention(m.name)}
                      className="w-full flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition text-left"
                    >
                      <div className={`w-5 h-5 rounded-full bg-gradient-to-br ${getColor(m.name)} flex items-center justify-center text-[8px] font-bold text-white`}>
                        {getInitials(m.name)}
                      </div>
                      <span className="text-white text-xs font-medium">{m.name}</span>
                      {onlineUsers.has(m.name) && <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 ml-auto" />}
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Input */}
            {activeTab === 'chat' && (
              <div className="px-3 py-3 border-t" style={{ borderColor: 'rgba(139, 92, 246, 0.15)' }}>
                <div className="flex items-center gap-1.5 mb-2">
                  <div className={`w-4 h-4 rounded-full bg-gradient-to-br ${getColor(userName)} flex items-center justify-center text-[7px] font-bold text-white`}>
                    {userInitials}
                  </div>
                  <span className="text-[10px] text-slate-500 font-bold">{userName}</span>
                  <span className="ml-auto text-[9px] text-slate-600 font-medium">Type @ to mention</span>
                </div>
                <div className="flex gap-2 items-center">
                  <input
                    ref={inputRef}
                    id="war-room-chat-input"
                    type="text"
                    value={input}
                    onChange={e => {
                      setInput(e.target.value)
                      const lastAt = e.target.value.lastIndexOf('@')
                      if (lastAt !== -1 && lastAt === e.target.value.length - 1 - (e.target.value.length - lastAt - 1)) {
                        setMentioning(true)
                        setMentionQuery(e.target.value.slice(lastAt + 1))
                      } else if (mentioning) {
                        const afterAt = e.target.value.slice(e.target.value.lastIndexOf('@') + 1)
                        if (afterAt.includes(' ')) setMentioning(false)
                        else setMentionQuery(afterAt)
                      }
                    }}
                    onKeyDown={handleKeyDown}
                    placeholder="Message team…"
                    className="flex-1 text-slate-200 text-xs rounded-xl px-3 py-2.5 placeholder-slate-600 focus:outline-none transition"
                    style={{
                      background: 'rgba(255,255,255,0.05)',
                      border: '1px solid rgba(139,92,246,0.25)',
                    }}
                    onFocus={() => setUnreadCount(0)}
                  />
                  <button
                    id="war-room-send-btn"
                    onClick={sendMessage}
                    disabled={!input.trim()}
                    className="w-9 h-9 flex-shrink-0 flex items-center justify-center rounded-xl text-white transition disabled:opacity-30 active:scale-95 hover:opacity-90"
                    style={{ background: 'linear-gradient(135deg, #7c3aed, #4338ca)' }}
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default ChatSidebar
