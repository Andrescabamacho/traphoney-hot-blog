/**
 * Cliente de la API GraphQL de Dropea.
 *
 * Autenticacion: token personal generado en app.dropea.com (Mi Cuenta -> Access Tokens).
 * Dropea usa la cabecera `x-api-key` con el token pelado (sin "Bearer").
 *   - Endpoint: https://api.dropea.com/graphql/dropshippers
 *   - Header por defecto: `x-api-key: <token>`
 *   - Se puede sobreescribir con DROPEA_AUTH_HEADER / DROPEA_AUTH_SCHEME si cambiara.
 *
 * Variables de entorno:
 *   DROPEA_API_URL      -> endpoint GraphQL (https://api.dropea.com/graphql/dropshippers)
 *   DROPEA_TOKEN        -> token personal (SECRETO)
 *   DROPEA_AUTH_HEADER  -> opcional, por defecto "x-api-key"
 *   DROPEA_AUTH_SCHEME  -> opcional, por defecto "" (token sin prefijo)
 *
 * IMPORTANTE sobre los nombres de campos:
 * Los scopes confirmados son user_me, product_list/product_view, order_list/order_view,
 * shop_view. Las QUERIES de abajo son la mejor aproximacion segun esos scopes. Antes de
 * fiarte al 100%, ejecuta `node scripts/dropea-introspect.mjs` con el token para volcar el
 * esquema real y, si hace falta, ajustar los nombres de campo (wallet/saldo y stock).
 */

function buildHeaders() {
  const token = process.env.DROPEA_TOKEN
  if (!token) throw new Error('Falta DROPEA_TOKEN en el entorno.')
  const header = process.env.DROPEA_AUTH_HEADER || 'x-api-key'
  const scheme = process.env.DROPEA_AUTH_SCHEME ?? ''
  const value = scheme ? `${scheme} ${token}` : token
  return { 'Content-Type': 'application/json', [header]: value }
}

/** Ejecuta una operacion GraphQL contra Dropea y devuelve `data` (lanza si hay errores). */
const DEFAULT_URL = 'https://api.dropea.com/graphql/dropshippers'

export async function dropeaQuery(query, variables = {}) {
  const url = process.env.DROPEA_API_URL || DEFAULT_URL

  const res = await fetch(url, {
    method: 'POST',
    headers: buildHeaders(),
    body: JSON.stringify({ query, variables }),
  })

  const text = await res.text()
  let json
  try {
    json = JSON.parse(text)
  } catch {
    throw new Error(`Respuesta no-JSON de Dropea (HTTP ${res.status}): ${text.slice(0, 300)}`)
  }
  if (json.errors?.length) {
    throw new Error('Dropea GraphQL error: ' + JSON.stringify(json.errors))
  }
  if (!res.ok) {
    throw new Error(`Dropea HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  return json.data
}

/**
 * Lee el saldo de la wallet del usuario (scope user_me).
 * Probamos varios nombres de campo habituales para el saldo; ajustar tras introspeccion.
 */
export async function getWalletBalance() {
  const query = `
    query Me {
      user_me {
        id
        email
        wallet { balance }
        walletBalance
        balance
      }
    }
  `
  // Algunos esquemas no exponen todos esos campos -> intentamos de forma tolerante.
  let data
  try {
    data = await dropeaQuery(query)
  } catch {
    // Fallback minimo si el esquema solo acepta los campos que existen.
    data = await dropeaQuery(`query Me { user_me { id email } }`)
  }
  const me = data?.user_me ?? {}
  const balance =
    me?.wallet?.balance ??
    me?.walletBalance ??
    me?.balance ??
    null
  return { balance: balance == null ? null : Number(balance), raw: me }
}

/**
 * Lista el stock/inventario (scope product_list). Paginacion defensiva.
 * Devuelve items normalizados: { sku, name, stock, unitCost }.
 */
export async function getStock({ pageSize = 100, maxPages = 50 } = {}) {
  const query = `
    query Products($limit: Int, $offset: Int) {
      product_list(limit: $limit, offset: $offset) {
        items {
          id
          sku
          name
          stock
          quantity
          cost
          price
        }
        total
      }
    }
  `
  const items = []
  let offset = 0
  for (let page = 0; page < maxPages; page++) {
    let data
    try {
      data = await dropeaQuery(query, { limit: pageSize, offset })
    } catch (e) {
      // Si la firma de paginacion no coincide, probamos sin argumentos una sola vez.
      if (page === 0) {
        data = await dropeaQuery(`query { product_list { items { id sku name stock quantity cost price } } }`)
      } else {
        throw e
      }
    }
    const list = data?.product_list?.items ?? data?.product_list ?? []
    for (const p of list) {
      items.push({
        id: p.id ?? null,
        sku: p.sku ?? String(p.id ?? ''),
        name: p.name ?? '',
        stock: Number(p.stock ?? p.quantity ?? 0),
        unitCost: p.cost != null ? Number(p.cost) : p.price != null ? Number(p.price) : null,
      })
    }
    const total = data?.product_list?.total
    if (!list.length || (total != null && items.length >= total)) break
    offset += pageSize
  }
  return items
}
