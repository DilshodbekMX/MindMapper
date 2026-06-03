import { useMemo } from 'react'
import { computeProgress } from '../layout.js'
import { GRADES, previewInterval } from '../srs.js'
import { renderMarkdown } from '../markdown.js'

const fmtDays = (d) => (d === 1 ? '1d' : d < 30 ? `${d}d` : `${Math.round(d / 30)}mo`)

// Spaced-repetition queue for the active roadmap. Reactive: grading reschedules
// the card's due date into the future, so it drops out of the queue automatically.
export default function Review({ roadmap, onReview, onSeed, onOpen }) {
  const today = new Date().toISOString().slice(0, 10)
  const { childrenOf } = useMemo(() => computeProgress(roadmap.nodes), [roadmap.nodes])

  const nodes = Object.values(roadmap.nodes)
  const due = nodes
    .filter((n) => n.review && n.review.due <= today)
    .sort((a, b) => (a.review.due < b.review.due ? -1 : 1))
  // "New": completed leaves you haven't started reviewing yet.
  const fresh = nodes.filter((n) => n.parentId && !(childrenOf[n.id]?.length) && n.status === 'done' && !n.review)

  const current = due[0]

  if (!current) {
    return (
      <div className="review">
        <div className="review-empty">
          <div className="review-big">🎉</div>
          <h2>Nothing due right now</h2>
          {fresh.length > 0 ? (
            <>
              <p className="muted">{fresh.length} completed topic{fresh.length > 1 ? 's' : ''} ready to start reviewing.</p>
              <button className="primary" onClick={() => fresh.forEach((n) => onSeed(n.id))}>
                Start reviewing {fresh.length} topic{fresh.length > 1 ? 's' : ''}
              </button>
            </>
          ) : (
            <p className="muted">Mark some topics “Done”, then come back to schedule reviews.</p>
          )}
        </div>
      </div>
    )
  }

  const branch = current.parentId && roadmap.nodes[current.parentId]?.label
  return (
    <div className="review">
      <div className="review-head">
        <span className="muted small">{due.length} due</span>
        <span className="muted small">{roadmap.name}</span>
      </div>

      <div className="review-card">
        {branch && <div className="review-kicker">{branch}</div>}
        <h1 className="review-title" onClick={() => onOpen(current.id)}>{current.label}</h1>

        {current.notes ? (
          <div className="review-notes" dangerouslySetInnerHTML={{ __html: renderMarkdown(current.notes) }} />
        ) : (
          <p className="muted small">No notes — recall what you can, then grade yourself.</p>
        )}

        {current.resources?.length > 0 && (
          <ul className="review-res">
            {current.resources.map((r) => (
              <li key={r.id}>
                <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
              </li>
            ))}
          </ul>
        )}

        <div className="review-grades">
          {GRADES.map((g) => (
            <button key={g.key} className={`grade grade-${g.key}`} onClick={() => onReview(current.id, g.key)}>
              <span>{g.label}</span>
              <span className="grade-int">{fmtDays(previewInterval(current.review, g.key))}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
