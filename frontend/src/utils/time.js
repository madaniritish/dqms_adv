export function getMinutesUntil(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null

  const [y, m, d] = String(dateStr).split('-').map(Number)
  const [hh, mm] = String(timeStr).split(':').map(Number)
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null

  // Interpret the stored YYYY-MM-DD + HH:MM as local time (same approach used by the backend's Date(y,m-1,d,h,...) logic).
  const target = new Date(y, m - 1, d, hh, mm, 0, 0)
  const now = new Date()

  const diffMs = target.getTime() - now.getTime()
  const diffMin = diffMs / 60000

  return Math.max(0, Math.ceil(diffMin))
}

