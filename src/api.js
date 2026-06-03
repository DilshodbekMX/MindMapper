const BASE = '/api'

async function req(path, options) {
  const res = await fetch(BASE + path, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`API ${options?.method || 'GET'} ${path} -> ${res.status} ${body}`)
  }
  if (res.status === 204) return null
  return res.json()
}

export const api = {
  list: () => req('/roadmaps'),
  get: (id) => req(`/roadmaps/${id}`),
  create: (rm) => req('/roadmaps', { method: 'POST', body: JSON.stringify(rm) }),
  update: (id, rm) => req(`/roadmaps/${id}`, { method: 'PUT', body: JSON.stringify(rm) }),
  remove: (id) => req(`/roadmaps/${id}`, { method: 'DELETE' }),
}
