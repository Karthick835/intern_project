import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Save, LogOut, CheckCircle, ShieldAlert, CreditCard, Check, HelpCircle } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const Settings = () => {
  const [activeTab, setActiveTab] = useState('Profile')
  
  const initialName = localStorage.getItem('userName') || 'User'
  const initialEmail = localStorage.getItem('userEmail') || ''
  const initialRole = localStorage.getItem('userRole') || 'Member'
  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  const [planStatus, setPlanStatus] = useState(null)
  const [loadingPlan, setLoadingPlan] = useState(false)
  const [upgrading, setUpgrading] = useState(false)

  const [name, setName] = useState(initialName)
  const [email] = useState(initialEmail)
  const [role] = useState(initialRole)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState('')

  const userInitials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const fetchPlanStatus = async () => {
    try {
      setLoadingPlan(true)
      const api = axios.create({
        baseURL: getApiBase(),
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': subdomain
        }
      })
      const res = await api.get('/tenant/plan-status')
      setPlanStatus(res.data)
    } catch (err) {
      console.error('Failed to fetch plan status', err)
    } finally {
      setLoadingPlan(false)
    }
  }

  useEffect(() => {
    fetchPlanStatus()
  }, [])

  const handleUpgradePro = async () => {
    try {
      setUpgrading(true)
      const api = axios.create({
        baseURL: getApiBase(),
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': subdomain
        }
      })
      await api.post('/tenant/upgrade-pro')
      setMessage('Upgraded to PRO plan successfully!')
      fetchPlanStatus()
    } catch (err) {
      console.error('Failed to upgrade to PRO', err)
      setMessage('Failed to upgrade to PRO.')
    } finally {
      setUpgrading(false)
    }
  }



  const handleSaveProfile = async (e) => {
    e.preventDefault()
    setSaving(true)
    setMessage('')
    try {
      // Decode user ID roughly or just get from token. Wait, we can fetch all team members and match by email, 
      // or we can just send the update if we had a dedicated endpoint. 
      // Since team invites can edit via PUT /api/team/{id}, let's find the user in the team list and update.
      const api = axios.create({
        baseURL: getApiBase(),
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': subdomain
        }
      })
      
      const teamRes = await api.get('/team')
      const currentUser = teamRes.data.find(u => u.email === email)
      
      if (currentUser) {
        await api.put(`/team/${currentUser.id}`, {
          name: name.trim(),
          role: role
        })
        localStorage.setItem('userName', name.trim())
        setMessage('Profile updated successfully!')
      } else {
        setMessage('Failed to match current user in team database.')
      }
    } catch (err) {
      console.error('Failed to update profile settings', err)
      setMessage('Failed to update settings.')
    } finally {
      setSaving(false)
    }
  }

  const handleResetRole = async () => {
    if (!window.confirm("Do you want to reset your profile role to NONE? This will immediately log you out of your current role and show the Claim Role overlay modal so you can test it.")) return
    try {
      setSaving(true)
      const api = axios.create({
        baseURL: getApiBase(),
        headers: {
          'Authorization': `Bearer ${token}`,
          'X-Tenant-ID': subdomain
        }
      })
      const res = await api.post('/team/claim-role', { role: 'ROLE_NONE' })
      localStorage.setItem('authToken', res.data.token)
      localStorage.setItem('userRole', res.data.role)
      window.location.reload()
    } catch (err) {
      console.error('Failed to reset role', err)
      setMessage('Failed to reset role.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Settings</h1>
        <p className="text-slate-500 text-sm mt-1">Configure profile preferences and workspace options.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200/80 pb-px">
        {['Profile', 'Company', 'Notifications'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 text-xs font-semibold border-b-2 -mb-px transition-all duration-150 ${
              tab === activeTab
                ? 'text-primary-600 border-primary-600 font-bold'
                : 'text-slate-500 border-transparent hover:text-slate-800'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {message && (
        <div className="p-3.5 bg-primary-50 border border-primary-100 text-primary-700 text-xs font-medium rounded-xl flex items-center gap-2">
          <CheckCircle className="w-4 h-4" />
          {message}
        </div>
      )}

      {/* Settings Grid Panel */}
      <div className="max-w-2xl">
        {activeTab === 'Profile' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6"
          >
            <h2 className="text-sm font-bold text-slate-800">Profile Settings</h2>

            <form onSubmit={handleSaveProfile} className="space-y-5">
              {/* Avatar initials representation */}
              <div className="flex items-center gap-5">
                <div className="w-16 h-16 bg-gradient-to-br from-primary-500 to-secondary-500 rounded-full flex items-center justify-center text-white text-lg font-bold border border-white shadow-md">
                  {userInitials || 'U'}
                </div>
                <div>
                  <p className="text-xs font-semibold text-slate-700">Profile Avatar</p>
                  <p className="text-[10px] text-slate-400 mt-0.5">Dynamically populated from your account initials.</p>
                </div>
              </div>

              {/* Name */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl text-sm text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 focus:outline-none focus:border-violet-500 transition"
                  required
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  disabled
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed"
                />
              </div>

              {/* Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Role
                </label>
                <input
                  type="text"
                  value={role.replace('ROLE_', '').replace('_', ' ')}
                  disabled
                  className="w-full px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed capitalize"
                />
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition shadow"
                >
                  <Save className="w-4 h-4" />
                  {saving ? 'Saving...' : 'Save Profile'}
                </button>
                <button
                  type="button"
                  onClick={handleResetRole}
                  disabled={saving}
                  className="flex items-center gap-2 px-5 py-2.5 border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-50 transition shadow"
                >
                  Reset Role (Test Claim Modal)
                </button>
              </div>
            </form>
          </motion.div>
        )}

        {activeTab === 'Company' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6"
          >
            <h2 className="text-sm font-bold text-slate-800">Workspace Settings</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Subdomain Context
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={subdomain}
                    disabled
                    className="flex-1 px-4 py-2 border border-slate-200 rounded-xl text-sm bg-slate-50 text-slate-400 cursor-not-allowed font-mono"
                  />
                  <span className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-500">
                    .saasgrid.io
                  </span>
                </div>
              </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'Notifications' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white border border-slate-200/60 rounded-2xl p-6 shadow-sm space-y-6"
          >
            <h2 className="text-sm font-bold text-slate-800">Notification Preferences</h2>

            <div className="space-y-2">
              {[
                { label: 'Notify me when tasks are assigned to me', enabled: true },
                { label: 'Notify me when someone comments on my tasks', enabled: true },
                { label: 'Receive weekly sprint status email summaries', enabled: false }
              ].map((notif, idx) => (
                <label key={idx} className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50/50 cursor-pointer transition">
                  <input type="checkbox" defaultChecked={notif.enabled} className="rounded text-primary-600 focus:ring-primary-500 border-slate-350 w-4 h-4 cursor-pointer" />
                  <span className="text-slate-700 text-xs font-medium">{notif.label}</span>
                </label>
              ))}
            </div>
          </motion.div>
        )}

      </div>
    </div>
  )
}

export default Settings
