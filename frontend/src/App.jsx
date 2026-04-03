import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import { AuthProvider, useAuth } from './context/AuthContext'
import { SocketProvider } from './context/SocketContext'

// Pages
import Login from './pages/Login'
import StudentDashboard from './pages/student/Dashboard'
import AddToQueue from './pages/student/AddToQueue'
import QueueStatus from './pages/student/QueueStatus'
import MoveSlot from './pages/student/MoveSlot'
import Timetable from './pages/student/Timetable'
import History from './pages/student/History'
import StaffDashboard from './pages/staff/Dashboard'
import EmergencyPage from './pages/staff/Emergency'
import NoShowPage from './pages/staff/NoShow'
import DoctorDashboard from './pages/doctor/Dashboard'
import Signup from './pages/Signup'

const ProtectedRoute = ({ children, allowedRoles }) => {
  const { user, loading, isAuthenticated } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="spinner-primary" />
    </div>
  )
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (allowedRoles && !allowedRoles.includes(user?.role)) {
    return <Navigate to={`/${user?.role}`} replace />
  }
  return children
}

const RoleRedirect = () => {
  const { user, isAuthenticated } = useAuth()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role === 'student') return <Navigate to="/student" replace />
  if (user?.role === 'staff') return <Navigate to="/staff" replace />
  if (user?.role === 'doctor') return <Navigate to="/doctor" replace />
  return <Navigate to="/login" replace />
}

const AppRoutes = () => (
  <Routes>
    <Route path="/login" element={<Login />} />
    <Route path="/signup" element={<Signup />} />
    <Route path="/" element={<RoleRedirect />} />

    {/* Student Routes */}
    <Route path="/student" element={<ProtectedRoute allowedRoles={['student']}><StudentDashboard /></ProtectedRoute>} />
    <Route path="/student/queue/join" element={<ProtectedRoute allowedRoles={['student']}><AddToQueue /></ProtectedRoute>} />
    <Route path="/student/queue/status" element={<ProtectedRoute allowedRoles={['student']}><QueueStatus /></ProtectedRoute>} />
    <Route path="/student/queue/move" element={<ProtectedRoute allowedRoles={['student']}><MoveSlot /></ProtectedRoute>} />
    <Route path="/student/timetable" element={<ProtectedRoute allowedRoles={['student']}><Timetable /></ProtectedRoute>} />
    <Route path="/student/history" element={<ProtectedRoute allowedRoles={['student']}><History /></ProtectedRoute>} />

    {/* Staff Routes */}
    <Route path="/staff" element={<ProtectedRoute allowedRoles={['staff']}><StaffDashboard /></ProtectedRoute>} />
    <Route path="/staff/emergency" element={<ProtectedRoute allowedRoles={['staff']}><EmergencyPage /></ProtectedRoute>} />
    <Route path="/staff/noshow" element={<ProtectedRoute allowedRoles={['staff']}><NoShowPage /></ProtectedRoute>} />

    {/* Doctor Routes */}
    <Route path="/doctor" element={<ProtectedRoute allowedRoles={['doctor']}><DoctorDashboard /></ProtectedRoute>} />

    <Route path="*" element={<Navigate to="/" replace />} />
  </Routes>
)

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SocketProvider>
          <AppRoutes />
          <Toaster position="top-right" toastOptions={{ duration: 4000 }} />
        </SocketProvider>
      </AuthProvider>
    </BrowserRouter>
  )
}
