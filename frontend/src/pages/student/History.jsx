import { useState, useEffect } from 'react'
import { useAuth } from '../../context/AuthContext'
import { queueAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'

export default function History() {
  const { user } = useAuth()
  const [appointments, setAppointments] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    queueAPI.history(user._id)
      .then(res => setAppointments(res.data.appointments || []))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="page-header">Appointment History</h1>
          <p className="page-subtitle">Past 6 months</p>
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner-primary" /></div>
        ) : appointments.length === 0 ? (
          <div className="card text-center py-16 space-y-3">
            <div className="text-6xl">📭</div>
            <h2 className="text-xl font-bold text-gray-800">No History Found</h2>
            <p className="text-gray-500">Your past appointments will appear here.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map(appt => (
              <div key={appt._id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-semibold text-gray-900">{appt.doctorId?.name || 'Doctor'}</p>
                      {appt.isEmergency && <span className="badge bg-red-100 text-red-700 text-xs">Emergency</span>}
                    </div>
                    <p className="text-sm text-gray-500">{appt.doctorId?.specialization}</p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-gray-400">
                      <span>📅 {appt.date}</span>
                      <span>⏰ {appt.timeSlot}</span>
                      <span>#{appt.queuePosition}</span>
                    </div>
                  </div>
                  <StatusBadge status={appt.status} />
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
