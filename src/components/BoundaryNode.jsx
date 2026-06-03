// A non-interactive group outline drawn behind a topic and its descendants.
export default function BoundaryNode({ data }) {
  const color = data.color || '#3fb27f'
  return (
    <div
      className="boundary-node"
      style={{ borderColor: color, background: `${color}14` }}
    >
      {data.label && (
        <span className="boundary-label" style={{ color, borderColor: color }}>
          {data.label}
        </span>
      )}
    </div>
  )
}
