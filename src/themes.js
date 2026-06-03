// Branch-coloring themes, à la XMind (Rainbow, CyberPunk, …).
// `palette` colors are assigned to top-level branches in order and inherited by
// their descendants. `classic` keeps the original uniform-green look.

// group: 'classic' | 'colorful' (XMind's two tabs). dark: dark vs light canvas.
// bg: canvas background. Branch palette colors tint the topics + edges.
export const THEMES = {
  // ---- Classic ----
  classic: { label: 'Classic', group: 'classic', dark: true, bg: '#0c1310', palette: ['#3fb27f'] },
  graphite: { label: 'Graphite', group: 'classic', dark: true, bg: '#15171a', palette: ['#9aa6a0', '#7d8a83', '#606b65', '#b3bdb7', '#525a55'] },
  blueprint: { label: 'Blueprint', group: 'classic', dark: true, bg: '#0e1726', palette: ['#5b8def', '#3a6ea5', '#274690', '#6fa8dc', '#1f3a5f'] },
  paper: { label: 'Paper', group: 'classic', dark: false, bg: '#f7f7f4', palette: ['#5f6b66', '#7d8a83', '#9aa6a0', '#606b65', '#444c48'] },

  // ---- Colorful (XMind-style named palettes) ----
  dawn: { label: 'Dawn', group: 'colorful', dark: false, bg: '#fff7f3', palette: ['#ff7a8a', '#ffb38a', '#8fd3c7', '#7ec8e3', '#b9a7e6', '#f7c873'] },
  rainbow: { label: 'Rainbow', group: 'colorful', dark: false, bg: '#ffffff', palette: ['#e84d4d', '#f2a93b', '#3fb950', '#3aa0ff', '#9b59ff', '#19c3c3', '#d19a66'] },
  energy: { label: 'Energy', group: 'colorful', dark: true, bg: '#1a1207', palette: ['#f2b705', '#f25c05', '#d92b04', '#f29f05', '#4aa3df'] },
  dancing: { label: 'Dancing', group: 'colorful', dark: false, bg: '#fbf7ef', palette: ['#2f6df6', '#ef4b4b', '#caa64a', '#f291b5', '#8c1d2b'] },
  code: { label: 'Code', group: 'colorful', dark: true, bg: '#0d1117', palette: ['#86c98e', '#79b8ff', '#b392f0', '#e2c08d', '#79d3c4'] },
  kimono: { label: 'Kimono', group: 'colorful', dark: false, bg: '#fbf3ee', palette: ['#ef6f53', '#f2a154', '#315f8c', '#1f3a5f', '#c08552'] },
  islands: { label: 'Islands', group: 'colorful', dark: false, bg: '#f6f4ec', palette: ['#8a9a5b', '#b08948', '#4f7c6e', '#7a8b3a', '#6b705c'] },
  roses: { label: 'Roses', group: 'colorful', dark: false, bg: '#fff5f7', palette: ['#f17a96', '#e0567a', '#b83b6f', '#d98a9a', '#7a2e4a'] },
  mint: { label: 'Mint', group: 'colorful', dark: false, bg: '#f0fbf7', palette: ['#46c4a8', '#2f9e92', '#5bbfb5', '#7fae3a', '#3a8f86'] },
  greentea: { label: 'Green Tea', group: 'colorful', dark: false, bg: '#f7faf0', palette: ['#6fa14e', '#3f6b33', '#7d8b3a', '#a3c265', '#557a2e'] },
  cyberpunk: { label: 'CyberPunk', group: 'colorful', dark: true, bg: '#0a0612', palette: ['#ff2e97', '#00e5ff', '#b14aed', '#ffe600', '#23d18b', '#ff7a45'] },
  candy: { label: 'Candy', group: 'colorful', dark: false, bg: '#fff0f5', palette: ['#ff8aa0', '#ff9f7a', '#f2b705', '#5ec8a8', '#7aa6f0', '#c78ae0'] },
  ocean: { label: 'Ocean', group: 'colorful', dark: true, bg: '#06121a', palette: ['#48cae4', '#0096c7', '#5e60ce', '#64dfdf', '#56cf7a', '#4ea8de'] },
}

export const THEME_KEYS = Object.keys(THEMES)
export const THEME_GROUPS = ['colorful', 'classic']

// Available map structures (XMind-style).
export const STRUCTURES = [
  { key: 'mindmap', label: 'Mind Map (balanced)' },
  { key: 'right', label: 'Logic — Right' },
  { key: 'left', label: 'Logic — Left' },
  { key: 'down', label: 'Org Chart (down)' },
  { key: 'up', label: 'Tree — Upward' },
  { key: 'timeline', label: 'Timeline' },
  { key: 'fishbone', label: 'Fishbone' },
  { key: 'brace', label: 'Brace Map' },
  { key: 'matrix', label: 'Matrix' },
]
