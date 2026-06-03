import express from 'express'
import cors from 'cors'
import { fileURLToPath, pathToFileURL } from 'node:url'
import { dirname, join } from 'node:path'
import { existsSync } from 'node:fs'
import { store } from './db.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const PORT = process.env.PORT || 4000

export function createApp() {
  const app = express()
  app.use(cors())
  app.use(express.json({ limit: '25mb' })) // generous: nodes can embed image data-URLs

  const api = express.Router()

  api.get('/health', (_req, res) => res.json({ ok: true }))

  api.get('/roadmaps', (_req, res) => {
    res.json(store.list())
  })

  api.get('/roadmaps/:id', (req, res) => {
    const rm = store.get(req.params.id)
    if (!rm) return res.status(404).json({ error: 'not found' })
    res.json(rm)
  })

  api.post('/roadmaps', (req, res) => {
    const { id, name, rootId, nodes } = req.body || {}
    if (!id || !name || !rootId || !nodes) {
      return res.status(400).json({ error: 'id, name, rootId and nodes are required' })
    }
    if (store.get(id)) return res.status(409).json({ error: 'id already exists' })
    res.status(201).json(store.create({ id, name, rootId, nodes }))
  })

  api.put('/roadmaps/:id', (req, res) => {
    const { name, rootId, nodes } = req.body || {}
    const updated = store.update(req.params.id, { name, rootId, nodes })
    if (!updated) return res.status(404).json({ error: 'not found' })
    res.json(updated)
  })

  api.delete('/roadmaps/:id', (req, res) => {
    const ok = store.remove(req.params.id)
    if (!ok) return res.status(404).json({ error: 'not found' })
    res.status(204).end()
  })

  app.use('/api', api)

  // Serve the built frontend in production (dist/), if present.
  const dist = join(__dirname, '..', 'dist')
  if (existsSync(dist)) {
    app.use(express.static(dist))
    app.get('*', (_req, res) => res.sendFile(join(dist, 'index.html')))
  }
  return app
}

// Start listening; resolves with the http.Server (port 0 picks a free port).
export function start(port = PORT) {
  return new Promise((resolve) => {
    const server = createApp().listen(port, () => {
      const actual = server.address().port
      console.log(`MindMapper API listening on http://localhost:${actual}`)
      resolve(server)
    })
  })
}

// Run the server directly (npm run server / node server/index.js).
const isDirectRun = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href
if (isDirectRun) start()
