/**
 * Introspeccion del esquema GraphQL de Dropea.
 *
 * Uso (en un entorno CON salida a internet hacia Dropea, p.ej. tu ordenador o GitHub Actions):
 *   DROPEA_API_URL=https://api.dropea.com/graphql DROPEA_TOKEN=xxxxx node scripts/dropea-introspect.mjs
 *
 * Imprime los campos de los tipos relevantes (user_me, product, order...) para confirmar
 * como se llama exactamente el SALDO de la wallet y el STOCK, y ajustar scripts/lib/dropea.mjs.
 */
import { dropeaQuery } from './lib/dropea.mjs'

const INTROSPECTION = `
  query Introspect {
    __schema {
      queryType { name }
      types {
        name
        kind
        fields {
          name
          type { name kind ofType { name kind } }
        }
      }
    }
  }
`

const run = async () => {
  const data = await dropeaQuery(INTROSPECTION)
  const types = data.__schema.types.filter(
    (t) => t.fields && !t.name.startsWith('__')
  )

  console.log('\n=== Query root:', data.__schema.queryType?.name, '===\n')

  // Resaltamos tipos que probablemente contengan saldo o stock.
  const interesting = /user|me|wallet|balance|product|stock|inventory|order/i
  for (const t of types) {
    if (!interesting.test(t.name) && !t.fields.some((f) => interesting.test(f.name))) continue
    console.log(`type ${t.name} {`)
    for (const f of t.fields) {
      const ft = f.type?.name || f.type?.ofType?.name || f.type?.kind
      console.log(`  ${f.name}: ${ft}`)
    }
    console.log('}\n')
  }
}

run().catch((e) => {
  console.error('Error en introspeccion:', e.message)
  process.exit(1)
})
