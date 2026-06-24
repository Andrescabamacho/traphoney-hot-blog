'use client'

/**
 * Graficas en SVG puro (sin dependencias externas).
 * Responsive: se escalan al ancho del contenedor via viewBox.
 * Diseño limpio en blanco, pensado para un panel de contabilidad.
 */

type Point = { label: string; value: number }

const fmtEur = (n: number) =>
  new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(
    n || 0
  )

function niceLabels(data: Point[], max = 8) {
  const step = Math.max(1, Math.ceil(data.length / max))
  return data.map((d, i) => (i % step === 0 || i === data.length - 1 ? d.label : ''))
}

export function LineChart({
  data,
  height = 240,
  color = '#10b981',
  format = fmtEur,
}: {
  data: Point[]
  height?: number
  color?: string
  format?: (n: number) => string
}) {
  const w = 820
  const h = height
  const padL = 64
  const padR = 16
  const padT = 16
  const padB = 36
  const vals = data.map((d) => d.value)
  const min = Math.min(0, ...vals)
  const max = Math.max(...vals, 1)
  const span = max - min || 1
  const x = (i: number) => padL + (i * (w - padL - padR)) / Math.max(1, data.length - 1)
  const y = (v: number) => h - padB - ((v - min) / span) * (h - padT - padB)
  const line = data.map((d, i) => `${x(i)},${y(d.value)}`).join(' ')
  const area = `${padL},${y(min)} ${line} ${x(data.length - 1)},${y(min)}`
  const labels = niceLabels(data)
  const gridVals = [min, min + span * 0.25, min + span * 0.5, min + span * 0.75, max]

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      {gridVals.map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={w - padR} y1={y(g)} y2={y(g)} stroke="#eef2f7" strokeWidth={1} />
          <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#9aa5b1">
            {format(g)}
          </text>
        </g>
      ))}
      <polygon points={area} fill={color} opacity={0.08} />
      <polyline points={line} fill="none" stroke={color} strokeWidth={2.5} strokeLinejoin="round" />
      {data.map((d, i) => (
        <circle key={i} cx={x(i)} cy={y(d.value)} r={2.5} fill={color} />
      ))}
      {labels.map((l, i) =>
        l ? (
          <text key={i} x={x(i)} y={h - 12} textAnchor="middle" fontSize="11" fill="#9aa5b1">
            {l}
          </text>
        ) : null
      )}
    </svg>
  )
}

export function BarChart({
  data,
  height = 240,
  positiveColor = '#10b981',
  negativeColor = '#ef4444',
  format = fmtEur,
}: {
  data: Point[]
  height?: number
  positiveColor?: string
  negativeColor?: string
  format?: (n: number) => string
}) {
  const w = 820
  const h = height
  const padL = 64
  const padR = 16
  const padT = 16
  const padB = 36
  const vals = data.map((d) => d.value)
  const min = Math.min(0, ...vals)
  const max = Math.max(0, ...vals, 1)
  const span = max - min || 1
  const y = (v: number) => h - padB - ((v - min) / span) * (h - padT - padB)
  const zero = y(0)
  const bw = (w - padL - padR) / data.length
  const labels = niceLabels(data)

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" role="img">
      {[min, min + span * 0.5, max].map((g, i) => (
        <g key={i}>
          <line x1={padL} x2={w - padR} y1={y(g)} y2={y(g)} stroke="#eef2f7" strokeWidth={1} />
          <text x={padL - 8} y={y(g) + 4} textAnchor="end" fontSize="11" fill="#9aa5b1">
            {format(g)}
          </text>
        </g>
      ))}
      <line x1={padL} x2={w - padR} y1={zero} y2={zero} stroke="#cbd5e1" strokeWidth={1} />
      {data.map((d, i) => {
        const vy = y(d.value)
        const top = Math.min(vy, zero)
        const barH = Math.max(1, Math.abs(vy - zero))
        return (
          <rect
            key={i}
            x={padL + i * bw + bw * 0.15}
            y={top}
            width={bw * 0.7}
            height={barH}
            rx={2}
            fill={d.value >= 0 ? positiveColor : negativeColor}
          />
        )
      })}
      {labels.map((l, i) =>
        l ? (
          <text key={i} x={padL + i * bw + bw / 2} y={h - 12} textAnchor="middle" fontSize="11" fill="#9aa5b1">
            {l}
          </text>
        ) : null
      )}
    </svg>
  )
}

const DONUT_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#8b5cf6', '#ec4899', '#14b8a6', '#ef4444', '#64748b']

export function Donut({
  data,
  size = 220,
}: {
  data: { label: string; value: number }[]
  size?: number
}) {
  const total = data.reduce((s, d) => s + Math.max(0, d.value), 0) || 1
  const r = size / 2
  const inner = r * 0.62
  let acc = 0
  const arcs = data.map((d, i) => {
    const frac = Math.max(0, d.value) / total
    const a0 = acc * 2 * Math.PI - Math.PI / 2
    acc += frac
    const a1 = acc * 2 * Math.PI - Math.PI / 2
    const large = frac > 0.5 ? 1 : 0
    const x0 = r + r * Math.cos(a0)
    const y0 = r + r * Math.sin(a0)
    const x1 = r + r * Math.cos(a1)
    const y1 = r + r * Math.sin(a1)
    return {
      d: `M ${r} ${r} L ${x0} ${y0} A ${r} ${r} 0 ${large} 1 ${x1} ${y1} Z`,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      label: d.label,
      value: d.value,
      pct: frac,
    }
  })
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center">
      <svg viewBox={`0 0 ${size} ${size}`} width={size} height={size} className="shrink-0">
        {arcs.map((a, i) => (
          <path key={i} d={a.d} fill={a.color} />
        ))}
        <circle cx={r} cy={r} r={inner} fill="white" />
      </svg>
      <ul className="w-full space-y-1.5 text-sm">
        {arcs.map((a, i) => (
          <li key={i} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-gray-600">
              <span className="inline-block h-3 w-3 rounded-sm" style={{ background: a.color }} />
              {a.label}
            </span>
            <span className="tabular-nums font-medium text-gray-900">
              {fmtEur(a.value)} <span className="text-gray-400">({Math.round(a.pct * 100)}%)</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
