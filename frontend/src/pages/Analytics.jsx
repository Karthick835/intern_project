import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { BarChart, Bar, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie } from 'recharts'
import { BarChart3, Users, PieChart as PieIcon, Loader, AlertCircle, Lock } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../config'

const Analytics = () => {
  const [loading, setLoading] = useState(true)
  const [currentPlan, setCurrentPlan] = useState('PRO')
  const [velocity, setVelocity] = useState({ velocities: {}, averageVelocity: 0 })
  const [workload, setWorkload] = useState({ workload: {} })
  const [distribution, setDistribution] = useState({ byStatus: {}, byPriority: {}, byType: {} })
  const [error, setError] = useState('')

  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  const api = axios.create({
    baseURL: getApiBase(),
    headers: {
      'Authorization': `Bearer ${token}`,
      'X-Tenant-ID': subdomain
    }
  })

  const fetchAnalytics = async () => {
    try {
      setLoading(true)
      const [velRes, workRes, distRes] = await Promise.all([
        api.get('/dashboard/velocity-chart'),
        api.get('/dashboard/workload'),
        api.get('/dashboard/task-distribution')
      ])

      setVelocity(velRes.data)
      setWorkload(workRes.data)
      setDistribution(distRes.data)
    } catch (err) {
      console.error('Failed to fetch analytics data', err)
      setError('Could not retrieve analytics reports.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAnalytics()
  }, [])

  // Format Recharts data
  const velocityData = Object.keys(velocity.velocities || {}).map((sprintName) => ({
    sprint: sprintName,
    velocity: velocity.velocities[sprintName]
  }))

  const statusData = Object.keys(distribution.byStatus || {}).map((status) => ({
    name: status.replace('_', ' '),
    value: distribution.byStatus[status]
  }))

  const workloadData = Object.keys(workload.workload || {}).map((user) => ({
    name: user,
    hours: workload.workload[user]
  }))

  const STATUS_COLORS = ['#0ea5e9', '#eab308', '#a855f7', '#22c55e']
  const WORKLOAD_COLORS = ['#6366f1', '#f43f5e', '#ec4899', '#14b8a6', '#f59e0b']

  return (
    <div className="space-y-6">
      {/* Header Panel */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Analytics & Insights</h1>
        <p className="text-slate-500 text-sm mt-1">Trace team velocity, workload distribution, and status aggregates.</p>
      </div>

      {error && (
        <div className="p-4 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl">
          {error}
        </div>
      )}

      {loading && velocityData.length === 0 ? (
        <div className="flex justify-center items-center py-24">
          <Loader className="w-8 h-8 text-primary-500 animate-spin" />
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Velocity Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-[24rem]">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <BarChart3 className="w-4.5 h-4.5 text-primary-500" />
              Sprint Velocity
            </h3>
            <div className="flex-1 min-h-0">
              {velocityData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                  No completed sprints velocity recorded yet.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={velocityData} barSize={32}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis dataKey="sprint" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis tick={{ fontSize: 10, fill: '#94a3b8' }} label={{ value: 'Story Points Completed', angle: -90, position: 'insideLeft', style: { fontSize: 10, fill: '#94a3b8' } }} />
                    <Tooltip cursor={{ fill: 'rgba(226, 232, 240, 0.3)' }} />
                    <Bar dataKey="velocity" fill="#0ea5e9" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Task Distribution Pie Chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-[24rem]">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <PieIcon className="w-4.5 h-4.5 text-primary-500" />
              Task Status Distribution
            </h3>
            <div className="flex-1 min-h-0">
              {statusData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                  No tasks recorded in this workspace.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={statusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={85}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {statusData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend formatter={(value) => <span className="text-xs text-slate-600 font-medium capitalize">{value.toLowerCase()}</span>} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          {/* Team Workload chart */}
          <div className="bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm flex flex-col h-[26rem] lg:col-span-2">
            <h3 className="font-bold text-slate-800 text-sm mb-4 flex items-center gap-2">
              <Users className="w-4.5 h-4.5 text-primary-500" />
              Team Workload (Estimated Hours Assigned)
            </h3>
            <div className="flex-1 min-h-0">
              {workloadData.length === 0 ? (
                <div className="flex items-center justify-center h-full text-slate-400 text-xs">
                  No workload recorded. Verify users have active/todo tasks.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={workloadData} layout="vertical" barSize={18}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#94a3b8' }} />
                    <YAxis dataKey="name" type="category" tick={{ fontSize: 10, fill: '#64748b' }} axisLine={false} tickLine={false} width={80} />
                    <Tooltip cursor={{ fill: 'rgba(226, 232, 240, 0.3)' }} />
                    <Bar dataKey="hours" radius={[0, 4, 4, 0]}>
                      {workloadData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={WORKLOAD_COLORS[index % WORKLOAD_COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Analytics
