// A curly brace grouping a parent's children (XMind brace map). Non-interactive.
// Geometry (local SVG coords): spine on the right at x = L+D spanning the
// children's height; a center tick to the tip at x = L; a connector from the
// tip back to the parent at x = 0.
export default function BraceNode({ data }) {
  const { H, L, D, tipY, color } = data
  const cy = H / 2
  const spine = L + D
  const path = [
    `M ${spine} 0`,
    `Q ${spine - D} 0 ${spine - D} ${Math.min(8, cy)}`, // top cap curls left
    `L ${spine - D} ${cy - 4}`,
    `Q ${spine - D} ${cy} ${L} ${cy}`, // pinch to the tip
    `Q ${spine - D} ${cy} ${spine - D} ${cy + 4}`,
    `L ${spine - D} ${H - Math.min(8, cy)}`,
    `Q ${spine - D} ${H} ${spine} ${H}`, // bottom cap curls left
  ].join(' ')
  return (
    <svg className="brace-node" width={spine + 2} height={H} style={{ overflow: 'visible' }}>
      <line x1="0" y1={tipY} x2={L} y2={cy} stroke={color} strokeWidth="1.5" />
      <path d={path} fill="none" stroke={color} strokeWidth="1.5" />
    </svg>
  )
}
