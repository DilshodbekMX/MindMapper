# MindMapper — Learning Tracker

An XMind-style mind-map web app to track your learning.
**React + Vite** frontend (React Flow + dagre auto-layout), **Node + Express + SQLite** backend.

## Features

- **Multiple roadmaps** — create any roadmap anytime, load the bundled **Cyber Security
  Roadmap 2026** sample, or **import** one from a **JSON** or **OPML** file.
- **Mind-map canvas** — pan, zoom, minimap, **drag a topic onto another to reparent it**.
- **Undo / redo** — `Ctrl/Cmd+Z` and `Ctrl/Cmd+Shift+Z` (per-roadmap, 50-step history),
  also on the toolbar.
- **Switchable map structures** (XMind-style) — **Mind Map** (balanced two-sided),
  **Logic Right/Left**, **Tree / Org chart** (downward), and **Tree Upward**. Saved per map.
- **Color themes** — Classic, Rainbow, CyberPunk, Candy, Forest, Ocean. Top-level branches
  get their own color, inherited by descendants (edges + accents follow).
- **Tabbed right panel** (`Topic | Style | Map`):
  - **Style** — per-topic shape, fill, border color/width, font family/size,
    **B/I/U/S**, text color, alignment.
  - **Map** — structure gallery, color-theme swatches, background color, global font,
    branch-line width, colored-branch & compact toggles.
- **Views** — **Map**, **Outliner** (keyboard-driven: `Enter` sibling, `Tab`/`Shift+Tab`
  indent/outdent, `Alt+↑/↓` reorder), **Board** (Kanban; drag cards to change status),
  **Review** (spaced repetition), **Gantt** (scheduled topics on a day grid),
  and **Dashboard**.
- **Canvas editing** — with a node selected: `Tab` child, `Enter` sibling, `Delete` delete,
  `F2`/double-click to rename, arrows to navigate. **Shift/Cmd-click** multi-selects for
  bulk status/label/delete. Drag a node onto another to reparent.
- **Global search** — `Ctrl/Cmd+K` command palette across every roadmap.
- **Filters & saved views** — filter the map/board by status, priority, label, or due;
  save named views per roadmap.
- **Learning science** — per-topic **mastery (0–5)** that feeds the progress roll-up, and
  **spaced-repetition review** (SM-2; Again/Hard/Good/Easy) with a due-for-review dashboard
  card and review days counting toward the streak.
- **Summaries** — a labelled brace over a topic's children.
- **Node images** — attach images (stored inline); thumbnails show on the node.
- **`[[wikilinks]]`** in notes — clickable, with a "Linked from" backlinks panel.
- **Undo / redo** everywhere (`Ctrl/Cmd+Z`, `Shift` to redo).
- **Pitch** — a slide presentation that drills branch-by-branch through the map
  (`←`/`→`, themes, `Esc` to exit).
- **Zen mode** — fullscreen focus that hides the chrome and steps through topics.
- **Task scheduling** — per-topic start/due dates + effort estimate (shown as a ⏱ marker),
  surfaced in the Gantt and the dashboard's due/overdue panel.
- **Collapsible branches**, **search** (highlights, dims, zooms to hits, reveals collapsed).
- **Per-topic detail**, on every node:
  - 3-state **status**: Not started → In progress → Done (color-coded),
  - **markers/icons** (⭐🚩❗✅… toggleable), **labels** (tag chips),
  - **priority** (High/Med/Low) and **due date** (overdue chips turn red),
  - **resources** (titled links), **subtasks** (checklist), **Markdown notes** (with preview),
  - **relationships** — labeled dashed arrows linking any two topics,
  - **boundaries** — a labeled group outline around a branch,
  - a **completed-on date** (auto-set when you mark Done).
- **Floating topics** — detached, edge-less topics for loose ideas.
- **Rolled-up progress** — branch nodes show a live % from their leaves; sidebar shows
  each roadmap's overall %.
- **Dashboard** — overall progress, per-roadmap bars, **due soon & overdue**, **day streak**,
  in-progress now, recent completions, and a completions-over-time chart.
- **Export per roadmap** — **JSON**, **OPML**, **Markdown** (nested checklist), **PNG**, **SVG**.
- **Backend + database** — everything is stored server-side in SQLite (`mindmapper.db`).
  Edits auto-save (debounced). No login — it's a single-user personal tracker.

## Run it

Install once:

```bash
npm install
```

**Development** (API on :4000 + Vite dev server on :5173, with hot reload):

```bash
npm run dev:all      # runs server + web together
# open http://localhost:5173
```

Run them separately if you prefer:

```bash
npm run server       # API only, http://localhost:4000
npm run dev          # web only,  http://localhost:5173  (proxies /api to :4000)
```

**Production-style** (build the frontend, then the server serves it on :4000):

```bash
npm run start        # = npm run build && node server/index.js
# open http://localhost:4000
```

## Desktop app (Ubuntu / Linux)

MindMapper can run as a native desktop app via **Electron** (the same tech XMind
uses). It bundles Node, the Express API, SQLite, and the UI into one window; your
data lives in `~/.config/MindMapper/mindmapper.db`.

```bash
npm install
npm run rebuild:electron   # build better-sqlite3 against Electron's runtime (once)
npm run electron           # build the UI and launch the desktop app
```

**Build installers** (output in `release/`):

```bash
npm run dist               # AppImage + .deb
npm run dist:appimage      # just the portable AppImage
npm run dist:deb           # just the .deb
```

Install the result:

```bash
chmod +x release/MindMapper-*.AppImage && ./release/MindMapper-*.AppImage   # portable
sudo apt install ./release/MindMapper_*_amd64.deb                            # system install
```

Notes:
- **Native module / ABI:** `better-sqlite3` is compiled per runtime. `npm run
  rebuild:electron` builds it for Electron; run `npm run rebuild:node` to switch
  back to the plain web server (`npm run server`). `npm run dist` rebuilds it for
  Electron automatically.
- **Custom icon:** drop a 512×512 `build/icon.png`, then add
  `"icon": "build/icon.png"` under `build.linux` in `package.json`.
- **Snap/Flatpak** are also possible by adding `"snap"` / `"flatpak"` to
  `build.linux.target`.

## Architecture

```
electron/
  main.js         desktop shell: starts the server on a free port, opens a window
server/
  index.js        Express REST API (createApp/start); /api/roadmaps GET·POST·PUT·DELETE
  db.js           SQLite via better-sqlite3 (roadmaps stored as JSON docs)
mindmapper.db     your data (one file — back it up by copying it)

src/
  api.js                  fetch wrapper for the API
  store/useStore.js       state, optimistic edits, debounced auto-save; node ops
                          (add/move/reorder/floating/delete)
  layout.js               multi-structure dagre layout, progress roll-up, branch
                          colors, boundaries, relationships, collapse/search
  themes.js               color themes + structure definitions
  markdown.js             tiny dependency-free Markdown → HTML for notes
  data/seed.js            roadmap builder, normalizer, Cyber Security seed
  export.js               JSON / OPML / Markdown export + JSON/OPML import
  components/
    Sidebar.jsx           roadmaps list, create/rename/delete, import, view toggle
    MindMap.jsx           React Flow canvas, drag-reparent, search-zoom, PNG/SVG export
    TopicNode.jsx         custom node (status, markers, labels, progress, badges, caret)
    BoundaryNode.jsx      group-outline node drawn behind a branch
    Outline.jsx           keyboard-driven outliner view
    DetailPanel.jsx       edit status / markers / labels / priority / due / resources /
                          subtasks / relationships / boundary / Markdown notes
    Dashboard.jsx         stats, due/overdue, streak, activity
  styles.css              dark theme
```

### API

| Method | Path                | Body / result                          |
|--------|---------------------|----------------------------------------|
| GET    | `/api/roadmaps`     | list all roadmaps                      |
| GET    | `/api/roadmaps/:id` | one roadmap                            |
| POST   | `/api/roadmaps`     | `{ id, name, rootId, nodes }` → create |
| PUT    | `/api/roadmaps/:id` | `{ name?, rootId?, nodes? }` → update  |
| DELETE | `/api/roadmaps/:id` | delete                                 |

## Backup & portability

- **Copy `mindmapper.db`** for a full backup of everything.
- **Export → JSON** on a roadmap, then **Import JSON** to restore or move it elsewhere.
- Set a custom DB location with `MINDMAPPER_DB=/path/to/file.db`.

## Notes

- Single-user, no auth — intended to run locally. If you ever host it publicly,
  add authentication first.
# MindMapper
