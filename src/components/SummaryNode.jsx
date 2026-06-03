// A non-interactive brace + label summarizing a group of topics (XMind summary).
export default function SummaryNode({ data }) {
  const color = data.color || '#3fb27f'
  return (
    <div className="summary-node" style={{ height: data.height, color }}>
      <span className="summary-brace" style={{ borderColor: color }} />
      <span className="summary-label">{data.label}</span>
    </div>
  )
}
