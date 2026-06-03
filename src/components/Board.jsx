import { useMemo, useState } from 'react'
import { computeProgress } from '../layout.js'
import { isFilterActive, matchesFilter } from '../filters.js'

const COLUMNS = [
  { key: 'todo', label: 'Not started' },
  { key: 'doing', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

// Kanban board over the active roadmap's leaf topics (the actionable tasks).
// Drag a card between columns to change its status.
export default function Board({ roadmap, filter, onUpdate, onOpen }) {
  const [dragId, setDragId] = useState(null)
  const [over, setOver] = useState(null)

  const { childrenOf } = useMemo(() => computeProgress(roadmap.nodes), [roadmap.nodes])
  const parentName = (n) => (n.parentId && roadmap.nodes[n.parentId]?.label) || ''
  const today = new Date().toISOString().slice(0, 10)
  const fActive = isFilterActive(filter)
  const leaves = Object.values(roadmap.nodes).filter(
    (n) => !(childrenOf[n.id]?.length) && n.parentId && (!fActive || matchesFilter(n, filter, today)),
  )

  const byStatus = { todo: [], doing: [], done: [] }
  for (const n of leaves) (byStatus[n.status] || byStatus.todo).push(n)

  const drop = (status) => {
    if (dragId) onUpdate(dragId, { status })
    setDragId(null)
    setOver(null)
  }

  return (
    <div className="board">
      {COLUMNS.map((col) => (
        <div
          key={col.key}
          className={`board-col ${over === col.key ? 'over' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            setOver(col.key)
          }}
          onDragLeave={() => setOver((o) => (o === col.key ? null : o))}
          onDrop={() => drop(col.key)}
        >
          <div className={`board-col-head s-${col.key}`}>
            <span className={`dot dot-${col.key}`} />
            {col.label}
            <span className="board-count">{byStatus[col.key].length}</span>
          </div>
          <div className="board-cards">
            {byStatus[col.key].map((n) => (
              <div
                key={n.id}
                className="board-card"
                draggable
                onDragStart={() => setDragId(n.id)}
                onDragEnd={() => setDragId(null)}
                onClick={() => onOpen(n.id)}
                style={{ borderLeftColor: n.priority === 'high' ? 'var(--danger)' : n.priority === 'med' ? 'var(--doing)' : 'var(--border)' }}
              >
                <div className="board-card-title">
                  {n.markers?.length > 0 && <span>{n.markers.join(' ')} </span>}
                  {n.label}
                </div>
                <div className="board-card-meta">
                  {parentName(n) && <span className="muted small">{parentName(n)}</span>}
                  {n.dueDate && <span className="due-pill">{n.dueDate}</span>}
                </div>
                {n.labels?.length > 0 && (
                  <div className="board-card-tags">
                    {n.labels.map((l) => (
                      <span className="tag" key={l}>{l}</span>
                    ))}
                  </div>
                )}
              </div>
            ))}
            {byStatus[col.key].length === 0 && <p className="muted small board-empty">Drop tasks here</p>}
          </div>
        </div>
      ))}
    </div>
  )
}
