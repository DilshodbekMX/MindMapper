import { useState, useMemo, useEffect } from 'react'
import { computeProgress } from '../layout.js'

const STATUS_MARK = { done: '✓', doing: '◐', todo: '○' }
const THEMES = [
  { key: 'dark', label: 'Dark' },
  { key: 'light', label: 'Light' },
  { key: 'accent', label: 'Accent' },
]

// XMind-style "Pitch": each topic with children becomes a drill-in slide whose
// children are bullets. Walks the tree in preorder so you descend branch by branch.
export default function Pitch({ roadmap, onExit }) {
  const [i, setI] = useState(0)
  const [theme, setTheme] = useState('dark')

  const slides = useMemo(() => {
    const { childrenOf } = computeProgress(roadmap.nodes)
    const out = []
    const walk = (id, depth) => {
      const n = roadmap.nodes[id]
      if (!n) return
      const kids = (childrenOf[id] || []).map((k) => roadmap.nodes[k]).filter(Boolean)
      if (kids.length) out.push({ id, title: n.label, depth, bullets: kids })
      for (const k of childrenOf[id] || []) walk(k, depth + 1)
    }
    walk(roadmap.rootId, 0)
    return out.length ? out : [{ id: roadmap.rootId, title: roadmap.nodes[roadmap.rootId]?.label || '', depth: 0, bullets: [] }]
  }, [roadmap])

  const go = (d) => setI((x) => Math.min(Math.max(x + d, 0), slides.length - 1))

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === 'Escape') onExit()
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown' || e.key === ' ') go(1)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [slides.length])

  const s = slides[i]
  return (
    <div className={`pitch theme-${theme}`}>
      <div className="pitch-stage" onClick={() => go(1)}>
        <div className="pitch-kicker">{'• '.repeat(s.depth)}{roadmap.name}</div>
        <h1 className="pitch-title">{s.title}</h1>
        {s.bullets.length > 0 && (
          <ul className="pitch-bullets">
            {s.bullets.map((b) => (
              <li key={b.id} className={`b-${b.status}`}>
                <span className="pitch-mark">{STATUS_MARK[b.status]}</span>
                {b.label}
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="pitch-bar" onClick={(e) => e.stopPropagation()}>
        <button onClick={() => go(-1)} disabled={i <= 0}>◀</button>
        <span className="pitch-count">{i + 1} / {slides.length}</span>
        <button onClick={() => go(1)} disabled={i >= slides.length - 1}>▶</button>
        <select className="topbar-select" value={theme} onChange={(e) => setTheme(e.target.value)}>
          {THEMES.map((t) => (
            <option key={t.key} value={t.key}>{t.label}</option>
          ))}
        </select>
        <button className="pitch-exit" onClick={onExit}>✕ Exit</button>
      </div>

      <div className="pitch-progress">
        <div className="pitch-progress-fill" style={{ width: `${((i + 1) / slides.length) * 100}%` }} />
      </div>
    </div>
  )
}
