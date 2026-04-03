import { useState, useEffect } from 'react'
import { staffAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'

const SEVERITY_LEVELS = [
  { value: 'Low', label: '🟡 Low', desc: 'Minor issue, needs priority' },
  { value: 'Medium', label: '🟠 Medium', desc: 'Moderate urgency' },
  { value: 'High', label: '🔴 High', desc: 'Serious condition' },
  { value: 'Critical', label: '🚨 Critical', desc: 'Immediate life risk' },
]

export default function EmergencyPage() {
  const today = new Date().toISOString().split('T')[0]
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState('')
  const [severity, setSeverity] = useState('')
  const [reason, setReason] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  useEffect(() => {
    staffAPI.queue({ date: today })
      .then(res => setQueue(res.data.appointments || []))
      .catch(() => toast.error('Failed to load queue.'))
      .finally(() => setLoading(false))
  }, [])

  const selectedPatient = queue.find(a => a._id === selected)

  const handleConfirm = async () => {
    if (!selected || !severity || !reason.trim()) {
      toast.error('Please select patient, severity, and reason.')
      return
    }
    setConfirming(true)
    try {
      await staffAPI.emergency({ patientId: selected, severity, reason })
      toast.success('Emergency override applied. Patient moved to #1.')
      setSelected(''); setSeverity(''); setReason(''); setShowConfirm(false)
      const res = await staffAPI.queue({ date: today })
      setQueue(res.data.appointments || [])
    } catch (err) {
      toast.error(err.response?.data?.message || 'Emergency override failed.')
    } finally {
      setConfirming(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="page-header flex items-center gap-2">🚨 Emergency Override</h1>
          <p className="page-subtitle">Move a patient to the front of the queue</p>
        </div>

        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-700 text-sm font-semibold">⚠️ Staff Action Required</p>
          <p className="text-red-600 text-xs mt-1">This action moves the patient to position #1, shifting all others down. An audit log entry will be created.</p>
          <a
            href="https://www.nitw.ac.in/page/?url=/EMERGENCY/ECN/"
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-red-700 hover:underline"
          >
            🆘 Emergency Contact Numbers (NITW)
          </a>
        </div>

        <div className="card space-y-5">
          {/* Patient Selector */}
          <div>
            <label className="label">Select Patient</label>
            {loading ? <div className="spinner-primary w-6 h-6 mt-2" /> : (
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {queue.filter(a => a.status !== 'InConsultation' && a.status !== 'Completed').map(appt => (
                  <button
                    key={appt._id}
                    onClick={() => setSelected(appt._id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all
                      ${selected === appt._id ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{appt.studentId?.name}</p>
                        <p className="text-xs text-gray-500">{appt.studentId?.rollNumber} • {appt.timeSlot}</p>
                      </div>
                      <span className="text-sm font-bold text-gray-500">#{appt.queuePosition}</span>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Severity */}
          <div>
            <label className="label">Severity Level</label>
            <div className="grid grid-cols-2 gap-2">
              {SEVERITY_LEVELS.map(s => (
                <button
                  key={s.value}
                  onClick={() => setSeverity(s.value)}
                  className={`p-3 rounded-xl border-2 text-left transition-all
                    ${severity === s.value ? 'border-red-500 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                >
                  <p className="font-semibold text-sm">{s.label}</p>
                  <p className="text-xs text-gray-500">{s.desc}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="label">Reason / Notes</label>
            <textarea
              className="input-field min-h-24 resize-none"
              placeholder="Describe the emergency situation..."
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
          </div>

          <button
            onClick={() => {
              if (!selected || !severity || !reason.trim()) { toast.error('Fill in all fields.'); return }
              setShowConfirm(true)
            }}
            className="btn-danger w-full py-3 text-base"
            disabled={!selected || !severity || !reason.trim()}
          >
            🚨 Apply Emergency Override
          </button>
        </div>

        {/* Confirmation Modal */}
        {showConfirm && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl p-6 max-w-sm w-full shadow-2xl animate-fade-in space-y-4">
              <div className="text-center">
                <div className="text-5xl mb-3">🚨</div>
                <h3 className="text-xl font-bold text-gray-900">Confirm Emergency</h3>
                <p className="text-sm text-gray-500 mt-2">
                  Move <strong>{selectedPatient?.studentId?.name}</strong> to position #1?
                </p>
                <div className="mt-3 bg-red-50 rounded-lg p-3 text-left text-sm">
                  <p><strong>Severity:</strong> {severity}</p>
                  <p><strong>Reason:</strong> {reason}</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowConfirm(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleConfirm} disabled={confirming} className="btn-danger flex-1">
                  {confirming ? <div className="spinner mx-auto" /> : 'Confirm'}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
