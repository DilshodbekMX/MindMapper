import { allLabels, emptyFilter, isFilterActive } from '../filters.js'

const STATUSES = [
  { key: 'todo', label: 'To do' },
  { key: 'doing', label: 'Doing' },
  { key: 'done', label: 'Done' },
]
const PRIORITIES = [
  { key: 'high', label: 'High' },
  { key: 'med', label: 'Med' },
  { key: 'low', label: 'Low' },
]
const DUE = [
  { key: 'any', label: 'Any due' },
  { key: 'overdue', label: 'Overdue' },
  { key: 'soon', label: 'Due ≤7d' },
  { key: 'none', label: 'No date' },
]

const rid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `v_${Date.now()}_${Math.random()}`

// Filter bar for the map: status / priority / label / due, plus saved views.
export default function FilterBar({ roadmap, filter, setFilter, updateRoot }) {
  const labels = allLabels(roadmap)
  const views = roadmap.nodes[roadmap.rootId]?.savedViews || []
  const active = isFilterActive(filter)

  const toggle = (key, val) => {
    const arr = filter[key] || []
    setFilter({ ...filter, [key]: arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val] })
  }

  const saveView = () => {
    if (!active) return
    const name = prompt('Save this filter as:')?.trim()
    if (!name) return
    updateRoot({ savedViews: [...views, { id: rid(), name, filter }] })
  }
  const loadView = (id) => {
    const v = views.find((x) => x.id === id)
    if (v) setFilter({ ...emptyFilter, ...v.filter })
  }
  const deleteView = (id) => updateRoot({ savedViews: views.filter((x) => x.id !== id) })

  return (
    <div className="filter-bar">
      <span className="fb-label">Filter</span>
      <div className="fb-group">
        {STATUSES.map((s) => (
          <button key={s.key} className={`fb-chip ${filter.statuses?.includes(s.key) ? 'on' : ''}`} onClick={() => toggle('statuses', s.key)}>
            {s.label}
          </button>
        ))}
      </div>
      <div className="fb-group">
        {PRIORITIES.map((p) => (
          <button key={p.key} className={`fb-chip ${filter.priorities?.includes(p.key) ? 'on' : ''}`} onClick={() => toggle('priorities', p.key)}>
            {p.label}
          </button>
        ))}
      </div>
      <select className="topbar-select" value={filter.due || 'any'} onChange={(e) => setFilter({ ...filter, due: e.target.value })}>
        {DUE.map((d) => (
          <option key={d.key} value={d.key}>{d.label}</option>
        ))}
      </select>
      {labels.length > 0 && (
        <select
          className="topbar-select"
          value=""
          onChange={(e) => {
            if (e.target.value) toggle('labels', e.target.value)
          }}
        >
          <option value="">+ Label…</option>
          {labels.map((l) => (
            <option key={l} value={l}>{filter.labels?.includes(l) ? '✓ ' : ''}{l}</option>
          ))}
        </select>
      )}
      {filter.labels?.length > 0 && (
        <div className="fb-group">
          {filter.labels.map((l) => (
            <button key={l} className="fb-chip on" onClick={() => toggle('labels', l)}>{l} ✕</button>
          ))}
        </div>
      )}

      <span className="fb-spacer" />

      {views.length > 0 && (
        <select className="topbar-select" value="" onChange={(e) => e.target.value && (e.target.value === '__none' ? null : loadView(e.target.value))}>
          <option value="">Saved views…</option>
          {views.map((v) => (
            <option key={v.id} value={v.id}>{v.name}</option>
          ))}
        </select>
      )}
      {active && <button className="mini-btn" onClick={saveView}>Save view</button>}
      {active && <button className="mini-btn" onClick={() => setFilter({ ...emptyFilter })}>Clear</button>}
    </div>
  )
}
