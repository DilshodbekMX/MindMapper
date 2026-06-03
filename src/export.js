function download(filename, text, mime) {
  const blob = new Blob([text], { type: mime })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

const safeName = (name) => (name || 'roadmap').replace(/[^a-z0-9]+/gi, '-').replace(/^-+|-+$/g, '').toLowerCase()

export function exportJson(roadmap) {
  const payload = { id: roadmap.id, name: roadmap.name, rootId: roadmap.rootId, nodes: roadmap.nodes }
  download(`${safeName(roadmap.name)}.json`, JSON.stringify(payload, null, 2), 'application/json')
}

const STATUS_MARK = { done: '[x]', doing: '[~]', todo: '[ ]' }

export function exportMarkdown(roadmap) {
  const childrenOf = {}
  for (const n of Object.values(roadmap.nodes)) {
    if (n.parentId) (childrenOf[n.parentId] ||= []).push(n.id)
  }
  const lines = [`# ${roadmap.name}`, '']

  function walk(id, depth) {
    const n = roadmap.nodes[id]
    if (!n) return
    const indent = '  '.repeat(Math.max(depth - 1, 0))
    if (depth === 0) {
      // root handled as title; descend
    } else {
      const date = n.completedAt ? ` _(done ${n.completedAt})_` : ''
      const due = n.dueDate && n.status !== 'done' ? ` 📅 ${n.dueDate}` : ''
      const prio = n.priority ? ` ❗${n.priority}` : ''
      lines.push(`${indent}- ${STATUS_MARK[n.status] || '[ ]'} ${n.label}${prio}${due}${date}`)
      for (const r of n.resources || []) lines.push(`${indent}  - 🔗 [${r.title || r.url}](${r.url})`)
      for (const s of n.subtasks || []) lines.push(`${indent}  - ${s.done ? '[x]' : '[ ]'} ${s.text}`)
      if (n.notes) lines.push(`${indent}  - _${n.notes.replace(/\n/g, ' ')}_`)
    }
    for (const k of childrenOf[id] || []) walk(k, depth + 1)
  }
  walk(roadmap.rootId, 0)
  download(`${safeName(roadmap.name)}.md`, lines.join('\n'), 'text/markdown')
}

// ---- OPML ----

const xmlEsc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export function exportOpml(roadmap) {
  const childrenOf = {}
  for (const n of Object.values(roadmap.nodes)) {
    if (n.parentId) (childrenOf[n.parentId] ||= []).push(n.id)
  }
  const walk = (id, depth) => {
    const n = roadmap.nodes[id]
    if (!n) return ''
    const kids = childrenOf[id] || []
    const indent = '  '.repeat(depth)
    const attrs = [`text="${xmlEsc(n.label)}"`, `_status="${n.status}"`]
    if (n.notes) attrs.push(`_note="${xmlEsc(n.notes)}"`)
    if (n.dueDate) attrs.push(`_due="${n.dueDate}"`)
    if (kids.length === 0) return `${indent}<outline ${attrs.join(' ')}/>\n`
    return (
      `${indent}<outline ${attrs.join(' ')}>\n` +
      kids.map((k) => walk(k, depth + 1)).join('') +
      `${indent}</outline>\n`
    )
  }
  const body = walk(roadmap.rootId, 3)
  const xml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<opml version="2.0">\n  <head><title>${xmlEsc(roadmap.name)}</title></head>\n  <body>\n` +
    body +
    `  </body>\n</opml>\n`
  download(`${safeName(roadmap.name)}.opml`, xml, 'text/x-opml')
}

let _oid = 0
const oid = () =>
  typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `o_${Date.now()}_${++_oid}`

function parseOpml(text) {
  const doc = new DOMParser().parseFromString(text, 'application/xml')
  if (doc.querySelector('parsererror')) throw new Error('Malformed OPML/XML.')
  const body = doc.querySelector('body')
  const top = body && body.querySelector(':scope > outline')
  if (!top) throw new Error('No outline found in OPML.')
  const title = doc.querySelector('head > title')?.textContent?.trim()
  const nodes = {}
  const build = (el, parentId) => {
    const id = oid()
    nodes[id] = {
      id,
      label: el.getAttribute('text') || el.getAttribute('title') || 'Untitled',
      parentId,
      status: el.getAttribute('_status') || 'todo',
      notes: el.getAttribute('_note') || '',
      dueDate: el.getAttribute('_due') || null,
    }
    for (const child of el.querySelectorAll(':scope > outline')) build(child, id)
    return id
  }
  const rootId = build(top, null)
  return { name: title || nodes[rootId].label, rootId, nodes }
}

// Accepts a JSON or OPML file and returns an (un-normalized) roadmap object.
export async function readImportFile(file) {
  const text = await file.text()
  const trimmed = text.trimStart()
  if (trimmed.startsWith('<')) return parseOpml(text)
  const data = JSON.parse(text)
  if (!data.nodes || !data.rootId) throw new Error('Not a valid roadmap file (missing nodes/rootId).')
  return data
}

// Back-compat alias.
export const readJsonFile = readImportFile
