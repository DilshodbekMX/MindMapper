// Per-topic visual styling — the XMind "Style" tab.
const SHAPES = [
  { key: 'rounded', label: 'Rounded' },
  { key: 'rect', label: 'Rectangle' },
  { key: 'pill', label: 'Pill' },
  { key: 'ellipse', label: 'Ellipse' },
  { key: 'underline', label: 'Underline' },
]

const FONTS = [
  { label: 'Default', value: '' },
  { label: 'Serif', value: 'Georgia, "Times New Roman", serif' },
  { label: 'Sans', value: 'system-ui, "Segoe UI", sans-serif' },
  { label: 'Mono', value: '"Courier New", ui-monospace, monospace' },
]

const WIDTHS = [
  { key: 'thin', label: 'Thin' },
  { key: 'medium', label: 'Medium' },
  { key: 'thick', label: 'Thick' },
]

export default function StylePanel({ node, onUpdate }) {
  if (!node) {
    return (
      <div className="detail-body">
        <p className="hint">Select a topic to style it — shape, colors, font, and text.</p>
      </div>
    )
  }
  const st = node.style || {}
  const set = (patch) => onUpdate(node.id, { style: { ...st, ...patch } })
  const toggle = (k) => set({ [k]: !st[k] })

  return (
    <div className="detail-body">
      <div className="field">
        <span>Shape</span>
        <select className="topbar-select block-select" value={st.shape || 'rounded'} onChange={(e) => set({ shape: e.target.value })}>
          {SHAPES.map((s) => (
            <option key={s.key} value={s.key}>{s.label}</option>
          ))}
        </select>
      </div>

      <div className="field">
        <span>Fill</span>
        <div className="style-row">
          <input type="color" value={st.fill || '#1c2e26'} onChange={(e) => set({ fill: e.target.value })} />
          <button className="mini-btn" onClick={() => set({ fill: null })}>None</button>
        </div>
      </div>

      <div className="field">
        <span>Border</span>
        <div className="style-row">
          <input type="color" value={st.border || '#233029'} onChange={(e) => set({ border: e.target.value })} />
          <button className="mini-btn" onClick={() => set({ border: null })}>None</button>
        </div>
        <div className="seg-group">
          {WIDTHS.map((w) => (
            <button key={w.key} className={`seg-btn ${st.borderWidth === w.key ? 'on' : ''}`} onClick={() => set({ borderWidth: w.key })}>
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Text</span>
        <div className="style-row">
          <select className="topbar-select" style={{ flex: 1 }} value={st.fontFamily || ''} onChange={(e) => set({ fontFamily: e.target.value || null })}>
            {FONTS.map((f) => (
              <option key={f.label} value={f.value}>{f.label}</option>
            ))}
          </select>
          <input
            type="number"
            min="8"
            max="72"
            placeholder="size"
            value={st.fontSize || ''}
            onChange={(e) => set({ fontSize: e.target.value ? Number(e.target.value) : null })}
            style={{ width: 64 }}
          />
        </div>
        <div className="seg-group">
          <button className={`seg-btn ${st.bold ? 'on' : ''}`} style={{ fontWeight: 700 }} onClick={() => toggle('bold')}>B</button>
          <button className={`seg-btn ${st.italic ? 'on' : ''}`} style={{ fontStyle: 'italic' }} onClick={() => toggle('italic')}>I</button>
          <button className={`seg-btn ${st.underline ? 'on' : ''}`} style={{ textDecoration: 'underline' }} onClick={() => toggle('underline')}>U</button>
          <button className={`seg-btn ${st.strike ? 'on' : ''}`} style={{ textDecoration: 'line-through' }} onClick={() => toggle('strike')}>S</button>
          <input type="color" value={st.textColor || '#dbe7e0'} onChange={(e) => set({ textColor: e.target.value })} title="Text color" />
        </div>
        <div className="seg-group">
          {['left', 'center', 'right'].map((a) => (
            <button key={a} className={`seg-btn ${(st.align || 'center') === a ? 'on' : ''}`} onClick={() => set({ align: a })}>
              {a === 'left' ? '⬅' : a === 'right' ? '➡' : '↔'}
            </button>
          ))}
        </div>
      </div>

      <button className="block ghost" onClick={() => onUpdate(node.id, { style: {} })}>Reset Style</button>
    </div>
  )
}
