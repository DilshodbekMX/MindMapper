// Shared filtering used by the map (dim) and the board (hide).
import { addDays } from './srs.js'

export const emptyFilter = { statuses: [], priorities: [], labels: [], due: 'any' }

export function isFilterActive(f) {
  return !!f && (f.statuses?.length || f.priorities?.length || f.labels?.length || (f.due && f.due !== 'any'))
}

export function matchesFilter(n, f, today) {
  if (!f) return true
  if (f.statuses?.length && !f.statuses.includes(n.status)) return false
  if (f.priorities?.length && !f.priorities.includes(n.priority)) return false
  if (f.labels?.length && !(n.labels || []).some((l) => f.labels.includes(l))) return false
  if (f.due && f.due !== 'any') {
    const d = n.dueDate
    if (f.due === 'none' && d) return false
    if (f.due === 'overdue' && !(d && d < today && n.status !== 'done')) return false
    if (f.due === 'soon') {
      if (!d) return false
      if (!(d >= today && d <= addDays(today, 7))) return false
    }
  }
  return true
}

// All distinct labels across a roadmap (for the filter bar's label picker).
export function allLabels(roadmap) {
  const set = new Set()
  for (const n of Object.values(roadmap.nodes)) for (const l of n.labels || []) set.add(l)
  return [...set].sort()
}
