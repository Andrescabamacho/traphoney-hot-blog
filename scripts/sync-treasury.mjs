/**
 * Sincronizacion semanal de tesoreria.
 *
 * Que hace:
 *   1. Lee data/treasury/config.json (saldos de banco a mano + config de stock).
 *   2. Llama a Dropea: saldo de wallet (user_me) + stock (product_list).
 *   3. Calcula la tesoreria (caja + stock valorado).
 *   4. Escribe data/treasury/latest.json y añade una entrada a history.json.
 *
 * Uso:
 *   DROPEA_API_URL=... DROPEA_TOKEN=... node scripts/sync-treasury.mjs
 *
 * Sin DROPEA_TOKEN corre en MODO DEMO: usa solo los saldos de banco de la config y
 * deja Dropea a 0 (util para ver el dashboard antes de tener el token).
 */
import { readFile, writeFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { getWalletBalance, getStock } from './lib/dropea.mjs'
import { valueStock, buildSnapshot, toHistoryEntry } from './lib/treasury.mjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_DIR = join(__dirname, '..', 'data', 'treasury')

async function readJson(file) {
  return JSON.parse(await readFile(join(DATA_DIR, file), 'utf8'))
}
async function writeJson(file, obj) {
  await writeFile(join(DATA_DIR, file), JSON.stringify(obj, null, 2) + '\n')
}

async function main() {
  const now = process.env.SYNC_NOW || new Date().toISOString()
  const config = await readJson('config.json')

  const hasToken = Boolean(process.env.DROPEA_TOKEN)
  let walletBalance = null
  let stock = { items: [], totalValue: 0, totalUnits: 0 }

  if (hasToken) {
    if (config.dropea?.includeWallet !== false) {
      try {
        const w = await getWalletBalance()
        walletBalance = w.balance
        console.log(`Wallet Dropea: ${walletBalance ?? 'no disponible'}`)
      } catch (e) {
        console.warn('Aviso: no se pudo leer la wallet de Dropea:', e.message)
      }
    }
    if (config.dropea?.includeStock !== false) {
      try {
        const items = await getStock()
        stock = valueStock(items, config.stock)
        console.log(`Stock Dropea: ${stock.totalUnits} uds, valor ${stock.totalValue}`)
      } catch (e) {
        console.warn('Aviso: no se pudo leer el stock de Dropea:', e.message)
      }
    }
  } else {
    console.log('MODO DEMO: sin DROPEA_TOKEN. Solo se usan los saldos de banco de la config.')
  }

  const snapshot = buildSnapshot({ config, walletBalance, stock, now })
  await writeJson('latest.json', snapshot)

  const history = await readJson('history.json')
  history.snapshots = history.snapshots ?? []
  // Reemplaza si ya hay snapshot del mismo dia, si no añade.
  const day = now.slice(0, 10)
  const entry = toHistoryEntry(snapshot)
  const idx = history.snapshots.findIndex((s) => (s.date || '').slice(0, 10) === day)
  if (idx >= 0) history.snapshots[idx] = entry
  else history.snapshots.push(entry)
  await writeJson('history.json', history)

  console.log('\n=== Tesoreria ===')
  console.log(`Caja en bancos:  ${snapshot.totals.cashInBanks} ${snapshot.currency}`)
  console.log(`Caja en Dropea:  ${snapshot.totals.cashInDropea} ${snapshot.currency}`)
  console.log(`Stock valorado:  ${snapshot.totals.stockValue} ${snapshot.currency}`)
  console.log(`TOTAL tesoreria: ${snapshot.totals.treasuryTotal} ${snapshot.currency}`)
}

main().catch((e) => {
  console.error('Error en sync-treasury:', e)
  process.exit(1)
})
