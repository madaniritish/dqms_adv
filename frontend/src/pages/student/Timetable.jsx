import { useState, useEffect } from 'react'
import { timetableAPI } from '../../services/api'
import Navbar from '../../components/Navbar'

export default function Timetable() {
  const today = new Date().toISOString().split('T')[0]
  const [date, setDate] = useState(today)
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    timetableAPI.get(date)
      .then(res => setData(res.data))
      .catch(() => setData(null))
      .finally(() => setLoading(false))
  }, [date])

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-2xl mx-auto px-4 py-8 space-y-6 animate-fade-in">
        <div>
          <h1 className="page-header">Doctor Timetable</h1>
          <p className="page-subtitle">View availability and queue lengths</p>
        </div>

        <input type="date" className="input-field" value={date} min={today}
          onChange={e => setDate(e.target.value)} />

        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner-primary" /></div>
        ) : data?.isHoliday ? (
          <div className="card text-center py-10 space-y-4">
            <div className="text-6xl">🏖️</div>
            <h2 className="text-xl font-bold">Healthcare Center Closed</h2>
            <p className="text-gray-500">{data.message}</p>
            {data.nextAvailableDate && (
              <button onClick={() => setDate(data.nextAvailableDate)} className="btn-primary inline-flex mx-auto">
                Go to {data.nextAvailableDate}
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {(data?.doctors || []).map(doc => (
              <div key={doc._id} className="card-hover space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900">{doc.name}</h3>
                    <p className="text-sm text-gray-500">{doc.specialization}</p>
                    {doc.qualification && <p className="text-xs text-gray-400">{doc.qualification}</p>}
                  </div>
                  <span className={`badge ${doc.currentStatus === 'Available' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}>
                    {doc.currentStatus}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  {[
                    { label: 'Queue Length', value: doc.queueLength, color: 'text-primary-700' },
                    { label: 'Slots Left', value: doc.slotsRemaining, color: doc.slotsRemaining > 5 ? 'text-green-600' : 'text-red-600' },
                    { label: 'Max/Day', value: doc.maxPatientsPerDay, color: 'text-gray-700' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-gray-50 rounded-lg p-3 text-center">
                      <p className="text-xs text-gray-500">{label}</p>
                      <p className={`text-xl font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                {doc.roomNumber && (
                  <p className="text-xs text-gray-500">📍 {doc.roomNumber}</p>
                )}

                {doc.slotsRemaining === 0 && (
                  <div className="bg-red-50 text-red-600 text-xs font-medium px-3 py-2 rounded-lg">
                    No slots remaining for this date
                  </div>
                )}
              </div>
            ))}
            {(data?.doctors || []).length === 0 && (
              <div className="card text-center py-10">
                <p className="text-gray-500">No doctors scheduled for this date.</p>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
