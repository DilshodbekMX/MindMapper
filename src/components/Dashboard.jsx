import { useMemo } from 'react'
import { computeProgress } from '../layout.js'

function leafStats(roadmap) {
  const { childrenOf, progress } = computeProgress(roadmap.nodes)
  const leaves = Object.values(roadmap.nodes).filter((n) => !(childrenOf[n.id]?.length))
  const counts = { todo: 0, doing: 0, done: 0 }
  for (const l of leaves) counts[l.status] = (counts[l.status] || 0) + 1
  return {
    leaves,
    counts,
    total: leaves.length,
    pct: Math.round((progress[roadmap.rootId]?.ratio || 0) * 100),
  }
}

export default function Dashboard({ roadmaps, onOpen, onReviewOpen }) {
  const data = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    const per = roadmaps.map((rm) => ({ rm, stats: leafStats(rm) }))
    const totals = { todo: 0, doing: 0, done: 0, total: 0 }
    const inProgress = []
    const completed = []
    const due = [] // leaves with a due date, not yet done
    const reviewDue = [] // topics whose spaced-repetition review is due
    const activityDays = new Set() // days with a completion or a review
    for (const { rm, stats } of per) {
      totals.todo += stats.counts.todo
      totals.doing += stats.counts.doing
      totals.done += stats.counts.done
      totals.total += stats.total
      for (const l of stats.leaves) {
        if (l.status === 'doing') inProgress.push({ rm, node: l })
        if (l.status === 'done' && l.completedAt) completed.push({ rm, node: l })
        if (l.dueDate && l.status !== 'done') due.push({ rm, node: l, overdue: l.dueDate < today })
      }
      for (const n of Object.values(rm.nodes)) {
        if (n.review?.due && n.review.due <= today) reviewDue.push({ rm, node: n })
        if (n.review?.last) activityDays.add(n.review.last)
        if (n.completedAt) activityDays.add(n.completedAt)
      }
    }
    completed.sort((a, b) => (a.node.completedAt < b.node.completedAt ? 1 : -1))
    due.sort((a, b) => (a.node.dueDate < b.node.dueDate ? -1 : 1))

    // Day streak: consecutive days (ending today, or yesterday as grace) with activity.
    const doneDays = activityDays
    let streak = 0
    const cursor = new Date(today + 'T00:00:00')
    if (!doneDays.has(today)) cursor.setDate(cursor.getDate() - 1) // allow streak to "hang" through today
    while (doneDays.has(cursor.toISOString().slice(0, 10))) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    }

    // completions per ISO week (last 10 weeks present in data)
    const byWeek = {}
    for (const c of completed) {
      const wk = c.node.completedAt.slice(0, 7) // group by month for stability
      byWeek[wk] = (byWeek[wk] || 0) + 1
    }
    const weeks = Object.entries(byWeek).sort().slice(-8)
    const overallPct = totals.total ? Math.round((totals.done / totals.total) * 100) : 0
    return { per, totals, inProgress, completed, due, reviewDue, streak, today, weeks, overallPct }
  }, [roadmaps])

  const maxWeek = Math.max(1, ...data.weeks.map(([, v]) => v))

  return (
    <div className="dashboard">
      <div className="dash-cards">
        <div className="card big">
          <div className="card-label">Overall progress</div>
          <div className="card-pct">{data.overallPct}%</div>
          <div className="seg-bar">
            <div className="seg done" style={{ flex: data.totals.done || 0 }} />
            <div className="seg doing" style={{ flex: data.totals.doing || 0 }} />
            <div className="seg todo" style={{ flex: data.totals.todo || 0 }} />
          </div>
          <div className="legend">
            <span><i className="sw done" /> {data.totals.done} done</span>
            <span><i className="sw doing" /> {data.totals.doing} in progress</span>
            <span><i className="sw todo" /> {data.totals.todo} not started</span>
          </div>
        </div>
        <div className="card">
          <div className="card-label">Roadmaps</div>
          <div className="card-num">{roadmaps.length}</div>
        </div>
        <div className="card">
          <div className="card-label">Topics tracked</div>
          <div className="card-num">{data.totals.total}</div>
        </div>
        <div className="card">
          <div className="card-label">Completed</div>
          <div className="card-num">{data.totals.done}</div>
        </div>
        <div className="card">
          <div className="card-label">Day streak</div>
          <div className="card-num">{data.streak > 0 ? `🔥 ${data.streak}` : '—'}</div>
        </div>
        <div
          className={`card ${data.reviewDue.length ? 'card-clickable' : ''}`}
          onClick={() => data.reviewDue.length && onReviewOpen?.(data.reviewDue[0].rm.id)}
        >
          <div className="card-label">Due for review</div>
          <div className="card-num">{data.reviewDue.length || '—'}</div>
        </div>
      </div>

      <div className="dash-grid">
        <section className="dash-panel">
          <h3>Due soon &amp; overdue</h3>
          {data.due.length === 0 ? (
            <p className="muted small">No due dates set. Add one in a topic's detail panel to track deadlines.</p>
          ) : (
            <ul className="dash-feed">
              {data.due.slice(0, 12).map(({ rm, node, overdue }) => (
                <li key={node.id} onClick={() => onOpen(rm.id, node.id)}>
                  <span className={`dot ${overdue ? 'dot-doing' : 'dot-todo'}`} />
                  <span className="feed-label">{node.label}</span>
                  <span className={`due-pill ${overdue ? 'overdue' : ''}`}>
                    {overdue ? 'overdue ' : ''}{node.dueDate}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <h3>Per-roadmap progress</h3>
          <div className="dash-rm-list">
            {data.per.map(({ rm, stats }) => (
              <button key={rm.id} className="dash-rm" onClick={() => onOpen(rm.id)}>
                <div className="dash-rm-top">
                  <span>{rm.name}</span>
                  <span className="muted">{stats.pct}%</span>
                </div>
                <div className="bar">
                  <div className="bar-fill" style={{ width: `${stats.pct}%` }} />
                </div>
                <div className="muted small">
                  {stats.counts.done} done · {stats.counts.doing} active · {stats.counts.todo} to do
                </div>
              </button>
            ))}
          </div>
        </section>

        <section className="dash-panel">
          <h3>In progress now</h3>
          {data.inProgress.length === 0 ? (
            <p className="muted small">Nothing in progress. Mark a topic “In progress” to see it here.</p>
          ) : (
            <ul className="dash-feed">
              {data.inProgress.slice(0, 12).map(({ rm, node }) => (
                <li key={node.id} onClick={() => onOpen(rm.id, node.id)}>
                  <span className="dot dot-doing" />
                  <span className="feed-label">{node.label}</span>
                  <span className="muted small">{rm.name}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <h3>Recent completions</h3>
          {data.completed.length === 0 ? (
            <p className="muted small">No completions logged yet.</p>
          ) : (
            <ul className="dash-feed">
              {data.completed.slice(0, 12).map(({ rm, node }) => (
                <li key={node.id} onClick={() => onOpen(rm.id, node.id)}>
                  <span className="dot dot-done" />
                  <span className="feed-label">{node.label}</span>
                  <span className="muted small">{node.completedAt}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="dash-panel">
          <h3>Completions over time</h3>
          {data.weeks.length === 0 ? (
            <p className="muted small">Complete topics to build your activity chart.</p>
          ) : (
            <div className="chart">
              {data.weeks.map(([label, v]) => (
                <div className="chart-col" key={label} title={`${v} in ${label}`}>
                  <div className="chart-bar" style={{ height: `${(v / maxWeek) * 100}%` }} />
                  <span className="chart-label">{label.slice(5)}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
