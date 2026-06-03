import { useState } from 'react'
import { renderMarkdown } from '../markdown.js'

const STATUSES = [
  { key: 'todo', label: 'Not started' },
  { key: 'doing', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

const PRIORITIES = [
  { key: 'high', label: 'High' },
  { key: 'med', label: 'Medium' },
  { key: 'low', label: 'Low' },
]

// XMind-style marker palette: priority/progress/flags/stars/people/emoji.
const MARKER_PALETTE = ['⭐', '🚩', '❗', '❓', '✅', '⏳', '🔥', '💡', '⚠️', '📌', '👍', '👎', '❤️', '🎯', '🐛', '🔒']

const rid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `i_${Date.now()}_${Math.random()}`

export default function DetailPanel({ node, isRoot, roadmap, updateRoot, onUpdate, onAddChild, onDelete, onClose, onNavigate }) {
  const [resTitle, setResTitle] = useState('')
  const [resUrl, setResUrl] = useState('')
  const [subText, setSubText] = useState('')
  const [labelText, setLabelText] = useState('')
  const [relTarget, setRelTarget] = useState('')
  const [relLabel, setRelLabel] = useState('')
  const [notesPreview, setNotesPreview] = useState(false)

  if (!node) {
    return (
      <section className="detail empty">
        <p className="hint">
          Select a node to edit it, set its status, add resources, subtasks, notes, or branch out new topics.
        </p>
      </section>
    )
  }

  const resources = node.resources || []
  const subtasks = node.subtasks || []
  const markers = node.markers || []
  const labels = node.labels || []

  const toggleMarker = (m) =>
    onUpdate(node.id, { markers: markers.includes(m) ? markers.filter((x) => x !== m) : [...markers, m] })
  const addLabel = () => {
    const t = labelText.trim()
    if (!t || labels.includes(t)) return setLabelText('')
    onUpdate(node.id, { labels: [...labels, t] })
    setLabelText('')
  }
  const removeLabel = (t) => onUpdate(node.id, { labels: labels.filter((x) => x !== t) })

  // Relationships (stored on the root node).
  const allNodes = roadmap ? Object.values(roadmap.nodes) : []
  const rootRels = (roadmap && roadmap.nodes[roadmap.rootId]?.relationships) || []
  const myRels = rootRels.filter((r) => r.from === node.id || r.to === node.id)
  const nameOf = (id) => roadmap?.nodes[id]?.label || '?'
  const addRelationship = () => {
    if (!relTarget || relTarget === node.id || !updateRoot) return
    updateRoot({ relationships: [...rootRels, { id: rid(), from: node.id, to: relTarget, label: relLabel.trim() }] })
    setRelTarget('')
    setRelLabel('')
  }
  const removeRelationship = (id) => updateRoot?.({ relationships: rootRels.filter((r) => r.id !== id) })

  // Boundary grouping.
  const boundary = node.boundary || null
  const toggleBoundary = () =>
    onUpdate(node.id, { boundary: boundary ? null : { label: '', color: null } })
  const setBoundaryLabel = (label) => onUpdate(node.id, { boundary: { ...boundary, label } })

  // Summaries (a brace over this node's children).
  const childIds = allNodes.filter((n) => n.parentId === node.id).map((n) => n.id)
  const rootSummaries = (roadmap && roadmap.nodes[roadmap.rootId]?.summaries) || []
  const mySummaries = rootSummaries.filter((s) => s.nodeIds?.length && s.nodeIds.every((id) => roadmap?.nodes[id]?.parentId === node.id))
  const addSummary = () =>
    childIds.length && updateRoot?.({ summaries: [...rootSummaries, { id: rid(), nodeIds: childIds, label: 'Summary' }] })
  const removeSummary = (id) => updateRoot?.({ summaries: rootSummaries.filter((s) => s.id !== id) })
  const setSummaryLabel = (id, label) =>
    updateRoot?.({ summaries: rootSummaries.map((s) => (s.id === id ? { ...s, label } : s)) })

  // [[wikilink]] backlinks: other topics whose notes reference this one by label.
  const backlinks = allNodes.filter((n) => n.id !== node.id && (n.notes || '').includes(`[[${node.label}]]`))
  const onPreviewClick = (e) => {
    const label = e.target?.dataset?.wikilink
    if (!label || !onNavigate) return
    const target = allNodes.find((n) => n.label === label)
    if (target) onNavigate(target.id)
  }

  const addResource = () => {
    const url = resUrl.trim()
    if (!url) return
    const href = /^https?:\/\//i.test(url) ? url : `https://${url}`
    onUpdate(node.id, { resources: [...resources, { id: rid(), type: 'link', title: resTitle.trim() || href, url: href }] })
    setResTitle('')
    setResUrl('')
  }
  const removeResource = (id) => onUpdate(node.id, { resources: resources.filter((r) => r.id !== id) })
  const addImage = (file) => {
    if (!file) return
    const reader = new FileReader()
    reader.onload = () =>
      onUpdate(node.id, { resources: [...resources, { id: rid(), type: 'image', title: file.name, url: reader.result }] })
    reader.readAsDataURL(file)
  }

  const addSubtask = () => {
    const text = subText.trim()
    if (!text) return
    onUpdate(node.id, { subtasks: [...subtasks, { id: rid(), text, done: false }] })
    setSubText('')
  }
  const toggleSubtask = (id) =>
    onUpdate(node.id, { subtasks: subtasks.map((s) => (s.id === id ? { ...s, done: !s.done } : s)) })
  const removeSubtask = (id) => onUpdate(node.id, { subtasks: subtasks.filter((s) => s.id !== id) })

  return (
    <section className="detail">
      <div className="detail-head">
        <span className="detail-kind">{isRoot ? 'Root' : 'Topic'}</span>
        <button className="icon" onClick={onClose} title="Close">✕</button>
      </div>

      <label className="field">
        <span>Title</span>
        <input value={node.label} onChange={(e) => onUpdate(node.id, { label: e.target.value })} />
      </label>

      <div className="field">
        <span>Status</span>
        <div className="status-group">
          {STATUSES.map((s) => (
            <button
              key={s.key}
              className={`status-btn s-${s.key} ${node.status === s.key ? 'on' : ''}`}
              onClick={() => onUpdate(node.id, { status: s.key })}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Mastery {node.mastery != null && <em className="muted">({node.mastery}/5)</em>}</span>
        <div className="mastery-row">
          {[1, 2, 3, 4, 5].map((v) => (
            <button
              key={v}
              className={`mastery-star ${node.mastery >= v ? 'on' : ''}`}
              title={`${v}/5`}
              onClick={() => onUpdate(node.id, { mastery: node.mastery === v ? null : v })}
            >
              ★
            </button>
          ))}
          {node.mastery != null && (
            <button className="mini-x" title="Clear" onClick={() => onUpdate(node.id, { mastery: null })}>✕</button>
          )}
        </div>
        {node.review ? (
          <span className="muted small">Next review: {node.review.due}</span>
        ) : (
          <button
            className="mini-btn"
            style={{ alignSelf: 'flex-start' }}
            onClick={() => onUpdate(node.id, { review: { due: new Date().toISOString().slice(0, 10), interval: 0, ease: 2.5, reps: 0, lapses: 0, last: null } })}
          >
            + Add to review
          </button>
        )}
      </div>

      <div className="field">
        <span>Markers</span>
        <div className="marker-palette">
          {MARKER_PALETTE.map((m) => (
            <button
              key={m}
              className={`marker-btn ${markers.includes(m) ? 'on' : ''}`}
              onClick={() => toggleMarker(m)}
            >
              {m}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Labels</span>
        {labels.length > 0 && (
          <div className="label-chips">
            {labels.map((l) => (
              <span className="tag removable" key={l}>
                {l}
                <button className="mini-x" title="Remove" onClick={() => removeLabel(l)}>✕</button>
              </span>
            ))}
          </div>
        )}
        <div className="res-add-row">
          <input
            placeholder="Add a label…"
            value={labelText}
            onChange={(e) => setLabelText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addLabel()}
          />
          <button onClick={addLabel}>Add</button>
        </div>
      </div>

      <div className="field">
        <span>Priority</span>
        <div className="status-group">
          {PRIORITIES.map((p) => (
            <button
              key={p.key}
              className={`status-btn prio-${p.key} ${node.priority === p.key ? 'on' : ''}`}
              onClick={() => onUpdate(node.id, { priority: node.priority === p.key ? null : p.key })}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Schedule</span>
        <div className="res-add-row">
          <input
            type="date"
            title="Start date"
            value={node.start || ''}
            onChange={(e) => onUpdate(node.id, { start: e.target.value || null })}
          />
          <input
            type="date"
            title="Due date"
            value={node.dueDate || ''}
            onChange={(e) => onUpdate(node.id, { dueDate: e.target.value || null })}
          />
        </div>
        <input
          type="number"
          min="0"
          placeholder="Effort estimate (e.g. hours)"
          value={node.effort ?? ''}
          onChange={(e) => onUpdate(node.id, { effort: e.target.value === '' ? null : Number(e.target.value) })}
        />
      </div>

      <label className="field">
        <span>Completed on</span>
        <input
          type="date"
          value={node.completedAt || ''}
          onChange={(e) => onUpdate(node.id, { completedAt: e.target.value || null })}
        />
      </label>

      {/* Resources */}
      <div className="field">
        <span>Resources</span>
        {resources.length > 0 && (
          <ul className="res-list">
            {resources.map((r) =>
              r.type === 'image' ? (
                <li key={r.id} className="res-image">
                  <a href={r.url} target="_blank" rel="noreferrer"><img src={r.url} alt={r.title} /></a>
                  <span className="res-image-name">{r.title}</span>
                  <button className="mini-x" title="Remove" onClick={() => removeResource(r.id)}>✕</button>
                </li>
              ) : (
                <li key={r.id}>
                  <a href={r.url} target="_blank" rel="noreferrer">{r.title}</a>
                  <button className="mini-x" title="Remove" onClick={() => removeResource(r.id)}>✕</button>
                </li>
              ),
            )}
          </ul>
        )}
        <div className="res-add">
          <input placeholder="Title (optional)" value={resTitle} onChange={(e) => setResTitle(e.target.value)} />
          <div className="res-add-row">
            <input
              placeholder="https://…"
              value={resUrl}
              onChange={(e) => setResUrl(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addResource()}
            />
            <button onClick={addResource}>Add</button>
          </div>
          <label className="img-upload">
            🖼 Attach image
            <input type="file" accept="image/*" hidden onChange={(e) => { addImage(e.target.files?.[0]); e.target.value = '' }} />
          </label>
        </div>
      </div>

      {/* Subtasks */}
      <div className="field">
        <span>Subtasks {subtasks.length > 0 && <em className="muted">({subtasks.filter((s) => s.done).length}/{subtasks.length})</em>}</span>
        {subtasks.length > 0 && (
          <ul className="sub-list">
            {subtasks.map((s) => (
              <li key={s.id} className={s.done ? 'done' : ''}>
                <input type="checkbox" checked={s.done} onChange={() => toggleSubtask(s.id)} />
                <span>{s.text}</span>
                <button className="mini-x" title="Remove" onClick={() => removeSubtask(s.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <div className="res-add-row">
          <input
            placeholder="Add a subtask…"
            value={subText}
            onChange={(e) => setSubText(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addSubtask()}
          />
          <button onClick={addSubtask}>Add</button>
        </div>
      </div>

      {/* Relationships */}
      <div className="field">
        <span>Relationships</span>
        {myRels.length > 0 && (
          <ul className="sub-list">
            {myRels.map((r) => (
              <li key={r.id}>
                <span>
                  {r.from === node.id ? '→ ' : '← '}
                  {nameOf(r.from === node.id ? r.to : r.from)}
                  {r.label ? ` (${r.label})` : ''}
                </span>
                <button className="mini-x" title="Remove" onClick={() => removeRelationship(r.id)}>✕</button>
              </li>
            ))}
          </ul>
        )}
        <select className="topbar-select block-select" value={relTarget} onChange={(e) => setRelTarget(e.target.value)}>
          <option value="">Link to…</option>
          {allNodes
            .filter((n) => n.id !== node.id)
            .map((n) => (
              <option key={n.id} value={n.id}>{n.label}</option>
            ))}
        </select>
        <div className="res-add-row">
          <input placeholder="Label (optional)" value={relLabel} onChange={(e) => setRelLabel(e.target.value)} />
          <button onClick={addRelationship}>Link</button>
        </div>
      </div>

      {/* Boundary */}
      <div className="field">
        <span>Boundary</span>
        <button className={`status-btn ${boundary ? 'on s-done' : ''}`} onClick={toggleBoundary}>
          {boundary ? 'Boundary on — click to remove' : 'Group this branch with a boundary'}
        </button>
        {boundary && (
          <input
            placeholder="Boundary label (optional)"
            value={boundary.label || ''}
            onChange={(e) => setBoundaryLabel(e.target.value)}
          />
        )}
      </div>

      {/* Summary (brace over this node's children) */}
      {childIds.length > 0 && (
        <div className="field">
          <span>Summary</span>
          {mySummaries.map((s) => (
            <div className="res-add-row" key={s.id}>
              <input value={s.label} onChange={(e) => setSummaryLabel(s.id, e.target.value)} />
              <button className="mini-x" title="Remove" onClick={() => removeSummary(s.id)}>✕</button>
            </div>
          ))}
          {mySummaries.length === 0 && (
            <button className="mini-btn" style={{ alignSelf: 'flex-start' }} onClick={addSummary}>
              + Summarize children
            </button>
          )}
        </div>
      )}

      <div className="field">
        <span className="notes-head">
          Notes <em className="muted small">(Markdown)</em>
          {node.notes && (
            <button className="link-btn" onClick={() => setNotesPreview((p) => !p)}>
              {notesPreview ? 'Edit' : 'Preview'}
            </button>
          )}
        </span>
        {notesPreview ? (
          <div className="notes-preview" onClick={onPreviewClick} dangerouslySetInnerHTML={{ __html: renderMarkdown(node.notes) }} />
        ) : (
          <textarea
            rows={5}
            placeholder="Progress, blockers, key takeaways… **bold**, `code`, - lists, [links](https://…)"
            value={node.notes}
            onChange={(e) => onUpdate(node.id, { notes: e.target.value })}
          />
        )}
      </div>

      {backlinks.length > 0 && (
        <div className="field">
          <span>Linked from</span>
          <ul className="sub-list">
            {backlinks.map((n) => (
              <li key={n.id}>
                <span className="backlink" onClick={() => onNavigate?.(n.id)}>← {n.label}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="detail-actions">
        <button className="primary block" onClick={() => onAddChild(node.id)}>+ Add child topic</button>
        {!isRoot && (
          <button
            className="danger block"
            onClick={() => {
              if (confirm(`Delete "${node.label}" and all its sub-topics?`)) onDelete(node.id)
            }}
          >
            Delete topic
          </button>
        )}
      </div>
    </section>
  )
}
