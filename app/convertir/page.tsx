'use client'

import { useEffect, useMemo, useState } from 'react'

// Tasa de respaldo por si no hay internet (aprox. 1 EUR ≈ 4.97 RON)
const FALLBACK_RON_PER_EUR = 4.97

export default function Page() {
  const [lei, setLei] = useState('')
  const [ronPerEur, setRonPerEur] = useState(FALLBACK_RON_PER_EUR)
  const [updatedAt, setUpdatedAt] = useState<string | null>(null)
  const [live, setLive] = useState(false)

  // Intenta traer la tasa real al cargar. Si falla, se queda con la de respaldo.
  useEffect(() => {
    let cancelled = false
    async function load() {
      try {
        const res = await fetch('https://open.er-api.com/v6/latest/EUR')
        const data = await res.json()
        const rate = data?.rates?.RON
        if (!cancelled && typeof rate === 'number' && rate > 0) {
          setRonPerEur(rate)
          setLive(true)
          setUpdatedAt(
            new Date().toLocaleString('es-ES', {
              dateStyle: 'short',
              timeStyle: 'short',
            })
          )
        }
      } catch {
        // Sin conexión: usamos la tasa de respaldo, sin molestar al usuario.
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  const euros = useMemo(() => {
    const value = parseFloat(lei.replace(',', '.'))
    if (!isFinite(value)) return null
    return value / ronPerEur
  }, [lei, ronPerEur])

  return (
    <div className="mx-auto flex max-w-md flex-col items-center px-4 py-10">
      <h1 className="mb-2 text-center text-3xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
        Lei → Euro
      </h1>
      <p className="mb-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Pon los lei rumanos (RON) y te digo cuánto es en euros. Ya está.
      </p>

      <div className="w-full rounded-2xl border border-gray-200 bg-white p-6 shadow-sm dark:border-gray-700 dark:bg-gray-900">
        <label htmlFor="lei" className="mb-2 block text-sm font-medium text-gray-600 dark:text-gray-300">
          Lei rumanos (RON)
        </label>
        <div className="relative">
          <input
            id="lei"
            type="text"
            inputMode="decimal"
            autoFocus
            placeholder="0"
            value={lei}
            onChange={(e) => setLei(e.target.value.replace(/[^0-9.,]/g, ''))}
            className="w-full rounded-xl border border-gray-300 bg-gray-50 px-4 py-4 text-3xl font-bold text-gray-900 outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-500 dark:border-gray-600 dark:bg-gray-800 dark:text-gray-100"
          />
          <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-lg font-semibold text-gray-400">
            RON
          </span>
        </div>

        <div className="my-6 flex items-center justify-center">
          <span className="text-2xl text-gray-300 dark:text-gray-600">↓</span>
        </div>

        <div className="rounded-xl bg-primary-50 px-4 py-5 text-center dark:bg-primary-900/20">
          <div className="text-4xl font-extrabold text-primary-600 dark:text-primary-400">
            {euros === null
              ? '—'
              : euros.toLocaleString('es-ES', {
                  style: 'currency',
                  currency: 'EUR',
                  maximumFractionDigits: 2,
                })}
          </div>
          <div className="mt-1 text-sm text-gray-500 dark:text-gray-400">euros</div>
        </div>
      </div>

      <p className="mt-6 text-center text-xs text-gray-400">
        1 € = {ronPerEur.toFixed(4)} RON
        {live ? (
          <>
            {' '}
            · tasa en vivo{updatedAt ? ` (${updatedAt})` : ''}
          </>
        ) : (
          <> · tasa aproximada</>
        )}
      </p>
    </div>
  )
}
