import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { queueAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'

export default function StudentDashboard() {
  const { user } = useAuth()
  const { connected, queueUpdate } = useSocket()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)

  const fetchStatus = async () => {
    try {
      const res = await queueAPI.status(user._id)
      setStatus(res.data)
    } catch (e) {
      setStatus({ active: false })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchStatus() }, [])
  useEffect(() => { if (queueUpdate) fetchStatus() }, [queueUpdate])

  const appt = status?.appointment

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">

        {/* Welcome Banner */}
        <div className="bg-gradient-to-r from-nitw-blue to-primary-700 rounded-2xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-200 text-sm">Good {getGreeting()},</p>
              <h1 className="text-2xl font-bold">{user?.name}</h1>
              <p className="text-blue-300 text-sm mt-0.5">{user?.rollNumber && `Roll: ${user.rollNumber}`}</p>
            </div>
            <div className="text-5xl opacity-80">🏥</div>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
          ${connected ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
          <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500 animate-pulse' : 'bg-amber-500'}`} />
          {connected ? 'Live updates active — queue changes appear instantly' : 'Reconnecting to live updates...'}
        </div>

        {/* Active Queue Status */}
        {loading ? (
          <div className="card flex items-center justify-center py-12">
            <div className="spinner-primary" />
          </div>
        ) : status?.active ? (
          <div className="card space-y-4 border-l-4 border-l-primary-500 animate-slide-up">
            <div className="flex items-center justify-between">
              <h2 className="font-bold text-gray-900 text-lg">Active Appointment</h2>
              <StatusBadge status={appt.status} large />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="stat-card bg-primary-50 border-primary-100">
                <p className="stat-label text-primary-600">Queue Position</p>
                <p className="stat-value text-primary-700">#{appt.queuePosition}</p>
              </div>
              <div className="stat-card bg-amber-50 border-amber-100">
                <p className="stat-label text-amber-600">Est. Wait</p>
                <p className="stat-value text-amber-700">{appt.estimatedWaitMin}m</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Ahead of You</p>
                <p className="stat-value">{appt.patientsAhead}</p>
              </div>
              <div className="stat-card">
                <p className="stat-label">Time Slot</p>
                <p className="text-xl font-bold text-gray-900">{appt.timeSlot}</p>
              </div>
            </div>

            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-xs text-gray-500 uppercase font-semibold mb-1">Doctor</p>
              <p className="font-semibold text-gray-900">{appt.doctor?.name}</p>
              <p className="text-sm text-gray-500">{appt.doctor?.specialization} • {appt.doctor?.roomNumber}</p>
            </div>

            {/* Alert banners */}
            {appt.status === 'Next' && (
              <div className="bg-green-500 text-white rounded-xl p-4 text-center font-bold animate-pulse">
                🟢 It's YOUR TURN! Please arrive at the Healthcare Center immediately.
              </div>
            )}
            {appt.status === 'Second-Next' && (
              <div className="bg-amber-500 text-white rounded-xl p-4 text-center font-semibold">
                ⚠️ You're second in line. Start heading to the center now!
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Link to="/student/queue/status" className="btn-primary flex-1">View Details</Link>
              <Link to="/student/queue/move" className="btn-secondary flex-1 text-center">Move Slot</Link>
            </div>
          </div>
        ) : (
          <div className="card text-center py-10 space-y-4 animate-slide-up">
            <div className="text-6xl">📋</div>
            <h2 className="text-xl font-bold text-gray-900">No Active Appointment</h2>
            <p className="text-gray-500">You're not in any queue right now.</p>
            <Link to="/student/queue/join" className="btn-primary inline-flex mx-auto px-8">
              ➕ Join Queue
            </Link>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          {[
            { to: '/student/queue/join', icon: '➕', label: 'Join Queue', color: 'bg-primary-50 border-primary-200 text-primary-700' },
            { to: '/student/timetable', icon: '📅', label: 'Doctor Timetable', color: 'bg-nitw-light border-blue-200 text-nitw-blue' },
            { to: '/student/history', icon: '🕓', label: 'History', color: 'bg-purple-50 border-purple-200 text-purple-700' },
            { to: '/student/queue/status', icon: '📊', label: 'Queue Status', color: 'bg-green-50 border-green-200 text-green-700' },
          ].map(({ to, icon, label, color }) => (
            <Link key={to} to={to} className={`card-hover flex flex-col items-center gap-2 py-6 border ${color} rounded-xl text-center font-semibold text-sm`}>
              <span className="text-3xl">{icon}</span>{label}
            </Link>
          ))}
        </div>

      </main>
    </div>
  )
}

const getGreeting = () => {
  const h = new Date().getHours()
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening'
}
