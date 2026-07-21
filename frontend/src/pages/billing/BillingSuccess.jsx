import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { CheckCircle2, ArrowRight, Loader, AlertCircle } from 'lucide-react'
import axios from 'axios'
import { getApiBase } from '../../config'

const BillingSuccess = () => {
  const navigate = useNavigate()
  const [status, setStatus] = useState('verifying') // verifying, success, timeout
  const subdomain = localStorage.getItem('tenantSubdomain') || 'workspace'
  const token = localStorage.getItem('authToken')

  useEffect(() => {
    const queryParams = new URLSearchParams(window.location.search)
    const mockUpgrade = queryParams.get('mock_upgrade')

    let attempts = 0
    const maxAttempts = 15 // 30 seconds total
    let intervalId = null

    const checkPlanStatus = async () => {
      try {
        const api = axios.create({
          baseURL: getApiBase(),
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': subdomain
          }
        })
        const res = await api.get('/tenant/plan-status')
        if (res.data && res.data.plan === 'ENTERPRISE') {
          setStatus('success')
          if (intervalId) clearInterval(intervalId)
        }
      } catch (err) {
        console.error('Error polling plan status:', err)
      }

      attempts++
      if (attempts >= maxAttempts) {
        setStatus('timeout')
        if (intervalId) clearInterval(intervalId)
      }
    }

    const triggerMockUpgrade = async () => {
      try {
        const api = axios.create({
          baseURL: getApiBase(),
          headers: {
            'Authorization': `Bearer ${token}`,
            'X-Tenant-ID': subdomain
          }
        })
        await api.post('/billing/mock-confirm')
        setStatus('success')
      } catch (err) {
        console.error('Mock upgrade confirmation failed:', err)
        setStatus('timeout')
      }
    }

    if (mockUpgrade === 'true') {
      triggerMockUpgrade()
    } else {
      // Run first check immediately
      checkPlanStatus()
      intervalId = setInterval(checkPlanStatus, 2000)
    }

    return () => {
      if (intervalId) clearInterval(intervalId)
    }
  }, [token, subdomain])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl text-center space-y-6"
      >
        {status === 'verifying' && (
          <div className="space-y-6 py-6">
            <div className="w-16 h-16 bg-primary-50 text-primary-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <Loader className="w-8 h-8 animate-spin" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Confirming Payment</h1>
              <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                We are waiting for Stripe to confirm your payment transaction. This will take just a few seconds...
              </p>
            </div>
          </div>
        )}

        {status === 'timeout' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-amber-50 text-amber-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div className="space-y-2">
              <h1 className="text-xl font-bold text-slate-800 tracking-tight">Still Verifying...</h1>
              <p className="text-slate-500 text-xs max-w-xs mx-auto leading-relaxed">
                Stripe test checkout was completed, but our servers are still waiting for the webhook confirmation.
              </p>
            </div>
            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl transition text-sm font-bold shadow-lg"
            >
              Go to Dashboard Anyway
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}

        {status === 'success' && (
          <div className="space-y-6">
            <div className="w-16 h-16 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center mx-auto shadow-inner animate-bounce">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-2xl font-black text-slate-900 tracking-tight">Upgrade Successful!</h1>
              <p className="text-slate-500 text-sm leading-relaxed">
                Thank you! Your transaction completed successfully. Your workspace is now upgraded to the <span className="font-extrabold text-primary-600">ENTERPRISE</span> plan.
              </p>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-100 rounded-2xl text-left space-y-3.5">
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">Unlocked Features:</h3>
              <ul className="text-xs text-slate-600 space-y-2.5">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Unlimited projects, tasks, and team members
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Full audit trail & activity logs
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></span>
                  Analytics charts & reports unlocked
                </li>
              </ul>
            </div>

            <button
              onClick={() => navigate('/dashboard')}
              className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl transition text-sm font-bold shadow-lg"
            >
              Go to Dashboard
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default BillingSuccess
