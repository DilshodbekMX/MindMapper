// Map-level settings — the XMind "Map" tab. Settings live on the root node.
import { useState } from 'react'
import { STRUCTURES, THEMES, THEME_KEYS, THEME_GROUPS } from '../themes.js'

const WIDTHS = [
  { key: 'thin', label: 'Thin' },
  { key: 'default', label: 'Default' },
  { key: 'thick', label: 'Thick' },
]

export default function MapPanel({ roadmap, updateRoot }) {
  const root = roadmap?.nodes[roadmap.rootId] || {}
  const theme = root.theme || 'classic'
  const [themeTab, setThemeTab] = useState(THEMES[theme]?.group || 'colorful')
  if (!roadmap) return null
  const structure = root.structure || 'right'
  const themesInTab = THEME_KEYS.filter((k) => THEMES[k].group === themeTab)

  return (
    <div className="detail-body">
      <div className="field">
        <span>Structure</span>
        <div className="struct-gallery">
          {STRUCTURES.map((s) => (
            <button
              key={s.key}
              className={`struct-cell ${structure === s.key ? 'on' : ''}`}
              onClick={() => updateRoot({ structure: s.key })}
              title={s.label}
            >
              <span className={`struct-ico ico-${s.key}`} />
              <span className="struct-name">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Color theme</span>
        <div className="theme-tabs">
          {THEME_GROUPS.map((g) => (
            <button key={g} className={themeTab === g ? 'on' : ''} onClick={() => setThemeTab(g)}>
              {g === 'colorful' ? 'Colorful' : 'Classic'}
            </button>
          ))}
        </div>
        <div className="theme-swatches">
          {themesInTab.map((k) => (
            <button
              key={k}
              className={`theme-swatch ${theme === k ? 'on' : ''}`}
              onClick={() => updateRoot({ theme: k })}
              title={THEMES[k].label}
            >
              <span className="swatch-strip">
                {THEMES[k].palette.slice(0, 6).map((c, i) => (
                  <i key={i} style={{ background: c }} />
                ))}
              </span>
              <span className="struct-name">{THEMES[k].label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <span>Background</span>
        <div className="style-row">
          <input type="color" value={root.bg || '#0c1310'} onChange={(e) => updateRoot({ bg: e.target.value })} />
          <button className="mini-btn" onClick={() => updateRoot({ bg: null })}>Reset</button>
        </div>
      </div>

      <div className="field">
        <span>Global font</span>
        <select
          className="topbar-select block-select"
          value={root.globalFont || ''}
          onChange={(e) => updateRoot({ globalFont: e.target.value || null })}
        >
          <option value="">Default</option>
          <option value='Georgia, "Times New Roman", serif'>Serif</option>
          <option value='system-ui, "Segoe UI", sans-serif'>Sans</option>
          <option value='"Courier New", ui-monospace, monospace'>Mono</option>
        </select>
      </div>

      <div className="field">
        <span>Branch line width</span>
        <div className="seg-group">
          {WIDTHS.map((w) => (
            <button
              key={w.key}
              className={`seg-btn ${(root.branchWidth || 'default') === w.key ? 'on' : ''}`}
              onClick={() => updateRoot({ branchWidth: w.key })}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="field">
        <label className="check-row">
          <input type="checkbox" checked={root.coloredBranch !== false} onChange={(e) => updateRoot({ coloredBranch: e.target.checked })} />
          Colored branches
        </label>
        <label className="check-row">
          <input type="checkbox" checked={!!root.compact} onChange={(e) => updateRoot({ compact: e.target.checked })} />
          Compact map (tighter spacing)
        </label>
      </div>
    </div>
  )
}
