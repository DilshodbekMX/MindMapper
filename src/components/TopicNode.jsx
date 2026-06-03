import { useState, useEffect, useRef } from 'react'
import { Handle, Position } from '@xyflow/react'

const STATUS_LABEL = { todo: 'Not started', doing: 'In progress', done: 'Done' }

// Source + target handle on every side; layout picks which ones an edge uses.
const SIDES = [
  ['t', Position.Top],
  ['r', Position.Right],
  ['b', Position.Bottom],
  ['l', Position.Left],
]

export default function TopicNode({ id, data }) {
  const {
    label,
    status,
    hasChildren,
    isRoot,
    floating,
    selected,
    progress,
    depth,
    collapsed,
    hiddenCount,
    resourceCount,
    images,
    subtaskTotal,
    subtaskDone,
    priority,
    dueDate,
    overdue,
    markers,
    labels,
    effort,
    style: st = {},
    globalFont,
    branchColor,
    themeStyle = {},
    light,
    matched,
    dimmed,
    editing,
    onToggleCollapse,
    onCommitRename,
    onCancelRename,
  } = data
  const pct = progress ? Math.round(progress.ratio * 100) : null
  const dueLabel = dueDate ? dueDate.slice(5) : null // MM-DD

  const cls = [
    'topic-node',
    `status-${status}`,
    isRoot ? 'is-root' : '',
    light ? 'is-light' : '',
    floating ? 'is-floating' : '',
    hasChildren ? 'is-branch' : 'is-leaf',
    selected ? 'is-selected' : '',
    matched ? 'is-match' : '',
    dimmed ? 'is-dimmed' : '',
    `depth-${Math.min(depth, 3)}`,
  ]
    .filter(Boolean)
    .join(' ')

  // Tint the node accent with its branch color (except the root).
  const accent = isRoot ? undefined : branchColor
  const bw = st.borderWidth === 'thin' ? 1 : st.borderWidth === 'thick' ? 3 : st.borderWidth ? 2 : undefined
  const radii = { rounded: 12, rect: 3, pill: 999, ellipse: '50%' }
  const nodeStyle = {
    ...(accent ? { '--branch': accent } : {}),
    // Theme defaults first; per-topic Style-tab overrides win below.
    ...(themeStyle.fill ? { background: themeStyle.fill } : {}),
    ...(themeStyle.border ? { borderColor: themeStyle.border, borderLeftColor: themeStyle.border } : {}),
    ...(globalFont || st.fontFamily ? { fontFamily: st.fontFamily || globalFont } : {}),
    ...(st.fill ? { background: st.fill } : {}),
    ...(st.border ? { borderColor: st.border, borderLeftColor: st.border } : {}),
    ...(bw != null ? { borderWidth: bw } : {}),
    ...(st.shape && st.shape !== 'underline' ? { borderRadius: radii[st.shape] ?? 12 } : {}),
    ...(st.shape === 'underline'
      ? { background: 'transparent', border: 'none', borderBottom: `2px solid ${st.border || accent || '#3fb27f'}`, borderRadius: 0, boxShadow: 'none' }
      : {}),
    // Selection wins over any themed border so the highlight is always visible.
    ...(selected ? { borderColor: '#3fb27f', borderLeftColor: '#3fb27f' } : {}),
  }
  const labelStyle = {
    ...(themeStyle.text ? { color: themeStyle.text } : {}),
    ...(st.fontSize ? { fontSize: st.fontSize } : {}),
    ...(st.bold != null ? { fontWeight: st.bold ? 700 : 500 } : {}),
    ...(st.italic ? { fontStyle: 'italic' } : {}),
    ...(st.textColor ? { color: st.textColor } : {}),
    textDecoration:
      [st.underline ? 'underline' : '', st.strike ? 'line-through' : ''].filter(Boolean).join(' ') || undefined,
  }
  const rowStyle =
    st.align === 'left' ? { justifyContent: 'flex-start' } : st.align === 'right' ? { justifyContent: 'flex-end' } : undefined

  return (
    <div className={cls} title={STATUS_LABEL[status]} style={nodeStyle}>
      {SIDES.map(([k, pos]) => (
        <span key={k}>
          <Handle id={`${k}-t`} type="target" position={pos} className="rf-handle" />
          <Handle id={`${k}-s`} type="source" position={pos} className="rf-handle" />
        </span>
      ))}

      <div className="topic-row" style={rowStyle}>
        {!hasChildren && <span className={`dot dot-${status}`} />}
        {priority && <span className={`prio-tag prio-${priority}`} title={`${priority} priority`} />}
        {markers?.length > 0 && <span className="markers">{markers.join(' ')}</span>}
        {editing ? (
          <InlineEditor label={label} style={labelStyle} onCommit={(v) => onCommitRename?.(id, v)} onCancel={onCancelRename} />
        ) : (
          <span className="topic-label" style={labelStyle}>{label}</span>
        )}
        {hasChildren && (
          <button
            className="caret"
            title={collapsed ? `Expand (${hiddenCount} hidden)` : 'Collapse'}
            onClick={(e) => {
              e.stopPropagation()
              onToggleCollapse?.(id)
            }}
          >
            {collapsed ? `+${hiddenCount}` : '−'}
          </button>
        )}
      </div>

      {hasChildren && pct !== null && (
        <div className="topic-progress">
          <div className="bar">
            <div className="bar-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="pct">{pct}%</span>
        </div>
      )}

      {images?.length > 0 && (
        <div className="topic-images">
          {images.slice(0, 3).map((src, i) => (
            <img key={i} src={src} alt="" className="topic-thumb" />
          ))}
        </div>
      )}

      {labels?.length > 0 && (
        <div className="topic-labels">
          {labels.map((l, i) => (
            <span className="tag" key={i}>{l}</span>
          ))}
        </div>
      )}

      {(resourceCount > 0 || subtaskTotal > 0 || dueLabel || effort != null) && (
        <div className="topic-badges">
          {effort != null && <span className="badge" title="effort estimate">⏱ {effort}</span>}
          {resourceCount > 0 && <span className="badge" title="resources">🔗 {resourceCount}</span>}
          {subtaskTotal > 0 && (
            <span className="badge" title="subtasks">
              ☑ {subtaskDone}/{subtaskTotal}
            </span>
          )}
          {dueLabel && (
            <span className={`badge due ${overdue ? 'overdue' : ''}`} title={`Due ${dueDate}${overdue ? ' — overdue' : ''}`}>
              📅 {dueLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

function InlineEditor({ label, style, onCommit, onCancel }) {
  const [val, setVal] = useState(label)
  const ref = useRef(null)
  useEffect(() => {
    ref.current?.focus()
    ref.current?.select()
  }, [])
  return (
    <input
      ref={ref}
      className="topic-edit"
      style={style}
      value={val}
      onChange={(e) => setVal(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={() => onCommit(val.trim() || label)}
      onKeyDown={(e) => {
        e.stopPropagation()
        if (e.key === 'Enter') {
          e.preventDefault()
          onCommit(val.trim() || label)
        } else if (e.key === 'Escape') {
          onCancel?.()
        }
      }}
    />
  )
}
