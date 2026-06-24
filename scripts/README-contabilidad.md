# Contabilidad / Tesorería — Trap Honey

Dashboard visual de contabilidad: **P&L mensual** (día a día) + **Tesorería semanal**.

## Páginas

- `/contabilidad` → P&L mensual (Enero/Febrero/Marzo) con KPIs y gráficas.
- `/contabilidad/tesoreria` → Tesorería semanal (activos, variación, composición).

Los datos viven en `data/contabilidad/`:
- `pnl-enero.json`, `pnl-febrero.json`, `pnl-marzo.json` — cuenta de resultados por día.
- `tesoreria.json` — snapshots semanales (cada viernes).
- `index.json` — meta (meses disponibles).

## API de Dropea — qué se puede y qué no

Sondeado contra `https://api.dropea.com/graphql/dropshippers` (auth: cabecera `x-api-key`).
La introspección está bloqueada; el esquema se descubrió por sondeo.

| Dato | API | Nota |
|---|---|---|
| Pedidos (`orders`) | ✅ | status, total_amount, cod_amount, iva_amount, subtotal_amount, created_at, payment_method |
| Catálogo (`products`) | ✅ | id, name, state, cost_price, pvpr (es el catálogo de Dropea) |
| Saldo wallet | ❌ | No expuesto. Va a mano en la tesorería |
| Stock propio | ❌ | No hay query de inventario propio. Va a mano |

Cliente: `scripts/lib/dropea.mjs` (`getMe`, `getOrders`). Requiere el secreto `DROPEA_TOKEN`
(ya configurado en GitHub Actions).

## Pendiente / siguientes pasos

- [ ] Sync semanal de **pedidos** de Dropea → facturación, COD, cobrados/rechazados.
- [ ] Conectar Google Sheets como origen (actualizar el dashboard desde la hoja real).
- [ ] Saldos de banco (BBVA, CaixaBank), wallet Dropea y stock: inputs manuales.
- [ ] Integrar Meta Ads (gasto en publicidad).
