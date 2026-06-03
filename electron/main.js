// Electron desktop shell for MindMapper.
// Starts the bundled Express+SQLite server on a free local port, stores the DB
// in the OS user-data dir, and loads the app in a Chromium window.
import { app, BrowserWindow, shell, Menu } from 'electron'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = dirname(fileURLToPath(import.meta.url))
let mainWindow = null

async function boot() {
  // Persist the database in a writable, per-user location.
  process.env.MINDMAPPER_DB = join(app.getPath('userData'), 'mindmapper.db')

  // Import the server only after the DB path env is set.
  const { start } = await import(join(__dirname, '..', 'server', 'index.js'))
  const server = await start(0) // 0 → OS assigns a free port
  const port = server.address().port

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 900,
    minHeight: 600,
    backgroundColor: '#0c1310',
    autoHideMenuBar: true,
    title: 'MindMapper',
    icon: join(__dirname, '..', 'build', 'icon.png'),
    webPreferences: { contextIsolation: true, nodeIntegration: false },
  })

  Menu.setApplicationMenu(null) // app provides its own toolbar UI

  // Open external links (resources, GfG, etc.) in the system browser.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:\/\//.test(url)) shell.openExternal(url)
    return { action: 'deny' }
  })

  mainWindow.loadURL(`http://localhost:${port}`)
  mainWindow.on('closed', () => {
    mainWindow = null
  })
}

app.whenReady().then(boot)

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) boot()
})
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
