import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'
import { queueAPI, timetableAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import toast from 'react-hot-toast'
import { addDaysToDateStr, getClinicTodayStr, getMinutesUntil } from '../../utils/time'

export default function AddToQueue() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const clinicToday = getClinicTodayStr()

  const [date, setDate] = useState(clinicToday)
  const [doctors, setDoctors] = useState([])
  const [selectedDoctor, setSelectedDoctor] = useState('')
  const [slot, setSlot] = useState(null)
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(null)
  const [loadingDoctors, setLoadingDoctors] = useState(false)
  const [loadingSlot, setLoadingSlot] = useState(false)
  const [recommendNextDay, setRecommendNextDay] = useState(false)

  // Load doctors for the selected date
  useEffect(() => {
    if (!date) return
    setLoadingDoctors(true)
    timetableAPI.get(date)
      .then(res => setDoctors(res.data.doctors || []))
      .catch(() => toast.error('Failed to load doctors.'))
      .finally(() => setLoadingDoctors(false))
  }, [date])

  // Load next available slot when doctor selected
  useEffect(() => {
    if (!selectedDoctor || !date) { setSlot(null); return }
    setLoadingSlot(true)
    setRecommendNextDay(false)
    queueAPI.slots(date, selectedDoctor)
      .then(res => {
        const available = res.data.slots || []
        if (available.length > 0) {
          setSlot(available[0])
          setRecommendNextDay(false)
          return
        }

        // If today has no future slots, recommend tomorrow.
        if (String(date) === clinicToday) {
          setSlot(null)
          setRecommendNextDay(true)
        } else {
          setSlot(null)
          setRecommendNextDay(false)
        }
      })
      .catch(() => toast.error('Failed to load slots.'))
      .finally(() => setLoadingSlot(false))
  }, [selectedDoctor, date])

  const handleJoin = async () => {
    if (!selectedDoctor || !slot) return
    setConfirming(true)
    try {
      const res = await queueAPI.join({ date, doctorId: selectedDoctor })
      setConfirmed(res.data.appointment)
      toast.success('Successfully joined the queue!')
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to join queue.')
    } finally {
      setConfirming(false)
    }
  }

  const doctor = doctors.find(d => d._id === selectedDoctor)

  if (confirmed) {
    const minutesUntilSlot = getMinutesUntil(confirmed?.date, confirmed?.timeSlot)
    return (
      <div className="min-h-screen bg-gray-50">
        <Navbar />
        <main className="max-w-md mx-auto px-4 py-10 animate-fade-in">
          <div className="card text-center space-y-6">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-4xl">✅</div>
            <div>
              <h2 className="text-2xl font-bold text-gray-900">Queue Confirmed!</h2>
              <p className="text-gray-500 mt-1">A confirmation email has been sent.</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-5 text-left space-y-3">
              {[
                ['Doctor', confirmed.doctor?.name],
                ['Date', confirmed.date],
                ['Time Slot', confirmed.timeSlot],
                ['Queue Position', `#${confirmed.queuePosition}`],
                ['Remaining', `${minutesUntilSlot ?? 0} minutes`],
                ['Status', confirmed.status],
              ].map(([k, v]) => (
                <div key={k} className="flex justify-between text-sm">
                  <span className="text-gray-500 font-medium">{k}</span>
                  <span className="font-semibold text-gray-900">{v}</span>
                </div>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => navigate('/student/queue/status')} className="btn-primary flex-1">View Status</button>
              <button onClick={() => navigate('/student')} className="btn-secondary flex-1">Dashboard</button>
            </div>
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-lg mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="page-header">Join Queue</h1>
          <p className="page-subtitle">Select a date and doctor to get your slot</p>
        </div>

        <div className="card space-y-5">
          {/* Date Picker */}
          <div>
            <label className="label">Visit Date</label>
            <input
              type="date"
              className="input-field"
              value={date}
                min={clinicToday}
              onChange={e => { setDate(e.target.value); setSelectedDoctor(''); setSlot(null) }}
            />
          </div>

          {/* Doctor Selector */}
          <div>
            <label className="label">Select Doctor</label>
            {loadingDoctors ? (
              <div className="flex items-center gap-2 text-gray-500 text-sm py-2"><div className="spinner-primary w-5 h-5" /> Loading doctors...</div>
            ) : (
              <div className="space-y-2">
                {doctors.filter(d => d.isAvailable && d.slotsRemaining > 0).map(doc => (
                  <button
                    key={doc._id}
                    onClick={() => setSelectedDoctor(doc._id)}
                    className={`w-full text-left p-4 rounded-xl border-2 transition-all duration-200
                      ${selectedDoctor === doc._id ? 'border-primary-500 bg-primary-50' : 'border-gray-200 hover:border-gray-300 bg-white'}`}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-gray-900">{doc.name}</p>
                        <p className="text-sm text-gray-500">{doc.specialization} • {doc.roomNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-green-600">{doc.slotsRemaining} slots left</p>
                        <p className="text-xs text-gray-400">{doc.queueLength} in queue</p>
                      </div>
                    </div>
                  </button>
                ))}
                {doctors.filter(d => d.isAvailable && d.slotsRemaining > 0).length === 0 && (
                  <p className="text-gray-500 text-sm py-4 text-center">No doctors available for this date.</p>
                )}
              </div>
            )}
          </div>

          {/* Auto-assigned Slot */}
          {selectedDoctor && (
            <div>
              <label className="label">Your Assigned Slot (auto)</label>
              {loadingSlot ? (
                <div className="flex items-center gap-2 text-gray-500 text-sm"><div className="spinner-primary w-5 h-5" /> Finding next slot...</div>
              ) : slot ? (
                <div className="bg-green-50 border-2 border-green-400 rounded-xl p-5 text-center">
                  <p className="text-4xl font-bold text-green-700">{slot}</p>
                  <p className="text-green-600 text-sm mt-1">First available slot on {date}</p>
                </div>
              ) : recommendNextDay ? (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center space-y-3">
                  <p className="text-red-600 font-medium">No future slots available for today.</p>
                  <p className="text-gray-600 text-sm">Please select a slot from the next day.</p>
                  <button
                    type="button"
                    className="btn-secondary w-full"
                    onClick={() => {
                      const nextDate = addDaysToDateStr(clinicToday, 1)
                      setDate(nextDate)
                      setSlot(null)
                      setRecommendNextDay(false)
                    }}
                  >
                    Select Tomorrow
                  </button>
                </div>
              ) : (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                  <p className="text-red-600 font-medium">No slots available. Please try another date.</p>
                </div>
              )}
            </div>
          )}

          <button
            onClick={handleJoin}
            disabled={!slot || confirming}
            className="btn-primary w-full py-3 text-base"
          >
            {confirming ? <><div className="spinner" />Joining...</> : 'Confirm & Join Queue →'}
          </button>
        </div>
      </main>
    </div>
  )
}
