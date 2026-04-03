export function getMinutesUntil(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null

  const [y, m, d] = String(dateStr).split('-').map(Number)
  const [hh, mm] = String(timeStr).split(':').map(Number)
  if (!y || !m || !d || Number.isNaN(hh) || Number.isNaN(mm)) return null

  // Interpret stored YYYY-MM-DD + HH:MM as UTC.
  // This matches the backend's cutoff comparisons on hosted environments (Render) where server time is effectively UTC.
  const target = new Date(Date.UTC(y, m - 1, d, hh, mm, 0, 0))
  const now = new Date() // absolute timestamp; timezone handled by Date internally

  const diffMs = target.getTime() - now.getTime()
  const diffMin = diffMs / 60000

  return Math.max(0, Math.ceil(diffMin))
}

