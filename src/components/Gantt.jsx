import { useMemo } from 'react'
import { computeProgress } from '../layout.js'

const DAY = 86400000
const COL = 30 // px per day
const iso = (d) => d.toISOString().slice(0, 10)
const parse = (s) => new Date(s + 'T00:00:00')
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

// XMind-style Gantt: every scheduled topic gets a bar across a day grid.
export default function Gantt({ roadmap, onOpen }) {
  const { childrenOf } = useMemo(() => computeProgress(roadmap.nodes), [roadmap.nodes])

  const { tasks, days, range } = useMemo(() => {
    const all = Object.values(roadmap.nodes).filter((n) => n.start || n.dueDate)
    const today = iso(new Date())
    let min = null
    let max = null
    const tasks = all.map((n) => {
      const start = n.start || n.dueDate
      const end = n.dueDate || n.start
      const s = start < end ? start : end
      const e = start < end ? end : start
      if (!min || s < min) min = s
      if (!max || e > max) max = e
      return { node: n, start: s, end: e }
    })
    // Fall back to current month when nothing is scheduled.
    if (!min) {
      const now = new Date()
      min = iso(new Date(now.getFullYear(), now.getMonth(), 1))
      max = iso(new Date(now.getFullYear(), now.getMonth() + 1, 0))
    }
    // Pad a couple of days on each side.
    const minD = new Date(parse(min).getTime() - 2 * DAY)
    const maxD = new Date(parse(max).getTime() + 2 * DAY)
    const days = []
    for (let t = minD.getTime(); t <= maxD.getTime(); t += DAY) days.push(new Date(t))
    tasks.sort((a, b) => (a.start < b.start ? -1 : 1))
    return { tasks, days, range: { min: iso(minD), max: iso(maxD), today } }
  }, [roadmap])

  const offset = (d) => Math.round((parse(d).getTime() - parse(range.min).getTime()) / DAY)
  const width = days.length * COL

  return (
    <div className="gantt">
      <div className="gantt-head">
        <span className="gantt-range">
          {MONTHS[parse(range.min).getMonth()]} {parse(range.min).getDate()} —{' '}
          {MONTHS[parse(range.max).getMonth()]} {parse(range.max).getDate()}
        </span>
        <span className="muted small">{tasks.length} scheduled · {roadmap.name}</span>
      </div>

      {tasks.length === 0 ? (
        <p className="muted small" style={{ padding: 16 }}>
          No scheduled topics yet. Add a start/due date to a topic (Topic tab → Schedule) to see it here.
        </p>
      ) : (
        <div className="gantt-scroll">
          <div className="gantt-grid" style={{ width: width + 220 }}>
            {/* timeline header */}
            <div className="gantt-row gantt-timeline">
              <div className="gantt-label" />
              <div className="gantt-track" style={{ width }}>
                {days.map((d, idx) => (
                  <div
                    key={idx}
                    className={`gantt-day ${d.getDay() === 0 || d.getDay() === 6 ? 'weekend' : ''} ${iso(d) === range.today ? 'today' : ''}`}
                    style={{ width: COL }}
                  >
                    <span className="gantt-dow">{d.getDate() === 1 || idx === 0 ? MONTHS[d.getMonth()] : ''}</span>
                    <span className="gantt-dnum">{d.getDate()}</span>
                  </div>
                ))}
              </div>
            </div>

            {tasks.map(({ node, start, end }) => {
              const left = offset(start) * COL
              const span = (offset(end) - offset(start) + 1) * COL
              return (
                <div className="gantt-row" key={node.id} onClick={() => onOpen(node.id)}>
                  <div className="gantt-label" title={node.label}>{node.label}</div>
                  <div className="gantt-track" style={{ width }}>
                    <div
                      className={`gantt-bar status-${node.status}`}
                      style={{ left, width: Math.max(span, COL) }}
                      title={`${start} → ${end}${node.effort != null ? ` · ${node.effort}` : ''}`}
                    >
                      {node.effort != null && <span className="gantt-eff">⏱ {node.effort}</span>}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
