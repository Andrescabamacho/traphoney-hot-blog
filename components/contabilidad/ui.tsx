'use client'

import { ReactNode } from 'react'

export const eur = (n: number | null | undefined, dec = 0) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-ES', {
        style: 'currency',
        currency: 'EUR',
        maximumFractionDigits: dec,
      }).format(n)

export const pct = (n: number | null | undefined) =>
  n == null
    ? '—'
    : new Intl.NumberFormat('es-ES', { style: 'percent', maximumFractionDigits: 1 }).format(n)

export const num = (n: number | null | undefined) =>
  n == null ? '—' : new Intl.NumberFormat('es-ES').format(n)

export function dayLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(
      new Date(iso)
    )
  } catch {
    return iso
  }
}

/** Tarjeta de KPI con valor grande y tendencia opcional. */
export function Kpi({
  label,
  value,
  sub,
  trend,
  accent,
}: {
  label: string
  value: string
  sub?: string
  trend?: number | null
  accent?: 'green' | 'red' | 'neutral'
}) {
  const trendColor = trend == null ? '' : trend >= 0 ? 'text-emerald-600' : 'text-red-500'
  const valueColor =
    accent === 'green'
      ? 'text-emerald-600'
      : accent === 'red'
        ? 'text-red-500'
        : 'text-gray-900 dark:text-gray-100'
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <p className="text-xs font-medium tracking-wide text-gray-400 uppercase">{label}</p>
      <p className={`mt-2 text-2xl font-bold tabular-nums ${valueColor}`}>{value}</p>
      <div className="mt-1 flex items-center gap-2 text-sm">
        {sub && <span className="text-gray-400">{sub}</span>}
        {trend != null && (
          <span className={`font-medium ${trendColor}`}>
            {trend >= 0 ? '▲' : '▼'} {pct(Math.abs(trend))}
          </span>
        )}
      </div>
    </div>
  )
}

export function Panel({
  title,
  children,
  right,
}: {
  title: string
  children: ReactNode
  right?: ReactNode
}) {
  return (
    <section className="rounded-2xl border border-gray-100 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-gray-900">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-base font-semibold text-gray-900 dark:text-gray-100">{title}</h2>
        {right}
      </div>
      {children}
    </section>
  )
}
