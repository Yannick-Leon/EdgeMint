/**
 * Simple Arbitrage-Scanner über Quotes:
 * Prüft, ob ask(A) < bid(B) => potenzielle Spanne.
 */
export function scanArbitrage(quotes, notional = 1000) {
  const opps = [];

  for (let i = 0; i < quotes.length; i++) {
    for (let j = 0; j < quotes.length; j++) {
      if (i === j) continue;
      const buy = quotes[i];   // wir kaufen hier (ask)
      const sell = quotes[j];  // wir verkaufen hier (bid)

      const spread = sell.bid - buy.ask;
      const spreadPct = spread / buy.ask;

      if (spread > 0) {
        const estProfit = notional * spreadPct;
        opps.push({
          symbol: buy.symbol,
          buyOn: buy.exchange,
          sellOn: sell.exchange,
          buyAsk: buy.ask,
          sellBid: sell.bid,
          spread,
          spreadPct,
          notional,
          estProfit
        });
      }
    }
  }

  // Sortiere beste zuerst
  opps.sort((a, b) => b.estProfit - a.estProfit);
  return opps;
}
