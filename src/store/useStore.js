import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from '../api.js'
import { cyberSecurityRoadmap, blankRoadmap, makeNode, normalizeRoadmap } from '../data/seed.js'
import { gradeReview, newReview } from '../srs.js'

const newId = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `n_${Date.now()}_${Math.random()}`

const SAVE_DELAY = 600
const HISTORY_CAP = 50

export function useStore() {
  const [state, setState] = useState({ roadmaps: {}, activeId: null })
  const [status, setStatus] = useState('loading') // loading | ready | error
  const [error, setError] = useState(null)

  // Mirror of state so the debounced flusher reads the latest data.
  const stateRef = useRef(state)
  stateRef.current = state

  const dirtyRef = useRef(new Set())
  const timerRef = useRef(null)

  // ---- per-roadmap undo/redo history (snapshots of { rootId, nodes }) ----
  const pastRef = useRef({}) // { [roadmapId]: snapshot[] }
  const futureRef = useRef({})
  const [, setHistTick] = useState(0) // force re-render so canUndo/canRedo refresh
  const bumpHist = () => setHistTick((t) => t + 1)

  // ---- initial load ----
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        let list = await api.list()
        if (!list.length) {
          // First run on a fresh DB: seed the Cyber Security roadmap.
          const seed = cyberSecurityRoadmap()
          await api.create(seed)
          list = [seed]
        }
        if (cancelled) return
        const roadmaps = {}
        for (const rm of list) roadmaps[rm.id] = normalizeRoadmap(rm)
        setState({ roadmaps, activeId: list[0].id })
        setStatus('ready')
      } catch (e) {
        if (cancelled) return
        console.error(e)
        setError('Could not reach the server. Is `npm run server` running on port 4000?')
        setStatus('error')
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  // ---- debounced persistence of dirty roadmaps ----
  const scheduleSave = useCallback((id) => {
    dirtyRef.current.add(id)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      const ids = [...dirtyRef.current]
      dirtyRef.current.clear()
      for (const rid of ids) {
        const rm = stateRef.current.roadmaps[rid]
        if (!rm) continue
        try {
          await api.update(rid, { name: rm.name, rootId: rm.rootId, nodes: rm.nodes })
        } catch (e) {
          console.error('Save failed for', rid, e)
          setError('Auto-save failed — your latest edits may not be persisted.')
        }
      }
    }, SAVE_DELAY)
  }, [])

  // Flush pending saves when the tab is hidden/closed.
  useEffect(() => {
    const flush = () => {
      if (!dirtyRef.current.size) return
      for (const rid of dirtyRef.current) {
        const rm = stateRef.current.roadmaps[rid]
        if (!rm) continue
        // keepalive lets the request finish during unload
        fetch(`/api/roadmaps/${rid}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: rm.name, rootId: rm.rootId, nodes: rm.nodes }),
          keepalive: true,
        }).catch(() => {})
      }
      dirtyRef.current.clear()
    }
    document.addEventListener('visibilitychange', flush)
    window.addEventListener('beforeunload', flush)
    return () => {
      document.removeEventListener('visibilitychange', flush)
      window.removeEventListener('beforeunload', flush)
    }
  }, [])

  const roadmaps = Object.values(state.roadmaps)
  const active = state.roadmaps[state.activeId] || roadmaps[0] || null

  const setActive = useCallback((id) => setState((s) => ({ ...s, activeId: id })), [])

  // ---- roadmap-level (await the server so ids/state stay consistent) ----
  const createRoadmap = useCallback(async (name) => {
    const rm = blankRoadmap(name?.trim() || 'New Roadmap')
    try {
      const saved = normalizeRoadmap(await api.create(rm))
      setState((s) => ({ roadmaps: { ...s.roadmaps, [saved.id]: saved }, activeId: saved.id }))
      return saved.id
    } catch (e) {
      console.error(e)
      setError('Failed to create roadmap.')
    }
  }, [])

  const addCyberSample = useCallback(async () => {
    const rm = cyberSecurityRoadmap()
    try {
      const saved = normalizeRoadmap(await api.create(rm))
      setState((s) => ({ roadmaps: { ...s.roadmaps, [saved.id]: saved }, activeId: saved.id }))
      return saved.id
    } catch (e) {
      console.error(e)
      setError('Failed to add sample roadmap.')
    }
  }, [])

  const importRoadmap = useCallback(async (raw) => {
    // Re-key onto a fresh id to avoid clobbering an existing roadmap.
    const rm = normalizeRoadmap({ ...raw, id: newId() })
    try {
      const saved = normalizeRoadmap(await api.create(rm))
      setState((s) => ({ roadmaps: { ...s.roadmaps, [saved.id]: saved }, activeId: saved.id }))
      return saved.id
    } catch (e) {
      console.error(e)
      setError('Failed to import roadmap.')
    }
  }, [])

  const renameRoadmap = useCallback(
    (id, name) => {
      setState((s) => ({ ...s, roadmaps: { ...s.roadmaps, [id]: { ...s.roadmaps[id], name } } }))
      scheduleSave(id)
    },
    [scheduleSave],
  )

  const deleteRoadmap = useCallback(async (id) => {
    try {
      await api.remove(id)
    } catch (e) {
      console.error(e)
    }
    setState((s) => {
      const next = { ...s.roadmaps }
      delete next[id]
      const remaining = Object.keys(next)
      const activeId = s.activeId === id ? remaining[0] ?? null : s.activeId
      return { roadmaps: next, activeId }
    })
  }, [])

  // ---- node-level mutations (optimistic + debounced save) ----
  // Records a pre-edit snapshot for undo. fn must be pure (it's evaluated once,
  // outside setState, so StrictMode's double-invoke can't double-push history).
  const mutateActive = useCallback(
    (fn) => {
      const s = stateRef.current
      const id = s.activeId
      const rm = id && s.roadmaps[id]
      if (!rm) return
      const nextRm = fn(rm)
      if (nextRm === rm) return // no-op (guarded mutation) — don't touch history
      pastRef.current[id] = [...(pastRef.current[id] || []), { rootId: rm.rootId, nodes: rm.nodes }].slice(-HISTORY_CAP)
      futureRef.current[id] = []
      bumpHist()
      setState((cur) => ({ ...cur, roadmaps: { ...cur.roadmaps, [id]: nextRm } }))
      scheduleSave(id)
    },
    [scheduleSave],
  )

  const undo = useCallback(() => {
    const id = stateRef.current.activeId
    const past = id && pastRef.current[id]
    if (!past || !past.length) return
    const rm = stateRef.current.roadmaps[id]
    const prev = past[past.length - 1]
    pastRef.current[id] = past.slice(0, -1)
    futureRef.current[id] = [...(futureRef.current[id] || []), { rootId: rm.rootId, nodes: rm.nodes }].slice(-HISTORY_CAP)
    bumpHist()
    setState((cur) => ({ ...cur, roadmaps: { ...cur.roadmaps, [id]: { ...cur.roadmaps[id], rootId: prev.rootId, nodes: prev.nodes } } }))
    scheduleSave(id)
  }, [scheduleSave])

  const redo = useCallback(() => {
    const id = stateRef.current.activeId
    const future = id && futureRef.current[id]
    if (!future || !future.length) return
    const rm = stateRef.current.roadmaps[id]
    const next = future[future.length - 1]
    futureRef.current[id] = future.slice(0, -1)
    pastRef.current[id] = [...(pastRef.current[id] || []), { rootId: rm.rootId, nodes: rm.nodes }].slice(-HISTORY_CAP)
    bumpHist()
    setState((cur) => ({ ...cur, roadmaps: { ...cur.roadmaps, [id]: { ...cur.roadmaps[id], rootId: next.rootId, nodes: next.nodes } } }))
    scheduleSave(id)
  }, [scheduleSave])

  const addChild = useCallback(
    (parentId, label = 'New topic') => {
      const id = newId()
      mutateActive((rm) => ({
        ...rm,
        nodes: { ...rm.nodes, [id]: makeNode(id, label, parentId) },
      }))
      return id
    },
    [mutateActive],
  )

  // Add a sibling after the given node (same parent). Root has no siblings.
  const addSibling = useCallback(
    (siblingId) => {
      const node = stateRef.current.roadmaps[stateRef.current.activeId]?.nodes[siblingId]
      if (!node || !node.parentId) return undefined
      return addChild(node.parentId)
    },
    [addChild],
  )

  // A detached "floating" topic: kept under the root but drawn without an edge.
  const addFloating = useCallback(
    (label = 'Floating topic') => {
      const id = newId()
      mutateActive((rm) => ({
        ...rm,
        nodes: { ...rm.nodes, [id]: { ...makeNode(id, label, rm.rootId), floating: true } },
      }))
      return id
    },
    [mutateActive],
  )

  const updateNode = useCallback(
    (id, patch) => {
      mutateActive((rm) => {
        const node = rm.nodes[id]
        if (!node) return rm
        const next = { ...node, ...patch }
        if (patch.status && patch.status !== node.status) {
          if (patch.status === 'done' && !next.completedAt) {
            next.completedAt = new Date().toISOString().slice(0, 10)
          } else if (patch.status !== 'done') {
            next.completedAt = null
          }
        }
        return { ...rm, nodes: { ...rm.nodes, [id]: next } }
      })
    },
    [mutateActive],
  )

  // Spaced-repetition: grade a topic's recall, rescheduling its next review.
  const reviewNode = useCallback(
    (id, grade) => {
      const today = new Date().toISOString().slice(0, 10)
      mutateActive((rm) => {
        const node = rm.nodes[id]
        if (!node) return rm
        return { ...rm, nodes: { ...rm.nodes, [id]: { ...node, review: gradeReview(node.review, grade, today) } } }
      })
    },
    [mutateActive],
  )

  // Add a topic to the review queue (due today, fresh schedule).
  const seedReview = useCallback(
    (id) => {
      const today = new Date().toISOString().slice(0, 10)
      mutateActive((rm) => {
        const node = rm.nodes[id]
        if (!node || node.review) return rm
        return { ...rm, nodes: { ...rm.nodes, [id]: { ...node, review: newReview(today) } } }
      })
    },
    [mutateActive],
  )

  const toggleCollapse = useCallback(
    (id) => {
      mutateActive((rm) => {
        const node = rm.nodes[id]
        if (!node) return rm
        return { ...rm, nodes: { ...rm.nodes, [id]: { ...node, collapsed: !node.collapsed } } }
      })
    },
    [mutateActive],
  )

  // Reparent a node (used by outline indent/outdent and drag-to-reparent).
  // Refuses cycles: a node can't become a descendant of itself.
  const moveNode = useCallback(
    (id, newParentId) => {
      mutateActive((rm) => {
        const node = rm.nodes[id]
        if (!node || id === rm.rootId || !rm.nodes[newParentId] || newParentId === id) return rm
        // Walk up from newParent; if we hit id, it's a cycle.
        let cur = rm.nodes[newParentId]
        while (cur) {
          if (cur.id === id) return rm
          cur = cur.parentId ? rm.nodes[cur.parentId] : null
        }
        return { ...rm, nodes: { ...rm.nodes, [id]: { ...node, parentId: newParentId, floating: false } } }
      })
    },
    [mutateActive],
  )

  // Reorder a node among its siblings by swapping object-insertion order.
  const reorderNode = useCallback(
    (id, dir) => {
      mutateActive((rm) => {
        const node = rm.nodes[id]
        if (!node) return rm
        const entries = Object.entries(rm.nodes)
        const siblings = entries.filter(([, n]) => n.parentId === node.parentId).map(([k]) => k)
        const idx = siblings.indexOf(id)
        const swap = dir < 0 ? idx - 1 : idx + 1
        if (swap < 0 || swap >= siblings.length) return rm
        const a = id
        const b = siblings[swap]
        const nodes = Object.fromEntries(
          entries.map(([k, v]) => (k === a ? [b, rm.nodes[b]] : k === b ? [a, rm.nodes[a]] : [k, v])),
        )
        return { ...rm, nodes }
      })
    },
    [mutateActive],
  )

  // Bulk-edit a set of nodes in one undoable step. fn(node) -> patch | null.
  const bulkMutate = useCallback(
    (ids, fn) => {
      mutateActive((rm) => {
        const nodes = { ...rm.nodes }
        let changed = false
        for (const id of ids) {
          const n = nodes[id]
          if (!n) continue
          const patch = fn(n)
          if (patch) {
            nodes[id] = { ...n, ...patch }
            changed = true
          }
        }
        return changed ? { ...rm, nodes } : rm
      })
    },
    [mutateActive],
  )

  // Delete a set of nodes (and their descendants) in one undoable step.
  const bulkDelete = useCallback(
    (ids) => {
      mutateActive((rm) => {
        const nodes = { ...rm.nodes }
        const toDelete = new Set(ids.filter((id) => id !== rm.rootId))
        let changed = true
        while (changed) {
          changed = false
          for (const n of Object.values(nodes)) {
            if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
              toDelete.add(n.id)
              changed = true
            }
          }
        }
        if (!toDelete.size) return rm
        for (const d of toDelete) delete nodes[d]
        return { ...rm, nodes }
      })
    },
    [mutateActive],
  )

  const deleteNode = useCallback(
    (id) => {
      mutateActive((rm) => {
        if (id === rm.rootId) return rm
        const nodes = { ...rm.nodes }
        const toDelete = new Set([id])
        let changed = true
        while (changed) {
          changed = false
          for (const n of Object.values(nodes)) {
            if (n.parentId && toDelete.has(n.parentId) && !toDelete.has(n.id)) {
              toDelete.add(n.id)
              changed = true
            }
          }
        }
        for (const d of toDelete) delete nodes[d]
        return { ...rm, nodes }
      })
    },
    [mutateActive],
  )

  return {
    status,
    error,
    clearError: () => setError(null),
    roadmaps,
    active,
    activeId: state.activeId,
    setActive,
    createRoadmap,
    addCyberSample,
    importRoadmap,
    renameRoadmap,
    deleteRoadmap,
    addChild,
    addSibling,
    addFloating,
    updateNode,
    toggleCollapse,
    deleteNode,
    bulkMutate,
    bulkDelete,
    moveNode,
    reorderNode,
    reviewNode,
    seedReview,
    undo,
    redo,
    canUndo: !!(state.activeId && (pastRef.current[state.activeId] || []).length),
    canRedo: !!(state.activeId && (futureRef.current[state.activeId] || []).length),
  }
}
