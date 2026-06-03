import { useState } from 'react'
import { computeProgress } from '../layout.js'

export default function Sidebar({
  roadmaps,
  activeId,
  setActive,
  createRoadmap,
  addCyberSample,
  renameRoadmap,
  deleteRoadmap,
  onImportClick,
  view,
  setView,
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('')

  const submit = () => {
    if (name.trim()) createRoadmap(name)
    setName('')
    setCreating(false)
  }

  return (
    <aside className="sidebar">
      <div className="brand">
        <img className="brand-logo" src="/logo.svg" alt="" width="22" height="22" /> MindMapper
      </div>
      <div className="sidebar-sub">Learning tracker</div>

      <div className="view-toggle">
        <button className={view === 'map' ? 'on' : ''} onClick={() => setView('map')}>Map</button>
        <button className={view === 'outline' ? 'on' : ''} onClick={() => setView('outline')}>Outline</button>
        <button className={view === 'board' ? 'on' : ''} onClick={() => setView('board')}>Board</button>
        <button className={view === 'review' ? 'on' : ''} onClick={() => setView('review')}>Review</button>
        <button className={view === 'gantt' ? 'on' : ''} onClick={() => setView('gantt')}>Gantt</button>
        <button className={view === 'dashboard' ? 'on' : ''} onClick={() => setView('dashboard')}>Dashboard</button>
      </div>

      <div className="rm-list">
        {roadmaps.map((rm) => {
          const { progress } = computeProgress(rm.nodes)
          const pct = Math.round((progress[rm.rootId]?.ratio || 0) * 100)
          return (
            <div
              key={rm.id}
              className={`rm-item ${rm.id === activeId ? 'active' : ''}`}
              onClick={() => setActive(rm.id)}
            >
              <div className="rm-top">
                <span className="rm-name">{rm.name}</span>
                <span className="rm-pct">{pct}%</span>
              </div>
              <div className="rm-bar">
                <div className="rm-bar-fill" style={{ width: `${pct}%` }} />
              </div>
              <div className="rm-actions">
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    const next = prompt('Rename roadmap', rm.name)
                    if (next && next.trim()) renameRoadmap(rm.id, next.trim())
                  }}
                >
                  Rename
                </button>
                <button
                  className="danger"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (confirm(`Delete "${rm.name}"? This cannot be undone.`)) deleteRoadmap(rm.id)
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          )
        })}
      </div>

      <div className="sidebar-foot">
        {creating ? (
          <div className="new-rm">
            <input
              autoFocus
              value={name}
              placeholder="Roadmap name…"
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submit()
                if (e.key === 'Escape') {
                  setCreating(false)
                  setName('')
                }
              }}
            />
            <div className="new-rm-actions">
              <button className="primary" onClick={submit}>
                Create
              </button>
              <button onClick={() => { setCreating(false); setName('') }}>Cancel</button>
            </div>
          </div>
        ) : (
          <>
            <button className="primary block" onClick={() => setCreating(true)}>
              + New roadmap
            </button>
            <button className="block ghost" onClick={addCyberSample}>
              + Cyber Security sample
            </button>
            <button className="block ghost" onClick={onImportClick}>
              ⤓ Import JSON / OPML
            </button>
          </>
        )}
      </div>
    </aside>
  )
}
