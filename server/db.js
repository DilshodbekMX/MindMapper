import Database from 'better-sqlite3'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DB_PATH = process.env.MINDMAPPER_DB || join(__dirname, '..', 'mindmapper.db')

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')

db.exec(`
  CREATE TABLE IF NOT EXISTS roadmaps (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    data        TEXT NOT NULL,          -- JSON: { rootId, nodes }
    created_at  TEXT NOT NULL,
    updated_at  TEXT NOT NULL
  );
`)

const stmts = {
  all: db.prepare('SELECT * FROM roadmaps ORDER BY updated_at DESC'),
  get: db.prepare('SELECT * FROM roadmaps WHERE id = ?'),
  insert: db.prepare(
    'INSERT INTO roadmaps (id, name, data, created_at, updated_at) VALUES (@id, @name, @data, @created_at, @updated_at)',
  ),
  update: db.prepare('UPDATE roadmaps SET name = @name, data = @data, updated_at = @updated_at WHERE id = @id'),
  remove: db.prepare('DELETE FROM roadmaps WHERE id = ?'),
}

function rowToRoadmap(row) {
  if (!row) return null
  const parsed = JSON.parse(row.data)
  return {
    id: row.id,
    name: row.name,
    rootId: parsed.rootId,
    nodes: parsed.nodes,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

export const store = {
  list() {
    return stmts.all.all().map(rowToRoadmap)
  },
  get(id) {
    return rowToRoadmap(stmts.get.get(id))
  },
  create({ id, name, rootId, nodes }) {
    const now = new Date().toISOString()
    stmts.insert.run({
      id,
      name,
      data: JSON.stringify({ rootId, nodes }),
      created_at: now,
      updated_at: now,
    })
    return this.get(id)
  },
  update(id, { name, rootId, nodes }) {
    const existing = stmts.get.get(id)
    if (!existing) return null
    const now = new Date().toISOString()
    const data = JSON.stringify({
      rootId: rootId ?? JSON.parse(existing.data).rootId,
      nodes: nodes ?? JSON.parse(existing.data).nodes,
    })
    stmts.update.run({ id, name: name ?? existing.name, data, updated_at: now })
    return this.get(id)
  },
  remove(id) {
    return stmts.remove.run(id).changes > 0
  },
}

export default db
