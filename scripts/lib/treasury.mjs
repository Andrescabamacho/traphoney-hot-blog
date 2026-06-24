/**
 * Logica de calculo de tesoreria.
 *
 * Tesoreria total = CAJA (bancos manuales + wallet Dropea) + STOCK valorado.
 */

/** Valora el stock segun la config (coste unitario, con overrides por SKU). */
export function valueStock(items, stockConfig) {
  const overrides = stockConfig?.costOverrides ?? {}
  const defaultCost = Number(stockConfig?.defaultUnitCost ?? 0)
  let totalValue = 0
  let totalUnits = 0
  const valued = items.map((it) => {
    const unitCost =
      overrides[it.sku] != null
        ? Number(overrides[it.sku])
        : it.unitCost != null
          ? it.unitCost
          : defaultCost
    const lineValue = it.stock * unitCost
    totalValue += lineValue
    totalUnits += it.stock
    return { ...it, unitCost, lineValue }
  })
  return { items: valued, totalValue: round2(totalValue), totalUnits }
}

/** Construye el snapshot completo de tesoreria a partir de las piezas. */
export function buildSnapshot({ config, walletBalance, stock, now }) {
  const banks = (config.banks ?? []).map((b) => ({
    name: b.name,
    balance: round2(Number(b.balance ?? 0)),
    source: 'manual',
    updatedAt: b.updatedAt ?? null,
  }))

  const cashInBanks = round2(banks.reduce((s, b) => s + b.balance, 0))
  const cashInDropea = round2(Number(walletBalance ?? 0))
  const stockValue = round2(stock?.totalValue ?? 0)

  const cashTotal = round2(cashInBanks + cashInDropea)
  const treasuryTotal = round2(cashTotal + stockValue)

  return {
    generatedAt: now,
    currency: config.currency ?? 'EUR',
    cash: {
      banks,
      dropeaWallet: {
        balance: cashInDropea,
        source: 'dropea',
        updatedAt: walletBalance == null ? null : now,
      },
    },
    stock: {
      totalValue: stockValue,
      totalUnits: stock?.totalUnits ?? 0,
      source: 'dropea',
      items: stock?.items ?? [],
    },
    totals: {
      cashInBanks,
      cashInDropea,
      cashTotal,
      stockValue,
      treasuryTotal,
    },
  }
}

/** Entrada compacta para el historico. */
export function toHistoryEntry(snapshot) {
  return {
    date: snapshot.generatedAt,
    cashInBanks: snapshot.totals.cashInBanks,
    cashInDropea: snapshot.totals.cashInDropea,
    cashTotal: snapshot.totals.cashTotal,
    stockValue: snapshot.totals.stockValue,
    treasuryTotal: snapshot.totals.treasuryTotal,
  }
}

function round2(n) {
  return Math.round((Number(n) + Number.EPSILON) * 100) / 100
}
