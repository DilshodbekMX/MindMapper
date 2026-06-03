import { useState, useMemo, useEffect, useRef } from 'react'

// Ctrl/Cmd+K command palette: fuzzy-ish search across every roadmap's topics.
export default function SearchPalette({ roadmaps, onPick, onClose }) {
  const [q, setQ] = useState('')
  const [active, setActive] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  const results = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return []
    const hits = []
    for (const rm of roadmaps) {
      for (const n of Object.values(rm.nodes)) {
        const inLabel = n.label?.toLowerCase().includes(query)
        const inNotes = (n.notes || '').toLowerCase().includes(query)
        if (inLabel || inNotes) {
          hits.push({ rm, node: n, score: inLabel ? (n.label.toLowerCase().startsWith(query) ? 0 : 1) : 2 })
        }
      }
    }
    return hits.sort((a, b) => a.score - b.score).slice(0, 40)
  }, [q, roadmaps])

  useEffect(() => setActive(0), [q])

  const choose = (i) => {
    const r = results[i]
    if (r) onPick(r.rm.id, r.node.id)
  }

  const onKey = (e) => {
    if (e.key === 'Escape') onClose()
    else if (e.key === 'ArrowDown') {
      e.preventDefault()
      setActive((a) => Math.min(a + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setActive((a) => Math.max(a - 1, 0))
    } else if (e.key === 'Enter') {
      e.preventDefault()
      choose(active)
    }
  }

  return (
    <div className="palette-backdrop" onClick={onClose}>
      <div className="palette" onClick={(e) => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="palette-input"
          placeholder="Search all roadmaps…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
        />
        {q.trim() && (
          <div className="palette-results">
            {results.length === 0 ? (
              <div className="palette-empty">No matches</div>
            ) : (
              results.map((r, i) => (
                <button
                  key={r.rm.id + ':' + r.node.id}
                  className={`palette-item ${i === active ? 'on' : ''}`}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => choose(i)}
                >
                  <span className={`dot dot-${r.node.status}`} />
                  <span className="palette-label">{r.node.label}</span>
                  <span className="muted small">{r.rm.name}</span>
                </button>
              ))
            )}
          </div>
        )}
        <div className="palette-foot muted small">↑↓ to move · Enter to open · Esc to close</div>
      </div>
    </div>
  )
}
