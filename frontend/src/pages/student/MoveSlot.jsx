import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { queueAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'

export default function MoveSlot() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [activeAppt, setActiveAppt] = useState(null)
  const [laterSlots, setLaterSlots] = useState([])
  const [selected, setSelected] = useState('')
  const [loading, setLoading] = useState(true)
  const [moving, setMoving] = useState(false)

  useEffect(() => {
    const init = async () => {
      try {
        const statusRes = await queueAPI.status(user._id)
        if (!statusRes.data.active) { navigate('/student'); return }
        const appt = statusRes.data.appointment
        setActiveAppt(appt)
        const slotsRes = await queueAPI.laterSlots(appt._id)
        setLaterSlots(slotsRes.data.laterSlots || [])
      } catch (err) {
        toast.error('Failed to load slot data.')
      } finally {
        setLoading(false)
      }
    }
    init()
  }, [])

  const handleMove = async () => {
    if (!selected) return
    setMoving(true)
    try {
      await queueAPI.move({ appointmentId: activeAppt._id, newSlot: selected })
      toast.success(`Slot moved to ${selected}!`)
      navigate('/student/queue/status')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to move slot.')
    } finally {
      setMoving(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-50"><Navbar />
      <div className="flex justify-center py-24"><div className="spinner-primary" /></div>
    </div>
  )

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div><h1 className="page-header">Move Slot</h1><p className="page-subtitle">Shift to a later available time</p></div>

        {/* Rules Info */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1">
          <p className="font-semibold text-amber-800 text-sm">📋 Rules</p>
          <ul className="text-amber-700 text-xs space-y-1 list-disc list-inside">
            <li>You can only move to a <strong>later</strong> time slot</li>
            <li>Changes not allowed within <strong>30 minutes</strong> of current slot</li>
            <li>Maximum <strong>2 changes</strong> per appointment</li>
          </ul>
        </div>

        {activeAppt && (
          <div className="card">
            <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Current Slot</p>
            <div className="flex items-center gap-4">
              <div className="text-3xl font-black text-gray-400">{activeAppt.timeSlot}</div>
              <div className="text-gray-400">→</div>
              <div className="text-3xl font-black text-primary-600">{selected || '?'}</div>
            </div>
            <p className="text-xs text-gray-400 mt-2">Changes used: {activeAppt.slotChangeCount || 0}/2</p>
          </div>
        )}

        {laterSlots.length === 0 ? (
          <div className="card text-center py-8 space-y-3">
            <div className="text-5xl">😔</div>
            <p className="font-semibold text-gray-700">No later slots available</p>
            <p className="text-gray-500 text-sm">No open slots exist after your current time. Consider rescheduling to another day.</p>
          </div>
        ) : (
          <div className="card space-y-3">
            <p className="font-semibold text-gray-900">Available Later Slots</p>
            <div className="grid grid-cols-3 gap-2">
              {laterSlots.map(slot => (
                <button
                  key={slot}
                  onClick={() => setSelected(slot)}
                  className={`py-3 rounded-xl border-2 text-sm font-bold transition-all duration-200
                    ${selected === slot
                      ? 'border-primary-500 bg-primary-50 text-primary-700'
                      : 'border-gray-200 hover:border-primary-300 text-gray-700'}`}
                >
                  {slot}
                </button>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={handleMove}
          disabled={!selected || moving}
          className="btn-primary w-full py-3 text-base"
        >
          {moving ? <><div className="spinner" />Moving...</> : `Confirm Move to ${selected || '—'}`}
        </button>
      </main>
    </div>
  )
}
