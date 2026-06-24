/**
 * Cliente de la API GraphQL de Dropea.
 *
 * Esquema confirmado por sondeo (la introspeccion esta bloqueada):
 *   - Endpoint:  https://api.dropea.com/graphql/dropshippers
 *   - Auth:      cabecera `x-api-key: <token>` (token sin prefijo Bearer)
 *   - Query usuario: `me { id name }`  (NO expone saldo/wallet)
 *   - Productos: `products { total data { id name state cost_price pvpr } }` (catalogo Dropea)
 *   - Pedidos:   `orders { total data { id status total_amount cod_amount iva_amount
 *                subtotal_amount created_at payment_method } }`
 *   - Paginacion (snake_case): data, total, current_page, last_page, per_page, from, to
 *
 * Lo que Dropea NO expone por API (va a mano en el dashboard):
 *   - Saldo de la wallet
 *   - Stock propio / inventario valorado
 *
 * Variables de entorno:
 *   DROPEA_API_URL  -> opcional, por defecto el endpoint de arriba
 *   DROPEA_TOKEN    -> token personal (SECRETO)
 */

const DEFAULT_URL = 'https://api.dropea.com/graphql/dropshippers'

function buildHeaders() {
  const token = process.env.DROPEA_TOKEN
  if (!token) throw new Error('Falta DROPEA_TOKEN en el entorno.')
  const header = process.env.DROPEA_AUTH_HEADER || 'x-api-key'
  const scheme = process.env.DROPEA_AUTH_SCHEME ?? ''
  return { 'Content-Type': 'application/json', [header]: scheme ? `${scheme} ${token}` : token }
}

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
  if (json.errors?.length) throw new Error('Dropea GraphQL error: ' + JSON.stringify(json.errors))
  if (json.error) throw new Error('Dropea error: ' + json.error)
  if (!res.ok) throw new Error(`Dropea HTTP ${res.status}: ${text.slice(0, 300)}`)
  return json.data
}

/** Datos basicos del usuario (sin saldo: Dropea no lo expone). */
export async function getMe() {
  const data = await dropeaQuery(`{ me { id name } }`)
  return data?.me ?? null
}

/**
 * Pedidos paginados. Devuelve items normalizados.
 * status conocidos: CHARGED (cobrado/entregado), REJECTED (rechazado), entre otros.
 */
export async function getOrders({ page = 1 } = {}) {
  const query = `
    query Orders($page: Int) {
      orders(page: $page) {
        total
        current_page
        last_page
        per_page
        data {
          id
          status
          total_amount
          cod_amount
          iva_amount
          subtotal_amount
          created_at
          payment_method
        }
      }
    }
  `
  const data = await dropeaQuery(query, { page })
  const p = data?.orders ?? {}
  return {
    total: p.total ?? 0,
    page: p.current_page ?? page,
    lastPage: p.last_page ?? 1,
    perPage: p.per_page ?? p.data?.length ?? 0,
    items: (p.data ?? []).map((o) => ({
      id: o.id,
      status: o.status,
      total: Number(o.total_amount ?? 0),
      cod: Number(o.cod_amount ?? 0),
      iva: Number(o.iva_amount ?? 0),
      subtotal: Number(o.subtotal_amount ?? 0),
      createdAt: o.created_at,
      paymentMethod: o.payment_method,
    })),
  }
}
