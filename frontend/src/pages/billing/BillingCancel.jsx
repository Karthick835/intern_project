import React from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { AlertTriangle, ArrowLeft } from 'lucide-react'

const BillingCancel = () => {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.4 }}
        className="max-w-md w-full bg-white border border-slate-200 rounded-3xl p-8 shadow-2xl text-center space-y-6"
      >
        <div className="w-16 h-16 bg-rose-50 text-rose-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">Upgrade Cancelled</h1>
          <p className="text-slate-500 text-sm leading-relaxed">
            The payment session was cancelled or could not be completed. No charges were made to your account.
          </p>
        </div>

        <button
          onClick={() => navigate('/settings')}
          className="w-full flex items-center justify-center gap-2 py-3 bg-slate-900 hover:bg-slate-800 active:scale-98 text-white rounded-xl transition text-sm font-bold shadow-lg"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Settings
        </button>
      </motion.div>
    </div>
  )
}

export default BillingCancel
