import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useSocket } from '../../context/SocketContext'
import { staffAPI } from '../../services/api'
import Navbar from '../../components/Navbar'
import StatusBadge from '../../components/StatusBadge'

export default function StaffDashboard() {
  const { queueUpdate } = useSocket()
  const today = new Date().toISOString().split('T')[0]
  const [queue, setQueue] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({ date: today, status: '' })
  const [search, setSearch] = useState('')

  const fetchQueue = useCallback(async () => {
    try {
      const res = await staffAPI.queue(filters)
      setQueue(res.data.appointments || [])
    } catch { setQueue([]) }
    finally { setLoading(false) }
  }, [filters])

  useEffect(() => { fetchQueue() }, [fetchQueue])
  useEffect(() => { if (queueUpdate) fetchQueue() }, [queueUpdate])

  const filtered = search
    ? queue.filter(a =>
        a.studentId?.name?.toLowerCase().includes(search.toLowerCase()) ||
        a.studentId?.rollNumber?.toLowerCase().includes(search.toLowerCase()))
    : queue

  const statusColor = (s) => ({
    'Waiting': 'bg-blue-50 border-l-blue-400',
    'Second-Next': 'bg-amber-50 border-l-amber-400',
    'Next': 'bg-green-50 border-l-green-500',
    'InConsultation': 'bg-purple-50 border-l-purple-400',
    'EmergencyShift': 'bg-red-50 border-l-red-600',
  }[s] || 'bg-gray-50 border-l-gray-300')

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-7xl mx-auto px-4 py-6 space-y-5 animate-fade-in">

        {/* Header Row */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="page-header">Live Queue Dashboard</h1>
            <p className="page-subtitle">{queue.length} patients in queue</p>
          </div>
          <div className="flex gap-3">
            <Link to="/staff/emergency" className="btn-danger flex items-center gap-2">🚨 Emergency</Link>
            <Link to="/staff/noshow" className="btn-warning flex items-center gap-2">⚠️ No-Show</Link>
          </div>
        </div>

        {/* Filters */}
        <div className="card flex flex-wrap gap-3">
          <input type="date" className="input-field max-w-xs" value={filters.date}
            onChange={e => setFilters(f => ({ ...f, date: e.target.value }))} />
          <select className="input-field max-w-xs" value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
            <option value="">All Statuses</option>
            {['Waiting','Second-Next','Next','InConsultation','EmergencyShift'].map(s =>
              <option key={s} value={s}>{s}</option>)}
          </select>
          <input className="input-field flex-1 min-w-48" type="text" placeholder="🔍 Search by name or roll no..."
            value={search} onChange={e => setSearch(e.target.value)} />
          <button onClick={fetchQueue} className="btn-secondary px-4">Refresh</button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: 'Total', value: queue.length, color: 'text-gray-900' },
            { label: 'Next', value: queue.filter(q => q.status === 'Next').length, color: 'text-green-600' },
            { label: 'Waiting', value: queue.filter(q => q.status === 'Waiting').length, color: 'text-blue-600' },
            { label: 'Emergency', value: queue.filter(q => q.isEmergency).length, color: 'text-red-600' },
          ].map(({ label, value, color }) => (
            <div key={label} className="stat-card">
              <p className="stat-label">{label}</p>
              <p className={`stat-value ${color}`}>{value}</p>
            </div>
          ))}
        </div>

        {/* Queue Table */}
        {loading ? (
          <div className="flex justify-center py-16"><div className="spinner-primary" /></div>
        ) : (
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-100">
                    {['#','Patient','Roll No.','Doctor','Date','Slot','Status','Emergency'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.length === 0 ? (
                    <tr><td colSpan={8} className="text-center py-16 text-gray-400">No patients in queue</td></tr>
                  ) : filtered.map((appt) => (
                    <tr key={appt._id} className={`border-l-4 hover:bg-gray-50 transition-colors ${statusColor(appt.status)}`}>
                      <td className="px-4 py-3 font-bold text-gray-700">#{appt.queuePosition}</td>
                      <td className="px-4 py-3">
                        <p className="font-semibold text-gray-900">{appt.studentId?.name}</p>
                        <p className="text-xs text-gray-400">{appt.studentId?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">{appt.studentId?.rollNumber || '—'}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{appt.doctorId?.name}</td>
                      <td className="px-4 py-3 text-sm text-gray-600">{appt.date}</td>
                      <td className="px-4 py-3 font-mono font-semibold text-gray-800">{appt.timeSlot}</td>
                      <td className="px-4 py-3"><StatusBadge status={appt.status} /></td>
                      <td className="px-4 py-3">
                        {appt.isEmergency
                          ? <span className="badge bg-red-600 text-white">⚡ Emergency</span>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
