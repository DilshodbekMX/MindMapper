import { useState, useEffect, useRef, useMemo } from 'react'
import { ReactFlowProvider } from '@xyflow/react'
import Sidebar from './components/Sidebar.jsx'
import MindMap from './components/MindMap.jsx'
import Outline from './components/Outline.jsx'
import DetailPanel from './components/DetailPanel.jsx'
import StylePanel from './components/StylePanel.jsx'
import MapPanel from './components/MapPanel.jsx'
import Dashboard from './components/Dashboard.jsx'
import Pitch from './components/Pitch.jsx'
import Gantt from './components/Gantt.jsx'
import Board from './components/Board.jsx'
import Review from './components/Review.jsx'
import FilterBar from './components/FilterBar.jsx'
import SearchPalette from './components/SearchPalette.jsx'
import { emptyFilter } from './filters.js'
import { useStore } from './store/useStore.js'
import { exportJson, exportMarkdown, exportOpml, readImportFile } from './export.js'
import { STRUCTURES, THEMES, THEME_KEYS } from './themes.js'

export default function App() {
  const store = useStore()
  const [selectedId, setSelectedId] = useState(null)
  const [selectedIds, setSelectedIds] = useState([]) // multi-selection for bulk ops
  const [filter, setFilter] = useState(emptyFilter)
  const [view, setView] = useState('map') // map | dashboard
  const [search, setSearch] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const [rightTab, setRightTab] = useState('topic') // topic | style | map
  const [zen, setZen] = useState(false)
  const [pitch, setPitch] = useState(false)
  const [paletteOpen, setPaletteOpen] = useState(false)
  const [sidebarOpen, setSidebarOpen] = useState(false) // mobile drawer
  const [panelOpen, setPanelOpen] = useState(false) // mobile inspector drawer
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false) // desktop hide
  const [panelCollapsed, setPanelCollapsed] = useState(false) // desktop hide

  const isNarrow = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 899px)').matches
  const toggleSidebar = () => (isNarrow() ? setSidebarOpen((o) => !o) : setSidebarCollapsed((c) => !c))
  const togglePanel = () => (isNarrow() ? setPanelOpen((o) => !o) : setPanelCollapsed((c) => !c))
  const [presIndex, setPresIndex] = useState(0)
  const mapRef = useRef(null)
  const fileRef = useRef(null)

  useEffect(() => {
    setSelectedId(null)
    setSelectedIds([])
    setSearch('')
    setFilter(emptyFilter)
  }, [store.activeId])

  // Single click selects; Shift/Cmd+click toggles into a multi-selection.
  const handleSelect = (id, additive) => {
    if (!id) {
      setSelectedId(null)
      setSelectedIds([])
      setPanelOpen(false)
      return
    }
    if (additive) {
      setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
      setSelectedId(id)
    } else {
      setSelectedId(id)
      setSelectedIds([id])
    }
    // Reveal the inspector when a node is picked (drawer on mobile, un-collapse on desktop).
    if (isNarrow()) setPanelOpen(true)
    else setPanelCollapsed(false)
  }

  // Undo / redo (skip while typing so native text-undo keeps working).
  useEffect(() => {
    const onKey = (e) => {
      const mod = e.metaKey || e.ctrlKey
      if (!mod || e.key.toLowerCase() !== 'z') return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      e.preventDefault()
      e.shiftKey ? store.redo() : store.undo()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [store.undo, store.redo])

  // Ctrl/Cmd+K opens the global search palette.
  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // Depth-first topic order used to step through the map in presentation mode.
  const presOrder = useMemo(() => {
    if (!store.active) return []
    const childrenOf = {}
    for (const n of Object.values(store.active.nodes)) {
      if (n.parentId) (childrenOf[n.parentId] ||= []).push(n.id)
    }
    const order = []
    const walk = (id) => {
      order.push(id)
      for (const k of childrenOf[id] || []) walk(k)
    }
    walk(store.active.rootId)
    return order
  }, [store.active])

  const focusPres = (i) => {
    const id = presOrder[i]
    if (!id) return
    setSelectedId(id)
    mapRef.current?.focusNode(id)
  }
  const stepPres = (d) => {
    const i = Math.min(Math.max(presIndex + d, 0), presOrder.length - 1)
    setPresIndex(i)
    focusPres(i)
  }
  const enterZen = () => {
    setZen(true)
    setPresIndex(0)
    setTimeout(() => focusPres(0), 80)
  }

  // Esc exits Zen; arrows step through topics while in Zen.
  useEffect(() => {
    if (!zen) return
    const onKey = (e) => {
      if (e.key === 'Escape') setZen(false)
      else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') stepPres(1)
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') stepPres(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [zen, presIndex, presOrder])

  if (store.status === 'loading') {
    return <div className="splash">Loading your roadmaps…</div>
  }
  if (store.status === 'error') {
    return (
      <div className="splash error">
        <p>{store.error}</p>
        <p className="muted small">Start it with <code>npm run server</code> (or <code>npm run dev:all</code>), then reload.</p>
      </div>
    )
  }

  const active = store.active
  const selectedNode = selectedId && active ? active.nodes[selectedId] : null
  const isRoot = selectedNode && active && selectedNode.id === active.rootId
  const rootNode = active ? active.nodes[active.rootId] : null
  const structure = rootNode?.structure || 'right'
  const theme = rootNode?.theme || 'classic'
  const setStructure = (s) => active && store.updateNode(active.rootId, { structure: s })
  const setTheme = (t) => active && store.updateNode(active.rootId, { theme: t })

  const handleAddChild = (parentId) => handleSelect(store.addChild(parentId))

  const openFromDashboard = (roadmapId, nodeId = null) => {
    store.setActive(roadmapId)
    setView('map')
    if (nodeId) setTimeout(() => handleSelect(nodeId), 0)
  }

  const handleImport = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    try {
      const data = await readImportFile(file)
      await store.importRoadmap(data)
    } catch (err) {
      alert(`Import failed: ${err.message}`)
    }
  }

  const doExport = (kind) => {
    setMenuOpen(false)
    if (!active) return
    if (kind === 'json') exportJson(active)
    else if (kind === 'md') exportMarkdown(active)
    else if (kind === 'opml') exportOpml(active)
    else if (kind === 'png') mapRef.current?.exportPng(`${active.name || 'roadmap'}.png`)
    else if (kind === 'svg') mapRef.current?.exportSvg(`${active.name || 'roadmap'}.svg`)
  }

  const hasPanel = view === 'map' || view === 'outline'
  const isLightTheme = THEMES[theme]?.dark === false

  return (
    <div
      className={[
        'app',
        zen && 'zen',
        isLightTheme && 'theme-light',
        hasPanel && 'has-rp',
        sidebarOpen && 'sb-open',
        panelOpen && 'rp-open',
        sidebarCollapsed && 'sb-collapsed',
        panelCollapsed && 'rp-collapsed',
      ]
        .filter(Boolean)
        .join(' ')}
    >
      <Sidebar
        roadmaps={store.roadmaps}
        activeId={store.activeId}
        setActive={(id) => { store.setActive(id); setSidebarOpen(false) }}
        createRoadmap={store.createRoadmap}
        addCyberSample={store.addCyberSample}
        renameRoadmap={store.renameRoadmap}
        deleteRoadmap={store.deleteRoadmap}
        onImportClick={() => fileRef.current?.click()}
        view={view}
        setView={(v) => { setView(v); setSidebarOpen(false) }}
      />
      <input ref={fileRef} type="file" accept="application/json,.json,.opml,.xml" hidden onChange={handleImport} />

      {/* Backdrop closes the mobile drawers */}
      {(sidebarOpen || panelOpen) && (
        <div className="drawer-backdrop" onClick={() => { setSidebarOpen(false); setPanelOpen(false) }} />
      )}

      <main className="canvas-wrap">
        <header className="topbar">
          <div className="topbar-left">
            <button className="hamburger" title="Toggle sidebar" onClick={toggleSidebar}>☰</button>
            <h1>{view === 'dashboard' ? 'Dashboard' : active?.name}</h1>
          </div>
          <div className="topbar-right">
            {hasPanel && (
              <button className="hamburger panel-toggle" title="Toggle inspector" onClick={togglePanel}>ⓘ</button>
            )}
            {view === 'map' && (
              <>
                <button className="btn-sm" title="Undo (Ctrl/Cmd+Z)" onClick={store.undo} disabled={!store.canUndo}>↶</button>
                <button className="btn-sm" title="Redo (Ctrl/Cmd+Shift+Z)" onClick={store.redo} disabled={!store.canRedo}>↷</button>
                <select
                  className="topbar-select"
                  title="Map structure"
                  value={structure}
                  onChange={(e) => setStructure(e.target.value)}
                >
                  {STRUCTURES.map((s) => (
                    <option key={s.key} value={s.key}>{s.label}</option>
                  ))}
                </select>
                <select
                  className="topbar-select"
                  title="Color theme"
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                >
                  {THEME_KEYS.map((k) => (
                    <option key={k} value={k}>{THEMES[k].label}</option>
                  ))}
                </select>
                <input
                  className="search"
                  placeholder="Search topics…"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                <button className="btn-sm" title="Fit map to screen" onClick={() => mapRef.current?.fit()}>
                  ⤢ Fit
                </button>
                <button className="btn-sm" title="Add a detached floating topic" onClick={() => handleSelect(store.addFloating())}>
                  + Floating
                </button>
                <button className="btn-sm" title="Zen / presentation focus mode" onClick={enterZen}>
                  ⛶ Zen
                </button>
                <button className="btn-sm" title="Pitch — slide presentation" onClick={() => setPitch(true)}>
                  ▶ Pitch
                </button>
                <div className="menu-wrap">
                  <button className="btn-sm" onClick={() => setMenuOpen((o) => !o)}>Export ▾</button>
                  {menuOpen && (
                    <div className="menu" onMouseLeave={() => setMenuOpen(false)}>
                      <button onClick={() => doExport('json')}>JSON (.json)</button>
                      <button onClick={() => doExport('opml')}>OPML (.opml)</button>
                      <button onClick={() => doExport('md')}>Markdown (.md)</button>
                      <button onClick={() => doExport('png')}>Image (.png)</button>
                      <button onClick={() => doExport('svg')}>Vector (.svg)</button>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </header>

        {store.error && (
          <div className="banner">
            {store.error}
            <button className="mini-x" onClick={store.clearError}>✕</button>
          </div>
        )}

        {view === 'map' && active && (
          <FilterBar
            roadmap={active}
            filter={filter}
            setFilter={setFilter}
            updateRoot={(patch) => store.updateNode(active.rootId, patch)}
          />
        )}

        {view === 'map' && selectedIds.length > 1 && (
          <div className="bulk-bar">
            <span className="bulk-count">{selectedIds.length} selected</span>
            <span className="bulk-sep" />
            <span className="muted small">Status:</span>
            {['todo', 'doing', 'done'].map((s) => (
              <button
                key={s}
                className={`status-btn s-${s}`}
                onClick={() => {
                  const today = new Date().toISOString().slice(0, 10)
                  store.bulkMutate(selectedIds, (n) => {
                    const p = { status: s }
                    if (s === 'done' && !n.completedAt) p.completedAt = today
                    if (s !== 'done') p.completedAt = null
                    return p
                  })
                }}
              >
                {s === 'todo' ? 'Not started' : s === 'doing' ? 'In progress' : 'Done'}
              </button>
            ))}
            <button
              className="mini-btn"
              onClick={() => {
                const label = prompt('Add label to selected topics:')?.trim()
                if (label) store.bulkMutate(selectedIds, (n) => (n.labels?.includes(label) ? null : { labels: [...(n.labels || []), label] }))
              }}
            >
              + Label
            </button>
            <button className="danger" onClick={() => { store.bulkDelete(selectedIds); handleSelect(null) }}>Delete</button>
            <button className="mini-btn" onClick={() => handleSelect(null)}>Clear</button>
          </div>
        )}

        {view === 'dashboard' ? (
          <Dashboard
            roadmaps={store.roadmaps}
            onOpen={openFromDashboard}
            onReviewOpen={(rid) => { store.setActive(rid); setView('review') }}
          />
        ) : view === 'outline' ? (
          active && <Outline roadmap={active} selectedId={selectedId} onSelect={handleSelect} store={store} />
        ) : view === 'gantt' ? (
          active && <Gantt roadmap={active} onOpen={(id) => { setView('map'); setTimeout(() => handleSelect(id), 0) }} />
        ) : view === 'board' ? (
          active && <Board roadmap={active} filter={filter} onUpdate={store.updateNode} onOpen={(id) => { setView('map'); setTimeout(() => handleSelect(id), 0) }} />
        ) : view === 'review' ? (
          active && (
            <Review
              roadmap={active}
              onReview={store.reviewNode}
              onSeed={store.seedReview}
              onOpen={(id) => { setView('map'); setTimeout(() => handleSelect(id), 0) }}
            />
          )
        ) : (
          <ReactFlowProvider>
            {active && (
              <MindMap
                ref={mapRef}
                key={store.activeId}
                roadmap={active}
                selectedId={selectedId}
                selectedIds={selectedIds}
                onSelect={handleSelect}
                onToggleCollapse={store.toggleCollapse}
                onReparent={store.moveNode}
                onUpdate={store.updateNode}
                onAddChild={(id) => handleSelect(store.addChild(id))}
                onAddSibling={(id) => handleSelect(store.addSibling(id))}
                onDeleteNode={(id) => { store.deleteNode(id); handleSelect(null) }}
                search={search}
                filter={filter}
              />
            )}
          </ReactFlowProvider>
        )}

        {active && view !== 'dashboard' && (
          <footer className="statusbar">
            <span className="muted small">Topics: {Object.keys(active.nodes).length}</span>
            <span className="status-spacer" />
            <button
              className={`status-link ${view === 'outline' ? 'on' : ''}`}
              onClick={() => setView(view === 'outline' ? 'map' : 'outline')}
            >
              Outliner
            </button>
          </footer>
        )}
      </main>

      {view === 'outline' && (
        <DetailPanel
          node={selectedNode}
          isRoot={isRoot}
          roadmap={active}
          updateRoot={(patch) => active && store.updateNode(active.rootId, patch)}
          onNavigate={(id) => handleSelect(id)}
          onUpdate={store.updateNode}
          onAddChild={handleAddChild}
          onDelete={(id) => {
            store.deleteNode(id)
            handleSelect(null)
          }}
          onClose={() => handleSelect(null)}
        />
      )}

      {view === 'map' && (
        <div className="right-col">
          <div className="rp-tabs">
            <button className={rightTab === 'topic' ? 'on' : ''} onClick={() => setRightTab('topic')}>Topic</button>
            <button className={rightTab === 'style' ? 'on' : ''} onClick={() => setRightTab('style')}>Style</button>
            <button className={rightTab === 'map' ? 'on' : ''} onClick={() => setRightTab('map')}>Map</button>
          </div>
          {rightTab === 'topic' && (
            <DetailPanel
              node={selectedNode}
              isRoot={isRoot}
              roadmap={active}
              updateRoot={(patch) => active && store.updateNode(active.rootId, patch)}
              onNavigate={(id) => handleSelect(id)}
              onUpdate={store.updateNode}
              onAddChild={handleAddChild}
              onDelete={(id) => {
                store.deleteNode(id)
                handleSelect(null)
              }}
              onClose={() => handleSelect(null)}
            />
          )}
          {rightTab === 'style' && (
            <section className="detail">
              <StylePanel node={selectedNode} onUpdate={store.updateNode} />
            </section>
          )}
          {rightTab === 'map' && (
            <section className="detail">
              <MapPanel roadmap={active} updateRoot={(patch) => active && store.updateNode(active.rootId, patch)} />
            </section>
          )}
        </div>
      )}

      {zen && (
        <div className="zen-bar">
          <button onClick={() => stepPres(-1)} disabled={presIndex <= 0} title="Previous (←)">◀</button>
          <span className="zen-current">{active?.nodes[presOrder[presIndex]]?.label || ''}</span>
          <span className="zen-count">{presOrder.length ? `${presIndex + 1} / ${presOrder.length}` : ''}</span>
          <button onClick={() => stepPres(1)} disabled={presIndex >= presOrder.length - 1} title="Next (→)">▶</button>
          <button className="zen-exit" onClick={() => setZen(false)} title="Exit (Esc)">✕ Exit</button>
        </div>
      )}

      {pitch && active && <Pitch roadmap={active} onExit={() => setPitch(false)} />}

      {paletteOpen && (
        <SearchPalette
          roadmaps={store.roadmaps}
          onClose={() => setPaletteOpen(false)}
          onPick={(rid, nid) => {
            setPaletteOpen(false)
            openFromDashboard(rid, nid)
          }}
        />
      )}
    </div>
  )
}
