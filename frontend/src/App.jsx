import React, { useState } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import Landing from './pages/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import SetupWorkspace from './pages/auth/SetupWorkspace'
import AcceptInvite from './pages/auth/AcceptInvite'
import JoinRequest from './pages/auth/JoinRequest'
import Dashboard from './pages/Dashboard'
import KanbanBoard from './pages/KanbanBoard'
import SprintBoard from './pages/SprintBoard'
import Analytics from './pages/Analytics'
import Roadmap from './pages/Roadmap'
import TaskDetail from './pages/TaskDetail'
import TeamManagement from './pages/TeamManagement'
import Settings from './pages/Settings'
import Leaderboard from './pages/Leaderboard'
import PersonalScorecard from './pages/PersonalScorecard'
import ProtectedRoute from './components/ProtectedRoute'
import AppShell from './components/layout/AppShell'
import BillingSuccess from './pages/billing/BillingSuccess'
import BillingCancel from './pages/billing/BillingCancel'
import Docs from './pages/Docs'
import DevOps from './pages/DevOps'

function App() {
  const [authToken, setAuthToken] = useState(() => {
    try {
      return localStorage.getItem('authToken')
    } catch (e) {
      return null
    }
  })

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<Landing />} />
        <Route path="/login" element={<Login setAuthToken={setAuthToken} />} />
        <Route path="/register" element={<Navigate to="/login" replace />} />
        <Route path="/setup" element={<SetupWorkspace setAuthToken={setAuthToken} />} />
        <Route path="/join/invite" element={<AcceptInvite setAuthToken={setAuthToken} />} />
        <Route path="/join/request" element={<JoinRequest />} />

        {/* Protected Routes wrapped in AppShell */}
        <Route 
          path="/dashboard" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <Dashboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route 
          path="/docs" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <Docs />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/devops" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <DevOps />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/tasks" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <KanbanBoard />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/kanban" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <KanbanBoard />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/sprints" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <SprintBoard />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/roadmap" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <Roadmap />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/analytics" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <Analytics />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/task/:id" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <TaskDetail />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/team" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <TeamManagement />
              </AppShell>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/settings" 
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <Settings />
              </AppShell>
            </ProtectedRoute>
          } 
        />

        <Route path="/billing/success" element={<BillingSuccess />} />
        <Route path="/billing/cancel" element={<BillingCancel />} />

        <Route
          path="/leaderboard"
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <Leaderboard />
              </AppShell>
            </ProtectedRoute>
          }
        />
        <Route
          path="/scorecard"
          element={
            <ProtectedRoute authToken={authToken}>
              <AppShell>
                <PersonalScorecard />
              </AppShell>
            </ProtectedRoute>
          }
        />

        {/* Catch-all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  )
}

export default App
