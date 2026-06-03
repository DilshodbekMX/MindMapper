import { useMemo, useEffect, useState, forwardRef, useImperativeHandle } from 'react'
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  useReactFlow,
  getNodesBounds,
  getViewportForBounds,
} from '@xyflow/react'
import { toPng, toSvg } from 'html-to-image'
import TopicNode from './TopicNode.jsx'
import BoundaryNode from './BoundaryNode.jsx'
import SummaryNode from './SummaryNode.jsx'
import BraceNode from './BraceNode.jsx'
import { layoutElements } from '../layout.js'
import { THEMES } from '../themes.js'

const nodeTypes = { topic: TopicNode, boundary: BoundaryNode, summary: SummaryNode, brace: BraceNode }

const MindMap = forwardRef(function MindMap(
  { roadmap, selectedId, selectedIds, onSelect, onToggleCollapse, onReparent, onUpdate, onAddChild, onAddSibling, onDeleteNode, search, filter },
  ref,
) {
  const rf = useReactFlow()
  const [editingId, setEditingId] = useState(null)

  // ---- canvas keyboard editing (XMind/MindMeister-style) ----
  useEffect(() => {
    const onKey = (e) => {
      if (editingId) return
      const t = e.target
      if (t && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA' || t.isContentEditable)) return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const id = selectedId
      if (!id || !roadmap.nodes[id]) return
      const node = roadmap.nodes[id]
      const childrenOf = {}
      for (const n of Object.values(roadmap.nodes)) if (n.parentId) (childrenOf[n.parentId] ||= []).push(n.id)
      const siblings = node.parentId ? childrenOf[node.parentId] || [] : [id]
      const idx = siblings.indexOf(id)

      if (e.key === 'Tab') {
        e.preventDefault()
        onAddChild?.(id)
      } else if (e.key === 'Enter') {
        e.preventDefault()
        if (node.parentId) onAddSibling?.(id)
        else onAddChild?.(id)
      } else if (e.key === 'F2') {
        e.preventDefault()
        setEditingId(id)
      } else if ((e.key === 'Delete' || e.key === 'Backspace') && node.parentId) {
        e.preventDefault()
        onDeleteNode?.(id)
      } else if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        if (e.key === 'ArrowDown' && siblings.length > 1) {
          e.preventDefault()
          onSelect(siblings[Math.min(idx + 1, siblings.length - 1)])
        } else {
          const kids = childrenOf[id] || []
          if (kids.length) {
            e.preventDefault()
            onSelect(kids[0])
          }
        }
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        if (e.key === 'ArrowUp' && siblings.length > 1) {
          e.preventDefault()
          onSelect(siblings[Math.max(idx - 1, 0)])
        } else if (node.parentId) {
          e.preventDefault()
          onSelect(node.parentId)
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [selectedId, roadmap, editingId, onAddChild, onAddSibling, onDeleteNode, onSelect])

  // Drop a node onto another topic to reparent it. Ignores self & descendants.
  const handleDragStop = (_e, dragged) => {
    if (dragged.type !== 'topic' || !onReparent) return
    const descendants = new Set([dragged.id])
    let changed = true
    while (changed) {
      changed = false
      for (const n of Object.values(roadmap.nodes)) {
        if (n.parentId && descendants.has(n.parentId) && !descendants.has(n.id)) {
          descendants.add(n.id)
          changed = true
        }
      }
    }
    const cx = dragged.position.x + (dragged.width || 230) / 2
    const cy = dragged.position.y + (dragged.height || 56) / 2
    let hit = null
    for (const n of rf.getNodes()) {
      if (n.type !== 'topic' || descendants.has(n.id)) continue
      const w = n.width || 230
      const h = n.height || 56
      if (cx >= n.position.x && cx <= n.position.x + w && cy >= n.position.y && cy <= n.position.y + h) {
        hit = n
        break
      }
    }
    if (hit && roadmap.nodes[dragged.id]?.parentId !== hit.id) {
      onReparent(dragged.id, hit.id)
    } else if (!hit && roadmap.nodes[dragged.id]?.floating && onUpdate) {
      // Free-place a floating topic where it was dropped.
      onUpdate(dragged.id, { pos: { x: dragged.position.x, y: dragged.position.y } })
    }
  }

  const commitRename = (id, label) => {
    onUpdate?.(id, { label })
    setEditingId(null)
  }

  const { rfNodes, rfEdges } = useMemo(() => {
    const { rfNodes, rfEdges } = layoutElements(roadmap, { selectedId, selectedIds, search, filter })
    // Inject callbacks + inline-edit flag into each node's data.
    return {
      rfNodes: rfNodes.map((n) => ({
        ...n,
        data: { ...n.data, onToggleCollapse, editing: n.id === editingId, onCommitRename: commitRename, onCancelRename: () => setEditingId(null) },
      })),
      rfEdges,
    }
  }, [roadmap, selectedId, selectedIds, search, filter, onToggleCollapse, editingId])

  // Zoom to matches when searching.
  useEffect(() => {
    if (!search?.trim()) return
    const hits = rfNodes.filter((n) => n.data.matched).map((n) => ({ id: n.id }))
    if (hits.length) rf.fitView({ nodes: hits, padding: 0.3, duration: 400, maxZoom: 1.2 })
  }, [search, rfNodes, rf])

  const rootNode = roadmap.nodes[roadmap.rootId]
  const themeObj = THEMES[rootNode?.theme] || THEMES.classic
  const dark = themeObj.dark !== false
  const bg = rootNode?.bg || themeObj.bg || '#0c1310'
  const dotColor = dark ? '#1e2a25' : '#d3ddd6'

  useImperativeHandle(
    ref,
    () => {
      const render = async (encoder) => {
        const nodes = rf.getNodes()
        if (!nodes.length) return null
        const bounds = getNodesBounds(nodes)
        const pad = 60
        const w = Math.ceil(bounds.width) + pad * 2
        const h = Math.ceil(bounds.height) + pad * 2
        const vp = getViewportForBounds(bounds, w, h, 0.2, 2, 0.1)
        const viewport = document.querySelector('.react-flow__viewport')
        const opts = {
          backgroundColor: bg,
          width: w,
          height: h,
          style: {
            width: `${w}px`,
            height: `${h}px`,
            transform: `translate(${vp.x}px, ${vp.y}px) scale(${vp.zoom})`,
          },
        }
        return encoder === 'svg' ? toSvg(viewport, opts) : toPng(viewport, { ...opts, pixelRatio: 2 })
      }
      const save = (dataUrl, filename) => {
        if (!dataUrl) return
        const a = document.createElement('a')
        a.href = dataUrl
        a.download = filename
        a.click()
      }
      return {
        async exportPng(filename) {
          save(await render('png'), filename)
        },
        async exportSvg(filename) {
          save(await render('svg'), filename)
        },
        focusNode(id) {
          if (rf.getNode(id)) rf.fitView({ nodes: [{ id }], duration: 500, padding: 0.45, maxZoom: 1.4 })
        },
        fit() {
          rf.fitView({ duration: 400, padding: 0.12 })
        },
      }
    },
    [rf, bg],
  )

  return (
    <div className="mindmap">
      <ReactFlow
        nodes={rfNodes}
        edges={rfEdges}
        nodeTypes={nodeTypes}
        style={{ background: bg }}
        onNodeClick={(e, node) => node.type === 'topic' && onSelect(node.id, e.shiftKey || e.metaKey || e.ctrlKey)}
        onNodeDoubleClick={(_, node) => node.type === 'topic' && setEditingId(node.id)}
        onNodeDragStop={handleDragStop}
        onPaneClick={() => onSelect(null)}
        deleteKeyCode={null}
        fitView
        fitViewOptions={{ padding: 0.15 }}
        minZoom={0.12}
        maxZoom={2}
        panOnScroll
        selectionOnDrag={false}
        proOptions={{ hideAttribution: true }}
      >
        <Background color={dotColor} gap={22} />
        <Controls showInteractive={false} />
        <MiniMap
          pannable
          zoomable
          nodeColor={(n) => {
            const s = n.data?.status
            return s === 'done' ? '#3fb27f' : s === 'doing' ? '#d9a441' : '#3a4a42'
          }}
          maskColor="rgba(10,16,14,0.6)"
        />
      </ReactFlow>
    </div>
  )
})

export default MindMap
