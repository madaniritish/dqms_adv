import { useState, useEffect } from 'react'
import { useSocket } from '../../context/SocketContext'
import { doctorAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'
import toast from 'react-hot-toast'

export default function DoctorDashboard() {
  const { queueUpdate, connected } = useSocket()
  const [data, setData] = useState(null)
  const [history, setHistory] = useState([])
  const [loading, setLoading] = useState(true)
  const [calling, setCalling] = useState(false)

  const fetchQueue = async () => {
    try {
      const [queueRes, historyRes] = await Promise.all([
        doctorAPI.queue(),
        doctorAPI.history(),
      ])
      setData(queueRes.data)
      setHistory(historyRes.data.appointments || [])
    } catch { setData(null) }
    finally { setLoading(false) }
  }

  useEffect(() => { fetchQueue() }, [])
  // Auto-refresh every 2 seconds via socket
  useEffect(() => { if (queueUpdate) fetchQueue() }, [queueUpdate])

  const handleNext = async () => {
    setCalling(true)
    try {
      const res = await doctorAPI.next()
      if (res.data.isEmpty) {
        toast.success('Queue is empty. You are now available.')
      } else {
        toast.success(`Next patient called: ${res.data.currentPatient?.student?.name}`)
      }
      await fetchQueue()
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to call next patient.')
    } finally {
      setCalling(false)
    }
  }

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="spinner-primary" />
    </div>
  )

  const currentPatient = data?.patients?.find(p => p.status === 'InConsultation')
  const waitingPatients = data?.patients?.filter(p => p.status !== 'InConsultation' && p.status !== 'Completed') || []

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <Navbar />
      <main className="max-w-2xl mx-auto px-6 py-8 space-y-6 animate-fade-in">

        {/* Doctor Info */}
        <div className="text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur px-5 py-2 rounded-full mb-4">
            <div className={`w-2.5 h-2.5 rounded-full ${connected ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
            <span className="text-sm text-gray-300">{connected ? 'Live Updates Active' : 'Reconnecting...'}</span>
          </div>
          <h1 className="text-3xl font-bold">{data?.doctor?.name}</h1>
          <p className="text-gray-400 text-lg mt-0.5">{data?.doctor?.specialization}</p>
          <span className={`inline-block mt-2 px-3 py-1 rounded-full text-sm font-semibold
            ${data?.doctor?.status === 'Available' ? 'bg-green-500/20 text-green-400' : 'bg-purple-500/20 text-purple-400'}`}>
            {data?.doctor?.status || 'Available'}
          </span>
        </div>

        {/* Current Patient */}
        {currentPatient && (
          <div className="bg-purple-900/50 border border-purple-500/50 rounded-2xl p-6">
            <p className="text-purple-300 text-xs font-semibold uppercase tracking-wider mb-3">In Consultation Now</p>
            <p className="text-2xl font-bold text-white">{currentPatient.studentId?.name}</p>
            <p className="text-gray-400 text-lg">{currentPatient.studentId?.rollNumber}</p>
            <p className="text-gray-500 text-sm mt-1">Slot: {currentPatient.timeSlot}</p>
          </div>
        )}

        {/* NEXT PATIENT Button */}
        <button
          onClick={handleNext}
          disabled={calling || data?.isEmpty}
          className={`w-full py-8 rounded-3xl text-2xl font-black transition-all duration-300 shadow-2xl
            ${calling
              ? 'bg-gray-600 cursor-wait'
              : data?.isEmpty
              ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
              : 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 active:scale-95 hover:shadow-green-500/30 hover:shadow-xl text-white'}`}
        >
          {calling
            ? <><span className="animate-spin inline-block mr-3">⏳</span>Calling...</>
            : data?.isEmpty
            ? '✅ Queue Empty'
            : '▶ CALL NEXT PATIENT'}
        </button>

        {/* Queue Overview */}
        <div className="space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-200">Upcoming Patients</h2>
            <span className="text-gray-400 text-sm">{data?.totalWaiting || 0} waiting</span>
          </div>

          {waitingPatients.length === 0 ? (
            <div className="bg-white/5 rounded-2xl p-10 text-center">
              <div className="text-5xl mb-3">😌</div>
              <p className="text-xl font-semibold text-gray-300">No Patients Waiting</p>
              <p className="text-gray-500 text-sm mt-1">Queue is empty.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {waitingPatients.slice(0, 5).map((p, i) => (
                <div
                  key={p._id}
                  className={`rounded-xl p-4 flex items-center justify-between
                    ${i === 0 ? 'bg-green-900/40 border border-green-500/30' : 'bg-white/5 border border-white/10'}`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold
                      ${i === 0 ? 'bg-green-500 text-white' : 'bg-white/10 text-gray-300'}`}>
                      {p.queuePosition}
                    </div>
                    <div>
                      <p className="font-semibold text-white text-lg">{p.studentId?.name}</p>
                      <p className="text-gray-400 text-sm">{p.studentId?.rollNumber}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-mono text-gray-300">{p.timeSlot}</p>
                    <StatusBadge status={p.status} showDot />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* History (Reached/Completed) */}
        <div className="space-y-3 pt-2">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-lg font-bold text-gray-200">Patient History</h2>
            <span className="text-gray-400 text-sm">{history.length} completed</span>
          </div>

          {history.length === 0 ? (
            <div className="bg-white/5 rounded-2xl p-8 text-center">
              <p className="text-gray-400">No completed patient records yet.</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {history.slice(0, 50).map((p) => (
                <div key={p._id} className="bg-white/5 border border-white/10 rounded-xl p-3 flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-white">{p.studentId?.name || 'Student'}</p>
                    <p className="text-xs text-gray-400">{p.studentId?.rollNumber || '—'} • {p.studentId?.email || '—'}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-gray-300">{p.date} {p.timeSlot}</p>
                    <StatusBadge status={p.status} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
