const STATUS_CONFIG = {
  'Waiting':        { label: 'Waiting',          className: 'badge-waiting',      dot: 'bg-blue-500' },
  'Second-Next':    { label: 'Prepare to Come',  className: 'badge-second',       dot: 'bg-amber-500' },
  'Next':           { label: 'You Are Next!',    className: 'badge-next',         dot: 'bg-green-500 animate-pulse' },
  'InConsultation': { label: 'In Consultation',  className: 'badge-consultation', dot: 'bg-purple-500' },
  'Completed':      { label: 'Completed',         className: 'badge-completed',    dot: 'bg-gray-400' },
  'Cancelled':      { label: 'Cancelled',         className: 'badge-cancelled',    dot: 'bg-red-500' },
  'NoShow':         { label: 'No Show',           className: 'badge-noshow',       dot: 'bg-orange-500' },
  'Rescheduled':    { label: 'Rescheduled',       className: 'badge-waiting',      dot: 'bg-blue-400' },
  'EmergencyShift': { label: 'Emergency Shift',   className: 'badge-emergency',    dot: 'bg-red-600' },
}

export default function StatusBadge({ status, showDot = true, large = false }) {
  const config = STATUS_CONFIG[status] || { label: status, className: 'badge bg-gray-100 text-gray-600', dot: 'bg-gray-400' }
  return (
    <span className={`${config.className} ${large ? 'text-sm px-3 py-1.5' : ''} flex items-center gap-1.5`}>
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />}
      {config.label}
    </span>
  )
}
