export function getMinutesUntil(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null

  const [y, m, d] = String(dateStr).split('-').map(Number)
  const [hh, mm] = String(timeStr).split(':').map(Number)
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null

  // Interpret stored YYYY-MM-DD + HH:MM as clinic local time, then convert to an absolute UTC epoch.
  // NIT Warangal -> Asia/Kolkata -> UTC+5:30 => 330 minutes.
  const offsetMin = parseInt(import.meta.env.VITE_CLINIC_TZ_OFFSET_MIN || '330', 10)
  const utcMs = Date.UTC(y, m - 1, d, hh, mm, 0, 0)
  const target = new Date(utcMs - offsetMin * 60 * 1000)
  const now = new Date() // absolute timestamp; timezone handled by Date internally

  const diffMs = target.getTime() - now.getTime()
  const diffMin = diffMs / 60000

  return Math.max(0, Math.ceil(diffMin))
}

