import { useState, useEffect } from 'react'
import { staffAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'

export default function NoShowPage() {
  const today = new Date().toISOString().split('T')[0]
  const [nextPatient, setNextPatient] = useState(null)
  const [loading, setLoading] = useState(true)
  const [marking, setMarking] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const fetchNext = async () => {
    setLoading(true)
    try {
      const res = await staffAPI.queue({ date: today, status: 'Next' })
      const appts = res.data.appointments || []
      setNextPatient(appts.length > 0 ? appts[0] : null)
    } catch { setNextPatient(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchNext() }, [])

  const handleNoShow = async () => {
    if (!nextPatient) return
    setMarking(true)
    try {
      await staffAPI.noshow({ appointmentId: nextPatient._id })
      toast.success('No-show recorded. Queue advanced.')
      setShowConfirm(false)
      await fetchNext()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to mark no-show.')
    } finally {
      setMarking(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="page-header flex items-center gap-2">⚠️ No-Show Handler</h1>
          <p className="page-subtitle">Mark the current #1 patient as no-show and advance queue</p>
        </div>

        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          <strong>Rule:</strong> Mark no-show only if the patient has not arrived within <strong>5 minutes</strong> of the "Next" notification.
        </div>

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner-primary" /></div>
        ) : !nextPatient ? (
          <div className="card text-center py-12 space-y-3">
            <div className="text-6xl">✅</div>
            <h2 className="text-xl font-bold text-gray-800">No Active #1 Patient</h2>
            <p className="text-gray-500 text-sm">No patient is currently marked as "Next".</p>
            <button onClick={fetchNext} className="btn-secondary inline-flex mx-auto">Refresh</button>
          </div>
        ) : (
          <div className="card space-y-5">
            <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4">
              <p className="text-xs font-semibold text-green-600 uppercase mb-1">Current #1 — Next Patient</p>
              <p className="text-xl font-bold text-gray-900">{nextPatient.studentId?.name}</p>
              <p className="text-sm text-gray-500">{nextPatient.studentId?.rollNumber} • {nextPatient.studentId?.email}</p>
              <div className="flex gap-6 mt-3 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Doctor</p>
                  <p className="font-semibold">{nextPatient.doctorId?.name}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Time Slot</p>
                  <p className="font-mono font-semibold">{nextPatient.timeSlot}</p>
                </div>
                {nextPatient.nextNotifiedAt && (
                  <div>
                    <p className="text-gray-400 text-xs">Notified At</p>
                    <p className="font-semibold">{new Date(nextPatient.nextNotifiedAt).toLocaleTimeString()}</p>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setShowConfirm(true)}
              className="btn-warning w-full py-3 text-base"
            >
              ⚠️ Mark as No-Show & Advance Queue
            </button>
          </div>
        )}

        {/* Confirm Modal */}
        {showConfirm && nextPatient && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-3">⚠️</div>
                <h3 className="text-xl font-bold">Confirm No-Show</h3>
                <p className="text-gray-500 text-sm mt-2">
                  Mark <strong>{nextPatient.studentId?.name}</strong> as No-Show and advance the queue?
                </p>
                <p className="text-xs text-gray-400 mt-1">This will be logged and the next patient will be notified.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleNoShow} disabled={marking} className="btn-warning flex-1">
                  {marking ? <div className="spinner mx-auto" /> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
