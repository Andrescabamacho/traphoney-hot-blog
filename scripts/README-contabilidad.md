# Contabilidad / Tesorería

Dashboard de tesorería consolidada: **caja en bancos + wallet de Dropea + stock valorado**.

## Cómo funciona

```
data/treasury/config.json   -> saldos de banco (a mano) + config de stock
        |
scripts/sync-treasury.mjs   -> llama a Dropea (wallet + stock), calcula tesorería
        |
data/treasury/latest.json   -> snapshot actual  ┐
data/treasury/history.json  -> histórico        ┘ los lee el dashboard
        |
app/contabilidad (web)      -> visualización en /contabilidad
```

- **Bancos (BBVA, CaixaBank):** se actualizan a mano en `data/treasury/config.json`.
- **Dropea (wallet + stock):** se sincroniza solo por API GraphQL.
- **Automático:** GitHub Action `treasury-sync.yml` corre cada lunes y commitea el snapshot.

## Puesta en marcha (cuando tengas el token de Dropea)

1. **Crear el token** en `app.dropea.com` (sección API) con scopes de solo lectura:
   `user_me`, `product_list`, `product_view`, `order_list`, `order_view`, `shop_view`.

2. **Confirmar el esquema** (en tu ordenador o donde haya internet hacia Dropea):
   ```bash
   DROPEA_API_URL=https://api.dropea.com/graphql DROPEA_TOKEN=xxxx \
     node scripts/dropea-introspect.mjs
   ```
   Mira cómo se llaman exactamente los campos de **saldo** (en `user_me`) y de **stock**
   (en `product_list`) y, si difieren, ajusta `scripts/lib/dropea.mjs`.

3. **Guardar los secretos en GitHub:** Settings → Secrets and variables → Actions:
   - `DROPEA_API_URL`
   - `DROPEA_TOKEN`

4. **Probar una sincronización** (a mano):
   ```bash
   DROPEA_API_URL=... DROPEA_TOKEN=... node scripts/sync-treasury.mjs
   ```

## Modo demo

Sin `DROPEA_TOKEN`, el script corre en modo demo: usa solo los saldos de banco de
`config.json` y deja Dropea a 0. Útil para ver el dashboard antes de tener el token:

```bash
node scripts/sync-treasury.mjs
```

## Pendiente / siguientes pasos

- [ ] Confirmar nombres de campo del esquema GraphQL tras introspección (saldo y stock).
- [ ] Decidir si la wallet de Dropea está disponible vía API (scope `user_me`) o se mete a mano.
- [ ] Conectar Google Sheets (la base contable que ya tienes) como origen/espejo de los saldos.
- [ ] Integrar Meta Ads (gasto en publicidad) para el panel.
- [ ] Saldos de banco: por ahora manuales; opción futura de agregador PSD2 (GoCardless).
