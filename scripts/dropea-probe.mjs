/**
 * Sonda v2: ya sabemos que products/orders/shops existen y devuelven *Pagination.
 * Ahora descubrimos los campos de la paginacion y de cada item (cantidad, coste...).
 * Corre en GitHub Actions (con red hacia Dropea).
 */
import { dropeaQuery } from './lib/dropea.mjs'

async function probe(label, query) {
  try {
    const data = await dropeaQuery(query)
    console.log(`✅ ${label} -> ${JSON.stringify(data)}`)
  } catch (e) {
    console.log(`❌ ${label} -> ${e.message}`)
  }
}

const run = async () => {
  console.log('======== USER: otros campos (¿saldo escondido?) ========')
  await probe('me campos', `{ me { id name email phone role createdAt } }`)
  console.log('-- wallet a nivel raiz --')
  await probe('wallet', `{ wallet { id } }`)
  await probe('wallets', `{ wallets { data { id } } }`)
  await probe('balance raiz', `{ balance }`)

  console.log('\n======== PRODUCTS: campos de la paginacion ========')
  await probe('products{total}', `{ products { total } }`)
  await probe('products meta', `{ products { total from to count currentPage lastPage perPage hasMorePages } }`)

  console.log('\n======== PRODUCTS: campos del item (data{...}) ========')
  await probe('products{data{id}}', `{ products { data { id } } }`)
  await probe(
    'products item candidatos',
    `{ products { data { id name title sku reference stock quantity qty available availableStock cost price purchasePrice salePrice pvp basePrice } } }`
  )

  console.log('\n======== ORDERS: campos del item ========')
  await probe('orders{total}', `{ orders { total } }`)
  await probe(
    'orders item candidatos',
    `{ orders { data { id status state total totalAmount delivered isDelivered deliveredAt createdAt paymentMethod } } }`
  )

  console.log('\n======== FIN ========')
}

run().catch((e) => {
  console.error('Error en la sonda:', e)
  process.exit(1)
})
