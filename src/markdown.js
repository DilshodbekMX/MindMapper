// Tiny, dependency-free Markdown → HTML renderer for topic notes.
// Supports: # headings, **bold**, *italic*/_italic_, `code`, [text](url),
// - / * bullet lists, 1. ordered lists, --- rules, and paragraphs.
// Input is HTML-escaped first, so it is safe to inject the result.

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

function inline(text) {
  let t = esc(text)
  // [[wikilink]] → clickable span (resolved to a node by the host via delegation)
  t = t.replace(/\[\[([^\]]+)\]\]/g, '<span class="wikilink" data-wikilink="$1">$1</span>')
  t = t.replace(/`([^`]+)`/g, '<code>$1</code>')
  t = t.replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g, '<a href="$2" target="_blank" rel="noreferrer">$1</a>')
  t = t.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
  t = t.replace(/(^|[^*])\*([^*]+)\*/g, '$1<em>$2</em>')
  t = t.replace(/(^|[^_])_([^_]+)_/g, '$1<em>$2</em>')
  return t
}

export function renderMarkdown(src) {
  if (!src) return ''
  const lines = src.split(/\r?\n/)
  const out = []
  let list = null // 'ul' | 'ol' | null
  let para = []

  const flushPara = () => {
    if (para.length) {
      out.push(`<p>${para.map(inline).join('<br>')}</p>`)
      para = []
    }
  }
  const flushList = () => {
    if (list) {
      out.push(`</${list}>`)
      list = null
    }
  }

  for (const raw of lines) {
    const line = raw.trimEnd()
    if (!line.trim()) {
      flushPara()
      flushList()
      continue
    }
    const h = line.match(/^(#{1,4})\s+(.*)$/)
    const ul = line.match(/^\s*[-*]\s+(.*)$/)
    const ol = line.match(/^\s*\d+\.\s+(.*)$/)
    if (/^\s*---+\s*$/.test(line)) {
      flushPara()
      flushList()
      out.push('<hr>')
    } else if (h) {
      flushPara()
      flushList()
      out.push(`<h${h[1].length}>${inline(h[2])}</h${h[1].length}>`)
    } else if (ul) {
      flushPara()
      if (list !== 'ul') {
        flushList()
        out.push('<ul>')
        list = 'ul'
      }
      out.push(`<li>${inline(ul[1])}</li>`)
    } else if (ol) {
      flushPara()
      if (list !== 'ol') {
        flushList()
        out.push('<ol>')
        list = 'ol'
      }
      out.push(`<li>${inline(ol[1])}</li>`)
    } else {
      flushList()
      para.push(line)
    }
  }
  flushPara()
  flushList()
  return out.join('\n')
}
