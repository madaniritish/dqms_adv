import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { useSocket } from '../../context/SocketContext'
import { queueAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'
import toast from 'react-hot-toast'

export default function QueueStatus() {
  const { user } = useAuth()
  const { queueUpdate } = useSocket()
  const navigate = useNavigate()
  const [status, setStatus] = useState(null)
  const [loading, setLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)
  const [showCancelConfirm, setShowCancelConfirm] = useState(false)

  const fetchStatus = async () => {
    try {
      const res = await queueAPI.status(user._id)
      setStatus(res.data)
    } catch { setStatus({ active: false }) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchStatus() }, [])
  useEffect(() => { if (queueUpdate) fetchStatus() }, [queueUpdate])

  const handleCancel = async () => {
    setCancelling(true)
    try {
      await queueAPI.cancel(status.appointment._id)
      toast.success('Appointment cancelled successfully.')
      navigate('/student')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Cannot cancel appointment.')
    } finally {
      setCancelling(false)
      setShowCancelConfirm(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <div className="flex items-center justify-center py-24"><div className="spinner-primary" /></div>
    </div>
  )

  const appt = status?.appointment

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div><h1 className="page-header">Queue Status</h1><p className="page-subtitle">Live position updated in real-time</p></div>

        {!status?.active ? (
          <div className="card text-center py-10 space-y-4">
            <div className="text-6xl">📋</div>
            <h2 className="text-xl font-bold">No Active Appointment</h2>
            <p className="text-gray-500">You're not in any queue.</p>
            <Link to="/student/queue/join" className="btn-primary inline-flex mx-auto">Join Queue</Link>
          </div>
        ) : (
          <>
            {/* Position Ring */}
            <div className="card text-center space-y-3">
              <p className="text-gray-500 text-sm font-medium uppercase tracking-wide">Your Queue Position</p>
              <div className="relative w-36 h-36 mx-auto">
                <svg className="w-36 h-36 -rotate-90" viewBox="0 0 56 56">
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#e5e7eb" strokeWidth="5" />
                  <circle cx="28" cy="28" r="22" fill="none" stroke="#2563eb" strokeWidth="5"
                    strokeDasharray={`${Math.max(5, 138 - appt.patientsAhead * 10)} 138`}
                    strokeLinecap="round" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-4xl font-black text-primary-700">#{appt.queuePosition}</span>
                </div>
              </div>
              <StatusBadge status={appt.status} large showDot />
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
              <div className="stat-card text-center">
                <p className="stat-label">Ahead</p>
                <p className="stat-value text-2xl">{appt.patientsAhead}</p>
              </div>
              <div className="stat-card text-center">
                <p className="stat-label">Wait</p>
                <p className="stat-value text-2xl text-amber-600">{appt.estimatedWaitMin}m</p>
              </div>
              <div className="stat-card text-center">
                <p className="stat-label">Slot</p>
                <p className="text-lg font-bold text-gray-900">{appt.timeSlot}</p>
              </div>
            </div>

            {/* Doctor info */}
            <div className="card bg-blue-50 border-blue-100">
              <p className="text-xs font-semibold text-blue-600 uppercase mb-2">Doctor Details</p>
              <p className="font-bold text-gray-900">{appt.doctor?.name}</p>
              <p className="text-sm text-gray-600">{appt.doctor?.specialization}</p>
              {appt.doctor?.roomNumber && <p className="text-sm text-gray-500 mt-1">📍 {appt.doctor?.roomNumber}</p>}
            </div>

            {/* Alerts */}
            {appt.status === 'Next' && (
              <div className="bg-green-500 text-white rounded-2xl p-5 text-center space-y-2 animate-pulse">
                <div className="text-3xl">🟢</div>
                <p className="font-black text-xl">IT'S YOUR TURN!</p>
                <p className="text-green-100 text-sm">Please arrive at the Healthcare Center immediately.</p>
              </div>
            )}
            {appt.status === 'Second-Next' && (
              <div className="bg-amber-500 text-white rounded-2xl p-5 text-center space-y-2">
                <div className="text-3xl">⚠️</div>
                <p className="font-bold text-lg">You're Almost Up!</p>
                <p className="text-amber-100 text-sm">Start heading to the center now.</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3">
              <Link to="/student/queue/move" className="btn-secondary flex-1 text-center">Move Slot</Link>
              <button
                onClick={() => setShowCancelConfirm(true)}
                className="btn-danger flex-1"
              >
                Cancel Appointment
              </button>
            </div>

            {/* Cancel Confirmation Modal */}
            {showCancelConfirm && (
              <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in space-y-4">
                  <div className="text-4xl text-center">⚠️</div>
                  <h3 className="text-lg font-bold text-gray-900 text-center">Cancel Appointment?</h3>
                  <p className="text-gray-500 text-sm text-center">
                    This will cancel your slot on <strong>{appt.date}</strong> at <strong>{appt.timeSlot}</strong>. This cannot be undone.
                  </p>
                  <div className="flex gap-3">
                    <button onClick={() => setShowCancelConfirm(false)} className="btn-secondary flex-1">Keep It</button>
                    <button onClick={handleCancel} disabled={cancelling} className="btn-danger flex-1">
                      {cancelling ? <div className="spinner mx-auto" /> : 'Yes, Cancel'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </main>
    </div>
  )
}
