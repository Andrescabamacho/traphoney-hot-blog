/**
 * Sonda v3: confirmar campos reales de Product y Order, y buscar el stock propio.
 */
import { dropeaQuery } from './lib/dropea.mjs'

async function probe(label, query) {
  try {
    const data = await dropeaQuery(query)
    console.log(`✅ ${label} -> ${JSON.stringify(data).slice(0, 800)}`)
  } catch (e) {
    console.log(`❌ ${label} -> ${e.message}`)
  }
}

const run = async () => {
  console.log('======== PRODUCT: confirmar campos buenos ========')
  await probe('product ok', `{ products { data { id name state cost_price pvpr } } }`)

  console.log('\n======== PRODUCT: buscar STOCK propio ========')
  await probe(
    'product stock candidatos',
    `{ products { data { id stock_quantity available_stock warehouse_stock units my_stock user_stock quantity_available inventory ordered } } }`
  )

  console.log('\n======== ROOT: queries de inventario propio ========')
  for (const q of [
    `{ inventory { total } }`,
    `{ stocks { total } }`,
    `{ myProducts { total } }`,
    `{ myStock { total } }`,
    `{ warehouse { id } }`,
  ]) {
    await probe(q, q)
  }

  console.log('\n======== ORDER: confirmar campos buenos + muestra ========')
  await probe(
    'order ok',
    `{ orders { data { id status total_amount cod_amount iva_amount subtotal_amount created_at payment_method } } }`
  )

  console.log('\n======== FIN ========')
}

run().catch((e) => {
  console.error('Error en la sonda:', e)
  process.exit(1)
})
