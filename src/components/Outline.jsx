import { useMemo } from 'react'
import { computeProgress } from '../layout.js'

const NEXT_STATUS = { todo: 'doing', doing: 'done', done: 'todo' }

// XMind-style outliner: a linear, keyboard-friendly editable view of the tree.
//   Enter      → add sibling
//   Tab        → indent (become child of previous sibling)
//   Shift+Tab  → outdent (move up to grandparent)
//   Alt+↑ / ↓  → reorder among siblings
export default function Outline({ roadmap, selectedId, onSelect, store }) {
  const { childrenOf, progress } = useMemo(() => computeProgress(roadmap.nodes), [roadmap.nodes])

  const siblingsOf = (id) => {
    const pid = roadmap.nodes[id]?.parentId
    return Object.values(roadmap.nodes)
      .filter((n) => n.parentId === pid)
      .map((n) => n.id)
  }

  const indent = (id) => {
    const sibs = siblingsOf(id)
    const i = sibs.indexOf(id)
    if (i > 0) store.moveNode(id, sibs[i - 1])
  }
  const outdent = (id) => {
    const parent = roadmap.nodes[roadmap.nodes[id]?.parentId]
    if (parent && parent.parentId) store.moveNode(id, parent.parentId)
  }

  const onKey = (e, id) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const pid = roadmap.nodes[id]?.parentId
      if (pid) onSelect(store.addChild(pid))
    } else if (e.key === 'Tab') {
      e.preventDefault()
      e.shiftKey ? outdent(id) : indent(id)
    } else if (e.altKey && (e.key === 'ArrowUp' || e.key === 'ArrowDown')) {
      e.preventDefault()
      store.reorderNode(id, e.key === 'ArrowUp' ? -1 : 1)
    }
  }

  const Row = ({ id, depth }) => {
    const n = roadmap.nodes[id]
    if (!n) return null
    const kids = childrenOf[id] || []
    const hasKids = kids.length > 0
    const pct = hasKids ? Math.round((progress[id]?.ratio || 0) * 100) : null
    const isRoot = !n.parentId
    return (
      <>
        <div
          className={`ol-row ${id === selectedId ? 'sel' : ''} status-${n.status}`}
          style={{ paddingLeft: 8 + depth * 22 }}
          onClick={() => onSelect(id)}
        >
          {hasKids ? (
            <button
              className="ol-caret"
              onClick={(e) => {
                e.stopPropagation()
                store.toggleCollapse(id)
              }}
            >
              {n.collapsed ? '▸' : '▾'}
            </button>
          ) : (
            <span className="ol-caret ghost">•</span>
          )}

          <button
            className={`ol-status dot dot-${n.status}`}
            title={n.status}
            onClick={(e) => {
              e.stopPropagation()
              store.updateNode(id, { status: NEXT_STATUS[n.status] })
            }}
          />

          <input
            className="ol-label"
            value={n.label}
            onChange={(e) => store.updateNode(id, { label: e.target.value })}
            onFocus={() => onSelect(id)}
            onKeyDown={(e) => onKey(e, id)}
          />

          {n.markers?.length > 0 && <span className="ol-markers">{n.markers.join(' ')}</span>}
          {pct !== null && <span className="ol-pct">{pct}%</span>}

          <span className="ol-actions">
            <button title="Add child" onClick={(e) => { e.stopPropagation(); onSelect(store.addChild(id)) }}>＋</button>
            {!isRoot && (
              <>
                <button title="Move up (Alt+↑)" onClick={(e) => { e.stopPropagation(); store.reorderNode(id, -1) }}>↑</button>
                <button title="Move down (Alt+↓)" onClick={(e) => { e.stopPropagation(); store.reorderNode(id, 1) }}>↓</button>
                <button title="Outdent (Shift+Tab)" onClick={(e) => { e.stopPropagation(); outdent(id) }}>⇤</button>
                <button title="Indent (Tab)" onClick={(e) => { e.stopPropagation(); indent(id) }}>⇥</button>
                <button className="del" title="Delete" onClick={(e) => { e.stopPropagation(); store.deleteNode(id); onSelect(null) }}>✕</button>
              </>
            )}
          </span>
        </div>
        {!n.collapsed && kids.map((k) => <Row key={k} id={k} depth={depth + 1} />)}
      </>
    )
  }

  return (
    <div className="outline">
      <Row id={roadmap.rootId} depth={0} />
    </div>
  )
}
