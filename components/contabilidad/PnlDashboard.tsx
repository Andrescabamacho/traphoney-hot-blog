'use client'

import { useState } from 'react'
import Link from '@/components/Link'
import enero from '@/data/contabilidad/pnl-enero.json'
import febrero from '@/data/contabilidad/pnl-febrero.json'
import marzo from '@/data/contabilidad/pnl-marzo.json'
import { BarChart, LineChart } from '@/components/charts/Charts'
import { Kpi, Panel, eur, pct, num, dayLabel } from '@/components/contabilidad/ui'

const MONTHS = [
  { key: 'enero', nombre: 'Enero', data: enero },
  { key: 'febrero', nombre: 'Febrero', data: febrero },
  { key: 'marzo', nombre: 'Marzo', data: marzo },
]

type Day = (typeof enero)['dias'][number]

export default function PnlDashboard() {
  const [monthKey, setMonthKey] = useState<string>('marzo')
  const month = MONTHS.find((m) => m.key === monthKey) ?? MONTHS[0]
  const dias = month.data.dias as Day[]
  const total = month.data.total as Day

  const facturacion = total?.totalFacturacion ?? 0
  const profit = total?.profit ?? 0
  const margen = facturacion ? profit / facturacion : null
  const adsTotal = (total?.googleAds ?? 0) + (total?.metaAds ?? 0) + (total?.tiktokAds ?? 0)
  const roas = adsTotal ? facturacion / adsTotal : null
  const pedidos = total?.pedidos ?? 0
  const entregados = total?.entregados ?? 0
  const pctEnt = pedidos ? entregados / pedidos : null

  return (
    <div className="space-y-6">
      {/* Cabecera + selector de mes */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl dark:text-gray-100">
            {'Contabilidad · P&L'}
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Cuenta de resultados día a día. ¿Estamos ganando dinero neto de verdad?
          </p>
        </div>
        <div className="flex gap-1 rounded-xl border border-gray-200 bg-white p-1 dark:border-gray-700 dark:bg-gray-900">
          {MONTHS.map((m) => (
            <button
              key={m.key}
              type="button"
              onClick={() => setMonthKey(m.key)}
              className={`rounded-lg px-4 py-1.5 text-sm font-medium transition ${
                m.key === monthKey
                  ? 'bg-emerald-500 text-white'
                  : 'text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              {m.nombre}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-wrap gap-2 text-sm">
        <Link
          href="/contabilidad/tesoreria"
          className="rounded-lg bg-gray-900 px-3 py-1.5 font-medium text-white hover:bg-gray-700 dark:bg-gray-100 dark:text-gray-900"
        >
          Ver Tesorería →
        </Link>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        <Kpi label="Facturación" value={eur(facturacion)} sub={`${month.nombre}`} />
        <Kpi
          label="Profit neto"
          value={eur(profit)}
          accent={profit >= 0 ? 'green' : 'red'}
          sub="al bolsillo"
        />
        <Kpi label="Margen" value={pct(margen)} />
        <Kpi label="ROAS" value={roas ? roas.toFixed(2) + 'x' : '—'} sub={`Ads ${eur(adsTotal)}`} />
        <Kpi label="Pedidos" value={num(pedidos)} />
        <Kpi label="% Entrega" value={pct(pctEnt)} sub={`${num(entregados)} entregados`} />
      </div>

      {/* Tabla dia a dia (primero los numeros) */}
      <Panel title={`Detalle día a día · ${month.nombre}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-right text-sm whitespace-nowrap">
            <thead className="text-xs text-gray-400 uppercase">
              <tr className="border-b border-gray-100 dark:border-gray-800">
                <th className="px-2 py-2 text-left">Fecha</th>
                <th className="px-2 py-2">Facturación</th>
                <th className="px-2 py-2">Ads</th>
                <th className="px-2 py-2">COGS</th>
                <th className="px-2 py-2">Profit</th>
                <th className="px-2 py-2">Margen</th>
                <th className="px-2 py-2">ROAS</th>
                <th className="px-2 py-2">Pedidos</th>
                <th className="px-2 py-2">% Entrega</th>
              </tr>
            </thead>
            <tbody className="tabular-nums">
              {dias.map((d) => (
                <tr key={d.fecha} className="border-b border-gray-50 dark:border-gray-800/50">
                  <td className="px-2 py-1.5 text-left font-medium text-gray-700 dark:text-gray-300">
                    {dayLabel(d.fecha)}
                  </td>
                  <td className="px-2 py-1.5">{eur(d.totalFacturacion)}</td>
                  <td className="px-2 py-1.5 text-amber-600">
                    {eur(d.googleAds + d.metaAds + d.tiktokAds)}
                  </td>
                  <td className="px-2 py-1.5">{eur(d.cogs)}</td>
                  <td
                    className={`px-2 py-1.5 font-semibold ${d.profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}
                  >
                    {eur(d.profit)}
                  </td>
                  <td className="px-2 py-1.5">{pct(d.profitPct)}</td>
                  <td className="px-2 py-1.5">{d.roas ? d.roas.toFixed(2) + 'x' : '—'}</td>
                  <td className="px-2 py-1.5">{num(d.pedidos)}</td>
                  <td className="px-2 py-1.5">{pct(d.pctEntrega)}</td>
                </tr>
              ))}
              <tr className="border-t-2 border-gray-200 font-bold dark:border-gray-700">
                <td className="px-2 py-2 text-left">TOTAL</td>
                <td className="px-2 py-2">{eur(facturacion)}</td>
                <td className="px-2 py-2 text-amber-600">{eur(adsTotal)}</td>
                <td className="px-2 py-2">{eur(total?.cogs ?? 0)}</td>
                <td className={`px-2 py-2 ${profit >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                  {eur(profit)}
                </td>
                <td className="px-2 py-2">{pct(margen)}</td>
                <td className="px-2 py-2">{roas ? roas.toFixed(2) + 'x' : '—'}</td>
                <td className="px-2 py-2">{num(pedidos)}</td>
                <td className="px-2 py-2">{pct(pctEnt)}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>

      {/* Graficas (despues de los numeros) */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
        <Panel title="Profit diario">
          <BarChart data={dias.map((d) => ({ label: dayLabel(d.fecha), value: d.profit }))} />
        </Panel>
        <Panel title="Facturación diaria">
          <LineChart
            data={dias.map((d) => ({ label: dayLabel(d.fecha), value: d.totalFacturacion }))}
            color="#3b82f6"
          />
        </Panel>
        <Panel title="Gasto en publicidad (Google + Meta + TikTok)">
          <BarChart
            data={dias.map((d) => ({
              label: dayLabel(d.fecha),
              value: d.googleAds + d.metaAds + d.tiktokAds,
            }))}
            positiveColor="#f59e0b"
          />
        </Panel>
        <Panel title="ROAS diario">
          <LineChart
            data={dias.map((d) => ({ label: dayLabel(d.fecha), value: d.roas ?? 0 }))}
            color="#8b5cf6"
            format={(n) => n.toFixed(1) + 'x'}
          />
        </Panel>
      </div>
    </div>
  )
}
