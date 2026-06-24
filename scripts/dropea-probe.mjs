/**
 * Sonda de descubrimiento del esquema de Dropea.
 * Como la introspeccion esta bloqueada pero el servidor sugiere nombres ("Did you mean"),
 * probamos campos candidatos y reportamos cuales existen. Pensado para correr en GitHub
 * Actions (que SI tiene salida a internet hacia Dropea).
 */
import { dropeaQuery } from './lib/dropea.mjs'

async function probe(label, query) {
  try {
    const data = await dropeaQuery(query)
    console.log(`✅ ${label} -> ${JSON.stringify(data)}`)
    return true
  } catch (e) {
    console.log(`❌ ${label} -> ${e.message}`)
    return false
  }
}

const run = async () => {
  console.log('======== BASELINE (usuario) ========')
  await probe('me{id name}', `{ me { id name } }`)

  console.log('\n======== SALDO / WALLET (campos en me) ========')
  for (const f of [
    'wallet', 'saldo', 'balance', 'credit', 'credits', 'money', 'funds',
    'walletBalance', 'available', 'amount', 'cash', 'deposit', 'budget',
  ]) {
    await probe(`me{${f}}`, `{ me { ${f} } }`)
  }
  console.log('-- wallet como objeto --')
  for (const sel of ['wallet{balance}', 'wallet{amount}', 'wallet{total}', 'wallet{available}']) {
    await probe(`me{${sel}}`, `{ me { ${sel} } }`)
  }

  console.log('\n======== PRODUCTOS / STOCK ========')
  for (const q of [
    `{ products { id } }`,
    `{ productList { id } }`,
    `{ products { id name stock } }`,
    `{ products { id name quantity } }`,
    `{ products(limit:1) { id name stock cost price } }`,
  ]) {
    await probe(q, q)
  }

  console.log('\n======== PEDIDOS / ORDERS ========')
  for (const q of [`{ orders { id } }`, `{ orderList { id } }`, `{ orders(limit:1) { id status total } }`]) {
    await probe(q, q)
  }

  console.log('\n======== TIENDAS / SHOPS ========')
  for (const q of [`{ shops { id } }`, `{ shopList { id } }`, `{ shop { id } }`]) {
    await probe(q, q)
  }

  console.log('\n======== FIN ========')
}

run().catch((e) => {
  console.error('Error en la sonda:', e)
  process.exit(1)
})
