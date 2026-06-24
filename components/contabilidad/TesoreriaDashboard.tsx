'use client'

import Link from '@/components/Link'
import tes from '@/data/contabilidad/tesoreria.json'
import { BarChart, Donut, LineChart } from '@/components/charts/Charts'
import { Kpi, Panel, eur, num } from '@/components/contabilidad/ui'

type Week = (typeof tes)['semanas'][number]

function weekLabel(iso: string) {
  try {
    return new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: 'short' }).format(
      new Date(iso)
    )
  } catch {
    return iso
  }
}

export default function TesoreriaDashboard() {
  const semanas = tes.semanas as Week[]
  const last = semanas[semanas.length - 1]
  const variacion = last?.variacion ?? null

  const composicion = [
    { label: 'BBVA', value: last.bbva },
    { label: 'CaixaBank', value: last.caixa },
    { label: 'Stock', value: last.stock },
    { label: 'Dropea', value: last.dropea },
    { label: 'Cuentas Agencia', value: last.cuentasAgencia },
    { label: 'Pasarela (MONEI)', value: last.pasarela },
    { label: 'PayPal', value: last.paypal },
  ]

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-gray-100">
            Tesorería
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Cuánto dinero hay en caja cada viernes y si ganamos o perdemos respecto a la semana
            anterior.
          </p>
        </div>
        <Link
          href="/contabilidad"
          className="self-start rounded-lg bg-gray-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900"
        >
          {'← Ver P&L mensual'}
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Kpi
          label="Tesorería neta"
          value={eur(last.tesoreriaNeta)}
          accent="green"
          sub={weekLabel(last.fecha)}
        />
        <Kpi
          label="Variación última semana"
          value={eur(variacion)}
          accent={variacion != null && variacion >= 0 ? 'green' : 'red'}
        />
        <Kpi label="Total activos" value={eur(last.totalActivos)} />
        <Kpi
          label="Total pasivos"
          value={eur(last.totalPasivos)}
          accent={last.totalPasivos > 0 ? 'red' : 'neutral'}
        />
      </div>

      {/* Tabla semanal (primero los numeros) */}
      <Panel title="Detalle semanal">
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm whitespace-nowrap">
            <thead className="text-xs text-gray-400 uppercase">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-2 py-2 text-left">Viernes</th>
                <th className="px-2 py-2">Dropea</th>
                <th className="px-2 py-2">Stock</th>
                <th className="px-2 py-2">BBVA</th>
                <th className="px-2 py-2">Caixa</th>
                <th className="px-2 py-2">Otros</th>
                <th className="px-2 py-2">Activos</th>
                <th className="px-2 py-2">Pasivos</th>
                <th className="px-2 py-2">Tesorería neta</th>
                <th className="px-2 py-2">Variación</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {semanas.map((s) => {
                const otros = s.cuentasAgencia + s.pasarela + s.paypal
                return (
                  <tr key={s.fecha} className="border-b border-gray-50 dark:border-gray-800/50">
                    <td className="px-2 py-1.5 text-left font-medium text-gray-700 dark:text-gray-300">
                      {weekLabel(s.fecha)}
                    </td>
                    <td className="px-2 py-1.5">{eur(s.dropea)}</td>
                    <td className="px-2 py-1.5">{eur(s.stock)}</td>
                    <td className="px-2 py-1.5">{eur(s.bbva)}</td>
                    <td className="px-2 py-1.5">{eur(s.caixa)}</td>
                    <td className="px-2 py-1.5 text-gray-400">{eur(otros)}</td>
                    <td className="px-2 py-1.5">{eur(s.totalActivos)}</td>
                    <td className="px-2 py-1.5 text-red-500">{eur(s.totalPasivos)}</td>
                    <td className="px-2 py-1.5 font-semibold">{eur(s.tesoreriaNeta)}</td>
                    <td
                      className={`px-2 py-1.5 font-semibold ${
                        s.variacion == null
                          ? 'text-gray-300'
                          : s.variacion >= 0
                            ? 'text-emerald-600'
                            : 'text-red-500'
                      }`}
                    >
                      {s.variacion == null ? '—' : eur(s.variacion)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-xs text-gray-400">
          Inputs a mano (saldos de banco, Dropea, stock, COD, IVA, deudas).{' '}
          {num(tes.semanas.length)} semanas registradas.
        </p>
      </Panel>

      {/* Graficas (despues de los numeros) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Evolución de la tesorería neta">
          <LineChart
            data={semanas.map((s) => ({ label: weekLabel(s.fecha), value: s.tesoreriaNeta }))}
          />
        </Panel>
        <Panel title="Variación semana a semana">
          <BarChart
            data={semanas.map((s) => ({ label: weekLabel(s.fecha), value: s.variacion ?? 0 }))}
          />
        </Panel>
      </div>

      <Panel title={`Composición de activos · ${weekLabel(last.fecha)}`}>
        <Donut data={composicion} />
      </Panel>
    </div>
  )
}
