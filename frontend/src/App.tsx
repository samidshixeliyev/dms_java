import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import Layout from './components/Layout'
import Login from './pages/Login'
import ForcePasswordChange from './pages/ForcePasswordChange'
import LegalActs from './pages/LegalActs'
import ExecutorDashboard from './pages/ExecutorDashboard'
import Approvals from './pages/Approvals'
import Reports from './pages/Reports'
import Users from './pages/Users'
import Departments from './pages/Departments'
import Executors from './pages/Executors'
import ActTypes from './pages/MasterData/ActTypes'
import ExecutionNotes from './pages/MasterData/ExecutionNotes'
import IssuingAuthorities from './pages/MasterData/IssuingAuthorities'
import ActivityLogs from './pages/ActivityLogs'
import Announcements from './pages/Announcements'

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth()
  if (!user) return <Navigate to="/login" replace />
  if (user.mustChangePassword) return <Navigate to="/force-password-change" replace />
  return <>{children}</>
}

function AppRoutes() {
  const { user } = useAuth()

  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/force-password-change" element={<ForcePasswordChange />} />

      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={
          user?.role === 'executor'
            ? <Navigate to="/executor/dashboard" replace />
            : <Navigate to="/legal-acts" replace />
        } />
        <Route path="legal-acts" element={<LegalActs />} />
        <Route path="executor/dashboard" element={<ExecutorDashboard />} />
        <Route path="approvals" element={<Approvals />} />
        <Route path="reports" element={<Reports />} />
        <Route path="users" element={<Users />} />
        <Route path="departments" element={<Departments />} />
        <Route path="executors" element={<Executors />} />
        <Route path="act-types" element={<ActTypes />} />
        <Route path="execution-notes" element={<ExecutionNotes />} />
        <Route path="issuing-authorities" element={<IssuingAuthorities />} />
        <Route path="activity-logs" element={<ActivityLogs />} />
        <Route path="announcements" element={<Announcements />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  )
}
