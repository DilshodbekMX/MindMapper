import dagre from '@dagrejs/dagre'
import { THEMES } from './themes.js'
import { isFilterActive, matchesFilter } from './filters.js'

const NODE_W = 230
const NODE_H = 56

// Per-node progress from leaf descendants. done = 1, doing = 0.5, todo = 0.
// Computed over the FULL tree, independent of collapse state.
export function computeProgress(nodes) {
  const childrenOf = {}
  for (const n of Object.values(nodes)) {
    if (n.parentId) (childrenOf[n.parentId] ||= []).push(n.id)
  }
  const progress = {}
  // A leaf's score is its self-rated mastery (0–5 → 0–1) when set, else its status.
  const leafScore = (n) =>
    typeof n.mastery === 'number' ? n.mastery / 5 : n.status === 'done' ? 1 : n.status === 'doing' ? 0.5 : 0

  function visit(id) {
    const kids = childrenOf[id] || []
    if (kids.length === 0) {
      const score = leafScore(nodes[id])
      return (progress[id] = { score, total: 1, ratio: score })
    }
    let score = 0
    let total = 0
    for (const k of kids) {
      const p = visit(k)
      score += p.score
      total += p.total
    }
    return (progress[id] = { score, total, ratio: total ? score / total : 0 })
  }
  for (const n of Object.values(nodes)) if (!n.parentId) visit(n.id)
  return { progress, childrenOf }
}

function depthOf(node, nodes) {
  let d = 0
  let cur = node
  while (cur.parentId && nodes[cur.parentId]) {
    d += 1
    cur = nodes[cur.parentId]
  }
  return d
}

// Set of nodes hidden because some ancestor is collapsed.
function hiddenSet(nodes, childrenOf, ignoreCollapse) {
  const hidden = new Set()
  if (ignoreCollapse) return hidden
  function hide(id) {
    for (const k of childrenOf[id] || []) {
      hidden.add(k)
      hide(k)
    }
  }
  for (const n of Object.values(nodes)) {
    if (n.collapsed) hide(n.id)
  }
  return hidden
}

function countDescendants(id, childrenOf) {
  let total = 0
  for (const k of childrenOf[id] || []) total += 1 + countDescendants(k, childrenOf)
  return total
}

function tint(hex, a) {
  const h = (hex || '#3fb27f').replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${a})`
}

// --- structure helpers -------------------------------------------------------

const RANKDIR = { right: 'LR', left: 'RL', down: 'TB', up: 'BT' }

// Which handle a parent emits from / a child receives on, given the flow side.
const FLOW = {
  right: { out: 'r-s', in: 'l-t' },
  left: { out: 'l-s', in: 'r-t' },
  down: { out: 'b-s', in: 't-t' },
  up: { out: 't-s', in: 'b-t' },
}

function runDagre(ids, edges, rankdir, sep = {}, heights = {}) {
  const g = new dagre.graphlib.Graph()
  g.setGraph({
    rankdir,
    nodesep: sep.nodesep ?? 16,
    ranksep: sep.ranksep ?? 90,
    marginx: 20,
    marginy: 20,
  })
  g.setDefaultEdgeLabel(() => ({}))
  for (const id of ids) g.setNode(id, { width: NODE_W, height: heights[id] || NODE_H })
  for (const [p, c] of edges) g.setEdge(p, c)
  dagre.layout(g)
  const pos = {}
  for (const id of ids) {
    const n = g.node(id)
    if (n) pos[id] = { x: n.x, y: n.y }
  }
  return pos
}

// Balance top-level branches into left/right groups by descendant count.
function splitBalanced(rootChildren, childrenOf) {
  const sized = rootChildren
    .map((id) => ({ id, n: 1 + countDescendants(id, childrenOf) }))
    .sort((a, b) => b.n - a.n)
  const right = new Set()
  const left = new Set()
  let rw = 0
  let lw = 0
  for (const s of sized) {
    if (rw <= lw) {
      right.add(s.id)
      rw += s.n
    } else {
      left.add(s.id)
      lw += s.n
    }
  }
  return { right, left }
}

// Returns { positions: {id->{x,y center}}, flowOf: {id->'right'|'left'|'down'|'up'} }
function computeLayout(structure, visibleIds, edgePairs, roadmap, childrenOf, sep, heights = {}) {
  const rootId = roadmap.rootId
  const idSet = new Set(visibleIds)

  // Collect a top-level branch's subtree (within the laid-out set) + its edges.
  const branch = (cid) => {
    const ids = []
    const seen = new Set()
    const st = [cid]
    while (st.length) {
      const c = st.pop()
      if (seen.has(c) || !idSet.has(c)) continue
      seen.add(c)
      ids.push(c)
      for (const k of childrenOf[c] || []) st.push(k)
    }
    return { ids, edges: edgePairs.filter(([p, c]) => seen.has(p) && seen.has(c)) }
  }
  const topChildren = () =>
    (childrenOf[rootId] || []).filter((id) => idSet.has(id) && !roadmap.nodes[id]?.floating)

  // Timeline: root on the left, branches in a horizontal row, each subtree hangs down.
  if (structure === 'timeline') {
    const positions = { [rootId]: { x: 0, y: 0 } }
    const flowOf = { [rootId]: 'right' }
    let cursorX = NODE_W + 150
    for (const cid of topChildren()) {
      const { ids, edges } = branch(cid)
      const local = runDagre(ids, edges, 'TB', sep, heights)
      let lMinX = Infinity
      let lMaxX = -Infinity
      for (const id of ids) {
        const p = local[id]
        if (!p) continue
        lMinX = Math.min(lMinX, p.x)
        lMaxX = Math.max(lMaxX, p.x)
      }
      const dx = cursorX - lMinX
      const dy = -(local[cid]?.y ?? 0)
      for (const id of ids) {
        positions[id] = { x: local[id].x + dx, y: local[id].y + dy }
        flowOf[id] = 'down'
      }
      flowOf[cid] = 'right' // the link from the root enters from the left
      cursorX += lMaxX - lMinX + NODE_W + 80
    }
    return { positions, flowOf }
  }

  // Fishbone (Ishikawa): a spine to the left of the head, branches alternate above/below.
  if (structure === 'fishbone') {
    const positions = { [rootId]: { x: 0, y: 0 } }
    const flowOf = { [rootId]: 'left' }
    const step = 320
    let above = true
    let i = 0
    for (const cid of topChildren()) {
      i += 1
      const { ids, edges } = branch(cid)
      const local = runDagre(ids, edges, 'RL', sep, heights) // sub-causes grow leftward
      const baseX = -step * i
      const baseY = above ? -210 : 210
      const dx = baseX - (local[cid]?.x ?? 0)
      const dy = baseY - (local[cid]?.y ?? 0)
      for (const id of ids) {
        positions[id] = { x: local[id].x + dx, y: local[id].y + dy }
        flowOf[id] = 'left'
      }
      above = !above
    }
    return { positions, flowOf }
  }

  // Matrix: each top-level branch is a column; its subtree is a depth-indented
  // vertical list of cells (rows). Reads like a spreadsheet of columns.
  if (structure === 'matrix') {
    const positions = {}
    const flowOf = {}
    const cols = topChildren()
    const colW = NODE_W + 80
    const rowH = NODE_H + 24
    const indent = 22
    cols.forEach((cid, ci) => {
      let row = 0
      const place = (id, depth) => {
        positions[id] = { x: ci * colW + depth * indent, y: row * rowH }
        flowOf[id] = 'down'
        row += 1
        for (const k of childrenOf[id] || []) if (idSet.has(k)) place(k, depth + 1)
      }
      place(cid, 0)
    })
    positions[rootId] = { x: (Math.max(cols.length - 1, 0) * colW) / 2, y: -rowH }
    flowOf[rootId] = 'down'
    return { positions, flowOf }
  }

  if (structure !== 'mindmap') {
    const flow = structure in FLOW ? structure : 'right'
    const positions = runDagre(visibleIds, edgePairs, RANKDIR[flow] || 'LR', sep, heights)
    const flowOf = {}
    for (const id of visibleIds) flowOf[id] = flow
    return { positions, flowOf }
  }

  // ---- balanced mind map ----
  const rootChildrenAll = (childrenOf[rootId] || []).filter((id) => !roadmap.nodes[id]?.floating)
  const { right, left } = splitBalanced(rootChildrenAll, childrenOf)

  // Level-1 ancestor for each node decides its side.
  const sideOf = (id) => {
    let cur = roadmap.nodes[id]
    let prev = id
    while (cur && cur.parentId && cur.parentId !== rootId) {
      prev = cur.parentId
      cur = roadmap.nodes[cur.parentId]
    }
    const branch = cur && cur.parentId === rootId ? cur.id : prev
    return right.has(branch) ? 'right' : 'left'
  }

  const flowOf = {}
  const rightIds = [rootId]
  const leftIds = [rootId]
  for (const id of visibleIds) {
    if (id === rootId) continue
    const side = sideOf(id)
    flowOf[id] = side
    ;(side === 'right' ? rightIds : leftIds).push(id)
  }
  flowOf[rootId] = 'right'

  const inSet = (set) => ([p, c]) => set.includes(p) && set.includes(c)
  const rightPos = runDagre(rightIds, edgePairs.filter(inSet(rightIds)), 'LR', sep, heights)
  const leftPos = runDagre(leftIds, edgePairs.filter(inSet(leftIds)), 'RL', sep, heights)

  const rRoot = rightPos[rootId] || { x: 0, y: 0 }
  const lRoot = leftPos[rootId] || { x: 0, y: 0 }
  const positions = { [rootId]: { x: 0, y: 0 } }
  for (const id of rightIds) {
    if (id === rootId) continue
    positions[id] = { x: rightPos[id].x - rRoot.x, y: rightPos[id].y - rRoot.y }
  }
  for (const id of leftIds) {
    if (id === rootId) continue
    positions[id] = { x: leftPos[id].x - lRoot.x, y: leftPos[id].y - lRoot.y }
  }
  return { positions, flowOf }
}

// --- branch coloring ---------------------------------------------------------

function branchColors(roadmap, childrenOf, palette) {
  const rootId = roadmap.rootId
  const colorOf = {}
  const rootChildren = childrenOf[rootId] || []
  rootChildren.forEach((cid, i) => {
    const color = palette[i % palette.length]
    const stack = [cid]
    while (stack.length) {
      const id = stack.pop()
      colorOf[id] = color
      for (const k of childrenOf[id] || []) stack.push(k)
    }
  })
  return colorOf
}

// --- main --------------------------------------------------------------------

export function layoutElements(roadmap, { selectedId, selectedIds, search, filter } = {}) {
  const selSet = new Set(selectedIds && selectedIds.length ? selectedIds : selectedId ? [selectedId] : [])
  const { progress, childrenOf } = computeProgress(roadmap.nodes)
  const root = roadmap.nodes[roadmap.rootId]
  const structure = (root && root.structure) || 'right'
  const theme = (root && root.theme) || 'classic'
  const palette = (THEMES[theme] || THEMES.classic).palette
  const accent = '#3fb27f'
  const themeObj = THEMES[theme] || THEMES.classic
  const dark = themeObj.dark !== false
  const coloredBranch = !root || root.coloredBranch !== false
  const globalFont = (root && root.globalFont) || null
  const branchWidth = (root && root.branchWidth) || 'default'
  const edgeWidth = branchWidth === 'thin' ? 1.5 : branchWidth === 'thick' ? 3.5 : 2.2
  const compact = !!(root && root.compact)
  const sep = compact ? { nodesep: 14, ranksep: 60 } : { nodesep: 30, ranksep: 96 }

  const today = new Date().toISOString().slice(0, 10)
  const q = (search || '').trim().toLowerCase()
  const hidden = hiddenSet(roadmap.nodes, childrenOf, !!q) // search reveals everything

  const visibleNodes = Object.values(roadmap.nodes).filter((n) => !hidden.has(n.id))
  const visibleIds = visibleNodes.map((n) => n.id)
  const visibleSet = new Set(visibleIds)

  // Parent→child edges that should exist (parent visible, child not floating).
  const edgePairs = []
  for (const n of visibleNodes) {
    if (n.parentId && roadmap.nodes[n.parentId] && !hidden.has(n.parentId) && !n.floating) {
      edgePairs.push([n.parentId, n.id])
    }
  }

  // A floating "component" = a floating topic + its visible descendants. These
  // are detached from the tree, so we lay them out separately and park them in a
  // gutter to the left — otherwise dagre piles them onto the root's rank.
  const floatingSet = new Set()
  const floatingRoots = []
  for (const n of visibleNodes) {
    if (!n.floating) continue
    floatingRoots.push(n.id)
    const stack = [n.id]
    while (stack.length) {
      const cur = stack.pop()
      if (floatingSet.has(cur)) continue
      floatingSet.add(cur)
      for (const k of childrenOf[cur] || []) if (visibleSet.has(k)) stack.push(k)
    }
  }

  const mainIds = visibleIds.filter((id) => !floatingSet.has(id))
  const mainEdges = edgePairs.filter(([p, c]) => !floatingSet.has(p) && !floatingSet.has(c))

  // Estimate rendered node heights so dagre spacing accounts for multi-line
  // labels, badge/label/image rows — otherwise tall topics overlap vertically.
  const estHeight = (n) => {
    const lines = Math.max(1, Math.ceil((n.label || '').length / 20)) // ~20 chars/line at 230px bold
    let h = 24 + lines * 19
    if ((childrenOf[n.id] || []).length) h += 16 // progress bar row
    if ((n.labels || []).length) h += 20
    if ((n.resources || []).some((r) => r?.type === 'image')) h += 38
    const badge =
      (n.resources || []).some((r) => r?.type !== 'image') || (n.subtasks || []).length || n.dueDate || n.effort != null
    if (badge) h += 20
    return Math.max(54, h) + 6 // small safety buffer
  }
  const heights = {}
  for (const n of visibleNodes) heights[n.id] = estHeight(n)

  const { positions, flowOf } = computeLayout(structure, mainIds, mainEdges, roadmap, childrenOf, sep, heights)

  // Stack each floating component in a left gutter, clear of the main tree.
  if (floatingRoots.length) {
    const floatFlow = structure === 'mindmap' ? 'right' : structure in FLOW ? structure : 'right'
    const rankdir = RANKDIR[floatFlow] || 'LR'
    let mMinX = Infinity
    let mMinY = Infinity
    for (const id of mainIds) {
      const p = positions[id]
      if (!p) continue
      mMinX = Math.min(mMinX, p.x)
      mMinY = Math.min(mMinY, p.y)
    }
    if (!isFinite(mMinX)) {
      mMinX = 0
      mMinY = 0
    }
    const colX = mMinX - (NODE_W + 220)
    let stackY = mMinY
    for (const fr of floatingRoots) {
      const compIds = []
      const seen = new Set()
      const st = [fr]
      while (st.length) {
        const c = st.pop()
        if (seen.has(c)) continue
        seen.add(c)
        compIds.push(c)
        for (const k of childrenOf[c] || []) if (floatingSet.has(k)) st.push(k)
      }
      const compEdges = edgePairs.filter(([p, c]) => seen.has(p) && seen.has(c))
      const local = runDagre(compIds, compEdges, rankdir, sep, heights)
      let lMinX = Infinity
      let lMinY = Infinity
      let lMaxY = -Infinity
      for (const id of compIds) {
        const p = local[id]
        if (!p) continue
        lMinX = Math.min(lMinX, p.x)
        lMinY = Math.min(lMinY, p.y)
        lMaxY = Math.max(lMaxY, p.y)
      }
      if (!isFinite(lMinX)) continue
      // If the user has dragged this floating topic, honor its saved position;
      // otherwise stack it in the left gutter. pos is the node's top-left.
      const pos = roadmap.nodes[fr]?.pos
      let dx
      let dy
      if (pos) {
        dx = pos.x + NODE_W / 2 - local[fr].x
        dy = pos.y + NODE_H / 2 - local[fr].y
      } else {
        dx = colX - lMinX
        dy = stackY - lMinY
        stackY += lMaxY - lMinY + NODE_H + 40
      }
      for (const id of compIds) {
        positions[id] = { x: local[id].x + dx, y: local[id].y + dy }
        flowOf[id] = floatFlow
      }
    }
  }
  const colorOf = branchColors(roadmap, childrenOf, palette)
  const colorFor = (id) =>
    !coloredBranch || id === roadmap.rootId ? accent : colorOf[id] || accent

  // Whole-map theming: tint each topic's fill/border/text from its branch color.
  const themeStyleFor = (id, isRoot) => {
    const col = colorFor(id)
    if (dark) {
      return {
        fill: isRoot ? tint(col, 0.28) : tint(col, 0.14),
        border: col,
        text: '#e8efea',
      }
    }
    return {
      fill: isRoot ? tint(col, 0.18) : '#ffffff',
      border: col,
      text: '#1c2a24',
    }
  }

  const matches = (n) =>
    q && (n.label.toLowerCase().includes(q) || (n.notes || '').toLowerCase().includes(q))

  // Filter: dim nodes that neither match nor have a matching descendant.
  const fActive = isFilterActive(filter)
  const bright = {}
  if (fActive) {
    const selfMatch = {}
    for (const n of Object.values(roadmap.nodes)) selfMatch[n.id] = matchesFilter(n, filter, today)
    const mark = (id) => {
      let any = !!selfMatch[id]
      for (const k of childrenOf[id] || []) {
        mark(k)
        if (bright[k]) any = true
      }
      bright[id] = any
    }
    for (const n of Object.values(roadmap.nodes)) if (!n.parentId) mark(n.id)
  }

  const rfNodes = visibleNodes.map((n) => {
    const pos = positions[n.id] || { x: 0, y: 0 }
    const h = heights[n.id] || NODE_H
    const kids = childrenOf[n.id] || []
    const hasChildren = kids.length > 0
    const subtasks = n.subtasks || []
    const subDone = subtasks.filter((s) => s.done).length
    return {
      id: n.id,
      type: 'topic',
      position: { x: pos.x - NODE_W / 2, y: pos.y - h / 2 },
      data: {
        label: n.label,
        status: n.status,
        hasChildren,
        collapsed: !!n.collapsed,
        hiddenCount: n.collapsed ? countDescendants(n.id, childrenOf) : 0,
        depth: depthOf(n, roadmap.nodes),
        isRoot: !n.parentId,
        floating: !!n.floating,
        selected: selSet.has(n.id),
        progress: hasChildren ? progress[n.id] : null,
        resourceCount: (n.resources || []).filter((r) => r?.type !== 'image').length,
        images: (n.resources || []).filter((r) => r?.type === 'image').map((r) => r.url),
        subtaskTotal: subtasks.length,
        subtaskDone: subDone,
        priority: n.priority || null,
        dueDate: n.dueDate || null,
        overdue: !!(n.dueDate && n.status !== 'done' && n.dueDate < today),
        markers: n.markers || [],
        labels: n.labels || [],
        effort: n.effort ?? null,
        style: n.style || {},
        themeStyle: themeStyleFor(n.id, !n.parentId),
        light: !dark,
        globalFont,
        branchColor: colorFor(n.id),
        matched: matches(n),
        dimmed: q ? !matches(n) : fActive ? !bright[n.id] : false,
      },
      width: NODE_W,
      height: h,
    }
  })

  // For fishbone, pick handles from each edge's geometry and draw straight "bones".
  const geomHandles = (p, c) => {
    const a = positions[p] || { x: 0, y: 0 }
    const b = positions[c] || { x: 0, y: 0 }
    const dx = b.x - a.x
    const dy = b.y - a.y
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? { out: 'r-s', in: 'l-t' } : { out: 'l-s', in: 'r-t' }
    return dy >= 0 ? { out: 'b-s', in: 't-t' } : { out: 't-s', in: 'b-t' }
  }
  // Brace maps connect via drawn braces, not per-child edges.
  const rfEdges =
    structure === 'brace'
      ? []
      : edgePairs.map(([p, c]) => {
          const fish = structure === 'fishbone'
          const flow = fish ? geomHandles(p, c) : FLOW[flowOf[c]] || FLOW.right
          return {
            id: `${p}->${c}`,
            source: p,
            target: c,
            sourceHandle: flow.out,
            targetHandle: flow.in,
            type: fish ? 'straight' : 'smoothstep',
            style: { stroke: colorFor(c), strokeWidth: edgeWidth },
          }
        })

  // Boundaries: a rounded rectangle behind a topic + its visible descendants.
  const rfNodeById = Object.fromEntries(rfNodes.map((n) => [n.id, n]))
  const boundaryNodes = []
  for (const n of visibleNodes) {
    if (!n.boundary) continue
    const ids = [n.id]
    const stack = [n.id]
    while (stack.length) {
      const cur = stack.pop()
      for (const k of childrenOf[cur] || []) {
        if (visibleSet.has(k)) {
          ids.push(k)
          stack.push(k)
        }
      }
    }
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const id of ids) {
      const r = rfNodeById[id]
      if (!r) continue
      minX = Math.min(minX, r.position.x)
      minY = Math.min(minY, r.position.y)
      maxX = Math.max(maxX, r.position.x + NODE_W)
      maxY = Math.max(maxY, r.position.y + (r.height || NODE_H))
    }
    if (!isFinite(minX)) continue
    const pad = 16
    const top = 22 // room for the label
    boundaryNodes.push({
      id: `bnd-${n.id}`,
      type: 'boundary',
      position: { x: minX - pad, y: minY - pad - top },
      data: { label: n.boundary.label || '', color: n.boundary.color || colorFor(n.id) },
      style: { width: maxX - minX + pad * 2, height: maxY - minY + pad * 2 + top, zIndex: 0 },
      draggable: false,
      selectable: false,
      zIndex: 0,
    })
  }

  // Summaries: a brace + label to the right of a group of topics.
  const summaries = (root && root.summaries) || []
  const summaryNodes = []
  for (const s of summaries) {
    const members = (s.nodeIds || []).filter((id) => visibleSet.has(id))
    if (!members.length) continue
    let minX = Infinity
    let minY = Infinity
    let maxX = -Infinity
    let maxY = -Infinity
    for (const id of members) {
      const r = rfNodeById[id]
      if (!r) continue
      minX = Math.min(minX, r.position.x)
      minY = Math.min(minY, r.position.y)
      maxX = Math.max(maxX, r.position.x + NODE_W)
      maxY = Math.max(maxY, r.position.y + (r.height || NODE_H))
    }
    if (!isFinite(minX)) continue
    summaryNodes.push({
      id: `sum-${s.id}`,
      type: 'summary',
      position: { x: maxX + 14, y: minY },
      data: { label: s.label || 'Summary', color: colorFor(members[0]), height: maxY - minY },
      style: { width: 170, height: maxY - minY, zIndex: 1 },
      draggable: false,
      selectable: false,
    })
  }

  // Brace map: one curly brace per parent, grouping its children, with a
  // connector back to the parent (replaces the per-child edges).
  const braceNodes = []
  if (structure === 'brace') {
    for (const n of visibleNodes) {
      const parentRf = rfNodeById[n.id]
      if (!parentRf) continue
      const kids = (childrenOf[n.id] || []).filter((k) => visibleSet.has(k))
      if (!kids.length) continue
      let cMinX = Infinity
      let cMinY = Infinity
      let cMaxY = -Infinity
      for (const k of kids) {
        const r = rfNodeById[k]
        if (!r) continue
        cMinX = Math.min(cMinX, r.position.x)
        cMinY = Math.min(cMinY, r.position.y)
        cMaxY = Math.max(cMaxY, r.position.y + (r.height || NODE_H))
      }
      if (!isFinite(cMinX)) continue
      const parentRight = parentRf.position.x + NODE_W
      const D = 12
      const L = Math.max(12, cMinX - 18 - parentRight)
      const H = cMaxY - cMinY
      braceNodes.push({
        id: `brace-${n.id}`,
        type: 'brace',
        position: { x: parentRight, y: cMinY },
        data: { color: colorFor(kids[0]), H, L, D, tipY: parentRf.position.y + (parentRf.height || NODE_H) / 2 - cMinY },
        style: { width: L + D + 2, height: H, zIndex: 0 },
        draggable: false,
        selectable: false,
      })
    }
  }

  // Cross-links (relationships) drawn as dashed, labeled edges between any two
  // currently-visible topics.
  const rels = (root && root.relationships) || []
  for (const r of rels) {
    if (!visibleSet.has(r.from) || !visibleSet.has(r.to)) continue
    rfEdges.push({
      id: `rel-${r.id}`,
      source: r.from,
      target: r.to,
      sourceHandle: 'r-s',
      targetHandle: 'l-t',
      type: 'bezier',
      label: r.label || '',
      animated: true,
      style: { stroke: '#d9a441', strokeWidth: 1.5, strokeDasharray: '5 4' },
      labelStyle: { fill: '#d9a441', fontSize: 11 },
      labelBgStyle: { fill: '#0c1310' },
      data: { relationship: true, relId: r.id },
    })
  }

  // Boundary rects first (behind topics); summaries/braces last (beside topics).
  return { rfNodes: [...boundaryNodes, ...rfNodes, ...summaryNodes, ...braceNodes], rfEdges }
}
