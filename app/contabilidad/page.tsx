import { genPageMetadata } from 'app/seo'
import treasury from '@/data/treasury/latest.json'
import history from '@/data/treasury/history.json'

export const metadata = genPageMetadata({ title: 'Contabilidad' })

function eur(n: number, currency = 'EUR') {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency }).format(n || 0)
}

function fmtDate(iso: string | null) {
  if (!iso) return '—'
  try {
    return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium' }).format(new Date(iso))
  } catch {
    return iso
  }
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div
      className={`rounded-2xl border p-5 ${
        accent
          ? 'border-primary-500 bg-primary-50 dark:border-primary-500 dark:bg-primary-950/30'
          : 'border-gray-200 dark:border-gray-700'
      }`}
    >
      <p className="text-sm text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-1 text-2xl font-bold text-gray-900 dark:text-gray-100">{value}</p>
    </div>
  )
}

export default function Contabilidad() {
  const t = treasury
  const c = t.currency || 'EUR'
  const snaps = (history.snapshots as { date: string; treasuryTotal: number }[]) || []

  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="space-y-2 pt-6 pb-8 md:space-y-5">
        <h1 className="text-3xl leading-9 font-extrabold tracking-tight text-gray-900 sm:text-4xl sm:leading-10 md:text-6xl md:leading-14 dark:text-gray-100">
          Contabilidad
        </h1>
        <p className="text-lg leading-7 text-gray-500 dark:text-gray-400">
          Tesorería consolidada: caja en bancos + wallet de Dropea + stock valorado.
        </p>
        <p className="text-sm text-gray-400 dark:text-gray-500">
          Última actualización: {fmtDate(t.generatedAt)}
        </p>
      </div>

      <div className="space-y-10 py-8">
        {/* Totales */}
        <section>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Stat label="Caja en bancos" value={eur(t.totals.cashInBanks, c)} />
            <Stat label="Caja en Dropea" value={eur(t.totals.cashInDropea, c)} />
            <Stat label="Stock valorado" value={eur(t.totals.stockValue, c)} />
            <Stat label="TESORERÍA TOTAL" value={eur(t.totals.treasuryTotal, c)} accent />
          </div>
          <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Caja total (bancos + Dropea): <strong>{eur(t.totals.cashTotal, c)}</strong>
          </p>
        </section>

        {/* Detalle bancos */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
            Cuentas de banco
          </h2>
          <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                <tr>
                  <th className="px-4 py-3">Cuenta</th>
                  <th className="px-4 py-3 text-right">Saldo</th>
                  <th className="px-4 py-3">Actualizado</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {t.cash.banks.map((b) => (
                  <tr key={b.name}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                      {b.name}
                    </td>
                    <td className="px-4 py-3 text-right tabular-nums">{eur(b.balance, c)}</td>
                    <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                      {fmtDate(b.updatedAt)}
                    </td>
                  </tr>
                ))}
                <tr>
                  <td className="px-4 py-3 font-medium text-gray-900 dark:text-gray-100">
                    Wallet Dropea
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">
                    {eur(t.cash.dropeaWallet.balance, c)}
                  </td>
                  <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                    {fmtDate(t.cash.dropeaWallet.updatedAt)}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-xs text-gray-400 dark:text-gray-500">
            Los saldos de banco se actualizan a mano en <code>data/treasury/config.json</code>. La
            wallet de Dropea se sincroniza sola por API.
          </p>
        </section>

        {/* Stock */}
        <section>
          <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">Stock</h2>
          <p className="mb-3 text-sm text-gray-500 dark:text-gray-400">
            {t.stock.totalUnits} unidades · valor total {eur(t.stock.totalValue, c)}
          </p>
          {t.stock.items.length === 0 ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">
              Aún no hay datos de stock. Se rellenará en la primera sincronización con Dropea.
            </p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">SKU</th>
                    <th className="px-4 py-3">Producto</th>
                    <th className="px-4 py-3 text-right">Uds</th>
                    <th className="px-4 py-3 text-right">Coste/ud</th>
                    <th className="px-4 py-3 text-right">Valor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {(t.stock.items as any[]).map((it) => (
                    <tr key={it.sku || it.id}>
                      <td className="px-4 py-3 text-gray-500 dark:text-gray-400">{it.sku}</td>
                      <td className="px-4 py-3 text-gray-900 dark:text-gray-100">{it.name}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{it.stock}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{eur(it.unitCost, c)}</td>
                      <td className="px-4 py-3 text-right tabular-nums">{eur(it.lineValue, c)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Historico */}
        {snaps.length > 0 && (
          <section>
            <h2 className="mb-4 text-xl font-bold text-gray-900 dark:text-gray-100">
              Evolución
            </h2>
            <div className="overflow-hidden rounded-xl border border-gray-200 dark:border-gray-700">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-600 dark:bg-gray-800 dark:text-gray-300">
                  <tr>
                    <th className="px-4 py-3">Fecha</th>
                    <th className="px-4 py-3 text-right">Tesorería total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {snaps
                    .slice()
                    .reverse()
                    .map((s) => (
                      <tr key={s.date}>
                        <td className="px-4 py-3 text-gray-500 dark:text-gray-400">
                          {fmtDate(s.date)}
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          {eur(s.treasuryTotal, c)}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
